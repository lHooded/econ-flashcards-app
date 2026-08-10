import { useEffect, useMemo, useState } from "react";
import { useProgress } from "../app/progressContext";
import { cards } from "../data/deck";
import {
  DEFAULT_APP_SETTINGS,
  sortReviewEventsChronologically,
  type NewReviewEvent,
  type ReviewEvent,
} from "../domain/progress";
import { StudyCard } from "../components/StudyCard";
import { deriveExamSrsSnapshot } from "../study/examSrs/deriveState";
import { getStudyReason, selectNextCardFromSnapshot } from "../study/examSrs/selector";
import { formatLocalDateTime } from "../utils/date";
import { useNow } from "../utils/useNow";

const RECENT_CARD_LIMIT = 3;
const EMPTY_REVIEWS: readonly ReviewEvent[] = [];

export function StudyPage() {
  const { snapshot, recordReview } = useProgress();
  const nowMs = useNow(30 * 1000);
  const [currentCardId, setCurrentCardId] = useState<string | null>(null);
  const [recentCardIds, setRecentCardIds] = useState<string[]>([]);
  const [pendingReviewEvents, setPendingReviewEvents] = useState<ReviewEvent[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [studyAhead, setStudyAhead] = useState(false);

  const settings = snapshot?.settings ?? DEFAULT_APP_SETTINGS;
  const persistedReviews = snapshot?.reviewEvents ?? EMPTY_REVIEWS;
  const effectiveReviews = useMemo(() => {
    const persistedIds = new Set(persistedReviews.map((review) => review.id));
    const pending = pendingReviewEvents.filter(
      (review) => !persistedIds.has(review.id),
    );
    return sortReviewEventsChronologically([...persistedReviews, ...pending]);
  }, [pendingReviewEvents, persistedReviews]);
  const scheduler = useMemo(
    () => deriveExamSrsSnapshot(cards, effectiveReviews, settings, nowMs),
    [effectiveReviews, nowMs, settings],
  );
  const nextCard = useMemo(
    () =>
      selectNextCardFromSnapshot({
        cards,
        scheduler,
        nowMs,
        recentlyShownCardIds: recentCardIds,
        studyAhead,
      }),
    [nowMs, recentCardIds, scheduler, studyAhead],
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
    if (currentCardId === null && nextCard.selection !== null) {
      setCurrentCardId(nextCard.selection.card.id);
    }
  }, [currentCardId, nextCard.selection]);

  if (snapshot === null) {
    return null;
  }

  const displayCardId = currentCardId ?? nextCard.selection?.card.id ?? null;
  const currentCard = cards.find((card) => card.id === displayCardId);
  const currentState = currentCard
    ? scheduler.stateByCardId[currentCard.id]
    : undefined;
  const currentReason = currentState
    ? getStudyReason(currentState, nowMs, studyAhead && !currentState.isDue)
    : nextCard.selection?.reason;

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

    // Do not calculate a queue here. Clearing the displayed card lets the next
    // render select from the newly persisted history and recent-card guard.
    setCurrentCardId(null);
  };

  const studyAheadAnyway = () => {
    setStudyAhead(true);
    setCurrentCardId(null);
  };

  return (
    <div className="page-stack study-page">
      <section className="page-heading study-heading">
        <div>
          <p className="eyebrow">Exam-SRS · dynamic next-card selection</p>
          <h1>One card at a time.</h1>
          <p className="lede">
            Every saved review changes the next choice. New cards protect coverage;
            failures return quickly without being repeated immediately.
          </p>
        </div>
        <div className="session-counter" aria-live="polite">
          <strong>{sessionCount}</strong>
          <span>reviewed this session</span>
        </div>
      </section>

      {currentCard ? (
        <>
          <div className="study-status-row" aria-live="polite">
            <span className="study-reason">{currentReason}</span>
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
            key={currentCard.id}
            onSubmitReview={submitReview}
            onFinish={finishCard}
          />
        </>
      ) : (
        <section className="empty-study callout callout-accent">
          <div>
            <p className="section-kicker">Caught up</p>
            <h2>You’re caught up for now.</h2>
            {nextCard.nextDueAt !== null ? (
              <p>Next scheduled review: {formatLocalDateTime(nextCard.nextDueAt)}.</p>
            ) : (
              <p>There are no scheduled reviews yet.</p>
            )}
            <p>
              Spacing is still useful, but you can choose to study ahead whenever you
              have extra time.
            </p>
          </div>
          <button className="primary-button" type="button" onClick={studyAheadAnyway}>
            Study ahead anyway
          </button>
        </section>
      )}
    </div>
  );
}
