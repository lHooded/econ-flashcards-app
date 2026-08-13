import type { Flashcard } from "../../domain/content";
import {
  compareReviewEventsChronologically,
  type AppSettings,
  type ReviewEvent,
  type ReviewMode,
} from "../../domain/progress";
import {
  advanceExamSrsCardState,
  createInitialExamSrsCardState,
  deriveReviewEvidence,
} from "../examSrs/deriveState";
import type { ExamSrsCardState, SchedulerOutcome } from "../examSrs/model";
import { HOUR_MS, MINUTE_MS } from "../examSrs/intervals";
import type { ForecastConfidence } from "./model";

export const FORECAST_PACE_CONSTANTS = Object.freeze({
  /** Gaps longer than this are treated as session breaks, not card time. */
  maxInterReviewGapMs: 7 * MINUTE_MS,
  /** Gaps shorter than this are usually duplicate/clock artefacts. */
  minInterReviewGapMs: 1.5 * 1000,
  /** Retain recent behaviour without allowing a large history to dominate. */
  maxUsableSamples: 100,
  /** Mode-specific timing is used only after this many observations. */
  minModeSamples: 6,
  /** Timestamp gaps below this evidence threshold remain low-confidence. */
  mediumConfidenceSamples: 10,
  highConfidenceSamples: 50,
  responseTimeMaxMs: 5 * MINUTE_MS,
  responseTimeMinMs: 100,
  responseToCycleScale: 1.4,
  responseToCycleOverheadMs: 20 * 1000,
  fallbackCycleMs: 60 * 1000,
  fallbackLowCycleMs: 35 * 1000,
  fallbackHighCycleMs: 105 * 1000,
});

export const FORECAST_OUTCOME_CONSTANTS = Object.freeze({
  /** A bucket estimate keeps this many broader observations as a prior. */
  shrinkageStrength: 8,
  mediumConfidenceSamples: 20,
  highConfidenceSamples: 100,
  modeSpecificSamples: 8,
});

export type ForecastModeFamily = "recall_calculation" | "mcq";
export type ForecastLearningBucket = "unseen" | "recovery" | "learning" | "learned";

export interface PaceDistribution {
  readonly samples: readonly number[];
  readonly lowCycleMs: number;
  readonly medianCycleMs: number;
  readonly highCycleMs: number;
  readonly sampleSize: number;
  readonly source: "history" | "response_time" | "fallback";
}

export interface PaceCalibration {
  readonly global: PaceDistribution;
  readonly byMode: Readonly<Record<ForecastModeFamily, PaceDistribution>>;
  readonly reviewsPerHour: number;
  readonly sampleSize: number;
  readonly confidence: ForecastConfidence;
}

export interface OutcomeDistribution {
  readonly failure: number;
  readonly weak_success: number;
  readonly strong_success: number;
}

export interface OutcomeCalibration {
  readonly global: OutcomeDistribution;
  readonly byModeAndBucket: Readonly<Record<string, OutcomeDistribution>>;
  readonly outcomeSampleSize: number;
  readonly confidence: ForecastConfidence;
}

export function getForecastModeFamily(
  cardOrMode: Pick<Flashcard, "choices"> | ReviewMode,
): ForecastModeFamily {
  return typeof cardOrMode === "string"
    ? cardOrMode === "mcq"
      ? "mcq"
      : "recall_calculation"
    : cardOrMode.choices !== undefined
      ? "mcq"
      : "recall_calculation";
}

export function getForecastLearningBucket(
  state: Pick<ExamSrsCardState, "learningState">,
): ForecastLearningBucket {
  switch (state.learningState) {
    case "unseen":
      return "unseen";
    case "relearning":
    case "weak":
      return "recovery";
    case "learning":
      return "learning";
    case "learned":
      return "learned";
  }
}

export function calibratePace(reviewEvents: readonly ReviewEvent[]): PaceCalibration {
  const chronological = reviewEvents
    .slice()
    .sort(compareReviewEventsChronologically)
    .filter((review) => Number.isFinite(Date.parse(review.reviewedAt)));
  const usableGaps: Array<{ durationMs: number; mode: ForecastModeFamily }> = [];

  for (let index = 1; index < chronological.length; index += 1) {
    const previous = chronological[index - 1];
    const current = chronological[index];
    const durationMs = Date.parse(current.reviewedAt) - Date.parse(previous.reviewedAt);
    if (
      durationMs >= FORECAST_PACE_CONSTANTS.minInterReviewGapMs &&
      durationMs <= FORECAST_PACE_CONSTANTS.maxInterReviewGapMs
    ) {
      usableGaps.push({
        durationMs,
        mode: getForecastModeFamily(current.mode),
      });
    }
  }

  const recentGaps = usableGaps.slice(-FORECAST_PACE_CONSTANTS.maxUsableSamples);
  const responseFallback = responseTimeFallback(chronological);
  const global = makePaceDistribution(
    recentGaps.map((sample) => sample.durationMs),
    responseFallback,
  );
  const byMode = Object.fromEntries(
    (["recall_calculation", "mcq"] as const).map((mode) => {
      const modeSamples = recentGaps
        .filter((sample) => sample.mode === mode)
        .map((sample) => sample.durationMs);
      return [
        mode,
        modeSamples.length >= FORECAST_PACE_CONSTANTS.minModeSamples
          ? makePaceDistribution(modeSamples, null)
          : global,
      ];
    }),
  ) as Readonly<Record<ForecastModeFamily, PaceDistribution>>;

  return {
    global,
    byMode,
    reviewsPerHour: HOUR_MS / global.medianCycleMs,
    sampleSize: recentGaps.length,
    confidence: confidenceFromSamples(
      recentGaps.length,
      FORECAST_PACE_CONSTANTS.mediumConfidenceSamples,
      FORECAST_PACE_CONSTANTS.highConfidenceSamples,
    ),
  };
}

export function calibrateOutcomes(
  cards: readonly Flashcard[],
  reviewEvents: readonly ReviewEvent[],
  settings: AppSettings,
  nowMs: number,
): OutcomeCalibration {
  const countsByKey = new Map<string, OutcomeCounts>();
  const modeCounts = new Map<ForecastModeFamily, OutcomeCounts>();
  const globalCounts = emptyOutcomeCounts();
  const stateByCardId = new Map<string, ExamSrsCardState>(
    cards.map((card) => [card.id, createInitialExamSrsCardState(card.id)]),
  );
  let outcomeSampleSize = 0;

  const chronological = reviewEvents
    .slice()
    .sort(compareReviewEventsChronologically)
    .filter((review) => Number.isFinite(Date.parse(review.reviewedAt)));
  for (const review of chronological) {
    const evidence = deriveReviewEvidence(review);
    if (evidence === null) {
      continue;
    }

    const previousState =
      stateByCardId.get(review.cardId) ?? createInitialExamSrsCardState(review.cardId);
    const mode = getForecastModeFamily(review.mode);
    const bucket = getForecastLearningBucket(previousState);
    const key = outcomeBucketKey(mode, bucket);
    incrementOutcome(countsByKey, key, evidence.outcome);
    incrementCounts(modeCounts, mode, evidence.outcome);
    incrementCount(globalCounts, evidence.outcome);
    outcomeSampleSize += 1;

    stateByCardId.set(
      review.cardId,
      advanceExamSrsCardState({
        previousState,
        evidence,
        reviewedAtMs: Date.parse(review.reviewedAt),
        reviewedAt: review.reviewedAt,
        settings,
        nowMs,
        reviewCount: previousState.reviewCount + 1,
      }),
    );
  }

  const globalDistribution = distributionFromCounts(
    globalCounts,
    fallbackOutcomePrior("recall_calculation"),
  );
  const byModeAndBucket: Record<string, OutcomeDistribution> = {};
  for (const mode of ["recall_calculation", "mcq"] as const) {
    const modeBroad = broaderModeDistribution(
      mode,
      modeCounts.get(mode),
      outcomeSampleSize,
      globalDistribution,
    );
    for (const bucket of ["unseen", "recovery", "learning", "learned"] as const) {
      const bucketCounts = countsByKey.get(outcomeBucketKey(mode, bucket));
      byModeAndBucket[outcomeBucketKey(mode, bucket)] = shrinkOutcomeDistribution(
        bucketCounts,
        modeBroad,
      );
    }
  }

  return {
    global: globalDistribution,
    byModeAndBucket,
    outcomeSampleSize,
    confidence: confidenceFromSamples(
      outcomeSampleSize,
      FORECAST_OUTCOME_CONSTANTS.mediumConfidenceSamples,
      FORECAST_OUTCOME_CONSTANTS.highConfidenceSamples,
    ),
  };
}

export function getOutcomeDistribution(
  calibration: OutcomeCalibration,
  mode: ForecastModeFamily,
  bucket: ForecastLearningBucket,
): OutcomeDistribution {
  return (
    calibration.byModeAndBucket[outcomeBucketKey(mode, bucket)] ?? calibration.global
  );
}

export function getPaceDistribution(
  calibration: PaceCalibration,
  mode: ForecastModeFamily,
): PaceDistribution {
  return calibration.byMode[mode] ?? calibration.global;
}

function makePaceDistribution(
  samples: readonly number[],
  responseFallback: readonly number[] | null,
): PaceDistribution {
  const sourceSamples = samples.length > 0 ? samples : (responseFallback ?? []);
  if (sourceSamples.length === 0) {
    return {
      samples: [
        FORECAST_PACE_CONSTANTS.fallbackLowCycleMs,
        FORECAST_PACE_CONSTANTS.fallbackCycleMs,
        FORECAST_PACE_CONSTANTS.fallbackHighCycleMs,
      ],
      lowCycleMs: FORECAST_PACE_CONSTANTS.fallbackLowCycleMs,
      medianCycleMs: FORECAST_PACE_CONSTANTS.fallbackCycleMs,
      highCycleMs: FORECAST_PACE_CONSTANTS.fallbackHighCycleMs,
      sampleSize: 0,
      source: "fallback",
    };
  }

  const sorted = [...sourceSamples].sort((left, right) => left - right);
  return {
    samples: Object.freeze(sorted),
    lowCycleMs: quantile(sorted, 0.2),
    medianCycleMs: quantile(sorted, 0.5),
    highCycleMs: quantile(sorted, 0.8),
    sampleSize: samples.length,
    source: samples.length > 0 ? "history" : "response_time",
  };
}

function responseTimeFallback(
  chronological: readonly ReviewEvent[],
): readonly number[] | null {
  const samples = chronological
    .map((review) => review.responseTimeMs)
    .filter(
      (responseTimeMs): responseTimeMs is number =>
        responseTimeMs !== null &&
        Number.isFinite(responseTimeMs) &&
        responseTimeMs >= FORECAST_PACE_CONSTANTS.responseTimeMinMs &&
        responseTimeMs <= FORECAST_PACE_CONSTANTS.responseTimeMaxMs,
    )
    .map((responseTimeMs) =>
      Math.min(
        FORECAST_PACE_CONSTANTS.fallbackHighCycleMs,
        Math.max(
          FORECAST_PACE_CONSTANTS.fallbackLowCycleMs,
          responseTimeMs * FORECAST_PACE_CONSTANTS.responseToCycleScale +
            FORECAST_PACE_CONSTANTS.responseToCycleOverheadMs,
        ),
      ),
    )
    .slice(-FORECAST_PACE_CONSTANTS.maxUsableSamples);
  return samples.length > 0 ? Object.freeze(samples) : null;
}

function quantile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) {
    return FORECAST_PACE_CONSTANTS.fallbackCycleMs;
  }
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function confidenceFromSamples(
  sampleSize: number,
  mediumThreshold: number,
  highThreshold: number,
): ForecastConfidence {
  if (sampleSize >= highThreshold) return "high";
  if (sampleSize >= mediumThreshold) return "medium";
  return "low";
}

type OutcomeCounts = Record<SchedulerOutcome, number>;

function emptyOutcomeCounts(): OutcomeCounts {
  return { failure: 0, weak_success: 0, strong_success: 0 };
}

function incrementCount(counts: OutcomeCounts, outcome: SchedulerOutcome): void {
  counts[outcome] += 1;
}

function incrementOutcome(
  countsByKey: Map<string, OutcomeCounts>,
  key: string,
  outcome: SchedulerOutcome,
): void {
  const counts = countsByKey.get(key) ?? emptyOutcomeCounts();
  incrementCount(counts, outcome);
  countsByKey.set(key, counts);
}

function incrementCounts(
  countsByMode: Map<ForecastModeFamily, OutcomeCounts>,
  mode: ForecastModeFamily,
  outcome: SchedulerOutcome,
): void {
  const counts = countsByMode.get(mode) ?? emptyOutcomeCounts();
  incrementCount(counts, outcome);
  countsByMode.set(mode, counts);
}

function distributionFromCounts(
  counts: OutcomeCounts,
  fallback: OutcomeDistribution,
): OutcomeDistribution {
  const total = counts.failure + counts.weak_success + counts.strong_success;
  if (total === 0) return fallback;
  return {
    failure: counts.failure / total,
    weak_success: counts.weak_success / total,
    strong_success: counts.strong_success / total,
  };
}

function broaderModeDistribution(
  mode: ForecastModeFamily,
  counts: OutcomeCounts | undefined,
  totalOutcomeSamples: number,
  globalDistribution: OutcomeDistribution,
): OutcomeDistribution {
  const modeTotal =
    counts === undefined
      ? 0
      : counts.failure + counts.weak_success + counts.strong_success;
  if (modeTotal >= FORECAST_OUTCOME_CONSTANTS.modeSpecificSamples) {
    return distributionFromCounts(counts!, globalDistribution);
  }
  if (mode === "mcq") {
    const broad =
      totalOutcomeSamples > 0 ? globalDistribution : fallbackOutcomePrior(mode);
    return normalizeOutcomeDistribution({
      failure: broad.failure,
      weak_success: 0,
      strong_success: broad.strong_success,
    });
  }
  return totalOutcomeSamples > 0 ? globalDistribution : fallbackOutcomePrior(mode);
}

function shrinkOutcomeDistribution(
  bucketCounts: OutcomeCounts | undefined,
  broader: OutcomeDistribution,
): OutcomeDistribution {
  const counts = bucketCounts ?? emptyOutcomeCounts();
  const sampleSize = counts.failure + counts.weak_success + counts.strong_success;
  const prior = FORECAST_OUTCOME_CONSTANTS.shrinkageStrength;
  return normalizeOutcomeDistribution({
    failure: (counts.failure + prior * broader.failure) / (sampleSize + prior),
    weak_success:
      (counts.weak_success + prior * broader.weak_success) / (sampleSize + prior),
    strong_success:
      (counts.strong_success + prior * broader.strong_success) / (sampleSize + prior),
  });
}

function normalizeOutcomeDistribution(
  distribution: OutcomeDistribution,
): OutcomeDistribution {
  const total =
    distribution.failure + distribution.weak_success + distribution.strong_success;
  if (total <= 0 || !Number.isFinite(total)) {
    return fallbackOutcomePrior("recall_calculation");
  }
  return {
    failure: distribution.failure / total,
    weak_success: distribution.weak_success / total,
    strong_success: distribution.strong_success / total,
  };
}

function fallbackOutcomePrior(mode: ForecastModeFamily): OutcomeDistribution {
  return mode === "mcq"
    ? { failure: 0.35, weak_success: 0, strong_success: 0.65 }
    : { failure: 0.3, weak_success: 0.35, strong_success: 0.35 };
}

function outcomeBucketKey(
  mode: ForecastModeFamily,
  bucket: ForecastLearningBucket,
): string {
  return `${mode}:${bucket}`;
}
