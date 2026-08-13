import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MockQuestion } from "../components/mock/MockQuestion";
import { buildMockExam } from "../exam/mock/selector";
import { examQuestions } from "../exam/questionBank";
import { ProgressContext, type ProgressContextValue } from "../app/progressContext";
import { PracticePage } from "../pages/PracticePage";
import { MockAttemptPage } from "../pages/MockAttemptPage";
import { MockPage } from "../pages/MockPage";
import {
  createMockAttempt,
  type MockAttempt,
  type MockQuestionAttemptState,
} from "../exam/mock/model";

function normalizeRenderedText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function writingAttempt(id: string, createdOffsetMs = 15 * 60 * 1000): MockAttempt {
  return createMockAttempt({
    ...buildMockExam({ bank: examQuestions, seed: id }),
    id,
    seed: id,
    createdAt: new Date(Date.now() - createdOffsetMs).toISOString(),
  });
}

function submittedResult(attempt: MockAttempt): {
  readonly attempt: MockAttempt;
  readonly result: {
    readonly score: number;
    readonly total: number;
    readonly percentage: number;
    readonly answered: number;
    readonly unanswered: number;
    readonly flagged: number;
    readonly writingTimeUsedMs: number;
    readonly averageActiveTimeMs: number;
    readonly slowQuestionCount: number;
  };
  readonly reviewEvents: readonly [];
} {
  return {
    attempt: {
      ...attempt,
      status: "submitted",
      submittedAt: attempt.writingEndsAt,
      reviewEventsCommittedAt: new Date().toISOString(),
    },
    result: {
      score: 0,
      total: 60,
      percentage: 0,
      answered: 0,
      unanswered: 60,
      flagged: 0,
      writingTimeUsedMs: 0,
      averageActiveTimeMs: 0,
      slowQuestionCount: 0,
    },
    reviewEvents: [],
  };
}

function mockProgressContext(
  attempt: MockAttempt,
  updateMockAttemptProgress: ProgressContextValue["updateMockAttemptProgress"],
  finalizeMockAttempt: ProgressContextValue["finalizeMockAttempt"] = vi
    .fn()
    .mockResolvedValue(submittedResult(attempt)),
): ProgressContextValue {
  return {
    snapshot: {
      settings: { examAt: null, studyBufferHours: 24 },
      cardStates: {},
      reviewEvents: [],
      mockAttempts: [attempt],
    },
    isLoading: false,
    error: null,
    clearError: vi.fn(),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    markLessonSeen: vi.fn().mockResolvedValue(undefined),
    recordReview: vi.fn().mockResolvedValue({}),
    updateMockAttemptProgress,
    finalizeMockAttempt,
    exportProgress: vi.fn(() => "{}"),
    replaceProgress: vi.fn().mockResolvedValue(undefined),
    resetProgress: vi.fn().mockResolvedValue(undefined),
  };
}

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
      markLessonSeen: vi.fn().mockResolvedValue(undefined),
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

  it("keeps manual submission unavailable during reading", () => {
    const attempt = createMockAttempt({
      ...buildMockExam({ bank: examQuestions, seed: "reading-ui" }),
      id: "reading-ui",
      seed: "reading-ui",
      createdAt: new Date().toISOString(),
    });
    render(
      <ProgressContext.Provider
        value={mockProgressContext(attempt, vi.fn().mockResolvedValue(attempt))}
      >
        <MockAttemptPage attemptId={attempt.id} />
      </ProgressContext.Provider>,
    );
    expect(screen.getByRole("button", { name: "Submit mock" })).toBeDisabled();
    expect(
      screen
        .getAllByRole("radio")
        .every((radio) => (radio as HTMLInputElement).disabled),
    ).toBe(true);
  });

  it("enables writing controls at the exact reading boundary", async () => {
    vi.useFakeTimers({ now: Date.now() });
    try {
      const attempt = createMockAttempt({
        ...buildMockExam({ bank: examQuestions, seed: "phase-boundary-ui" }),
        id: "phase-boundary-ui",
        seed: "phase-boundary-ui",
        createdAt: new Date().toISOString(),
      });
      render(
        <ProgressContext.Provider
          value={mockProgressContext(attempt, vi.fn().mockResolvedValue(attempt))}
        >
          <MockAttemptPage attemptId={attempt.id} />
        </ProgressContext.Provider>,
      );
      expect(screen.getAllByRole("radio")[0]).toBeDisabled();
      vi.setSystemTime(Date.parse(attempt.readingEndsAt));
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });
      expect(screen.getAllByRole("radio")[0]).not.toBeDisabled();
      expect(screen.getByRole("button", { name: "Submit mock" })).not.toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects post-deadline interactions even while the rendered clock is stale", async () => {
    vi.useFakeTimers({ now: Date.now() });
    try {
      const base = writingAttempt("stale-rendered-clock-ui");
      const attempt = {
        ...base,
        questionStates: base.questionStates.map((state, index) =>
          index === 0
            ? {
                ...state,
                selectedChoice: 0 as 0 | 1 | 2 | 3,
                firstViewedAt: "2026-08-11T00:01:00.000Z",
                lastAnsweredAt: "2026-08-11T00:02:00.000Z",
              }
            : state,
        ),
      };
      const update = vi.fn().mockResolvedValue(attempt);
      const finalize = vi.fn().mockResolvedValue(submittedResult(attempt));
      render(
        <ProgressContext.Provider
          value={mockProgressContext(attempt, update, finalize)}
        >
          <MockAttemptPage attemptId={attempt.id} />
        </ProgressContext.Provider>,
      );

      expect(screen.getAllByRole("radio")[0]).toBeEnabled();
      const beforeUpdates = update.mock.calls.length;
      vi.setSystemTime(Date.parse(attempt.writingEndsAt) + 1);

      fireEvent.click(screen.getAllByRole("radio")[1]);
      fireEvent.keyDown(window, { key: "2" });
      fireEvent.click(screen.getByRole("button", { name: "Flag for review" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      expect(screen.getAllByRole("radio")[0]).toBeChecked();
      expect(screen.getAllByRole("radio")[1]).not.toBeChecked();
      expect(
        screen.getByRole("button", { name: "Flag for review" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Question 1 of 60" }),
      ).toBeInTheDocument();
      expect(update).toHaveBeenCalledTimes(beforeUpdates);
      expect(finalize).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(finalize).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("checks expiry immediately when a backgrounded page becomes visible", async () => {
    vi.useFakeTimers({ now: Date.now() });
    const originalVisibility = document.visibilityState;
    const setVisibility = (value: "visible" | "hidden") =>
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value,
      });
    try {
      const base = writingAttempt("visibility-expiry-ui");
      const attempt = {
        ...base,
        questionStates: base.questionStates.map((state, index) =>
          index === 0 ? { ...state, selectedChoice: 0 as 0 | 1 | 2 | 3 } : state,
        ),
      };
      const update = vi.fn().mockResolvedValue(attempt);
      const finalize = vi.fn().mockResolvedValue(submittedResult(attempt));
      render(
        <ProgressContext.Provider
          value={mockProgressContext(attempt, update, finalize)}
        >
          <MockAttemptPage attemptId={attempt.id} />
        </ProgressContext.Provider>,
      );

      setVisibility("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
      vi.setSystemTime(Date.parse(attempt.writingEndsAt) + 1);
      const beforeReturnUpdates = update.mock.calls.length;
      setVisibility("visible");
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
        const radio = screen.queryAllByRole("radio")[1];
        if (radio !== undefined) fireEvent.click(radio);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(finalize).toHaveBeenCalledTimes(1);
      expect(update.mock.calls.length).toBe(beforeReturnUpdates);
      vi.advanceTimersByTime(1000);
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(finalize).toHaveBeenCalledTimes(1);
    } finally {
      setVisibility(originalVisibility);
      vi.useRealTimers();
    }
  });

  it("persists answers and flags and restores them on a page reload", async () => {
    const attempt = writingAttempt("reload-ui");
    let persisted = attempt;
    const update = vi.fn(
      async (
        _id: string,
        states: readonly MockQuestionAttemptState[],
        currentIndex: number,
      ) => {
        persisted = {
          ...persisted,
          questionStates: states,
          currentQuestionIndex: currentIndex,
        };
        return persisted;
      },
    );
    const context = mockProgressContext(attempt, update);
    const user = userEvent.setup();
    const view = render(
      <ProgressContext.Provider value={context}>
        <MockAttemptPage attemptId={attempt.id} />
      </ProgressContext.Provider>,
    );
    await user.click(screen.getAllByRole("radio")[0]);
    await user.click(screen.getByRole("button", { name: "Flag for review" }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(persisted.questionStates[0]).toMatchObject({
      selectedChoice: 0,
      flagged: true,
    });

    view.unmount();
    const reloadedContext: ProgressContextValue = {
      ...context,
      snapshot: { ...context.snapshot!, mockAttempts: [persisted] },
    };
    render(
      <ProgressContext.Provider value={reloadedContext}>
        <MockAttemptPage attemptId={attempt.id} />
      </ProgressContext.Provider>,
    );
    expect((screen.getAllByRole("radio")[0] as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("button", { name: "Unflag question" })).toBeInTheDocument();
  });

  it("does not offer abandon for an expired active mock", () => {
    const attempt = writingAttempt("expired-list-ui", 111 * 60 * 1000);
    const abandon = vi.fn();
    render(
      <ProgressContext.Provider
        value={{
          ...mockProgressContext(attempt, vi.fn().mockResolvedValue(attempt)),
          abandonMockAttempt: abandon,
        }}
      >
        <MockPage />
      </ProgressContext.Provider>,
    );
    expect(
      screen.getByRole("button", { name: "Resume expired mock" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Abandon and start new" }),
    ).not.toBeInTheDocument();
  });

  it("blocks finalisation when the latest answer save fails, then retries the exact visible state", async () => {
    const attempt = writingAttempt("stale-save-ui");
    let allowSave = false;
    const update = vi.fn(
      async (
        _id: string,
        states: readonly MockQuestionAttemptState[],
        currentQuestionIndex: number,
      ) => {
        if (!allowSave) throw new Error("save unavailable");
        return { ...attempt, questionStates: states, currentQuestionIndex };
      },
    );
    const finalize = vi.fn().mockResolvedValue(submittedResult(attempt));
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <ProgressContext.Provider value={mockProgressContext(attempt, update, finalize)}>
        <MockAttemptPage attemptId={attempt.id} />
      </ProgressContext.Provider>,
    );

    const radios = screen.getAllByRole("radio");
    await user.click(radios[1]);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/save unavailable/),
    );
    await user.click(screen.getByRole("button", { name: "Submit mock" }));
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Unanswered: 59"),
    );
    await waitFor(() =>
      expect(
        screen
          .getAllByRole("alert")
          .some((alert) => alert.textContent?.includes("save unavailable")),
      ).toBe(true),
    );
    expect(finalize).not.toHaveBeenCalled();
    expect((screen.getAllByRole("radio")[1] as HTMLInputElement).checked).toBe(true);
    expect(
      screen.getByRole("button", { name: "Retry submission" }),
    ).toBeInTheDocument();

    allowSave = true;
    await user.click(screen.getByRole("button", { name: "Retry submission" }));
    await waitFor(() => expect(finalize).toHaveBeenCalledTimes(1));
    const lastUpdate = update.mock.calls.at(-1);
    expect(
      lastUpdate?.[1].find((state) => state.questionId === attempt.questionOrder[0]),
    ).toMatchObject({
      selectedChoice: 1,
    });
  });

  it("shows results after a successful submission", async () => {
    const attempt = writingAttempt("successful-submit-ui");
    const update = vi.fn().mockResolvedValue(attempt);
    const finalize = vi.fn().mockResolvedValue(submittedResult(attempt));
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <ProgressContext.Provider value={mockProgressContext(attempt, update, finalize)}>
        <MockAttemptPage attemptId={attempt.id} />
      </ProgressContext.Provider>,
    );

    await user.click(screen.getAllByRole("radio")[0]);
    expect(screen.queryByText("Correct answer")).not.toBeInTheDocument();
    expect(screen.queryByText("Explanation:")).not.toBeInTheDocument();
    await waitFor(() => expect(update).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Submit mock" }));
    await waitFor(() => expect(finalize).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("0 / 60", { selector: "h1" })).toBeInTheDocument();
  });

  it("keeps a failed finalisation retryable", async () => {
    const attempt = writingAttempt("failed-finalise-ui");
    const update = vi.fn().mockResolvedValue(attempt);
    const finalize = vi
      .fn()
      .mockRejectedValueOnce(new Error("commit unavailable"))
      .mockResolvedValueOnce(submittedResult(attempt));
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <ProgressContext.Provider value={mockProgressContext(attempt, update, finalize)}>
        <MockAttemptPage attemptId={attempt.id} />
      </ProgressContext.Provider>,
    );

    await user.click(screen.getByRole("button", { name: "Submit mock" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("commit unavailable"),
    );
    expect(finalize).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Retry submission" }));
    await waitFor(() => expect(finalize).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("0 / 60", { selector: "h1" })).toBeInTheDocument();
  });

  it("does not allow duplicate finalisation calls while submission is in flight", async () => {
    const attempt = writingAttempt("duplicate-submit-ui");
    const update = vi.fn().mockResolvedValue(attempt);
    const pending = deferred<ReturnType<typeof submittedResult>>();
    const finalize = vi.fn().mockReturnValue(pending.promise);
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <ProgressContext.Provider value={mockProgressContext(attempt, update, finalize)}>
        <MockAttemptPage attemptId={attempt.id} />
      </ProgressContext.Provider>,
    );

    const submit = screen.getByRole("button", { name: "Submit mock" });
    await user.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(finalize).toHaveBeenCalledTimes(1));
    pending.resolve(submittedResult(attempt));
    expect(await screen.findByText("0 / 60", { selector: "h1" })).toBeInTheDocument();
  });

  it("uses the writing-end timestamp when an expired attempt is finalised after closure", async () => {
    const attempt = writingAttempt("expired-ui", 111 * 60 * 1000);
    const update = vi.fn().mockResolvedValue(attempt);
    const finalize = vi.fn().mockResolvedValue(submittedResult(attempt));
    render(
      <ProgressContext.Provider value={mockProgressContext(attempt, update, finalize)}>
        <MockAttemptPage attemptId={attempt.id} />
      </ProgressContext.Provider>,
    );
    await waitFor(() => expect(finalize).toHaveBeenCalledTimes(1));
    expect(finalize.mock.calls[0]?.[1]).toBe(attempt.writingEndsAt);
    expect(Date.parse(finalize.mock.calls[0]?.[2] as string)).toBeGreaterThanOrEqual(
      Date.parse(attempt.writingEndsAt),
    );
  });

  it("blocks automatic expiry finalisation on a failed latest save and retries later", async () => {
    vi.useFakeTimers({ now: Date.now() });
    try {
      const attempt = writingAttempt("expired-stale-ui");
      let allowSave = false;
      const update = vi
        .fn()
        .mockImplementation(
          async (
            _id: string,
            states: readonly MockQuestionAttemptState[],
            currentIndex: number,
          ) => {
            if (!allowSave) throw new Error("expiry save unavailable");
            return {
              ...attempt,
              questionStates: states,
              currentQuestionIndex: currentIndex,
            };
          },
        );
      const finalize = vi.fn().mockResolvedValue(submittedResult(attempt));
      render(
        <ProgressContext.Provider
          value={mockProgressContext(attempt, update, finalize)}
        >
          <MockAttemptPage attemptId={attempt.id} />
        </ProgressContext.Provider>,
      );
      fireEvent.click(screen.getAllByRole("radio")[1]);
      await act(async () => {
        await Promise.resolve();
      });
      vi.setSystemTime(Date.parse(attempt.writingEndsAt) + 1);
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });
      expect(finalize).not.toHaveBeenCalled();
      expect(
        screen.getByRole("button", { name: "Retry submission" }),
      ).toBeInTheDocument();

      allowSave = true;
      fireEvent.click(screen.getByRole("button", { name: "Retry submission" }));
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(finalize).toHaveBeenCalledTimes(1);
      expect(finalize.mock.calls[0]?.[1]).toBe(attempt.writingEndsAt);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps unload protection dirty while a newer queued save is pending", async () => {
    const attempt = writingAttempt("queued-dirty-ui");
    const first = deferred<MockAttempt>();
    const second = deferred<MockAttempt>();
    const update = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const user = userEvent.setup();
    render(
      <ProgressContext.Provider value={mockProgressContext(attempt, update)}>
        <MockAttemptPage attemptId={attempt.id} />
      </ProgressContext.Provider>,
    );
    await user.click(screen.getAllByRole("radio")[0]);
    await user.click(screen.getByRole("button", { name: /^Next$/ }));
    expect(update).toHaveBeenCalledTimes(1);
    first.resolve(attempt);
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    const pendingUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(pendingUnload);
    expect(pendingUnload.defaultPrevented).toBe(true);
    second.resolve(attempt);
    await waitFor(() => {
      const cleanUnload = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(cleanUnload);
      expect(cleanUnload.defaultPrevented).toBe(false);
    });
  });

  it("freezes a Practice MCQ payload until its review save succeeds", async () => {
    const pending = deferred<unknown>();
    const recordReview = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce({});
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
      markLessonSeen: vi.fn().mockResolvedValue(undefined),
      recordReview,
      exportProgress: vi.fn(() => "{}"),
      replaceProgress: vi.fn().mockResolvedValue(undefined),
      resetProgress: vi.fn().mockResolvedValue(undefined),
    };
    const user = userEvent.setup();
    render(
      <ProgressContext.Provider value={context}>
        <PracticePage initialMode="mcq" />
      </ProgressContext.Provider>,
    );
    const originalStem = normalizeRenderedText(
      screen.getByRole("heading", { level: 2 }).textContent ?? "",
    );
    await user.click(screen.getAllByRole("radio")[0]);
    await user.click(screen.getByRole("button", { name: "Submit answer" }));
    expect(screen.getByRole("button", { name: "Change format" })).toBeDisabled();
    expect(screen.getByLabelText("Chapter")).toBeDisabled();
    expect(screen.getByRole("button", { name: "New set" })).toBeDisabled();
    expect(
      normalizeRenderedText(
        screen.getByRole("heading", { level: 2 }).textContent ?? "",
      ),
    ).toBe(originalStem);

    pending.reject(new Error("practice save unavailable"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/practice save unavailable/),
    );
    const firstPayload = recordReview.mock.calls[0]?.[0];
    await user.click(screen.getByRole("button", { name: "Retry save" }));
    await waitFor(() => expect(recordReview).toHaveBeenCalledTimes(2));
    expect(recordReview.mock.calls[1]?.[0]).toEqual(firstPayload);
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("button", { name: "Change format" })).not.toBeDisabled();
  });

  it("freezes the written-response rating payload and retries without persisting typed text", async () => {
    const pending = deferred<unknown>();
    const recordReview = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce({});
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
      markLessonSeen: vi.fn().mockResolvedValue(undefined),
      recordReview,
      exportProgress: vi.fn(() => "{}"),
      replaceProgress: vi.fn().mockResolvedValue(undefined),
      resetProgress: vi.fn().mockResolvedValue(undefined),
    };
    const user = userEvent.setup();
    render(
      <ProgressContext.Provider value={context}>
        <PracticePage initialMode="written" />
      </ProgressContext.Provider>,
    );
    await user.type(screen.getByLabelText("Your working"), "private working");
    await user.click(screen.getByRole("button", { name: "Show model answer" }));
    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.getByRole("button", { name: "Change format" })).toBeDisabled();
    expect(screen.getByLabelText("Your working")).toBeDisabled();
    pending.reject(new Error("written save unavailable"));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/written save unavailable/),
    );
    const firstPayload = recordReview.mock.calls[0]?.[0];
    await user.click(screen.getByRole("button", { name: "Retry save" }));
    await waitFor(() => expect(recordReview).toHaveBeenCalledTimes(2));
    expect(recordReview.mock.calls[1]?.[0]).toEqual(firstPayload);
    expect(screen.getByRole("button", { name: "Next response" })).toBeInTheDocument();
    expect(JSON.stringify(recordReview.mock.calls)).not.toContain("private working");
  });

  it("counts foreground active time only while the document is visible", async () => {
    vi.useFakeTimers({ now: Date.now() });
    let monotonicNow = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => monotonicNow);
    const originalVisibility = document.visibilityState;
    const setVisibility = (value: "visible" | "hidden") =>
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value,
      });
    try {
      const attempt = writingAttempt("visibility-time-ui");
      const update = vi
        .fn()
        .mockImplementation(
          async (
            _id: string,
            states: readonly MockQuestionAttemptState[],
            currentIndex: number,
          ) => ({
            ...attempt,
            questionStates: states,
            currentQuestionIndex: currentIndex,
          }),
        );
      render(
        <ProgressContext.Provider value={mockProgressContext(attempt, update)}>
          <MockAttemptPage attemptId={attempt.id} />
        </ProgressContext.Provider>,
      );

      monotonicNow = 5000;
      setVisibility("hidden");
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      const firstState = update.mock.calls.at(-1)?.[1][0];
      expect(firstState?.timeSpentMs).toBeGreaterThan(3990);
      expect(firstState?.timeSpentMs).toBeLessThan(4010);

      monotonicNow = 100000;
      await act(async () => {
        vi.advanceTimersByTime(30_000);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(update.mock.calls.at(-1)?.[1][0].timeSpentMs).toBeGreaterThan(3990);
      expect(update.mock.calls.at(-1)?.[1][0].timeSpentMs).toBeLessThan(4010);

      setVisibility("visible");
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      monotonicNow = 101000;
      setVisibility("hidden");
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(update.mock.calls.at(-1)?.[1][0].timeSpentMs).toBeCloseTo(5000, 0);
    } finally {
      setVisibility(originalVisibility);
      vi.useRealTimers();
    }
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}
