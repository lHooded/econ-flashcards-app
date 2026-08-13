import type { ForecastTargetId } from "./targets";

export type ForecastConfidence = "low" | "medium" | "high";

export type ForecastDeadlineStatus =
  | "achieved"
  | "comfortable"
  | "tight"
  | "buffer"
  | "after_exam"
  | "no_exam"
  | "unresolved";

export type ForecastDeadlineConstraint = "none" | "active_workload" | "spacing";

export type ForecastSimulationStatus = "estimated" | "censored" | "unresolved";

export type ForecastCensorReason =
  "review_count_cap" | "elapsed_horizon" | "no_eligible_card";

export interface ForecastRange {
  readonly low: number;
  readonly median: number;
  readonly high: number;
}

export interface StudyTimeForecast {
  readonly modelVersion: string;
  /** Confidence in this app's calibration evidence, not confidence of exam performance. */
  readonly confidence: ForecastConfidence;
  readonly pace: {
    readonly reviewsPerHour: number;
    readonly medianCycleMs: number;
    readonly sampleSize: number;
    readonly confidence: ForecastConfidence;
  };
  readonly calibration: {
    readonly outcomeSampleSize: number;
    readonly confidence: ForecastConfidence;
  };
  readonly targets: readonly TargetForecast[];
  readonly recommendation: {
    readonly targetId: ForecastTargetId | null;
    readonly explanation: string;
  };
}

export interface TargetForecast {
  readonly id: ForecastTargetId;
  readonly label: string;
  readonly criterion: string;
  readonly achieved: boolean;
  readonly totalCards: number;
  readonly currentSeen: number;
  readonly currentCoverage: number;
  readonly currentLearned: number;
  readonly currentCriticalSeen: number;
  readonly currentCriticalLearned: number;
  readonly targetLearned: number;
  readonly criticalCardCount: number;
  /** Null when fewer than the reliable completion threshold reached the target. */
  readonly activeMinutes: ForecastRange | null;
  readonly additionalReviews: ForecastRange | null;
  readonly elapsedMs: ForecastRange | null;
  readonly deadlineStatus: ForecastDeadlineStatus;
  readonly deadlineConstraint: ForecastDeadlineConstraint;
  readonly simulationStatus: ForecastSimulationStatus;
  readonly completedRuns: number;
  readonly simulationRuns: number;
  readonly completionFraction: number;
  readonly censoredRuns: number;
  readonly censorReasons: readonly ForecastCensorReason[];
}
