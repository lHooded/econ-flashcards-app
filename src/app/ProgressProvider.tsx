import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { ProgressContext, type ProgressContextValue } from "./progressContext";
import { cardIds } from "../data/deck";
import { serializeProgressBackup, type ProgressBackupV1 } from "../domain/backup";
import {
  sortReviewEventsChronologically,
  type AppSettings,
  type NewReviewEvent,
  type ProgressSnapshot,
} from "../domain/progress";
import { ProgressRepository } from "../db/progressRepository";

function toSnapshot(
  data: Awaited<ReturnType<ProgressRepository["load"]>>,
): ProgressSnapshot {
  return {
    settings: data.settings,
    cardStates: Object.fromEntries(
      data.cardStates.map((state) => [state.cardId, state]),
    ),
    reviewEvents: data.reviews,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Local study data could not be saved.";
}

export function ProgressProvider({ children }: PropsWithChildren) {
  const repository = useMemo(() => new ProgressRepository(cardIds), []);
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    repository
      .load()
      .then((data) => {
        if (!cancelled) {
          setSnapshot(toSnapshot(data));
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
  }, [repository]);

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

  const replaceProgress = useCallback(
    async (backup: ProgressBackupV1) => {
      try {
        await repository.replaceAll(backup);
        const data = await repository.load();
        setSnapshot(toSnapshot(data));
        setError(null);
      } catch (replaceError: unknown) {
        const message = errorMessage(replaceError);
        setError(message);
        throw new Error(message);
      }
    },
    [repository],
  );

  const resetProgress = useCallback(async () => {
    try {
      await repository.resetAll();
      const data = await repository.load();
      setSnapshot(toSnapshot(data));
      setError(null);
    } catch (resetError: unknown) {
      const message = errorMessage(resetError);
      setError(message);
      throw new Error(message);
    }
  }, [repository]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      snapshot,
      isLoading,
      error,
      clearError,
      saveSettings,
      recordReview,
      exportProgress,
      replaceProgress,
      resetProgress,
    }),
    [
      clearError,
      error,
      exportProgress,
      isLoading,
      recordReview,
      replaceProgress,
      resetProgress,
      saveSettings,
      snapshot,
    ],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}
