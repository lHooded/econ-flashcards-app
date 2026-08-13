import {
  compareReviewEventsChronologically,
  type AppSettings,
  type ReviewEvent,
} from "../../domain/progress";
import { MINUTE_MS } from "../examSrs/intervals";
import type { ExamSrsSnapshot } from "../examSrs/model";

export const FORECAST_CLOCK_BUCKET_MS = 5 * MINUTE_MS;

/**
 * Stable Home-page identity for forecast inputs. The coarse time bucket keeps
 * the clock from restarting a 256-run calculation every few seconds, while
 * explicit manual card/concept sets make operational changes invalidate it.
 */
export function buildForecastClockKey(input: {
  readonly nowMs: number;
  readonly scheduler: Pick<ExamSrsSnapshot, "phase" | "states"> | null;
  readonly reviewEvents: readonly ReviewEvent[] | null;
  readonly settings: AppSettings | null;
  readonly manuallyLearnedCardIds?: ReadonlySet<string>;
  readonly manuallySatisfiedConceptIds?: ReadonlySet<string>;
}): string {
  if (input.scheduler === null || input.settings === null) return "loading";

  const history = (input.reviewEvents ?? [])
    .slice()
    .sort(compareReviewEventsChronologically)
    .map((review) =>
      [
        review.id,
        review.cardId,
        review.reviewedAt,
        review.mode,
        review.correct,
        review.rating,
        review.responseTimeMs,
        review.selectedChoice,
      ].join(":"),
    )
    .join(",");
  const sortedIds = (ids: ReadonlySet<string> | undefined): string =>
    [...(ids ?? [])].sort().join(",");

  return [
    Math.floor(input.nowMs / FORECAST_CLOCK_BUCKET_MS),
    input.scheduler.phase,
    input.scheduler.states
      .filter((state) => state.isDue && state.isManuallyLearned !== true)
      .map((state) => state.cardId)
      .sort()
      .join(","),
    history,
    input.settings.examAt ?? "no-exam",
    input.settings.studyBufferHours,
    sortedIds(input.manuallyLearnedCardIds),
    sortedIds(input.manuallySatisfiedConceptIds),
  ].join("|");
}
