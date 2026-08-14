import type { Flashcard } from "../domain/content";
import type { AppSettings, ReviewEvent } from "../domain/progress";
import type { ExamQuestion } from "../exam/model";
import { examQuestions } from "../exam/questionBank";
import {
  getExamSkillsForCard,
  getExamSkillsForQuestion,
  getExamYieldForCard,
} from "../examYield/score";
import { buildPracticeSet } from "../practice/selector";
import { deriveExamSrsSnapshot } from "../study/examSrs/deriveState";
import {
  getExamSrsStatePriority,
  isExamSrsAttemptedDueReview,
} from "../study/examSrs/selector";
import {
  cheatSheetSkillProfileById,
  questionStudyWorthinessOverrideById,
} from "./cheatSheet";
import {
  formulaApplicationFamilyById,
  formulaApplicationMetaByQuestionId,
  formulaApplicationQuestionIds,
  getFormulaFamilyForQuestion,
} from "./formulaFamilies";
import type {
  CheatSheetSkillProfile,
  FormulaApplicationFamily,
  StudyWorthiness,
  SuperCramQuestionCandidate,
  SuperCramReasonKind,
  SuperCramSelectionInput,
  SuperCramSessionState,
} from "./model";
import type { CheatSheetSectionId } from "./cheatSheetCatalog";

export { getFormulaFamilyForQuestion } from "./formulaFamilies";

export const STUDY_WORTHINESS_EXAM_RETENTION: Readonly<
  Record<StudyWorthiness, number>
> = Object.freeze({
  1: 0.35,
  2: 0.5,
  3: 0.7,
  4: 0.85,
  5: 1,
});

export const SUPER_CRAM_CONSTANTS = Object.freeze({
  urgentBase: 5000,
  weakEvidenceBonus: 300,
  cheatResistancePerLevel: 6,
  coldFormulaBonus: 42,
  failedFormulaBonus: 60,
  coveredFormulaBonus: 8,
  // An unfamiliar chapter gets a bounded breadth push. It is intentionally
  // smaller than an urgent override but large enough to keep a new session
  // from collapsing into only the late critical branches.
  newChapterBonus: 90,
  reasoningFormBonus: 22,
  scenarioBonus: 14,
  sequenceBonus: 10,
  stimulusBonus: 8,
  recentQuestionPenalty: 1_000,
  recentCardPenalty: 180,
  kindPressureBonus: 30,
  lookupMixBonus: 70,
  cheapLookupValidationBonus: 150,
});

const DEFAULT_PROFILE: CheatSheetSkillProfile = Object.freeze({
  skillId: "intentional-default",
  studyWorthiness: 3,
  cheatSheetSections: [],
  class: "mixed",
});

export interface BuildSuperCramCandidatesInput {
  readonly questions: readonly ExamQuestion[];
  readonly cards: readonly Flashcard[];
  readonly reviewEvents: readonly ReviewEvent[];
  readonly settings: AppSettings;
  readonly nowMs: number;
  readonly manuallyLearnedQuestionIds?: ReadonlySet<string>;
  readonly manuallyLearnedCardIds?: ReadonlySet<string>;
  readonly session?: SuperCramSessionState;
}

export interface FormulaApplicationSetInput {
  readonly chapter: number | null;
  readonly familyId?: string | null;
  readonly size: 5 | 10 | 20;
  readonly seed: number | string;
  readonly excludedQuestionIds?: ReadonlySet<string>;
}

export interface UrgentCanonicalFallbackInput {
  readonly cards: readonly Flashcard[];
  readonly questions: readonly ExamQuestion[];
  readonly reviewEvents: readonly ReviewEvent[];
  readonly settings: AppSettings;
  readonly nowMs: number;
  readonly manuallyLearnedQuestionIds?: ReadonlySet<string>;
  readonly manuallyLearnedCardIds?: ReadonlySet<string>;
  readonly excludedCardIds?: ReadonlySet<string>;
}

export interface SuperCramSimulationSummary {
  readonly questionsSelected: number;
  readonly byChapter: Readonly<Record<string, number>>;
  readonly byReasonKind: Readonly<Record<SuperCramReasonKind, number>>;
  readonly byTier: Readonly<
    Record<"critical" | "very-high" | "core" | "support", number>
  >;
  readonly byStudyWorthiness: Readonly<Record<StudyWorthiness, number>>;
  readonly uniqueReviewCardIds: number;
  readonly formulaFamiliesCovered: number;
}

export function createEmptySuperCramSession(): SuperCramSessionState {
  return {
    recentQuestionIds: [],
    recentReviewCardIds: [],
    chaptersTouched: [],
    formulaFamiliesCovered: new Set<string>(),
    formulaFamiliesFailed: new Set<string>(),
    answeredCount: 0,
    correctCount: 0,
    reasoningGaps: 0,
    kindCounts: {
      "reasoning-heavy": 0,
      "formula-application": 0,
      "lookup-validation": 0,
      "urgent-weakness": 0,
    },
  };
}

export function buildSuperCramCandidates(
  input: BuildSuperCramCandidatesInput,
): readonly SuperCramQuestionCandidate[] {
  const session = input.session ?? createEmptySuperCramSession();
  const manualQuestions = input.manuallyLearnedQuestionIds ?? new Set<string>();
  const manualCards = input.manuallyLearnedCardIds ?? new Set<string>();
  const scheduler = deriveExamSrsSnapshot(
    input.cards,
    input.reviewEvents,
    input.settings,
    input.nowMs,
    manualCards,
  );
  const cardById = new Map(input.cards.map((card) => [card.id, card]));

  return input.questions
    .filter(
      (question) =>
        !manualQuestions.has(question.id) && !manualCards.has(question.reviewCardId),
    )
    .flatMap((question) => {
      const card = cardById.get(question.reviewCardId);
      const state = scheduler.stateByCardId[question.reviewCardId];
      if (
        card === undefined ||
        state === undefined ||
        state.isManuallyLearned === true
      ) {
        return [];
      }

      const profile = getQuestionCheatSheetProfile(question);
      const family = getFormulaFamilyForQuestion(question.id);
      const formulaFamilyId = family?.id ?? null;
      const directYield = getExamYieldForCard(card.id);
      const isUrgent = isExamSrsAttemptedDueReview(state);
      const hasWeakEvidence =
        state.reviewCount > 0 &&
        (state.learningState === "relearning" || state.learningState === "weak");
      const reasonKind = getQuestionReasonKind(question, profile, isUrgent, family);
      const candidate: SuperCramQuestionCandidate = {
        question,
        examYieldScore: directYield.score,
        examYieldTier: directYield.tier,
        studyWorthiness: profile.studyWorthiness,
        cheatSheetClass: profile.class,
        cheatSheetSections: profile.cheatSheetSections,
        formulaFamilyId,
        reasonKind,
        isUrgent,
        hasWeakEvidence,
        srsPriority: getExamSrsStatePriority(state, input.nowMs),
        score: 0,
      };
      return [
        {
          ...candidate,
          score: scoreSuperCramCandidate({
            candidate,
            session,
            nowMs: input.nowMs,
          }),
        },
      ];
    });
}

export function selectSuperCramQuestion(
  input: SuperCramSelectionInput,
): SuperCramQuestionCandidate | null {
  const rankedCandidates = input.candidates.map((candidate) => ({
    ...candidate,
    score: scoreSuperCramCandidate({
      candidate,
      session: input.session,
      nowMs: input.nowMs,
    }),
  }));
  const recentQuestions = new Set(input.session.recentQuestionIds);
  const recentCards = new Set(input.session.recentReviewCardIds);
  const notSameQuestion = rankedCandidates.filter(
    (candidate) => !recentQuestions.has(candidate.question.id),
  );
  if (notSameQuestion.length === 0) return null;
  const withoutRecentCards = notSameQuestion.filter(
    (candidate) => !recentCards.has(candidate.question.reviewCardId),
  );
  const pool = withoutRecentCards.length > 0 ? withoutRecentCards : notSameQuestion;
  return [...pool].sort(compareCandidates)[0] ?? null;
}

export function scoreSuperCramCandidate(input: {
  readonly candidate: SuperCramQuestionCandidate;
  readonly session: SuperCramSessionState;
  readonly nowMs: number;
}): number {
  const { candidate, session } = input;
  const retention = STUDY_WORTHINESS_EXAM_RETENTION[candidate.studyWorthiness];
  const examComponent = candidate.examYieldScore * retention;
  const urgentComponent = candidate.isUrgent
    ? SUPER_CRAM_CONSTANTS.urgentBase + candidate.srsPriority
    : 0;
  const weakEvidenceComponent =
    candidate.hasWeakEvidence && !candidate.isUrgent
      ? SUPER_CRAM_CONSTANTS.weakEvidenceBonus
      : 0;
  const cheapLookupValidationComponent =
    candidate.reasonKind === "lookup-validation" &&
    candidate.studyWorthiness <= 2 &&
    session.answeredCount > 0 &&
    session.kindCounts["lookup-validation"] < 2
      ? SUPER_CRAM_CONSTANTS.cheapLookupValidationBonus
      : 0;
  const resistanceComponent =
    (candidate.studyWorthiness - 1) * SUPER_CRAM_CONSTANTS.cheatResistancePerLevel;
  const formulaComponent = getFormulaComponent(candidate, session);
  const breadthComponent = session.chaptersTouched.includes(candidate.question.chapter)
    ? 0
    : SUPER_CRAM_CONSTANTS.newChapterBonus;
  const formComponent = getQuestionFormComponent(candidate.question);
  const kindPressure = getKindPressureBonus(candidate.reasonKind, session);
  const recentQuestionPenalty = session.recentQuestionIds.includes(
    candidate.question.id,
  )
    ? SUPER_CRAM_CONSTANTS.recentQuestionPenalty
    : 0;
  const recentCardPenalty = session.recentReviewCardIds.includes(
    candidate.question.reviewCardId,
  )
    ? SUPER_CRAM_CONSTANTS.recentCardPenalty
    : 0;

  return (
    examComponent +
    urgentComponent +
    weakEvidenceComponent +
    cheapLookupValidationComponent +
    resistanceComponent +
    formulaComponent +
    breadthComponent +
    formComponent +
    kindPressure -
    recentQuestionPenalty -
    recentCardPenalty
  );
}

export function applySuperCramAnswer(
  session: SuperCramSessionState,
  candidate: SuperCramQuestionCandidate,
  correct: boolean,
): SuperCramSessionState {
  const familyCovered = new Set(session.formulaFamiliesCovered);
  const familyFailed = new Set(session.formulaFamiliesFailed);
  if (candidate.formulaFamilyId !== null) {
    if (correct) {
      familyCovered.add(candidate.formulaFamilyId);
      familyFailed.delete(candidate.formulaFamilyId);
    } else {
      familyCovered.delete(candidate.formulaFamilyId);
      familyFailed.add(candidate.formulaFamilyId);
    }
  }
  const kindCounts = { ...session.kindCounts };
  kindCounts[candidate.reasonKind] += 1;
  const recentQuestionIds = [
    candidate.question.id,
    ...session.recentQuestionIds.filter((id) => id !== candidate.question.id),
  ].slice(0, 8);
  const recentReviewCardIds = [
    candidate.question.reviewCardId,
    ...session.recentReviewCardIds.filter(
      (id) => id !== candidate.question.reviewCardId,
    ),
  ].slice(0, 5);
  const chaptersTouched = session.chaptersTouched.includes(candidate.question.chapter)
    ? session.chaptersTouched
    : [...session.chaptersTouched, candidate.question.chapter];
  return {
    ...session,
    recentQuestionIds,
    recentReviewCardIds,
    chaptersTouched,
    formulaFamiliesCovered: familyCovered,
    formulaFamiliesFailed: familyFailed,
    answeredCount: session.answeredCount + 1,
    correctCount: session.correctCount + (correct ? 1 : 0),
    reasoningGaps:
      session.reasoningGaps +
      (!correct && candidate.reasonKind === "reasoning-heavy" ? 1 : 0),
    kindCounts,
  };
}

export function buildFormulaApplicationSet(
  input: FormulaApplicationSetInput,
): readonly ExamQuestion[] {
  const familyQuestionIds =
    input.familyId === undefined || input.familyId === null
      ? formulaApplicationQuestionIds
      : new Set(formulaApplicationFamilyById.get(input.familyId)?.questionIds ?? []);
  return buildPracticeSet(examQuestions, {
    chapter: input.chapter,
    style: "calculation",
    stimulus: "all",
    size: input.size,
    seed: input.seed,
    questionIds: familyQuestionIds,
    excludedQuestionIds: input.excludedQuestionIds,
  });
}

/**
 * Returns a canonical fallback only when the highest-priority urgent card has no
 * eligible MCQ surface. Super Cram never invents a runtime question.
 */
export function findUrgentCanonicalFallback(
  input: UrgentCanonicalFallbackInput,
): Flashcard | null {
  const manuallyLearnedCards = input.manuallyLearnedCardIds ?? new Set<string>();
  const manuallyLearnedQuestions =
    input.manuallyLearnedQuestionIds ?? new Set<string>();
  const excludedCards = input.excludedCardIds ?? new Set<string>();
  const scheduler = deriveExamSrsSnapshot(
    input.cards,
    input.reviewEvents,
    input.settings,
    input.nowMs,
    manuallyLearnedCards,
  );
  const eligibleQuestionCardIds = new Set(
    input.questions
      .filter(
        (question) =>
          !manuallyLearnedQuestions.has(question.id) &&
          !manuallyLearnedCards.has(question.reviewCardId),
      )
      .map((question) => question.reviewCardId),
  );
  const urgentCards = input.cards
    .filter((card) => {
      const state = scheduler.stateByCardId[card.id];
      return (
        !excludedCards.has(card.id) &&
        state !== undefined &&
        state.isManuallyLearned !== true &&
        isExamSrsAttemptedDueReview(state)
      );
    })
    .sort((left, right) => {
      const leftState = scheduler.stateByCardId[left.id]!;
      const rightState = scheduler.stateByCardId[right.id]!;
      return (
        getExamSrsStatePriority(rightState, input.nowMs) -
          getExamSrsStatePriority(leftState, input.nowMs) ||
        left.id.localeCompare(right.id)
      );
    });
  const topUrgent = urgentCards[0];
  return topUrgent !== undefined && !eligibleQuestionCardIds.has(topUrgent.id)
    ? topUrgent
    : null;
}

export function getQuestionCheatSheetProfile(
  question: ExamQuestion,
): CheatSheetSkillProfile {
  const baseProfile = getBaseQuestionCheatSheetProfile(question);
  const override = questionStudyWorthinessOverrideById.get(question.id);
  if (override !== undefined) {
    return Object.assign(baseProfile, {
      skillId: `question:${question.id}`,
      studyWorthiness: override.studyWorthiness,
      cheatSheetSections: override.cheatSheetSections ?? baseProfile.cheatSheetSections,
      class: override.class,
    });
  }
  return getBaseQuestionCheatSheetProfile(question);
}

function getBaseQuestionCheatSheetProfile(
  question: ExamQuestion,
): CheatSheetSkillProfile {
  const family = getFormulaFamilyForQuestion(question.id);
  const skillIds = new Set([
    ...getExamSkillsForQuestion(question.id).map((skill) => skill.id),
    ...getExamSkillsForCard(question.reviewCardId).map((skill) => skill.id),
    ...(family?.examSkillIds ?? []),
  ]);
  const profiles = [...skillIds]
    .map((skillId) => cheatSheetSkillProfileById.get(skillId))
    .filter((item): item is CheatSheetSkillProfile => item !== undefined);
  const strongest = profiles.sort(
    (left, right) => right.studyWorthiness - left.studyWorthiness,
  )[0];
  if (strongest === undefined) {
    return {
      ...DEFAULT_PROFILE,
      cheatSheetSections: getQuestionSections(question),
    };
  }
  const sectionIds = new Set([
    ...profiles.flatMap((item) => item.cheatSheetSections),
    ...getQuestionSections(question),
  ]);
  return {
    ...strongest,
    cheatSheetSections: [...sectionIds],
  };
}

export function getQuestionReasonKind(
  question: ExamQuestion,
  profile: CheatSheetSkillProfile,
  urgent: boolean,
  family: FormulaApplicationFamily | undefined,
): SuperCramReasonKind {
  if (urgent) return "urgent-weakness";
  if (family !== undefined) return "formula-application";
  if (
    profile.class === "reasoning-heavy" ||
    question.style === "scenario" ||
    question.style === "model_discrimination" ||
    question.style === "sequence" ||
    profile.studyWorthiness >= 4
  ) {
    return "reasoning-heavy";
  }
  return "lookup-validation";
}

export function summarizeSuperCramSelection(
  selections: readonly SuperCramQuestionCandidate[],
): SuperCramSimulationSummary {
  const byChapter: Record<string, number> = {};
  const byReasonKind: Record<SuperCramReasonKind, number> = {
    "reasoning-heavy": 0,
    "formula-application": 0,
    "lookup-validation": 0,
    "urgent-weakness": 0,
  };
  const byTier = { critical: 0, "very-high": 0, core: 0, support: 0 } as Record<
    "critical" | "very-high" | "core" | "support",
    number
  >;
  const byStudyWorthiness = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<
    StudyWorthiness,
    number
  >;
  const cards = new Set<string>();
  const families = new Set<string>();
  for (const candidate of selections) {
    byChapter[String(candidate.question.chapter)] =
      (byChapter[String(candidate.question.chapter)] ?? 0) + 1;
    byReasonKind[candidate.reasonKind] += 1;
    byTier[candidate.examYieldTier] += 1;
    byStudyWorthiness[candidate.studyWorthiness] += 1;
    cards.add(candidate.question.reviewCardId);
    if (candidate.formulaFamilyId !== null) families.add(candidate.formulaFamilyId);
  }
  return {
    questionsSelected: selections.length,
    byChapter,
    byReasonKind,
    byTier,
    byStudyWorthiness,
    uniqueReviewCardIds: cards.size,
    formulaFamiliesCovered: families.size,
  };
}

function getFormulaComponent(
  candidate: SuperCramQuestionCandidate,
  session: SuperCramSessionState,
): number {
  if (candidate.formulaFamilyId === null) return 0;
  if (session.formulaFamiliesFailed.has(candidate.formulaFamilyId)) {
    return SUPER_CRAM_CONSTANTS.failedFormulaBonus;
  }
  if (!session.formulaFamiliesCovered.has(candidate.formulaFamilyId)) {
    return SUPER_CRAM_CONSTANTS.coldFormulaBonus;
  }
  return SUPER_CRAM_CONSTANTS.coveredFormulaBonus;
}

function getQuestionFormComponent(question: ExamQuestion): number {
  return (
    (question.style === "model_discrimination"
      ? SUPER_CRAM_CONSTANTS.reasoningFormBonus
      : 0) +
    (question.style === "scenario" ? SUPER_CRAM_CONSTANTS.scenarioBonus : 0) +
    (question.style === "sequence" ? SUPER_CRAM_CONSTANTS.sequenceBonus : 0) +
    (question.stimulus === undefined ? 0 : SUPER_CRAM_CONSTANTS.stimulusBonus)
  );
}

function getKindPressureBonus(
  kind: SuperCramReasonKind,
  session: SuperCramSessionState,
): number {
  const total = session.answeredCount;
  if (total === 0) {
    return kind === "lookup-validation"
      ? SUPER_CRAM_CONSTANTS.lookupMixBonus
      : SUPER_CRAM_CONSTANTS.kindPressureBonus;
  }
  const share = session.kindCounts[kind] / total;
  if (kind === "reasoning-heavy" && share < 0.5)
    return SUPER_CRAM_CONSTANTS.kindPressureBonus;
  if (kind === "formula-application" && share < 0.3)
    return SUPER_CRAM_CONSTANTS.kindPressureBonus;
  if (kind === "lookup-validation" && share < 0.1)
    return SUPER_CRAM_CONSTANTS.lookupMixBonus;
  return 0;
}

function getQuestionSections(question: ExamQuestion): readonly CheatSheetSectionId[] {
  return formulaApplicationMetaByQuestionId.get(question.id)?.familyId === undefined
    ? []
    : (formulaApplicationFamilyById.get(
        formulaApplicationMetaByQuestionId.get(question.id)?.familyId ?? "",
      )?.cheatSheetSections ?? []);
}

function compareCandidates(
  left: SuperCramQuestionCandidate,
  right: SuperCramQuestionCandidate,
): number {
  return (
    right.score - left.score ||
    right.examYieldScore - left.examYieldScore ||
    right.studyWorthiness - left.studyWorthiness ||
    left.question.id.localeCompare(right.question.id)
  );
}
