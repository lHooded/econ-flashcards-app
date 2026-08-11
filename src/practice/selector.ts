import type { ExamQuestion } from "../exam/model";

export interface PracticeQuestionFilters {
  readonly chapter: number | null;
  readonly style: ExamQuestion["style"] | "all";
  readonly stimulus: "all" | "econ_graph" | "table" | "text";
  /** `all` means all stimulus types when this is true, otherwise all bank questions. */
  readonly stimuliOnly?: boolean;
  readonly size: 5 | 10 | 20;
  readonly seed: number | string;
  readonly recentQuestionIds?: readonly string[];
  /** Optional concept focus; candidates must belong to this exact question set. */
  readonly questionIds?: ReadonlySet<string>;
}

export function buildPracticeSet(
  bank: readonly ExamQuestion[],
  filters: PracticeQuestionFilters,
): readonly ExamQuestion[] {
  const candidates = bank.filter(
    (question) =>
      (filters.questionIds?.has(question.id) ?? true) &&
      (filters.chapter === null || question.chapter === filters.chapter) &&
      (filters.style === "all" || question.style === filters.style) &&
      (filters.stimulus === "all"
        ? !filters.stimuliOnly || question.stimulus !== undefined
        : filters.stimulus === "text"
          ? question.stimulus === undefined
          : question.stimulus?.type === filters.stimulus),
  );
  const recent = new Set(filters.recentQuestionIds ?? []);
  const rng = seededRandom(filters.seed);
  // Draw each tie value once. A stateful/random sort comparator is not
  // transitive and can produce engine-dependent orderings.
  const shuffled = candidates
    .map((question) => ({
      question,
      recent: recent.has(question.id),
      tie: rng(),
    }))
    .sort((a, b) => Number(a.recent) - Number(b.recent) || a.tie - b.tie)
    .map((entry) => entry.question);
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
