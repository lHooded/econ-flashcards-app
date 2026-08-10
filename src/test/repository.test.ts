import { describe, expect, it } from "vitest";
import { cardIds } from "../data/deck";
import { ProgressRepository } from "../db/progressRepository";

describe("IndexedDB progress repository", () => {
  it("uses default settings and atomically records a review with card state", async () => {
    const repository = new ProgressRepository(cardIds);
    await repository.resetAll();

    expect(await repository.load()).toMatchObject({
      settings: { examAt: null, studyBufferHours: 24 },
      cardStates: [],
      reviews: [],
    });

    await repository.recordReview({
      id: "repository-review-1",
      cardId: "ch01-001",
      reviewedAt: "2026-08-10T00:00:00.000Z",
      mode: "recall",
      correct: true,
      rating: "got_it",
      responseTimeMs: 800,
      selectedChoice: null,
    });

    const saved = await repository.load();
    expect(saved.reviews).toHaveLength(1);
    expect(saved.reviews[0]).toMatchObject({
      id: "repository-review-1",
      cardId: "ch01-001",
    });
    expect(saved.cardStates).toEqual([
      {
        cardId: "ch01-001",
        firstSeenAt: "2026-08-10T00:00:00.000Z",
        lastSeenAt: "2026-08-10T00:00:00.000Z",
        totalReviews: 1,
        correctReviews: 1,
        consecutiveCorrect: 1,
      },
    ]);
  });

  it("loads review history by timestamp, then ID for equal instants", async () => {
    const repository = new ProgressRepository(cardIds);
    await repository.resetAll();

    await repository.recordReview({
      id: "a-later",
      cardId: "ch01-001",
      reviewedAt: "2026-08-10T12:00:00+02:00",
      mode: "recall",
      correct: true,
      rating: "got_it",
      responseTimeMs: null,
      selectedChoice: null,
    });
    await repository.recordReview({
      id: "z-earlier",
      cardId: "ch01-002",
      reviewedAt: "2026-08-10T09:00:00.000Z",
      mode: "recall",
      correct: false,
      rating: "forgot",
      responseTimeMs: null,
      selectedChoice: null,
    });
    await repository.recordReview({
      id: "b-tie",
      cardId: "ch01-003",
      reviewedAt: "2026-08-10T11:00:00+02:00",
      mode: "recall",
      correct: true,
      rating: "struggled",
      responseTimeMs: null,
      selectedChoice: null,
    });

    const loaded = await repository.load();

    expect(loaded.reviews.map((review) => review.id)).toEqual([
      "b-tie",
      "z-earlier",
      "a-later",
    ]);
    expect(loaded.reviews.map((review) => review.reviewedAt)).toEqual([
      "2026-08-10T11:00:00+02:00",
      "2026-08-10T09:00:00.000Z",
      "2026-08-10T12:00:00+02:00",
    ]);
  });
});
