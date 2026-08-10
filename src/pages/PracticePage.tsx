import { useCallback, useEffect, useMemo, useState } from "react";
import { useProgress } from "../app/progressContext";
import { cards } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import type { ExamQuestion } from "../exam/model";
import { buildPracticeSet } from "../practice/selector";
import type { ReviewRating } from "../domain/progress";
import { QuestionStimulus } from "../components/stimulus/QuestionStimulus";

type PracticeMode = "mcq" | "stimulus" | "written" | "calculations";
type StimulusFilter = "all" | "econ_graph" | "table" | "text";

export function PracticePage({
  initialMode,
}: {
  readonly initialMode: PracticeMode | null;
}) {
  const [mode, setMode] = useState<PracticeMode | null>(initialMode);
  const [chapter, setChapter] = useState<number | null>(null);
  const [style, setStyle] = useState<ExamQuestion["style"] | "all">("all");
  const [stimulus, setStimulus] = useState<StimulusFilter>(
    initialMode === "stimulus" ? "all" : "all",
  );
  const [size, setSize] = useState<5 | 10 | 20>(10);
  const [seed, setSeed] = useState(() => Date.now());
  useEffect(() => setMode(initialMode), [initialMode]);

  if (mode === null)
    return (
      <PracticeOverview
        onChoose={(next) => {
          setMode(next);
          window.location.hash = `#/practice?mode=${next}`;
        }}
      />
    );
  return (
    <PracticeSession
      mode={mode}
      chapter={chapter}
      setChapter={setChapter}
      style={style}
      setStyle={setStyle}
      stimulus={stimulus}
      setStimulus={setStimulus}
      size={size}
      setSize={setSize}
      seed={seed}
      onNewSet={() => setSeed(Date.now())}
      onBack={() => {
        setMode(null);
        window.location.hash = "#/practice";
      }}
    />
  );
}

function PracticeOverview({
  onChoose,
}: {
  readonly onChoose: (mode: PracticeMode) => void;
}) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Practice Lab · untimed deliberate drills</p>
          <h1>Choose the skill to practise.</h1>
          <p className="lede">
            Use the authored bank for formative MCQs, focus on graphs and tables,
            practise calculations, or write a self-marked explanation from the canonical
            deck.
          </p>
        </div>
        <a className="secondary-button heading-action" href="#/study">
          Study now
        </a>
      </section>
      <div className="practice-mode-grid">
        <PracticeModeCard
          title="Question Bank Drill"
          description="Filter the 161 authored questions by chapter, style, and stimulus. Immediate feedback is saved to Exam-SRS."
          onClick={() => onChoose("mcq")}
        />
        <PracticeModeCard
          title="Graphs & Tables"
          description="Practise the 20 graphs and 10 tables with the same local stimulus renderer used in mock exams."
          onClick={() => onChoose("stimulus")}
        />
        <PracticeModeCard
          title="Written Response"
          description="Type an answer, reveal the canonical answer, and self-rate. Free text is never automatically graded or stored."
          onClick={() => onChoose("written")}
        />
        <PracticeModeCard
          title="Calculations"
          description="Work through authored calculation MCQs without attempting to parse arbitrary numeric answers."
          onClick={() => onChoose("calculations")}
        />
      </div>
      <section className="callout">
        <div>
          <p className="section-kicker">A separate lane from Study</p>
          <p>
            Study now follows the Exam-SRS recommendation. Practice Lab is user-directed
            and untimed; every completed exercise still uses the ordinary review
            evidence rules.
          </p>
        </div>
      </section>
    </div>
  );
}

function PracticeModeCard({
  title,
  description,
  onClick,
}: {
  readonly title: string;
  readonly description: string;
  readonly onClick: () => void;
}) {
  return (
    <button className="practice-mode-card" type="button" onClick={onClick}>
      <span className="section-kicker">Practice format</span>
      <strong>{title}</strong>
      <span>{description}</span>
      <span className="text-link">Start →</span>
    </button>
  );
}

interface PracticeSessionProps {
  readonly mode: PracticeMode;
  readonly chapter: number | null;
  readonly setChapter: (value: number | null) => void;
  readonly style: ExamQuestion["style"] | "all";
  readonly setStyle: (value: ExamQuestion["style"] | "all") => void;
  readonly stimulus: StimulusFilter;
  readonly setStimulus: (value: StimulusFilter) => void;
  readonly size: 5 | 10 | 20;
  readonly setSize: (value: 5 | 10 | 20) => void;
  readonly seed: number;
  readonly onNewSet: () => void;
  readonly onBack: () => void;
}

function PracticeSession({
  mode,
  chapter,
  setChapter,
  style,
  setStyle,
  stimulus,
  setStimulus,
  size,
  setSize,
  seed,
  onNewSet,
  onBack,
}: PracticeSessionProps) {
  const { recordReview } = useProgress();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [mcqSaving, setMcqSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [writtenText, setWrittenText] = useState("");
  const [writtenRevealed, setWrittenRevealed] = useState(false);
  const [writtenSaving, setWrittenSaving] = useState(false);
  const [writtenSaved, setWrittenSaved] = useState(false);

  const questions = useMemo(
    () =>
      buildPracticeSet(examQuestions, {
        chapter,
        style:
          mode === "calculations" ? "calculation" : mode === "stimulus" ? "all" : style,
        stimulus: mode === "stimulus" ? stimulus : "all",
        size,
        seed,
      }),
    [chapter, mode, seed, size, stimulus, style],
  );
  const question = questions[index];
  const writtenCards = useMemo(
    () =>
      cards.filter(
        (card) =>
          card.choices === undefined && (chapter === null || card.chapter === chapter),
      ),
    [chapter],
  );
  const writtenCard = writtenCards[index % Math.max(1, writtenCards.length)];

  useEffect(() => {
    setIndex(0);
    setSelected(null);
    setSaved(false);
    setMcqSaving(false);
    setSaveError(null);
    setWrittenText("");
    setWrittenRevealed(false);
    setWrittenSaved(false);
  }, [mode, seed, chapter, style, stimulus, size]);

  const submitMcq = useCallback(async () => {
    if (question === undefined || selected === null || saved || mcqSaving) return;
    setSaveError(null);
    setMcqSaving(true);
    try {
      await recordReview({
        cardId: question.reviewCardId,
        mode: "mcq",
        rating: null,
        correct: selected === question.correctChoice,
        selectedChoice: selected,
        responseTimeMs: null,
      });
      setSaved(true);
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Practice review could not be saved.",
      );
    } finally {
      setMcqSaving(false);
    }
  }, [mcqSaving, question, recordReview, saved, selected]);
  const retry = useCallback(() => {
    void submitMcq();
  }, [submitMcq]);
  const nextMcq = useCallback(() => {
    if (!saved) return;
    setIndex((current) => (current + 1 >= questions.length ? 0 : current + 1));
    setSelected(null);
    setSaved(false);
    setMcqSaving(false);
    setSaveError(null);
  }, [questions.length, saved]);
  const rateWritten = useCallback(
    async (rating: ReviewRating) => {
      if (writtenCard === undefined || writtenSaving || writtenSaved) return;
      setWrittenSaving(true);
      try {
        await recordReview({
          cardId: writtenCard.id,
          mode: writtenCard.kind === "calculation" ? "calculation" : "recall",
          rating,
          correct: rating === "forgot" ? false : true,
          selectedChoice: null,
          responseTimeMs: null,
        });
        setWrittenSaved(true);
      } catch (error: unknown) {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Written-response review could not be saved.",
        );
      } finally {
        setWrittenSaving(false);
      }
    },
    [recordReview, writtenCard, writtenSaved, writtenSaving],
  );
  const nextWritten = useCallback(() => {
    if (!writtenSaved) return;
    setIndex((current) => (current + 1) % Math.max(1, writtenCards.length));
    setWrittenText("");
    setWrittenRevealed(false);
    setWrittenSaved(false);
    setSaveError(null);
  }, [writtenCards.length, writtenSaved]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditablePracticeTarget(event.target)) return;
      if (mode !== "written") {
        if (/^[1-4]$/.test(event.key) && !saved && !mcqSaving) {
          event.preventDefault();
          setSelected(Number(event.key) - 1);
        } else if (event.key === "Enter") {
          event.preventDefault();
          if (saved) nextMcq();
          else void submitMcq();
        }
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (writtenSaved) nextWritten();
        else if (!writtenRevealed) setWrittenRevealed(true);
      } else if (
        writtenRevealed &&
        /^[1-3]$/.test(event.key) &&
        !writtenSaving &&
        !writtenSaved
      ) {
        event.preventDefault();
        void rateWritten(
          (["forgot", "struggled", "got_it"] as const)[Number(event.key) - 1],
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    mcqSaving,
    mode,
    nextMcq,
    nextWritten,
    rateWritten,
    saved,
    submitMcq,
    writtenRevealed,
    writtenSaved,
    writtenSaving,
  ]);

  return (
    <div className="page-stack practice-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">
            Practice Lab ·{" "}
            {mode === "written"
              ? "written response"
              : mode === "stimulus"
                ? "graphs and tables"
                : mode === "calculations"
                  ? "calculations"
                  : "question bank drill"}
          </p>
          <h1>Deliberate practice, no exam clock.</h1>
        </div>
        <button
          className="secondary-button heading-action"
          type="button"
          onClick={onBack}
        >
          Change format
        </button>
      </section>
      <section className="panel practice-controls">
        <label className="field-label">
          Chapter
          <select
            value={chapter === null ? "all" : chapter}
            onChange={(event) =>
              setChapter(
                event.target.value === "all" ? null : Number(event.target.value),
              )
            }
          >
            <option value="all">All chapters</option>
            {Array.from({ length: 11 }, (_, i) => (
              <option value={i} key={i}>
                Chapter {i}
              </option>
            ))}
          </select>
        </label>
        {mode !== "written" && (
          <label className="field-label">
            Style
            <select
              value={style}
              onChange={(event) => setStyle(event.target.value as typeof style)}
            >
              <option value="all">All styles</option>
              <option value="concept">Concept</option>
              <option value="scenario">Scenario</option>
              <option value="calculation">Calculation</option>
              <option value="model_discrimination">Model discrimination</option>
              <option value="sequence">Sequence</option>
            </select>
          </label>
        )}
        {mode !== "written" && (
          <label className="field-label">
            Stimulus
            <select
              value={stimulus}
              onChange={(event) => setStimulus(event.target.value as StimulusFilter)}
            >
              <option value="all">All</option>
              <option value="econ_graph">Graphs only</option>
              <option value="table">Tables only</option>
              <option value="text">Text only</option>
            </select>
          </label>
        )}
        {mode !== "written" && (
          <label className="field-label">
            Set size
            <select
              value={size}
              onChange={(event) => setSize(Number(event.target.value) as 5 | 10 | 20)}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </label>
        )}
        <button className="secondary-button" type="button" onClick={onNewSet}>
          New set
        </button>
      </section>
      {mode === "written" ? (
        <WrittenResponse
          card={writtenCard}
          text={writtenText}
          setText={setWrittenText}
          revealed={writtenRevealed}
          setRevealed={setWrittenRevealed}
          saving={writtenSaving}
          saved={writtenSaved}
          onRate={rateWritten}
          onNext={nextWritten}
          error={saveError}
        />
      ) : question === undefined ? (
        <section className="callout">
          <h2>No matching questions</h2>
          <p>Try a broader filter or a smaller set size.</p>
        </section>
      ) : (
        <PracticeMcq
          question={question}
          index={index}
          total={questions.length}
          selected={selected}
          saved={saved}
          saving={mcqSaving}
          error={saveError}
          onSelect={setSelected}
          onSubmit={submitMcq}
          onRetry={retry}
          onNext={nextMcq}
        />
      )}
    </div>
  );
}

function isEditablePracticeTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))
  );
}

function PracticeMcq({
  question,
  index,
  total,
  selected,
  saved,
  saving,
  error,
  onSelect,
  onSubmit,
  onRetry,
  onNext,
}: {
  readonly question: ExamQuestion;
  readonly index: number;
  readonly total: number;
  readonly selected: number | null;
  readonly saved: boolean;
  readonly saving: boolean;
  readonly error: string | null;
  readonly onSelect: (value: number) => void;
  readonly onSubmit: () => void;
  readonly onRetry: () => void;
  readonly onNext: () => void;
}) {
  const correct = selected === question.correctChoice;
  return (
    <article className="practice-question panel">
      <div className="mock-question-meta">
        <span>
          Question {index + 1} of {total}
        </span>
        <span>
          Chapter {question.chapter} · {question.topic}
        </span>
      </div>
      <QuestionStimulus stimulus={question.stimulus} />
      <h2 className="mock-stem">{question.stem}</h2>
      <fieldset className="choice-list">
        <legend>Select an answer, then submit to reveal feedback.</legend>
        {question.choices.map((choice, choiceIndex) => (
          <label
            className={`choice-option ${saved && choiceIndex === question.correctChoice ? "choice-correct" : ""} ${saved && selected === choiceIndex && !correct ? "choice-incorrect" : ""}`}
            key={choice}
          >
            <input
              type="radio"
              name={`practice-${question.id}`}
              checked={selected === choiceIndex}
              disabled={saved || saving}
              onChange={() => onSelect(choiceIndex)}
            />
            <span>{choice}</span>
          </label>
        ))}
      </fieldset>
      {!saved ? (
        <button
          className="primary-button"
          type="button"
          disabled={selected === null || saving}
          onClick={onSubmit}
        >
          Submit answer
        </button>
      ) : (
        <div className="reveal-panel" aria-live="polite">
          <p
            className={`result-banner ${correct ? "result-correct" : "result-incorrect"}`}
          >
            {correct ? "Correct" : "Not quite"}
          </p>
          <p>
            <strong>Explanation:</strong> {question.explanation}
          </p>
          <p>
            <strong>Common trap:</strong>{" "}
            {question.choiceRationales[selected ?? question.correctChoice]}
          </p>
          <details>
            <summary>Show all choice rationales</summary>
            {question.choiceRationales.map((rationale, rationaleIndex) => (
              <p key={rationaleIndex}>
                <strong>{String.fromCharCode(65 + rationaleIndex)}.</strong> {rationale}
              </p>
            ))}
          </details>
          <button className="primary-button" type="button" onClick={onNext}>
            Next
          </button>
        </div>
      )}
      {error && (
        <div className="save-warning" role="alert">
          <strong>Not saved.</strong> {error}
          {!saved && (
            <button className="secondary-button" type="button" onClick={onRetry}>
              Retry save
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function WrittenResponse({
  card,
  text,
  setText,
  revealed,
  setRevealed,
  saving,
  saved,
  onRate,
  onNext,
  error,
}: {
  readonly card: (typeof cards)[number] | undefined;
  readonly text: string;
  readonly setText: (value: string) => void;
  readonly revealed: boolean;
  readonly setRevealed: (value: boolean) => void;
  readonly saving: boolean;
  readonly saved: boolean;
  readonly onRate: (rating: ReviewRating) => Promise<void>;
  readonly onNext: () => void;
  readonly error: string | null;
}) {
  if (card === undefined)
    return (
      <section className="callout">
        <h2>No written-response cards match this chapter.</h2>
      </section>
    );
  return (
    <article className="practice-question panel written-response">
      <div className="mock-question-meta">
        <span>Written response · Chapter {card.chapter}</span>
        <span>{card.topic}</span>
      </div>
      <h2>{card.front}</h2>
      <label className="field-label" htmlFor="written-answer">
        Your working{" "}
        <textarea
          id="written-answer"
          rows={8}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Write the explanation or calculation in your own words…"
        />
      </label>
      {!revealed ? (
        <button
          className="primary-button"
          type="button"
          onClick={() => setRevealed(true)}
        >
          Show model answer
        </button>
      ) : (
        <div className="reveal-panel">
          <section className="answer-block">
            <p className="section-kicker">Model answer</p>
            <p>{card.answer}</p>
          </section>
          <p>
            <strong>Explanation:</strong> {card.explanation}
          </p>
          <p>
            <strong>Common trap:</strong> {card.commonTrap}
          </p>
          <fieldset className="rating-list">
            <legend>Self-rate this attempt</legend>
            <div className="rating-buttons">
              <button
                className="rating-button"
                type="button"
                disabled={saving || saved}
                onClick={() => void onRate("forgot")}
              >
                Forgot
              </button>
              <button
                className="rating-button"
                type="button"
                disabled={saving || saved}
                onClick={() => void onRate("struggled")}
              >
                Struggled
              </button>
              <button
                className="rating-button"
                type="button"
                disabled={saving || saved}
                onClick={() => void onRate("got_it")}
              >
                Got it
              </button>
            </div>
          </fieldset>
          {saved && (
            <button className="primary-button" type="button" onClick={onNext}>
              Next response
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}
