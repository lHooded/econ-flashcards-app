import type { MockAttempt } from "./model";

export interface AnalyticsBucket {
  readonly label: string;
  readonly correct: number;
  readonly total: number;
}

export interface MockAnalytics {
  readonly chapters: readonly AnalyticsBucket[];
  readonly styles: readonly AnalyticsBucket[];
  readonly difficulties: readonly AnalyticsBucket[];
  readonly graphs: AnalyticsBucket;
  readonly tables: AnalyticsBucket;
  readonly calculations: AnalyticsBucket;
}

export function analyseMockAttempt(attempt: MockAttempt): MockAnalytics {
  const states = new Map(
    attempt.questionStates.map((state) => [state.questionId, state]),
  );
  const bucket = (
    label: string,
    questions: readonly MockAttempt["manifest"][number][],
  ): AnalyticsBucket => ({
    label,
    total: questions.length,
    correct: questions.filter(
      (question) =>
        states.get(question.questionId)?.selectedChoice !== null &&
        states.get(question.questionId)?.selectedChoice === question.correctChoice,
    ).length,
  });
  const questions = attempt.manifest;
  return {
    chapters: [0, ...Array.from({ length: 10 }, (_, i) => i + 1)].map((chapter) =>
      bucket(
        chapter === 0 ? "Chapter 0 · mixed" : `Chapter ${chapter}`,
        questions.filter((q) => q.chapter === chapter),
      ),
    ),
    styles: [
      "concept",
      "scenario",
      "calculation",
      "model_discrimination",
      "sequence",
    ].map((style) =>
      bucket(
        style.replace("_", " "),
        questions.filter((q) => q.style === style),
      ),
    ),
    difficulties: [1, 2, 3].map((difficulty) =>
      bucket(
        `Difficulty ${difficulty}`,
        questions.filter((q) => q.difficulty === difficulty),
      ),
    ),
    graphs: bucket(
      "Graphs",
      questions.filter((q) => q.stimulusType === "econ_graph"),
    ),
    tables: bucket(
      "Tables",
      questions.filter((q) => q.stimulusType === "table"),
    ),
    calculations: bucket(
      "Calculations",
      questions.filter((q) => q.style === "calculation"),
    ),
  };
}
