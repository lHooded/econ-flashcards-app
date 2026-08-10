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
    expect(examQuestions).toHaveLength(161);
    expect(examQuestionStats).toMatchObject({
      total: 161,
      canonical: 31,
      authored: 130,
      stimulusCount: 30,
      graphCount: 20,
      tableCount: 10,
      uniqueReviewCardIds: 161,
    });
    expect(examQuestionStats.byChapterStimulus).toEqual({
      "0": 0,
      "1": 3,
      "2": 3,
      "3": 3,
      "4": 3,
      "5": 3,
      "6": 3,
      "7": 3,
      "8": 3,
      "9": 3,
      "10": 3,
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
    ).toHaveLength(131);
    for (const question of examQuestions) {
      if (question.stimulus !== undefined) {
        expect(validateQuestionStimulus(structuredClone(question.stimulus))).toEqual(
          question.stimulus,
        );
      }
    }
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
});
