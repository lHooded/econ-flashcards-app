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
  rankHighYieldUnseenCards,
  selectHighYieldNextStep,
} from "../knowledge/guided/highYieldSelector";
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
import { examSkillEvidence } from "../examYield/skills";
import { getExamSkillsForCard, getExamYieldReasons } from "../examYield/score";
import { getEffectiveManualLearned } from "../study/manualLearned";

const EMPTY_REVIEWS: readonly ReviewEvent[] = [];
const RECENT_LIMIT = 3;

export function GuidedCramPage({
  initialConceptId = null,
  mode = "guided",
}: {
  readonly initialConceptId?: string | null;
  readonly mode?: "guided" | "high-yield";
}) {
  const isHighYieldMode = mode === "high-yield";
  const {
    snapshot,
    markLessonSeen,
    markLearnedPermanently: markLearnedPermanentlyFromContext,
    recordReview,
  } = useProgress();
  const markLearnedPermanently =
    markLearnedPermanentlyFromContext ??
    (async () => {
      throw new Error("Manual learned settings are unavailable in this view.");
    });
  const nowMs = useNow(30 * 1000);
  const [activeStep, setActiveStep] = useState<GuidedStep | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [pendingReviews, setPendingReviews] = useState<ReviewEvent[]>([]);
  const [sessionSeed, setSessionSeed] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);

  const lessonSeen = useMemo(
    () => new Set(snapshot?.lessonSeenConceptIds ?? []),
    [snapshot?.lessonSeenConceptIds],
  );
  const manualLearned = useMemo(
    () => getEffectiveManualLearned(snapshot?.manualLearnedOverrides),
    [snapshot?.manualLearnedOverrides],
  );
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
        : deriveExamSrsSnapshot(
            cards,
            effectiveReviews,
            settings,
            nowMs,
            manualLearned.cardIds,
          ),
    [effectiveReviews, manualLearned.cardIds, nowMs, settings],
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
        : deriveConceptStatuses(
            scheduler,
            knowledgeConcepts,
            guidedStates,
            manualLearned.coveredConceptIds,
          ),
    [guidedStates, manualLearned.coveredConceptIds, scheduler],
  );
  const nextSelection = useMemo(
    () =>
      settings === undefined
        ? null
        : (isHighYieldMode ? selectHighYieldNextStep : selectGuidedNextStep)({
            cards,
            reviews: effectiveReviews,
            settings,
            nowMs,
            lessonSeenConceptIds: lessonSeen,
            recentlyShownIds: recentIds,
            sessionSeed,
            manualLearned,
          }),
    [
      effectiveReviews,
      isHighYieldMode,
      lessonSeen,
      nowMs,
      recentIds,
      sessionSeed,
      settings,
      manualLearned,
    ],
  );
  const highYieldCandidates = useMemo(
    () =>
      isHighYieldMode && settings !== undefined
        ? rankHighYieldUnseenCards({
            cards,
            reviews: effectiveReviews,
            settings,
            nowMs,
            lessonSeenConceptIds: lessonSeen,
            recentlyShownIds: recentIds,
            sessionSeed,
            manualLearned,
          }).slice(0, 3)
        : [],
    [
      effectiveReviews,
      isHighYieldMode,
      lessonSeen,
      nowMs,
      recentIds,
      sessionSeed,
      settings,
      manualLearned,
    ],
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
        ? isHighYieldMode
          ? "#/high-yield"
          : "#/guided"
        : `#/${isHighYieldMode ? "high-yield" : "guided"}?concept=${encodeURIComponent(conceptId)}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }, [activeStep, initialConceptId, isHighYieldMode]);

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
    isConceptIntroducedEnough(
      concept.id,
      effectiveReviews,
      manualLearned.coveredConceptIds,
      manualLearned.cardIds,
    ),
  ).length;
  const solid = [...statuses.values()].filter((status) => status === "solid").length;
  const due =
    scheduler.states.filter((state) => state.isDue).length +
    Object.values(guidedStates).filter((state) => state.isDue).length;
  const highYieldProgress = isHighYieldMode
    ? deriveHighYieldProgress(
        scheduler,
        statuses,
        effectiveReviews,
        manualLearned.coveredConceptIds,
      )
    : null;

  return (
    <div className="page-stack guided-page">
      <section className="page-heading guided-heading">
        <div>
          <p className="eyebrow">
            {isHighYieldMode
              ? "High-Yield Cram · evidence + graph + Exam-SRS"
              : "Guided Cram · graph + Exam-SRS"}
          </p>
          <h1>
            {isHighYieldMode ? "Spend the next hour well." : "One useful next step."}
          </h1>
          <p className="lede">
            <KnowledgeText
              text={
                isHighYieldMode
                  ? "Use the same prerequisite-aware learning system, but prioritise evidence-backed final-exam skills around your current gaps."
                  : "Learn the next prerequisite, retrieve it once, then let finite-horizon Exam-SRS bring important material back before the deadline."
              }
            />
          </p>
        </div>
        <div className="session-counter" aria-live="polite">
          <strong>{sessionCount}</strong>
          <span>retrievals this session</span>
        </div>
      </section>

      {isHighYieldMode && highYieldProgress !== null ? (
        <section
          className="guided-progress panel"
          aria-label="High-Yield Cram progress"
        >
          <div className="guided-progress-item">
            <strong>{highYieldProgress.criticalIntroduced}</strong>
            <span>critical skills introduced</span>
          </div>
          <div className="guided-progress-item">
            <strong>{highYieldProgress.criticalSolid}</strong>
            <span>critical skills solid</span>
          </div>
          <div className="guided-progress-item">
            <strong>{highYieldProgress.veryHighIntroduced}</strong>
            <span>very-high skills introduced</span>
          </div>
          <div className="guided-progress-item">
            <strong>{highYieldProgress.highYieldCardsSeen}</strong>
            <span>high-yield cards seen</span>
          </div>
          <div className="guided-progress-item">
            <strong>{highYieldProgress.highYieldSkillsDue}</strong>
            <span>high-yield skills currently due</span>
          </div>
          <div className="guided-progress-item">
            <strong>{phaseLabel}</strong>
            <span>{formatTimeRemaining(phaseTarget, nowMs)}</span>
          </div>
        </section>
      ) : (
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
      )}

      {isHighYieldMode && highYieldCandidates.length > 0 && (
        <section
          className="panel high-yield-gaps"
          aria-labelledby="high-yield-gaps-title"
        >
          <div className="panel-heading">
            <p className="section-kicker">High-yield progress</p>
            <h2 id="high-yield-gaps-title">Highest-value gaps right now</h2>
            <p className="muted-text">
              These are unseen anchors after Exam-SRS urgency and prerequisite cost have
              been considered.
            </p>
          </div>
          <ul className="high-yield-gap-list">
            {highYieldCandidates.map((candidate) => {
              const skill = getExamSkillsForCard(candidate.card.id)[0];
              const reasons = getExamYieldReasons(
                candidate.card.id,
                candidate.chapterUndercovered,
              );
              return (
                <li key={candidate.card.id}>
                  <strong>{skill?.label ?? candidate.card.topic}</strong>
                  <span>
                    Ch. {candidate.card.chapter} ·{" "}
                    {reasons.map((reason) => reason.label).join(" · ")}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {displayStep?.kind === "lesson" ? (
        <>
          <GuidedReasonBanner reason={displayStep.reason} whyNow={displayStep.whyNow} />
          <GuidedLesson
            concept={knowledgeConceptById.get(displayStep.conceptId)!}
            onContinue={async () => {
              if (!lessonSeen.has(displayStep.conceptId)) {
                await markLessonSeen(displayStep.conceptId);
              }
              setActiveStep(null);
            }}
          />
        </>
      ) : displayStep?.kind === "knowledge-check" ? (
        <>
          <GuidedReasonBanner reason={displayStep.reason} whyNow={displayStep.whyNow} />
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
          <GuidedReasonBanner reason={displayStep.reason} whyNow={displayStep.whyNow} />
          <StudyCard
            card={displayStep.card}
            testedConceptIds={displayStep.targetConceptIds}
            key={displayStep.card.id}
            onSubmitReview={(input) =>
              submitReview({ ...input, cardId: displayStep.card.id })
            }
            onFinish={() => finishStep(displayStep.card.id)}
            onMarkLearnedPermanently={async () => {
              await markLearnedPermanently("card", displayStep.card.id);
              finishStep(displayStep.card.id);
            }}
          />
        </>
      ) : (
        <GuidedIdleStep step={displayStep} />
      )}

      <p className="guided-evidence-note">
        Reading alone does not persist a lesson acknowledgement. Continuing past a
        lesson prevents unnecessary replay, but only a saved answer or self-rating
        creates Exam-SRS evidence.{" "}
        {isHighYieldMode
          ? "High-Yield Cram writes the same ordinary canonical and Guided Knowledge Check ReviewEvents; it adds no separate mastery state."
          : `Ordinary Study remains the canonical ${cards.length}-card deck; Guided Cram’s checks stay in its own lane.`}
      </p>
    </div>
  );
}

function GuidedReasonBanner({
  reason,
  whyNow,
}: {
  readonly reason: GuidedReason;
  readonly whyNow?: readonly string[];
}) {
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
      <span>{labels[reason]}</span>
      {whyNow !== undefined && whyNow.length > 0 && (
        <span className="guided-why-now">Why now: {whyNow.join(" · ")}</span>
      )}
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
  return scheduler.states.filter((state) => state.learningState !== "unseen").length;
}

function deriveHighYieldProgress(
  scheduler: ReturnType<typeof deriveExamSrsSnapshot>,
  statuses: ReadonlyMap<string, KnowledgeConceptStatus>,
  reviews: readonly ReviewEvent[],
  manuallySatisfiedConceptIds: ReadonlySet<string>,
) {
  const stateById = scheduler.stateByCardId;
  const introduced = (skill: (typeof examSkillEvidence)[number]) =>
    skill.targetConceptIds.some((conceptId) =>
      isConceptIntroducedEnough(
        conceptId,
        reviews,
        manuallySatisfiedConceptIds,
        scheduler.states
          .filter((state) => state.isManuallyLearned === true)
          .map((state) => state.cardId)
          .reduce((ids, cardId) => ids.add(cardId), new Set<string>()),
      ),
    );
  const solid = (skill: (typeof examSkillEvidence)[number]) =>
    skill.targetConceptIds.length > 0 &&
    skill.targetConceptIds.every((conceptId) => statuses.get(conceptId) === "solid");
  const due = (skill: (typeof examSkillEvidence)[number]) =>
    skill.cardIds.some((cardId) => stateById[cardId]?.isDue === true) ||
    skill.targetConceptIds.some(
      (conceptId) => statuses.get(conceptId) === "needs-work",
    );
  return {
    criticalIntroduced: examSkillEvidence.filter(
      (skill) => skill.tier === "critical" && introduced(skill),
    ).length,
    criticalSolid: examSkillEvidence.filter(
      (skill) => skill.tier === "critical" && solid(skill),
    ).length,
    veryHighIntroduced: examSkillEvidence.filter(
      (skill) => skill.tier === "very-high" && introduced(skill),
    ).length,
    highYieldCardsSeen: new Set(
      examSkillEvidence.flatMap((skill) =>
        skill.cardIds.filter(
          (cardId) =>
            stateById[cardId] !== undefined &&
            stateById[cardId].learningState !== "unseen",
        ),
      ),
    ).size,
    highYieldSkillsDue: examSkillEvidence.filter(due).length,
  };
}
