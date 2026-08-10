import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import { buildUnscheduledStudyQueue } from "../study/unscheduledStudyQueue";

describe("UnscheduledStudyQueue", () => {
  it("puts unseen cards first and excludes cards already reviewed this session", () => {
    const states = {
      "ch01-001": {
        cardId: "ch01-001",
        firstSeenAt: "2026-08-10T00:00:00.000Z",
        lastSeenAt: "2026-08-10T00:00:00.000Z",
        totalReviews: 1,
        correctReviews: 1,
        consecutiveCorrect: 1,
      },
    };
    const queue = buildUnscheduledStudyQueue(cards.slice(0, 3), states, new Set());
    expect(queue[0].id).not.toBe("ch01-001");
    expect(
      buildUnscheduledStudyQueue(cards.slice(0, 3), states, new Set([queue[0].id])),
    ).not.toContainEqual(queue[0]);
  });
});
