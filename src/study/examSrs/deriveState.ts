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

interface LatestEvidence {
  readonly event: ReviewEvent;
  readonly outcome: SchedulerOutcome;
  readonly resultingStrength: number;
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

export function deriveCardState(
  cardId: string,
  reviews: readonly ReviewEvent[],
  settings: AppSettings,
  nowMs: number,
  manuallyLearnedCardIds?: ReadonlySet<string>,
): ExamSrsCardState {
  const isManuallyLearned = manuallyLearnedCardIds?.has(cardId) === true;
  const chronologicalReviews = [...reviews].sort(compareReviewEventsChronologically);
  let strength = 0;
  let latestEvidence: LatestEvidence | null = null;

  for (const review of chronologicalReviews) {
    const evidence = deriveReviewEvidence(review);
    if (evidence === null || !Number.isFinite(Date.parse(review.reviewedAt))) {
      continue;
    }

    strength =
      evidence.outcome === "failure"
        ? 0
        : Math.min(6, strength + evidence.strengthDelta);
    latestEvidence = {
      event: review,
      outcome: evidence.outcome,
      resultingStrength: strength,
    };
  }

  if (latestEvidence === null) {
    return {
      cardId,
      learningState: isManuallyLearned ? "learned" : "unseen",
      strength: 0,
      reviewCount: chronologicalReviews.length,
      lastReviewedAt: null,
      lastOutcome: null,
      dueAt: null,
      isDue: false,
      ...(isManuallyLearned ? { isManuallyLearned: true } : {}),
    };
  }

  const learningState = deriveLearningState(
    latestEvidence.outcome,
    latestEvidence.resultingStrength,
  );
  // Manual exclusion supersedes the operational state without changing the
  // evidence fields above. Return before due-date derivation so refresh and
  // simulation code cannot accidentally schedule this card again.
  if (isManuallyLearned) {
    return {
      cardId,
      learningState: "learned",
      strength: latestEvidence.resultingStrength,
      reviewCount: chronologicalReviews.length,
      lastReviewedAt: latestEvidence.event.reviewedAt,
      lastOutcome: latestEvidence.outcome,
      dueAt: null,
      isDue: false,
      isManuallyLearned: true,
    };
  }

  const dueAtMs = deriveDueAtMs(latestEvidence, learningState, settings, nowMs);
  const dueAt = new Date(dueAtMs).toISOString();

  const derived: ExamSrsCardState = {
    cardId,
    learningState,
    strength: latestEvidence.resultingStrength,
    reviewCount: chronologicalReviews.length,
    lastReviewedAt: latestEvidence.event.reviewedAt,
    lastOutcome: latestEvidence.outcome,
    dueAt,
    isDue: dueAtMs <= nowMs,
  };
  return derived;
}

export function deriveExamSrsSnapshot(
  cards: readonly Flashcard[],
  reviews: readonly ReviewEvent[],
  settings: AppSettings,
  nowMs: number,
  manuallyLearnedCardIds?: ReadonlySet<string>,
): ExamSrsSnapshot {
  const reviewsByCardId = new Map<string, ReviewEvent[]>();
  for (const review of reviews) {
    const cardReviews = reviewsByCardId.get(review.cardId) ?? [];
    cardReviews.push(review);
    reviewsByCardId.set(review.cardId, cardReviews);
  }

  const states = cards.map((card) =>
    deriveCardState(
      card.id,
      reviewsByCardId.get(card.id) ?? [],
      settings,
      nowMs,
      manuallyLearnedCardIds,
    ),
  );

  return {
    phase: deriveExamPhase(settings, nowMs),
    studyDeadline: isoFromMs(getStudyDeadlineMs(settings)),
    states,
    stateByCardId: Object.fromEntries(states.map((state) => [state.cardId, state])),
  };
}

function deriveDueAtMs(
  latestEvidence: LatestEvidence,
  learningState: LearningState,
  settings: AppSettings,
  nowMs: number,
): number {
  const reviewedAtMs = Date.parse(latestEvidence.event.reviewedAt);
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
