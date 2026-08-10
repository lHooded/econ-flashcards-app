import { describe, expect, it } from "vitest";
import { createReviewEvent, type ReviewEvent } from "../domain/progress";
import { deriveCardState } from "../study/examSrs/deriveState";

const settings = {
  examAt: "2026-08-10T10:00:00.000Z",
  studyBufferHours: 24,
} as const;
const deadlineMs = Date.parse("2026-08-09T10:00:00.000Z");
const examMs = Date.parse(settings.examAt);
const bufferNowMs = Date.parse("2026-08-09T12:00:00.000Z");

function review(
  id: string,
  reviewedAt: string,
  overrides: Partial<Pick<ReviewEvent, "correct" | "rating" | "mode">> = {},
): ReviewEvent {
  return createReviewEvent({
    id,
    cardId: "card-1",
    reviewedAt,
    mode: overrides.mode ?? "recall",
    correct: overrides.correct === undefined ? true : overrides.correct,
    rating: overrides.rating === undefined ? "got_it" : overrides.rating,
    responseTimeMs: null,
    selectedChoice: null,
  });
}

describe("Exam-SRS buffer behaviour", () => {
  it("freezes a learned card whose pre-deadline due point reaches the deadline", () => {
    const state = deriveCardState(
      "card-1",
      [
        review("first", "2026-08-08T00:00:00.000Z"),
        review("criterion", "2026-08-09T09:00:00.000Z"),
      ],
      settings,
      bufferNowMs,
    );

    expect(state.learningState).toBe("learned");
    expect(state.dueAt).toBe(new Date(examMs).toISOString());
    expect(state.isDue).toBe(false);
  });

  it("keeps a learned card due when it was already overdue before the deadline", () => {
    const state = deriveCardState(
      "card-1",
      [
        review("first", "2026-08-07T00:00:00.000Z"),
        review("overdue", "2026-08-08T09:00:00.000Z"),
      ],
      settings,
      bufferNowMs,
    );

    expect(state.learningState).toBe("learned");
    expect(Date.parse(state.dueAt!)).toBeLessThan(deadlineMs);
    expect(state.isDue).toBe(true);
  });

  it("continues relearning, weak, and learning cards during the buffer", () => {
    const failure = deriveCardState(
      "card-1",
      [
        review("failure", "2026-08-09T12:00:00.000Z", {
          correct: false,
          rating: "forgot",
        }),
      ],
      settings,
      bufferNowMs,
    );
    const weak = deriveCardState(
      "card-1",
      [review("weak", "2026-08-09T12:00:00.000Z", { rating: "struggled" })],
      settings,
      bufferNowMs,
    );
    const learning = deriveCardState(
      "card-1",
      [review("learning", "2026-08-09T12:00:00.000Z")],
      settings,
      bufferNowMs,
    );

    expect(failure).toMatchObject({
      learningState: "relearning",
      dueAt: "2026-08-09T12:10:00.000Z",
    });
    expect(weak).toMatchObject({
      learningState: "weak",
      dueAt: "2026-08-09T12:45:00.000Z",
    });
    expect(learning).toMatchObject({
      learningState: "learning",
      dueAt: "2026-08-09T16:00:00.000Z",
    });
  });

  it("makes a buffer review current through the exam when it reaches Learned", () => {
    const state = deriveCardState(
      "card-1",
      [
        review("first", "2026-08-08T00:00:00.000Z"),
        review("buffer", "2026-08-09T12:00:00.000Z"),
      ],
      settings,
      bufferNowMs,
    );

    expect(state).toMatchObject({ learningState: "learned", strength: 2 });
    expect(state.dueAt).toBe(new Date(examMs).toISOString());
  });

  it("returns to ordinary maintenance intervals after the actual exam", () => {
    const reviewedAt = Date.parse("2026-08-10T11:00:00.000Z");
    const state = deriveCardState(
      "card-1",
      [review("post-exam", new Date(reviewedAt).toISOString())],
      settings,
      reviewedAt + 1,
    );

    // One clean recall reaches strength 1, whose ordinary baseline is six hours.
    expect(state.dueAt).toBe("2026-08-10T17:00:00.000Z");
    expect(state.isDue).toBe(false);
  });

  it("replaces a historical cram contraction with ordinary maintenance after the exam", () => {
    const latestReviewAt = "2026-08-09T09:00:00.000Z";
    const history = [
      review("strength-1", "2026-08-08T00:00:00.000Z"),
      review("strength-2", "2026-08-08T01:00:00.000Z"),
      review("strength-3", "2026-08-08T02:00:00.000Z"),
      review("strength-4", "2026-08-08T03:00:00.000Z"),
      review("strength-5", "2026-08-08T04:00:00.000Z"),
      review("strength-6", latestReviewAt),
    ];

    const duringBuffer = deriveCardState("card-1", history, settings, bufferNowMs);
    const afterExam = deriveCardState("card-1", history, settings, examMs + 1);

    expect(duringBuffer).toMatchObject({
      learningState: "learned",
      dueAt: new Date(examMs).toISOString(),
      isDue: false,
    });
    expect(afterExam).toMatchObject({
      dueAt: "2026-08-16T09:00:00.000Z",
      isDue: false,
    });
  });

  it("replaces a learned buffer freeze with the buffer review's baseline interval", () => {
    const bufferReviewAt = "2026-08-09T20:00:00.000Z";
    const history = [
      review("first", "2026-08-09T00:00:00.000Z"),
      review("buffer", bufferReviewAt),
    ];

    const duringBuffer = deriveCardState(
      "card-1",
      history,
      settings,
      Date.parse("2026-08-09T21:00:00.000Z"),
    );
    const afterExam = deriveCardState("card-1", history, settings, examMs + 1);

    expect(duringBuffer).toMatchObject({
      learningState: "learned",
      dueAt: new Date(examMs).toISOString(),
      isDue: false,
    });
    expect(afterExam).toMatchObject({
      dueAt: "2026-08-10T12:00:00.000Z",
      isDue: false,
    });
  });

  it("does not forgive a maintenance interval that is already expired after the exam", () => {
    const state = deriveCardState(
      "card-1",
      [review("expired", "2026-08-09T09:00:00.000Z")],
      settings,
      Date.parse("2026-08-10T11:00:00.000Z"),
    );

    expect(state).toMatchObject({
      dueAt: "2026-08-09T15:00:00.000Z",
      isDue: true,
    });
  });
});
