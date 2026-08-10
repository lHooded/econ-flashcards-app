import { describe, expect, it } from "vitest";
import { cardIds } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import { buildMockExam } from "../exam/mock/selector";
import { createMockAttempt } from "../exam/mock/model";
import {
  createProgressBackup,
  parseProgressBackupText,
  serializeProgressBackup,
} from "../domain/backup";
import { ProgressRepository } from "../db/progressRepository";
import { MockExamRepository } from "../db/mockExamRepository";

const questionIds = new Set(examQuestions.map((question) => question.id));

describe("progress backup v2", () => {
  const attempt = createMockAttempt({
    ...buildMockExam({ bank: examQuestions, seed: "backup" }),
    id: "backup-attempt",
    seed: "backup",
    createdAt: "2026-08-11T00:00:00.000Z",
  });

  it("exports and imports active mock state", () => {
    const backup = createProgressBackup(
      {
        settings: { examAt: null, studyBufferHours: 24 },
        cardStates: {},
        reviewEvents: [],
        mockAttempts: [attempt],
      },
      "2026-08-11T01:00:00.000Z",
    );
    expect(backup.version).toBe(2);
    const parsed = parseProgressBackupText(
      serializeProgressBackup(
        {
          settings: backup.settings,
          cardStates: {},
          reviewEvents: [],
          mockAttempts: [attempt],
        },
        backup.exportedAt,
      ),
      cardIds,
      questionIds,
    );
    expect(parsed.mockAttempts).toEqual([attempt]);
  });

  it("migrates a real version-1-shaped fixture without mock history", () => {
    const fixture = {
      format: "econ-flashcards-progress",
      version: 1,
      exportedAt: "2026-08-11T01:00:00.000Z",
      settings: { examAt: null, studyBufferHours: 24 },
      cardStates: [
        {
          cardId: "ch01-001",
          firstSeenAt: "2026-08-10T00:00:00.000Z",
          lastSeenAt: "2026-08-10T00:00:00.000Z",
          totalReviews: 1,
          correctReviews: 0,
          consecutiveCorrect: 0,
        },
      ],
      reviews: [
        {
          id: "v1-review",
          cardId: "ch01-001",
          reviewedAt: "2026-08-10T00:00:00.000Z",
          mode: "recall",
          correct: false,
          rating: "forgot",
          responseTimeMs: 1000,
          selectedChoice: null,
        },
      ],
    };
    const parsed = parseProgressBackupText(
      JSON.stringify(fixture),
      cardIds,
      questionIds,
    );
    expect(parsed.version).toBe(2);
    expect(parsed.mockAttempts).toEqual([]);
    expect(parsed.settings).toEqual(fixture.settings);
    expect(parsed.cardStates).toHaveLength(1);
    expect(parsed.reviews).toEqual(fixture.reviews);
  });

  it("round-trips active and submitted mock records without replaying committed reviews", async () => {
    const active = {
      ...attempt,
      questionStates: attempt.questionStates.map((state, index) =>
        index === 0
          ? {
              ...state,
              selectedChoice: 1 as 0 | 1 | 2 | 3,
              flagged: true,
              timeSpentMs: 4200,
            }
          : state,
      ),
    };
    const submitted = {
      ...active,
      id: "backup-submitted",
      status: "submitted" as const,
      submittedAt: attempt.writingEndsAt,
      reviewEventsCommittedAt: "2026-08-11T03:00:00.000Z",
    };
    const reviews = submitted.manifest.map((manifest) => ({
      id: `mock:${submitted.id}:${manifest.questionId}`,
      cardId: manifest.reviewCardId,
      reviewedAt: submitted.writingEndsAt,
      mode: "mcq" as const,
      rating: null,
      correct: false,
      responseTimeMs: 0,
      selectedChoice: null,
    }));
    const backup = createProgressBackup(
      {
        settings: { examAt: null, studyBufferHours: 24 },
        cardStates: {},
        reviewEvents: reviews,
        mockAttempts: [active, submitted],
      },
      "2026-08-11T03:00:01.000Z",
    );
    const parsed = parseProgressBackupText(
      serializeProgressBackup(
        {
          settings: backup.settings,
          cardStates: {},
          reviewEvents: backup.reviews,
          mockAttempts: backup.mockAttempts,
        },
        backup.exportedAt,
      ),
      cardIds,
      questionIds,
    );
    expect(parsed.mockAttempts).toEqual([active, submitted]);

    const repository = new ProgressRepository(cardIds);
    await repository.resetAll();
    await repository.replaceAll(parsed);
    expect((await repository.load()).reviews).toHaveLength(60);
    await repository.replaceAll(parsed);
    expect((await repository.load()).reviews).toHaveLength(60);
  });

  it("keeps a submitted historical result valid when current display content is missing", async () => {
    const submitted = {
      ...attempt,
      status: "submitted" as const,
      submittedAt: attempt.writingEndsAt,
      reviewEventsCommittedAt: "2026-08-11T03:00:00.000Z",
    };
    const reviews = submitted.manifest.map((manifest) => ({
      id: `mock:${submitted.id}:${manifest.questionId}`,
      cardId: manifest.reviewCardId,
      reviewedAt: submitted.writingEndsAt,
      mode: "mcq" as const,
      rating: null,
      correct: false,
      responseTimeMs: 0,
      selectedChoice: null,
    }));
    const backup = createProgressBackup({
      settings: { examAt: null, studyBufferHours: 24 },
      cardStates: {},
      reviewEvents: reviews,
      mockAttempts: [submitted],
    });
    const missingQuestionIds = new Set(
      [...questionIds].filter((id) => id !== submitted.questionOrder[0]),
    );
    const parsed = parseProgressBackupText(
      JSON.stringify(backup),
      cardIds,
      missingQuestionIds,
    );
    expect(parsed.mockAttempts).toEqual([submitted]);
    const progress = new ProgressRepository(cardIds);
    await progress.resetAll();
    await progress.replaceAll(parsed);
    const historicalRepository = new MockExamRepository(cardIds, missingQuestionIds);
    await expect(historicalRepository.listAttempts()).resolves.toEqual([submitted]);
  });

  it("rejects duplicate review concepts and malformed mock attempts", () => {
    expect(() =>
      parseProgressBackupText(
        JSON.stringify({
          format: "econ-flashcards-progress",
          version: 2,
          exportedAt: "2026-08-11T01:00:00.000Z",
          settings: { examAt: null, studyBufferHours: 24 },
          cardStates: [],
          reviews: [],
          mockAttempts: [
            {
              ...attempt,
              id: "other",
              manifest: attempt.manifest.map((entry, index) =>
                index === 1
                  ? { ...entry, reviewCardId: attempt.manifest[0].reviewCardId }
                  : entry,
              ),
            },
          ],
        }),
        cardIds,
        questionIds,
      ),
    ).toThrow(/reviewCardId/);
  });
});
