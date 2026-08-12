import type { ExamYieldBlueprint } from "./model";
import { examEvidenceSources } from "./sources";
import { examSkillEvidence } from "./skills";

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreeze(child);
  return value;
}

export const examYieldBlueprint: ExamYieldBlueprint = deepFreeze({
  sources: examEvidenceSources,
  skills: examSkillEvidence,
});
