import { describe, expect, it } from "vitest";
import type { Flashcard } from "../domain/content";
import { createReviewEvent, type ReviewEvent } from "../domain/progress";
import { selectNextCard } from "../study/examSrs/selector";

const NOW = Date.parse("2026-08-10T12:00:00.000Z");
const SETTINGS = { examAt: null, studyBufferHours: 24 } as const;

function card(id: string, chapter: number, tags: readonly string[] = []): Flashcard {
  return {
    id,
    chapter,
    topic: id,
    kind: "recall",
    front: id,
    answer: id,
    explanation: id,
    commonTrap: id,
    difficulty: 1,
    tags,
    sources: ["test"],
  };
}

function review(
  id: string,
  cardId: string,
  reviewedAt: number,
  overrides: Partial<Pick<ReviewEvent, "correct" | "rating" | "mode">> = {},
): ReviewEvent {
  return createReviewEvent({
    id,
    cardId,
    reviewedAt: new Date(reviewedAt).toISOString(),
    mode: overrides.mode ?? "recall",
    correct: overrides.correct === undefined ? true : overrides.correct,
    rating: overrides.rating === undefined ? "got_it" : overrides.rating,
    responseTimeMs: null,
    selectedChoice: null,
  });
}

function select(
  cards: readonly Flashcard[],
  reviews: readonly ReviewEvent[] = [],
  options: Partial<{
    recentlyShownCardIds: readonly string[];
    studyAhead: boolean;
  }> = {},
) {
  return selectNextCard({
    cards,
    reviews,
    settings: SETTINGS,
    nowMs: NOW,
    ...options,
  });
}

describe("Exam-SRS selector", () => {
  it("makes unseen cards eligible immediately", () => {
    const result = select([card("ch01-001", 1)]);
    expect(result.selection).toMatchObject({
      card: { id: "ch01-001" },
      reason: "New",
      isStudyAhead: false,
    });
  });

  it("does not immediately repeat a failed card before ten minutes", () => {
    const cards = [card("failed", 1), card("unseen", 2)];
    const result = select(cards, [
      review("failure", "failed", NOW, { correct: false, rating: "forgot" }),
    ]);
    expect(result.selection?.card.id).toBe("unseen");
  });

  it("lets a due failure outrank unseen material", () => {
    const cards = [card("failed", 1), card("unseen", 2)];
    const result = select(cards, [
      review("failure", "failed", NOW - 11 * 60 * 1000, {
        correct: false,
        rating: "forgot",
      }),
    ]);
    expect(result.selection).toMatchObject({
      card: { id: "failed" },
      reason: "Relearning",
    });
  });

  it("prioritises a due weak card over unseen material", () => {
    const cards = [card("weak", 1), card("unseen", 2)];
    const result = select(cards, [
      review("weak-review", "weak", NOW - 60 * 60 * 1000, { rating: "struggled" }),
    ]);
    expect(result.selection).toMatchObject({ card: { id: "weak" }, reason: "Weak" });
  });

  it("honours the explicit high-yield tag without inventing other weights", () => {
    const result = select([card("ordinary", 1), card("high-yield", 1, ["high-yield"])]);
    expect(result.selection?.card.id).toBe("high-yield");
  });

  it("balances initial unseen selection across Chapters 1–10", () => {
    const cards = [card("ch01-001", 1), card("ch02-001", 2), card("ch03-001", 3)];
    const first = select(cards);
    const second = select(cards, [review("seen-one", "ch01-001", NOW - 60 * 1000)]);

    expect(first.selection?.card.chapter).toBe(1);
    expect(second.selection?.card.chapter).toBe(2);
  });

  it("suppresses unseen Chapter 0 cards before foundational coverage", () => {
    const result = select([card("mixed", 0), card("foundation", 1)]);
    expect(result.selection?.card.id).toBe("foundation");
  });

  it("makes unseen Chapter 0 competitive after sufficient non-mixed coverage", () => {
    const cards = [
      card("mixed", 0),
      card("seen-1", 1),
      card("seen-2", 1),
      card("seen-3", 1),
      card("seen-4", 1),
      card("foundation-left", 1),
    ];
    const reviews = ["seen-1", "seen-2", "seen-3", "seen-4"].map((cardId, index) =>
      review(`seen-${index}`, cardId, NOW - 60 * 1000),
    );
    expect(select(cards, reviews).selection?.card.id).toBe("mixed");
  });

  it("does not gate a Chapter 0 card after it has been seen", () => {
    const cards = [card("mixed", 0), card("foundation", 1)];
    const result = select(cards, [
      review("mixed-failure", "mixed", NOW - 11 * 60 * 1000, {
        correct: false,
        rating: "forgot",
      }),
    ]);
    expect(result.selection?.card.id).toBe("mixed");
  });

  it("excludes the most recent three cards, then falls back when necessary", () => {
    const cards = [card("a", 1), card("b", 1), card("c", 1)];
    expect(select(cards, [], { recentlyShownCardIds: ["a"] }).selection?.card.id).toBe(
      "b",
    );
    expect(
      select([card("only", 1)], [], { recentlyShownCardIds: ["only"] }).selection?.card
        .id,
    ).toBe("only");
  });

  it("uses deterministic tie-breaking", () => {
    const result = select([card("card-b", 1), card("card-a", 1)]);
    expect(result.selection?.card.id).toBe("card-a");
  });

  it("reports the next future review when the deck is caught up", () => {
    const result = select(
      [card("scheduled", 1)],
      [review("success", "scheduled", NOW)],
    );
    expect(result.selection).toBeNull();
    expect(result.nextDueAt).toBe("2026-08-10T18:00:00.000Z");
  });

  it("offers the earliest future card only through explicit study-ahead mode", () => {
    const result = select(
      [card("later", 1), card("earlier", 2)],
      [
        review("later-review", "later", NOW + 3 * 60 * 60 * 1000),
        review("earlier-review", "earlier", NOW),
      ],
      { studyAhead: true },
    );
    expect(result.selection).toMatchObject({
      card: { id: "earlier" },
      reason: "Study ahead",
      isStudyAhead: true,
    });
  });
});
