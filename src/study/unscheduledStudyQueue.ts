import type { Flashcard } from "../domain/content";
import type { CardState } from "../domain/progress";

/**
 * Baseline queue for the first PR. It is intentionally unscheduled: no due
 * dates, intervals, or readiness estimates are calculated here. Exam-SRS can
 * replace this module without changing persisted card content or UI state.
 */
export function buildUnscheduledStudyQueue(
  cards: readonly Flashcard[],
  cardStates: Readonly<Record<string, CardState>>,
  excludedCardIds: ReadonlySet<string> = new Set(),
): Flashcard[] {
  return [...cards]
    .filter((card) => !excludedCardIds.has(card.id))
    .sort((left, right) => {
      const leftSeen = cardStates[left.id]?.firstSeenAt ? 1 : 0;
      const rightSeen = cardStates[right.id]?.firstSeenAt ? 1 : 0;

      return (
        leftSeen - rightSeen ||
        left.chapter - right.chapter ||
        left.id.localeCompare(right.id)
      );
    });
}
