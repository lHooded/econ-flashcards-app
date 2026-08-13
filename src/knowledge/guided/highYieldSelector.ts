import type { Flashcard } from "../../domain/content";
import { cardConceptMap } from "../contentMap";
import { knowledgeConceptById } from "../data";
import { getDescendants, getLearningPath } from "../graph";
import {
  deriveCardPrerequisiteReadiness,
  deriveGuidedCheckStates,
  isConceptIntroducedEnough,
} from "../mastery";
import { getGuidedCheckSkillsForConcept } from "./checks";
import { deriveExamSrsSnapshot } from "../../study/examSrs/deriveState";
import { rankExamSrsCandidatesFromSnapshot } from "../../study/examSrs/selector";
import type { ExamSrsCardState } from "../../study/examSrs/model";
import {
  getExamSkillsForConcept,
  getExamYieldForCard,
  getExamYieldReasons,
} from "../../examYield/score";
import type { ExamYieldScore } from "../../examYield/model";
import {
  selectGuidedNextStep,
  type GuidedStep,
  type SelectGuidedNextStepInput,
} from "./selector";

export type SelectHighYieldNextStepInput = Omit<
  SelectGuidedNextStepInput,
  "candidateCardIds"
>;

export interface HighYieldCandidate {
  readonly card: Flashcard;
  readonly state: ExamSrsCardState;
  readonly examYield: ExamYieldScore;
  readonly score: number;
  readonly unmetPrerequisiteCount: number;
  readonly noCardCheckCount: number;
  readonly chapterCoverage: number;
  readonly chapterUndercovered: boolean;
}

const MAX_RECENT = 3;
const FRESH_CHAPTER_BONUS = 90;
const COVERAGE_PRESSURE_WEIGHT = 42;
const GLOBAL_COVERAGE_PRESSURE_WEIGHT = 35;
const READY_BONUS = 8;
const UNLOCK_BONUS_CAP = 12;
const UNMET_PREREQUISITE_COST = 2.5;
const NO_CARD_CHECK_COST = 1.5;

const learningPathByCardId = new Map(
  Object.keys(cardConceptMap).map((cardId) => [
    cardId,
    unique(
      (cardConceptMap[cardId] ?? []).flatMap((conceptId) => getLearningPath(conceptId)),
    ),
  ]),
);
const descendantSkillCountByCardId = new Map(
  Object.keys(cardConceptMap).map((cardId) => [
    cardId,
    getDescendantSkillCount(cardId),
  ]),
);

/**
 * High-Yield Cram is a bounded policy over the existing Guided selector:
 * first let the ordinary selector expose an urgent attempted item; only when
 * it would choose an unseen branch do we rank otherwise-comparable new anchors.
 */
export function selectHighYieldNextStep(
  input: SelectHighYieldNextStepInput,
): GuidedStep {
  const ordinary = selectGuidedNextStep(input);
  if (isUrgentAttemptedStep(ordinary)) return ordinary;

  const candidates = rankHighYieldUnseenCards(input);
  const scheduler = deriveExamSrsSnapshot(
    input.cards,
    input.reviews,
    input.settings,
    input.nowMs,
    input.manualLearned?.cardIds,
  );
  const guidedCheckStates = deriveGuidedCheckStates(
    input.reviews,
    input.settings,
    input.nowMs,
  );
  const selected =
    candidates.find(
      (candidate) =>
        !isBranchBlocked(
          candidate.card,
          input,
          scheduler.stateByCardId,
          guidedCheckStates,
        ),
    ) ?? candidates[0];
  if (selected === undefined) return ordinary;

  const prepared = selectGuidedNextStep({
    ...input,
    candidateCardIds: new Set([selected.card.id]),
  });
  if (prepared.kind === "idle") return ordinary;

  const whyNow = getExamYieldReasons(
    selected.card.id,
    selected.chapterUndercovered,
  ).map((reason) => reason.label);
  return withWhyNow(prepared, whyNow);
}

/**
 * Pure, deterministic view used by the page's gap list and by simulations.
 * It only returns new canonical cards; all due/relearning precedence remains
 * with the ordinary selector above.
 */
export function rankHighYieldUnseenCards(
  input: SelectHighYieldNextStepInput,
): readonly HighYieldCandidate[] {
  const scheduler = deriveExamSrsSnapshot(
    input.cards,
    input.reviews,
    input.settings,
    input.nowMs,
    input.manualLearned?.cardIds,
  );
  const readiness = deriveCardPrerequisiteReadiness(
    input.cards,
    scheduler,
    undefined,
    input.manualLearned?.coveredConceptIds,
  );
  const ranked = rankExamSrsCandidatesFromSnapshot({
    cards: input.cards,
    scheduler,
    nowMs: input.nowMs,
    recentlyShownCardIds: input.recentlyShownIds,
    newCardPrerequisiteReadyByCardId: readiness,
  });
  const recent = new Set((input.recentlyShownIds ?? []).slice(0, MAX_RECENT));
  const coverage = calculateCoverage(input.cards, scheduler.states);
  const lessonSeen = input.lessonSeenConceptIds ?? new Set<string>();
  return Object.freeze(
    ranked
      .filter((candidate) => candidate.state.learningState === "unseen")
      .map((candidate) => {
        const examYield = getExamYieldForCard(candidate.card.id);
        const path = learningPathByCardId.get(candidate.card.id) ?? [];
        const unmet = path.filter(
          (conceptId) =>
            !lessonSeen.has(conceptId) &&
            !isConceptIntroducedEnough(
              conceptId,
              input.reviews,
              input.manualLearned?.coveredConceptIds,
              input.manualLearned?.cardIds,
            ),
        );
        const noCardCheckCount = unmet.filter(
          (conceptId) =>
            (knowledgeConceptById.get(conceptId)?.linkedCardIds.length ?? 0) === 0,
        ).length;
        const chapterCoverage =
          coverage.coverageByChapter.get(candidate.card.chapter) ?? 1;
        const chapterUndercovered = chapterCoverage < coverage.globalCoverage;
        const coveragePressure =
          candidate.card.chapter >= 1 && candidate.card.chapter <= 10
            ? COVERAGE_PRESSURE_WEIGHT * (1 - chapterCoverage) +
              GLOBAL_COVERAGE_PRESSURE_WEIGHT *
                Math.max(0, coverage.globalCoverage - chapterCoverage) +
              (chapterCoverage === 0 ? FRESH_CHAPTER_BONUS : 0)
            : 10 * (1 - coverage.globalCoverage);
        const unlockBonus = Math.min(
          UNLOCK_BONUS_CAP,
          descendantSkillCountByCardId.get(candidate.card.id) ?? 0,
        );
        const score =
          examYield.score +
          coveragePressure +
          (readiness.get(candidate.card.id) === true ? READY_BONUS : 0) +
          unlockBonus -
          unmet.length * UNMET_PREREQUISITE_COST -
          noCardCheckCount * NO_CARD_CHECK_COST -
          (recent.has(candidate.card.id) ? 1 : 0);
        return {
          card: candidate.card,
          state: candidate.state,
          examYield,
          score,
          unmetPrerequisiteCount: unmet.length,
          noCardCheckCount,
          chapterCoverage,
          chapterUndercovered,
        } satisfies HighYieldCandidate;
      })
      .sort(compareHighYieldCandidates),
  );
}

function isUrgentAttemptedStep(step: GuidedStep): boolean {
  if (step.kind === "canonical-card") {
    return step.state.learningState !== "unseen";
  }
  if (step.kind === "knowledge-check") {
    return step.state.reviewCount > 0;
  }
  return false;
}

function isBranchBlocked(
  card: Flashcard,
  input: SelectHighYieldNextStepInput,
  stateByCardId: Readonly<Record<string, ExamSrsCardState>>,
  guidedCheckStates: Readonly<Record<string, ExamSrsCardState>>,
): boolean {
  for (const conceptId of learningPathByCardId.get(card.id) ?? []) {
    if (
      isConceptIntroducedEnough(
        conceptId,
        input.reviews,
        input.manualLearned?.coveredConceptIds,
        input.manualLearned?.cardIds,
      )
    )
      continue;
    const concept = knowledgeConceptById.get(conceptId);
    if (concept === undefined) continue;
    const evidenceIds =
      concept.linkedCardIds.length > 0
        ? concept.linkedCardIds
        : getGuidedCheckSkillsForConcept(conceptId).map((skill) => skill.id);
    const failed = evidenceIds.some((evidenceId) => {
      const state = evidenceId.startsWith("knowledge-check:")
        ? guidedCheckStates[evidenceId]
        : stateByCardId[evidenceId];
      return (
        state !== undefined &&
        state.reviewCount > 0 &&
        state.learningState === "relearning" &&
        !state.isDue
      );
    });
    if (failed) return true;
  }
  return false;
}

function withWhyNow(step: GuidedStep, whyNow: readonly string[]): GuidedStep {
  if (whyNow.length === 0) return step;
  if (step.kind === "idle") return step;
  return { ...step, whyNow: Object.freeze([...whyNow].slice(0, 2)) };
}

function calculateCoverage(
  cards: readonly Flashcard[],
  states: readonly ExamSrsCardState[],
): {
  readonly coverageByChapter: ReadonlyMap<number, number>;
  readonly globalCoverage: number;
} {
  const stateById = new Map(states.map((state) => [state.cardId, state]));
  const totals = new Map<number, number>();
  const seen = new Map<number, number>();
  let total = 0;
  let seenTotal = 0;
  for (const card of cards) {
    totals.set(card.chapter, (totals.get(card.chapter) ?? 0) + 1);
    const isSeen = stateById.get(card.id)?.learningState !== "unseen";
    if (isSeen) seen.set(card.chapter, (seen.get(card.chapter) ?? 0) + 1);
    if (card.chapter >= 1 && card.chapter <= 10) {
      total += 1;
      if (isSeen) seenTotal += 1;
    }
  }
  const coverageByChapter = new Map<number, number>();
  for (const [chapter, count] of totals) {
    coverageByChapter.set(chapter, count === 0 ? 1 : (seen.get(chapter) ?? 0) / count);
  }
  return {
    coverageByChapter,
    globalCoverage: total === 0 ? 1 : seenTotal / total,
  };
}

function getDescendantSkillCount(cardId: string): number {
  const skills = new Set<string>();
  for (const conceptId of cardConceptMap[cardId] ?? []) {
    for (const descendantId of getDescendants(conceptId)) {
      for (const skill of getExamSkillsForConcept(descendantId)) skills.add(skill.id);
    }
  }
  return Math.min(UNLOCK_BONUS_CAP, skills.size);
}

function compareHighYieldCandidates(
  left: HighYieldCandidate,
  right: HighYieldCandidate,
): number {
  return (
    right.score - left.score ||
    right.examYield.score - left.examYield.score ||
    Number(right.state.learningState === "unseen") -
      Number(left.state.learningState === "unseen") ||
    left.card.chapter - right.card.chapter ||
    left.card.id.localeCompare(right.card.id)
  );
}

function unique(ids: readonly string[]): readonly string[] {
  return [...new Set(ids)];
}
