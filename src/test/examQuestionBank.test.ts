import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import {
  adaptCanonicalMcqCard,
  examQuestions,
  examQuestionStats,
} from "../exam/questionBank";
import { validateExamQuestionBank } from "../exam/validateQuestionBank";

const canonicalCardIds = new Set(cards.map((card) => card.id));

function clonedBank(): Array<Record<string, unknown>> {
  return structuredClone(examQuestions) as unknown as Array<Record<string, unknown>>;
}

function strictOptions(overrides: Record<string, unknown> = {}) {
  return {
    canonicalCardIds,
    enforceBankInvariants: true,
    minimumTotal: 0,
    minimumChapterSpecific: 0,
    minimumMixed: 0,
    ...overrides,
  } as const;
}

describe("exam question bank", () => {
  it("loads the full deterministic unified bank", () => {
    expect(examQuestions).toHaveLength(131);
    expect(examQuestionStats).toMatchObject({
      total: 131,
      canonical: 31,
      authored: 100,
      uniqueReviewCardIds: 131,
    });
    expect(examQuestions).toEqual(
      validateExamQuestionBank(structuredClone(examQuestions), {
        canonicalCardIds,
      }),
    );
    expect(Object.isFrozen(examQuestions)).toBe(true);
  });

  it("rejects malformed four-choice structures", () => {
    const malformed = clonedBank();
    (malformed[0].choices as string[]).pop();
    expect(() => validateExamQuestionBank(malformed, { canonicalCardIds })).toThrow(
      /exactly four/,
    );
  });

  it("rejects an invalid correct-choice index", () => {
    const malformed = clonedBank();
    malformed[0].correctChoice = 4;
    expect(() => validateExamQuestionBank(malformed, { canonicalCardIds })).toThrow(
      /correctChoice/,
    );
  });

  it("rejects duplicate choices after normalization", () => {
    const malformed = clonedBank();
    malformed[0].choices = ["same", " SAME ", "third", "fourth"];
    expect(() => validateExamQuestionBank(malformed, { canonicalCardIds })).toThrow(
      /duplicate values/,
    );
  });

  it("rejects unknown review and source cards", () => {
    const unknownReview = clonedBank();
    unknownReview[0].reviewCardId = "missing-card";
    unknownReview[0].sourceCardIds = ["missing-card"];
    expect(() => validateExamQuestionBank(unknownReview, { canonicalCardIds })).toThrow(
      /unknown canonical card/,
    );

    const unknownSource = clonedBank();
    unknownSource[0].sourceCardIds = [unknownSource[0].reviewCardId, "missing-card"];
    expect(() => validateExamQuestionBank(unknownSource, { canonicalCardIds })).toThrow(
      /unknown canonical card/,
    );
  });

  it("requires reviewCardId to be present in sourceCardIds", () => {
    const malformed = clonedBank();
    malformed[0].sourceCardIds = ["ch01-001"];
    expect(() => validateExamQuestionBank(malformed, { canonicalCardIds })).toThrow(
      /reviewCardId must be included/,
    );
  });

  it("rejects duplicate question IDs and duplicate review-card mappings", () => {
    const duplicateQuestion = clonedBank();
    duplicateQuestion[1].id = duplicateQuestion[0].id;
    expect(() =>
      validateExamQuestionBank(duplicateQuestion, { canonicalCardIds }),
    ).toThrow(/duplicate question ID/);

    const duplicateReviewCard = clonedBank();
    duplicateReviewCard[1].reviewCardId = duplicateReviewCard[0].reviewCardId;
    duplicateReviewCard[1].sourceCardIds = [duplicateReviewCard[0].reviewCardId];
    expect(() =>
      validateExamQuestionBank(duplicateReviewCard, { canonicalCardIds }),
    ).toThrow(/duplicate reviewCardId/);
  });

  it("detects chapter and mixed-pool quota failures", () => {
    const withoutChapterOne = examQuestions.filter(
      (question) => question.chapter !== 1,
    );
    expect(() =>
      validateExamQuestionBank(
        withoutChapterOne,
        strictOptions({ minimumChapterSpecific: 10 }),
      ),
    ).toThrow(/Chapter 1/);

    const withoutMixed = examQuestions.filter((question) => question.chapter !== 0);
    expect(() =>
      validateExamQuestionBank(withoutMixed, strictOptions({ minimumMixed: 30 })),
    ).toThrow(/mixed question count/);
  });

  it("detects answer-position imbalance while allowing a balanced bank", () => {
    const imbalanced = clonedBank().slice(0, 4);
    for (const question of imbalanced) question.correctChoice = 0;
    expect(() => validateExamQuestionBank(imbalanced, strictOptions())).toThrow(
      /position imbalance/,
    );

    expect(() =>
      validateExamQuestionBank(examQuestions, {
        canonicalCardIds,
        enforceBankInvariants: true,
      }),
    ).not.toThrow();
  });

  it("adapts every canonical authored MCQ without changing its stem, choices, or key", () => {
    const canonicalMcqs = cards.filter((card) => card.choices !== undefined);
    expect(canonicalMcqs).toHaveLength(31);
    for (const card of canonicalMcqs) {
      const adapted = adaptCanonicalMcqCard(card);
      expect(adapted.stem).toBe(card.front);
      expect(adapted.choices).toEqual(card.choices);
      expect(adapted.correctChoice).toBe(card.correctChoice);
      expect(adapted.reviewCardId).toBe(card.id);
      expect(adapted.sourceCardIds).toContain(card.id);
      expect(adapted.provenance).toBe("canonical_mcq");
    }
  });
});
