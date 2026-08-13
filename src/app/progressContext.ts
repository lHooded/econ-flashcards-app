import { createContext, useContext } from "react";
import type { ProgressBackupV3 } from "../domain/backup";
import type { ManualLearnedKind } from "../domain/manualLearned";
import type { AppSettings, NewReviewEvent, ProgressSnapshot } from "../domain/progress";
import type { FinalizedMock } from "../db/mockExamRepository";
import type { RecordedReview } from "../db/progressRepository";
import type { MockAttempt, MockQuestionAttemptState } from "../exam/mock/model";

export interface ProgressContextValue {
  readonly snapshot: ProgressSnapshot | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly clearError: () => void;
  readonly saveSettings: (settings: AppSettings) => Promise<void>;
  readonly markLessonSeen: (conceptId: string) => Promise<void>;
  readonly markLearnedPermanently?: (
    kind: ManualLearnedKind,
    targetId: string,
  ) => Promise<void>;
  readonly restoreManualLearned?: (
    kind: ManualLearnedKind,
    targetId: string,
  ) => Promise<void>;
  readonly recordReview: (input: NewReviewEvent) => Promise<RecordedReview>;
  readonly createMockAttempt?: (attempt: MockAttempt) => Promise<MockAttempt>;
  readonly updateMockAttemptProgress?: (
    id: string,
    questionStates: readonly MockQuestionAttemptState[],
    currentQuestionIndex: number,
  ) => Promise<MockAttempt>;
  readonly abandonMockAttempt?: (
    id: string,
    abandonedAt: string,
  ) => Promise<MockAttempt>;
  readonly finalizeMockAttempt?: (
    id: string,
    submittedAt: string,
    committedAt?: string,
  ) => Promise<FinalizedMock>;
  readonly refreshProgress?: () => Promise<void>;
  readonly exportProgress: () => string;
  readonly replaceProgress: (backup: ProgressBackupV3) => Promise<void>;
  readonly resetProgress: () => Promise<void>;
}

export const ProgressContext = createContext<ProgressContextValue | undefined>(
  undefined,
);

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error("useProgress must be used within a ProgressProvider.");
  }
  return context;
}
