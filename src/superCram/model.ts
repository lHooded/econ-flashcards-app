import type { ExamQuestion } from "../exam/model";
import type { ExamYieldTier } from "../examYield/model";
import type { CheatSheetSectionId } from "./cheatSheetCatalog";

/** How much value remains in memorising a skill when the exam cheat sheet is available. */
export type StudyWorthiness = 1 | 2 | 3 | 4 | 5;

export type CheatSheetClass =
  "direct-lookup" | "lookup-plus-application" | "mixed" | "reasoning-heavy";

export interface CheatSheetSkillProfile {
  readonly skillId: string;
  readonly studyWorthiness: StudyWorthiness;
  readonly cheatSheetSections: readonly CheatSheetSectionId[];
  readonly class: CheatSheetClass;
}

export interface QuestionStudyWorthinessOverride {
  readonly questionId: string;
  readonly studyWorthiness: StudyWorthiness;
  readonly class: CheatSheetClass;
  readonly note: string;
  readonly cheatSheetSections?: readonly CheatSheetSectionId[];
}

export interface FormulaApplicationFamily {
  readonly id: string;
  readonly label: string;
  readonly chapters: readonly number[];
  readonly examSkillIds: readonly string[];
  readonly cheatSheetSections: readonly CheatSheetSectionId[];
  readonly questionIds: readonly string[];
  readonly practiceEvidenceSourceIds: readonly string[];
}

/** Metadata for one authored or reused question form in Formula Application. */
export interface FormulaApplicationQuestionMeta {
  readonly questionId: string;
  readonly familyId: string;
  readonly form: string;
  readonly practiceEvidenceSourceIds: readonly string[];
  /** Describes the observed form without asserting that this question is official. */
  readonly analogueNote: string;
  readonly operations: readonly FormulaApplicationOperation[];
}

export type FormulaApplicationOperation =
  | "select-formula"
  | "extract-inputs"
  | "rearrange"
  | "substitute"
  | "calculate"
  | "sign-or-units";

export type SuperCramReasonKind =
  "reasoning-heavy" | "formula-application" | "lookup-validation" | "urgent-weakness";

export interface SuperCramQuestionCandidate {
  readonly question: ExamQuestion;
  readonly examYieldScore: number;
  readonly examYieldTier: ExamYieldTier;
  readonly studyWorthiness: StudyWorthiness;
  readonly cheatSheetClass: CheatSheetClass;
  readonly cheatSheetSections: readonly CheatSheetSectionId[];
  readonly formulaFamilyId: string | null;
  readonly reasonKind: SuperCramReasonKind;
  readonly isUrgent: boolean;
  /** Non-due evidence is useful context, but never an urgent override. */
  readonly hasWeakEvidence: boolean;
  readonly srsPriority: number;
  readonly score: number;
}

export interface SuperCramSessionState {
  readonly recentQuestionIds: readonly string[];
  readonly recentReviewCardIds: readonly string[];
  readonly chaptersTouched: readonly number[];
  readonly formulaFamiliesCovered: ReadonlySet<string>;
  readonly formulaFamiliesFailed: ReadonlySet<string>;
  readonly answeredCount: number;
  readonly correctCount: number;
  readonly reasoningGaps: number;
  readonly kindCounts: Readonly<Record<SuperCramReasonKind, number>>;
}

export interface SuperCramSelectionInput {
  readonly candidates: readonly SuperCramQuestionCandidate[];
  readonly session: SuperCramSessionState;
  readonly nowMs: number;
}
