import { cards } from "../data/deck";
import type { DataTableStimulus } from "../stimulus/model";
import {
  freezeGeneratedCalculation,
  formatNumber,
  formatPercent,
  makeNumericAnswer,
  roundFinal,
  type GeneratedCalculationContent,
} from "./instantiate";
import type { CalculationTemplate, GeneratedCalculationInstance } from "./model";
import { normalizeCalculationSeed, SeededRandom } from "./random";
import { validateCalculationTemplateRegistry } from "./validate";

interface TemplateMeta {
  readonly id: string;
  readonly reviewCardId: string;
}

type Generator = (random: SeededRandom) => GeneratedCalculationContent;

function defineTemplate(meta: TemplateMeta, generate: Generator): CalculationTemplate {
  const card = cards.find((candidate) => candidate.id === meta.reviewCardId);
  if (card === undefined)
    throw new Error(`Missing canonical calculation card ${meta.reviewCardId}.`);
  const template: CalculationTemplate = {
    id: meta.id,
    reviewCardId: meta.reviewCardId,
    chapter: card.chapter,
    topic: card.topic,
    difficulty: card.difficulty,
    sourceCardIds: [card.id],
    instantiate(seed) {
      const normalizedSeed = normalizeCalculationSeed(seed);
      const instance = freezeGeneratedCalculation(
        template,
        normalizedSeed,
        generate(new SeededRandom(normalizedSeed)),
      );
      return instance;
    },
  };
  return Object.freeze(template);
}

function trap(reviewCardId: string): string {
  const card = cards.find((candidate) => candidate.id === reviewCardId);
  if (card === undefined) throw new Error(`Missing canonical card ${reviewCardId}.`);
  return card.commonTrap;
}

function answer(
  value: number,
  unit: Parameters<typeof makeNumericAnswer>[1]["unit"],
  decimals: number,
  displayUnit: string,
  roundingInstruction = `Round the final answer to ${decimals} decimal place${decimals === 1 ? "" : "s"}.`,
) {
  return makeNumericAnswer(value, {
    unit,
    displayUnit,
    decimals,
    roundingInstruction,
  });
}

function table(
  caption: string,
  columns: DataTableStimulus["columns"],
  rows: DataTableStimulus["rows"],
  note?: string,
): DataTableStimulus {
  return {
    type: "table",
    caption,
    columns,
    rows,
    ...(note === undefined ? {} : { note }),
  };
}

function chooseNonZero(random: SeededRandom, values: readonly number[]): number {
  return random.pick(values.filter((value) => value !== 0));
}

function signedTerm(value: number, decimals = 0): string {
  return value < 0
    ? `- ${formatMathNumber(Math.abs(value), decimals)}`
    : `+ ${formatMathNumber(value, decimals)}`;
}

function formatMathNumber(value: number, decimals = 0): string {
  return formatNumber(value, decimals).replaceAll(",", "{,}");
}

function formatMathPercent(value: number, decimals = 2): string {
  return `${formatMathNumber(value, decimals)}\\%`;
}

function formatMathSignedPercent(value: number, decimals = 2): string {
  return `${value > 0 ? "+" : ""}${formatMathPercent(value, decimals)}`;
}

function inlineMath(expression: string): string {
  return `\\(${expression}\\)`;
}

function finalLine(
  label: string,
  value: number,
  unit: string,
  decimals: number,
): string {
  return `${label} = ${inlineMath(formatMathNumber(roundFinal(value, decimals), decimals))}${unit}`;
}

export const calculationTemplates: readonly CalculationTemplate[] = [
  defineTemplate(
    { id: "generated-inventory-investment", reviewCardId: "ch01-010" },
    (random) => {
      const beginning = random.integer(14, 30) * 10;
      const change = random.pick([
        -90, -80, -70, -60, -50, -40, -30, -20, -10, 10, 20, 30, 40, 50, 60, 70, 80, 90,
      ]);
      const ending = beginning + change;
      return {
        prompt: `Inventories were ${formatNumber(beginning)} at the start of the period and ${formatNumber(ending)} at the end. Calculate inventory investment.`,
        answer: answer(
          change,
          "units",
          0,
          "inventory units",
          "Give the nearest whole inventory unit.",
        ),
        workedSolution: [
          `Formula: ${inlineMath("\\text{inventory investment} = \\text{ending inventories} - \\text{beginning inventories}")}.`,
          `Substitute: ${inlineMath(formatMathNumber(ending) + " - " + formatMathNumber(beginning) + " = " + formatMathNumber(change))}.`,
          finalLine("Inventory investment", change, " inventory units", 0),
        ],
        explanation:
          "Inventory investment is the change in the stock. A positive result is accumulation; a negative result is a rundown.",
        commonTrap: trap("ch01-010"),
        parameters: { beginning, ending, change },
      };
    },
  ),
  defineTemplate(
    { id: "generated-real-gdp-fixed-base", reviewCardId: "ch01-015" },
    (random) => {
      const goods = ["Food", "Clothing", "Services"];
      const rows = goods.map((good, index) => {
        const price = random.integer(2, 15);
        const quantity = random.integer(4, 18) * 10;
        return { good, price, quantity, id: `good-${index + 1}` };
      });
      const realGdp = rows.reduce((total, row) => total + row.price * row.quantity, 0);
      return {
        prompt:
          "Using the fixed base-year price convention shown in the table, calculate current real GDP.",
        stimulus: table(
          "Base-year prices and current-year quantities",
          [
            { key: "good", label: "Good or service" },
            { key: "price", label: "Base-year price ($/unit)", align: "right" },
            { key: "quantity", label: "Current quantity (units)", align: "right" },
          ],
          rows.map((row) => ({
            id: row.id,
            cells: [
              row.good,
              `$${formatNumber(row.price)}`,
              formatNumber(row.quantity),
            ],
          })),
          "Use base-year prices with current-year quantities; do not use current prices.",
        ),
        answer: answer(realGdp, "currency", 0, "$", "Give the nearest whole dollar."),
        workedSolution: [
          `Formula: ${inlineMath("\\text{real GDP} = \\sum(\\text{base-year price}\\times\\text{current-year quantity})")}.`,
          `Substitute: ${inlineMath(rows.map((row) => row.price + "\\times" + row.quantity).join(" + ") + " = " + formatMathNumber(realGdp))}.`,
          finalLine("Current real GDP", realGdp, "", 0),
        ],
        explanation:
          "Holding the price vector at base-year values makes the total reflect current production quantities rather than current-price changes.",
        commonTrap: trap("ch01-015"),
        parameters: Object.fromEntries(
          rows.flatMap((row, index) => [
            [`price${index + 1}`, row.price],
            [`quantity${index + 1}`, row.quantity],
          ]),
        ),
      };
    },
  ),
  defineTemplate(
    { id: "generated-labour-statistics", reviewCardId: "ch02-007" },
    (random) => {
      const population = random.integer(10, 30) * 100;
      const participation = random.integer(11, 16) * 5;
      const employmentChoices = Array.from(
        { length: participation / 5 - 8 },
        (_, index) => (index + 8) * 5,
      );
      const employmentRatio = random.pick(employmentChoices);
      const labourForce = (population * participation) / 100;
      const employment = (population * employmentRatio) / 100;
      const unemployed = labourForce - employment;
      const unemploymentRate = (unemployed / labourForce) * 100;
      return {
        prompt:
          "Use the table to calculate the unemployment rate u. Derive LF, E, and U as intermediate steps.",
        stimulus: table(
          "Labour-market observations",
          [
            { key: "measure", label: "Measure" },
            { key: "value", label: "Value", align: "right" },
          ],
          [
            {
              id: "working-age",
              cells: ["Working-age population", formatNumber(population)],
            },
            {
              id: "participation",
              cells: ["Participation rate", formatPercent(participation, 0)],
            },
            {
              id: "employment-ratio",
              cells: [
                "Employment-to-population ratio",
                formatPercent(employmentRatio, 0),
              ],
            },
          ],
          `${inlineMath("\\text{LF} = \\text{participation rate}\\times\\text{working-age population}")}; ${inlineMath("\\text{E} = \\text{employment-to-population ratio}\\times\\text{working-age population}")}.`,
        ),
        answer: answer(
          unemploymentRate,
          "percent",
          2,
          "%",
          "Enter the unemployment rate as a percentage, rounded to 2 decimal places.",
        ),
        workedSolution: [
          `${inlineMath("LF = " + formatMathPercent(participation, 0) + "\\times" + formatMathNumber(population) + " = " + formatMathNumber(labourForce))} people.`,
          `${inlineMath("E = " + formatMathPercent(employmentRatio, 0) + "\\times" + formatMathNumber(population) + " = " + formatMathNumber(employment))} people.`,
          `${inlineMath("U = LF - E = " + formatMathNumber(labourForce) + " - " + formatMathNumber(employment) + " = " + formatMathNumber(unemployed))} people.`,
          `${inlineMath("u = \\frac{U}{LF}\\times100 = \\frac{" + formatMathNumber(unemployed) + "}{" + formatMathNumber(labourForce) + "}\\times100")}`,
          finalLine("Unemployment rate", unemploymentRate, "%", 2),
        ],
        explanation:
          "The unemployment rate uses unemployed people as a share of the labour force, not as a share of the whole working-age population.",
        commonTrap: trap("ch02-007"),
        parameters: {
          population,
          participation,
          employmentRatio,
          labourForce,
          employment,
          unemployed,
        },
      };
    },
  ),
  defineTemplate(
    { id: "generated-natural-rate-flows", reviewCardId: "ch02-014" },
    (random) => {
      const separationPercent = random.integer(1, 6);
      const findingPercent = random.integer(7, 20);
      const separation = separationPercent / 100;
      const finding = findingPercent / 100;
      const steadyState = (separation / (separation + finding)) * 100;
      return {
        prompt: `The job-separation rate is ${inlineMath("s = " + formatMathPercent(separationPercent, 0))} and the job-finding rate is ${inlineMath("f = " + formatMathPercent(findingPercent, 0))}. Calculate the steady-state unemployment rate.`,
        answer: answer(
          steadyState,
          "percent",
          2,
          "%",
          "Enter a percentage rounded to 2 decimal places.",
        ),
        workedSolution: [
          `Formula: ${inlineMath("u^* = \\frac{s}{s+f}")}.`,
          `Substitute decimal rates: ${inlineMath("u^* = \\frac{" + formatMathNumber(separation, 2) + "}{" + formatMathNumber(separation, 2) + "+" + formatMathNumber(finding, 2) + "}")}.`,
          `${inlineMath("u^* = " + formatMathNumber(steadyState / 100, 4))} as a fraction.`,
          finalLine("Steady-state unemployment rate", steadyState, "%", 2),
        ],
        explanation:
          "At the steady state, flows out of employment equal flows into employment. Rates must use the same time unit.",
        commonTrap: trap("ch02-014"),
        parameters: { separationPercent, findingPercent, steadyState },
      };
    },
  ),
  defineTemplate({ id: "generated-okun-law", reviewCardId: "ch02-019" }, (random) => {
    const outputGap = chooseNonZero(
      random,
      [-4, -3.5, -3, -2.5, -2, -1.5, 1.5, 2, 2.5, 3, 3.5, 4],
    );
    const beta = random.pick([1.5, 2, 2.5, 3, 3.5]);
    const naturalRate = random.integer(3, 7);
    const actualRate = naturalRate - outputGap / beta;
    return {
      prompt: `The output gap is ${inlineMath(formatMathSignedPercent(outputGap, 1))}, ${inlineMath("\\beta = " + formatMathNumber(beta, 1))}, and the natural unemployment rate is ${inlineMath(formatMathPercent(naturalRate, 0))}. Using the course Okun relationship, calculate actual unemployment ${inlineMath("u")}.`,
      answer: answer(
        actualRate,
        "percent",
        2,
        "%",
        "Enter a percentage rounded to 2 decimal places.",
      ),
      workedSolution: [
        `Formula: ${inlineMath("\\text{output gap} = -\\beta(u-u^*)")}.`,
        `Substitute: ${inlineMath(formatMathNumber(outputGap, 1) + " = -" + formatMathNumber(beta, 1) + "(u-" + formatMathNumber(naturalRate, 0) + ")")}.`,
        `Therefore ${inlineMath("u-u^* = " + formatMathNumber(-outputGap / beta, 2))} percentage points.`,
        finalLine("Actual unemployment", actualRate, "%", 2),
      ],
      explanation:
        "A negative output gap raises cyclical unemployment above the natural rate; a positive gap lowers it.",
      commonTrap: trap("ch02-019"),
      parameters: { outputGap, beta, naturalRate, actualRate },
    };
  }),
  defineTemplate(
    { id: "generated-fisher-effect", reviewCardId: "ch03-007" },
    (random) => {
      const nominal = random.integer(2, 18) / 2;
      const real = random.integer(1, 14) / 2;
      const expectedInflation = nominal - real;
      return {
        prompt: `A deposit pays a ${formatPercent(nominal, 2)} nominal return and a saver expects a ${formatPercent(real, 2)} real return. Using the approximate Fisher effect, calculate expected inflation.`,
        answer: answer(
          expectedInflation,
          "percent",
          2,
          "%",
          "Enter expected inflation as a percentage rounded to 2 decimal places.",
        ),
        workedSolution: [
          `Formula: ${inlineMath("i\\approx r+\\pi^e")}, so ${inlineMath("\\pi^e\\approx i-r")}.`,
          `Substitute: ${inlineMath("\\pi^e = " + formatMathPercent(nominal, 2) + " - " + formatMathPercent(real, 2))}.`,
          finalLine("Expected inflation", expectedInflation, "%", 2),
        ],
        explanation:
          "The course uses the approximate Fisher relation for modest rates, and the sign follows nominal minus real.",
        commonTrap: trap("ch03-007"),
        parameters: { nominal, real, expectedInflation },
      };
    },
  ),
  defineTemplate(
    { id: "generated-capital-accumulation", reviewCardId: "ch03-013" },
    (random) => {
      const beginningCapital = random.pick([100, 200, 300, 400]);
      const investment = random.integer(2, 10) * 10;
      const depreciationRate = random.integer(2, 12);
      const endingCapital =
        beginningCapital + investment - beginningCapital * (depreciationRate / 100);
      const impliedRate =
        ((beginningCapital + investment - endingCapital) / beginningCapital) * 100;
      return {
        prompt: `A capital stock begins at ${inlineMath("K_0 = " + formatMathNumber(beginningCapital))}, gross investment is ${inlineMath("I = " + formatMathNumber(investment))}, and the ending stock is ${inlineMath("K_1 = " + formatMathNumber(endingCapital))}. Using the course one-period accumulation equation, calculate ${inlineMath("\\delta")}.`,
        answer: answer(
          impliedRate,
          "percent",
          2,
          "%",
          "Enter the depreciation rate as a percentage rounded to 2 decimal places.",
        ),
        workedSolution: [
          `Formula: ${inlineMath("K_1=K_0+I-\\delta K_0")}, so ${inlineMath("\\delta=\\frac{K_0+I-K_1}{K_0}")}.`,
          `Substitute: ${inlineMath("\\delta=\\frac{" + formatMathNumber(beginningCapital) + "+" + formatMathNumber(investment) + "-" + formatMathNumber(endingCapital) + "}{" + formatMathNumber(beginningCapital) + "}")}.`,
          `Depreciation = ${inlineMath(formatMathNumber(beginningCapital + investment - endingCapital))} and ${inlineMath("\\delta = " + formatMathNumber(impliedRate / 100, 4))} as a fraction.`,
          finalLine("Depreciation rate", impliedRate, "%", 2),
        ],
        explanation:
          "Depreciation is applied to the beginning capital stock in this one-period equation.",
        commonTrap: trap("ch03-013"),
        parameters: {
          beginningCapital,
          investment,
          endingCapital,
          depreciationRate,
          impliedRate,
        },
      };
    },
  ),
  defineTemplate(
    { id: "generated-simple-multiplier", reviewCardId: "ch04-013" },
    (random) => {
      const c = random.pick([0.4, 0.5, 0.6, 0.7, 0.8, 0.85]);
      const autonomousChange = random.pick([-60, -40, -20, 20, 40, 60, 80]);
      const multiplier = 1 / (1 - c);
      const outputChange = autonomousChange * multiplier;
      return {
        prompt: `An economy has marginal propensity to consume ${inlineMath("c = " + formatMathNumber(c, 2))} and autonomous planned investment changes by ${inlineMath(formatMathNumber(autonomousChange))}. Calculate the resulting equilibrium output change.`,
        answer: answer(
          outputChange,
          "currency_millions",
          1,
          "$ million",
          "Give the output change to 1 decimal place in $ million.",
        ),
        workedSolution: [
          `Formula: multiplier ${inlineMath("k = \\frac{1}{1-c}")}.`,
          `Substitute: ${inlineMath("k = \\frac{1}{1-" + formatMathNumber(c, 2) + "} = " + formatMathNumber(multiplier, 2))}.`,
          `${inlineMath("\\Delta Y = k\\times\\text{autonomous change} = " + formatMathNumber(multiplier, 2) + "\\times" + formatMathNumber(autonomousChange))}.`,
          finalLine("Equilibrium output change", outputChange, " $ million", 1),
        ],
        explanation:
          "The autonomous change propagates through repeated induced-consumption rounds, so the first-round change is not the final output change.",
        commonTrap: trap("ch04-013"),
        parameters: { c, autonomousChange, multiplier, outputChange },
      };
    },
  ),
  defineTemplate(
    { id: "generated-open-economy-equilibrium", reviewCardId: "ch04-024" },
    (random) => {
      const autonomousConsumption = random.integer(12, 30) * 10;
      const c = random.pick([0.4, 0.5, 0.6, 0.7, 0.8]);
      const plannedInvestment = random.integer(4, 12) * 10;
      const exports = random.integer(2, 10) * 10;
      const m = random.pick([0.05, 0.1, 0.15, 0.2]);
      const autonomousSpending = autonomousConsumption + plannedInvestment + exports;
      const denominator = 1 - c + m;
      const equilibriumOutput = autonomousSpending / denominator;
      return {
        prompt: `In a small open economy, ${inlineMath("C = " + formatMathNumber(autonomousConsumption) + " + " + formatMathNumber(c, 2) + "Y")}, planned investment is ${inlineMath("I^P = " + formatMathNumber(plannedInvestment))}, exports are ${inlineMath("X = " + formatMathNumber(exports))}, and ${inlineMath("M = " + formatMathNumber(m, 2) + "Y")}. Calculate equilibrium output ${inlineMath("Y")}.`,
        answer: answer(
          equilibriumOutput,
          "currency_millions",
          1,
          "$ million",
          "Give equilibrium output to 1 decimal place in $ million.",
        ),
        workedSolution: [
          `Formula: ${inlineMath("Y = \\frac{C_0+I^P+X}{1-c+m}")}.`,
          `Autonomous spending = ${inlineMath(formatMathNumber(autonomousConsumption) + " + " + formatMathNumber(plannedInvestment) + " + " + formatMathNumber(exports) + " = " + formatMathNumber(autonomousSpending))}.`,
          `Leakage-adjusted denominator = ${inlineMath("1-" + formatMathNumber(c, 2) + "+" + formatMathNumber(m, 2) + " = " + formatMathNumber(denominator, 2))}.`,
          finalLine("Equilibrium output", equilibriumOutput, " $ million", 1),
        ],
        explanation:
          "Imports are a leakage, so the marginal propensity to import enters the equilibrium denominator with a plus sign.",
        commonTrap: trap("ch04-024"),
        parameters: {
          autonomousConsumption,
          c,
          plannedInvestment,
          exports,
          m,
          autonomousSpending,
          denominator,
          equilibriumOutput,
        },
      };
    },
  ),
  defineTemplate(
    { id: "generated-balanced-budget-multiplier", reviewCardId: "ch05-011" },
    (random) => {
      const c = random.pick([0.5, 0.6, 0.7, 0.8, 0.85]);
      const taxRate = random.pick([0.1, 0.2, 0.3, 0.4]);
      const multiplier = (1 - c) / (1 - c * (1 - taxRate));
      return {
        prompt: `With marginal propensity to consume ${inlineMath("c = " + formatMathNumber(c, 2))} and proportional tax rate ${inlineMath("t = " + formatMathPercent(taxRate * 100, 0))}, calculate the balanced-budget multiplier ${inlineMath("k_{BB}")}.`,
        answer: answer(
          multiplier,
          "ratio",
          3,
          "ratio",
          "Give the multiplier to 3 decimal places.",
        ),
        workedSolution: [
          `Formula: ${inlineMath("k_{BB}=\\frac{1-c}{1-c(1-t)}")}.`,
          `Numerator: ${inlineMath("1-" + formatMathNumber(c, 2) + " = " + formatMathNumber(1 - c, 2))}.`,
          `Denominator: ${inlineMath("1-" + formatMathNumber(c, 2) + "(1-" + formatMathNumber(taxRate, 2) + ") = " + formatMathNumber(1 - c * (1 - taxRate), 3))}.`,
          finalLine("Balanced-budget multiplier", multiplier, "", 3),
        ],
        explanation:
          "With proportional taxes, the balanced-budget multiplier is generally below one because taxes reduce disposable income and induced consumption.",
        commonTrap: trap("ch05-011"),
        parameters: { c, taxRate, multiplier },
      };
    },
  ),
  defineTemplate({ id: "generated-bond-price", reviewCardId: "ch06-005" }, (random) => {
    const faceValue = random.integer(8, 30) * 10;
    const interestRate = random.integer(3, 14) / 2;
    const price = faceValue / (1 + interestRate / 100);
    return {
      prompt: `A one-period bond pays $${formatNumber(faceValue)} next year. If the market interest rate is ${formatPercent(interestRate, 2)}, calculate its price today.`,
      answer: answer(
        price,
        "currency",
        2,
        "$",
        "Enter the price rounded to 2 decimal places.",
      ),
      workedSolution: [
        `Formula: ${inlineMath("\\text{bond price}=\\frac{\\text{face value}}{1+i}")}.`,
        `Convert the rate to a decimal: ${inlineMath("i = " + formatMathNumber(interestRate / 100, 4))}.`,
        `Price = ${inlineMath("\\frac{" + formatMathNumber(faceValue) + "}{1+" + formatMathNumber(interestRate / 100, 4) + "} = " + formatMathNumber(price, 4))}.`,
        finalLine("Bond price", price, "", 2),
      ],
      explanation:
        "Discount the promised future payment at the market rate; use the rate as a decimal in the denominator.",
      commonTrap: trap("ch06-005"),
      parameters: { faceValue, interestRate, price },
    };
  }),
  defineTemplate(
    { id: "generated-money-demand", reviewCardId: "ch06-014" },
    (random) => {
      const income = random.integer(6, 20) * 100;
      const interestRate = random.integer(1, 8);
      const interestDecimal = interestRate / 100;
      const realMoneyDemand = 0.8 * income - 1200 * interestDecimal;
      return {
        prompt: `Real money demand follows ${inlineMath("MD/P = 0.8Y-1200i")}, with i in decimal form. If ${inlineMath("Y = " + formatMathNumber(income))} and ${inlineMath("i = " + formatMathPercent(interestRate, 0))}, calculate ${inlineMath("MD/P")}.`,
        answer: answer(
          realMoneyDemand,
          "units",
          0,
          "real money units",
          "Give the nearest whole real money unit.",
        ),
        workedSolution: [
          `Formula: ${inlineMath("MD/P = 0.8Y-1200i")}.`,
          `Convert i: ${inlineMath(formatMathPercent(interestRate, 0) + " = " + formatMathNumber(interestDecimal, 2))}.`,
          `${inlineMath("MD/P = 0.8(" + formatMathNumber(income) + ")-1200(" + formatMathNumber(interestDecimal, 2) + ") = " + formatMathNumber(realMoneyDemand))}.`,
          finalLine("Real money demand", realMoneyDemand, " real money units", 0),
        ],
        explanation:
          "Income raises desired real balances while the interest opportunity cost subtracts from them.",
        commonTrap: trap("ch06-014"),
        parameters: { income, interestRate, interestDecimal, realMoneyDemand },
      };
    },
  ),
  defineTemplate(
    { id: "generated-quantity-theory", reviewCardId: "ch06-030" },
    (random) => {
      const moneyGrowth = random.integer(8, 24) / 2;
      const realOutputGrowth = random.integer(-4, 16) / 2;
      const inflation = moneyGrowth - realOutputGrowth;
      return {
        prompt: `Money grows by ${formatPercent(moneyGrowth, 2)}, velocity is constant, and real output grows by ${formatPercent(realOutputGrowth, 2)}. Using simple quantity theory, calculate predicted inflation.`,
        answer: answer(
          inflation,
          "percent",
          2,
          "%",
          "Enter inflation as a percentage rounded to 2 decimal places.",
        ),
        workedSolution: [
          `With constant velocity: ${inlineMath("\\pi\\approx g_M-g_Y")}.`,
          `Substitute: ${inlineMath("\\pi\\approx" + formatMathPercent(moneyGrowth, 2) + "-" + formatMathPercent(realOutputGrowth, 2))}.`,
          finalLine("Predicted inflation", inflation, "%", 2),
        ],
        explanation:
          "Nominal money growth in excess of real output growth appears as price growth when velocity is unchanged.",
        commonTrap: trap("ch06-030"),
        parameters: { moneyGrowth, realOutputGrowth, inflation },
      };
    },
  ),
  defineTemplate(
    { id: "generated-corridor-floor", reviewCardId: "ch07-008" },
    (random) => {
      const target = random.integer(6, 18) / 4;
      const widthBasisPoints = random.pick([20, 30, 40, 50, 60, 80, 100]);
      const halfWidth = widthBasisPoints / 200;
      const floor = target - halfWidth;
      const ceiling = target + halfWidth;
      return {
        prompt: `A hypothetical cash-rate corridor is ${formatNumber(widthBasisPoints)} basis points wide and centred on a ${formatPercent(target, 2)} target. Calculate the floor rate.`,
        answer: answer(
          floor,
          "percent",
          2,
          "%",
          "Enter the floor rate as a percentage rounded to 2 decimal places.",
        ),
        workedSolution: [
          "A corridor's total width is split evenly around its target.",
          `${formatNumber(widthBasisPoints)} basis points = ${formatNumber(widthBasisPoints / 100, 2)} percentage points, so each side is ${formatNumber(halfWidth, 2)} points.`,
          `Floor = ${formatNumber(target, 2)}% − ${formatNumber(halfWidth, 2)} = ${formatNumber(floor, 2)}%.`,
          `The corresponding ceiling is ${formatNumber(ceiling, 2)}%.`,
        ],
        explanation:
          "The numeric answer asks for the lower boundary; the worked solution also identifies the upper boundary so the complete corridor is checked.",
        commonTrap: trap("ch07-008"),
        parameters: { target, widthBasisPoints, halfWidth, floor, ceiling },
      };
    },
  ),
  defineTemplate(
    { id: "generated-reserve-demand", reviewCardId: "ch07-010" },
    (random) => {
      const interestRatePoints = random.integer(2, 38) / 10;
      const reserves = 10 - 2.5 * interestRatePoints;
      return {
        prompt: `Reserve demand is ${inlineMath("R^d = 10-2.5i")}, where i is measured in percentage points. At ${inlineMath("i = " + formatMathNumber(interestRatePoints, 1))}, calculate reserves demanded.`,
        answer: answer(
          reserves,
          "units",
          2,
          "reserve units",
          "Give reserves demanded to 2 decimal places.",
        ),
        workedSolution: [
          `Formula: ${inlineMath("R^d = 10-2.5i")}.`,
          `Substitute the percentage-point rate directly: ${inlineMath("R^d = 10-2.5(" + formatMathNumber(interestRatePoints, 1) + ")")}.`,
          finalLine("Reserves demanded", reserves, " reserve units", 2),
        ],
        explanation:
          "This course equation uses 2 for 2%, not 0.02; the displayed unit convention determines the substitution.",
        commonTrap: trap("ch07-010"),
        parameters: { interestRatePoints, reserves },
      };
    },
  ),
  defineTemplate(
    { id: "generated-expectations-hypothesis", reviewCardId: "ch07-020" },
    (random) => {
      const currentRate = random.integer(2, 12) / 2;
      const expectedNextRate = random.integer(2, 16) / 2;
      const twoYearRate = (currentRate + expectedNextRate) / 2;
      return {
        prompt: `The current one-year rate is ${formatPercent(currentRate, 2)} and the expected one-year rate next year is ${formatPercent(expectedNextRate, 2)}. Under the expectations hypothesis, calculate the approximate two-year annual rate.`,
        answer: answer(
          twoYearRate,
          "percent",
          2,
          "%",
          "Enter the annualised two-year rate to 2 decimal places.",
        ),
        workedSolution: [
          `Approximate expectations-hypothesis formula: ${inlineMath("\\text{two-year annual rate}=\\frac{\\text{current one-year rate}+\\text{expected next one-year rate}}{2}")}.`,
          `Substitute: ${inlineMath("\\frac{" + formatMathPercent(currentRate, 2) + "+" + formatMathPercent(expectedNextRate, 2) + "}{2}")}.`,
          finalLine("Approximate two-year annual rate", twoYearRate, "%", 2),
        ],
        explanation:
          "The two-year quote is an annualised average in the course approximation, not the sum of the two one-year rates.",
        commonTrap: trap("ch07-020"),
        parameters: { currentRate, expectedNextRate, twoYearRate },
      };
    },
  ),
  defineTemplate(
    { id: "generated-taylor-rule", reviewCardId: "ch07-023" },
    (random) => {
      const inflationTarget = random.pick([1, 2, 3]);
      const inflation = random.integer(0, 12) / 2;
      const outputGap = random.pick([-2, -1, 0, 1, 2]);
      const policyRate = 4 + 1.5 * (inflation - inflationTarget) + 0.5 * outputGap;
      return {
        prompt: `Use ${inlineMath("i=4+1.5(\\pi-\\pi^T)+0.5(\\text{output gap})")}, with ${inlineMath("\\pi=" + formatMathPercent(inflation, 2))}, ${inlineMath("\\pi^T=" + formatMathPercent(inflationTarget, 0))}, and output gap = ${inlineMath(formatMathSignedPercent(outputGap))}. Calculate the prescribed policy rate ${inlineMath("i")}.`,
        answer: answer(
          policyRate,
          "percent",
          2,
          "%",
          "Enter the policy rate as a percentage rounded to 2 decimal places.",
        ),
        workedSolution: [
          `Formula: ${inlineMath("i=4+1.5(\\pi-\\pi^T)+0.5(\\text{output gap})")}.`,
          `Inflation gap = ${inlineMath(formatMathPercent(inflation, 2) + "-" + formatMathPercent(inflationTarget, 0) + " = " + formatMathNumber(inflation - inflationTarget, 2))} percentage points.`,
          `${inlineMath("i=4+1.5(" + formatMathNumber(inflation - inflationTarget, 2) + ")+0.5(" + formatMathNumber(outputGap, 0) + ")")}.`,
          finalLine("Prescribed policy rate", policyRate, "%", 2),
        ],
        explanation:
          "The response term uses the inflation gap, while the second response term uses the signed output gap.",
        commonTrap: trap("ch07-023"),
        parameters: { inflationTarget, inflation, outputGap, policyRate },
      };
    },
  ),
  defineTemplate(
    { id: "generated-pae-with-real-rate", reviewCardId: "ch08-003" },
    (random) => {
      const consumptionIntercept = random.integer(12, 30) * 10;
      const consumptionSlope = random.pick([0.4, 0.5, 0.6, 0.7, 0.8]);
      const consumptionRateCoefficient = random.integer(1, 3) * 5;
      const investmentIntercept = random.integer(5, 12) * 10;
      const investmentRateCoefficient = random.integer(1, 4) * 5;
      const target = random.pick(["intercept", "rate_coefficient"] as const);
      const combinedIntercept = consumptionIntercept + investmentIntercept;
      const combinedRateCoefficient = -(
        consumptionRateCoefficient + investmentRateCoefficient
      );
      const targetValue =
        target === "intercept" ? combinedIntercept : combinedRateCoefficient;
      const targetLabel =
        target === "intercept" ? "Combined autonomous intercept" : "Coefficient on r";
      const targetDisplayUnit =
        target === "intercept" ? "$ million" : "$ million per percentage point";
      const targetUnit =
        target === "intercept"
          ? "currency_millions"
          : "currency_millions_per_percentage_point";
      return {
        prompt: `Consumption is ${inlineMath("C=" + formatMathNumber(consumptionIntercept) + "+" + formatMathNumber(consumptionSlope, 2) + "Y-" + formatMathNumber(consumptionRateCoefficient) + "r")} and investment is ${inlineMath("I=" + formatMathNumber(investmentIntercept) + "-" + formatMathNumber(investmentRateCoefficient) + "r")}. After combining C and I into PAE, what is the ${target === "intercept" ? "combined autonomous intercept" : "coefficient on r"}?${target === "rate_coefficient" ? " Include its sign." : ""}`,
        answer: answer(
          targetValue,
          targetUnit,
          0,
          targetDisplayUnit,
          `Give the ${target === "intercept" ? "combined autonomous intercept" : "coefficient on r"} to the nearest whole ${targetDisplayUnit}.`,
        ),
        workedSolution: [
          `Formula: ${inlineMath("PAE = C + I")}.`,
          `Substitute the generated equations: ${inlineMath("PAE=(" + formatMathNumber(consumptionIntercept) + "+" + formatMathNumber(consumptionSlope, 2) + "Y-" + formatMathNumber(consumptionRateCoefficient) + "r)+(" + formatMathNumber(investmentIntercept) + "-" + formatMathNumber(investmentRateCoefficient) + "r)")}.`,
          `Combine like terms: ${inlineMath("PAE=" + formatMathNumber(combinedIntercept) + "+" + formatMathNumber(consumptionSlope, 2) + "Y-(" + formatMathNumber(consumptionRateCoefficient) + "+" + formatMathNumber(investmentRateCoefficient) + ")r=" + formatMathNumber(combinedIntercept) + "+" + formatMathNumber(consumptionSlope, 2) + "Y" + signedTerm(combinedRateCoefficient) + "r")}.`,
          finalLine(targetLabel, targetValue, ` ${targetDisplayUnit}`, 0),
        ],
        explanation:
          "The canonical skill is combining the autonomous terms and both real-rate coefficients before any equilibrium or point evaluation.",
        commonTrap: trap("ch08-003"),
        parameters: {
          consumptionIntercept,
          consumptionSlope,
          consumptionRateCoefficient,
          investmentIntercept,
          investmentRateCoefficient,
          target,
          combinedIntercept,
          combinedRateCoefficient,
        },
      };
    },
  ),
  defineTemplate(
    { id: "generated-ad-substitution", reviewCardId: "ch08-005" },
    (random) => {
      const equilibriumIntercept = random.integer(5, 9) * 100;
      const equilibriumRateCoefficient = random.pick([50, 60, 75, 80, 90, 100]);
      const policyIntercept = random.pick([0.5, 1, 1.5, 2, 2.5]);
      const policyInflationCoefficient = random.pick([0.25, 0.5, 0.75, 1]);
      const target = random.pick(["intercept", "inflation_coefficient"] as const);
      const adIntercept =
        equilibriumIntercept - equilibriumRateCoefficient * policyIntercept;
      const adInflationCoefficient = -(
        equilibriumRateCoefficient * policyInflationCoefficient
      );
      const targetValue = target === "intercept" ? adIntercept : adInflationCoefficient;
      const targetLabel =
        target === "intercept" ? "AD intercept" : "AD coefficient on \\(\\pi\\)";
      const targetDisplayUnit =
        target === "intercept" ? "$ million" : "$ million per percentage point";
      const targetUnit =
        target === "intercept"
          ? "currency_millions"
          : "currency_millions_per_percentage_point";
      return {
        prompt: `Equilibrium output is ${inlineMath("Y=" + formatMathNumber(equilibriumIntercept) + "-" + formatMathNumber(equilibriumRateCoefficient) + "r")} and the policy reaction function is ${inlineMath("r=" + formatMathNumber(policyIntercept, 2) + "+" + formatMathNumber(policyInflationCoefficient, 2) + "\\pi")}. After substituting the PRF into the output relation, what is the ${target === "intercept" ? "AD intercept" : "coefficient on π"}?${target === "inflation_coefficient" ? " Include its sign." : ""}`,
        answer: answer(
          targetValue,
          targetUnit,
          1,
          targetDisplayUnit,
          `Give the ${target === "intercept" ? "AD intercept" : "coefficient on π"} to 1 decimal place in ${targetDisplayUnit}.`,
        ),
        workedSolution: [
          `Formula: substitute ${inlineMath("r=r_0+\\gamma\\pi")} into ${inlineMath("Y=A-B\\,r")}.`,
          `${inlineMath("Y=" + formatMathNumber(equilibriumIntercept) + "-" + formatMathNumber(equilibriumRateCoefficient) + "(" + formatMathNumber(policyIntercept, 2) + "+" + formatMathNumber(policyInflationCoefficient, 2) + "\\pi)")}.`,
          `AD equation: ${inlineMath("Y=(" + formatMathNumber(equilibriumIntercept) + "-" + formatMathNumber(equilibriumRateCoefficient) + "\\times" + formatMathNumber(policyIntercept, 2) + ")-(" + formatMathNumber(equilibriumRateCoefficient) + "\\times" + formatMathNumber(policyInflationCoefficient, 2) + ")\\pi=" + formatMathNumber(adIntercept, 1) + signedTerm(adInflationCoefficient, 1) + "\\pi")}.`,
          finalLine(targetLabel, targetValue, ` ${targetDisplayUnit}`, 1),
        ],
        explanation:
          "The canonical skill is deriving the AD intercept and inflation coefficient by distributing the output equation across the PRF, not evaluating the equation at one inflation observation.",
        commonTrap: trap("ch08-005"),
        parameters: {
          equilibriumIntercept,
          equilibriumRateCoefficient,
          policyIntercept,
          policyInflationCoefficient,
          target,
          adIntercept,
          adInflationCoefficient,
        },
      };
    },
  ),
  defineTemplate({ id: "generated-aud-to-usd", reviewCardId: "ch09-019" }, (random) => {
    const exchangeRate = random.pick([0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85]);
    const australianDollars = random.integer(8, 60) * 10;
    const usDollars = exchangeRate * australianDollars;
    return {
      prompt: `The course quote is ${inlineMath("e=" + formatMathNumber(exchangeRate, 2) + "\\,\\mathrm{USD/AUD}")}. How many US dollars does A$${formatNumber(australianDollars)} buy?`,
      answer: answer(
        usDollars,
        "currency",
        2,
        "US$",
        "Enter the US-dollar amount rounded to 2 decimal places.",
      ),
      workedSolution: [
        `Quote convention: ${inlineMath("e=\\mathrm{USD/AUD}")}.`,
        `${inlineMath("\\mathrm{USD} = \\mathrm{AUD}\\times(\\mathrm{USD/AUD}) = " + formatMathNumber(australianDollars) + "\\times" + formatMathNumber(exchangeRate, 2))}.`,
        finalLine("US-dollar value", usDollars, " US$", 2),
      ],
      explanation:
        "Multiplying by USD per AUD cancels AUD and leaves a US-dollar amount.",
      commonTrap: trap("ch09-019"),
      parameters: { exchangeRate, australianDollars, usDollars },
    };
  }),
  defineTemplate({ id: "generated-usd-to-aud", reviewCardId: "ch09-020" }, (random) => {
    const exchangeRate = random.pick([0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85]);
    const australianDollars = random.integer(8, 60) * 10;
    const usDollars = exchangeRate * australianDollars;
    return {
      prompt: `The course quote is ${inlineMath("e=" + formatMathNumber(exchangeRate, 2) + "\\,\\mathrm{USD/AUD}")}. How many Australian dollars are needed for US$${formatNumber(usDollars, 2)}?`,
      answer: answer(
        australianDollars,
        "currency",
        2,
        "A$",
        "Enter the Australian-dollar amount rounded to 2 decimal places.",
      ),
      workedSolution: [
        `Quote convention: ${inlineMath("e=\\mathrm{USD/AUD}")}.`,
        `${inlineMath("\\mathrm{AUD}=\\frac{\\mathrm{USD}}{\\mathrm{USD/AUD}}=" + formatMathNumber(usDollars, 2) + "\\div" + formatMathNumber(exchangeRate, 2))}.`,
        finalLine("Australian-dollar amount", australianDollars, " A$", 2),
      ],
      explanation:
        "Divide by USD per AUD when converting a US-dollar amount back into Australian dollars.",
      commonTrap: trap("ch09-020"),
      parameters: { exchangeRate, australianDollars, usDollars },
    };
  }),
  defineTemplate({ id: "generated-cross-rate", reviewCardId: "ch09-021" }, (random) => {
    const audUsd = random.pick([0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85]);
    const eurUsd = random.pick([0.95, 1, 1.05, 1.1, 1.15, 1.2, 1.25]);
    const eurPerAud = audUsd / eurUsd;
    return {
      prompt: `If ${inlineMath("1\\,\\mathrm{AUD}=" + formatMathNumber(audUsd, 2) + "\\,\\mathrm{USD}")}, and ${inlineMath("1\\,\\mathrm{EUR}=" + formatMathNumber(eurUsd, 2) + "\\,\\mathrm{USD}")}, calculate how many EUR 1 AUD buys.`,
      answer: answer(
        eurPerAud,
        "ratio",
        4,
        "EUR/AUD",
        "Give the cross rate to 4 decimal places in EUR/AUD.",
      ),
      workedSolution: [
        "Use the shared USD currency to form the cross rate.",
        `${inlineMath("\\mathrm{EUR/AUD}=\\frac{\\mathrm{USD/AUD}}{\\mathrm{USD/EUR}}=" + formatMathNumber(audUsd, 2) + "\\div" + formatMathNumber(eurUsd, 2))}.`,
        finalLine("Cross rate", eurPerAud, " EUR/AUD", 4),
      ],
      explanation:
        "Both quoted rates are expressed against USD, so dividing removes USD and leaves EUR per AUD.",
      commonTrap: trap("ch09-021"),
      parameters: { audUsd, eurUsd, eurPerAud },
    };
  }),
  defineTemplate(
    { id: "generated-loop-exchange-rate", reviewCardId: "ch09-025" },
    (random) => {
      const australianPrice = random.integer(6, 12);
      const usPrice = random.integer(4, 10) * 0.5;
      const exchangeRate = usPrice / australianPrice;
      return {
        prompt: `A comparable good costs A$${formatNumber(australianPrice, 2)} in Australia and US$${formatNumber(usPrice, 2)} in the United States. Under LOOP, calculate the rate that equalises the common-currency price in USD/AUD.`,
        answer: answer(
          exchangeRate,
          "ratio",
          4,
          "USD/AUD",
          "Give the exchange rate to 4 decimal places in USD/AUD.",
        ),
        workedSolution: [
          `LOOP requires ${inlineMath("\\text{Australian price}\\times\\mathrm{USD/AUD}=\\text{US price}")}.`,
          `Therefore ${inlineMath("\\mathrm{USD/AUD}=\\frac{\\text{US price}}{\\text{Australian price}}=" + formatMathNumber(usPrice, 2) + "\\div" + formatMathNumber(australianPrice, 2))}.`,
          finalLine("LOOP exchange rate", exchangeRate, " USD/AUD", 4),
        ],
        explanation:
          "The course quote is foreign currency per Australian dollar, so divide the US price by the Australian price.",
        commonTrap: trap("ch09-025"),
        parameters: { australianPrice, usPrice, exchangeRate },
      };
    },
  ),
  defineTemplate({ id: "generated-rule-of-70", reviewCardId: "ch10-005" }, (random) => {
    const growthRate = random.integer(3, 16) / 2;
    const doublingTime = 70 / growthRate;
    return {
      prompt: `At ${formatPercent(growthRate, 2)} annual real GDP per-capita growth, use the Rule of 70 to estimate how many years living-standard output takes to double.`,
      answer: answer(
        doublingTime,
        "years",
        1,
        "years",
        "Give the estimate to 1 decimal place in years.",
      ),
      workedSolution: [
        `Rule of 70: ${inlineMath("\\text{doubling time}\\approx\\frac{70}{\\text{annual growth rate in percent units}}")}.`,
        `${inlineMath("\\text{doubling time}\\approx\\frac{70}{" + formatMathNumber(growthRate, 2) + "}")}.`,
        finalLine("Estimated doubling time", doublingTime, " years", 1),
      ],
      explanation:
        "The Rule of 70 uses the growth rate written as a number of percentage points, not as a decimal fraction.",
      commonTrap: trap("ch10-005"),
      parameters: { growthRate, doublingTime },
    };
  }),
  defineTemplate({ id: "generated-tfp-growth", reviewCardId: "ch10-026" }, (random) => {
    const outputGrowth = random.integer(2, 16) / 2;
    const capitalGrowth = random.integer(-2, 12) / 2;
    const labourGrowth = random.integer(-2, 12) / 2;
    const alpha = random.pick([0.2, 0.25, 0.3, 0.35, 0.4]);
    const tfpGrowth = outputGrowth - alpha * capitalGrowth - (1 - alpha) * labourGrowth;
    return {
      prompt: `Output grows by ${inlineMath(formatMathPercent(outputGrowth, 2))}, capital grows by ${inlineMath(formatMathPercent(capitalGrowth, 2))}, labour grows by ${inlineMath(formatMathPercent(labourGrowth, 2))}, and ${inlineMath("\\alpha=" + formatMathNumber(alpha, 2))}. Calculate TFP growth using growth accounting.`,
      answer: answer(
        tfpGrowth,
        "percent",
        2,
        "%",
        "Enter TFP growth as a percentage rounded to 2 decimal places.",
      ),
      workedSolution: [
        `Formula: ${inlineMath("g_A=g_Y-\\alpha g_K-(1-\\alpha)g_L")}.`,
        `Capital contribution = ${inlineMath(formatMathNumber(alpha, 2) + "\\times" + formatMathPercent(capitalGrowth, 2) + " = " + formatMathPercent(alpha * capitalGrowth, 2))} percentage points.`,
        `Labour contribution = ${inlineMath(formatMathNumber(1 - alpha, 2) + "\\times" + formatMathPercent(labourGrowth, 2) + " = " + formatMathPercent((1 - alpha) * labourGrowth, 2))} percentage points.`,
        `${inlineMath("g_A=" + formatMathPercent(outputGrowth, 2) + "-" + formatMathPercent(alpha * capitalGrowth + (1 - alpha) * labourGrowth, 2))}.`,
        finalLine("TFP growth", tfpGrowth, "%", 2),
      ],
      explanation:
        "Capital and labour growth enter as weighted percentage-point contributions; the residual is TFP growth.",
      commonTrap: trap("ch10-026"),
      parameters: { outputGrowth, capitalGrowth, labourGrowth, alpha, tfpGrowth },
    };
  }),
  defineTemplate(
    { id: "generated-output-growth-accounting", reviewCardId: "ch10-027" },
    (random) => {
      const alpha = random.pick([0.2, 0.25, 0.3, 0.35, 0.4]);
      const capitalGrowth = random.integer(-2, 16) / 2;
      const labourGrowth = random.integer(-2, 12) / 2;
      const tfpGrowth = random.integer(-2, 12) / 2;
      const capitalContribution = alpha * capitalGrowth;
      const labourContribution = (1 - alpha) * labourGrowth;
      const outputGrowth = tfpGrowth + capitalContribution + labourContribution;
      return {
        prompt: `In a Cobb–Douglas growth-accounting exercise, ${inlineMath("\\alpha=" + formatMathNumber(alpha, 2))}, capital grows by ${inlineMath(formatMathPercent(capitalGrowth, 2))}, labour grows by ${inlineMath(formatMathPercent(labourGrowth, 2))}, and TFP grows by ${inlineMath(formatMathPercent(tfpGrowth, 2))}. Calculate predicted output growth.`,
        answer: answer(
          outputGrowth,
          "percent",
          2,
          "%",
          "Enter predicted output growth as a percentage rounded to 2 decimal places.",
        ),
        workedSolution: [
          `Formula: ${inlineMath("g_Y=g_A+\\alpha g_K+(1-\\alpha)g_L")}.`,
          `Capital contribution = ${inlineMath(formatMathNumber(alpha, 2) + "\\times" + formatMathPercent(capitalGrowth, 2) + " = " + formatMathPercent(capitalContribution, 2))} percentage points.`,
          `Labour contribution = ${inlineMath(formatMathNumber(1 - alpha, 2) + "\\times" + formatMathPercent(labourGrowth, 2) + " = " + formatMathPercent(labourContribution, 2))} percentage points.`,
          `${inlineMath("g_Y=" + formatMathPercent(tfpGrowth, 2) + "+" + formatMathPercent(capitalContribution, 2) + "+" + formatMathPercent(labourContribution, 2))}.`,
          finalLine("Predicted output growth", outputGrowth, "%", 2),
        ],
        explanation:
          "Growth accounting adds TFP growth to the weighted capital and labour contributions; the weights are not renormalised after the calculation.",
        commonTrap: trap("ch10-027"),
        parameters: { alpha, capitalGrowth, labourGrowth, tfpGrowth, outputGrowth },
      };
    },
  ),
];

// The dedicated command performs the 500-seed audit; this guards the committed
// registry whenever the application imports it at runtime.
validateCalculationTemplateRegistry(calculationTemplates, 2);

export const generatedCalculationTemplates = calculationTemplates;

export function getGeneratedCalculationTemplate(
  id: string,
): CalculationTemplate | undefined {
  return calculationTemplates.find((template) => template.id === id);
}

export function getGeneratedCalculationInstance(
  templateId: string,
  seed: string | number,
): GeneratedCalculationInstance {
  const template = getGeneratedCalculationTemplate(templateId);
  if (template === undefined)
    throw new Error(`Unknown calculation template "${templateId}".`);
  return template.instantiate(seed);
}
