import { c, L, T } from "./records";

export const courseRecordsB = [
  c({
    id: "disposable-income",
    name: "Disposable income",
    aliases: ["disposable income", "YD", "after-tax income"],
    searchTerms: ["income available to spend or save", "income after taxes"],
    chapters: [3, 4, 5],
    tags: ["chapter-3", "chapter-4", "fiscal"],
    summary:
      "Disposable income is income available to a household after the relevant taxes and transfers in the model.",
    intuition:
      "It is the household’s current budget for consumption and saving, not the same as total GDP or total household wealth.",
    explanation: [
      "A tax increase usually lowers disposable income, while a transfer raises it. The exact tax and transfer rules are specified by the model.",
      "The consumption function relates consumption to disposable income. Saving is the part of disposable income not consumed.",
    ],
    whyItMatters:
      "It is the income variable that enters the consumption and household-saving equations.",
    prerequisites: ["income", "tax"],
    relatedConcepts: [
      "consumption",
      "household-saving",
      "tax-function",
      "saving-function",
    ],
    sourceRefs: [
      L("lecture-w2-l2", 51, "Disposable income and household saving."),
      T(97, "Disposable income in the saving section."),
    ],
    equations: [
      {
        label: "Simple disposable income",
        expression: String.raw`Y_D = Y - T + \text{transfers}`,
        variables: [
          { symbol: String.raw`Y_D`, meaning: "disposable income" },
          { symbol: "Y", meaning: "income" },
          { symbol: "T", meaning: "taxes" },
        ],
        interpretation:
          "Use the specific tax and transfer convention stated in the question.",
      },
    ],
  }),
  c({
    id: "tax",
    name: "Tax",
    aliases: ["taxes", "tax revenue", "T"],
    searchTerms: [
      "payment to government",
      "government revenue from households or firms",
    ],
    chapters: [3, 5],
    tags: ["chapter-3", "chapter-5", "fiscal"],
    summary:
      "A tax is a compulsory payment to government that affects private disposable resources.",
    intuition:
      "A tax changes how much income a household or firm can use privately, while the government can use the revenue to buy goods, service debt, or transfer resources.",
    explanation: [
      "Taxes are flows. A tax function can contain an autonomous component and a component that changes with income.",
      "Tax revenue is not the same as government spending. The difference contributes to the budget balance and affects public saving.",
    ],
    whyItMatters:
      "Taxes enter disposable income, fiscal multipliers, automatic stabilisers, public saving, and debt dynamics.",
    prerequisites: ["income", "flow"],
    relatedConcepts: [
      "disposable-income",
      "tax-function",
      "public-saving",
      "budget-balance",
    ],
    sourceRefs: [
      L("lecture-w4-l1", 4, "Government sector and taxes."),
      T(140, "Government tax revenue and fiscal policy."),
    ],
  }),
  c({
    id: "household-saving",
    name: "Household saving",
    aliases: ["private saving", "household savings", "Sₕ"],
    searchTerms: ["income not consumed", "household saving"],
    chapters: [3],
    tags: ["chapter-3", "finance", "calculation"],
    summary:
      "Household saving is disposable income not spent on consumption during the period.",
    intuition:
      "Saving is a flow of unconsumed current income; it adds to wealth only after considering asset-price gains, losses, and debt changes.",
    explanation: [
      "Positive household saving can be used to acquire financial or real assets or to reduce debt. Negative saving is dissaving: current consumption exceeds current disposable income.",
      "The real interest rate affects the reward for moving consumption from today to the future, but income and expectations also matter.",
    ],
    whyItMatters:
      "It is one component of national saving and must not be confused with macroeconomic investment.",
    prerequisites: ["disposable-income", "consumption", "flow"],
    relatedConcepts: [
      "saving",
      "wealth",
      "national-saving",
      "saving-investment-equilibrium",
      "macro-investment",
    ],
    sourceRefs: [
      L(
        "lecture-w2-l2",
        45,
        "Gross household saving equals disposable income minus consumption.",
      ),
      T(97, "Household saving definition."),
    ],
    equations: [
      {
        label: "Household saving",
        expression: String.raw`S_h = Y_D - C`,
        variables: [
          { symbol: String.raw`S_h`, meaning: "household saving flow" },
          { symbol: String.raw`Y_D`, meaning: "disposable income" },
          { symbol: "C", meaning: "consumption expenditure" },
        ],
        interpretation:
          "This accounting saving measure differs from a change in wealth when capital gains, losses, or debt changes are included.",
      },
    ],
    misconceptions: [
      "Saving is not the same as buying a share; saving is the unconsumed flow, while a share is a financial asset purchased with funds.",
    ],
  }),
  c({
    id: "saving",
    name: "Saving",
    aliases: ["saving", "savings", "S"],
    searchTerms: ["not spending current income", "setting resources aside"],
    chapters: [3, 4, 9],
    tags: ["chapter-3", "chapter-4", "international", "high-yield"],
    summary:
      "Saving is the part of current income not used for current consumption or other current spending.",
    intuition:
      "Saving makes resources available for future consumption, lending, debt repayment, or investment financing.",
    explanation: [
      "Households, firms, and government can save. National saving is the economy-wide total after accounting for consumption and government purchases.",
      "Saving and investment are connected by national accounting, but they are different decisions and can occur through financial markets or international borrowing.",
    ],
    whyItMatters:
      "The saving concept links intertemporal choice, the multiplier model, closed-economy interest rates, and the balance of payments.",
    prerequisites: ["income", "expenditure", "flow"],
    relatedConcepts: [
      "household-saving",
      "public-saving",
      "national-saving",
      "macro-investment",
      "wealth",
    ],
    sourceRefs: [
      L("lecture-w2-l2", 80, "Saving as current income minus current spending."),
      T(100, "Motives for saving and saving flows."),
    ],
    contrasts: [
      {
        conceptId: "macro-investment",
        title: "Saving versus investment",
        difference:
          "Saving is unconsumed income; macroeconomic investment is spending on newly produced capital, inventories, or new dwellings.",
      },
    ],
  }),
  c({
    id: "wealth",
    name: "Wealth",
    aliases: ["net wealth", "household wealth", "W"],
    searchTerms: ["value of assets minus liabilities", "stock of resources owned"],
    chapters: [3],
    tags: ["chapter-3", "finance", "stock"],
    summary:
      "Wealth is the value of assets owned minus liabilities owed at a point in time.",
    intuition:
      "Income is the flow arriving this period; wealth is the balance sheet position accumulated from saving, borrowing, and asset-price changes.",
    explanation: [
      "Saving can raise wealth, but capital gains and losses can change wealth without changing measured saving. Taking on debt can reduce net wealth even if cash in the bank rises temporarily.",
      "Wealth can affect consumption, but the course keeps wealth, income, and expenditure as separate concepts.",
    ],
    whyItMatters:
      "It clarifies why a rise in asset prices is not the same as current production or current saving.",
    prerequisites: ["asset", "liability", "stock", "household-saving"],
    relatedConcepts: ["saving", "capital-gains", "financial-asset", "consumption"],
    sourceRefs: [
      L("lecture-w2-l2", 52, "Saving and wealth distinction."),
      T(98, "Household wealth balance sheet."),
    ],
  }),
  c({
    id: "capital-gains",
    name: "Capital gain or loss",
    aliases: ["capital gains", "capital losses", "asset-price gain"],
    searchTerms: ["change in asset market value", "asset price increase or decrease"],
    chapters: [3],
    tags: ["chapter-3", "finance"],
    summary:
      "A capital gain or loss is a change in an asset’s market value, not a current-income saving flow.",
    intuition:
      "If a share price rises, the owner can be wealthier without having produced a new share or saved new income during that period.",
    explanation: [
      "Capital gains and losses change wealth. The course distinguishes the saving flow YD − C from wealth changes that also include asset-price movements and debt changes.",
      "A gain can be realised by selling, but the underlying distinction between a price revaluation and new production remains.",
    ],
    whyItMatters:
      "It prevents wealth charts and saving equations from being read as the same measurement.",
    prerequisites: ["wealth", "asset", "price"],
    relatedConcepts: ["saving", "household-saving", "nominal", "bond-price"],
    sourceRefs: [
      L("lecture-w2-l2", 55, "Changes in wealth and capital gains/losses."),
      T(99, "Household wealth and capital gains."),
    ],
  }),
  c({
    id: "public-saving",
    name: "Public saving",
    aliases: ["government saving", "public-sector saving", "Sg"],
    searchTerms: ["government revenue minus spending", "government saving"],
    chapters: [3, 5],
    tags: ["chapter-3", "chapter-5", "fiscal", "calculation"],
    summary:
      "Public saving is government revenue minus government purchases and transfers under the course’s accounting convention.",
    intuition:
      "When government collects more than it spends on current uses, it adds to national saving; when it spends more, public saving is negative.",
    explanation: [
      "The exact expression depends on whether transfers and taxes are consolidated, but the sign logic is stable: a budget surplus is positive public saving and a deficit is negative public saving.",
      "Lower public saving shifts national saving down in the closed-economy model and can raise the equilibrium real interest rate and crowd out private investment.",
    ],
    whyItMatters:
      "It links fiscal deficits to the saving-investment diagram rather than treating the budget as a separate topic.",
    prerequisites: ["tax", "government-spending", "saving"],
    relatedConcepts: ["national-saving", "budget-balance", "deficit", "crowding-out"],
    sourceRefs: [
      L("lecture-w2-l2", 72, "Public saving definition."),
      T(103, "Government saving and national saving."),
    ],
    equations: [
      {
        label: "Simple public saving",
        expression: String.raw`S_g = T - G`,
        variables: [
          { symbol: String.raw`S_g`, meaning: "public saving" },
          { symbol: "T", meaning: "government revenue from taxes" },
          { symbol: "G", meaning: "government purchases" },
        ],
        interpretation:
          "If G exceeds T, public saving is negative and the government has a deficit in the simplified model.",
      },
    ],
  }),
  c({
    id: "national-saving",
    name: "National saving",
    aliases: ["national savings", "NS", "economy-wide saving"],
    searchTerms: [
      "total saving of households firms government",
      "income not used for C or G",
    ],
    chapters: [3, 9],
    tags: ["chapter-3", "chapter-9", "international", "high-yield"],
    summary:
      "National saving is the economy-wide income that is not used for private consumption or government purchases.",
    intuition:
      "It is the pool of domestic resources available to finance investment or lend abroad after current consumption and public purchases.",
    explanation: [
      "In the closed-economy model, national saving equals domestic investment in equilibrium. In a small open economy, the difference can be financed by net foreign lending or borrowing.",
      "National saving combines private saving and public saving. A government deficit lowers public saving, all else equal.",
    ],
    whyItMatters:
      "It is the central accounting bridge from fiscal policy to real interest rates, crowding out, and the current account.",
    prerequisites: ["saving", "public-saving", "government-spending", "income"],
    relatedConcepts: [
      "saving-investment-equilibrium",
      "crowding-out",
      "small-open-economy",
      "current-account",
    ],
    sourceRefs: [
      L("lecture-w2-l2", 81, "National saving definition and decomposition."),
      L("lecture-w8-l1", 30, "National saving in an open economy."),
      T(103, "National saving schedule."),
    ],
    equations: [
      {
        label: "National saving",
        expression: String.raw`NS = Y - C - G`,
        variables: [
          { symbol: "NS", meaning: "national saving" },
          { symbol: "Y", meaning: "income or output" },
          { symbol: "C", meaning: "private consumption" },
          { symbol: "G", meaning: "government purchases" },
        ],
        interpretation:
          "The expression is an accounting definition; use the model’s treatment of taxes and transfers when decomposing it.",
      },
    ],
  }),
  c({
    id: "marginal-product-capital",
    name: "Marginal product of capital",
    aliases: ["MPK", "marginal product of capital"],
    searchTerms: [
      "extra output from one more unit of capital",
      "capital productivity at the margin",
    ],
    chapters: [3, 10],
    tags: ["chapter-3", "chapter-10", "growth"],
    summary:
      "The marginal product of capital is the extra output produced by a small additional unit of capital, holding other inputs fixed.",
    intuition:
      "It asks what the next machine contributes, not what all machines contribute on average.",
    explanation: [
      "The marginal product can fall as more capital is added with other inputs fixed. The value of that extra output is compared with the cost of using capital when firms decide to invest.",
      "The growth chapter uses the same marginal-product idea to explain diminishing returns in a production function.",
    ],
    whyItMatters:
      "It supplies the benefit side of the investment decision and the intuition for diminishing returns.",
    prerequisites: ["capital", "quantity", "rate"],
    relatedConcepts: [
      "value-marginal-product-capital",
      "user-cost-capital",
      "diminishing-marginal-product",
      "investment-demand",
    ],
    sourceRefs: [
      L("lecture-w2-l2", 33, "Investment rule involving VMPK and user cost."),
      L("lecture-w9-l1", 15, "Production functions and marginal products."),
      T(286, "Diminishing marginal product."),
    ],
  }),
  c({
    id: "value-marginal-product-capital",
    name: "Value of the marginal product of capital",
    aliases: ["VMPK", "value marginal product of capital"],
    searchTerms: [
      "price times marginal product of capital",
      "dollar value of extra capital output",
    ],
    chapters: [3],
    tags: ["chapter-3", "calculation"],
    summary:
      "The value of the marginal product of capital is the price of output multiplied by the marginal product of capital.",
    intuition:
      "A machine’s extra physical output matters to a firm through the dollars that output can earn.",
    explanation: [
      "Firms compare VMPK with the user cost of capital. Investment is attractive in the simplified rule when the value of the extra output is at least as large as the cost of using the capital.",
      "Do not confuse VMPK with the total value of all output or with the purchase price of the machine.",
    ],
    whyItMatters:
      "It makes the investment decision mechanical and gives the course’s calculation questions a clear comparison.",
    prerequisites: ["marginal-product-capital", "price"],
    relatedConcepts: ["user-cost-capital", "investment-demand", "macro-investment"],
    sourceRefs: [
      L("lecture-w2-l2", 33, "Invest if VMPK is at least user cost."),
      T(94, "Investment demand and marginal product."),
    ],
    equations: [
      {
        label: "Value of marginal product",
        expression: String.raw`VMPK = P \times MPK`,
        variables: [
          { symbol: "P", meaning: "price of the firm’s output" },
          { symbol: "MPK", meaning: "extra physical output from capital" },
        ],
        interpretation:
          "Compare the dollar value of the extra output with the dollar user cost of the capital.",
      },
    ],
  }),
  c({
    id: "user-cost-capital",
    name: "User cost of capital",
    aliases: ["user cost", "UC", "cost of using capital"],
    searchTerms: [
      "cost of owning and using a machine",
      "interest plus depreciation cost",
    ],
    chapters: [3],
    tags: ["chapter-3", "investment", "calculation"],
    summary:
      "User cost is the opportunity cost of using a unit of capital for a period.",
    intuition:
      "A firm gives up the return it could have earned elsewhere and accepts that the machine loses value or productivity while used.",
    explanation: [
      "The course’s approximation combines the price of capital with the real interest rate and depreciation. A higher real rate or depreciation rate raises user cost, other things equal.",
      "The investment decision compares user cost with the value of the marginal product of capital; it is not simply a comparison with the machine’s sticker price.",
    ],
    whyItMatters:
      "It explains why real-rate rises reduce interest-sensitive investment in the course model.",
    prerequisites: [
      "real-interest-rate",
      "depreciation",
      "price",
      "marginal-product-capital",
    ],
    relatedConcepts: [
      "investment-demand",
      "value-marginal-product-capital",
      "macro-investment",
    ],
    mechanism: [
      "real interest rate rises",
      "the funds tied up in capital have a higher opportunity cost",
      "user cost rises",
      "some marginal investment projects no longer cover their cost",
      "investment demand falls, conditional on other determinants",
    ],
    equations: [
      {
        label: "Course user-cost approximation",
        expression: String.raw`UC \approx P_K(r + \delta)`,
        variables: [
          { symbol: "UC", meaning: "user cost of capital" },
          { symbol: String.raw`P_K`, meaning: "price of a unit of capital" },
          { symbol: "r", meaning: "real interest rate" },
          { symbol: String.raw`\delta`, meaning: "depreciation rate" },
        ],
        interpretation:
          "The expression is a model approximation; the relevant units and assumptions are those stated in the course question.",
      },
    ],
    sourceRefs: [
      L("lecture-w2-l2", 29, "User-cost summary."),
      T(93, "User cost and investment decision."),
    ],
  }),
  c({
    id: "investment-demand",
    name: "Investment demand",
    aliases: ["investment demand schedule", "I(r)", "demand for investment"],
    searchTerms: ["firms' desired investment", "investment as a function of real rate"],
    chapters: [3],
    tags: ["chapter-3", "investment", "graph"],
    summary:
      "Investment demand is the amount of new capital spending firms plan at different real interest rates and project returns.",
    intuition:
      "Projects are ranked from most worthwhile to least worthwhile. A higher real rate makes fewer projects pass the benefit-versus-cost test.",
    explanation: [
      "The investment-demand curve can slope down because the real rate raises user cost. It can shift when expected profitability, technology, the price of capital, or the marginal product of capital changes.",
      "A movement along the curve is caused by the real interest rate changing; a shift is caused by another determinant.",
    ],
    whyItMatters:
      "It is the mechanism through which monetary policy and saving-investment equilibrium affect capital spending.",
    prerequisites: [
      "macro-investment",
      "real-interest-rate",
      "user-cost-capital",
      "value-marginal-product-capital",
    ],
    relatedConcepts: [
      "saving-investment-equilibrium",
      "crowding-out",
      "capital-accumulation",
    ],
    sourceRefs: [
      L("lecture-w2-l2", 35, "Investment demand schedule."),
      T(96, "Investment schedule figure."),
    ],
    misconceptions: [
      "Buying financial assets can transfer funds to a firm but is not itself the macroeconomic investment flow.",
    ],
  }),
  c({
    id: "saving-investment-equilibrium",
    name: "Saving-investment equilibrium",
    aliases: [
      "saving and investment equilibrium",
      "S = I equilibrium",
      "closed-economy equilibrium",
    ],
    searchTerms: ["national saving equals investment", "closed economy loanable funds"],
    chapters: [3],
    tags: ["chapter-3", "finance", "graph", "high-yield"],
    summary:
      "In the closed-economy model, the equilibrium real interest rate makes national saving equal planned investment.",
    intuition:
      "The available pool of resources not consumed must match firms’ desired use of resources for new capital when no net borrowing from abroad is possible.",
    explanation: [
      "National saving is the supply of loanable resources and investment demand is the demand. A fall in public saving shifts national saving left and tends to raise the real rate and reduce private investment.",
      "The equality is an equilibrium/accounting result in the specified closed model; individual saving and investment decisions remain distinct.",
    ],
    whyItMatters:
      "It is the basis for crowding out and the course’s closed-versus-small-open-economy comparison.",
    prerequisites: [
      "national-saving",
      "investment-demand",
      "equilibrium",
      "real-interest-rate",
    ],
    relatedConcepts: [
      "crowding-out",
      "public-saving",
      "small-open-economy",
      "macro-investment",
    ],
    sourceRefs: [
      L("lecture-w2-l2", 103, "Closed-economy saving-investment model."),
      T(106, "National saving and investment equilibrium."),
    ],
    equations: [
      {
        label: "Closed economy identity",
        expression: String.raw`NS = I`,
        variables: [
          { symbol: "NS", meaning: "national saving" },
          { symbol: "I", meaning: "planned investment" },
        ],
        interpretation:
          "The equality is for the closed-economy equilibrium; an open economy can have net exports or foreign borrowing.",
      },
    ],
  }),
  c({
    id: "crowding-out",
    name: "Crowding out",
    aliases: ["crowding out", "crowd out private investment"],
    searchTerms: [
      "government deficit raises rates and reduces investment",
      "public saving fall",
    ],
    chapters: [3, 5],
    tags: ["chapter-3", "chapter-5", "fiscal", "high-yield"],
    summary:
      "Crowding out is the reduction in private investment caused by a fiscal change that raises the real interest rate in the model.",
    intuition:
      "When government saving falls in a closed economy, the pool of national saving shifts left; firms compete for scarcer loanable resources and the real rate rises.",
    explanation: [
      "The course’s chain is a model result: public deficit rises → national saving falls → real interest rate rises → investment demand moves along its curve to a lower quantity.",
      "The size of crowding out depends on the model, openness, monetary policy, and other responses. Do not treat the chain as an unconditional identity in every economy.",
    ],
    whyItMatters:
      "It is the central trade-off in the closed-economy fiscal-policy and saving-investment chapters.",
    prerequisites: [
      "saving-investment-equilibrium",
      "public-saving",
      "investment-demand",
    ],
    relatedConcepts: [
      "fiscal-policy",
      "government-budget-constraint",
      "small-open-economy",
      "real-interest-rate",
    ],
    mechanism: [
      "government deficit rises",
      "public saving falls",
      "national saving shifts left in a closed-economy diagram",
      "equilibrium real interest rate rises",
      "private investment falls along investment demand",
    ],
    sourceRefs: [
      L("lecture-w2-l2", 115, "Crowding-out conclusion in the closed economy."),
      T(107, "Crowding out figure."),
    ],
  }),
  c({
    id: "life-cycle-saving",
    name: "Life-cycle saving",
    aliases: ["life-cycle hypothesis", "life cycle saving"],
    searchTerms: ["saving over working life", "save for retirement"],
    chapters: [3],
    tags: ["chapter-3", "households"],
    summary:
      "Life-cycle saving is saving motivated by moving resources between working years and retirement or other life stages.",
    intuition:
      "A household may save during high-income years to smooth consumption when income is low or absent later.",
    explanation: [
      "It is one of the course’s standard motives for household saving, alongside precautionary and bequest motives.",
      "The motive is about intertemporal allocation, so expected income, interest rates, and lifespan matter; it is not a claim that every household follows one exact pattern.",
    ],
    whyItMatters:
      "It makes saving a choice about consumption across time rather than a vague moral category.",
    prerequisites: ["household-saving", "present-value", "expectations"],
    relatedConcepts: ["wealth", "real-interest-rate", "saving"],
    sourceRefs: [
      L("lecture-w2-l2", 58, "Motives for household saving."),
      T(100, "Life-cycle saving figure."),
    ],
  }),
  c({
    id: "zero-lower-bound",
    name: "Zero lower bound",
    aliases: ["ZLB", "zero lower bound on interest rates"],
    searchTerms: ["interest rate cannot be cut much further", "near-zero policy rate"],
    chapters: [3, 7],
    tags: ["chapter-3", "chapter-7", "monetary-policy"],
    summary:
      "The zero lower bound is a constraint that can limit further cuts in a nominal policy interest rate near zero.",
    intuition:
      "If holding cash pays roughly zero, a central bank cannot always make the nominal rate much more negative without changing the institutional setup or creating other costs.",
    explanation: [
      "The constraint concerns a nominal policy instrument, not a claim that real rates cannot be negative. Expected inflation can make a nominal rate of zero correspond to a negative real rate.",
      "It can make conventional monetary stimulus less powerful and increase the role of expectations or other policies in the model.",
    ],
    whyItMatters:
      "It explains why a rate-cut chain can stop even when output remains weak.",
    prerequisites: ["nominal-interest-rate", "real-interest-rate", "cash-rate"],
    relatedConcepts: [
      "monetary-policy",
      "cash-rate-target",
      "real-rate-channel",
      "demand-stabilisation",
    ],
    sourceRefs: [
      L("lecture-w2-l1", 72, "Negative nominal rates and the lower-bound discussion."),
      T(213, "Monetary policy as a macroeconomic tool."),
    ],
  }),
  c({
    id: "planned-aggregate-expenditure",
    name: "Planned aggregate expenditure",
    aliases: ["PAE", "planned expenditure", "planned aggregate spending"],
    searchTerms: [
      "planned C plus I plus G plus NX",
      "desired spending on domestic output",
    ],
    chapters: [4, 8],
    tags: ["chapter-4", "chapter-8", "spending", "high-yield"],
    summary:
      "Planned aggregate expenditure is the total spending households, firms, government, and foreigners intend to make on output.",
    intuition:
      "Firms choose production partly in response to what they expect customers to buy; planned spending is the demand side of the short-run income-expenditure model.",
    explanation: [
      "The components are planned consumption, planned investment, government purchases, and net exports. PAE can differ from actual output, with inventories absorbing the mismatch.",
      "In equilibrium, planned aggregate expenditure equals actual output. That condition is a model of short-run adjustment, not a definition of all GDP accounting.",
    ],
    whyItMatters:
      "PAE is the foundation for the multiplier, fiscal policy, and the derivation of aggregate demand.",
    prerequisites: [
      "consumption",
      "macro-investment",
      "government-spending",
      "net-exports",
      "expenditure",
    ],
    relatedConcepts: [
      "actual-expenditure",
      "pae-equilibrium",
      "multiplier",
      "aggregate-demand",
    ],
    sourceRefs: [
      L("lecture-w3-l1", 10, "Planned versus actual expenditure."),
      T(119, "Income-expenditure model of GDP."),
    ],
    equations: [
      {
        label: "PAE identity",
        expression: String.raw`PAE = C + I^P + G + NX`,
        variables: [
          { symbol: "C", meaning: "planned consumption" },
          { symbol: String.raw`I^P`, meaning: "planned investment" },
          { symbol: "G", meaning: "government purchases" },
          { symbol: "NX", meaning: "net exports" },
        ],
        interpretation:
          "The superscript P emphasises planned investment; unplanned inventory changes separate PAE from actual expenditure.",
      },
    ],
  }),
  c({
    id: "actual-expenditure",
    name: "Actual expenditure",
    aliases: ["actual aggregate expenditure", "actual spending"],
    searchTerms: ["what was actually spent", "output plus unplanned inventory"],
    chapters: [4],
    tags: ["chapter-4", "spending"],
    summary:
      "Actual expenditure is the value of sales plus unintended inventory accumulation, so it equals production in the accounting period.",
    intuition:
      "If firms produce goods that customers did not plan to buy, those goods still count as someone’s inventory purchase in actual expenditure.",
    explanation: [
      "Planned expenditure excludes unplanned inventory changes; actual expenditure includes them. This is why the accounting identity can hold while planned spending is below or above output.",
      "The adjustment of production toward PAE is the behavioural assumption of the short-run model.",
    ],
    whyItMatters:
      "It resolves the apparent contradiction between GDP-as-production and PAE-as-planned-spending.",
    prerequisites: [
      "planned-aggregate-expenditure",
      "inventory-investment",
      "gross-domestic-product",
    ],
    relatedConcepts: ["pae-equilibrium", "inventory", "unplanned-inventory-change"],
    sourceRefs: [
      L("lecture-w3-l1", 15, "Actual expenditure and PAE concepts."),
      T(118, "Unplanned inventory adjustment."),
    ],
  }),
  c({
    id: "inventory",
    name: "Inventory",
    aliases: ["inventory goods", "stock of unsold goods"],
    searchTerms: ["goods held for later sale", "unsold production stock"],
    chapters: [1, 4],
    tags: ["chapter-1", "chapter-4", "stock"],
    summary:
      "Inventory is a stock of goods produced or purchased for later sale or use.",
    intuition:
      "Inventory is a buffer between production and sales: a firm can produce today even when the final buyer arrives later.",
    explanation: [
      "A change in inventory is investment in GDP because it is a change in a produced stock. Planned and unplanned inventory changes have different roles in the income-expenditure model.",
      "A rise in inventories can mean firms intentionally stocked up or unexpectedly failed to sell output; context determines the interpretation.",
    ],
    whyItMatters:
      "Inventory accounting makes the production-expenditure identity and short-run equilibrium understandable.",
    prerequisites: ["stock", "macro-investment", "final-good"],
    relatedConcepts: [
      "inventory-investment",
      "unplanned-inventory-change",
      "actual-expenditure",
      "pae-equilibrium",
    ],
    sourceRefs: [
      L(
        "lecture-w1-l1",
        59,
        "Goods produced before final sale are recorded through inventory investment.",
      ),
      L("lecture-w3-l1", 14, "Unplanned inventories."),
      T(24, "Private investment expenditure."),
    ],
  }),
  c({
    id: "inventory-investment",
    name: "Inventory investment",
    aliases: ["investment in inventories", "inventory change", "Δ inventories"],
    searchTerms: ["change in stocks of unsold goods", "inventory component of GDP"],
    chapters: [1, 4],
    tags: ["chapter-1", "chapter-4", "calculation"],
    summary:
      "Inventory investment is the change in the stock of goods held by firms during a period.",
    intuition:
      "Production that is not sold to final users has still created a produced asset held in inventory, so it is counted as investment.",
    explanation: [
      "Planned inventory investment is intentional stockbuilding. Unplanned inventory investment occurs when actual sales differ from planned sales and firms discover a mismatch.",
      "Inventory investment can be positive or negative; a run-down of inventories is negative investment even if sales are strong.",
    ],
    whyItMatters: "It is a common GDP-classification and PAE-disequilibrium question.",
    prerequisites: ["inventory", "macro-investment", "flow"],
    relatedConcepts: [
      "actual-expenditure",
      "planned-aggregate-expenditure",
      "unplanned-inventory-change",
    ],
    sourceRefs: [
      L("lecture-w1-l1", 59, "Inventory investment timing example."),
      L("lecture-w3-l1", 14, "Unplanned inventory investment."),
      T(24, "Private investment expenditure."),
    ],
  }),
  c({
    id: "unplanned-inventory-change",
    name: "Unplanned inventory change",
    aliases: ["unplanned inventories", "unplanned inventory investment"],
    searchTerms: ["production and sales mismatch", "unexpected inventory accumulation"],
    chapters: [4],
    tags: ["chapter-4", "spending", "high-yield"],
    summary:
      "An unplanned inventory change is the inventory accumulation or rundown caused by actual sales differing from planned sales.",
    intuition:
      "If firms make 100 units but buyers plan to purchase only 90, the unsold 10 are an involuntary inventory increase.",
    explanation: [
      "When output exceeds PAE, inventories rise unexpectedly and firms have a reason to reduce production. When PAE exceeds output, inventories fall and firms have a reason to increase production.",
      "The inventory change is the accounting bridge; the production response is the model’s behavioural adjustment.",
    ],
    whyItMatters:
      "It explains why short-run equilibrium is where output equals planned expenditure and why disequilibrium triggers output changes.",
    prerequisites: [
      "planned-aggregate-expenditure",
      "inventory-investment",
      "actual-expenditure",
    ],
    relatedConcepts: ["pae-equilibrium", "short-run-equilibrium", "output-adjustment"],
    sourceRefs: [
      L("lecture-w3-l1", 16, "Equilibrium and disequilibrium conditions."),
      T(125, "Disequilibrium in the two-sector model."),
    ],
    mechanism: [
      "Y > PAE",
      "unplanned inventories rise",
      "firms reduce production in the model",
      "output moves toward PAE",
    ],
  }),
  c({
    id: "marginal-propensity-to-consume",
    name: "Marginal propensity to consume",
    aliases: ["MPC", "marginal propensity to consume"],
    searchTerms: [
      "extra consumption from extra income",
      "fraction of additional income spent",
    ],
    chapters: [4],
    tags: ["chapter-4", "spending", "calculation"],
    summary:
      "The MPC is the fraction of an additional unit of disposable income that households spend on consumption.",
    intuition:
      "If the MPC is 0.75, an extra dollar of disposable income leads to 75 cents more consumption and 25 cents more saving in the simple model.",
    explanation: [
      "MPC is a marginal response, not the average share of all income spent. It lies between zero and one in the basic course model.",
      "A higher MPC makes the multiplier larger because each round of extra income creates more next-round spending.",
    ],
    whyItMatters:
      "It controls the slope of the consumption function and the size of the income-expenditure multiplier.",
    prerequisites: ["consumption", "disposable-income", "percentage-change"],
    relatedConcepts: [
      "average-propensity-to-consume",
      "consumption-function",
      "multiplier",
    ],
    sourceRefs: [
      L("lecture-w3-l1", 36, "Consumption function and marginal response."),
      T(121, "Consumption function and MPC."),
    ],
    equations: [
      {
        label: "MPC",
        expression: String.raw`MPC = \frac{\Delta C}{\Delta Y_D}`,
        variables: [
          { symbol: String.raw`\Delta C`, meaning: "change in consumption" },
          { symbol: String.raw`\Delta Y_D`, meaning: "change in disposable income" },
        ],
        interpretation:
          "The numerator and denominator are changes, not their total levels.",
      },
    ],
  }),
  c({
    id: "average-propensity-to-consume",
    name: "Average propensity to consume",
    aliases: ["APC", "average propensity to consume"],
    searchTerms: ["average share of income consumed", "consumption divided by income"],
    chapters: [4],
    tags: ["chapter-4", "spending", "calculation"],
    summary: "The APC is total consumption divided by the relevant income measure.",
    intuition:
      "APC asks what share of the current income level is consumed; MPC asks how consumption changes when income changes.",
    explanation: [
      "The two can differ when autonomous consumption exists. A household can have an APC above its MPC at low income because baseline consumption is positive.",
      "Read whether a question asks for a level ratio or a marginal change before choosing the formula.",
    ],
    whyItMatters:
      "It is a classic near-neighbour distinction in the consumption-function calculations.",
    prerequisites: ["consumption", "income", "ratio"],
    relatedConcepts: [
      "marginal-propensity-to-consume",
      "consumption-function",
      "saving-function",
    ],
    sourceRefs: [
      L("lecture-w3-l1", 40, "Consumption and saving relationships."),
      T(121, "Consumption function discussion."),
    ],
    equations: [
      {
        label: "APC",
        expression: String.raw`APC = \frac{C}{Y_D}`,
        variables: [
          { symbol: "C", meaning: "consumption level" },
          { symbol: "YD", meaning: "income level used by the model" },
        ],
        interpretation: "This uses levels, unlike the MPC, which uses changes.",
      },
    ],
  }),
  c({
    id: "consumption-function",
    name: "Consumption function",
    aliases: ["consumption equation", "C function"],
    searchTerms: [
      "formula for household spending",
      "autonomous plus induced consumption",
    ],
    chapters: [4],
    tags: ["chapter-4", "spending", "calculation"],
    summary:
      "A consumption function describes planned household consumption as a baseline plus a response to disposable income and possibly other variables.",
    intuition:
      "Households may consume something even with little current income, while extra income usually raises consumption by less than one-for-one.",
    explanation: [
      String.raw`The simple course form is \(C = C_0 + cY_D\), where \(C_0\) is autonomous consumption and c is the MPC. Later versions can include real interest rates or wealth.`,
      "The function is a model assumption used to derive PAE and the multiplier, not a universal law applying identically to every household.",
    ],
    whyItMatters:
      "It is the first behavioural equation in the income-expenditure model.",
    prerequisites: [
      "income",
      "disposable-income",
      "marginal-propensity-to-consume",
      "linear-equation",
    ],
    relatedConcepts: ["planned-aggregate-expenditure", "saving-function", "multiplier"],
    sourceRefs: [
      L("lecture-w3-l1", 36, "Linear consumption function."),
      T(121, "Consumption function graph."),
    ],
    equations: [
      {
        label: "Simple consumption function",
        expression: String.raw`C = C_0 + cY_D`,
        variables: [
          { symbol: String.raw`C_0`, meaning: "autonomous consumption" },
          { symbol: "c", meaning: "MPC, between zero and one in the basic model" },
          { symbol: String.raw`Y_D`, meaning: "disposable income" },
        ],
        interpretation: String.raw`\(C_0\) shifts the line; c controls its slope.`,
      },
    ],
  }),
  c({
    id: "autonomous-expenditure",
    name: "Autonomous expenditure",
    aliases: ["autonomous spending", "exogenous expenditure"],
    searchTerms: ["spending independent of current income", "baseline spending"],
    chapters: [4],
    tags: ["chapter-4", "spending"],
    summary:
      "Autonomous expenditure is spending that does not change directly with current income in the model.",
    intuition:
      "It is the baseline push into the spending system before induced income feedback begins.",
    explanation: [
      "Autonomous consumption, planned investment, government purchases, and exports can appear as autonomous components depending on the model.",
      "A change in autonomous spending shifts PAE; the multiplier then determines the total change in equilibrium output.",
    ],
    whyItMatters:
      "It separates the initial shock from the repeated induced-spending response.",
    prerequisites: ["planned-aggregate-expenditure", "linear-equation"],
    relatedConcepts: ["induced-expenditure", "multiplier-process", "fiscal-policy"],
    sourceRefs: [
      L("lecture-w3-l1", 36, "Autonomous part of the consumption function."),
      T(121, "Consumption-function intercept."),
    ],
  }),
  c({
    id: "induced-expenditure",
    name: "Induced expenditure",
    aliases: ["induced spending", "income-dependent spending"],
    searchTerms: ["spending caused by higher income", "feedback spending"],
    chapters: [4],
    tags: ["chapter-4", "spending"],
    summary:
      "Induced expenditure changes when income changes, such as consumption generated by the extra income of another round.",
    intuition:
      "One person’s spending becomes another person’s income, which induces some further spending and so on.",
    explanation: [
      "The MPC determines how much of each extra income round is spent rather than saved. Imports, taxes, and saving are leakages that reduce the feedback.",
      "Induced spending is a response within the model, not the original autonomous policy or investment shock.",
    ],
    whyItMatters:
      "It explains why the output response can exceed the initial change in autonomous spending.",
    prerequisites: [
      "marginal-propensity-to-consume",
      "planned-aggregate-expenditure",
      "income",
    ],
    relatedConcepts: [
      "autonomous-expenditure",
      "multiplier-process",
      "leakages-injections",
    ],
    sourceRefs: [
      L("lecture-w3-l1", 40, "Income and expenditure feedback."),
      T(127, "Multiplier process table."),
    ],
  }),
  c({
    id: "saving-function",
    name: "Saving function",
    aliases: ["saving equation", "S function"],
    searchTerms: ["income minus consumption formula", "saving as income response"],
    chapters: [4],
    tags: ["chapter-4", "spending", "calculation"],
    summary:
      "A saving function describes saving as disposable income minus consumption.",
    intuition:
      "Whatever part of an extra dollar is not consumed becomes saving in the simple two-sector model.",
    explanation: [
      "Substituting the consumption function into S = YD − C produces an intercept and a slope related to the MPC. The slope of saving is the marginal propensity to save.",
      "The saving function is an accounting transformation of the model’s consumption choice, not a claim that saving is always positive.",
    ],
    whyItMatters:
      "It makes the saving-investment equilibrium and paradox of thrift visible in the 45-degree model.",
    prerequisites: [
      "household-saving",
      "consumption-function",
      "algebraic-substitution",
    ],
    relatedConcepts: [
      "marginal-propensity-to-consume",
      "pae-equilibrium",
      "paradox-of-thrift",
    ],
    sourceRefs: [
      L("lecture-w3-l2", 41, "Saving function in the two-sector model."),
      T(129, "Saving function graph."),
    ],
  }),
  c({
    id: "pae-equilibrium",
    name: "PAE equilibrium",
    aliases: ["income-expenditure equilibrium", "Y = PAE", "short-run PAE equilibrium"],
    searchTerms: [
      "output equals planned expenditure",
      "where PAE crosses 45 degree line",
    ],
    chapters: [4],
    tags: ["chapter-4", "spending", "graph", "high-yield"],
    summary:
      "PAE equilibrium is the short-run point at which actual output equals planned aggregate expenditure.",
    intuition:
      "At this point firms are not discovering an unplanned inventory mismatch that would make them want to change production under the model.",
    explanation: [
      "On a 45-degree diagram, output is on one axis and PAE on the other; equilibrium is where the PAE line crosses the equality line.",
      "A shift in PAE changes equilibrium output through the multiplier. The identity GDP = actual expenditure remains true even away from PAE equilibrium because inventories absorb the difference.",
    ],
    whyItMatters:
      "It is the condition used to solve short-run output and to derive fiscal multipliers.",
    prerequisites: [
      "planned-aggregate-expenditure",
      "actual-expenditure",
      "equilibrium",
      "unplanned-inventory-change",
    ],
    relatedConcepts: [
      "45-degree-line",
      "multiplier",
      "short-run-equilibrium",
      "output-adjustment",
    ],
    sourceRefs: [
      L("lecture-w3-l1", 16, "Equilibrium condition."),
      T(123, "45-degree line and equilibrium."),
    ],
    equations: [
      {
        label: "PAE equilibrium condition",
        expression: String.raw`Y = PAE`,
        variables: [
          { symbol: "Y", meaning: "actual output" },
          { symbol: "PAE", meaning: "planned aggregate expenditure" },
        ],
        interpretation:
          "Solve this equation with the model’s PAE expression to find equilibrium output.",
      },
    ],
  }),
  c({
    id: "output-adjustment",
    name: "Output adjustment",
    aliases: ["adjustment of output", "production response"],
    searchTerms: ["firms change production", "output responds to inventories"],
    chapters: [4],
    tags: ["chapter-4", "spending"],
    summary:
      "Output adjustment is the modelled response of production when planned spending differs from current output.",
    intuition:
      "Unexpected unsold goods are a signal to reduce production; unexpectedly rapid sales are a signal to increase it.",
    explanation: [
      "When Y exceeds PAE, inventories accumulate unexpectedly and production tends to fall. When PAE exceeds Y, inventories run down and production tends to rise.",
      "This is a short-run Keynesian assumption: prices and productive capacity are treated as sufficiently slow to adjust for quantities to do the work first.",
    ],
    whyItMatters:
      "It converts the PAE graph from a static identity into a story about how the economy moves toward equilibrium.",
    prerequisites: [
      "unplanned-inventory-change",
      "pae-equilibrium",
      "short-run-equilibrium",
    ],
    relatedConcepts: ["multiplier-process", "actual-expenditure", "business-cycle"],
    sourceRefs: [
      L("lecture-w3-l1", 27, "Disequilibrium examples and production response."),
      T(125, "Disequilibrium in the two-sector model."),
    ],
  }),
  c({
    id: "45-degree-line",
    name: "45-degree line",
    aliases: ["45 degree line", "line of equality"],
    searchTerms: ["Y equals PAE line", "equality line"],
    chapters: [4],
    tags: ["chapter-4", "graph"],
    summary:
      "The 45-degree line shows points where the vertical variable equals the horizontal variable in the chosen scale.",
    intuition:
      "It is a visual ruler for equality: every point on the line has the same amount on both axes.",
    explanation: [
      "In the income-expenditure graph, the line represents Y = PAE. The slope is one when both axes use the same units, so its angle is a diagram convention.",
      "The PAE curve’s intersection with the line identifies equilibrium; the line itself is not a behavioural spending curve.",
    ],
    whyItMatters:
      "It prevents the common error of treating the equality line as the PAE schedule itself.",
    prerequisites: ["graph-axis", "graph-slope", "pae-equilibrium"],
    relatedConcepts: [
      "planned-aggregate-expenditure",
      "actual-expenditure",
      "multiplier",
    ],
    sourceRefs: [
      L("lecture-w3-l1", 50, "45-degree diagram in the income-expenditure model."),
      T(123, "45-degree line figures."),
    ],
  }),
  c({
    id: "multiplier",
    name: "Income-expenditure multiplier",
    aliases: ["multiplier", "Keynesian multiplier", "spending multiplier"],
    searchTerms: [
      "initial spending change multiplied into output",
      "output response to autonomous spending",
    ],
    chapters: [0, 4, 5],
    tags: ["chapter-4", "chapter-5", "calculation", "high-yield"],
    summary:
      "The income-expenditure multiplier is the ratio of the total equilibrium output change to an initial autonomous spending change.",
    intuition:
      "One person’s extra spending becomes another person’s income, which induces further spending; the rounds shrink because some income is saved, taxed, or spent on imports.",
    explanation: [
      "In the simple two-sector model, the multiplier is 1/(1−MPC). It is larger when the MPC is larger and smaller when leakages are larger.",
      "The multiplier is a comparative-static model result. It does not mean every dollar is spent infinitely many times or that capacity and prices never matter.",
    ],
    whyItMatters:
      "It is the core calculation behind PAE, fiscal multipliers, and open-economy spending shocks.",
    prerequisites: [
      "pae-equilibrium",
      "marginal-propensity-to-consume",
      "induced-expenditure",
      "linear-equation",
    ],
    relatedConcepts: [
      "multiplier-process",
      "leakages-injections",
      "government-spending-multiplier",
      "open-economy-multiplier",
    ],
    mechanism: [
      "autonomous spending rises",
      "output and income rise by the first-round amount",
      "recipients spend the MPC share of extra income",
      "later rounds become smaller as leakages occur",
      "total output change exceeds the initial shock in the basic model",
    ],
    equations: [
      {
        label: "Two-sector multiplier",
        expression: String.raw`k = \frac{1}{1-c}`,
        variables: [
          { symbol: "k", meaning: "multiplier" },
          { symbol: "c", meaning: "MPC" },
        ],
        interpretation:
          "For 0 < c < 1, k exceeds one; add tax and import leakages when the model includes them.",
      },
    ],
    misconceptions: [
      "The multiplier is not a probability and not a permanent increase in productive capacity.",
    ],
    sourceRefs: [
      L("lecture-w3-l1", 40, "Two-sector multiplier."),
      L("lecture-w3-l2", 46, "Open-economy multiplier comparison."),
      T(127, "Multiplier process table."),
    ],
  }),
  c({
    id: "multiplier-process",
    name: "Multiplier process",
    aliases: ["multiplier rounds", "income-spending rounds"],
    searchTerms: ["successive rounds of spending", "feedback chain"],
    chapters: [4],
    tags: ["chapter-4", "spending"],
    summary:
      "The multiplier process is the sequence of income and induced-spending rounds after an autonomous shock.",
    intuition:
      "The first recipient does not spend every extra dollar, so each later round is a fraction of the previous one.",
    explanation: [
      "The process can be represented as a geometric series. Saving, taxes, and imports stop part of each round from becoming domestic consumption in the next round.",
      "The eventual equilibrium change is the sum of the rounds, not merely the first-round effect.",
    ],
    whyItMatters:
      "It supplies the causal explanation behind the multiplier formula instead of asking the learner to memorise it.",
    prerequisites: [
      "multiplier",
      "induced-expenditure",
      "marginal-propensity-to-consume",
    ],
    relatedConcepts: [
      "leakages-injections",
      "open-economy-multiplier",
      "output-adjustment",
    ],
    sourceRefs: [
      L("lecture-w3-l1", 40, "Economics of the multiplier."),
      T(127, "Multiplier process table."),
    ],
  }),
  c({
    id: "leakages-injections",
    name: "Leakages and injections",
    aliases: ["leakages and injections", "injections and leakages"],
    searchTerms: [
      "saving taxes imports versus investment government exports",
      "spending leaving and entering circular flow",
    ],
    chapters: [4, 5],
    tags: ["chapter-4", "chapter-5", "spending"],
    summary:
      "Leakages are income not spent on domestic consumption; injections are spending entering the domestic spending stream.",
    intuition:
      "Saving, taxes, and imports divert part of a spending round; investment, government purchases, and exports put spending back in.",
    explanation: [
      "In the four-sector model, equilibrium can be expressed by matching leakages with injections. The exact grouping follows the course’s accounting convention.",
      "Larger leakages reduce the multiplier because less of each extra income round becomes domestic demand.",
    ],
    whyItMatters:
      "It unifies the closed and open PAE models and helps explain why tax and import multipliers differ.",
    prerequisites: [
      "saving",
      "tax",
      "imports",
      "macro-investment",
      "government-spending",
      "exports",
    ],
    relatedConcepts: [
      "planned-aggregate-expenditure",
      "multiplier",
      "open-economy-pae",
    ],
    sourceRefs: [
      L("lecture-w3-l2", 46, "Open-economy leakages and multiplier."),
      L("lecture-w4-l1", 25, "Three- and four-sector fiscal multipliers."),
      T(134, "Open-economy PAE."),
    ],
  }),
  c({
    id: "open-economy-pae",
    name: "Open-economy PAE",
    aliases: ["open economy planned expenditure", "open-economy PAE"],
    searchTerms: ["PAE with imports and exports", "four-sector spending"],
    chapters: [4],
    tags: ["chapter-4", "international", "spending"],
    summary:
      "Open-economy PAE includes foreign trade, so imports are a leakage and exports are an injection into domestic spending.",
    intuition:
      "Some of the income generated at home is spent abroad, while foreign buyers can spend on domestic output.",
    explanation: [
      "The income response is smaller than in a closed economy when the marginal propensity to import is positive. Taxes can also reduce the domestic feedback.",
      "The model treats exports as autonomous in the simplest version, but exchange rates and foreign income can shift them in richer models.",
    ],
    whyItMatters:
      "It provides the short-run bridge from GDP accounting to international macro and the open-economy multiplier.",
    prerequisites: [
      "planned-aggregate-expenditure",
      "imports",
      "exports",
      "leakages-injections",
    ],
    relatedConcepts: [
      "open-economy-multiplier",
      "net-exports",
      "small-open-economy",
      "aggregate-demand",
    ],
    sourceRefs: [
      L("lecture-w3-l2", 46, "Open-economy multiplier and imports."),
      T(134, "Equilibrium in the open-economy model."),
    ],
  }),
  c({
    id: "open-economy-multiplier",
    name: "Open-economy multiplier",
    aliases: ["open economy multiplier", "four-sector multiplier"],
    searchTerms: [
      "multiplier reduced by imports and taxes",
      "small open spending multiplier",
    ],
    chapters: [4, 5],
    tags: ["chapter-4", "chapter-5", "calculation"],
    summary:
      "The open-economy multiplier is the output response to autonomous spending when taxes and imports create additional leakages.",
    intuition:
      "Each round loses more of the extra income before it becomes domestic spending, so the chain fades faster than in a closed two-sector model.",
    explanation: [
      "The exact denominator depends on whether the model includes proportional taxes, imports, and the MPC. Do not use the two-sector formula when those leakages appear.",
      "A larger marginal propensity to import lowers the multiplier because more induced spending buys foreign output.",
    ],
    whyItMatters:
      "It explains why the same fiscal impulse can have different short-run output effects across models.",
    prerequisites: ["open-economy-pae", "multiplier", "leakages-injections"],
    relatedConcepts: ["government-spending-multiplier", "tax-multiplier", "imports"],
    sourceRefs: [
      L("lecture-w3-l2", 46, "Open versus closed multiplier."),
      L("lecture-w4-l1", 25, "Four-sector multiplier formulas."),
      T(134, "Open-economy multiplier."),
    ],
  }),
  c({
    id: "short-run-equilibrium",
    name: "Short-run equilibrium",
    aliases: ["short run equilibrium", "short-run output equilibrium"],
    searchTerms: [
      "output equilibrium before prices fully adjust",
      "Keynesian short run",
    ],
    chapters: [4, 8],
    tags: ["chapter-4", "chapter-8", "output"],
    summary:
      "Short-run equilibrium is the model’s output level when planned spending and production are consistent before full price adjustment.",
    intuition:
      "Firms can change production and inventories more quickly than all prices, wages, and productive capacity can adjust.",
    explanation: [
      "In the income-expenditure model, short-run equilibrium is Y = PAE. In AD-AS, short-run equilibrium combines a demand relationship with an aggregate-supply relationship.",
      "It is not necessarily the long-run sustainable output level; an output gap can persist or trigger later adjustment.",
    ],
    whyItMatters:
      "It tells the learner which variables the model holds slow or fixed before interpreting a shock.",
    prerequisites: ["pae-equilibrium", "potential-output", "price-level"],
    relatedConcepts: [
      "long-run-equilibrium",
      "aggregate-demand",
      "aggregate-supply",
      "output-gap",
    ],
    sourceRefs: [
      T(119, "Income-expenditure short-run model."),
      T(223, "AD-AS short-run equilibrium."),
    ],
  }),
  c({
    id: "paradox-of-thrift",
    name: "Paradox of thrift",
    aliases: ["paradox of saving", "paradox of thrift"],
    searchTerms: [
      "everyone tries to save more and income falls",
      "saving increase lowers equilibrium output",
    ],
    chapters: [4],
    tags: ["chapter-4", "spending", "high-yield"],
    summary:
      "The paradox of thrift is the short-run result that an attempted increase in saving can lower income enough that aggregate saving does not rise as intended.",
    intuition:
      "If everyone cuts consumption at once, firms sell less, reduce production, and pay less income; the smaller income can offset the original saving desire.",
    explanation: [
      "The result comes from the short-run PAE model and its assumptions. It does not mean saving is never useful or that the long-run economy cannot benefit from resources available for investment.",
      "A shift in the saving function changes PAE and equilibrium output through the multiplier.",
    ],
    whyItMatters:
      "It tests whether the learner can distinguish a behavioural intention from the equilibrium outcome after feedback.",
    prerequisites: ["saving-function", "pae-equilibrium", "multiplier"],
    relatedConcepts: [
      "household-saving",
      "planned-aggregate-expenditure",
      "capital-accumulation",
    ],
    sourceRefs: [
      L("lecture-w3-l2", 55, "Paradox of thrift discussion."),
      T(131, "Paradox of thrift figure."),
    ],
  }),
  c({
    id: "fiscal-policy",
    name: "Fiscal policy",
    aliases: ["fiscal policy", "budget policy"],
    searchTerms: ["government spending and tax policy", "public demand management"],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "high-yield"],
    summary:
      "Fiscal policy is the use of government spending, taxes, and transfers to influence economic outcomes.",
    intuition:
      "Government changes its own demand or changes private disposable income, which can shift aggregate expenditure and the budget position.",
    explanation: [
      "Expansionary fiscal policy tends to raise PAE in the short-run model; contractionary fiscal policy tends to lower it. The final effect depends on multipliers, timing, monetary policy, and capacity.",
      "A policy can be discretionary, meaning an active decision, or automatic through tax and transfer rules that respond to income.",
    ],
    whyItMatters:
      "It is the course’s main government-side stabilisation tool and links PAE to deficits, debt, and output gaps.",
    prerequisites: ["government-spending", "tax", "planned-aggregate-expenditure"],
    relatedConcepts: [
      "government-spending-multiplier",
      "automatic-stabilisers",
      "discretionary-fiscal-policy",
      "fiscal-policy-lags",
    ],
    sourceRefs: [
      L("lecture-w4-l1", 1, "Fiscal policy lecture introduction."),
      T(139, "Government sector and fiscal policy."),
    ],
  }),
  c({
    id: "tax-function",
    name: "Tax function",
    aliases: ["tax equation", "T(Y)", "tax schedule"],
    searchTerms: ["taxes as a function of income", "autonomous and proportional taxes"],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "calculation"],
    summary:
      "A tax function describes how tax revenue varies with income in the model.",
    intuition:
      "A proportional tax makes the government’s revenue rise as income rises, so some of each extra income round leaks away automatically.",
    explanation: [
      String.raw`A common course form is \(T = T_0 + tY\): \(T_0\) is autonomous tax and t is the marginal tax rate. The average tax rate is total tax divided by income and need not equal t.`,
      "The function affects disposable income, the PAE slope, multipliers, and automatic stabilisation.",
    ],
    whyItMatters:
      "It supplies the algebra behind three-sector PAE and tax-multiplier questions.",
    prerequisites: ["tax", "income", "linear-equation"],
    relatedConcepts: [
      "marginal-tax-rate",
      "average-tax-rate",
      "disposable-income",
      "tax-multiplier",
    ],
    sourceRefs: [
      L("lecture-w4-l1", 4, "Tax function in the government-sector model."),
      T(142, "Tax function and fiscal multipliers."),
    ],
    equations: [
      {
        label: "Linear tax function",
        expression: String.raw`T = T_0 + tY`,
        variables: [
          { symbol: String.raw`T_0`, meaning: "autonomous tax" },
          { symbol: "t", meaning: "marginal tax rate" },
          { symbol: "Y", meaning: "income" },
        ],
        interpretation:
          "The model’s tax rule determines how a change in income changes disposable income.",
      },
    ],
  }),
  c({
    id: "marginal-tax-rate",
    name: "Marginal tax rate",
    aliases: ["marginal tax", "t", "MTR"],
    searchTerms: ["tax on the next dollar", "slope of tax function"],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "calculation"],
    summary:
      "The marginal tax rate is the extra tax paid when income increases by one more unit.",
    intuition:
      "It tells you how much of an additional dollar is diverted to government, not the average tax paid on all income.",
    explanation: [
      String.raw`In \(T = T_0 + tY\), t is the slope: \(\Delta T/\Delta Y\). It reduces the disposable-income and consumption response to an income increase.`,
      "A progressive tax system can have a marginal rate above its average rate; use the definition asked for in the question.",
    ],
    whyItMatters:
      "It controls the size of the three-sector multiplier and automatic stabiliser.",
    prerequisites: ["tax-function", "percentage-change"],
    relatedConcepts: [
      "average-tax-rate",
      "disposable-income",
      "government-spending-multiplier",
    ],
    sourceRefs: [
      L("lecture-w4-l1", 4, "Tax function slope and fiscal multipliers."),
      T(143, "Marginal and average tax rates."),
    ],
    equations: [
      {
        label: "Marginal tax rate",
        expression: String.raw`MTR = \frac{\Delta T}{\Delta Y}`,
        variables: [
          { symbol: String.raw`\Delta T`, meaning: "change in tax paid" },
          { symbol: String.raw`\Delta Y`, meaning: "change in income" },
        ],
        interpretation:
          "Use changes, not total tax divided by total income; that latter ratio is average tax rate.",
      },
    ],
  }),
  c({
    id: "average-tax-rate",
    name: "Average tax rate",
    aliases: ["average tax", "tax-to-income ratio"],
    searchTerms: ["total tax divided by income", "share of income taxed"],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "calculation"],
    summary: "The average tax rate is total tax paid divided by total income.",
    intuition:
      "It describes the average share of the whole income level paid in tax, not the tax on the next dollar.",
    explanation: [
      "Average and marginal rates coincide only in special cases. A nonzero autonomous tax or a nonlinear schedule can make them differ.",
      "The multiplier is controlled by marginal behaviour, so substituting the average rate into a marginal-tax formula gives the wrong result.",
    ],
    whyItMatters:
      "It is a near-neighbour calculation that catches whether the learner understands slope versus level ratio.",
    prerequisites: ["tax", "income", "ratio"],
    relatedConcepts: ["marginal-tax-rate", "tax-function", "disposable-income"],
    sourceRefs: [
      T(143, "Marginal versus average tax rates."),
      L("lecture-w4-l1", 4, "Tax function notation."),
    ],
    equations: [
      {
        label: "Average tax rate",
        expression: String.raw`\frac{\text{tax}}{\text{income}}`,
        variables: [
          { symbol: "tax", meaning: "total tax paid" },
          { symbol: "income", meaning: "total income" },
        ],
        interpretation:
          "Multiply by 100 for a percentage; this is a level ratio rather than a marginal response.",
      },
    ],
  }),
  c({
    id: "budget-balance",
    name: "Government budget balance",
    aliases: ["budget balance", "government surplus", "budget surplus"],
    searchTerms: ["revenue minus spending", "government surplus or deficit"],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "calculation"],
    summary:
      "The government budget balance is revenue minus government spending under the stated accounting convention.",
    intuition:
      "A positive balance means current revenue exceeds current spending; a negative balance is a deficit that must be financed.",
    explanation: [
      "The balance is a flow over a period. It changes the debt stock over time, but it is not itself the stock of debt.",
      "A balanced budget does not mean no government debt; it means the flow gap is zero for that period before interest and other adjustments.",
    ],
    whyItMatters:
      "It is the bridge from fiscal policy to public saving, deficit financing, and debt dynamics.",
    prerequisites: ["tax", "government-spending", "flow"],
    relatedConcepts: [
      "deficit",
      "debt-stock",
      "public-saving",
      "government-budget-constraint",
    ],
    sourceRefs: [
      L("lecture-w4-l2", 5, "Budget balance and deficit discussion."),
      T(150, "Australian government budget balance."),
    ],
    equations: [
      {
        label: "Simple budget balance",
        expression: String.raw`\text{balance} = \text{revenue} - \text{spending}`,
        variables: [
          { symbol: "revenue", meaning: "government receipts" },
          { symbol: "spending", meaning: "government current uses, as specified" },
        ],
        interpretation:
          "Positive is a surplus; negative is a deficit. Check whether interest and transfers are included in the question.",
      },
    ],
  }),
  c({
    id: "deficit",
    name: "Government deficit",
    aliases: ["budget deficit", "fiscal deficit", "deficits"],
    searchTerms: ["government spending exceeds revenue", "negative budget balance"],
    chapters: [5, 9],
    tags: ["chapter-5", "chapter-9", "fiscal", "high-yield"],
    summary:
      "A government deficit is a negative budget balance: government spending exceeds revenue over a period.",
    intuition:
      "The gap is a flow that must be financed, often by issuing debt or using other funding sources.",
    explanation: [
      "A deficit can be expansionary for short-run PAE, but it lowers public saving in the saving-investment model and can add to the debt stock.",
      "Deficit and debt are not synonyms. A country can have a large debt stock while running a balanced budget this year.",
    ],
    whyItMatters:
      "Deficit sign, debt stock, crowding out, and debt sustainability are deliberately separated in Chapter 5.",
    prerequisites: ["budget-balance", "flow", "public-saving"],
    relatedConcepts: ["debt-stock", "debt-gdp", "crowding-out", "current-account"],
    sourceRefs: [
      L("lecture-w4-l2", 5, "Deficits and fiscal policy."),
      T(150, "Budget balance and debt stock."),
    ],
    contrasts: [
      {
        conceptId: "debt-stock",
        title: "Deficit versus debt",
        difference:
          "A deficit is a flow during a period; debt is the accumulated stock owed at a date.",
      },
    ],
  }),
  c({
    id: "debt-stock",
    name: "Government debt stock",
    aliases: ["public debt", "government debt", "debt stock"],
    searchTerms: ["accumulated government borrowing", "stock of bonds issued"],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "stock"],
    summary:
      "Government debt is the stock of outstanding obligations accumulated from past borrowing.",
    intuition:
      "Annual deficits add to the debt balance, while surpluses can reduce it; interest costs can add to the stock even without new programme spending.",
    explanation: [
      "Debt is measured at a point in time. Its sustainability depends on interest rates, economic growth, primary balances, and the starting debt level.",
      "Government bonds are liabilities for the government and assets for bond holders; the debt stock is not the same as the annual budget deficit.",
    ],
    whyItMatters:
      "It is the stock side of fiscal accounting and the basis for debt-to-GDP and debt-stabilisation questions.",
    prerequisites: ["liability", "stock", "deficit", "bond"],
    relatedConcepts: [
      "debt-gdp",
      "debt-dynamics",
      "debt-sustainability",
      "government-budget-constraint",
    ],
    sourceRefs: [
      L("lecture-w4-l2", 20, "Debt stock and deficit flow."),
      T(151, "Stock of Australian government bonds."),
    ],
  }),
  c({
    id: "debt-gdp",
    name: "Debt-to-GDP ratio",
    aliases: ["debt GDP ratio", "debt-to-GDP", "public debt ratio"],
    searchTerms: ["government debt relative to economy size", "debt divided by GDP"],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "calculation"],
    summary:
      "The debt-to-GDP ratio compares the government debt stock with the economy’s annual output.",
    intuition:
      "A given dollar debt burden is easier to compare across countries or time when scaled by the income-generating size of the economy.",
    explanation: [
      "The numerator is a stock and the denominator is a flow, so the ratio is a comparison rather than a same-period accounting identity.",
      "The ratio can rise because debt rises, GDP falls, or nominal GDP growth is too slow relative to debt dynamics.",
    ],
    whyItMatters:
      "It is the course’s standard measure for debt sustainability and debt-dynamics calculations.",
    prerequisites: ["debt-stock", "gross-domestic-product", "ratio"],
    relatedConcepts: [
      "debt-dynamics",
      "debt-sustainability",
      "deficit",
      "stock",
      "flow",
    ],
    sourceRefs: [
      T(150, "Government debt and budget balance."),
      L("lecture-w4-l2", 20, "Debt stock and deficit flow."),
    ],
    equations: [
      {
        label: "Debt-to-GDP ratio",
        expression: String.raw`\frac{\text{debt stock}}{\text{nominal GDP}}`,
        variables: [
          { symbol: "debt stock", meaning: "outstanding government obligations" },
          { symbol: "nominal GDP", meaning: "current-dollar annual output" },
        ],
        interpretation:
          "Use the numerator and denominator dates specified; do not substitute the deficit flow for debt stock.",
      },
    ],
  }),
  c({
    id: "debt-dynamics",
    name: "Debt dynamics",
    aliases: ["debt-to-GDP dynamics", "debt accumulation equation"],
    searchTerms: ["how debt ratio changes", "interest growth primary balance"],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "calculation"],
    summary:
      "Debt dynamics describe how the debt stock or debt-to-GDP ratio evolves with interest, growth, and budget balances.",
    intuition:
      "Debt is easier to stabilise when the economy’s income base grows quickly and harder when interest compounds faster than income.",
    explanation: [
      "The course separates the primary balance, interest payments, and nominal GDP growth. The exact ratio equation depends on the notation and timing in the question.",
      "A deficit today does not mechanically imply an exploding debt ratio; the future path of interest, growth, and primary balances matters.",
    ],
    whyItMatters:
      "It gives a first-principles way to reason about debt sustainability rather than treating a debt number as self-explanatory.",
    prerequisites: ["debt-gdp", "deficit", "growth-rate", "interest-rate"],
    relatedConcepts: ["primary-budget-balance", "debt-sustainability", "golden-rule"],
    sourceRefs: [
      L("lecture-w4-l2", 20, "Debt dynamics and stabilisation."),
      T(153, "Government budget constraint and debt dynamics."),
    ],
  }),
  c({
    id: "primary-budget-balance",
    name: "Primary budget balance",
    aliases: ["primary balance", "primary surplus", "primary deficit"],
    searchTerms: [
      "budget balance before interest payments",
      "revenue minus non-interest spending",
    ],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "calculation"],
    summary:
      "The primary budget balance is government revenue minus spending excluding interest payments on existing debt.",
    intuition:
      "It asks whether current policy raises enough revenue to cover current non-interest programmes before the inherited debt-service bill arrives.",
    explanation: [
      "A primary surplus can coexist with an overall deficit if interest payments are large. That distinction is important for debt stabilisation.",
      "The term is a flow over a period, while debt is the accumulated stock.",
    ],
    whyItMatters:
      "It isolates the policy-controlled part of debt dynamics from interest costs inherited from past borrowing.",
    prerequisites: ["budget-balance", "debt-stock", "flow"],
    relatedConcepts: ["debt-dynamics", "debt-sustainability", "deficit"],
    sourceRefs: [
      T(153, "Government budget constraint."),
      L("lecture-w4-l2", 20, "Debt stabilisation terms."),
    ],
  }),
  c({
    id: "government-budget-constraint",
    name: "Government budget constraint",
    aliases: ["government financing constraint", "budget constraint"],
    searchTerms: ["deficit must be financed", "government sources and uses of funds"],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "accounting"],
    summary:
      "The government budget constraint records how spending and interest payments are financed by revenue, borrowing, or money creation under the model.",
    intuition:
      "The government cannot make a financing gap disappear: a shortfall must show up as a liability, a change in money, or another source specified by the accounting system.",
    explanation: [
      "The course uses the constraint to connect deficits, debt, interest payments, and primary balances. It is an accounting relation, while the macroeconomic effect of a deficit depends on the behavioural model.",
      "Do not confuse financing a purchase with measuring its effect on GDP; the source of funds and the current production purchased are separate questions.",
    ],
    whyItMatters:
      "It makes debt and deficit terminology concrete and supports debt sustainability analysis.",
    prerequisites: ["budget-balance", "debt-stock", "liability"],
    relatedConcepts: ["deficit", "primary-budget-balance", "debt-dynamics", "money"],
    sourceRefs: [
      T(153, "Government budget constraint section."),
      L("lecture-w4-l2", 20, "Debt financing and stabilisation."),
    ],
  }),
  c({
    id: "government-spending-multiplier",
    name: "Government spending multiplier",
    aliases: ["G multiplier", "government expenditure multiplier"],
    searchTerms: [
      "output response to government purchases",
      "fiscal spending multiplier",
    ],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "calculation", "high-yield"],
    summary:
      "The government spending multiplier is the equilibrium output change caused by a one-unit change in government purchases.",
    intuition:
      "Government purchases are a direct component of PAE, so their first round is not reduced by the household’s initial saving decision; later rounds still leak.",
    explanation: [
      "In the three-sector model the multiplier is positive and can exceed one. Proportional taxes and imports reduce it by weakening induced domestic spending.",
      "The tax multiplier has a different sign and usually a different magnitude because taxes affect PAE indirectly through disposable income.",
    ],
    whyItMatters:
      "It is a high-yield comparison in fiscal policy and a direct application of the income-expenditure multiplier.",
    prerequisites: [
      "fiscal-policy",
      "multiplier",
      "government-spending",
      "tax-function",
    ],
    relatedConcepts: [
      "tax-multiplier",
      "balanced-budget-multiplier",
      "open-economy-multiplier",
    ],
    sourceRefs: [
      L("lecture-w4-l1", 25, "Three-sector fiscal multipliers."),
      T(144, "Fiscal multiplier comparison."),
    ],
  }),
  c({
    id: "tax-multiplier",
    name: "Tax multiplier",
    aliases: ["tax/transfer multiplier", "tax multiplier"],
    searchTerms: [
      "output response to autonomous tax change",
      "effect of tax cut on output",
    ],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "calculation"],
    summary:
      "The tax multiplier measures the output response to a change in autonomous taxes in the PAE model.",
    intuition:
      "A tax cut first raises disposable income, but households spend only the MPC share, so the initial effect is smaller than an equal direct government purchase.",
    explanation: [
      "The tax multiplier is negative for a tax increase and positive for a tax cut in the usual sign convention. Its magnitude is generally smaller than the government spending multiplier when MPC is below one.",
      "Use the specified tax function: an autonomous tax change is not the same as a change in the marginal tax rate.",
    ],
    whyItMatters: "It tests indirect versus direct fiscal effects and sign discipline.",
    prerequisites: ["tax-function", "disposable-income", "multiplier"],
    relatedConcepts: [
      "government-spending-multiplier",
      "balanced-budget-multiplier",
      "automatic-stabilisers",
    ],
    sourceRefs: [
      L("lecture-w4-l1", 25, "Tax and transfer multipliers."),
      T(144, "Fiscal multiplier comparison."),
    ],
  }),
  c({
    id: "balanced-budget-multiplier",
    name: "Balanced-budget multiplier",
    aliases: ["balanced budget multiplier", "BB multiplier"],
    searchTerms: [
      "equal tax and government spending change",
      "balanced fiscal expansion",
    ],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "calculation"],
    summary:
      "The balanced-budget multiplier is the output effect when government spending and taxes change by equal amounts.",
    intuition:
      "Government purchases enter demand dollar-for-dollar, while taxes reduce demand only through the fraction of income households would have spent.",
    explanation: [
      "In the basic model the balanced-budget multiplier can be positive even when the budget remains balanced because the direct spending effect exceeds the indirect tax effect.",
      "Its exact value depends on the model’s sectors and tax rule; do not assume a universal number outside the stated assumptions.",
    ],
    whyItMatters:
      "It is a classic fiscal-policy calculation that combines two multipliers rather than inventing a new mechanism.",
    prerequisites: [
      "government-spending-multiplier",
      "tax-multiplier",
      "budget-balance",
    ],
    relatedConcepts: ["fiscal-policy", "automatic-stabilisers", "multiplier"],
    sourceRefs: [
      L("lecture-w4-l1", 38, "Balanced-budget multiplier."),
      T(145, "Balanced-budget fiscal multiplier."),
    ],
  }),
  c({
    id: "automatic-stabilisers",
    name: "Automatic stabilisers",
    aliases: ["automatic stabilizer", "automatic stabilisers"],
    searchTerms: [
      "taxes and transfers respond automatically to income",
      "built-in fiscal stabilisation",
    ],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "stabilisation"],
    summary:
      "Automatic stabilisers change taxes or transfers with economic conditions without a new discretionary policy vote.",
    intuition:
      "When income falls, tax payments may fall and transfers may rise, cushioning disposable income and spending; the reverse can occur in a boom.",
    explanation: [
      "A proportional tax creates an automatic leakage when income rises, while unemployment benefits or other transfers can support income during a downturn.",
      "Automatic stabilisers reduce fluctuations but do not necessarily eliminate an output gap or guarantee a balanced budget every period.",
    ],
    whyItMatters:
      "It distinguishes built-in fiscal responses from deliberate changes in government settings.",
    prerequisites: ["tax-function", "disposable-income", "fiscal-policy"],
    relatedConcepts: [
      "discretionary-fiscal-policy",
      "fiscal-policy-lags",
      "tax-multiplier",
    ],
    sourceRefs: [
      L("lecture-w4-l2", 5, "Automatic and discretionary fiscal policy."),
      T(146, "Fiscal policy and output gaps."),
    ],
  }),
  c({
    id: "discretionary-fiscal-policy",
    name: "Discretionary fiscal policy",
    aliases: ["discretionary policy", "active fiscal policy"],
    searchTerms: [
      "deliberate government policy change",
      "new spending or tax decision",
    ],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "stabilisation"],
    summary:
      "Discretionary fiscal policy is an intentional change in government spending, taxes, or transfers made in response to conditions.",
    intuition:
      "The government changes a policy setting rather than allowing an existing rule to respond automatically.",
    explanation: [
      "Discretionary policy can close an output gap in the model, but recognition, decision, implementation, and impact lags make timing important.",
      "It can affect debt and future taxes, and monetary policy may respond to the same shock.",
    ],
    whyItMatters:
      "It is the policy action contrasted with automatic stabilisers and a source of fiscal timing errors.",
    prerequisites: ["fiscal-policy", "government-spending", "tax"],
    relatedConcepts: [
      "automatic-stabilisers",
      "fiscal-policy-lags",
      "demand-stabilisation",
      "deficit",
    ],
    sourceRefs: [
      L("lecture-w4-l2", 5, "Discretionary fiscal policy and lags."),
      T(146, "Fiscal policy response to output gaps."),
    ],
  }),
  c({
    id: "fiscal-policy-lags",
    name: "Fiscal-policy lags",
    aliases: ["policy lags", "fiscal lags"],
    searchTerms: [
      "delay before fiscal policy affects output",
      "recognition decision implementation impact lag",
    ],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "timing"],
    summary:
      "Fiscal-policy lags are delays between recognising a problem, deciding on policy, implementing it, and seeing its effect.",
    intuition:
      "A policy chosen for last quarter’s conditions can arrive after households and firms have already adjusted to a different economy.",
    explanation: [
      "The course distinguishes recognition, decision, implementation, and impact delays. Automatic stabilisers usually have shorter decision lags than discretionary measures.",
      "A badly timed expansion can arrive during recovery and amplify rather than close the intended output gap.",
    ],
    whyItMatters:
      "It qualifies simple multiplier chains and explains why policy is not an instant remote control for GDP.",
    prerequisites: [
      "discretionary-fiscal-policy",
      "short-run-equilibrium",
      "output-gap",
    ],
    relatedConcepts: ["automatic-stabilisers", "fiscal-policy", "demand-stabilisation"],
    sourceRefs: [
      L("lecture-w4-l2", 5, "Fiscal policy lags."),
      T(149, "Fiscal policy timing discussion."),
    ],
  }),
  c({
    id: "debt-sustainability",
    name: "Debt sustainability",
    aliases: ["sustainable public debt", "debt stabilisation"],
    searchTerms: ["can debt ratio remain stable", "debt path not exploding"],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "calculation"],
    summary:
      "Debt is sustainable when the government can meet its obligations without an explosive debt path or implausible future adjustment.",
    intuition:
      "A debt ratio can be carried when the economy’s income base and primary balances are sufficient relative to interest costs.",
    explanation: [
      "Sustainability depends on the debt stock, interest rate, nominal GDP growth, and primary balance. A deficit is not automatically unsustainable, and a surplus is not automatically sufficient.",
      "The course’s debt-stabilisation calculations are conditional on the stated constant rates and accounting conventions.",
    ],
    whyItMatters:
      "It turns debt from a scary level into a dynamic comparison of flows and growth.",
    prerequisites: [
      "debt-dynamics",
      "debt-gdp",
      "primary-budget-balance",
      "growth-rate",
    ],
    relatedConcepts: [
      "golden-rule",
      "government-budget-constraint",
      "deficit",
      "public-debt-costs",
    ],
    sourceRefs: [
      L("lecture-w4-l2", 20, "Debt stabilisation discussion."),
      T(153, "Debt sustainability and government budget constraint."),
    ],
  }),
  c({
    id: "public-debt-costs",
    name: "Public debt costs",
    aliases: ["costs of public debt", "debt interest burden"],
    searchTerms: ["interest burden of government debt", "cost of servicing debt"],
    chapters: [5],
    tags: ["chapter-5", "fiscal"],
    summary:
      "Public debt costs are the interest, resource, and policy trade-offs associated with outstanding government obligations.",
    intuition:
      "Debt can finance useful spending, but future budgets must devote resources to interest and repayment or refinancing.",
    explanation: [
      "Interest payments are part of debt dynamics and can widen an overall deficit even when the primary balance is positive.",
      "The macroeconomic cost depends on the use of borrowed funds, interest rates, growth, taxes, and private-sector responses such as crowding out.",
    ],
    whyItMatters:
      "It stops debt sustainability from being reduced to a single debt-to-GDP threshold.",
    prerequisites: ["debt-stock", "interest-rate", "debt-dynamics"],
    relatedConcepts: ["primary-budget-balance", "debt-sustainability", "crowding-out"],
    sourceRefs: [
      T(153, "Debt financing and interest in the government budget constraint."),
      L("lecture-w4-l2", 20, "Debt stabilisation terms."),
    ],
  }),
  c({
    id: "golden-rule",
    name: "Golden rule of public finance",
    aliases: ["golden rule", "public investment golden rule"],
    searchTerms: ["borrow to invest rule", "public investment and current spending"],
    chapters: [5],
    tags: ["chapter-5", "fiscal"],
    summary:
      "The fiscal golden rule is a principle that borrowing should generally finance productive public investment rather than ordinary current spending.",
    intuition:
      "Future generations may benefit from infrastructure, so matching its cost to future benefits is different from borrowing simply to pay recurring bills.",
    explanation: [
      "The rule is a policy principle, not a mechanical identity. Whether public investment is productive and whether debt is sustainable still require analysis.",
      "The course uses it to discuss debt, public capital, and intergenerational trade-offs.",
    ],
    whyItMatters:
      "It illustrates why the composition and purpose of fiscal policy matter alongside the deficit headline.",
    prerequisites: ["fiscal-policy", "public-saving", "capital"],
    relatedConcepts: [
      "debt-sustainability",
      "government-budget-constraint",
      "public-debt-costs",
    ],
    sourceRefs: [
      L("lecture-w4-l2", 30, "Golden rule and public investment."),
      T(153, "Rule of pay-as-you-use public capital."),
    ],
  }),
  c({
    id: "fiscal-output-gap",
    name: "Fiscal policy and the output gap",
    aliases: ["fiscal policy output gap", "closing an output gap"],
    searchTerms: ["fiscal stabilisation", "government response to contractionary gap"],
    chapters: [5],
    tags: ["chapter-5", "fiscal", "stabilisation"],
    summary:
      "Fiscal policy can be used to shift planned expenditure and reduce an output gap, subject to timing and model assumptions.",
    intuition:
      "If private demand leaves firms producing below potential, government can add demand directly or support private disposable income.",
    explanation: [
      "An expansionary package can raise output through a multiplier, while a contractionary package can cool an expansionary gap. The policy may also change interest rates, inflation, and debt.",
      "The correct sign depends on whether the gap is contractionary or expansionary and whether the question asks for a shift or a movement.",
    ],
    whyItMatters:
      "It is the policy application of PAE, multipliers, output gaps, and fiscal lags.",
    prerequisites: ["fiscal-policy", "output-gap", "multiplier", "fiscal-policy-lags"],
    relatedConcepts: [
      "discretionary-fiscal-policy",
      "automatic-stabilisers",
      "demand-stabilisation",
      "aggregate-demand",
    ],
    sourceRefs: [
      L("lecture-w4-l2", 5, "Fiscal policy and output-gap stabilisation."),
      T(146, "Fiscal policy eliminates contractionary output gap."),
    ],
  }),
] as const;
