import { cardConceptMap } from "../knowledge/contentMap";
import { knowledgeConceptById } from "../knowledge/data";
import { getDescendants } from "../knowledge/graph";
import { examYieldBlueprint } from "./blueprint";
import type {
  ExamSkillEvidence,
  ExamYieldReason,
  ExamYieldScore,
  ExamYieldTier,
} from "./model";

/**
 * These are bounded prioritisation points, not probabilities, marks, or
 * forecasts. A tier is the main signal; evidence and chapter priors are small
 * additions around it.
 */
export const TIER_BASE_YIELD: Readonly<Record<ExamYieldTier, number>> = Object.freeze({
  critical: 100,
  "very-high": 78,
  core: 56,
  support: 34,
});

export const CHAPTER_PRIORS: Readonly<Record<number, number>> = Object.freeze({
  0: 1.25,
  1: 0.85,
  2: 0.8,
  3: 0.85,
  4: 0.8,
  5: 0.9,
  6: 1.1,
  7: 1.15,
  8: 1.3,
  9: 1.4,
  10: 1.25,
});

export const PROPAGATION_DECAY = 0.6;
export const MAX_PROPAGATED_YIELD = 72;
export const MAX_EVIDENCE_BONUS = 18;
export const EVIDENCE_BONUS_PER_WEIGHTED_POINT = 4;
export const MAX_CHAPTER_PRIOR_CONTRIBUTION = 8;
export const CROSS_CHAPTER_MECHANISM_BONUS = 6;

export interface ConceptYield {
  readonly conceptId: string;
  readonly directYield: number;
  readonly propagatedYield: number;
  readonly effectiveYield: number;
  readonly directSkillIds: readonly string[];
  readonly propagatedSkillIds: readonly string[];
}

export interface ExamYieldIndex {
  readonly directYieldBySkillId: ReadonlyMap<string, number>;
  readonly directYieldByConceptId: ReadonlyMap<string, number>;
  readonly effectiveYieldByConceptId: ReadonlyMap<string, ConceptYield>;
  readonly skillsByConceptId: ReadonlyMap<string, readonly ExamSkillEvidence[]>;
  readonly supportingSkillsByConceptId: ReadonlyMap<
    string,
    readonly ExamSkillEvidence[]
  >;
  readonly skillsByCardId: ReadonlyMap<string, readonly ExamSkillEvidence[]>;
  readonly skillsByQuestionId: ReadonlyMap<string, readonly ExamSkillEvidence[]>;
  readonly cardScoreById: ReadonlyMap<string, ExamYieldScore>;
}

const directYieldBySkillId = new Map<string, number>();
const directYieldByConceptId = new Map<string, number>();
const directSkillIdsByConceptId = new Map<string, string[]>();
const skillsByConceptId = new Map<string, ExamSkillEvidence[]>();
const supportingSkillsByConceptId = new Map<string, ExamSkillEvidence[]>();
const skillsByCardId = new Map<string, ExamSkillEvidence[]>();
const skillsByQuestionId = new Map<string, ExamSkillEvidence[]>();
const sourceById = new Map(
  examYieldBlueprint.sources.map((source) => [source.id, source]),
);

for (const skill of examYieldBlueprint.skills) {
  const yieldValue = directYieldForSkill(skill);
  directYieldBySkillId.set(skill.id, yieldValue);
  for (const conceptId of skill.targetConceptIds) {
    addToMap(skillsByConceptId, conceptId, skill);
    const current = directYieldByConceptId.get(conceptId) ?? 0;
    if (yieldValue > current) directYieldByConceptId.set(conceptId, yieldValue);
    addToMap(directSkillIdsByConceptId, conceptId, skill.id);
  }
  for (const conceptId of skill.supportingConceptIds ?? []) {
    addToMap(supportingSkillsByConceptId, conceptId, skill);
  }
  for (const cardId of skill.cardIds) addToMap(skillsByCardId, cardId, skill);
  for (const questionId of skill.questionIds) {
    addToMap(skillsByQuestionId, questionId, skill);
  }
}

const effectiveYieldByConceptId = new Map<string, ConceptYield>();
for (const concept of knowledgeConceptById.values()) {
  let effectiveYield = directYieldByConceptId.get(concept.id) ?? 0;
  let propagatedYield = 0;
  let strongestPropagatedYield = 0;
  const propagatedSkillIds = new Set<string>();
  for (const descendantId of getDescendants(concept.id)) {
    const descendantYield = directYieldByConceptId.get(descendantId) ?? 0;
    if (descendantYield <= 0) continue;
    const distance = prerequisiteDistance(descendantId, concept.id);
    if (distance === null || distance === 0) continue;
    const propagated = Math.min(
      MAX_PROPAGATED_YIELD,
      descendantYield * PROPAGATION_DECAY ** distance,
    );
    if (propagated > propagatedYield) propagatedYield = propagated;
    if (propagated > effectiveYield) effectiveYield = propagated;
    if (propagated > strongestPropagatedYield) {
      strongestPropagatedYield = propagated;
      propagatedSkillIds.clear();
      for (const skillId of directSkillIdsByConceptId.get(descendantId) ?? []) {
        propagatedSkillIds.add(skillId);
      }
    } else if (propagated === strongestPropagatedYield) {
      for (const skillId of directSkillIdsByConceptId.get(descendantId) ?? []) {
        propagatedSkillIds.add(skillId);
      }
    }
  }
  effectiveYieldByConceptId.set(concept.id, {
    conceptId: concept.id,
    directYield: directYieldByConceptId.get(concept.id) ?? 0,
    propagatedYield,
    effectiveYield,
    directSkillIds: Object.freeze([
      ...(directSkillIdsByConceptId.get(concept.id) ?? []),
    ]),
    propagatedSkillIds: Object.freeze([...propagatedSkillIds]),
  });
}

const cardScoreById = new Map<string, ExamYieldScore>();
for (const cardId of Object.keys(cardConceptMap)) {
  cardScoreById.set(cardId, scoreCard(cardId));
}

export const examYieldIndex: ExamYieldIndex = Object.freeze({
  directYieldBySkillId,
  directYieldByConceptId,
  effectiveYieldByConceptId,
  skillsByConceptId: freezeMapValues(skillsByConceptId),
  supportingSkillsByConceptId: freezeMapValues(supportingSkillsByConceptId),
  skillsByCardId: freezeMapValues(skillsByCardId),
  skillsByQuestionId: freezeMapValues(skillsByQuestionId),
  cardScoreById,
});

export function getExamYieldForCard(cardId: string): ExamYieldScore {
  return (
    cardScoreById.get(cardId) ?? {
      cardId,
      score: 0,
      tier: "support",
      effectiveConceptYield: 0,
      directSkillIds: [],
      prerequisiteSkillIds: [],
    }
  );
}

export function getExamYieldForConcept(conceptId: string): ConceptYield {
  return (
    effectiveYieldByConceptId.get(conceptId) ?? {
      conceptId,
      directYield: 0,
      propagatedYield: 0,
      effectiveYield: 0,
      directSkillIds: [],
      propagatedSkillIds: [],
    }
  );
}

export function getExamSkillsForCard(cardId: string): readonly ExamSkillEvidence[] {
  return examYieldIndex.skillsByCardId.get(cardId) ?? [];
}

export function getExamSkillsForConcept(
  conceptId: string,
): readonly ExamSkillEvidence[] {
  return examYieldIndex.skillsByConceptId.get(conceptId) ?? [];
}

export function getExamSupportingSkillsForConcept(
  conceptId: string,
): readonly ExamSkillEvidence[] {
  return examYieldIndex.supportingSkillsByConceptId.get(conceptId) ?? [];
}

export function getExamSkillsForQuestion(
  questionId: string,
): readonly ExamSkillEvidence[] {
  return examYieldIndex.skillsByQuestionId.get(questionId) ?? [];
}

/**
 * Short disclosure-safe labels for the selector UI. The underlying weighted
 * score never appears in the learner-facing interface.
 */
export function getExamYieldReasons(
  cardId: string,
  chapterUndercovered = false,
): readonly ExamYieldReason[] {
  const score = getExamYieldForCard(cardId);
  const directCardSkills = getExamSkillsForCard(cardId);
  const reasons: ExamYieldReason[] = [];
  if (directCardSkills.length > 0) {
    const evidence = directCardSkills.flatMap((skill) => skill.sourceEvidence);
    if (
      evidence.some(
        (item) => item.sourceId === "actual-final-2020" && item.relation === "direct",
      )
    ) {
      reasons.push({ label: "Skill family tested in the 2020 final", priority: 100 });
    } else if (
      evidence.some(
        (item) =>
          item.sourceId === "final-practice-2018-19" && item.relation === "direct",
      )
    ) {
      reasons.push({
        label: "Skill family repeated in final MCQ practice",
        priority: 90,
      });
    } else if (
      evidence.some(
        (item) => item.sourceId === "actual-final-2020" && item.relation === "family",
      )
    ) {
      reasons.push({
        label: "Related skill family appeared in the 2020 final",
        priority: 80,
      });
    } else if (
      evidence.some((item) => item.sourceId === "current-course-outline-2025")
    ) {
      reasons.push({ label: "Current-course model", priority: 70 });
    } else if (evidence.some((item) => item.sourceId === "sample-final-2020")) {
      reasons.push({ label: "Integrated final-style reasoning", priority: 60 });
    }
  }
  if (score.prerequisiteSkillIds.length > 0) {
    reasons.push({ label: "High-yield prerequisite", priority: 75 });
  }
  if (chapterUndercovered) {
    reasons.push({ label: "Chapter under-covered", priority: 60 });
  }
  if (reasons.length === 0 && score.score > 0) {
    reasons.push({ label: "Evidence-backed course skill", priority: 50 });
  }
  return Object.freeze(
    [...reasons]
      .sort(
        (left, right) =>
          right.priority - left.priority || left.label.localeCompare(right.label),
      )
      .slice(0, 2),
  );
}

export function directYieldForSkill(skill: ExamSkillEvidence): number {
  const weightedEvidence = skill.sourceEvidence.reduce((total, item) => {
    const source = sourceById.get(item.sourceId);
    return (
      total +
      item.strength * (source?.authenticityWeight ?? 0) * (source?.formatFitWeight ?? 0)
    );
  }, 0);
  const evidenceBonus = Math.min(
    MAX_EVIDENCE_BONUS,
    weightedEvidence * EVIDENCE_BONUS_PER_WEIGHTED_POINT,
  );
  const prior = Math.max(
    ...skill.chapterHints.map((chapter) => CHAPTER_PRIORS[chapter] ?? 0.8),
    0.8,
  );
  const chapterContribution = Math.min(
    MAX_CHAPTER_PRIOR_CONTRIBUTION,
    Math.max(0, ((prior - 0.8) / 0.6) * MAX_CHAPTER_PRIOR_CONTRIBUTION),
  );
  return (
    TIER_BASE_YIELD[skill.tier] +
    evidenceBonus +
    chapterContribution +
    (skill.crossChapterMechanism ? CROSS_CHAPTER_MECHANISM_BONUS : 0)
  );
}

function scoreCard(cardId: string): ExamYieldScore {
  const directSkills = skillsByCardId.get(cardId) ?? [];
  const directSkillIds = directSkills.map((skill) => skill.id);
  const conceptYields = (cardConceptMap[cardId] ?? []).map((conceptId) =>
    getExamYieldForConcept(conceptId),
  );
  const propagatedConceptYield = Math.max(
    0,
    ...conceptYields.map((yieldValue) => yieldValue.propagatedYield),
  );
  const directYield = Math.max(
    0,
    ...directSkills.map((skill) => directYieldBySkillId.get(skill.id) ?? 0),
  );
  const score = Math.max(directYield, propagatedConceptYield);
  const strongestDirect = [...directSkills].sort(
    (left, right) =>
      (TIER_BASE_YIELD[right.tier] ?? 0) - (TIER_BASE_YIELD[left.tier] ?? 0) ||
      left.id.localeCompare(right.id),
  )[0];
  const tier = strongestDirect?.tier ?? tierForEffectiveYield(score);
  const prerequisiteSkillIds = Object.freeze(
    conceptYields.flatMap((yieldValue) => yieldValue.propagatedSkillIds),
  );
  return {
    cardId,
    score,
    tier,
    effectiveConceptYield: propagatedConceptYield,
    directSkillIds: Object.freeze(directSkillIds),
    prerequisiteSkillIds: Object.freeze([...new Set(prerequisiteSkillIds)]),
  };
}

function prerequisiteDistance(start: string, target: string): number | null {
  const queue: Array<{ id: string; distance: number }> = [{ id: start, distance: 0 }];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.id === target) return current.distance;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    for (const prerequisiteId of knowledgeConceptById.get(current.id)?.prerequisites ??
      []) {
      queue.push({ id: prerequisiteId, distance: current.distance + 1 });
    }
  }
  return null;
}

function tierForEffectiveYield(score: number): ExamYieldTier {
  if (score >= TIER_BASE_YIELD.critical) return "critical";
  if (score >= TIER_BASE_YIELD["very-high"]) return "very-high";
  if (score >= TIER_BASE_YIELD.core) return "core";
  return "support";
}

function addToMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
}

function freezeMapValues<K, V>(map: Map<K, V[]>): ReadonlyMap<K, readonly V[]> {
  return new Map([...map].map(([key, values]) => [key, Object.freeze([...values])]));
}
