import { describe, expect, it } from "vitest";
import type { Flashcard } from "../domain/content";
import { createReviewEvent, type ReviewEvent } from "../domain/progress";
import {
  deriveCardState,
  deriveExamPhase,
  deriveExamSrsSnapshot,
  deriveReviewEvidence,
} from "../study/examSrs/deriveState";
import { EXAM_SRS_INTERVALS, getBaseIntervalMs } from "../study/examSrs/intervals";

const NO_EXAM = { examAt: null, studyBufferHours: 24 } as const;
const EXAM = {
  examAt: "2026-08-10T10:00:00.000Z",
  studyBufferHours: 24,
} as const;
const DEADLINE_MS = Date.parse("2026-08-09T10:00:00.000Z");
const EXAM_MS = Date.parse(EXAM.examAt);

function review(
  id: string,
  reviewedAt: string,
  overrides: Partial<Pick<ReviewEvent, "mode" | "correct" | "rating" | "cardId">> = {},
): ReviewEvent {
  return createReviewEvent({
    id,
    cardId: overrides.cardId ?? "card-1",
    reviewedAt,
    mode: overrides.mode ?? "recall",
    correct: overrides.correct === undefined ? true : overrides.correct,
    rating:
      overrides.rating === undefined
        ? overrides.mode === "mcq"
          ? null
          : "got_it"
        : overrides.rating,
    responseTimeMs: null,
    selectedChoice: null,
  });
}

function card(id: string, chapter: number, tags: readonly string[] = []): Flashcard {
  return {
    id,
    chapter,
    topic: `Topic ${id}`,
    kind: "recall",
    front: `Front ${id}`,
    answer: `Answer ${id}`,
    explanation: `Explanation ${id}`,
    commonTrap: `Trap ${id}`,
    difficulty: 1,
    tags,
    sources: ["test"],
  };
}

describe("Exam-SRS evidence and criterion", () => {
  it("starts unseen at strength zero", () => {
    expect(
      deriveCardState("card-1", [], NO_EXAM, Date.parse("2026-08-10T00:00:00Z")),
    ).toMatchObject({
      learningState: "unseen",
      strength: 0,
      lastOutcome: null,
      dueAt: null,
      isDue: false,
    });
  });

  it("resets strength for Forgot and objectively incorrect events", () => {
    const state = deriveCardState(
      "card-1",
      [
        review("a", "2026-08-09T00:00:00Z"),
        review("b", "2026-08-09T01:00:00Z", { correct: false, rating: "got_it" }),
        review("c", "2026-08-09T02:00:00Z", { correct: true, rating: "forgot" }),
      ],
      NO_EXAM,
      Date.parse("2026-08-10T00:00:00Z"),
    );

    expect(state).toMatchObject({ strength: 0, learningState: "relearning" });
    expect(
      deriveReviewEvidence(
        review("forgot", "2026-08-09T00:00:00Z", { correct: true, rating: "forgot" }),
      ),
    ).toEqual({
      outcome: "failure",
      strengthDelta: 0,
    });
  });

  it("adds the specified weak and strong evidence weights", () => {
    expect(
      deriveCardState(
        "card-1",
        [review("struggled", "2026-08-09T00:00:00Z", { rating: "struggled" })],
        NO_EXAM,
        Date.parse("2026-08-09T00:01:00Z"),
      ),
    ).toMatchObject({
      strength: 0.5,
      learningState: "weak",
      lastOutcome: "weak_success",
    });

    expect(
      deriveCardState(
        "card-1",
        [review("recall", "2026-08-09T00:00:00Z")],
        NO_EXAM,
        Date.parse("2026-08-09T00:01:00Z"),
      ),
    ).toMatchObject({
      strength: 1,
      learningState: "learning",
      lastOutcome: "strong_success",
    });

    expect(
      deriveCardState(
        "card-1",
        [review("mcq", "2026-08-09T00:00:00Z", { mode: "mcq", rating: null })],
        NO_EXAM,
        Date.parse("2026-08-09T00:01:00Z"),
      ),
    ).toMatchObject({ strength: 0.75, learningState: "learning" });

    expect(
      deriveCardState(
        "card-1",
        [review("odd-mcq", "2026-08-09T00:00:00Z", { mode: "mcq", rating: "got_it" })],
        NO_EXAM,
        Date.parse("2026-08-09T00:01:00Z"),
      ),
    ).toMatchObject({ strength: 0, learningState: "unseen" });
  });

  it("caps strength at six", () => {
    const reviews = Array.from({ length: 10 }, (_, index) =>
      review(`review-${index}`, `2026-08-01T${String(index).padStart(2, "0")}:00:00Z`),
    );
    expect(
      deriveCardState("card-1", reviews, NO_EXAM, Date.parse("2026-08-11T00:00:00Z")),
    ).toMatchObject({ strength: 6, learningState: "learned" });
  });

  it("requires two clean recall successes and three MCQ successes", () => {
    const firstRecall = deriveCardState(
      "card-1",
      [review("a", "2026-08-09T00:00:00Z")],
      NO_EXAM,
      Date.parse("2026-08-09T00:01:00Z"),
    );
    const secondRecall = deriveCardState(
      "card-1",
      [review("a", "2026-08-09T00:00:00Z"), review("b", "2026-08-09T01:00:00Z")],
      NO_EXAM,
      Date.parse("2026-08-09T01:01:00Z"),
    );
    const mcqReviews = Array.from({ length: 3 }, (_, index) =>
      review(`mcq-${index}`, `2026-08-09T0${index}:00:00Z`, {
        mode: "mcq",
        rating: null,
      }),
    );
    const thirdMcq = deriveCardState(
      "card-1",
      mcqReviews,
      NO_EXAM,
      Date.parse("2026-08-09T03:01:00Z"),
    );

    expect(firstRecall.learningState).toBe("learning");
    expect(secondRecall).toMatchObject({ strength: 2, learningState: "learned" });
    expect(thirdMcq).toMatchObject({ strength: 2.25, learningState: "learned" });
  });

  it("lets the latest weak success or failure override an older learned history", () => {
    const learnedHistory = [
      review("a", "2026-08-08T00:00:00Z"),
      review("b", "2026-08-08T01:00:00Z"),
      review("c", "2026-08-08T02:00:00Z"),
    ];
    const weak = deriveCardState(
      "card-1",
      [
        ...learnedHistory,
        review("weak", "2026-08-09T00:00:00Z", { rating: "struggled" }),
      ],
      NO_EXAM,
      Date.parse("2026-08-09T01:00:00Z"),
    );
    const failure = deriveCardState(
      "card-1",
      [
        ...learnedHistory,
        review("failure", "2026-08-09T00:00:00Z", { correct: false, rating: "forgot" }),
      ],
      NO_EXAM,
      Date.parse("2026-08-09T01:00:00Z"),
    );

    expect(weak).toMatchObject({ learningState: "weak", lastOutcome: "weak_success" });
    expect(failure).toMatchObject({
      strength: 0,
      learningState: "relearning",
      lastOutcome: "failure",
    });
  });
});

describe("Exam-SRS intervals and phases", () => {
  it("uses the exact baseline interval table", () => {
    expect(getBaseIntervalMs("failure", 0)).toBe(EXAM_SRS_INTERVALS.failureMs);
    expect(getBaseIntervalMs("weak_success", 6)).toBe(EXAM_SRS_INTERVALS.weakSuccessMs);
    expect(getBaseIntervalMs("strong_success", 0.5)).toBe(2 * 60 * 60 * 1000);
    expect(getBaseIntervalMs("strong_success", 1)).toBe(6 * 60 * 60 * 1000);
    expect(getBaseIntervalMs("strong_success", 2)).toBe(16 * 60 * 60 * 1000);
    expect(getBaseIntervalMs("strong_success", 3)).toBe(30 * 60 * 60 * 1000);
    expect(getBaseIntervalMs("strong_success", 4)).toBe(48 * 60 * 60 * 1000);
    expect(getBaseIntervalMs("strong_success", 5)).toBe(96 * 60 * 60 * 1000);
    expect(getBaseIntervalMs("strong_success", 6)).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("derives all deadline phases from explicit timestamps", () => {
    expect(deriveExamPhase(EXAM, Date.parse("2026-08-09T09:59:59Z"))).toBe("cram");
    expect(deriveExamPhase(EXAM, DEADLINE_MS)).toBe("buffer");
    expect(deriveExamPhase(EXAM, EXAM_MS)).toBe("post_exam");
    expect(deriveExamPhase(NO_EXAM, EXAM_MS)).toBe("no_exam");
  });

  it("contracts an equivalent strong review as the deadline approaches", () => {
    const farReviewAt = Date.parse("2026-08-06T10:00:00Z");
    const nearReviewAt = Date.parse("2026-08-09T08:00:00Z");
    const far = deriveCardState(
      "card-1",
      [review("far", new Date(farReviewAt).toISOString())],
      EXAM,
      farReviewAt + 1,
    );
    const near = deriveCardState(
      "card-1",
      [review("near", new Date(nearReviewAt).toISOString())],
      EXAM,
      nearReviewAt + 1,
    );

    const farInterval = Date.parse(far.dueAt!) - farReviewAt;
    const nearInterval = Date.parse(near.dueAt!) - nearReviewAt;
    expect(nearInterval).toBeLessThan(farInterval);
    expect(Date.parse(far.dueAt!)).toBeLessThanOrEqual(DEADLINE_MS);
    expect(Date.parse(near.dueAt!)).toBeLessThanOrEqual(DEADLINE_MS);
  });

  it("caps a pre-deadline review at the deadline even with less than one hour left", () => {
    const reviewedAt = DEADLINE_MS - 30 * 60 * 1000;
    const state = deriveCardState(
      "card-1",
      [review("edge", new Date(reviewedAt).toISOString())],
      EXAM,
      reviewedAt + 1,
    );
    expect(state.dueAt).toBe(new Date(DEADLINE_MS).toISOString());
  });

  it("derives a complete snapshot in one explicit-time operation", () => {
    const cards = [card("card-1", 1), card("card-2", 2)];
    const snapshot = deriveExamSrsSnapshot(
      cards,
      [review("one", "2026-08-09T00:00:00Z", { cardId: "card-1" })],
      EXAM,
      Date.parse("2026-08-09T01:00:00Z"),
    );
    expect(snapshot.states).toHaveLength(2);
    expect(snapshot.stateByCardId["card-2"].learningState).toBe("unseen");
    expect(snapshot.studyDeadline).toBe(new Date(DEADLINE_MS).toISOString());
  });
});
