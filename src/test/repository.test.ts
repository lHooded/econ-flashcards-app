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
});
