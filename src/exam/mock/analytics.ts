import type { ExamQuestion } from "../model";
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

export function analyseMockAttempt(
  attempt: MockAttempt,
  questionsById: ReadonlyMap<string, ExamQuestion>,
): MockAnalytics {
  const states = new Map(
    attempt.questionStates.map((state) => [state.questionId, state]),
  );
  const bucket = (
    label: string,
    questions: readonly ExamQuestion[],
  ): AnalyticsBucket => ({
    label,
    total: questions.length,
    correct: questions.filter(
      (question) => states.get(question.id)?.selectedChoice === question.correctChoice,
    ).length,
  });
  const questions = attempt.questionOrder
    .map((id) => questionsById.get(id))
    .filter((q): q is ExamQuestion => q !== undefined);
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
      questions.filter((q) => q.stimulus?.type === "econ_graph"),
    ),
    tables: bucket(
      "Tables",
      questions.filter((q) => q.stimulus?.type === "table"),
    ),
    calculations: bucket(
      "Calculations",
      questions.filter((q) => q.style === "calculation"),
    ),
  };
}
