import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProgressContext, type ProgressContextValue } from "../app/progressContext";
import { GuidedKnowledgeCheck } from "../components/knowledge/guided/GuidedKnowledgeCheck";
import { GuidedLesson } from "../components/knowledge/guided/GuidedLesson";
import {
  getGuidedCheckVariant,
  guidedKnowledgeCheckSkills,
} from "../knowledge/guided/checks";
import { knowledgeConceptById } from "../knowledge/data";
import { KnowledgeProvider } from "../knowledge/KnowledgeProvider";
import { GuidedCramPage } from "../pages/GuidedCramPage";

const percentageSkill = guidedKnowledgeCheckSkills.find(
  (skill) => skill.conceptId === "percentage",
)!;

function GuidedPageHarness({
  mode,
  showPage,
  initialSeen = [],
  onSeen,
}: {
  readonly mode: "guided" | "high-yield";
  readonly showPage: boolean;
  readonly initialSeen?: readonly string[];
  readonly onSeen?: (conceptId: string) => void;
}) {
  const [lessonSeenConceptIds, setLessonSeenConceptIds] = useState(initialSeen);
  const markLessonSeen = async (conceptId: string) => {
    onSeen?.(conceptId);
    setLessonSeenConceptIds((current) =>
      current.includes(conceptId) ? current : [...current, conceptId],
    );
  };
  const snapshot = {
    settings: { examAt: null, studyBufferHours: 24 },
    cardStates: {},
    reviewEvents: [],
    lessonSeenConceptIds,
  };
  const value: ProgressContextValue = {
    snapshot,
    isLoading: false,
    error: null,
    clearError: vi.fn(),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    markLessonSeen,
    recordReview: vi.fn().mockResolvedValue({}) as ProgressContextValue["recordReview"],
    exportProgress: vi.fn(() => "{}"),
    replaceProgress: vi.fn().mockResolvedValue(undefined),
    resetProgress: vi.fn().mockResolvedValue(undefined),
  };
  return (
    <ProgressContext.Provider value={value}>
      {showPage ? <GuidedCramPage mode={mode} /> : null}
    </ProgressContext.Provider>
  );
}

describe("Guided Cram interaction safeguards", () => {
  it("does not make reading a lesson into review evidence", () => {
    const onContinue = vi.fn();
    render(
      <GuidedLesson
        concept={knowledgeConceptById.get("percentage")!}
        onContinue={onContinue}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Check understanding" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("saves before advancing, prevents duplicate lesson submits, and allows retry", async () => {
    let resolveSave!: () => void;
    const pendingSave = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const onContinue = vi
      .fn<() => Promise<void>>()
      .mockReturnValueOnce(pendingSave)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    render(
      <GuidedLesson
        concept={knowledgeConceptById.get("percentage")!}
        onContinue={onContinue}
      />,
    );

    const button = screen.getByRole("button", { name: "Check understanding" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Saving lesson…" })).toBeDisabled();
    expect(screen.getByRole("heading", { name: "Percentage" })).toBeInTheDocument();
    resolveSave();
    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Check understanding" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/offline/));
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(3));
  });

  it("blocks a tested concept before a guided check and unlocks it after saving", async () => {
    const variant = getGuidedCheckVariant(percentageSkill, 0);
    const onSubmitReview = vi.fn().mockResolvedValue(undefined);
    render(
      <KnowledgeProvider>
        <GuidedKnowledgeCheck
          skill={percentageSkill}
          variant={variant}
          onSubmitReview={onSubmitReview}
          onFinish={vi.fn()}
        />
      </KnowledgeProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /percentage is part of the current question/i,
      }),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(
      /explanation unavailable before your answer/i,
    );
    expect(screen.getByRole("dialog")).not.toHaveTextContent(
      /percentage change compares/i,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close explanation" }));

    if (variant.kind === "calculation") {
      fireEvent.change(screen.getByLabelText(/Numeric answer/), {
        target: { value: String(variant.answer) },
      });
    }
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    await waitFor(() => expect(screen.getByText("Correct")).toBeInTheDocument());
    expect(onSubmitReview).toHaveBeenCalledTimes(1);
    const explanationButtons = screen.getAllByRole("button", {
      name: /Explain percentage/,
    });
    fireEvent.click(explanationButtons.at(-1)!);
    expect(screen.getByRole("dialog")).toHaveTextContent(
      /percentage expresses a quantity out of 100/i,
    );
  });

  it("keeps the exact check event and variant across a failed save retry", async () => {
    const variant = getGuidedCheckVariant(percentageSkill, 1);
    const onSubmitReview = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    render(
      <GuidedKnowledgeCheck
        skill={percentageSkill}
        variant={variant}
        onSubmitReview={onSubmitReview}
        onFinish={vi.fn()}
      />,
    );
    if (variant.kind === "calculation") {
      fireEvent.change(screen.getByLabelText(/Numeric answer/), {
        target: { value: String(variant.answer) },
      });
    }
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/offline/i),
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    await waitFor(() => expect(screen.getByText("Correct")).toBeInTheDocument());
    expect(onSubmitReview).toHaveBeenCalledTimes(2);
    expect(onSubmitReview.mock.calls[0][0]).toEqual(onSubmitReview.mock.calls[1][0]);
  });

  it("does not persist or skip a lesson when the page remounts before Continue", async () => {
    const seen: string[] = [];
    const view = render(
      <GuidedPageHarness mode="high-yield" showPage onSeen={(id) => seen.push(id)} />,
    );
    await waitFor(() =>
      expect(document.getElementById("guided-lesson-title")).toBeInTheDocument(),
    );
    const lessonTitle = document.getElementById("guided-lesson-title")?.textContent;
    expect(lessonTitle).toBeTruthy();
    expect(seen).toEqual([]);

    view.rerender(<GuidedPageHarness mode="high-yield" showPage={false} />);
    view.rerender(<GuidedPageHarness mode="high-yield" showPage />);
    await waitFor(() =>
      expect(document.getElementById("guided-lesson-title")).toHaveTextContent(
        lessonTitle ?? "",
      ),
    );
    expect(seen).toEqual([]);
  });

  it("persists High-Yield Continue before a page remount and does not replay that lesson", async () => {
    const seen: string[] = [];
    const view = render(
      <GuidedPageHarness mode="high-yield" showPage onSeen={(id) => seen.push(id)} />,
    );
    await waitFor(() =>
      expect(document.getElementById("guided-lesson-title")).toBeInTheDocument(),
    );
    const lessonTitle = document.getElementById("guided-lesson-title")?.textContent;
    expect(lessonTitle).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "Check understanding" }));
    await waitFor(() => expect(seen).toHaveLength(1));
    expect(seen[0]).toBeTruthy();

    view.rerender(<GuidedPageHarness mode="high-yield" showPage={false} />);
    view.rerender(<GuidedPageHarness mode="high-yield" showPage />);
    await waitFor(() => {
      const remountedTitle =
        document.getElementById("guided-lesson-title")?.textContent;
      expect(remountedTitle).not.toBe(lessonTitle);
    });
    expect(seen).toHaveLength(1);
  });
});
