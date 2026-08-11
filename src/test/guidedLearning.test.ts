import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import { createReviewEvent, type ReviewEvent } from "../domain/progress";
import { knowledgeConcepts } from "../knowledge/data";
import { cardConceptMap } from "../knowledge/contentMap";
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
import {
  GuidedLearningValidationError,
  validateGuidedKnowledgeChecks,
} from "../knowledge/guided/validate";
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
  overrides: Partial<
    Pick<ReviewEvent, "mode" | "correct" | "rating" | "selectedChoice">
  > = {},
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
    selectedChoice: overrides.selectedChoice ?? (overrides.mode === "mcq" ? 0 : null),
  });
}

/** Guided checks are objective UI events; they cannot produce self-ratings. */
function guidedReview(
  id: string,
  skillId: string,
  reviewedAt: string,
  mode: "mcq" | "calculation",
  correct = true,
): ReviewEvent {
  const event = review(id, skillId, reviewedAt, {
    mode,
    correct,
    rating: null,
  });
  if (event.rating !== null) {
    throw new Error("Guided Knowledge Checks must remain objective events.");
  }
  return event;
}

/** Build only review events that the real StudyCard UI can emit. */
function canonicalStudyReview(
  id: string,
  cardId: string,
  reviewedAt: string,
  outcome: "failure" | "weak" | "strong",
): ReviewEvent {
  const card = cards.find((candidate) => candidate.id === cardId);
  if (card === undefined) throw new Error(`Missing canonical test card ${cardId}`);
  const isMcq = card.choices !== undefined;
  return review(id, cardId, reviewedAt, {
    mode: isMcq ? "mcq" : "recall",
    correct: outcome !== "failure",
    rating: isMcq
      ? null
      : outcome === "failure"
        ? "forgot"
        : outcome === "weak"
          ? "struggled"
          : "got_it",
    selectedChoice: isMcq ? (card.correctChoice ?? 0) : null,
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
    expect(stats.unknownRequiredConcepts).toBe(0);
    expect(stats.prerequisiteUnsafeVariants).toBe(0);
    const percentage = guidedKnowledgeCheckSkills.find(
      (skill) => skill.conceptId === "percentage",
    )!;
    expect(getGuidedCheckVariant(percentage, 0).id).not.toBe(
      getGuidedCheckVariant(percentage, 1).id,
    );
    expect(getGuidedCheckVariant(percentage, 0).fingerprint).not.toBe(
      getGuidedCheckVariant(percentage, 1).fingerprint,
    );
    const percentageVariant = getGuidedCheckVariant(percentage, 0);
    expect(percentageVariant.prompt).toContain("among 100 squares");
    expect(percentageVariant.prompt).not.toContain("percentage increase");
    expect(percentageVariant.requiredConceptIds).toEqual([]);
    expect(percentageVariant.explanation).not.toContain("${marked}");
  });

  it("rejects a guided check that assumes a descendant concept", () => {
    const percentage = guidedKnowledgeCheckSkills.find(
      (skill) => skill.conceptId === "percentage",
    )!;
    const invalid = {
      ...percentage,
      generator: (seed: number) => ({
        ...percentage.generator!(seed),
        requiredConceptIds: ["percentage-change"],
      }),
    };
    expect(() =>
      validateGuidedKnowledgeChecks(
        {
          concepts: knowledgeConcepts,
          cards,
          sources: rawSources as readonly KnowledgeSource[],
          skills: guidedKnowledgeCheckSkills.map((skill) =>
            skill.id === percentage.id ? invalid : skill,
          ),
        },
        1,
      ),
    ).toThrow(GuidedLearningValidationError);
  });

  it("rejects an unknown required concept ID", () => {
    const percentage = guidedKnowledgeCheckSkills.find(
      (skill) => skill.conceptId === "percentage",
    )!;
    const invalid = {
      ...percentage,
      generator: (seed: number) => ({
        ...percentage.generator!(seed),
        requiredConceptIds: ["not-in-the-course-graph"],
      }),
    };
    expect(() =>
      validateGuidedKnowledgeChecks(
        {
          concepts: knowledgeConcepts,
          cards,
          sources: rawSources as readonly KnowledgeSource[],
          skills: guidedKnowledgeCheckSkills.map((skill) =>
            skill.id === percentage.id ? invalid : skill,
          ),
        },
        1,
      ),
    ).toThrow(/requires unknown concept/);
  });
});

describe("Guided checks reuse Exam-SRS evidence", () => {
  it.each([
    ["failure", { correct: false, rating: null, mode: "mcq" as const }],
    ["mcq", { correct: true, rating: null, mode: "mcq" as const }],
    ["calculation", { correct: true, rating: null, mode: "calculation" as const }],
  ])("derives identical %s state for a guided ID", (_label, outcome) => {
    const canonicalCardId = outcome.mode === "calculation" ? "ch01-010" : "ch01-002";
    const canonical = review(
      "canonical",
      canonicalCardId,
      "2026-08-10T00:00:00.000Z",
      outcome,
    );
    const guided = guidedReview(
      "guided",
      "knowledge-check:percentage",
      "2026-08-10T00:00:00.000Z",
      outcome.mode,
      outcome.correct,
    );
    const canonicalState = deriveCardState(canonicalCardId, [canonical], NO_EXAM, NOW);
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

  it("keeps weak self-rated evidence on a real canonical recall card", () => {
    const weakCard = cards.find((card) => card.id === "ch03-010");
    expect(weakCard?.choices).toBeUndefined();
    const weak = canonicalStudyReview(
      "weak-stock-flow",
      "ch03-010",
      "2026-08-10T23:00:00.000Z",
      "weak",
    );
    expect(weak).toEqual(
      expect.objectContaining({
        mode: "recall",
        correct: true,
        rating: "struggled",
      }),
    );
    const weakState = deriveCardState("ch03-010", [weak], NO_EXAM, NOW);
    expect(weakState.learningState).toBe("weak");
    expect(Date.parse(weakState.dueAt!) - Date.parse(weak.reviewedAt)).toBe(
      EXAM_SRS_INTERVALS.weakSuccessMs,
    );
  });

  it("keeps deadline and buffer caps identical for a guided calculation", () => {
    const reviewedAt = "2026-08-10T12:00:00.000Z";
    const canonical = review("canonical-cap", "ch01-010", reviewedAt, {
      mode: "calculation",
      rating: null,
    });
    const guided = guidedReview(
      "guided-cap",
      "knowledge-check:percentage",
      reviewedAt,
      "calculation",
    );
    const settings = {
      examAt: "2026-08-12T12:00:00.000Z",
      studyBufferHours: 4,
    } as const;
    const canonicalState = deriveCardState(
      "ch01-010",
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
        review("canonical-buffer", "ch01-010", "2026-08-11T09:00:00.000Z", {
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
        guidedReview(
          "guided-buffer",
          "knowledge-check:percentage",
          "2026-08-11T09:00:00.000Z",
          "calculation",
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

    const objectiveSuccess = guidedReview(
      "percentage-success",
      skill.id,
      "2026-08-10T23:00:00.000Z",
      "mcq",
    );
    const successStates = deriveGuidedCheckStates([objectiveSuccess], NO_EXAM, NOW);
    expect(isConceptIntroducedEnough("percentage", [objectiveSuccess])).toBe(true);
    expect(
      deriveConceptStatuses(
        { stateByCardId: {} },
        knowledgeConcepts,
        successStates,
      ).get("percentage"),
    ).toBe("learning");

    const objectiveFailure = guidedReview(
      "percentage-failure",
      skill.id,
      "2026-08-10T23:55:00.000Z",
      "mcq",
      false,
    );
    const failureStates = deriveGuidedCheckStates([objectiveFailure], NO_EXAM, NOW);
    expect(
      deriveConceptStatuses(
        { stateByCardId: {} },
        knowledgeConcepts,
        failureStates,
      ).get("percentage"),
    ).toBe("needs-work");

    const successes = Array.from({ length: 3 }, (_, index) =>
      guidedReview(
        `percentage-${index}`,
        skill.id,
        `2026-08-0${index + 1}T00:00:00.000Z`,
        "mcq",
      ),
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

  it("allows a legitimate weak canonical recall to progress to a dependent branch", () => {
    const dependentCard = cards.filter((card) => card.id === "ch10-017");
    const assetEvidence = canonicalStudyReview(
      "asset-positive",
      "ch03-022",
      "2026-08-10T20:00:00.000Z",
      "strong",
    );
    const weakStockFlow = canonicalStudyReview(
      "stock-flow-weak",
      "ch03-010",
      "2026-08-10T23:00:00.000Z",
      "weak",
    );
    const reviews = [assetEvidence, weakStockFlow];
    expect(isConceptIntroducedEnough("stock", reviews)).toBe(true);
    expect(isConceptIntroducedEnough("flow", reviews)).toBe(true);
    expect(
      deriveCardState("ch03-010", [weakStockFlow], NO_EXAM, NOW).learningState,
    ).toBe("weak");

    const lesson = selectGuidedNextStep({
      cards: dependentCard,
      reviews,
      settings: NO_EXAM,
      nowMs: NOW,
    });
    expect(lesson.kind).toBe("lesson");
    if (lesson.kind !== "lesson") return;
    expect(lesson.conceptId).toBe("capital");
    expect(lesson.targetCardId).toBe("ch10-017");

    const card = selectGuidedNextStep({
      cards: dependentCard,
      reviews,
      settings: NO_EXAM,
      nowMs: NOW,
      lessonCompletedConceptIds: new Set(["capital"]),
    });
    expect(card.kind).toBe("canonical-card");
    if (card.kind === "canonical-card") expect(card.card.id).toBe("ch10-017");
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
    const failure = guidedReview(
      "failed-first",
      skill.id,
      "2026-08-10T23:55:00.000Z",
      "mcq",
      false,
    );
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

  it("blocks a failed prerequisite branch but chooses an independent Exam-SRS branch", () => {
    const targetAndIndependent = cards.filter((card) =>
      ["ch01-019", "ch06-001"].includes(card.id),
    );
    const failedPercentage = guidedReview(
      "percentage-failure",
      "knowledge-check:percentage",
      "2026-08-10T23:55:00.000Z",
      "calculation",
      false,
    );
    const introducedBuyer = guidedReview(
      "introduced-buyer",
      "knowledge-check:buyer",
      "2026-08-10T20:00:00.000Z",
      "mcq",
    );
    const next = selectGuidedNextStep({
      cards: targetAndIndependent,
      reviews: [failedPercentage, introducedBuyer],
      settings: NO_EXAM,
      nowMs: NOW,
      lessonCompletedConceptIds: new Set(["buyer", "percentage"]),
    });
    expect(next.kind).toBe("lesson");
    if (next.kind === "lesson") {
      expect(next.conceptId).not.toBe("percentage-change");
      expect(next.conceptId).not.toBe("price-index");
      expect(next.targetCardId).toBe("ch06-001");
    }

    const dueAgain = selectGuidedNextStep({
      cards: targetAndIndependent,
      reviews: [failedPercentage, introducedBuyer],
      settings: NO_EXAM,
      nowMs: NOW + 11 * 60 * 1000,
      lessonCompletedConceptIds: new Set(["buyer", "percentage"]),
    });
    expect(dueAgain.kind).toBe("knowledge-check");
    if (dueAgain.kind === "knowledge-check") {
      expect(dueAgain.skill.id).toBe("knowledge-check:percentage");
      expect(dueAgain.reason).toBe("relearning");
    }

    const finalFallback = selectGuidedNextStep({
      cards: cards.filter((card) => card.id === "ch01-019"),
      reviews: [failedPercentage, introducedBuyer],
      settings: NO_EXAM,
      nowMs: NOW,
      lessonCompletedConceptIds: new Set(["buyer", "percentage"]),
    });
    expect(finalFallback.kind).toBe("canonical-card");
    if (finalFallback.kind === "canonical-card") {
      expect(finalFallback.card.id).toBe("ch01-019");
    }
  });

  it("keeps historical objective evidence distinct from a latest guided failure", () => {
    const targetCard = cards.filter((card) => card.id === "ch01-019");
    const historicalPositiveThenFailure = [
      guidedReview(
        "percentage-old-success",
        "knowledge-check:percentage",
        "2026-08-01T00:00:00.000Z",
        "calculation",
      ),
      guidedReview(
        "percentage-latest-failure",
        "knowledge-check:percentage",
        "2026-08-10T23:55:00.000Z",
        "calculation",
        false,
      ),
    ];
    expect(isConceptIntroducedEnough("percentage", historicalPositiveThenFailure)).toBe(
      true,
    );
    const afterHistoricalPositive = selectGuidedNextStep({
      cards: targetCard,
      reviews: historicalPositiveThenFailure,
      settings: NO_EXAM,
      nowMs: NOW,
      lessonCompletedConceptIds: new Set(["percentage"]),
    });
    expect(afterHistoricalPositive.kind).toBe("lesson");
    if (afterHistoricalPositive.kind === "lesson") {
      expect(afterHistoricalPositive.conceptId).not.toBe("percentage");
    }
  });

  it("recursively prepares a real multi-concept linked canonical card", () => {
    const subset = cards.filter((card) => ["ch01-005", "mix-001"].includes(card.id));
    const evidence: ReviewEvent[] = [
      guidedReview(
        "multi-concept-buyer",
        "knowledge-check:buyer",
        "2026-08-10T20:00:00.000Z",
        "mcq",
      ),
      guidedReview(
        "multi-concept-seller",
        "knowledge-check:seller",
        "2026-08-10T20:00:00.000Z",
        "mcq",
      ),
      guidedReview(
        "multi-concept-market",
        "knowledge-check:market",
        "2026-08-10T20:00:00.000Z",
        "mcq",
      ),
      guidedReview(
        "multi-concept-quantity",
        "knowledge-check:quantity",
        "2026-08-10T20:00:00.000Z",
        "mcq",
      ),
      guidedReview(
        "multi-concept-price",
        "knowledge-check:price",
        "2026-08-10T20:00:00.000Z",
        "mcq",
      ),
      canonicalStudyReview(
        "multi-concept-flow",
        "ch03-010",
        "2026-08-10T20:00:00.000Z",
        "strong",
      ),
    ];
    expect(cardConceptMap["mix-001"]).toEqual(["gross-domestic-product", "final-good"]);
    const lessons = new Set<string>();
    const visited: string[] = [];
    let reviews = evidence;
    let nowMs = NOW;

    for (let index = 0; index < 8; index += 1) {
      const step = selectGuidedNextStep({
        cards: subset,
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
      } else if (step.kind === "canonical-card") {
        visited.push(`card:${step.card.id}`);
        if (step.card.id === "mix-001") {
          reviews = [
            ...reviews,
            canonicalStudyReview(
              "multi-concept-mix-review",
              "mix-001",
              new Date(nowMs).toISOString(),
              "strong",
            ),
          ];
          nowMs += 1_000;
        } else if (step.card.id === "ch01-005") {
          break;
        }
      } else if (step.kind === "knowledge-check") {
        throw new Error(`Unexpected check ${step.skill.id} in pre-satisfied path.`);
      }
    }

    expect(visited).toEqual([
      "lesson:final-good",
      "lesson:gross-domestic-product",
      "card:mix-001",
      "lesson:intermediate-good",
      "card:ch01-005",
    ]);
    expect(visited.indexOf("lesson:gross-domestic-product")).toBeLessThan(
      visited.indexOf("card:mix-001"),
    );
    expect(visited.indexOf("lesson:final-good")).toBeLessThan(
      visited.indexOf("card:mix-001"),
    );
    expect(visited).toContain("card:ch01-005");
  });

  it("terminates deterministically on a cycle-shaped card evidence mapping", () => {
    const subset = cards.filter((card) => ["ch06-015", "ch03-022"].includes(card.id));
    const completed = new Set(knowledgeConcepts.map((concept) => concept.id));
    const step = selectGuidedNextStep({
      cards: subset,
      reviews: [],
      settings: NO_EXAM,
      nowMs: NOW,
      lessonCompletedConceptIds: completed,
    });
    const repeated = selectGuidedNextStep({
      cards: subset,
      reviews: [],
      settings: NO_EXAM,
      nowMs: NOW,
      lessonCompletedConceptIds: completed,
    });
    expect(step).toEqual(repeated);
    expect(step.kind).not.toBe("idle");
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
          guidedReview(
            `path-${index}`,
            step.skill.id,
            new Date(nowMs).toISOString(),
            step.skill.kind,
          ),
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
    const failure = canonicalStudyReview(
      "canonical-failure",
      "ch01-001",
      "2026-08-10T23:00:00.000Z",
      "failure",
    );
    const check = guidedReview(
      "check-weak",
      "knowledge-check:percentage",
      "2026-08-10T23:00:00.000Z",
      "mcq",
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
      canonicalStudyReview(
        "ordinary-failure",
        "ch01-001",
        "2026-08-10T23:00:00.000Z",
        "failure",
      ),
    ];
    const guidedHistory = guidedReview(
      "ordinary-ignored-guided",
      "knowledge-check:percentage",
      "2026-08-10T23:00:00.000Z",
      "mcq",
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
          guidedReview(
            `cram-check-${index}`,
            step.skill.id,
            new Date(nowMs).toISOString(),
            step.skill.kind,
          ),
        ];
        nowMs += 60 * 60 * 1000;
      } else if (step.kind === "canonical-card") {
        seenCanonical.add(step.card.id);
        reviews = [
          ...reviews,
          canonicalStudyReview(
            `cram-card-${index}`,
            step.card.id,
            new Date(nowMs).toISOString(),
            "strong",
          ),
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
        guidedReview(
          "far-horizon",
          "knowledge-check:percentage",
          reviewAt,
          "calculation",
        ),
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
        guidedReview(
          "near-horizon",
          "knowledge-check:percentage",
          reviewAt,
          "calculation",
        ),
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

  it("keeps mixed failure, weak, and successful cram simulations moving", () => {
    const start = Date.parse("2026-08-11T00:00:00.000Z");
    const hour = 60 * 60 * 1000;
    const horizons = [
      { label: "48h", examOffset: 48 * hour, buffer: 2, startOffset: 0 },
      { label: "12h", examOffset: 12 * hour, buffer: 2, startOffset: 0 },
      { label: "4h", examOffset: 4 * hour, buffer: 1, startOffset: 0 },
      { label: "buffer", examOffset: 4 * hour, buffer: 1, startOffset: 3.5 * hour },
    ];

    for (const horizon of horizons) {
      let nowMs = start + horizon.startOffset;
      const reviews: ReviewEvent[] = [];
      const lessons = new Set<string>();
      const seenCanonical = new Set<string>();
      let failures = 0;
      let weak = 0;
      for (let index = 0; index < 60; index += 1) {
        const step = selectGuidedNextStep({
          cards,
          reviews,
          settings: {
            examAt: new Date(start + horizon.examOffset).toISOString(),
            studyBufferHours: horizon.buffer,
          },
          nowMs,
          lessonCompletedConceptIds: lessons,
          sessionSeed: index,
        });
        expect(step.kind, horizon.label).not.toBe("idle");
        if (step.kind === "lesson") {
          lessons.add(step.conceptId);
        } else if (step.kind === "knowledge-check") {
          const isFailure = index % 11 === 0;
          if (isFailure) failures += 1;
          reviews.push(
            guidedReview(
              `mixed-${horizon.label}-${index}`,
              step.skill.id,
              new Date(nowMs).toISOString(),
              step.skill.kind,
              !isFailure,
            ),
          );
        } else if (step.kind === "canonical-card") {
          seenCanonical.add(step.card.id);
          const isFailure = index % 13 === 0;
          const isWeak =
            !isFailure && step.card.choices === undefined && index % 7 === 0;
          if (isFailure) failures += 1;
          if (isWeak) weak += 1;
          reviews.push(
            canonicalStudyReview(
              `mixed-card-${horizon.label}-${index}`,
              step.card.id,
              new Date(nowMs).toISOString(),
              isFailure ? "failure" : isWeak ? "weak" : "strong",
            ),
          );
        }
        nowMs += 5 * 60 * 1000;
      }
      expect(failures, horizon.label).toBeGreaterThan(0);
      expect(weak, horizon.label).toBeGreaterThan(0);
      expect(seenCanonical.size, horizon.label).toBeGreaterThan(0);
      expect(lessons.size, horizon.label).toBeGreaterThan(0);
    }
  });

  it("contracts strong-success intervals at 48h, 12h, 4h, and in the buffer", () => {
    const start = Date.parse("2026-08-11T00:00:00.000Z");
    const history = Array.from({ length: 6 }, (_, index) =>
      guidedReview(
        `horizon-${index}`,
        "knowledge-check:percentage",
        new Date(start + index * 1_000).toISOString(),
        "calculation",
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
