import type { Flashcard } from "../../domain/content";
import type { ExamPhase, ExamSrsSnapshot } from "./model";

export interface ChapterSummary {
  readonly chapter: number;
  readonly name: string;
  readonly total: number;
  readonly seen: number;
  readonly learned: number;
  readonly manuallyLearned: number;
  readonly dueNow: number;
}

export interface ExamSrsSummary {
  readonly phase: ExamPhase;
  readonly total: number;
  readonly seen: number;
  readonly unseen: number;
  readonly coveragePercent: number;
  readonly learned: number;
  readonly manuallyLearned: number;
  readonly dueNow: number;
  readonly relearning: number;
  readonly weak: number;
  readonly learning: number;
  readonly chapterSummaries: readonly ChapterSummary[];
}

export function summarizeExamSrs(
  cards: readonly Flashcard[],
  scheduler: ExamSrsSnapshot,
  chapterNames: Readonly<Record<string, string>>,
): ExamSrsSummary {
  const stateById = scheduler.stateByCardId;
  const seen = scheduler.states.filter(
    (state) => state.learningState !== "unseen",
  ).length;
  const chapterNumbers = [...new Set(cards.map((card) => card.chapter))].sort(
    (left, right) => left - right,
  );

  return {
    phase: scheduler.phase,
    total: cards.length,
    seen,
    unseen: cards.length - seen,
    coveragePercent: cards.length === 0 ? 0 : Math.round((seen / cards.length) * 100),
    learned: scheduler.states.filter((state) => state.learningState === "learned")
      .length,
    manuallyLearned: scheduler.states.filter(
      (state) => state.isManuallyLearned === true,
    ).length,
    dueNow: scheduler.states.filter((state) => state.isDue).length,
    relearning: scheduler.states.filter((state) => state.learningState === "relearning")
      .length,
    weak: scheduler.states.filter((state) => state.learningState === "weak").length,
    learning: scheduler.states.filter((state) => state.learningState === "learning")
      .length,
    chapterSummaries: chapterNumbers.map((chapter) => {
      const chapterCards = cards.filter((card) => card.chapter === chapter);
      return {
        chapter,
        name: chapterNames[String(chapter)] ?? `Chapter ${chapter}`,
        total: chapterCards.length,
        seen: chapterCards.filter(
          (card) => stateById[card.id]?.learningState !== "unseen",
        ).length,
        learned: chapterCards.filter(
          (card) => stateById[card.id]?.learningState === "learned",
        ).length,
        manuallyLearned: chapterCards.filter(
          (card) => stateById[card.id]?.isManuallyLearned === true,
        ).length,
        dueNow: chapterCards.filter((card) => stateById[card.id]?.isDue).length,
      } satisfies ChapterSummary;
    }),
  };
}
