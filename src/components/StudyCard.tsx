import { useEffect, useRef, useState } from "react";
import type { Flashcard } from "../domain/content";
import type { NewReviewEvent, ReviewRating } from "../domain/progress";

interface StudyCardProps {
  readonly card: Flashcard;
  readonly onSubmitReview: (input: Omit<NewReviewEvent, "cardId">) => Promise<void>;
  readonly onFinish: () => void;
}

function modeForCard(card: Flashcard): NewReviewEvent["mode"] {
  return card.kind === "calculation" ? "calculation" : "recall";
}

export function StudyCard({ card, onSubmitReview, onFinish }: StudyCardProps) {
  const isMcq = card.choices !== undefined && card.correctChoice !== undefined;
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [revealResponseTimeMs, setRevealResponseTimeMs] = useState<number | null>(null);
  const activeAt = useRef(performance.now());

  useEffect(() => {
    activeAt.current = performance.now();
  }, [card.id]);

  const responseTime = () =>
    Math.max(0, Math.round(performance.now() - activeAt.current));

  const submit = async (input: Omit<NewReviewEvent, "cardId">): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSubmitReview(input);
      setSubmitted(true);
      return true;
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Review could not be saved.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const revealMcq = () => {
    if (
      !isMcq ||
      selectedChoice === null ||
      card.correctChoice === undefined ||
      card.choices === undefined ||
      revealed ||
      saving
    ) {
      return;
    }

    const responseTimeMs = responseTime();
    setRevealed(true);
    void submit({
      mode: "mcq",
      correct: selectedChoice === card.correctChoice,
      rating: null,
      responseTimeMs,
      selectedChoice,
    });
  };

  const revealRecall = () => {
    if (isMcq || revealed || saving) {
      return;
    }
    setRevealResponseTimeMs(responseTime());
    setRevealed(true);
  };

  const rateRecall = (rating: ReviewRating) => {
    if (!revealed || isMcq || saving || submitted) {
      return;
    }

    // Self-ratings are deliberately conservative for this baseline: both
    // "struggled" and "got_it" count as correct, while the rating remains
    // available to the future Exam-SRS scheduler.
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
  };

  return (
    <article className="study-card" aria-labelledby={`card-${card.id}-prompt`}>
      <div className="card-meta">
        <span>Chapter {card.chapter}</span>
        <span>{card.topic}</span>
        <span>Difficulty {card.difficulty}/3</span>
      </div>

      <p className="card-id">{card.id}</p>
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
              <button
                className="primary-button"
                type="button"
                disabled={!submitted || saving}
                onClick={onFinish}
              >
                Next card
              </button>
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
