import type { Flashcard } from "../domain/content";
import type { ExamSrsSnapshot, NextCardSelection } from "./examSrs/model";
import {
  contentMatchesStudyScope,
  matchesStudyScope,
  type StudyPreset,
  type StudyScope,
} from "./studyScope";
import { selectNextCardFromSnapshot } from "./examSrs/selector";

export interface ScopedStudyCounts {
  /** Cards matching the preset's current candidate-pool restriction. */
  readonly matchingCount: number;
  /** Cards matching the chapter/content part before learning-state filtering. */
  readonly contentCount: number;
  readonly unseenCount: number;
  readonly dueNowCount: number;
}

export type ScopedStudyEmptyReason =
  "no_matching_cards" | "no_unseen_cards" | "no_allowed_cards";

export type ScopedStudyStatus = "ready" | "caught_up" | "empty";

export interface ScopedNextCardSelection extends NextCardSelection {
  readonly status: ScopedStudyStatus;
  readonly counts: ScopedStudyCounts;
  readonly emptyReason?: ScopedStudyEmptyReason;
}

export interface SelectScopedNextCardInput {
  readonly cards: readonly Flashcard[];
  readonly scheduler: ExamSrsSnapshot;
  readonly scope: StudyScope;
  readonly nowMs: number;
  readonly recentlyShownCardIds?: readonly string[];
  readonly studyAhead?: boolean;
  /** Optional user-directed concept focus; always intersected with scope. */
  readonly candidateCardIds?: ReadonlySet<string>;
  readonly newCardPrerequisiteReadyByCardId?: ReadonlyMap<string, boolean>;
}

/**
 * Restricts the candidate universe, then delegates ordering and eligibility to
 * the existing Exam-SRS selector. No focused preset has its own scheduler.
 */
export function selectScopedNextCard(
  input: SelectScopedNextCardInput,
): ScopedNextCardSelection {
  const statesById = input.scheduler.stateByCardId;
  const contentCards = input.cards.filter(
    (card) =>
      contentMatchesStudyScope(card, input.scope) &&
      (input.candidateCardIds?.has(card.id) ?? true),
  );
  const matchingCards = contentCards.filter((card) =>
    matchesStudyScope(card, statesById[card.id], input.scope),
  );
  const candidateCardIds = new Set(matchingCards.map((card) => card.id));
  const counts = countScopeCards(contentCards, matchingCards, statesById);
  const selection = selectNextCardFromSnapshot({
    ...input,
    candidateCardIds,
    // The explicit Chapter 0 scope is a deliberate user restriction. It
    // bypasses only the automatic mixed-material progression gate; due dates,
    // evidence, and all other Exam-SRS priorities remain unchanged.
    overrideChapterZeroGate: input.scope.chapter === 0,
  });

  if (selection.selection !== null) {
    return {
      ...selection,
      status: "ready",
      counts,
    };
  }

  if (counts.contentCount === 0) {
    return {
      ...selection,
      status: "empty",
      counts,
      emptyReason: "no_matching_cards",
    };
  }

  if (input.scope.preset === "new" && counts.unseenCount === 0) {
    return {
      ...selection,
      status: "empty",
      counts,
      emptyReason: "no_unseen_cards",
    };
  }

  if (counts.matchingCount === 0) {
    return {
      ...selection,
      status: "empty",
      counts,
      emptyReason: "no_allowed_cards",
    };
  }

  return {
    ...selection,
    status: "caught_up",
    counts,
  };
}

function countScopeCards(
  contentCards: readonly Flashcard[],
  matchingCards: readonly Flashcard[],
  statesById: Readonly<Record<string, import("./examSrs/model").ExamSrsCardState>>,
): ScopedStudyCounts {
  let unseenCount = 0;
  let dueNowCount = 0;

  for (const card of matchingCards) {
    const state = statesById[card.id];
    if (state?.learningState === "unseen") {
      unseenCount += 1;
    } else if (state?.isDue === true) {
      dueNowCount += 1;
    }
  }

  return {
    matchingCount: matchingCards.length,
    contentCount: contentCards.length,
    unseenCount,
    dueNowCount,
  };
}

export function getScopedStatusMessage(
  status: ScopedStudyStatus,
  emptyReason: ScopedStudyEmptyReason | undefined,
  preset: StudyPreset,
): string {
  if (status === "caught_up") {
    return "You’re caught up in this focus.";
  }

  if (emptyReason === "no_matching_cards") {
    return "No cards match this study focus.";
  }

  if (emptyReason === "no_unseen_cards" || preset === "new") {
    return "No unseen cards remain in this focus.";
  }

  return "No cards currently fit this study focus.";
}
