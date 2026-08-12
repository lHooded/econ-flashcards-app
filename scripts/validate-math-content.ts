import { calculationTemplates } from "../src/calculations/templates";
import { cards } from "../src/data/deck";
import { examQuestions } from "../src/exam/questionBank";
import { guidedKnowledgeCheckSkills } from "../src/knowledge/guided/checks";
import { knowledgeConcepts } from "../src/knowledge/data";
import type { KnowledgeEquation } from "../src/knowledge/model";
import type { QuestionStimulusSpec } from "../src/stimulus/model";
import {
  tokenizeMathText,
  validateMathExpression,
  validateMathText,
} from "../src/math/markup";

export interface MathContentValidationStats {
  readonly inspectedStrings: number;
  readonly mathFragments: number;
  readonly structuredExpressions: number;
  readonly nativeGraphLabels: number;
  readonly generatedGuidedVariants: number;
  readonly generatedCalculationInstances: number;
}

const RAW_PSEUDO_MATH_PATTERNS: readonly RegExp[] = [
  /\\(?:frac|tilde|hat|bar|sqrt|pi|alpha|beta|gamma|delta|lambda|mu|sigma|rho|Delta|times|approx|le|ge)\b/u,
  /\b[A-Za-z][A-Za-z0-9]*_(?:[A-Za-z0-9{])/u,
  /\b[A-Za-z][A-Za-z0-9]*\^(?:[A-Za-z0-9{])/u,
  /[₀₁₂₃₄₅₆₇₈₉₋₊ₐₑₒₓₙₚₛₜₕᵃᵅᵝᵀᴮᴷᴰᴸᵈᵉ]/u,
  /[A-Za-z]̄/u,
  /(?:[πΔαβγδλμσρΩ][^.!?]*?(?:=|≈|≤|≥|×|\/)|(?:=|≈|≤|≥|×|\/)[^.!?]*?[πΔαβγδλμσρΩ])/u,
];

const MATH_CONTENT_FIELDS = [
  "front",
  "answer",
  "explanation",
  "commonTrap",
  "choices",
] as const;

export function validateMathContent(): MathContentValidationStats {
  const issues: string[] = [];
  let inspectedStrings = 0;
  let mathFragments = 0;
  let structuredExpressions = 0;
  let nativeGraphLabels = 0;
  let generatedGuidedVariants = 0;
  let generatedCalculationInstances = 0;

  const inspectFreeText = (value: string, path: string): void => {
    inspectedStrings += 1;
    try {
      mathFragments += validateMathText(value, path);
    } catch (error: unknown) {
      issues.push(errorMessage(error));
      return;
    }

    const prose = tokenizeMathText(value)
      .filter((token) => token.kind === "prose")
      .map((token) => token.value)
      .join(" ");
    const matches = RAW_PSEUDO_MATH_PATTERNS.flatMap((pattern) => {
      const match = pattern.exec(prose);
      return match === null ? [] : [match[0].trim()];
    });
    if (matches.length > 0) {
      issues.push(
        `${path} contains LaTeX-like notation outside explicit math delimiters: ${[...new Set(matches)].join(", ")}`,
      );
    }
  };

  const inspectStructured = (value: string, path: string): void => {
    inspectedStrings += 1;
    structuredExpressions += 1;
    try {
      validateMathExpression(value, path);
    } catch (error: unknown) {
      issues.push(errorMessage(error));
    }
  };

  const inspectGraphText = (value: string, path: string): void => {
    inspectedStrings += 1;
    nativeGraphLabels += 1;
    const matches = RAW_PSEUDO_MATH_PATTERNS.slice(0, 3).flatMap((pattern) => {
      const match = pattern.exec(value);
      return match === null ? [] : [match[0].trim()];
    });
    if (matches.length > 0) {
      issues.push(
        `${path} is native SVG text but contains raw pseudo-LaTeX: ${[...new Set(matches)].join(", ")}`,
      );
    }
  };

  for (const card of cards) {
    for (const field of MATH_CONTENT_FIELDS) {
      const value = card[field];
      if (value === undefined) continue;
      if (typeof value === "string") {
        inspectFreeText(value, `canonical card ${card.id}.${field}`);
      } else {
        value.forEach((entry, index) =>
          inspectFreeText(entry, `canonical card ${card.id}.${field}[${index}]`),
        );
      }
    }
  }

  for (const question of examQuestions) {
    inspectFreeText(question.stem, `exam question ${question.id}.stem`);
    question.choices.forEach((choice, index) =>
      inspectFreeText(choice, `exam question ${question.id}.choices[${index}]`),
    );
    inspectFreeText(question.explanation, `exam question ${question.id}.explanation`);
    question.choiceRationales.forEach((rationale, index) =>
      inspectFreeText(
        rationale,
        `exam question ${question.id}.choiceRationales[${index}]`,
      ),
    );
    if (question.stimulus !== undefined) {
      inspectStimulus(question.stimulus, `exam question ${question.id}.stimulus`, {
        inspectFreeText,
        inspectGraphText,
      });
    }
  }

  for (const concept of knowledgeConcepts) {
    inspectFreeText(concept.summary, `knowledge ${concept.id}.summary`);
    inspectFreeText(concept.intuition, `knowledge ${concept.id}.intuition`);
    concept.explanation.forEach((value, index) =>
      inspectFreeText(value, `knowledge ${concept.id}.explanation[${index}]`),
    );
    inspectFreeText(concept.whyItMatters, `knowledge ${concept.id}.whyItMatters`);
    concept.mechanism?.forEach((value, index) =>
      inspectFreeText(value, `knowledge ${concept.id}.mechanism[${index}]`),
    );
    concept.examples?.forEach((example, index) => {
      inspectFreeText(example.text, `knowledge ${concept.id}.examples[${index}].text`);
      if (example.takeaway !== undefined) {
        inspectFreeText(
          example.takeaway,
          `knowledge ${concept.id}.examples[${index}].takeaway`,
        );
      }
    });
    concept.misconceptions?.forEach((value, index) =>
      inspectFreeText(value, `knowledge ${concept.id}.misconceptions[${index}]`),
    );
    concept.contrasts?.forEach((contrast, index) =>
      inspectFreeText(
        contrast.difference,
        `knowledge ${concept.id}.contrasts[${index}].difference`,
      ),
    );
    concept.equations?.forEach((equation, index) => {
      inspectEquation(equation, `knowledge ${concept.id}.equations[${index}]`, {
        inspectStructured,
        inspectFreeText,
      });
    });
  }

  for (const skill of guidedKnowledgeCheckSkills) {
    skill.variants.forEach((variant, index) => {
      inspectGuidedVariant(variant, `guided ${skill.id}.variants[${index}]`, {
        inspectFreeText,
      });
    });
    if (skill.generator !== undefined) {
      for (const seed of [0, 1, 7, 19, 73, 211]) {
        const variant = skill.generator(seed);
        generatedGuidedVariants += 1;
        inspectGuidedVariant(variant, `guided ${skill.id}.generated[${seed}]`, {
          inspectFreeText,
        });
      }
    }
  }

  for (const template of calculationTemplates) {
    for (const seed of [
      "math-audit-0",
      "math-audit-1",
      "math-audit-7",
      "math-audit-31",
      "math-audit-127",
    ]) {
      const instance = template.instantiate(seed);
      generatedCalculationInstances += 1;
      inspectFreeText(instance.prompt, `calculation ${template.id}[${seed}].prompt`);
      instance.workedSolution.forEach((step, index) =>
        inspectFreeText(
          step,
          `calculation ${template.id}[${seed}].workedSolution[${index}]`,
        ),
      );
      inspectFreeText(
        instance.explanation,
        `calculation ${template.id}[${seed}].explanation`,
      );
      inspectFreeText(
        instance.commonTrap,
        `calculation ${template.id}[${seed}].commonTrap`,
      );
      if (instance.stimulus !== undefined) {
        inspectStimulus(
          instance.stimulus,
          `calculation ${template.id}[${seed}].stimulus`,
          {
            inspectFreeText,
            inspectGraphText,
          },
        );
      }
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `Math content validation failed with ${issues.length} issue${issues.length === 1 ? "" : "s"}:\n${issues.map((issue) => `- ${issue}`).join("\n")}`,
    );
  }

  return {
    inspectedStrings,
    mathFragments,
    structuredExpressions,
    nativeGraphLabels,
    generatedGuidedVariants,
    generatedCalculationInstances,
  };
}

function inspectEquation(
  equation: KnowledgeEquation,
  path: string,
  helpers: {
    readonly inspectStructured: (value: string, path: string) => void;
    readonly inspectFreeText: (value: string, path: string) => void;
  },
): void {
  helpers.inspectStructured(equation.expression, `${path}.expression`);
  helpers.inspectFreeText(equation.interpretation, `${path}.interpretation`);
  equation.variables.forEach((variable, index) => {
    helpers.inspectStructured(variable.symbol, `${path}.variables[${index}].symbol`);
    helpers.inspectFreeText(variable.meaning, `${path}.variables[${index}].meaning`);
    if (variable.units !== undefined) {
      helpers.inspectFreeText(variable.units, `${path}.variables[${index}].units`);
    }
  });
}

function inspectGuidedVariant(
  variant: {
    readonly prompt: string;
    readonly choices?: readonly string[];
    readonly explanation: string;
  },
  path: string,
  helpers: { readonly inspectFreeText: (value: string, path: string) => void },
): void {
  helpers.inspectFreeText(variant.prompt, `${path}.prompt`);
  variant.choices?.forEach((choice, index) =>
    helpers.inspectFreeText(choice, `${path}.choices[${index}]`),
  );
  helpers.inspectFreeText(variant.explanation, `${path}.explanation`);
}

function inspectStimulus(
  stimulus: QuestionStimulusSpec,
  path: string,
  helpers: {
    readonly inspectFreeText: (value: string, path: string) => void;
    readonly inspectGraphText: (value: string, path: string) => void;
  },
): void {
  if (stimulus.type === "table") {
    helpers.inspectFreeText(stimulus.caption, `${path}.caption`);
    stimulus.columns.forEach((column, index) =>
      helpers.inspectFreeText(column.label, `${path}.columns[${index}].label`),
    );
    stimulus.rows.forEach((row, rowIndex) =>
      row.cells.forEach((cell, cellIndex) =>
        helpers.inspectFreeText(cell, `${path}.rows[${rowIndex}].cells[${cellIndex}]`),
      ),
    );
    if (stimulus.note !== undefined)
      helpers.inspectFreeText(stimulus.note, `${path}.note`);
    return;
  }

  const inspect = (value: string, suffix: string) =>
    helpers.inspectGraphText(value, `${path}.${suffix}`);
  inspect(stimulus.title, "title");
  inspect(stimulus.description, "description");
  inspect(stimulus.xAxis.label, "xAxis.label");
  inspect(stimulus.yAxis.label, "yAxis.label");
  stimulus.xAxis.ticks?.forEach((tick, index) =>
    inspect(tick.label, `xAxis.ticks[${index}].label`),
  );
  stimulus.yAxis.ticks?.forEach((tick, index) =>
    inspect(tick.label, `yAxis.ticks[${index}].label`),
  );
  stimulus.curves.forEach((curve, index) =>
    inspect(curve.label, `curves[${index}].label`),
  );
  stimulus.points?.forEach((point, index) =>
    inspect(point.label, `points[${index}].label`),
  );
  stimulus.referenceLines?.forEach((line, index) =>
    inspect(line.label, `referenceLines[${index}].label`),
  );
  stimulus.arrows?.forEach((arrow, index) => {
    if (arrow.label !== undefined) inspect(arrow.label, `arrows[${index}].label`);
  });
  stimulus.annotations?.forEach((annotation, index) =>
    inspect(annotation.text, `annotations[${index}].text`),
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const stats = validateMathContent();
console.log("Math content valid");
console.log(`Inspected strings: ${stats.inspectedStrings}`);
console.log(`Validated math fragments: ${stats.mathFragments}`);
console.log(`Structured raw-LaTeX fields: ${stats.structuredExpressions}`);
console.log(`Native SVG graph labels audited: ${stats.nativeGraphLabels}`);
console.log(`Generated Guided variants sampled: ${stats.generatedGuidedVariants}`);
console.log(
  `Generated calculation instances sampled: ${stats.generatedCalculationInstances}`,
);
