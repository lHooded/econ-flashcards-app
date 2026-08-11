import { cards } from "../data/deck";
import {
  isNumericUnit,
  type CalculationTemplate,
  type GeneratedCalculationInstance,
} from "./model";
import { validateQuestionStimulus } from "../stimulus/validateStimulus";

export interface CalculationTemplateValidationStats {
  readonly canonicalCalculationCards: number;
  readonly enabledCards: number;
  readonly templateCount: number;
  readonly generatedTables: number;
  readonly fuzzSeedsPerTemplate: number;
}

export function validateCalculationTemplateRegistry(
  templates: readonly CalculationTemplate[],
  fuzzSeeds = 500,
): CalculationTemplateValidationStats {
  if (!Number.isInteger(fuzzSeeds) || fuzzSeeds < 1) {
    throw new Error("Calculation validation requires at least one fuzz seed.");
  }

  const calculationCards = cards.filter((card) => card.kind === "calculation");
  const cardById = new Map(calculationCards.map((card) => [card.id, card]));
  const templateIds = new Set<string>();
  const enabledCardIds = new Set<string>();

  for (const template of templates) {
    if (templateIds.has(template.id)) {
      throw new Error(`Duplicate calculation template ID "${template.id}".`);
    }
    templateIds.add(template.id);
    if (template.id.trim().length === 0)
      throw new Error("Calculation template ID cannot be empty.");
    if (
      !Number.isInteger(template.chapter) ||
      template.chapter < 1 ||
      template.chapter > 10
    ) {
      throw new Error(
        `Template "${template.id}" chapter must be an integer from 1 through 10.`,
      );
    }
    if (![1, 2, 3].includes(template.difficulty)) {
      throw new Error(`Template "${template.id}" has an invalid difficulty.`);
    }
    const card = cardById.get(template.reviewCardId);
    if (card === undefined) {
      throw new Error(
        `Template "${template.id}" references unknown calculation card "${template.reviewCardId}".`,
      );
    }
    if (template.chapter !== card.chapter) {
      throw new Error(
        `Template "${template.id}" chapter does not match its review card.`,
      );
    }
    if (template.topic.trim().length === 0)
      throw new Error(`Template "${template.id}" has no topic.`);
    if (
      template.sourceCardIds.length === 0 ||
      !template.sourceCardIds.includes(template.reviewCardId)
    ) {
      throw new Error(
        `Template "${template.id}" must include its review card in sourceCardIds.`,
      );
    }
    if (template.sourceCardIds.some((cardId) => !cardById.has(cardId))) {
      throw new Error(`Template "${template.id}" contains an unknown source card ID.`);
    }
    enabledCardIds.add(template.reviewCardId);

    let previous: GeneratedCalculationInstance | undefined;
    for (let seedIndex = 0; seedIndex < fuzzSeeds; seedIndex += 1) {
      const seed = `calculation-validation-${seedIndex}`;
      const instance = template.instantiate(seed);
      validateGeneratedCalculationInstance(template, instance);
      template.validateInstance?.(instance);
      if (instance.stimulus !== undefined) {
        validateQuestionStimulus(instance.stimulus);
      }
      if (seedIndex === 0) previous = instance;
      if (
        template.instantiate(seed) !== instance &&
        !deepEqual(template.instantiate(seed), instance)
      ) {
        throw new Error(
          `Template "${template.id}" is not deterministic for seed ${seed}.`,
        );
      }
      if (previous !== undefined && seedIndex === 1 && deepEqual(previous, instance)) {
        throw new Error(
          `Template "${template.id}" produced no variation across its first two seeds.`,
        );
      }
    }
  }

  return {
    canonicalCalculationCards: calculationCards.length,
    enabledCards: enabledCardIds.size,
    templateCount: templates.length,
    generatedTables: countTemplateTables(templates),
    fuzzSeedsPerTemplate: fuzzSeeds,
  };
}

export function validateGeneratedCalculationInstance(
  template: CalculationTemplate,
  instance: GeneratedCalculationInstance,
): void {
  if (
    instance.templateId !== template.id ||
    instance.reviewCardId !== template.reviewCardId ||
    instance.sourceCardIds.join("\u0000") !== template.sourceCardIds.join("\u0000")
  ) {
    throw new Error(
      `Template "${template.id}" returned mismatched instance provenance.`,
    );
  }
  if (instance.seed.trim().length === 0 || instance.instanceId.trim().length === 0) {
    throw new Error(
      `Template "${template.id}" returned an instance without a seed or ID.`,
    );
  }
  if (instance.chapter !== template.chapter || instance.topic.trim().length === 0) {
    throw new Error(
      `Template "${template.id}" returned invalid chapter/topic metadata.`,
    );
  }
  if (instance.prompt.trim().length === 0 || instance.explanation.trim().length === 0) {
    throw new Error(`Template "${template.id}" returned empty prompt or explanation.`);
  }
  if (instance.commonTrap.trim().length === 0 || instance.workedSolution.length === 0) {
    throw new Error(`Template "${template.id}" returned incomplete solution metadata.`);
  }
  if (instance.workedSolution.some((step) => step.trim().length === 0)) {
    throw new Error(
      `Template "${template.id}" returned an empty worked-solution step.`,
    );
  }
  const { answer } = instance;
  if (
    !Number.isFinite(answer.value) ||
    !Number.isInteger(answer.decimals) ||
    answer.decimals < 0 ||
    answer.decimals > 8 ||
    !Number.isFinite(answer.tolerance.value) ||
    answer.tolerance.value <= 0 ||
    answer.roundingInstruction.trim().length === 0
  ) {
    throw new Error(`Template "${template.id}" returned an invalid numeric answer.`);
  }
  if (answer.unit.trim().length === 0)
    throw new Error(`Template "${template.id}" has no answer unit.`);
  if (!isNumericUnit(answer.unit)) {
    throw new Error(`Template "${template.id}" has an unsupported answer unit.`);
  }
  if (answer.tolerance.type !== "absolute" && answer.tolerance.type !== "relative") {
    throw new Error(`Template "${template.id}" returned an invalid tolerance type.`);
  }
  for (const [key, value] of Object.entries(instance.parameters)) {
    if (
      key.trim().length === 0 ||
      (typeof value === "number" && !Number.isFinite(value))
    ) {
      throw new Error(`Template "${template.id}" returned invalid parameter data.`);
    }
  }
}

function countTemplateTables(templates: readonly CalculationTemplate[]): number {
  return templates.filter(
    (template) => template.instantiate("table-count").stimulus?.type === "table",
  ).length;
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
