import type { KnowledgeSourceRef } from "../model";
import type { NumericUnit } from "../../calculations/model";

export const GUIDED_CHECK_PREFIX = "knowledge-check:" as const;

export type GuidedCheckKind = "mcq" | "calculation";

export interface GuidedMcqVariant {
  readonly kind: "mcq";
  readonly id: string;
  readonly fingerprint: string;
  readonly prompt: string;
  readonly choices: readonly string[];
  readonly correctChoice: number;
  readonly explanation: string;
}

export interface GuidedCalculationVariant {
  readonly kind: "calculation";
  readonly id: string;
  readonly fingerprint: string;
  readonly prompt: string;
  readonly answer: number;
  readonly unit: NumericUnit;
  readonly decimals: number;
  readonly tolerance: number;
  readonly explanation: string;
}

export type GuidedCheckVariant = GuidedMcqVariant | GuidedCalculationVariant;

export type GuidedCheckGenerator = (seed: number) => GuidedCheckVariant;

export interface GuidedKnowledgeCheckSkill {
  readonly id: string;
  readonly conceptId: string;
  readonly kind: GuidedCheckKind;
  readonly chapter: number;
  readonly tags: readonly string[];
  readonly sourceRefs: readonly KnowledgeSourceRef[];
  readonly variants: readonly GuidedCheckVariant[];
  readonly generator?: GuidedCheckGenerator;
  readonly generatorId?: string;
}

export function guidedCheckIdForConcept(conceptId: string): string {
  return `${GUIDED_CHECK_PREFIX}${conceptId}`;
}

export function isGuidedCheckId(value: string): boolean {
  return (
    value.startsWith(GUIDED_CHECK_PREFIX) && value.length > GUIDED_CHECK_PREFIX.length
  );
}
