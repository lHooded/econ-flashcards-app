import { describe, expect, it } from "vitest";
import { buildMockExam } from "../exam/mock/selector";
import { createMockAttempt } from "../exam/mock/model";
import { examQuestions } from "../exam/questionBank";
import { analyseMockAttempt } from "../exam/mock/analytics";
import { scoreMockAttempt } from "../exam/mock/scoring";

describe("historical mock analytics", () => {
  it("uses stored manifest metadata rather than changed current-bank metadata", () => {
    const build = buildMockExam({ bank: examQuestions, seed: "historical-analytics" });
    const attempt = createMockAttempt({
      ...build,
      id: "historical-analytics-attempt",
      seed: "historical-analytics",
      createdAt: "2026-08-11T00:00:00.000Z",
    });
    const first = attempt.manifest[0];
    const changedManifest = attempt.manifest.map((manifest) =>
      manifest.questionId === first.questionId
        ? {
            ...manifest,
            correctChoice: 1 as const,
            chapter: 8,
            style: "scenario" as const,
            difficulty: 2 as const,
          }
        : manifest,
    );
    const historical = {
      ...attempt,
      manifest: changedManifest,
      questionStates: attempt.questionStates.map((state) =>
        state.questionId === first.questionId
          ? { ...state, selectedChoice: 1 as const }
          : state,
      ),
      status: "submitted" as const,
      submittedAt: attempt.writingEndsAt,
      reviewEventsCommittedAt: "2026-08-11T03:00:00.000Z",
    };
    const analytics = analyseMockAttempt(historical);
    const result = scoreMockAttempt(historical);

    expect(result.score).toBe(1);
    expect(
      analytics.chapters.find((bucket) => bucket.label === "Chapter 8"),
    ).toMatchObject({
      correct: 1,
      total: 6,
    });
    expect(
      analytics.styles.find((bucket) => bucket.label === "scenario"),
    ).toMatchObject({
      correct: 1,
    });
    expect(
      analytics.difficulties.find((bucket) => bucket.label === "Difficulty 2"),
    ).toMatchObject({ correct: 1 });
  });
});
