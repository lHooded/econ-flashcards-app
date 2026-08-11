import { cards } from "../data/deck";
import type { Flashcard } from "../domain/content";
import type { KnowledgeContentMap } from "./model";

/*
 * This is the one authored card-to-concept mapping.  Topic rules keep the
 * mapping readable while still producing a stable, bundled map for every
 * canonical card.  The fallback is deliberately permissive: graph readiness
 * is guidance, never a gate that can strand a card.
 */
interface TopicRule {
  readonly needles: readonly string[];
  readonly conceptIds: readonly string[];
}

const topicRules: readonly TopicRule[] = [
  {
    needles: ["ad shift", "ad model", "derive ad"],
    conceptIds: ["aggregate-demand", "ad-shift"],
  },
  {
    needles: ["ad-as", "supply shock", "long-run equilibrium", "self-correction"],
    conceptIds: ["aggregate-demand", "aggregate-supply", "short-run-equilibrium"],
  },
  {
    needles: ["balanced budget"],
    conceptIds: ["balanced-budget-multiplier", "fiscal-policy"],
  },
  {
    needles: [
      "bank money",
      "bank balance",
      "bank lending",
      "bank leverage",
      "bank run",
      "deposit insurance",
      "lender of last",
    ],
    conceptIds: ["bank-balance-sheet", "bank-lending", "money-creation"],
  },
  { needles: ["bond price"], conceptIds: ["bond", "bond-price", "bond-yield"] },
  { needles: ["cobb-douglas"], conceptIds: ["production-function", "cobb-douglas"] },
  {
    needles: ["crowding out"],
    conceptIds: ["saving-investment-equilibrium", "crowding-out"],
  },
  {
    needles: ["current account", "bop"],
    conceptIds: ["balance-of-payments", "current-account", "trade-balance"],
  },
  {
    needles: ["debt"],
    conceptIds: ["debt-stock", "debt-gdp", "debt-dynamics", "debt-sustainability"],
  },
  {
    needles: [
      "exchange rate",
      "appreciation",
      "depreciation",
      "fx market",
      "aud demand",
      "aud supply",
      "peg",
      "ppp",
      "law of one price",
      "currency conversion",
      "cross rate",
    ],
    conceptIds: ["exchange-rate", "nominal-exchange-rate", "foreign-exchange-market"],
  },
  {
    needles: [
      "fiscal multiplier",
      "government spending multiplier",
      "tax multiplier",
      "four-sector multiplier",
    ],
    conceptIds: ["fiscal-policy", "government-spending-multiplier", "tax-multiplier"],
  },
  {
    needles: [
      "fiscal policy",
      "fiscal timing",
      "automatic stabiliser",
      "tax function",
      "budget",
      "golden rule",
      "primary budget",
    ],
    conceptIds: ["fiscal-policy", "tax-function", "budget-balance"],
  },
  {
    needles: [
      "gdp",
      "gross domestic",
      "value added",
      "intermediate",
      "expenditure gdp",
      "income approach",
      "classification",
    ],
    conceptIds: ["gross-domestic-product", "value-added", "expenditure-approach"],
  },
  {
    needles: [
      "growth",
      "cobb",
      "capital deepening",
      "productivity",
      "production function",
      "rule of 70",
      "convergence",
      "innovation",
      "institutions",
      "natural capital",
      "social capital",
      "public-good",
    ],
    conceptIds: ["economic-growth", "production-function", "productivity"],
  },
  {
    needles: [
      "inflation",
      "cpi",
      "price level",
      "deflation",
      "disinflation",
      "menu costs",
      "shoe-leather",
    ],
    conceptIds: ["price-level", "cpi", "inflation"],
  },
  {
    needles: [
      "investment",
      "saving",
      "capital stock",
      "capital accumulation",
      "user cost",
      "wealth",
      "marginal product of capital",
    ],
    conceptIds: ["saving", "macro-investment", "capital-stock"],
  },
  {
    needles: [
      "labour",
      "labor",
      "unemployment",
      "employment",
      "okun",
      "wage",
      "potential output",
      "output gap",
      "discouraged",
    ],
    conceptIds: ["labour-force", "unemployment-rate", "potential-output"],
  },
  {
    needles: [
      "money",
      "quantity theory",
      "quantity equation",
      "velocity",
      "money demand",
      "fiat",
    ],
    conceptIds: ["money", "money-demand", "money-stock"],
  },
  {
    needles: [
      "multiplier",
      "pae",
      "aggregate expenditure",
      "expenditure",
      "consumption function",
      "saving function",
      "45-degree",
      "inventory",
      "paradox of thrift",
    ],
    conceptIds: ["planned-aggregate-expenditure", "pae-equilibrium", "multiplier"],
  },
  {
    needles: ["nominal", "real", "fisher", "interest rate", "zero lower"],
    conceptIds: ["interest-rate", "nominal-interest-rate", "real-interest-rate"],
  },
  {
    needles: [
      "open economy",
      "net exports",
      "imports",
      "exports",
      "small open",
      "investment boom",
    ],
    conceptIds: ["open-economy-pae", "net-exports", "small-open-economy"],
  },
  {
    needles: [
      "cash rate",
      "cash-rate",
      "central bank",
      "rba",
      "corridor",
      "settlement",
      "open-market",
      "reserve demand",
      "monetary transmission",
      "policy reaction",
      "taylor",
      "yield curve",
      "term premium",
      "inflation target",
    ],
    conceptIds: ["central-bank", "cash-rate", "monetary-policy"],
  },
  {
    needles: [
      "supply shock",
      "aggregate supply",
      "adverse supply",
      "favourable supply",
    ],
    conceptIds: ["aggregate-supply", "supply-shock", "short-run-aggregate-supply"],
  },
  { needles: ["taylor"], conceptIds: ["policy-reaction-function", "taylor-rule"] },
];

const fallbackByChapter: Readonly<Record<number, readonly string[]>> = {
  0: ["gross-domestic-product"],
  1: ["gross-domestic-product"],
  2: ["labour-force"],
  3: ["interest-rate"],
  4: ["planned-aggregate-expenditure"],
  5: ["fiscal-policy"],
  6: ["money"],
  7: ["monetary-policy"],
  8: ["aggregate-demand"],
  9: ["exchange-rate"],
  10: ["economic-growth"],
};

function normaliseTopic(topic: string): string {
  return topic
    .toLocaleLowerCase("en-AU")
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function conceptIdsForCard(
  card: Pick<Flashcard, "topic" | "chapter">,
): readonly string[] {
  const topic = normaliseTopic(card.topic);
  if (topic === "depreciation" || topic === "capital depreciation") {
    return card.chapter === 9
      ? ["exchange-rate", "nominal-exchange-rate", "currency-depreciation"]
      : ["capital-stock", "depreciation", "net-investment"];
  }
  const matchingRule = topicRules.find((rule) =>
    rule.needles.some((needle) => topic.includes(needle)),
  );
  return (
    matchingRule?.conceptIds ??
    fallbackByChapter[card.chapter] ?? ["gross-domestic-product"]
  );
}

export const cardConceptMap: KnowledgeContentMap["cards"] = Object.freeze(
  Object.fromEntries(
    cards.map((card) => [card.id, Object.freeze([...conceptIdsForCard(card)])]),
  ),
) as KnowledgeContentMap["cards"];

export function conceptIdsForQuestion(reviewCardId: string): readonly string[] {
  return cardConceptMap[reviewCardId] ?? [];
}
