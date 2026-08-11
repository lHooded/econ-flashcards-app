import { describe, expect, it } from "vitest";
import { examQuestions } from "../exam/questionBank";
import { buildMockExam } from "../exam/mock/selector";

describe("full mock selector", () => {
  it("satisfies every hard invariant across 1,000 real-bank seeds", () => {
    for (let seed = 0; seed < 1000; seed++) {
      const build = buildMockExam({ bank: examQuestions, seed });
      expect(build.questionOrder).toHaveLength(60);
      expect(new Set(build.questionOrder).size).toBe(60);
      expect(new Set(build.manifest.map((entry) => entry.reviewCardId)).size).toBe(60);
      expect(build.manifest.filter((entry) => entry.chapter === 0)).toHaveLength(10);
      for (let chapter = 1; chapter <= 10; chapter++) {
        expect(
          build.manifest.filter((entry) => entry.chapter === chapter),
        ).toHaveLength(5);
        expect(
          build.manifest.filter(
            (entry) => entry.chapter === chapter && entry.stimulusType === "econ_graph",
          ),
        ).toHaveLength(1);
      }
      expect(
        build.manifest.filter((entry) => entry.stimulusType === "econ_graph"),
      ).toHaveLength(10);
      expect(
        build.manifest.filter((entry) => entry.stimulusType === "table"),
      ).toHaveLength(5);
      expect(
        new Set(
          build.manifest
            .filter((entry) => entry.stimulusType === "table")
            .map((entry) => entry.chapter),
        ).size,
      ).toBe(5);
      expect(
        build.manifest.filter((entry) => entry.difficulty === 1).length,
      ).toBeGreaterThanOrEqual(15);
      expect(
        build.manifest.filter((entry) => entry.difficulty === 1).length,
      ).toBeLessThanOrEqual(21);
      expect(
        build.manifest.filter((entry) => entry.difficulty === 2).length,
      ).toBeGreaterThanOrEqual(27);
      expect(
        build.manifest.filter((entry) => entry.difficulty === 2).length,
      ).toBeLessThanOrEqual(33);
      expect(
        build.manifest.filter((entry) => entry.difficulty === 3).length,
      ).toBeGreaterThanOrEqual(9);
      expect(
        build.manifest.filter((entry) => entry.difficulty === 3).length,
      ).toBeLessThanOrEqual(15);
      expect(
        build.manifest.filter((entry) => entry.style === "calculation").length,
      ).toBeGreaterThanOrEqual(10);
      expect(
        build.manifest.filter(
          (entry) =>
            entry.style === "scenario" || entry.style === "model_discrimination",
        ).length,
      ).toBeGreaterThanOrEqual(20);
      expect(
        build.manifest.filter((entry) => entry.style === "sequence").length,
      ).toBeGreaterThanOrEqual(2);
      for (const correctChoice of [0, 1, 2, 3]) {
        expect(
          build.manifest.filter((entry) => entry.correctChoice === correctChoice)
            .length,
        ).toBeGreaterThanOrEqual(12);
        expect(
          build.manifest.filter((entry) => entry.correctChoice === correctChoice)
            .length,
        ).toBeLessThanOrEqual(18);
      }
    }
  }, 15_000);

  it("is deterministic and prefers lower-use questions", () => {
    const first = buildMockExam({
      bank: examQuestions,
      seed: "same",
      priorAttemptUsage: {},
    });
    const second = buildMockExam({
      bank: examQuestions,
      seed: "same",
      priorAttemptUsage: {},
    });
    expect(second).toEqual(first);
    const usage = Object.fromEntries(examQuestions.map((question) => [question.id, 0]));
    for (const questionId of first.questionOrder) usage[questionId] = 20;
    const fresh = buildMockExam({
      bank: examQuestions,
      seed: "same",
      priorAttemptUsage: usage,
    });
    expect(
      fresh.questionOrder.filter((id) => first.questionOrder.includes(id)).length,
    ).toBeLessThan(60);
  });

  it("fails clearly for an unsatisfiable synthetic bank", () => {
    const synthetic = examQuestions.map((question, index) =>
      index === 0 ? { ...question, reviewCardId: "same-concept" } : question,
    );
    expect(() =>
      buildMockExam({ bank: synthetic.slice(0, 59), seed: "impossible" }),
    ).toThrow(/Unable to build a valid 60-question mock/);
  });
});
