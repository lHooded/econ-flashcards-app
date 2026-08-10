import { describe, expect, it } from "vitest";
import { examQuestions } from "../exam/questionBank";
import { buildPracticeSet } from "../practice/selector";

describe("Practice Lab selection", () => {
  it.each([
    [
      "econ_graph",
      (question: (typeof examQuestions)[number]) =>
        question.stimulus?.type === "econ_graph",
    ],
    [
      "table",
      (question: (typeof examQuestions)[number]) => question.stimulus?.type === "table",
    ],
    [
      "text",
      (question: (typeof examQuestions)[number]) => question.stimulus === undefined,
    ],
  ] as const)("honours the %s stimulus filter", (stimulus, matches) => {
    const questions = buildPracticeSet(examQuestions, {
      chapter: null,
      style: "all",
      stimulus,
      size: 20,
      seed: "practice-filter",
    });
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.every(matches)).toBe(true);
  });

  it("keeps Graphs & Tables all-stimulus mode constrained to stimuli", () => {
    const questions = buildPracticeSet(examQuestions, {
      chapter: null,
      style: "all",
      stimulus: "all",
      stimuliOnly: true,
      size: 20,
      seed: "stimuli",
    });
    expect(questions.length).toBe(20);
    expect(questions.every((question) => question.stimulus !== undefined)).toBe(true);
  });

  it("is deterministic with recent-question preference and concept deduplication", () => {
    const filters = {
      chapter: null,
      style: "all" as const,
      stimulus: "all" as const,
      size: 20 as const,
      seed: "same-practice-seed",
      recentQuestionIds: examQuestions.slice(0, 10).map((question) => question.id),
    };
    const first = buildPracticeSet(examQuestions, filters);
    const second = buildPracticeSet(examQuestions, filters);
    expect(second).toEqual(first);
    expect(new Set(first.map((question) => question.reviewCardId)).size).toBe(
      first.length,
    );
  });

  it("honours calculation plus stimulus intersections", () => {
    const questions = buildPracticeSet(examQuestions, {
      chapter: null,
      style: "calculation",
      stimulus: "econ_graph",
      size: 20,
      seed: "calculation-graphs",
    });
    expect(questions.every((question) => question.style === "calculation")).toBe(true);
    expect(
      questions.every((question) => question.stimulus?.type === "econ_graph"),
    ).toBe(true);
  });
});
