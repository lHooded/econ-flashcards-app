import type { ExamQuestion } from "../exam/model";

/**
 * Independently audited answer indices for the 45-question Formula
 * Application lane. This is a hand-checked audit record, not a second
 * runtime question key or a symbolic theorem prover.
 */
export const FORMULA_APPLICATION_AUDITED_EXPECTED_CHOICES = Object.freeze({
  "auth-form-ch01-011": 3,
  "auth-ch01-005": 0,
  "auth-form-ch01-012": 3,
  "auth-form-ch02-012": 0,
  "auth-ch03-001": 0,
  "auth-stim-ch03-003": 1,
  "auth-form-ch03-011": 2,
  "auth-form-ch03-012": 1,
  "auth-ch03-008": 3,
  "auth-form-ch03-013": 3,
  "auth-ch04-004": 3,
  "auth-ch04-007": 2,
  "auth-stim-ch04-003": 1,
  "auth-form-ch04-011": 3,
  "auth-ch05-001": 0,
  "auth-form-ch05-012": 0,
  "auth-form-ch05-013": 3,
  "auth-form-ch05-014": 1,
  "auth-form-ch05-015": 0,
  "auth-ch05-009": 0,
  "auth-ch05-011": 3,
  "auth-stim-ch05-003": 0,
  "auth-form-ch05-016": 2,
  "auth-form-ch06-013": 3,
  "auth-ch06-001": 1,
  "auth-ch06-002": 3,
  "auth-ch07-004": 3,
  "auth-form-ch07-013": 2,
  "auth-ch08-001": 3,
  "auth-ch08-003": 0,
  "auth-form-ch08-012": 2,
  "auth-form-ch08-013": 1,
  "auth-form-ch08-014": 1,
  "auth-ch09-005": 0,
  "auth-ch09-006": 1,
  "auth-form-ch09-016": 2,
  "auth-ch09-013": 3,
  "auth-form-ch09-014": 1,
  "auth-form-ch09-015": 1,
  "auth-ch10-006": 3,
  "auth-form-ch10-015": 2,
  "auth-form-ch10-013": 0,
  "auth-form-ch10-014": 1,
  "auth-stim-ch10-003": 1,
  "auth-form-ch10-016": 0,
} as const);

export function auditFormulaApplicationAnswerKeys(
  questions: readonly ExamQuestion[],
): readonly string[] {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const issues: string[] = [];
  for (const [questionId, expectedChoice] of Object.entries(
    FORMULA_APPLICATION_AUDITED_EXPECTED_CHOICES,
  )) {
    const question = byId.get(questionId);
    if (question === undefined) {
      issues.push("Missing Formula Application audit question " + questionId);
    } else if (question.correctChoice !== expectedChoice) {
      issues.push(
        "Formula Application audited key mismatch for " +
          questionId +
          ": expected " +
          expectedChoice +
          ", found " +
          question.correctChoice,
      );
    }
  }
  return issues;
}
