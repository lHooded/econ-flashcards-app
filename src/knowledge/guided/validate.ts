import type { Flashcard } from "../../domain/content";
import { isNumericUnit } from "../../calculations/model";
import { validateFreeMathContent } from "../../math/contentValidation";
import type { KnowledgeConcept, KnowledgeSource } from "../model";
import { SOURCE_PAGE_LIMITS } from "../validate";
import {
  GUIDED_CHECK_PREFIX,
  type GuidedCheckVariant,
  type GuidedKnowledgeCheckSkill,
} from "./model";

export interface GuidedValidationInput {
  readonly concepts: readonly KnowledgeConcept[];
  readonly cards: readonly Flashcard[];
  readonly sources: readonly KnowledgeSource[];
  readonly skills: readonly GuidedKnowledgeCheckSkill[];
}

export interface GuidedValidationStats {
  readonly noCardConcepts: number;
  readonly coveredNoCardConcepts: number;
  readonly skillCount: number;
  readonly staticVariants: number;
  readonly generatedCheckTemplates: number;
  readonly generatedFuzzInstances: number;
  readonly canonicalCardCollisions: number;
  readonly missingSourceSupport: number;
  readonly unknownRequiredConcepts: number;
  readonly prerequisiteUnsafeVariants: number;
}

export class GuidedLearningValidationError extends Error {
  readonly issues: readonly string[];

  public constructor(issues: readonly string[]) {
    super(
      `Guided learning validation failed:\n${issues
        .map((issue) => `- ${issue}`)
        .join("\n")}`,
    );
    this.name = "GuidedLearningValidationError";
    this.issues = issues;
  }
}

/**
 * Validate the small, static check registry. `fuzzSeeds` is deliberately an
 * argument so tests can use a quick pass while CI uses the full finite sample.
 */
export function validateGuidedKnowledgeChecks(
  input: GuidedValidationInput,
  fuzzSeeds = 500,
): GuidedValidationStats {
  const issues: string[] = [];
  const conceptById = new Map(input.concepts.map((concept) => [concept.id, concept]));
  const sourceById = new Map(input.sources.map((source) => [source.id, source]));
  const canonicalCardIds = new Set(input.cards.map((card) => card.id));
  const noCardConcepts = input.concepts.filter(
    (concept) => concept.linkedCardIds.length === 0,
  );
  const skillById = new Map<string, GuidedKnowledgeCheckSkill>();
  const skillIdsByConcept = new Map<string, string[]>();
  let staticVariants = 0;
  let generatedCheckTemplates = 0;
  let generatedFuzzInstances = 0;
  let canonicalCardCollisions = 0;
  let missingSourceSupport = 0;
  const unknownRequiredConcepts = new Set<string>();
  const prerequisiteUnsafeVariants = new Set<string>();
  const variantIds = new Set<string>();
  const variantFingerprints = new Set<string>();

  for (const skill of input.skills) {
    if (skillById.has(skill.id)) {
      issues.push(`duplicate guided check skill ID "${skill.id}"`);
    }
    skillById.set(skill.id, skill);

    if (
      skill.id !== `${GUIDED_CHECK_PREFIX}${skill.conceptId}` ||
      skill.conceptId.trim() === ""
    ) {
      issues.push(`skill "${skill.id}" must use the stable concept ID namespace`);
    }
    if (canonicalCardIds.has(skill.id)) {
      canonicalCardCollisions += 1;
      issues.push(`guided skill "${skill.id}" collides with a canonical card ID`);
    }

    const concept = conceptById.get(skill.conceptId);
    if (concept === undefined) {
      issues.push(
        `skill "${skill.id}" references unknown concept "${skill.conceptId}"`,
      );
    } else if (concept.linkedCardIds.length > 0) {
      issues.push(
        `skill "${skill.id}" targets concept "${skill.conceptId}" with canonical cards; guided checks are reserved for no-card concepts`,
      );
    }
    const conceptSkillIds = skillIdsByConcept.get(skill.conceptId) ?? [];
    conceptSkillIds.push(skill.id);
    skillIdsByConcept.set(skill.conceptId, conceptSkillIds);

    if (skill.sourceRefs.length === 0) {
      missingSourceSupport += 1;
      issues.push(`skill "${skill.id}" has no source references`);
    }
    for (const sourceRef of skill.sourceRefs) {
      const source = sourceById.get(sourceRef.sourceId);
      if (source === undefined) {
        missingSourceSupport += 1;
        issues.push(
          `skill "${skill.id}" references unknown source "${sourceRef.sourceId}"`,
        );
      }
      const limit = SOURCE_PAGE_LIMITS[sourceRef.sourceId];
      if (!Number.isInteger(sourceRef.page) || sourceRef.page < 1) {
        issues.push(`skill "${skill.id}" has an invalid source page`);
      } else if (limit !== undefined && sourceRef.page > limit) {
        issues.push(
          `skill "${skill.id}" cites page ${sourceRef.page} beyond ${sourceRef.sourceId} (${limit} pages)`,
        );
      }
      if (sourceRef.note.trim() === "") {
        issues.push(`skill "${skill.id}" has an empty source note`);
      }
    }

    const hasGenerator = skill.generator !== undefined;
    if (hasGenerator) {
      generatedCheckTemplates += 1;
      if (skill.variants.length !== 0) {
        issues.push(
          `generated skill "${skill.id}" must not also contain static variants`,
        );
      }
      for (let seed = 1; seed <= fuzzSeeds; seed += 1) {
        let variant: GuidedCheckVariant;
        try {
          variant = skill.generator(seed);
        } catch (error: unknown) {
          issues.push(
            `generator "${skill.id}" threw at seed ${seed}: ${errorMessage(error)}`,
          );
          break;
        }
        validateVariant(
          variant,
          skill,
          `generator ${skill.id} seed ${seed}`,
          conceptById,
          unknownRequiredConcepts,
          prerequisiteUnsafeVariants,
          issues,
        );
        generatedFuzzInstances += 1;
      }
      const generated = generatedVariants(skill, Math.min(fuzzSeeds, 500));
      if (generated.length > 1) {
        if (new Set(generated.map((variant) => variant.fingerprint)).size < 2) {
          issues.push(`generator "${skill.id}" does not produce varied prompts`);
        }
        if (
          skill.kind === "calculation" &&
          new Set(
            generated
              .filter(
                (
                  variant,
                ): variant is Extract<GuidedCheckVariant, { kind: "calculation" }> =>
                  variant.kind === "calculation",
              )
              .map((variant) => variant.answer),
          ).size < 2
        ) {
          issues.push(`generator "${skill.id}" does not produce varied answers`);
        }
      }
    } else {
      staticVariants += skill.variants.length;
      if (skill.variants.length < 2) {
        issues.push(`static skill "${skill.id}" needs at least two variants`);
      }
      const fingerprints = new Set<string>();
      for (const variant of skill.variants) {
        if (fingerprints.has(variant.fingerprint)) {
          issues.push(`skill "${skill.id}" has duplicate variant fingerprint`);
        }
        fingerprints.add(variant.fingerprint);
        if (variantIds.has(variant.id)) {
          issues.push(`duplicate guided variant ID "${variant.id}"`);
        }
        variantIds.add(variant.id);
        if (variantFingerprints.has(variant.fingerprint)) {
          issues.push(`duplicate guided variant fingerprint "${variant.fingerprint}"`);
        }
        variantFingerprints.add(variant.fingerprint);
        validateVariant(
          variant,
          skill,
          `skill ${skill.id} variant ${variant.id}`,
          conceptById,
          unknownRequiredConcepts,
          prerequisiteUnsafeVariants,
          issues,
        );
      }
    }
  }

  for (const concept of noCardConcepts) {
    const skillIds = skillIdsByConcept.get(concept.id) ?? [];
    if (skillIds.length === 0) {
      issues.push(`no-card concept "${concept.id}" has no guided knowledge check`);
    } else if (skillIds.length > 1) {
      issues.push(
        `no-card concept "${concept.id}" has multiple guided skills (${skillIds.join(", ")})`,
      );
    }
  }
  for (const [conceptId, skillIds] of skillIdsByConcept) {
    if (!conceptById.has(conceptId)) continue;
    if (skillIds.length > 1) {
      issues.push(
        `concept "${conceptId}" has incompatible guided skills: ${skillIds.join(", ")}`,
      );
    }
  }

  if (issues.length > 0) {
    throw new GuidedLearningValidationError(issues);
  }

  return {
    noCardConcepts: noCardConcepts.length,
    coveredNoCardConcepts: noCardConcepts.filter(
      (concept) => (skillIdsByConcept.get(concept.id)?.length ?? 0) === 1,
    ).length,
    skillCount: input.skills.length,
    staticVariants,
    generatedCheckTemplates,
    generatedFuzzInstances,
    canonicalCardCollisions,
    missingSourceSupport,
    unknownRequiredConcepts: unknownRequiredConcepts.size,
    prerequisiteUnsafeVariants: prerequisiteUnsafeVariants.size,
  };
}

function validateVariant(
  variant: GuidedCheckVariant,
  skill: GuidedKnowledgeCheckSkill,
  context: string,
  conceptById: ReadonlyMap<string, KnowledgeConcept>,
  unknownRequiredConcepts: Set<string>,
  prerequisiteUnsafeVariants: Set<string>,
  issues: string[],
): void {
  if (variant.kind !== skill.kind) {
    issues.push(`${context} has kind ${variant.kind}, expected ${skill.kind}`);
  }
  if (variant.id.trim() === "" || variant.fingerprint.trim() === "") {
    issues.push(`${context} has an empty ID or fingerprint`);
  }
  if (variant.prompt.trim() === "") issues.push(`${context} has an empty prompt`);
  if (variant.explanation.trim() === "") {
    issues.push(`${context} has an empty explanation`);
  }

  const mathFields = [
    ["prompt", variant.prompt],
    ...(variant.kind === "mcq"
      ? variant.choices.map((choice, index) => ["choices[" + index + "]", choice])
      : []),
    ["explanation", variant.explanation],
  ] as const;
  for (const [field, value] of mathFields) {
    try {
      validateFreeMathContent(value, context + "." + field);
    } catch (error: unknown) {
      issues.push(errorMessage(error));
    }
  }

  if (!Array.isArray(variant.requiredConceptIds)) {
    prerequisiteUnsafeVariants.add(context);
    issues.push(`${context} has no requiredConceptIds metadata`);
  } else {
    const seen = new Set<string>();
    const ancestors = prerequisiteAncestors(skill.conceptId, conceptById);
    for (const requiredConceptId of variant.requiredConceptIds) {
      if (seen.has(requiredConceptId)) {
        prerequisiteUnsafeVariants.add(context);
        issues.push(`${context} repeats required concept "${requiredConceptId}"`);
      }
      seen.add(requiredConceptId);
      if (!conceptById.has(requiredConceptId)) {
        unknownRequiredConcepts.add(requiredConceptId);
        issues.push(`${context} requires unknown concept "${requiredConceptId}"`);
      } else if (
        requiredConceptId === skill.conceptId ||
        !ancestors.has(requiredConceptId)
      ) {
        prerequisiteUnsafeVariants.add(context);
        issues.push(
          `${context} requires "${requiredConceptId}", which is not a strict prerequisite ancestor of target "${skill.conceptId}"`,
        );
      }
    }
  }
  if (variant.kind === "mcq") {
    if (
      variant.choices.length < 2 ||
      variant.choices.some((choice) => choice.trim() === "")
    ) {
      issues.push(`${context} has invalid choices`);
    }
    if (
      !Number.isInteger(variant.correctChoice) ||
      variant.correctChoice < 0 ||
      variant.correctChoice >= variant.choices.length
    ) {
      issues.push(`${context} has an invalid correct-choice index`);
    }
  } else {
    if (!Number.isFinite(variant.answer))
      issues.push(`${context} has a non-finite answer`);
    if (
      !Number.isInteger(variant.decimals) ||
      variant.decimals < 0 ||
      variant.decimals > 8
    ) {
      issues.push(`${context} has invalid decimal metadata`);
    }
    if (!Number.isFinite(variant.tolerance) || variant.tolerance <= 0) {
      issues.push(`${context} has invalid answer tolerance`);
    }
    if (!isNumericUnit(variant.unit))
      issues.push(`${context} has an invalid answer unit`);
  }
}

function prerequisiteAncestors(
  conceptId: string,
  conceptById: ReadonlyMap<string, KnowledgeConcept>,
): ReadonlySet<string> {
  const ancestors = new Set<string>();
  const visiting = new Set<string>();
  const visit = (currentId: string): void => {
    if (visiting.has(currentId)) return;
    visiting.add(currentId);
    for (const prerequisiteId of conceptById.get(currentId)?.prerequisites ?? []) {
      if (!ancestors.has(prerequisiteId)) {
        ancestors.add(prerequisiteId);
        visit(prerequisiteId);
      }
    }
    visiting.delete(currentId);
  };
  visit(conceptId);
  return ancestors;
}

function generatedVariants(
  skill: GuidedKnowledgeCheckSkill,
  count: number,
): GuidedCheckVariant[] {
  if (skill.generator === undefined) return [];
  return Array.from({ length: count }, (_, index) =>
    skill.generator?.(index + 1),
  ).filter((variant): variant is GuidedCheckVariant => variant !== undefined);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
