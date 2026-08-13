import type { Flashcard } from "../domain/content";
import type { KnowledgeConcept, KnowledgeConceptStatus } from "./model";
import type { ExamSrsCardState, ExamSrsSnapshot } from "../study/examSrs/model";
import type { AppSettings, ReviewEvent } from "../domain/progress";
import { deriveCardState, deriveReviewEvidence } from "../study/examSrs/deriveState";
import { knowledgeConceptById, knowledgeConcepts } from "./data";
import { cardConceptMap } from "./contentMap";
import {
  getGuidedCheckSkillsForConcept,
  guidedKnowledgeCheckSkills,
} from "./guided/checks";

export type ConceptStatusMap = ReadonlyMap<string, KnowledgeConceptStatus>;

export type GuidedCheckStateMap = Readonly<Record<string, ExamSrsCardState>>;

export function deriveGuidedCheckStates(
  reviews: readonly ReviewEvent[],
  settings: AppSettings,
  nowMs: number,
): GuidedCheckStateMap {
  return Object.fromEntries(
    guidedKnowledgeCheckSkills.map((skill) => [
      skill.id,
      deriveCardState(
        skill.id,
        reviews.filter((review) => review.cardId === skill.id),
        settings,
        nowMs,
      ),
    ]),
  );
}

export function deriveConceptStatuses(
  scheduler: Pick<ExamSrsSnapshot, "stateByCardId">,
  concepts: readonly KnowledgeConcept[] = knowledgeConcepts,
  guidedCheckStates: GuidedCheckStateMap = {},
): ConceptStatusMap {
  return new Map(
    concepts.map((concept) => [
      concept.id,
      deriveStatusForConcept(concept, scheduler.stateByCardId, guidedCheckStates),
    ]),
  );
}

export function deriveCardPrerequisiteReadiness(
  cards: readonly Flashcard[],
  scheduler: Pick<ExamSrsSnapshot, "stateByCardId">,
  concepts: readonly KnowledgeConcept[] = knowledgeConcepts,
): ReadonlyMap<string, boolean> {
  return createCardPrerequisiteReadinessTracker(cards, scheduler, concepts)
    .readinessByCardId;
}

export interface CardPrerequisiteReadinessTracker {
  readonly readinessByCardId: ReadonlyMap<string, boolean>;
  readonly markCardSeen: (cardId: string) => void;
}

/**
 * Incremental form of the scheduler's prerequisite guidance. A prerequisite
 * becomes non-blocking as soon as one of its linked cards has review evidence;
 * due/strength labels do not change that particular gate. The ordinary helper
 * above uses the same boundary, while forecast simulation updates it without
 * rescanning the full knowledge graph after every synthetic review.
 */
export function createCardPrerequisiteReadinessTracker(
  cards: readonly Flashcard[],
  scheduler: Pick<ExamSrsSnapshot, "stateByCardId">,
  concepts: readonly KnowledgeConcept[] = knowledgeConcepts,
): CardPrerequisiteReadinessTracker {
  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
  const seenCardIds = new Set(
    Object.values(scheduler.stateByCardId)
      .filter((state) => state.reviewCount > 0)
      .map((state) => state.cardId),
  );
  const readinessByCardId = new Map<string, boolean>();
  const dependentCardsByPrerequisiteCardId = new Map<string, Set<string>>();

  const isPrerequisiteReady = (prerequisiteId: string): boolean => {
    const concept = conceptById.get(prerequisiteId);
    if (concept === undefined || concept.linkedCardIds.length === 0) {
      return true;
    }
    return concept.linkedCardIds.some((cardId) => seenCardIds.has(cardId));
  };

  const updateCardReadiness = (card: Flashcard): void => {
    const conceptIds = cardConceptMap[card.id] ?? [];
    const ready = conceptIds.every((conceptId) => {
      const concept = conceptById.get(conceptId);
      return concept?.prerequisites.every(isPrerequisiteReady) ?? true;
    });
    readinessByCardId.set(card.id, ready);
  };

  for (const card of cards) {
    const conceptIds = cardConceptMap[card.id] ?? [];
    for (const conceptId of conceptIds) {
      const concept = conceptById.get(conceptId);
      for (const prerequisiteId of concept?.prerequisites ?? []) {
        const prerequisite = conceptById.get(prerequisiteId);
        for (const linkedCardId of prerequisite?.linkedCardIds ?? []) {
          const dependents =
            dependentCardsByPrerequisiteCardId.get(linkedCardId) ?? new Set<string>();
          dependents.add(card.id);
          dependentCardsByPrerequisiteCardId.set(linkedCardId, dependents);
        }
      }
    }
    updateCardReadiness(card);
  }

  return {
    readinessByCardId,
    markCardSeen: (cardId) => {
      if (seenCardIds.has(cardId)) return;
      seenCardIds.add(cardId);
      for (const dependentCardId of dependentCardsByPrerequisiteCardId.get(cardId) ??
        []) {
        const dependent = cards.find((card) => card.id === dependentCardId);
        if (dependent !== undefined) updateCardReadiness(dependent);
      }
    },
  };
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

/**
 * Guided progression uses a weaker, event-derived threshold than the
 * learner-facing `solid` label. A positive retrieval attempt is enough to
 * introduce a concept; it is not evidence that the concept is mastered.
 */
export function isConceptIntroducedEnough(
  conceptId: string,
  reviews: readonly ReviewEvent[],
): boolean {
  const concept = knowledgeConceptById.get(conceptId);
  if (concept === undefined) return false;
  const reviewIds =
    concept.linkedCardIds.length > 0
      ? new Set(concept.linkedCardIds)
      : new Set(getGuidedCheckSkillsForConcept(conceptId).map((skill) => skill.id));
  return reviews.some((review) => {
    const evidence = deriveReviewEvidence(review);
    return (
      reviewIds.has(review.cardId) &&
      evidence !== null &&
      evidence.outcome !== "failure"
    );
  });
}

export function hasPositiveReviewEvidence(
  cardId: string,
  reviews: readonly ReviewEvent[],
): boolean {
  return reviews.some((review) => {
    const evidence = deriveReviewEvidence(review);
    return (
      review.cardId === cardId && evidence !== null && evidence.outcome !== "failure"
    );
  });
}

/** Learner-facing curriculum semantics: no-card foundations still need teaching. */
export function conceptNeedsFoundationLearning(
  conceptId: string,
  statuses: ConceptStatusMap,
): boolean {
  const concept = knowledgeConceptById.get(conceptId);
  if (concept === undefined) return true;
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
  guidedCheckStates: GuidedCheckStateMap,
): KnowledgeConceptStatus {
  if (concept.linkedCardIds.length === 0) {
    const skills = getGuidedCheckSkillsForConcept(concept.id);
    const states = skills
      .map((skill) => guidedCheckStates[skill.id])
      .filter((state): state is ExamSrsCardState => state !== undefined);
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
      states.length === skills.length &&
      states.every((state) => state.learningState === "learned")
    ) {
      return "solid";
    }
    return "learning";
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
