import { describe, expect, it } from "vitest";
import { knowledgeConceptById } from "../knowledge/data";

function articleText(id: string): string {
  const concept = knowledgeConceptById.get(id);
  if (!concept) throw new Error(`Missing knowledge concept: ${id}`);
  return [
    concept.summary,
    concept.intuition,
    ...concept.explanation,
    ...(concept.misconceptions ?? []),
  ].join(" ");
}

describe("beginner-facing national-accounts content", () => {
  it("keeps intermediate goods separate from durable business capital", () => {
    const intermediate = articleText("intermediate-good");

    expect(intermediate).toMatch(/flour.*bakery/i);
    expect(intermediate).toMatch(/electricity.*current production/i);
    expect(intermediate).toMatch(/durable computer.*capital good/i);
    expect(intermediate).toMatch(/final output.*business fixed investment/i);
    expect(intermediate).toMatch(/business purchase.*not automatically/i);
    expect(intermediate).not.toMatch(
      /a computer purchased by a firm for production can be an input/i,
    );
  });

  it("keeps nearby final-good, capital, investment, and consumption roles aligned", () => {
    expect(articleText("final-good")).toMatch(/role of the purchase in production/i);
    expect(articleText("capital")).toMatch(
      /capital is a stock.*investment is the flow/i,
    );
    expect(articleText("macro-investment")).toMatch(
      /newly produced capital goods.*inventories.*new dwellings/i,
    );
    expect(articleText("macro-investment")).toMatch(
      /buying an existing share, bond, or second-hand house.*not GDP investment/i,
    );
    expect(articleText("consumption")).toMatch(/household.*currently used goods/i);
  });

  it("retains traceability for the corrected classification", () => {
    const sourceRefs = knowledgeConceptById.get("intermediate-good")?.sourceRefs ?? [];

    expect(sourceRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: "lecture-w1-l1", page: 40 }),
        expect.objectContaining({ sourceId: "textbook", page: 20 }),
        expect.objectContaining({ sourceId: "lecture-w2-l2", page: 2 }),
      ]),
    );
  });
});
