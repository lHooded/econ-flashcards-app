import type { Flashcard } from "../../domain/content";
import type { AppSettings, ReviewEvent } from "../../domain/progress";
import {
  getExamSrsPriority,
  getExamSrsStatePriority,
  selectNextCardFromSnapshot,
} from "../../study/examSrs/selector";
import { deriveExamSrsSnapshot } from "../../study/examSrs/deriveState";
import type { ExamSrsCardState, ExamSrsSnapshot } from "../../study/examSrs/model";
import {
  deriveCardPrerequisiteReadiness,
  deriveGuidedCheckStates,
  isConceptIntroducedEnough,
} from "../mastery";
import { cardConceptMap } from "../contentMap";
import { knowledgeConceptById } from "../data";
import { getLearningPath, prerequisiteTopologicalOrder } from "../graph";
import {
  getGuidedCheckSkillsForConcept,
  guidedKnowledgeCheckSkillById,
} from "./checks";
import type { GuidedKnowledgeCheckSkill } from "./model";

export type GuidedReason =
  | "new-prerequisite"
  | "new-exam-concept"
  | "due-review"
  | "weak-review"
  | "relearning"
  | "high-yield"
  | "prerequisite-for-selected-card"
  | "idle";

export type GuidedStep =
  | GuidedLessonStep
  | GuidedKnowledgeCheckStep
  | GuidedCanonicalCardStep
  | GuidedIdleStep;

export interface GuidedLessonStep {
  readonly kind: "lesson";
  readonly conceptId: string;
  readonly targetCardId: string | null;
  readonly targetConceptIds: readonly string[];
  readonly reason: GuidedReason;
}

export interface GuidedKnowledgeCheckStep {
  readonly kind: "knowledge-check";
  readonly skill: GuidedKnowledgeCheckSkill;
  readonly state: ExamSrsCardState;
  readonly reason: GuidedReason;
  readonly targetCardId: string | null;
  readonly targetConceptIds: readonly string[];
}

export interface GuidedCanonicalCardStep {
  readonly kind: "canonical-card";
  readonly card: Flashcard;
  readonly state: ExamSrsCardState;
  readonly reason: GuidedReason;
  readonly targetConceptIds: readonly string[];
}

export interface GuidedIdleStep {
  readonly kind: "idle";
  readonly nextDueAt: string | null;
  readonly reason: "idle";
}

export interface SelectGuidedNextStepInput {
  readonly cards: readonly Flashcard[];
  readonly reviews: readonly ReviewEvent[];
  readonly settings: AppSettings;
  readonly nowMs: number;
  readonly lessonCompletedConceptIds?: ReadonlySet<string>;
  readonly recentlyShownIds?: readonly string[];
  readonly sessionSeed?: number;
}

export interface GuidedSelectionContext {
  readonly scheduler: ExamSrsSnapshot;
  readonly guidedCheckStates: Readonly<Record<string, ExamSrsCardState>>;
}

const RECENT_LIMIT = 3;

/**
 * Select one small, recomputable Guided Cram action. Canonical Exam-SRS is
 * selected first. The graph only inserts a lesson/check before an unseen
 * canonical anchor; it never gates an urgent canonical review.
 */
export function selectGuidedNextStep(input: SelectGuidedNextStepInput): GuidedStep {
  const context = deriveGuidedSelectionContext(input);
  const readiness = deriveCardPrerequisiteReadiness(input.cards, context.scheduler);
  const canonical = selectNextCardFromSnapshot({
    cards: input.cards,
    scheduler: context.scheduler,
    nowMs: input.nowMs,
    recentlyShownCardIds: input.recentlyShownIds,
    newCardPrerequisiteReadyByCardId: readiness,
  });
  const dueCheck = chooseDueCheck(input, context, canonical);
  if (dueCheck !== null) return dueCheck;

  if (canonical.selection === null) {
    return {
      kind: "idle",
      nextDueAt: canonical.nextDueAt,
      reason: "idle",
    };
  }

  const selected = canonical.selection;
  if (selected.state.learningState !== "unseen") {
    return {
      kind: "canonical-card",
      card: selected.card,
      state: selected.state,
      reason: reasonForState(selected.state),
      targetConceptIds: cardConceptMap[selected.card.id] ?? [],
    };
  }

  const targetConceptIds = cardConceptMap[selected.card.id] ?? [];
  const path = orderedUnique(
    targetConceptIds.flatMap((conceptId) => getLearningPath(conceptId)),
  );
  const lessonCompleted = input.lessonCompletedConceptIds ?? new Set<string>();
  for (const conceptId of path) {
    if (isConceptIntroducedEnough(conceptId, input.reviews)) continue;

    const concept = knowledgeConceptById.get(conceptId);
    if (concept === undefined) continue;
    const reason: GuidedReason = targetConceptIds.includes(conceptId)
      ? "new-exam-concept"
      : "new-prerequisite";
    if (!lessonCompleted.has(conceptId)) {
      return {
        kind: "lesson",
        conceptId,
        targetCardId: selected.card.id,
        targetConceptIds,
        reason,
      };
    }

    const skills = getGuidedCheckSkillsForConcept(conceptId);
    const skill = skills[0];
    if (skill !== undefined) {
      const state = context.guidedCheckStates[skill.id];
      if (state !== undefined && (state.reviewCount === 0 || state.isDue)) {
        return {
          kind: "knowledge-check",
          skill,
          state,
          reason,
          targetCardId: selected.card.id,
          targetConceptIds,
        };
      }
      // A failed, not-yet-due check must not be repeated immediately. The
      // final canonical fallback below keeps the curriculum moving.
      continue;
    }

    // A card can intentionally provide evidence for a small concept bundle.
    // Do not surface that card after introducing only the first target in the
    // topological order; let the loop teach each remaining target concept
    // before the shared retrieval question appears.
    if (targetConceptIds.includes(conceptId)) continue;
    const linked = chooseLinkedCanonicalCard(
      concept.linkedCardIds,
      input,
      context,
      selected.card.id,
    );
    if (linked !== null) {
      return {
        kind: "canonical-card",
        card: linked.card,
        state: linked.state,
        reason: "prerequisite-for-selected-card",
        targetConceptIds: cardConceptMap[linked.card.id] ?? [conceptId],
      };
    }
  }

  return {
    kind: "canonical-card",
    card: selected.card,
    state: selected.state,
    reason: selected.card.tags.includes("high-yield")
      ? "high-yield"
      : "new-exam-concept",
    targetConceptIds,
  };
}

export function deriveGuidedSelectionContext(
  input: SelectGuidedNextStepInput,
): GuidedSelectionContext {
  return {
    scheduler: deriveExamSrsSnapshot(
      input.cards,
      input.reviews,
      input.settings,
      input.nowMs,
    ),
    guidedCheckStates: deriveGuidedCheckStates(
      input.reviews,
      input.settings,
      input.nowMs,
    ),
  };
}

function chooseDueCheck(
  input: SelectGuidedNextStepInput,
  context: GuidedSelectionContext,
  canonical: ReturnType<typeof selectNextCardFromSnapshot>,
): GuidedKnowledgeCheckStep | null {
  const recent = new Set((input.recentlyShownIds ?? []).slice(0, RECENT_LIMIT));
  const candidates = [...guidedKnowledgeCheckSkillById.values()]
    .map((skill) => ({ skill, state: context.guidedCheckStates[skill.id] }))
    .filter(
      (
        candidate,
      ): candidate is { skill: GuidedKnowledgeCheckSkill; state: ExamSrsCardState } =>
        candidate.state !== undefined &&
        candidate.state.reviewCount > 0 &&
        candidate.state.isDue,
    );
  if (candidates.length === 0) return null;
  const nonRecent = candidates.filter((candidate) => !recent.has(candidate.skill.id));
  const pool = nonRecent.length > 0 ? nonRecent : candidates;
  const selected = [...pool].sort(
    (left, right) =>
      getExamSrsStatePriority(right.state, input.nowMs) -
        getExamSrsStatePriority(left.state, input.nowMs) ||
      compareDate(left.state.dueAt, right.state.dueAt) ||
      left.skill.id.localeCompare(right.skill.id),
  )[0];
  if (selected === undefined) return null;

  const canonicalPriority =
    canonical.selection === null
      ? -Infinity
      : getExamSrsPriority({
          card: canonical.selection.card,
          state: canonical.selection.state,
          cards: input.cards,
          scheduler: context.scheduler,
          nowMs: input.nowMs,
        });
  const checkPriority = getExamSrsStatePriority(selected.state, input.nowMs);
  // Canonical Exam-SRS remains the coverage anchor on ties. A guided check
  // can interrupt it only when its own numeric urgency is strictly higher.
  if (checkPriority <= canonicalPriority) return null;
  return {
    kind: "knowledge-check",
    skill: selected.skill,
    state: selected.state,
    reason: reasonForState(selected.state),
    targetCardId: null,
    targetConceptIds: [selected.skill.conceptId],
  };
}

function chooseLinkedCanonicalCard(
  linkedCardIds: readonly string[],
  input: SelectGuidedNextStepInput,
  context: GuidedSelectionContext,
  currentCardId: string,
): { readonly card: Flashcard; readonly state: ExamSrsCardState } | null {
  const candidates = new Set(linkedCardIds);
  const selection = selectNextCardFromSnapshot({
    cards: input.cards,
    scheduler: context.scheduler,
    nowMs: input.nowMs,
    candidateCardIds: candidates,
    recentlyShownCardIds: input.recentlyShownIds,
  }).selection;
  if (selection === null) return null;
  if (selection.card.id === currentCardId && linkedCardIds.length > 1) {
    const alternative = input.cards.find(
      (card) =>
        candidates.has(card.id) &&
        card.id !== currentCardId &&
        context.scheduler.stateByCardId[card.id]?.learningState === "unseen",
    );
    if (alternative !== undefined) {
      const state = context.scheduler.stateByCardId[alternative.id];
      if (state !== undefined) return { card: alternative, state };
    }
  }
  return { card: selection.card, state: selection.state };
}

function orderedUnique(ids: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const unique = ids.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const order = new Map(prerequisiteTopologicalOrder.map((id, index) => [id, index]));
  return unique.sort(
    (left, right) =>
      (order.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
}

function reasonForState(state: ExamSrsCardState): GuidedReason {
  switch (state.learningState) {
    case "relearning":
      return "relearning";
    case "weak":
      return "weak-review";
    case "unseen":
      return "new-exam-concept";
    case "learning":
    case "learned":
      return "due-review";
  }
}

function compareDate(left: string | null, right: string | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return Date.parse(left) - Date.parse(right);
}
