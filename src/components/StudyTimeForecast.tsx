import type {
  ForecastDeadlineStatus,
  ForecastRange,
  StudyTimeForecast,
  TargetForecast,
} from "../study/forecast/model";
import { STUDY_FORECAST_TARGETS } from "../study/forecast/targets";

interface StudyTimeForecastProps {
  readonly forecast: StudyTimeForecast;
}

export function StudyTimeForecast({ forecast }: StudyTimeForecastProps) {
  const recommendationLabel =
    forecast.recommendation.targetId === null
      ? null
      : forecast.targets.find(
          (target) => target.id === forecast.recommendation.targetId,
        )?.label;

  return (
    <section
      className="study-time-forecast panel"
      aria-labelledby="study-forecast-title"
    >
      <div className="panel-heading forecast-heading">
        <p className="section-kicker">Study time forecast</p>
        <h2 id="study-forecast-title">How far could you realistically get?</h2>
        <p className="muted-text">
          App-defined study targets based on your current Exam-SRS state, recent pace,
          and spacing.
        </p>
      </div>

      <div className="forecast-target-list">
        {forecast.targets.map((target) => (
          <ForecastTargetRow key={target.id} target={target} />
        ))}
      </div>

      <div className="forecast-meta">
        <p>
          At your recent pace:{" "}
          <strong>
            ~{formatReviewsPerHour(forecast.pace.reviewsPerHour)} reviews/hour
          </strong>
        </p>
        <p className="muted-text">
          {forecast.pace.sampleSize > 0
            ? `Based on ${forecast.pace.sampleSize} recent review cycles · ${forecast.confidence} confidence`
            : `Early estimate · ${forecast.confidence} confidence — this will calibrate as you study.`}
        </p>
      </div>

      <div className="forecast-recommendation callout callout-accent">
        <div>
          <p className="section-kicker">Recommendation</p>
          <h3>
            {recommendationLabel === null
              ? "You have reached every forecast target."
              : `Recommended target: ${recommendationLabel}`}
          </h3>
          <p>{forecast.recommendation.explanation}</p>
        </div>
      </div>

      <details className="forecast-help">
        <summary>How is this calculated?</summary>
        <div className="forecast-help-copy">
          <p>
            These are transparent, operational study targets: coverage, operational
            Learned-card thresholds, and an exam-yield critical-card constraint. Active
            manual learned overrides count toward operational coverage and Learned, but
            remain separate from retrieval evidence. Exam yield is used only as an
            importance label, not as a mark or mastery score.
          </p>
          <p>
            The forecast calibrates review-cycle timing from recent event timestamps,
            uses your recent failure / weak-success / strong-success mix, and runs a
            deterministic model of normal Exam-SRS selection and spacing. When some runs
            do not reach a target within the model horizon, its reported quantiles
            account for those censored runs and are shown only when identifiable.
          </p>
          <p>
            Active study time is the time spent completing reviews. Elapsed time also
            includes waiting for due intervals. This is not a predicted exam mark,
            probability of recall, or guarantee of exam performance.
          </p>
        </div>
      </details>
    </section>
  );
}

function ForecastTargetRow({ target }: { readonly target: TargetForecast }) {
  return (
    <details
      className={`forecast-target ${target.achieved ? "forecast-target-achieved" : ""}`}
    >
      <summary className="forecast-target-summary">
        <span className="forecast-target-name">
          <strong>{target.label}</strong>
          <small>{targetLabelDetail(target)}</small>
        </span>
        <span className="forecast-target-time">
          <strong>{target.achieved ? "Achieved" : formatTargetSummary(target)}</strong>
          {!target.achieved && (
            <small>{formatDeadlineStatus(target.deadlineStatus)}</small>
          )}
        </span>
      </summary>
      <div className="forecast-target-details">
        <p className="forecast-status-line">
          <strong>
            {target.achieved ? "Achieved" : formatDeadlineStatus(target.deadlineStatus)}
          </strong>
          {!target.achieved && target.deadlineConstraint === "spacing"
            ? " · spacing-constrained"
            : ""}
          {target.simulationStatus === "censored"
            ? ` · censored: ${formatCompletionFraction(target)} of runs reached it`
            : target.simulationStatus === "unresolved"
              ? ` · ${formatCompletionFraction(target)} of runs reached it`
              : ""}
        </p>
        <p className="muted-text">{target.criterion}</p>
        <div className="forecast-detail-grid">
          <div>
            <span>Current</span>
            <strong>
              {Math.round(target.currentCoverage)}% covered · {target.currentLearned}{" "}
              operationally Learned
            </strong>
          </div>
          {target.id === "coverage" ? (
            <div>
              <span>Coverage target</span>
              <strong>
                {target.currentSeen}/{target.totalCards} covered → {target.totalCards}/
                {target.totalCards} covered
              </strong>
            </div>
          ) : (
            <div>
              <span>Operational Learned target</span>
              <strong>{target.targetLearned} cards</strong>
            </div>
          )}
          {target.activeMinutes.median === null ? (
            <div>
              <span>Model estimate</span>
              <strong>Median not reliably reached within model horizon</strong>
            </div>
          ) : (
            <>
              <div>
                <span>Additional reviews</span>
                <strong>{formatRange(target.additionalReviews, formatReviews)}</strong>
              </div>
              <div>
                <span>Active study</span>
                <strong>{formatRange(target.activeMinutes, formatMinutes)}</strong>
              </div>
              <div>
                <span>Elapsed with spacing</span>
                <strong>{formatRangeMs(target.elapsedMs)}</strong>
              </div>
            </>
          )}
          <div>
            <span>Simulation evidence</span>
            <strong>
              {target.completedRuns}/{target.simulationRuns} runs reached it (
              {formatCompletionFraction(target)})
              {target.censorReasons.length > 0
                ? ` · ${formatCensorReasons(target)}`
                : ""}
            </strong>
          </div>
          {target.criticalCardCount > 0 && (
            <div>
              <span>Critical cards</span>
              <strong>
                {target.currentCriticalSeen}/{target.criticalCardCount} covered ·{" "}
                {target.currentCriticalLearned}/{target.criticalCardCount} operationally
                Learned
              </strong>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

function targetLabelDetail(target: TargetForecast): string {
  if (target.id === "coverage") {
    return `${target.currentSeen}/${target.totalCards} covered · 100% coverage target`;
  }
  const definition = STUDY_FORECAST_TARGETS.find(
    (candidate) => candidate.id === target.id,
  );
  return `${definition?.learnedPercent ?? 0}% operational Learned target`;
}

function formatDeadlineStatus(status: ForecastDeadlineStatus): string {
  switch (status) {
    case "achieved":
      return "Achieved";
    case "comfortable":
      return "Reachable comfortably";
    case "tight":
      return "Tight model range";
    case "buffer":
      return "Likely needs the buffer";
    case "after_exam":
      return "Likely after exam";
    case "no_exam":
      return "No exam deadline set";
    case "unresolved":
      return "Not reliably reached within model horizon";
  }
}

function formatTargetSummary(target: TargetForecast): string {
  if (target.activeMinutes.median === null) {
    return "> model horizon";
  }
  const active = formatActiveDuration(target.activeMinutes.median);
  if (target.activeMinutes.high === null) {
    return `${active} · upper unresolved`;
  }
  return target.simulationStatus === "censored" ? `${active} · censored` : active;
}

function formatCompletionFraction(target: TargetForecast): string {
  return `${Math.round(target.completionFraction * 100)}%`;
}

function formatCensorReasons(target: TargetForecast): string {
  return target.censorReasons
    .map((reason) => {
      switch (reason) {
        case "review_count_cap":
          return "review-count horizon";
        case "elapsed_horizon":
          return "elapsed-time horizon";
        case "no_eligible_card":
          return "no eligible card";
      }
    })
    .join(", ");
}

function formatActiveDuration(minutes: number): string {
  return `~${formatMinutes(minutes)} active`;
}

function formatRange(
  range: ForecastRange,
  formatter: (value: number) => string,
): string {
  if (range.median === null) return "Not reliably reached";
  if (range.low !== null && range.high !== null) {
    if (range.low === range.high) return formatter(range.median);
    return `${formatter(range.low)}–${formatter(range.high)}`;
  }
  if (range.high === null) {
    return `${formatter(range.median)} median · upper beyond model horizon`;
  }
  return `lower unresolved · ${formatter(range.median)} median–${formatter(range.high)}`;
}

function formatRangeMs(range: ForecastRange): string {
  return formatRange(range, formatElapsed);
}

function formatMinutes(value: number): string {
  const rounded = Math.max(0, Math.round(value));
  if (rounded < 60) return `${rounded}m`;
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function formatElapsed(valueMs: number): string {
  return formatMinutes(valueMs / (60 * 1000));
}

function formatReviews(value: number): string {
  return `${Math.max(0, Math.round(value))} reviews`;
}

function formatReviewsPerHour(value: number): string {
  return String(Math.max(1, Math.round(value)));
}
