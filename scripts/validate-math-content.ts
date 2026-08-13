import rawAuthoredQuestions from "../exam_questions/MACRO1_exam_questions.json";
import rawStimulusQuestions from "../exam_questions/MACRO1_exam_stimulus_questions.json";
import { calculationTemplates } from "../src/calculations/templates";
import { cards } from "../src/data/deck";
import { examQuestions } from "../src/exam/questionBank";
import { guidedKnowledgeCheckSkills } from "../src/knowledge/guided/checks";
import { knowledgeConcepts } from "../src/knowledge/data";
import type { KnowledgeEquation } from "../src/knowledge/model";
import type { QuestionStimulusSpec } from "../src/stimulus/model";
import {
  validateFreeMathContent,
  validateStructuredVariableSymbol,
} from "../src/math/contentValidation";
import { tokenizeMathText, validateMathExpression } from "../src/math/markup";

export interface MathContentValidationStats {
  readonly inspectedStrings: number;
  readonly mathFragments: number;
  readonly structuredExpressions: number;
  readonly structuredVariableSymbols: number;
  readonly nativeGraphLabels: number;
  readonly generatedGuidedVariants: number;
  readonly generatedCalculationInstances: number;
}

const MATH_CONTENT_FIELDS = [
  "front",
  "answer",
  "explanation",
  "commonTrap",
  "choices",
] as const;

const GRAPH_RAW_PSEUDO_PATTERNS: readonly RegExp[] = [
  /\\(?:frac|tilde|hat|bar|sqrt|pi|alpha|beta|gamma|delta|lambda|mu|sigma|rho|Delta|times|approx|le|ge)\b/u,
  /_\{[^}]+\}/u,
  /\^[{][^}]+[}]/u,
];

const GENERATED_AUDIT_SEEDS = [
  "math-audit-0",
  "math-audit-1",
  "math-audit-7",
  "math-audit-31",
  "math-audit-127",
  "math-audit-211",
  "math-audit-997",
  "math-audit-5000",
] as const;
const GENERATED_GUIDED_SEEDS = [0, 1, 7, 19, 73, 211, 997, 5000] as const;

export function validateMathContent(): MathContentValidationStats {
  const issues: string[] = [];
  let inspectedStrings = 0;
  let mathFragments = 0;
  let structuredExpressions = 0;
  let structuredVariableSymbols = 0;
  let nativeGraphLabels = 0;
  let generatedGuidedVariants = 0;
  let generatedCalculationInstances = 0;

  const inspectFreeText = (value: string, path: string): void => {
    inspectedStrings += 1;
    try {
      mathFragments += validateFreeMathContent(value, path);
    } catch (error: unknown) {
      issues.push(errorMessage(error));
      return;
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

  const inspectStructuredSymbol = (value: string, path: string): void => {
    inspectedStrings += 1;
    structuredVariableSymbols += 1;
    try {
      validateStructuredVariableSymbol(value, path);
    } catch (error: unknown) {
      issues.push(errorMessage(error));
    }
  };

  const inspectGraphText = (value: string, path: string): void => {
    inspectedStrings += 1;
    nativeGraphLabels += 1;
    const matches = GRAPH_RAW_PSEUDO_PATTERNS.flatMap((pattern) => {
      const match = pattern.exec(value);
      return match === null ? [] : [match[0].trim()];
    });
    if (matches.length > 0) {
      issues.push(
        path +
          " is native SVG text but contains raw LaTeX commands or Unicode script markup: " +
          [...new Set(matches)].join(", "),
      );
    }
  };

  for (const card of cards) {
    inspectMathFields(card, "canonical card", inspectFreeText);
  }

  for (const question of examQuestions) {
    inspectFreeText(question.stem, "exam question " + question.id + ".stem");
    question.choices.forEach((choice, index) =>
      inspectFreeText(
        choice,
        "exam question " + question.id + ".choices[" + index + "]",
      ),
    );
    inspectFreeText(
      question.explanation,
      "exam question " + question.id + ".explanation",
    );
    question.choiceRationales.forEach((rationale, index) =>
      inspectFreeText(
        rationale,
        "exam question " + question.id + ".choiceRationales[" + index + "]",
      ),
    );
    if (question.stimulus !== undefined) {
      inspectStimulus(question.stimulus, "exam question " + question.id + ".stimulus", {
        inspectFreeText,
        inspectGraphText,
      });
    }
  }

  for (const concept of knowledgeConcepts) {
    inspectFreeText(concept.summary, "knowledge " + concept.id + ".summary");
    inspectFreeText(concept.intuition, "knowledge " + concept.id + ".intuition");
    concept.explanation.forEach((value, index) =>
      inspectFreeText(value, "knowledge " + concept.id + ".explanation[" + index + "]"),
    );
    inspectFreeText(concept.whyItMatters, "knowledge " + concept.id + ".whyItMatters");
    concept.mechanism?.forEach((value, index) =>
      inspectFreeText(value, "knowledge " + concept.id + ".mechanism[" + index + "]"),
    );
    concept.examples?.forEach((example, index) => {
      inspectFreeText(
        example.text,
        "knowledge " + concept.id + ".examples[" + index + "].text",
      );
      if (example.takeaway !== undefined) {
        inspectFreeText(
          example.takeaway,
          "knowledge " + concept.id + ".examples[" + index + "].takeaway",
        );
      }
    });
    concept.misconceptions?.forEach((value, index) =>
      inspectFreeText(
        value,
        "knowledge " + concept.id + ".misconceptions[" + index + "]",
      ),
    );
    concept.contrasts?.forEach((contrast, index) =>
      inspectFreeText(
        contrast.difference,
        "knowledge " + concept.id + ".contrasts[" + index + "].difference",
      ),
    );
    concept.equations?.forEach((equation, index) => {
      inspectEquation(
        equation,
        "knowledge " + concept.id + ".equations[" + index + "]",
        {
          inspectStructured,
          inspectStructuredSymbol,
          inspectFreeText,
        },
      );
    });
  }

  for (const skill of guidedKnowledgeCheckSkills) {
    skill.variants.forEach((variant, index) =>
      inspectGuidedVariant(variant, "guided " + skill.id + ".variants[" + index + "]", {
        inspectFreeText,
      }),
    );
    if (skill.generator !== undefined) {
      for (const seed of GENERATED_GUIDED_SEEDS) {
        const variant = skill.generator(seed);
        generatedGuidedVariants += 1;
        inspectGuidedVariant(
          variant,
          "guided " + skill.id + ".generated[" + seed + "]",
          { inspectFreeText },
        );
      }
    }
  }

  for (const template of calculationTemplates) {
    for (const seed of GENERATED_AUDIT_SEEDS) {
      const instance = template.instantiate(seed);
      generatedCalculationInstances += 1;
      inspectFreeText(
        instance.prompt,
        "calculation " + template.id + "[" + seed + "].prompt",
      );
      instance.workedSolution.forEach((step, index) =>
        inspectFreeText(
          step,
          "calculation " + template.id + "[" + seed + "].workedSolution[" + index + "]",
        ),
      );
      inspectFreeText(
        instance.explanation,
        "calculation " + template.id + "[" + seed + "].explanation",
      );
      inspectFreeText(
        instance.commonTrap,
        "calculation " + template.id + "[" + seed + "].commonTrap",
      );
      if (instance.stimulus !== undefined) {
        inspectStimulus(
          instance.stimulus,
          "calculation " + template.id + "[" + seed + "].stimulus",
          { inspectFreeText, inspectGraphText },
        );
      }
    }
  }

  inspectAuthoredSourceParity(issues);
  inspectContentInvariants(issues);

  if (issues.length > 0) {
    throw new Error(
      "Math content validation failed with " +
        issues.length +
        " issue" +
        (issues.length === 1 ? "" : "s") +
        ":\n" +
        issues.map((issue) => "- " + issue).join("\n"),
    );
  }

  return {
    inspectedStrings,
    mathFragments,
    structuredExpressions,
    structuredVariableSymbols,
    nativeGraphLabels,
    generatedGuidedVariants,
    generatedCalculationInstances,
  };
}

function inspectMathFields(
  value: unknown,
  label: string,
  inspectFreeText: (value: string, path: string) => void,
): void {
  const record = value as Record<string, unknown>;
  for (const field of MATH_CONTENT_FIELDS) {
    const fieldValue = record[field];
    if (fieldValue === undefined) continue;
    if (typeof fieldValue === "string") {
      inspectFreeText(fieldValue, label + " " + String(record.id) + "." + field);
    } else if (Array.isArray(fieldValue)) {
      fieldValue.forEach((entry, index) => {
        if (typeof entry === "string") {
          inspectFreeText(
            entry,
            label + " " + String(record.id) + "." + field + "[" + index + "]",
          );
        }
      });
    }
  }
}

function inspectEquation(
  equation: KnowledgeEquation,
  path: string,
  helpers: {
    readonly inspectStructured: (value: string, path: string) => void;
    readonly inspectStructuredSymbol: (value: string, path: string) => void;
    readonly inspectFreeText: (value: string, path: string) => void;
  },
): void {
  helpers.inspectStructured(equation.expression, path + ".expression");
  helpers.inspectFreeText(equation.interpretation, path + ".interpretation");
  equation.variables.forEach((variable, index) => {
    const variablePath = path + ".variables[" + index + "]";
    helpers.inspectStructuredSymbol(variable.symbol, variablePath + ".symbol");
    helpers.inspectFreeText(variable.meaning, variablePath + ".meaning");
    if (variable.units !== undefined) {
      helpers.inspectFreeText(variable.units, variablePath + ".units");
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
  helpers.inspectFreeText(variant.prompt, path + ".prompt");
  variant.choices?.forEach((choice, index) =>
    helpers.inspectFreeText(choice, path + ".choices[" + index + "]"),
  );
  helpers.inspectFreeText(variant.explanation, path + ".explanation");
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
    helpers.inspectFreeText(stimulus.caption, path + ".caption");
    stimulus.columns.forEach((column, index) =>
      helpers.inspectFreeText(column.label, path + ".columns[" + index + "].label"),
    );
    stimulus.rows.forEach((row, rowIndex) =>
      row.cells.forEach((cell, cellIndex) => {
        if (typeof cell === "string") {
          helpers.inspectFreeText(
            cell,
            path + ".rows[" + rowIndex + "].cells[" + cellIndex + "]",
          );
        }
      }),
    );
    if (stimulus.note !== undefined) {
      helpers.inspectFreeText(stimulus.note, path + ".note");
    }
    return;
  }

  const inspect = (value: string, suffix: string): void =>
    helpers.inspectGraphText(value, path + "." + suffix);
  inspect(stimulus.title, "title");
  inspect(stimulus.description, "description");
  inspect(stimulus.xAxis.label, "xAxis.label");
  inspect(stimulus.yAxis.label, "yAxis.label");
  stimulus.xAxis.ticks?.forEach((tick, index) =>
    inspect(tick.label, "xAxis.ticks[" + index + "].label"),
  );
  stimulus.yAxis.ticks?.forEach((tick, index) =>
    inspect(tick.label, "yAxis.ticks[" + index + "].label"),
  );
  stimulus.curves.forEach((curve, index) =>
    inspect(curve.label, "curves[" + index + "].label"),
  );
  stimulus.points?.forEach((point, index) =>
    inspect(point.label, "points[" + index + "].label"),
  );
  stimulus.referenceLines?.forEach((line, index) =>
    inspect(line.label, "referenceLines[" + index + "].label"),
  );
  stimulus.arrows?.forEach((arrow, index) => {
    if (arrow.label !== undefined) {
      inspect(arrow.label, "arrows[" + index + "].label");
    }
  });
  stimulus.annotations?.forEach((annotation, index) =>
    inspect(annotation.text, "annotations[" + index + "].text"),
  );
}

function inspectAuthoredSourceParity(issues: string[]): void {
  if (rawAuthoredQuestions.length !== 107) {
    issues.push(
      "authored exam registry unexpectedly contains " +
        rawAuthoredQuestions.length +
        " questions",
    );
  }
  if (rawStimulusQuestions.length !== 30) {
    issues.push(
      "stimulus exam registry unexpectedly contains " +
        rawStimulusQuestions.length +
        " questions",
    );
  }
}

function inspectContentInvariants(issues: string[]): void {
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const questionById = new Map(
    examQuestions.map((question) => [question.id, question]),
  );
  const canonical = (id: string) => cardById.get(id);
  const authored = (id: string) => questionById.get(id);
  const require = (condition: boolean, message: string): void => {
    if (!condition) issues.push(message);
  };

  const fisher = authored("auth-ch07-012");
  require(fisher !== undefined, "missing auth-ch07-012 regression question");
  if (fisher !== undefined) {
    require(fisher.explanation.includes(
      "\\) gives \\(",
    ), "auth-ch07-012 Fisher explanation must place 'gives' in prose between two math fragments");
    const mathWords = tokenizeMathText(fisher.explanation)
      .filter((token) => token.kind === "math")
      .map((token) => token.value)
      .join(" ");
    require(!/\bgives\b/u.test(
      mathWords,
    ), "auth-ch07-012 has ordinary prose inside a KaTeX fragment");
  }

  const transmission = canonical("ch07-016");
  require(transmission !== undefined &&
    transmission.answer.includes(
      "for given inflation expectations",
    ), "ch07-016 must preserve the inflation-expectations qualifier");

  const labourForce = canonical("ch02-003");
  require(labourForce !== undefined &&
    labourForce.answer.includes("employed") &&
    labourForce.answer.includes(
      "unemployed",
    ), "ch02-003 must retain the meanings of E and U");

  const householdSaving = canonical("ch03-021");
  require(householdSaving !== undefined &&
    householdSaving.answer.includes("disposable income") &&
    householdSaving.answer.includes(
      "consumption",
    ), "ch03-021 must retain the meanings of disposable income and consumption");

  const disposableCards = ["ch04-008", "ch04-009"].map(canonical);
  disposableCards.forEach((card, index) => {
    require(card !== undefined, "missing disposable-income regression card " + index);
    if (card !== undefined) {
      const text = [
        card.front,
        card.answer,
        card.explanation,
        card.commonTrap,
        ...(card.choices ?? []),
      ].join("\n");
      require(!/Y_D|Yᴰ/u.test(text), card.id +
        " uses a non-source-faithful disposable-income notation");
      require(text.includes("Y^D"), card.id + " must use Y^D for disposable income");
    }
  });

  const mix = canonical("mix-030");
  require(mix !== undefined, "missing mix-030 regression card");
  if (mix !== undefined) {
    require(!/\bC\/I\b/u.test(
      [mix.answer, ...(mix.choices ?? [])].join("\n"),
    ), "mix-030 must not render C/I as a quotient");
  }

  const money = canonical("ch06-009");
  require(money !== undefined, "missing ch06-009 regression card");
  if (money !== undefined) {
    require(!money.answer.includes(".."), "ch06-009 has duplicate punctuation");
    require(money.answer.includes("currency held by the public") &&
      money.answer.includes(
        "bank deposits usable for payment",
      ), "ch06-009 must retain both money-stock definitions");
  }

  const quantityTrap = canonical("ch06-028");
  require(quantityTrap !== undefined, "missing ch06-028 regression card");
  if (quantityTrap !== undefined) {
    require(quantityTrap.commonTrap.includes(
      "Do not call \\(MV=PY\\) itself a theory; it becomes causal only after behavioural assumptions are added.",
    ), "ch06-028 common trap prose/economics must remain unchanged");
  }

  const graphQuestion = rawStimulusQuestions.find(
    (question) => question.id === "auth-stim-ch02-001",
  );
  require(graphQuestion !== undefined, "missing wage-floor graph regression");
  if (graphQuestion !== undefined && graphQuestion.stimulus?.type === "econ_graph") {
    const labels = [
      graphQuestion.stimulus.description,
      ...(graphQuestion.stimulus.points ?? []).map((point) => point.label),
      ...(graphQuestion.stimulus.referenceLines ?? []).map((line) => line.label),
    ].join("\n");
    require(labels.includes("w_f"), "wage-floor graph must preserve w_f notation");
    require(labels.includes("L_D") &&
      labels.includes("L_S"), "wage-floor graph must preserve L_D/L_S notation");
  }

  const inflationGraph = rawStimulusQuestions.find(
    (question) => question.id === "auth-stim-ch08-002",
  );
  require(inflationGraph !== undefined, "missing inflation graph-label regression");
  if (inflationGraph !== undefined && inflationGraph.stimulus?.type === "econ_graph") {
    const labels = [
      inflationGraph.stimulus.description,
      ...(inflationGraph.stimulus.curves ?? []).map((curve) => curve.label),
    ].join("\n");
    require(labels.includes("π0") &&
      labels.includes(
        "π1",
      ), "inflation graph must preserve source-faithful native π0/π1 labels");
  }

  const allMathStrings = [
    ...cards.flatMap((card) => mathFieldValues(card)),
    ...examQuestions.flatMap((question) => [
      question.stem,
      ...question.choices,
      question.explanation,
      ...question.choiceRationales,
    ]),
    ...knowledgeConcepts.flatMap((concept) => knowledgeTextValues(concept)),
  ];
  const allText = allMathStrings.join("\n");
  require(!/\bC\/I\b/u.test(
    allText,
  ), "an intended C and I sequence still contains C/I");
  require(!/Y_D|Yᴰ|\bYD\b/u.test(
    allText,
  ), "disposable-income notation must use source-faithful Y^D rather than Y_D/YD");
  require(!/\\\([^)]*\b(?:gives|where|which|because|the|is)\b[^)]*\\\)/u.test(
    allText,
  ), "learner-facing prose remains inside a math fragment");

  for (const concept of knowledgeConcepts) {
    concept.equations?.forEach((equation) => {
      require(!/Y_D|Yᴰ|\bYD\b/u.test(
        [
          equation.expression,
          ...equation.variables.map((variable) => variable.symbol),
        ].join("\n"),
      ), "Knowledge disposable-income equations must use Y^D consistently");
    });
  }
}

function mathFieldValues(value: unknown): string[] {
  const record = value as Record<string, unknown>;
  return MATH_CONTENT_FIELDS.flatMap((field) => {
    const fieldValue = record[field];
    if (typeof fieldValue === "string") return [fieldValue];
    if (Array.isArray(fieldValue))
      return fieldValue.filter((entry): entry is string => typeof entry === "string");
    return [];
  });
}

function knowledgeTextValues(concept: (typeof knowledgeConcepts)[number]): string[] {
  return [
    concept.summary,
    concept.intuition,
    ...concept.explanation,
    concept.whyItMatters,
    ...(concept.mechanism ?? []),
    ...(concept.examples?.flatMap((example) => [
      example.text,
      example.takeaway ?? "",
    ]) ?? []),
    ...(concept.misconceptions ?? []),
    ...(concept.contrasts?.map((contrast) => contrast.difference) ?? []),
  ];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const stats = validateMathContent();
console.log("Math content valid");
console.log("Inspected strings: " + stats.inspectedStrings);
console.log("Validated math fragments: " + stats.mathFragments);
console.log("Structured raw-LaTeX expressions: " + stats.structuredExpressions);
console.log("Structured variable symbols: " + stats.structuredVariableSymbols);
console.log("Native SVG graph labels audited: " + stats.nativeGraphLabels);
console.log("Generated Guided variants sampled: " + stats.generatedGuidedVariants);
console.log(
  "Generated calculation instances sampled: " + stats.generatedCalculationInstances,
);
