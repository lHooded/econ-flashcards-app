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
  const saveChain = useRef(Promise.resolve());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const finalizing = useRef(false);
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
  const enqueueSave = useCallback(
    (next: MockAttempt): Promise<void> => {
      if (update === undefined)
        return Promise.reject(new Error("Mock persistence is unavailable."));
      setDirty(true);
      const run = saveChain.current
        .catch(() => undefined)
        .then(async () => {
          await update(next.id, next.questionStates, next.currentQuestionIndex);
          setDirty(false);
          setSaveError(null);
        });
      saveChain.current = run.catch((error: unknown) => {
        setSaveError(
          error instanceof Error ? error.message : "Mock progress could not be saved.",
        );
        throw error;
      });
      return saveChain.current;
    },
    [update],
  );

  const apply = useCallback(
    (change: (attempt: MockAttempt) => MockAttempt, persist = true) => {
      const current = attemptRef.current;
      if (current === undefined || current.status !== "active") return current;
      const next = change(current);
      attemptRef.current = next;
      setLocalAttempt(next);
      if (persist) void enqueueSave(next);
      return next;
    },
    [enqueueSave],
  );

  const checkpoint = useCallback(() => {
    const current = attemptRef.current;
    if (current === undefined || current.status !== "active") return current;
    const elapsed = Math.max(0, performance.now() - segmentStartedAt.current);
    segmentStartedAt.current = performance.now();
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

  const finish = useCallback(async () => {
    const current = checkpoint() ?? attemptRef.current;
    if (current === undefined || current.status !== "active" || finalize === undefined)
      return;
    if (
      !window.confirm(
        `Submit this mock?\n\nAnswered: ${current.questionStates.filter((state) => state.selectedChoice !== null).length} / 60\nUnanswered: ${current.questionStates.filter((state) => state.selectedChoice === null).length}\nFlagged: ${current.questionStates.filter((state) => state.flagged).length}`,
      )
    )
      return;
    setFinalizeError(null);
    try {
      await saveChain.current.catch(() => undefined);
      const result = await finalize(current.id, new Date().toISOString());
      attemptRef.current = result.attempt;
      setLocalAttempt(result.attempt);
      setDirty(false);
    } catch (error: unknown) {
      setFinalizeError(
        error instanceof Error
          ? error.message
          : "Submission could not be saved. Retry without closing this page.",
      );
    }
  }, [checkpoint, finalize]);

  useEffect(() => {
    if (localAttempt?.status !== "active") return;
    const clock = deriveMockClock(localAttempt, nowMs);
    if (clock.phase === "expired" && !finalizing.current) {
      finalizing.current = true;
      void (async () => {
        try {
          const current = checkpoint() ?? attemptRef.current;
          if (current !== undefined && finalize !== undefined) {
            await saveChain.current.catch(() => undefined);
            const result = await finalize(current.id, new Date().toISOString());
            attemptRef.current = result.attempt;
            setLocalAttempt(result.attempt);
            setDirty(false);
          }
        } catch (error: unknown) {
          finalizing.current = false;
          setFinalizeError(
            error instanceof Error
              ? error.message
              : "Expired mock could not be finalised. Retry.",
          );
        }
      })();
    }
  }, [checkpoint, finalize, localAttempt, nowMs]);

  useEffect(() => {
    if (localAttempt?.status !== "active") return;
    const interval = window.setInterval(checkpoint, 10_000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") checkpoint();
      else segmentStartedAt.current = performance.now();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty || saveError !== null) {
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
      if (isEditable(event.target) || localAttempt?.status !== "active") return;
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
      <p role="alert">
        The historical question content is unavailable in this app version.
      </p>
    );
  const currentState = states.get(currentQuestion.id);
  if (currentState === undefined) return null;
  const activeAttempt: MockAttempt = localAttempt;
  const currentQuestionId = currentQuestion.id;
  const selected = currentState.selectedChoice;

  function selectChoice(choice: 0 | 1 | 2 | 3) {
    if (deriveMockClock(attemptRef.current ?? activeAttempt, nowMs).phase !== "writing")
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
    const next = activeAttempt.questionStates.findIndex(
      (state, index) => index > activeAttempt.currentQuestionIndex && state.flagged,
    );
    goTo(
      next >= 0
        ? next
        : activeAttempt.questionStates.findIndex((state) => state.flagged),
    );
  }

  return (
    <div className="page-stack mock-attempt-page">
      <section className="mock-exam-header">
        <div>
          <p className="eyebrow">
            Full mock exam ·{" "}
            {clock.phase === "reading" ? "Reading time" : "Writing time"}
          </p>
          <h1>Question {localAttempt.currentQuestionIndex + 1} of 60</h1>
          <p className="muted-text">
            {clock.phase === "reading"
              ? "Read, inspect stimuli, and flag. Answer choices unlock when reading time ends."
              : "Choose and change answers until you submit."}
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
            reading={clock.phase === "reading"}
            onSelect={selectChoice}
          />
          <div className="mock-actions">
            <button className="secondary-button" type="button" onClick={toggleFlag}>
              {currentState.flagged ? "Unflag question" : "Flag for review"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={nextFlagged}
              disabled={!localAttempt.questionStates.some((state) => state.flagged)}
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
              disabled={localAttempt.currentQuestionIndex === 0}
            >
              Previous
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => goTo(localAttempt.currentQuestionIndex + 1)}
              disabled={localAttempt.currentQuestionIndex === 59}
            >
              Next
            </button>
            <button
              className="danger-button"
              type="button"
              onClick={() => void finish()}
            >
              Submit mock
            </button>
          </div>
          {saveError && (
            <div className="save-warning" role="alert">
              <strong>Not saved.</strong> {saveError} Keep this page open and retry your
              action.
            </div>
          )}
          {finalizeError && (
            <div className="save-warning" role="alert">
              <strong>Submission failed.</strong> {finalizeError}
              <button
                className="secondary-button"
                type="button"
                onClick={() => void finish()}
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
        {clock.phase === "reading" ? "Reading phase" : "Writing phase"}
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
