import type { QuestionStimulusSpec } from "../stimulus/model";

export const EXAM_QUESTION_STYLES = [
  "concept",
  "scenario",
  "calculation",
  "model_discrimination",
  "sequence",
] as const;

export type ExamQuestionStyle = (typeof EXAM_QUESTION_STYLES)[number];

export const EXAM_QUESTION_PROVENANCES = [
  "canonical_mcq",
  "authored_from_flashcards",
] as const;

export type ExamQuestionProvenance = (typeof EXAM_QUESTION_PROVENANCES)[number];
export type ExamDifficulty = 1 | 2 | 3;
export type ExamChoiceIndex = 0 | 1 | 2 | 3;
export type FourChoices = readonly [string, string, string, string];
export type FourRationales = readonly [string, string, string, string];

export interface ExamQuestion {
  readonly id: string;
  readonly chapter: number;
  readonly topic: string;
  readonly style: ExamQuestionStyle;
  readonly difficulty: ExamDifficulty;
  readonly stem: string;
  readonly choices: FourChoices;
  readonly correctChoice: ExamChoiceIndex;
  readonly explanation: string;
  readonly choiceRationales: FourRationales;
  readonly reviewCardId: string;
  readonly sourceCardIds: readonly string[];
  readonly tags: readonly string[];
  readonly provenance: ExamQuestionProvenance;
  readonly stimulus?: QuestionStimulusSpec;
}
