import type { Difficulty } from "../domain/content";
import type { QuestionStimulusSpec } from "../stimulus/model";

export type CalculationSeed = string | number;

export type NumericUnit =
  | "none"
  | "percent"
  | "percentage_points"
  | "currency"
  | "currency_millions"
  | "index"
  | "ratio"
  | "people"
  | "units"
  | "years"
  | string;

export interface NumericTolerance {
  readonly type: "absolute" | "relative";
  readonly value: number;
}

export interface NumericAnswerSpec {
  readonly value: number;
  readonly unit: NumericUnit;
  readonly displayUnit?: string;
  readonly decimals: number;
  readonly tolerance: NumericTolerance;
  readonly roundingInstruction: string;
}

export type CalculationParameterValue = number | string;

export interface GeneratedCalculationInstance {
  readonly templateId: string;
  readonly instanceId: string;
  readonly seed: string;
  readonly reviewCardId: string;
  readonly chapter: number;
  readonly topic: string;
  readonly difficulty: Difficulty;
  readonly prompt: string;
  readonly stimulus?: QuestionStimulusSpec;
  readonly answer: NumericAnswerSpec;
  readonly workedSolution: readonly string[];
  readonly explanation: string;
  readonly commonTrap: string;
  readonly sourceCardIds: readonly string[];
  /** Reproducibility/debug data; never persisted as a progress record. */
  readonly parameters: Readonly<Record<string, CalculationParameterValue>>;
}

export interface CalculationTemplate {
  readonly id: string;
  readonly reviewCardId: string;
  readonly chapter: number;
  readonly topic: string;
  readonly difficulty: Difficulty;
  readonly sourceCardIds: readonly string[];
  instantiate(seed: CalculationSeed): GeneratedCalculationInstance;
  readonly validateInstance?: (instance: GeneratedCalculationInstance) => void;
}
