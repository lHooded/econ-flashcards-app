import type { ExamQuestion } from "../model";
import { MOCK_BLUEPRINT } from "./blueprint";
import { manifestForQuestion, type MockExamBuild } from "./model";

export interface MockSelectionInput {
  readonly bank: readonly ExamQuestion[];
  readonly seed: number | string;
  readonly priorAttemptUsage?:
    ReadonlyMap<string, number> | Readonly<Record<string, number>>;
}

export class MockSelectionError extends Error {
  public constructor(message: string) {
    super(`Unable to build a valid 60-question mock: ${message}`);
    this.name = "MockSelectionError";
  }
}

export function buildMockExam(input: MockSelectionInput): MockExamBuild {
  const rng = seededRandom(input.seed);
  const usage = normaliseUsage(input.priorAttemptUsage);
  if (new Set(input.bank.map((q) => q.id)).size !== input.bank.length)
    throw new MockSelectionError("question IDs are not unique.");
  if (new Set(input.bank.map((q) => q.reviewCardId)).size < 60)
    throw new MockSelectionError(
      "the bank has fewer than 60 unique review-card concepts.",
    );
  const byChapter = new Map<number, ExamQuestion[]>();
  for (const question of input.bank) {
    const list = byChapter.get(question.chapter) ?? [];
    list.push(question);
    byChapter.set(question.chapter, list);
  }
  for (let chapter = 1; chapter <= 10; chapter++) {
    if ((byChapter.get(chapter)?.length ?? 0) < 5)
      throw new MockSelectionError(`chapter ${chapter} has fewer than five questions.`);
  }
  if ((byChapter.get(0)?.length ?? 0) < 10)
    throw new MockSelectionError("Chapter 0 has fewer than ten questions.");

  // The current bank has two graphs per substantive chapter and one table per
  // chapter. One graph per chapter plus tables in five chapters gives the
  // desired 10/5 stimulus profile without adding stimuli to Chapter 0.
  for (let attempt = 0; attempt < 2500; attempt++) {
    const tableChapters = new Set(
      shuffle(
        Array.from({ length: 10 }, (_, i) => i + 1),
        rng,
      ).slice(0, 5),
    );
    const selected: ExamQuestion[] = [];
    const usedCards = new Set<string>();
    let valid = true;
    for (let chapter = 1; chapter <= 10; chapter++) {
      const chapterQuestions = byChapter.get(chapter) ?? [];
      const graph = choose(
        chapterQuestions.filter((q) => q.stimulus?.type === "econ_graph"),
        usage,
        rng,
        usedCards,
      );
      if (graph === undefined) {
        valid = false;
        break;
      }
      const table = tableChapters.has(chapter)
        ? choose(
            chapterQuestions.filter((q) => q.stimulus?.type === "table"),
            usage,
            rng,
            usedCards,
            [graph],
          )
        : undefined;
      if (tableChapters.has(chapter) && table === undefined) {
        valid = false;
        break;
      }
      const chosen = [graph, ...(table === undefined ? [] : [table])];
      for (const q of chosen) usedCards.add(q.reviewCardId);
      const textCount = 5 - chosen.length;
      const textCandidates = chapterQuestions.filter((q) => q.stimulus === undefined);
      const text = chooseMany(textCandidates, textCount, usage, rng, usedCards, chosen);
      if (text.length !== textCount) {
        valid = false;
        break;
      }
      for (const q of text) usedCards.add(q.reviewCardId);
      selected.push(...chosen, ...text);
    }
    if (!valid) continue;
    const mixed = chooseMany(byChapter.get(0) ?? [], 10, usage, rng, usedCards);
    if (mixed.length !== 10) continue;
    selected.push(...mixed);
    if (!passesSelectionInvariants(selected)) continue;
    const ordered = shuffle(selected, rng);
    return {
      questionOrder: ordered.map((q) => q.id),
      manifest: ordered.map(manifestForQuestion),
    };
  }
  throw new MockSelectionError(
    "the configured quotas and quality bounds could not be satisfied after 2,500 deterministic attempts.",
  );
}

function passesSelectionInvariants(questions: readonly ExamQuestion[]): boolean {
  if (questions.length !== MOCK_BLUEPRINT.total) return false;
  if (new Set(questions.map((question) => question.id)).size !== questions.length)
    return false;
  if (
    new Set(questions.map((question) => question.reviewCardId)).size !==
    questions.length
  )
    return false;
  if (questions.filter((question) => question.chapter === 0).length !== 10)
    return false;
  for (let chapter = 1; chapter <= 10; chapter++) {
    if (questions.filter((question) => question.chapter === chapter).length !== 5)
      return false;
    if (
      questions.filter(
        (question) =>
          question.chapter === chapter && question.stimulus?.type === "econ_graph",
      ).length < 1
    )
      return false;
  }
  const tableChapters = new Set(
    questions
      .filter((question) => question.chapter > 0 && question.stimulus?.type === "table")
      .map((question) => question.chapter),
  );
  if (tableChapters.size !== 5) return false;
  return passesQuality(questions);
}

function passesQuality(questions: readonly ExamQuestion[]): boolean {
  const difficulty = [1, 2, 3].map(
    (level) => questions.filter((q) => q.difficulty === level).length,
  );
  if (
    difficulty.some(
      (count, index) =>
        count < MOCK_BLUEPRINT.difficultyRanges[(index + 1) as 1 | 2 | 3][0] ||
        count > MOCK_BLUEPRINT.difficultyRanges[(index + 1) as 1 | 2 | 3][1],
    )
  )
    return false;
  if (
    questions.filter((q) => q.style === "calculation").length <
    MOCK_BLUEPRINT.minimumCalculation
  )
    return false;
  if (
    questions.filter(
      (q) => q.style === "scenario" || q.style === "model_discrimination",
    ).length < MOCK_BLUEPRINT.minimumScenarioOrModel
  )
    return false;
  if (
    questions.filter((q) => q.style === "sequence").length <
    MOCK_BLUEPRINT.minimumSequence
  )
    return false;
  if (
    questions.filter((q) => q.stimulus?.type === "econ_graph").length !==
    MOCK_BLUEPRINT.graphCount
  )
    return false;
  if (
    questions.filter((q) => q.stimulus?.type === "table").length !==
    MOCK_BLUEPRINT.tableCount
  )
    return false;
  const positions = [0, 1, 2, 3].map(
    (position) => questions.filter((q) => q.correctChoice === position).length,
  );
  return positions.every(
    (count) =>
      count >= MOCK_BLUEPRINT.answerPositionRange[0] &&
      count <= MOCK_BLUEPRINT.answerPositionRange[1],
  );
}

function choose(
  candidates: readonly ExamQuestion[],
  usage: ReadonlyMap<string, number>,
  rng: () => number,
  usedCards: ReadonlySet<string>,
  already: readonly ExamQuestion[] = [],
): ExamQuestion | undefined {
  return chooseMany(candidates, 1, usage, rng, usedCards, already)[0];
}

function chooseMany(
  candidates: readonly ExamQuestion[],
  count: number,
  usage: ReadonlyMap<string, number>,
  rng: () => number,
  usedCards: ReadonlySet<string>,
  already: readonly ExamQuestion[] = [],
): ExamQuestion[] {
  const blocked = new Set([...usedCards, ...already.map((q) => q.reviewCardId)]);
  const ranked = candidates
    .filter((question) => !blocked.has(question.reviewCardId))
    .map((question) => ({
      question,
      used: usage.get(question.id) ?? 0,
      tie: rng(),
    }))
    .sort((a, b) => a.used - b.used || a.tie - b.tie);
  const selected: ExamQuestion[] = [];
  const selectedCards = new Set(blocked);
  for (const entry of ranked) {
    if (selectedCards.has(entry.question.reviewCardId)) continue;
    selected.push(entry.question);
    selectedCards.add(entry.question.reviewCardId);
    if (selected.length === count) break;
  }
  return selected;
}

function normaliseUsage(
  input: MockSelectionInput["priorAttemptUsage"],
): ReadonlyMap<string, number> {
  if (input instanceof Map) return input;
  return new Map(
    Object.entries(input ?? {}).map(([id, count]) => [
      id,
      Number.isFinite(count) ? count : 0,
    ]),
  );
}

function seededRandom(seed: number | string): () => number {
  let state = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let value = 2166136261;
  for (let i = 0; i < seed.length; i++)
    value = Math.imul(value ^ seed.charCodeAt(i), 16777619);
  return value >>> 0;
}

function shuffle<T>(values: readonly T[], rng: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
