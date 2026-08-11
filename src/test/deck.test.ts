import { describe, expect, it } from "vitest";
import rawDeck from "../../flashcards/MACRO1_master_flashcards.json";
import { cards, deck, parseDeck } from "../data/deck";
import type { Difficulty } from "../domain/content";

describe("canonical flashcard deck", () => {
  it("loads the current canonical card inventory", () => {
    expect(deck.cards).toHaveLength(cards.length);
    expect(deck.metadata.cardCount).toBe(cards.length);
  });

  it("has unique IDs", () => {
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
  });

  it("contains only valid chapters and difficulty values", () => {
    expect(cards.every((card) => card.chapter >= 0 && card.chapter <= 10)).toBe(true);
    expect(
      cards.every((card) => ([1, 2, 3] as Difficulty[]).includes(card.difficulty)),
    ).toBe(true);
  });

  it("keeps authored MCQ choices and correct indexes consistent", () => {
    const mcqCards = cards.filter((card) => card.choices !== undefined);
    expect(mcqCards).toHaveLength(31);
    expect(
      mcqCards.every(
        (card) =>
          card.correctChoice !== undefined &&
          card.correctChoice >= 0 &&
          card.correctChoice < (card.choices?.length ?? 0),
      ),
    ).toBe(true);
    expect(cards.filter((card) => card.choices === undefined)).toHaveLength(
      cards.length - mcqCards.length,
    );
  });

  it("rejects malformed deck records loudly", () => {
    const malformed = structuredClone(rawDeck);
    malformed.cards[0].difficulty = 4;
    expect(() => parseDeck(malformed)).toThrow(/difficulty/);
  });
});
