import type { Flashcard } from "../../domain/content";

export type SchedulerOutcome = "failure" | "weak_success" | "strong_success";

export type LearningState = "unseen" | "relearning" | "weak" | "learning" | "learned";

export type ExamPhase = "no_exam" | "cram" | "buffer" | "post_exam";

export interface ExamSrsCardState {
  readonly cardId: string;
  readonly learningState: LearningState;
  readonly strength: number;
  readonly reviewCount: number;
  readonly lastReviewedAt: string | null;
  readonly lastOutcome: SchedulerOutcome | null;
  readonly dueAt: string | null;
  /** True only for a scheduled review due now; unseen cards are eligible separately. */
  readonly isDue: boolean;
  /** Present and true only when a learner-authored permanent exclusion is active. */
  readonly isManuallyLearned?: boolean;
}

export interface ExamSrsSnapshot {
  readonly phase: ExamPhase;
  readonly studyDeadline: string | null;
  readonly states: readonly ExamSrsCardState[];
  readonly stateByCardId: Readonly<Record<string, ExamSrsCardState>>;
}

export type StudyReason =
  "New" | "Relearning" | "Weak" | "Due review" | "Learned review" | "Study ahead";

export interface StudySelection {
  readonly card: Flashcard;
  readonly state: ExamSrsCardState;
  readonly reason: StudyReason;
  readonly isStudyAhead: boolean;
}

export interface NextCardSelection {
  readonly selection: StudySelection | null;
  readonly nextDueAt: string | null;
}
