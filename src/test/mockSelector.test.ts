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
    }
  });

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
});
