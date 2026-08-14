import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProgress } from "../app/progressContext";
import { cards } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import type { ExamQuestion } from "../exam/model";
import { buildPracticeSet } from "../practice/selector";
import type { NewReviewEvent, ReviewRating } from "../domain/progress";
import { QuestionStimulus } from "../components/stimulus/QuestionStimulus";
import { GeneratedCalculationLab } from "../components/calculations/GeneratedCalculationLab";
import { KnowledgeText } from "../components/knowledge/KnowledgeText";
import { MathText } from "../components/math/MathText";
import { cardConceptMap } from "../knowledge/contentMap";
import { knowledgeConceptById } from "../knowledge/data";
import { getEffectiveManualLearned } from "../study/manualLearned";
import { ManualLearnedAction } from "../components/ManualLearnedAction";

type PracticeMode = "mcq" | "stimulus" | "written" | "calculations";
type CalculationPracticeSubmode = "generated" | "authored";
type StimulusFilter = "all" | "econ_graph" | "table" | "text";
type PracticeSavePhase = "answering" | "revealed" | "pending_save" | "completed";

export function PracticePage({
  initialMode,
  initialConceptId,
}: {
  readonly initialMode: PracticeMode | null;
  readonly initialConceptId?: string | null;
}) {
  const resolvedConceptId = initialConceptId ?? null;
  const [mode, setMode] = useState<PracticeMode | null>(initialMode);
  const [calculationSubmode, setCalculationSubmode] =
    useState<CalculationPracticeSubmode>("generated");
  const [chapter, setChapter] = useState<number | null>(null);
  const [style, setStyle] = useState<ExamQuestion["style"] | "all">("all");
  const [stimulus, setStimulus] = useState<StimulusFilter>("all");
  const [size, setSize] = useState<5 | 10 | 20>(10);
  const [seed, setSeed] = useState(() => Date.now());
  useEffect(() => setMode(initialMode), [initialMode]);
  useEffect(() => {
    if (mode === "stimulus" && stimulus === "text") setStimulus("all");
  }, [mode, stimulus]);

  if (mode === null)
    return (
      <PracticeOverview
        onChoose={(next) => {
          setMode(next);
          const conceptQuery =
            resolvedConceptId === null
              ? ""
              : "&concept=" + encodeURIComponent(resolvedConceptId);
          window.location.hash = "#/practice?mode=" + next + conceptQuery;
        }}
      />
    );
  return (
    <PracticeSession
      mode={mode}
      conceptId={resolvedConceptId}
      calculationSubmode={calculationSubmode}
      setCalculationSubmode={setCalculationSubmode}
      chapter={chapter}
      setChapter={setChapter}
      style={style}
      setStyle={setStyle}
      stimulus={stimulus}
      setStimulus={setStimulus}
      size={size}
      setSize={setSize}
      seed={seed}
      onNewSet={() => setSeed((previous) => previous + 1)}
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
          description="Filter the 173-question bank by chapter, style, and stimulus. Immediate feedback is saved to Exam-SRS."
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
          description="Practise fresh generated numbers or switch to the unchanged authored calculation MCQs."
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
  readonly conceptId: string | null;
  readonly calculationSubmode: CalculationPracticeSubmode;
  readonly setCalculationSubmode: (value: CalculationPracticeSubmode) => void;
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
  conceptId,
  calculationSubmode,
  setCalculationSubmode,
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
  const {
    snapshot,
    markLearnedPermanently: markLearnedPermanentlyFromContext,
    recordReview,
  } = useProgress();
  const markLearnedPermanently = useMemo(
    () =>
      markLearnedPermanentlyFromContext ??
      (async () => {
        throw new Error("Manual learned settings are unavailable in this view.");
      }),
    [markLearnedPermanentlyFromContext],
  );
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [mcqPhase, setMcqPhase] = useState<PracticeSavePhase>("answering");
  const pendingMcqPayload = useRef<NewReviewEvent | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [writtenText, setWrittenText] = useState("");
  const [writtenRevealed, setWrittenRevealed] = useState(false);
  const [writtenPhase, setWrittenPhase] = useState<PracticeSavePhase>("answering");
  const pendingWrittenPayload = useRef<NewReviewEvent | null>(null);
  const manualLearned = useMemo(
    () => getEffectiveManualLearned(snapshot?.manualLearnedOverrides),
    [snapshot?.manualLearnedOverrides],
  );
  const isGeneratedCalculations =
    mode === "calculations" && calculationSubmode === "generated";
  const conceptQuestionIds = useMemo(() => {
    if (conceptId === null) return undefined;
    const concept = knowledgeConceptById.get(conceptId);
    return new Set(concept?.linkedQuestionIds ?? []);
  }, [conceptId]);
  const conceptCardIds = useMemo(() => {
    if (conceptId === null) return undefined;
    const concept = knowledgeConceptById.get(conceptId);
    return new Set(concept?.linkedCardIds ?? []);
  }, [conceptId]);

  const questions = useMemo(
    () =>
      buildPracticeSet(examQuestions, {
        chapter,
        style:
          mode === "calculations" ? "calculation" : mode === "stimulus" ? "all" : style,
        stimulus,
        stimuliOnly: mode === "stimulus",
        questionIds: conceptQuestionIds,
        excludedQuestionIds: manualLearned.questionIds,
        size,
        seed,
      }),
    [
      chapter,
      conceptQuestionIds,
      manualLearned.questionIds,
      mode,
      seed,
      size,
      stimulus,
      style,
    ],
  );
  const question = questions[index];
  const writtenCards = useMemo(
    () =>
      cards.filter(
        (card) =>
          card.choices === undefined &&
          (chapter === null || card.chapter === chapter) &&
          (conceptCardIds?.has(card.id) ?? true) &&
          !manualLearned.cardIds.has(card.id),
      ),
    [chapter, conceptCardIds, manualLearned.cardIds],
  );
  const writtenCard = writtenCards[index % Math.max(1, writtenCards.length)];

  useEffect(() => {
    setIndex(0);
    setSelected(null);
    setMcqPhase("answering");
    pendingMcqPayload.current = null;
    setSaveError(null);
    setWrittenText("");
    setWrittenRevealed(false);
    setWrittenPhase("answering");
    pendingWrittenPayload.current = null;
  }, [mode, calculationSubmode, seed, chapter, style, stimulus, size, conceptId]);

  const submitMcq = useCallback(async () => {
    if (question === undefined || selected === null || mcqPhase !== "answering") return;
    const payload: NewReviewEvent = {
      cardId: question.reviewCardId,
      mode: "mcq",
      rating: null,
      correct: selected === question.correctChoice,
      selectedChoice: selected,
      responseTimeMs: null,
    };
    pendingMcqPayload.current = payload;
    setSaveError(null);
    setMcqPhase("pending_save");
    try {
      await recordReview(payload);
      setMcqPhase("completed");
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Practice review could not be saved.",
      );
    }
  }, [mcqPhase, question, recordReview, selected]);
  const retryMcq = useCallback(async () => {
    const payload = pendingMcqPayload.current;
    if (payload === null || mcqPhase !== "pending_save") return;
    setSaveError(null);
    try {
      await recordReview(payload);
      setMcqPhase("completed");
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : "Practice review could not be saved.",
      );
    }
  }, [mcqPhase, recordReview]);
  const nextMcq = useCallback(() => {
    if (mcqPhase !== "completed") return;
    setIndex((current) => (current + 1 >= questions.length ? 0 : current + 1));
    setSelected(null);
    setMcqPhase("answering");
    pendingMcqPayload.current = null;
    setSaveError(null);
  }, [mcqPhase, questions.length]);
  const markQuestionLearned = useCallback(
    async (questionId: string) => {
      if (mcqPhase === "pending_save") return;
      await markLearnedPermanently("question", questionId);
      setIndex(0);
      setSelected(null);
      setMcqPhase("answering");
      pendingMcqPayload.current = null;
      setSaveError(null);
    },
    [markLearnedPermanently, mcqPhase],
  );
  const rateWritten = useCallback(
    async (rating: ReviewRating) => {
      if (writtenCard === undefined || writtenPhase !== "revealed") return;
      const payload: NewReviewEvent = {
        cardId: writtenCard.id,
        mode: writtenCard.kind === "calculation" ? "calculation" : "recall",
        rating,
        correct: rating === "forgot" ? false : true,
        selectedChoice: null,
        responseTimeMs: null,
      };
      pendingWrittenPayload.current = payload;
      setWrittenPhase("pending_save");
      setSaveError(null);
      try {
        await recordReview(payload);
        setWrittenPhase("completed");
      } catch (error: unknown) {
        setSaveError(
          error instanceof Error
            ? error.message
            : "Written-response review could not be saved.",
        );
      }
    },
    [recordReview, writtenCard, writtenPhase],
  );
  const retryWritten = useCallback(async () => {
    const payload = pendingWrittenPayload.current;
    if (payload === null || writtenPhase !== "pending_save") return;
    setSaveError(null);
    try {
      await recordReview(payload);
      setWrittenPhase("completed");
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Written-response review could not be saved.",
      );
    }
  }, [recordReview, writtenPhase]);
  const nextWritten = useCallback(() => {
    if (writtenPhase !== "completed") return;
    setIndex((current) => (current + 1) % Math.max(1, writtenCards.length));
    setWrittenText("");
    setWrittenRevealed(false);
    setWrittenPhase("answering");
    pendingWrittenPayload.current = null;
    setSaveError(null);
  }, [writtenCards.length, writtenPhase]);
  const revealWritten = useCallback((revealed: boolean) => {
    setWrittenRevealed(revealed);
    if (revealed) setWrittenPhase("revealed");
  }, []);

  const mcqSaved = mcqPhase === "completed";
  const mcqSaving = mcqPhase === "pending_save";
  const writtenSaving = writtenPhase === "pending_save";
  const writtenSaved = writtenPhase === "completed";
  const controlsLocked = mcqSaving || writtenSaving;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isGeneratedCalculations) return;
      if (isEditablePracticeTarget(event.target)) return;
      if (mode !== "written") {
        if (/^[1-4]$/.test(event.key) && mcqPhase === "answering") {
          event.preventDefault();
          setSelected(Number(event.key) - 1);
        } else if (event.key === "Enter") {
          event.preventDefault();
          if (mcqSaved) nextMcq();
          else if (mcqPhase === "answering") void submitMcq();
        }
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (writtenSaved) nextWritten();
        else if (writtenPhase === "answering" && !writtenRevealed) revealWritten(true);
      } else if (
        writtenRevealed &&
        /^[1-3]$/.test(event.key) &&
        writtenPhase === "revealed"
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
    mcqPhase,
    mcqSaved,
    isGeneratedCalculations,
    mode,
    nextMcq,
    nextWritten,
    rateWritten,
    revealWritten,
    submitMcq,
    writtenRevealed,
    writtenPhase,
    writtenSaved,
  ]);

  if (isGeneratedCalculations) {
    return (
      <GeneratedCalculationLab
        chapter={chapter}
        setChapter={setChapter}
        size={size}
        setSize={setSize}
        seed={seed}
        onNewSet={onNewSet}
        onBack={onBack}
        onUseAuthored={() => setCalculationSubmode("authored")}
        recordReview={recordReview}
        excludedReviewCardIds={manualLearned.cardIds}
      />
    );
  }

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
          disabled={controlsLocked}
          onClick={onBack}
        >
          Change format
        </button>
      </section>
      <section className="panel practice-controls">
        {mode === "calculations" && (
          <div
            className="generated-calculation-mode-tabs"
            role="tablist"
            aria-label="Calculation practice mode"
          >
            <button
              className="secondary-button"
              type="button"
              role="tab"
              aria-selected="false"
              disabled={controlsLocked}
              onClick={() => setCalculationSubmode("generated")}
            >
              Generated numeric
            </button>
            <button
              className="primary-button"
              type="button"
              role="tab"
              aria-selected="true"
            >
              Authored MCQs
            </button>
          </div>
        )}
        <label className="field-label">
          Chapter
          <select
            value={chapter === null ? "all" : chapter}
            onChange={(event) =>
              setChapter(
                event.target.value === "all" ? null : Number(event.target.value),
              )
            }
            disabled={controlsLocked}
          >
            <option value="all">All chapters</option>
            {Array.from({ length: 11 }, (_, i) => (
              <option value={i} key={i}>
                Chapter {i}
              </option>
            ))}
          </select>
        </label>
        {mode === "mcq" && (
          <label className="field-label">
            Style
            <select
              value={style}
              onChange={(event) => setStyle(event.target.value as typeof style)}
              disabled={controlsLocked}
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
              disabled={controlsLocked}
            >
              <option value="all">
                {mode === "stimulus" ? "All graphs & tables" : "All questions"}
              </option>
              <option value="econ_graph">Graphs only</option>
              <option value="table">Tables only</option>
              {mode !== "stimulus" && <option value="text">Text only</option>}
            </select>
          </label>
        )}
        {mode !== "written" && (
          <label className="field-label">
            Set size
            <select
              value={size}
              onChange={(event) => setSize(Number(event.target.value) as 5 | 10 | 20)}
              disabled={controlsLocked}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </label>
        )}
        <button
          className="secondary-button"
          type="button"
          onClick={onNewSet}
          disabled={controlsLocked}
        >
          New set
        </button>
      </section>
      {mode === "written" ? (
        <WrittenResponse
          card={writtenCard}
          testedConceptIds={
            writtenCard === undefined ? [] : (cardConceptMap[writtenCard.id] ?? [])
          }
          text={writtenText}
          setText={setWrittenText}
          revealed={writtenRevealed}
          setRevealed={revealWritten}
          saving={writtenSaving}
          saved={writtenSaved}
          onRate={rateWritten}
          onRetry={retryWritten}
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
          testedConceptIds={cardConceptMap[question.reviewCardId] ?? []}
          index={index}
          total={questions.length}
          selected={selected}
          saved={mcqSaved}
          saving={mcqSaving}
          pending={mcqPhase === "pending_save"}
          error={saveError}
          onSelect={setSelected}
          onSubmit={submitMcq}
          onRetry={() => void retryMcq()}
          onNext={nextMcq}
          onMarkLearned={() => markQuestionLearned(question.id)}
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

export function PracticeMcq({
  question,
  testedConceptIds,
  index,
  total,
  selected,
  saved,
  saving,
  pending,
  error,
  onSelect,
  onSubmit,
  onRetry,
  onNext,
  onMarkLearned,
}: {
  readonly question: ExamQuestion;
  readonly testedConceptIds: readonly string[];
  readonly index: number;
  readonly total: number;
  readonly selected: number | null;
  readonly saved: boolean;
  readonly saving: boolean;
  readonly pending: boolean;
  readonly error: string | null;
  readonly onSelect: (value: number) => void;
  readonly onSubmit: () => void;
  readonly onRetry: () => void;
  readonly onNext: () => void;
  readonly onMarkLearned?: () => Promise<void>;
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
      <h2 className="mock-stem">
        <KnowledgeText
          text={question.stem}
          disclosure={saved ? "full" : "preview"}
          testedConceptIds={saved ? [] : testedConceptIds}
        />
      </h2>
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
              disabled={saved || saving || pending}
              onChange={() => onSelect(choiceIndex)}
            />
            <span>
              <MathText text={choice} />
            </span>
          </label>
        ))}
      </fieldset>
      {onMarkLearned !== undefined && (
        <div className="manual-learned-action-row">
          <ManualLearnedAction
            label="Never show this question again"
            confirmationTitle="Mark this question learned permanently?"
            confirmationDescription="Only this authored question will be excluded from future Practice and mock selection. Its card and concept will remain available, and no review result will be recorded. You can restore it later in Settings."
            disabled={saving || pending}
            onConfirm={onMarkLearned}
          />
        </div>
      )}
      {!saved ? (
        <button
          className="primary-button"
          type="button"
          disabled={selected === null || saving || pending}
          onClick={onSubmit}
        >
          {pending && !error ? "Saving review…" : "Submit answer"}
        </button>
      ) : (
        <div className="reveal-panel" aria-live="polite">
          <p
            className={`result-banner ${correct ? "result-correct" : "result-incorrect"}`}
          >
            {correct ? "Correct" : "Not quite"}
          </p>
          <p>
            <strong>Explanation:</strong> <KnowledgeText text={question.explanation} />
          </p>
          <p>
            <strong>Common trap:</strong>{" "}
            <MathText
              text={question.choiceRationales[selected ?? question.correctChoice]}
            />
          </p>
          <details>
            <summary>Show all choice rationales</summary>
            {question.choiceRationales.map((rationale, rationaleIndex) => (
              <p key={rationaleIndex}>
                <strong>{String.fromCharCode(65 + rationaleIndex)}.</strong>{" "}
                <KnowledgeText text={rationale} />
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
          {pending && (
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
  testedConceptIds,
  text,
  setText,
  revealed,
  setRevealed,
  saving,
  saved,
  onRate,
  onRetry,
  onNext,
  error,
}: {
  readonly card: (typeof cards)[number] | undefined;
  readonly testedConceptIds: readonly string[];
  readonly text: string;
  readonly setText: (value: string) => void;
  readonly revealed: boolean;
  readonly setRevealed: (value: boolean) => void;
  readonly saving: boolean;
  readonly saved: boolean;
  readonly onRate: (rating: ReviewRating) => Promise<void>;
  readonly onRetry: () => void;
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
      <h2>
        <KnowledgeText
          text={card.front}
          disclosure={revealed ? "full" : "preview"}
          testedConceptIds={revealed ? [] : testedConceptIds}
        />
      </h2>
      <label className="field-label" htmlFor="written-answer">
        Your working{" "}
        <textarea
          id="written-answer"
          rows={8}
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={saving || saved}
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
            <p>
              <KnowledgeText text={card.answer} />
            </p>
          </section>
          <p>
            <strong>Explanation:</strong> <KnowledgeText text={card.explanation} />
          </p>
          <p>
            <strong>Common trap:</strong> <KnowledgeText text={card.commonTrap} />
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
          {saving && !error && <p role="status">Saving review…</p>}
          {saving && error && (
            <button className="secondary-button" type="button" onClick={onRetry}>
              Retry save
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
