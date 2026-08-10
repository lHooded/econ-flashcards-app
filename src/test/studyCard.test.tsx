import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { cards } from "../data/deck";
import { StudyCard, type StudyCardPhase } from "../components/StudyCard";

describe("StudyCard", () => {
  it.each([
    ["1", "forgot"],
    ["2", "struggled"],
    ["3", "got_it"],
  ] as const)(
    "uses Space to reveal recall and %s to submit the rating",
    async (key, rating) => {
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

      await user.keyboard(" ");
      expect(screen.getByText(card.answer)).toBeInTheDocument();
      await user.keyboard(key);

      expect(onSubmitReview).toHaveBeenCalledWith(expect.objectContaining({ rating }));
      expect(onFinish).toHaveBeenCalledTimes(1);
    },
  );

  it("uses number keys to choose an authored MCQ and Enter to reveal and advance", async () => {
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
    const onFinish = vi.fn();

    render(
      <StudyCard card={card} onSubmitReview={onSubmitReview} onFinish={onFinish} />,
    );

    await user.keyboard(String(card.correctChoice + 1));
    expect(screen.getByLabelText(card.choices[card.correctChoice])).toBeChecked();
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Correct")).toBeInTheDocument();
    expect(onSubmitReview).toHaveBeenCalledTimes(1);

    document.body.tabIndex = -1;
    document.body.focus();
    await user.keyboard("{Enter}");
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("does not activate shortcuts from editable controls", async () => {
    const user = userEvent.setup();
    const card = cards.find((candidate) => candidate.choices === undefined);
    if (card === undefined) {
      throw new Error("The canonical deck should contain a non-MCQ card.");
    }
    const onSubmitReview = vi.fn().mockResolvedValue(undefined);

    render(
      <>
        <input aria-label="Notes" />
        <select aria-label="Mode" defaultValue="one">
          <option value="one">One</option>
        </select>
        <StudyCard card={card} onSubmitReview={onSubmitReview} onFinish={vi.fn()} />
      </>,
    );

    await user.click(screen.getByLabelText("Notes"));
    await user.keyboard("{Space}");
    expect(screen.queryByText(card.answer)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Mode"));
    await user.keyboard("{Enter}");
    expect(screen.queryByText(card.answer)).not.toBeInTheDocument();
    expect(onSubmitReview).not.toHaveBeenCalled();
  });

  it("cannot bypass a failed MCQ save with Enter", async () => {
    const user = userEvent.setup();
    const card = cards.find((candidate) => candidate.choices !== undefined);
    if (
      card === undefined ||
      card.choices === undefined ||
      card.correctChoice === undefined
    ) {
      throw new Error("The canonical deck should contain an authored MCQ.");
    }
    const onSubmitReview = vi.fn().mockRejectedValueOnce(new Error("save failed"));
    const onFinish = vi.fn();

    render(
      <StudyCard card={card} onSubmitReview={onSubmitReview} onFinish={onFinish} />,
    );

    await user.keyboard("1");
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("save failed");

    document.body.tabIndex = -1;
    document.body.focus();
    await user.keyboard("{Enter}");
    expect(onFinish).not.toHaveBeenCalled();
  });

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

  it("moves a recall rating through pending_save before completing", async () => {
    const user = userEvent.setup();
    const card = cards.find((candidate) => candidate.choices === undefined);
    if (card === undefined) {
      throw new Error("The canonical deck should contain a non-MCQ card.");
    }

    let resolveSave!: () => void;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    const phases: StudyCardPhase[] = [];
    const onSubmitReview = vi.fn().mockReturnValueOnce(savePromise);
    const onFinish = vi.fn();

    render(
      <StudyCard
        card={card}
        onSubmitReview={onSubmitReview}
        onFinish={onFinish}
        onPhaseChange={(phase) => phases.push(phase)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Show answer" }));
    await user.click(screen.getByRole("button", { name: "Struggled" }));

    expect(phases).toEqual(["unanswered", "revealed", "pending_save"]);
    expect(onFinish).not.toHaveBeenCalled();

    await act(async () => {
      resolveSave();
      await savePromise;
    });
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(phases).toEqual(["unanswered", "revealed", "pending_save", "completed"]);
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
