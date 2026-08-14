import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { ProgressContext, type ProgressContextValue } from "../app/progressContext";
import { cards } from "../data/deck";
import { createReviewEvent, type NewReviewEvent } from "../domain/progress";
import { examQuestions } from "../exam/questionBank";
import { KnowledgeProvider } from "../knowledge/KnowledgeProvider";
import { PracticePage } from "../pages/PracticePage";
import { SuperCramPage } from "../pages/SuperCramPage";

const fallbackRatingCases = [
  ["Forgot", "forgot"],
  ["Struggled", "struggled"],
  ["Got it", "got_it"],
] as const;

function renderWithProgress(
  recordReview: ProgressContextValue["recordReview"],
  page: ReactNode,
  snapshot: Exclude<ProgressContextValue["snapshot"], null> = {
    settings: { examAt: null, studyBufferHours: 24 },
    cardStates: {},
    reviewEvents: [],
  },
) {
  const createValue = (
    nextSnapshot: Exclude<ProgressContextValue["snapshot"], null>,
  ): ProgressContextValue => ({
    snapshot: nextSnapshot,
    isLoading: false,
    error: null,
    clearError: vi.fn(),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    markLessonSeen: vi.fn().mockResolvedValue(undefined),
    recordReview,
    exportProgress: vi.fn(() => "{}"),
    replaceProgress: vi.fn().mockResolvedValue(undefined),
    resetProgress: vi.fn().mockResolvedValue(undefined),
  });
  let value = createValue(snapshot);
  const view = render(
    <KnowledgeProvider>
      <ProgressContext.Provider value={value}>{page}</ProgressContext.Provider>
    </KnowledgeProvider>,
  );
  return {
    ...view,
    updateSnapshot(nextSnapshot: Exclude<ProgressContextValue["snapshot"], null>) {
      value = createValue(nextSnapshot);
      view.rerender(
        <KnowledgeProvider>
          <ProgressContext.Provider value={value}>{page}</ProgressContext.Provider>
        </KnowledgeProvider>,
      );
    },
  };
}

function answerCurrentQuestion() {
  fireEvent.click(screen.getAllByRole("radio")[0]);
  fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
}

function currentQuestionId(): string {
  const radio = screen.getAllByRole("radio")[0] as HTMLInputElement;
  return radio.name.replace(/^practice-/, "");
}

describe("Super Cram and Formula Application practice surfaces", () => {
  it("records Super Cram as ordinary MCQ evidence with response time", async () => {
    const recordReviewMock = vi.fn().mockResolvedValue({});
    renderWithProgress(recordReviewMock, <SuperCramPage />);
    answerCurrentQuestion();
    await waitFor(() => expect(recordReviewMock).toHaveBeenCalledTimes(1));
    const payload = recordReviewMock.mock.calls[0][0] as NewReviewEvent;
    expect(payload.mode).toBe("mcq");
    expect(payload.responseTimeMs).toEqual(expect.any(Number));
    expect(payload.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(screen.getByText(/Why this appeared:/i)).toBeInTheDocument();
  });

  it("retries the exact immutable Super Cram payload after a failed save", async () => {
    const recordReviewMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({});
    renderWithProgress(recordReviewMock, <SuperCramPage />);
    answerCurrentQuestion();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/offline/));
    const firstPayload = recordReviewMock.mock.calls[0][0];
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    await waitFor(() => expect(recordReviewMock).toHaveBeenCalledTimes(2));
    expect(recordReviewMock.mock.calls[1][0]).toBe(firstPayload);
  });

  it("exposes the curated Formula Application lane and saves its response duration", async () => {
    const recordReviewMock = vi.fn().mockResolvedValue({});
    renderWithProgress(
      recordReviewMock,
      <PracticePage initialMode="formula-application" initialConceptId={null} />,
    );
    expect(
      screen.getByText(/Use the cheat sheet, then make the formula work/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Formula family")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Chapter 0" })).not.toBeInTheDocument();
    answerCurrentQuestion();
    await waitFor(() => expect(recordReviewMock).toHaveBeenCalledTimes(1));
    expect(recordReviewMock.mock.calls[0][0].mode).toBe("mcq");
    expect(recordReviewMock.mock.calls[0][0].responseTimeMs).toEqual(
      expect.any(Number),
    );
  });

  it("supports the existing 1–4 and Enter MCQ keyboard path in Super Cram", async () => {
    const recordReviewMock = vi.fn().mockResolvedValue({});
    renderWithProgress(recordReviewMock, <SuperCramPage />);
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "Enter" });
    await waitFor(() => expect(recordReviewMock).toHaveBeenCalledTimes(1));
  });

  it("refreshes the scheduler clock without replacing an unanswered question", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T00:00:00.000Z"));
    try {
      const recordReviewMock = vi.fn().mockResolvedValue({});
      const view = renderWithProgress(recordReviewMock, <SuperCramPage />);
      const stem = view.container.querySelector(".mock-stem")?.textContent;
      expect(stem).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(30 * 1000);
      });
      expect(view.container.querySelector(".mock-stem")?.textContent).toBe(stem);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps an active MCQ atomic across a due-fallback clock transition", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-08-14T00:00:00.000Z");
    vi.setSystemTime(now);
    try {
      const fallbackId = "ch01-001";
      const fallbackCard = cards.find((card) => card.id === fallbackId)!;
      const reviewedAt = new Date(now.getTime() - 9 * 60 * 1000 - 45 * 1000);
      const fallbackReview = createReviewEvent({
        id: "fallback-clock-transition",
        cardId: fallbackId,
        reviewedAt: reviewedAt.toISOString(),
        mode: "mcq",
        correct: false,
        rating: "forgot",
        responseTimeMs: 900,
        selectedChoice: 0,
      });
      const recordReviewMock = vi.fn().mockResolvedValue({});
      const view = renderWithProgress(recordReviewMock, <SuperCramPage />, {
        settings: { examAt: null, studyBufferHours: 24 },
        cardStates: {},
        reviewEvents: [fallbackReview],
      });
      const stem = view.container.querySelector(".mock-stem")?.textContent;
      expect(stem).toBeTruthy();
      fireEvent.click(screen.getAllByRole("radio")[0]);

      act(() => {
        vi.advanceTimersByTime(30 * 1000);
      });
      expect(view.container.querySelector(".mock-stem")?.textContent).toBe(stem);
      expect(screen.getAllByRole("radio")[0]).toBeChecked();
      expect(screen.queryByText("Due review · canonical card")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
      await act(async () => {
        await Promise.resolve();
      });
      expect(recordReviewMock).toHaveBeenCalledTimes(1);
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(screen.getByText("Due review · canonical card")).toBeInTheDocument();
      expect(screen.getByText(fallbackCard.id)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("suppresses every stale MCQ for a just-saved review card", async () => {
    const cardId = "ch08-003";
    const reviewedAt = new Date(Date.now() - 10 * 60 * 1000);
    const initialReview = createReviewEvent({
      id: "stale-mcq-initial",
      cardId,
      reviewedAt: reviewedAt.toISOString(),
      mode: "mcq",
      correct: false,
      rating: "forgot",
      responseTimeMs: 900,
      selectedChoice: 0,
    });
    const recordReviewMock = vi.fn().mockResolvedValue({});
    renderWithProgress(recordReviewMock, <SuperCramPage />, {
      settings: { examAt: null, studyBufferHours: 24 },
      cardStates: {},
      reviewEvents: [initialReview],
    });
    const firstQuestionId = currentQuestionId();
    expect(
      examQuestions.find((question) => question.id === firstQuestionId)?.reviewCardId,
    ).toBe(cardId);

    answerCurrentQuestion();
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    const nextQuestion = examQuestions.find(
      (question) => question.id === currentQuestionId(),
    );
    expect(nextQuestion?.reviewCardId).not.toBe(cardId);
    expect(recordReviewMock).toHaveBeenCalledTimes(1);
  });

  it("lets an acknowledged recent MCQ return when Exam-SRS makes it due again", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-08-14T00:00:00.000Z");
    vi.setSystemTime(now);
    try {
      const cardId = "ch08-003";
      const initialReview = createReviewEvent({
        id: "due-again-initial",
        cardId,
        reviewedAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        mode: "mcq",
        correct: false,
        rating: "forgot",
        responseTimeMs: 900,
        selectedChoice: 0,
      });
      const recordReviewMock = vi.fn().mockResolvedValue({});
      const view = renderWithProgress(recordReviewMock, <SuperCramPage />, {
        settings: { examAt: null, studyBufferHours: 24 },
        cardStates: {},
        reviewEvents: [initialReview],
      });
      expect(
        examQuestions.find((question) => question.id === currentQuestionId())
          ?.reviewCardId,
      ).toBe(cardId);

      answerCurrentQuestion();
      await act(async () => {
        await Promise.resolve();
      });
      const acknowledgedReview = createReviewEvent({
        id: "due-again-acknowledged",
        cardId,
        reviewedAt: now.toISOString(),
        mode: "mcq",
        correct: false,
        rating: "forgot",
        responseTimeMs: 900,
        selectedChoice: 0,
      });
      view.updateSnapshot({
        settings: { examAt: null, studyBufferHours: 24 },
        cardStates: {},
        reviewEvents: [initialReview, acknowledgedReview],
      });
      act(() => {
        vi.advanceTimersByTime(10 * 60 * 1000 + 1);
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(
        examQuestions.find((question) => question.id === currentQuestionId())
          ?.reviewCardId,
      ).toBe(cardId);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(fallbackRatingCases)(
    "moves from one stale-snapshot fallback to the next due fallback after %s",
    async (ratingLabel, ratingValue) => {
      const firstId = "ch01-001";
      const secondId = "ch01-003";
      const secondCard = cards.find((card) => card.id === secondId)!;
      const reviewedAt = new Date(Date.now() - 10 * 60 * 1000);
      const reviews = [firstId, secondId].map((cardId) =>
        createReviewEvent({
          id: `fallback-${cardId}`,
          cardId,
          reviewedAt: reviewedAt.toISOString(),
          mode: "recall",
          correct: false,
          rating: "forgot",
          responseTimeMs: 900,
          selectedChoice: null,
        }),
      );
      const recordReviewMock = vi.fn().mockResolvedValue({});
      renderWithProgress(recordReviewMock, <SuperCramPage />, {
        settings: { examAt: null, studyBufferHours: 24 },
        cardStates: {},
        reviewEvents: reviews,
      });
      expect(screen.getByText(firstId)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
      fireEvent.click(screen.getByRole("button", { name: ratingLabel }));
      await waitFor(() => expect(recordReviewMock).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByText(secondId)).toBeInTheDocument());
      expect(screen.queryByText(firstId)).not.toBeInTheDocument();

      expect(screen.getByRole("button", { name: "Show answer" })).toBeInTheDocument();
      expect(screen.queryByText("Answer")).not.toBeInTheDocument();
      expect(screen.queryByText("Why it works")).not.toBeInTheDocument();
      expect(screen.queryByText(secondCard.answer)).not.toBeInTheDocument();
      for (const label of fallbackRatingCases.map(([label]) => label)) {
        expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
      }

      fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
      for (const label of fallbackRatingCases.map(([label]) => label)) {
        expect(screen.getByRole("button", { name: label })).toBeEnabled();
      }
      fireEvent.click(screen.getByRole("button", { name: ratingLabel }));
      await waitFor(() => expect(recordReviewMock).toHaveBeenCalledTimes(2));
      expect(recordReviewMock.mock.calls[1][0]).toMatchObject({
        cardId: secondId,
        mode: "recall",
        rating: ratingValue,
      });
    },
  );

  it("keeps fallback keyboard input isolated from Super Cram MCQ shortcuts", async () => {
    const fallbackId = "ch01-001";
    const fallbackReview = createReviewEvent({
      id: "fallback-keyboard-isolation",
      cardId: fallbackId,
      reviewedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      mode: "recall",
      correct: false,
      rating: "forgot",
      responseTimeMs: 900,
      selectedChoice: null,
    });
    const recordReviewMock = vi.fn().mockResolvedValue({});
    renderWithProgress(recordReviewMock, <SuperCramPage />, {
      settings: { examAt: null, studyBufferHours: 24 },
      cardStates: {},
      reviewEvents: [fallbackReview],
    });

    const hiddenMcqShortcut = new KeyboardEvent("keydown", {
      key: "1",
      bubbles: true,
      cancelable: true,
    });
    act(() => window.dispatchEvent(hiddenMcqShortcut));
    expect(hiddenMcqShortcut.defaultPrevented).toBe(false);
    expect(recordReviewMock).not.toHaveBeenCalled();

    const revealEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    act(() => window.dispatchEvent(revealEvent));
    expect(revealEvent.defaultPrevented).toBe(true);
    expect(screen.getByRole("button", { name: "Forgot" })).toBeEnabled();

    const ratingEvent = new KeyboardEvent("keydown", {
      key: "1",
      bubbles: true,
      cancelable: true,
    });
    act(() => window.dispatchEvent(ratingEvent));
    await waitFor(() => expect(recordReviewMock).toHaveBeenCalledTimes(1));
    expect(recordReviewMock.mock.calls[0][0]).toMatchObject({
      cardId: fallbackId,
      mode: "recall",
      rating: "forgot",
    });
  });

  it("resets Formula Application response timing for a wrapped one-question set", async () => {
    let monotonicNow = 1_000;
    const performanceSpy = vi
      .spyOn(performance, "now")
      .mockImplementation(() => monotonicNow);
    try {
      const recordReviewMock = vi.fn().mockResolvedValue({});
      renderWithProgress(
        recordReviewMock,
        <PracticePage initialMode="formula-application" initialConceptId={null} />,
      );
      fireEvent.change(screen.getByLabelText("Formula family"), {
        target: { value: "formula-quantity-theory" },
      });
      expect(
        screen.getByRole("heading", { name: /Using MV = PY/i }),
      ).toBeInTheDocument();
      monotonicNow = 1_100;
      answerCurrentQuestion();
      await act(async () => {
        await Promise.resolve();
      });
      expect(recordReviewMock).toHaveBeenCalledTimes(1);
      monotonicNow = 100_000;
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(screen.getByRole("button", { name: "Submit answer" })).toBeInTheDocument();
      monotonicNow = 100_125;
      answerCurrentQuestion();
      await act(async () => {
        await Promise.resolve();
      });
      expect(recordReviewMock).toHaveBeenCalledTimes(2);
      expect(recordReviewMock.mock.calls[1][0].responseTimeMs).toBe(125);
    } finally {
      performanceSpy.mockRestore();
    }
  });
});
