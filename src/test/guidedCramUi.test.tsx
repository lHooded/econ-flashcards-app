import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GuidedKnowledgeCheck } from "../components/knowledge/guided/GuidedKnowledgeCheck";
import { GuidedLesson } from "../components/knowledge/guided/GuidedLesson";
import {
  getGuidedCheckVariant,
  guidedKnowledgeCheckSkills,
} from "../knowledge/guided/checks";
import { knowledgeConceptById } from "../knowledge/data";
import { KnowledgeProvider } from "../knowledge/KnowledgeProvider";

const percentageSkill = guidedKnowledgeCheckSkills.find(
  (skill) => skill.conceptId === "percentage",
)!;

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
    fireEvent.click(screen.getByRole("button", { name: /Explain percentage/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent(/percentage change compares/i);
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
});
