import type { MockAttempt, MockAttemptResult } from "./model";

export function scoreMockAttempt(
  attempt: MockAttempt,
  completedAt?: string,
): MockAttemptResult {
  const states = new Map(
    attempt.questionStates.map((state) => [state.questionId, state]),
  );
  let score = 0;
  let answered = 0;
  let flagged = 0;
  let activeTime = 0;
  let slowQuestionCount = 0;
  for (const manifest of attempt.manifest) {
    const state = states.get(manifest.questionId);
    if (state === undefined) continue;
    if (state.selectedChoice !== null) {
      answered++;
      if (state.selectedChoice === manifest.correctChoice) score++;
    }
    if (state.flagged) flagged++;
    activeTime += state.timeSpentMs;
    if (state.timeSpentMs > 100_000) slowQuestionCount++;
  }
  const submittedMs =
    completedAt === undefined
      ? Date.parse(attempt.submittedAt ?? attempt.writingEndsAt)
      : Date.parse(completedAt);
  const writingTimeUsedMs = Math.max(
    0,
    Math.min(100 * 60 * 1000, submittedMs - Date.parse(attempt.readingEndsAt)),
  );
  return {
    score,
    total: attempt.manifest.length,
    percentage:
      attempt.manifest.length === 0 ? 0 : (score / attempt.manifest.length) * 100,
    answered,
    unanswered: attempt.manifest.length - answered,
    flagged,
    writingTimeUsedMs,
    averageActiveTimeMs:
      attempt.manifest.length === 0 ? 0 : activeTime / attempt.manifest.length,
    slowQuestionCount,
  };
}
