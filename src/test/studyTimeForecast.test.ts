import { describe, expect, it } from "vitest";
import type { Flashcard } from "../domain/content";
import { createReviewEvent, type ReviewEvent } from "../domain/progress";
import { cards as realCards } from "../data/deck";
import {
  advanceExamSrsCardState,
  deriveExamPhase,
  deriveExamSrsSnapshot,
  deriveReviewEvidence,
  refreshExamSrsCardStateAt,
} from "../study/examSrs/deriveState";
import {
  createExamSrsForecastSelector,
  getExamSrsCoverage,
  selectNextCardFromSnapshot,
} from "../study/examSrs/selector";
import {
  calibrateOutcomes,
  calibratePace,
  FORECAST_OUTCOME_CONSTANTS,
  FORECAST_PACE_CONSTANTS,
  getOutcomeDistribution,
} from "../study/forecast/calibration";
import {
  deriveForecastDeadlineInterpretation,
  censorAwareRangeFromValues,
  deriveStudyTimeForecast,
  makeForecastRecommendation,
} from "../study/forecast/forecast";
import { sampleCycleMs, simulateStudyForecast } from "../study/forecast/simulate";
import { createSeededRandom } from "../study/forecast/random";
import {
  getForecastTargetDefinition,
  getForecastTargetProgress,
} from "../study/forecast/targets";
import { reduceForecastWorkerResponse } from "../study/forecast/workerProtocol";
import type { StudyTimeForecast, TargetForecast } from "../study/forecast/model";
import type { ExamSrsCardState, ExamSrsSnapshot } from "../study/examSrs/model";

const MINUTE_MS = 60 * 1000;

const START = Date.parse("2026-08-13T00:00:00.000Z");
const NO_EXAM = { examAt: null, studyBufferHours: 24 } as const;

function card(
  id: string,
  chapter = 1,
  overrides: Partial<
    Pick<Flashcard, "choices" | "correctChoice" | "kind" | "tags">
  > = {},
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

interface MutableTestSnapshot {
  phase: ExamSrsSnapshot["phase"];
  studyDeadline: string | null;
  states: ExamSrsCardState[];
  stateByCardId: Record<string, ExamSrsCardState>;
}

function mutableSnapshotFor(
  cards: readonly Flashcard[],
  states: readonly ExamSrsCardState[],
): MutableTestSnapshot {
  return {
    phase: "no_exam",
    studyDeadline: null,
    states: [...states],
    stateByCardId: Object.fromEntries(
      cards.map((entry, index) => [entry.id, states[index]]),
    ),
  };
}

function stateAt(
  cardId: string,
  learningState: ExamSrsCardState["learningState"],
  nowMs: number,
  dueOffsetMs: number | null,
  reviewCount = 1,
): ExamSrsCardState {
  const base = state(cardId, learningState, reviewCount);
  const dueAt =
    dueOffsetMs === null ? null : new Date(nowMs + dueOffsetMs).toISOString();
  return {
    ...base,
    dueAt,
    isDue: dueAt !== null && Date.parse(dueAt) <= nowMs,
  };
}

function targetFixture(
  id: TargetForecast["id"],
  deadlineStatus: TargetForecast["deadlineStatus"],
  simulationStatus: TargetForecast["simulationStatus"] = "estimated",
): TargetForecast {
  const range =
    simulationStatus === "unresolved"
      ? { low: null, median: null, high: null }
      : simulationStatus === "censored"
        ? { low: 1, median: 2, high: null }
        : { low: 1, median: 2, high: 3 };
  const simulationRuns = 256;
  const completedRuns =
    simulationStatus === "unresolved"
      ? 100
      : simulationStatus === "censored"
        ? 154
        : simulationRuns;
  return {
    id,
    label: id,
    criterion: id,
    achieved: false,
    totalCards: 100,
    currentSeen: 0,
    currentCoverage: 0,
    currentLearned: 0,
    currentCriticalSeen: 0,
    currentCriticalLearned: 0,
    targetLearned: id === "coverage" ? 0 : 80,
    criticalCardCount: 0,
    activeMinutes: range,
    additionalReviews: range,
    elapsedMs: range,
    deadlineStatus,
    deadlineConstraint: "none",
    simulationStatus,
    completedRuns,
    simulationRuns,
    completionFraction: completedRuns / simulationRuns,
    censoredRuns: simulationRuns - completedRuns,
    censorReasons: simulationStatus === "unresolved" ? ["review_count_cap"] : [],
  };
}

function expectSelectorParity(
  cards: readonly Flashcard[],
  scheduler: ExamSrsSnapshot,
  cached: ReturnType<typeof createExamSrsForecastSelector>,
  nowMs: number,
  recentlyShownCardIds: readonly string[],
  readiness: ReadonlyMap<string, boolean>,
): void {
  const expected = selectNextCardFromSnapshot({
    cards,
    scheduler,
    nowMs,
    recentlyShownCardIds,
    newCardPrerequisiteReadyByCardId: readiness,
  });
  const actual = cached.select({
    nowMs,
    recentlyShownCardIds,
    newCardPrerequisiteReadyByCardId: readiness,
  });
  expect({
    id: actual.selection?.card.id ?? null,
    reason: actual.selection?.reason ?? null,
    nextDueAt: actual.nextDueAt,
  }).toEqual({
    id: expected.selection?.card.id ?? null,
    reason: expected.selection?.reason ?? null,
    nextDueAt: expected.nextDueAt,
  });
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

  it("uses one global timing distribution across review modes", () => {
    const events = [
      review("a", "a", START),
      review("b", "b", START + 60_000, { mode: "mcq" }),
      review("c", "c", START + 120_000),
    ];
    const calibration = calibratePace(events);
    expect(calibration.global.samples).toHaveLength(
      2 + 3 * FORECAST_PACE_CONSTANTS.fallbackPriorSampleRepeats,
    );
    expect(calibration.global.samples).toContain(60_000);
    expect(calibration.reviewsPerHour).toBe(60);
  });

  it("regularises one fast or slow gap toward fallback timing", () => {
    const fast = calibratePace([
      review("fast-a", "a", START),
      review("fast-b", "b", START + FORECAST_PACE_CONSTANTS.minInterReviewGapMs),
    ]);
    const slow = calibratePace([
      review("slow-a", "a", START),
      review("slow-b", "b", START + 6 * MINUTE_MS),
    ]);

    expect(fast.sampleSize).toBe(1);
    expect(slow.sampleSize).toBe(1);
    expect(fast.global.samples).toContain(FORECAST_PACE_CONSTANTS.minInterReviewGapMs);
    expect(slow.global.samples).toContain(6 * MINUTE_MS);
    expect(fast.global.medianCycleMs).toBe(FORECAST_PACE_CONSTANTS.fallbackCycleMs);
    expect(slow.global.medianCycleMs).toBe(FORECAST_PACE_CONSTANTS.fallbackCycleMs);
  });

  it("lets consistent pace history increasingly dominate the fallback prior", () => {
    const few = calibratePace(
      Array.from({ length: 4 }, (_, index) =>
        review(`few-${index}`, `few-card-${index}`, START + index * 20_000),
      ),
    );
    const ten = calibratePace(
      Array.from({ length: 12 }, (_, index) =>
        review(`ten-${index}`, `ten-card-${index}`, START + index * 20_000),
      ),
    );
    const many = calibratePace(
      Array.from({ length: 51 }, (_, index) =>
        review(`many-${index}`, `many-card-${index}`, START + index * 20_000),
      ),
    );

    expect(few.sampleSize).toBe(3);
    expect(ten.sampleSize).toBe(11);
    expect(many.sampleSize).toBe(50);
    expect(ten.global.medianCycleMs).toBe(20_000);
    expect(Math.abs(many.global.medianCycleMs - 20_000)).toBeLessThan(
      Math.abs(few.global.medianCycleMs - 20_000),
    );
    expect(many.global.medianCycleMs).toBe(20_000);
  });

  it("regularises response-time fallback samples as secondary pace evidence", () => {
    const calibration = calibratePace([
      review("response-only", "a", START, { responseTimeMs: 250 }),
    ]);

    expect(calibration.sampleSize).toBe(0);
    expect(calibration.global.source).toBe("response_time");
    expect(calibration.global.medianCycleMs).toBeGreaterThan(
      FORECAST_PACE_CONSTANTS.fallbackLowCycleMs,
    );
    expect(calibration.global.medianCycleMs).toBeLessThan(
      FORECAST_PACE_CONSTANTS.fallbackHighCycleMs,
    );
  });

  it("allows plausible fast and slow cycles to reach simulation sampling", () => {
    const distribution = { samples: [30_000, 60_000, 180_000] };
    expect(sampleCycleMs(distribution, 0)).toBe(30_000);
    expect(sampleCycleMs(distribution, 0.999999)).toBeGreaterThan(179_000);
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

  it("bounds outcome counts to recent usable observations without truncating bucket history", () => {
    const recentCount = FORECAST_OUTCOME_CONSTANTS.maxRecentOutcomeSamples;
    const history = [
      review("learned-1", "learned-card", START),
      review("learned-2", "learned-card", START + 2_000),
      review("retained-failure", "learned-card", START + 4_000, {
        correct: false,
        rating: "forgot",
      }),
      ...Array.from({ length: recentCount - 1 }, (_, index) =>
        review(
          `retained-success-${index}`,
          `other-${index}`,
          START + (index + 3) * 2_000,
        ),
      ),
    ];
    const calibration = calibrateOutcomes(
      [card("learned-card")],
      history,
      NO_EXAM,
      START + 1,
    );
    const learned = getOutcomeDistribution(
      calibration,
      "recall_calculation",
      "learned",
    );
    const unseen = getOutcomeDistribution(calibration, "recall_calculation", "unseen");

    expect(calibration.outcomeSampleSize).toBe(recentCount);
    // The first retained review followed two true successes, so it belongs to
    // the learned bucket. A truncated replay would incorrectly put it unseen.
    expect(learned.failure).toBeGreaterThan(unseen.failure);
  });

  it("lets recent improvement or deterioration replace sufficiently old outcomes", () => {
    const recentCount = FORECAST_OUTCOME_CONSTANTS.maxRecentOutcomeSamples;
    const cards = Array.from({ length: recentCount * 2 }, (_, index) =>
      card(`outcome-card-${index}`),
    );
    const failures = Array.from({ length: recentCount }, (_, index) =>
      review(`old-failure-${index}`, `outcome-card-${index}`, START + index * 2_000, {
        correct: false,
        rating: "forgot",
      }),
    );
    const successes = Array.from({ length: recentCount }, (_, index) =>
      review(
        `recent-success-${index}`,
        `outcome-card-${recentCount + index}`,
        START + (recentCount + index) * 2_000,
      ),
    );
    const improving = calibrateOutcomes(
      cards,
      [...failures, ...successes],
      NO_EXAM,
      START + 1,
    );
    const deteriorating = calibrateOutcomes(
      cards,
      [
        ...successes,
        ...failures.map((event, index) => ({
          ...event,
          id: `late-failure-${index}`,
          reviewedAt: new Date(START + (recentCount * 2 + index) * 2_000).toISOString(),
        })),
      ],
      NO_EXAM,
      START + 1,
    );

    expect(improving.outcomeSampleSize).toBe(recentCount);
    expect(deteriorating.outcomeSampleSize).toBe(recentCount);
    expect(improving.global.failure).toBeGreaterThan(0);
    expect(improving.global.failure).toBeLessThan(0.1);
    expect(deteriorating.global.failure).toBeLessThan(1);
    expect(deteriorating.global.failure).toBeGreaterThan(0.9);
  });

  it("keeps sparse global, mode, and bucket estimates anchored to fallback priors", () => {
    const recallCard = card("sparse-recall");
    const cold = calibrateOutcomes([recallCard], [], NO_EXAM, START);
    const fallback = getOutcomeDistribution(cold, "recall_calculation", "unseen");
    expect(fallback).toEqual({
      failure: 0.3,
      weak_success: 0.35,
      strong_success: 0.35,
    });

    const oneSuccess = calibrateOutcomes(
      [recallCard],
      [review("one-success", recallCard.id, START)],
      NO_EXAM,
      START + 1,
    );
    const sparse = getOutcomeDistribution(oneSuccess, "recall_calculation", "unseen");
    expect(sparse.strong_success).toBeGreaterThan(fallback.strong_success);
    expect(sparse.strong_success).toBeLessThan(0.8);
    expect(sparse.failure).toBeGreaterThan(0);
    expect(sparse.weak_success).toBeGreaterThan(0);

    const fewCards = Array.from({ length: 4 }, (_, index) => card(`few-${index}`));
    const fewSuccesses = fewCards.map((entry, index) =>
      review(`few-success-${index}`, entry.id, START + (index + 1) * 2_000),
    );
    const fewEstimate = getOutcomeDistribution(
      calibrateOutcomes(fewCards, fewSuccesses, NO_EXAM, START + 1),
      "recall_calculation",
      "unseen",
    );
    expect(fewEstimate.strong_success).toBeGreaterThan(sparse.strong_success);
    expect(fewEstimate.strong_success).toBeLessThan(0.9);

    const oneFailure = calibrateOutcomes(
      [recallCard],
      [
        review("one-failure", recallCard.id, START, {
          correct: false,
          rating: "forgot",
        }),
      ],
      NO_EXAM,
      START + 1,
    );
    const failureEstimate = getOutcomeDistribution(
      oneFailure,
      "recall_calculation",
      "unseen",
    );
    expect(failureEstimate.failure).toBeGreaterThan(fallback.failure);
    expect(failureEstimate.failure).toBeLessThan(0.8);
    expect(failureEstimate.strong_success).toBeGreaterThan(0);
  });

  it("converges toward consistent evidence while preserving mode separation", () => {
    const recallCards = Array.from({ length: 120 }, (_, index) =>
      card(`recall-${index}`),
    );
    const recallSuccesses = recallCards.map((entry, index) =>
      review(`recall-success-${index}`, entry.id, START + index * 2_000),
    );
    const recallCalibration = calibrateOutcomes(
      recallCards,
      recallSuccesses,
      NO_EXAM,
      START + 1,
    );
    const recallEstimate = getOutcomeDistribution(
      recallCalibration,
      "recall_calculation",
      "unseen",
    );
    expect(recallEstimate.strong_success).toBeGreaterThan(0.9);

    const mixedCards = Array.from({ length: 120 }, (_, index) =>
      card(`mixed-${index}`),
    );
    const mixedHistory = mixedCards.map((entry, index) =>
      index % 3 === 0
        ? review(`mixed-failure-${index}`, entry.id, START + 400_000 + index * 2_000, {
            correct: false,
            rating: "forgot",
          })
        : index % 3 === 1
          ? review(`mixed-weak-${index}`, entry.id, START + 400_000 + index * 2_000, {
              rating: "struggled",
            })
          : review(`mixed-success-${index}`, entry.id, START + 400_000 + index * 2_000),
    );
    const mixedEstimate = getOutcomeDistribution(
      calibrateOutcomes(mixedCards, mixedHistory, NO_EXAM, START + 1),
      "recall_calculation",
      "unseen",
    );
    expect(mixedEstimate.failure).toBeGreaterThan(0);
    expect(mixedEstimate.weak_success).toBeGreaterThan(0);
    expect(mixedEstimate.strong_success).toBeGreaterThan(0);

    const mcq = card("mode-mcq", 1, { choices: ["a", "b"], correctChoice: 0 });
    const modeCalibration = calibrateOutcomes(
      [...recallCards, mcq],
      [
        ...recallSuccesses,
        review("mcq-success", mcq.id, START + 300_000, { mode: "mcq" }),
      ],
      NO_EXAM,
      START + 1,
    );
    const mcqEstimate = getOutcomeDistribution(modeCalibration, "mcq", "unseen");
    expect(mcqEstimate.weak_success).toBe(0);
    expect(mcqEstimate.failure).toBeGreaterThan(0);
    expect(mcqEstimate.strong_success).toBeLessThan(1);
    expect(mcqEstimate.strong_success).toBeGreaterThan(
      getOutcomeDistribution(
        calibrateOutcomes([mcq], [], NO_EXAM, START),
        "mcq",
        "unseen",
      ).strong_success,
    );
  });

  it("retains distinct learned-bucket evidence after hierarchical smoothing", () => {
    const learnedCards = Array.from({ length: 20 }, (_, index) =>
      card(`learned-${index}`),
    );
    const unseenCards = Array.from({ length: 20 }, (_, index) =>
      card(`unseen-${index}`),
    );
    const learnedHistory = learnedCards.flatMap((entry, index) => [
      review(`learned-start-${index}`, entry.id, START + index * 4_000),
      review(`learned-criterion-${index}`, entry.id, START + 100_000 + index * 4_000),
      review(`learned-follow-up-${index}`, entry.id, START + 200_000 + index * 4_000),
    ]);
    const unseenFailures = unseenCards.map((entry, index) =>
      review(`unseen-failure-${index}`, entry.id, START + 300_000 + index * 4_000, {
        correct: false,
        rating: "forgot",
      }),
    );
    const calibration = calibrateOutcomes(
      [...learnedCards, ...unseenCards],
      [...learnedHistory, ...unseenFailures],
      NO_EXAM,
      START + 1,
    );
    const learned = getOutcomeDistribution(
      calibration,
      "recall_calculation",
      "learned",
    );
    const unseen = getOutcomeDistribution(calibration, "recall_calculation", "unseen");
    expect(learned.strong_success).toBeGreaterThan(unseen.strong_success);
    expect(unseen.failure).toBeGreaterThan(learned.failure);
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
    expect(working.elapsedMs.median).not.toBeNull();
    expect(working.activeMinutes.median).not.toBeNull();
    expect(working.elapsedMs.median!).toBeGreaterThan(
      working.activeMinutes.median! * 60 * 1000,
    );
  });

  it("censors a run at the review-count cap without inventing a completion", () => {
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
    expect(result.byTarget.near_complete.completions).toHaveLength(0);
    expect(result.byTarget.near_complete.completionFraction).toBe(0);
    expect(result.byTarget.near_complete.censoring[0]?.reason).toBe("review_count_cap");
  });

  it("censors a run at the elapsed-time horizon separately", () => {
    const scheduler = snapshotFor(
      cards,
      cards.map((entry) => state(entry.id, "unseen", 0)),
    );
    const result = simulateStudyForecast({
      cards,
      settings,
      nowMs: START,
      scheduler,
      pace: calibratePace([]),
      outcomes: calibrateOutcomes(cards, [], settings, START),
      seed: 8,
      runCount: 1,
      maxElapsedMs: 0,
    });
    expect(result.byTarget.coverage.completedRuns).toBe(0);
    expect(result.byTarget.coverage.completions).toHaveLength(0);
    expect(result.byTarget.coverage.censoring[0]?.reason).toBe("elapsed_horizon");
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

  it("keeps cached selector parity across varied states, updates, and phase crossings", () => {
    const random = createSeededRandom(0x51ec7e12);
    const learningStates: readonly ExamSrsCardState["learningState"][] = [
      "unseen",
      "relearning",
      "weak",
      "learning",
      "learned",
    ];

    for (let scenario = 0; scenario < 160; scenario += 1) {
      const cards = Array.from({ length: 12 }, (_, index) =>
        card(`scenario-${scenario}-${index}`, index % 6 === 0 ? 0 : (index % 4) + 1, {
          kind: index % 5 === 0 ? "calculation" : "recall",
          tags: index % 3 === 0 ? ["high-yield"] : [],
          ...(index % 4 === 0 ? { choices: ["A", "B"], correctChoice: 0 } : {}),
        }),
      );
      const nowMs = START + scenario * 17 * MINUTE_MS;
      const states = cards.map((entry, index) => {
        const learningState =
          scenario === 0
            ? index % 5 === 0
              ? "unseen"
              : "learned"
            : learningStates[Math.floor(random.next() * learningStates.length)];
        const dueOffsetMs =
          learningState === "unseen"
            ? null
            : [-15 * MINUTE_MS, -90 * 1000, 2 * MINUTE_MS, 40 * MINUTE_MS][
                Math.floor(random.next() * 4)
              ];
        return stateAt(
          entry.id,
          learningState,
          nowMs,
          dueOffsetMs,
          scenario === 0 ? 1 : Math.floor(random.next() * 6),
        );
      });
      const scheduler = mutableSnapshotFor(cards, states);
      const cached = createExamSrsForecastSelector({
        cards,
        scheduler,
        coverage: getExamSrsCoverage(cards, states),
      });

      for (let step = 0; step < 8; step += 1) {
        const stepNowMs = nowMs + step * 3 * MINUTE_MS;
        for (let index = 0; index < scheduler.states.length; index += 1) {
          const current = scheduler.states[index];
          const isDue =
            current.dueAt !== null && Date.parse(current.dueAt) <= stepNowMs;
          if (current.isDue !== isDue) {
            const refreshed = { ...current, isDue };
            scheduler.states[index] = refreshed;
            scheduler.stateByCardId[refreshed.cardId] = refreshed;
            cached.updateState(refreshed);
          }
        }
        const recentlyShownCardIds = cards
          .filter((_, index) => (index + step + scenario) % 5 === 0)
          .slice(0, 3)
          .map((entry) => entry.id);
        const readiness = new Map(
          cards.map((entry, index) => [entry.id, (index + step + scenario) % 2 === 0]),
        );
        expectSelectorParity(
          cards,
          scheduler,
          cached,
          stepNowMs,
          recentlyShownCardIds,
          readiness,
        );

        const expected = selectNextCardFromSnapshot({
          cards,
          scheduler,
          nowMs: stepNowMs,
          recentlyShownCardIds,
          newCardPrerequisiteReadyByCardId: readiness,
        });
        const selectedId =
          expected.selection?.card.id ?? cards[(scenario + step) % cards.length].id;
        const selectedIndex = cards.findIndex((entry) => entry.id === selectedId);
        const current = scheduler.states[selectedIndex];
        const nextLearningState =
          current.learningState === "unseen"
            ? "learning"
            : learningStates[(scenario + step + selectedIndex) % learningStates.length];
        const nextState = stateAt(
          selectedId,
          nextLearningState,
          stepNowMs,
          nextLearningState === "unseen"
            ? null
            : step % 3 === 0
              ? -MINUTE_MS
              : 5 * MINUTE_MS,
          current.reviewCount + 1,
        );
        scheduler.states[selectedIndex] = nextState;
        scheduler.stateByCardId[selectedId] = nextState;
        cached.updateState(nextState);
        if (current.learningState === "unseen") {
          cached.setCoverage(getExamSrsCoverage(cards, scheduler.states));
        }
      }
    }

    const phaseCards = [
      card("phase-a", 0),
      card("phase-b", 1, { tags: ["high-yield"] }),
    ];
    const phaseSettings = {
      examAt: new Date(START + 6 * 60 * 60 * 1000).toISOString(),
      studyBufferHours: 2,
    } as const;
    const phaseDerivedScheduler = deriveExamSrsSnapshot(
      phaseCards,
      [review("phase-review-a", "phase-a", START - 10 * MINUTE_MS)],
      phaseSettings,
      START,
    );
    const phaseScheduler: MutableTestSnapshot = {
      phase: phaseDerivedScheduler.phase,
      studyDeadline: phaseDerivedScheduler.studyDeadline,
      states: [...phaseDerivedScheduler.states],
      stateByCardId: { ...phaseDerivedScheduler.stateByCardId },
    };
    const phaseCached = createExamSrsForecastSelector({
      cards: phaseCards,
      scheduler: phaseScheduler,
      coverage: getExamSrsCoverage(phaseCards, phaseScheduler.states),
    });
    for (const phaseNowMs of [
      START,
      START + 3 * 60 * 60 * 1000,
      START + 5 * 60 * 60 * 1000,
      START + 7 * 60 * 60 * 1000,
    ]) {
      phaseScheduler.phase = deriveExamPhase(phaseSettings, phaseNowMs);
      for (let index = 0; index < phaseScheduler.states.length; index += 1) {
        const refreshed = refreshExamSrsCardStateAt(
          phaseScheduler.states[index],
          phaseSettings,
          phaseNowMs,
        );
        phaseScheduler.states[index] = refreshed;
        phaseScheduler.stateByCardId[refreshed.cardId] = refreshed;
        phaseCached.updateState(refreshed);
      }
      phaseCached.rebuild();
      expectSelectorParity(
        phaseCards,
        phaseScheduler,
        phaseCached,
        phaseNowMs,
        ["phase-a"],
        new Map([
          ["phase-a", true],
          ["phase-b", false],
        ]),
      );
    }
  });
});

describe("Study Time Forecast censor-aware quantiles", () => {
  it("matches ordinary p20/p50/p80 quantiles when every run completes", () => {
    const range = censorAwareRangeFromValues(
      Array.from({ length: 100 }, (_, index) => index + 1),
      100,
      false,
    );

    expect(range.low).toBeCloseTo(20.8);
    expect(range.median).toBeCloseTo(50.5);
    expect(range.high).toBeCloseTo(80.2);
  });

  it("maps unconditional quantiles through a 90 percent completion fraction", () => {
    const range = censorAwareRangeFromValues(
      Array.from({ length: 90 }, (_, index) => index + 1),
      100,
      false,
    );

    expect(range.low).toBeCloseTo(20.78, 1);
    expect(range.median).toBeCloseTo(50.44, 1);
    expect(range.high).toBeCloseTo(80.11, 1);
  });

  it("leaves p80 unresolved at an 80 percent censoring boundary", () => {
    const range = censorAwareRangeFromValues(
      Array.from({ length: 80 }, (_, index) => index + 1),
      100,
      false,
    );

    expect(range.low).not.toBeNull();
    expect(range.median).not.toBeNull();
    expect(range.high).toBeNull();
  });

  it("keeps p20 and the median identifiable at 60 percent completion", () => {
    const range = censorAwareRangeFromValues(
      Array.from({ length: 60 }, (_, index) => index + 1),
      100,
      false,
    );

    expect(range.low).not.toBeNull();
    expect(range.median).not.toBeNull();
    expect(range.high).toBeNull();
  });

  it("does not claim a median when fewer than half the runs complete", () => {
    const range = censorAwareRangeFromValues(
      Array.from({ length: 49 }, (_, index) => index + 1),
      100,
      false,
    );

    expect(range.low).not.toBeNull();
    expect(range.median).toBeNull();
    expect(range.high).toBeNull();
  });

  it("differs from the optimistic median among completers", () => {
    const range = censorAwareRangeFromValues(
      Array.from({ length: 80 }, (_, index) => index + 1),
      100,
      false,
    );
    const naiveCompleterMedian = 40.5;

    expect(range.median).toBeCloseTo(50.375);
    expect(range.median).toBeGreaterThan(naiveCompleterMedian);
  });
});

describe("Study Time Forecast deadline interpretation", () => {
  const examAt = new Date(START + 48 * 60 * 60 * 1000).toISOString();
  const settings = { examAt, studyBufferHours: 24 } as const;

  function interpret(
    medianElapsedMs: number | null,
    highElapsedMs: number | null,
    medianActiveMs: number | null = medianElapsedMs,
  ) {
    return deriveForecastDeadlineInterpretation({
      achieved: false,
      estimateReliable: true,
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
        estimateReliable: true,
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
    expect(interpret(23 * 60 * 60 * 1000, null)).toEqual({
      status: "tight",
      constraint: "none",
    });
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
        estimateReliable: true,
        medianElapsedMs: 0,
        highElapsedMs: 0,
        medianActiveMs: 0,
        settings,
        nowMs: START,
      }),
    ).toEqual({ status: "achieved", constraint: "none" });
    expect(
      deriveForecastDeadlineInterpretation({
        achieved: false,
        estimateReliable: false,
        medianElapsedMs: 1,
        highElapsedMs: 1,
        medianActiveMs: 1,
        settings,
        nowMs: START,
      }),
    ).toEqual({ status: "unresolved", constraint: "none" });
    expect(interpret(null, null)).toEqual({
      status: "unresolved",
      constraint: "none",
    });
  });
});

describe("Study Time Forecast recommendation", () => {
  it("chooses the highest reliable median target before the deadline", () => {
    const settings = {
      examAt: new Date(START + 48 * 60 * 60 * 1000).toISOString(),
      studyBufferHours: 24,
    } as const;
    const recommendation = makeForecastRecommendation(
      [
        targetFixture("coverage", "comfortable"),
        targetFixture("working", "comfortable"),
        targetFixture("exam_ready", "tight"),
        targetFixture("strong", "buffer"),
        targetFixture("near_complete", "after_exam"),
      ],
      settings,
    );

    expect(recommendation.targetId).toBe("exam_ready");
    expect(recommendation.explanation).toContain("median fits");
  });

  it("does not recommend an unresolved target as though its median were known", () => {
    const settings = {
      examAt: new Date(START + 48 * 60 * 60 * 1000).toISOString(),
      studyBufferHours: 24,
    } as const;
    const recommendation = makeForecastRecommendation(
      [
        targetFixture("coverage", "unresolved", "unresolved"),
        targetFixture("working", "unresolved", "unresolved"),
        targetFixture("exam_ready", "after_exam", "unresolved"),
        targetFixture("strong", "after_exam", "unresolved"),
        targetFixture("near_complete", "after_exam", "unresolved"),
      ],
      settings,
    );

    expect(recommendation.targetId).toBe("coverage");
    expect(recommendation.explanation).toContain("reliable median forecast");
  });

  it("can recommend a censored target when its unconditional median is identifiable", () => {
    const settings = {
      examAt: new Date(START + 48 * 60 * 60 * 1000).toISOString(),
      studyBufferHours: 24,
    } as const;
    const recommendation = makeForecastRecommendation(
      [
        targetFixture("coverage", "comfortable", "estimated"),
        targetFixture("working", "tight", "censored"),
        targetFixture("exam_ready", "after_exam", "unresolved"),
        targetFixture("strong", "after_exam", "unresolved"),
        targetFixture("near_complete", "after_exam", "unresolved"),
      ],
      settings,
    );

    expect(recommendation.targetId).toBe("working");
    expect(recommendation.explanation).toContain("censored");
  });
});

describe("Study Time Forecast worker response boundary", () => {
  it("surfaces worker errors instead of leaving loading state ambiguous", () => {
    expect(
      reduceForecastWorkerResponse({
        type: "error",
        message: "synthetic worker failure",
      }),
    ).toEqual({ status: "error", message: "synthetic worker failure" });

    const forecast = {} as StudyTimeForecast;
    expect(reduceForecastWorkerResponse({ type: "complete", forecast })).toEqual({
      status: "ready",
      forecast,
    });
    expect(reduceForecastWorkerResponse({ type: "complete", forecast }, true)).toBe(
      null,
    );
  });
});
