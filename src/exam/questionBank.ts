import rawAuthoredQuestions from "../../exam_questions/MACRO1_exam_questions.json";
import rawStimulusQuestions from "../../exam_questions/MACRO1_exam_stimulus_questions.json";
import { cardIds, cards } from "../data/deck";
import type { Flashcard } from "../domain/content";
import type { ExamQuestion, FourChoices } from "./model";
import {
  canonicalMcqChoiceRationales,
  canonicalMcqStyles,
} from "./canonicalMcqRationales";
import {
  inspectExamQuestionBank,
  type ExamQuestionBankStats,
  type QuestionBankValidationOptions,
  validateExamQuestionBank,
} from "./validateQuestionBank";

const validationOptions: QuestionBankValidationOptions = {
  canonicalCardIds: cardIds,
};

const authoredQuestions = validateExamQuestionBank(
  [...rawAuthoredQuestions, ...rawStimulusQuestions],
  validationOptions,
);
const canonicalQuestions = cards
  .filter((card) => card.choices !== undefined || card.correctChoice !== undefined)
  .map(adaptCanonicalMcqCard);

const validatedBank = inspectExamQuestionBank(
  [...canonicalQuestions, ...authoredQuestions],
  {
    canonicalCardIds: cardIds,
    enforceBankInvariants: true,
    minimumTotal: 160,
    minimumStimulus: 30,
    minimumGraphs: 20,
    minimumTables: 10,
    minimumChapterStimulus: 2,
    maximumQuestionsPerReviewCard: 2,
  },
);

export const examQuestions: readonly ExamQuestion[] = validatedBank.questions;
export const examQuestionValidationWarnings = validatedBank.warnings;
export const examQuestionStats: ExamQuestionBankStats = validatedBank.stats;

const byId = new Map(examQuestions.map((question) => [question.id, question]));

export const questionsByChapter: Readonly<Record<number, readonly ExamQuestion[]>> =
  Object.freeze(
    Object.fromEntries(
      Array.from({ length: 11 }, (_, chapter) => [
        chapter,
        examQuestions.filter((question) => question.chapter === chapter),
      ]),
    ),
  ) as Readonly<Record<number, readonly ExamQuestion[]>>;

export function getExamQuestion(id: string): ExamQuestion | undefined {
  return byId.get(id);
}

export function adaptCanonicalMcqCard(card: Flashcard): ExamQuestion {
  if (card.choices === undefined || card.correctChoice === undefined) {
    throw new Error(`Canonical card "${card.id}" is not an authored MCQ.`);
  }
  if (card.choices.length !== 4) {
    throw new Error(
      `Canonical authored MCQ "${card.id}" must have exactly four choices for the exam bank.`,
    );
  }

  const rationales = canonicalMcqChoiceRationales[card.id];
  if (rationales === undefined) {
    throw new Error(`Missing static choice rationales for canonical MCQ "${card.id}".`);
  }
  const style = canonicalMcqStyles[card.id];
  if (style === undefined) {
    throw new Error(`Missing static exam style for canonical MCQ "${card.id}".`);
  }

  return {
    id: card.id,
    chapter: card.chapter,
    topic: card.topic,
    style,
    difficulty: card.difficulty,
    stem: card.front,
    choices: card.choices as FourChoices,
    correctChoice: card.correctChoice as 0 | 1 | 2 | 3,
    explanation: card.explanation,
    choiceRationales: [...rationales] as unknown as typeof rationales,
    reviewCardId: card.id,
    sourceCardIds: [card.id],
    tags: card.tags,
    provenance: "canonical_mcq",
  };
}
