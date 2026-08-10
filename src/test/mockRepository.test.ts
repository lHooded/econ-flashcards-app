import { describe, expect, it } from "vitest";
import { cardIds } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import { buildMockExam } from "../exam/mock/selector";
import { createMockAttempt } from "../exam/mock/model";
import { MockExamRepository } from "../db/mockExamRepository";
import { ProgressRepository } from "../db/progressRepository";
import { createProgressBackup, parseProgressBackupText } from "../domain/backup";
import { deriveReviewEvidence } from "../study/examSrs/deriveState";

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
});
