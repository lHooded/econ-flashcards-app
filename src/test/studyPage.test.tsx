import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";
import { parseHashLocation } from "../app/hashRoute";
import { ProgressContext, type ProgressContextValue } from "../app/progressContext";
import { cards } from "../data/deck";
import { createReviewEvent, type ProgressSnapshot } from "../domain/progress";
import { StudyPage } from "../pages/StudyPage";
import type { StudyScope } from "../study/studyScope";

const firstMcq = cards.find((card) => card.choices !== undefined);
if (
  firstMcq === undefined ||
  firstMcq.choices === undefined ||
  firstMcq.correctChoice === undefined
) {
  throw new Error("The canonical deck should contain an authored MCQ.");
}

function StudyPageHarness({
  unseenCardIds = [firstMcq!.id],
}: {
  readonly unseenCardIds?: readonly string[];
}) {
  const baselineReviewedAt = new Date(Date.now() - 60_000).toISOString();
  const [scope, setScope] = useState<StudyScope>(
    parseHashLocation(window.location.hash).studyScope,
  );
  const initialSnapshot: ProgressSnapshot = {
    settings: { examAt: null, studyBufferHours: 24 },
    cardStates: {},
    reviewEvents: cards
      .filter((card) => !unseenCardIds.includes(card.id))
      .map((card) => ({
        id: `seed-${card.id}`,
        cardId: card.id,
        reviewedAt: baselineReviewedAt,
        mode: card.choices === undefined ? "recall" : "mcq",
        correct: true,
        rating: card.choices === undefined ? "got_it" : null,
        responseTimeMs: null,
        selectedChoice: null,
      })),
  };

  useEffect(() => {
    const onHashChange = () =>
      setScope(parseHashLocation(window.location.hash).studyScope);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
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
        reviewedAt: new Date().toISOString(),
      });
      setSnapshot((current) => ({
        ...current,
        reviewEvents: [...current.reviewEvents, event],
      }));
      return {
        event,
        cardState: {
          cardId: event.cardId,
          firstSeenAt: event.reviewedAt,
          lastSeenAt: event.reviewedAt,
          totalReviews: 1,
          correctReviews: event.correct === true ? 1 : 0,
          consecutiveCorrect: event.correct === true ? 1 : 0,
        },
      };
    },
  };

  return (
    <ProgressContext.Provider value={value}>
      <StudyPage scope={scope} />
    </ProgressContext.Provider>
  );
}

describe("StudyPage session", () => {
  it("replaces an unanswered card immediately when the focus changes", async () => {
    const user = userEvent.setup();
    const calculationCard = cards.find((card) => card.kind === "calculation");
    if (calculationCard === undefined) {
      throw new Error("The canonical deck should contain a calculation card.");
    }
    window.location.hash = "";
    render(<StudyPageHarness unseenCardIds={[firstMcq.id, calculationCard.id]} />);

    expect(await screen.findByText(firstMcq.front)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Study preset"), "calculations");
    await waitFor(() => {
      expect(screen.getByText(calculationCard.front)).toBeInTheDocument();
      expect(screen.queryByText(firstMcq.front)).not.toBeInTheDocument();
    });
  });

  it("keeps the reviewed MCQ visible until the learner advances", async () => {
    const user = userEvent.setup();
    window.location.hash = "";
    render(<StudyPageHarness />);

    await user.click(screen.getByLabelText(firstMcq.choices![firstMcq.correctChoice!]));
    await user.click(screen.getByRole("button", { name: "Reveal result" }));

    expect(await screen.findByText(firstMcq.explanation)).toBeInTheDocument();
    expect(screen.getByText(firstMcq.front)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next card" })).toBeInTheDocument();
    expect(screen.getByText("1", { selector: "strong" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next card" }));
    expect(screen.getByText("1", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("You’re caught up in this focus.")).toBeInTheDocument();
  });

  it("keeps a completed result visible while a new focus waits for Next", async () => {
    const user = userEvent.setup();
    window.location.hash = "";
    render(<StudyPageHarness />);

    await user.click(screen.getByLabelText(firstMcq.choices![firstMcq.correctChoice!]));
    await user.click(screen.getByRole("button", { name: "Reveal result" }));
    expect(await screen.findByText(firstMcq.explanation)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Study preset"), "calculations");
    await waitFor(() =>
      expect(screen.getByText(firstMcq.explanation)).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Next card" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next card" }));
    expect(
      await screen.findByText("You’re caught up in this focus."),
    ).toBeInTheDocument();
  });
});
