import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import {
  conceptNeedsFoundationLearning,
  deriveCardPrerequisiteReadiness,
  deriveConceptStatuses,
  deriveFoundationCurriculum,
  isConceptReady,
  isPrerequisiteNonBlockingForScheduler,
} from "../knowledge/mastery";
import { knowledgeConceptById } from "../knowledge/data";
import { prerequisiteTopologicalOrder } from "../knowledge/graph";
import type { ExamSrsCardState } from "../study/examSrs/model";

function state(
  cardId: string,
  learningState: ExamSrsCardState["learningState"],
  reviewCount = 1,
  isDue = false,
): ExamSrsCardState {
  return {
    cardId,
    learningState,
    strength: learningState === "learned" ? 3 : 1,
    reviewCount,
    lastReviewedAt: "2026-08-10T00:00:00.000Z",
    lastOutcome: learningState === "relearning" ? "failure" : "strong_success",
    dueAt: isDue ? "2026-08-09T00:00:00.000Z" : null,
    isDue,
  };
}

describe("derived concept readiness", () => {
  it("aggregates mapped cards conservatively into stable labels", () => {
    const bond = knowledgeConceptById.get("bond")!;
    const unseen = deriveConceptStatuses({
      stateByCardId: Object.fromEntries(
        bond.linkedCardIds.map((id) => [id, state(id, "unseen", 0)]),
      ),
    });
    expect(unseen.get("bond")).toBe("unseen");
    const learning = deriveConceptStatuses({
      stateByCardId: Object.fromEntries(
        bond.linkedCardIds.map((id) => [id, state(id, "learned")]),
      ),
    });
    expect(learning.get("bond")).toBe("solid");
    const partial = deriveConceptStatuses({
      stateByCardId: Object.fromEntries([
        [bond.linkedCardIds[0], state(bond.linkedCardIds[0], "learned")],
      ]),
    });
    expect(partial.get("bond")).toBe("learning");
    const needsWork = deriveConceptStatuses({
      stateByCardId: Object.fromEntries(
        bond.linkedCardIds.map((id, index) => [
          id,
          state(id, index === 0 ? "relearning" : "learned"),
        ]),
      ),
    });
    expect(needsWork.get("bond")).toBe("needs-work");
  });

  it("treats concepts with no linked card as introduced background, avoiding deadlock", () => {
    expect(knowledgeConceptById.get("percentage")?.linkedCardIds).toHaveLength(0);
    const statuses = new Map([["percentage", "unseen" as const]]);
    expect(isPrerequisiteNonBlockingForScheduler("percentage", statuses)).toBe(true);
    expect(isConceptReady("percentage", statuses)).toBe(true);
    expect(conceptNeedsFoundationLearning("percentage", statuses)).toBe(true);
    expect(
      deriveFoundationCurriculum(prerequisiteTopologicalOrder, statuses),
    ).toContain("percentage");
  });

  it("does not treat learning or needs-work as finished foundation learning", () => {
    const concept = knowledgeConceptById.get("growth-rate")!;
    const learningStatuses = deriveConceptStatuses({
      stateByCardId: Object.fromEntries([
        [concept.linkedCardIds[0], state(concept.linkedCardIds[0], "learning")],
      ]),
    });
    expect(learningStatuses.get("growth-rate")).toBe("learning");
    expect(conceptNeedsFoundationLearning("growth-rate", learningStatuses)).toBe(true);

    const needsWorkStatuses = deriveConceptStatuses({
      stateByCardId: Object.fromEntries(
        concept.linkedCardIds.map((id, index) => [
          id,
          state(id, index === 0 ? "weak" : "learned"),
        ]),
      ),
    });
    expect(needsWorkStatuses.get("growth-rate")).toBe("needs-work");
    expect(conceptNeedsFoundationLearning("growth-rate", needsWorkStatuses)).toBe(true);

    const solidStatuses = deriveConceptStatuses({
      stateByCardId: Object.fromEntries(
        concept.linkedCardIds.map((id) => [id, state(id, "learned")]),
      ),
    });
    expect(solidStatuses.get("growth-rate")).toBe("solid");
    expect(conceptNeedsFoundationLearning("growth-rate", solidStatuses)).toBe(false);
  });

  it("produces readiness for every card without removing any candidate", () => {
    const scheduler = { stateByCardId: {} };
    const readiness = deriveCardPrerequisiteReadiness(cards, scheduler);
    expect(readiness.size).toBe(cards.length);
    expect([...readiness.keys()]).toEqual(cards.map((card) => card.id));
  });
});
