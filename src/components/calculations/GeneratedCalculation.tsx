import { useCallback, useEffect, useRef, useState } from "react";
import { createReviewEvent, type NewReviewEvent } from "../../domain/progress";
import { formatNumber } from "../../calculations/instantiate";
import {
  gradeNumericAnswer,
  parseNumericAnswer,
  type ParsedNumericAnswer,
} from "../../calculations/grade";
import type { GeneratedCalculationInstance } from "../../calculations/model";
import { NumericAnswerInput } from "./NumericAnswerInput";
import { QuestionStimulus } from "../stimulus/QuestionStimulus";

type GeneratedCalculationPhase = "answering" | "pending_save" | "completed";

function monotonicNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

export function GeneratedCalculation({
  instance,
  index,
  total,
  recordReview,
  onNext,
  onNewNumbers,
  onPendingChange,
  now: nowProvider,
}: {
  readonly instance: GeneratedCalculationInstance;
  readonly index: number;
  readonly total: number;
  readonly recordReview: (input: NewReviewEvent) => Promise<unknown>;
  readonly onNext: () => void;
  readonly onNewNumbers: () => void;
  readonly onPendingChange?: (pending: boolean) => void;
  readonly now?: () => number;
}) {
  const now = nowProvider ?? monotonicNow;
  const nowRef = useRef(now);
  nowRef.current = now;
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [phase, setPhase] = useState<GeneratedCalculationPhase>("answering");
  const [submitted, setSubmitted] = useState<ParsedNumericAnswer | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingPayload = useRef<NewReviewEvent | null>(null);
  const startedAt = useRef(nowRef.current());

  useEffect(() => {
    setInput("");
    setInputError(null);
    setPhase("answering");
    setSubmitted(null);
    setCorrect(null);
    setSaveError(null);
    pendingPayload.current = null;
    startedAt.current = nowRef.current();
    onPendingChange?.(false);
  }, [instance.instanceId, onPendingChange]);

  const submit = useCallback(async () => {
    if (phase !== "answering") return;
    const parsed = parseNumericAnswer(input, instance.answer);
    if (parsed === null) {
      setInputError("Please enter a number.");
      return;
    }

    const isCorrect = gradeNumericAnswer(parsed, instance.answer);
    const responseTimeMs = Math.max(
      0,
      Math.round(nowRef.current() - startedAt.current),
    );
    const payload = Object.freeze(
      createReviewEvent({
        cardId: instance.reviewCardId,
        mode: "calculation",
        rating: null,
        correct: isCorrect,
        selectedChoice: null,
        responseTimeMs,
      }),
    );
    pendingPayload.current = payload;
    setInputError(null);
    setSubmitted(parsed);
    setCorrect(isCorrect);
    setSaveError(null);
    setPhase("pending_save");
    onPendingChange?.(true);
    try {
      await recordReview(payload);
      setPhase("completed");
      onPendingChange?.(false);
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Practice review could not be saved.",
      );
    }
  }, [input, instance, onPendingChange, phase, recordReview]);

  const retry = useCallback(async () => {
    const payload = pendingPayload.current;
    if (payload === null || phase !== "pending_save") return;
    setSaveError(null);
    try {
      await recordReview(payload);
      setPhase("completed");
      onPendingChange?.(false);
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Practice review could not be saved.",
      );
    }
  }, [onPendingChange, phase, recordReview]);

  const isPending = phase === "pending_save";
  const isCompleted = phase === "completed";
  const answerDisplay = `${formatNumber(instance.answer.value, instance.answer.decimals)} ${instance.answer.displayUnit ?? instance.answer.unit}`;

  return (
    <article
      className="practice-question panel generated-calculation-question"
      onKeyDown={(event) => {
        if (event.key !== "Enter" || event.target instanceof HTMLInputElement) return;
        if (isCompleted && !(event.target instanceof HTMLButtonElement)) {
          event.preventDefault();
          onNext();
        }
      }}
    >
      <div className="mock-question-meta">
        <span>
          Question {index + 1} of {total}
        </span>
        <span>
          Chapter {instance.chapter} · {instance.topic}
        </span>
        <span>Difficulty {instance.difficulty}</span>
      </div>
      <p className="generated-calculation-freshness">
        Fresh numbers · canonical concept practice
      </p>
      <QuestionStimulus stimulus={instance.stimulus} />
      <h2 className="mock-stem">{instance.prompt}</h2>
      <NumericAnswerInput
        answer={instance.answer}
        value={input}
        error={inputError}
        disabled={isPending || isCompleted}
        onChange={(value) => {
          setInput(value);
          if (inputError !== null) setInputError(null);
        }}
        onEnter={() => void submit()}
      />
      <div className="generated-calculation-actions">
        <button
          className="primary-button"
          type="button"
          disabled={isPending || isCompleted || input.trim().length === 0}
          onClick={() => void submit()}
        >
          {isPending && saveError === null ? "Saving review…" : "Submit answer"}
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={isPending}
          onClick={onNewNumbers}
        >
          New numbers
        </button>
      </div>
      {isCompleted && submitted !== null && correct !== null ? (
        <div className="reveal-panel generated-calculation-result" aria-live="polite">
          <p
            className={`result-banner ${correct ? "result-correct" : "result-incorrect"}`}
          >
            {correct ? "Correct" : "Not quite"}
          </p>
          <p>
            <strong>Your answer:</strong>{" "}
            {formatNumber(submitted.value, instance.answer.decimals)}{" "}
            {instance.answer.displayUnit ?? instance.answer.unit}
          </p>
          <p>
            <strong>Expected:</strong> {answerDisplay}
          </p>
          <section className="generated-calculation-solution">
            <p className="section-kicker">Worked solution</p>
            <ol>
              {instance.workedSolution.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
          <p>
            <strong>Explanation:</strong> {instance.explanation}
          </p>
          <p className="trap-block">
            <strong>Common trap:</strong> {instance.commonTrap}
          </p>
          <button className="primary-button" type="button" onClick={onNext}>
            Next
          </button>
        </div>
      ) : null}
      {isPending && saveError !== null ? (
        <div className="save-warning" role="alert">
          <strong>Not saved.</strong> {saveError}
          <button
            className="secondary-button"
            type="button"
            onClick={() => void retry()}
          >
            Retry save
          </button>
        </div>
      ) : null}
    </article>
  );
}
