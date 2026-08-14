import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProgress } from "../app/progressContext";
import type { NewReviewEvent } from "../domain/progress";
import { cards } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import { getExamSkillsForCard, getExamSkillsForQuestion } from "../examYield/score";
import { cardConceptMap } from "../knowledge/contentMap";
import { getEffectiveManualLearned } from "../study/manualLearned";
import { PracticeMcq } from "./PracticePage";
import { StudyCard } from "../components/StudyCard";
import {
  applySuperCramAnswer,
  buildSuperCramCandidates,
  createEmptySuperCramSession,
  findUrgentCanonicalFallback,
  selectSuperCramQuestion,
} from "../superCram/selector";
import {
  formulaApplicationMetaByQuestionId,
  getFormulaFamilyForQuestion,
} from "../superCram/formulaFamilies";
import type {
  SuperCramQuestionCandidate,
  SuperCramSessionState,
} from "../superCram/model";

type SuperCramSavePhase = "answering" | "pending_save" | "completed";

const WORTHINESS_LABELS = {
  1: "Lookup-skippable",
  2: "Mostly lookupable",
  3: "Mixed",
  4: "Study-worthy",
  5: "Must understand",
} as const;

export function SuperCramPage() {
  const { snapshot, recordReview } = useProgress();
  const sessionNowMs = useRef(Date.now()).current;
  const [session, setSession] = useState<SuperCramSessionState>(() =>
    createEmptySuperCramSession(),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [revealedCandidate, setRevealedCandidate] =
    useState<SuperCramQuestionCandidate | null>(null);
  const [phase, setPhase] = useState<SuperCramSavePhase>("answering");
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingPayload = useRef<NewReviewEvent | null>(null);
  const pendingCandidate = useRef<SuperCramQuestionCandidate | null>(null);
  const startedAt = useRef(0);
  const manualLearned = useMemo(
    () => getEffectiveManualLearned(snapshot?.manualLearnedOverrides),
    [snapshot?.manualLearnedOverrides],
  );
  const candidates = useMemo(
    () =>
      snapshot === null
        ? []
        : buildSuperCramCandidates({
            questions: examQuestions,
            cards,
            reviewEvents: snapshot.reviewEvents,
            settings: snapshot.settings,
            nowMs: sessionNowMs,
            manuallyLearnedQuestionIds: manualLearned.questionIds,
            manuallyLearnedCardIds: manualLearned.cardIds,
            session,
          }),
    [manualLearned.cardIds, manualLearned.questionIds, session, sessionNowMs, snapshot],
  );
  const candidate = useMemo(
    () =>
      selectSuperCramQuestion({
        candidates,
        session,
        nowMs: sessionNowMs,
      }),
    [candidates, session, sessionNowMs],
  );
  const [fallbackDismissed, setFallbackDismissed] = useState(false);
  const fallbackCard = useMemo(
    () =>
      snapshot === null || fallbackDismissed
        ? null
        : findUrgentCanonicalFallback({
            cards,
            questions: examQuestions,
            reviewEvents: snapshot.reviewEvents,
            settings: snapshot.settings,
            nowMs: sessionNowMs,
            manuallyLearnedQuestionIds: manualLearned.questionIds,
            manuallyLearnedCardIds: manualLearned.cardIds,
          }),
    [
      fallbackDismissed,
      manualLearned.cardIds,
      manualLearned.questionIds,
      sessionNowMs,
      snapshot,
    ],
  );

  useEffect(() => {
    startedAt.current =
      typeof performance === "undefined" ? Date.now() : performance.now();
  }, [candidate?.question.id]);

  const submit = useCallback(async () => {
    if (candidate === null || selected === null || phase !== "answering") return;
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    const payload: NewReviewEvent = {
      cardId: candidate.question.reviewCardId,
      mode: "mcq",
      rating: null,
      correct: selected === candidate.question.correctChoice,
      selectedChoice: selected,
      responseTimeMs: Math.max(0, now - startedAt.current),
    };
    pendingPayload.current = payload;
    pendingCandidate.current = candidate;
    setRevealedCandidate(candidate);
    setPhase("pending_save");
    setSaveError(null);
    try {
      await recordReview(payload);
      setSession((current) =>
        applySuperCramAnswer(
          current,
          candidate,
          selected === candidate.question.correctChoice,
        ),
      );
      setPhase("completed");
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Super Cram review could not be saved.",
      );
    }
  }, [candidate, phase, recordReview, selected]);

  const retry = useCallback(async () => {
    const payload = pendingPayload.current;
    const retryCandidate = pendingCandidate.current;
    if (payload === null || retryCandidate === null || phase !== "pending_save") return;
    setSaveError(null);
    try {
      await recordReview(payload);
      setSession((current) =>
        applySuperCramAnswer(current, retryCandidate, payload.correct === true),
      );
      setPhase("completed");
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Super Cram review could not be saved.",
      );
    }
  }, [phase, recordReview]);

  const next = useCallback(() => {
    if (phase !== "completed") return;
    setSelected(null);
    setRevealedCandidate(null);
    setPhase("answering");
    setSaveError(null);
    pendingPayload.current = null;
    pendingCandidate.current = null;
  }, [phase]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(event.target.tagName))
      ) {
        return;
      }
      if (/^[1-4]$/.test(event.key) && phase === "answering") {
        event.preventDefault();
        setSelected(Number(event.key) - 1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (phase === "completed") next();
        else if (phase === "answering") void submit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, phase, submit]);

  if (snapshot === null) return null;
  const answered = session.answeredCount;
  const correctPercent =
    answered === 0 ? "—" : `${Math.round((session.correctCount / answered) * 100)}%`;
  const shownCandidate =
    phase === "answering" ? candidate : (revealedCandidate ?? candidate);
  const feedbackNote =
    shownCandidate === null ? undefined : buildFeedbackNote(shownCandidate);

  return (
    <div className="page-stack practice-page super-cram-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Super Cram · cheat-sheet-aware MCQ drilling</p>
          <h1>Practise what the cheat sheet cannot do for you.</h1>
          <p className="lede">
            Super Cram combines existing exam-yield evidence, your ordinary Exam-SRS
            weaknesses, and session-level formula application coverage. It is a practice
            policy, not an exam-probability model.
          </p>
        </div>
        <a className="secondary-button heading-action" href="#/high-yield">
          High-Yield Cram
        </a>
      </section>

      <section className="stat-grid" aria-label="Super Cram session statistics">
        <SessionStat label="Answered" value={String(answered)} />
        <SessionStat label="Correct" value={correctPercent} />
        <SessionStat label="Reasoning gaps" value={String(session.reasoningGaps)} />
        <SessionStat
          label="Formula families applied"
          value={String(session.formulaFamiliesCovered.size)}
        />
        <SessionStat
          label="Chapters touched"
          value={String(session.chaptersTouched.length)}
        />
      </section>

      {fallbackCard !== null ? (
        <section className="panel">
          <p className="section-kicker">Urgent canonical fallback</p>
          <p className="muted-text">
            This attempted target has no eligible high-quality MCQ, so Super Cram is
            returning to the existing canonical retrieval surface.
          </p>
          <StudyCard
            card={fallbackCard}
            testedConceptIds={cardConceptMap[fallbackCard.id] ?? []}
            onSubmitReview={async (payload) => {
              await recordReview({ ...payload, cardId: fallbackCard.id });
            }}
            onFinish={() => setFallbackDismissed(true)}
          />
        </section>
      ) : shownCandidate === null ? (
        <section className="callout">
          <h2>No eligible MCQ remains.</h2>
          <p>
            Manual-learned exclusions or a fully answered pool have removed the current
            question surface. Continue with the ordinary canonical retrieval routes.
          </p>
          <div className="button-row">
            <a className="primary-button" href="#/study">
              Study now
            </a>
            <a className="secondary-button" href="#/guided">
              Guided Cram
            </a>
          </div>
        </section>
      ) : (
        <>
          <section
            className="panel super-cram-brief"
            aria-label="Current Super Cram policy"
          >
            <p className="section-kicker">Why this appeared</p>
            <p>
              <strong>{reasonLabel(shownCandidate)}</strong> ·{" "}
              {WORTHINESS_LABELS[shownCandidate.studyWorthiness]}
            </p>
            <p className="muted-text">
              Cheat sheet:{" "}
              {shownCandidate.cheatSheetSections.length === 0
                ? "No specific section tagged"
                : shownCandidate.cheatSheetSections.join(" · ")}
            </p>
          </section>
          <PracticeMcq
            question={shownCandidate.question}
            testedConceptIds={
              cardConceptMap[shownCandidate.question.reviewCardId] ?? []
            }
            index={0}
            total={1}
            selected={selected}
            saved={phase === "completed"}
            saving={phase === "pending_save"}
            pending={phase === "pending_save"}
            error={saveError}
            feedbackNote={feedbackNote}
            revealAllRationales
            onSelect={setSelected}
            onSubmit={() => void submit()}
            onRetry={() => void retry()}
            onNext={next}
          />
        </>
      )}
    </div>
  );
}

function SessionStat({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      <span className="muted-text">This session</span>
    </div>
  );
}

function reasonLabel(candidate: SuperCramQuestionCandidate): string {
  switch (candidate.reasonKind) {
    case "urgent-weakness":
      return "Urgent weakness · ordinary Exam-SRS evidence";
    case "formula-application":
      return "Formula application · current-practice form analogue";
    case "lookup-validation":
      return "Lookup validation · cheap-mark breadth check";
    case "reasoning-heavy":
      return `${candidate.examYieldTier} skill · reasoning-heavy`;
  }
}

function buildFeedbackNote(candidate: SuperCramQuestionCandidate): string {
  const meta = formulaApplicationMetaByQuestionId.get(candidate.question.id);
  const mappedSkill =
    getExamSkillsForQuestion(candidate.question.id)[0] ??
    getExamSkillsForCard(candidate.question.reviewCardId)[0];
  const skillNote =
    mappedSkill === undefined
      ? ""
      : ` ${mappedSkill.tier} skill: ${mappedSkill.label}.`;
  const formulaNote =
    meta === undefined
      ? ""
      : ` Formula family: ${getFormulaFamilyForQuestion(candidate.question.id)?.label ?? meta.familyId}; form: ${meta.form}; current practice source shape only, not an official question.`;
  return `${reasonLabel(candidate)} · ${WORTHINESS_LABELS[candidate.studyWorthiness]}.${skillNote}${formulaNote}`;
}
