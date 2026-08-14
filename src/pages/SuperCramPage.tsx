import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProgress } from "../app/progressContext";
import type { Flashcard } from "../domain/content";
import type { NewReviewEvent } from "../domain/progress";
import { cards } from "../data/deck";
import { examQuestions } from "../exam/questionBank";
import { getExamSkillsForCard, getExamSkillsForQuestion } from "../examYield/score";
import { cardConceptMap } from "../knowledge/contentMap";
import { getEffectiveManualLearned } from "../study/manualLearned";
import { useNow } from "../utils/useNow";
import { PracticeMcq } from "./PracticePage";
import { StudyCard } from "../components/StudyCard";
import {
  applySuperCramAnswer,
  buildSuperCramCandidates,
  createEmptySuperCramSession,
  findUrgentCanonicalFallback,
  isReviewSnapshotStale,
  selectSuperCramQuestion,
} from "../superCram/selector";
import {
  formulaApplicationMetaByQuestionId,
  getFormulaFamilyForQuestion,
} from "../superCram/formulaFamilies";
import type { PendingReviewAcknowledgement } from "../superCram/selector";
import type {
  SuperCramQuestionCandidate,
  SuperCramSessionState,
} from "../superCram/model";

type SuperCramSavePhase = "answering" | "pending_save" | "completed";

type PresentedSuperCramTarget =
  | { readonly kind: "mcq"; readonly candidate: SuperCramQuestionCandidate }
  | { readonly kind: "fallback"; readonly card: Flashcard };

const WORTHINESS_LABELS = {
  1: "Lookup-skippable",
  2: "Mostly lookupable",
  3: "Mixed",
  4: "Study-worthy",
  5: "Must understand",
} as const;

export function SuperCramPage() {
  const { snapshot, recordReview } = useProgress();
  const sessionNowMs = useNow(30 * 1000);
  const [session, setSession] = useState<SuperCramSessionState>(() =>
    createEmptySuperCramSession(),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [revealedCandidate, setRevealedCandidate] =
    useState<SuperCramQuestionCandidate | null>(null);
  const [presentedTarget, setPresentedTarget] =
    useState<PresentedSuperCramTarget | null>(null);
  const [phase, setPhase] = useState<SuperCramSavePhase>("answering");
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingPayload = useRef<NewReviewEvent | null>(null);
  const pendingCandidate = useRef<SuperCramQuestionCandidate | null>(null);
  const startedAt = useRef(0);
  const [pendingReviewAcknowledgement, setPendingReviewAcknowledgement] =
    useState<PendingReviewAcknowledgement | null>(null);
  const manualLearned = useMemo(
    () => getEffectiveManualLearned(snapshot?.manualLearnedOverrides),
    [snapshot?.manualLearnedOverrides],
  );
  const reviewAcknowledgementCount = useMemo(
    () =>
      pendingReviewAcknowledgement === null || snapshot === null
        ? 0
        : snapshot.reviewEvents.filter(
            (event) => event.cardId === pendingReviewAcknowledgement.cardId,
          ).length,
    [pendingReviewAcknowledgement, snapshot],
  );
  const suppressedReviewCardId = isReviewSnapshotStale(
    reviewAcknowledgementCount,
    pendingReviewAcknowledgement,
  )
    ? pendingReviewAcknowledgement?.cardId
    : undefined;
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
            suppressedCardIds:
              suppressedReviewCardId === undefined
                ? undefined
                : new Set([suppressedReviewCardId]),
            session,
          }),
    [
      manualLearned.cardIds,
      manualLearned.questionIds,
      session,
      sessionNowMs,
      snapshot,
      suppressedReviewCardId,
    ],
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
  const fallbackCard = useMemo(
    () =>
      snapshot === null
        ? null
        : findUrgentCanonicalFallback({
            cards,
            questions: examQuestions,
            reviewEvents: snapshot.reviewEvents,
            settings: snapshot.settings,
            nowMs: sessionNowMs,
            manuallyLearnedQuestionIds: manualLearned.questionIds,
            manuallyLearnedCardIds: manualLearned.cardIds,
            excludedCardIds:
              suppressedReviewCardId === undefined
                ? undefined
                : new Set([suppressedReviewCardId]),
          }),
    [
      manualLearned.cardIds,
      manualLearned.questionIds,
      suppressedReviewCardId,
      sessionNowMs,
      snapshot,
    ],
  );

  const nextTarget = useMemo<PresentedSuperCramTarget | null>(
    () =>
      fallbackCard !== null
        ? { kind: "fallback", card: fallbackCard }
        : candidate === null
          ? null
          : { kind: "mcq", candidate },
    [candidate, fallbackCard],
  );
  const activeTarget = presentedTarget ?? nextTarget;
  const activeCandidate = activeTarget?.kind === "mcq" ? activeTarget.candidate : null;
  const activeFallback = activeTarget?.kind === "fallback" ? activeTarget.card : null;
  const activeCandidateId = activeCandidate?.question.id;

  useEffect(() => {
    if (phase === "answering" && presentedTarget === null && nextTarget !== null) {
      setPresentedTarget(nextTarget);
    }
  }, [nextTarget, phase, presentedTarget]);

  useEffect(() => {
    if (
      pendingReviewAcknowledgement !== null &&
      !isReviewSnapshotStale(reviewAcknowledgementCount, pendingReviewAcknowledgement)
    ) {
      setPendingReviewAcknowledgement(null);
    }
  }, [pendingReviewAcknowledgement, reviewAcknowledgementCount]);

  useEffect(() => {
    if (activeCandidateId !== undefined) {
      startedAt.current =
        typeof performance === "undefined" ? Date.now() : performance.now();
    }
  }, [activeCandidateId]);

  const submitFallback = useCallback(
    async (payload: Omit<NewReviewEvent, "cardId">) => {
      if (activeFallback === null || snapshot === null) {
        throw new Error("The canonical fallback is no longer available.");
      }
      const reviewCountBefore = snapshot.reviewEvents.filter(
        (event) => event.cardId === activeFallback.id,
      ).length;
      await recordReview({ ...payload, cardId: activeFallback.id });
      setPendingReviewAcknowledgement({
        cardId: activeFallback.id,
        reviewCountBefore,
      });
    },
    [activeFallback, recordReview, snapshot],
  );

  const finishFallback = useCallback(() => {
    if (activeTarget?.kind !== "fallback") return;
    setPresentedTarget(null);
    setSelected(null);
    setSaveError(null);
  }, [activeTarget]);

  const submit = useCallback(async () => {
    if (activeCandidate === null || selected === null || phase !== "answering") return;
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    const payload: NewReviewEvent = {
      cardId: activeCandidate.question.reviewCardId,
      mode: "mcq",
      rating: null,
      correct: selected === activeCandidate.question.correctChoice,
      selectedChoice: selected,
      responseTimeMs: Math.max(0, now - startedAt.current),
    };
    pendingPayload.current = payload;
    pendingCandidate.current = activeCandidate;
    setRevealedCandidate(activeCandidate);
    setPhase("pending_save");
    setSaveError(null);
    try {
      await recordReview(payload);
      setPendingReviewAcknowledgement({
        cardId: payload.cardId,
        reviewCountBefore:
          snapshot?.reviewEvents.filter((event) => event.cardId === payload.cardId)
            .length ?? 0,
      });
      setSession((current) =>
        applySuperCramAnswer(
          current,
          activeCandidate,
          selected === activeCandidate.question.correctChoice,
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
  }, [activeCandidate, phase, recordReview, selected, snapshot]);

  const retry = useCallback(async () => {
    const payload = pendingPayload.current;
    const retryCandidate = pendingCandidate.current;
    if (payload === null || retryCandidate === null || phase !== "pending_save") return;
    setSaveError(null);
    try {
      await recordReview(payload);
      setPendingReviewAcknowledgement({
        cardId: payload.cardId,
        reviewCountBefore:
          snapshot?.reviewEvents.filter((event) => event.cardId === payload.cardId)
            .length ?? 0,
      });
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
  }, [phase, recordReview, snapshot]);

  const next = useCallback(() => {
    if (phase !== "completed") return;
    setSelected(null);
    setRevealedCandidate(null);
    setPresentedTarget(null);
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
      if (activeTarget?.kind !== "mcq") {
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
  }, [activeTarget, next, phase, submit]);

  if (snapshot === null) return null;
  const answered = session.answeredCount;
  const correctPercent =
    answered === 0 ? "—" : `${Math.round((session.correctCount / answered) * 100)}%`;
  const shownCandidate =
    phase === "answering" ? activeCandidate : (revealedCandidate ?? activeCandidate);
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
          label="Formula forms applied"
          value={String(session.formulaCoverageUnitsCovered.size)}
        />
        <SessionStat
          label="Chapters touched"
          value={String(session.chaptersTouched.length)}
        />
      </section>

      {activeFallback !== null ? (
        <section className="panel">
          <p className="section-kicker">Due review · canonical card</p>
          <p className="muted-text">
            This card is due in Exam-SRS, but there isn&apos;t an eligible MCQ for it.
            Complete this retrieval card and Super Cram will continue with the best
            available target.
          </p>
          <StudyCard
            card={activeFallback}
            key={activeFallback.id}
            testedConceptIds={cardConceptMap[activeFallback.id] ?? []}
            onSubmitReview={submitFallback}
            onFinish={finishFallback}
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
