import type { SchedulerOutcome } from "./model";

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export const EXAM_SRS_INTERVALS = Object.freeze({
  failureMs: 10 * MINUTE_MS,
  weakSuccessMs: 45 * MINUTE_MS,
  strongSuccessMs: Object.freeze({
    belowOne: 2 * HOUR_MS,
    belowTwo: 6 * HOUR_MS,
    belowThree: 16 * HOUR_MS,
    belowFour: 30 * HOUR_MS,
    belowFive: 48 * HOUR_MS,
    belowSix: 96 * HOUR_MS,
    atLeastSix: 7 * DAY_MS,
  }),
  deadline: Object.freeze({
    minimumMs: 1 * HOUR_MS,
    maximumMs: 24 * HOUR_MS,
    fractionOfRemaining: 0.35,
  }),
  buffer: Object.freeze({
    minimumMs: 15 * MINUTE_MS,
    maximumMs: 4 * HOUR_MS,
    fractionOfRemaining: 0.25,
  }),
});

export function getBaseIntervalMs(
  outcome: SchedulerOutcome,
  resultingStrength: number,
): number {
  if (outcome === "failure") {
    return EXAM_SRS_INTERVALS.failureMs;
  }

  if (outcome === "weak_success") {
    return EXAM_SRS_INTERVALS.weakSuccessMs;
  }

  if (resultingStrength < 1) {
    return EXAM_SRS_INTERVALS.strongSuccessMs.belowOne;
  }
  if (resultingStrength < 2) {
    return EXAM_SRS_INTERVALS.strongSuccessMs.belowTwo;
  }
  if (resultingStrength < 3) {
    return EXAM_SRS_INTERVALS.strongSuccessMs.belowThree;
  }
  if (resultingStrength < 4) {
    return EXAM_SRS_INTERVALS.strongSuccessMs.belowFour;
  }
  if (resultingStrength < 5) {
    return EXAM_SRS_INTERVALS.strongSuccessMs.belowFive;
  }
  if (resultingStrength < 6) {
    return EXAM_SRS_INTERVALS.strongSuccessMs.belowSix;
  }
  return EXAM_SRS_INTERVALS.strongSuccessMs.atLeastSix;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getDeadlineCapMs(remainingMs: number): number {
  return clamp(
    EXAM_SRS_INTERVALS.deadline.fractionOfRemaining * remainingMs,
    EXAM_SRS_INTERVALS.deadline.minimumMs,
    EXAM_SRS_INTERVALS.deadline.maximumMs,
  );
}

export function getBufferCapMs(remainingMs: number): number {
  return clamp(
    EXAM_SRS_INTERVALS.buffer.fractionOfRemaining * remainingMs,
    EXAM_SRS_INTERVALS.buffer.minimumMs,
    EXAM_SRS_INTERVALS.buffer.maximumMs,
  );
}
