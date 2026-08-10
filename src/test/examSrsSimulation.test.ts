import { describe, expect, it } from "vitest";
import { cards as realCards } from "../data/deck";
import type { Flashcard } from "../domain/content";
import { createReviewEvent, type ReviewEvent } from "../domain/progress";
import { deriveCardState } from "../study/examSrs/deriveState";
import { selectNextCard } from "../study/examSrs/selector";

const NO_EXAM = { examAt: null, studyBufferHours: 24 } as const;
const START = Date.parse("2026-08-01T08:00:00.000Z");

function card(id: string, chapter: number): Flashcard {
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
    tags: [],
    sources: ["simulation"],
  };
}

function event(
  id: string,
  cardId: string,
  reviewedAt: number,
  correct = true,
): ReviewEvent {
  return createReviewEvent({
    id,
    cardId,
    reviewedAt: new Date(reviewedAt).toISOString(),
    mode: "recall",
    correct,
    rating: correct ? "got_it" : "forgot",
    responseTimeMs: null,
    selectedChoice: null,
  });
}

function pushSuccess(
  reviews: ReviewEvent[],
  cardId: string,
  at: number,
  index: number,
): ReviewEvent {
  const next = event(`success-${index}`, cardId, at);
  reviews.push(next);
  return next;
}

describe("Exam-SRS simulations", () => {
  it("gives a strong learner expanding far-horizon intervals and contracting near the target", () => {
    const settings = {
      examAt: "2026-08-20T10:00:00.000Z",
      studyBufferHours: 24,
    } as const;
    const cardUnderTest = "strong-card";
    const reviews: ReviewEvent[] = [];
    const farIntervals: number[] = [];
    let at = START;

    for (let index = 0; index < 3; index += 1) {
      pushSuccess(reviews, cardUnderTest, at, index);
      const state = deriveCardState(cardUnderTest, reviews, settings, at + 1);
      farIntervals.push(Date.parse(state.dueAt!) - at);
      at = Date.parse(state.dueAt!);
    }

    const nearAt = Date.parse("2026-08-19T08:00:00.000Z");
    const nearReviews = [event("near-1", cardUnderTest, nearAt)];
    const near = deriveCardState(cardUnderTest, nearReviews, settings, nearAt + 1);
    const nearInterval = Date.parse(near.dueAt!) - nearAt;

    expect(farIntervals[0]).toBe(6 * 60 * 60 * 1000);
    expect(farIntervals[1]).toBe(16 * 60 * 60 * 1000);
    expect(farIntervals[2]).toBe(24 * 60 * 60 * 1000);
    expect(nearInterval).toBeLessThan(farIntervals[2]);
    expect(near.learningState).toBe("learning");
  });

  it("reintroduces a repeatedly failing card without an immediate loop", () => {
    const cards = [
      card("weak-card", 1),
      card("new-1", 2),
      card("new-2", 3),
      card("new-3", 4),
      card("new-4", 5),
    ];
    const reviews: ReviewEvent[] = [
      event("initial-failure", "weak-card", START, false),
    ];
    let recent = ["weak-card"];
    const first = selectNextCard({
      cards,
      reviews,
      settings: NO_EXAM,
      nowMs: START,
      recentlyShownCardIds: recent,
    });
    expect(first.selection?.card.id).toBe("new-1");

    pushSuccess(reviews, "new-1", START, 1);
    recent = ["new-1", ...recent].slice(0, 3);
    pushSuccess(reviews, "new-2", START + 60_000, 2);
    recent = ["new-2", ...recent].slice(0, 3);
    pushSuccess(reviews, "new-3", START + 120_000, 3);
    recent = ["new-3", ...recent].slice(0, 3);

    const due = selectNextCard({
      cards,
      reviews,
      settings: NO_EXAM,
      nowMs: START + 10 * 60 * 1000,
      recentlyShownCardIds: recent,
    });
    expect(due.selection).toMatchObject({
      card: { id: "weak-card" },
      reason: "Relearning",
    });
  });

  it("keeps exposing unseen cards during a late 24-hour start while failures interrupt", () => {
    const settings = {
      examAt: "2026-08-11T10:00:00.000Z",
      studyBufferHours: 24,
    } as const;
    const lateStart = Date.parse("2026-08-09T10:00:00.000Z");
    const cards = [
      card("failed", 1),
      card("new-1", 2),
      card("new-2", 3),
      card("new-3", 4),
    ];
    const reviews = [event("late-failure", "failed", lateStart, false)];
    const immediate = selectNextCard({
      cards,
      reviews,
      settings,
      nowMs: lateStart,
      recentlyShownCardIds: ["failed"],
    });
    expect(immediate.selection?.card.id).toBe("new-1");

    const afterRelearningInterval = selectNextCard({
      cards,
      reviews,
      settings,
      nowMs: lateStart + 10 * 60 * 1000,
      recentlyShownCardIds: ["new-1"],
    });
    expect(afterRelearningInterval.selection?.card.id).toBe("failed");
  });

  it("walks the real 349-card deck through full initial coverage without deadlock", () => {
    const reviews: ReviewEvent[] = [];
    const settings = { examAt: null, studyBufferHours: 24 } as const;
    let at = Date.parse("2026-08-01T00:00:00.000Z");
    let recent: string[] = [];
    const selectedChapters: number[] = [];

    for (let index = 0; index < realCards.length; index += 1) {
      const next = selectNextCard({
        cards: realCards,
        reviews,
        settings,
        nowMs: at,
        recentlyShownCardIds: recent,
      });
      expect(next.selection).not.toBeNull();
      const selected = next.selection!;
      selectedChapters.push(selected.card.chapter);
      const isMcq = selected.card.choices !== undefined;
      reviews.push(
        createReviewEvent({
          id: `real-${index}`,
          cardId: selected.card.id,
          reviewedAt: new Date(at).toISOString(),
          mode: isMcq ? "mcq" : "recall",
          correct: true,
          rating: isMcq ? null : "got_it",
          responseTimeMs: null,
          selectedChoice: null,
        }),
      );
      recent = [
        selected.card.id,
        ...recent.filter((id) => id !== selected.card.id),
      ].slice(0, 3);
      at += 60_000;
    }

    const uniqueSeen = new Set(reviews.map((review) => review.cardId));
    expect(uniqueSeen.size).toBe(realCards.length);
    expect(selectedChapters).toContain(0);
    expect(
      selectNextCard({ cards: realCards, reviews, settings, nowMs: at }).selection,
    ).not.toBeNull();
  });
});
