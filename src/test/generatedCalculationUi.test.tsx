import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProgressContext, type ProgressContextValue } from "../app/progressContext";
import { GeneratedCalculation } from "../components/calculations/GeneratedCalculation";
import { getGeneratedCalculationInstance } from "../calculations/templates";
import type { GeneratedCalculationInstance } from "../calculations/model";
import type { NewReviewEvent } from "../domain/progress";
import { PracticePage } from "../pages/PracticePage";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function baseProgressContext(
  recordReview: ProgressContextValue["recordReview"],
): ProgressContextValue {
  return {
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
}

function renderGenerated(
  instance: GeneratedCalculationInstance,
  recordReview: (input: NewReviewEvent) => Promise<unknown>,
  overrides: Partial<{
    onNext: () => void;
    onNewNumbers: () => void;
    now: () => number;
  }> = {},
) {
  return render(
    <GeneratedCalculation
      instance={instance}
      index={0}
      total={1}
      recordReview={recordReview}
      onNext={overrides.onNext ?? vi.fn()}
      onNewNumbers={overrides.onNewNumbers ?? vi.fn()}
      now={overrides.now}
    />,
  );
}

describe("generated calculation UI lifecycle", () => {
  it("starts empty, keeps the solution hidden, and objectively grades a wrong answer", async () => {
    const instance = getGeneratedCalculationInstance(
      "generated-inventory-investment",
      "ui-wrong",
    );
    const save = deferred<unknown>();
    const recordReview = vi.fn().mockReturnValue(save.promise);
    renderGenerated(instance, recordReview);

    const input = screen.getByLabelText(/Numeric answer/) as HTMLInputElement;
    expect(input.value).toBe("");
    expect(screen.queryByText("Worked solution")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: String(instance.answer.value + 1) } });
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    await waitFor(() => expect(recordReview).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "New numbers" })).toBeDisabled();
    expect(screen.queryByText("Worked solution")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(input.value).toBe(String(instance.answer.value + 1));

    await act(async () => save.resolve(undefined));
    expect(await screen.findByText("Not quite")).toBeInTheDocument();
    expect(screen.getByText("Worked solution")).toBeInTheDocument();
  });

  it("freezes the exact review payload across a failed save and retry", async () => {
    const instance = getGeneratedCalculationInstance(
      "generated-fisher-effect",
      "ui-retry",
    );
    const firstSave = deferred<unknown>();
    const secondSave = deferred<unknown>();
    const recordReview = vi
      .fn()
      .mockReturnValueOnce(firstSave.promise)
      .mockReturnValueOnce(secondSave.promise);
    renderGenerated(instance, recordReview);

    const input = screen.getByLabelText(/Numeric answer/);
    fireEvent.change(input, { target: { value: String(instance.answer.value) } });
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    await waitFor(() => expect(recordReview).toHaveBeenCalledTimes(1));
    const payload = recordReview.mock.calls[0][0];
    expect(payload).toMatchObject({
      cardId: instance.reviewCardId,
      mode: "calculation",
      rating: null,
      selectedChoice: null,
      correct: true,
    });

    await act(async () => firstSave.reject(new Error("offline")));
    expect(await screen.findByRole("alert")).toHaveTextContent("offline");
    expect(screen.getByRole("button", { name: "New numbers" })).toBeDisabled();
    expect(screen.queryByText("Worked solution")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    await waitFor(() => expect(recordReview).toHaveBeenCalledTimes(2));
    expect(recordReview.mock.calls[1][0]).toBe(payload);
    await act(async () => secondSave.resolve(undefined));
    expect(await screen.findByText("Correct")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("grades a correct answer, reveals the worked solution only after persistence, and advances", async () => {
    const instance = getGeneratedCalculationInstance(
      "generated-cross-rate",
      "ui-correct",
    );
    const recordReview = vi.fn().mockResolvedValue(undefined);
    const onNext = vi.fn();
    renderGenerated(instance, recordReview, { onNext });

    const input = screen.getByLabelText(/Numeric answer/);
    fireEvent.change(input, { target: { value: String(instance.answer.value) } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(recordReview).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Correct")).toBeInTheDocument();
    expect(screen.getByText("Worked solution")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid input without recording a failure", () => {
    const instance = getGeneratedCalculationInstance(
      "generated-inventory-investment",
      "ui-invalid",
    );
    const recordReview = vi.fn().mockResolvedValue(undefined);
    renderGenerated(instance, recordReview);
    const input = screen.getByLabelText(/Numeric answer/);
    fireEvent.change(input, { target: { value: "3/7" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a number.");
    expect(recordReview).not.toHaveBeenCalled();
  });

  it("regenerates the current concept without a review and resets response time", async () => {
    const first = getGeneratedCalculationInstance(
      "generated-inventory-investment",
      "ui-new-numbers-a",
    );
    const replacement = getGeneratedCalculationInstance(
      "generated-inventory-investment",
      "ui-new-numbers-b",
    );
    const recordReview = vi.fn().mockResolvedValue(undefined);
    const clock = { value: 100 };

    function Harness() {
      const [instance, setInstance] = useState(first);
      return (
        <GeneratedCalculation
          instance={instance}
          index={0}
          total={1}
          recordReview={recordReview}
          onNext={vi.fn()}
          onNewNumbers={() => setInstance(replacement)}
          now={() => clock.value}
        />
      );
    }

    render(<Harness />);
    expect(screen.getByText(first.prompt)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New numbers" }));
    expect(await screen.findByText(replacement.prompt)).toBeInTheDocument();
    expect((screen.getByLabelText(/Numeric answer/) as HTMLInputElement).value).toBe(
      "",
    );
    expect(recordReview).not.toHaveBeenCalled();

    clock.value = 110;
    fireEvent.change(screen.getByLabelText(/Numeric answer/), {
      target: { value: String(replacement.answer.value) },
    });
    clock.value = 120;
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    await waitFor(() => expect(recordReview).toHaveBeenCalledTimes(1));
    expect(recordReview.mock.calls[0][0].responseTimeMs).toBe(20);
  });
});

describe("Practice Lab calculation modes", () => {
  it("defaults to generated numeric and retains the authored MCQ submode", async () => {
    const recordReview = vi.fn().mockResolvedValue(undefined);
    const context = baseProgressContext(
      recordReview as ProgressContextValue["recordReview"],
    );
    render(
      <ProgressContext.Provider value={context}>
        <PracticePage initialMode="calculations" />
      </ProgressContext.Provider>,
    );

    expect(screen.getByRole("tab", { name: "Generated numeric" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByLabelText(/Numeric answer/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Authored MCQs" }));
    await waitFor(() => expect(screen.getAllByRole("radio")).toHaveLength(4));
    expect(screen.queryByLabelText(/Numeric answer/)).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Generated numeric" })).toBeInTheDocument();
  });
});
