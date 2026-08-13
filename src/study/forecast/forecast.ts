import type { Flashcard } from "../../domain/content";
import { type AppSettings, type ReviewEvent } from "../../domain/progress";
import {
  deriveExamSrsSnapshot,
  getExamAtMs,
  getStudyDeadlineMs,
} from "../examSrs/deriveState";
import { MINUTE_MS } from "../examSrs/intervals";
import type { ExamSrsSnapshot } from "../examSrs/model";
import { calibrateOutcomes, calibratePace } from "./calibration";
import type {
  ForecastConfidence,
  ForecastDeadlineConstraint,
  ForecastDeadlineStatus,
  ForecastRange,
  StudyTimeForecast,
  TargetForecast,
} from "./model";
import { STUDY_TIME_FORECAST_MODEL_VERSION, seedForecastSimulation } from "./random";
import {
  getForecastTargetProgress,
  isForecastTargetSatisfied,
  STUDY_FORECAST_TARGETS,
  type ForecastTargetId,
} from "./targets";
import { FORECAST_SIMULATION_CONSTANTS, simulateStudyForecast } from "./simulate";

export interface DeriveStudyTimeForecastInput {
  readonly cards: readonly Flashcard[];
  readonly reviewEvents: readonly ReviewEvent[];
  readonly settings: AppSettings;
  readonly nowMs: number;
  /** Reuse the Home page's already-derived snapshot when available. */
  readonly scheduler?: ExamSrsSnapshot;
  /** Operationally satisfied concepts used only for prerequisite guidance. */
  readonly manuallySatisfiedConceptIds?: ReadonlySet<string>;
}

export interface ForecastDeadlineInterpretation {
  readonly status: ForecastDeadlineStatus;
  readonly constraint: ForecastDeadlineConstraint;
}

export function deriveStudyTimeForecast(
  input: DeriveStudyTimeForecastInput,
): StudyTimeForecast {
  const scheduler =
    input.scheduler ??
    deriveExamSrsSnapshot(input.cards, input.reviewEvents, input.settings, input.nowMs);
  const pace = calibratePace(input.reviewEvents);
  const outcomes = calibrateOutcomes(
    input.cards,
    input.reviewEvents,
    input.settings,
    input.nowMs,
  );
  const simulation = simulateStudyForecast({
    cards: input.cards,
    settings: input.settings,
    nowMs: input.nowMs,
    scheduler,
    pace,
    outcomes,
    manuallySatisfiedConceptIds: input.manuallySatisfiedConceptIds,
    seed: seedForecastSimulation(
      input.reviewEvents,
      input.settings,
      scheduler.states
        .filter((state) => state.isManuallyLearned === true)
        .map((state) => state.cardId),
      input.manuallySatisfiedConceptIds,
    ),
  });
  const currentProgress = getForecastTargetProgress(input.cards, scheduler);
  const targets = STUDY_FORECAST_TARGETS.map((target) =>
    createTargetForecast(
      target.id,
      target.label,
      target.criterion,
      target.learnedPercent,
      currentProgress,
      simulation.byTarget[target.id],
      input.cards.length,
      input.settings,
      input.nowMs,
    ),
  );
  const confidence = combineConfidence(pace.confidence, outcomes.confidence);

  return {
    modelVersion: STUDY_TIME_FORECAST_MODEL_VERSION,
    confidence,
    pace: {
      reviewsPerHour: pace.reviewsPerHour,
      medianCycleMs: pace.global.medianCycleMs,
      sampleSize: pace.sampleSize,
      confidence: pace.confidence,
    },
    calibration: {
      outcomeSampleSize: outcomes.outcomeSampleSize,
      confidence: outcomes.confidence,
    },
    targets,
    recommendation: makeForecastRecommendation(targets, input.settings),
  };
}

function createTargetForecast(
  id: ForecastTargetId,
  label: string,
  criterion: string,
  learnedPercent: number,
  currentProgress: ReturnType<typeof getForecastTargetProgress>,
  simulation: ReturnType<typeof simulateStudyForecast>["byTarget"][ForecastTargetId],
  totalCards: number,
  settings: AppSettings,
  nowMs: number,
): TargetForecast {
  const achieved = isForecastTargetSatisfied(
    STUDY_FORECAST_TARGETS.find((target) => target.id === id)!,
    currentProgress,
  );
  const simulationStatus = achieved ? "estimated" : simulationStatusFor(simulation);
  const activeMinutes = achieved
    ? zeroForecastRange()
    : censorAwareRangeFromValues(
        simulation.completions.map((value) => value.activeMs / MINUTE_MS),
        simulation.simulationRuns,
        false,
      );
  const additionalReviews = achieved
    ? zeroForecastRange()
    : censorAwareRangeFromValues(
        simulation.completions.map((value) => value.additionalReviews),
        simulation.simulationRuns,
        true,
      );
  const elapsedMs = achieved
    ? zeroForecastRange()
    : censorAwareRangeFromValues(
        simulation.completions.map((value) => value.elapsedMs),
        simulation.simulationRuns,
        false,
      );
  const deadline = deriveForecastDeadlineInterpretation({
    achieved,
    estimateReliable: simulationStatus !== "unresolved",
    medianElapsedMs: elapsedMs.median,
    highElapsedMs: elapsedMs.high,
    medianActiveMs:
      activeMinutes.median === null ? null : activeMinutes.median * MINUTE_MS,
    settings,
    nowMs,
  });

  return {
    id,
    label,
    criterion,
    achieved,
    totalCards,
    currentSeen: currentProgress.seen,
    currentCoverage: totalCards === 0 ? 100 : (currentProgress.seen / totalCards) * 100,
    currentLearned: currentProgress.learned,
    currentCriticalSeen: currentProgress.criticalSeen,
    currentCriticalLearned: currentProgress.criticalLearned,
    targetLearned: Math.ceil((totalCards * learnedPercent) / 100),
    criticalCardCount: currentProgress.criticalTotal,
    activeMinutes,
    additionalReviews,
    elapsedMs,
    deadlineStatus: deadline.status,
    deadlineConstraint: deadline.constraint,
    simulationStatus,
    completedRuns: simulation.completedRuns,
    simulationRuns: simulation.simulationRuns,
    completionFraction: simulation.completionFraction,
    censoredRuns: simulation.censoredRuns,
    censorReasons: simulation.censorReasons,
  };
}

function simulationStatusFor(
  simulation: ReturnType<typeof simulateStudyForecast>["byTarget"][ForecastTargetId],
): TargetForecast["simulationStatus"] {
  if (
    simulation.simulationRuns > 0 &&
    simulation.completedRuns === simulation.simulationRuns
  ) {
    return "estimated";
  }
  if (simulation.completionFraction > FORECAST_SIMULATION_CONSTANTS.medianQuantile) {
    return "censored";
  }
  return "unresolved";
}

function zeroForecastRange(): ForecastRange {
  return { low: 0, median: 0, high: 0 };
}

/**
 * Convert completed trajectories into unconditional model quantiles. A target
 * completed by fraction c of runs has a q quantile only when q < c; in that
 * case the observed completer quantile is q / c. Quantiles at or beyond c are
 * censored rather than replaced with a completed-run maximum.
 */
export function censorAwareRangeFromValues(
  values: readonly number[],
  simulationRuns: number,
  integer: boolean,
): ForecastRange {
  const sorted = [...values].sort((left, right) => left - right);
  const completionFraction =
    simulationRuns > 0 ? Math.min(1, sorted.length / simulationRuns) : 0;
  return {
    low: identifiableQuantile(
      sorted,
      completionFraction,
      FORECAST_SIMULATION_CONSTANTS.lowerQuantile,
      integer,
    ),
    median: identifiableQuantile(
      sorted,
      completionFraction,
      FORECAST_SIMULATION_CONSTANTS.medianQuantile,
      integer,
    ),
    high: identifiableQuantile(
      sorted,
      completionFraction,
      FORECAST_SIMULATION_CONSTANTS.upperQuantile,
      integer,
    ),
  };
}

function identifiableQuantile(
  sorted: readonly number[],
  completionFraction: number,
  unconditionalFraction: number,
  integer: boolean,
): number | null {
  if (sorted.length === 0 || unconditionalFraction >= completionFraction) return null;
  const value = quantile(sorted, unconditionalFraction / completionFraction);
  return integer ? Math.round(value) : value;
}

function quantile(sorted: readonly number[], fraction: number): number {
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function deriveForecastDeadlineInterpretation(input: {
  readonly achieved: boolean;
  readonly estimateReliable: boolean;
  readonly medianElapsedMs: number | null;
  readonly highElapsedMs: number | null;
  readonly medianActiveMs: number | null;
  readonly settings: AppSettings;
  readonly nowMs: number;
}): ForecastDeadlineInterpretation {
  const { achieved, medianElapsedMs, highElapsedMs, medianActiveMs, settings, nowMs } =
    input;
  if (achieved) return { status: "achieved", constraint: "none" };
  if (!input.estimateReliable || medianElapsedMs === null) {
    return { status: "unresolved", constraint: "none" };
  }
  const deadlineMs = getStudyDeadlineMs(settings);
  const examAtMs = getExamAtMs(settings);
  if (deadlineMs === null || examAtMs === null) {
    return { status: "no_exam", constraint: "none" };
  }

  const availableToDeadlineMs = Math.max(0, deadlineMs - nowMs);
  const medianCompletionMs = nowMs + medianElapsedMs;
  const highCompletionMs = highElapsedMs === null ? null : nowMs + highElapsedMs;
  let status: ForecastDeadlineStatus;
  if (highCompletionMs !== null && highCompletionMs <= deadlineMs) {
    status = "comfortable";
  } else if (medianCompletionMs <= deadlineMs) {
    status = "tight";
  } else if (medianCompletionMs <= examAtMs) {
    status = "buffer";
  } else {
    status = "after_exam";
  }

  if (
    status !== "comfortable" &&
    medianCompletionMs > deadlineMs &&
    medianActiveMs !== null &&
    medianActiveMs <= availableToDeadlineMs
  ) {
    return { status, constraint: "spacing" };
  }
  if (status === "buffer" || status === "after_exam") {
    return { status, constraint: "active_workload" };
  }
  return { status, constraint: "none" };
}

export function makeForecastRecommendation(
  targets: readonly TargetForecast[],
  settings: AppSettings,
): { readonly targetId: ForecastTargetId | null; readonly explanation: string } {
  const outstanding = targets.filter((target) => !target.achieved);
  if (outstanding.length === 0) {
    return {
      targetId: null,
      explanation:
        "All five operational study targets are already achieved; no additional work is projected.",
    };
  }

  const deadlineMs = getStudyDeadlineMs(settings);
  const examAtMs = getExamAtMs(settings);
  if (deadlineMs === null || examAtMs === null) {
    const target = [...outstanding].reverse().find(hasUsableForecast) ?? outstanding[0];
    return {
      targetId: target.id,
      explanation: hasUsableForecast(target)
        ? `With no exam deadline configured, ${target.label} is the highest remaining app-defined target.`
        : `With no exam deadline configured, ${target.label} is the next priority, but its model is not reliably resolved within the defensive horizon.`,
    };
  }

  const beforeDeadline = outstanding.filter(
    (target) =>
      hasUsableForecast(target) &&
      (target.deadlineStatus === "comfortable" || target.deadlineStatus === "tight"),
  );
  if (beforeDeadline.length > 0) {
    const target = beforeDeadline[beforeDeadline.length - 1];
    const reason =
      target.deadlineStatus === "comfortable"
        ? "The upper model range fits before your effective study deadline."
        : target.deadlineConstraint === "spacing"
          ? "The median fits before the effective study deadline, but spacing makes the model range tight."
          : "The median fits before the effective study deadline, but the model range is tight.";
    return {
      targetId: target.id,
      explanation: recommendationExplanation(target, reason),
    };
  }

  const beforeExam = outstanding.filter(
    (target) => hasUsableForecast(target) && target.deadlineStatus === "buffer",
  );
  if (beforeExam.length > 0) {
    const target = beforeExam[beforeExam.length - 1];
    return {
      targetId: target.id,
      explanation: recommendationExplanation(
        target,
        "The median fits before the exam, but reaching this target likely requires using the deliberate buffer.",
      ),
    };
  }

  const nextTarget = outstanding[0];
  return {
    targetId: nextTarget.id,
    explanation: hasUsableForecast(nextTarget)
      ? recommendationExplanation(
          nextTarget,
          `No remaining target has a median completion before the exam at this calibrated pace; start with ${nextTarget.label}.`,
        )
      : `No remaining target has a reliable median forecast before the exam; prioritise ${nextTarget.label} first and treat the model as unresolved.`,
  };
}

function hasUsableForecast(target: TargetForecast): boolean {
  return target.simulationStatus !== "unresolved" && target.elapsedMs.median !== null;
}

function recommendationExplanation(target: TargetForecast, reason: string): string {
  const constraintNote =
    target.deadlineConstraint === "spacing"
      ? " Spacing, rather than active work alone, is the main constraint."
      : "";
  const censorNote =
    target.simulationStatus === "censored"
      ? ` This estimate is censored: ${Math.round(target.completionFraction * 100)}% of model runs reached it.`
      : "";
  return `${reason}${constraintNote}${censorNote}`;
}

function combineConfidence(
  pace: ForecastConfidence,
  outcomes: ForecastConfidence,
): ForecastConfidence {
  if (pace === "low" || outcomes === "low") return "low";
  if (pace === "medium" || outcomes === "medium") return "medium";
  return "high";
}
