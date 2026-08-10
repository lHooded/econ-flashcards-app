import type { ExamQuestion } from "../exam/model";

export interface PracticeQuestionFilters {
  readonly chapter: number | null;
  readonly style: ExamQuestion["style"] | "all";
  readonly stimulus: "all" | "econ_graph" | "table" | "text";
  readonly size: 5 | 10 | 20;
  readonly seed: number | string;
  readonly recentQuestionIds?: readonly string[];
}

export function buildPracticeSet(
  bank: readonly ExamQuestion[],
  filters: PracticeQuestionFilters,
): readonly ExamQuestion[] {
  const candidates = bank.filter(
    (question) =>
      (filters.chapter === null || question.chapter === filters.chapter) &&
      (filters.style === "all" || question.style === filters.style) &&
      (filters.stimulus === "all" ||
        (filters.stimulus === "text"
          ? question.stimulus === undefined
          : question.stimulus?.type === filters.stimulus)),
  );
  const recent = new Set(filters.recentQuestionIds ?? []);
  const rng = seededRandom(filters.seed);
  const shuffled = [...candidates].sort(
    (a, b) => Number(recent.has(a.id)) - Number(recent.has(b.id)) || rng() - 0.5,
  );
  const chosen: ExamQuestion[] = [];
  const concepts = new Set<string>();
  for (const question of shuffled) {
    if (concepts.has(question.reviewCardId)) continue;
    chosen.push(question);
    concepts.add(question.reviewCardId);
    if (chosen.length === filters.size) break;
  }
  return chosen;
}

function seededRandom(seed: number | string): () => number {
  let state =
    typeof seed === "number"
      ? seed >>> 0
      : [...seed].reduce(
          (value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619),
          2166136261,
        ) >>> 0;
  return () => (state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296;
}
