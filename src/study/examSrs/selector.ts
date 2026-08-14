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

export interface ExamSrsCoverage {
  readonly chapterBonusByNumber: ReadonlyMap<number, number>;
  readonly mixedGatePenalty: number;
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
          candidate.state.isManuallyLearned !== true &&
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

export interface ExamSrsForecastSelector {
  readonly select: (input: {
    readonly nowMs: number;
    readonly recentlyShownCardIds?: readonly string[];
    readonly newCardPrerequisiteReadyByCardId?: ReadonlyMap<string, boolean>;
  }) => NextCardSelection;
  readonly updateState: (state: ExamSrsCardState) => void;
  readonly rebuild: () => void;
  readonly setCoverage: (coverage: ExamSrsCoverage) => void;
}

/**
 * Cached candidate index for forecast trajectories. It preserves the canonical
 * priority/tie-break functions while avoiding a full-deck sort on every review.
 * Normal Study continues to use selectNextCardFromSnapshot above.
 */
export function createExamSrsForecastSelector(input: {
  readonly cards: readonly Flashcard[];
  readonly scheduler: {
    readonly stateByCardId: Record<string, ExamSrsCardState>;
  };
  readonly coverage: ExamSrsCoverage;
}): ExamSrsForecastSelector {
  const cardById = new Map(input.cards.map((card) => [card.id, card]));
  const unseenGroups = new Map<string, Set<string>>();
  const dueHeaps = new Map<string, DueHeapEntry[]>();
  let coverage = input.coverage;

  for (const card of input.cards) {
    if (cardById.get(card.id) === undefined) continue;
    const group = unseenGroups.get(unseenGroupKey(card)) ?? new Set<string>();
    group.add(card.id);
    unseenGroups.set(unseenGroupKey(card), group);
  }

  const updateState = (state: ExamSrsCardState): void => {
    const card = cardById.get(state.cardId);
    if (card === undefined) return;
    const unseenGroup = unseenGroups.get(unseenGroupKey(card));
    if (state.isManuallyLearned === true) {
      // Manual learned is an explicit operational exclusion. Keep it out of
      // both indexes even if a stale caller supplies ordinary fields.
      unseenGroup?.delete(state.cardId);
      return;
    }
    if (state.learningState === "unseen") {
      unseenGroup?.add(state.cardId);
      return;
    }
    unseenGroup?.delete(state.cardId);
    if (state.dueAt === null) return;
    const key = dueGroupKey(card, state);
    const heap = dueHeaps.get(key) ?? [];
    heapPush(heap, toDueHeapEntry(card, state));
    dueHeaps.set(key, heap);
  };

  const rebuild = (): void => {
    dueHeaps.clear();
    for (const state of Object.values(input.scheduler.stateByCardId)) {
      updateState(state);
    }
  };

  const select = (selectionInput: {
    readonly nowMs: number;
    readonly recentlyShownCardIds?: readonly string[];
    readonly newCardPrerequisiteReadyByCardId?: ReadonlyMap<string, boolean>;
  }): NextCardSelection => {
    const recentIds = new Set(
      (selectionInput.recentlyShownCardIds ?? []).slice(0, MAX_RECENT_CARDS),
    );
    let bestCandidate: RankedExamSrsCandidate | null = null;
    let bestWithoutRecent: RankedExamSrsCandidate | null = null;
    const priorityInput = {
      cards: input.cards,
      scheduler: input.scheduler as ExamSrsSnapshot,
      nowMs: selectionInput.nowMs,
    };

    const consider = (candidate: RankedExamSrsCandidate): void => {
      if (
        bestCandidate === null ||
        compareCandidates(
          candidate,
          bestCandidate,
          selectionInput.newCardPrerequisiteReadyByCardId,
        ) < 0
      ) {
        bestCandidate = candidate;
      }
      if (!recentIds.has(candidate.card.id)) {
        if (
          bestWithoutRecent === null ||
          compareCandidates(
            candidate,
            bestWithoutRecent,
            selectionInput.newCardPrerequisiteReadyByCardId,
          ) < 0
        ) {
          bestWithoutRecent = candidate;
        }
      }
    };

    for (const group of unseenGroups.values()) {
      let groupBest: RankedExamSrsCandidate | null = null;
      let groupBestWithoutRecent: RankedExamSrsCandidate | null = null;
      for (const cardId of group) {
        const card = cardById.get(cardId);
        if (card === undefined) continue;
        const state = input.scheduler.stateByCardId[card.id];
        if (state?.learningState !== "unseen" || state.isManuallyLearned === true) {
          continue;
        }
        const candidate = {
          card,
          state,
          priority: priorityFor(card, state, priorityInput, coverage),
        } satisfies RankedExamSrsCandidate;
        if (
          groupBest === null ||
          compareCandidates(
            candidate,
            groupBest,
            selectionInput.newCardPrerequisiteReadyByCardId,
          ) < 0
        ) {
          groupBest = candidate;
        }
        if (
          !recentIds.has(card.id) &&
          (groupBestWithoutRecent === null ||
            compareCandidates(
              candidate,
              groupBestWithoutRecent,
              selectionInput.newCardPrerequisiteReadyByCardId,
            ) < 0)
        ) {
          groupBestWithoutRecent = candidate;
        }
      }
      if (groupBest !== null) consider(groupBest);
      if (groupBestWithoutRecent !== null && groupBestWithoutRecent !== groupBest) {
        consider(groupBestWithoutRecent);
      }
    }

    let nextDueAt: string | null = null;
    for (const heap of dueHeaps.values()) {
      const skippedRecent: DueHeapEntry[] = [];
      while (true) {
        const entry = peekCurrentDueEntry(heap, input.scheduler.stateByCardId);
        if (entry === null) break;
        const state = input.scheduler.stateByCardId[entry.cardId];
        const card = cardById.get(entry.cardId);
        if (state === undefined || card === undefined) break;
        if (entry.dueAtMs > selectionInput.nowMs) {
          if (nextDueAt === null || entry.dueAtMs < Date.parse(nextDueAt)) {
            nextDueAt = state.dueAt;
          }
          break;
        }

        const dueState = stateAtSelectionTime(state, selectionInput.nowMs);
        consider({
          card,
          state: dueState,
          priority: priorityFor(card, dueState, priorityInput, coverage),
        });
        if (!recentIds.has(card.id)) break;
        const recentEntry = heapPop(heap);
        if (recentEntry === undefined) break;
        skippedRecent.push(recentEntry);
      }
      for (const entry of skippedRecent) {
        heapPush(heap, entry);
      }
    }

    const selected = (bestWithoutRecent ??
      bestCandidate) as RankedExamSrsCandidate | null;
    if (selected === null) return { selection: null, nextDueAt };
    return {
      selection: toSelection(
        selected.card,
        selected.state,
        selectionInput.nowMs,
        false,
      ),
      nextDueAt: null,
    };
  };

  rebuild();
  return {
    select,
    updateState,
    rebuild,
    setCoverage: (nextCoverage) => {
      coverage = nextCoverage;
    },
  };
}

interface DueHeapEntry {
  readonly cardId: string;
  readonly dueAtMs: number;
  readonly reviewCount: number;
  readonly chapter: number;
}

function unseenGroupKey(card: Flashcard): string {
  return `${card.chapter}:${card.tags.includes("high-yield") ? "high" : "ordinary"}`;
}

function dueGroupKey(card: Flashcard, state: ExamSrsCardState): string {
  return `${state.learningState}:${card.tags.includes("high-yield") ? "high" : "ordinary"}`;
}

function toDueHeapEntry(card: Flashcard, state: ExamSrsCardState): DueHeapEntry {
  return {
    cardId: card.id,
    dueAtMs: Date.parse(state.dueAt!),
    reviewCount: state.reviewCount,
    chapter: card.chapter,
  };
}

function peekCurrentDueEntry(
  heap: DueHeapEntry[],
  stateByCardId: Readonly<Record<string, ExamSrsCardState>>,
): DueHeapEntry | null {
  while (heap.length > 0) {
    const entry = heap[0];
    const state = stateByCardId[entry.cardId];
    if (
      state !== undefined &&
      state.isManuallyLearned !== true &&
      state.learningState !== "unseen" &&
      state.dueAt !== null &&
      Date.parse(state.dueAt) === entry.dueAtMs &&
      state.reviewCount === entry.reviewCount
    ) {
      return entry;
    }
    heapPop(heap);
  }
  return null;
}

function heapPush(heap: DueHeapEntry[], entry: DueHeapEntry): void {
  heap.push(entry);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (compareDueHeapEntries(heap[parent], heap[index]) <= 0) break;
    [heap[parent], heap[index]] = [heap[index], heap[parent]];
    index = parent;
  }
}

function heapPop(heap: DueHeapEntry[]): DueHeapEntry | undefined {
  const first = heap[0];
  const last = heap.pop();
  if (heap.length > 0 && last !== undefined) {
    heap[0] = last;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < heap.length && compareDueHeapEntries(heap[left], heap[smallest]) < 0) {
        smallest = left;
      }
      if (
        right < heap.length &&
        compareDueHeapEntries(heap[right], heap[smallest]) < 0
      ) {
        smallest = right;
      }
      if (smallest === index) break;
      [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
      index = smallest;
    }
  }
  return first;
}

function compareDueHeapEntries(left: DueHeapEntry, right: DueHeapEntry): number {
  return (
    left.dueAtMs - right.dueAtMs ||
    left.reviewCount - right.reviewCount ||
    left.chapter - right.chapter ||
    compareLexical(left.cardId, right.cardId)
  );
}

function stateAtSelectionTime(
  state: ExamSrsCardState,
  nowMs: number,
): ExamSrsCardState {
  if (state.isManuallyLearned === true) return state;
  if (!state.isDue && state.dueAt !== null && Date.parse(state.dueAt) <= nowMs) {
    return { ...state, isDue: true };
  }
  return state;
}

/** The authoritative due flag used by ordinary Exam-SRS selection. */
export function isExamSrsDueReview(state: ExamSrsCardState): boolean {
  return state.isDue;
}

/**
 * Super Cram's urgent override is narrower: only an attempted card that is
 * currently due may bypass the normal unseen/content policy.
 */
export function isExamSrsAttemptedDueReview(state: ExamSrsCardState): boolean {
  return state.reviewCount > 0 && isExamSrsDueReview(state);
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
        candidate.state.isManuallyLearned !== true &&
        (candidate.state.learningState === "unseen" ||
          isExamSrsDueReview(candidate.state)),
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

export function getExamSrsCoverage(
  cards: readonly Flashcard[],
  states: readonly ExamSrsCardState[],
): ExamSrsCoverage {
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

const calculateCoverage = getExamSrsCoverage;

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
          state.isManuallyLearned !== true &&
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
