import { useCallback, useEffect, useRef, useState } from "react";
import type { Flashcard } from "../domain/content";
import type { NewReviewEvent, ReviewRating } from "../domain/progress";

interface StudyCardProps {
  readonly card: Flashcard;
  readonly onSubmitReview: (input: Omit<NewReviewEvent, "cardId">) => Promise<void>;
  readonly onFinish: () => void;
  readonly onPhaseChange?: (phase: StudyCardPhase) => void;
}

type CapturedReviewPayload = Omit<NewReviewEvent, "cardId">;

export type StudyCardPhase = "unanswered" | "revealed" | "pending_save" | "completed";

function modeForCard(card: Flashcard): NewReviewEvent["mode"] {
  return card.kind === "calculation" ? "calculation" : "recall";
}

export function StudyCard({
  card,
  onSubmitReview,
  onFinish,
  onPhaseChange,
}: StudyCardProps) {
  const isMcq = card.choices !== undefined && card.correctChoice !== undefined;
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [revealResponseTimeMs, setRevealResponseTimeMs] = useState<number | null>(null);
  const activeAt = useRef(performance.now());
  const pendingMcqReview = useRef<CapturedReviewPayload | null>(null);
  const saveInFlight = useRef(false);

  useEffect(() => {
    activeAt.current = performance.now();
    onPhaseChange?.("unanswered");
  }, [card.id, onPhaseChange]);

  const responseTime = useCallback(
    () => Math.max(0, Math.round(performance.now() - activeAt.current)),
    [],
  );

  const submit = useCallback(
    async (input: CapturedReviewPayload): Promise<boolean> => {
      if (saveInFlight.current) {
        return false;
      }

      saveInFlight.current = true;
      setSaving(true);
      setSaveError(null);
      try {
        await onSubmitReview(input);
        setSubmitted(true);
        onPhaseChange?.("completed");
        return true;
      } catch (error: unknown) {
        setSaveError(
          error instanceof Error ? error.message : "Review could not be saved.",
        );
        return false;
      } finally {
        saveInFlight.current = false;
        setSaving(false);
      }
    },
    [onPhaseChange, onSubmitReview],
  );

  const revealMcq = useCallback(() => {
    if (
      !isMcq ||
      selectedChoice === null ||
      card.correctChoice === undefined ||
      card.choices === undefined ||
      revealed ||
      saving ||
      pendingMcqReview.current !== null
    ) {
      return;
    }

    const payload: CapturedReviewPayload = {
      mode: "mcq",
      correct: selectedChoice === card.correctChoice,
      rating: null,
      responseTimeMs: responseTime(),
      selectedChoice,
    };
    pendingMcqReview.current = payload;
    setRevealed(true);
    onPhaseChange?.("pending_save");
    void submit(payload);
  }, [
    card.choices,
    card.correctChoice,
    isMcq,
    onPhaseChange,
    responseTime,
    revealed,
    saving,
    selectedChoice,
    submit,
  ]);

  const retryMcqSave = () => {
    if (pendingMcqReview.current === null || submitted || saving) {
      return;
    }
    void submit(pendingMcqReview.current);
  };

  const revealRecall = useCallback(() => {
    if (isMcq || revealed || saving) {
      return;
    }
    setRevealResponseTimeMs(responseTime());
    setRevealed(true);
    onPhaseChange?.("revealed");
  }, [isMcq, onPhaseChange, responseTime, revealed, saving]);

  const rateRecall = useCallback(
    (rating: ReviewRating) => {
      if (!revealed || isMcq || saving || submitted) {
        return;
      }

      // Recall self-ratings remain separate from objective correctness so Exam-SRS
      // can distinguish a weak success from a clean retrieval.
      void submit({
        mode: modeForCard(card),
        correct: rating === "forgot" ? false : true,
        rating,
        responseTimeMs: revealResponseTimeMs,
        selectedChoice: null,
      }).then((success) => {
        if (success) {
          onFinish();
        }
      });
    },
    [card, isMcq, onFinish, revealed, revealResponseTimeMs, saving, submit, submitted],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableStudyTarget(event.target)) {
        return;
      }

      if (isMcq) {
        if (!revealed && /^[1-9]$/.test(event.key)) {
          const choiceIndex = Number(event.key) - 1;
          if (
            !saving &&
            card.choices !== undefined &&
            choiceIndex < card.choices.length
          ) {
            event.preventDefault();
            setSelectedChoice(choiceIndex);
          }
          return;
        }

        if (!revealed && event.key === "Enter" && selectedChoice !== null && !saving) {
          event.preventDefault();
          revealMcq();
          return;
        }

        if (revealed && submitted && event.key === "Enter") {
          event.preventDefault();
          onFinish();
        }
        return;
      }

      if (!revealed && (event.key === " " || event.key === "Enter") && !saving) {
        event.preventDefault();
        revealRecall();
        return;
      }

      if (revealed && !saving && !submitted) {
        const ratingByKey: Readonly<Record<string, ReviewRating>> = {
          "1": "forgot",
          "2": "struggled",
          "3": "got_it",
        };
        const rating = ratingByKey[event.key];
        if (rating !== undefined) {
          event.preventDefault();
          rateRecall(rating);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    card.choices,
    isMcq,
    onFinish,
    rateRecall,
    revealMcq,
    revealRecall,
    revealed,
    saving,
    selectedChoice,
    submitted,
  ]);

  return (
    <article className="study-card" aria-labelledby={`card-${card.id}-prompt`}>
      <div className="card-meta">
        <span>Chapter {card.chapter}</span>
        <span>{card.topic}</span>
        <span>Difficulty {card.difficulty}/3</span>
      </div>

      <p className="card-id">{card.id}</p>
      <p className="keyboard-hint" aria-hidden="true">
        {isMcq
          ? "Keyboard: 1–9 choose · Enter reveal / next"
          : "Keyboard: Space / Enter reveal · 1–3 rate"}
      </p>
      <h2 id={`card-${card.id}-prompt`} className="study-prompt">
        {card.front}
      </h2>

      {isMcq && card.choices !== undefined && card.correctChoice !== undefined ? (
        <fieldset className="choice-list">
          <legend>Select an answer before revealing the result.</legend>
          {card.choices.map((choice, index) => {
            const isCorrect = revealed && index === card.correctChoice;
            const isWrongSelection =
              revealed && index === selectedChoice && index !== card.correctChoice;
            return (
              <label
                className={`choice-option ${isCorrect ? "choice-correct" : ""} ${
                  isWrongSelection ? "choice-incorrect" : ""
                }`}
                key={`${card.id}-${index}`}
              >
                <input
                  type="radio"
                  name={`choice-${card.id}`}
                  value={index}
                  checked={selectedChoice === index}
                  disabled={revealed || saving}
                  onChange={() => setSelectedChoice(index)}
                />
                <span>{choice}</span>
                {isCorrect && <strong className="choice-result">Correct answer</strong>}
                {isWrongSelection && (
                  <strong className="choice-result">Your selection</strong>
                )}
              </label>
            );
          })}
        </fieldset>
      ) : null}

      {!revealed && (
        <div className="study-action-row">
          {isMcq ? (
            <button
              className="primary-button"
              type="button"
              disabled={selectedChoice === null || saving}
              onClick={revealMcq}
            >
              Reveal result
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={revealRecall}>
              Show answer
            </button>
          )}
        </div>
      )}

      {revealed && (
        <div className="reveal-panel" aria-live="polite">
          {isMcq && (
            <p
              className={`result-banner ${
                selectedChoice === card.correctChoice
                  ? "result-correct"
                  : "result-incorrect"
              }`}
            >
              {selectedChoice === card.correctChoice ? "Correct" : "Not quite"}
            </p>
          )}
          <section className="answer-block">
            <p className="section-kicker">Answer</p>
            <p className="answer-text">{card.answer}</p>
          </section>
          <section className="explanation-block">
            <p className="section-kicker">Why it works</p>
            <p>{card.explanation}</p>
          </section>
          <section className="trap-block">
            <p className="section-kicker">Common trap</p>
            <p>{card.commonTrap}</p>
          </section>

          {isMcq ? (
            <div className="study-action-row">
              {submitted && (
                <button className="primary-button" type="button" onClick={onFinish}>
                  Next card
                </button>
              )}
              {!submitted && saveError && (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={saving}
                  onClick={retryMcqSave}
                >
                  Retry save
                </button>
              )}
            </div>
          ) : (
            <fieldset className="rating-list">
              <legend>How did that feel?</legend>
              <div className="rating-buttons">
                {(
                  [
                    ["forgot", "Forgot"],
                    ["struggled", "Struggled"],
                    ["got_it", "Got it"],
                  ] as const
                ).map(([rating, label]) => (
                  <button
                    className={`rating-button rating-${rating}`}
                    type="button"
                    disabled={saving || submitted}
                    key={rating}
                    onClick={() => rateRecall(rating)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {saving && <p className="save-status">Saving this review locally…</p>}
          {saveError && (
            <p className="inline-error" role="alert">
              {saveError}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function isEditableStudyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
  );
}
