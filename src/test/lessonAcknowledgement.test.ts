import { deleteDB } from "idb";
import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import {
  createProgressBackup,
  parseProgressBackupText,
  serializeProgressBackup,
} from "../domain/backup";
import {
  createReviewEvent,
  type ProgressSnapshot,
  type ReviewEvent,
} from "../domain/progress";
import { ProgressRepository } from "../db/progressRepository";
import { knowledgeConcepts } from "../knowledge/data";
import { selectHighYieldNextStep } from "../knowledge/guided/highYieldSelector";
import { reviewableProgressIds } from "../knowledge/guided/registry";
import { selectGuidedNextStep } from "../knowledge/guided/selector";
import { deriveConceptStatuses, deriveGuidedCheckStates } from "../knowledge/mastery";
import { deriveExamSrsSnapshot } from "../study/examSrs/deriveState";
import { SyncCoordinator } from "../sync/coordinator";
import { decryptSyncPayload } from "../sync/crypto";
import type { SyncApi } from "../sync/client";
import type {
  EncryptedSyncEnvelope,
  SyncGroupCredentials,
  SyncPayloadV1,
} from "../sync/model";

const NOW = Date.parse("2026-08-11T00:00:00.000Z");
const NO_EXAM = { examAt: null, studyBufferHours: 24 } as const;

function guidedSuccess(
  id: string,
  cardId: string,
  reviewedAt = "2026-08-10T23:59:00.000Z",
): ReviewEvent {
  return createReviewEvent({
    id,
    cardId,
    reviewedAt,
    mode: "mcq",
    correct: true,
    rating: null,
    responseTimeMs: 500,
    selectedChoice: 0,
  });
}

function canonicalRecall(
  id: string,
  cardId: string,
  rating: "struggled" | "got_it",
): ReviewEvent {
  return createReviewEvent({
    id,
    cardId,
    reviewedAt: "2026-08-10T20:00:00.000Z",
    mode: "recall",
    correct: true,
    rating,
    responseTimeMs: 500,
    selectedChoice: null,
  });
}

class ImmediateSyncRemote implements SyncApi {
  public credentials: SyncGroupCredentials | undefined;
  public envelope: EncryptedSyncEnvelope | undefined;
  public version = 0;

  public async create(
    credentials: SyncGroupCredentials,
    envelope: EncryptedSyncEnvelope,
  ): Promise<{ readonly version: number }> {
    this.credentials = credentials;
    this.envelope = envelope;
    this.version = 1;
    return { version: this.version };
  }

  public async pull(
    credentials: SyncGroupCredentials,
  ): Promise<{ readonly version: number; readonly envelope: EncryptedSyncEnvelope }> {
    this.assert(credentials);
    return { version: this.version, envelope: this.envelope! };
  }

  public async push(
    credentials: SyncGroupCredentials,
    expectedVersion: number,
    envelope: EncryptedSyncEnvelope,
  ): Promise<{ readonly version: number }> {
    this.assert(credentials);
    if (expectedVersion !== this.version) throw new Error("Unexpected sync version.");
    this.envelope = envelope;
    this.version += 1;
    return { version: this.version };
  }

  public async delete(credentials: SyncGroupCredentials): Promise<void> {
    this.assert(credentials);
    this.credentials = undefined;
    this.envelope = undefined;
    this.version = 0;
  }

  private assert(credentials: SyncGroupCredentials): void {
    if (
      this.credentials?.authToken !== credentials.authToken ||
      this.envelope === undefined
    ) {
      throw new Error("Unexpected sync credentials.");
    }
  }
}

describe("Guided lesson acknowledgement", () => {
  it("persists only explicit acknowledgement, survives close/reopen, and is idempotent", async () => {
    const databaseName = `lesson-seen-repository-${Date.now()}-${Math.random()}`;
    const first = new ProgressRepository(reviewableProgressIds, databaseName);
    try {
      await first.resetAll();
      expect((await first.load()).lessonSeenConceptIds).toEqual([]);
      await first.markLessonSeen("percentage");
      await first.markLessonSeen("percentage");

      const saved = await first.load();
      expect(saved.lessonSeenConceptIds).toEqual(["percentage"]);
      expect(saved.reviews).toEqual([]);
      expect(saved.cardStates).toEqual([]);

      const checkStates = deriveGuidedCheckStates(saved.reviews, NO_EXAM, NOW);
      const scheduler = deriveExamSrsSnapshot(cards, saved.reviews, NO_EXAM, NOW);
      expect(
        deriveConceptStatuses(scheduler, knowledgeConcepts, checkStates).get(
          "percentage",
        ),
      ).toBe("unseen");
    } finally {
      await first.close();
    }

    const reopened = new ProgressRepository(reviewableProgressIds, databaseName);
    try {
      expect((await reopened.load()).lessonSeenConceptIds).toEqual(["percentage"]);
      await expect(reopened.markLessonSeen("not-a-knowledge-concept")).rejects.toThrow(
        /unknown knowledge concept/i,
      );
    } finally {
      await reopened.close();
      await deleteDB(databaseName);
    }
  });

  it("shares the seen lesson set between Guided and High-Yield and preserves selector policy", () => {
    const fixture = {
      cards: cards.filter((card) => card.id === "ch01-019"),
      reviews: [guidedSuccess("buyer-success", "knowledge-check:buyer")],
      settings: NO_EXAM,
      nowMs: NOW,
    } as const;
    const guidedLesson = selectGuidedNextStep(fixture);
    const highYieldLesson = selectHighYieldNextStep(fixture);
    expect(guidedLesson.kind).toBe("lesson");
    expect(highYieldLesson.kind).toBe("lesson");
    if (guidedLesson.kind !== "lesson" || highYieldLesson.kind !== "lesson") return;
    expect(guidedLesson.conceptId).toBe("percentage");
    expect(highYieldLesson.conceptId).toBe(guidedLesson.conceptId);

    const seen = new Set([guidedLesson.conceptId]);
    const guidedNext = selectGuidedNextStep({ ...fixture, lessonSeenConceptIds: seen });
    const highYieldNext = selectHighYieldNextStep({
      ...fixture,
      lessonSeenConceptIds: seen,
    });
    expect(guidedNext.kind).toBe("knowledge-check");
    expect(highYieldNext.kind).toBe("knowledge-check");
    if (guidedNext.kind === "knowledge-check") {
      expect(guidedNext.skill.conceptId).toBe("percentage");
    }
    if (highYieldNext.kind === "knowledge-check") {
      expect(highYieldNext.skill.conceptId).toBe("percentage");
    }
  });

  it("moves a no-card concept to its existing check and a card-backed concept to its card", () => {
    const noCardInput = {
      cards: cards.filter((card) => card.id === "ch01-019"),
      reviews: [guidedSuccess("buyer-success-2", "knowledge-check:buyer")],
      settings: NO_EXAM,
      nowMs: NOW,
    } as const;
    const noCardNext = selectGuidedNextStep({
      ...noCardInput,
      lessonSeenConceptIds: new Set(["percentage"]),
    });
    expect(noCardNext.kind).toBe("knowledge-check");
    if (noCardNext.kind === "knowledge-check") {
      expect(noCardNext.skill.conceptId).toBe("percentage");
    }

    const cardBackedInput = {
      cards: cards.filter((card) => card.id === "ch10-017"),
      reviews: [
        canonicalRecall("asset-weak", "ch06-015", "struggled"),
        canonicalRecall("stock-positive", "ch03-010", "got_it"),
      ],
      settings: NO_EXAM,
      nowMs: NOW,
    } as const;
    const cardBackedLesson = selectGuidedNextStep(cardBackedInput);
    expect(cardBackedLesson.kind).toBe("lesson");
    if (cardBackedLesson.kind !== "lesson") return;
    expect(cardBackedLesson.conceptId).toBe("capital");
    const cardBackedNext = selectGuidedNextStep({
      ...cardBackedInput,
      lessonSeenConceptIds: new Set(["capital"]),
    });
    expect(cardBackedNext.kind).toBe("canonical-card");
    if (cardBackedNext.kind === "canonical-card") {
      expect(cardBackedNext.card.id).toBe("ch10-017");
      expect(cardBackedNext.state.reviewCount).toBe(0);
    }
  });

  it("round-trips lesson IDs, replaces the set, and treats old backups as empty", async () => {
    const databaseName = `lesson-seen-backup-${Date.now()}-${Math.random()}`;
    const repository = new ProgressRepository(reviewableProgressIds, databaseName);
    const snapshot: ProgressSnapshot = {
      settings: NO_EXAM,
      cardStates: {},
      reviewEvents: [],
      mockAttempts: [],
      lessonSeenConceptIds: ["percentage", "capital"],
    };
    try {
      await repository.resetAll();
      const backupText = serializeProgressBackup(snapshot, "2026-08-11T00:01:00.000Z");
      expect(JSON.parse(backupText).lessonSeenConceptIds).toEqual([
        "percentage",
        "capital",
      ]);
      const parsed = parseProgressBackupText(backupText, reviewableProgressIds);
      await repository.replaceAll(parsed);
      expect((await repository.load()).lessonSeenConceptIds).toEqual([
        "capital",
        "percentage",
      ]);

      const replacement = createProgressBackup(
        {
          ...snapshot,
          lessonSeenConceptIds: ["buyer"],
        },
        "2026-08-11T00:02:00.000Z",
      );
      await repository.replaceAll(replacement);
      expect((await repository.load()).lessonSeenConceptIds).toEqual(["buyer"]);

      const legacyV2 = { ...replacement };
      delete legacyV2.lessonSeenConceptIds;
      expect(
        parseProgressBackupText(JSON.stringify(legacyV2), reviewableProgressIds)
          .lessonSeenConceptIds,
      ).toEqual([]);
      expect(
        parseProgressBackupText(
          JSON.stringify({
            ...legacyV2,
            version: 1,
          }),
          reviewableProgressIds,
        ).lessonSeenConceptIds,
      ).toEqual([]);

      expect(() =>
        parseProgressBackupText(
          JSON.stringify({ ...replacement, lessonSeenConceptIds: "percentage" }),
          reviewableProgressIds,
        ),
      ).toThrow(/must be an array/);
      expect(() =>
        parseProgressBackupText(
          JSON.stringify({ ...replacement, lessonSeenConceptIds: ["unknown"] }),
          reviewableProgressIds,
        ),
      ).toThrow(/unknown knowledge concept/);
      expect(() =>
        parseProgressBackupText(
          JSON.stringify({
            ...replacement,
            lessonSeenConceptIds: ["buyer", "buyer"],
          }),
          reviewableProgressIds,
        ),
      ).toThrow(/duplicate lesson/);
    } finally {
      await repository.close();
      await deleteDB(databaseName);
    }
  });

  it("clears lesson acknowledgement on ordinary progress reset", async () => {
    const databaseName = `lesson-seen-reset-${Date.now()}-${Math.random()}`;
    const repository = new ProgressRepository(reviewableProgressIds, databaseName);
    try {
      await repository.resetAll();
      await repository.markLessonSeen("percentage");
      await repository.resetAll();
      expect((await repository.load()).lessonSeenConceptIds).toEqual([]);
    } finally {
      await repository.close();
      await deleteDB(databaseName);
    }
  });

  it("keeps local lesson acknowledgement during sync and leaves SyncPayloadV1 unchanged", async () => {
    const databaseName = `lesson-seen-sync-${Date.now()}-${Math.random()}`;
    const repository = new ProgressRepository(reviewableProgressIds, databaseName);
    const remote = new ImmediateSyncRemote();
    const coordinator = new SyncCoordinator({
      repository,
      api: remote,
      validCardIds: reviewableProgressIds,
      debounceMs: 0,
      now: () => "2026-08-11T00:03:00.000Z",
    });
    try {
      await repository.resetAll();
      await repository.markLessonSeen("percentage");
      await coordinator.createGroup();
      await repository.recordReview({
        id: "sync-review",
        cardId: "ch01-001",
        reviewedAt: "2026-08-11T00:03:00.000Z",
        mode: "recall",
        correct: true,
        rating: "got_it",
        responseTimeMs: null,
        selectedChoice: null,
      });
      await coordinator.syncNow();

      expect((await repository.load()).lessonSeenConceptIds).toEqual(["percentage"]);
      const payload = (await decryptSyncPayload(
        remote.envelope!,
        remote.credentials!,
      )) as SyncPayloadV1;
      expect(Object.keys(payload).sort()).toEqual([
        "format",
        "mockAttempts",
        "reviews",
        "settings",
        "version",
      ]);
      expect(payload).not.toHaveProperty("lessonSeenConceptIds");
    } finally {
      coordinator.dispose();
      await repository.close();
      await deleteDB(databaseName);
    }
  });
});
