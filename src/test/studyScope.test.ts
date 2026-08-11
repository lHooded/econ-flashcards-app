import { describe, expect, it } from "vitest";
import type { Flashcard } from "../domain/content";
import { createReviewEvent, type ReviewEvent } from "../domain/progress";
import { deriveExamSrsSnapshot } from "../study/examSrs/deriveState";
import type { ExamSrsCardState, ExamSrsSnapshot } from "../study/examSrs/model";
import { selectScopedNextCard } from "../study/scopedSelector";
import {
  contentMatchesStudyScope,
  matchesStudyScope,
  type StudyScope,
} from "../study/studyScope";

const NOW = Date.parse("2026-08-10T12:00:00.000Z");
const NO_EXAM = { examAt: null, studyBufferHours: 24 } as const;

function card(
  id: string,
  chapter: number,
  overrides: Partial<Flashcard> = {},
): Flashcard {
  return {
    id,
    chapter,
    topic: id,
    kind: "recall",
    front: id,
    answer: id,
    explanation: id,
    commonTrap: id,
    difficulty: 1,
    tags: [],
    sources: ["test"],
    ...overrides,
  };
}

function state(
  cardId: string,
  learningState: ExamSrsCardState["learningState"],
  dueAt: string | null = learningState === "unseen"
    ? null
    : new Date(NOW + 60 * 60 * 1000).toISOString(),
): ExamSrsCardState {
  return {
    cardId,
    learningState,
    strength: learningState === "learned" ? 2 : 1,
    reviewCount: learningState === "unseen" ? 0 : 1,
    lastReviewedAt: learningState === "unseen" ? null : new Date(NOW).toISOString(),
    lastOutcome: learningState === "relearning" ? "failure" : "strong_success",
    dueAt,
    isDue: dueAt !== null && Date.parse(dueAt) <= NOW,
  };
}

function snapshot(states: readonly ExamSrsCardState[]): ExamSrsSnapshot {
  return {
    phase: "no_exam",
    studyDeadline: null,
    states,
    stateByCardId: Object.fromEntries(states.map((entry) => [entry.cardId, entry])),
  };
}

function scope(
  preset: StudyScope["preset"],
  chapter: number | null = null,
): StudyScope {
  return { preset, chapter };
}

function review(
  id: string,
  cardId: string,
  reviewedAt: number,
  overrides: Partial<Pick<ReviewEvent, "correct" | "rating" | "mode">> = {},
): ReviewEvent {
  return createReviewEvent({
    id,
    cardId,
    reviewedAt: new Date(reviewedAt).toISOString(),
    mode: overrides.mode ?? "recall",
    correct: overrides.correct === undefined ? true : overrides.correct,
    rating: overrides.rating === undefined ? "got_it" : overrides.rating,
    responseTimeMs: null,
    selectedChoice: null,
  });
}

describe("study scope predicates", () => {
  const unseen = card("unseen", 1);
  const relearning = card("relearning", 2);
  const weak = card("weak", 3);
  const learning = card("learning", 4);
  const learned = card("learned", 5);
  const calculation = card("calculation", 8, { kind: "calculation" });
  const authoredMcq = card("authored-mcq", 0, {
    kind: "recall",
    choices: ["A", "B"],
    correctChoice: 1,
  });
  const kindOnlyMcq = card("kind-only-mcq", 0, { kind: "mcq" });
  const highYield = card("high-yield", 9, { tags: ["high-yield"] });
  const states = new Map<string, ExamSrsCardState>([
    [unseen.id, state(unseen.id, "unseen")],
    [
      relearning.id,
      state(relearning.id, "relearning", new Date(NOW - 1).toISOString()),
    ],
    [weak.id, state(weak.id, "weak", new Date(NOW - 1).toISOString())],
    [learning.id, state(learning.id, "learning", new Date(NOW - 1).toISOString())],
    [learned.id, state(learned.id, "learned", new Date(NOW - 1).toISOString())],
    [calculation.id, state(calculation.id, "unseen")],
    [authoredMcq.id, state(authoredMcq.id, "unseen")],
    [kindOnlyMcq.id, state(kindOnlyMcq.id, "unseen")],
    [highYield.id, state(highYield.id, "unseen")],
  ]);

  it("keeps Smart broad and applies each preset's exact restriction", () => {
    expect(matchesStudyScope(unseen, states.get(unseen.id), scope("smart"))).toBe(true);
    expect(matchesStudyScope(learned, states.get(learned.id), scope("smart"))).toBe(
      true,
    );

    expect(
      ["relearning", "weak", "learning"].every((id) =>
        matchesStudyScope(
          { relearning, weak, learning }[id as "relearning" | "weak" | "learning"],
          states.get(id),
          scope("needs_work"),
        ),
      ),
    ).toBe(true);
    expect(matchesStudyScope(unseen, states.get(unseen.id), scope("needs_work"))).toBe(
      false,
    );
    expect(
      matchesStudyScope(learned, states.get(learned.id), scope("needs_work")),
    ).toBe(false);

    expect(matchesStudyScope(unseen, states.get(unseen.id), scope("new"))).toBe(true);
    expect(matchesStudyScope(learned, states.get(learned.id), scope("new"))).toBe(
      false,
    );
    expect(matchesStudyScope(learned, states.get(learned.id), scope("due"))).toBe(true);
    expect(matchesStudyScope(unseen, states.get(unseen.id), scope("due"))).toBe(false);

    expect(contentMatchesStudyScope(calculation, scope("calculations"))).toBe(true);
    expect(contentMatchesStudyScope(unseen, scope("calculations"))).toBe(false);
    expect(contentMatchesStudyScope(authoredMcq, scope("mcq"))).toBe(true);
    expect(contentMatchesStudyScope(kindOnlyMcq, scope("mcq"))).toBe(false);
    expect(contentMatchesStudyScope(highYield, scope("high_yield"))).toBe(true);
    expect(contentMatchesStudyScope(unseen, scope("high_yield"))).toBe(false);
  });

  it("intersects presets with chapter restrictions", () => {
    const cards = [
      card("calc-8", 8, { kind: "calculation" }),
      card("calc-9", 9, { kind: "calculation" }),
      card("mcq-0", 0, { choices: ["A", "B"], correctChoice: 0 }),
      card("needs-9", 9),
      card("new-3", 3),
    ];
    const scheduler = snapshot([
      state("calc-8", "unseen"),
      state("calc-9", "unseen"),
      state("mcq-0", "unseen"),
      state("needs-9", "weak", new Date(NOW - 1).toISOString()),
      state("new-3", "unseen"),
    ]);

    expect(
      selectScopedNextCard({
        cards,
        scheduler,
        scope: scope("calculations", 8),
        nowMs: NOW,
      }).selection?.card.id,
    ).toBe("calc-8");
    expect(
      selectScopedNextCard({
        cards,
        scheduler,
        scope: scope("mcq", 0),
        nowMs: NOW,
      }).selection?.card.id,
    ).toBe("mcq-0");
    expect(
      selectScopedNextCard({
        cards,
        scheduler,
        scope: scope("needs_work", 9),
        nowMs: NOW,
      }).selection?.card.id,
    ).toBe("needs-9");
    expect(
      selectScopedNextCard({
        cards,
        scheduler,
        scope: scope("new", 3),
        nowMs: NOW,
      }).selection?.card.id,
    ).toBe("new-3");
  });

  it("keeps concept-focused Study inside the linked card set", () => {
    const cards = [card("linked-a", 1), card("linked-b", 2), card("unrelated", 3)];
    const scheduler = snapshot([
      state("linked-a", "unseen"),
      state("linked-b", "unseen"),
      state("unrelated", "unseen"),
    ]);
    const result = selectScopedNextCard({
      cards,
      scheduler,
      scope: scope("smart"),
      candidateCardIds: new Set(["linked-a", "linked-b"]),
      nowMs: NOW,
    });
    expect(["linked-a", "linked-b"]).toContain(result.selection?.card.id);
    expect(result.selection?.card.id).not.toBe("unrelated");
  });

  it("does not let Due introduce unseen or future-due cards", () => {
    const cards = [card("unseen", 1), card("due", 2), card("future", 3)];
    const scheduler = snapshot([
      state("unseen", "unseen"),
      state("due", "learned", new Date(NOW - 1).toISOString()),
      state("future", "learned", new Date(NOW + 60 * 60 * 1000).toISOString()),
    ]);

    const result = selectScopedNextCard({
      cards,
      scheduler,
      scope: scope("due"),
      nowMs: NOW,
    });

    expect(result.selection?.card.id).toBe("due");
    expect(result.counts).toMatchObject({
      matchingCount: 2,
      unseenCount: 0,
      dueNowCount: 1,
    });
  });
});

describe("scoped selection status and Chapter 0", () => {
  it("distinguishes empty canonical, caught-up, and exhausted New scopes", () => {
    const calculated = card("calc", 1, { kind: "calculation" });
    const future = card("future", 1);
    const seenNew = card("seen", 1);

    const noCalculation = selectScopedNextCard({
      cards: [card("recall", 1)],
      scheduler: snapshot([state("recall", "unseen")]),
      scope: scope("calculations", 1),
      nowMs: NOW,
    });
    expect(noCalculation).toMatchObject({
      status: "empty",
      emptyReason: "no_matching_cards",
      counts: { contentCount: 0 },
    });

    const caughtUp = selectScopedNextCard({
      cards: [future],
      scheduler: snapshot([
        state("future", "learning", new Date(NOW + 60 * 60 * 1000).toISOString()),
      ]),
      scope: scope("needs_work"),
      nowMs: NOW,
    });
    expect(caughtUp).toMatchObject({
      status: "caught_up",
      nextDueAt: new Date(NOW + 60 * 60 * 1000).toISOString(),
    });

    const newFinished = selectScopedNextCard({
      cards: [seenNew],
      scheduler: snapshot([
        state("seen", "learned", new Date(NOW + 60 * 60 * 1000).toISOString()),
      ]),
      scope: scope("new"),
      nowMs: NOW,
    });
    expect(newFinished).toMatchObject({
      status: "empty",
      emptyReason: "no_unseen_cards",
      counts: { contentCount: 1, unseenCount: 0 },
    });

    expect(calculated.kind).toBe("calculation");
  });

  it("allows Study Ahead only within a caught-up focused pool", () => {
    const cards = [card("future-calc", 8, { kind: "calculation" }), card("outside", 9)];
    const scheduler = snapshot([
      state("future-calc", "learned", new Date(NOW + 60 * 60 * 1000).toISOString()),
      state("outside", "learned", new Date(NOW + 30 * 60 * 1000).toISOString()),
    ]);

    const caughtUp = selectScopedNextCard({
      cards,
      scheduler,
      scope: scope("calculations", 8),
      nowMs: NOW,
    });
    expect(caughtUp.status).toBe("caught_up");
    expect(caughtUp.nextDueAt).toBe(new Date(NOW + 60 * 60 * 1000).toISOString());

    const ahead = selectScopedNextCard({
      cards,
      scheduler,
      scope: scope("calculations", 8),
      nowMs: NOW,
      studyAhead: true,
    });
    expect(ahead.selection).toMatchObject({
      card: { id: "future-calc" },
      isStudyAhead: true,
      reason: "Study ahead",
    });
  });

  it("keeps the normal Chapter 0 gate but overrides it for explicit Chapter 0", () => {
    const cards = [card("mixed", 0), card("foundation", 1)];
    const scheduler = deriveExamSrsSnapshot(cards, [], NO_EXAM, NOW);

    const normal = selectScopedNextCard({
      cards,
      scheduler,
      scope: scope("smart"),
      nowMs: NOW,
    });
    expect(normal.selection?.card.id).toBe("foundation");

    const explicitMixed = selectScopedNextCard({
      cards,
      scheduler,
      scope: scope("smart", 0),
      nowMs: NOW,
    });
    expect(explicitMixed.selection?.card.id).toBe("mixed");
  });

  it("still respects due dates for seen Chapter 0 cards under explicit scope", () => {
    const cards = [card("mixed", 0), card("foundation", 1)];
    const reviews = [
      review("mixed-failure", "mixed", NOW - 11 * 60 * 1000, {
        correct: false,
        rating: "forgot",
      }),
    ];
    const scheduler = deriveExamSrsSnapshot(cards, reviews, NO_EXAM, NOW);
    const result = selectScopedNextCard({
      cards,
      scheduler,
      scope: scope("smart", 0),
      nowMs: NOW,
    });

    expect(result.selection).toMatchObject({
      card: { id: "mixed" },
      reason: "Relearning",
    });
  });
});

describe("dynamic scoped scheduling", () => {
  it("uses prerequisite readiness only inside the existing focused candidate pool", () => {
    const cards = [card("chapter-one", 1), card("chapter-two", 2)];
    const result = selectScopedNextCard({
      cards,
      scheduler: deriveExamSrsSnapshot(cards, [], NO_EXAM, NOW),
      scope: scope("smart", 1),
      nowMs: NOW,
      newCardPrerequisiteReadyByCardId: new Map([
        ["chapter-one", false],
        ["chapter-two", true],
      ]),
    });
    expect(result.selection?.card.id).toBe("chapter-one");
    expect(result.counts.matchingCount).toBe(1);
  });

  it("keeps a Chapter 9 failure and later reviews inside the Chapter 9 pool", () => {
    const cards = [card("failed-9", 9), card("unseen-9", 9), card("outside-8", 8)];
    const failureAt = NOW;
    const firstReviews = [
      review("failure", "failed-9", failureAt, { correct: false, rating: "forgot" }),
    ];
    const first = selectScopedNextCard({
      cards,
      scheduler: deriveExamSrsSnapshot(cards, firstReviews, NO_EXAM, NOW),
      scope: scope("smart", 9),
      nowMs: NOW,
    });
    expect(first.selection?.card.id).toBe("unseen-9");

    const afterSecondReview = [
      ...firstReviews,
      review("second", "unseen-9", NOW + 60 * 1000),
    ];
    const afterTenMinutes = selectScopedNextCard({
      cards,
      scheduler: deriveExamSrsSnapshot(
        cards,
        afterSecondReview,
        NO_EXAM,
        NOW + 10 * 60 * 1000,
      ),
      scope: scope("smart", 9),
      nowMs: NOW + 10 * 60 * 1000,
    });

    expect(afterTenMinutes.selection).toMatchObject({
      card: { id: "failed-9" },
      reason: "Relearning",
    });
    expect(afterTenMinutes.selection?.card.chapter).toBe(9);
  });

  it("keeps a failed calculation in the calculation pool during relearning", () => {
    const cards = [
      card("failed-calc", 5, { kind: "calculation" }),
      card("new-calc", 5, { kind: "calculation" }),
      card("outside-recall", 5),
    ];
    const reviews = [
      review("failure", "failed-calc", NOW, { correct: false, rating: "forgot" }),
    ];
    const result = selectScopedNextCard({
      cards,
      scheduler: deriveExamSrsSnapshot(cards, reviews, NO_EXAM, NOW),
      scope: scope("calculations"),
      nowMs: NOW,
    });

    expect(result.selection?.card.kind).toBe("calculation");
    expect(result.selection?.card.id).toBe("new-calc");
    expect(
      selectScopedNextCard({
        cards,
        scheduler: deriveExamSrsSnapshot(cards, reviews, NO_EXAM, NOW + 10 * 60 * 1000),
        scope: scope("calculations"),
        nowMs: NOW + 10 * 60 * 1000,
      }).selection?.card.id,
    ).toBe("failed-calc");
  });
});
