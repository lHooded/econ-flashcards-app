import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import { cardConceptMap } from "../knowledge/contentMap";
import { knowledgeConcepts } from "../knowledge/data";
import { getLearningPath, prerequisiteTopologicalOrder } from "../knowledge/graph";
import { validateKnowledgeGraph } from "../knowledge/validate";
import type { KnowledgeConcept, KnowledgeSource } from "../knowledge/model";
import rawSources from "../../knowledge/sources.json";

describe("course knowledge graph", () => {
  it("validates the bundled graph and complete content coverage", () => {
    const stats = validateKnowledgeGraph({
      concepts: knowledgeConcepts,
      cards,
      questions: examQuestions,
      cardConceptMap,
      sources: rawSources as readonly KnowledgeSource[],
    });
    expect(stats.cardsMapped).toBe(349);
    expect(stats.questionsMapped).toBe(examQuestions.length);
    expect(stats.cycles).toBe(0);
    expect(stats.ambiguousInlineAliases).toBe(1);
  });

  it("returns a deterministic prerequisite-respecting path", () => {
    const path = getLearningPath("bond-yield");
    expect(path.at(-1)).toBe("bond-yield");
    expect(path.indexOf("bond")).toBeLessThan(path.indexOf("bond-yield"));
    expect(path.indexOf("interest-rate")).toBeLessThan(path.indexOf("bond-yield"));
    expect(prerequisiteTopologicalOrder.indexOf("interest-rate")).toBeLessThan(
      prerequisiteTopologicalOrder.indexOf("real-interest-rate"),
    );
  });

  it("fails on a missing prerequisite and on a cycle", () => {
    const source = rawSources[0];
    const concept = (
      id: string,
      prerequisites: readonly string[],
    ): KnowledgeConcept => ({
      id,
      name: id,
      aliases: [id],
      searchTerms: [],
      chapters: [0],
      tags: ["foundation"],
      summary: "summary",
      intuition: "intuition",
      explanation: ["explanation"],
      whyItMatters: "why",
      prerequisites,
      relatedConcepts: [],
      sourceRefs: [{ sourceId: source.id, page: 1, note: "test" }],
      linkedCardIds: [],
      linkedQuestionIds: [],
    });
    const base = {
      cards: [],
      questions: [],
      cardConceptMap: {},
      sources: rawSources as readonly KnowledgeSource[],
    } as const;

    expect(() =>
      validateKnowledgeGraph({ ...base, concepts: [concept("a", ["missing"])] }),
    ).toThrow(/missing prerequisite/);
    expect(() =>
      validateKnowledgeGraph({
        ...base,
        concepts: [concept("a", ["b"]), concept("b", ["a"])],
      }),
    ).toThrow(/cycle/);
  });
});
