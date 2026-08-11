import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import { knowledgeConcepts } from "../knowledge/data";
import { examEvidenceSources } from "../examYield/sources";
import { examSkillEvidence } from "../examYield/skills";
import {
  directYieldForSkill,
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
      sourceCount: 8,
      skillCount: 29,
      criticalCount: 12,
      veryHighCount: 10,
      coreCount: 7,
      supportCount: 0,
      mappedConcepts: 127,
      mappedCards: 119,
      mappedQuestions: 84,
      criticalWithRetrieval: 12,
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
            conceptIds: ["missing-concept"],
            probability: 0.5,
          } as never,
        ],
      }),
    ).toThrow(/unknown concept|forbidden probability/);

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
      "Directly tested in the 2020 final",
    );
    expect(getExamYieldReasons("ch09-041")[0]?.label).toBe(
      "Repeated in final MCQ practice",
    );
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
