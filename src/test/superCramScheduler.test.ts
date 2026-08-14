import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import { createReviewEvent, DEFAULT_APP_SETTINGS } from "../domain/progress";
import { examQuestions } from "../exam/questionBank";
import {
  buildSuperCramCandidates,
  findUrgentCanonicalFallback,
} from "../superCram/selector";
import { deriveExamSrsSnapshot } from "../study/examSrs/deriveState";
import {
  isExamSrsAttemptedDueReview,
  isExamSrsDueReview,
  rankExamSrsCandidatesFromSnapshot,
} from "../study/examSrs/selector";
import { MINUTE_MS } from "../study/examSrs/intervals";

const NOW = Date.parse("2026-08-14T00:00:00.000Z");

function review(
  cardId: string,
  reviewedAt: number,
  input: { readonly correct: boolean; readonly rating: "forgot" | "struggled" },
) {
  return createReviewEvent({
    id: cardId + "-" + input.rating,
    cardId,
    reviewedAt: new Date(reviewedAt).toISOString(),
    mode: "mcq",
    correct: input.correct,
    rating: input.rating,
    responseTimeMs: 900,
    selectedChoice: 0,
  });
}

function candidateFor(
  cardId: string,
  reviewEvents: readonly ReturnType<typeof review>[],
  nowMs: number,
) {
  const question = examQuestions.find((item) => item.reviewCardId === cardId);
  if (question === undefined) throw new Error("No question for " + cardId);
  return buildSuperCramCandidates({
    questions: [question],
    cards,
    reviewEvents,
    settings: DEFAULT_APP_SETTINGS,
    nowMs,
  })[0];
}

describe("Super Cram scheduler invariants", () => {
  it("does not treat a non-due failure/relearning card as urgent", () => {
    const event = review("ch08-003", NOW, { correct: false, rating: "forgot" });
    const beforeDue = candidateFor("ch08-003", [event], NOW + 5 * MINUTE_MS);
    expect(beforeDue?.isUrgent).toBe(false);
    expect(beforeDue?.hasWeakEvidence).toBe(true);
    expect(beforeDue?.reasonKind).not.toBe("urgent-weakness");

    const due = candidateFor("ch08-003", [event], NOW + 10 * MINUTE_MS);
    expect(due?.isUrgent).toBe(true);
    expect(due?.reasonKind).toBe("urgent-weakness");
  });

  it("does not treat a non-due weak success as urgent", () => {
    const event = review("ch08-003", NOW, { correct: true, rating: "struggled" });
    const beforeDue = candidateFor("ch08-003", [event], NOW + 30 * MINUTE_MS);
    expect(beforeDue?.isUrgent).toBe(false);
    expect(beforeDue?.hasWeakEvidence).toBe(true);

    const due = candidateFor("ch08-003", [event], NOW + 45 * MINUTE_MS);
    expect(due?.isUrgent).toBe(true);
  });

  it("agrees with ordinary Exam-SRS due eligibility for attempted cards", () => {
    const event = review("ch08-003", NOW, { correct: false, rating: "forgot" });
    for (const nowMs of [NOW + 5 * MINUTE_MS, NOW + 10 * MINUTE_MS]) {
      const snapshot = deriveExamSrsSnapshot(
        cards,
        [event],
        DEFAULT_APP_SETTINGS,
        nowMs,
      );
      const state = snapshot.stateByCardId["ch08-003"];
      const ordinary = rankExamSrsCandidatesFromSnapshot({
        cards,
        scheduler: snapshot,
        nowMs,
        candidateCardIds: new Set(["ch08-003"]),
      });
      const superCandidate = candidateFor("ch08-003", [event], nowMs);
      expect(superCandidate?.isUrgent).toBe(isExamSrsAttemptedDueReview(state));
      expect(ordinary.length > 0).toBe(isExamSrsDueReview(state));
    }
  });

  it("offers sequential canonical fallbacks without a stale first-card loop", () => {
    const first = cards.find((card) => card.id === "ch01-001")!;
    const second = cards.find((card) => card.id === "ch01-002")!;
    const reviews = [
      review(first.id, NOW, { correct: false, rating: "forgot" }),
      review(second.id, NOW, { correct: false, rating: "forgot" }),
    ];
    const input = {
      cards: [first, second],
      questions: [],
      reviewEvents: reviews,
      settings: DEFAULT_APP_SETTINGS,
      nowMs: NOW + 10 * MINUTE_MS,
    };
    const fallbackA = findUrgentCanonicalFallback(input);
    expect(fallbackA).not.toBeNull();
    const fallbackB = findUrgentCanonicalFallback({
      ...input,
      excludedCardIds: new Set([fallbackA!.id]),
    });
    expect(fallbackB).not.toBeNull();
    expect(fallbackB?.id).not.toBe(fallbackA?.id);
  });
});
