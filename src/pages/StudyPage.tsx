import { useState } from "react";
import { useProgress } from "../app/progressContext";
import { cards } from "../data/deck";
import type { NewReviewEvent } from "../domain/progress";
import { StudyCard } from "../components/StudyCard";
import { buildUnscheduledStudyQueue } from "../study/unscheduledStudyQueue";

export function StudyPage() {
  const { snapshot, recordReview } = useProgress();
  const [remainingCardIds, setRemainingCardIds] = useState<string[]>(() =>
    buildUnscheduledStudyQueue(cards, snapshot?.cardStates ?? {}).map(
      (card) => card.id,
    ),
  );
  const [sessionCount, setSessionCount] = useState(0);

  // Keep this pass stable after a review. The current card must remain visible
  // until the learner has read its result and explicitly advances.
  const currentCard = cards.find((card) => card.id === remainingCardIds[0]);

  if (snapshot === null) {
    return null;
  }

  const submitReview = async (input: Omit<NewReviewEvent, "cardId">): Promise<void> => {
    if (currentCard === undefined) {
      return;
    }
    await recordReview({ ...input, cardId: currentCard.id });
  };

  const finishCard = () => {
    if (currentCard === undefined) {
      return;
    }
    setRemainingCardIds((ids) => ids.filter((id) => id !== currentCard.id));
    setSessionCount((count) => count + 1);
  };

  const restartSession = () => {
    setRemainingCardIds(
      buildUnscheduledStudyQueue(cards, snapshot.cardStates).map((card) => card.id),
    );
    setSessionCount(0);
  };

  return (
    <div className="page-stack study-page">
      <section className="page-heading study-heading">
        <div>
          <p className="eyebrow">Unscheduled study queue</p>
          <h1>One card at a time.</h1>
          <p className="lede">
            Unseen cards come first, followed by seen cards in stable chapter and ID
            order. This is a transparent baseline, not Exam-SRS.
          </p>
        </div>
        <div className="session-counter" aria-live="polite">
          <strong>{sessionCount}</strong>
          <span>reviewed this session</span>
        </div>
      </section>

      {currentCard ? (
        <StudyCard
          card={currentCard}
          key={currentCard.id}
          onSubmitReview={submitReview}
          onFinish={finishCard}
        />
      ) : (
        <section className="empty-study callout callout-accent">
          <div>
            <p className="section-kicker">Queue complete</p>
            <h2>You’ve reviewed every card in this pass.</h2>
            <p>
              Keep going with another unscheduled pass, or take a break. Your saved
              history is still available in Settings / Data.
            </p>
          </div>
          <button className="primary-button" type="button" onClick={restartSession}>
            Start another pass
          </button>
        </section>
      )}
    </div>
  );
}
