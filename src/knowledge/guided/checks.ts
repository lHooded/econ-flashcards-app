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
  readonly requiredConceptIds?: readonly string[];
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
  requiredConceptIds: readonly string[],
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
    variants: [
      makeMcqVariant(conceptId, first.requiredConceptIds ?? requiredConceptIds, first),
      makeMcqVariant(
        conceptId,
        second.requiredConceptIds ?? requiredConceptIds,
        second,
      ),
    ],
  };
}

function makeMcqVariant(
  conceptId: string,
  requiredConceptIds: readonly string[],
  draft: McqDraft,
): GuidedMcqVariant {
  const shift = stableChoiceShift(draft.id, draft.choices.length);
  const choices = draft.choices.map(
    (_, index) =>
      draft.choices[(index - shift + draft.choices.length) % draft.choices.length],
  );
  return Object.freeze({
    kind: "mcq",
    id: `${guidedCheckIdForConcept(conceptId)}:${draft.id}`,
    fingerprint: `${guidedCheckIdForConcept(conceptId)}:${draft.id}:${draft.prompt}`,
    requiredConceptIds: Object.freeze([...requiredConceptIds]),
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
  const marked = 10 + (Math.abs(seed * 17) % 8) * 5;
  return {
    kind: "calculation",
    id: `${guidedCheckIdForConcept("percentage")}:generated:${seed}`,
    fingerprint: `percentage-out-of-100:${marked}`,
    requiredConceptIds: [],
    prompt: `There are ${marked} marked squares among 100 squares. What percentage of the squares are marked?`,
    answer: marked,
    unit: "percent",
    decimals: 0,
    tolerance: 0.01,
    explanation: `A percentage says how many out of every 100. So ${marked} marked squares out of 100 is ${marked}%.`,
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
    requiredConceptIds: [],
    prompt: `A tray has ${left} red objects and ${right} blue objects. What is the ratio of red objects to blue objects, written as red objects per blue object?`,
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
  generated("percentage", "percentage-out-of-100", percentageGenerator),
  mcqPair(
    "percentage-point",
    ["percentage"],
    {
      id: "rate-difference",
      prompt: "A reported rate rises from 5% to 7%. What is the arithmetic change?",
      choices: [
        "2 percentage points",
        "2% relative to the old rate",
        "12 percentage points",
        "7 percentage points",
      ],
      correctChoice: 0,
      explanation:
        "Subtracting two percentages gives a percentage-point change: 7% − 5% = 2 percentage points.",
    },
    {
      id: "inflation-difference",
      prompt: "A reported rate falls from 6% to 3%. Which statement is correct?",
      choices: [
        "It fell by 3 percentage points",
        "It fell by 3% of the old rate",
        "It rose by 3 percentage points",
        "It fell by 3 units of currency",
      ],
      correctChoice: 0,
      explanation:
        "The reported rate changed by 3 percentage points: 6% − 3% = 3 percentage points.",
    },
  ),
  generated("ratio", "ratio-per-unit", ratioGenerator),
  mcqPair(
    "rate",
    ["ratio"],
    {
      id: "interest-per-period",
      prompt: "A machine makes 10 parts in 2 hours. What is its rate of production?",
      choices: [
        "5 parts per hour",
        "20 parts per hour",
        "2 parts per hour",
        "10 hours per part",
      ],
      correctChoice: 0,
      explanation:
        "A rate compares an amount with a time period: 10 ÷ 2 = 5 parts per hour.",
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
    ["market", "buyer", "seller"],
    {
      id: "unit-price",
      prompt: "In an ordinary market, what does the price of a good tell you?",
      choices: [
        "How much money is exchanged for one unit",
        "How many units exist in total",
        "The number of sellers",
        "The colour of the good",
      ],
      correctChoice: 0,
      explanation:
        "Price is the money amount exchanged per unit; it is distinct from total expenditure or wealth.",
    },
    {
      id: "price-versus-quantity",
      prompt:
        "A buyer sees $5 per notebook on a shop label. What does the $5 represent?",
      choices: [
        "The price of one notebook",
        "The total number of notebooks in the shop",
        "The buyer's total resources",
        "The shop's total number of workers",
      ],
      correctChoice: 0,
      explanation:
        "Price is the money amount attached to one unit. A total number of units is a separate quantity.",
      requiredConceptIds: ["buyer"],
    },
  ),
  mcqPair(
    "quantity",
    [],
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
    ["buyer", "seller"],
    {
      id: "exchange",
      prompt: "What makes a market in the basic economic sense?",
      choices: [
        "Buyers and sellers interact to exchange a good or service",
        "Only a physical shop with a cash register",
        "A person's private collection of objects",
        "A single seller acting alone",
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
        "A private list of belongings",
        "A single household budget",
        "A delivery receipt",
      ],
      correctChoice: 0,
      explanation:
        "The platform connects buyers and sellers, so it is a market even though it is online.",
    },
  ),
  mcqPair(
    "buyer",
    [],
    {
      id: "buyer-role",
      prompt: "In a market, a buyer is the participant who:",
      choices: [
        "Wants to acquire the good or service",
        "Offers the good for sale",
        "Repairs the seller's equipment",
        "Writes the seller's receipt",
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
        "A repair decision",
        "A transport decision",
      ],
      correctChoice: 0,
      explanation:
        "The household is acting as the buyer and choosing a quantity to acquire.",
    },
  ),
  mcqPair(
    "seller",
    [],
    {
      id: "seller-role",
      prompt: "In a market, a seller is the participant who:",
      choices: [
        "Offers the good or service",
        "Must be the final consumer",
        "Must be the only buyer",
        "Counts the number of households",
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
        "A buyer-side choice",
        "A weather observation",
      ],
      correctChoice: 0,
      explanation: "The bakery is the seller deciding how much output to offer.",
    },
  ),
  mcqPair(
    "supply",
    ["market", "price", "quantity"],
    {
      id: "supply-meaning",
      prompt: "In a basic supply schedule, supply describes:",
      choices: [
        "How much sellers are willing and able to offer at different prices",
        "How much buyers want at different prices",
        "The number of buyers in a market",
        "The amount of time in a day",
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
        "A reduction in supply",
        "A change in the number of buyers only",
      ],
      correctChoice: 0,
      explanation:
        "A production-cost change shifts supply; a price change for bread would normally move along supply.",
    },
  ),
  mcqPair(
    "demand",
    ["market", "price", "quantity"],
    {
      id: "demand-meaning",
      prompt: "In a basic demand schedule, demand describes:",
      choices: [
        "How much buyers are willing and able to buy at different prices",
        "How much sellers have already produced",
        "How much sellers are willing to offer",
        "The number of shops in the market",
      ],
      correctChoice: 0,
      explanation:
        "Demand is the buyer-side relationship between a possible price and quantity wanted.",
    },
    {
      id: "demand-shift",
      prompt:
        "If a change other than the meal's own price makes households want more restaurant meals at every price, demand:",
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
    ["supply", "demand", "quantity"],
    {
      id: "market-clearing",
      prompt: "A market equilibrium is a price and quantity at which:",
      choices: [
        "Quantity supplied equals quantity demanded",
        "Every buyer gets every item they want",
        "Every seller makes the same amount",
        "The market has no price",
      ],
      correctChoice: 0,
      explanation:
        "Equilibrium is the market-clearing point where the two sides agree on the traded quantity.",
    },
    {
      id: "equilibrium-price",
      prompt:
        "If a market price is below the price at which quantity supplied equals quantity demanded, the market is not yet:",
      choices: [
        "At equilibrium",
        "A market",
        "Able to have buyers",
        "Able to have sellers",
      ],
      correctChoice: 0,
      explanation:
        "A price below the clearing price creates excess demand, so it is not the equilibrium price.",
    },
  ),
  mcqPair(
    "shortage",
    ["supply", "demand"],
    {
      id: "excess-demand",
      prompt: "A shortage occurs when:",
      choices: [
        "Quantity demanded is greater than quantity supplied",
        "Quantity supplied is greater than quantity demanded",
        "Everyone gets exactly the amount they want",
        "No one wants the good",
      ],
      correctChoice: 0,
      explanation:
        "At the current price, buyers want more than sellers offer, so some buyers cannot obtain the good.",
    },
    {
      id: "ticket-shortage",
      prompt:
        "Concert tickets have many more people wanting tickets than there are seats at the current price. This is:",
      choices: ["A shortage", "A surplus", "Equilibrium", "No market exists"],
      correctChoice: 0,
      explanation:
        "Demand exceeds supply at the stated price, which is the definition of a shortage.",
    },
  ),
  mcqPair(
    "surplus",
    ["supply", "demand"],
    {
      id: "excess-supply",
      prompt: "A surplus occurs when:",
      choices: [
        "Quantity supplied is greater than quantity demanded",
        "Quantity demanded is greater than quantity supplied",
        "Everyone gets exactly the amount they want",
        "No seller offers the good",
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
        "A buyer's decision",
        "A change in the weather",
      ],
      correctChoice: 0,
      explanation:
        "Unsold goods indicate quantity supplied exceeds quantity demanded at that price.",
    },
  ),
  mcqPair(
    "income",
    ["flow"],
    {
      id: "income-flow",
      prompt: "Income is best understood as:",
      choices: [
        "A flow of money or resources received over a period",
        "A single payment made at one instant",
        "The number of goods on a shelf",
        "The amount of time in a day",
      ],
      correctChoice: 0,
      explanation:
        "Income arrives over time; wealth is a stock measured at a point in time.",
    },
    {
      id: "wage-income",
      prompt: "A worker's weekly pay is an example of:",
      choices: ["Income", "A quantity of goods", "A market location", "A time period"],
      correctChoice: 0,
      explanation: "Pay received for labour is income during the week.",
    },
  ),
  mcqPair(
    "expenditure",
    ["flow"],
    {
      id: "spending-flow",
      prompt: "Expenditure means:",
      choices: [
        "Spending on goods or services during a period",
        "The number of goods owned at one date",
        "The number of sellers in a market",
        "The length of a time period",
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
        "Income received",
        "The number of haircuts available",
        "A buyer's name",
      ],
      correctChoice: 0,
      explanation: "The payment is spending on a service during the period.",
    },
  ),
  mcqPair(
    "lending",
    ["asset", "flow"],
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
      prompt:
        "Alex gives Sam $100 now under an agreement that Sam repays Alex later. Alex is:",
      choices: [
        "Lending",
        "Buying an item for immediate use",
        "Receiving a payment for work",
        "Counting objects in a group",
      ],
      correctChoice: 0,
      explanation:
        "Giving funds now in exchange for repayment later is lending. A bond is one more formal example of that time-transfer relationship.",
    },
  ),
  mcqPair(
    "index",
    ["ratio", "price", "quantity"],
    {
      id: "base-value",
      prompt: "An index is useful because it:",
      choices: [
        "Summarises a changing quantity relative to a chosen reference",
        "Must always equal a dollar price",
        "Must always count people",
        "Is a physical object that cannot change",
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
        "The indexed quantity is 20 index points above its base-period level",
        "The quantity is exactly $120",
        "The indexed quantity is 20 index points below its base-period level",
        "The index must be unchanged",
      ],
      correctChoice: 0,
      explanation:
        "The base is normalised to 100, so 120 is 20 index points above the base. The meaning of the original quantity still depends on what the index measures.",
    },
  ),
  mcqPair(
    "graph-intercept",
    ["graph-axis"],
    {
      id: "y-intercept",
      prompt: "A line crosses the vertical axis at y = 5. What is its y-intercept?",
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
        "How many points are on the line?",
        "Which colour is the line?",
      ],
      correctChoice: 0,
      explanation: "An intercept is found by setting the other axis variable to zero.",
    },
  ),
  mcqPair(
    "income-approach",
    ["gross-domestic-product", "income", "value-added"],
    {
      id: "income-gdp",
      prompt: "The income approach to GDP measures current production by adding:",
      choices: [
        "Income generated by production, such as payments to workers and owners",
        "Only one person's spending",
        "Only goods produced in another country",
        "The number of workers in a firm",
      ],
      correctChoice: 0,
      explanation:
        "The income approach totals incomes generated in producing final output.",
    },
    {
      id: "same-production",
      prompt:
        "A bakery pays workers and owners while producing bread. Why can adding those payments help measure the bread produced?",
      choices: [
        "The payments are income generated by the current production",
        "Payments are never connected with production",
        "Only the bakery's building is counted as output",
        "The amount produced cannot be measured",
      ],
      correctChoice: 0,
      explanation:
        "Current production generates payments to participants such as workers and owners. Adding those production incomes gives the income-side measure of output.",
    },
  ),
  mcqPair(
    "exports",
    ["gross-domestic-product", "expenditure", "market"],
    {
      id: "foreign-buyer",
      prompt:
        "An Australian firm produces wine and sells it to a buyer overseas. In GDP expenditure accounting, the wine is:",
      choices: [
        "An export",
        "An import",
        "A domestic sale only",
        "A payment unrelated to production",
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
        "The item is never produced",
        "The seller changes its opening hours",
      ],
      correctChoice: 0,
      explanation:
        "The production location and foreign buyer are the relevant export features.",
    },
  ),
  mcqPair(
    "disinflation",
    ["inflation", "price-level", "percentage-point"],
    {
      id: "slower-rise",
      prompt:
        "Inflation falls from 6% to 3% while the price level keeps rising. This is:",
      choices: [
        "Disinflation",
        "Deflation",
        "A fall in the price level",
        "No change in the inflation rate",
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
    ["stock"],
    {
      id: "headcount",
      prompt: "Population is a measure of:",
      choices: [
        "How many people are in the defined group",
        "How much each person eats",
        "The number of hours in a day",
        "The colour of the group's buildings",
      ],
      correctChoice: 0,
      explanation:
        "Population is a people count; per-capita measures use it as a denominator.",
    },
    {
      id: "per-capita",
      prompt:
        "A town has 100 residents and later has 120 residents. What happened to its population?",
      choices: [
        "It increased by 20 people",
        "It decreased by 20 people",
        "It stayed at 100 people",
        "It became a price",
      ],
      correctChoice: 0,
      explanation:
        "Population is a headcount. Moving from 100 to 120 residents is an increase of 20 people.",
    },
  ),
  mcqPair(
    "working-age-population",
    ["population", "stock"],
    {
      id: "labour-container",
      prompt: "The working-age population can include people who:",
      choices: [
        "Have a job, are looking for a job, or are not active in the job market",
        "All have a job",
        "Are all looking for a job",
        "Are all too young to work",
      ],
      correctChoice: 0,
      explanation:
        "Working age is the statistical container; labour-force participation is a separate classification.",
    },
    {
      id: "not-everyone-active",
      prompt:
        "Why is the working-age population a wider group than people active in the job market?",
      choices: [
        "Some working-age people are neither working nor looking for a job",
        "The wider group counts only prices",
        "Every working-age person is automatically active",
        "The two groups always mean exactly the same thing",
      ],
      correctChoice: 0,
      explanation:
        "People outside the labour force are within working age but are not employed or unemployed under the survey definition.",
    },
  ),
  mcqPair(
    "expectations",
    [],
    {
      id: "future-belief",
      prompt: "In macroeconomics, expectations are best understood as:",
      choices: [
        "Beliefs about future economic conditions that can affect current decisions",
        "Guaranteed future outcomes",
        "A record of only past events",
        "A synonym for a current object",
      ],
      correctChoice: 0,
      explanation:
        "Expected inflation, income, or rates can change contracts and spending before the future outcome is known.",
    },
    {
      id: "expected-inflation",
      prompt:
        "Someone believes that bus fares will be higher next year. What does this belief represent?",
      choices: [
        "An expectation about a future condition",
        "A guaranteed observation of the future",
        "A count of today's buses",
        "A payment already received",
      ],
      correctChoice: 0,
      explanation:
        "An expectation is a belief about what may happen in the future; it is not the future outcome itself.",
    },
  ),
  mcqPair(
    "wage",
    ["income", "price"],
    {
      id: "labour-payment",
      prompt: "A wage is a payment for:",
      choices: [
        "Labour services",
        "A random number",
        "A shop's opening hours",
        "A list of household objects",
      ],
      correctChoice: 0,
      explanation:
        "Wages compensate workers for supplying labour; interest compensates lending and rent pays for property use.",
    },
    {
      id: "real-wage-context",
      prompt:
        "A worker receives $30 for one hour of labour. What is the $30 payment called?",
      choices: ["A wage", "A quantity of goods", "A market location", "A time period"],
      correctChoice: 0,
      explanation:
        "A wage is a payment for labour. Calling it nominal becomes useful when distinguishing the money amount from its purchasing power.",
    },
  ),
  mcqPair(
    "credit",
    ["borrowing", "lending", "bank"],
    {
      id: "borrow-now",
      prompt: "Credit is most directly connected with:",
      choices: [
        "The ability or arrangement to obtain funds now and repay later",
        "A count of objects on a shelf",
        "A time of day",
        "A person's height",
      ],
      correctChoice: 0,
      explanation:
        "Credit makes borrowing and repayment arrangements possible; it is a financial relationship, not current output itself.",
    },
    {
      id: "credit-constraint",
      prompt:
        "A bank refuses a requested loan because it doubts the household can repay. What does this show about credit?",
      choices: [
        "Access to borrowing is limited",
        "The household has received a payment",
        "The bank has sold a good",
        "The household's population has changed",
      ],
      correctChoice: 0,
      explanation:
        "Credit concerns the ability to borrow and repay. When a lender refuses the loan, access to borrowing is limited.",
    },
  ),
  mcqPair(
    "catch-up-growth",
    ["convergence", "technology-ideas", "institutions-property-rights"],
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
        "If a poorer country's output grows faster than a richer country's output for many years, what can happen?",
      choices: [
        "The poorer country's output level can move closer to the richer country's level",
        "The poorer country's output level must move farther away",
        "Both output levels must become zero",
        "The comparison becomes impossible immediately",
      ],
      correctChoice: 0,
      explanation:
        "A persistent difference in growth rates changes the two output levels at different speeds, allowing the initially poorer country to narrow the gap.",
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
