import { createContext, useContext } from "react";
import type { ProgressBackupV1 } from "../domain/backup";
import type { AppSettings, NewReviewEvent, ProgressSnapshot } from "../domain/progress";
import type { RecordedReview } from "../db/progressRepository";

export interface ProgressContextValue {
  readonly snapshot: ProgressSnapshot | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly clearError: () => void;
  readonly saveSettings: (settings: AppSettings) => Promise<void>;
  readonly recordReview: (input: NewReviewEvent) => Promise<RecordedReview>;
  readonly exportProgress: () => string;
  readonly replaceProgress: (backup: ProgressBackupV1) => Promise<void>;
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
