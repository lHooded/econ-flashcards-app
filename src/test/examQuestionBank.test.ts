import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import {
  adaptCanonicalMcqCard,
  examQuestions,
  examQuestionStats,
} from "../exam/questionBank";
import { validateExamQuestionBank } from "../exam/validateQuestionBank";
import { validateQuestionStimulus } from "../stimulus/validateStimulus";
import { curveYAt, hasDiminishingSlope, isPointOnCurve } from "../stimulus/geometry";

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
    minimumStimulus: 0,
    minimumGraphs: 0,
    minimumTables: 0,
    minimumChapterStimulus: 0,
    ...overrides,
  } as const;
}

describe("exam question bank", () => {
  it("loads the full deterministic unified bank", () => {
    expect(examQuestions).toHaveLength(examQuestionStats.total);
    expect(examQuestionStats).toMatchObject({
      total: 197,
      canonical: 31,
      authored: 166,
      stimulusCount: 39,
      graphCount: 20,
      tableCount: 19,
      uniqueReviewCardIds: 175,
      reviewCardsWithMultipleQuestions: 22,
      maximumQuestionsPerReviewCard: 2,
    });
    expect(examQuestionStats.byChapterStimulus).toEqual({
      "0": 0,
      "1": 5,
      "2": 3,
      "3": 4,
      "4": 3,
      "5": 5,
      "6": 3,
      "7": 4,
      "8": 3,
      "9": 5,
      "10": 4,
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

  it("rejects duplicate question IDs but allows controlled review-card variants", () => {
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
    ).not.toThrow();

    const tooManyVariants = clonedBank().slice(0, 3);
    const sharedReviewCardId = tooManyVariants[0].reviewCardId as string;
    for (const question of tooManyVariants) {
      question.reviewCardId = sharedReviewCardId;
      question.sourceCardIds = [sharedReviewCardId];
    }
    expect(() =>
      validateExamQuestionBank(
        tooManyVariants,
        strictOptions({ maximumQuestionsPerReviewCard: 2 }),
      ),
    ).toThrow(/maximum is 2/);
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

  it("detects graph, table and per-chapter stimulus quota failures", () => {
    const withoutGraphs = examQuestions.filter(
      (question) => question.stimulus?.type !== "econ_graph",
    );
    expect(() =>
      validateExamQuestionBank(withoutGraphs, strictOptions({ minimumGraphs: 20 })),
    ).toThrow(/graph count/);

    const withoutTables = examQuestions.filter(
      (question) => question.stimulus?.type !== "table",
    );
    expect(() =>
      validateExamQuestionBank(withoutTables, strictOptions({ minimumTables: 10 })),
    ).toThrow(/table count/);

    const withoutChapterOneStimulus = examQuestions.filter(
      (question) => question.chapter !== 1 || question.stimulus === undefined,
    );
    expect(() =>
      validateExamQuestionBank(
        withoutChapterOneStimulus,
        strictOptions({ minimumChapterStimulus: 2 }),
      ),
    ).toThrow(/Chapter 1.*stimulus/);
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

  it("validates every committed stimulus and keeps text-only questions valid", () => {
    expect(
      examQuestions.filter((question) => question.stimulus === undefined),
    ).toHaveLength(examQuestions.length - examQuestionStats.stimulusCount);
    for (const question of examQuestions) {
      if (question.stimulus !== undefined) {
        expect(validateQuestionStimulus(structuredClone(question.stimulus))).toEqual(
          question.stimulus,
        );
      }
    }
  });

  it("keeps stimulus provenance attached to the directly tested canonical concepts", () => {
    const expectedMappings = {
      "auth-stim-ch02-001": "ch02-027",
      "auth-stim-ch03-002": "ch03-020",
      "auth-stim-ch04-001": "ch04-016",
      "auth-stim-ch05-001": "ch05-007",
      "auth-stim-ch08-003": "ch08-016",
      "auth-stim-ch09-003": "ch09-021",
    } as const;
    for (const [questionId, reviewCardId] of Object.entries(expectedMappings)) {
      const question = examQuestions.find((candidate) => candidate.id === questionId);
      expect(question?.reviewCardId).toBe(reviewCardId);
      expect(question?.sourceCardIds).toContain(reviewCardId);
    }
    const supplyShock = examQuestions.find(
      (question) => question.id === "auth-stim-ch08-002",
    );
    expect(supplyShock?.sourceCardIds).toEqual(["ch08-023", "ch08-014"]);
  });

  it.each([
    [
      "reversed axis domain",
      (stimulus: Record<string, unknown>) => {
        (stimulus.xAxis as Record<string, unknown>).domain = [10, 0];
      },
    ],
    [
      "infinite coordinate",
      (stimulus: Record<string, unknown>) => {
        const curves = stimulus.curves as Array<Record<string, unknown>>;
        const points = curves[0].points as Array<Record<string, unknown>>;
        points[0].x = Number.POSITIVE_INFINITY;
      },
    ],
    [
      "point outside domain",
      (stimulus: Record<string, unknown>) => {
        const points = stimulus.points as Array<Record<string, unknown>>;
        points[0].x = 1000;
      },
    ],
    [
      "duplicate curve ID",
      (stimulus: Record<string, unknown>) => {
        const curves = stimulus.curves as Array<Record<string, unknown>>;
        curves[1].id = curves[0].id;
      },
    ],
    [
      "one-point curve",
      (stimulus: Record<string, unknown>) => {
        const curves = stimulus.curves as Array<Record<string, unknown>>;
        (curves[0].points as unknown[]).splice(1);
      },
    ],
    [
      "missing accessible description",
      (stimulus: Record<string, unknown>) => {
        delete stimulus.description;
      },
    ],
    [
      "malformed discriminator",
      (stimulus: Record<string, unknown>) => {
        stimulus.type = "canvas";
      },
    ],
  ])("rejects a stimulus with %s", (_label, mutate) => {
    const source = examQuestions.find(
      (question) => question.id === "auth-stim-ch04-001",
    );
    if (source?.stimulus === undefined || source.stimulus.type !== "econ_graph") {
      throw new Error("The bank should contain a graph stimulus.");
    }
    const malformed = structuredClone(source.stimulus) as unknown as Record<
      string,
      unknown
    >;
    mutate(malformed);
    expect(() => validateQuestionStimulus(malformed)).toThrow();
  });

  it.each([
    [
      "malformed row width",
      (stimulus: Record<string, unknown>) => {
        const rows = stimulus.rows as Array<Record<string, unknown>>;
        (rows[0].cells as unknown[]).pop();
      },
    ],
    [
      "duplicate column key",
      (stimulus: Record<string, unknown>) => {
        const columns = stimulus.columns as Array<Record<string, unknown>>;
        columns[1].key = columns[0].key;
      },
    ],
  ])("rejects a table stimulus with %s", (_label, mutate) => {
    const source = examQuestions.find(
      (question) => question.stimulus?.type === "table",
    );
    if (source?.stimulus === undefined || source.stimulus.type !== "table") {
      throw new Error("The bank should contain a table stimulus.");
    }
    const malformed = structuredClone(source.stimulus) as unknown as Record<
      string,
      unknown
    >;
    mutate(malformed);
    expect(() => validateQuestionStimulus(malformed)).toThrow();
  });

  it("checks economics-relevant geometry for representative authored graphs", () => {
    const equilibriumQuestion = examQuestions.find(
      (question) => question.id === "auth-stim-ch04-001",
    );
    if (equilibriumQuestion?.stimulus?.type !== "econ_graph") {
      throw new Error("Expected the PAE equilibrium graph.");
    }
    const line45 = equilibriumQuestion.stimulus.curves.find(
      (curve) => curve.id === "45",
    );
    const pae1 = equilibriumQuestion.stimulus.curves.find(
      (curve) => curve.id === "PAE1",
    );
    const pae2 = equilibriumQuestion.stimulus.curves.find(
      (curve) => curve.id === "PAE2",
    );
    if (line45 === undefined || pae1 === undefined || pae2 === undefined) {
      throw new Error("Expected all PAE curves.");
    }
    expect(curveYAt(line45, 60)).toBe(60);
    expect(isPointOnCurve({ x: 60, y: 60 }, pae1, 0.1)).toBe(true);
    expect(isPointOnCurve({ x: 80, y: 80 }, pae2, 0.1)).toBe(true);

    const productionQuestion = examQuestions.find(
      (question) => question.id === "auth-stim-ch10-001",
    );
    if (productionQuestion?.stimulus?.type !== "econ_graph") {
      throw new Error("Expected the production-function graph.");
    }
    const productionCurve = productionQuestion.stimulus.curves[0];
    expect(hasDiminishingSlope(productionCurve)).toBe(true);
  });

  it("recognises the labour-supply and AD direction conventions in authored graphs", () => {
    const labourQuestion = examQuestions.find(
      (question) => question.id === "auth-stim-ch02-001",
    );
    const adQuestion = examQuestions.find(
      (question) => question.id === "auth-stim-ch08-001",
    );
    if (labourQuestion?.stimulus?.type !== "econ_graph") {
      throw new Error("Expected the labour-market graph.");
    }
    if (adQuestion?.stimulus?.type !== "econ_graph") {
      throw new Error("Expected the AD graph.");
    }
    const labourSupply = labourQuestion.stimulus.curves.find(
      (curve) => curve.id === "S",
    );
    const ad = adQuestion.stimulus.curves.find((curve) => curve.id === "AD0");
    if (labourSupply === undefined || ad === undefined) {
      throw new Error("Expected the labelled curves.");
    }
    expect(labourSupply.points.at(-1)!.y).toBeGreaterThan(labourSupply.points[0].y);
    expect(ad.points.at(-1)!.y).toBeLessThan(ad.points[0].y);

    const fxQuestion = examQuestions.find(
      (question) => question.id === "auth-stim-ch09-001",
    );
    if (fxQuestion?.stimulus?.type !== "econ_graph") {
      throw new Error("Expected the FX-market graph.");
    }
    const fxDemand = fxQuestion.stimulus.curves.find((curve) => curve.id === "D0");
    const fxSupply = fxQuestion.stimulus.curves.find((curve) => curve.id === "S");
    if (fxDemand === undefined || fxSupply === undefined) {
      throw new Error("Expected the FX demand and supply curves.");
    }
    expect(fxDemand.points.at(-1)!.y).toBeLessThan(fxDemand.points[0].y);
    expect(fxSupply.points.at(-1)!.y).toBeGreaterThan(fxSupply.points[0].y);
  });

  it("preserves the course horizontal short-run inflation-line convention", () => {
    const question = examQuestions.find(
      (candidate) => candidate.id === "auth-stim-ch08-002",
    );
    if (question?.stimulus?.type !== "econ_graph") {
      throw new Error("Expected the short-run inflation-output graph.");
    }
    const ad = question.stimulus.curves.find((curve) => curve.id === "AD");
    const pi0 = question.stimulus.curves.find((curve) => curve.id === "pi0");
    const pi1 = question.stimulus.curves.find((curve) => curve.id === "pi1");
    if (ad === undefined || pi0 === undefined || pi1 === undefined) {
      throw new Error("Expected AD, pi0 and pi1 curves.");
    }
    expect(pi0.points.every((point) => point.y === pi0.points[0].y)).toBe(true);
    expect(pi1.points.every((point) => point.y === pi1.points[0].y)).toBe(true);
    expect(pi1.points[0].y).toBeLessThan(pi0.points[0].y);
    expect(ad.points.at(-1)!.y).toBeLessThan(ad.points[0].y);

    const e0 = question.stimulus.points?.find((point) => point.id === "E0");
    const e1 = question.stimulus.points?.find((point) => point.id === "E1");
    if (e0 === undefined || e1 === undefined) {
      throw new Error("Expected both marked equilibria.");
    }
    expect(isPointOnCurve(e0, ad, 0.01)).toBe(true);
    expect(isPointOnCurve(e1, ad, 0.01)).toBe(true);
    expect(e1.y).toBeLessThan(e0.y);
    expect(e1.x).toBeGreaterThan(e0.x);
    expect(question.stimulus.title).not.toMatch(/favourable|supply shock/i);
  });

  it("uses the course real-rate convention for the PRF graph", () => {
    const question = examQuestions.find(
      (candidate) => candidate.id === "auth-stim-ch07-002",
    );
    if (question?.stimulus?.type !== "econ_graph") {
      throw new Error("Expected the policy reaction-function graph.");
    }
    expect(question.stimulus.yAxis.label).toBe("Real interest rate, r (%)");
    expect(question.stimulus.description).toContain("real interest rate");
    expect(question.stem).toContain("real interest rate");
  });
});
