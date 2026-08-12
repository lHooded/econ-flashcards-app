import type { Flashcard } from "../../domain/content";
import type { AppSettings, ReviewEvent } from "../../domain/progress";
import {
  getExamSrsPriority,
  getExamSrsStatePriority,
  rankExamSrsCandidatesFromSnapshot,
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
  readonly whyNow?: readonly string[];
}

export interface GuidedKnowledgeCheckStep {
  readonly kind: "knowledge-check";
  readonly skill: GuidedKnowledgeCheckSkill;
  readonly state: ExamSrsCardState;
  readonly reason: GuidedReason;
  readonly targetCardId: string | null;
  readonly targetConceptIds: readonly string[];
  readonly whyNow?: readonly string[];
}

export interface GuidedCanonicalCardStep {
  readonly kind: "canonical-card";
  readonly card: Flashcard;
  readonly state: ExamSrsCardState;
  readonly reason: GuidedReason;
  readonly targetConceptIds: readonly string[];
  readonly whyNow?: readonly string[];
}

export interface GuidedIdleStep {
  readonly kind: "idle";
  readonly nextDueAt: string | null;
  readonly reason: "idle";
  readonly whyNow?: readonly string[];
}

export interface SelectGuidedNextStepInput {
  readonly cards: readonly Flashcard[];
  readonly reviews: readonly ReviewEvent[];
  readonly settings: AppSettings;
  readonly nowMs: number;
  readonly lessonSeenConceptIds?: ReadonlySet<string>;
  readonly recentlyShownIds?: readonly string[];
  readonly sessionSeed?: number;
  /** High-Yield Cram only: constrain the new-anchor policy, never urgent reviews. */
  readonly candidateCardIds?: ReadonlySet<string>;
}

export interface GuidedSelectionContext {
  readonly scheduler: ExamSrsSnapshot;
  readonly guidedCheckStates: Readonly<Record<string, ExamSrsCardState>>;
}

type GuidedAnchorResolution =
  | { readonly kind: "step"; readonly step: GuidedStep }
  | {
      readonly kind: "ready";
      readonly card: Flashcard;
      readonly state: ExamSrsCardState;
      readonly targetConceptIds: readonly string[];
    }
  | {
      readonly kind: "temporarily-blocked";
      readonly conceptId: string;
      readonly dueAt: string | null;
    };

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
    candidateCardIds: input.candidateCardIds,
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
    return canonicalCardStep(
      selected.card,
      selected.state,
      reasonForState(selected.state),
    );
  }

  const lessonSeen = input.lessonSeenConceptIds ?? new Set<string>();
  const rankedCandidates = rankExamSrsCandidatesFromSnapshot({
    cards: input.cards,
    scheduler: context.scheduler,
    nowMs: input.nowMs,
    recentlyShownCardIds: input.recentlyShownIds,
    newCardPrerequisiteReadyByCardId: readiness,
    candidateCardIds: input.candidateCardIds,
  });

  // Search the same deterministic Exam-SRS order. A blocked unseen anchor
  // yields to a useful independent branch, not to an arbitrary new card.
  for (const candidate of rankedCandidates) {
    if (candidate.state.learningState !== "unseen") {
      return canonicalCardStep(
        candidate.card,
        candidate.state,
        reasonForState(candidate.state),
      );
    }
    const resolution = prepareUnseenCanonicalCard(
      candidate.card,
      candidate.state,
      input,
      context,
      lessonSeen,
      new Set<string>(),
    );
    if (resolution.kind === "step") return resolution.step;
    if (resolution.kind === "ready") {
      const isSelected = candidate.card.id === selected.card.id;
      return canonicalCardStep(
        resolution.card,
        resolution.state,
        isSelected && resolution.card.tags.includes("high-yield")
          ? "high-yield"
          : isSelected
            ? "new-exam-concept"
            : candidate.card.tags.includes("high-yield")
              ? "high-yield"
              : "new-exam-concept",
        resolution.targetConceptIds,
      );
    }
  }

  // Last-resort coverage fallback. This is deliberately after every ranked
  // unseen branch has been inspected; it is the only place where a blocked
  // anchor may proceed without fresh prerequisite evidence.
  return canonicalCardStep(
    selected.card,
    selected.state,
    selected.card.tags.includes("high-yield") ? "high-yield" : "new-exam-concept",
  );
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

function prepareUnseenCanonicalCard(
  card: Flashcard,
  state: ExamSrsCardState,
  input: SelectGuidedNextStepInput,
  context: GuidedSelectionContext,
  lessonSeen: ReadonlySet<string>,
  preparingCardIds: ReadonlySet<string>,
): GuidedAnchorResolution {
  const targetConceptIds = cardConceptMap[card.id] ?? [];
  if (preparingCardIds.has(card.id)) {
    // The prerequisite DAG is validated separately, but a future card map
    // could still form an evidence loop. Returning the current card is a
    // deterministic finite safety valve rather than recursing forever.
    return { kind: "ready", card, state, targetConceptIds };
  }
  const nextPreparingCardIds = new Set(preparingCardIds);
  nextPreparingCardIds.add(card.id);
  const path = orderedUnique(
    targetConceptIds.flatMap((conceptId) => getLearningPath(conceptId)),
  );

  for (const conceptId of path) {
    if (isConceptIntroducedEnough(conceptId, input.reviews)) continue;
    const concept = knowledgeConceptById.get(conceptId);
    if (concept === undefined) continue;

    const blocked = findFailedNotDueEvidence(conceptId, input, context);
    if (blocked !== null) return blocked;

    const reason: GuidedReason = targetConceptIds.includes(conceptId)
      ? "new-exam-concept"
      : "new-prerequisite";
    if (!lessonSeen.has(conceptId)) {
      return {
        kind: "step",
        step: {
          kind: "lesson",
          conceptId,
          targetCardId: card.id,
          targetConceptIds,
          reason,
        },
      };
    }

    const skill = getGuidedCheckSkillsForConcept(conceptId)[0];
    if (skill !== undefined) {
      const checkState = context.guidedCheckStates[skill.id];
      if (
        checkState !== undefined &&
        (checkState.reviewCount === 0 || checkState.isDue)
      ) {
        return {
          kind: "step",
          step: {
            kind: "knowledge-check",
            skill,
            state: checkState,
            reason,
            targetCardId: card.id,
            targetConceptIds,
          },
        };
      }
      // A failed, not-yet-due check was handled as a blocked frontier above.
      // Other unreviewable states remain soft guidance so coverage cannot
      // deadlock.
      continue;
    }

    // The selected card supplies evidence for its own target bundle. Teach
    // every target lesson first, but do not recursively select that same card
    // as a prerequisite before the bundle is ready.
    if (targetConceptIds.includes(conceptId)) continue;

    const linked = prepareLinkedCanonicalEvidence(
      concept.linkedCardIds,
      input,
      context,
      card.id,
      nextPreparingCardIds,
      lessonSeen,
    );
    if (linked !== null) return linked;
  }

  return { kind: "ready", card, state, targetConceptIds };
}

function prepareLinkedCanonicalEvidence(
  linkedCardIds: readonly string[],
  input: SelectGuidedNextStepInput,
  context: GuidedSelectionContext,
  currentCardId: string,
  preparingCardIds: ReadonlySet<string>,
  lessonSeen: ReadonlySet<string>,
): GuidedAnchorResolution | null {
  const candidates = rankExamSrsCandidatesFromSnapshot({
    cards: input.cards,
    scheduler: context.scheduler,
    nowMs: input.nowMs,
    candidateCardIds: new Set(linkedCardIds),
    recentlyShownCardIds: input.recentlyShownIds,
  });
  let blocked: GuidedAnchorResolution | null = null;
  for (const candidate of candidates) {
    if (
      candidate.card.id === currentCardId ||
      preparingCardIds.has(candidate.card.id)
    ) {
      continue;
    }
    if (candidate.state.learningState !== "unseen") {
      return {
        kind: "step",
        step: canonicalCardStep(
          candidate.card,
          candidate.state,
          "prerequisite-for-selected-card",
        ),
      };
    }
    const resolution = prepareUnseenCanonicalCard(
      candidate.card,
      candidate.state,
      input,
      context,
      lessonSeen,
      preparingCardIds,
    );
    if (resolution.kind === "step") return resolution;
    if (resolution.kind === "ready") {
      return {
        kind: "step",
        step: canonicalCardStep(
          resolution.card,
          resolution.state,
          "prerequisite-for-selected-card",
          resolution.targetConceptIds,
        ),
      };
    }
    blocked ??= resolution;
  }
  return blocked;
}

function findFailedNotDueEvidence(
  conceptId: string,
  input: SelectGuidedNextStepInput,
  context: GuidedSelectionContext,
): GuidedAnchorResolution | null {
  if (isConceptIntroducedEnough(conceptId, input.reviews)) return null;
  const concept = knowledgeConceptById.get(conceptId);
  if (concept === undefined) return null;
  const evidenceIds =
    concept.linkedCardIds.length > 0
      ? concept.linkedCardIds
      : getGuidedCheckSkillsForConcept(conceptId).map((skill) => skill.id);
  const states = evidenceIds
    .map((id) =>
      id.startsWith("knowledge-check:")
        ? context.guidedCheckStates[id]
        : context.scheduler.stateByCardId[id],
    )
    .filter((candidate): candidate is ExamSrsCardState => candidate !== undefined);
  const failed = states.find(
    (candidate) =>
      candidate.reviewCount > 0 &&
      candidate.learningState === "relearning" &&
      !candidate.isDue,
  );
  return failed === undefined
    ? null
    : { kind: "temporarily-blocked", conceptId, dueAt: failed.dueAt };
}

function canonicalCardStep(
  card: Flashcard,
  state: ExamSrsCardState,
  reason: GuidedReason,
  targetConceptIds: readonly string[] = cardConceptMap[card.id] ?? [],
): GuidedCanonicalCardStep {
  return {
    kind: "canonical-card",
    card,
    state,
    reason,
    targetConceptIds,
  };
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
