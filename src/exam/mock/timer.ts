import { MOCK_READING_MS, MOCK_WRITING_MS } from "./blueprint";
import type { MockAttempt, MockClockPhase } from "./model";

export interface MockClock {
  readonly phase: MockClockPhase;
  readonly remainingMs: number;
}

export function deriveMockClock(attempt: MockAttempt, nowMs: number): MockClock {
  if (attempt.status === "submitted") return { phase: "submitted", remainingMs: 0 };
  if (attempt.status === "abandoned") return { phase: "abandoned", remainingMs: 0 };
  const readingEndsMs = Date.parse(attempt.readingEndsAt);
  const writingEndsMs = Date.parse(attempt.writingEndsAt);
  if (nowMs < readingEndsMs)
    return { phase: "reading", remainingMs: Math.max(0, readingEndsMs - nowMs) };
  if (nowMs < writingEndsMs)
    return { phase: "writing", remainingMs: Math.max(0, writingEndsMs - nowMs) };
  return { phase: "expired", remainingMs: 0 };
}

export function mockDurations(): {
  readonly readingMs: number;
  readonly writingMs: number;
} {
  return { readingMs: MOCK_READING_MS, writingMs: MOCK_WRITING_MS };
}
