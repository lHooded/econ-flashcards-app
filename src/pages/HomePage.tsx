import { useEffect, useMemo, useRef, useState } from "react";
import { useProgress } from "../app/progressContext";
import type { AppSettings, ReviewEvent } from "../domain/progress";
import { StatCard } from "../components/StatCard";
import { cards, deck } from "../data/deck";
import { deriveExamSrsSnapshot } from "../study/examSrs/deriveState";
import { summarizeExamSrs } from "../study/examSrs/summary";
import {
  formatLocalDateTime,
  formatTimeRemaining,
  getStudyDeadline,
} from "../utils/date";
import { useNow } from "../utils/useNow";
import { buildStudyHash } from "../study/studyScope";
import { deriveMockClock } from "../exam/mock/timer";
import { KnowledgeText } from "../components/knowledge/KnowledgeText";
import { StudyTimeForecast } from "../components/StudyTimeForecast";
import type { DeriveStudyTimeForecastInput } from "../study/forecast/forecast";
import { buildForecastClockKey } from "../study/forecast/clockKey";
import type { StudyTimeForecast as StudyTimeForecastModel } from "../study/forecast/model";
import {
  reduceForecastWorkerResponse,
  type ForecastWorkerResponse,
} from "../study/forecast/workerProtocol";

import { getEffectiveManualLearned } from "../study/manualLearned";

function phaseLabel(phase: ReturnType<typeof deriveExamSrsSnapshot>["phase"]): string {
  switch (phase) {
    case "cram":
      return "Cram";
    case "buffer":
      return "Buffer";
    case "post_exam":
      return "Maintenance";
    case "no_exam":
      return "No exam configured";
  }
}

export function HomePage() {
  const { snapshot } = useProgress();
  const nowMs = useNow();
  const manualLearned = useMemo(
    () => getEffectiveManualLearned(snapshot?.manualLearnedOverrides),
    [snapshot?.manualLearnedOverrides],
  );
  const scheduler = useMemo(
    () =>
      snapshot === null
        ? null
        : deriveExamSrsSnapshot(
            cards,
            snapshot.reviewEvents,
            snapshot.settings,
            nowMs,
            manualLearned.cardIds,
          ),
    [manualLearned.cardIds, nowMs, snapshot],
  );
  const evidenceScheduler = useMemo(
    () =>
      snapshot === null
        ? null
        : deriveExamSrsSnapshot(cards, snapshot.reviewEvents, snapshot.settings, nowMs),
    [nowMs, snapshot],
  );
  const summary = useMemo(
    () =>
      scheduler === null || evidenceScheduler === null
        ? null
        : summarizeExamSrs(
            cards,
            scheduler,
            deck.metadata.chapterNames,
            evidenceScheduler,
          ),
    [evidenceScheduler, scheduler],
  );
  const forecastClockKey = useMemo(
    () =>
      buildForecastClockKey({
        nowMs,
        scheduler,
        reviewEvents: snapshot?.reviewEvents ?? null,
        settings: snapshot?.settings ?? null,
        manuallyLearnedCardIds: manualLearned.cardIds,
        manuallySatisfiedConceptIds: manualLearned.coveredConceptIds,
      }),
    [
      manualLearned.cardIds,
      manualLearned.coveredConceptIds,
      nowMs,
      scheduler,
      snapshot,
    ],
  );
  const forecastInputs = useStableForecastInputs(
    forecastClockKey,
    scheduler,
    nowMs,
    snapshot?.reviewEvents ?? null,
    snapshot?.settings ?? null,
    manualLearned.coveredConceptIds,
  );
  const forecastRequest = useMemo<DeriveStudyTimeForecastInput | null>(
    () =>
      forecastInputs.scheduler === null ||
      forecastInputs.reviewEvents === null ||
      forecastInputs.settings === null
        ? null
        : {
            cards,
            reviewEvents: forecastInputs.reviewEvents,
            settings: forecastInputs.settings,
            scheduler: forecastInputs.scheduler,
            nowMs: forecastInputs.nowMs,
            manuallySatisfiedConceptIds: forecastInputs.manuallySatisfiedConceptIds,
          },
    [forecastInputs],
  );
  const forecastState = useStudyTimeForecast(forecastRequest);

  if (snapshot === null || scheduler === null || summary === null) {
    return null;
  }

  const studyDeadline = getStudyDeadline(
    snapshot.settings.examAt,
    snapshot.settings.studyBufferHours,
  );

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Exam-SRS · deadline-aware retrieval practice</p>
          <h1>Make the next retrieval count.</h1>
          <p className="lede">
            <KnowledgeText text="A transparent finite-horizon study heuristic for the full macroeconomics deck." />
          </p>
        </div>
        <a className="primary-button heading-action" href="#/study">
          Study now
        </a>
      </section>

      {(() => {
        const activeMock = snapshot.mockAttempts?.find(
          (attempt) => attempt.status === "active",
        );
        if (activeMock === undefined) return null;
        const clock = deriveMockClock(activeMock, nowMs);
        const answered = activeMock.questionStates.filter(
          (state) => state.selectedChoice !== null,
        ).length;
        return (
          <section className="callout callout-accent home-resume-mock">
            <div>
              <p className="section-kicker">Full mock in progress</p>
              <h2>Resume mock exam</h2>
              <p>
                {clock.phase === "expired"
                  ? "This attempt has expired and will be finalised when opened."
                  : `${clock.phase === "reading" ? "Reading" : "Writing"} phase · ${answered} / 60 answered`}
              </p>
            </div>
            <a
              className="primary-button"
              href={`#/mock/attempt?id=${encodeURIComponent(activeMock.id)}`}
            >
              Resume mock exam
            </a>
          </section>
        );
      })()}

      <section className="workflow-strip" aria-label="Main workflow">
        <a className="workflow-primary" href="#/study">
          <strong>Study now</strong>
          <span>Exam-SRS recommendation</span>
        </a>
        <a href="#/guided">
          <strong>Guided Cram</strong>
          <span>Prerequisites + retrieval + deadline-aware review</span>
        </a>
        <a href="#/high-yield">
          <strong>High-Yield Cram</strong>
          <span>Evidence-backed final priorities shaped by your progress</span>
        </a>
        <a href="#/super-cram">
          <strong>Super Cram</strong>
          <span>Cheat-sheet-aware MCQ drilling</span>
        </a>
        <a href="#/mock">
          <strong>Full mock exam</strong>
          <span>Realistic 60-question simulation</span>
        </a>
        <a href="#/practice">
          <strong>Practice Lab</strong>
          <span>Untimed deliberate drills</span>
        </a>
      </section>

      <section className="stat-grid" aria-label="Exam-SRS progress">
        <StatCard label="Total cards" value={summary.total} detail="Canonical deck" />
        <StatCard
          label="Unseen"
          value={summary.unseen}
          detail="No review evidence or manual override"
        />
        <StatCard
          label="Coverage"
          value={`${summary.coveragePercent}%`}
          detail={`${summary.seen} / ${summary.total} covered`}
        />
        <StatCard
          label="Learned"
          value={`${summary.learned} / ${summary.total}`}
          detail={`${summary.evidenceLearned} from retrieval · ${summary.manuallyLearnedOnly} manual-only`}
        />
        <StatCard label="Due now" value={summary.dueNow} detail="Scheduled reviews" />
        <StatCard
          label="Relearning / weak"
          value={summary.relearning + summary.weak}
          detail={`${summary.learning} still learning`}
        />
      </section>

      {forecastState.error !== null ? (
        <section className="study-time-forecast panel" role="alert">
          <p className="section-kicker">Study time forecast</p>
          <h2>Study forecast unavailable right now</h2>
          <p className="muted-text">
            Your progress is safe. The estimate could not be calculated in the
            background, so the rest of Home remains available.
          </p>
          <button
            className="secondary-button"
            type="button"
            onClick={forecastState.retry}
          >
            Retry forecast
          </button>
        </section>
      ) : forecastState.forecast === null ? (
        <section className="study-time-forecast panel" aria-live="polite">
          <p className="section-kicker">Study time forecast</p>
          <h2>Calibrating your study estimate…</h2>
          <p className="muted-text">
            The model is checking your recent pace and Exam-SRS spacing in the
            background.
          </p>
        </section>
      ) : (
        <StudyTimeForecast forecast={forecastState.forecast} />
      )}

      <section className="quick-start panel" aria-labelledby="quick-start-title">
        <div className="panel-heading quick-start-heading">
          <p className="section-kicker">Quick starts</p>
          <h2 id="quick-start-title">Choose a useful cram path.</h2>
          <p className="muted-text">
            These shortcuts restrict the candidate pool; Exam-SRS still chooses the
            order inside it.
          </p>
        </div>
        <div className="quick-action-list">
          <a
            className="secondary-button quick-action"
            href={buildStudyHash({ preset: "needs_work", chapter: null })}
          >
            Needs work
          </a>
          <a
            className="secondary-button quick-action"
            href={buildStudyHash({ preset: "new", chapter: null })}
          >
            New cards
          </a>
          <a
            className="secondary-button quick-action"
            href={buildStudyHash({ preset: "calculations", chapter: null })}
          >
            Calculations
          </a>
          <a
            className="secondary-button quick-action"
            href={buildStudyHash({ preset: "mcq", chapter: null })}
          >
            MCQs
          </a>
        </div>
      </section>

      {snapshot.settings.examAt === null ? (
        <section className="callout callout-accent">
          <div>
            <p className="section-kicker">Set your target</p>
            <h2>Give Exam-SRS a real exam time.</h2>
            <p>
              The default 24-hour buffer is deliberate: the scheduler aims to bring
              cards to criterion before the exam rather than churning every card at the
              last minute.
            </p>
          </div>
          <a className="secondary-button" href="#/settings">
            Configure exam
          </a>
        </section>
      ) : (
        <section className="deadline-grid" aria-label="Exam timing and scheduler phase">
          <div className="info-panel">
            <p className="section-kicker">Exam target</p>
            <p className="info-value">
              {formatLocalDateTime(snapshot.settings.examAt)}
            </p>
            <p className="muted-text">Displayed in your browser’s local timezone.</p>
          </div>
          <div className="info-panel info-panel-deadline">
            <p className="section-kicker">Exam-SRS phase</p>
            <p className="info-value">{phaseLabel(summary.phase)}</p>
            <p className="muted-text">
              {summary.phase === "cram"
                ? `${formatTimeRemaining(studyDeadline, nowMs)} to the effective deadline.`
                : summary.phase === "buffer"
                  ? `${formatTimeRemaining(snapshot.settings.examAt, nowMs)} to the exam.`
                  : "Ordinary maintenance intervals are active."}
            </p>
          </div>
          <div className="info-panel info-panel-deadline">
            <p className="section-kicker">Effective study deadline</p>
            <p className="info-value">{formatLocalDateTime(studyDeadline)}</p>
            <p className="muted-text">
              Exam time minus your deliberate {snapshot.settings.studyBufferHours}-hour
              buffer.
            </p>
          </div>
        </section>
      )}

      <section className="panel chapter-panel">
        <div className="panel-heading">
          <p className="section-kicker">Syllabus coverage</p>
          <h2>Chapter breakdown</h2>
        </div>
        <div className="chapter-breakdown" role="table" aria-label="Chapter progress">
          <div className="chapter-row chapter-header" role="row">
            <span role="columnheader">Chapter</span>
            <span role="columnheader">Covered</span>
            <span role="columnheader">Learned</span>
            <span role="columnheader">Manual-only</span>
            <span role="columnheader">Due</span>
          </div>
          {summary.chapterSummaries.map((chapter) => (
            <div
              className={`chapter-row ${chapter.chapter === 0 ? "chapter-mixed" : ""}`}
              role="row"
              key={chapter.chapter}
            >
              <span className="chapter-name" role="cell">
                <strong>Ch. {chapter.chapter}</strong> {chapter.name}
              </span>
              <span data-label="Covered" role="cell">
                {chapter.seen} / {chapter.total}
              </span>
              <span data-label="Learned" role="cell">
                {chapter.learned} / {chapter.total}
              </span>
              <span data-label="Manual-only" role="cell">
                {chapter.manuallyLearnedOnly}
              </span>
              <span data-label="Due" role="cell">
                {chapter.dueNow}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="callout">
        <div>
          <p className="section-kicker">What is saved</p>
          <p>
            Every answer and self-rating is saved locally in IndexedDB. Export a JSON
            backup from Settings / Data whenever you want a portable copy; importing it
            recreates the same derived Exam-SRS state.
          </p>
        </div>
        <a className="text-link" href="#/settings">
          Manage data →
        </a>
      </section>

      <details className="help-details">
        <summary>How Exam-SRS labels cards</summary>
        <div className="terminology-grid">
          <p>
            <strong>Unseen.</strong> Never reviewed with usable evidence.
          </p>
          <p>
            <strong>Learning.</strong> Successful retrieval evidence, below criterion.
          </p>
          <p>
            <strong>Weak.</strong> The most recent attempt was a Struggled success.
          </p>
          <p>
            <strong>Relearning.</strong> The most recent attempt failed.
          </p>
          <p>
            <strong>Learned.</strong> Repeated successful retrieval evidence meets the
            current criterion; the card can still become due again.
          </p>
        </div>
      </details>
    </div>
  );
}

function useStudyTimeForecast(request: DeriveStudyTimeForecastInput | null): {
  readonly forecast: StudyTimeForecastModel | null;
  readonly error: string | null;
  readonly retry: () => void;
} {
  const [forecast, setForecast] = useState<StudyTimeForecastModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (request === null) {
      setForecast(null);
      setError(null);
      return;
    }

    setForecast(null);
    setError(null);
    let cancelled = false;
    const fail = (message: string) => {
      if (!cancelled) setError(message);
    };
    if (typeof Worker === "undefined") {
      void import("../study/forecast/forecast")
        .then(({ deriveStudyTimeForecast }) => {
          if (!cancelled) setForecast(deriveStudyTimeForecast(request));
        })
        .catch(() => fail("The fallback forecast calculation failed."));
      return () => {
        cancelled = true;
      };
    }

    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL("../study/forecast/worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event: MessageEvent<ForecastWorkerResponse>) => {
        const result = reduceForecastWorkerResponse(event.data, cancelled);
        if (result === null) return;
        if (result.status === "ready") {
          setForecast(result.forecast);
        } else {
          fail(result.message || "The forecast worker returned an error.");
        }
      };
      worker.onerror = () => {
        fail("The background forecast worker stopped unexpectedly.");
      };
      worker.onmessageerror = () => {
        fail("The forecast result could not be read.");
      };
      worker.postMessage(request);
    } catch {
      fail("The background forecast worker could not be started.");
      worker?.terminate();
      worker = null;
    }
    return () => {
      cancelled = true;
      worker?.terminate();
    };
  }, [request, retryCount]);

  return {
    forecast,
    error,
    retry: () => {
      setRetryCount((count) => count + 1);
    },
  };
}

function useStableForecastInputs(
  clockKey: string,
  scheduler: ReturnType<typeof deriveExamSrsSnapshot> | null,
  nowMs: number,
  reviewEvents: readonly ReviewEvent[] | null,
  settings: AppSettings | null,
  manuallySatisfiedConceptIds: ReadonlySet<string>,
) {
  const inputs = useRef({
    clockKey: "",
    scheduler,
    nowMs,
    reviewEvents,
    settings,
    manuallySatisfiedConceptIds,
  });
  if (inputs.current.clockKey !== clockKey) {
    inputs.current = {
      clockKey,
      scheduler,
      nowMs,
      reviewEvents,
      settings,
      manuallySatisfiedConceptIds,
    };
  }
  return inputs.current;
}
