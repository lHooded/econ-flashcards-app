export const EXAM_EVIDENCE_KINDS = [
  "current-course",
  "actual-final",
  "final-practice",
  "sample-final",
  "recent-assessment",
  "historical-final",
] as const;

export type ExamEvidenceKind = (typeof EXAM_EVIDENCE_KINDS)[number];

export const EXAM_YIELD_TIERS = ["critical", "very-high", "core", "support"] as const;

export type ExamYieldTier = (typeof EXAM_YIELD_TIERS)[number];

export const EXAM_EVIDENCE_RELATIONS = ["direct", "family", "scope", "format"] as const;

export type ExamEvidenceRelation = (typeof EXAM_EVIDENCE_RELATIONS)[number];

export interface ExamEvidenceSource {
  readonly id: string;
  readonly year: number;
  readonly kind: ExamEvidenceKind;
  readonly authenticityWeight: number;
  readonly formatFitWeight: number;
  readonly url?: string;
  readonly notes: string;
}

export interface ExamSkillSourceEvidence {
  readonly sourceId: string;
  /** How the source relates to this exact skill, not a probability. */
  readonly relation: ExamEvidenceRelation;
  /** A transparent strength of this skill signal within the source, not a probability. */
  readonly strength: number;
  readonly note: string;
}

export interface ExamSkillEvidence {
  readonly id: string;
  readonly label: string;
  /** Concepts that constitute the examinable skill and originate direct yield. */
  readonly targetConceptIds: readonly string[];
  /** Background concepts useful for explanation, but not entitled to direct yield. */
  readonly supportingConceptIds?: readonly string[];
  readonly cardIds: readonly string[];
  readonly questionIds: readonly string[];
  readonly chapterHints: readonly number[];
  readonly tier: ExamYieldTier;
  readonly crossChapterMechanism?: boolean;
  readonly sourceEvidence: readonly ExamSkillSourceEvidence[];
}

export interface ExamYieldBlueprint {
  readonly sources: readonly ExamEvidenceSource[];
  readonly skills: readonly ExamSkillEvidence[];
}

export interface ExamYieldScore {
  readonly cardId: string;
  readonly score: number;
  readonly tier: ExamYieldTier;
  readonly effectiveConceptYield: number;
  readonly directSkillIds: readonly string[];
  readonly prerequisiteSkillIds: readonly string[];
}

export interface ExamYieldReason {
  readonly label: string;
  readonly priority: number;
}
