import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import { createReviewEvent, type ReviewEvent } from "../domain/progress";
import { examQuestions } from "../exam/questionBank";
import { examSkillEvidence } from "../examYield/skills";
import {
  rankHighYieldUnseenCards,
  selectHighYieldNextStep,
} from "../knowledge/guided/highYieldSelector";
import { selectGuidedNextStep } from "../knowledge/guided/selector";
import { selectNextCard } from "../study/examSrs/selector";
import { buildMockExam } from "../exam/mock/selector";

const START = Date.parse("2026-08-12T00:00:00.000Z");
const NO_EXAM = { examAt: null, studyBufferHours: 24 } as const;

function canonicalReview(
  id: string,
  cardId: string,
  reviewedAt: number,
  correct: boolean,
): ReviewEvent {
  const card = cards.find((candidate) => candidate.id === cardId)!;
  const isMcq = card.choices !== undefined;
  return createReviewEvent({
    id,
    cardId,
    reviewedAt: new Date(reviewedAt).toISOString(),
    mode: isMcq ? "mcq" : "recall",
    correct,
    rating: isMcq ? null : correct ? "got_it" : "forgot",
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

  it("breaks suitable unseen ties with evidence and keeps ordinary Guided neutral", () => {
    const fixture = cards.filter((card) => ["ch01-013", "ch01-028"].includes(card.id));
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
    expect(targetCardId(ordinary)).toBe("ch01-013");
    expect(ordinaryAgain).toEqual(ordinary);
    expect(targetCardId(highYield)).toBe("ch01-028");
    expect(highYield.whyNow).toContain("Directly tested in the 2020 final");
  });

  it("values a low-level prerequisite because it unlocks a high-yield descendant", () => {
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
      expect(selected.whyNow).toContain("Directly tested in the 2020 final");
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
      lessonCompletedConceptIds: new Set(["buyer"]),
      recentlyShownIds: ["knowledge-check:buyer"],
    });
    expect(targetCardId(blocked)).toBe("ch01-009");
    expect(blocked.kind).not.toBe("knowledge-check");

    const due = selectHighYieldNextStep({
      cards: fixture,
      reviews: [failure],
      settings: NO_EXAM,
      nowMs: START + 10 * 60 * 1000,
      lessonCompletedConceptIds: new Set(["buyer"]),
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
    let idleAt: number | null = null;
    for (let index = 0; index < actions; index += 1) {
      const step = selector({
        cards,
        reviews,
        settings,
        nowMs,
        lessonCompletedConceptIds: lessons,
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
        const correct = index % 13 !== 0;
        reviews = [
          ...reviews,
          canonicalReview(`sim-card-${index}`, step.card.id, nowMs, correct),
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
    return { chapters, critical, veryHigh, canonicalIds, idleAt };
  }

  it("reaches high-yield families earlier while preserving breadth and no-deadlock", () => {
    const highYield = simulate(selectHighYieldNextStep, 150, NO_EXAM);
    const ordinary = simulate(selectGuidedNextStep, 150, NO_EXAM);
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
    ["buffer", new Date(START + 2 * 60 * 60 * 1000).toISOString(), 1],
  ] as const)("remains live in the %s finite horizon", (_label, examAt, buffer) => {
    const result = simulate(selectHighYieldNextStep, 32, {
      examAt,
      studyBufferHours: buffer,
    });
    expect(result.idleAt).toBeNull();
    expect(result.canonicalIds.length).toBeGreaterThan(0);
  });
});
