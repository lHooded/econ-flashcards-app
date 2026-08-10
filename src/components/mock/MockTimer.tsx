import type { MockClock } from "../../exam/mock/timer";

export function MockTimer({ clock }: { readonly clock: MockClock }) {
  const label =
    clock.phase === "reading"
      ? "Reading time"
      : clock.phase === "writing"
        ? "Writing time"
        : clock.phase === "expired"
          ? "Time expired"
          : clock.phase === "submitted"
            ? "Submitted"
            : "Abandoned";
  return (
    <div className={`mock-timer mock-timer-${clock.phase}`} aria-live="polite">
      <span className="section-kicker">{label}</span>
      <strong>
        {clock.phase === "reading" || clock.phase === "writing"
          ? formatDuration(clock.remainingMs)
          : "—"}
      </strong>
      <span className="sr-only">Remaining time</span>
    </div>
  );
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
