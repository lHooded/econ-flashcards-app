import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProgressContext, type ProgressContextValue } from "../app/progressContext";
import { GeneratedCalculation } from "../components/calculations/GeneratedCalculation";
import { GeneratedCalculationLab } from "../components/calculations/GeneratedCalculationLab";
import { buildGeneratedCalculationSet } from "../calculations/session";
import {
  calculationTemplates,
  getGeneratedCalculationInstance,
} from "../calculations/templates";
import type { GeneratedCalculationInstance } from "../calculations/model";
import type { NewReviewEvent } from "../domain/progress";
import { PracticePage } from "../pages/PracticePage";
import { KnowledgeProvider } from "../knowledge/KnowledgeProvider";

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

function findRuleOf70Session() {
  for (let seedIndex = 0; seedIndex < 100; seedIndex += 1) {
    const seed = `rule-of-70-exhaustion-${seedIndex}`;
    const instances = buildGeneratedCalculationSet(calculationTemplates, {
      chapter: 10,
      size: 20,
      seed,
    });
    const ruleIndex = instances.findIndex(
      (instance) => instance.templateId === "generated-rule-of-70",
    );
    if (ruleIndex >= 0) return { seed, instances, ruleIndex };
  }
  throw new Error("Could not find a real Rule-of-70 session for the UI regression.");
}

describe("generated calculation UI lifecycle", () => {
  it("renders generated calculation terminology through the shared knowledge matcher", () => {
    const instance = getGeneratedCalculationInstance(
      "generated-bond-price",
      "knowledge",
    );
    render(
      <KnowledgeProvider>
        <GeneratedCalculation
          instance={instance}
          index={0}
          total={1}
          recordReview={vi.fn().mockResolvedValue(undefined)}
          onNext={vi.fn()}
          onNewNumbers={vi.fn()}
        />
      </KnowledgeProvider>,
    );
    expect(
      screen.getAllByRole("button", {
        name: /bond is part of the current question/i,
      }).length,
    ).toBeGreaterThan(0);
  });

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
    expect(recordReview.mock.calls[0][0].cardId).toBe(first.reviewCardId);
  });

  it("keeps New numbers fresh in finite parameter spaces without recording reviews", async () => {
    const recordReview = vi.fn().mockResolvedValue(undefined);

    function Harness({
      chapter,
      size,
    }: {
      readonly chapter: number;
      readonly size: 5 | 20;
    }) {
      const [seed, setSeed] = useState(100);
      return (
        <GeneratedCalculationLab
          chapter={chapter}
          setChapter={vi.fn()}
          size={size}
          setSize={vi.fn()}
          seed={seed}
          onNewSet={() => setSeed((value) => value + 1)}
          onBack={vi.fn()}
          onUseAuthored={vi.fn()}
          recordReview={recordReview}
        />
      );
    }

    const { unmount } = render(<Harness chapter={10} size={5} />);
    const ruleOf70Prompts = new Set<string>();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const prompt = screen.getByRole("heading", { level: 2 }).textContent ?? "";
      expect(ruleOf70Prompts.has(prompt)).toBe(false);
      ruleOf70Prompts.add(prompt);
      fireEvent.click(screen.getByRole("button", { name: "New numbers" }));
      await waitFor(() =>
        expect(screen.getByRole("heading", { level: 2 }).textContent).not.toBe(prompt),
      );
    }
    expect(recordReview).not.toHaveBeenCalled();
    unmount();

    render(<Harness chapter={5} size={20} />);
    const balancedBudgetPrompts = new Set<string>();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const prompt = screen.getByRole("heading", { level: 2 }).textContent ?? "";
      expect(balancedBudgetPrompts.has(prompt)).toBe(false);
      balancedBudgetPrompts.add(prompt);
      fireEvent.click(screen.getByRole("button", { name: "New numbers" }));
      await waitFor(() =>
        expect(screen.getByRole("heading", { level: 2 }).textContent).not.toBe(prompt),
      );
    }
    expect(recordReview).not.toHaveBeenCalled();
  });

  it("handles real Rule-of-70 freshness exhaustion and recovers with New set", async () => {
    const session = findRuleOf70Session();
    const recordReview = vi.fn().mockResolvedValue(undefined);

    function Harness() {
      const [seed, setSeed] = useState(session.seed);
      return (
        <>
          <output data-testid="session-seed">{seed}</output>
          <GeneratedCalculationLab
            chapter={10}
            setChapter={vi.fn()}
            size={20}
            setSize={vi.fn()}
            seed={seed}
            onNewSet={() => setSeed((value) => `${value}-next`)}
            onBack={vi.fn()}
            onUseAuthored={vi.fn()}
            recordReview={recordReview}
          />
        </>
      );
    }

    render(<Harness />);
    for (let index = 0; index < session.ruleIndex; index += 1) {
      const previousPrompt = screen.getByRole("heading", { level: 2 }).textContent;
      fireEvent.change(screen.getByLabelText(/Numeric answer/), {
        target: { value: "0" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
      await waitFor(() => expect(recordReview).toHaveBeenCalledTimes(index + 1));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      await waitFor(() =>
        expect(screen.getByRole("heading", { level: 2 }).textContent).not.toBe(
          previousPrompt,
        ),
      );
    }

    expect(screen.getByText("Chapter 10 · Rule of 70")).toBeInTheDocument();
    const seenPrompts = new Set<string>([
      screen.getByRole("heading", { level: 2 }).textContent ?? "",
    ]);
    const reviewsBeforeRefresh = recordReview.mock.calls.length;
    let exhaustionShown = false;

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const newNumbers = screen.getByRole("button", { name: "New numbers" });
      if (newNumbers.hasAttribute("disabled")) {
        exhaustionShown = true;
        break;
      }
      const previousPrompt =
        screen.getByRole("heading", { level: 2 }).textContent ?? "";
      fireEvent.click(newNumbers);
      await waitFor(() => {
        const message = screen.queryByText(/No more unseen number variants/);
        const currentPrompt =
          screen.getByRole("heading", { level: 2 }).textContent ?? "";
        expect(message !== null || currentPrompt !== previousPrompt).toBe(true);
      });
      const message = screen.queryByText(/No more unseen number variants/);
      if (message !== null) {
        exhaustionShown = true;
        expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
          previousPrompt,
        );
        break;
      }
      const currentPrompt = screen.getByRole("heading", { level: 2 }).textContent ?? "";
      expect(seenPrompts.has(currentPrompt)).toBe(false);
      seenPrompts.add(currentPrompt);
    }

    expect(exhaustionShown).toBe(true);
    expect(seenPrompts.size).toBe(14);
    expect(screen.getByText(/No more unseen number variants/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New numbers" })).toBeDisabled();
    expect(recordReview).toHaveBeenCalledTimes(reviewsBeforeRefresh);
    const input = screen.getByLabelText(/Numeric answer/) as HTMLInputElement;
    expect(input).toBeEnabled();
    expect(screen.getByLabelText("Chapter")).toBeEnabled();
    expect(screen.getByLabelText("Set size")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Change format" })).toBeEnabled();
    expect(screen.getByRole("tab", { name: "Authored MCQs" })).toBeEnabled();
    fireEvent.change(input, { target: { value: "0" } });
    expect(input.value).toBe("0");
    expect(screen.getByRole("button", { name: "New set" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "New set" }));
    await waitFor(() =>
      expect(screen.getByTestId("session-seed")).toHaveTextContent(/-next$/),
    );
    expect(
      screen.queryByText(/No more unseen number variants/),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New numbers" })).toBeEnabled();

    fireEvent.change(screen.getByLabelText(/Numeric answer/), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    await waitFor(() =>
      expect(recordReview).toHaveBeenCalledTimes(reviewsBeforeRefresh + 1),
    );
  });

  it("renders base-set freshness exhaustion as an inline callout", () => {
    const recordReview = vi.fn().mockResolvedValue(undefined);
    const failingBuild: typeof buildGeneratedCalculationSet = () => {
      throw new Error("synthetic fresh-set exhaustion");
    };

    render(
      <GeneratedCalculationLab
        chapter={10}
        setChapter={vi.fn()}
        size={20}
        setSize={vi.fn()}
        seed="base-set-failure"
        onNewSet={vi.fn()}
        onBack={vi.fn()}
        onUseAuthored={vi.fn()}
        recordReview={recordReview}
        buildSet={failingBuild}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not build a fresh calculation set for these filters.",
    );
    expect(
      screen.getByText("Try a smaller set or start a new set."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New set" })).toBeEnabled();
    expect(screen.getByLabelText("Chapter")).toBeEnabled();
    expect(screen.getByLabelText("Set size")).toBeEnabled();
    expect(recordReview).not.toHaveBeenCalled();
  });

  it("rebuilds a complete fresh set at the set boundary", async () => {
    const recordReview = vi.fn().mockResolvedValue(undefined);
    const oldPrompts: string[] = [];

    function Harness() {
      const [seed, setSeed] = useState(100);
      return (
        <>
          <output data-testid="session-seed">{seed}</output>
          <GeneratedCalculationLab
            chapter={1}
            setChapter={vi.fn()}
            size={5}
            setSize={vi.fn()}
            seed={seed}
            onNewSet={() => setSeed((value) => value + 1)}
            onBack={vi.fn()}
            onUseAuthored={vi.fn()}
            recordReview={recordReview}
          />
        </>
      );
    }

    render(<Harness />);
    for (let index = 0; index < 5; index += 1) {
      oldPrompts.push(screen.getByRole("heading", { level: 2 }).textContent ?? "");
      fireEvent.change(screen.getByLabelText(/Numeric answer/), {
        target: { value: "0" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
      await waitFor(() => expect(recordReview).toHaveBeenCalledTimes(index + 1));
      if (index < 4) {
        fireEvent.click(screen.getByRole("button", { name: "Next" }));
        await waitFor(() =>
          expect(screen.getByRole("heading", { level: 2 }).textContent).not.toBe(
            oldPrompts[index],
          ),
        );
      }
    }

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(screen.getByTestId("session-seed")).toHaveTextContent("101"),
    );
    expect(screen.getByRole("heading", { level: 2 }).textContent).not.toBe(
      oldPrompts[1],
    );
    expect(recordReview).toHaveBeenCalledTimes(5);
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
