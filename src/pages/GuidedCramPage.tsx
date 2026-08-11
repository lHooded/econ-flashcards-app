import { useCallback, useEffect, useMemo, useState } from "react";
import { useProgress } from "../app/progressContext";
import { cards } from "../data/deck";
import {
  sortReviewEventsChronologically,
  type NewReviewEvent,
  type ReviewEvent,
} from "../domain/progress";
import { GuidedKnowledgeCheck } from "../components/knowledge/guided/GuidedKnowledgeCheck";
import { GuidedLesson } from "../components/knowledge/guided/GuidedLesson";
import { KnowledgeText } from "../components/knowledge/KnowledgeText";
import { getGuidedCheckVariant } from "../knowledge/guided/checks";
import {
  selectGuidedNextStep,
  type GuidedReason,
  type GuidedStep,
} from "../knowledge/guided/selector";
import {
  deriveGuidedCheckStates,
  deriveConceptStatuses,
  isConceptIntroducedEnough,
} from "../knowledge/mastery";
import { knowledgeConceptById, knowledgeConcepts } from "../knowledge/data";
import { deriveExamSrsSnapshot } from "../study/examSrs/deriveState";
import { formatTimeRemaining } from "../utils/date";
import { useNow } from "../utils/useNow";
import type { KnowledgeConceptStatus } from "../knowledge/model";
import { cardConceptMap } from "../knowledge/contentMap";
import { StudyCard } from "../components/StudyCard";

const EMPTY_REVIEWS: readonly ReviewEvent[] = [];
const RECENT_LIMIT = 3;

export function GuidedCramPage({
  initialConceptId = null,
}: {
  readonly initialConceptId?: string | null;
}) {
  const { snapshot, recordReview } = useProgress();
  const nowMs = useNow(30 * 1000);
  const [activeStep, setActiveStep] = useState<GuidedStep | null>(null);
  const [lessonCompleted, setLessonCompleted] = useState<Set<string>>(() => new Set());
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [pendingReviews, setPendingReviews] = useState<ReviewEvent[]>([]);
  const [sessionSeed, setSessionSeed] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);

  const persistedReviews = snapshot?.reviewEvents ?? EMPTY_REVIEWS;
  const effectiveReviews = useMemo(() => {
    const persistedIds = new Set(persistedReviews.map((review) => review.id));
    return sortReviewEventsChronologically([
      ...persistedReviews,
      ...pendingReviews.filter((review) => !persistedIds.has(review.id)),
    ]);
  }, [pendingReviews, persistedReviews]);
  const settings = snapshot?.settings;
  const scheduler = useMemo(
    () =>
      settings === undefined
        ? null
        : deriveExamSrsSnapshot(cards, effectiveReviews, settings, nowMs),
    [effectiveReviews, nowMs, settings],
  );
  const guidedStates = useMemo(
    () =>
      settings === undefined
        ? {}
        : deriveGuidedCheckStates(effectiveReviews, settings, nowMs),
    [effectiveReviews, nowMs, settings],
  );
  const statuses = useMemo(
    () =>
      scheduler === null
        ? new Map<string, KnowledgeConceptStatus>()
        : deriveConceptStatuses(scheduler, knowledgeConcepts, guidedStates),
    [guidedStates, scheduler],
  );
  const nextSelection = useMemo(
    () =>
      settings === undefined
        ? null
        : selectGuidedNextStep({
            cards,
            reviews: effectiveReviews,
            settings,
            nowMs,
            lessonCompletedConceptIds: lessonCompleted,
            recentlyShownIds: recentIds,
            sessionSeed,
          }),
    [effectiveReviews, lessonCompleted, nowMs, recentIds, sessionSeed, settings],
  );

  useEffect(() => {
    const persistedIds = new Set(persistedReviews.map((review) => review.id));
    setPendingReviews((current) =>
      current.filter((review) => !persistedIds.has(review.id)),
    );
  }, [persistedReviews]);

  useEffect(() => {
    if (activeStep === null && nextSelection !== null) {
      setActiveStep(nextSelection);
    }
  }, [activeStep, nextSelection]);

  useEffect(() => {
    const conceptId =
      activeStep?.kind === "lesson"
        ? activeStep.conceptId
        : activeStep?.kind === "knowledge-check"
          ? activeStep.skill.conceptId
          : activeStep?.kind === "canonical-card"
            ? (cardConceptMap[activeStep.card.id]?.[0] ?? null)
            : initialConceptId;
    const hash =
      conceptId === null || conceptId === undefined
        ? "#/guided"
        : `#/guided?concept=${encodeURIComponent(conceptId)}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }, [activeStep, initialConceptId]);

  const finishStep = useCallback((itemId: string) => {
    setRecentIds((current) =>
      [itemId, ...current.filter((id) => id !== itemId)].slice(0, RECENT_LIMIT),
    );
    setSessionSeed((current) => current + 1);
    setSessionCount((current) => current + 1);
    setActiveStep(null);
  }, []);

  const submitReview = useCallback(
    async (input: NewReviewEvent, canonicalCardId?: string) => {
      const cardId = canonicalCardId ?? input.cardId;
      const result = await recordReview({ ...input, cardId });
      setPendingReviews((current) => [
        ...current.filter((review) => review.id !== result.event.id),
        result.event,
      ]);
    },
    [recordReview],
  );

  if (snapshot === null || scheduler === null || settings === undefined) return null;

  const displayStep = activeStep ?? nextSelection;
  const phaseTarget =
    scheduler.phase === "cram"
      ? scheduler.studyDeadline
      : scheduler.phase === "buffer"
        ? snapshot.settings.examAt
        : null;
  const phaseLabel =
    scheduler.phase === "cram"
      ? "Cram phase"
      : scheduler.phase === "buffer"
        ? "Buffer phase"
        : scheduler.phase === "post_exam"
          ? "Maintenance"
          : "No exam target";
  const introduced = knowledgeConcepts.filter((concept) =>
    isConceptIntroducedEnough(concept.id, effectiveReviews),
  ).length;
  const solid = [...statuses.values()].filter((status) => status === "solid").length;
  const due =
    scheduler.states.filter((state) => state.isDue).length +
    Object.values(guidedStates).filter((state) => state.isDue).length;

  return (
    <div className="page-stack guided-page">
      <section className="page-heading guided-heading">
        <div>
          <p className="eyebrow">Guided Cram · graph + Exam-SRS</p>
          <h1>One useful next step.</h1>
          <p className="lede">
            <KnowledgeText text="Learn the next prerequisite, retrieve it once, then let finite-horizon Exam-SRS bring important material back before the deadline." />
          </p>
        </div>
        <div className="session-counter" aria-live="polite">
          <strong>{sessionCount}</strong>
          <span>retrievals this session</span>
        </div>
      </section>

      <section className="guided-progress panel" aria-label="Guided Cram progress">
        <div className="guided-progress-item">
          <strong>
            {canonicalSeen(scheduler)} / {cards.length}
          </strong>
          <span>canonical cards seen</span>
        </div>
        <div className="guided-progress-item">
          <strong>
            {introduced} / {knowledgeConcepts.length}
          </strong>
          <span>concepts introduced</span>
        </div>
        <div className="guided-progress-item">
          <strong>{solid}</strong>
          <span>concepts solid</span>
        </div>
        <div className="guided-progress-item">
          <strong>{due}</strong>
          <span>retrievals due</span>
        </div>
        <div className="guided-progress-item">
          <strong>{phaseLabel}</strong>
          <span>{formatTimeRemaining(phaseTarget, nowMs)}</span>
        </div>
      </section>

      {displayStep?.kind === "lesson" ? (
        <>
          <GuidedReasonBanner reason={displayStep.reason} />
          <GuidedLesson
            concept={knowledgeConceptById.get(displayStep.conceptId)!}
            onContinue={() => {
              setLessonCompleted((current) =>
                new Set(current).add(displayStep.conceptId),
              );
              setActiveStep(null);
            }}
          />
        </>
      ) : displayStep?.kind === "knowledge-check" ? (
        <>
          <GuidedReasonBanner reason={displayStep.reason} />
          <GuidedKnowledgeCheck
            skill={displayStep.skill}
            variant={getGuidedCheckVariant(
              displayStep.skill,
              displayStep.state.reviewCount,
              sessionSeed,
            )}
            onSubmitReview={(input) => submitReview(input)}
            onFinish={() => finishStep(displayStep.skill.id)}
          />
        </>
      ) : displayStep?.kind === "canonical-card" ? (
        <>
          <GuidedReasonBanner reason={displayStep.reason} />
          <StudyCard
            card={displayStep.card}
            testedConceptIds={displayStep.targetConceptIds}
            key={displayStep.card.id}
            onSubmitReview={(input) =>
              submitReview({ ...input, cardId: displayStep.card.id })
            }
            onFinish={() => finishStep(displayStep.card.id)}
          />
        </>
      ) : (
        <GuidedIdleStep step={displayStep} />
      )}

      <p className="guided-evidence-note">
        Reading and “Continue” only move the transient lesson. Only a saved answer or
        self-rating creates Exam-SRS evidence. Ordinary Study remains the canonical
        349-card deck; Guided Cram’s checks stay in its own lane.
      </p>
    </div>
  );
}

function GuidedReasonBanner({ reason }: { readonly reason: GuidedReason }) {
  const labels: Readonly<Record<GuidedReason, string>> = {
    "new-prerequisite": "Needed before the next exam concept",
    "new-exam-concept": "New exam concept",
    "due-review": "Due review",
    "weak-review": "Weak — review soon",
    relearning: "Relearning after a miss",
    "high-yield": "High-yield review",
    "prerequisite-for-selected-card": "Prerequisite for the selected card",
    idle: "Nothing is due right now",
  };
  return (
    <p className="guided-reason-banner" aria-live="polite">
      {labels[reason]}
    </p>
  );
}

function GuidedIdleStep({ step }: { readonly step: GuidedStep | null }) {
  const nextDueAt = step?.kind === "idle" ? step.nextDueAt : null;
  return (
    <section className="callout callout-accent guided-idle">
      <div>
        <p className="section-kicker">Guided Cram is caught up</p>
        <h2>Use the time for a targeted pass.</h2>
        <p>
          {nextDueAt === null
            ? "There are no scheduled Guided Cram reviews yet. Study a new canonical card or browse the Knowledge page."
            : `The next scheduled retrieval is ${new Date(nextDueAt).toLocaleString()}.`}
        </p>
      </div>
      <div className="button-row">
        <a className="primary-button" href="#/study">
          Open ordinary Study
        </a>
        <a className="secondary-button" href="#/knowledge">
          Browse Knowledge
        </a>
      </div>
    </section>
  );
}

function canonicalSeen(scheduler: ReturnType<typeof deriveExamSrsSnapshot>): number {
  return scheduler.states.filter((state) => state.reviewCount > 0).length;
}
