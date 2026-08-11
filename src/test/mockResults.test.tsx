import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MockResults } from "../components/mock/MockResults";
import { createMockAttempt } from "../exam/mock/model";
import { buildMockExam } from "../exam/mock/selector";
import { examQuestions } from "../exam/questionBank";

describe("historical mock results", () => {
  it("keeps score, filters, and analytics on manifest metadata after a display correction", async () => {
    const build = buildMockExam({ bank: examQuestions, seed: "result-history" });
    const base = createMockAttempt({
      ...build,
      id: "result-history-attempt",
      seed: "result-history",
      createdAt: "2026-08-11T00:00:00.000Z",
    });
    const first = base.manifest[0];
    const historical = {
      ...base,
      manifest: base.manifest.map((manifest) =>
        manifest.questionId === first.questionId
          ? {
              ...manifest,
              correctChoice: 1 as const,
              chapter: 8,
              style: "scenario" as const,
              difficulty: 2 as const,
            }
          : manifest,
      ),
      questionStates: base.questionStates.map((state) =>
        state.questionId === first.questionId
          ? { ...state, selectedChoice: 1 as const }
          : state,
      ),
      status: "submitted" as const,
      submittedAt: base.writingEndsAt,
      reviewEventsCommittedAt: "2026-08-11T03:00:00.000Z",
    };
    const currentQuestion = examQuestions.find(
      (question) => question.id === first.questionId,
    );
    if (currentQuestion === undefined) throw new Error("Expected current question");
    const changedDisplay = {
      ...currentQuestion,
      correctChoice: 3 as const,
      chapter: 7,
      style: "concept" as const,
      difficulty: 1 as const,
    };
    const user = userEvent.setup();
    const view = render(
      <MockResults
        attempt={historical}
        questionsById={new Map([[first.questionId, changedDisplay]])}
      />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1 / 60");
    expect(screen.getAllByText(/\d+ \/ \d+/).length).toBeGreaterThan(0);
    expect(screen.getByText(currentQuestion.stem)).toBeInTheDocument();
    expect(screen.getAllByText(/Chapter 8 ·/).length).toBeGreaterThan(0);
    view.rerender(<MockResults attempt={historical} questionsById={new Map()} />);
    expect(
      screen
        .getAllByText(/Stored result:/)
        .some((element) => element.textContent?.includes("Correct")),
    ).toBe(true);
    await user.click(screen.getByRole("button", { name: "Incorrect" }));
    expect(screen.queryByText(changedDisplay.stem)).not.toBeInTheDocument();
  });
});
