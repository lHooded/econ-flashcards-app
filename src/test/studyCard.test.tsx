import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { cards } from "../data/deck";
import { StudyCard } from "../components/StudyCard";

describe("StudyCard", () => {
  it("records an authored MCQ selection and objective correctness", async () => {
    const user = userEvent.setup();
    const card = cards.find((candidate) => candidate.choices !== undefined);
    if (
      card === undefined ||
      card.choices === undefined ||
      card.correctChoice === undefined
    ) {
      throw new Error("The canonical deck should contain an authored MCQ.");
    }
    const onSubmitReview = vi.fn().mockResolvedValue(undefined);

    render(
      <StudyCard card={card} onSubmitReview={onSubmitReview} onFinish={vi.fn()} />,
    );

    await user.click(screen.getByLabelText(card.choices[card.correctChoice]));
    await user.click(screen.getByRole("button", { name: "Reveal result" }));

    expect(await screen.findByText("Correct")).toBeInTheDocument();
    expect(screen.getByText(card.explanation)).toBeInTheDocument();
    expect(screen.getByText(card.commonTrap)).toBeInTheDocument();
    expect(onSubmitReview).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "mcq",
        correct: true,
        selectedChoice: card.correctChoice,
        rating: null,
      }),
    );
  });

  it("offers a retry after MCQ persistence fails without changing the payload", async () => {
    const user = userEvent.setup();
    const card = cards.find((candidate) => candidate.choices !== undefined);
    if (
      card === undefined ||
      card.choices === undefined ||
      card.correctChoice === undefined
    ) {
      throw new Error("The canonical deck should contain an authored MCQ.");
    }
    const onSubmitReview = vi
      .fn()
      .mockRejectedValueOnce(new Error("IndexedDB is temporarily unavailable"))
      .mockResolvedValueOnce(undefined);
    const onFinish = vi.fn();

    render(
      <StudyCard card={card} onSubmitReview={onSubmitReview} onFinish={onFinish} />,
    );

    await user.click(screen.getByLabelText(card.choices[card.correctChoice]));
    await user.click(screen.getByRole("button", { name: "Reveal result" }));

    expect(await screen.findByText("Correct")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "IndexedDB is temporarily unavailable",
    );
    expect(screen.queryByRole("button", { name: "Next card" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry save" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry save" }));

    expect(await screen.findByRole("button", { name: "Next card" })).toBeEnabled();
    expect(onSubmitReview).toHaveBeenCalledTimes(2);
    const firstPayload = onSubmitReview.mock.calls[0][0];
    const retryPayload = onSubmitReview.mock.calls[1][0];
    expect(retryPayload).toEqual(firstPayload);
    expect(firstPayload).toEqual(
      expect.objectContaining({
        mode: "mcq",
        correct: true,
        selectedChoice: card.correctChoice,
        rating: null,
        responseTimeMs: expect.any(Number),
      }),
    );

    await user.click(screen.getByRole("button", { name: "Next card" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("reveals non-MCQ content and records the self-rating", async () => {
    const user = userEvent.setup();
    const card = cards.find((candidate) => candidate.choices === undefined);
    if (card === undefined) {
      throw new Error("The canonical deck should contain a non-MCQ card.");
    }
    const onSubmitReview = vi.fn().mockResolvedValue(undefined);
    const onFinish = vi.fn();

    render(
      <StudyCard card={card} onSubmitReview={onSubmitReview} onFinish={onFinish} />,
    );

    expect(screen.queryByText(card.answer)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show answer" }));
    expect(screen.getByText(card.answer)).toBeInTheDocument();
    expect(screen.getByText(card.explanation)).toBeInTheDocument();
    expect(screen.getByText(card.commonTrap)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Struggled" }));
    expect(onSubmitReview).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: card.kind === "calculation" ? "calculation" : "recall",
        correct: true,
        rating: "struggled",
        selectedChoice: null,
      }),
    );
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
