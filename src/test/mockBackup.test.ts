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
      cardStates: [],
      reviews: [],
    };
    const parsed = parseProgressBackupText(
      JSON.stringify(fixture),
      cardIds,
      questionIds,
    );
    expect(parsed.version).toBe(2);
    expect(parsed.mockAttempts).toEqual([]);
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
