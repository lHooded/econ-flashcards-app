import {
  sortReviewEventsChronologically,
  type AppSettings,
  type ReviewEvent,
} from "../../domain/progress";

/** Stable model identifier included in every forecast seed and output. */
export const STUDY_TIME_FORECAST_MODEL_VERSION = "study-time-forecast-v1.1";

export interface SeededRandom {
  readonly next: () => number;
}

/** Small dependency-free deterministic PRNG for simulation-only randomness. */
export function createSeededRandom(seed: number): SeededRandom {
  let state = seed >>> 0 || 0x9e3779b9;

  return {
    next: () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = Math.imul(state ^ (state >>> 15), 1 | state);
      value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    },
  };
}

export function hashForecastSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 0x9e3779b9;
}

/**
 * The clock is intentionally absent. Current time changes which cards are due,
 * but it must not reshuffle the simulated outcomes between renders.
 */
export function seedForecastSimulation(
  reviews: readonly ReviewEvent[],
  settings: AppSettings,
): number {
  const history = sortReviewEventsChronologically(reviews)
    .map((review) =>
      [
        review.id,
        review.cardId,
        review.reviewedAt,
        review.mode,
        review.correct === null ? "null" : String(review.correct),
        review.rating ?? "null",
        review.responseTimeMs === null ? "null" : String(review.responseTimeMs),
        review.selectedChoice === null ? "null" : String(review.selectedChoice),
      ].join("|"),
    )
    .join("\u001e");
  return hashForecastSeed(
    [
      STUDY_TIME_FORECAST_MODEL_VERSION,
      settings.examAt ?? "null",
      String(settings.studyBufferHours),
      history,
    ].join("\u001f"),
  );
}
