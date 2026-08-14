import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import { examQuestions, getExamQuestion } from "../exam/questionBank";
import { cardConceptMap } from "../knowledge/contentMap";
import { knowledgeConcepts } from "../knowledge/data";
import { examEvidenceSources } from "../examYield/sources";
import { examSkillEvidence } from "../examYield/skills";
import {
  CHAPTER_PRIORS,
  directYieldForSkill,
  getExamSkillsForCard,
  getExamSkillsForConcept,
  getExamYieldForCard,
  getExamYieldForConcept,
  getExamYieldReasons,
  MAX_CHAPTER_PRIOR_CONTRIBUTION,
  MAX_PROPAGATED_YIELD,
  PROPAGATION_DECAY,
} from "../examYield/score";
import { validateExamYieldBlueprint } from "../examYield/validate";

describe("immutable exam-yield blueprint", () => {
  it("validates exact bundled mappings and qualitative tier counts", () => {
    const stats = validateExamYieldBlueprint({
      sources: examEvidenceSources,
      skills: examSkillEvidence,
      concepts: knowledgeConcepts,
      cards,
      questions: examQuestions,
    });
    expect(stats).toMatchObject({
      sourceCount: 11,
      skillCount: 33,
      criticalCount: 13,
      veryHighCount: 13,
      coreCount: 7,
      supportCount: 0,
      mappedConcepts: 154,
      mappedCards: 160,
      mappedQuestions: 104,
      criticalWithRetrieval: 13,
      criticalWithoutRetrieval: 0,
    });
    expect(stats.totalConcepts).toBe(knowledgeConcepts.length);
    expect(stats.totalCards).toBe(cards.length);
    expect(stats.totalQuestions).toBe(examQuestions.length);
  });

  it("rejects duplicate IDs, unknown mappings, bad weights and prediction fields", () => {
    expect(() =>
      validateExamYieldBlueprint({
        sources: [...examEvidenceSources, examEvidenceSources[0]],
        skills: examSkillEvidence,
      }),
    ).toThrow(/duplicate evidence source ID/);

    expect(() =>
      validateExamYieldBlueprint({
        sources: examEvidenceSources,
        skills: [
          {
            ...examSkillEvidence[0],
            id: "invalid",
            targetConceptIds: ["missing-concept"],
            probability: 0.5,
          } as never,
        ],
      }),
    ).toThrow(/unknown concept|forbidden probability/);

    expect(() =>
      validateExamYieldBlueprint({
        sources: examEvidenceSources,
        skills: [
          {
            ...examSkillEvidence[0],
            id: "invalid-relation",
            sourceEvidence: [
              { ...examSkillEvidence[0].sourceEvidence[0], relation: "unsupported" },
            ],
          } as never,
        ],
      }),
    ).toThrow(/invalid evidence relation/);

    expect(() =>
      validateExamYieldBlueprint({
        sources: examEvidenceSources,
        skills: [
          {
            ...examSkillEvidence[0],
            id: "invalid-supporting-concept",
            supportingConceptIds: ["missing-supporting-concept"],
          } as never,
        ],
      }),
    ).toThrow(/unknown concept/);

    expect(() =>
      validateExamYieldBlueprint({
        sources: [
          {
            ...examEvidenceSources[0],
            authenticityWeight: 1.1,
            url: "not-a-url",
          },
        ],
        skills: [],
      }),
    ).toThrow(/outside \[0, 1\]|malformed URL/);
  });

  it("keeps source evidence traceable without presenting a probability", () => {
    const skill = examSkillEvidence.find(
      (candidate) => candidate.id === "critical-fx-quotes-and-market",
    )!;
    expect(directYieldForSkill(skill)).toBeGreaterThan(100);
    expect(getExamYieldForCard("ch09-016").tier).toBe("critical");
    expect(getExamYieldReasons("ch09-016")[0]?.label).toBe(
      "Skill family tested in the 2020 final",
    );
    expect(getExamYieldReasons("ch09-041")[0]?.label).toBe(
      "Skill family repeated in final MCQ practice",
    );
  });

  it("keeps direct 2020 evidence truthful at card granularity", () => {
    const skill = examSkillEvidence.find(
      (candidate) => candidate.id === "core-cpi-inflation-deflation",
    )!;
    const score = getExamYieldForCard("ch01-027");
    expect(skill.cardIds).toContain("ch01-027");
    expect(score.directSkillIds).toContain(skill.id);
    expect(score.score).toBeGreaterThanOrEqual(directYieldForSkill(skill));
    expect(getExamYieldReasons("ch01-027")).toContainEqual({
      label: "Skill family tested in the 2020 final",
      priority: 100,
    });
    expect(getExamYieldReasons("ch01-027")).not.toContainEqual({
      label: "Directly tested in the 2020 final",
      priority: 100,
    });
  });

  it("matches the committed 33-skill attribution audit", () => {
    const relationFor = (skill: (typeof examSkillEvidence)[number], sourceId: string) =>
      skill.sourceEvidence.find((evidence) => evidence.sourceId === sourceId)
        ?.relation ?? "none";
    expect(
      examSkillEvidence.filter(
        (skill) => relationFor(skill, "actual-final-2020") === "direct",
      ),
    ).toHaveLength(14);
    expect(
      examSkillEvidence.filter(
        (skill) => relationFor(skill, "actual-final-2020") === "family",
      ),
    ).toHaveLength(7);
    expect(
      examSkillEvidence.filter(
        (skill) => relationFor(skill, "actual-final-2020") === "none",
      ),
    ).toHaveLength(12);
    expect(
      examSkillEvidence.filter(
        (skill) => relationFor(skill, "final-practice-2018-19") === "direct",
      ),
    ).toHaveLength(28);
    expect(
      examSkillEvidence.every((skill) =>
        skill.sourceEvidence.every((evidence) => evidence.note.trim().length > 0),
      ),
    ).toBe(true);
    expect(
      examSkillEvidence
        .find((skill) => skill.id === "critical-cobb-douglas-production")
        ?.sourceEvidence.find((evidence) => evidence.sourceId === "actual-final-2020")
        ?.relation,
    ).toBe("family");
    expect(
      examSkillEvidence
        .find((skill) => skill.id === "critical-cobb-douglas-production")
        ?.sourceEvidence.find(
          (evidence) => evidence.sourceId === "final-practice-2018-19",
        )?.relation,
    ).toBe("direct");
  });
});

describe("2026 practice-test calibration additions", () => {
  it("uses the intended priors without expanding the chapter-prior cap", () => {
    expect(CHAPTER_PRIORS).toEqual({
      0: 1.25,
      1: 0.85,
      2: 0.8,
      3: 0.85,
      4: 0.8,
      5: 1.05,
      6: 1.1,
      7: 1.15,
      8: 1.4,
      9: 1.4,
      10: 1.4,
    });

    const criticalAtEarlyPrior = {
      ...examSkillEvidence[0],
      id: "test-critical-prior-cap",
      chapterHints: [0],
      sourceEvidence: [],
      crossChapterMechanism: false,
    };
    const criticalAtLatePrior = {
      ...criticalAtEarlyPrior,
      id: "test-critical-late-prior-cap",
      chapterHints: [10],
    };
    const veryHighAtLatePrior = {
      ...criticalAtLatePrior,
      id: "test-very-high-late-prior-cap",
      tier: "very-high" as const,
    };
    expect(
      directYieldForSkill(criticalAtLatePrior) -
        directYieldForSkill(criticalAtEarlyPrior),
    ).toBeLessThanOrEqual(MAX_CHAPTER_PRIOR_CONTRIBUTION);
    expect(directYieldForSkill(criticalAtEarlyPrior)).toBeGreaterThan(
      directYieldForSkill(veryHighAtLatePrior),
    );
  });

  it("registers scoped practice evidence without a probability field", () => {
    const practiceSources = examEvidenceSources.filter((source) =>
      source.id.startsWith("practice-test-"),
    );
    expect(practiceSources.map((source) => source.id)).toEqual([
      "practice-test-1-2026",
      "practice-test-2-2026",
      "practice-test-3-2026",
    ]);
    for (const source of practiceSources) {
      expect(source.kind).toBe("recent-assessment");
      expect(source.notes).toMatch(/restricted to Chapters/);
      expect(source.notes).toMatch(/not comparable/);
      expect(source.notes).toMatch(/not a calibrated final appearance rate/);
      expect(
        Object.keys(source).some((key) => key.toLowerCase().includes("probab")),
      ).toBe(false);
    }
    expect(getExamYieldReasons("ch10-001")[0]).toEqual({
      label: "Current-course practice-test evidence",
      priority: 88,
    });
  });

  it("keeps new skills direct and prevents broad-concept leakage", () => {
    const adSkill = examSkillEvidence.find(
      (skill) => skill.id === "critical-ad-prf-quantitative-chain",
    )!;
    expect(adSkill.cardIds).toEqual(
      expect.arrayContaining([
        "ch08-001",
        "ch08-002",
        "ch08-003",
        "ch08-004",
        "ch08-005",
        "ch08-006",
        "ch08-031",
        "ch08-032",
      ]),
    );
    expect(getExamSkillsForCard("ch08-001")).toContainEqual(adSkill);
    expect(getExamSkillsForCard("ch08-007")).not.toContainEqual(adSkill);
    expect(getExamSkillsForConcept("ad-equation")).toContainEqual(adSkill);

    const livingStandards = examSkillEvidence.find(
      (skill) => skill.id === "very-high-growth-living-standards",
    )!;
    expect(livingStandards.supportingConceptIds).toContain("natural-capital");
    expect(livingStandards.targetConceptIds).not.toContain("natural-capital");
    expect(getExamSkillsForCard("ch10-024")).not.toContainEqual(livingStandards);
    expect(getExamSkillsForConcept("natural-capital")).not.toContainEqual(
      livingStandards,
    );
    expect(getExamYieldForCard("ch10-024").directSkillIds).not.toContain(
      livingStandards.id,
    );
  });

  it("maps the new retrieval cards, detailed BOP family and authored questions", () => {
    expect(cardConceptMap["ch10-031"]).toEqual(
      expect.arrayContaining([
        "cobb-douglas",
        "production-function",
        "marginal-product-capital",
        "marginal-product-labour",
      ]),
    );
    expect(cardConceptMap["ch08-033"]).toEqual(
      expect.arrayContaining([
        "anchored-inflation-expectations",
        "inflation-target",
        "supply-shock",
      ]),
    );
    const anchored = knowledgeConcepts.find(
      (concept) => concept.id === "anchored-inflation-expectations",
    )!;
    expect(anchored.linkedCardIds).toContain("ch08-033");
    expect(anchored.linkedQuestionIds).toContain("auth-ch08-011");

    const bop = examSkillEvidence.find(
      (skill) => skill.id === "critical-bop-current-account",
    )!;
    expect(bop.targetConceptIds).toEqual(
      expect.arrayContaining(["primary-income", "secondary-income"]),
    );
    expect(bop.cardIds).toEqual(expect.arrayContaining(["ch09-004", "ch09-005"]));
    expect(bop.cardIds).not.toContain("ch09-016");

    for (const id of [
      "auth-ch08-011",
      "auth-ch10-011",
      "auth-ch10-012",
      "auth-ch09-013",
      "auth-ch05-011",
    ]) {
      expect(getExamQuestion(id)).toBeDefined();
    }
    expect(getExamQuestion("auth-ch09-013")?.stimulus?.type).toBe("table");
  });

  it("promotes only the intended fiscal families and keeps user cost core", () => {
    expect(
      examSkillEvidence.find((skill) => skill.id === "core-fiscal-multipliers-debt"),
    ).toBeUndefined();
    expect(
      examSkillEvidence.find(
        (skill) => skill.id === "very-high-fiscal-multipliers-stabilisers",
      )?.tier,
    ).toBe("very-high");
    expect(
      examSkillEvidence.find(
        (skill) => skill.id === "very-high-budget-debt-sustainability",
      )?.tier,
    ).toBe("very-high");
    expect(
      examSkillEvidence.find((skill) => skill.id === "core-investment-user-cost")?.tier,
    ).toBe("core");
    expect(
      examSkillEvidence.find((skill) => skill.id === "core-investment-user-cost")?.tier,
    ).not.toBe("critical");
  });
});

describe("prerequisite exam-yield propagation", () => {
  it("propagates a critical descendant to a foundation with decay and a cap", () => {
    const ratio = getExamYieldForConcept("ratio");
    const nominalExchangeRate = getExamYieldForConcept("nominal-exchange-rate");
    const unrelated = getExamYieldForConcept("percentage");
    expect(ratio.directYield).toBe(0);
    expect(ratio.effectiveYield).toBe(MAX_PROPAGATED_YIELD);
    expect(nominalExchangeRate.effectiveYield).toBeGreaterThan(ratio.effectiveYield);
    expect(unrelated.effectiveYield).toBeLessThan(ratio.effectiveYield);
    expect(PROPAGATION_DECAY).toBe(0.6);
    expect(MAX_CHAPTER_PRIOR_CONTRIBUTION).toBe(8);
    expect(ratio.propagatedSkillIds).toContain("critical-fx-quotes-and-market");
  });
});
