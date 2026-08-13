import type { Flashcard } from "../../domain/content";
import type { ExamSrsSnapshot } from "../examSrs/model";
import { getExamYieldForCard } from "../../examYield/score";

export const FORECAST_TARGET_IDS = [
  "coverage",
  "working",
  "exam_ready",
  "strong",
  "near_complete",
] as const;

export type ForecastTargetId = (typeof FORECAST_TARGET_IDS)[number];

export interface ForecastTargetProgress {
  readonly total: number;
  readonly seen: number;
  readonly learned: number;
  readonly criticalSeen: number;
  readonly criticalLearned: number;
  readonly criticalTotal: number;
}

export interface ForecastTargetDefinition {
  readonly id: ForecastTargetId;
  readonly label: string;
  readonly criterion: string;
  readonly learnedPercent: number;
  readonly isSatisfied: (progress: ForecastTargetProgress) => boolean;
}

/**
 * V1's learner-facing levels. These are operational study targets, not
 * mastery scores, recall probabilities, or exam-performance predictions.
 */
export const STUDY_FORECAST_TARGETS: readonly ForecastTargetDefinition[] =
  Object.freeze([
    {
      id: "coverage",
      label: "Full coverage",
      criterion: "Every canonical card has usable review evidence.",
      learnedPercent: 0,
      isSatisfied: (progress) => progress.seen === progress.total,
    },
    {
      id: "working",
      label: "Working",
      criterion: "100% coverage and at least 80% of cards are Learned.",
      learnedPercent: 80,
      isSatisfied: (progress) =>
        progress.seen === progress.total &&
        progress.learned >= Math.ceil(progress.total * 0.8),
    },
    {
      id: "exam_ready",
      label: "Exam-ready",
      criterion:
        "100% coverage, at least 90% Learned, and every critical exam-yield card seen.",
      learnedPercent: 90,
      isSatisfied: (progress) =>
        progress.seen === progress.total &&
        progress.learned >= Math.ceil(progress.total * 0.9) &&
        progress.criticalSeen === progress.criticalTotal,
    },
    {
      id: "strong",
      label: "Strong",
      criterion:
        "100% coverage, at least 95% Learned, and every critical exam-yield card Learned.",
      learnedPercent: 95,
      isSatisfied: (progress) =>
        progress.seen === progress.total &&
        progress.learned >= Math.ceil(progress.total * 0.95) &&
        progress.criticalLearned === progress.criticalTotal,
    },
    {
      id: "near_complete",
      label: "Near-complete",
      criterion: "100% of canonical cards are Learned.",
      learnedPercent: 100,
      isSatisfied: (progress) => progress.learned === progress.total,
    },
  ] satisfies readonly ForecastTargetDefinition[]);

export function getForecastTargetDefinition(
  id: ForecastTargetId,
): ForecastTargetDefinition {
  const target = STUDY_FORECAST_TARGETS.find((candidate) => candidate.id === id);
  if (target === undefined) {
    throw new Error(`Unknown Study Time Forecast target: ${id}`);
  }
  return target;
}

export function getForecastTargetProgress(
  cards: readonly Flashcard[],
  scheduler: Pick<ExamSrsSnapshot, "states">,
  criticalCardIds = getCriticalForecastCardIds(cards),
): ForecastTargetProgress {
  const stateByCardId = new Map(scheduler.states.map((state) => [state.cardId, state]));

  let seen = 0;
  let learned = 0;
  let criticalSeen = 0;
  let criticalLearned = 0;
  for (const card of cards) {
    const state = stateByCardId.get(card.id);
    if (state?.learningState !== "unseen") {
      seen += 1;
    }
    if (state?.learningState === "learned") {
      learned += 1;
    }
    if (criticalCardIds.has(card.id)) {
      if (state?.learningState !== "unseen") {
        criticalSeen += 1;
      }
      if (state?.learningState === "learned") {
        criticalLearned += 1;
      }
    }
  }

  return {
    total: cards.length,
    seen,
    learned,
    criticalSeen,
    criticalLearned,
    criticalTotal: criticalCardIds.size,
  };
}

export function getCriticalForecastCardIds(
  cards: readonly Flashcard[],
): ReadonlySet<string> {
  return new Set(
    cards
      .filter((card) => getExamYieldForCard(card.id).tier === "critical")
      .map((card) => card.id),
  );
}

export function isForecastTargetSatisfied(
  target: ForecastTargetDefinition,
  progress: ForecastTargetProgress,
): boolean {
  return target.isSatisfied(progress);
}
