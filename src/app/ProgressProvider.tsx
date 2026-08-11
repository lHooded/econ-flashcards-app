import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { ProgressContext, type ProgressContextValue } from "./progressContext";
import { SyncProvider } from "./SyncProvider";
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
import { configuredSyncApi } from "../sync/client";
import { SyncCoordinator } from "../sync/coordinator";

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
  const syncApi = useMemo(() => configuredSyncApi(), []);
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async (): Promise<ProgressSnapshot> => {
    const [data, attempts] = await Promise.all([
      repository.load(),
      mockRepository.listAttempts(),
    ]);
    return toSnapshot(data, attempts);
  }, [mockRepository, repository]);

  const syncCoordinator = useMemo(
    () =>
      new SyncCoordinator({
        repository,
        api: syncApi,
        validCardIds: cardIds,
        validQuestionIds: new Set(examQuestions.map((question) => question.id)),
        onApplied: async () => {
          setSnapshot(await loadSnapshot());
        },
      }),
    [loadSnapshot, repository, syncApi],
  );

  useEffect(() => {
    let cancelled = false;
    loadSnapshot()
      .then((nextSnapshot) => {
        if (!cancelled) {
          setSnapshot(nextSnapshot);
          setIsLoading(false);
          syncCoordinator.request("startup", true);
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
  }, [loadSnapshot, syncCoordinator]);

  useEffect(() => {
    const stop = syncCoordinator.start();
    return () => {
      stop();
      syncCoordinator.dispose();
    };
  }, [syncCoordinator]);

  const clearError = useCallback(() => setError(null), []);

  const saveSettings = useCallback(
    async (settings: AppSettings) => {
      try {
        await repository.saveSettings(settings);
        setSnapshot((current) =>
          current === null ? current : { ...current, settings },
        );
        syncCoordinator.request("settings");
        setError(null);
      } catch (saveError: unknown) {
        const message = errorMessage(saveError);
        setError(message);
        throw new Error(message);
      }
    },
    [repository, syncCoordinator],
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
        syncCoordinator.request("review");
        setError(null);
        return result;
      } catch (reviewError: unknown) {
        const message = errorMessage(reviewError);
        setError(message);
        throw new Error(message);
      }
    },
    [repository, syncCoordinator],
  );

  const exportProgress = useCallback(() => {
    if (snapshot === null) {
      throw new Error("Local study data is still loading.");
    }
    return serializeProgressBackup(snapshot);
  }, [snapshot]);

  const refreshProgress = useCallback(async () => {
    setSnapshot(await loadSnapshot());
  }, [loadSnapshot]);

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
      syncCoordinator.request("mock-abandoned");
      return abandoned;
    },
    [mockRepository, refreshProgress, syncCoordinator],
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
        syncCoordinator.request("mock-finalized");
        setError(null);
        return finalized;
      } catch (finalizeError: unknown) {
        const message = errorMessage(finalizeError);
        setError(message);
        throw new Error(message);
      }
    },
    [mockRepository, refreshProgress, syncCoordinator],
  );

  const replaceProgress = useCallback(
    async (backup: ProgressBackupV2) => {
      try {
        await repository.replaceAll(backup);
        await refreshProgress();
        syncCoordinator.request("progress-import");
        setError(null);
      } catch (replaceError: unknown) {
        const message = errorMessage(replaceError);
        setError(message);
        throw new Error(message);
      }
    },
    [refreshProgress, repository, syncCoordinator],
  );

  const resetProgress = useCallback(async () => {
    try {
      await syncCoordinator.disconnect();
      await repository.resetAll();
      await refreshProgress();
      setError(null);
    } catch (resetError: unknown) {
      const message = errorMessage(resetError);
      setError(message);
      throw new Error(message);
    }
  }, [refreshProgress, repository, syncCoordinator]);

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

  return (
    <ProgressContext.Provider value={value}>
      <SyncProvider coordinator={syncCoordinator}>{children}</SyncProvider>
    </ProgressContext.Provider>
  );
}
