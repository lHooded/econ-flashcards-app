import type { Flashcard } from "../../domain/content";
import type { AppSettings, ReviewEvent, ReviewMode } from "../../domain/progress";
import { createCardPrerequisiteReadinessTracker } from "../../knowledge/mastery";
import {
  advanceExamSrsCardState,
  deriveExamPhase,
  deriveReviewEvidence,
  refreshExamSrsCardStateAt,
} from "../examSrs/deriveState";
import type {
  ExamSrsCardState,
  ExamSrsSnapshot,
  SchedulerOutcome,
} from "../examSrs/model";
import { DAY_MS } from "../examSrs/intervals";
import {
  createExamSrsForecastSelector,
  getExamSrsCoverage,
  type ExamSrsCoverage,
} from "../examSrs/selector";
import {
  getForecastLearningBucket,
  getForecastModeFamily,
  getOutcomeDistribution,
  type OutcomeCalibration,
  type PaceCalibration,
} from "./calibration";
import { createSeededRandom, hashForecastSeed } from "./random";
import {
  getCriticalForecastCardIds,
  getForecastTargetProgress,
  isForecastTargetSatisfied,
  STUDY_FORECAST_TARGETS,
  type ForecastTargetId,
} from "./targets";
import type { ForecastTargetProgress } from "./targets";
import type { ForecastCensorReason } from "./model";

export const FORECAST_SIMULATION_CONSTANTS = Object.freeze({
  runCount: 256,
  maxReviewsPerRun: 5000,
  maxElapsedMs: 30 * DAY_MS,
  lowerQuantile: 0.2,
  medianQuantile: 0.5,
  upperQuantile: 0.8,
  recentCardLimit: 3,
});

export interface SimulationCompletion {
  readonly activeMs: number;
  readonly additionalReviews: number;
  readonly elapsedMs: number;
}

export interface SimulationCensoring {
  readonly reason: ForecastCensorReason;
  /** Actual progress when the trajectory stopped; never an invented completion. */
  readonly activeMs: number;
  readonly additionalReviews: number;
  readonly elapsedMs: number;
}

export interface SimulationTargetResult {
  readonly id: ForecastTargetId;
  /** Genuine target completions only; censored trajectories are excluded. */
  readonly completions: readonly SimulationCompletion[];
  readonly completedRuns: number;
  readonly simulationRuns: number;
  readonly completionFraction: number;
  readonly censoredRuns: number;
  readonly censorReasons: readonly ForecastCensorReason[];
  readonly censoring: readonly SimulationCensoring[];
}

export interface StudyForecastSimulationResult {
  readonly byTarget: Readonly<Record<ForecastTargetId, SimulationTargetResult>>;
}

interface MutableSimulationScheduler {
  phase: ExamSrsSnapshot["phase"];
  studyDeadline: string | null;
  states: ExamSrsCardState[];
  stateByCardId: Record<string, ExamSrsCardState>;
  stateIndexByCardId: ReadonlyMap<string, number>;
}

export function simulateStudyForecast(input: {
  readonly cards: readonly Flashcard[];
  readonly settings: AppSettings;
  readonly nowMs: number;
  readonly scheduler: ExamSrsSnapshot;
  readonly pace: PaceCalibration;
  readonly outcomes: OutcomeCalibration;
  readonly seed: number;
  /** Directly satisfied concepts supplied by application state. */
  readonly manuallySatisfiedConceptIds?: ReadonlySet<string>;
  readonly runCount?: number;
  readonly maxReviewsPerRun?: number;
  /** Test hook; production uses the named defensive horizon above. */
  readonly maxElapsedMs?: number;
}): StudyForecastSimulationResult {
  const runCount = input.runCount ?? FORECAST_SIMULATION_CONSTANTS.runCount;
  const maxReviewsPerRun =
    input.maxReviewsPerRun ?? FORECAST_SIMULATION_CONSTANTS.maxReviewsPerRun;
  const maxElapsedMs = input.maxElapsedMs ?? FORECAST_SIMULATION_CONSTANTS.maxElapsedMs;
  const criticalCardIds = getCriticalForecastCardIds(input.cards);
  const progress = getForecastTargetProgress(
    input.cards,
    input.scheduler,
    criticalCardIds,
  );
  const completionsByTarget = new Map<ForecastTargetId, SimulationCompletion[]>(
    STUDY_FORECAST_TARGETS.map((target) => [target.id, []]),
  );
  const censoringByTarget = new Map<ForecastTargetId, SimulationCensoring[]>(
    STUDY_FORECAST_TARGETS.map((target) => [target.id, []]),
  );

  for (let runIndex = 0; runIndex < runCount; runIndex += 1) {
    const runResult = simulateOneRun({
      ...input,
      criticalCardIds,
      maxReviewsPerRun,
      maxElapsedMs,
      progress,
      random: createSeededRandom(hashForecastSeed(`${input.seed}:${runIndex}`)),
    });
    for (const target of STUDY_FORECAST_TARGETS) {
      const completion = runResult.completions.get(target.id);
      if (completion !== undefined) {
        completionsByTarget.get(target.id)!.push(completion);
      } else if (runResult.censoring !== null) {
        censoringByTarget.get(target.id)!.push(runResult.censoring);
      }
    }
  }

  const byTarget = Object.fromEntries(
    STUDY_FORECAST_TARGETS.map((target) => {
      const completions = completionsByTarget.get(target.id)!;
      const censoring = censoringByTarget.get(target.id)!;
      const completedRuns = completions.length;
      const completionFraction = runCount === 0 ? 0 : completedRuns / runCount;
      const censorReasons = Object.freeze([
        ...new Set(censoring.map((entry) => entry.reason)),
      ]);
      return [
        target.id,
        {
          id: target.id,
          completions: Object.freeze(completions),
          completedRuns,
          simulationRuns: runCount,
          completionFraction,
          censoredRuns: censoring.length,
          censorReasons,
          censoring: Object.freeze(censoring),
        } satisfies SimulationTargetResult,
      ];
    }),
  ) as Readonly<Record<ForecastTargetId, SimulationTargetResult>>;

  return { byTarget };
}

function simulateOneRun(input: {
  readonly cards: readonly Flashcard[];
  readonly settings: AppSettings;
  readonly nowMs: number;
  readonly scheduler: ExamSrsSnapshot;
  readonly pace: PaceCalibration;
  readonly outcomes: OutcomeCalibration;
  readonly criticalCardIds: ReadonlySet<string>;
  readonly maxReviewsPerRun: number;
  readonly maxElapsedMs: number;
  readonly progress: ReturnType<typeof getForecastTargetProgress>;
  readonly manuallySatisfiedConceptIds?: ReadonlySet<string>;
  readonly random: { next: () => number };
}): {
  readonly completions: Map<ForecastTargetId, SimulationCompletion>;
  readonly censoring: SimulationCensoring | null;
} {
  const states = input.scheduler.states.map((state) => ({ ...state }));
  const stateByCardId = Object.fromEntries(
    states.map((state) => [state.cardId, state]),
  );
  const stateIndexByCardId = new Map(
    states.map((state, index) => [state.cardId, index]),
  );
  const scheduler: MutableSimulationScheduler = {
    phase: input.scheduler.phase,
    studyDeadline: input.scheduler.studyDeadline,
    states,
    stateByCardId,
    stateIndexByCardId,
  };
  let coverage: ExamSrsCoverage = getExamSrsCoverage(input.cards, scheduler.states);
  const forecastSelector = createExamSrsForecastSelector({
    cards: input.cards,
    scheduler,
    coverage,
  });
  const completions = new Map<ForecastTargetId, SimulationCompletion>();
  for (const target of STUDY_FORECAST_TARGETS) {
    if (isForecastTargetSatisfied(target, input.progress)) {
      completions.set(target.id, { activeMs: 0, additionalReviews: 0, elapsedMs: 0 });
    }
  }

  let virtualNowMs = input.nowMs;
  let activeMs = 0;
  let reviewCount = 0;
  let recentlyShownCardIds: string[] = [];
  let progress = { ...input.progress };
  let terminationReason: ForecastCensorReason | null = null;
  const prerequisiteTracker = createCardPrerequisiteReadinessTracker(
    input.cards,
    scheduler,
    undefined,
    input.manuallySatisfiedConceptIds,
  );

  while (
    reviewCount < input.maxReviewsPerRun &&
    virtualNowMs - input.nowMs <= input.maxElapsedMs &&
    completions.size < STUDY_FORECAST_TARGETS.length
  ) {
    const phaseChanged = refreshSimulationScheduler(
      scheduler,
      input.settings,
      virtualNowMs,
    );
    if (phaseChanged) forecastSelector.rebuild();
    const next = forecastSelector.select({
      nowMs: virtualNowMs,
      recentlyShownCardIds,
      newCardPrerequisiteReadyByCardId: prerequisiteTracker.readinessByCardId,
    });

    if (next.selection === null) {
      const nextDueAtMs = next.nextDueAt === null ? null : Date.parse(next.nextDueAt);
      if (
        nextDueAtMs === null ||
        !Number.isFinite(nextDueAtMs) ||
        nextDueAtMs <= virtualNowMs
      ) {
        terminationReason = "no_eligible_card";
        break;
      }
      if (nextDueAtMs - input.nowMs > input.maxElapsedMs) {
        terminationReason = "elapsed_horizon";
        break;
      }
      // Necessary spacing contributes to elapsed time, but not active study time.
      virtualNowMs = nextDueAtMs;
      continue;
    }

    const selected = next.selection;
    const previousState = scheduler.stateByCardId[selected.card.id];
    if (previousState === undefined) {
      terminationReason = "no_eligible_card";
      break;
    }
    const mode = modeForCard(selected.card);
    const bucket = getForecastLearningBucket(previousState);
    const outcome = sampleOutcome(
      getOutcomeDistribution(input.outcomes, getForecastModeFamily(mode), bucket),
      input.random.next(),
    );
    const cycleMs = sampleCycleMs(input.pace.global, input.random.next());
    const completedAtMs = virtualNowMs + cycleMs;
    if (completedAtMs - input.nowMs > input.maxElapsedMs) {
      terminationReason = "elapsed_horizon";
      break;
    }

    const evidence = syntheticEvidenceForOutcome(selected.card, mode, outcome);
    const nextState = advanceExamSrsCardState({
      previousState,
      evidence,
      reviewedAtMs: completedAtMs,
      settings: input.settings,
      nowMs: completedAtMs,
      reviewCount: previousState.reviewCount + 1,
    });
    replaceSimulationState(scheduler, nextState);
    forecastSelector.updateState(nextState);
    progress = advanceForecastProgress(
      progress,
      selected.card.id,
      previousState,
      nextState,
      input.criticalCardIds,
    );
    virtualNowMs = completedAtMs;
    activeMs += cycleMs;
    reviewCount += 1;
    recentlyShownCardIds = [
      selected.card.id,
      ...recentlyShownCardIds.filter((cardId) => cardId !== selected.card.id),
    ].slice(0, FORECAST_SIMULATION_CONSTANTS.recentCardLimit);

    if (previousState.learningState === "unseen") {
      prerequisiteTracker.markCardSeen(selected.card.id);
      coverage = getExamSrsCoverage(input.cards, scheduler.states);
      forecastSelector.setCoverage(coverage);
    }
    for (const target of STUDY_FORECAST_TARGETS) {
      if (!completions.has(target.id) && isForecastTargetSatisfied(target, progress)) {
        completions.set(target.id, {
          activeMs,
          additionalReviews: reviewCount,
          elapsedMs: virtualNowMs - input.nowMs,
        });
      }
    }
  }

  if (completions.size === STUDY_FORECAST_TARGETS.length) {
    return { completions, censoring: null };
  }

  const reason =
    terminationReason ??
    (reviewCount >= input.maxReviewsPerRun
      ? "review_count_cap"
      : virtualNowMs - input.nowMs >= input.maxElapsedMs
        ? "elapsed_horizon"
        : "no_eligible_card");
  return {
    completions,
    censoring: {
      reason,
      activeMs,
      additionalReviews: reviewCount,
      elapsedMs: virtualNowMs - input.nowMs,
    },
  };
}

function refreshSimulationScheduler(
  scheduler: MutableSimulationScheduler,
  settings: AppSettings,
  nowMs: number,
): boolean {
  const nextPhase = deriveExamPhase(settings, nowMs);
  const phaseChanged = scheduler.phase !== nextPhase;
  scheduler.phase = nextPhase;
  if (!phaseChanged) return false;
  for (let index = 0; index < scheduler.states.length; index += 1) {
    const state = scheduler.states[index];
    const refreshed = refreshExamSrsCardStateAt(state, settings, nowMs);
    scheduler.states[index] = refreshed;
    scheduler.stateByCardId[refreshed.cardId] = refreshed;
  }
  return phaseChanged;
}

function advanceForecastProgress(
  progress: ForecastTargetProgress,
  cardId: string,
  previousState: ExamSrsCardState,
  nextState: ExamSrsCardState,
  criticalCardIds: ReadonlySet<string>,
): ForecastTargetProgress {
  const wasSeen = previousState.learningState !== "unseen";
  const isSeen = nextState.learningState !== "unseen";
  const wasLearned = previousState.learningState === "learned";
  const isLearned = nextState.learningState === "learned";
  const isCritical = criticalCardIds.has(cardId);
  return {
    ...progress,
    seen: progress.seen + Number(isSeen) - Number(wasSeen),
    learned: progress.learned + Number(isLearned) - Number(wasLearned),
    criticalSeen:
      progress.criticalSeen + (isCritical ? Number(isSeen) - Number(wasSeen) : 0),
    criticalLearned:
      progress.criticalLearned +
      (isCritical ? Number(isLearned) - Number(wasLearned) : 0),
  };
}

function replaceSimulationState(
  scheduler: MutableSimulationScheduler,
  nextState: ExamSrsCardState,
): void {
  const index = scheduler.stateIndexByCardId.get(nextState.cardId);
  if (index === undefined) return;
  scheduler.states[index] = nextState;
  scheduler.stateByCardId[nextState.cardId] = nextState;
}

function modeForCard(card: Flashcard): ReviewMode {
  if (card.choices !== undefined) return "mcq";
  return card.kind === "calculation" ? "calculation" : "recall";
}

function sampleOutcome(
  distribution: {
    readonly failure: number;
    readonly weak_success: number;
    readonly strong_success: number;
  },
  randomValue: number,
): SchedulerOutcome {
  if (randomValue < distribution.failure) return "failure";
  if (randomValue < distribution.failure + distribution.weak_success) {
    return "weak_success";
  }
  return "strong_success";
}

export function sampleCycleMs(
  distribution: { readonly samples: readonly number[] },
  randomValue: number,
): number {
  if (distribution.samples.length === 0) return 60 * 1000;
  // Calibration has already rejected breaks and implausibly short gaps. Use
  // the full remaining empirical distribution so plausible fast/slow cycles
  // can influence the simulation; target ranges are narrowed separately by
  // their reported simulation quantiles.
  const position = Math.min(1, Math.max(0, randomValue));
  const scaled = (distribution.samples.length - 1) * position;
  const lower = Math.floor(scaled);
  const upper = Math.ceil(scaled);
  if (lower === upper) return distribution.samples[lower];
  return (
    distribution.samples[lower] +
    (distribution.samples[upper] - distribution.samples[lower]) * (scaled - lower)
  );
}

function syntheticEvidenceForOutcome(
  card: Flashcard,
  mode: ReviewMode,
  outcome: SchedulerOutcome,
) {
  const review: ReviewEvent = {
    id: `forecast-${card.id}`,
    cardId: card.id,
    reviewedAt: new Date(0).toISOString(),
    mode,
    correct: outcome === "failure" ? false : true,
    rating:
      outcome === "failure"
        ? "forgot"
        : outcome === "weak_success"
          ? "struggled"
          : mode === "mcq"
            ? null
            : "got_it",
    responseTimeMs: null,
    selectedChoice: null,
  };
  const evidence = deriveReviewEvidence(review);
  if (evidence === null) {
    throw new Error(`Could not derive synthetic Exam-SRS evidence for ${outcome}.`);
  }
  return evidence;
}
