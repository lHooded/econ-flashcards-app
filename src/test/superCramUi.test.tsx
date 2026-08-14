import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { ProgressContext, type ProgressContextValue } from "../app/progressContext";
import type { NewReviewEvent } from "../domain/progress";
import { KnowledgeProvider } from "../knowledge/KnowledgeProvider";
import { PracticePage } from "../pages/PracticePage";
import { SuperCramPage } from "../pages/SuperCramPage";

function renderWithProgress(
  recordReview: ProgressContextValue["recordReview"],
  page: ReactNode,
) {
  const value: ProgressContextValue = {
    snapshot: {
      settings: { examAt: null, studyBufferHours: 24 },
      cardStates: {},
      reviewEvents: [],
    },
    isLoading: false,
    error: null,
    clearError: vi.fn(),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    markLessonSeen: vi.fn().mockResolvedValue(undefined),
    recordReview,
    exportProgress: vi.fn(() => "{}"),
    replaceProgress: vi.fn().mockResolvedValue(undefined),
    resetProgress: vi.fn().mockResolvedValue(undefined),
  };
  return render(
    <KnowledgeProvider>
      <ProgressContext.Provider value={value}>{page}</ProgressContext.Provider>
    </KnowledgeProvider>,
  );
}

function answerCurrentQuestion() {
  fireEvent.click(screen.getAllByRole("radio")[0]);
  fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
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
});
