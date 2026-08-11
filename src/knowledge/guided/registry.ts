import { cardIds } from "../../data/deck";
import { guidedKnowledgeCheckIds, guidedKnowledgeCheckSkills } from "./checks";

/** Every ID that may appear in a ReviewEvent in the browser app. */
export const reviewableProgressIds: ReadonlySet<string> = new Set([
  ...cardIds,
  ...guidedKnowledgeCheckIds,
]);

export const guidedKnowledgeCheckIdList: readonly string[] = Object.freeze(
  guidedKnowledgeCheckSkills.map((skill) => skill.id),
);
