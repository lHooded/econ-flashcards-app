import type { Flashcard } from "../../domain/content";
import type { AppSettings, ReviewEvent } from "../../domain/progress";
import { deriveExamSrsSnapshot } from "./deriveState";
import { HOUR_MS } from "./intervals";
import type {
  ExamSrsCardState,
  ExamSrsSnapshot,
  LearningState,
  NextCardSelection,
  StudyReason,
  StudySelection,
} from "./model";

const BASE_PRIORITY: Readonly<Record<LearningState, number>> = {
  unseen: 1100,
  relearning: 1400,
  weak: 1250,
  learning: 950,
  learned: 700,
};

const MAX_RECENT_CARDS = 3;

export interface SelectNextCardInput {
  readonly cards: readonly Flashcard[];
  readonly reviews: readonly ReviewEvent[];
  readonly settings: AppSettings;
  readonly nowMs: number;
  readonly recentlyShownCardIds?: readonly string[];
  readonly studyAhead?: boolean;
  /** Guidance only: used to order otherwise-comparable unseen cards. */
  readonly newCardPrerequisiteReadyByCardId?: ReadonlyMap<string, boolean>;
  readonly manuallyLearnedCardIds?: ReadonlySet<string>;
}

export interface RankExamSrsCandidatesInput {
  readonly cards: readonly Flashcard[];
  readonly scheduler: ExamSrsSnapshot;
  readonly nowMs: number;
  readonly recentlyShownCardIds?: readonly string[];
  readonly newCardPrerequisiteReadyByCardId?: ReadonlyMap<string, boolean>;
  readonly candidateCardIds?: ReadonlySet<string>;
  readonly overrideChapterZeroGate?: boolean;
}

export interface RankedExamSrsCandidate {
  readonly card: Flashcard;
  readonly state: ExamSrsCardState;
  readonly priority: number;
}

export function selectNextCard(input: SelectNextCardInput): NextCardSelection {
  const scheduler = deriveExamSrsSnapshot(
    input.cards,
    input.reviews,
    input.settings,
    input.nowMs,
    input.manuallyLearnedCardIds,
  );
  return selectNextCardFromSnapshot({
    ...input,
    scheduler,
  });
}

export function selectNextCardFromSnapshot(input: {
  readonly cards: readonly Flashcard[];
  readonly scheduler: ExamSrsSnapshot;
  readonly nowMs: number;
  readonly recentlyShownCardIds?: readonly string[];
  readonly studyAhead?: boolean;
  /** Guidance only: used to order otherwise-comparable unseen cards. */
  readonly newCardPrerequisiteReadyByCardId?: ReadonlyMap<string, boolean>;
  /** Optional candidate restriction; omitted for normal full-deck study. */
  readonly candidateCardIds?: ReadonlySet<string>;
  /** Explicit Chapter 0 study bypasses only the automatic unseen-card gate. */
  readonly overrideChapterZeroGate?: boolean;
}): NextCardSelection {
  const statesById = input.scheduler.stateByCardId;
  const candidateCards = input.cards.filter(
    (card) => input.candidateCardIds?.has(card.id) ?? true,
  );
  const recentIds = new Set(
    (input.recentlyShownCardIds ?? []).slice(0, MAX_RECENT_CARDS),
  );
  const selectedNormal = rankExamSrsCandidatesFromSnapshot(input)[0] ?? null;

  if (selectedNormal !== null) {
    return {
      selection: toSelection(
        selectedNormal.card,
        selectedNormal.state,
        input.nowMs,
        false,
      ),
      nextDueAt: null,
    };
  }

  const nextDueAt = findNextDueAt(
    input.scheduler.states,
    input.nowMs,
    input.candidateCardIds,
  );
  if (input.studyAhead) {
    const futureCandidates = candidateCards
      .map((card) => ({ card, state: statesById[card.id] }))
      .filter(
        (candidate): candidate is { card: Flashcard; state: ExamSrsCardState } =>
          candidate.state !== undefined &&
          candidate.state.dueAt !== null &&
          Date.parse(candidate.state.dueAt) > input.nowMs,
      );
    const selectedFuture = chooseWithRecentFallback(
      futureCandidates,
      recentIds,
      compareStudyAhead,
    );

    if (selectedFuture !== null) {
      return {
        selection: toSelection(
          selectedFuture.card,
          selectedFuture.state,
          input.nowMs,
          true,
        ),
        nextDueAt,
      };
    }
  }

  return { selection: null, nextDueAt };
}

/**
 * Return the same ordinary Exam-SRS candidate order used by Study. Guided
 * Cram uses this read-only ranking to skip a graph-blocked unseen anchor while
 * preserving numeric urgency, coverage pressure, and all ordinary tie-breaks.
 */
export function rankExamSrsCandidatesFromSnapshot(
  input: RankExamSrsCandidatesInput,
): readonly RankedExamSrsCandidate[] {
  const statesById = input.scheduler.stateByCardId;
  const coverage = calculateCoverage(input.cards, input.scheduler.states);
  const candidates = input.cards
    .filter((card) => input.candidateCardIds?.has(card.id) ?? true)
    .map((card) => ({ card, state: statesById[card.id] }))
    .filter(
      (candidate): candidate is { card: Flashcard; state: ExamSrsCardState } =>
        candidate.state !== undefined &&
        (candidate.state.learningState === "unseen" || candidate.state.isDue),
    )
    .map((candidate) => ({
      ...candidate,
      priority: priorityFor(candidate.card, candidate.state, input, coverage),
    }));
  const recentIds = new Set(
    (input.recentlyShownCardIds ?? []).slice(0, MAX_RECENT_CARDS),
  );
  const withoutRecent = candidates.filter(
    (candidate) => !recentIds.has(candidate.card.id),
  );
  const pool = withoutRecent.length > 0 ? withoutRecent : candidates;
  return Object.freeze(
    [...pool].sort((left, right) =>
      compareCandidates(left, right, input.newCardPrerequisiteReadyByCardId),
    ),
  );
}

export function getStudyReason(
  state: ExamSrsCardState,
  nowMs: number,
  studyAhead = false,
): StudyReason {
  if (studyAhead && state.dueAt !== null && Date.parse(state.dueAt) > nowMs) {
    return "Study ahead";
  }

  switch (state.learningState) {
    case "unseen":
      return "New";
    case "relearning":
      return "Relearning";
    case "weak":
      return "Weak";
    case "learned":
      return "Learned review";
    case "learning":
      return "Due review";
  }
}

function toSelection(
  card: Flashcard,
  state: ExamSrsCardState,
  nowMs: number,
  studyAhead: boolean,
): StudySelection {
  return {
    card,
    state,
    reason: getStudyReason(state, nowMs, studyAhead),
    isStudyAhead: studyAhead,
  };
}

function chooseWithRecentFallback(
  candidates: readonly { card: Flashcard; state: ExamSrsCardState }[],
  recentIds: ReadonlySet<string>,
  compare: (
    left: { card: Flashcard; state: ExamSrsCardState },
    right: { card: Flashcard; state: ExamSrsCardState },
  ) => number,
): { card: Flashcard; state: ExamSrsCardState } | null {
  const withoutRecent = candidates.filter(
    (candidate) => !recentIds.has(candidate.card.id),
  );
  const pool = withoutRecent.length > 0 ? withoutRecent : candidates;
  return [...pool].sort(compare)[0] ?? null;
}

function priorityFor(
  card: Flashcard,
  state: ExamSrsCardState,
  input: {
    readonly cards: readonly Flashcard[];
    readonly scheduler: ExamSrsSnapshot;
    readonly nowMs: number;
    readonly overrideChapterZeroGate?: boolean;
  },
  coverage: {
    readonly chapterBonusByNumber: ReadonlyMap<number, number>;
    readonly mixedGatePenalty: number;
  },
): number {
  let priority = BASE_PRIORITY[state.learningState];

  if (state.learningState !== "unseen" && state.isDue && state.dueAt !== null) {
    const overdueHours = Math.max(0, (input.nowMs - Date.parse(state.dueAt)) / HOUR_MS);
    priority += Math.min(400, overdueHours * 20);
  }

  if (card.tags.includes("high-yield")) {
    priority += 40;
  }

  if (state.learningState === "unseen" && card.chapter >= 1 && card.chapter <= 10) {
    priority += coverage.chapterBonusByNumber.get(card.chapter) ?? 0;
  }

  if (
    state.learningState === "unseen" &&
    card.chapter === 0 &&
    input.overrideChapterZeroGate !== true
  ) {
    priority += coverage.mixedGatePenalty;
  }

  return priority;
}

/**
 * Public read-only view of the same numeric priority used by normal Study.
 * Guided Cram uses this only to compare an already-attempted guided check with
 * the canonical selector; it does not maintain a second scheduler.
 */
export function getExamSrsPriority(input: {
  readonly card: Flashcard;
  readonly state: ExamSrsCardState;
  readonly cards: readonly Flashcard[];
  readonly scheduler: ExamSrsSnapshot;
  readonly nowMs: number;
  readonly overrideChapterZeroGate?: boolean;
}): number {
  return priorityFor(
    input.card,
    input.state,
    input,
    calculateCoverage(input.cards, input.scheduler.states),
  );
}

/** The base/overdue part of Exam-SRS priority for non-canonical check skills. */
export function getExamSrsStatePriority(
  state: ExamSrsCardState,
  nowMs: number,
): number {
  let priority = BASE_PRIORITY[state.learningState];
  if (state.learningState !== "unseen" && state.isDue && state.dueAt !== null) {
    const overdueHours = Math.max(0, (nowMs - Date.parse(state.dueAt)) / HOUR_MS);
    priority += Math.min(400, overdueHours * 20);
  }
  return priority;
}

function calculateCoverage(
  cards: readonly Flashcard[],
  states: readonly ExamSrsCardState[],
): {
  readonly chapterBonusByNumber: ReadonlyMap<number, number>;
  readonly mixedGatePenalty: number;
} {
  const stateById = new Map(states.map((state) => [state.cardId, state]));
  const totals = new Map<number, number>();
  const seenByChapter = new Map<number, number>();
  let nonMixedTotal = 0;
  let nonMixedSeen = 0;

  for (const card of cards) {
    totals.set(card.chapter, (totals.get(card.chapter) ?? 0) + 1);
    if (stateById.get(card.id)?.learningState !== "unseen") {
      seenByChapter.set(card.chapter, (seenByChapter.get(card.chapter) ?? 0) + 1);
    }
    if (card.chapter >= 1 && card.chapter <= 10) {
      nonMixedTotal += 1;
      if (stateById.get(card.id)?.learningState !== "unseen") {
        nonMixedSeen += 1;
      }
    }
  }

  const chapterBonusByNumber = new Map<number, number>();
  for (let chapter = 1; chapter <= 10; chapter += 1) {
    const total = totals.get(chapter) ?? 0;
    const seen = seenByChapter.get(chapter) ?? 0;
    const chapterCoverage = total === 0 ? 1 : seen / total;
    chapterBonusByNumber.set(chapter, Math.round(100 * (1 - chapterCoverage)));
  }

  const coverage = nonMixedTotal === 0 ? 1 : nonMixedSeen / nonMixedTotal;
  let mixedGatePenalty: number;

  if (coverage < 0.6) {
    mixedGatePenalty = -500;
  } else if (coverage < 0.8) {
    mixedGatePenalty = -200;
  } else {
    mixedGatePenalty = 50;
  }

  return { chapterBonusByNumber, mixedGatePenalty };
}

function compareCandidates(
  left: { card: Flashcard; state: ExamSrsCardState; priority: number },
  right: { card: Flashcard; state: ExamSrsCardState; priority: number },
  prerequisiteReadyByCardId?: ReadonlyMap<string, boolean>,
): number {
  return (
    right.priority - left.priority ||
    compareNewCardReadiness(left, right, prerequisiteReadyByCardId) ||
    compareDueAt(left.state, right.state) ||
    left.state.reviewCount - right.state.reviewCount ||
    left.card.chapter - right.card.chapter ||
    compareLexical(left.card.id, right.card.id)
  );
}

function compareNewCardReadiness(
  left: { card: Flashcard; state: ExamSrsCardState },
  right: { card: Flashcard; state: ExamSrsCardState },
  readiness?: ReadonlyMap<string, boolean>,
): number {
  if (
    readiness === undefined ||
    left.state.learningState !== "unseen" ||
    right.state.learningState !== "unseen"
  ) {
    return 0;
  }
  const leftReady = readiness.get(left.card.id) === true;
  const rightReady = readiness.get(right.card.id) === true;
  return Number(rightReady) - Number(leftReady);
}

function compareStudyAhead(
  left: { card: Flashcard; state: ExamSrsCardState },
  right: { card: Flashcard; state: ExamSrsCardState },
): number {
  return (
    compareTimestamp(left.state.dueAt, right.state.dueAt) ||
    studyAheadRank(left.state.learningState) -
      studyAheadRank(right.state.learningState) ||
    left.state.reviewCount - right.state.reviewCount ||
    left.card.chapter - right.card.chapter ||
    compareLexical(left.card.id, right.card.id)
  );
}

function compareDueAt(left: ExamSrsCardState, right: ExamSrsCardState): number {
  if (left.isDue !== right.isDue) {
    return left.isDue ? -1 : 1;
  }
  return compareTimestamp(left.dueAt, right.dueAt);
}

function compareTimestamp(left: string | null, right: string | null): number {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return Date.parse(left) - Date.parse(right);
}

function studyAheadRank(state: LearningState): number {
  switch (state) {
    case "relearning":
      return 0;
    case "weak":
      return 1;
    case "learning":
      return 2;
    case "learned":
      return 3;
    case "unseen":
      return 4;
  }
}

function findNextDueAt(
  states: readonly ExamSrsCardState[],
  nowMs: number,
  candidateCardIds?: ReadonlySet<string>,
): string | null {
  return (
    [...states]
      .filter(
        (state) =>
          (candidateCardIds?.has(state.cardId) ?? true) &&
          state.dueAt !== null &&
          Date.parse(state.dueAt) > nowMs,
      )
      .sort((left, right) => compareTimestamp(left.dueAt, right.dueAt))[0]?.dueAt ??
    null
  );
}

function compareLexical(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
