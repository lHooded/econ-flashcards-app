import { c, L, T } from "./records";

export const foundationRecords = [
  c({
    id: "percentage",
    name: "Percentage",
    aliases: ["percent", "%"],
    searchTerms: ["out of one hundred", "per cent"],
    chapters: [0],
    tags: ["foundation", "math"],
    summary: "A percentage expresses a quantity out of 100.",
    intuition:
      "Saying 25% means 25 for every 100. It is a convenient common scale for comparing quantities of different sizes.",
    explanation: [
      "A percentage is a ratio multiplied by 100. The number before the percent sign is not automatically a percentage-point change; it must describe a relative comparison or share.",
      "In this course, percentages are used for rates such as inflation, unemployment, participation, and growth. Keep the base quantity in mind: a 10% change is calculated relative to the starting value.",
    ],
    whyItMatters:
      "Most macroeconomic rates and changes are reported in percentages, so confusing a percent with a percentage point changes the calculation.",
    prerequisites: [],
    relatedConcepts: ["percentage-change", "percentage-point", "ratio", "rate"],
    sourceRefs: [
      T(19, "The textbook uses market prices to compare unlike quantities."),
    ],
    examples: [
      {
        title: "A share",
        text: "If 20 of 80 workers are unemployed, the unemployment rate is 20/80 × 100 = 25%.",
        takeaway: "The denominator tells you what the percentage is a percentage of.",
      },
    ],
    misconceptions: [
      "A percentage is not the same as a percentage-point difference; 5% and 8% differ by 3 percentage points, but the relative increase is 60%.",
    ],
  }),
  c({
    id: "percentage-change",
    name: "Percentage change",
    aliases: ["percent change", "percentage growth"],
    searchTerms: ["how much did it rise", "how much did it fall", "relative change"],
    chapters: [0],
    tags: ["foundation", "math"],
    summary: "Percentage change compares a change with the original amount.",
    intuition:
      "A $10 rise matters more when the original amount was $20 than when it was $1,000. Percentage change accounts for that starting scale.",
    explanation: [
      "Subtract the old value from the new value, then divide by the old value. Multiply by 100 if you want the answer expressed as a percentage.",
      "A positive result means the level rose and a negative result means it fell. The earlier value is the denominator unless the question specifies another convention.",
    ],
    whyItMatters:
      "Inflation, GDP growth, and many course calculations are percentage changes rather than simple level differences.",
    prerequisites: ["percentage", "ratio"],
    relatedConcepts: ["growth-rate", "percentage-point", "inflation", "gdp-growth"],
    sourceRefs: [
      L(
        "lecture-w1-l1",
        70,
        "The lecture calculates real GDP growth from the previous period.",
      ),
      T(29, "Nominal and real GDP are compared using growth rates."),
    ],
    equations: [
      {
        label: "Percentage change",
        expression: "(new − old) / old × 100",
        variables: [
          { symbol: "new", meaning: "the later level" },
          { symbol: "old", meaning: "the earlier level and denominator" },
        ],
        interpretation:
          "The formula measures the change relative to where the quantity started.",
      },
    ],
    misconceptions: [
      "Do not divide by the new value when the question asks for the change from the old value.",
      "A level increase of 3 is not automatically a 3% increase.",
    ],
  }),
  c({
    id: "percentage-point",
    name: "Percentage point",
    aliases: ["percentage points", "pp"],
    searchTerms: ["difference between two rates", "rate difference"],
    chapters: [0],
    tags: ["foundation", "math", "contrast"],
    summary: "A percentage point is the arithmetic difference between two percentages.",
    intuition:
      "If unemployment moves from 5% to 7%, it rises by 2 percentage points. That is different from saying it rose by 2%.",
    explanation: [
      "Subtract the earlier percentage from the later percentage. Because the inputs are already percentages, no second division by the old rate is needed.",
      "The course uses percentage points when discussing changes in inflation, unemployment, and policy rates.",
    ],
    whyItMatters:
      "It prevents a common exam error: confusing a change in a rate with a relative percentage change in that rate.",
    prerequisites: ["percentage", "percentage-change"],
    relatedConcepts: ["growth-rate", "inflation", "unemployment-rate", "cash-rate"],
    sourceRefs: [
      T(
        40,
        "The inflation chapter distinguishes changes in the price level from inflation rates.",
      ),
    ],
    examples: [
      {
        title: "Interest-rate move",
        text: "A cash-rate target moving from 3.60% to 4.10% is a 0.50 percentage-point increase.",
      },
    ],
  }),
  c({
    id: "ratio",
    name: "Ratio",
    aliases: ["ratios"],
    searchTerms: ["relative amount", "numerator and denominator"],
    chapters: [0],
    tags: ["foundation", "math"],
    summary: "A ratio compares one quantity with another by division.",
    intuition:
      "The denominator tells you the reference group: debt-to-GDP compares debt with the size of the economy, not with zero or with last year’s debt.",
    explanation: [
      "Ratios are dimensionless when the numerator and denominator use the same units, but they can still have an economic interpretation. A ratio can be a share, a rate, or a diagnostic comparison.",
      "Always read the order of the terms. AUD per USD is not the same quotation as USD per AUD.",
    ],
    whyItMatters:
      "Participation, unemployment, debt-to-GDP, and real GDP per person are all built from ratios.",
    prerequisites: [],
    relatedConcepts: ["rate", "percentage", "debt-gdp", "gdp-per-capita"],
    sourceRefs: [
      T(56, "The labour-market table defines rates as ratios of labour-market groups."),
    ],
    equations: [
      {
        label: "Generic ratio",
        expression: "numerator / denominator",
        variables: [
          { symbol: "numerator", meaning: "the quantity being compared" },
          { symbol: "denominator", meaning: "the reference quantity" },
        ],
        interpretation:
          "Changing the denominator changes the meaning even when the numerator is unchanged.",
      },
    ],
  }),
  c({
    id: "rate",
    name: "Rate",
    aliases: ["rates"],
    searchTerms: ["rate per period", "per-year measure"],
    chapters: [0],
    tags: ["foundation", "math"],
    summary: "A rate describes a quantity relative to a base, often over time.",
    intuition:
      "An interest rate says how much extra repayment is associated with borrowing one unit for a period; an unemployment rate says what share of the labour force is unemployed.",
    explanation: [
      "Some rates are ratios of people, such as unemployment. Others are time-based prices, such as an interest rate. The unit and denominator must be stated before interpreting a rate.",
      "A rate can be quoted in percent per year even when the relevant transaction lasts a shorter or longer period; the course’s formula determines how it is applied.",
    ],
    whyItMatters:
      "Macro models contain many rates, and the same word does not tell you whether the denominator is people, dollars, or time.",
    prerequisites: ["ratio"],
    relatedConcepts: [
      "percentage",
      "interest-rate",
      "growth-rate",
      "unemployment-rate",
    ],
    sourceRefs: [
      L(
        "lecture-w1-l2",
        29,
        "The lecture introduces unemployment and participation rates.",
      ),
    ],
  }),
  c({
    id: "growth-rate",
    name: "Growth rate",
    aliases: ["growth", "growth rate"],
    searchTerms: ["rate of increase", "how fast a level changes"],
    chapters: [0],
    tags: ["foundation", "math"],
    summary: "A growth rate is the percentage change in a level between periods.",
    intuition:
      "The level tells you how large the economy is; the growth rate tells you how quickly that size is changing.",
    explanation: [
      "Growth rates are usually reported per quarter or per year. A positive growth rate means the level increased; it does not mean that the level itself is a percentage.",
      "Repeated growth compounds: later growth applies to a larger or smaller base than the original period.",
    ],
    whyItMatters:
      "The course distinguishes GDP levels, GDP growth, inflation, and long-run economic growth throughout Chapters 1 and 10.",
    prerequisites: ["percentage-change", "rate"],
    relatedConcepts: ["gdp-growth", "compound-growth", "inflation", "economic-growth"],
    sourceRefs: [
      L("lecture-w9-l1", 7, "The lecture introduces growth rates and the Rule of 70."),
    ],
    equations: [
      {
        label: "Growth rate",
        expression: "(Yₜ − Yₜ₋₁) / Yₜ₋₁",
        variables: [
          { symbol: "Yₜ", meaning: "current level" },
          { symbol: "Yₜ₋₁", meaning: "previous level" },
        ],
        interpretation:
          "Multiply by 100 to express the rate in percent; the denominator is the previous level.",
      },
    ],
  }),
  c({
    id: "stock",
    name: "Stock",
    aliases: ["stock variable", "stocks"],
    searchTerms: ["measured at a point in time", "balance at a date"],
    chapters: [0],
    tags: ["foundation", "accounting", "contrast"],
    summary: "A stock is measured at a point in time.",
    intuition:
      "A bathtub’s water level is a stock: it is the amount there at a moment, shaped by earlier inflows and outflows.",
    explanation: [
      "Wealth, capital stock, and government debt are stocks. Their values are balances, not amounts produced or spent during a time interval.",
      "A stock can change because of flows. A deficit flow adds to government debt stock, while depreciation and investment change capital stock.",
    ],
    whyItMatters:
      "Many exam traps confuse a deficit with debt or investment with capital; those are flow-versus-stock mistakes.",
    prerequisites: [],
    relatedConcepts: ["flow", "capital-stock", "debt-stock", "wealth"],
    sourceRefs: [
      L(
        "lecture-w2-l2",
        3,
        "The lecture explicitly contrasts investment as a flow with capital as a stock.",
      ),
    ],
    contrasts: [
      {
        conceptId: "flow",
        title: "Stock versus flow",
        difference:
          "A stock is measured at a date; a flow is measured over an interval.",
      },
    ],
  }),
  c({
    id: "flow",
    name: "Flow",
    aliases: ["flow variable", "flows"],
    searchTerms: ["measured over a period", "amount during a period"],
    chapters: [0],
    tags: ["foundation", "accounting", "contrast"],
    summary: "A flow is measured over a period of time.",
    intuition:
      "Water entering a bathtub this minute is a flow. It changes the stock of water, but it is not itself the amount sitting in the tub.",
    explanation: [
      "GDP, income, expenditure, saving, investment, deficits, and exports are flows. Their units need a time window such as per quarter or per year.",
      "Adding compatible flows across periods can produce a longer-period flow; adding a flow to a stock requires an accounting relationship rather than simple comparison.",
    ],
    whyItMatters:
      "The definition of GDP depends on production during a specified period, while capital, money, and debt are balances at a date.",
    prerequisites: [],
    relatedConcepts: ["stock", "gross-domestic-product", "macro-investment", "deficit"],
    sourceRefs: [
      L(
        "lecture-w1-l1",
        44,
        "The lecture labels GDP as production during a period and later calls it a flow.",
      ),
    ],
    contrasts: [
      {
        conceptId: "stock",
        title: "Flow versus stock",
        difference:
          "A flow is measured over an interval; a stock is measured at a point in time.",
      },
    ],
  }),
  c({
    id: "price",
    name: "Price",
    aliases: ["prices"],
    searchTerms: ["dollar price", "what something costs"],
    chapters: [0],
    tags: ["foundation", "market"],
    summary:
      "A price is the amount of money exchanged for one unit of a good, service, or asset.",
    intuition:
      "A price is a signal: it tells a buyer what must be given up and a seller what can be received.",
    explanation: [
      "A single price is a relative price between one item and money. Macroeconomics also studies the general price level, which summarises many prices together.",
      "Prices can change because the item became scarce, because demand changed, or because the value of money changed. A higher individual price is not automatically inflation.",
    ],
    whyItMatters:
      "Nominal GDP, real GDP, CPI, inflation, bond pricing, and exchange rates all require careful separation of prices from quantities.",
    prerequisites: ["market", "buyer", "seller"],
    relatedConcepts: ["quantity", "price-level", "inflation", "nominal"],
    sourceRefs: [T(19, "Market prices weight unlike goods in GDP measurement.")],
  }),
  c({
    id: "quantity",
    name: "Quantity",
    aliases: ["quantities", "amount produced"],
    searchTerms: ["physical amount", "number of units"],
    chapters: [0],
    tags: ["foundation", "market"],
    summary:
      "A quantity is how many units of a good, service, input, or asset are involved.",
    intuition:
      "If a bakery makes 100 loaves instead of 80, output quantity rose even if the dollar price stayed unchanged.",
    explanation: [
      "Quantities are physical or countable amounts. In GDP, quantities are multiplied by prices so different goods can be added in a common monetary unit.",
      "A change in quantity is not the same as a change in price. Real measures aim to track production quantities using fixed or chain-weighted prices.",
    ],
    whyItMatters:
      "The nominal-versus-real distinction asks whether a monetary total changed because quantities changed, prices changed, or both.",
    prerequisites: [],
    relatedConcepts: ["price", "nominal", "real", "gross-domestic-product"],
    sourceRefs: [
      L(
        "lecture-w1-l1",
        23,
        "The GDP definition separates monetary value from physical production.",
      ),
    ],
  }),
  c({
    id: "market",
    name: "Market",
    aliases: ["markets"],
    searchTerms: ["buyers and sellers", "place of exchange"],
    chapters: [0],
    tags: ["foundation", "market"],
    summary:
      "A market is an organised interaction in which buyers and sellers exchange or negotiate over something.",
    intuition:
      "A market need not be a physical place. The bond market, labour market, and foreign-exchange market connect people with something to buy or sell.",
    explanation: [
      "The course models a market using demand from potential buyers and supply from potential sellers. Their interaction helps determine a price and quantity.",
      "Institutions and rules matter: a bank, the RBA, a government, or a trading platform can change what participants can do without being one of the two sides of every transaction.",
    ],
    whyItMatters:
      "The same supply-demand logic reappears in labour, cash, bonds, and foreign exchange, but the object being traded changes.",
    prerequisites: ["buyer", "seller"],
    relatedConcepts: [
      "supply",
      "demand",
      "equilibrium",
      "bond",
      "foreign-exchange-market",
    ],
    sourceRefs: [
      T(70, "The labour-market chapter applies market reasoning to firms and workers."),
    ],
  }),
  c({
    id: "buyer",
    name: "Buyer",
    aliases: ["buyers", "purchaser"],
    searchTerms: ["person who purchases", "demanding side"],
    chapters: [0],
    tags: ["foundation", "market"],
    summary:
      "A buyer is someone who wants to acquire a good, service, asset, or currency.",
    intuition:
      "A buyer compares what something gives them with what it costs, including the opportunity to use their money elsewhere.",
    explanation: [
      "A buyer’s willingness to purchase at different prices contributes to demand. A buyer can be a household, firm, bank, government, or foreign resident.",
      "In finance, a buyer of a bond is lending to the issuer in exchange for future payments; the word buyer does not make the transaction ordinary consumption.",
    ],
    whyItMatters:
      "Identifying who is buying is often the quickest way to determine which side of a market shifts.",
    prerequisites: [],
    relatedConcepts: ["seller", "demand", "asset", "bond"],
    sourceRefs: [
      T(164, "The asset-return chapter describes agents buying financial assets."),
    ],
  }),
  c({
    id: "seller",
    name: "Seller",
    aliases: ["sellers", "supplier"],
    searchTerms: ["person who offers for sale", "supplying side"],
    chapters: [0],
    tags: ["foundation", "market"],
    summary:
      "A seller is someone who offers a good, service, asset, or currency in exchange for payment.",
    intuition:
      "A seller gives up something now because the payment or other exchange is more valuable to them than keeping it.",
    explanation: [
      "A seller’s willingness to provide different quantities at different prices contributes to supply. The seller may be a firm, household, bank, government, or foreign resident.",
      "A bank selling a security and the RBA selling a bond are sellers in an asset market, not sellers of current GDP output.",
    ],
    whyItMatters:
      "Supply shifts and demand shifts have different predicted effects, so naming the seller clarifies the mechanism.",
    prerequisites: [],
    relatedConcepts: ["buyer", "supply", "bond", "foreign-exchange-market"],
    sourceRefs: [
      T(
        198,
        "The cash-market diagrams distinguish supply of ES funds from banks' demand.",
      ),
    ],
  }),
  c({
    id: "supply",
    name: "Supply",
    aliases: ["supply curve", "supplied"],
    searchTerms: ["seller behaviour", "amount sellers offer"],
    chapters: [0],
    tags: ["foundation", "graph"],
    summary:
      "Supply describes how much sellers are willing and able to offer at different prices.",
    intuition:
      "The supply curve is a menu of possible seller quantities, not a prediction that every seller chooses every quantity at once.",
    explanation: [
      "A movement along supply follows from a change in the object’s price. A shift of supply means something else changed, such as input costs, technology, or the number of sellers.",
      "The relationship can differ by market. Do not assume every supply curve slopes upward without checking the model and axes.",
    ],
    whyItMatters:
      "Supply-demand diagrams are used for labour, AUD, and cash-market reasoning in the course.",
    prerequisites: ["market", "price", "quantity"],
    relatedConcepts: [
      "demand",
      "equilibrium",
      "shortage",
      "surplus",
      "aggregate-supply",
    ],
    sourceRefs: [
      T(70, "The labour-market chapter introduces labour demand and supply curves."),
      L("lecture-w8-l2", 46, "The lecture draws supply and demand for the AUD."),
    ],
    misconceptions: [
      "A movement along a supply curve is not the same as a supply shift; the first is caused by the curve's own price variable changing.",
    ],
  }),
  c({
    id: "demand",
    name: "Demand",
    aliases: ["demand curve", "demanded"],
    searchTerms: ["buyer behaviour", "amount buyers want"],
    chapters: [0],
    tags: ["foundation", "graph"],
    summary:
      "Demand describes how much buyers are willing and able to purchase at different prices.",
    intuition:
      "Demand is not just wanting something. It combines desire with the resources and willingness to pay for it.",
    explanation: [
      "A movement along demand follows from a change in the good’s own price. A demand shift means another determinant changed, such as income, tastes, expectations, or the price of a related good.",
      "Demand for money is demand to hold a payment asset; it is not the same as demand for goods and services.",
    ],
    whyItMatters:
      "The course repeatedly asks whether a shock changes a curve or moves the economy along it.",
    prerequisites: ["market", "price", "quantity"],
    relatedConcepts: ["supply", "equilibrium", "money-demand", "aggregate-demand"],
    sourceRefs: [
      T(171, "The textbook shows a demand-for-money curve and its shift."),
      L("lecture-w8-l2", 57, "The lecture derives shifts in AUD demand."),
    ],
    misconceptions: [
      "A higher quantity demanded caused by a lower price is not a demand increase; an increase means the whole curve shifted.",
    ],
  }),
  c({
    id: "equilibrium",
    name: "Equilibrium",
    aliases: ["market equilibrium", "equilibrium point"],
    searchTerms: ["where supply equals demand", "clearing point"],
    chapters: [0],
    tags: ["foundation", "graph"],
    summary:
      "An equilibrium is a situation in which the model's opposing plans are mutually consistent.",
    intuition:
      "At a market equilibrium, the quantity buyers plan to buy matches the quantity sellers plan to sell at the stated price.",
    explanation: [
      "Equilibrium does not mean the outcome is fair, ideal, or permanent. It means the forces represented by the model balance at that point.",
      "In the income-expenditure model, equilibrium means actual output equals planned aggregate expenditure. In the cash market, it means ES-fund demand equals supply at the cash rate.",
    ],
    whyItMatters:
      "Many course calculations are ways of finding the equilibrium level rather than memorising a separate answer.",
    prerequisites: ["supply", "demand", "quantity"],
    relatedConcepts: [
      "shortage",
      "surplus",
      "pae-equilibrium",
      "saving-investment-equilibrium",
    ],
    sourceRefs: [
      T(123, "The 45-degree diagram introduces equilibrium where Y equals PAE."),
      L(
        "lecture-w7-l1",
        50,
        "The cash-market equilibrium pins the actual cash rate to target.",
      ),
    ],
  }),
  c({
    id: "shortage",
    name: "Shortage",
    aliases: ["shortages", "excess demand"],
    searchTerms: ["more wanted than supplied", "not enough available"],
    chapters: [0],
    tags: ["foundation", "market"],
    summary:
      "A shortage occurs when the amount buyers want exceeds the amount sellers offer at a given price.",
    intuition:
      "At that price, some willing buyers cannot obtain the item. Their unmet demand puts pressure on the market to change.",
    explanation: [
      "A shortage is defined relative to a price or other constraint. It is not simply a low quantity and it does not automatically mean supply shifted left.",
      "In an income-expenditure setting, an analogous mismatch can show up as firms selling more than they planned and running down inventories.",
    ],
    whyItMatters:
      "It gives intuition for why an out-of-equilibrium price or quantity can trigger adjustment.",
    prerequisites: ["supply", "demand"],
    relatedConcepts: ["surplus", "equilibrium", "inventory"],
    sourceRefs: [
      T(
        125,
        "The two-sector model illustrates disequilibrium through unexpected inventory changes.",
      ),
    ],
  }),
  c({
    id: "surplus",
    name: "Surplus",
    aliases: ["surpluses", "excess supply"],
    searchTerms: ["more supplied than wanted", "unsold amount"],
    chapters: [0],
    tags: ["foundation", "market"],
    summary:
      "A surplus occurs when sellers offer more than buyers want at a given price.",
    intuition:
      "The unwanted remainder has to be stored, discounted, or taken back, so sellers have a reason to adjust.",
    explanation: [
      "A surplus is a comparison of planned supply and demand at a particular price. It is not the same as a government budget surplus or a current-account surplus.",
      "In the income-expenditure model, excess production relative to planned spending appears as an unplanned inventory accumulation.",
    ],
    whyItMatters:
      "The everyday word surplus is used in several course contexts with different objects and accounting identities.",
    prerequisites: ["supply", "demand"],
    relatedConcepts: ["shortage", "equilibrium", "inventory", "budget-balance"],
    sourceRefs: [
      L(
        "lecture-w3-l1",
        18,
        "The lecture introduces disequilibrium when output and planned expenditure differ.",
      ),
    ],
  }),
  c({
    id: "income",
    name: "Income",
    aliases: ["income earned", "earnings"],
    searchTerms: ["money received", "resources available from production"],
    chapters: [0],
    tags: ["foundation", "accounting"],
    summary: "Income is a flow of resources received during a period.",
    intuition:
      "Income is what arrives during the period; wealth is the stock of valuable assets owned at a point in time.",
    explanation: [
      "Households can receive labour income, capital income, transfers, and other receipts. GDP can also be measured as the income paid for current production.",
      "Disposable income is income after the relevant taxes and transfers in the model. It is the amount that can be allocated between consumption and saving.",
    ],
    whyItMatters:
      "Consumption, household saving, tax functions, and GDP’s income approach all begin with income as a flow.",
    prerequisites: ["flow", "expenditure"],
    relatedConcepts: [
      "wealth",
      "disposable-income",
      "household-saving",
      "gross-domestic-product",
    ],
    sourceRefs: [
      L(
        "lecture-w1-l1",
        53,
        "GDP is also the aggregate income paid to factors of production.",
      ),
      T(97, "The textbook defines disposable income in the saving discussion."),
    ],
  }),
  c({
    id: "expenditure",
    name: "Expenditure",
    aliases: ["spending", "expenditures"],
    searchTerms: ["money spent", "purchases during a period"],
    chapters: [0],
    tags: ["foundation", "accounting"],
    summary:
      "Expenditure is a flow of spending on goods, services, assets, or other uses.",
    intuition:
      "One person’s expenditure is often another person’s income, but the buyer’s purpose still determines the macroeconomic category.",
    explanation: [
      "In GDP accounting, expenditure on final goods and services is grouped into consumption, investment, government spending, and net exports.",
      "Planned expenditure is what agents intend to spend; actual expenditure includes unintended inventory changes. The two can differ in the short run.",
    ],
    whyItMatters:
      "The income-expenditure model turns planned spending into a prediction for short-run output.",
    prerequisites: ["flow"],
    relatedConcepts: [
      "income",
      "planned-aggregate-expenditure",
      "expenditure-approach",
      "consumption",
    ],
    sourceRefs: [
      L("lecture-w1-l1", 49, "The expenditure approach lists the components of GDP."),
      L(
        "lecture-w3-l1",
        10,
        "The lecture distinguishes actual and planned expenditure.",
      ),
    ],
  }),
  c({
    id: "asset",
    name: "Asset",
    aliases: ["assets", "valuable asset"],
    searchTerms: ["something owned that has value", "claim on future resources"],
    chapters: [0],
    tags: ["foundation", "finance"],
    summary:
      "An asset is something owned that provides value now or a claim to future value.",
    intuition:
      "A bank deposit, bond, machine, or house can be an asset to its owner because it provides services or future payments.",
    explanation: [
      "Financial assets are claims issued by someone else; a bond is an asset for its holder and a liability for its issuer. A real asset, such as a machine, is a physical productive resource.",
      "Money is an asset to the holder even though it is also used as a means of payment. Buying an asset is not automatically macroeconomic investment.",
    ],
    whyItMatters:
      "Bond pricing, bank balance sheets, wealth, and money demand depend on who owns which asset and who owes the corresponding liability.",
    prerequisites: [],
    relatedConcepts: ["liability", "bond", "wealth", "money", "macro-investment"],
    sourceRefs: [
      L("lecture-w5-l1", 7, "The lecture introduces assets, claims, and returns."),
      T(164, "The textbook begins its financial-assets chapter with asset returns."),
    ],
  }),
  c({
    id: "liability",
    name: "Liability",
    aliases: ["liabilities", "amount owed"],
    searchTerms: ["debt owed", "claim against an issuer"],
    chapters: [0],
    tags: ["foundation", "finance"],
    summary:
      "A liability is an obligation to make a payment or provide value to someone else.",
    intuition:
      "The same promise is an asset to the person expecting payment and a liability to the person who must pay.",
    explanation: [
      "A loan is a liability for the borrower and an asset for the lender. A bank deposit is a liability of the bank because the bank owes the depositor the balance.",
      "Balance sheets use the identity assets = liabilities + equity. This is a statement of financial position, not a flow of new production.",
    ],
    whyItMatters:
      "Understanding both sides of a balance sheet prevents money creation and bond questions from sounding mysterious.",
    prerequisites: ["asset"],
    relatedConcepts: ["borrowing", "lending", "bank-balance-sheet", "bond"],
    sourceRefs: [
      L(
        "lecture-w5-l1",
        54,
        "The bank balance-sheet slides distinguish liabilities from assets.",
      ),
      T(
        173,
        "The bank-balance-sheet tables show loans and deposits on opposite sides.",
      ),
    ],
  }),
  c({
    id: "borrowing",
    name: "Borrowing",
    aliases: ["borrow", "borrower", "loan"],
    searchTerms: ["getting funds now and repaying later", "taking a loan"],
    chapters: [0],
    tags: ["foundation", "finance"],
    summary:
      "Borrowing obtains resources now in exchange for a promise to repay later.",
    intuition:
      "Borrowing moves purchasing power from the future into the present, but the borrower gives up future payments to do it.",
    explanation: [
      "The amount initially received is the principal. The borrower normally repays principal plus interest, so the cost depends on the interest rate and timing.",
      "Households, firms, banks, and governments can borrow. The economic purpose of the borrowing determines whether the spending is consumption, capital investment, or something else.",
    ],
    whyItMatters:
      "Interest rates matter because they change the price of shifting spending across time through borrowing and lending.",
    prerequisites: ["liability", "flow"],
    relatedConcepts: ["lending", "principal", "interest", "interest-rate", "bond"],
    sourceRefs: [
      L("lecture-w2-l1", 54, "The lecture defines interest rates as returns on loans."),
      T(83, "The interest-rate chapter motivates borrowing and lending across time."),
    ],
  }),
  c({
    id: "lending",
    name: "Lending",
    aliases: ["lend", "lender"],
    searchTerms: ["providing funds now for repayment later", "making a loan"],
    chapters: [0],
    tags: ["foundation", "finance"],
    summary:
      "Lending provides resources now in exchange for a claim on future repayment.",
    intuition:
      "The lender gives up the use of funds today and expects compensation for waiting and for bearing risk.",
    explanation: [
      "The lender’s claim is an asset. The borrower’s matching obligation is a liability. A bond is a tradable way of packaging such a claim.",
      "The return to lending can be quoted as interest dollars, a nominal interest rate, or a yield depending on the asset and price paid.",
    ],
    whyItMatters:
      "The lender’s and borrower’s sides explain why a bond price and its return move in opposite directions.",
    prerequisites: ["asset", "flow"],
    relatedConcepts: ["borrowing", "principal", "interest", "bond", "bond-yield"],
    sourceRefs: [
      T(164, "Financial assets are claims on future payments."),
      L(
        "lecture-w5-l1",
        18,
        "The lecture relates promised payments to an asset return.",
      ),
    ],
  }),
  c({
    id: "principal",
    name: "Principal",
    aliases: ["principal amount", "loan principal", "face amount"],
    searchTerms: ["initial amount lent", "amount borrowed before interest"],
    chapters: [0],
    tags: ["foundation", "finance"],
    summary:
      "Principal is the original amount lent or borrowed, before interest is added.",
    intuition:
      "If a lender advances $1,000, the principal is $1,000 even though the eventual repayment may be larger.",
    explanation: [
      "Interest is calculated in relation to principal, the rate, and the time period. A bond’s face value is the amount promised at maturity and may be the principal originally raised.",
      "Principal is a dollar amount, not a percentage. The interest rate describes the price of using that amount over time.",
    ],
    whyItMatters:
      "Bond and interest calculations become much easier once principal, payment, and rate are kept separate.",
    prerequisites: ["borrowing", "lending"],
    relatedConcepts: ["interest", "interest-rate", "face-value", "bond"],
    sourceRefs: [
      T(165, "The textbook's bond example starts with a principal and a term."),
      L(
        "lecture-w5-l1",
        10,
        "The lecture identifies face value and coupon payments as bond elements.",
      ),
    ],
  }),
  c({
    id: "interest",
    name: "Interest",
    aliases: ["interest payment", "interest payments"],
    searchTerms: ["payment for waiting", "cost of borrowing in dollars"],
    chapters: [0],
    tags: ["foundation", "finance"],
    summary:
      "Interest is the payment associated with using someone else’s funds for a period.",
    intuition:
      "If you borrow $100 and repay $105 a year later, the extra $5 is interest: compensation to the lender and a cost to the borrower.",
    explanation: [
      "Interest is a dollar flow. The interest rate is that flow relative to a principal amount, usually stated per unit of time.",
      "Interest can be quoted on a loan, a deposit, a bond, or another asset. Inflation determines how much the repayment can buy, which motivates real interest rates.",
    ],
    whyItMatters:
      "Interest is the bridge from basic borrowing and lending to nominal rates, real rates, bonds, and monetary policy.",
    prerequisites: ["principal", "flow"],
    relatedConcepts: [
      "interest-rate",
      "nominal-interest-rate",
      "real-interest-rate",
      "bond-yield",
    ],
    sourceRefs: [
      L(
        "lecture-w2-l1",
        54,
        "Nominal interest is introduced as the return on a loan in money terms.",
      ),
      T(84, "The textbook explains interest rates as intertemporal prices."),
    ],
  }),
  c({
    id: "interest-rate",
    name: "Interest rate",
    aliases: ["interest rates", "rate of interest", "cost of borrowing"],
    searchTerms: [
      "cost of borrowing",
      "return on lending",
      "price of shifting spending through time",
    ],
    chapters: [0],
    tags: ["foundation", "finance"],
    summary:
      "An interest rate is interest expressed relative to the amount lent or borrowed for a period.",
    intuition:
      "It is the rental price of funds across time: a higher rate makes borrowing today more expensive and lending today more rewarding, all else equal.",
    explanation: [
      "A rate compares the interest payment with principal and states the time basis. It is not itself the dollar amount of interest.",
      "Nominal rates use money units. Real rates adjust for changes in purchasing power. A cash rate is one particular short-term interest rate in Australia, not a synonym for every interest rate.",
    ],
    whyItMatters:
      "The course uses interest rates to connect households’ saving, firms’ investment, bond prices, the RBA, aggregate demand, and exchange rates.",
    prerequisites: ["interest", "rate", "borrowing", "lending"],
    relatedConcepts: [
      "nominal-interest-rate",
      "real-interest-rate",
      "cash-rate",
      "bond-yield",
      "present-value",
    ],
    sourceRefs: [
      L(
        "lecture-w2-l1",
        54,
        "The lecture distinguishes nominal and real interest rates.",
      ),
      T(84, "Chapter 3 develops the interest rate as an intertemporal price."),
    ],
    equations: [
      {
        label: "Simple interest rate",
        expression: "interest / principal",
        variables: [
          { symbol: "interest", meaning: "interest dollars over the period" },
          { symbol: "principal", meaning: "amount lent or borrowed" },
        ],
        interpretation:
          "Multiply by 100 for a percentage and attach the period, such as per year.",
      },
    ],
    contrasts: [
      {
        conceptId: "cash-rate",
        title: "Interest rate versus cash rate",
        difference:
          "Interest rate is the broad category; the cash rate is the Australian overnight interbank rate targeted by the RBA.",
      },
      {
        conceptId: "nominal-interest-rate",
        title: "Nominal versus real interest rate",
        difference:
          "Nominal is in money terms; real adjusts for inflation and purchasing power.",
      },
    ],
  }),
  c({
    id: "present-value",
    name: "Present value",
    aliases: ["present value", "PV", "discounted value"],
    searchTerms: ["value today of future payment", "discount future money"],
    chapters: [0],
    tags: ["foundation", "finance", "calculation"],
    summary: "Present value converts a future payment into its equivalent value today.",
    intuition:
      "$100 received next year is worth less than $100 today if today’s dollar could earn interest; present value asks how much today would grow into that future amount.",
    explanation: [
      "To value a future payment, discount it using the relevant interest rate. A higher rate makes the same future payment worth less today because more could be earned elsewhere.",
      "A bond’s market price is the present value of its promised payments. This is why the price changes when the market return changes even though the promise may not.",
    ],
    whyItMatters:
      "Present value supplies the mechanical intuition for bond prices, yields, and investment decisions.",
    prerequisites: ["interest-rate", "principal", "algebraic-substitution"],
    relatedConcepts: [
      "bond-price",
      "bond-yield",
      "user-cost-capital",
      "future-payment",
    ],
    sourceRefs: [
      T(
        165,
        "The bond pricing example discounts future coupon and principal payments.",
      ),
      L(
        "lecture-w5-l1",
        18,
        "The lecture calculates a bond price by discounting its promised payment.",
      ),
    ],
    equations: [
      {
        label: "One future payment",
        expression: "PV = F / (1 + i)ᵀ",
        variables: [
          { symbol: "PV", meaning: "value today, in dollars" },
          { symbol: "F", meaning: "future payment, in dollars" },
          { symbol: "i", meaning: "market interest rate per period" },
          { symbol: "T", meaning: "number of periods" },
        ],
        interpretation:
          "The payment is divided by the growth factor it could have earned over T periods.",
      },
    ],
  }),
  c({
    id: "index",
    name: "Index",
    aliases: ["index number", "index numbers"],
    searchTerms: ["base-100 measure", "reference-period measure"],
    chapters: [0],
    tags: ["foundation", "measurement"],
    summary:
      "An index expresses a changing quantity relative to a chosen reference period.",
    intuition:
      "Setting the base period to 100 makes later values easy to read: 110 means the measured basket is 10% higher than in the base period.",
    explanation: [
      "The base value is a convention, not a claim that the economy literally contains 100 units. The index is useful because it summarises movements while preserving relative changes.",
      "CPI and the GDP price index are different indexes because they weight different baskets or outputs.",
    ],
    whyItMatters:
      "Inflation calculations use changes in price indexes, not just changes in individual prices.",
    prerequisites: ["ratio", "price", "quantity"],
    relatedConcepts: ["price-index", "cpi", "gdp-deflator", "inflation"],
    sourceRefs: [
      L("lecture-w1-l2", 4, "The CPI is introduced as a cost-of-basket index."),
      T(39, "The textbook constructs a cost-of-living index."),
    ],
  }),
  c({
    id: "price-index",
    name: "Price index",
    aliases: ["price indexes", "price index"],
    searchTerms: ["overall measure of prices", "basket price measure"],
    chapters: [0],
    tags: ["foundation", "measurement"],
    summary:
      "A price index tracks the cost of a specified basket or set of output prices relative to a base period.",
    intuition:
      "Instead of listing every price separately, an index creates one scale for asking whether the chosen collection became more or less expensive.",
    explanation: [
      "The basket and its weights determine what the index represents. A household-consumption basket creates CPI; an index covering domestically produced final output creates the GDP deflator.",
      "The percentage change in the index is the associated inflation rate. A higher index level is a price level, not automatically a higher inflation rate.",
    ],
    whyItMatters:
      "It is the measurement foundation for CPI, the GDP deflator, inflation, real GDP, and real interest rates.",
    prerequisites: ["index", "price", "quantity"],
    relatedConcepts: ["cpi", "gdp-deflator", "price-level", "inflation", "nominal"],
    sourceRefs: [
      T(39, "The textbook constructs a price index from a basket."),
      L(
        "lecture-w1-l2",
        2,
        "The lecture introduces measures of the aggregate price level.",
      ),
    ],
  }),
  c({
    id: "nominal",
    name: "Nominal",
    aliases: ["nominal terms", "money terms"],
    searchTerms: [
      "current-dollar measure",
      "measured in dollars without price adjustment",
    ],
    chapters: [0],
    tags: ["foundation", "measurement", "contrast"],
    summary:
      "Nominal means measured using the prices or dollars of the period being discussed.",
    intuition:
      "Nominal dollars tell you the money amount on the label; they do not by themselves tell you how much output or purchasing power that amount represents.",
    explanation: [
      "Nominal GDP values current production at current prices. It can rise because production rose, prices rose, or both.",
      "Nominal interest is the promised money return. To ask what the return can buy, compare it with inflation and use a real interest rate.",
    ],
    whyItMatters:
      "Many misleading comparisons disappear once nominal and real measures are separated.",
    prerequisites: ["price", "quantity"],
    relatedConcepts: ["real", "nominal-gdp", "nominal-interest-rate", "price-level"],
    sourceRefs: [
      L("lecture-w1-l1", 61, "The lecture introduces nominal and real GDP."),
      L("lecture-w2-l1", 54, "The lecture introduces nominal and real interest rates."),
      T(29, "The textbook explains nominal and real output measures."),
    ],
    contrasts: [
      {
        conceptId: "real",
        title: "Nominal versus real",
        difference:
          "Nominal uses money values at the relevant prices; real holds prices fixed or otherwise removes price effects to focus on quantities or purchasing power.",
      },
    ],
  }),
  c({
    id: "real",
    name: "Real",
    aliases: ["real terms", "inflation-adjusted"],
    searchTerms: ["constant-price measure", "purchasing-power adjusted"],
    chapters: [0],
    tags: ["foundation", "measurement", "contrast"],
    summary:
      "Real means adjusted so that price changes do not masquerade as changes in quantities or purchasing power.",
    intuition:
      "Real GDP asks how much was produced using a common price yardstick; a real interest rate asks how much extra purchasing power the return provides.",
    explanation: [
      "Real measures are not always literally physical counts. They are constructed monetary measures designed to remove or control for price changes.",
      "The exact formula depends on the course context: real GDP uses constant or chain-weighted prices, while an approximate real interest rate subtracts inflation from the nominal rate.",
    ],
    whyItMatters:
      "The course’s output, interest, exchange-rate, and growth models use real variables to reason about quantities and purchasing power.",
    prerequisites: ["nominal", "price-index"],
    relatedConcepts: [
      "real-gdp",
      "real-interest-rate",
      "real-exchange-rate",
      "inflation",
    ],
    sourceRefs: [
      L(
        "lecture-w1-l1",
        62,
        "The lecture values output at base-year prices to obtain real GDP.",
      ),
      L(
        "lecture-w2-l1",
        56,
        "The lecture defines the real return in purchasing-power terms.",
      ),
      T(86, "The textbook distinguishes ex-post and expected real rates."),
    ],
  }),
  c({
    id: "graph-axis",
    name: "Graph axes",
    aliases: ["axis", "axes", "horizontal axis", "vertical axis"],
    searchTerms: ["x axis", "y axis", "what is plotted"],
    chapters: [0],
    tags: ["foundation", "graph", "math"],
    summary: "Graph axes state which variables are being compared and in what units.",
    intuition:
      "Before following an arrow on a graph, read the labels: the same curve shape can mean opposite economic things if the axes are swapped.",
    explanation: [
      "The horizontal axis normally records the quantity or outcome being chosen, while the vertical axis often records a price, rate, or other determinant, but this is a convention rather than a rule.",
      "Axis labels, scales, and reference lines are part of the model. A point above potential output is not identified by its position on the page alone.",
    ],
    whyItMatters:
      "The course tests graph interpretation, including movements along curves, shifts, output gaps, and exchange-rate quotations.",
    prerequisites: [],
    relatedConcepts: [
      "graph-slope",
      "graph-intercept",
      "supply",
      "demand",
      "aggregate-demand",
    ],
    sourceRefs: [
      T(123, "The 45-degree diagram shows how axes define the equilibrium comparison."),
      L(
        "lecture-w8-l2",
        46,
        "The AUD market graph labels currency price and quantity.",
      ),
    ],
  }),
  c({
    id: "graph-slope",
    name: "Graph slope",
    aliases: ["slope", "gradient"],
    searchTerms: ["rise over run", "steepness of a line"],
    chapters: [0],
    tags: ["foundation", "graph", "math"],
    summary:
      "A graph’s slope describes how the vertical variable changes when the horizontal variable changes.",
    intuition:
      "A negative slope means moving right is associated with moving down, holding the curve’s other conditions fixed.",
    explanation: [
      "Slope is a relationship, not a standalone direction-of-causation claim. The economic model explains why the variables co-move along the curve.",
      "A curve can shift without changing its slope, and a movement along a curve can occur without the curve itself shifting.",
    ],
    whyItMatters:
      "The negative slope of AD and the shape of investment and labour curves encode the mechanism the course asks you to explain.",
    prerequisites: ["graph-axis", "ratio"],
    relatedConcepts: [
      "graph-intercept",
      "aggregate-demand",
      "investment-demand",
      "labour-demand",
    ],
    sourceRefs: [
      T(217, "The textbook derives the downward-sloping AD curve."),
      L("lecture-w7-l2", 8, "The lecture explains the negative slope of AD."),
    ],
  }),
  c({
    id: "graph-intercept",
    name: "Graph intercept",
    aliases: ["intercept", "vertical intercept"],
    searchTerms: ["where a line meets an axis", "starting value on graph"],
    chapters: [0],
    tags: ["foundation", "graph", "math"],
    summary: "An intercept is where a graph crosses one of its axes.",
    intuition:
      "In a linear spending equation, the vertical intercept is the amount spent even when the horizontal variable is zero.",
    explanation: [
      "A change in an autonomous component often shifts a line by changing its intercept. A change in the slope changes how strongly the outcome responds as the horizontal variable changes.",
      "Read the equation and the axes together; an intercept has no meaning apart from the variables being plotted.",
    ],
    whyItMatters:
      "PAE, tax, AD, and growth equations use intercepts and slopes to separate baseline terms from responses.",
    prerequisites: ["graph-axis"],
    relatedConcepts: ["graph-slope", "autonomous-expenditure", "ad-equation"],
    sourceRefs: [
      L(
        "lecture-w3-l1",
        36,
        "The consumption function separates autonomous and income-linked spending.",
      ),
      T(121, "The textbook graphs the consumption function."),
    ],
  }),
  c({
    id: "algebraic-substitution",
    name: "Algebraic substitution",
    aliases: ["substitution", "substitute into an equation"],
    searchTerms: ["plug in values", "replace a variable"],
    chapters: [0],
    tags: ["foundation", "math"],
    summary:
      "Algebraic substitution replaces a variable with an equal expression or known value.",
    intuition:
      "If saving is defined as income minus consumption, putting the consumption formula into that definition reveals the saving equation.",
    explanation: [
      "Substitution preserves equality. Work inside parentheses carefully and keep units consistent when a formula contains rates, levels, or percentages.",
      "The course uses substitution to derive equilibrium output, the AD curve, national saving identities, and growth-accounting expressions.",
    ],
    whyItMatters:
      "Many calculation questions test whether you can move from the model’s definitions to the requested equation.",
    prerequisites: ["ratio"],
    relatedConcepts: [
      "linear-equation",
      "pae-equilibrium",
      "ad-equation",
      "national-saving",
    ],
    sourceRefs: [
      L("lecture-w7-l1", 32, "The lecture substitutes spending functions into PAE."),
      T(217, "The AD equation is derived by combining model relationships."),
    ],
  }),
  c({
    id: "linear-equation",
    name: "Linear equation",
    aliases: ["linear equations", "straight-line equation"],
    searchTerms: ["equation with slope and intercept", "solve for Y"],
    chapters: [0],
    tags: ["foundation", "math"],
    summary:
      "A linear equation describes a variable as a constant plus a fixed response to another variable.",
    intuition:
      "In C = C₀ + cYᴅ, C₀ is the baseline and c tells you how much consumption changes when disposable income changes by one unit.",
    explanation: [
      "The coefficient is a slope or marginal response; the constant is an intercept. Solving a linear equation means isolating the unknown while preserving equality.",
      "Course equations are simplified models. Their coefficients summarise behaviour under stated assumptions; they are not universal physical laws.",
    ],
    whyItMatters:
      "The PAE multiplier and AD derivations are algebraic versions of the same causal story.",
    prerequisites: ["graph-slope", "graph-intercept", "algebraic-substitution"],
    relatedConcepts: [
      "consumption-function",
      "multiplier",
      "ad-equation",
      "tax-function",
    ],
    sourceRefs: [
      T(121, "The consumption function is represented as a straight line."),
      L("lecture-w3-l1", 36, "The lecture builds a linear consumption function."),
    ],
  }),
  c({
    id: "future-payment",
    name: "Future payment",
    aliases: ["future payments", "payment later"],
    searchTerms: ["money received later", "promised repayment"],
    chapters: [0],
    tags: ["foundation", "finance"],
    summary:
      "A future payment is a promised transfer of money or resources at a later date.",
    intuition:
      "A promise to pay $1,000 next year is valuable, but its value today depends on the return available on other uses of money and on whether the promise is credible.",
    explanation: [
      "Future payments are the building blocks of loans and bonds. Their timing matters because a payment later cannot be used today without borrowing or discounting.",
      "A fixed promise does not change merely because the market price of the claim changes.",
    ],
    whyItMatters:
      "The fixed-payment intuition is the simplest route to bond price and yield movements.",
    prerequisites: ["borrowing", "lending", "interest-rate"],
    relatedConcepts: ["present-value", "bond", "bond-price", "bond-yield"],
    sourceRefs: [
      T(165, "Bond valuation discounts future payments."),
      L("lecture-w5-l1", 10, "The lecture identifies coupon and maturity payments."),
    ],
  }),
] as const;
