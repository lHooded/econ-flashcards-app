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

  it("matches the committed 29-skill attribution audit", () => {
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
    ).toHaveLength(8);
    expect(
      examSkillEvidence.filter(
        (skill) => relationFor(skill, "final-practice-2018-19") === "direct",
      ),
    ).toHaveLength(27);
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
