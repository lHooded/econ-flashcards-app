import { examQuestions } from "../exam/questionBank";
import { examSkillById } from "../examYield/skills";
import type { FormulaApplicationFamily, FormulaApplicationQuestionMeta } from "./model";

const test1 = ["practice-test-1-2026"] as const;
const test2 = ["practice-test-2-2026"] as const;
const test3 = ["practice-test-3-2026"] as const;

const family = (
  id: string,
  label: string,
  chapters: readonly number[],
  examSkillIds: readonly string[],
  cheatSheetSections: readonly string[],
  questionIds: readonly string[],
  practiceEvidenceSourceIds: readonly string[],
): FormulaApplicationFamily => ({
  id,
  label,
  chapters,
  examSkillIds,
  cheatSheetSections,
  questionIds,
  practiceEvidenceSourceIds,
});

export const formulaApplicationFamilies: readonly FormulaApplicationFamily[] =
  Object.freeze([
    family(
      "formula-value-added-chain",
      "Value-added chain",
      [1],
      ["core-gdp-value-added"],
      ["1A", "Q1"],
      ["auth-form-ch01-011"],
      test1,
    ),
    family(
      "formula-real-gdp-base-year",
      "Real GDP at base-year prices",
      [1],
      ["core-gdp-value-added"],
      ["1A", "Q1"],
      ["auth-ch01-005", "auth-form-ch01-012"],
      test1,
    ),
    family(
      "formula-okun-output-gap",
      "Okun output-gap calculation",
      [2],
      [],
      ["2A", "Q1"],
      ["auth-form-ch02-012"],
      test1,
    ),
    family(
      "formula-fisher-real-rate",
      "Fisher nominal-to-real interest rate",
      [3],
      ["core-fisher-real-rate"],
      ["3A", "Q1"],
      ["auth-ch03-001", "auth-stim-ch03-003", "auth-form-ch03-011"],
      test1,
    ),
    family(
      "formula-investment-user-cost-table",
      "Investment table: MPK, VMPK and user cost",
      [3],
      ["core-investment-user-cost"],
      ["3C", "3D", "T1"],
      ["auth-form-ch03-012"],
      test1,
    ),
    family(
      "formula-national-saving",
      "National-saving identity",
      [3],
      [],
      ["3E", "Q1"],
      ["auth-ch03-008", "auth-form-ch03-013"],
      test1,
    ),
    family(
      "formula-pae-equilibrium",
      "Linear PAE equilibrium",
      [4],
      ["core-pae-multiplier-inventories"],
      ["4A", "Q1"],
      ["auth-ch04-004", "auth-ch04-007", "auth-stim-ch04-003", "auth-form-ch04-011"],
      test1,
    ),
    family(
      "formula-mpc-and-fiscal-multiplier",
      "MPC and tax-adjusted fiscal multipliers",
      [5],
      ["very-high-fiscal-multipliers-stabilisers"],
      ["5A", "5B", "Q2"],
      ["auth-ch05-001", "auth-form-ch05-012", "auth-form-ch05-013"],
      test2,
    ),
    family(
      "formula-tax-schedule",
      "Progressive tax: total, average and marginal rates",
      [5],
      ["very-high-fiscal-multipliers-stabilisers"],
      ["5C", "Q2"],
      ["auth-form-ch05-014"],
      test2,
    ),
    family(
      "formula-output-gap-fiscal-closure",
      "Fiscal change needed to close an output gap",
      [5],
      ["very-high-fiscal-multipliers-stabilisers"],
      ["5D", "Q2"],
      ["auth-form-ch05-015"],
      test2,
    ),
    family(
      "formula-budget-debt-constraint",
      "Government budget constraint and debt financing",
      [5],
      ["very-high-budget-debt-sustainability"],
      ["5F", "5G", "T2"],
      ["auth-ch05-009", "auth-ch05-011", "auth-stim-ch05-003", "auth-form-ch05-016"],
      test2,
    ),
    family(
      "formula-quantity-theory",
      "Quantity equation and velocity",
      [6],
      [],
      ["6A", "Q2"],
      ["auth-form-ch06-013"],
      test2,
    ),
    family(
      "formula-bond-return-and-corridor",
      "Bond, share return and cash-rate arithmetic",
      [6, 7],
      ["core-bond-price-yield", "very-high-rba-corridor-omo"],
      ["6F", "7A", "7H", "Q2"],
      ["auth-ch06-001", "auth-ch06-002", "auth-ch07-004"],
      test2,
    ),
    family(
      "formula-esa-transaction-chain",
      "Government payment and OMO ESA arithmetic",
      [7],
      ["very-high-rba-corridor-omo"],
      ["7A", "T2"],
      ["auth-form-ch07-013"],
      test2,
    ),
    family(
      "formula-ad-prf-equilibrium",
      "PAE plus PRF: calculate, rearrange and derive AD",
      [8],
      ["critical-ad-prf-quantitative-chain"],
      ["8D", "8E", "Q3"],
      ["auth-ch08-001", "auth-ch08-003", "auth-form-ch08-012", "auth-form-ch08-013"],
      test3,
    ),
    family(
      "formula-ad-long-run-inflation",
      "AD point calculation and long-run inflation",
      [8],
      ["critical-ad-prf-quantitative-chain", "critical-ad-as-self-correction"],
      ["8D", "8F", "Q3"],
      ["auth-form-ch08-014"],
      test3,
    ),
    family(
      "formula-currency-conversion",
      "Bilateral currency conversion",
      [9],
      ["critical-fx-quotes-and-market"],
      ["9A", "Q3"],
      ["auth-ch09-005"],
      test3,
    ),
    family(
      "formula-cross-rate",
      "Cross exchange rate",
      [9],
      ["critical-fx-quotes-and-market"],
      ["9A", "Q3"],
      ["auth-ch09-006"],
      test3,
    ),
    family(
      "formula-real-exchange-rate",
      "Real exchange rate with explicit quotation",
      [9],
      ["critical-real-versus-nominal-exchange-rate"],
      ["9C", "Q3"],
      ["auth-form-ch09-016"],
      test3,
    ),
    family(
      "formula-bop-current-account",
      "Full current-account component calculation",
      [9],
      ["critical-bop-current-account"],
      ["9J", "T3"],
      ["auth-ch09-013"],
      test3,
    ),
    family(
      "formula-fixed-peg-intervention",
      "Fixed-peg excess demand and intervention",
      [9],
      ["critical-fixed-peg-intervention"],
      ["9F", "9I", "T3"],
      ["auth-form-ch09-014"],
      test3,
    ),
    family(
      "formula-small-open-accounting",
      "Small-open saving, investment and current account",
      [9],
      ["very-high-small-open-fiscal", "critical-bop-current-account"],
      ["9J", "9L", "Q3"],
      ["auth-form-ch09-015"],
      test3,
    ),
    family(
      "formula-cobb-douglas-output",
      "Cobb-Douglas output substitution",
      [10],
      ["critical-cobb-douglas-production"],
      ["10C", "Q3"],
      ["auth-ch10-006", "auth-form-ch10-015"],
      test3,
    ),
    family(
      "formula-cobb-douglas-marginal-products",
      "Cobb-Douglas MPK and MPL application",
      [10],
      ["critical-cobb-douglas-production"],
      ["10C", "Q3"],
      ["auth-form-ch10-013", "auth-form-ch10-014"],
      test3,
    ),
    family(
      "formula-growth-accounting",
      "Growth-accounting contributions and TFP residual",
      [10],
      ["critical-growth-accounting-tfp"],
      ["10D", "Q3"],
      ["auth-stim-ch10-003"],
      test3,
    ),
    family(
      "formula-capital-deepening-tfp",
      "Numeric capital deepening versus TFP",
      [10],
      ["critical-capital-versus-technology"],
      ["10E", "10F", "Q3"],
      ["auth-form-ch10-016"],
      test3,
    ),
  ]);

const meta = (
  familyId: string,
  questionId: string,
  form: string,
  practiceEvidenceSourceIds: readonly string[],
  analogueNote: string,
): FormulaApplicationQuestionMeta => ({
  familyId,
  questionId,
  form,
  practiceEvidenceSourceIds,
  analogueNote,
});

export const formulaApplicationQuestionMeta: readonly FormulaApplicationQuestionMeta[] =
  Object.freeze([
    meta(
      "formula-value-added-chain",
      "auth-form-ch01-011",
      "multi-stage value-added table",
      test1,
      "Authored from the observed production-chain calculation form; wording and values are original.",
    ),
    meta(
      "formula-real-gdp-base-year",
      "auth-ch01-005",
      "base-price times current-quantity table",
      test1,
      "Reused existing calculation with the same base-year-price application form.",
    ),
    meta(
      "formula-real-gdp-base-year",
      "auth-form-ch01-012",
      "base-price times current-quantity table",
      test1,
      "Authored analogue with new goods, values and wording.",
    ),
    meta(
      "formula-okun-output-gap",
      "auth-form-ch02-012",
      "unemployment deviation to output gap",
      test1,
      "Authored analogue of the observed coefficient-and-sign calculation form.",
    ),
    meta(
      "formula-fisher-real-rate",
      "auth-ch03-001",
      "nominal and inflation inputs to real rate",
      test1,
      "Reused authored calculation matching the observed Fisher substitution form.",
    ),
    meta(
      "formula-fisher-real-rate",
      "auth-stim-ch03-003",
      "table-based expected real-rate calculation",
      test1,
      "Reused existing stimulus calculation; it is not an official practice question.",
    ),
    meta(
      "formula-fisher-real-rate",
      "auth-form-ch03-011",
      "exact Fisher calculation",
      test1,
      "Authored analogue using changed rates and original distractor phrasing.",
    ),
    meta(
      "formula-investment-user-cost-table",
      "auth-form-ch03-012",
      "investment table with VMPK versus user cost",
      test1,
      "Authored analogue of the observed marginal-investment table form.",
    ),
    meta(
      "formula-national-saving",
      "auth-ch03-008",
      "national-saving identity substitution",
      test1,
      "Reused existing calculation; current course identity remains authoritative.",
    ),
    meta(
      "formula-national-saving",
      "auth-form-ch03-013",
      "national-saving accounting identity",
      test1,
      "Authored compact identity application with original values.",
    ),
    meta(
      "formula-pae-equilibrium",
      "auth-ch04-004",
      "linear PAE equilibrium",
      test1,
      "Reused existing linear-equilibrium application.",
    ),
    meta(
      "formula-pae-equilibrium",
      "auth-ch04-007",
      "open-economy PAE equilibrium",
      test1,
      "Reused existing calculation with the observed equation-solving form.",
    ),
    meta(
      "formula-pae-equilibrium",
      "auth-stim-ch04-003",
      "table-based open-economy multiplier",
      test1,
      "Reused existing table calculation, not presented as official source material.",
    ),
    meta(
      "formula-pae-equilibrium",
      "auth-form-ch04-011",
      "linear PAE equilibrium",
      test1,
      "Authored analogue with changed coefficients and distractor errors.",
    ),
    meta(
      "formula-mpc-and-fiscal-multiplier",
      "auth-ch05-001",
      "tax function and disposable-income calculation",
      test2,
      "Reused existing fiscal arithmetic form.",
    ),
    meta(
      "formula-mpc-and-fiscal-multiplier",
      "auth-form-ch05-012",
      "MPC from observed changes",
      test2,
      "Authored analogue using a changed observed-change ratio.",
    ),
    meta(
      "formula-mpc-and-fiscal-multiplier",
      "auth-form-ch05-013",
      "proportional-tax government multiplier",
      test2,
      "Authored analogue of the repeatedly observed multiplier form.",
    ),
    meta(
      "formula-tax-schedule",
      "auth-form-ch05-014",
      "progressive tax table: total and average",
      test2,
      "Authored table analogue with new brackets and original distractors.",
    ),
    meta(
      "formula-output-gap-fiscal-closure",
      "auth-form-ch05-015",
      "required fiscal change to close gap",
      test2,
      "Authored analogue using a new gap and multiplier.",
    ),
    meta(
      "formula-budget-debt-constraint",
      "auth-ch05-009",
      "debt sustainability calculation",
      test2,
      "Reused existing authored calculation as a budget/debt application.",
    ),
    meta(
      "formula-budget-debt-constraint",
      "auth-ch05-011",
      "budget-balance arithmetic",
      test2,
      "Reused existing authored calculation form.",
    ),
    meta(
      "formula-budget-debt-constraint",
      "auth-stim-ch05-003",
      "debt-to-GDP table",
      test2,
      "Reused existing table calculation, not represented as official wording.",
    ),
    meta(
      "formula-budget-debt-constraint",
      "auth-form-ch05-016",
      "government borrowing with interest",
      test2,
      "Authored budget-constraint table analogue with explicit sign convention.",
    ),
    meta(
      "formula-quantity-theory",
      "auth-form-ch06-013",
      "MV = PY velocity substitution",
      test2,
      "Authored compact quantity-equation analogue.",
    ),
    meta(
      "formula-bond-return-and-corridor",
      "auth-ch06-001",
      "gross and net share return",
      test2,
      "Reused existing return calculation.",
    ),
    meta(
      "formula-bond-return-and-corridor",
      "auth-ch06-002",
      "bond present value",
      test2,
      "Reused existing present-value calculation.",
    ),
    meta(
      "formula-bond-return-and-corridor",
      "auth-ch07-004",
      "cash-rate corridor arithmetic",
      test2,
      "Reused existing corridor calculation.",
    ),
    meta(
      "formula-esa-transaction-chain",
      "auth-form-ch07-013",
      "government payment plus OMO table",
      test2,
      "Authored analogue with explicit banking-system perspective.",
    ),
    meta(
      "formula-ad-prf-equilibrium",
      "auth-ch08-001",
      "PAE equilibrium with real rate",
      test3,
      "Reused current course calculation form.",
    ),
    meta(
      "formula-ad-prf-equilibrium",
      "auth-ch08-003",
      "derive AD after PRF substitution",
      test3,
      "Reused current course derivation/application form.",
    ),
    meta(
      "formula-ad-prf-equilibrium",
      "auth-form-ch08-012",
      "PRF then PAE equilibrium",
      test3,
      "Authored analogue of the complete current-course chain.",
    ),
    meta(
      "formula-ad-prf-equilibrium",
      "auth-form-ch08-013",
      "reverse-solve real rate from output",
      test3,
      "Authored reverse-calculation analogue.",
    ),
    meta(
      "formula-ad-long-run-inflation",
      "auth-form-ch08-014",
      "AD point plus long-run inflation",
      test3,
      "Authored analogue keeping the course-specific AD interpretation.",
    ),
    meta(
      "formula-currency-conversion",
      "auth-ch09-005",
      "bilateral conversion with quote units",
      test3,
      "Reused existing currency-conversion calculation.",
    ),
    meta(
      "formula-cross-rate",
      "auth-ch09-006",
      "cross exchange rate",
      test3,
      "Reused existing cross-rate calculation.",
    ),
    meta(
      "formula-real-exchange-rate",
      "auth-form-ch09-016",
      "real exchange rate substitution",
      test3,
      "Authored analogue with explicit units and quote convention.",
    ),
    meta(
      "formula-bop-current-account",
      "auth-ch09-013",
      "full current-account table",
      test3,
      "Reused existing table calculation; no duplicate BOP definition card added.",
    ),
    meta(
      "formula-fixed-peg-intervention",
      "auth-form-ch09-014",
      "peg excess quantity and reserve intervention",
      test3,
      "Authored table analogue with changed quantities.",
    ),
    meta(
      "formula-small-open-accounting",
      "auth-form-ch09-015",
      "CA = S - I numeric application",
      test3,
      "Authored small-open identity analogue.",
    ),
    meta(
      "formula-cobb-douglas-output",
      "auth-ch10-006",
      "output per worker substitution",
      test3,
      "Reused existing production-function calculation.",
    ),
    meta(
      "formula-cobb-douglas-output",
      "auth-form-ch10-015",
      "Cobb-Douglas output powers",
      test3,
      "Authored analogue with exact powers chosen for clean arithmetic.",
    ),
    meta(
      "formula-cobb-douglas-marginal-products",
      "auth-form-ch10-013",
      "numeric MPL",
      test3,
      "Authored MPK/MPL application analogue; not formula recognition.",
    ),
    meta(
      "formula-cobb-douglas-marginal-products",
      "auth-form-ch10-014",
      "numeric MPK",
      test3,
      "Authored MPK/MPL application analogue with a different input.",
    ),
    meta(
      "formula-growth-accounting",
      "auth-stim-ch10-003",
      "growth-accounting table",
      test3,
      "Reused existing growth-accounting calculation.",
    ),
    meta(
      "formula-capital-deepening-tfp",
      "auth-form-ch10-016",
      "capital-per-worker versus A comparison",
      test3,
      "Authored conceptual-numeric comparison of two production-function channels.",
    ),
  ]);

export const formulaApplicationFamilyById: ReadonlyMap<
  string,
  FormulaApplicationFamily
> = new Map(formulaApplicationFamilies.map((item) => [item.id, item]));

export const formulaApplicationMetaByQuestionId: ReadonlyMap<
  string,
  FormulaApplicationQuestionMeta
> = new Map(formulaApplicationQuestionMeta.map((item) => [item.questionId, item]));

export const formulaApplicationQuestionIds: ReadonlySet<string> = new Set(
  formulaApplicationQuestionMeta.map((item) => item.questionId),
);

export function getFormulaFamilyForQuestion(
  questionId: string,
): FormulaApplicationFamily | undefined {
  const meta = formulaApplicationMetaByQuestionId.get(questionId);
  return meta === undefined
    ? undefined
    : formulaApplicationFamilyById.get(meta.familyId);
}

export function assertFormulaApplicationFamiliesUseCurrentData(): void {
  const questionIds = new Set(examQuestions.map((question) => question.id));
  const seenQuestions = new Set<string>();
  for (const item of formulaApplicationFamilies) {
    if (item.questionIds.length === 0) {
      throw new Error(`Formula Application family "${item.id}" has no questions.`);
    }
    for (const skillId of item.examSkillIds) {
      if (!examSkillById.has(skillId)) {
        throw new Error(
          `Formula Application family "${item.id}" references unknown skill "${skillId}".`,
        );
      }
    }
    for (const questionId of item.questionIds) {
      if (!questionIds.has(questionId)) {
        throw new Error(
          `Formula Application family "${item.id}" references unknown question "${questionId}".`,
        );
      }
      if (seenQuestions.has(questionId)) {
        throw new Error(
          `Formula Application question "${questionId}" is assigned to more than one family.`,
        );
      }
      seenQuestions.add(questionId);
      const meta = formulaApplicationMetaByQuestionId.get(questionId);
      if (meta?.familyId !== item.id) {
        throw new Error(
          `Formula Application question "${questionId}" has inconsistent family metadata.`,
        );
      }
    }
  }
  if (seenQuestions.size !== formulaApplicationQuestionMeta.length) {
    throw new Error(
      "Formula Application metadata contains a question not present in a family.",
    );
  }
}
