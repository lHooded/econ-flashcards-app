import { cards } from "../data/deck";
import { useProgress } from "../app/progressContext";
import { StatCard } from "../components/StatCard";
import { formatLocalDateTime, getStudyDeadline } from "../utils/date";

export function HomePage() {
  const { snapshot } = useProgress();
  if (snapshot === null) {
    return null;
  }

  const seenCards = cards.filter((card) =>
    Boolean(snapshot.cardStates[card.id]?.firstSeenAt),
  ).length;
  const totalReviews = Object.values(snapshot.cardStates).reduce(
    (total, state) => total + state.totalReviews,
    0,
  );
  const unseenCards = cards.length - seenCards;
  const studyDeadline = getStudyDeadline(
    snapshot.settings.examAt,
    snapshot.settings.studyBufferHours,
  );

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Five days out · four usable study days</p>
          <h1>Make the next card count.</h1>
          <p className="lede">
            A fast, offline-first cram desk for the full macroeconomics deck.
          </p>
        </div>
        <a className="primary-button heading-action" href="#/study">
          Study now
        </a>
      </section>

      <section className="stat-grid" aria-label="Study progress">
        <StatCard
          label="Total cards"
          value={cards.length}
          detail="Chapters 1–10 plus mixed review"
        />
        <StatCard
          label="Unseen"
          value={unseenCards}
          detail="Cards with no review yet"
        />
        <StatCard label="Seen at least once" value={seenCards} />
        <StatCard
          label="Total reviews"
          value={totalReviews}
          detail="Saved on this device"
        />
      </section>

      {snapshot.settings.examAt === null ? (
        <section className="callout callout-accent">
          <div>
            <p className="section-kicker">Set your target</p>
            <h2>Give the study plan a real exam time.</h2>
            <p>
              The one-day buffer is deliberate: the future scheduler will aim to have
              you ready before the actual exam, not at the last minute.
            </p>
          </div>
          <a className="secondary-button" href="#/settings">
            Configure exam
          </a>
        </section>
      ) : (
        <section className="deadline-grid" aria-label="Exam timing">
          <div className="info-panel">
            <p className="section-kicker">Exam target</p>
            <p className="info-value">
              {formatLocalDateTime(snapshot.settings.examAt)}
            </p>
            <p className="muted-text">Displayed in your browser’s local timezone.</p>
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

      <section className="callout">
        <div>
          <p className="section-kicker">What is live now</p>
          <p>
            Every answer and self-rating is saved locally in IndexedDB. Export a JSON
            backup from Settings / Data whenever you want a portable copy.
          </p>
        </div>
        <a className="text-link" href="#/settings">
          Manage data →
        </a>
      </section>
    </div>
  );
}
