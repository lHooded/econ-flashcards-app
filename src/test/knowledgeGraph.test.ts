import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import {
  cardConceptEntries,
  cardConceptMap,
  cardConceptMappingStats,
} from "../knowledge/contentMap";
import { knowledgeConceptById, knowledgeConcepts } from "../knowledge/data";
import { getLearningPath, prerequisiteTopologicalOrder } from "../knowledge/graph";
import { deriveConceptStatuses } from "../knowledge/mastery";
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
      cardConceptEntries,
      fallbackMappings: cardConceptMappingStats.fallbackMappings,
      sources: rawSources as readonly KnowledgeSource[],
    });
    expect(stats.cardsMapped).toBe(349);
    expect(stats.explicitCardMappings).toBe(349);
    expect(stats.fallbackMappings).toBe(0);
    expect(stats.questionsMapped).toBe(examQuestions.length);
    expect(stats.cycles).toBe(0);
    expect(stats.ambiguousInlineAliases).toBe(1);
  });

  it("uses audited stable-ID semantics instead of topic or chapter fallbacks", () => {
    const expected: Readonly<Record<string, readonly string[]>> = {
      "ch01-018": ["cpi"],
      "ch02-004": ["unemployment-rate"],
      "ch03-006": [
        "fisher-relationship",
        "nominal-interest-rate",
        "real-interest-rate",
        "inflation-expectations",
      ],
      "ch04-012": ["multiplier"],
      "ch05-010": ["balanced-budget-multiplier"],
      "ch06-001": ["asset-return"],
      "ch06-002": [
        "bond",
        "face-value",
        "coupon-payment",
        "maturity",
        "principal",
        "future-payment",
      ],
      "ch06-003": ["bond", "bond-price", "present-value", "interest-rate"],
      "ch06-004": ["bond-price", "interest-rate"],
      "ch07-005": ["cash-rate", "cash-market", "interest-rate"],
      "ch08-008": ["ad-shift", "aggregate-demand", "net-exports"],
      "ch09-017": ["appreciation", "exchange-rate"],
      "ch10-005": ["rule-of-70", "compound-growth", "growth-rate"],
      "mix-001": ["gross-domestic-product", "final-good"],
    };
    for (const [cardId, conceptIds] of Object.entries(expected)) {
      expect(cardConceptMap[cardId], cardId).toEqual(conceptIds);
    }
    expect(cardConceptMap["ch06-001"]).not.toContain("money");
    expect(cardConceptMap["ch06-002"]).not.toContain("money");
    expect(cardConceptEntries).toHaveLength(cards.length);
    expect(new Set(cardConceptEntries.map((entry) => entry.cardId)).size).toBe(
      cards.length,
    );
  });

  it("derives reverse links and evidence from the corrected explicit map", () => {
    expect(knowledgeConceptById.get("asset-return")?.linkedCardIds).toContain(
      "ch06-001",
    );
    expect(knowledgeConceptById.get("money")?.linkedCardIds).not.toContain("ch06-001");

    const status = deriveConceptStatuses({
      stateByCardId: {
        "ch06-001": {
          cardId: "ch06-001",
          learningState: "learned",
          strength: 3,
          reviewCount: 1,
          lastReviewedAt: "2026-08-10T00:00:00.000Z",
          lastOutcome: "strong_success",
          dueAt: null,
          isDue: false,
        },
      },
    });
    expect(status.get("asset-return")).toBe("solid");
    expect(status.get("money")).toBe("unseen");
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
      cardConceptEntries: [],
      fallbackMappings: 0,
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
