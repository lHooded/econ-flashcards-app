import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProgress } from "../app/progressContext";
import { StudyFocusControls } from "../components/StudyFocusControls";
import { StudyCard, type StudyCardPhase } from "../components/StudyCard";
import { cards, deck } from "../data/deck";
import {
  DEFAULT_APP_SETTINGS,
  sortReviewEventsChronologically,
  type NewReviewEvent,
  type ReviewEvent,
} from "../domain/progress";
import { getStudyReason } from "../study/examSrs/selector";
import { getScopedStatusMessage, selectScopedNextCard } from "../study/scopedSelector";
import {
  buildStudyHash,
  DEFAULT_STUDY_SCOPE,
  getStudyScopeLabel,
  type StudyScope,
} from "../study/studyScope";
import { deriveExamSrsSnapshot } from "../study/examSrs/deriveState";
import { formatLocalDateTime } from "../utils/date";
import { useNow } from "../utils/useNow";
import { deriveCardPrerequisiteReadiness } from "../knowledge/mastery";
import { KnowledgeText } from "../components/knowledge/KnowledgeText";
import { cardConceptMap } from "../knowledge/contentMap";
import { knowledgeConceptById } from "../knowledge/data";
import { getEffectiveManualLearned } from "../study/manualLearned";

const RECENT_CARD_LIMIT = 3;
const EMPTY_REVIEWS: readonly ReviewEvent[] = [];

interface StudyPageProps {
  readonly scope?: StudyScope;
  readonly conceptId?: string | null;
}

export function StudyPage({
  scope = DEFAULT_STUDY_SCOPE,
  conceptId = null,
}: StudyPageProps) {
  const {
    snapshot,
    markLearnedPermanently: markLearnedPermanentlyFromContext,
    recordReview,
  } = useProgress();
  const markLearnedPermanently =
    markLearnedPermanentlyFromContext ??
    (async () => {
      throw new Error("Manual learned settings are unavailable in this view.");
    });
  const nowMs = useNow(30 * 1000);
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  const [recentCardIds, setRecentCardIds] = useState<string[]>([]);
  const [pendingReviewEvents, setPendingReviewEvents] = useState<ReviewEvent[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [studyAhead, setStudyAhead] = useState(false);
  const currentCardPhase = useRef<StudyCardPhase>("unanswered");
  const previousScopeKey = useRef(scopeKeyFor(scope));
  const conceptCardIds = useMemo(() => {
    if (conceptId === null) return undefined;
    const concept = knowledgeConceptById.get(conceptId);
    return new Set(concept?.linkedCardIds ?? []);
  }, [conceptId]);

  const settings = snapshot?.settings ?? DEFAULT_APP_SETTINGS;
  const persistedReviews = snapshot?.reviewEvents ?? EMPTY_REVIEWS;
  const manualLearned = useMemo(
    () => getEffectiveManualLearned(snapshot?.manualLearnedOverrides),
    [snapshot?.manualLearnedOverrides],
  );
  const effectiveReviews = useMemo(() => {
    const persistedIds = new Set(persistedReviews.map((review) => review.id));
    const pending = pendingReviewEvents.filter(
      (review) => !persistedIds.has(review.id),
    );
    return sortReviewEventsChronologically([...persistedReviews, ...pending]);
  }, [pendingReviewEvents, persistedReviews]);
  const scheduler = useMemo(
    () =>
      deriveExamSrsSnapshot(
        cards,
        effectiveReviews,
        settings,
        nowMs,
        manualLearned.cardIds,
      ),
    [effectiveReviews, manualLearned.cardIds, nowMs, settings],
  );
  const prerequisiteReadiness = useMemo(
    () =>
      deriveCardPrerequisiteReadiness(
        cards,
        scheduler,
        undefined,
        manualLearned.coveredConceptIds,
      ),
    [manualLearned.coveredConceptIds, scheduler],
  );
  const scopedNextCard = useMemo(
    () =>
      selectScopedNextCard({
        cards,
        scheduler,
        scope,
        candidateCardIds: conceptCardIds,
        nowMs,
        recentlyShownCardIds: recentCardIds,
        studyAhead,
        newCardPrerequisiteReadyByCardId: prerequisiteReadiness,
      }),
    [
      conceptCardIds,
      nowMs,
      prerequisiteReadiness,
      recentCardIds,
      scheduler,
      scope,
      studyAhead,
    ],
  );

  // Once a persisted review reaches the provider snapshot, the local event
  // bridge is no longer needed. It prevents the next selection from reading
  // the stale pre-review snapshot during React's batched update.
  useEffect(() => {
    const persistedIds = new Set(persistedReviews.map((review) => review.id));
    setPendingReviewEvents((pending) =>
      pending.filter((review) => !persistedIds.has(review.id)),
    );
  }, [persistedReviews]);

  useEffect(() => {
    const nextScopeKey = scopeKeyFor(scope) + ":" + (conceptId ?? "all");
    if (previousScopeKey.current === nextScopeKey) {
      return;
    }

    previousScopeKey.current = nextScopeKey;
    setStudyAhead(false);

    // A recall card that is merely revealed has not produced a persisted review
    // yet, so it can be replaced. An authored MCQ has a pending save as soon as
    // its result is revealed; keep that result stable until it is saved and
    // advanced, including when the save needs a retry.
    if (
      currentCardPhase.current === "unanswered" ||
      currentCardPhase.current === "revealed"
    ) {
      setCurrentCardId(null);
    }
  }, [conceptId, scope]);

  useEffect(() => {
    if (currentCardId === null && scopedNextCard.selection !== null) {
      setCurrentCardId(scopedNextCard.selection.card.id);
    }
  }, [currentCardId, scopedNextCard.selection]);

  const handleCardPhaseChange = useCallback((phase: StudyCardPhase) => {
    currentCardPhase.current = phase;
  }, []);

  const changeScope = useCallback((nextScope: StudyScope) => {
    const nextHash = buildStudyHash(nextScope).slice(1);
    if (window.location.hash !== nextHash) {
      // Hash navigation updates the route without a full document load and is
      // safe for static GitHub Pages hosting.
      window.location.hash = nextHash;
    }
  }, []);

  if (snapshot === null) {
    return null;
  }

  const displayCardId = currentCardId ?? scopedNextCard.selection?.card.id ?? null;
  const currentCard = cards.find((card) => card.id === displayCardId);
  const currentState = currentCard
    ? scheduler.stateByCardId[currentCard.id]
    : undefined;
  const currentReason = currentState
    ? getStudyReason(currentState, nowMs, studyAhead && !currentState.isDue)
    : scopedNextCard.selection?.reason;
  const focusLabel = getStudyScopeLabel(scope, deck.metadata.chapterNames);

  const submitReview = async (input: Omit<NewReviewEvent, "cardId">): Promise<void> => {
    if (currentCard === undefined) {
      return;
    }

    const result = await recordReview({ ...input, cardId: currentCard.id });
    setPendingReviewEvents((events) => [
      ...events.filter((event) => event.id !== result.event.id),
      result.event,
    ]);
    setRecentCardIds((ids) =>
      [currentCard.id, ...ids.filter((id) => id !== currentCard.id)].slice(
        0,
        RECENT_CARD_LIMIT,
      ),
    );
    setSessionCount((count) => count + 1);
  };

  const finishCard = () => {
    if (currentCard === undefined) {
      return;
    }

    currentCardPhase.current = "unanswered";
    // Do not calculate a queue here. Clearing the displayed card lets the next
    // render select from the newly persisted history and recent-card guard.
    setCurrentCardId(null);
  };

  const markCurrentCardLearned = async () => {
    if (currentCard === undefined) return;
    await markLearnedPermanently("card", currentCard.id);
    currentCardPhase.current = "unanswered";
    setCurrentCardId(null);
  };

  const studyAheadAnyway = () => {
    if (scopedNextCard.nextDueAt === null) {
      return;
    }

    setStudyAhead(true);
    currentCardPhase.current = "unanswered";
    setCurrentCardId(null);
  };

  const showEmptyState = currentCard === undefined && scopedNextCard.selection === null;

  return (
    <div className="page-stack study-page">
      <section className="page-heading study-heading">
        <div>
          <p className="eyebrow">Exam-SRS · dynamic next-card selection</p>
          <h1>One card at a time.</h1>
          <p className="lede">
            <KnowledgeText text="Every saved review changes the next choice. New cards protect coverage; failures return quickly without being repeated immediately." />
          </p>
        </div>
        <div className="session-counter" aria-live="polite">
          <strong>{sessionCount}</strong>
          <span>reviewed this session</span>
        </div>
      </section>

      <StudyFocusControls
        scope={scope}
        counts={scopedNextCard.counts}
        chapterNames={deck.metadata.chapterNames}
        onScopeChange={changeScope}
      />

      {currentCard ? (
        <>
          <div className="study-status-row" aria-live="polite">
            <span className="study-focus-status">Focus: {focusLabel}</span>
            <span className="study-reason">Reason: {currentReason}</span>
            <span className="study-phase">
              {scheduler.phase === "cram"
                ? "Before study deadline"
                : scheduler.phase === "buffer"
                  ? "Buffer period"
                  : scheduler.phase === "post_exam"
                    ? "Maintenance"
                    : "No exam target"}
            </span>
          </div>
          <StudyCard
            card={currentCard}
            testedConceptIds={cardConceptMap[currentCard.id] ?? []}
            key={currentCard.id}
            onSubmitReview={submitReview}
            onFinish={finishCard}
            onPhaseChange={handleCardPhaseChange}
            onMarkLearnedPermanently={markCurrentCardLearned}
          />
        </>
      ) : showEmptyState ? (
        <section className="empty-study callout callout-accent">
          <div>
            <p className="section-kicker">
              {scopedNextCard.status === "caught_up" ? "Caught up" : "Study focus"}
            </p>
            <h2>
              {getScopedStatusMessage(
                scopedNextCard.status,
                scopedNextCard.emptyReason,
                scope.preset,
              )}
            </h2>
            {scopedNextCard.status === "caught_up" ? (
              scopedNextCard.nextDueAt !== null ? (
                <p>
                  Next matching review: {formatLocalDateTime(scopedNextCard.nextDueAt)}.
                </p>
              ) : (
                <p>There are no scheduled reviews in this focus yet.</p>
              )
            ) : scopedNextCard.emptyReason === "no_unseen_cards" ? (
              <p>Every card matching this chapter and content focus has been seen.</p>
            ) : scopedNextCard.emptyReason === "no_matching_cards" ? (
              <p>Try another preset or chapter to find matching canonical cards.</p>
            ) : (
              <p>No cards are currently in the selected learning state.</p>
            )}
            {scopedNextCard.status === "caught_up" &&
              scopedNextCard.nextDueAt !== null && (
                <p>
                  Spacing is still useful, but you can choose to study ahead whenever
                  you have extra time.
                </p>
              )}
          </div>
          {scopedNextCard.status === "caught_up" &&
            scopedNextCard.nextDueAt !== null && (
              <button
                className="primary-button"
                type="button"
                onClick={studyAheadAnyway}
              >
                Study ahead anyway
              </button>
            )}
        </section>
      ) : null}
    </div>
  );
}

function scopeKeyFor(scope: StudyScope): string {
  return `${scope.preset}:${scope.chapter === null ? "all" : scope.chapter}`;
}
