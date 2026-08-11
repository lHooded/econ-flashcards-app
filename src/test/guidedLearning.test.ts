import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import { createReviewEvent, type ReviewEvent } from "../domain/progress";
import { knowledgeConcepts } from "../knowledge/data";
import {
  deriveConceptStatuses,
  deriveGuidedCheckStates,
  isConceptIntroducedEnough,
} from "../knowledge/mastery";
import { deriveFoundationCurriculum } from "../knowledge/mastery";
import { prerequisiteTopologicalOrder } from "../knowledge/graph";
import {
  getGuidedCheckVariant,
  getGuidedCheckSkillsForConcept,
  guidedKnowledgeCheckSkills,
} from "../knowledge/guided/checks";
import { selectGuidedNextStep } from "../knowledge/guided/selector";
import { validateGuidedKnowledgeChecks } from "../knowledge/guided/validate";
import rawSources from "../../knowledge/sources.json";
import type { KnowledgeSource } from "../knowledge/model";
import { deriveCardState } from "../study/examSrs/deriveState";
import { EXAM_SRS_INTERVALS } from "../study/examSrs/intervals";
import { selectNextCard } from "../study/examSrs/selector";

const NO_EXAM = { examAt: null, studyBufferHours: 24 } as const;
const NOW = Date.parse("2026-08-11T00:00:00.000Z");

function review(
  id: string,
  cardId: string,
  reviewedAt: string,
  overrides: Partial<Pick<ReviewEvent, "mode" | "correct" | "rating">> = {},
): ReviewEvent {
  return createReviewEvent({
    id,
    cardId,
    reviewedAt,
    mode: overrides.mode ?? "recall",
    correct: overrides.correct === undefined ? true : overrides.correct,
    rating:
      overrides.rating === undefined
        ? overrides.mode === "mcq"
          ? null
          : "got_it"
        : overrides.rating,
    responseTimeMs: 400,
    selectedChoice: overrides.mode === "mcq" ? 0 : null,
  });
}

describe("Guided Knowledge Check registry", () => {
  it("covers every graph-derived no-card concept with stable, varied skills", () => {
    const stats = validateGuidedKnowledgeChecks(
      {
        concepts: knowledgeConcepts,
        cards,
        sources: rawSources as readonly KnowledgeSource[],
        skills: guidedKnowledgeCheckSkills,
      },
      20,
    );
    expect(stats.noCardConcepts).toBe(28);
    expect(stats.coveredNoCardConcepts).toBe(28);
    expect(stats.skillCount).toBe(28);
    expect(stats.canonicalCardCollisions).toBe(0);
    const percentage = guidedKnowledgeCheckSkills.find(
      (skill) => skill.conceptId === "percentage",
    )!;
    expect(getGuidedCheckVariant(percentage, 0).id).not.toBe(
      getGuidedCheckVariant(percentage, 1).id,
    );
    expect(getGuidedCheckVariant(percentage, 0).fingerprint).not.toBe(
      getGuidedCheckVariant(percentage, 1).fingerprint,
    );
  });
});

describe("Guided checks reuse Exam-SRS evidence", () => {
  it.each([
    ["failure", { correct: false, rating: "forgot" as const, mode: "mcq" as const }],
    ["weak", { correct: true, rating: "struggled" as const, mode: "recall" as const }],
    ["mcq", { correct: true, rating: null, mode: "mcq" as const }],
    ["calculation", { correct: true, rating: null, mode: "calculation" as const }],
  ])("derives identical %s state for a guided ID", (_label, outcome) => {
    const canonical = review(
      "canonical",
      "ch01-001",
      "2026-08-10T00:00:00.000Z",
      outcome,
    );
    const guided = review(
      "guided",
      "knowledge-check:percentage",
      "2026-08-10T00:00:00.000Z",
      outcome,
    );
    const canonicalState = deriveCardState("ch01-001", [canonical], NO_EXAM, NOW);
    const guidedState = deriveCardState(
      "knowledge-check:percentage",
      [guided],
      NO_EXAM,
      NOW,
    );
    expect({ ...guidedState, cardId: "same" }).toEqual({
      ...canonicalState,
      cardId: "same",
    });
  });

  it("keeps deadline and buffer caps identical for a guided calculation", () => {
    const reviewedAt = "2026-08-10T12:00:00.000Z";
    const canonical = review("canonical-cap", "ch01-001", reviewedAt, {
      mode: "calculation",
      rating: null,
    });
    const guided = review("guided-cap", "knowledge-check:percentage", reviewedAt, {
      mode: "calculation",
      rating: null,
    });
    const settings = {
      examAt: "2026-08-12T12:00:00.000Z",
      studyBufferHours: 4,
    } as const;
    const canonicalState = deriveCardState(
      "ch01-001",
      [canonical],
      settings,
      Date.parse("2026-08-11T00:00:00.000Z"),
    );
    const guidedState = deriveCardState(
      "knowledge-check:percentage",
      [guided],
      settings,
      Date.parse("2026-08-11T00:00:00.000Z"),
    );
    expect(Date.parse(guidedState.dueAt!)).toBe(Date.parse(canonicalState.dueAt!));
    expect(EXAM_SRS_INTERVALS.deadline.maximumMs).toBeGreaterThan(0);

    const bufferSettings = {
      examAt: "2026-08-11T12:00:00.000Z",
      studyBufferHours: 4,
    } as const;
    const bufferCanonical = deriveCardState(
      "ch01-001",
      [
        review("canonical-buffer", "ch01-001", "2026-08-11T09:00:00.000Z", {
          mode: "calculation",
          rating: null,
        }),
      ],
      bufferSettings,
      Date.parse("2026-08-11T10:00:00.000Z"),
    );
    const bufferGuided = deriveCardState(
      "knowledge-check:percentage",
      [
        review(
          "guided-buffer",
          "knowledge-check:percentage",
          "2026-08-11T09:00:00.000Z",
          { mode: "calculation", rating: null },
        ),
      ],
      bufferSettings,
      Date.parse("2026-08-11T10:00:00.000Z"),
    );
    expect(bufferGuided).toEqual({
      ...bufferCanonical,
      cardId: "knowledge-check:percentage",
    });
  });
});

describe("Guided concept readiness and progression", () => {
  it("distinguishes positive introduction from solid mastery", () => {
    const skill = guidedKnowledgeCheckSkills.find(
      (candidate) => candidate.conceptId === "percentage",
    )!;
    const unseenStates = deriveGuidedCheckStates([], NO_EXAM, NOW);
    expect(isConceptIntroducedEnough("percentage", [])).toBe(false);
    expect(
      deriveConceptStatuses({ stateByCardId: {} }, knowledgeConcepts, unseenStates).get(
        "percentage",
      ),
    ).toBe("unseen");

    const weak = review("percentage-weak", skill.id, "2026-08-10T23:00:00.000Z", {
      mode: "mcq",
      rating: "struggled",
    });
    const weakStates = deriveGuidedCheckStates([weak], NO_EXAM, NOW);
    expect(isConceptIntroducedEnough("percentage", [weak])).toBe(true);
    expect(
      deriveConceptStatuses({ stateByCardId: {} }, knowledgeConcepts, weakStates).get(
        "percentage",
      ),
    ).toBe("needs-work");

    const successes = Array.from({ length: 3 }, (_, index) =>
      review(`percentage-${index}`, skill.id, `2026-08-0${index + 1}T00:00:00.000Z`, {
        mode: "mcq",
        rating: null,
      }),
    );
    const solidStates = deriveGuidedCheckStates(
      successes,
      NO_EXAM,
      Date.parse("2026-08-03T00:10:00.000Z"),
    );
    expect(
      deriveConceptStatuses({ stateByCardId: {} }, knowledgeConcepts, solidStates).get(
        "percentage",
      ),
    ).toBe("solid");
    expect(
      deriveFoundationCurriculum(
        prerequisiteTopologicalOrder,
        deriveConceptStatuses({ stateByCardId: {} }, knowledgeConcepts, solidStates),
      ),
    ).not.toContain("percentage");
  });

  it("starts with a lesson, then allows weak evidence to move forward", () => {
    const first = selectGuidedNextStep({
      cards,
      reviews: [],
      settings: NO_EXAM,
      nowMs: NOW,
    });
    expect(first.kind).toBe("lesson");
    if (first.kind !== "lesson") return;
    const checkSkill = guidedKnowledgeCheckSkills.find(
      (skill) => skill.conceptId === first.conceptId,
    );
    expect(checkSkill).toBeDefined();
    const weak = review("weak-first", checkSkill!.id, "2026-08-10T23:55:00.000Z", {
      mode: "mcq",
      rating: "struggled",
    });
    const next = selectGuidedNextStep({
      cards,
      reviews: [weak],
      settings: NO_EXAM,
      nowMs: NOW,
      lessonCompletedConceptIds: new Set([first.conceptId]),
    });
    expect(next.kind).not.toBe("knowledge-check");
    expect(isConceptIntroducedEnough(first.conceptId, [weak])).toBe(true);
  });

  it("does not immediately repeat a failed check and retains a fallback", () => {
    const first = selectGuidedNextStep({
      cards,
      reviews: [],
      settings: NO_EXAM,
      nowMs: NOW,
    });
    expect(first.kind).toBe("lesson");
    if (first.kind !== "lesson") return;
    const skill = guidedKnowledgeCheckSkills.find(
      (candidate) => candidate.conceptId === first.conceptId,
    )!;
    const failure = review("failed-first", skill.id, "2026-08-10T23:55:00.000Z", {
      mode: "mcq",
      correct: false,
      rating: "forgot",
    });
    const next = selectGuidedNextStep({
      cards,
      reviews: [failure],
      settings: NO_EXAM,
      nowMs: NOW,
      lessonCompletedConceptIds: new Set([first.conceptId]),
      recentlyShownIds: [skill.id],
    });
    expect(next.kind).not.toBe("knowledge-check");
    expect(next.kind).not.toBe("idle");
  });

  it("walks a real percentage-to-inflation path before presenting its canonical card", () => {
    const targetCard = cards.filter((card) => card.id === "ch01-019");
    const lessons = new Set<string>();
    let reviews: ReviewEvent[] = [];
    const visited: string[] = [];
    let nowMs = NOW;

    for (let index = 0; index < 40; index += 1) {
      const step = selectGuidedNextStep({
        cards: targetCard,
        reviews,
        settings: NO_EXAM,
        nowMs,
        lessonCompletedConceptIds: lessons,
        sessionSeed: index,
      });
      expect(step.kind).not.toBe("idle");
      if (step.kind === "lesson") {
        visited.push(`lesson:${step.conceptId}`);
        lessons.add(step.conceptId);
      } else if (step.kind === "knowledge-check") {
        visited.push(`check:${step.skill.conceptId}`);
        reviews = [
          ...reviews,
          review(`path-${index}`, step.skill.id, new Date(nowMs).toISOString(), {
            mode: "mcq",
            rating: null,
          }),
        ];
        nowMs += 1_000;
      } else if (step.kind === "canonical-card") {
        visited.push(`card:${step.card.id}`);
        break;
      } else {
        throw new Error("Guided path unexpectedly became idle.");
      }
    }

    expect(visited).toEqual(
      expect.arrayContaining([
        "lesson:percentage",
        "check:percentage",
        "lesson:percentage-change",
        "lesson:price-index",
        "lesson:inflation",
        "card:ch01-019",
      ]),
    );
    const canonicalIndex = visited.indexOf("card:ch01-019");
    for (const conceptId of [
      "percentage",
      "percentage-change",
      "price-index",
      "inflation",
    ]) {
      expect(visited.indexOf(`lesson:${conceptId}`)).toBeLessThan(canonicalIndex);
    }
    expect(reviews.some((event) => event.cardId === "knowledge-check:percentage")).toBe(
      true,
    );
    expect(isConceptIntroducedEnough("percentage", reviews)).toBe(true);
    expect(getGuidedCheckSkillsForConcept("percentage")).toHaveLength(1);
  });

  it("keeps an urgent canonical failure ahead of a ready unseen branch", () => {
    const failure = review(
      "canonical-failure",
      "ch01-001",
      "2026-08-10T23:00:00.000Z",
      {
        mode: "mcq",
        correct: false,
        rating: null,
      },
    );
    const check = review(
      "check-weak",
      "knowledge-check:percentage",
      "2026-08-10T23:00:00.000Z",
      { mode: "mcq", rating: "struggled" },
    );
    const selected = selectGuidedNextStep({
      cards,
      reviews: [failure, check],
      settings: NO_EXAM,
      nowMs: NOW,
    });
    expect(selected.kind).toBe("canonical-card");
    if (selected.kind === "canonical-card") expect(selected.card.id).toBe("ch01-001");
  });

  it("always has a fresh full-deck fallback", () => {
    const selected = selectGuidedNextStep({
      cards,
      reviews: [],
      settings: NO_EXAM,
      nowMs: NOW,
      lessonCompletedConceptIds: new Set(
        knowledgeConcepts.map((concept) => concept.id),
      ),
    });
    expect(selected.kind).not.toBe("idle");
  });

  it("does not let guided-only evidence alter ordinary canonical Study", () => {
    const canonicalHistory = [
      review("ordinary-failure", "ch01-001", "2026-08-10T23:00:00.000Z", {
        mode: "mcq",
        correct: false,
        rating: null,
      }),
    ];
    const guidedHistory = review(
      "ordinary-ignored-guided",
      "knowledge-check:percentage",
      "2026-08-10T23:00:00.000Z",
      { mode: "mcq", rating: null },
    );
    const before = selectNextCard({
      cards,
      reviews: canonicalHistory,
      settings: NO_EXAM,
      nowMs: NOW,
    });
    const after = selectNextCard({
      cards,
      reviews: [...canonicalHistory, guidedHistory],
      settings: NO_EXAM,
      nowMs: NOW,
    });
    expect(after.selection?.card.id).toBe(before.selection?.card.id);
  });

  it("keeps a compressed 48-hour cram horizon moving while intervals contract", () => {
    const start = Date.parse("2026-08-11T00:00:00.000Z");
    const settings = {
      examAt: new Date(start + 48 * 60 * 60 * 1000).toISOString(),
      studyBufferHours: 2,
    } as const;
    let nowMs = start;
    let reviews: ReviewEvent[] = [];
    const lessons = new Set<string>();
    const seenCanonical = new Set<string>();
    let checks = 0;
    for (let index = 0; index < 80; index += 1) {
      const step = selectGuidedNextStep({
        cards,
        reviews,
        settings,
        nowMs,
        lessonCompletedConceptIds: lessons,
        sessionSeed: index,
      });
      expect(step.kind).not.toBe("idle");
      if (step.kind === "lesson") {
        lessons.add(step.conceptId);
      } else if (step.kind === "knowledge-check") {
        checks += 1;
        reviews = [
          ...reviews,
          review(`cram-check-${index}`, step.skill.id, new Date(nowMs).toISOString(), {
            mode: step.skill.kind,
            rating: null,
          }),
        ];
        nowMs += 60 * 60 * 1000;
      } else if (step.kind === "canonical-card") {
        seenCanonical.add(step.card.id);
        reviews = [
          ...reviews,
          review(`cram-card-${index}`, step.card.id, new Date(nowMs).toISOString()),
        ];
        nowMs += 60 * 60 * 1000;
      }
    }
    expect(lessons.size).toBeGreaterThan(0);
    expect(checks).toBeGreaterThan(0);
    expect(seenCanonical.size).toBeGreaterThan(0);

    const reviewAt = new Date(start).toISOString();
    const far = deriveCardState(
      "knowledge-check:percentage",
      [
        review("far-horizon", "knowledge-check:percentage", reviewAt, {
          mode: "recall",
        }),
      ],
      {
        examAt: new Date(start + 48 * 60 * 60 * 1000).toISOString(),
        studyBufferHours: 2,
      },
      start + 60 * 1000,
    );
    const near = deriveCardState(
      "knowledge-check:percentage",
      [
        review("near-horizon", "knowledge-check:percentage", reviewAt, {
          mode: "recall",
        }),
      ],
      {
        examAt: new Date(start + 4 * 60 * 60 * 1000).toISOString(),
        studyBufferHours: 1,
      },
      start + 60 * 1000,
    );
    expect(Date.parse(near.dueAt!) - start).toBeLessThan(
      Date.parse(far.dueAt!) - start,
    );
  });

  it("contracts strong-success intervals at 48h, 12h, 4h, and in the buffer", () => {
    const start = Date.parse("2026-08-11T00:00:00.000Z");
    const history = Array.from({ length: 6 }, (_, index) =>
      review(
        `horizon-${index}`,
        "knowledge-check:percentage",
        new Date(start + index * 1_000).toISOString(),
        { mode: "calculation", rating: null },
      ),
    );
    const stateAt = (examHours: number, bufferHours: number, nowMs: number) =>
      deriveCardState(
        "knowledge-check:percentage",
        history,
        {
          examAt: new Date(start + examHours * 60 * 60 * 1000).toISOString(),
          studyBufferHours: bufferHours,
        },
        nowMs,
      );
    const at48 = stateAt(48, 2, start + 60_000);
    const at12 = stateAt(12, 1, start + 60_000);
    const at4 = stateAt(4, 1, start + 60_000);
    const bufferStart = start + 3 * 60 * 60 * 1000 + 60_000;
    const inBuffer = deriveCardState(
      "knowledge-check:percentage",
      history.map((event) => ({
        ...event,
        reviewedAt: new Date(bufferStart).toISOString(),
      })),
      {
        examAt: new Date(start + 4 * 60 * 60 * 1000).toISOString(),
        studyBufferHours: 1,
      },
      bufferStart + 60_000,
    );

    expect(Date.parse(at48.dueAt!) - start).toBeGreaterThan(
      Date.parse(at12.dueAt!) - start,
    );
    expect(Date.parse(at12.dueAt!) - start).toBeGreaterThan(
      Date.parse(at4.dueAt!) - start,
    );
    expect(Date.parse(at4.dueAt!)).toBeLessThanOrEqual(start + 4 * 60 * 60 * 1000);
    expect(Date.parse(inBuffer.dueAt!)).toBeLessThanOrEqual(start + 4 * 60 * 60 * 1000);
  });
});
