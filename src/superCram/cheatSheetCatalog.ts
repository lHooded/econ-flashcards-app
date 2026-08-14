/**
 * Static identifiers for the currently supplied two-page ECON1102 cheat sheet.
 * The application stores section IDs, not a copy of the sheet.
 */
export const CHEAT_SHEET_SECTIONS = {
  "1A": "GDP, value added and inventories",
  "1B": "Nominal and real GDP, deflator",
  "1C": "CPI and inflation",
  "1D": "Growth, per-capita output and GNI",
  "1E": "Measurement distinctions",
  "2A": "Labour-force statistics",
  "2B": "Unemployment flows",
  "2C": "Output gap and Okun law",
  "2D": "Labour demand, VMPL and real wage",
  "2E": "Labour shifts and wage-floor rules",
  "3A": "Fisher equation",
  "3B": "Capital accumulation, user cost and investment",
  "3C": "Saving, wealth and disposable income",
  "3D": "National saving and closed economy",
  "3E": "Inflation and investment-table shortcuts",
  "4A": "PAE and inventories",
  "4B": "Consumption, MPC and APC",
  "4C": "Two-sector multiplier",
  "4D": "Open PAE and imports",
  "4E": "Inventories and paradox of thrift",
  "5A": "Tax function",
  "5B": "Fiscal multipliers",
  "5C": "Budget balance and debt",
  "5D": "Debt-to-GDP",
  "5E": "Four-sector PAE and multiplier",
  "5F": "Fiscal rules, lags and stabilisers",
  "5G": "Fiscal calculation capsule",
  "6A": "Present value and bond pricing",
  "6B": "Bank balance sheet and risk ratios",
  "6C": "Money, velocity and quantity theory",
  "6D": "Asset and share returns",
  "6E": "Money functions and demand",
  "6F": "Integrated bank scenario",
  "7A": "Cash-rate corridor, ESA and OMO",
  "7B": "Term structure",
  "7C": "Taylor rule and PRF",
  "7D": "ZLB and real-rate recognition",
  "7E": "RBA facts, corridor and OMO",
  "7F": "Monetary transmission and security-price chain",
  "8A": "Interest-sensitive C/I and PAE",
  "8B": "AD equation",
  "8C": "AS, expectations and self-correction",
  "8D": "AD/PRF numerical shortcut",
  "8E": "AD-AS shock and policy table",
  "8F": "Long-run shock outcomes",
  "9A": "Balance-of-payments accounting",
  "9B": "Small-open saving, investment and NX",
  "9C": "Nominal FX quotation and conversion",
  "9D": "Real exchange rate",
  "9E": "LOOP and PPP",
  "9F": "FX market and fixed peg",
  "9G": "Trade-weighted index",
  "9H": "BOP transaction classification",
  "9I": "FX direction and peg direction",
  "9J": "International calculations and perspective",
  "10A": "Growth and compounding",
  "10B": "Production, Cobb-Douglas and CRS",
  "10C": "MPK and MPL",
  "10D": "Per-worker output, per-capita output and capital deepening",
  "10E": "Growth accounting and TFP",
  "10F": "Factor shares",
  "10G": "Growth concepts",
  "10H": "Growth MCQ distinctions",
  H1: "High-yield chains",
  H2: "Integrated chains",
  E1: "Fast/easy classification",
  E2: "Fast/easy calculation",
  E3: "Fast/easy sign checks",
  M1: "Model selector",
  C1: "Graphs",
  C2: "Shifts",
  T1: "Investment traps",
  T2: "Banking and budget traps",
  T3: "FX and BOP traps",
  T4: "AD-AS and expectations traps",
  T5: "Growth traps",
  Q1: "Stem decoder",
  Q2: "Direction chains",
  Q3: "Calculator recipes",
  Q4: "Ambiguity checks",
} as const;

export type CheatSheetSectionId = keyof typeof CHEAT_SHEET_SECTIONS;

const validSectionIds = new Set<string>(Object.keys(CHEAT_SHEET_SECTIONS));

export function isCheatSheetSectionId(value: string): value is CheatSheetSectionId {
  return validSectionIds.has(value);
}

export function assertValidCheatSheetSections(
  sectionIds: readonly string[],
  context: string,
): asserts sectionIds is readonly CheatSheetSectionId[] {
  for (const sectionId of sectionIds) {
    if (!isCheatSheetSectionId(sectionId)) {
      throw new Error(
        context + ' references unknown cheat-sheet section "' + sectionId + '".',
      );
    }
  }
}
