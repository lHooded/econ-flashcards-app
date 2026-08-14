import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import { createReviewEvent, type ReviewEvent } from "../domain/progress";
import { examQuestions } from "../exam/questionBank";
import { examSkillEvidence } from "../examYield/skills";
import { deriveExamPhase } from "../study/examSrs/deriveState";
import {
  rankHighYieldUnseenCards,
  selectHighYieldNextStep,
} from "../knowledge/guided/highYieldSelector";
import {
  directYieldForSkill,
  getExamYieldForCard,
  getExamYieldReasons,
} from "../examYield/score";
import { selectGuidedNextStep } from "../knowledge/guided/selector";
import { selectNextCard } from "../study/examSrs/selector";
import { deriveCardState, deriveReviewEvidence } from "../study/examSrs/deriveState";
import { EXAM_SRS_INTERVALS } from "../study/examSrs/intervals";
import { buildMockExam } from "../exam/mock/selector";

const START = Date.parse("2026-08-12T00:00:00.000Z");
const NO_EXAM = { examAt: null, studyBufferHours: 24 } as const;

function canonicalReview(
  id: string,
  cardId: string,
  reviewedAt: number,
  correct: boolean,
): ReviewEvent {
  return canonicalOutcomeReview(
    id,
    cardId,
    reviewedAt,
    correct ? "strong_success" : "failure",
  );
}

function canonicalOutcomeReview(
  id: string,
  cardId: string,
  reviewedAt: number,
  outcome: "failure" | "weak_success" | "strong_success",
): ReviewEvent {
  const card = cards.find((candidate) => candidate.id === cardId)!;
  const isMcq = card.choices !== undefined;
  if (isMcq && outcome === "weak_success") {
    throw new Error("Weak recall evidence cannot be emitted for an MCQ card.");
  }
  const correct = outcome !== "failure";
  return createReviewEvent({
    id,
    cardId,
    reviewedAt: new Date(reviewedAt).toISOString(),
    mode: isMcq ? "mcq" : "recall",
    correct,
    rating: isMcq
      ? null
      : outcome === "failure"
        ? "forgot"
        : outcome === "weak_success"
          ? "struggled"
          : "got_it",
    responseTimeMs: null,
    selectedChoice: null,
  });
}

function guidedReview(
  id: string,
  skillId: string,
  reviewedAt: number,
  correct: boolean,
): ReviewEvent {
  return createReviewEvent({
    id,
    cardId: skillId,
    reviewedAt: new Date(reviewedAt).toISOString(),
    mode: "mcq",
    correct,
    rating: null,
    responseTimeMs: null,
    selectedChoice: 0,
  });
}

function targetCardId(step: ReturnType<typeof selectGuidedNextStep>): string | null {
  if (step.kind === "lesson" || step.kind === "knowledge-check") {
    return step.targetCardId;
  }
  return step.kind === "canonical-card" ? step.card.id : null;
}

describe("High-Yield Cram selection policy", () => {
  it("lets a genuine Exam-SRS failure beat unseen Critical material", () => {
    const failure = canonicalReview(
      "failure",
      "ch01-002",
      START - 60 * 60 * 1000,
      false,
    );
    const selected = selectHighYieldNextStep({
      cards,
      reviews: [failure],
      settings: NO_EXAM,
      nowMs: START,
    });
    expect(selected.kind).toBe("canonical-card");
    if (selected.kind === "canonical-card") {
      expect(selected.card.id).toBe("ch01-002");
      expect(selected.reason).toBe("relearning");
    }
  });

  it("retains weak recall timing and lets urgency beat yield only when due", () => {
    const fixture = cards.filter((card) => ["ch01-013", "ch09-022"].includes(card.id));
    const weakEvent = canonicalOutcomeReview(
      "weak-recall",
      "ch01-013",
      START - 10 * 60 * 1000,
      "weak_success",
    );
    expect(weakEvent.mode).toBe("recall");
    expect(weakEvent.rating).toBe("struggled");
    expect(deriveReviewEvidence(weakEvent)).toMatchObject({
      outcome: "weak_success",
      strengthDelta: 0.5,
    });
    const weakState = deriveCardState("ch01-013", [weakEvent], NO_EXAM, START);
    expect(weakState.learningState).toBe("weak");
    expect(weakState.dueAt).toBe(
      new Date(START - 10 * 60 * 1000 + EXAM_SRS_INTERVALS.weakSuccessMs).toISOString(),
    );
    expect(weakState.isDue).toBe(false);

    const dueEvent = canonicalOutcomeReview(
      "weak-recall-due",
      "ch01-013",
      START - 60 * 60 * 1000,
      "weak_success",
    );
    const dueInput = {
      cards: fixture,
      reviews: [dueEvent],
      settings: NO_EXAM,
      nowMs: START,
    } as const;
    const ordinaryDue = selectGuidedNextStep(dueInput);
    const highYieldDue = selectHighYieldNextStep(dueInput);
    expect(targetCardId(ordinaryDue)).toBe("ch01-013");
    expect(targetCardId(highYieldDue)).toBe("ch01-013");
    expect(highYieldDue.kind).toBe("canonical-card");
    if (highYieldDue.kind === "canonical-card") {
      expect(highYieldDue.reason).toBe("weak-review");
    }

    const notDueInput = { ...dueInput, reviews: [weakEvent] } as const;
    expect(targetCardId(selectHighYieldNextStep(notDueInput))).toBe("ch09-022");
  });

  it("breaks suitable unseen ties with an explicit high-yield card", () => {
    const fixture = cards.filter((card) => ["ch09-004", "ch09-022"].includes(card.id));
    const input = {
      cards: fixture,
      reviews: [],
      settings: NO_EXAM,
      nowMs: START,
    } as const;
    const ordinary = selectGuidedNextStep(input);
    const ordinaryAgain = selectGuidedNextStep({
      ...input,
      candidateCardIds: undefined,
    });
    const highYield = selectHighYieldNextStep(input);
    expect(targetCardId(ordinary)).toBe("ch09-004");
    expect(ordinaryAgain).toEqual(ordinary);
    expect(targetCardId(highYield)).toBe("ch09-004");
    expect(highYield.whyNow).toContain("Skill family repeated in final MCQ practice");
  });

  it("does not leak ZLB/Fisher yield through a broad inflation card", () => {
    const zlb = examSkillEvidence.find(
      (skill) => skill.id === "very-high-zlb-deflation-fisher",
    )!;
    const zlbDirectYield = directYieldForSkill(zlb);
    const unexpectedInflation = getExamYieldForCard("ch01-028");
    expect(zlb.cardIds).not.toContain("ch01-028");
    expect(unexpectedInflation.directSkillIds).not.toContain(zlb.id);
    expect(unexpectedInflation.score).toBeLessThan(zlbDirectYield);
    expect(getExamYieldReasons("ch01-028")).not.toContainEqual({
      label: "Skill family tested in the 2020 final",
      priority: 100,
    });
    if (unexpectedInflation.score > 0) {
      expect(getExamYieldReasons("ch01-028")).toContainEqual({
        label: "High-yield prerequisite",
        priority: 75,
      });
    }
  });

  it("lets existing progress outweigh static FX priority", () => {
    const fixture = cards.filter((card) => ["ch09-016", "ch01-028"].includes(card.id));
    const strongFx = canonicalReview(
      "strong-fx",
      "ch09-016",
      START - 60 * 60 * 1000,
      true,
    );
    const selected = selectHighYieldNextStep({
      cards: fixture,
      reviews: [strongFx],
      settings: NO_EXAM,
      nowMs: START,
    });
    expect(targetCardId(selected)).toBe("ch01-028");
    expect(
      rankHighYieldUnseenCards({
        cards: fixture,
        reviews: [strongFx],
        settings: NO_EXAM,
        nowMs: START,
      }).every((candidate) => candidate.card.id !== "ch09-016"),
    ).toBe(true);
  });

  it("values a low-level prerequisite because it unlocks a high-yield descendant", () => {
    const prerequisite = getExamYieldForCard("ch01-009");
    const target = getExamYieldForCard("ch09-016");
    expect(prerequisite.directSkillIds).toEqual([]);
    expect(prerequisite.score).toBeGreaterThan(0);
    expect(prerequisite.score).toBeLessThan(target.score);
    expect(getExamYieldReasons("ch01-009")).toContainEqual({
      label: "High-yield prerequisite",
      priority: 75,
    });
    const ranked = rankHighYieldUnseenCards({
      cards: cards.filter((card) => ["ch09-016", "ch01-009"].includes(card.id)),
      reviews: [],
      settings: NO_EXAM,
      nowMs: START,
    });
    expect(ranked[0]?.examYield.score).toBeGreaterThan(0);
    const selected = selectHighYieldNextStep({
      cards: cards.filter((card) => ["ch09-016", "ch01-009"].includes(card.id)),
      reviews: [],
      settings: NO_EXAM,
      nowMs: START,
    });
    expect(selected.kind).toBe("lesson");
    if (selected.kind === "lesson") {
      expect(selected.targetCardId).toBe("ch09-016");
      expect(selected.whyNow).toContain("Skill family tested in the 2020 final");
    }
  });

  it("blocks a failed prerequisite branch until its real due time, then returns it", () => {
    const fixture = cards.filter((card) => ["ch09-016", "ch01-009"].includes(card.id));
    const failure = guidedReview(
      "buyer-failure",
      "knowledge-check:buyer",
      START - 60 * 1000,
      false,
    );
    const blocked = selectHighYieldNextStep({
      cards: fixture,
      reviews: [failure],
      settings: NO_EXAM,
      nowMs: START,
      lessonSeenConceptIds: new Set(["buyer"]),
      recentlyShownIds: ["knowledge-check:buyer"],
    });
    expect(targetCardId(blocked)).toBe("ch01-009");
    expect(blocked.kind).not.toBe("knowledge-check");

    const due = selectHighYieldNextStep({
      cards: fixture,
      reviews: [failure],
      settings: NO_EXAM,
      nowMs: START + 10 * 60 * 1000,
      lessonSeenConceptIds: new Set(["buyer"]),
    });
    expect(due.kind).toBe("knowledge-check");
    if (due.kind === "knowledge-check") {
      expect(due.skill.id).toBe("knowledge-check:buyer");
      expect(due.reason).toBe("relearning");
    }
  });

  it("does not alter ordinary Study or mock selection/persistence semantics", () => {
    const input = {
      cards: cards.filter((card) => ["ch01-013", "ch01-028"].includes(card.id)),
      reviews: [],
      settings: NO_EXAM,
      nowMs: START,
    } as const;
    const studyBefore = selectNextCard(input);
    selectHighYieldNextStep(input);
    const studyAfter = selectNextCard(input);
    expect(studyAfter).toEqual(studyBefore);

    const mockBefore = buildMockExam({
      bank: examQuestions,
      seed: "high-yield-regression",
    });
    selectHighYieldNextStep(input);
    const mockAfter = buildMockExam({
      bank: examQuestions,
      seed: "high-yield-regression",
    });
    expect(mockAfter.questionOrder).toEqual(mockBefore.questionOrder);

    const event = canonicalReview("ordinary-review", "ch09-016", START, true);
    expect(Object.keys(event).sort()).toEqual([
      "cardId",
      "correct",
      "id",
      "mode",
      "rating",
      "responseTimeMs",
      "reviewedAt",
      "selectedChoice",
    ]);
    expect(event).not.toHaveProperty("examYieldMastery");
  });
});

describe("High-Yield Cram deterministic simulations", () => {
  function simulate(
    selector: typeof selectHighYieldNextStep | typeof selectGuidedNextStep,
    actions: number,
    settings: { readonly examAt: string | null; readonly studyBufferHours: number },
  ) {
    let nowMs = START;
    let reviews: ReviewEvent[] = [];
    const lessons = new Set<string>();
    let recent: string[] = [];
    const canonicalIds: string[] = [];
    const chapters = new Set<number>();
    const phases = new Set<string>();
    const weakCardIds = new Set<string>();
    const failedCardIds = new Set<string>();
    const weakReturns = new Set<string>();
    const failureReturns = new Set<string>();
    const priorCanonicalOutcomes = new Map<string, "weak" | "failure">();
    let idleAt: number | null = null;
    for (let index = 0; index < actions; index += 1) {
      phases.add(deriveExamPhase(settings, nowMs));
      const step = selector({
        cards,
        reviews,
        settings,
        nowMs,
        lessonSeenConceptIds: lessons,
        recentlyShownIds: recent,
        sessionSeed: index,
      });
      if (step.kind === "idle") {
        idleAt = index;
        break;
      }
      if (step.kind === "lesson") {
        lessons.add(step.conceptId);
      } else if (step.kind === "knowledge-check") {
        const correct = index % 11 !== 0;
        reviews = [
          ...reviews,
          guidedReview(`sim-check-${index}`, step.skill.id, nowMs, correct),
        ];
        recent = [step.skill.id, ...recent].slice(0, 3);
      } else if (step.kind === "canonical-card") {
        canonicalIds.push(step.card.id);
        chapters.add(step.card.chapter);
        const canonicalAttempt = canonicalIds.length - 1;
        const outcome =
          canonicalAttempt % 7 === 0
            ? "failure"
            : canonicalAttempt % 7 === 1 && step.card.choices === undefined
              ? "weak_success"
              : "strong_success";
        const previousOutcome = priorCanonicalOutcomes.get(step.card.id);
        if (previousOutcome === "failure") failureReturns.add(step.card.id);
        if (previousOutcome === "weak") weakReturns.add(step.card.id);
        if (outcome === "failure") {
          failedCardIds.add(step.card.id);
          priorCanonicalOutcomes.set(step.card.id, "failure");
        } else if (outcome === "weak_success") {
          weakCardIds.add(step.card.id);
          priorCanonicalOutcomes.set(step.card.id, "weak");
        } else {
          priorCanonicalOutcomes.delete(step.card.id);
        }
        reviews = [
          ...reviews,
          canonicalOutcomeReview(`sim-card-${index}`, step.card.id, nowMs, outcome),
        ];
        recent = [step.card.id, ...recent].slice(0, 3);
      }
      nowMs += 60 * 1000;
    }
    const seen = new Set(canonicalIds);
    const critical = examSkillEvidence.filter(
      (skill) => skill.tier === "critical" && skill.cardIds.some((id) => seen.has(id)),
    ).length;
    const veryHigh = examSkillEvidence.filter(
      (skill) => skill.tier === "very-high" && skill.cardIds.some((id) => seen.has(id)),
    ).length;
    return {
      chapters,
      critical,
      veryHigh,
      canonicalIds,
      idleAt,
      phases,
      weakCardIds,
      failedCardIds,
      weakReturns,
      failureReturns,
    };
  }

  it("reaches high-yield families earlier while preserving breadth and no-deadlock", () => {
    const highYield = simulate(selectHighYieldNextStep, 240, NO_EXAM);
    const ordinary = simulate(selectGuidedNextStep, 240, NO_EXAM);
    expect(highYield.idleAt).toBeNull();
    expect([...highYield.chapters].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 11 }, (_, chapter) => chapter),
    );
    expect(highYield.critical).toBeGreaterThanOrEqual(ordinary.critical);
    expect(highYield.critical + highYield.veryHigh).toBeGreaterThan(
      ordinary.critical + ordinary.veryHigh,
    );
  });

  it.each([
    ["48h cram", new Date(START + 72 * 60 * 60 * 1000).toISOString(), 24],
    ["12h cram", new Date(START + 36 * 60 * 60 * 1000).toISOString(), 24],
    ["4h cram", new Date(START + 28 * 60 * 60 * 1000).toISOString(), 24],
    ["buffer", new Date(START + 8 * 60 * 60 * 1000).toISOString(), 9],
  ] as const)("remains live in the %s finite horizon", (label, examAt, buffer) => {
    const result = simulate(selectHighYieldNextStep, 240, {
      examAt,
      studyBufferHours: buffer,
    });
    const expectedPhase = label === "buffer" ? "buffer" : "cram";
    expect(deriveExamPhase({ examAt, studyBufferHours: buffer }, START)).toBe(
      expectedPhase,
    );
    expect(result.phases).toContain(expectedPhase);
    expect(result.idleAt).toBeNull();
    expect(result.canonicalIds.length).toBeGreaterThan(0);
    expect(result.weakCardIds.size).toBeGreaterThan(0);
    expect(result.failedCardIds.size).toBeGreaterThan(0);
    expect(result.weakReturns.size).toBeGreaterThan(0);
    expect(result.failureReturns.size).toBeGreaterThan(0);
  });
});
