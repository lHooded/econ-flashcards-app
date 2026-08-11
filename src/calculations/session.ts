import type { CalculationTemplate, GeneratedCalculationInstance } from "./model";
import { deriveCalculationSeed, SeededRandom } from "./random";

export interface GeneratedCalculationSessionOptions {
  readonly chapter: number | null;
  readonly difficulty?: 1 | 2 | 3 | "all";
  readonly size: 5 | 10 | 20;
  readonly seed: string | number;
  readonly recentReviewCardIds?: readonly string[];
}

export function buildGeneratedCalculationSet(
  templates: readonly CalculationTemplate[],
  options: GeneratedCalculationSessionOptions,
): readonly GeneratedCalculationInstance[] {
  const eligible = templates.filter(
    (template) =>
      (options.chapter === null || template.chapter === options.chapter) &&
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
  return selected.map((template, ordinal) => {
    let attempt = 0;
    let instance = template.instantiate(
      deriveCalculationSeed(options.seed, template.id, ordinal, attempt),
    );
    while (seenInstances.has(instanceFingerprint(instance)) && attempt < 20) {
      attempt += 1;
      instance = template.instantiate(
        deriveCalculationSeed(options.seed, template.id, ordinal, attempt),
      );
    }
    seenInstances.add(instanceFingerprint(instance));
    return instance;
  });
}

function instanceFingerprint(instance: GeneratedCalculationInstance): string {
  return JSON.stringify({ prompt: instance.prompt, stimulus: instance.stimulus });
}
