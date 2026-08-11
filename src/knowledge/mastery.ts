import type { Flashcard } from "../domain/content";
import type { KnowledgeConcept, KnowledgeConceptStatus } from "./model";
import type { ExamSrsCardState, ExamSrsSnapshot } from "../study/examSrs/model";
import { knowledgeConceptById, knowledgeConcepts } from "./data";
import { cardConceptMap } from "./contentMap";

export type ConceptStatusMap = ReadonlyMap<string, KnowledgeConceptStatus>;

export function deriveConceptStatuses(
  scheduler: Pick<ExamSrsSnapshot, "stateByCardId">,
  concepts: readonly KnowledgeConcept[] = knowledgeConcepts,
): ConceptStatusMap {
  return new Map(
    concepts.map((concept) => [
      concept.id,
      deriveStatusForConcept(concept, scheduler.stateByCardId),
    ]),
  );
}

export function deriveCardPrerequisiteReadiness(
  cards: readonly Flashcard[],
  scheduler: Pick<ExamSrsSnapshot, "stateByCardId">,
  concepts: readonly KnowledgeConcept[] = knowledgeConcepts,
): ReadonlyMap<string, boolean> {
  const statuses = deriveConceptStatuses(scheduler, concepts);
  return new Map(
    cards.map((card) => {
      const conceptIds = cardConceptMap[card.id] ?? [];
      const ready = conceptIds.every((conceptId) => {
        const concept = knowledgeConceptById.get(conceptId);
        return (
          concept?.prerequisites.every((prerequisiteId) =>
            isPrerequisiteNonBlockingForScheduler(prerequisiteId, statuses),
          ) ?? true
        );
      });
      return [card.id, ready];
    }),
  );
}

/**
 * Scheduler guidance only. A background concept with no reviewable card cannot
 * block a canonical card from ever being selected.
 */
export function isPrerequisiteNonBlockingForScheduler(
  conceptId: string,
  statuses: ConceptStatusMap,
): boolean {
  // A concept with no linked card has no review evidence to wait for. It is
  // treated as an introduced background assumption, preventing deadlock.
  const concept = knowledgeConceptById.get(conceptId);
  if (concept === undefined || concept.linkedCardIds.length === 0) {
    return true;
  }
  return statuses.get(conceptId) !== "unseen";
}

/** Learner-facing curriculum semantics: no-card foundations still need teaching. */
export function conceptNeedsFoundationLearning(
  conceptId: string,
  statuses: ConceptStatusMap,
): boolean {
  const concept = knowledgeConceptById.get(conceptId);
  if (concept === undefined || concept.linkedCardIds.length === 0) return true;
  return statuses.get(conceptId) !== "solid";
}

export function deriveFoundationCurriculum(
  topologicalOrder: readonly string[],
  statuses: ConceptStatusMap,
): readonly string[] {
  return Object.freeze(
    topologicalOrder.filter(
      (conceptId) =>
        knowledgeConceptById.get(conceptId)?.tags.includes("foundation") === true &&
        conceptNeedsFoundationLearning(conceptId, statuses),
    ),
  );
}

/** Backwards-compatible single recommendation for existing callers. */
export function deriveFoundationLearningPath(
  topologicalOrder: readonly string[],
  statuses: ConceptStatusMap,
): string | null {
  return deriveFoundationCurriculum(topologicalOrder, statuses)[0] ?? null;
}

/** @deprecated Use the explicit scheduler/curriculum functions above. */
export const isConceptReady = isPrerequisiteNonBlockingForScheduler;

function deriveStatusForConcept(
  concept: KnowledgeConcept,
  statesByCardId: Readonly<Record<string, ExamSrsCardState>>,
): KnowledgeConceptStatus {
  if (concept.linkedCardIds.length === 0) {
    return "unseen";
  }

  const states = concept.linkedCardIds
    .map((cardId) => statesByCardId[cardId])
    .filter((state): state is ExamSrsCardState => state !== undefined);
  const hasMissingCardEvidence = states.length < concept.linkedCardIds.length;
  if (states.length === 0 || states.every((state) => state.reviewCount === 0)) {
    return "unseen";
  }
  if (
    states.some(
      (state) =>
        state.learningState === "relearning" ||
        state.learningState === "weak" ||
        state.isDue,
    )
  ) {
    return "needs-work";
  }
  if (
    !hasMissingCardEvidence &&
    states.every((state) => state.learningState === "learned")
  ) {
    return "solid";
  }
  return "learning";
}
