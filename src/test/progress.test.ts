import { describe, expect, it } from "vitest";
import {
  applyReviewToCardState,
  createEmptyCardState,
  createReviewEvent,
} from "../domain/progress";

const cardId = "ch01-001";

describe("progress domain", () => {
  it("starts an unseen card with empty state", () => {
    expect(createEmptyCardState(cardId)).toEqual({
      cardId,
      firstSeenAt: null,
      lastSeenAt: null,
      totalReviews: 0,
      correctReviews: 0,
      consecutiveCorrect: 0,
    });
  });

  it("updates review totals, timestamps, and consecutive correctness", () => {
    const first = createReviewEvent({
      id: "review-1",
      cardId,
      reviewedAt: "2026-08-10T00:00:00.000Z",
      mode: "recall",
      correct: true,
      rating: "got_it",
      responseTimeMs: 1200,
      selectedChoice: null,
    });
    const firstState = applyReviewToCardState(undefined, first);
    expect(firstState).toEqual({
      cardId,
      firstSeenAt: first.reviewedAt,
      lastSeenAt: first.reviewedAt,
      totalReviews: 1,
      correctReviews: 1,
      consecutiveCorrect: 1,
    });

    const second = createReviewEvent({
      id: "review-2",
      cardId,
      reviewedAt: "2026-08-10T01:00:00.000Z",
      mode: "recall",
      correct: false,
      rating: "forgot",
      responseTimeMs: 2000,
      selectedChoice: null,
    });
    expect(applyReviewToCardState(firstState, second)).toEqual({
      cardId,
      firstSeenAt: first.reviewedAt,
      lastSeenAt: second.reviewedAt,
      totalReviews: 2,
      correctReviews: 1,
      consecutiveCorrect: 0,
    });
  });

  it("treats a null objective result as not correct for streak purposes", () => {
    const event = createReviewEvent({
      id: "review-null",
      cardId,
      reviewedAt: "2026-08-10T00:00:00.000Z",
      mode: "recall",
      correct: null,
      rating: null,
      responseTimeMs: null,
      selectedChoice: null,
    });
    expect(applyReviewToCardState(undefined, event).consecutiveCorrect).toBe(0);
  });
});
