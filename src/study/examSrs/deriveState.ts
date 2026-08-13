import type { Flashcard } from "../../domain/content";
import {
  compareReviewEventsChronologically,
  type AppSettings,
  type ReviewEvent,
} from "../../domain/progress";
import {
  getBaseIntervalMs,
  getBufferCapMs,
  getDeadlineCapMs,
  HOUR_MS,
} from "./intervals";
import type {
  ExamPhase,
  ExamSrsCardState,
  ExamSrsSnapshot,
  LearningState,
  SchedulerOutcome,
} from "./model";

export interface ReviewEvidence {
  readonly outcome: SchedulerOutcome;
  readonly strengthDelta: number;
}

interface DueEvidence {
  readonly outcome: SchedulerOutcome;
  readonly resultingStrength: number;
  readonly reviewedAtMs: number;
}

export function getStudyDeadlineMs(settings: AppSettings): number | null {
  if (settings.examAt === null) {
    return null;
  }

  const examAtMs = Date.parse(settings.examAt);
  if (!Number.isFinite(examAtMs)) {
    return null;
  }

  return examAtMs - settings.studyBufferHours * HOUR_MS;
}

export function getExamAtMs(settings: AppSettings): number | null {
  if (settings.examAt === null) {
    return null;
  }

  const examAtMs = Date.parse(settings.examAt);
  return Number.isFinite(examAtMs) ? examAtMs : null;
}

export function deriveExamPhase(settings: AppSettings, nowMs: number): ExamPhase {
  const examAtMs = getExamAtMs(settings);
  if (examAtMs === null) {
    return "no_exam";
  }

  const studyDeadlineMs = getStudyDeadlineMs(settings);
  if (studyDeadlineMs === null) {
    return "no_exam";
  }

  if (nowMs < studyDeadlineMs) {
    return "cram";
  }
  if (nowMs < examAtMs) {
    return "buffer";
  }
  return "post_exam";
}

/**
 * Converts one durable review event into the evidence used by Exam-SRS.
 * Explicit objective failure wins over any contradictory self-rating.
 */
export function deriveReviewEvidence(event: ReviewEvent): ReviewEvidence | null {
  if (event.correct === false) {
    return { outcome: "failure", strengthDelta: 0 };
  }

  if (event.rating === "forgot") {
    return { outcome: "failure", strengthDelta: 0 };
  }

  if (event.rating === "struggled") {
    return { outcome: "weak_success", strengthDelta: 0.5 };
  }

  if (event.mode === "mcq" && event.correct === true && event.rating === null) {
    return { outcome: "strong_success", strengthDelta: 0.75 };
  }

  if (event.mode !== "mcq" && (event.correct === true || event.rating === "got_it")) {
    return { outcome: "strong_success", strengthDelta: 1 };
  }

  return null;
}

export function deriveLearningState(
  latestOutcome: SchedulerOutcome | null,
  strength: number,
): LearningState {
  if (latestOutcome === null) {
    return "unseen";
  }
  if (latestOutcome === "failure") {
    return "relearning";
  }
  if (latestOutcome === "weak_success") {
    return "weak";
  }
  return strength < 2 ? "learning" : "learned";
}

export interface AdvanceExamSrsCardStateInput {
  readonly previousState: ExamSrsCardState;
  readonly evidence: ReviewEvidence;
  readonly reviewedAtMs: number;
  /** Preserve an imported timestamp spelling when reconstructing history. */
  readonly reviewedAt?: string;
  readonly settings: AppSettings;
  readonly nowMs: number;
  /** Historical reviewCount includes unusable events; simulation passes its own count. */
  readonly reviewCount?: number;
}

export function createInitialExamSrsCardState(cardId: string): ExamSrsCardState {
  return {
    cardId,
    learningState: "unseen",
    strength: 0,
    reviewCount: 0,
    lastReviewedAt: null,
    lastOutcome: null,
    dueAt: null,
    isDue: false,
  };
}

/**
 * Apply one usable review outcome using the authoritative Exam-SRS rules.
 * Historical reconstruction and forecast simulation both call this primitive.
 */
export function advanceExamSrsCardState(
  input: AdvanceExamSrsCardStateInput,
): ExamSrsCardState {
  const { evidence, previousState } = input;
  const strength =
    evidence.outcome === "failure"
      ? 0
      : Math.min(6, previousState.strength + evidence.strengthDelta);
  const learningState = deriveLearningState(evidence.outcome, strength);
  const dueAtMs = deriveDueAtMs(
    {
      outcome: evidence.outcome,
      resultingStrength: strength,
      reviewedAtMs: input.reviewedAtMs,
    },
    learningState,
    input.settings,
    input.nowMs,
  );

  return {
    cardId: previousState.cardId,
    learningState,
    strength,
    reviewCount: input.reviewCount ?? previousState.reviewCount + 1,
    lastReviewedAt: input.reviewedAt ?? new Date(input.reviewedAtMs).toISOString(),
    lastOutcome: evidence.outcome,
    dueAt: new Date(dueAtMs).toISOString(),
    isDue: dueAtMs <= input.nowMs,
  };
}

/**
 * Recompute only the time-sensitive due fields from compact derived state.
 * This lets a forward simulation cross cram, buffer, and post-exam boundaries
 * without replaying the complete historical ReviewEvent list.
 */
export function refreshExamSrsCardStateAt(
  state: ExamSrsCardState,
  settings: AppSettings,
  nowMs: number,
): ExamSrsCardState {
  if (state.lastOutcome === null || state.lastReviewedAt === null) {
    return state;
  }

  const reviewedAtMs = Date.parse(state.lastReviewedAt);
  if (!Number.isFinite(reviewedAtMs)) {
    return state;
  }

  const dueAtMs = deriveDueAtMs(
    {
      outcome: state.lastOutcome,
      resultingStrength: state.strength,
      reviewedAtMs,
    },
    state.learningState,
    settings,
    nowMs,
  );

  return {
    ...state,
    dueAt: new Date(dueAtMs).toISOString(),
    isDue: dueAtMs <= nowMs,
  };
}

export function deriveCardState(
  cardId: string,
  reviews: readonly ReviewEvent[],
  settings: AppSettings,
  nowMs: number,
): ExamSrsCardState {
  const chronologicalReviews = [...reviews].sort(compareReviewEventsChronologically);
  let state = createInitialExamSrsCardState(cardId);

  for (const [index, review] of chronologicalReviews.entries()) {
    const evidence = deriveReviewEvidence(review);
    const reviewedAtMs = Date.parse(review.reviewedAt);
    if (evidence === null || !Number.isFinite(reviewedAtMs)) {
      continue;
    }

    state = advanceExamSrsCardState({
      previousState: state,
      evidence,
      reviewedAtMs,
      reviewedAt: review.reviewedAt,
      settings,
      nowMs,
      reviewCount: index + 1,
    });
  }

  if (state.lastOutcome === null) {
    return { ...state, reviewCount: chronologicalReviews.length };
  }

  return { ...state, reviewCount: chronologicalReviews.length };
}

export function deriveExamSrsSnapshot(
  cards: readonly Flashcard[],
  reviews: readonly ReviewEvent[],
  settings: AppSettings,
  nowMs: number,
): ExamSrsSnapshot {
  const reviewsByCardId = new Map<string, ReviewEvent[]>();
  for (const review of reviews) {
    const cardReviews = reviewsByCardId.get(review.cardId) ?? [];
    cardReviews.push(review);
    reviewsByCardId.set(review.cardId, cardReviews);
  }

  const states = cards.map((card) =>
    deriveCardState(card.id, reviewsByCardId.get(card.id) ?? [], settings, nowMs),
  );

  return {
    phase: deriveExamPhase(settings, nowMs),
    studyDeadline: isoFromMs(getStudyDeadlineMs(settings)),
    states,
    stateByCardId: Object.fromEntries(states.map((state) => [state.cardId, state])),
  };
}

function deriveDueAtMs(
  latestEvidence: DueEvidence,
  learningState: LearningState,
  settings: AppSettings,
  nowMs: number,
): number {
  const reviewedAtMs = latestEvidence.reviewedAtMs;
  const baseIntervalMs = getBaseIntervalMs(
    latestEvidence.outcome,
    latestEvidence.resultingStrength,
  );
  const examAtMs = getExamAtMs(settings);
  const studyDeadlineMs = getStudyDeadlineMs(settings);
  const currentPhase = deriveExamPhase(settings, nowMs);
  const phaseAtReview = deriveExamPhase(settings, reviewedAtMs);

  // Once the exam has passed, recompute maintenance from the latest review
  // regardless of which finite-horizon phase produced that review.
  if (currentPhase === "post_exam") {
    return reviewedAtMs + baseIntervalMs;
  }

  if (phaseAtReview === "cram" && studyDeadlineMs !== null) {
    const remainingMs = Math.max(0, studyDeadlineMs - reviewedAtMs);
    const intervalMs = Math.min(baseIntervalMs, getDeadlineCapMs(remainingMs));
    const dueAtMs = Math.min(reviewedAtMs + intervalMs, studyDeadlineMs);

    // A learned card whose final pre-deadline interval reaches the target is
    // carried through the deliberate buffer. Overdue learned cards do not get
    // this forgiveness because their dueAt remains before the deadline.
    if (
      currentPhase === "buffer" &&
      learningState === "learned" &&
      examAtMs !== null &&
      dueAtMs >= studyDeadlineMs
    ) {
      return examAtMs;
    }

    return dueAtMs;
  }

  if (phaseAtReview === "buffer" && examAtMs !== null) {
    if (learningState === "learned") {
      return examAtMs;
    }

    const remainingMs = Math.max(0, examAtMs - reviewedAtMs);
    const intervalMs = Math.min(baseIntervalMs, getBufferCapMs(remainingMs));
    return Math.min(reviewedAtMs + intervalMs, examAtMs);
  }

  // no_exam deliberately uses the ordinary baseline interval.
  return reviewedAtMs + baseIntervalMs;
}

function isoFromMs(timestampMs: number | null): string | null {
  return timestampMs === null ? null : new Date(timestampMs).toISOString();
}
