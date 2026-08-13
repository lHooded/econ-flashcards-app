import { useMemo, useState } from "react";
import { useProgress } from "../app/progressContext";
import { examQuestions } from "../exam/questionBank";
import { buildMockExam } from "../exam/mock/selector";
import { createMockAttempt } from "../exam/mock/model";
import { deriveMockClock } from "../exam/mock/timer";
import { scoreMockAttempt } from "../exam/mock/scoring";
import { formatLocalDateTime } from "../utils/date";
import { getEffectiveManualLearned } from "../study/manualLearned";

export function MockPage() {
  const {
    snapshot,
    createMockAttempt: create,
    abandonMockAttempt: abandon,
  } = useProgress();
  const attempts = useMemo(
    () => snapshot?.mockAttempts ?? [],
    [snapshot?.mockAttempts],
  );
  const manualLearned = useMemo(
    () => getEffectiveManualLearned(snapshot?.manualLearnedOverrides),
    [snapshot?.manualLearnedOverrides],
  );
  const active = attempts.find((attempt) => attempt.status === "active");
  const activeClock =
    active === undefined ? undefined : deriveMockClock(active, Date.now());
  const activeExpired = activeClock?.phase === "expired";
  const [error, setError] = useState<string | null>(null);
  const questionUsage = useMemo(() => {
    const usage = new Map<string, number>();
    for (const attempt of attempts)
      for (const questionId of attempt.questionOrder)
        usage.set(questionId, (usage.get(questionId) ?? 0) + 1);
    return usage;
  }, [attempts]);

  if (snapshot === null) return null;
  const start = async () => {
    setError(null);
    try {
      if (active !== undefined) {
        if (activeExpired) {
          window.location.hash = `#/mock/attempt?id=${encodeURIComponent(active.id)}`;
          return;
        }
        if (
          !window.confirm(
            "Abandon the unfinished mock and start a new one? Its answers will not enter Exam-SRS.",
          )
        )
          return;
        if (abandon === undefined) throw new Error("Mock persistence is unavailable.");
        await abandon(active.id, new Date().toISOString());
      }
      if (create === undefined) throw new Error("Mock persistence is unavailable.");
      const seed =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now());
      const build = buildMockExam({
        bank: examQuestions,
        seed,
        priorAttemptUsage: questionUsage,
        excludedQuestionIds: manualLearned.questionIds,
        excludedReviewCardIds: manualLearned.cardIds,
      });
      const id = `mock-attempt:${seed}`;
      await create(
        createMockAttempt({ ...build, id, seed, createdAt: new Date().toISOString() }),
      );
      window.location.hash = `#/mock/attempt?id=${encodeURIComponent(id)}`;
    } catch (startError: unknown) {
      setError(
        startError instanceof Error
          ? startError.message
          : "The mock could not be started.",
      );
    }
  };

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Full mock exam · Chapters 1–10</p>
          <h1>Rehearse the real clock.</h1>
          <p className="lede">
            60 static multiple-choice questions, 10 minutes of reading time, then 100
            minutes to answer. No pause and no correctness feedback until submission.
          </p>
        </div>
        <button className="primary-button heading-action" type="button" onClick={start}>
          {active === undefined
            ? "Start full mock"
            : activeExpired
              ? "Resume expired mock"
              : "Abandon and start new"}
        </button>
      </section>
      {active !== undefined && (
        <section className="callout callout-accent">
          <div>
            <p className="section-kicker">Unfinished mock</p>
            <h2>
              {activeExpired ? "Expired mock needs finalising" : "Resume your attempt"}
            </h2>
            <p>
              {formatMockProgress(active)} · {clockLabel(active)}
            </p>
            {activeExpired && (
              <p className="muted-text">
                This attempt cannot be abandoned; its unanswered questions must enter
                the normal Exam-SRS evidence history.
              </p>
            )}
          </div>
          <a
            className="secondary-button"
            href={`#/mock/attempt?id=${encodeURIComponent(active.id)}`}
          >
            {activeExpired ? "Finalise expired mock" : "Resume mock exam"}
          </a>
        </section>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <section className="panel mock-rules">
        <div className="panel-heading">
          <p className="section-kicker">Exam shape</p>
          <h2>What this simulation preserves</h2>
        </div>
        <div className="rule-grid">
          <p>
            <strong>60 questions.</strong> Five chapter-specific questions from each
            Chapter 1–10 plus ten integrated Chapter 0 questions.
          </p>
          <p>
            <strong>Stimulus breadth.</strong> Ten graph and five table questions where
            the current bank permits the target.
          </p>
          <p>
            <strong>One concept once.</strong> A generated mock never repeats a
            canonical review-card concept.
          </p>
          <p>
            <strong>Local and resumable.</strong> Answers, flags, timestamps, and the
            selected set are saved in IndexedDB.
          </p>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <p className="section-kicker">Attempt history</p>
          <h2>Recent mocks</h2>
        </div>
        {attempts.filter((attempt) => attempt.status !== "active").length === 0 ? (
          <p className="muted-text">No completed mock attempts yet.</p>
        ) : (
          <div className="attempt-history">
            {attempts
              .filter((attempt) => attempt.status !== "active")
              .sort(
                (a, b) =>
                  Date.parse(b.submittedAt ?? b.abandonedAt ?? b.createdAt) -
                  Date.parse(a.submittedAt ?? a.abandonedAt ?? a.createdAt),
              )
              .map((attempt) => (
                <div className="attempt-history-row" key={attempt.id}>
                  <span>
                    <strong>
                      {attempt.status === "submitted"
                        ? `${scoreMockAttempt(attempt).score} / 60 · ${scoreMockAttempt(attempt).percentage.toFixed(1)}%`
                        : "Abandoned"}
                    </strong>
                    <small>
                      {formatLocalDateTime(
                        attempt.submittedAt ?? attempt.abandonedAt ?? attempt.createdAt,
                      )}
                    </small>
                  </span>
                  {attempt.status === "submitted" ? (
                    <a
                      className="secondary-button"
                      href={`#/mock/attempt?id=${encodeURIComponent(attempt.id)}`}
                    >
                      Open result
                    </a>
                  ) : (
                    <span className="muted-text">Not scored</span>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

function formatMockProgress(attempt: {
  readonly questionStates: readonly { readonly selectedChoice: number | null }[];
}): string {
  const answered = attempt.questionStates.filter(
    (state) => state.selectedChoice !== null,
  ).length;
  return `${answered} / 60 answered`;
}
function clockLabel(attempt: Parameters<typeof deriveMockClock>[0]): string {
  const clock = deriveMockClock(attempt, Date.now());
  return clock.phase === "reading"
    ? "Reading phase"
    : clock.phase === "writing"
      ? "Writing phase"
      : "Time expired — resume to finalise";
}
