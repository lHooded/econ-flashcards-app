import { describe, expect, it } from "vitest";
import { cardIds, cards } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import { buildMockExam } from "../exam/mock/selector";
import { createMockAttempt } from "../exam/mock/model";
import { MockExamRepository } from "../db/mockExamRepository";
import { ProgressRepository } from "../db/progressRepository";
import { createProgressBackup, parseProgressBackupText } from "../domain/backup";
import {
  deriveExamSrsSnapshot,
  deriveReviewEvidence,
} from "../study/examSrs/deriveState";

const questionIds = new Set(examQuestions.map((question) => question.id));

describe("mock exam repository", () => {
  it("atomically commits exactly 60 reviews and is idempotent", async () => {
    const progress = new ProgressRepository(cardIds);
    await progress.resetAll();
    const repository = new MockExamRepository(cardIds, questionIds);
    const build = buildMockExam({ bank: examQuestions, seed: "repo" });
    const attempt = createMockAttempt({
      ...build,
      id: "repo-attempt",
      seed: "repo",
      createdAt: "2026-08-11T00:00:00.000Z",
    });
    await repository.createAttempt(attempt);
    const submitted = await repository.finalizeAttempt(
      attempt.id,
      "2026-08-11T02:00:00.000Z",
    );
    expect(submitted.reviewEvents).toHaveLength(60);
    expect(submitted.attempt.status).toBe("submitted");
    expect(submitted.attempt.submittedAt).toBe(attempt.writingEndsAt);
    expect(
      submitted.reviewEvents.every(
        (event) => event.reviewedAt === attempt.writingEndsAt,
      ),
    ).toBe(true);
    const loaded = await progress.load();
    expect(loaded.reviews).toHaveLength(60);
    expect(
      loaded.cardStates.reduce((total, state) => total + state.totalReviews, 0),
    ).toBe(60);
    const exportedAttempt = (await repository.listAttempts())[0];
    const exported = createProgressBackup(
      {
        settings: loaded.settings,
        cardStates: Object.fromEntries(
          loaded.cardStates.map((state) => [state.cardId, state]),
        ),
        reviewEvents: loaded.reviews,
        mockAttempts: exportedAttempt === undefined ? [] : [exportedAttempt],
      },
      "2026-08-11T02:00:01.000Z",
    );
    expect(
      parseProgressBackupText(JSON.stringify(exported), cardIds, questionIds)
        .mockAttempts,
    ).toHaveLength(1);
    const again = await repository.finalizeAttempt(
      attempt.id,
      "2026-08-11T03:00:00.000Z",
    );
    expect(again.reviewEvents).toHaveLength(0);
    expect((await progress.load()).reviews).toHaveLength(60);
  });

  it("rolls back a failure after an in-transaction event without partial state", async () => {
    const progress = new ProgressRepository(cardIds);
    await progress.resetAll();
    const build = buildMockExam({ bank: examQuestions, seed: "failure" });
    const attempt = createMockAttempt({
      ...build,
      id: "failure-attempt",
      seed: "failure",
      createdAt: "2026-08-11T00:00:00.000Z",
    });
    const failing = new MockExamRepository(cardIds, questionIds, (processed) => {
      if (processed === 1) throw new Error("simulated transaction failure");
    });
    await failing.createAttempt(attempt);
    await expect(
      failing.finalizeAttempt(attempt.id, "2026-08-11T02:00:00.000Z"),
    ).rejects.toThrow("simulated transaction failure");
    expect((await progress.load()).reviews).toHaveLength(0);
    const retry = new MockExamRepository(cardIds, questionIds);
    const result = await retry.finalizeAttempt(attempt.id, "2026-08-11T02:01:00.000Z");
    expect(result.reviewEvents).toHaveLength(60);
    expect((await progress.load()).reviews).toHaveLength(60);
  });

  it("uses the authoritative objective evidence for correct, wrong, and unanswered answers", async () => {
    const progress = new ProgressRepository(cardIds);
    await progress.resetAll();
    const repository = new MockExamRepository(cardIds, questionIds);
    const build = buildMockExam({ bank: examQuestions, seed: "evidence" });
    const attempt = createMockAttempt({
      ...build,
      id: "evidence-attempt",
      seed: "evidence",
      createdAt: "2026-08-11T00:00:00.000Z",
    });
    const first = attempt.manifest[0];
    const second = attempt.manifest[1];
    const states = attempt.questionStates.map((state) =>
      state.questionId === first.questionId
        ? {
            ...state,
            selectedChoice: first.correctChoice,
            lastAnsweredAt: "2026-08-11T00:01:00.000Z",
          }
        : state.questionId === second.questionId
          ? {
              ...state,
              selectedChoice: ((second.correctChoice + 1) % 4) as 0 | 1 | 2 | 3,
              lastAnsweredAt: "2026-08-11T00:01:00.000Z",
            }
          : state,
    );
    await repository.createAttempt(attempt);
    await repository.updateAttemptProgress(attempt.id, states, 0);
    const finalized = await repository.finalizeAttempt(
      attempt.id,
      "2026-08-11T02:00:00.000Z",
    );
    const firstEvent = finalized.reviewEvents.find(
      (event) => event.cardId === first.reviewCardId,
    );
    const secondEvent = finalized.reviewEvents.find(
      (event) => event.cardId === second.reviewCardId,
    );
    const thirdEvent = finalized.reviewEvents.find(
      (event) => event.cardId === attempt.manifest[2].reviewCardId,
    );
    expect(firstEvent && deriveReviewEvidence(firstEvent)).toMatchObject({
      outcome: "strong_success",
      strengthDelta: 0.75,
    });
    expect(secondEvent && deriveReviewEvidence(secondEvent)).toMatchObject({
      outcome: "failure",
      strengthDelta: 0,
    });
    expect(thirdEvent?.correct).toBe(false);
  });

  it("rebuilds affected CardState chronologically when a mock is finalised late", async () => {
    const progress = new ProgressRepository(cardIds);
    await progress.resetAll();
    const repository = new MockExamRepository(cardIds, questionIds);
    const build = buildMockExam({ bank: examQuestions, seed: "out-of-order" });
    const attempt = createMockAttempt({
      ...build,
      id: "out-of-order-attempt",
      seed: "out-of-order",
      createdAt: "2026-08-11T06:40:00.000Z",
    });
    const first = attempt.manifest[0];
    const states = attempt.questionStates.map((state) =>
      state.questionId === first.questionId
        ? { ...state, lastAnsweredAt: "2026-08-11T08:30:00.000Z" }
        : state,
    );
    await repository.createAttempt(attempt);
    await repository.updateAttemptProgress(attempt.id, states, 0);
    await progress.recordReview({
      id: "later-study-review",
      cardId: first.reviewCardId,
      reviewedAt: "2026-08-11T09:30:00.000Z",
      mode: "mcq",
      rating: null,
      correct: true,
      responseTimeMs: null,
      selectedChoice: first.correctChoice,
    });

    await repository.finalizeAttempt(attempt.id, "2026-08-11T15:00:00.000Z");
    const loaded = await progress.load();
    const cardState = loaded.cardStates.find(
      (state) => state.cardId === first.reviewCardId,
    );
    const relevant = loaded.reviews.filter(
      (review) => review.cardId === first.reviewCardId,
    );

    expect(relevant.map((review) => review.reviewedAt)).toEqual([
      "2026-08-11T08:30:00.000Z",
      "2026-08-11T09:30:00.000Z",
    ]);
    expect(cardState).toMatchObject({
      firstSeenAt: "2026-08-11T08:30:00.000Z",
      lastSeenAt: "2026-08-11T09:30:00.000Z",
      totalReviews: 2,
      correctReviews: 1,
      consecutiveCorrect: 1,
    });

    const srsState = deriveExamSrsSnapshot(
      cards,
      relevant,
      { examAt: null, studyBufferHours: 24 },
      Date.parse("2026-08-11T10:00:00.000Z"),
    ).stateByCardId[first.reviewCardId];
    expect(srsState).toMatchObject({
      reviewCount: 2,
      lastReviewedAt: "2026-08-11T09:30:00.000Z",
      strength: 0.75,
      lastOutcome: "strong_success",
    });
  });

  it("finalises a stored attempt when a later bank no longer has its display question", async () => {
    const progress = new ProgressRepository(cardIds);
    await progress.resetAll();
    const build = buildMockExam({
      bank: examQuestions,
      seed: "missing-display-finalise",
    });
    const attempt = createMockAttempt({
      ...build,
      id: "missing-display-finalise-attempt",
      seed: "missing-display-finalise",
      createdAt: "2026-08-11T00:00:00.000Z",
    });
    const first = attempt.manifest[0];
    const answeredStates = attempt.questionStates.map((state) =>
      state.questionId === first.questionId
        ? {
            ...state,
            selectedChoice: first.correctChoice,
            lastAnsweredAt: "2026-08-11T01:00:00.000Z",
          }
        : state,
    );
    const originalRepository = new MockExamRepository(cardIds, questionIds);
    await originalRepository.createAttempt(attempt);
    await originalRepository.updateAttemptProgress(attempt.id, answeredStates, 0);

    const missingQuestionIds = new Set(
      [...questionIds].filter((questionId) => questionId !== first.questionId),
    );
    const laterRepository = new MockExamRepository(cardIds, missingQuestionIds);
    const finalized = await laterRepository.finalizeAttempt(
      attempt.id,
      "2026-08-11T15:00:00.000Z",
    );

    expect(finalized.attempt.status).toBe("submitted");
    expect(finalized.attempt.submittedAt).toBe(attempt.writingEndsAt);
    expect(finalized.reviewEvents).toHaveLength(60);
    expect(finalized.result).toMatchObject({ score: 1, total: 60 });
    expect(
      finalized.reviewEvents.find((event) => event.cardId === first.reviewCardId),
    ).toMatchObject({ correct: true, selectedChoice: first.correctChoice });
  });

  it("aborts on a normal application exception before any mock review commits", async () => {
    const progress = new ProgressRepository(cardIds);
    await progress.resetAll();
    const build = buildMockExam({ bank: examQuestions, seed: "application-error" });
    const attempt = createMockAttempt({
      ...build,
      id: "application-error-attempt",
      seed: "application-error",
      createdAt: "2026-08-11T00:00:00.000Z",
    });
    const invalidCardRepository = new MockExamRepository(new Set(), questionIds);
    await invalidCardRepository.createAttempt(attempt);

    await expect(
      invalidCardRepository.finalizeAttempt(attempt.id, "2026-08-11T02:00:00.000Z"),
    ).rejects.toThrow(/Unknown review card/);
    expect((await progress.load()).reviews).toHaveLength(0);
    expect((await invalidCardRepository.getAttempt(attempt.id))?.status).toBe("active");
  });

  it("rejects abandoning an attempt once its writing time has expired", async () => {
    const progress = new ProgressRepository(cardIds);
    await progress.resetAll();
    const repository = new MockExamRepository(cardIds, questionIds);
    const attempt = createMockAttempt({
      ...buildMockExam({ bank: examQuestions, seed: "expired-abandon" }),
      id: "expired-abandon-attempt",
      seed: "expired-abandon",
      createdAt: "2026-08-11T00:00:00.000Z",
    });
    await repository.createAttempt(attempt);
    await expect(
      repository.abandonAttempt(attempt.id, "2026-08-11T02:00:00.000Z"),
    ).rejects.toThrow(/expired mock/);
    expect((await repository.getAttempt(attempt.id))?.status).toBe("active");
  });
});
