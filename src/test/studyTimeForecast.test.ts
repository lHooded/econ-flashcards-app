import { describe, expect, it } from "vitest";
import type { Flashcard } from "../domain/content";
import { createReviewEvent, type ReviewEvent } from "../domain/progress";
import { cards as realCards } from "../data/deck";
import {
  advanceExamSrsCardState,
  deriveExamSrsSnapshot,
  deriveReviewEvidence,
} from "../study/examSrs/deriveState";
import {
  createExamSrsForecastSelector,
  getExamSrsCoverage,
  selectNextCardFromSnapshot,
} from "../study/examSrs/selector";
import {
  calibrateOutcomes,
  calibratePace,
  FORECAST_PACE_CONSTANTS,
  getOutcomeDistribution,
} from "../study/forecast/calibration";
import {
  deriveForecastDeadlineInterpretation,
  deriveStudyTimeForecast,
} from "../study/forecast/forecast";
import { simulateStudyForecast } from "../study/forecast/simulate";
import {
  getForecastTargetDefinition,
  getForecastTargetProgress,
} from "../study/forecast/targets";
import type { ExamSrsCardState, ExamSrsSnapshot } from "../study/examSrs/model";

const MINUTE_MS = 60 * 1000;

const START = Date.parse("2026-08-13T00:00:00.000Z");
const NO_EXAM = { examAt: null, studyBufferHours: 24 } as const;

function card(
  id: string,
  chapter = 1,
  overrides: Partial<Pick<Flashcard, "choices" | "correctChoice" | "kind">> = {},
): Flashcard {
  return {
    id,
    chapter,
    topic: id,
    kind: overrides.kind ?? "recall",
    front: id,
    answer: id,
    explanation: id,
    commonTrap: id,
    difficulty: 1,
    tags: [],
    sources: ["test"],
    ...overrides,
  };
}

function review(
  id: string,
  cardId: string,
  atMs: number,
  overrides: Partial<
    Pick<ReviewEvent, "mode" | "correct" | "rating" | "responseTimeMs">
  > = {},
): ReviewEvent {
  const mode = overrides.mode ?? "recall";
  const correct = overrides.correct === undefined ? true : overrides.correct;
  return createReviewEvent({
    id,
    cardId,
    reviewedAt: new Date(atMs).toISOString(),
    mode,
    correct,
    rating:
      overrides.rating === undefined
        ? mode === "mcq"
          ? null
          : correct
            ? "got_it"
            : "forgot"
        : overrides.rating,
    responseTimeMs:
      overrides.responseTimeMs === undefined ? null : overrides.responseTimeMs,
    selectedChoice: null,
  });
}

function state(
  cardId: string,
  learningState: ExamSrsCardState["learningState"],
  reviewCount = 1,
): ExamSrsCardState {
  const strength =
    learningState === "unseen"
      ? 0
      : learningState === "learned"
        ? 2
        : learningState === "weak"
          ? 0.5
          : 1;
  return {
    cardId,
    learningState,
    strength,
    reviewCount,
    lastReviewedAt: learningState === "unseen" ? null : new Date(START).toISOString(),
    lastOutcome:
      learningState === "unseen"
        ? null
        : learningState === "relearning"
          ? "failure"
          : "strong_success",
    dueAt: null,
    isDue: false,
  };
}

function snapshotFor(
  cards: readonly Flashcard[],
  states: readonly ExamSrsCardState[],
): ExamSrsSnapshot {
  return {
    phase: "no_exam",
    studyDeadline: null,
    states,
    stateByCardId: Object.fromEntries(states.map((entry) => [entry.cardId, entry])),
  };
}

describe("Study Time Forecast pace calibration", () => {
  it("uses conservative fallback timing with no history or a null response time", () => {
    expect(calibratePace([])).toMatchObject({
      sampleSize: 0,
      confidence: "low",
      global: {
        source: "fallback",
        medianCycleMs: FORECAST_PACE_CONSTANTS.fallbackCycleMs,
      },
    });
    expect(
      calibratePace([review("one", "a", START, { responseTimeMs: null })]).global
        .source,
    ).toBe("fallback");
  });

  it("uses rapid-session gaps, excludes breaks and implausibly short gaps", () => {
    const events = [
      review("a", "a", START),
      review("b", "b", START + 60_000),
      review("too-short", "c", START + 60_500),
      review("break", "d", START + 30 * MINUTE_MS),
      review("after-break", "e", START + 31 * MINUTE_MS),
    ];
    const calibration = calibratePace(events);
    expect(calibration.sampleSize).toBe(2);
    expect(calibration.global.medianCycleMs).toBe(60_000);
  });

  it("uses robust central quantiles and keeps only recent usable observations", () => {
    const events = Array.from({ length: 122 }, (_, index) =>
      review(`pace-${index}`, `card-${index}`, START + index * 60_000),
    );
    const calibration = calibratePace(events);
    expect(calibration.sampleSize).toBe(FORECAST_PACE_CONSTANTS.maxUsableSamples);
    expect(calibration.global.medianCycleMs).toBe(60_000);

    const withOutlier = calibratePace([
      review("outlier-a", "a", START),
      review("outlier-b", "b", START + 360_000),
      ...Array.from({ length: 8 }, (_, index) =>
        review(`normal-${index}`, `n-${index}`, START + 360_000 + (index + 1) * 60_000),
      ),
    ]);
    expect(withOutlier.global.medianCycleMs).toBe(60_000);
  });

  it("falls back from sparse mode-specific timing to the global distribution", () => {
    const events = [
      review("a", "a", START),
      review("b", "b", START + 60_000, { mode: "mcq" }),
      review("c", "c", START + 120_000),
    ];
    const calibration = calibratePace(events);
    expect(calibration.byMode.mcq).toBe(calibration.global);
  });
});

describe("Study Time Forecast outcome calibration", () => {
  it("uses deriveReviewEvidence semantics and shrinks sparse buckets", () => {
    const cards = [card("a"), card("b")];
    const events = [
      review("failure", "a", START, { correct: false, rating: "got_it" }),
      ...Array.from({ length: 12 }, (_, index) =>
        review(`success-${index}`, "a", START + (index + 1) * 60_000),
      ),
    ];
    const calibration = calibrateOutcomes(cards, events, NO_EXAM, START + 1);
    const unseen = getOutcomeDistribution(calibration, "recall_calculation", "unseen");
    expect(unseen.failure).toBeGreaterThan(0);
    expect(unseen.failure).toBeLessThan(1);
    expect(calibration.outcomeSampleSize).toBe(13);
    expect(
      deriveReviewEvidence(review("weak", "b", START, { rating: "struggled" }))
        ?.outcome,
    ).toBe("weak_success");
  });

  it("keeps MCQ outcome calibration separate and uses cold-start priors", () => {
    const mcq = card("mcq", 1, { choices: ["a", "b"], correctChoice: 0 });
    const calibration = calibrateOutcomes(
      [mcq],
      [review("mcq-review", mcq.id, START, { mode: "mcq" })],
      NO_EXAM,
      START + 1,
    );
    const mcqDistribution = getOutcomeDistribution(calibration, "mcq", "unseen");
    expect(mcqDistribution.weak_success).toBe(0);
    expect(mcqDistribution.strong_success).toBeGreaterThan(0);

    const cold = calibrateOutcomes([mcq], [], NO_EXAM, START);
    expect(cold.outcomeSampleSize).toBe(0);
    expect(getOutcomeDistribution(cold, "mcq", "unseen").weak_success).toBe(0);
    expect(cold.confidence).toBe("low");
  });

  it("preserves MCQ's authored strong-success increment in the shared transition", () => {
    const mcq = review("mcq", "mcq", START, { mode: "mcq" });
    const recall = review("recall", "recall", START);
    const mcqEvidence = deriveReviewEvidence(mcq)!;
    const recallEvidence = deriveReviewEvidence(recall)!;
    const mcqState = advanceExamSrsCardState({
      previousState: state("mcq", "unseen", 0),
      evidence: mcqEvidence,
      reviewedAtMs: START,
      settings: NO_EXAM,
      nowMs: START,
    });
    const recallState = advanceExamSrsCardState({
      previousState: state("recall", "unseen", 0),
      evidence: recallEvidence,
      reviewedAtMs: START,
      settings: NO_EXAM,
      nowMs: START,
    });
    expect(mcqState.strength).toBe(0.75);
    expect(recallState.strength).toBe(1);
  });
});

describe("Study Time Forecast target definitions", () => {
  const criticalCard = realCards.find((entry) => entry.id === "ch08-006")!;
  const ordinaryCards = realCards
    .filter((entry) => entry.id !== criticalCard.id)
    .slice(0, 9);
  const cards = [criticalCard, ...ordinaryCards];

  it("enforces coverage, Learned thresholds, and critical constraints", () => {
    const states = [
      state(criticalCard.id, "weak"),
      ...ordinaryCards.map((entry) => state(entry.id, "learned")),
    ];
    const progress = getForecastTargetProgress(cards, { states });
    expect(progress).toMatchObject({
      total: 10,
      seen: 10,
      learned: 9,
      criticalTotal: 1,
      criticalSeen: 1,
      criticalLearned: 0,
    });
    expect(getForecastTargetDefinition("coverage").isSatisfied(progress)).toBe(true);
    expect(getForecastTargetDefinition("working").isSatisfied(progress)).toBe(true);
    expect(getForecastTargetDefinition("exam_ready").isSatisfied(progress)).toBe(true);
    expect(getForecastTargetDefinition("strong").isSatisfied(progress)).toBe(false);
    expect(getForecastTargetDefinition("near_complete").isSatisfied(progress)).toBe(
      false,
    );

    const learnedCritical = getForecastTargetProgress(cards, {
      states: states.map((entry) =>
        entry.cardId === criticalCard.id ? state(entry.cardId, "learned") : entry,
      ),
    });
    expect(getForecastTargetDefinition("strong").isSatisfied(learnedCritical)).toBe(
      true,
    );
    expect(
      getForecastTargetDefinition("near_complete").isSatisfied(learnedCritical),
    ).toBe(true);
  });

  it("requires every card to have usable evidence for full coverage", () => {
    const progress = getForecastTargetProgress(cards, {
      states: cards.map((entry, index) =>
        index === 0 ? state(entry.id, "unseen", 0) : state(entry.id, "learned"),
      ),
    });
    expect(getForecastTargetDefinition("coverage").isSatisfied(progress)).toBe(false);
    expect(getForecastTargetDefinition("near_complete").isSatisfied(progress)).toBe(
      false,
    );
  });
});

describe("Study Time Forecast simulation and determinism", () => {
  const cards = [card("a", 1), card("b", 2)];
  const settings = NO_EXAM;

  function forecast(reviewEvents: readonly ReviewEvent[], nowMs = START) {
    return deriveStudyTimeForecast({ cards, reviewEvents, settings, nowMs });
  }

  it("is deterministic for identical inputs and changes when history changes", () => {
    const first = forecast([]);
    const second = forecast([]);
    expect(second).toEqual(first);
    expect(forecast([review("new-history", "a", START)])).not.toEqual(first);
  });

  it("reports zero remaining work for an already achieved target", () => {
    const result = forecast(
      [
        review("a-1", "a", START),
        review("a-2", "a", START + 60 * 60 * 1000),
        review("b-1", "b", START + 2 * 60 * 60 * 1000),
        review("b-2", "b", START + 3 * 60 * 60 * 1000),
      ],
      START + 4 * 60 * 60 * 1000,
    );
    expect(result.targets.every((target) => target.achieved)).toBe(true);
    expect(
      result.targets.every((target) => target.additionalReviews.median === 0),
    ).toBe(true);
  });

  it("counts due-date waiting as elapsed time but not active study time", () => {
    const result = forecast([review("first", "a", START)], START + 60 * 60 * 1000);
    const working = result.targets.find((target) => target.id === "working")!;
    expect(working.elapsedMs.median).toBeGreaterThan(
      working.activeMinutes.median * 60 * 1000,
    );
  });

  it("has a finite defensive cap for a pathological run", () => {
    const scheduler = snapshotFor(
      cards,
      cards.map((entry) => state(entry.id, "unseen", 0)),
    );
    const pace = calibratePace([]);
    const outcomes = calibrateOutcomes(cards, [], settings, START);
    const result = simulateStudyForecast({
      cards,
      settings,
      nowMs: START,
      scheduler,
      pace,
      outcomes,
      seed: 7,
      runCount: 1,
      maxReviewsPerRun: 0,
    });
    expect(result.byTarget.near_complete.completedRuns).toBe(0);
    expect(result.byTarget.near_complete.capCompletion.additionalReviews).toBe(0);
  });

  it("is invariant to imported review-event order", () => {
    const events = [
      review("one", "a", START),
      review("two", "a", START + 60 * 60 * 1000),
      review("three", "b", START + 2 * 60 * 60 * 1000),
    ];
    expect(forecast([...events].reverse())).toEqual(forecast(events));
  });

  it("keeps cached forecast candidate ordering aligned with normal Study selection", () => {
    const events = [
      review("failure", "a", START - 11 * 60 * 1000, {
        correct: false,
        rating: "forgot",
      }),
      review("success", "b", START - 60 * 60 * 1000),
    ];
    const scheduler = deriveExamSrsSnapshot(cards, events, settings, START);
    const cached = createExamSrsForecastSelector({
      cards,
      scheduler,
      coverage: getExamSrsCoverage(cards, scheduler.states),
    });
    for (const recentlyShownCardIds of [[], ["a"], ["b", "a"]]) {
      const expected = selectNextCardFromSnapshot({
        cards,
        scheduler,
        nowMs: START,
        recentlyShownCardIds,
      });
      const actual = cached.select({ nowMs: START, recentlyShownCardIds });
      expect(actual.selection?.card.id).toBe(expected.selection?.card.id);
      expect(actual.selection?.reason).toBe(expected.selection?.reason);
      expect(actual.nextDueAt).toBe(expected.nextDueAt);
    }
  });
});

describe("Study Time Forecast deadline interpretation", () => {
  const examAt = new Date(START + 48 * 60 * 60 * 1000).toISOString();
  const settings = { examAt, studyBufferHours: 24 } as const;

  function interpret(
    medianElapsedMs: number,
    highElapsedMs: number,
    medianActiveMs = medianElapsedMs,
  ) {
    return deriveForecastDeadlineInterpretation({
      achieved: false,
      medianElapsedMs,
      highElapsedMs,
      medianActiveMs,
      settings,
      nowMs: START,
    });
  }

  it("distinguishes no-exam, comfortable, tight, buffer, after-exam, and spacing", () => {
    expect(
      deriveForecastDeadlineInterpretation({
        achieved: false,
        medianElapsedMs: 1,
        highElapsedMs: 1,
        medianActiveMs: 1,
        settings: NO_EXAM,
        nowMs: START,
      }),
    ).toEqual({ status: "no_exam", constraint: "none" });
    expect(interpret(2 * 60 * 60 * 1000, 3 * 60 * 60 * 1000).status).toBe(
      "comfortable",
    );
    expect(interpret(23 * 60 * 60 * 1000, 26 * 60 * 60 * 1000).status).toBe("tight");
    expect(
      interpret(26 * 60 * 60 * 1000, 30 * 60 * 60 * 1000, 2 * 60 * 60 * 1000),
    ).toEqual({ status: "buffer", constraint: "spacing" });
    expect(
      interpret(26 * 60 * 60 * 1000, 30 * 60 * 60 * 1000, 30 * 60 * 60 * 1000),
    ).toEqual({ status: "buffer", constraint: "active_workload" });
    expect(interpret(49 * 60 * 60 * 1000, 50 * 60 * 60 * 1000).status).toBe(
      "after_exam",
    );
    expect(
      deriveForecastDeadlineInterpretation({
        achieved: true,
        medianElapsedMs: 0,
        highElapsedMs: 0,
        medianActiveMs: 0,
        settings,
        nowMs: START,
      }),
    ).toEqual({ status: "achieved", constraint: "none" });
  });
});
