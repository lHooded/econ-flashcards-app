import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MockQuestion } from "../components/mock/MockQuestion";
import { buildMockExam } from "../exam/mock/selector";
import { examQuestions } from "../exam/questionBank";
import { ProgressContext, type ProgressContextValue } from "../app/progressContext";
import { PracticePage } from "../pages/PracticePage";

describe("mock and Practice Lab interactions", () => {
  it("keeps answer correctness and rationales hidden during mock reading", () => {
    const build = buildMockExam({ bank: examQuestions, seed: 7 });
    const question = examQuestions.find(
      (candidate) => candidate.id === build.questionOrder[0],
    );
    if (question === undefined) throw new Error("Expected a selected question.");
    render(
      <MockQuestion
        question={question}
        questionNumber={1}
        selectedChoice={null}
        reading
        onSelect={vi.fn()}
      />,
    );
    expect(
      screen
        .getAllByRole("radio")
        .every((radio) => (radio as HTMLInputElement).disabled),
    ).toBe(true);
    expect(screen.queryByText("Correct answer")).not.toBeInTheDocument();
    expect(screen.queryByText(question.explanation)).not.toBeInTheDocument();
  });

  it("reveals written-response content only on request and sends no typed text", async () => {
    const user = userEvent.setup();
    const recordReview = vi.fn().mockResolvedValue({});
    const context: ProgressContextValue = {
      snapshot: {
        settings: { examAt: null, studyBufferHours: 24 },
        cardStates: {},
        reviewEvents: [],
      },
      isLoading: false,
      error: null,
      clearError: vi.fn(),
      saveSettings: vi.fn().mockResolvedValue(undefined),
      recordReview,
      exportProgress: vi.fn(() => "{}"),
      replaceProgress: vi.fn().mockResolvedValue(undefined),
      resetProgress: vi.fn().mockResolvedValue(undefined),
    };
    render(
      <ProgressContext.Provider value={context}>
        <PracticePage initialMode="written" />
      </ProgressContext.Provider>,
    );
    const answer = screen.getByLabelText("Your working");
    await user.type(answer, "My own explanation");
    expect(screen.queryByText("Model answer")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show model answer" }));
    expect(screen.getByText("Model answer")).toBeInTheDocument();
    expect(recordReview).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(recordReview).toHaveBeenCalledWith(
      expect.objectContaining({ rating: "got_it", correct: true }),
    );
    expect(JSON.stringify(recordReview.mock.calls)).not.toContain("My own explanation");
  });
});
