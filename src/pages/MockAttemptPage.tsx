import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProgress } from "../app/progressContext";
import { examQuestions } from "../exam/questionBank";
import { deriveMockClock } from "../exam/mock/timer";
import { questionStateById, type MockAttempt } from "../exam/mock/model";
import { MockQuestion } from "../components/mock/MockQuestion";
import { MockNavigator } from "../components/mock/MockNavigator";
import { MockResults } from "../components/mock/MockResults";
import { MockTimer } from "../components/mock/MockTimer";
import { useNow } from "../utils/useNow";

export function MockAttemptPage({ attemptId }: { readonly attemptId: string }) {
  const {
    snapshot,
    updateMockAttemptProgress: update,
    finalizeMockAttempt: finalize,
  } = useProgress();
  const stored = snapshot?.mockAttempts?.find(
    (candidate) => candidate.id === attemptId,
  );
  const [localAttempt, setLocalAttempt] = useState<MockAttempt | undefined>(stored);
  const attemptRef = useRef<MockAttempt | undefined>(stored);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const localRevision = useRef(0);
  const persistedRevision = useRef(0);
  const pendingSaveCount = useRef(0);
  const saveFailed = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const finalizingRef = useRef(false);
  const expiryFinalizationBlocked = useRef(false);
  const documentVisible = useRef(
    typeof document === "undefined" || document.visibilityState === "visible",
  );
  const segmentStartedAt = useRef(performance.now());
  const nowMs = useNow(1000);

  useEffect(() => {
    if (
      stored !== undefined &&
      (attemptRef.current === undefined || stored.status !== "active")
    ) {
      attemptRef.current = stored;
      setLocalAttempt(stored);
    }
  }, [stored]);

  const questionsById = useMemo(
    () => new Map(examQuestions.map((question) => [question.id, question])),
    [],
  );
  const refreshDirty = useCallback(() => {
    setDirty(
      localRevision.current !== persistedRevision.current ||
        pendingSaveCount.current > 0,
    );
  }, []);
  const enqueueSave = useCallback(
    (next: MockAttempt, revision: number): Promise<void> => {
      pendingSaveCount.current += 1;
      refreshDirty();
      const run = saveChain.current
        .catch(() => undefined)
        .then(async () => {
          if (update === undefined) throw new Error("Mock persistence is unavailable.");
          await update(next.id, next.questionStates, next.currentQuestionIndex);
          if (revision === localRevision.current) {
            persistedRevision.current = revision;
            saveFailed.current = false;
            setSaveError(null);
          }
        })
        .finally(() => {
          pendingSaveCount.current = Math.max(0, pendingSaveCount.current - 1);
          refreshDirty();
        });
      saveChain.current = run.catch((error: unknown) => {
        saveFailed.current = true;
        setSaveError(
          error instanceof Error ? error.message : "Mock progress could not be saved.",
        );
        throw error;
      });
      return saveChain.current;
    },
    [refreshDirty, update],
  );

  const apply = useCallback(
    (change: (attempt: MockAttempt) => MockAttempt, persist = true) => {
      const current = attemptRef.current;
      if (current === undefined || current.status !== "active") return current;
      const next = change(current);
      attemptRef.current = next;
      setLocalAttempt(next);
      if (persist) {
        localRevision.current += 1;
        void enqueueSave(next, localRevision.current).catch(() => undefined);
        refreshDirty();
      }
      return next;
    },
    [enqueueSave, refreshDirty],
  );

  const checkpoint = useCallback(() => {
    const current = attemptRef.current;
    if (current === undefined || current.status !== "active") return current;
    if (finalizingRef.current) return current;
    if (deriveMockClock(current, Date.now()).phase === "expired") return current;
    if (!documentVisible.current) return current;
    const checkpointedAt = performance.now();
    const elapsed = Math.max(0, checkpointedAt - segmentStartedAt.current);
    segmentStartedAt.current = checkpointedAt;
    if (elapsed < 1) return current;
    return apply((attempt) => {
      const index = attempt.currentQuestionIndex;
      const states = attempt.questionStates.map((state, stateIndex) =>
        stateIndex === index
          ? { ...state, timeSpentMs: state.timeSpentMs + elapsed }
          : state,
      );
      return { ...attempt, questionStates: states };
    });
  }, [apply]);

  const flushLatestAttempt = useCallback(
    async (checkpointSegment = true): Promise<MockAttempt> => {
      const checkpointed = checkpointSegment ? checkpoint() : attemptRef.current;
      const latest = checkpointed ?? attemptRef.current;
      if (latest === undefined || latest.status !== "active") {
        throw new Error("This mock attempt is no longer active.");
      }
      while (true) {
        if (pendingSaveCount.current > 0) {
          // Await the exact tail, including every queued revision. A rejected
          // save is deliberately propagated instead of being ignored.
          await saveChain.current;
        } else if (
          localRevision.current !== persistedRevision.current ||
          saveFailed.current
        ) {
          saveFailed.current = false;
          await enqueueSave(latest, localRevision.current);
        } else {
          break;
        }
      }
      if (
        localRevision.current !== persistedRevision.current ||
        pendingSaveCount.current > 0
      ) {
        throw new Error("The latest mock state is not durably saved yet.");
      }
      return attemptRef.current ?? latest;
    },
    [checkpoint, enqueueSave],
  );

  const runFinalization = useCallback(
    async (expiryTriggered: boolean) => {
      if (
        finalizingRef.current ||
        finalize === undefined ||
        (expiryTriggered && expiryFinalizationBlocked.current)
      )
        return;
      checkpoint();
      finalizingRef.current = true;
      setIsFinalizing(true);
      setFinalizeError(null);
      try {
        const current = await flushLatestAttempt(false);
        const noticedAt = new Date().toISOString();
        const expired =
          expiryTriggered || Date.parse(current.writingEndsAt) <= Date.now();
        const submittedAt = expired ? current.writingEndsAt : noticedAt;
        const result = await finalize(current.id, submittedAt, noticedAt);
        attemptRef.current = result.attempt;
        setLocalAttempt(result.attempt);
        persistedRevision.current = localRevision.current;
        saveFailed.current = false;
        refreshDirty();
        segmentStartedAt.current = performance.now();
      } catch (error: unknown) {
        if (expiryTriggered) expiryFinalizationBlocked.current = true;
        setFinalizeError(
          error instanceof Error
            ? error.message
            : "Submission could not be saved. Retry without closing this page.",
        );
      } finally {
        finalizingRef.current = false;
        setIsFinalizing(false);
      }
    },
    [checkpoint, finalize, flushLatestAttempt, refreshDirty],
  );

  const finish = useCallback(async () => {
    if (finalizingRef.current) return;
    const current = attemptRef.current;
    if (
      current === undefined ||
      current.status !== "active" ||
      finalize === undefined ||
      deriveMockClock(current, Date.now()).phase !== "writing"
    )
      return;
    if (
      !window.confirm(
        `Submit this mock?\n\nAnswered: ${current.questionStates.filter((state) => state.selectedChoice !== null).length} / 60\nUnanswered: ${current.questionStates.filter((state) => state.selectedChoice === null).length}\nFlagged: ${current.questionStates.filter((state) => state.flagged).length}`,
      )
    )
      return;
    await runFinalization(false);
  }, [finalize, runFinalization]);
  const retryFinalization = useCallback(() => {
    const current = attemptRef.current;
    if (current === undefined || current.status !== "active") return;
    if (deriveMockClock(current, Date.now()).phase === "expired") {
      expiryFinalizationBlocked.current = false;
      void runFinalization(true);
    } else void finish();
  }, [finish, runFinalization]);

  useEffect(() => {
    if (localAttempt?.status !== "active") return;
    const clock = deriveMockClock(localAttempt, nowMs);
    if (clock.phase === "expired" && !finalizingRef.current) {
      void runFinalization(true);
    }
  }, [localAttempt, nowMs, runFinalization]);

  useEffect(() => {
    if (localAttempt?.status !== "active") return;
    const interval = window.setInterval(() => {
      if (documentVisible.current) checkpoint();
    }, 10_000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") checkpoint();
      documentVisible.current = document.visibilityState === "visible";
      if (documentVisible.current) segmentStartedAt.current = performance.now();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const hasUnsavedRevision =
        localRevision.current !== persistedRevision.current ||
        pendingSaveCount.current > 0 ||
        saveError !== null;
      if (hasUnsavedRevision) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [checkpoint, dirty, localAttempt?.status, saveError]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        isEditable(event.target) ||
        localAttempt?.status !== "active" ||
        finalizingRef.current
      )
        return;
      const current = attemptRef.current;
      if (current === undefined) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        goTo(current.currentQuestionIndex + (event.key === "ArrowRight" ? 1 : -1));
        return;
      }
      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        toggleFlag();
        return;
      }
      if (
        deriveMockClock(current, nowMs).phase === "writing" &&
        /^[1-4]$/.test(event.key)
      ) {
        event.preventDefault();
        selectChoice((Number(event.key) - 1) as 0 | 1 | 2 | 3);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (localAttempt === undefined)
    return (
      <section className="callout" role="alert">
        <div>
          <h1>Mock attempt not found</h1>
          <p>This ID may be malformed or may belong to a different device.</p>
        </div>
        <a className="secondary-button" href="#/mock">
          Back to mocks
        </a>
      </section>
    );
  if (localAttempt.status === "submitted")
    return <MockResults attempt={localAttempt} questionsById={questionsById} />;
  if (localAttempt.status === "abandoned")
    return (
      <section className="callout" role="alert">
        <div>
          <h1>Mock abandoned</h1>
          <p>This attempt was not scored and cannot be resumed.</p>
        </div>
        <a className="secondary-button" href="#/mock">
          Back to mocks
        </a>
      </section>
    );

  const clock = deriveMockClock(localAttempt, nowMs);
  const currentQuestion = questionsById.get(
    localAttempt.questionOrder[localAttempt.currentQuestionIndex],
  );
  const states = questionStateById(localAttempt);
  if (currentQuestion === undefined)
    return (
      <section className="callout" role="alert">
        <div>
          <h1>Question content unavailable</h1>
          <p>
            This active attempt cannot be resumed in this app version because one of its
            stored display questions is missing. Its selected manifest will not be
            regenerated or silently replaced.
          </p>
        </div>
        <a className="secondary-button" href="#/mock">
          Back to mocks
        </a>
      </section>
    );
  const currentState = states.get(currentQuestion.id);
  if (currentState === undefined) return null;
  const activeAttempt: MockAttempt = localAttempt;
  const currentQuestionId = currentQuestion.id;
  const selected = currentState.selectedChoice;
  const interactionLocked = isFinalizing || clock.phase === "expired";

  function selectChoice(choice: 0 | 1 | 2 | 3) {
    if (
      finalizingRef.current ||
      interactionLocked ||
      deriveMockClock(attemptRef.current ?? activeAttempt, nowMs).phase !== "writing"
    )
      return;
    apply((attempt) => ({
      ...attempt,
      questionStates: attempt.questionStates.map((state) =>
        state.questionId === currentQuestionId
          ? {
              ...state,
              selectedChoice: choice,
              firstViewedAt: state.firstViewedAt ?? new Date().toISOString(),
              lastAnsweredAt: new Date().toISOString(),
            }
          : state,
      ),
    }));
  }
  function toggleFlag() {
    if (finalizingRef.current || interactionLocked) return;
    apply((attempt) => ({
      ...attempt,
      questionStates: attempt.questionStates.map((state) =>
        state.questionId === currentQuestionId
          ? {
              ...state,
              flagged: !state.flagged,
              firstViewedAt: state.firstViewedAt ?? new Date().toISOString(),
            }
          : state,
      ),
    }));
  }
  function goTo(index: number) {
    if (finalizingRef.current || interactionLocked) return;
    const nextIndex = Math.max(0, Math.min(59, index));
    checkpoint();
    apply((attempt) => ({
      ...attempt,
      currentQuestionIndex: nextIndex,
      questionStates: attempt.questionStates.map((state, stateIndex) =>
        stateIndex === nextIndex
          ? { ...state, firstViewedAt: state.firstViewedAt ?? new Date().toISOString() }
          : state,
      ),
    }));
    segmentStartedAt.current = performance.now();
  }
  function nextFlagged() {
    if (finalizingRef.current || interactionLocked) return;
    const current = attemptRef.current ?? activeAttempt;
    const next = current.questionStates.findIndex(
      (state, index) => index > current.currentQuestionIndex && state.flagged,
    );
    goTo(next >= 0 ? next : current.questionStates.findIndex((state) => state.flagged));
  }

  return (
    <div className="page-stack mock-attempt-page">
      <section className="mock-exam-header">
        <div>
          <p className="eyebrow">
            Full mock exam ·{" "}
            {clock.phase === "reading"
              ? "Reading time"
              : clock.phase === "writing"
                ? "Writing time"
                : "Time expired"}
          </p>
          <h1>Question {localAttempt.currentQuestionIndex + 1} of 60</h1>
          <p className="muted-text">
            {clock.phase === "reading"
              ? "Read, inspect stimuli, and flag. Answer choices unlock when reading time ends."
              : clock.phase === "writing"
                ? "Choose and change answers until you submit."
                : "The mock has expired and is being finalised with the stored deadline."}
          </p>
        </div>
        <MockTimer clock={clock} />
      </section>
      <div className="mock-layout">
        <div className="mock-main">
          <MockQuestion
            question={currentQuestion}
            questionNumber={localAttempt.currentQuestionIndex + 1}
            selectedChoice={selected}
            reading={clock.phase !== "writing"}
            disabled={interactionLocked}
            onSelect={selectChoice}
          />
          <div className="mock-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={toggleFlag}
              disabled={interactionLocked}
            >
              {currentState.flagged ? "Unflag question" : "Flag for review"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={nextFlagged}
              disabled={
                interactionLocked ||
                !localAttempt.questionStates.some((state) => state.flagged)
              }
            >
              Next flagged
            </button>
            <span className="mock-keyboard-hint">
              ← → navigate · F flag · 1–4 choose in writing
            </span>
          </div>
          <div className="mock-navigation-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => goTo(localAttempt.currentQuestionIndex - 1)}
              disabled={interactionLocked || localAttempt.currentQuestionIndex === 0}
            >
              Previous
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => goTo(localAttempt.currentQuestionIndex + 1)}
              disabled={interactionLocked || localAttempt.currentQuestionIndex === 59}
            >
              Next
            </button>
            <button
              className="danger-button"
              type="button"
              onClick={() => void finish()}
              disabled={
                interactionLocked || clock.phase !== "writing" || finalizingRef.current
              }
            >
              {isFinalizing ? "Saving and submitting…" : "Submit mock"}
            </button>
          </div>
          {saveError && (
            <div className="save-warning" role="alert">
              <strong>Not saved.</strong> {saveError} Keep this page open and retry your
              action.
              <button
                className="secondary-button"
                type="button"
                disabled={isFinalizing}
                onClick={() => void flushLatestAttempt().catch(() => undefined)}
              >
                Retry save
              </button>
            </div>
          )}
          {finalizeError && (
            <div className="save-warning" role="alert">
              <strong>Submission failed.</strong> {finalizeError}
              <button
                className="secondary-button"
                type="button"
                disabled={isFinalizing}
                onClick={retryFinalization}
              >
                Retry submission
              </button>
            </div>
          )}
        </div>
        <div className="mock-side">
          <MockNavigator
            states={localAttempt.questionStates}
            currentIndex={localAttempt.currentQuestionIndex}
            disabled={interactionLocked}
            onSelect={goTo}
          />
          <p className="mock-progress-note">
            {
              localAttempt.questionStates.filter(
                (state) => state.selectedChoice !== null,
              ).length
            }{" "}
            answered ·{" "}
            {localAttempt.questionStates.filter((state) => state.flagged).length}{" "}
            flagged
          </p>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {clock.phase === "reading"
          ? "Reading phase"
          : clock.phase === "writing"
            ? "Writing phase"
            : "Mock time has expired; finalisation is in progress."}
      </p>
    </div>
  );
}

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))
  );
}
