import { useMemo, useState } from "react";
import type { ExamQuestion } from "../../exam/model";
import { analyseMockAttempt } from "../../exam/mock/analytics";
import { scoreMockAttempt } from "../../exam/mock/scoring";
import type { MockAttempt } from "../../exam/mock/model";
import { QuestionStimulus } from "../stimulus/QuestionStimulus";

type ResultFilter = "all" | "incorrect" | "unanswered" | "flagged" | "stimulus";

export function MockResults({
  attempt,
  questionsById,
}: {
  readonly attempt: MockAttempt;
  readonly questionsById: ReadonlyMap<string, ExamQuestion>;
}) {
  const [filter, setFilter] = useState<ResultFilter>("all");
  const result = scoreMockAttempt(attempt);
  const analytics = useMemo(() => analyseMockAttempt(attempt), [attempt]);
  const states = new Map(
    attempt.questionStates.map((state) => [state.questionId, state]),
  );
  const manifests = new Map(
    attempt.manifest.map((manifest) => [manifest.questionId, manifest]),
  );
  const visibleQuestions = attempt.questionOrder
    .map((id, index) => ({
      index,
      manifest: manifests.get(id),
      question: questionsById.get(id),
      state: states.get(id),
    }))
    .filter(
      (
        entry,
      ): entry is {
        readonly index: number;
        readonly manifest: MockAttempt["manifest"][number];
        readonly question: ExamQuestion | undefined;
        readonly state: MockAttempt["questionStates"][number];
      } => entry.manifest !== undefined && entry.state !== undefined,
    )
    .filter((entry) => {
      const { manifest, state } = entry;
      if (state === undefined) return false;
      if (filter === "incorrect")
        return (
          state.selectedChoice !== null &&
          state.selectedChoice !== manifest.correctChoice
        );
      if (filter === "unanswered") return state.selectedChoice === null;
      if (filter === "flagged") return state.flagged;
      if (filter === "stimulus") return manifest.stimulusType !== null;
      return true;
    });
  return (
    <div className="page-stack mock-results">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Mock result · objective scoring</p>
          <h1>
            {result.score} / {result.total}
          </h1>
          <p className="lede">
            {result.percentage.toFixed(1)}% on this generated question set. This is a
            result, not a predicted exam mark.
          </p>
        </div>
        <a className="primary-button heading-action" href="#/mock">
          Start another mock
        </a>
      </section>
      <section className="stat-grid result-stat-grid" aria-label="Mock result summary">
        <ResultStat label="Answered" value={`${result.answered} / 60`} />
        <ResultStat label="Unanswered" value={result.unanswered} />
        <ResultStat
          label="Writing time"
          value={formatMinutes(result.writingTimeUsedMs)}
        />
        <ResultStat
          label="Avg active / question"
          value={formatMinutes(result.averageActiveTimeMs)}
        />
        <ResultStat label="Over ~100 sec" value={result.slowQuestionCount} />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <p className="section-kicker">Analytics</p>
          <h2>Where the set went well</h2>
        </div>
        <AnalyticsTable title="Chapters" buckets={analytics.chapters} />
        <div className="analytics-columns">
          <AnalyticsTable title="Styles" buckets={analytics.styles} />
          <AnalyticsTable title="Difficulty" buckets={analytics.difficulties} />
          <AnalyticsTable
            title="Stimuli and calculations"
            buckets={[analytics.graphs, analytics.tables, analytics.calculations]}
          />
        </div>
      </section>
      <section className="panel result-review-panel">
        <div className="panel-heading">
          <p className="section-kicker">Review</p>
          <h2>Inspect every question</h2>
          <p className="muted-text">
            Mock answers were recorded as objective MCQ reviews. Incorrect and
            unanswered concepts enter or re-enter Exam-SRS relearning; correct answers
            contribute normal MCQ retrieval evidence.
          </p>
        </div>
        <div className="result-filters" role="group" aria-label="Result filters">
          {(["all", "incorrect", "unanswered", "flagged", "stimulus"] as const).map(
            (item) => (
              <button
                type="button"
                className={`secondary-button ${filter === item ? "filter-active" : ""}`}
                key={item}
                onClick={() => setFilter(item)}
              >
                {item === "stimulus"
                  ? "Graphs & tables"
                  : item[0].toUpperCase() + item.slice(1)}
              </button>
            ),
          )}
        </div>
        <div className="result-question-list">
          {visibleQuestions.map(({ index, manifest, question, state }) => {
            const correct =
              state.selectedChoice !== null &&
              state.selectedChoice === manifest.correctChoice;
            return (
              <article className="result-question" key={manifest.questionId}>
                <div className="mock-question-meta">
                  <span>Question {index + 1}</span>
                  <span>
                    Chapter {manifest.chapter} · {question?.topic ?? manifest.style}
                  </span>
                  <strong
                    className={
                      correct ? "result-correct-text" : "result-incorrect-text"
                    }
                  >
                    {correct
                      ? "Correct"
                      : state.selectedChoice === null
                        ? "Unanswered"
                        : "Incorrect"}
                  </strong>
                </div>
                {question === undefined ? (
                  <div className="callout">
                    <p>
                      Historical question content is unavailable in this app version.
                    </p>
                    <p>
                      Stored result:{" "}
                      {correct
                        ? "Correct"
                        : state.selectedChoice === null
                          ? "Unanswered"
                          : "Incorrect"}
                      . Chapter {manifest.chapter} · Difficulty {manifest.difficulty} ·{" "}
                      {manifest.style}
                    </p>
                  </div>
                ) : (
                  <>
                    <QuestionStimulus stimulus={question.stimulus} />
                    <h3>{question.stem}</h3>
                    <ol className="result-choice-list" type="A">
                      {question.choices.map((choice, choiceIndex) => (
                        <li
                          className={`${choiceIndex === manifest.correctChoice ? "correct-choice-row" : ""} ${state.selectedChoice === choiceIndex && choiceIndex !== manifest.correctChoice ? "selected-wrong-row" : ""}`}
                          key={`${manifest.questionId}-${choiceIndex}`}
                        >
                          <span>{choice}</span>
                          {choiceIndex === manifest.correctChoice && (
                            <strong>Correct answer</strong>
                          )}
                          {state.selectedChoice === choiceIndex && <em>Your answer</em>}
                          <details>
                            <summary>Rationale</summary>
                            <p>{question.choiceRationales[choiceIndex]}</p>
                          </details>
                        </li>
                      ))}
                    </ol>
                    <p>
                      <strong>Explanation:</strong> {question.explanation}
                    </p>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <section className="callout callout-accent">
        <div>
          <p className="section-kicker">Continue with Exam-SRS</p>
          <p>
            These mock reviews use the same objective evidence rules as Study. The
            scheduler’s intervals determine when a concept appears next.
          </p>
        </div>
        <a className="secondary-button" href="#/study">
          Study now
        </a>
      </section>
    </div>
  );
}

function ResultStat({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | number;
}) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}
function AnalyticsTable({
  title,
  buckets,
}: {
  readonly title: string;
  readonly buckets: readonly { label: string; correct: number; total: number }[];
}) {
  return (
    <div className="analytics-block">
      <h3>{title}</h3>
      {buckets.map((bucket) => (
        <div className="analytics-row" key={bucket.label}>
          <span>{bucket.label}</span>
          <strong>
            {bucket.correct} / {bucket.total}
          </strong>
        </div>
      ))}
    </div>
  );
}
function formatMinutes(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}
