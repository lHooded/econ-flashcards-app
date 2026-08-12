import { describe, expect, it } from "vitest";
import { cardIds } from "../data/deck";
import { createReviewEvent, type ReviewEvent } from "../domain/progress";
import { buildMockExam } from "../exam/mock/selector";
import {
  buildMockReviewEvents,
  createMockAttempt,
  type MockQuestionManifest,
  type MockAttempt,
} from "../exam/mock/model";
import { examQuestions } from "../exam/questionBank";
import {
  buildSyncPayload,
  deriveSyncedCardStates,
  mergeSyncPayloads,
  SyncMergeConflictError,
  SyncValidationError,
  syncPayloadsEqual,
  validateSyncPayload,
} from "../sync/merge";
import type { SyncPayloadV1 } from "../sync/model";
import { toBase64Url } from "../sync/encoding";
import { reviewableProgressIds } from "../knowledge/guided/registry";

const deviceA = toBase64Url(new Uint8Array(16).fill(1));
const deviceB = toBase64Url(new Uint8Array(16).fill(2));
const deviceC = toBase64Url(new Uint8Array(16).fill(3));

function review(
  id: string,
  cardId = "ch01-001",
  reviewedAt = "2026-08-11T00:00:00.000Z",
  correct = true,
): ReviewEvent {
  return createReviewEvent({
    id,
    cardId,
    reviewedAt,
    mode: "recall",
    correct,
    rating: correct ? "got_it" : "forgot",
    responseTimeMs: null,
    selectedChoice: null,
  });
}

function payload(
  reviews: readonly ReviewEvent[],
  deviceId = deviceA,
  updatedAt = "2026-08-11T00:00:00.000Z",
  mockAttempts: readonly MockAttempt[] = [],
): SyncPayloadV1 {
  return {
    format: "econ-flashcards-sync",
    version: 1,
    reviews,
    settings: {
      value: { examAt: null, studyBufferHours: 24 },
      updatedAt,
      deviceId,
    },
    mockAttempts,
  };
}

function submittedAttempt(id: string): {
  readonly active: MockAttempt;
  readonly submitted: MockAttempt;
  readonly reviews: ReviewEvent[];
} {
  const active = createMockAttempt({
    ...buildMockExam({ bank: examQuestions, seed: id }),
    id,
    seed: id,
    createdAt: "2026-08-10T00:00:00.000Z",
  });
  const submitted: MockAttempt = {
    ...active,
    status: "submitted",
    submittedAt: active.writingEndsAt,
    reviewEventsCommittedAt: active.writingEndsAt,
  };
  const reviews = buildMockReviewEvents(submitted);
  return { active, submitted, reviews };
}

describe("sync merge algebra", () => {
  it("accepts and merges a registered guided check without changing the canonical deck metric", () => {
    const guided = review(
      "guided-sync",
      "knowledge-check:percentage",
      "2026-08-11T00:00:00.000Z",
      true,
    );
    const validated = validateSyncPayload(payload([guided]), reviewableProgressIds);
    expect(validated.reviews).toEqual([guided]);
    const states = deriveSyncedCardStates(reviewableProgressIds, validated.reviews);
    expect(states.find((state) => state.cardId === guided.cardId)?.totalReviews).toBe(
      1,
    );
    expect(
      states.filter((state) => !state.cardId.startsWith("knowledge-check:")).length,
    ).toBe(cardIds.size);
    expect(mergeSyncPayloads(payload([guided]), payload([guided]))).toEqual(
      payload([guided]),
    );
  });

  it("unions offline reviews, rebuilds derived state, and is idempotent/symmetric", () => {
    const a = payload([review("a", "ch01-001", "2026-08-11T00:00:00.000Z", true)]);
    const b = payload(
      [review("b", "ch01-001", "2026-08-11T00:01:00.000Z", false)],
      deviceB,
    );
    const merged = mergeSyncPayloads(a, b);
    expect(merged.reviews.map((event) => event.id)).toEqual(["a", "b"]);
    expect(mergeSyncPayloads(b, a)).toEqual(merged);
    expect(mergeSyncPayloads(merged, merged)).toEqual(merged);
    const c = payload(
      [review("c", "ch01-003", "2026-08-11T00:02:00.000Z", true)],
      deviceC,
      "2026-08-11T00:02:00.000Z",
    );
    expect(mergeSyncPayloads(mergeSyncPayloads(a, b), c)).toEqual(
      mergeSyncPayloads(a, mergeSyncPayloads(b, c)),
    );
    expect(
      deriveSyncedCardStates(cardIds, merged.reviews).find(
        (state) => state.cardId === "ch01-001",
      ),
    ).toEqual({
      cardId: "ch01-001",
      firstSeenAt: "2026-08-11T00:00:00.000Z",
      lastSeenAt: "2026-08-11T00:01:00.000Z",
      totalReviews: 2,
      correctReviews: 1,
      consecutiveCorrect: 0,
    });
    expect(syncPayloadsEqual(merged, mergeSyncPayloads(a, b))).toBe(true);
  });

  it("fails closed on a conflicting duplicate review ID", () => {
    expect(() =>
      mergeSyncPayloads(
        payload([review("same", "ch01-001", undefined, true)]),
        payload([review("same", "ch01-002", undefined, true)], deviceB),
      ),
    ).toThrow(SyncMergeConflictError);
  });

  it("chooses settings by timestamp, then lexical device ID, in either merge direction", () => {
    const earlier = payload([], deviceA, "2026-08-11T10:00:00.000Z");
    const later = {
      ...payload([], deviceB, "2026-08-11T10:01:00.000Z"),
      settings: {
        ...payload([], deviceB, "2026-08-11T10:01:00.000Z").settings,
        value: { examAt: "2026-08-20T10:00:00.000Z", studyBufferHours: 6 },
      },
    } satisfies SyncPayloadV1;
    expect(mergeSyncPayloads(earlier, later).settings).toEqual(later.settings);
    expect(mergeSyncPayloads(later, earlier).settings).toEqual(later.settings);

    const tieA = payload([], deviceA, "2026-08-11T10:02:00.000Z");
    const tieB = {
      ...payload([], deviceB, "2026-08-11T10:02:00.000Z"),
      settings: {
        ...payload([], deviceB, "2026-08-11T10:02:00.000Z").settings,
        value: { examAt: "2026-08-21T10:00:00.000Z", studyBufferHours: 8 },
      },
    } satisfies SyncPayloadV1;
    const expected = deviceA < deviceB ? tieA.settings : tieB.settings;
    expect(mergeSyncPayloads(tieA, tieB).settings).toEqual(expected);
    expect(mergeSyncPayloads(tieB, tieA).settings).toEqual(expected);
  });

  it("unions terminal mock history, rejects terminal conflicts, and replaces a matching active mock only with complete reviews", () => {
    const one = submittedAttempt("mock-one");
    const local = payload([], deviceA);
    const remote = payload(one.reviews, deviceB, "2026-08-11T00:00:00.000Z", [
      one.submitted,
    ]);
    const merged = mergeSyncPayloads(local, remote, { activeAttempt: one.active });
    expect(merged.mockAttempts).toEqual([one.submitted]);
    expect(merged.reviews).toHaveLength(60);

    const different = {
      ...one.submitted,
      submittedAt: "2026-08-11T05:00:00.000Z",
    };
    expect(() =>
      mergeSyncPayloads(remote, payload(one.reviews, deviceA, undefined, [different])),
    ).toThrow(SyncMergeConflictError);
    expect(() =>
      mergeSyncPayloads(
        local,
        payload(one.reviews.slice(0, -1), deviceB, undefined, [one.submitted]),
        { activeAttempt: one.active },
      ),
    ).toThrow(SyncMergeConflictError);
  });

  it("omits active mocks from an outgoing payload", () => {
    const one = submittedAttempt("active-only");
    const outgoing = buildSyncPayload(
      { settings: payload([]).settings.value, reviews: [], mockAttempts: [one.active] },
      payload([]).settings,
    );
    expect(outgoing.mockAttempts).toEqual([]);
  });

  it("accepts historical terminal mocks whose display question is no longer shipped", () => {
    const one = submittedAttempt("unknown-question");
    const firstState = one.submitted.questionStates[0];
    const firstManifest = one.submitted.manifest[0];
    const invalid: MockAttempt = {
      ...one.submitted,
      questionOrder: ["not-in-bank", ...one.submitted.questionOrder.slice(1)],
      manifest: [
        { ...firstManifest, questionId: "not-in-bank" },
        ...one.submitted.manifest.slice(1),
      ],
      questionStates: [
        { ...firstState, questionId: "not-in-bank" },
        ...one.submitted.questionStates.slice(1),
      ],
    };
    const historicalReviews = buildMockReviewEvents(invalid);

    expect(
      validateSyncPayload(
        payload(historicalReviews, deviceA, undefined, [invalid]),
        cardIds,
      ),
    ).toMatchObject({ mockAttempts: [invalid] });
  });

  it.each([
    ["correct", true],
    ["selectedChoice", 1],
    ["cardId", "ch01-002"],
    ["mode", "recall"],
    ["rating", "got_it"],
    ["reviewedAt", "2026-08-11T05:00:00.000Z"],
    ["responseTimeMs", 1234],
  ] as const)("rejects a submitted mock with forged %s evidence", (field, value) => {
    const one = submittedAttempt(`forged-${field}`);
    const expected = one.reviews[0];
    const forged = { ...expected, [field]: value } as ReviewEvent;
    const reviews = [forged, ...one.reviews.slice(1)];
    expect(() =>
      validateSyncPayload(
        payload(reviews, deviceA, undefined, [one.submitted]),
        cardIds,
      ),
    ).toThrow(SyncValidationError);
  });

  it("rejects a same-ID remote terminal mock with a different immutable identity", () => {
    const one = submittedAttempt("identity-conflict");
    const changedManifest: MockQuestionManifest[] = one.submitted.manifest.map(
      (entry, index) =>
        index === 0
          ? {
              ...entry,
              correctChoice: ((entry.correctChoice + 1) %
                4) as MockQuestionManifest["correctChoice"],
            }
          : entry,
    );
    const changed: MockAttempt = {
      ...one.submitted,
      manifest: changedManifest,
    };
    expect(() =>
      mergeSyncPayloads(
        payload([], deviceA),
        payload(buildMockReviewEvents(changed), deviceB, undefined, [changed]),
        { activeAttempt: one.active },
      ),
    ).toThrow(SyncMergeConflictError);
  });
});
