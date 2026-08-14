import { examSkillById, examSkillEvidence } from "../examYield/skills";
import type {
  CheatSheetClass,
  CheatSheetSkillProfile,
  QuestionStudyWorthinessOverride,
  StudyWorthiness,
} from "./model";

const profile = (
  skillId: string,
  studyWorthiness: StudyWorthiness,
  cheatSheetSections: readonly string[],
  className: CheatSheetClass,
): CheatSheetSkillProfile => ({
  skillId,
  studyWorthiness,
  cheatSheetSections,
  class: className,
});

/**
 * A semantic layer for Super Cram only. These values are study-worthiness
 * heuristics, not exam appearance or recall probabilities.
 */
export const cheatSheetSkillProfiles: readonly CheatSheetSkillProfile[] = Object.freeze(
  [
    profile("critical-ad-as-self-correction", 5, ["8F", "8G"], "reasoning-heavy"),
    profile(
      "critical-supply-shock-policy-tradeoff",
      5,
      ["8H", "8I"],
      "reasoning-heavy",
    ),
    profile("critical-ad-prf-quantitative-chain", 3, ["8D", "8E", "Q3"], "mixed"),
    profile("critical-fx-quotes-and-market", 4, ["9A", "9B", "T3"], "reasoning-heavy"),
    profile("critical-real-versus-nominal-exchange-rate", 3, ["9C", "Q3"], "mixed"),
    profile("critical-loop-ppp-relative-inflation", 3, ["9D", "9E", "Q3"], "mixed"),
    profile("critical-bop-current-account", 3, ["9J", "T3"], "mixed"),
    profile(
      "critical-fixed-peg-intervention",
      5,
      ["9F", "9I", "T3"],
      "reasoning-heavy",
    ),
    profile("critical-speculative-attack-defence", 5, ["9I", "9K"], "reasoning-heavy"),
    profile(
      "critical-cobb-douglas-production",
      2,
      ["10C", "Q3"],
      "lookup-plus-application",
    ),
    profile(
      "critical-growth-accounting-tfp",
      2,
      ["10D", "Q3"],
      "lookup-plus-application",
    ),
    profile("critical-capital-versus-technology", 5, ["10E", "10F"], "reasoning-heavy"),
    profile("critical-trade-weighted-index", 4, ["9G", "9H"], "reasoning-heavy"),
    profile(
      "very-high-growth-living-standards",
      4,
      ["10A", "10B", "10G"],
      "reasoning-heavy",
    ),
    profile("very-high-bank-deposit-creation", 5, ["6A", "6B"], "reasoning-heavy"),
    profile("very-high-bank-risk-chain", 5, ["6C", "6D"], "reasoning-heavy"),
    profile("very-high-money-destruction", 4, ["6E"], "reasoning-heavy"),
    profile("very-high-prf-taylor", 4, ["7D", "7E"], "reasoning-heavy"),
    profile("very-high-zlb-deflation-fisher", 5, ["7F", "7G"], "reasoning-heavy"),
    profile(
      "very-high-monetary-transmission",
      5,
      ["7A", "7B", "7C"],
      "reasoning-heavy",
    ),
    profile("very-high-cash-rate-security-market", 4, ["7H", "7I"], "reasoning-heavy"),
    profile("very-high-small-open-fiscal", 4, ["5J", "9L"], "reasoning-heavy"),
    profile("very-high-rba-corridor-omo", 3, ["7A", "7H", "T2"], "mixed"),
    profile("very-high-growth-convergence", 4, ["10H", "10I"], "reasoning-heavy"),
    profile("core-gdp-value-added", 1, ["1A", "Q1"], "direct-lookup"),
    profile("core-cpi-inflation-deflation", 1, ["1B", "Q1"], "direct-lookup"),
    profile("core-labour-wage-floor", 4, ["2C", "2D"], "reasoning-heavy"),
    profile("core-pae-multiplier-inventories", 3, ["4A", "4B", "Q1"], "mixed"),
    profile("core-investment-user-cost", 3, ["3C", "3D", "T1"], "mixed"),
    profile("very-high-fiscal-multipliers-stabilisers", 3, ["5A", "5B", "Q2"], "mixed"),
    profile("very-high-budget-debt-sustainability", 3, ["5F", "5G", "T2"], "mixed"),
    profile("core-bond-price-yield", 2, ["6F", "Q2"], "lookup-plus-application"),
    profile("core-fisher-real-rate", 1, ["3A", "Q1"], "direct-lookup"),
  ],
);

export const cheatSheetSkillProfileById: ReadonlyMap<string, CheatSheetSkillProfile> =
  new Map(cheatSheetSkillProfiles.map((item) => [item.skillId, item]));

/**
 * Question-level exceptions keep a direct formula substitution separate from
 * a scenario that happens to mention the same canonical concept.
 */
export const questionStudyWorthinessOverrides: readonly QuestionStudyWorthinessOverride[] =
  Object.freeze([
    {
      questionId: "auth-ch10-011",
      studyWorthiness: 1,
      class: "direct-lookup",
      note: "Formula recognition is lookup-skippable; it is not formula application.",
    },
    {
      questionId: "auth-ch09-007",
      studyWorthiness: 1,
      class: "direct-lookup",
      note: "Direct real-exchange-rate formula recognition is not an application task.",
    },
    {
      questionId: "auth-ch08-006",
      studyWorthiness: 5,
      class: "reasoning-heavy",
      note: "The question tests the course-specific PRF-to-PAE causal chain rather than lookup.",
    },
    {
      questionId: "auth-ch09-012",
      studyWorthiness: 5,
      class: "reasoning-heavy",
      note: "Integrated fixed-rate and external-balance reasoning cannot be delegated to a formula line.",
    },
    {
      questionId: "auth-ch09-005",
      studyWorthiness: 1,
      class: "direct-lookup",
      note: "Bilateral currency conversion is a direct quote-and-unit substitution.",
    },
    {
      questionId: "auth-ch09-006",
      studyWorthiness: 1,
      class: "direct-lookup",
      note: "A cross rate is lookupable once the two USD quotes and direction are identified.",
    },
    {
      questionId: "auth-ch09-008",
      studyWorthiness: 1,
      class: "direct-lookup",
      note: "The LOOP-implied rate is a direct relative-price substitution, not FX-market reasoning.",
    },
    {
      questionId: "auth-ch10-006",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "Output-per-worker substitution is mostly carried by the displayed production-function relationship.",
    },
    {
      questionId: "auth-ch03-008",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "Public-saving arithmetic is a short identity application once the course sign convention is identified.",
    },
    {
      questionId: "auth-ch05-001",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "The tax-function calculation is direct substitution rather than fiscal-policy reasoning.",
    },
    {
      questionId: "auth-ch05-009",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "Debt-to-GDP dynamics are a short formula substitution in this question.",
    },
    {
      questionId: "auth-ch05-011",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "Primary and overall budget balances require sign discipline but are direct arithmetic.",
    },
    {
      questionId: "auth-ch06-001",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "The share-return calculation is direct gross/net return substitution.",
    },
    {
      questionId: "auth-ch06-002",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "One-period bond present value is a direct formula substitution.",
    },
    {
      questionId: "auth-ch07-004",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "Corridor floor and ceiling arithmetic is lookupable once width and centre are identified.",
    },
    {
      questionId: "auth-stim-ch04-003",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "This open-economy multiplier item tests formula selection and substitution, not closure reasoning.",
    },
    {
      questionId: "auth-stim-ch05-003",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "The table supplies the debt and GDP values; the ratio is direct substitution.",
    },
    {
      questionId: "auth-form-ch02-012",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "Okun-law substitution is cheap once the course coefficient and gap sign are identified.",
    },
    {
      questionId: "auth-form-ch03-013",
      studyWorthiness: 1,
      class: "direct-lookup",
      note: "The national-saving identity is direct arithmetic when the accounting perspective is stated.",
    },
    {
      questionId: "auth-form-ch04-011",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "This linear PAE equilibrium is direct rearrangement after the correct equilibrium condition is recognised.",
    },
    {
      questionId: "auth-form-ch05-012",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "MPC is a direct change-over-change calculation.",
    },
    {
      questionId: "auth-form-ch05-013",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "The proportional-tax government multiplier is direct formula substitution.",
    },
    {
      questionId: "auth-form-ch05-014",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "Progressive total and average tax require bracket arithmetic but not policy reasoning.",
    },
    {
      questionId: "auth-form-ch05-015",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "Closing the stated gap is a direct gap-over-multiplier calculation.",
    },
    {
      questionId: "auth-form-ch05-016",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "The government borrowing requirement is direct budget-constraint arithmetic.",
    },
    {
      questionId: "auth-form-ch06-013",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "Velocity is a direct quantity-equation rearrangement.",
    },
    {
      questionId: "auth-form-ch09-015",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "The small-open current-account identity is direct substitution when the closure is supplied.",
    },
    {
      questionId: "auth-form-ch09-016",
      studyWorthiness: 2,
      class: "lookup-plus-application",
      note: "The real-exchange-rate calculation is direct formula substitution with an explicit quote.",
    },
  ]);

export const questionStudyWorthinessOverrideById: ReadonlyMap<
  string,
  QuestionStudyWorthinessOverride
> = new Map(questionStudyWorthinessOverrides.map((item) => [item.questionId, item]));

export function getCheatSheetProfile(
  skillId: string,
): CheatSheetSkillProfile | undefined {
  return cheatSheetSkillProfileById.get(skillId);
}

export function assertCheatSheetRegistryUsesCurrentSkills(): void {
  const currentIds = new Set(examSkillEvidence.map((skill) => skill.id));
  const profileIds = new Set(cheatSheetSkillProfiles.map((item) => item.skillId));
  for (const skillId of currentIds) {
    if (!profileIds.has(skillId)) {
      throw new Error(
        `Missing Super Cram cheat-sheet profile for exam skill "${skillId}".`,
      );
    }
  }
  for (const skillId of profileIds) {
    if (!examSkillById.has(skillId)) {
      throw new Error(
        `Super Cram cheat-sheet profile references unknown skill "${skillId}".`,
      );
    }
  }
}
