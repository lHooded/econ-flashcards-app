import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { ProgressContext, type ProgressContextValue } from "./progressContext";
import { cardIds } from "../data/deck";
import { serializeProgressBackup, type ProgressBackupV2 } from "../domain/backup";
import {
  sortReviewEventsChronologically,
  type AppSettings,
  type NewReviewEvent,
  type ProgressSnapshot,
} from "../domain/progress";
import { ProgressRepository } from "../db/progressRepository";
import { MockExamRepository } from "../db/mockExamRepository";
import { examQuestions } from "../exam/questionBank";
import type { MockAttempt, MockQuestionAttemptState } from "../exam/mock/model";

function toSnapshot(
  data: Awaited<ReturnType<ProgressRepository["load"]>>,
  mockAttempts: readonly MockAttempt[],
): ProgressSnapshot {
  return {
    settings: data.settings,
    cardStates: Object.fromEntries(
      data.cardStates.map((state) => [state.cardId, state]),
    ),
    reviewEvents: data.reviews,
    mockAttempts,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Local study data could not be saved.";
}

export function ProgressProvider({ children }: PropsWithChildren) {
  const repository = useMemo(() => new ProgressRepository(cardIds), []);
  const mockRepository = useMemo(
    () =>
      new MockExamRepository(
        cardIds,
        new Set(examQuestions.map((question) => question.id)),
      ),
    [],
  );
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([repository.load(), mockRepository.listAttempts()])
      .then(([data, attempts]) => {
        if (!cancelled) {
          setSnapshot(toSnapshot(data, attempts));
          setIsLoading(false);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(errorMessage(loadError));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mockRepository, repository]);

  const clearError = useCallback(() => setError(null), []);

  const saveSettings = useCallback(
    async (settings: AppSettings) => {
      try {
        await repository.saveSettings(settings);
        setSnapshot((current) =>
          current === null ? current : { ...current, settings },
        );
        setError(null);
      } catch (saveError: unknown) {
        const message = errorMessage(saveError);
        setError(message);
        throw new Error(message);
      }
    },
    [repository],
  );

  const recordReview = useCallback(
    async (input: NewReviewEvent) => {
      try {
        const result = await repository.recordReview(input);
        setSnapshot((current) => {
          if (current === null) {
            return current;
          }

          return {
            ...current,
            cardStates: {
              ...current.cardStates,
              [result.cardState.cardId]: result.cardState,
            },
            reviewEvents: sortReviewEventsChronologically([
              ...current.reviewEvents,
              result.event,
            ]),
          };
        });
        setError(null);
        return result;
      } catch (reviewError: unknown) {
        const message = errorMessage(reviewError);
        setError(message);
        throw new Error(message);
      }
    },
    [repository],
  );

  const exportProgress = useCallback(() => {
    if (snapshot === null) {
      throw new Error("Local study data is still loading.");
    }
    return serializeProgressBackup(snapshot);
  }, [snapshot]);

  const refreshProgress = useCallback(async () => {
    const [data, attempts] = await Promise.all([
      repository.load(),
      mockRepository.listAttempts(),
    ]);
    setSnapshot(toSnapshot(data, attempts));
  }, [mockRepository, repository]);

  const createMockAttempt = useCallback(
    async (attempt: MockAttempt) => {
      try {
        const created = await mockRepository.createAttempt(attempt);
        await refreshProgress();
        setError(null);
        return created;
      } catch (createError: unknown) {
        const message = errorMessage(createError);
        setError(message);
        throw new Error(message);
      }
    },
    [mockRepository, refreshProgress],
  );

  const updateMockAttemptProgress = useCallback(
    async (id: string, states: readonly MockQuestionAttemptState[], index: number) => {
      try {
        const updated = await mockRepository.updateAttemptProgress(id, states, index);
        setSnapshot((current) =>
          current === null
            ? current
            : {
                ...current,
                mockAttempts: (current.mockAttempts ?? []).map((attempt) =>
                  attempt.id === id ? updated : attempt,
                ),
              },
        );
        setError(null);
        return updated;
      } catch (updateError: unknown) {
        const message = errorMessage(updateError);
        setError(message);
        throw new Error(message);
      }
    },
    [mockRepository],
  );

  const abandonMockAttempt = useCallback(
    async (id: string, abandonedAt: string) => {
      const abandoned = await mockRepository.abandonAttempt(id, abandonedAt);
      await refreshProgress();
      return abandoned;
    },
    [mockRepository, refreshProgress],
  );

  const finalizeMockAttempt = useCallback(
    async (id: string, submittedAt: string, committedAt?: string) => {
      try {
        const finalized = await mockRepository.finalizeAttempt(
          id,
          submittedAt,
          committedAt,
        );
        await refreshProgress();
        setError(null);
        return finalized;
      } catch (finalizeError: unknown) {
        const message = errorMessage(finalizeError);
        setError(message);
        throw new Error(message);
      }
    },
    [mockRepository, refreshProgress],
  );

  const replaceProgress = useCallback(
    async (backup: ProgressBackupV2) => {
      try {
        await repository.replaceAll(backup);
        await refreshProgress();
        setError(null);
      } catch (replaceError: unknown) {
        const message = errorMessage(replaceError);
        setError(message);
        throw new Error(message);
      }
    },
    [refreshProgress, repository],
  );

  const resetProgress = useCallback(async () => {
    try {
      await repository.resetAll();
      await refreshProgress();
      setError(null);
    } catch (resetError: unknown) {
      const message = errorMessage(resetError);
      setError(message);
      throw new Error(message);
    }
  }, [refreshProgress, repository]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      snapshot,
      isLoading,
      error,
      clearError,
      saveSettings,
      recordReview,
      createMockAttempt,
      updateMockAttemptProgress,
      abandonMockAttempt,
      finalizeMockAttempt,
      refreshProgress,
      exportProgress,
      replaceProgress,
      resetProgress,
    }),
    [
      clearError,
      createMockAttempt,
      error,
      exportProgress,
      isLoading,
      recordReview,
      refreshProgress,
      replaceProgress,
      resetProgress,
      saveSettings,
      snapshot,
      updateMockAttemptProgress,
      abandonMockAttempt,
      finalizeMockAttempt,
    ],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}
