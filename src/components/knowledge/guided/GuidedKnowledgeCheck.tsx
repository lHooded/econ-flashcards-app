import { useCallback, useEffect, useRef, useState } from "react";
import { NumericAnswerInput } from "../../calculations/NumericAnswerInput";
import {
  gradeNumericAnswer,
  parseNumericAnswer,
  type ParsedNumericAnswer,
} from "../../../calculations/grade";
import type { NumericAnswerSpec } from "../../../calculations/model";
import { createReviewEvent, type NewReviewEvent } from "../../../domain/progress";
import { KnowledgeText } from "../KnowledgeText";
import { MathText } from "../../math/MathText";
import type {
  GuidedCheckVariant,
  GuidedKnowledgeCheckSkill,
} from "../../../knowledge/guided/model";
import { knowledgeConceptById } from "../../../knowledge/data";

type CheckPhase = "answering" | "pending_save" | "completed";
type CapturedReview = NewReviewEvent;

function monotonicNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

export function GuidedKnowledgeCheck({
  skill,
  variant,
  onSubmitReview,
  onFinish,
}: {
  readonly skill: GuidedKnowledgeCheckSkill;
  readonly variant: GuidedCheckVariant;
  readonly onSubmitReview: (input: NewReviewEvent) => Promise<void>;
  readonly onFinish: () => void;
}) {
  const nowRef = useRef(monotonicNow);
  const startedAt = useRef(monotonicNow());
  const pendingPayload = useRef<CapturedReview | null>(null);
  const saveInFlight = useRef(false);
  const [phase, setPhase] = useState<CheckPhase>("answering");
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [numericInput, setNumericInput] = useState("");
  const [submittedNumber, setSubmittedNumber] = useState<ParsedNumericAnswer | null>(
    null,
  );
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    startedAt.current = nowRef.current();
    setPhase("answering");
    setSelectedChoice(null);
    setNumericInput("");
    setSubmittedNumber(null);
    setCorrect(null);
    setInputError(null);
    setSaveError(null);
    pendingPayload.current = null;
  }, [variant.id]);

  const submit = useCallback(
    async (payload: CapturedReview) => {
      if (saveInFlight.current) return;
      saveInFlight.current = true;
      setPhase("pending_save");
      setSaveError(null);
      try {
        await onSubmitReview(payload);
        setPhase("completed");
      } catch (error: unknown) {
        setSaveError(
          error instanceof Error ? error.message : "Review could not be saved.",
        );
      } finally {
        saveInFlight.current = false;
      }
    },
    [onSubmitReview],
  );

  const submitMcq = () => {
    if (
      variant.kind !== "mcq" ||
      phase !== "answering" ||
      selectedChoice === null ||
      saveInFlight.current
    )
      return;
    const payload = createReviewEvent({
      cardId: skill.id,
      mode: "mcq",
      correct: selectedChoice === variant.correctChoice,
      rating: null,
      responseTimeMs: Math.max(0, Math.round(nowRef.current() - startedAt.current)),
      selectedChoice,
    });
    pendingPayload.current = payload;
    setCorrect(payload.correct);
    void submit(payload);
  };

  const answerSpec: NumericAnswerSpec | null =
    variant.kind === "calculation"
      ? {
          value: variant.answer,
          unit: variant.unit,
          displayUnit: variant.unit === "percent" ? "%" : variant.unit,
          decimals: variant.decimals,
          tolerance: { type: "absolute", value: variant.tolerance },
          roundingInstruction: `Round to ${variant.decimals} decimal place${variant.decimals === 1 ? "" : "s"}.`,
        }
      : null;

  const submitCalculation = () => {
    if (
      variant.kind !== "calculation" ||
      answerSpec === null ||
      phase !== "answering" ||
      saveInFlight.current
    )
      return;
    const parsed = parseNumericAnswer(numericInput, answerSpec);
    if (parsed === null) {
      setInputError("Please enter a number in the displayed unit.");
      return;
    }
    const isCorrect = gradeNumericAnswer(parsed, answerSpec);
    const payload = createReviewEvent({
      cardId: skill.id,
      mode: "calculation",
      correct: isCorrect,
      rating: null,
      responseTimeMs: Math.max(0, Math.round(nowRef.current() - startedAt.current)),
      selectedChoice: null,
    });
    pendingPayload.current = payload;
    setSubmittedNumber(parsed);
    setCorrect(isCorrect);
    setInputError(null);
    void submit(payload);
  };

  const retry = () => {
    if (pendingPayload.current !== null && phase === "pending_save") {
      void submit(pendingPayload.current);
    }
  };

  const completed = phase === "completed";
  const pending = phase === "pending_save";
  return (
    <article className="guided-check panel" aria-labelledby="guided-check-title">
      <div className="guided-step-label">
        <span className="section-kicker">Quick retrieval check</span>
        <span className="guided-lesson-pill">Evidence is saved to Exam-SRS</span>
      </div>
      <h2 id="guided-check-title">
        {knowledgeConceptById.get(skill.conceptId)?.name ?? skill.conceptId}
      </h2>
      <p className="muted-text">
        Answer from memory. Before submission, the tested concept’s detailed explanation
        stays locked so the check measures retrieval rather than recognition.
      </p>
      <h3 className="guided-check-prompt">
        <KnowledgeText
          text={variant.prompt}
          disclosure={completed ? "full" : "preview"}
          testedConceptIds={completed ? [] : [skill.conceptId]}
        />
      </h3>
      {variant.kind === "mcq" ? (
        <fieldset className="choice-list guided-choice-list">
          <legend>Choose the best answer.</legend>
          {variant.choices.map((choice, index) => {
            const isCorrect = completed && index === variant.correctChoice;
            const isWrong = completed && index === selectedChoice && !isCorrect;
            return (
              <label
                className={`choice-option ${isCorrect ? "choice-correct" : ""} ${isWrong ? "choice-incorrect" : ""}`}
                key={`${variant.id}-${index}`}
              >
                <input
                  type="radio"
                  name={`guided-${skill.id}`}
                  checked={selectedChoice === index}
                  disabled={pending || completed}
                  onChange={() => setSelectedChoice(index)}
                />
                <span>
                  <MathText text={choice} />
                </span>
              </label>
            );
          })}
        </fieldset>
      ) : (
        answerSpec !== null && (
          <NumericAnswerInput
            answer={answerSpec}
            value={numericInput}
            error={inputError}
            disabled={pending || completed}
            onChange={(value) => {
              setNumericInput(value);
              if (inputError !== null) setInputError(null);
            }}
            onEnter={submitCalculation}
          />
        )
      )}
      {!completed && (
        <button
          className="primary-button"
          type="button"
          disabled={
            pending ||
            (variant.kind === "mcq"
              ? selectedChoice === null
              : numericInput.trim() === "")
          }
          onClick={variant.kind === "mcq" ? submitMcq : submitCalculation}
        >
          {pending ? "Saving review…" : "Submit answer"}
        </button>
      )}
      {completed && correct !== null && (
        <div className="reveal-panel" aria-live="polite">
          <p
            className={`result-banner ${correct ? "result-correct" : "result-incorrect"}`}
          >
            {correct ? "Correct" : "Not quite"}
          </p>
          {variant.kind === "calculation" &&
            submittedNumber !== null &&
            answerSpec !== null && (
              <p>
                Your answer: {submittedNumber.value}{" "}
                {answerSpec.displayUnit ?? answerSpec.unit}; expected {variant.answer}{" "}
                {answerSpec.displayUnit ?? answerSpec.unit}.
              </p>
            )}
          <p>
            <KnowledgeText text={variant.explanation} />
          </p>
          <a
            className="secondary-button"
            href={`#/knowledge?concept=${encodeURIComponent(skill.conceptId)}`}
          >
            Open full explanation
          </a>
          <button className="primary-button" type="button" onClick={onFinish}>
            Continue
          </button>
        </div>
      )}
      {pending && saveError !== null && (
        <div className="save-warning" role="alert">
          <strong>Not saved.</strong> {saveError}
          <button className="secondary-button" type="button" onClick={retry}>
            Retry save
          </button>
        </div>
      )}
    </article>
  );
}
