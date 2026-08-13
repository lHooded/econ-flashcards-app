import type {
  CalculationSeed,
  CalculationTemplate,
  GeneratedCalculationInstance,
} from "./model";
import { deriveCalculationSeed, SeededRandom } from "./random";

const MAX_FRESH_VARIANT_ATTEMPTS = 10_000;

export interface GeneratedCalculationSessionOptions {
  readonly chapter: number | null;
  readonly difficulty?: 1 | 2 | 3 | "all";
  readonly size: 5 | 10 | 20;
  readonly seed: string | number;
  readonly recentReviewCardIds?: readonly string[];
  readonly excludedReviewCardIds?: ReadonlySet<string>;
}

export function buildGeneratedCalculationSet(
  templates: readonly CalculationTemplate[],
  options: GeneratedCalculationSessionOptions,
): readonly GeneratedCalculationInstance[] {
  const eligible = templates.filter(
    (template) =>
      (options.chapter === null || template.chapter === options.chapter) &&
      !(options.excludedReviewCardIds?.has(template.reviewCardId) ?? false) &&
      (options.difficulty === undefined ||
        options.difficulty === "all" ||
        template.difficulty === options.difficulty),
  );
  if (eligible.length === 0) return [];

  const random = new SeededRandom(options.seed);
  const recent = new Set(options.recentReviewCardIds ?? []);
  const shuffled = random.shuffle(eligible);
  const preferred = shuffled.filter((template) => !recent.has(template.reviewCardId));
  const ordered = [
    ...preferred,
    ...shuffled.filter((template) => recent.has(template.reviewCardId)),
  ];
  const selected: CalculationTemplate[] = [];
  const usedConcepts = new Set<string>();

  for (const template of ordered) {
    if (selected.length >= options.size) break;
    if (!usedConcepts.has(template.reviewCardId)) {
      selected.push(template);
      usedConcepts.add(template.reviewCardId);
    }
  }
  let extraIndex = 0;
  while (selected.length < options.size) {
    selected.push(ordered[extraIndex % ordered.length]);
    extraIndex += 1;
  }

  const seenInstances = new Set<string>();
  return selected.map((template, ordinal) =>
    instantiateFreshCalculationVariant(
      template,
      [options.seed, template.id, ordinal],
      seenInstances,
    ),
  );
}

export function generatedCalculationFingerprint(
  instance: GeneratedCalculationInstance,
): string {
  return JSON.stringify({ prompt: instance.prompt, stimulus: instance.stimulus });
}

export function instantiateFreshCalculationVariant(
  template: CalculationTemplate,
  seedParts: readonly CalculationSeed[],
  usedFingerprints: Set<string>,
): GeneratedCalculationInstance {
  if (seedParts.length === 0) {
    throw new Error("Fresh calculation variants require at least one seed part.");
  }

  for (let attempt = 0; attempt < MAX_FRESH_VARIANT_ATTEMPTS; attempt += 1) {
    const instance = template.instantiate(deriveCalculationSeed(...seedParts, attempt));
    const fingerprint = generatedCalculationFingerprint(instance);
    if (!usedFingerprints.has(fingerprint)) {
      usedFingerprints.add(fingerprint);
      return instance;
    }
  }

  throw new Error(
    `Could not generate a fresh variant for template "${template.id}" after ${MAX_FRESH_VARIANT_ATTEMPTS} deterministic attempts.`,
  );
}
