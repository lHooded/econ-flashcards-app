import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";
import { parseHashLocation } from "../app/hashRoute";
import { ProgressContext, type ProgressContextValue } from "../app/progressContext";
import { cards } from "../data/deck";
import {
  applyReviewToCardState,
  createReviewEvent,
  type NewReviewEvent,
  type ProgressSnapshot,
  type ReviewEvent,
} from "../domain/progress";
import type { RecordedReview } from "../db/progressRepository";
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

const recallRaceCard = cards.find((card) => card.id === "ch01-001");
const calculationRaceCard = cards.find((card) => card.kind === "calculation");
if (recallRaceCard === undefined || calculationRaceCard === undefined) {
  throw new Error("The canonical deck should contain the scoped race-test cards.");
}
const calculationRaceCardId = calculationRaceCard.id;

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
    markLessonSeen: async () => undefined,
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

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason?: unknown) => void;
  readonly isPending: () => boolean;
}

interface DeferredReviewAttempt {
  readonly input: NewReviewEvent;
  readonly event: ReviewEvent;
  readonly deferred: Deferred<RecordedReview>;
}

interface DeferredRecallHarnessState {
  readonly attempts: DeferredReviewAttempt[];
  readonly successfulEvents: ReviewEvent[];
}

function createDeferred<T>(): Deferred<T> {
  let settled = false;
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = (value) => {
      settled = true;
      resolve(value);
    };
    rejectPromise = (reason) => {
      settled = true;
      reject(reason);
    };
  });

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
    isPending: () => !settled,
  };
}

function createRaceSnapshot(unseenCardIds: readonly string[]): ProgressSnapshot {
  const nowMs = Date.now();
  const ordinaryReviewedAt = new Date(nowMs - 60_000).toISOString();
  const calculationReviewedAt = new Date(nowMs - 48 * 60 * 60 * 1000).toISOString();

  const reviewEvents = cards.flatMap((card) => {
    if (unseenCardIds.includes(card.id)) {
      return [];
    }

    const mode: NewReviewEvent["mode"] =
      card.choices !== undefined
        ? "mcq"
        : card.kind === "calculation"
          ? "calculation"
          : "recall";
    const reviewedAtValues =
      card.id === calculationRaceCardId
        ? [calculationReviewedAt, calculationReviewedAt]
        : [ordinaryReviewedAt];

    return reviewedAtValues.map((reviewedAt, index) =>
      createReviewEvent({
        id: `seed-${card.id}-${index}`,
        cardId: card.id,
        reviewedAt,
        mode,
        correct: true,
        rating: mode === "mcq" ? null : "got_it",
        responseTimeMs: null,
        selectedChoice: null,
      }),
    );
  });

  return {
    settings: { examAt: null, studyBufferHours: 24 },
    cardStates: {},
    reviewEvents,
  };
}

function createDeferredRecallHarness(unseenCardIds: readonly string[]) {
  const harnessState: DeferredRecallHarnessState = {
    attempts: [],
    successfulEvents: [],
  };

  function DeferredRecallHarness() {
    const [scope, setScope] = useState<StudyScope>(
      parseHashLocation(window.location.hash).studyScope,
    );
    const [snapshot, setSnapshot] = useState<ProgressSnapshot>(() =>
      createRaceSnapshot(unseenCardIds),
    );

    useEffect(() => {
      const onHashChange = () =>
        setScope(parseHashLocation(window.location.hash).studyScope);
      window.addEventListener("hashchange", onHashChange);
      return () => window.removeEventListener("hashchange", onHashChange);
    }, []);

    const recordReview = (input: NewReviewEvent): Promise<RecordedReview> => {
      const event = createReviewEvent({
        ...input,
        id: `deferred-review-${harnessState.attempts.length + 1}`,
        reviewedAt: new Date().toISOString(),
      });
      const deferred = createDeferred<RecordedReview>();
      harnessState.attempts.push({ input, event, deferred });

      return deferred.promise.then((result) => {
        harnessState.successfulEvents.push(event);
        setSnapshot((current) => ({
          ...current,
          cardStates: {
            ...current.cardStates,
            [result.cardState.cardId]: result.cardState,
          },
          reviewEvents: [...current.reviewEvents, event],
        }));
        return result;
      });
    };

    const value: ProgressContextValue = {
      snapshot,
      isLoading: false,
      error: null,
      clearError: () => undefined,
      saveSettings: async () => undefined,
      markLessonSeen: async () => undefined,
      exportProgress: () => "",
      replaceProgress: async () => undefined,
      resetProgress: async () => undefined,
      recordReview,
    };

    return (
      <ProgressContext.Provider value={value}>
        <StudyPage scope={scope} />
      </ProgressContext.Provider>
    );
  }

  return { Harness: DeferredRecallHarness, harnessState };
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

  it("keeps a recall result stable across a focus change while its save is deferred", async () => {
    const user = userEvent.setup();
    const { Harness, harnessState } = createDeferredRecallHarness([
      recallRaceCard.id,
      calculationRaceCard.id,
    ]);
    window.location.hash = "";
    render(<Harness />);

    expect(await screen.findByText(recallRaceCard.front)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show answer" }));
    await user.click(screen.getByRole("button", { name: "Struggled" }));
    await waitFor(() => expect(harnessState.attempts).toHaveLength(1));
    expect(harnessState.attempts[0].deferred.isPending()).toBe(true);

    await user.selectOptions(screen.getByLabelText("Study preset"), "calculations");
    await waitFor(() => {
      expect(screen.getByText(recallRaceCard.front)).toBeInTheDocument();
      expect(screen.getByText(/Focus: Calculations/)).toBeInTheDocument();
    });
    expect(screen.queryByText(calculationRaceCard.front)).not.toBeInTheDocument();

    const saveError = new Error("deferred recall save failed");
    await act(async () => {
      harnessState.attempts[0].deferred.reject(saveError);
      await harnessState.attempts[0].deferred.promise.catch(() => undefined);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(saveError.message);
      expect(screen.getByText(recallRaceCard.front)).toBeInTheDocument();
    });
    expect(screen.queryByText(calculationRaceCard.front)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Study chapter"), "1");
    await waitFor(() => {
      expect(screen.getByText(recallRaceCard.front)).toBeInTheDocument();
      expect(screen.getByText(/Focus: Calculations · Chapter 1/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Struggled" }));
    await waitFor(() => expect(harnessState.attempts).toHaveLength(2));
    expect(harnessState.attempts[1].input).toEqual(harnessState.attempts[0].input);
    const retryAttempt = harnessState.attempts[1];
    const retryResult: RecordedReview = {
      event: retryAttempt.event,
      cardState: applyReviewToCardState(undefined, retryAttempt.event),
    };
    await act(async () => {
      retryAttempt.deferred.resolve(retryResult);
      await retryAttempt.deferred.promise;
      await Promise.resolve();
    });

    expect(harnessState.attempts).toHaveLength(2);
    expect(harnessState.successfulEvents).toEqual([retryAttempt.event]);
    expect(await screen.findByText(calculationRaceCard.front)).toBeInTheDocument();
    expect(screen.queryByText(recallRaceCard.front)).not.toBeInTheDocument();
    expect(screen.getByText(/Focus: Calculations · Chapter 1/)).toBeInTheDocument();
  });
});
