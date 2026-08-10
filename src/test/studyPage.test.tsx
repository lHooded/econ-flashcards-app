import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ProgressContext, type ProgressContextValue } from "../app/progressContext";
import { cards } from "../data/deck";
import {
  applyReviewToCardState,
  createReviewEvent,
  type ProgressSnapshot,
} from "../domain/progress";
import { StudyPage } from "../pages/StudyPage";

const firstMcq = cards.find((card) => card.choices !== undefined);
if (
  firstMcq === undefined ||
  firstMcq.choices === undefined ||
  firstMcq.correctChoice === undefined
) {
  throw new Error("The canonical deck should contain an authored MCQ.");
}

function StudyPageHarness() {
  const initialSnapshot: ProgressSnapshot = {
    settings: { examAt: null, studyBufferHours: 24 },
    cardStates: Object.fromEntries(
      cards
        .filter((card) => card.id !== firstMcq!.id)
        .map((card) => [
          card.id,
          {
            cardId: card.id,
            firstSeenAt: "2026-08-10T00:00:00.000Z",
            lastSeenAt: "2026-08-10T00:00:00.000Z",
            totalReviews: 1,
            correctReviews: 1,
            consecutiveCorrect: 1,
          },
        ]),
    ),
    reviewEvents: [],
  };
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const value: ProgressContextValue = {
    snapshot,
    isLoading: false,
    error: null,
    clearError: () => undefined,
    saveSettings: async () => undefined,
    exportProgress: () => "",
    replaceProgress: async () => undefined,
    resetProgress: async () => undefined,
    recordReview: async (input) => {
      const event = createReviewEvent({
        ...input,
        id: "study-page-review",
        reviewedAt: "2026-08-10T01:00:00.000Z",
      });
      const cardState = applyReviewToCardState(
        snapshot.cardStates[event.cardId],
        event,
      );
      setSnapshot((current) => ({
        ...current,
        cardStates: { ...current.cardStates, [event.cardId]: cardState },
        reviewEvents: [...current.reviewEvents, event],
      }));
      return { event, cardState };
    },
  };

  return (
    <ProgressContext.Provider value={value}>
      <StudyPage />
    </ProgressContext.Provider>
  );
}

describe("StudyPage session", () => {
  it("keeps the reviewed MCQ visible until the learner advances", async () => {
    const user = userEvent.setup();
    render(<StudyPageHarness />);

    await user.click(screen.getByLabelText(firstMcq.choices![firstMcq.correctChoice!]));
    await user.click(screen.getByRole("button", { name: "Reveal result" }));

    expect(await screen.findByText(firstMcq.explanation)).toBeInTheDocument();
    expect(screen.getByText(firstMcq.front)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next card" })).toBeInTheDocument();
    expect(screen.getByText("0", { selector: "strong" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next card" }));
    expect(screen.getByText("1", { selector: "strong" })).toBeInTheDocument();
  });
});
