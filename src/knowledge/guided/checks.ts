import { knowledgeConceptById, knowledgeConcepts } from "../data";
import type { KnowledgeConcept } from "../model";
import {
  guidedCheckIdForConcept,
  type GuidedCalculationVariant,
  type GuidedCheckGenerator,
  type GuidedCheckVariant,
  type GuidedKnowledgeCheckSkill,
  type GuidedMcqVariant,
} from "./model";

interface McqDraft {
  readonly id: string;
  readonly prompt: string;
  readonly choices: readonly string[];
  readonly correctChoice: number;
  readonly explanation: string;
}

function concept(conceptId: string): KnowledgeConcept {
  const value = knowledgeConceptById.get(conceptId);
  if (value === undefined)
    throw new Error(`Missing guided-check concept: ${conceptId}`);
  return value;
}

function mcqPair(
  conceptId: string,
  first: McqDraft,
  second: McqDraft,
): GuidedKnowledgeCheckSkill {
  const current = concept(conceptId);
  return {
    id: guidedCheckIdForConcept(conceptId),
    conceptId,
    kind: "mcq",
    chapter: current.chapters[0] ?? 0,
    tags: [...current.tags, "guided-check"],
    sourceRefs: current.sourceRefs,
    variants: [makeMcqVariant(conceptId, first), makeMcqVariant(conceptId, second)],
  };
}

function makeMcqVariant(conceptId: string, draft: McqDraft): GuidedMcqVariant {
  const shift = stableChoiceShift(draft.id, draft.choices.length);
  const choices = draft.choices.map(
    (_, index) =>
      draft.choices[(index - shift + draft.choices.length) % draft.choices.length],
  );
  return Object.freeze({
    kind: "mcq",
    id: `${guidedCheckIdForConcept(conceptId)}:${draft.id}`,
    fingerprint: `${guidedCheckIdForConcept(conceptId)}:${draft.id}:${draft.prompt}`,
    prompt: draft.prompt,
    choices: Object.freeze(choices),
    correctChoice: (draft.correctChoice + shift) % draft.choices.length,
    explanation: draft.explanation,
  });
}

function stableChoiceShift(id: string, choiceCount: number): number {
  let total = 0;
  for (const character of id) total += character.codePointAt(0) ?? 0;
  return choiceCount === 0 ? 0 : total % choiceCount;
}

function generated(
  conceptId: string,
  generatorId: string,
  generator: GuidedCheckGenerator,
): GuidedKnowledgeCheckSkill {
  const current = concept(conceptId);
  return {
    id: guidedCheckIdForConcept(conceptId),
    conceptId,
    kind: "calculation",
    chapter: current.chapters[0] ?? 0,
    tags: [...current.tags, "guided-check", "calculation"],
    sourceRefs: current.sourceRefs,
    variants: [],
    generator,
    generatorId,
  };
}

function percentageGenerator(seed: number): GuidedCalculationVariant {
  const base = 80 + (Math.abs(seed * 17) % 8) * 10;
  const increase = 10 + (Math.abs(seed * 13) % 7) * 5;
  const answer = roundTo((increase / base) * 100, 1);
  return {
    kind: "calculation",
    id: `${guidedCheckIdForConcept("percentage")}:generated:${seed}`,
    fingerprint: `percentage-increase:${base}:${increase}`,
    prompt: `A price rises from $${base} to $${base + increase}. What is the percentage increase, using the original price as the base?`,
    answer,
    unit: "percent",
    decimals: 1,
    tolerance: 0.06,
    explanation:
      "Percentage change compares the change with the original amount: (new − old) ÷ old × 100.",
  };
}

function ratioGenerator(seed: number): GuidedCalculationVariant {
  const left = 2 + (Math.abs(seed * 11) % 7);
  const right = 2 + (Math.abs(seed * 19) % 5);
  const answer = roundTo(left / right, 2);
  return {
    kind: "calculation",
    id: `${guidedCheckIdForConcept("ratio")}:generated:${seed}`,
    fingerprint: `ratio:${left}:${right}`,
    prompt: `A group contains ${left} buyers and ${right} sellers. What is the ratio of buyers to sellers, written as buyers per seller?`,
    answer,
    unit: "ratio",
    decimals: 2,
    tolerance: 0.011,
    explanation:
      "A ratio compares two quantities by dividing the first quantity by the second.",
  };
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

const skills: readonly GuidedKnowledgeCheckSkill[] = [
  generated("percentage", "percentage-increase", percentageGenerator),
  mcqPair(
    "percentage-point",
    {
      id: "rate-difference",
      prompt: "Unemployment rises from 5% to 7%. What is the arithmetic change?",
      choices: [
        "2 percentage points",
        "2% relative to the old rate",
        "12 percentage points",
        "0.02 percentage points",
      ],
      correctChoice: 0,
      explanation:
        "Subtracting two percentages gives a percentage-point change: 7% − 5% = 2 percentage points.",
    },
    {
      id: "inflation-difference",
      prompt: "Inflation falls from 6% to 3%. Which statement is correct?",
      choices: [
        "It fell by 3 percentage points",
        "Prices fell by 3%",
        "The price level fell by 3 percentage points",
        "It rose by 3 percentage points",
      ],
      correctChoice: 0,
      explanation:
        "The inflation rate changed by 3 percentage points; the price level may still be rising at 3%.",
    },
  ),
  generated("ratio", "ratio-per-unit", ratioGenerator),
  mcqPair(
    "rate",
    {
      id: "interest-per-period",
      prompt:
        "A borrower pays $10 interest on $200 for one year. What is the interest rate for that year?",
      choices: ["5%", "$10", "2000%", "0.05 percentage points"],
      correctChoice: 0,
      explanation:
        "A rate is the payment relative to the principal: 10 ÷ 200 × 100 = 5%.",
    },
    {
      id: "speed-rate",
      prompt: "A train travels 60 kilometres in 2 hours. What is its rate of travel?",
      choices: [
        "30 kilometres per hour",
        "120 kilometres per hour",
        "2 kilometres per hour",
        "60 hours per kilometre",
      ],
      correctChoice: 0,
      explanation:
        "A rate compares an amount with a time period: 60 ÷ 2 = 30 kilometres per hour.",
    },
  ),
  mcqPair(
    "price",
    {
      id: "unit-price",
      prompt: "In an ordinary market, what does the price of a good tell you?",
      choices: [
        "How much money is exchanged for one unit",
        "How many units exist in total",
        "The seller's total income",
        "The buyer's total wealth",
      ],
      correctChoice: 0,
      explanation:
        "Price is the money amount exchanged per unit; it is distinct from total expenditure or wealth.",
    },
    {
      id: "price-versus-quantity",
      prompt:
        "A shop raises its price from $4 to $5 but sells fewer units. Which pair describes the two variables?",
      choices: [
        "Price rose and quantity fell",
        "Price fell and quantity rose",
        "Both price and quantity rose",
        "Neither variable changed",
      ],
      correctChoice: 0,
      explanation:
        "Price is the amount per unit; quantity is the number of units. They can move in opposite directions.",
    },
  ),
  mcqPair(
    "quantity",
    {
      id: "amount",
      prompt: "What does quantity mean in a basic market graph?",
      choices: [
        "The amount of a good or service",
        "The money paid per unit",
        "The seller's profit rate",
        "The total value of all assets",
      ],
      correctChoice: 0,
      explanation:
        "Quantity is a count or amount; price is the separate per-unit money measure.",
    },
    {
      id: "units-sold",
      prompt:
        "A bakery sells 120 loaves this morning. In that statement, 120 is the bakery's:",
      choices: ["Quantity sold", "Price", "Interest rate", "Income tax rate"],
      correctChoice: 0,
      explanation:
        "The number of loaves is the quantity; a price would state money per loaf.",
    },
  ),
  mcqPair(
    "market",
    {
      id: "exchange",
      prompt: "What makes a market in the basic economic sense?",
      choices: [
        "Buyers and sellers interact to exchange a good, service, or asset",
        "Only a physical shop with a cash register",
        "A government list of all prices",
        "A person's private budget",
      ],
      correctChoice: 0,
      explanation:
        "A market is an arrangement through which buyers and sellers interact; it need not be a physical place.",
    },
    {
      id: "online-market",
      prompt:
        "An online platform where households offer and buy second-hand goods is best described as:",
      choices: [
        "A market",
        "A price index",
        "A production function",
        "A capital stock",
      ],
      correctChoice: 0,
      explanation:
        "The platform connects buyers and sellers, so it is a market even though it is online.",
    },
  ),
  mcqPair(
    "buyer",
    {
      id: "buyer-role",
      prompt: "In a market, a buyer is the participant who:",
      choices: [
        "Wants to acquire the good or service",
        "Offers the good for sale",
        "Measures the price level",
        "Creates every bank reserve",
      ],
      correctChoice: 0,
      explanation:
        "A buyer demands or acquires something; the seller supplies or offers it.",
    },
    {
      id: "buyer-demand",
      prompt: "A household deciding how many apples to purchase is making a:",
      choices: [
        "Buyer-side decision",
        "Seller-side production decision",
        "Central-bank reserve decision",
        "GDP deflator calculation",
      ],
      correctChoice: 0,
      explanation:
        "The household is acting as the buyer and choosing a quantity to acquire.",
    },
  ),
  mcqPair(
    "seller",
    {
      id: "seller-role",
      prompt: "In a market, a seller is the participant who:",
      choices: [
        "Offers the good or service",
        "Must be the final consumer",
        "Measures unemployment",
        "Sets the country's money stock by definition",
      ],
      correctChoice: 0,
      explanation: "A seller supplies or offers an item to potential buyers.",
    },
    {
      id: "seller-supply",
      prompt: "A bakery deciding how many loaves to produce for sale is making a:",
      choices: [
        "Seller-side supply decision",
        "Buyer-side consumption decision",
        "Bond-yield calculation",
        "Population estimate",
      ],
      correctChoice: 0,
      explanation: "The bakery is the seller deciding how much output to offer.",
    },
  ),
  mcqPair(
    "supply",
    {
      id: "supply-meaning",
      prompt: "In a basic supply schedule, supply describes:",
      choices: [
        "How much sellers are willing and able to offer at different prices",
        "How much buyers want at different prices",
        "The price level across the economy",
        "The amount of money in bank accounts",
      ],
      correctChoice: 0,
      explanation:
        "Supply is the seller-side relationship between a possible price and quantity offered.",
    },
    {
      id: "supply-shift",
      prompt:
        "A fall in the cost of flour makes bakeries willing to sell more bread at each price. This is:",
      choices: [
        "An increase or rightward shift of supply",
        "A movement caused only by a higher bread price",
        "A fall in demand",
        "A change in the price index",
      ],
      correctChoice: 0,
      explanation:
        "A production-cost change shifts supply; a price change for bread would normally move along supply.",
    },
  ),
  mcqPair(
    "demand",
    {
      id: "demand-meaning",
      prompt: "In a basic demand schedule, demand describes:",
      choices: [
        "How much buyers are willing and able to buy at different prices",
        "How much sellers have already produced",
        "The amount of capital in the economy",
        "The number of people in the labour force",
      ],
      correctChoice: 0,
      explanation:
        "Demand is the buyer-side relationship between a possible price and quantity wanted.",
    },
    {
      id: "demand-shift",
      prompt:
        "If household income rises and households want more restaurant meals at every price, demand:",
      choices: [
        "Shifts outward or to the right",
        "Moves along the same curve only",
        "Becomes supply",
        "Must fall to zero",
      ],
      correctChoice: 0,
      explanation:
        "A determinant other than the meal's own price changes desired quantity at each price, so demand shifts.",
    },
  ),
  mcqPair(
    "equilibrium",
    {
      id: "market-clearing",
      prompt: "A market equilibrium is a price and quantity at which:",
      choices: [
        "Quantity supplied equals quantity demanded",
        "Every person is equally wealthy",
        "Inflation is exactly zero",
        "The government owns every firm",
      ],
      correctChoice: 0,
      explanation:
        "Equilibrium is the market-clearing point where the two sides agree on the traded quantity.",
    },
    {
      id: "equilibrium-price",
      prompt:
        "If a market price is below the price at which quantity supplied equals quantity demanded, the market is not yet:",
      choices: ["At equilibrium", "A market", "Using money", "Able to have buyers"],
      correctChoice: 0,
      explanation:
        "A price below the clearing price creates excess demand, so it is not the equilibrium price.",
    },
  ),
  mcqPair(
    "shortage",
    {
      id: "excess-demand",
      prompt: "A shortage occurs when:",
      choices: [
        "Quantity demanded is greater than quantity supplied",
        "Quantity supplied is greater than quantity demanded",
        "The price level rises forever",
        "A firm owns a machine",
      ],
      correctChoice: 0,
      explanation:
        "At the current price, buyers want more than sellers offer, so some buyers cannot obtain the good.",
    },
    {
      id: "ticket-shortage",
      prompt:
        "Concert tickets are priced below the clearing price and many more people want tickets than there are seats. This is:",
      choices: ["A shortage", "A surplus", "Equilibrium", "Deflation"],
      correctChoice: 0,
      explanation:
        "Demand exceeds supply at the stated price, which is the definition of a shortage.",
    },
  ),
  mcqPair(
    "surplus",
    {
      id: "excess-supply",
      prompt: "A surplus occurs when:",
      choices: [
        "Quantity supplied is greater than quantity demanded",
        "Quantity demanded is greater than quantity supplied",
        "The currency appreciates by definition",
        "Income equals wealth",
      ],
      correctChoice: 0,
      explanation:
        "At the current price, sellers offer more than buyers want to purchase.",
    },
    {
      id: "unsold-stock",
      prompt:
        "A shop has more unsold winter coats than customers want at today's price. This is evidence of:",
      choices: [
        "A surplus",
        "A shortage",
        "A labour-force exit",
        "A current-account deficit",
      ],
      correctChoice: 0,
      explanation:
        "Unsold goods indicate quantity supplied exceeds quantity demanded at that price.",
    },
  ),
  mcqPair(
    "income",
    {
      id: "income-flow",
      prompt: "Income is best understood as:",
      choices: [
        "A flow of money or resources received over a period",
        "The total value of assets minus liabilities at one date",
        "The price of one unit of a good",
        "The number of goods in a warehouse",
      ],
      correctChoice: 0,
      explanation:
        "Income arrives over time; wealth is a stock measured at a point in time.",
    },
    {
      id: "wage-income",
      prompt: "A worker's weekly pay is an example of:",
      choices: ["Income", "A capital stock", "A price index", "A shortage"],
      correctChoice: 0,
      explanation: "Pay received for labour is income during the week.",
    },
  ),
  mcqPair(
    "expenditure",
    {
      id: "spending-flow",
      prompt: "Expenditure means:",
      choices: [
        "Spending on goods, services, or assets during a period",
        "All assets owned at one date",
        "A seller's willingness to supply",
        "The percentage change in prices",
      ],
      correctChoice: 0,
      explanation:
        "Expenditure is a spending flow; its object may be consumption, investment, or another purchase.",
    },
    {
      id: "household-spending",
      prompt: "A household paying for a haircut is recording:",
      choices: [
        "Expenditure",
        "A bond's face value",
        "A labour-force denominator",
        "A stock of capital",
      ],
      correctChoice: 0,
      explanation: "The payment is spending on a service during the period.",
    },
  ),
  mcqPair(
    "lending",
    {
      id: "funds-now",
      prompt:
        "When a lender gives funds now in exchange for promised repayment later, this is:",
      choices: ["Lending", "Consumption only", "A shortage", "A price index"],
      correctChoice: 0,
      explanation:
        "Lending transfers purchasing power through time in exchange for a future payment.",
    },
    {
      id: "bond-lending",
      prompt: "Buying a bond from its issuer is economically closest to:",
      choices: [
        "Lending to the issuer",
        "Buying a loaf for immediate consumption",
        "Creating a labour force",
        "Measuring GDP per capita",
      ],
      correctChoice: 0,
      explanation:
        "The bond buyer provides funds and receives specified future payments.",
    },
  ),
  mcqPair(
    "index",
    {
      id: "base-value",
      prompt: "An index is useful because it:",
      choices: [
        "Summarises a changing quantity relative to a chosen reference",
        "Must always equal a dollar price",
        "Counts only people with jobs",
        "Is the same thing as a percentage point",
      ],
      correctChoice: 0,
      explanation:
        "An index uses a reference convention to make changes in a quantity or group of prices easier to track.",
    },
    {
      id: "index-120",
      prompt:
        "If an index is 100 in its base period and 120 later, what does the later number mean?",
      choices: [
        "The indexed quantity is 20% above its base-period level",
        "The quantity is exactly $120",
        "Inflation is 120 percentage points",
        "The quantity has fallen by 20%",
      ],
      correctChoice: 0,
      explanation:
        "The base is normalised to 100, so 120 represents a level 20% above the base.",
    },
  ),
  mcqPair(
    "graph-intercept",
    {
      id: "y-intercept",
      prompt: "For y = 2x + 5, where does the line cross the y-axis?",
      choices: ["5", "2", "0", "10"],
      correctChoice: 0,
      explanation: "The intercept is the y-value when x = 0, which is 5.",
    },
    {
      id: "zero-input",
      prompt: "A graph's intercept answers which question?",
      choices: [
        "What is the vertical-axis value when the horizontal variable is zero?",
        "How steep is every curve?",
        "What is the percentage change in price?",
        "How many sellers exist?",
      ],
      correctChoice: 0,
      explanation: "An intercept is found by setting the other axis variable to zero.",
    },
  ),
  mcqPair(
    "income-approach",
    {
      id: "income-gdp",
      prompt: "The income approach to GDP measures current production by adding:",
      choices: [
        "Income generated by production, such as wages and profits",
        "Only household shopping",
        "Only imports",
        "The stock of government debt",
      ],
      correctChoice: 0,
      explanation:
        "The income approach totals incomes generated in producing final output.",
    },
    {
      id: "same-production",
      prompt: "Why can the income approach and expenditure approach give the same GDP?",
      choices: [
        "Spending on output becomes income to the participants in producing it",
        "They both count every second-hand sale",
        "Income is always equal to wealth",
        "Imports are always zero",
      ],
      correctChoice: 0,
      explanation:
        "For current production, one person's expenditure is another participant's production income in the accounting identity.",
    },
  ),
  mcqPair(
    "exports",
    {
      id: "foreign-buyer",
      prompt:
        "An Australian firm produces wine and sells it to a buyer overseas. In GDP expenditure accounting, the wine is:",
      choices: [
        "An export",
        "An import",
        "Household consumption by definition",
        "A government deficit",
      ],
      correctChoice: 0,
      explanation:
        "Exports are domestically produced goods or services sold to non-residents.",
    },
    {
      id: "export-location",
      prompt: "Which feature makes a sale an Australian export?",
      choices: [
        "The output is produced in Australia and purchased by a foreign resident",
        "The buyer lives in Australia",
        "The item is second-hand",
        "The seller pays interest",
      ],
      correctChoice: 0,
      explanation:
        "The production location and foreign buyer are the relevant export features.",
    },
  ),
  mcqPair(
    "disinflation",
    {
      id: "slower-rise",
      prompt:
        "Inflation falls from 6% to 3% while the price level keeps rising. This is:",
      choices: [
        "Disinflation",
        "Deflation",
        "A fall in the price level",
        "A 3 percentage-point fall in GDP",
      ],
      correctChoice: 0,
      explanation:
        "Disinflation is slower price-level growth; deflation would require a negative inflation rate.",
    },
    {
      id: "not-deflation",
      prompt: "Which outcome is not necessarily implied by disinflation?",
      choices: [
        "Prices are falling",
        "Inflation is lower",
        "The price-level path is less steep",
        "The inflation rate decreased",
      ],
      correctChoice: 0,
      explanation:
        "Disinflation does not mean the price level falls; it means prices rise more slowly.",
    },
  ),
  mcqPair(
    "population",
    {
      id: "headcount",
      prompt: "Population is a measure of:",
      choices: [
        "How many people are in the defined group",
        "How much each person earns",
        "The price of one currency",
        "The amount of capital per worker",
      ],
      correctChoice: 0,
      explanation:
        "Population is a people count; per-capita measures use it as a denominator.",
    },
    {
      id: "per-capita",
      prompt:
        "If real GDP stays fixed while population rises, real GDP per capita will:",
      choices: [
        "Fall",
        "Rise automatically",
        "Become inflation",
        "Equal the unemployment rate",
      ],
      correctChoice: 0,
      explanation:
        "Real GDP per capita is real GDP divided by population, so a larger denominator lowers it when output is fixed.",
    },
  ),
  mcqPair(
    "working-age-population",
    {
      id: "labour-container",
      prompt: "The working-age population can include people who are:",
      choices: [
        "Employed, unemployed, or outside the labour force",
        "Only employed",
        "Only actively searching",
        "Only retired",
      ],
      correctChoice: 0,
      explanation:
        "Working age is the statistical container; labour-force participation is a separate classification.",
    },
    {
      id: "not-everyone-active",
      prompt: "Why is the working-age population not the same as the labour force?",
      choices: [
        "Some working-age people are neither working nor actively seeking and available",
        "The labour force includes children only",
        "The working-age population counts prices",
        "The two terms always mean exactly the same thing",
      ],
      correctChoice: 0,
      explanation:
        "People outside the labour force are within working age but are not employed or unemployed under the survey definition.",
    },
  ),
  mcqPair(
    "expectations",
    {
      id: "future-belief",
      prompt: "In macroeconomics, expectations are best understood as:",
      choices: [
        "Beliefs about future economic conditions that can affect current decisions",
        "Guaranteed future outcomes",
        "Only past prices",
        "A synonym for current income",
      ],
      correctChoice: 0,
      explanation:
        "Expected inflation, income, or rates can change contracts and spending before the future outcome is known.",
    },
    {
      id: "expected-inflation",
      prompt:
        "If borrowers expect higher future inflation, which contract term may they care about especially?",
      choices: [
        "The purchasing-power value of future repayments",
        "The number of sellers in a market only",
        "The graph intercept by definition",
        "The country's population count",
      ],
      correctChoice: 0,
      explanation:
        "Expected inflation affects how much future dollar payments are expected to buy.",
    },
  ),
  mcqPair(
    "wage",
    {
      id: "labour-payment",
      prompt: "A wage is a payment for:",
      choices: [
        "Labour services",
        "Holding a bond",
        "Owning a house",
        "A country's exports",
      ],
      correctChoice: 0,
      explanation:
        "Wages compensate workers for supplying labour; interest compensates lending and rent pays for property use.",
    },
    {
      id: "real-wage-context",
      prompt: "A nominal wage tells you primarily:",
      choices: [
        "The money payment for labour",
        "How many goods the worker can always buy",
        "The unemployment rate",
        "The firm's capital stock",
      ],
      correctChoice: 0,
      explanation:
        "A nominal wage is measured in money; purchasing power requires comparing it with the price level.",
    },
  ),
  mcqPair(
    "credit",
    {
      id: "borrow-now",
      prompt: "Credit is most directly connected with:",
      choices: [
        "The ability or arrangement to obtain funds now and repay later",
        "A count of final goods",
        "A price index base year",
        "The number of workers employed",
      ],
      correctChoice: 0,
      explanation:
        "Credit makes borrowing and repayment arrangements possible; it is a financial relationship, not current output itself.",
    },
    {
      id: "credit-constraint",
      prompt:
        "A household being denied a loan because the lender doubts repayment ability is facing a:",
      choices: [
        "Credit constraint",
        "Goods surplus",
        "GDP deflator",
        "Labour-force participation rate",
      ],
      correctChoice: 0,
      explanation:
        "A credit constraint limits access to borrowing even if the household wants to spend.",
    },
  ),
  mcqPair(
    "catch-up-growth",
    {
      id: "convergence",
      prompt: "Catch-up growth means a country initially behind the frontier:",
      choices: [
        "Grows faster and narrows the gap under suitable conditions",
        "Must remain permanently behind",
        "Stops using capital",
        "Has zero population",
      ],
      correctChoice: 0,
      explanation:
        "Catch-up is a conditional convergence idea: lower starting productivity can permit faster growth when institutions and technology access support it.",
    },
    {
      id: "growth-rate-gap",
      prompt:
        "Why can a small persistent growth-rate advantage help a poorer country catch up?",
      choices: [
        "Compounding makes the level gap shrink over time",
        "Growth rates never compound",
        "The price level must be zero",
        "Population becomes irrelevant",
      ],
      correctChoice: 0,
      explanation:
        "Repeated differences in growth rates compound into increasingly different output levels.",
    },
  ),
];

const expectedNoCardConceptIds = new Set(
  knowledgeConcepts
    .filter((current) => current.linkedCardIds.length === 0)
    .map((current) => current.id),
);

if (skills.length !== expectedNoCardConceptIds.size) {
  throw new Error(
    `Guided check authoring covers ${skills.length} skills but the graph has ${expectedNoCardConceptIds.size} no-card concepts.`,
  );
}

export const guidedKnowledgeCheckSkills: readonly GuidedKnowledgeCheckSkill[] =
  Object.freeze(skills.map((skill) => Object.freeze(skill)));

export const guidedKnowledgeCheckSkillById: ReadonlyMap<
  string,
  GuidedKnowledgeCheckSkill
> = new Map(guidedKnowledgeCheckSkills.map((skill) => [skill.id, skill]));

export const guidedKnowledgeCheckIds: ReadonlySet<string> = new Set(
  guidedKnowledgeCheckSkills.map((skill) => skill.id),
);

export const guidedKnowledgeCheckConceptIds: ReadonlySet<string> = new Set(
  guidedKnowledgeCheckSkills.map((skill) => skill.conceptId),
);

export function getGuidedCheckSkillsForConcept(
  conceptId: string,
): readonly GuidedKnowledgeCheckSkill[] {
  return guidedKnowledgeCheckSkills.filter((skill) => skill.conceptId === conceptId);
}

export function getGuidedCheckVariant(
  skill: GuidedKnowledgeCheckSkill,
  reviewCount: number,
  sessionSeed = 0,
): GuidedCheckVariant {
  if (skill.generator !== undefined) {
    return skill.generator(stableSeed(skill.id, reviewCount, sessionSeed));
  }
  if (skill.variants.length === 0) {
    throw new Error(`Guided check skill ${skill.id} has no variants.`);
  }
  const index = positiveModulo(reviewCount + sessionSeed, skill.variants.length);
  return skill.variants[index];
}

function stableSeed(skillId: string, reviewCount: number, sessionSeed: number): number {
  let hash = 2166136261;
  for (const character of `${skillId}:${reviewCount}:${sessionSeed}`) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) || 1;
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}
