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
  /** Repeat the three conservative fallback pace values as prior samples. */
  fallbackPriorSampleRepeats: 3,
});

export const FORECAST_OUTCOME_CONSTANTS = Object.freeze({
  /** Only this many recent usable outcomes inform the cram forecast. */
  maxRecentOutcomeSamples: 300,
  /** Every global estimate retains this many fallback-prior observations. */
  globalPriorStrength: 8,
  /** Every mode-family estimate retains this many global-prior observations. */
  modePriorStrength: 8,
  /** Every learning-bucket estimate retains this many mode-prior observations. */
  bucketPriorStrength: 8,
  mediumConfidenceSamples: 20,
  highConfidenceSamples: 100,
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
  const usableGaps: number[] = [];

  for (let index = 1; index < chronological.length; index += 1) {
    const previous = chronological[index - 1];
    const current = chronological[index];
    const durationMs = Date.parse(current.reviewedAt) - Date.parse(previous.reviewedAt);
    if (
      durationMs >= FORECAST_PACE_CONSTANTS.minInterReviewGapMs &&
      durationMs <= FORECAST_PACE_CONSTANTS.maxInterReviewGapMs
    ) {
      usableGaps.push(durationMs);
    }
  }

  const recentGaps = usableGaps.slice(-FORECAST_PACE_CONSTANTS.maxUsableSamples);
  const responseFallback = responseTimeFallback(chronological);
  // An inter-event gap can include feedback/navigation from both the previous
  // and current card, so it is evidence of overall throughput, not a mode-
  // specific whole-card duration.
  const global = makePaceDistribution(recentGaps, responseFallback);

  return {
    global,
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
  const observations: OutcomeObservation[] = [];

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
    observations.push({ mode, bucket, outcome: evidence.outcome });

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

  // Replay all usable history above so each observation keeps its true
  // preceding learning bucket. Only the resulting observations are bounded;
  // truncating events before replay would incorrectly turn the first retained
  // review into an `unseen` review.
  const recentObservations = observations.slice(
    -FORECAST_OUTCOME_CONSTANTS.maxRecentOutcomeSamples,
  );
  for (const observation of recentObservations) {
    incrementOutcome(
      countsByKey,
      outcomeBucketKey(observation.mode, observation.bucket),
      observation.outcome,
    );
    incrementCounts(modeCounts, observation.mode, observation.outcome);
    incrementCount(globalCounts, observation.outcome);
  }
  const outcomeSampleSize = recentObservations.length;

  const globalDistribution = smoothOutcomeDistribution(
    globalCounts,
    fallbackOutcomePrior("recall_calculation"),
    FORECAST_OUTCOME_CONSTANTS.globalPriorStrength,
  );
  const byModeAndBucket: Record<string, OutcomeDistribution> = {};
  for (const mode of ["recall_calculation", "mcq"] as const) {
    const modeBroad = broaderModeDistribution(
      mode,
      modeCounts.get(mode),
      outcomeSampleSize > 0,
      globalDistribution,
    );
    for (const bucket of ["unseen", "recovery", "learning", "learned"] as const) {
      const bucketCounts = countsByKey.get(outcomeBucketKey(mode, bucket));
      byModeAndBucket[outcomeBucketKey(mode, bucket)] = smoothOutcomeDistribution(
        bucketCounts,
        modeBroad,
        FORECAST_OUTCOME_CONSTANTS.bucketPriorStrength,
        mode,
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

interface OutcomeObservation {
  readonly mode: ForecastModeFamily;
  readonly bucket: ForecastLearningBucket;
  readonly outcome: SchedulerOutcome;
}

function makePaceDistribution(
  samples: readonly number[],
  responseFallback: readonly number[] | null,
): PaceDistribution {
  const empiricalSamples = samples.length > 0 ? samples : (responseFallback ?? []);
  if (empiricalSamples.length === 0) {
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

  // A few observed gaps should not overwhelm the conservative cold-start
  // timing model. These pseudo-samples are deliberately part of the sampled
  // distribution, while sampleSize remains the count of real timestamp gaps.
  const sorted = [...fallbackPacePriorSamples(), ...empiricalSamples].sort(
    (left, right) => left - right,
  );
  return {
    samples: Object.freeze(sorted),
    lowCycleMs: quantile(sorted, 0.2),
    medianCycleMs: quantile(sorted, 0.5),
    highCycleMs: quantile(sorted, 0.8),
    sampleSize: samples.length,
    source: samples.length > 0 ? "history" : "response_time",
  };
}

function fallbackPacePriorSamples(): number[] {
  return Array.from(
    { length: FORECAST_PACE_CONSTANTS.fallbackPriorSampleRepeats },
    () => [
      FORECAST_PACE_CONSTANTS.fallbackLowCycleMs,
      FORECAST_PACE_CONSTANTS.fallbackCycleMs,
      FORECAST_PACE_CONSTANTS.fallbackHighCycleMs,
    ],
  ).flat();
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

function broaderModeDistribution(
  mode: ForecastModeFamily,
  counts: OutcomeCounts | undefined,
  hasGlobalEvidence: boolean,
  globalDistribution: OutcomeDistribution,
): OutcomeDistribution {
  const modePrior = hasGlobalEvidence
    ? constrainOutcomeDistributionToMode(mode, globalDistribution)
    : fallbackOutcomePrior(mode);
  return smoothOutcomeDistribution(
    counts,
    modePrior,
    FORECAST_OUTCOME_CONSTANTS.modePriorStrength,
    mode,
  );
}

function smoothOutcomeDistribution(
  bucketCounts: OutcomeCounts | undefined,
  priorDistribution: OutcomeDistribution,
  priorStrength: number,
  mode?: ForecastModeFamily,
): OutcomeDistribution {
  const counts = bucketCounts ?? emptyOutcomeCounts();
  const constrainedPrior =
    mode === undefined
      ? priorDistribution
      : constrainOutcomeDistributionToMode(mode, priorDistribution);
  const empiricalWeakSuccess = mode === "mcq" ? 0 : counts.weak_success;
  const sampleSize = counts.failure + empiricalWeakSuccess + counts.strong_success;
  const denominator = sampleSize + priorStrength;
  return normalizeOutcomeDistribution(
    {
      failure:
        (counts.failure + priorStrength * constrainedPrior.failure) / denominator,
      weak_success:
        (empiricalWeakSuccess + priorStrength * constrainedPrior.weak_success) /
        denominator,
      strong_success:
        (counts.strong_success + priorStrength * constrainedPrior.strong_success) /
        denominator,
    },
    mode,
  );
}

function normalizeOutcomeDistribution(
  distribution: OutcomeDistribution,
  mode: ForecastModeFamily = "recall_calculation",
): OutcomeDistribution {
  const total =
    distribution.failure + distribution.weak_success + distribution.strong_success;
  if (total <= 0 || !Number.isFinite(total)) {
    return fallbackOutcomePrior(mode);
  }
  return {
    failure: distribution.failure / total,
    weak_success: distribution.weak_success / total,
    strong_success: distribution.strong_success / total,
  };
}

function constrainOutcomeDistributionToMode(
  mode: ForecastModeFamily,
  distribution: OutcomeDistribution,
): OutcomeDistribution {
  if (mode !== "mcq") return normalizeOutcomeDistribution(distribution, mode);
  return normalizeOutcomeDistribution(
    {
      failure: distribution.failure,
      weak_success: 0,
      strong_success: distribution.strong_success,
    },
    mode,
  );
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
