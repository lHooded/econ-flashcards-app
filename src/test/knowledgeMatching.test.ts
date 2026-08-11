import { describe, expect, it } from "vitest";
import { buildKnowledgeMatcher, knowledgeMatcher } from "../knowledge/matching";
import { searchKnowledge } from "../knowledge/search";

describe("knowledge term matching and search", () => {
  it("uses case-insensitive longest phrase matching", () => {
    const matches = knowledgeMatcher.findTerms(
      "REAL INTEREST RATE and the cash-rate target affect borrowing.",
    );
    expect(matches[0]).toMatchObject({
      conceptId: "real-interest-rate",
      alias: "REAL INTEREST RATE",
    });
    expect(matches.some((match) => match.conceptId === "cash-rate-target")).toBe(true);
    expect(
      matches.some(
        (match) =>
          match.conceptId === "cash-rate" && match.alias.toLowerCase() === "cash-rate",
      ),
    ).toBe(false);
  });

  it("respects word boundaries and punctuation", () => {
    const matches = knowledgeMatcher.findTerms("xGDPy GDP, bond-price; GDP.");
    expect(
      matches.filter((match) => match.conceptId === "gross-domestic-product"),
    ).toHaveLength(2);
    expect(matches.some((match) => match.alias === "bond-price")).toBe(true);
  });

  it("represents a genuinely ambiguous alias instead of choosing silently", () => {
    const matcher = buildKnowledgeMatcher([
      { id: "one", name: "One", aliases: ["shared phrase"] },
      { id: "two", name: "Two", aliases: ["shared phrase"] },
    ]);
    const [match] = matcher.findTerms("shared phrase");
    expect(match).toMatchObject({ conceptId: null, conceptIds: ["one", "two"] });
  });

  it("searches broader beginner discovery terms", () => {
    expect(searchKnowledge("government IOU")[0]?.concept.id).toBe("bond");
    expect(searchKnowledge("cost of borrowing")[0]?.concept.id).toBe("interest-rate");
  });
});
