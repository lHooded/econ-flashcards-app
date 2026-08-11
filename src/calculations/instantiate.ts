import type {
  CalculationParameterValue,
  CalculationSeed,
  CalculationTemplate,
  GeneratedCalculationInstance,
  NumericAnswerSpec,
} from "./model";
import { normalizeCalculationSeed, seedFingerprint } from "./random";

export interface GeneratedCalculationContent {
  readonly prompt: string;
  readonly stimulus?: GeneratedCalculationInstance["stimulus"];
  readonly answer: NumericAnswerSpec;
  readonly workedSolution: readonly string[];
  readonly explanation: string;
  readonly commonTrap: string;
  readonly parameters: Readonly<Record<string, CalculationParameterValue>>;
}

export function makeNumericAnswer(
  value: number,
  options: Omit<NumericAnswerSpec, "value" | "tolerance"> & {
    readonly tolerance?: NumericAnswerSpec["tolerance"];
  },
): NumericAnswerSpec {
  if (!Number.isFinite(value)) {
    throw new Error("Generated numeric answers must be finite.");
  }
  if (
    !Number.isInteger(options.decimals) ||
    options.decimals < 0 ||
    options.decimals > 8
  ) {
    throw new Error("Generated numeric answers must use between 0 and 8 decimals.");
  }
  const tolerance = options.tolerance ?? {
    type: "absolute" as const,
    value: 0.5 * 10 ** -options.decimals + 1e-9,
  };
  if (
    !Number.isFinite(tolerance.value) ||
    tolerance.value <= 0 ||
    (tolerance.type !== "absolute" && tolerance.type !== "relative")
  ) {
    throw new Error("Generated numeric answer tolerance must be finite and positive.");
  }
  return Object.freeze({ value, ...options, tolerance });
}

export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) {
    throw new Error("Cannot format a non-finite number.");
  }
  const safeValue = Object.is(value, -0) ? 0 : value;
  const fixed = safeValue.toFixed(decimals);
  const [whole, fraction] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

export function formatPercent(value: number, decimals = 2): string {
  return `${formatNumber(value, decimals)}%`;
}

export function freezeGeneratedCalculation(
  template: CalculationTemplate,
  seed: CalculationSeed,
  content: GeneratedCalculationContent,
): GeneratedCalculationInstance {
  const normalizedSeed = normalizeCalculationSeed(seed);
  const instance: GeneratedCalculationInstance = {
    templateId: template.id,
    instanceId: `${template.id}:${seedFingerprint(normalizedSeed)}`,
    seed: normalizedSeed,
    reviewCardId: template.reviewCardId,
    chapter: template.chapter,
    topic: template.topic,
    difficulty: template.difficulty,
    prompt: content.prompt,
    ...(content.stimulus === undefined ? {} : { stimulus: content.stimulus }),
    answer: content.answer,
    workedSolution: [...content.workedSolution],
    explanation: content.explanation,
    commonTrap: content.commonTrap,
    sourceCardIds: [...template.sourceCardIds],
    parameters: { ...content.parameters },
  };
  deepFreeze(instance);
  return instance;
}

export function roundFinal(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    deepFreeze(nested);
  }
  return value;
}
