export type ReviewMode = "recall" | "mcq" | "calculation";

export type ReviewRating = "forgot" | "struggled" | "got_it";

export interface ReviewEvent {
  readonly id: string;
  readonly cardId: string;
  readonly reviewedAt: string;
  readonly mode: ReviewMode;
  readonly correct: boolean | null;
  readonly rating: ReviewRating | null;
  readonly responseTimeMs: number | null;
  readonly selectedChoice: number | null;
}

export interface CardState {
  readonly cardId: string;
  readonly firstSeenAt: string | null;
  readonly lastSeenAt: string | null;
  readonly totalReviews: number;
  readonly correctReviews: number;
  readonly consecutiveCorrect: number;
}

export interface AppSettings {
  readonly examAt: string | null;
  readonly studyBufferHours: number;
}

export interface ProgressSnapshot {
  readonly settings: AppSettings;
  readonly cardStates: Readonly<Record<string, CardState>>;
  readonly reviewEvents: readonly ReviewEvent[];
  /** Optional for compatibility with snapshots created before manual exclusions. */
  readonly manualLearnedOverrides?: readonly import("./manualLearned").ManualLearnedOverride[];
  /** Optional for compatibility with pre-mock snapshot fixtures. */
  readonly mockAttempts?: readonly import("../exam/mock/model").MockAttempt[];
  /** Optional for compatibility with snapshots created before Guided lesson persistence. */
  readonly lessonSeenConceptIds?: readonly string[];
}

export type NewReviewEvent = Omit<ReviewEvent, "id" | "reviewedAt"> & {
  readonly id?: string;
  readonly reviewedAt?: string;
};

export const DEFAULT_APP_SETTINGS: AppSettings = Object.freeze({
  examAt: null,
  studyBufferHours: 24,
});

const REVIEW_MODES: readonly ReviewMode[] = ["recall", "mcq", "calculation"];
const REVIEW_RATINGS: readonly ReviewRating[] = ["forgot", "struggled", "got_it"];

export function isReviewMode(value: unknown): value is ReviewMode {
  return typeof value === "string" && REVIEW_MODES.includes(value as ReviewMode);
}

export function isReviewRating(value: unknown): value is ReviewRating {
  return typeof value === "string" && REVIEW_RATINGS.includes(value as ReviewRating);
}

/**
 * Review history is chronological by the parsed instant, with the event ID
 * providing a deterministic tie-breaker. Imported timestamps may use
 * different, equivalent offsets, so ISO string comparison is not sufficient.
 */
export function compareReviewEventsChronologically(
  left: ReviewEvent,
  right: ReviewEvent,
): number {
  const leftTime = Date.parse(left.reviewedAt);
  const rightTime = Date.parse(right.reviewedAt);

  if (leftTime < rightTime) {
    return -1;
  }
  if (leftTime > rightTime) {
    return 1;
  }

  if (left.id < right.id) {
    return -1;
  }
  if (left.id > right.id) {
    return 1;
  }

  return 0;
}

export function sortReviewEventsChronologically(
  reviews: readonly ReviewEvent[],
): ReviewEvent[] {
  return [...reviews].sort(compareReviewEventsChronologically);
}

export function createEmptyCardState(cardId: string): CardState {
  return {
    cardId,
    firstSeenAt: null,
    lastSeenAt: null,
    totalReviews: 0,
    correctReviews: 0,
    consecutiveCorrect: 0,
  };
}

export function applyReviewToCardState(
  previous: CardState | undefined,
  event: ReviewEvent,
): CardState {
  const state = previous ?? createEmptyCardState(event.cardId);
  const wasCorrect = event.correct === true;

  return {
    cardId: event.cardId,
    firstSeenAt: state.firstSeenAt ?? event.reviewedAt,
    lastSeenAt: event.reviewedAt,
    totalReviews: state.totalReviews + 1,
    correctReviews: state.correctReviews + (wasCorrect ? 1 : 0),
    consecutiveCorrect: wasCorrect ? state.consecutiveCorrect + 1 : 0,
  };
}

/**
 * Rebuild one card's derived state from its complete chronological history.
 *
 * This is intentionally separate from the incremental write path: imported or
 * delayed mock reviews can be older than a review already recorded by Study.
 */
export function deriveCardStateFromReviews(
  cardId: string,
  reviews: readonly ReviewEvent[],
): CardState {
  const chronological = sortReviewEventsChronologically(
    reviews.filter((review) => review.cardId === cardId),
  );
  let state = createEmptyCardState(cardId);
  for (const review of chronological) {
    state = applyReviewToCardState(state, review);
  }
  return state;
}

function createReviewId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `review-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createReviewEvent(input: NewReviewEvent): ReviewEvent {
  if (!isReviewMode(input.mode)) {
    throw new Error(`Unsupported review mode: ${String(input.mode)}`);
  }

  if (input.rating !== null && !isReviewRating(input.rating)) {
    throw new Error(`Unsupported review rating: ${String(input.rating)}`);
  }

  const reviewedAt = input.reviewedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(reviewedAt))) {
    throw new Error("Review timestamp must be a valid ISO date-time.");
  }

  if (
    input.responseTimeMs !== null &&
    (!Number.isFinite(input.responseTimeMs) || input.responseTimeMs < 0)
  ) {
    throw new Error("Response time must be null or a non-negative number.");
  }

  if (
    input.selectedChoice !== null &&
    (!Number.isInteger(input.selectedChoice) || input.selectedChoice < 0)
  ) {
    throw new Error("Selected choice must be null or a non-negative integer.");
  }

  if (input.id !== undefined && input.id.trim().length === 0) {
    throw new Error("Review event ID cannot be empty.");
  }

  return {
    id: input.id ?? createReviewId(),
    cardId: input.cardId,
    reviewedAt,
    mode: input.mode,
    correct: input.correct,
    rating: input.rating,
    responseTimeMs: input.responseTimeMs,
    selectedChoice: input.selectedChoice,
  };
}

export function validateSettings(input: unknown): AppSettings {
  if (!isRecord(input)) {
    throw new Error("Settings must be an object.");
  }

  const { examAt, studyBufferHours } = input;
  if (examAt !== null && typeof examAt !== "string") {
    throw new Error("examAt must be an ISO date-time string or null.");
  }

  if (examAt !== null && !Number.isFinite(Date.parse(examAt))) {
    throw new Error("examAt must be a valid date-time.");
  }

  if (
    typeof studyBufferHours !== "number" ||
    !Number.isFinite(studyBufferHours) ||
    studyBufferHours < 0
  ) {
    throw new Error("studyBufferHours must be a non-negative number.");
  }

  return {
    examAt,
    studyBufferHours,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
