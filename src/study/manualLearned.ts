import { cards } from "../data/deck";
import type { ManualLearnedOverride } from "../domain/manualLearned";
import { deriveEffectiveManualLearned } from "../domain/manualLearned";
import { examQuestions } from "../exam/questionBank";
import { cardConceptMap } from "../knowledge/contentMap";
import { knowledgeConcepts } from "../knowledge/data";

/** Resolve the current immutable deck/question/knowledge bundle in one place. */
export function getEffectiveManualLearned(
  overrides: readonly ManualLearnedOverride[] | undefined,
) {
  return deriveEffectiveManualLearned({
    overrides: overrides ?? [],
    cards,
    concepts: knowledgeConcepts,
    questions: examQuestions,
    cardConceptIds: cardConceptMap,
  });
}
