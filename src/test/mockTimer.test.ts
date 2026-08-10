import { describe, expect, it } from "vitest";
import { createMockAttempt } from "../exam/mock/model";
import { buildMockExam } from "../exam/mock/selector";
import { deriveMockClock } from "../exam/mock/timer";
import { examQuestions } from "../exam/questionBank";

describe("mock timer", () => {
  const attempt = createMockAttempt({
    ...buildMockExam({ bank: examQuestions, seed: 1 }),
    id: "timer-attempt",
    seed: 1,
    createdAt: "2026-08-11T00:00:00.000Z",
  });
  const reading = Date.parse(attempt.readingEndsAt);
  const writing = Date.parse(attempt.writingEndsAt);

  it.each([
    [0, "reading"],
    [10 * 60 * 1000 - 1, "reading"],
    [10 * 60 * 1000, "writing"],
    [110 * 60 * 1000 - 1, "writing"],
    [110 * 60 * 1000, "expired"],
  ] as const)("derives %s at a precise boundary", (offset, phase) => {
    expect(deriveMockClock(attempt, Date.parse(attempt.createdAt) + offset).phase).toBe(
      phase,
    );
  });

  it("returns submitted and abandoned as terminal phases", () => {
    expect(
      deriveMockClock(
        {
          ...attempt,
          status: "submitted",
          submittedAt: new Date(writing).toISOString(),
        },
        writing,
      ).phase,
    ).toBe("submitted");
    expect(
      deriveMockClock(
        {
          ...attempt,
          status: "abandoned",
          abandonedAt: new Date(reading).toISOString(),
        },
        reading,
      ).phase,
    ).toBe("abandoned");
  });
});
