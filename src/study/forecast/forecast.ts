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
    seed: seedForecastSimulation(input.reviewEvents, input.settings),
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
    : simulationStatus === "unresolved"
      ? null
      : rangeFromValues(
          simulation.completions.map((value) => value.activeMs / MINUTE_MS),
          false,
        );
  const additionalReviews = achieved
    ? zeroForecastRange()
    : simulationStatus === "unresolved"
      ? null
      : rangeFromValues(
          simulation.completions.map((value) => value.additionalReviews),
          true,
        );
  const elapsedMs = achieved
    ? zeroForecastRange()
    : simulationStatus === "unresolved"
      ? null
      : rangeFromValues(
          simulation.completions.map((value) => value.elapsedMs),
          false,
        );
  const deadline = deriveForecastDeadlineInterpretation({
    achieved,
    estimateReliable: simulationStatus !== "unresolved",
    medianElapsedMs: elapsedMs?.median ?? 0,
    highElapsedMs: elapsedMs?.high ?? 0,
    medianActiveMs:
      activeMinutes?.median === undefined ? 0 : activeMinutes.median * MINUTE_MS,
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
  if (
    simulation.completionFraction >=
    FORECAST_SIMULATION_CONSTANTS.minimumReliableCompletionFraction
  ) {
    return "censored";
  }
  return "unresolved";
}

function zeroForecastRange(): ForecastRange {
  return { low: 0, median: 0, high: 0 };
}

function rangeFromValues(values: readonly number[], integer: boolean): ForecastRange {
  const sorted = [...values].sort((left, right) => left - right);
  const range = {
    low: quantile(sorted, FORECAST_SIMULATION_CONSTANTS.lowerQuantile),
    median: quantile(sorted, 0.5),
    high: quantile(sorted, FORECAST_SIMULATION_CONSTANTS.upperQuantile),
  };
  return integer
    ? {
        low: Math.round(range.low),
        median: Math.round(range.median),
        high: Math.round(range.high),
      }
    : range;
}

function quantile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function deriveForecastDeadlineInterpretation(input: {
  readonly achieved: boolean;
  readonly estimateReliable: boolean;
  readonly medianElapsedMs: number;
  readonly highElapsedMs: number;
  readonly medianActiveMs: number;
  readonly settings: AppSettings;
  readonly nowMs: number;
}): ForecastDeadlineInterpretation {
  const { achieved, medianElapsedMs, highElapsedMs, medianActiveMs, settings, nowMs } =
    input;
  if (achieved) return { status: "achieved", constraint: "none" };
  if (!input.estimateReliable) return { status: "unresolved", constraint: "none" };
  const deadlineMs = getStudyDeadlineMs(settings);
  const examAtMs = getExamAtMs(settings);
  if (deadlineMs === null || examAtMs === null) {
    return { status: "no_exam", constraint: "none" };
  }

  const availableToDeadlineMs = Math.max(0, deadlineMs - nowMs);
  const medianCompletionMs = nowMs + medianElapsedMs;
  const highCompletionMs = nowMs + highElapsedMs;
  let status: ForecastDeadlineStatus;
  if (highCompletionMs <= deadlineMs) {
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
  return target.simulationStatus !== "unresolved" && target.elapsedMs !== null;
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
