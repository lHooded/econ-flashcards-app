import { c, L, T } from "./records";

export const courseRecordsC = [
  c({
    id: "financial-asset",
    name: "Financial asset",
    aliases: ["financial assets", "financial claim"],
    searchTerms: ["claim on future payment", "paper or account with financial value"],
    chapters: [3, 6],
    tags: ["chapter-3", "chapter-6", "finance"],
    summary:
      "A financial asset is a claim on future money or resources issued by another person or institution.",
    intuition:
      "A deposit, bond, or loan contract is valuable to its holder because someone else promises payment or access to funds.",
    explanation: [
      "The asset is recorded on the holder’s balance sheet and the matching obligation is a liability of the issuer. A financial asset can transfer funds without itself being new physical production.",
      "Its return depends on promised payments, price paid, timing, risk, and market interest rates.",
    ],
    whyItMatters:
      "It separates financial investment from macroeconomic investment and supplies the bridge to bonds, money, and banks.",
    prerequisites: ["asset", "liability", "future-payment"],
    relatedConcepts: [
      "asset-return",
      "bond",
      "money",
      "bank-balance-sheet",
      "macro-investment",
    ],
    sourceRefs: [
      L("lecture-w5-l1", 7, "Bonds as legally enforceable debt promises."),
      T(164, "Financial assets and asset returns."),
    ],
    misconceptions: [
      "Buying a financial asset can finance production, but the purchase itself is not automatically investment in GDP.",
    ],
  }),
  c({
    id: "asset-return",
    name: "Asset return",
    aliases: ["return on an asset", "financial return"],
    searchTerms: ["gain from holding an asset", "income and price return"],
    chapters: [6],
    tags: ["chapter-6", "finance", "calculation"],
    summary:
      "An asset return is the gain from holding an asset, relative to the price paid and over a stated period.",
    intuition:
      "The same promised payment gives a different return to buyers who pay different prices for it.",
    explanation: [
      "Returns can include cash payments and changes in market price. A bond’s yield is a return measure that reflects its price and promised payments.",
      "Always state the holding period and whether the return is nominal or real when comparing assets.",
    ],
    whyItMatters:
      "It explains why bond price and yield are linked and why a fixed payment does not imply a fixed return to every buyer.",
    prerequisites: ["financial-asset", "future-payment", "present-value", "rate"],
    relatedConcepts: [
      "bond-yield",
      "bond-price",
      "nominal-interest-rate",
      "real-interest-rate",
    ],
    sourceRefs: [
      L("lecture-w5-l1", 10, "Bond elements and return calculation."),
      T(164, "General formula for asset returns."),
    ],
    equations: [
      {
        label: "Simple holding return",
        expression: "(income + price gain) / price paid",
        variables: [
          { symbol: "income", meaning: "cash payment received" },
          { symbol: "price gain", meaning: "change in market price" },
          { symbol: "price paid", meaning: "initial asset price" },
        ],
        interpretation:
          "The return is a rate; the asset’s cash payment is only one part of the return when resale is possible.",
      },
    ],
  }),
  c({
    id: "bond",
    name: "Bond",
    aliases: ["bonds", "debt security", "government bond", "corporate bond"],
    searchTerms: ["government IOU", "tradable loan promise", "borrower promise to pay"],
    chapters: [3, 6, 7],
    tags: ["chapter-6", "finance", "high-yield"],
    summary:
      "A bond is a tradable promise by an issuer to make specified future payments to its holder.",
    intuition:
      "Buying a bond is essentially lending: give the issuer funds now and receive coupon payments, the face value, or both later.",
    explanation: [
      "The issuer has a liability and the holder has an asset. A bond’s term or maturity says when the principal is repaid; coupon payments are the scheduled interest-like payments before then.",
      "Bonds can be traded before maturity. The promised payments may stay fixed while the price changes so that a new buyer receives a market-competitive yield.",
      "A bond is not the same as money: it is a claim that usually pays later and may not be accepted directly for everyday purchases.",
    ],
    whyItMatters:
      "Bond pricing is the course’s clearest numerical example of present value and the bond-yield/interest-rate relationship.",
    prerequisites: [
      "financial-asset",
      "borrowing",
      "lending",
      "future-payment",
      "asset",
    ],
    relatedConcepts: [
      "bond-price",
      "bond-yield",
      "face-value",
      "coupon-payment",
      "maturity",
      "open-market-operation",
    ],
    mechanism: [
      "issuer borrows funds by promising future payments",
      "buyer holds the promise as an asset",
      "bond can be resold before maturity",
      "market price adjusts so the return matches current required rates",
    ],
    examples: [
      {
        title: "Tradable IOU",
        text: "A government can issue a bond to borrow now. An investor can later sell that bond; the government’s promised payment need not change just because the market price did.",
        takeaway:
          "The bond’s promise, market price, and yield are separate pieces of the story.",
      },
    ],
    misconceptions: [
      "A bond is not a bank deposit or cash. It is a tradable debt claim with specified future payments.",
      "Buying a bond is financial lending, not macroeconomic investment in newly produced capital.",
    ],
    sourceRefs: [
      L("lecture-w5-l1", 7, "Bond definition and debt promise."),
      L("lecture-w5-l1", 18, "Bonds can be bought and sold before maturity."),
      T(165, "Bond pricing and market interest rates."),
    ],
  }),
  c({
    id: "face-value",
    name: "Bond face value",
    aliases: ["face value", "principal of a bond", "par value"],
    searchTerms: ["amount repaid at maturity", "bond principal"],
    chapters: [6],
    tags: ["chapter-6", "finance"],
    summary:
      "Face value is the bond amount promised to be repaid at maturity, under the course’s simple bond convention.",
    intuition:
      "A $1,000 face-value bond promises $1,000 at the repayment date even if buyers trade it today for $950 or $1,050.",
    explanation: [
      "Face value is a promised payment, not necessarily the current market price. Coupon payments can be paid before maturity in addition to face value.",
      "The price paid today is the present value of face value and coupons discounted at the relevant market rate.",
    ],
    whyItMatters:
      "It prevents a fixed repayment amount from being confused with a fixed bond price or yield.",
    prerequisites: ["principal", "bond", "future-payment"],
    relatedConcepts: ["coupon-payment", "maturity", "bond-price", "bond-yield"],
    sourceRefs: [
      L("lecture-w5-l1", 10, "Principal or face value as a bond element."),
      T(165, "Bond principal and term example."),
    ],
  }),
  c({
    id: "coupon-payment",
    name: "Coupon payment",
    aliases: ["coupon", "bond coupon", "coupon payments"],
    searchTerms: ["regular bond interest payment", "scheduled payment before maturity"],
    chapters: [6],
    tags: ["chapter-6", "finance", "calculation"],
    summary:
      "A coupon payment is a scheduled cash payment made by a bond issuer before the bond matures.",
    intuition:
      "It is part of the bond’s promised cash-flow stream, like rent paid to the lender while the principal remains outstanding.",
    explanation: [
      "The coupon amount is set by the bond contract. The coupon rate and the market yield are different: the coupon is based on face value, while yield reflects the price paid today.",
      "A bond with fixed coupons can trade at a premium or discount when market interest rates differ from its coupon rate.",
    ],
    whyItMatters:
      "It gives the learner the payment-by-payment structure needed to calculate a bond’s present value.",
    prerequisites: ["bond", "interest", "future-payment"],
    relatedConcepts: ["face-value", "maturity", "bond-price", "bond-yield"],
    sourceRefs: [
      L("lecture-w5-l1", 10, "Coupon payment as a bond element."),
      T(165, "Bond cash flows."),
    ],
  }),
  c({
    id: "maturity",
    name: "Bond maturity",
    aliases: ["maturity", "term of a bond", "matures"],
    searchTerms: ["when bond is repaid", "length of time until principal repayment"],
    chapters: [6],
    tags: ["chapter-6", "finance"],
    summary:
      "Maturity is the date or remaining term at which a bond’s principal is repaid.",
    intuition:
      "A two-year bond has more time for market rates and inflation expectations to change before its final repayment than a one-year bond.",
    explanation: [
      "Maturity is a time dimension of the bond. It affects present value and usually makes a bond’s price more sensitive to interest-rate changes when the remaining term is longer.",
      "Maturity is not the same as coupon frequency or the current holding period of an investor.",
    ],
    whyItMatters:
      "It explains why bond price sensitivity and yield-curve questions depend on the term structure.",
    prerequisites: ["bond", "future-payment", "rate"],
    relatedConcepts: ["face-value", "coupon-payment", "bond-price", "yield-curve"],
    sourceRefs: [
      L("lecture-w5-l1", 10, "Term or maturity as a bond element."),
      T(165, "Bond term and present value."),
    ],
  }),
  c({
    id: "bond-price",
    name: "Bond price",
    aliases: ["bond prices", "price of a bond"],
    searchTerms: ["market price of government IOU", "present value of bond payments"],
    chapters: [0, 6, 7],
    tags: ["chapter-6", "finance", "calculation", "high-yield"],
    summary:
      "A bond price is the amount a buyer pays today for the bond’s promised future payments.",
    intuition:
      "The promised payments are fixed by the contract, but the price today adjusts so the buyer earns a return comparable with other investments.",
    explanation: [
      "Bond price is the present value of coupons and face value discounted at the relevant market interest rate. If the required market rate rises, the same fixed payments are worth less today.",
      "The inverse price-yield relationship is a calculation result, not a rule that the bond issuer changed its promise.",
    ],
    whyItMatters:
      "It is the key asset-market mechanism behind monetary policy open-market operations and yield movements.",
    prerequisites: [
      "bond",
      "present-value",
      "interest-rate",
      "coupon-payment",
      "maturity",
    ],
    relatedConcepts: [
      "bond-yield",
      "nominal-interest-rate",
      "open-market-operation",
      "asset-return",
    ],
    mechanism: [
      "bond’s promised payments stay fixed",
      "market interest rates rise",
      "a new buyer requires a higher return",
      "the existing bond must sell for a lower price to deliver that return",
    ],
    equations: [
      {
        label: "One-payment bond",
        expression: "Pᴮ = F / (1 + i)ᵀ",
        variables: [
          { symbol: "Pᴮ", meaning: "bond price today" },
          { symbol: "F", meaning: "face-value payment at maturity" },
          { symbol: "i", meaning: "market interest rate per period" },
          { symbol: "T", meaning: "remaining periods to maturity" },
        ],
        interpretation:
          "For coupon bonds, add the present values of each coupon and the final face value.",
      },
    ],
    misconceptions: [
      "A higher bond price does not mean the fixed coupon or face value increased.",
      "Bond price and bond yield are not the same variable: a price change can be the way yield changes.",
    ],
    contrasts: [
      {
        conceptId: "bond-yield",
        title: "Bond price versus bond yield",
        difference:
          "Price is the dollars paid today; yield is the return implied by that price and the promised payments.",
      },
    ],
    sourceRefs: [
      L("lecture-w5-l1", 18, "Bond trading before maturity."),
      L("lecture-w5-l1", 24, "Inverse bond-price and interest-rate result."),
      T(166, "Bond price response to market interest rates."),
    ],
  }),
  c({
    id: "bond-yield",
    name: "Bond yield",
    aliases: ["bond yields", "yield to maturity", "yield"],
    searchTerms: ["return implied by bond price", "return on a bond"],
    chapters: [6, 7],
    tags: ["chapter-6", "chapter-7", "finance", "high-yield"],
    summary:
      "A bond yield is the return implied by the bond’s promised payments, current price, and remaining term.",
    intuition:
      "Buying the same fixed-payment bond cheaply gives a higher return than buying it expensively, so yield moves opposite to price.",
    explanation: [
      "Yield is not necessarily the coupon rate. Coupon rate is based on the contract and face value; yield incorporates the market price and time to maturity.",
      "Longer-term yields may reflect expected future short-term rates and a term premium, so they need not equal the current cash rate.",
    ],
    whyItMatters:
      "It connects the bond market to market interest rates, the yield curve, and the RBA’s short-term policy instrument.",
    prerequisites: ["bond-price", "bond", "asset-return", "interest-rate"],
    relatedConcepts: [
      "bond-price",
      "yield-curve",
      "expectations-hypothesis",
      "term-premium",
      "cash-rate",
    ],
    sourceRefs: [
      L("lecture-w5-l1", 5, "Australian bond yields."),
      L("lecture-w7-l1", 4, "Term structure and longer-term rates."),
      T(87, "Bond interest-rate figures."),
    ],
    contrasts: [
      {
        conceptId: "interest-rate",
        title: "Bond yield versus interest rate",
        difference:
          "Yield is a return measure for a particular bond at its current price; interest rate is the broader category of borrowing or lending rates.",
      },
    ],
  }),
  c({
    id: "money",
    name: "Money",
    aliases: ["money balances", "cash"],
    searchTerms: [
      "means of payment",
      "what people hold to buy things",
      "spendable balances",
    ],
    chapters: [6, 7],
    tags: ["chapter-6", "finance", "high-yield"],
    summary:
      "Money is an asset accepted for payment and used as a unit of account and store of value.",
    intuition:
      "Money solves the problem of having to find someone who wants exactly what you offer before they will trade with you.",
    explanation: [
      "The course’s functions of money are medium of exchange, unit of account, and store of value. Currency and transaction deposits are examples of money in the relevant aggregates.",
      "Money is wealth in the sense of an asset, but wealth includes many non-money assets. Money demand is demand to hold liquid payment power, not demand for current goods.",
    ],
    whyItMatters:
      "Money demand, bank deposits, the quantity equation, and central-bank operating procedures all depend on this first-principles definition.",
    prerequisites: ["asset", "market", "price"],
    relatedConcepts: [
      "money-functions",
      "fiat-money",
      "money-stock",
      "money-demand",
      "reserves",
    ],
    misconceptions: [
      "Money is not the same as total wealth; a bond or house can be wealth without being money used for everyday payment.",
      "Money demand is not demand for goods and services.",
    ],
    sourceRefs: [
      L("lecture-w5-l1", 35, "Money as a store of value and medium of exchange."),
      T(167, "Money and financial assets."),
    ],
  }),
  c({
    id: "money-functions",
    name: "Functions of money",
    aliases: [
      "functions of money",
      "medium of exchange",
      "unit of account",
      "store of value",
    ],
    searchTerms: ["why money exists", "roles money plays"],
    chapters: [6],
    tags: ["chapter-6", "finance"],
    summary:
      "Money serves as a medium of exchange, unit of account, and store of value.",
    intuition:
      "A common payment asset lets prices be quoted in one unit and lets people carry purchasing power between transactions.",
    explanation: [
      "As a medium of exchange, money is accepted in trade. As a unit of account, it provides the common prices used in contracts and calculation. As a store of value, it carries purchasing power through time, though inflation can erode it.",
      "An asset can perform one function well without being the best money for all three.",
    ],
    whyItMatters:
      "It makes the money-demand and fiat-money discussions meaningful rather than a list of labels.",
    prerequisites: ["money", "asset", "price"],
    relatedConcepts: ["fiat-money", "money-demand", "price-level", "inflation"],
    sourceRefs: [
      L("lecture-w5-l1", 35, "Functions of money."),
      T(167, "Money functions."),
    ],
  }),
  c({
    id: "fiat-money",
    name: "Fiat money",
    aliases: ["fiat currency", "fiat money"],
    searchTerms: ["money not backed by commodity", "government-issued currency"],
    chapters: [6],
    tags: ["chapter-6", "finance"],
    summary:
      "Fiat money is money accepted because of legal, institutional, and social arrangements rather than a promise to redeem it for a fixed commodity.",
    intuition:
      "A polymer note is useful not because the plastic is worth its face value, but because others accept it and the monetary system supports its use.",
    explanation: [
      "Its value depends on trust, limited supply relative to demand, and the institutions that define and accept it. Fiat money can lose purchasing power through inflation.",
      "Bank deposits can function as money even though they are liabilities of private banks rather than physical notes issued directly to every user.",
    ],
    whyItMatters:
      "It separates the physical object from the monetary institution and leads into bank money creation.",
    prerequisites: ["money", "money-functions", "liability"],
    relatedConcepts: [
      "money-stock",
      "bank-balance-sheet",
      "money-creation",
      "inflation",
    ],
    sourceRefs: [
      T(167, "Money and monetary aggregates."),
      L("lecture-w5-l1", 84, "Money and prices."),
    ],
  }),
  c({
    id: "money-stock",
    name: "Money stock",
    aliases: ["money supply", "money stock", "M"],
    searchTerms: ["amount of money in circulation", "quantity of money"],
    chapters: [6],
    tags: ["chapter-6", "finance", "calculation"],
    summary:
      "The money stock is the quantity of assets counted as money in a specified monetary aggregate at a point in time.",
    intuition:
      "It is a balance of spendable payment assets, not a flow of new spending during the period.",
    explanation: [
      "Different aggregates include different forms of currency and deposits. The chosen definition matters, and a change in the money stock is not automatically a change in real wealth or output.",
      "Banks can create deposits through lending, while the central bank controls or influences settlement balances and the monetary conditions of the system.",
    ],
    whyItMatters:
      "It is the stock side of the quantity equation and the bridge between banks and inflation.",
    prerequisites: ["money", "stock", "bank-balance-sheet"],
    relatedConcepts: [
      "money-demand",
      "money-creation",
      "quantity-equation",
      "quantity-theory",
    ],
    sourceRefs: [
      L("lecture-w5-l1", 84, "Money and prices lecture."),
      T(169, "Monetary aggregates and money stock."),
    ],
  }),
  c({
    id: "money-demand",
    name: "Money demand",
    aliases: ["demand for money", "money-demand curve", "Md"],
    searchTerms: [
      "desire to hold money",
      "liquidity preference",
      "want to hold payment balances",
    ],
    chapters: [6],
    tags: ["chapter-6", "finance", "high-yield"],
    summary:
      "Money demand is the amount of money people wish to hold at a given price level, income, and opportunity cost.",
    intuition:
      "People hold money for transactions and safety even though another asset may pay interest; the opportunity cost of holding money matters.",
    explanation: [
      "Higher income can increase transactions demand. A higher nominal interest rate can make non-money assets more attractive, reducing the desired money balance, all else equal.",
      "A movement along money demand follows from the variable on the curve changing; a shift comes from income, payment technology, or other determinants changing.",
    ],
    whyItMatters:
      "It explains why money balances are held and why money-market graphs are not graphs of demand for goods.",
    prerequisites: ["money", "demand", "income", "nominal-interest-rate"],
    relatedConcepts: [
      "nominal-money-demand",
      "real-money-demand",
      "money-stock",
      "velocity",
    ],
    sourceRefs: [
      T(170, "Transactions demand for money."),
      L("lecture-w5-l1", 49, "Opportunity cost of holding money."),
    ],
    misconceptions: [
      "Money demand means desired money holdings, not a desire to buy more goods.",
    ],
  }),
  c({
    id: "nominal-money-demand",
    name: "Nominal money demand",
    aliases: ["nominal demand for money", "money demand in dollars"],
    searchTerms: ["dollar amount of money held", "money balances at current prices"],
    chapters: [6],
    tags: ["chapter-6", "finance", "calculation"],
    summary:
      "Nominal money demand is the desired number of currency units or dollars held.",
    intuition:
      "If every price doubles, a household may need roughly twice as many dollars for the same purchases even if its desired purchasing power is unchanged.",
    explanation: [
      "Nominal demand depends on the price level as well as real activity and interest rates. Dividing by the price level gives real money demand.",
      "Do not compare dollar balances across periods without considering inflation.",
    ],
    whyItMatters:
      "It makes the nominal-versus-real money-demand calculation transparent.",
    prerequisites: ["money-demand", "nominal", "price-level"],
    relatedConcepts: ["real-money-demand", "money-stock", "inflation"],
    sourceRefs: [
      T(171, "Demand for money and price level."),
      L("lecture-w5-l1", 49, "Money’s opportunity cost and transactions demand."),
    ],
  }),
  c({
    id: "real-money-demand",
    name: "Real money demand",
    aliases: ["real balances", "real demand for money"],
    searchTerms: [
      "purchasing-power amount of money held",
      "money balances divided by prices",
    ],
    chapters: [6],
    tags: ["chapter-6", "finance", "calculation"],
    summary:
      "Real money demand is nominal money demand divided by the price level, measuring the purchasing power of desired balances.",
    intuition:
      "It asks how many representative baskets the money balance can command rather than how many dollar notes it contains.",
    explanation: [
      "A higher price level raises the dollar balance needed to hold the same real money purchasing power. Income and the interest opportunity cost can shift real money demand.",
      "This is a demand concept, not the same as the real money stock supplied by the monetary system.",
    ],
    whyItMatters:
      "It prepares the quantity-theory and money-market calculations and prevents price-level scaling errors.",
    prerequisites: ["nominal-money-demand", "price-level", "real"],
    relatedConcepts: ["money-demand", "money-stock", "quantity-equation"],
    sourceRefs: [
      T(171, "Demand for money and real balances."),
      L("lecture-w5-l1", 49, "Money held for transactions."),
    ],
    equations: [
      {
        label: "Real money demand",
        expression: "Mᵈ / P",
        variables: [
          { symbol: "Mᵈ", meaning: "nominal money demand" },
          { symbol: "P", meaning: "price level" },
        ],
        interpretation:
          "The units are purchasing power; a higher price level reduces real balances for a fixed nominal holding.",
      },
    ],
  }),
  c({
    id: "velocity",
    name: "Velocity of money",
    aliases: ["velocity", "income velocity"],
    searchTerms: ["how often money is used", "turnover of money"],
    chapters: [6],
    tags: ["chapter-6", "finance", "calculation"],
    summary:
      "Velocity is the average number of times a unit of money is used to support transactions in a period.",
    intuition:
      "A dollar can support more spending if it changes hands frequently; it can support less current spending if people hold it.",
    explanation: [
      "Velocity is defined from the quantity equation as nominal output divided by the money stock. It is a ratio, not a physical speed.",
      "If velocity is stable, money growth and nominal output growth have a close relationship; if velocity changes, that shortcut breaks.",
    ],
    whyItMatters:
      "It is the missing term in the quantity equation and helps explain why money growth alone does not mechanically equal inflation.",
    prerequisites: ["money-stock", "nominal-gdp", "ratio"],
    relatedConcepts: ["quantity-equation", "quantity-theory", "money-demand"],
    sourceRefs: [
      T(180, "Income velocity of circulation."),
      L("lecture-w5-l1", 84, "Money and prices."),
    ],
    equations: [
      {
        label: "Velocity",
        expression: "V = PY / M",
        variables: [
          { symbol: "V", meaning: "velocity" },
          { symbol: "P", meaning: "price level" },
          { symbol: "Y", meaning: "real output" },
          { symbol: "M", meaning: "money stock" },
        ],
        interpretation:
          "PY is nominal output; velocity rises when the same money stock supports more nominal spending.",
      },
    ],
  }),
  c({
    id: "quantity-equation",
    name: "Quantity equation",
    aliases: ["quantity equation", "MV = PY", "equation of exchange"],
    searchTerms: ["money times velocity equals prices times output", "money identity"],
    chapters: [6],
    tags: ["chapter-6", "finance", "calculation"],
    summary:
      "The quantity equation states that money stock times velocity equals the price level times real output.",
    intuition:
      "Total spending supported by the money stock must equal the money value of the output transactions recorded in the model.",
    explanation: [
      "M is a stock, V is a turnover ratio, P is a price level, and Y is real output. The equation can be treated as an identity before adding assumptions about stable velocity or output.",
      "Taking growth rates gives a relationship among money growth, velocity growth, inflation, and real output growth.",
    ],
    whyItMatters:
      "It is the calculation backbone for quantity theory and money-growth/inflation questions.",
    prerequisites: ["money-stock", "velocity", "price-level", "real-gdp"],
    relatedConcepts: ["quantity-theory", "inflation", "money-demand"],
    sourceRefs: [
      T(180, "Quantity equation and velocity."),
      L("lecture-w5-l1", 84, "Money and prices relationship."),
    ],
    equations: [
      {
        label: "Quantity equation",
        expression: "M V = P Y",
        variables: [
          { symbol: "M", meaning: "money stock" },
          { symbol: "V", meaning: "velocity" },
          { symbol: "P", meaning: "price level" },
          { symbol: "Y", meaning: "real GDP" },
        ],
        interpretation:
          "The left side is money-supported spending; the right side is nominal output.",
      },
    ],
  }),
  c({
    id: "quantity-theory",
    name: "Quantity theory of money",
    aliases: ["quantity theory", "money growth and inflation"],
    searchTerms: [
      "long-run money inflation relationship",
      "if money grows faster prices rise",
    ],
    chapters: [6],
    tags: ["chapter-6", "finance", "calculation"],
    summary:
      "Quantity theory is the proposition that, with velocity and real output behaving predictably, money growth is linked to nominal spending and inflation.",
    intuition:
      "If more money chases the same amount of real output and velocity is unchanged, the price level must do more of the adjusting.",
    explanation: [
      "The relationship comes from the quantity equation plus assumptions such as stable velocity and real-output growth determined elsewhere. Without those assumptions, money growth alone does not pin down inflation.",
      "The course presents the growth-rate approximation: money growth plus velocity growth equals inflation plus real-output growth.",
    ],
    whyItMatters:
      "It demonstrates how an accounting identity becomes a theory only after behavioural or institutional assumptions are added.",
    prerequisites: ["quantity-equation", "growth-rate", "inflation"],
    relatedConcepts: ["money-stock", "velocity", "real-gdp", "price-level"],
    sourceRefs: [
      L("lecture-w5-l1", 84, "Money and prices conclusion."),
      T(181, "Quantity theory discussion."),
    ],
    equations: [
      {
        label: "Growth-rate form",
        expression: "Δ%M + Δ%V ≈ π + Δ%Y",
        variables: [
          { symbol: "Δ%M", meaning: "money-stock growth" },
          { symbol: "Δ%V", meaning: "velocity growth" },
          { symbol: "π", meaning: "inflation" },
          { symbol: "Δ%Y", meaning: "real-output growth" },
        ],
        interpretation:
          "Rearrange only after checking which terms are assumed constant in the question.",
      },
    ],
  }),
  c({
    id: "bank",
    name: "Bank",
    aliases: ["private bank", "commercial bank", "banks"],
    searchTerms: [
      "financial intermediary",
      "institution taking deposits and making loans",
    ],
    chapters: [6],
    tags: ["chapter-6", "finance", "high-yield"],
    summary:
      "A bank is an institution that accepts liabilities such as deposits and holds assets such as reserves and loans.",
    intuition:
      "A bank connects payment users and borrowers: it offers liquid claims to depositors while holding loans and other assets that earn returns.",
    explanation: [
      "Banks transform maturity and liquidity, which creates useful services and risks. Loans are assets for banks; deposits are liabilities owed to customers.",
      "A bank can be solvent but illiquid: its assets may exceed liabilities while not being immediately convertible into payment funds.",
    ],
    whyItMatters:
      "Bank balance sheets explain deposit money, lending, liquidity crises, leverage, and prudential regulation.",
    prerequisites: ["asset", "liability", "money", "borrowing", "lending"],
    relatedConcepts: [
      "bank-balance-sheet",
      "bank-lending",
      "deposit",
      "reserves",
      "liquidity",
      "solvency",
    ],
    sourceRefs: [
      L("lecture-w5-l1", 54, "Model of a bank and balance sheet."),
      T(173, "New bank balance-sheet tables."),
    ],
  }),
  c({
    id: "deposit",
    name: "Bank deposit",
    aliases: ["deposits", "transaction deposit", "bank balance"],
    searchTerms: ["money in a bank account", "bank liability to customer"],
    chapters: [6],
    tags: ["chapter-6", "finance", "money"],
    summary:
      "A bank deposit is a claim by a customer on a bank, often usable for payments.",
    intuition:
      "The customer sees a balance that can be spent; the bank records a liability because it owes that amount to the customer.",
    explanation: [
      "Deposits can be money when they are accepted for payment. They are not the same as bank reserves: reserves are settlement assets held by banks, often at the RBA.",
      "When a bank makes a loan, it can create a deposit under the balance-sheet process described in the course, subject to constraints and settlement arrangements.",
    ],
    whyItMatters:
      "It explains why private-bank money is a liability and why lending can expand deposits.",
    prerequisites: ["bank", "liability", "money"],
    relatedConcepts: [
      "bank-lending",
      "money-creation",
      "reserves",
      "bank-balance-sheet",
    ],
    sourceRefs: [
      L("lecture-w5-l1", 56, "Bank balance sheet with lending."),
      T(173, "Balance sheet of new bank with lending."),
    ],
  }),
  c({
    id: "reserves",
    name: "Bank reserves",
    aliases: ["reserves", "cash reserves", "liquid reserves"],
    searchTerms: ["bank funds available for settlement", "cash held by banks"],
    chapters: [6, 7],
    tags: ["chapter-6", "chapter-7", "finance", "Australia"],
    summary:
      "Bank reserves are highly liquid funds banks use to settle payments and meet withdrawals; in Australia the central-bank form is held in ESAs.",
    intuition:
      "A deposit transfer between banks needs a settlement asset behind the scenes even though customers see only account balances.",
    explanation: [
      "Reserves are assets for banks. They differ from deposits, which are liabilities of banks to customers, and from broad money held by the public.",
      "The RBA’s operating framework uses Exchange Settlement balances and the cash market to keep the overnight cash rate near its target.",
    ],
    whyItMatters:
      "It supplies the Australian institutional vocabulary required for cash-rate and bank-payment questions.",
    prerequisites: ["bank", "asset"],
    relatedConcepts: [
      "exchange-settlement-account",
      "settlement-balances",
      "cash-market",
      "reserve-demand",
      "money-creation",
    ],
    sourceRefs: [
      L("lecture-w5-l1", 63, "Bank balance sheet includes reserves."),
      L("lecture-w5-l2", 23, "Exchange Settlement funds and accounts."),
      T(175, "Australian bank assets and liabilities."),
    ],
  }),
  c({
    id: "bank-balance-sheet",
    name: "Bank balance sheet",
    aliases: ["bank balance sheet", "bank assets and liabilities"],
    searchTerms: ["bank assets equal liabilities plus equity", "bank accounting table"],
    chapters: [6],
    tags: ["chapter-6", "finance", "calculation"],
    summary:
      "A bank balance sheet records its assets, liabilities, and equity at a point in time.",
    intuition:
      "Every deposit a bank owes and every loan it owns must appear somewhere on its financial position; the two sides must balance.",
    explanation: [
      "Loans and reserves are bank assets. Deposits and borrowing are liabilities. Equity is the residual claim absorbing gains and losses.",
      "Balance-sheet entries explain deposit creation: a new loan can appear as an asset alongside a new deposit liability, without the bank first handing over an existing customer’s deposit.",
    ],
    whyItMatters:
      "It turns bank money creation from a mysterious slogan into double-entry accounting.",
    prerequisites: ["bank", "asset", "liability", "stock"],
    relatedConcepts: [
      "deposit",
      "bank-lending",
      "bank-leverage",
      "solvency",
      "liquidity",
    ],
    sourceRefs: [
      L("lecture-w5-l1", 54, "Initial bank balance sheet."),
      L("lecture-w5-l1", 56, "Balance sheet with lending."),
      T(173, "Bank balance-sheet tables."),
    ],
    equations: [
      {
        label: "Balance-sheet identity",
        expression: "assets = liabilities + equity",
        variables: [
          {
            symbol: "assets",
            meaning: "loans, reserves, securities, and other owned claims",
          },
          { symbol: "liabilities", meaning: "deposits and other amounts owed" },
          { symbol: "equity", meaning: "owners’ residual claim" },
        ],
        interpretation:
          "A balance-sheet identity must hold after every correctly recorded transaction.",
      },
    ],
  }),
  c({
    id: "bank-lending",
    name: "Bank lending",
    aliases: ["bank loans", "lending by banks", "credit creation"],
    searchTerms: ["banks provide loans", "credit supplied by banks"],
    chapters: [6],
    tags: ["chapter-6", "finance", "money"],
    summary:
      "Bank lending is the extension of loans by banks to borrowers, recorded as bank assets and often matched by deposits.",
    intuition:
      "A bank does not merely pass a fixed pile of cash from one person to another; under the course’s balance-sheet process, lending can create a spendable deposit claim.",
    explanation: [
      "The bank earns interest on loans but faces credit, liquidity, and capital risks. Settlement payments can move reserves between banks even when total system reserves do not change.",
      "Lending is constrained by solvency, liquidity, regulation, risk, and borrower demand; it is not an unlimited money-making machine.",
    ],
    whyItMatters:
      "It connects private-bank balance sheets with money stock, deposits, and financial stability.",
    prerequisites: ["bank-balance-sheet", "borrowing", "lending", "deposit"],
    relatedConcepts: [
      "money-creation",
      "reserve-deposit-ratio",
      "liquidity",
      "solvency",
    ],
    sourceRefs: [
      L("lecture-w5-l1", 56, "Balance sheet with lending."),
      T(173, "New bank with lending."),
    ],
  }),
  c({
    id: "reserve-deposit-ratio",
    name: "Reserve-deposit ratio",
    aliases: ["reserve ratio", "reserve-to-deposit ratio"],
    searchTerms: [
      "reserves divided by deposits",
      "fraction of deposits held as reserves",
    ],
    chapters: [6],
    tags: ["chapter-6", "finance", "calculation"],
    summary:
      "The reserve-deposit ratio is bank reserves divided by deposits under a specified balance-sheet definition.",
    intuition:
      "It describes how much immediately liquid reserve asset backs or accompanies each dollar of deposit liabilities in the simplified model.",
    explanation: [
      "A higher reserve ratio can limit the expansion of deposits in a textbook money-multiplier model, but real lending also depends on capital, risk, regulation, and demand.",
      "Keep the ratio direction straight: reserves over deposits is not deposits over reserves.",
    ],
    whyItMatters:
      "It is a direct bank-balance-sheet calculation and supports money-creation questions.",
    prerequisites: ["reserves", "deposit", "ratio"],
    relatedConcepts: ["money-creation", "bank-lending", "bank-balance-sheet"],
    sourceRefs: [
      T(174, "Bank lending and reserves."),
      L("lecture-w5-l1", 63, "Bank balance-sheet reserve entries."),
    ],
    equations: [
      {
        label: "Reserve-deposit ratio",
        expression: "reserves / deposits",
        variables: [
          { symbol: "reserves", meaning: "liquid reserve assets" },
          { symbol: "deposits", meaning: "deposit liabilities" },
        ],
        interpretation:
          "Multiply by 100 for a percentage; use the stated reserve and deposit definitions.",
      },
    ],
  }),
  c({
    id: "money-creation",
    name: "Bank money creation",
    aliases: ["money creation", "deposit creation", "money multiplier"],
    searchTerms: [
      "banks create deposits when lending",
      "how bank lending expands money",
    ],
    chapters: [6],
    tags: ["chapter-6", "finance", "money", "high-yield"],
    summary:
      "Bank money creation is the balance-sheet process by which new bank lending can create new deposit liabilities usable as money.",
    intuition:
      "A loan gives a borrower a deposit claim to spend; when the payment system records both the loan asset and deposit liability, broad money can expand.",
    explanation: [
      "The simple multiplier story links deposit expansion to reserve and deposit behaviour. The course also emphasises that banks face liquidity, solvency, capital, and regulatory constraints.",
      "Repayment destroys the corresponding deposit money in the simplified process. A transfer between banks changes who holds reserves but need not create new total reserves.",
    ],
    whyItMatters:
      "It explains the relationship among bank lending, deposits, reserves, and money supply without treating money as printed only by the central bank.",
    prerequisites: [
      "bank-lending",
      "deposit",
      "bank-balance-sheet",
      "reserve-deposit-ratio",
    ],
    relatedConcepts: [
      "money-stock",
      "reserves",
      "interbank-payment",
      "liquidity",
      "solvency",
    ],
    sourceRefs: [
      L("lecture-w5-l1", 56, "Balance-sheet lending process."),
      T(173, "Bank money creation tables."),
    ],
    misconceptions: [
      "Private-bank money creation is not the same as the RBA directly printing every deposit dollar.",
      "A new loan creates a liability for the borrower; it is not free wealth for the economy as a whole.",
    ],
  }),
  c({
    id: "liquidity",
    name: "Liquidity",
    aliases: ["liquid asset", "liquidity risk"],
    searchTerms: ["ability to make payments quickly", "cashability"],
    chapters: [6],
    tags: ["chapter-6", "finance"],
    summary:
      "Liquidity is the ability to meet a payment when due without a large loss or delay in converting an asset.",
    intuition:
      "Cash is liquid because it is immediately usable; a long-term loan may be valuable but cannot necessarily be sold or collected today at face value.",
    explanation: [
      "A liquidity problem can occur even when a bank’s total assets exceed its liabilities, because the assets are not available in the right form or at the right time.",
      "Liquidity is about timing and convertibility; solvency is about the value of assets relative to obligations.",
    ],
    whyItMatters:
      "It explains bank runs, reserve demand, central-bank lending, and why asset quality and cash availability are different risks.",
    prerequisites: ["asset", "liability", "bank"],
    relatedConcepts: ["solvency", "bank-run", "lender-last-resort", "reserves"],
    sourceRefs: [
      L("lecture-w5-l1", 75, "Bank runs and liquidity."),
      T(176, "Liquidity and bank stability."),
    ],
    contrasts: [
      {
        conceptId: "solvency",
        title: "Liquidity versus solvency",
        difference:
          "Liquidity is the ability to pay on time; solvency is whether assets cover liabilities in value.",
      },
    ],
  }),
  c({
    id: "solvency",
    name: "Solvency",
    aliases: ["solvent", "solvency risk"],
    searchTerms: ["assets cover liabilities", "net worth positive"],
    chapters: [6],
    tags: ["chapter-6", "finance"],
    summary:
      "Solvency means the value of an institution’s assets is at least as large as the value of its liabilities.",
    intuition:
      "A solvent bank may be short of cash today, but its assets are valuable enough in total to cover what it owes if it can wait or refinance.",
    explanation: [
      "A fall in the value of loans can reduce bank equity and make the bank insolvent. A run can create a liquidity crisis even before assets become insufficient in value.",
      "Regulation and capital buffers aim partly to make solvency more resilient to losses.",
    ],
    whyItMatters:
      "It is a frequent contrast in bank-stability questions and prevents a bank run from being defined as automatic insolvency.",
    prerequisites: ["bank-balance-sheet", "asset", "liability"],
    relatedConcepts: [
      "liquidity",
      "bank-run",
      "bank-leverage",
      "prudential-regulation",
    ],
    sourceRefs: [
      L("lecture-w5-l1", 54, "New bank is solvent before lending."),
      L("lecture-w5-l1", 71, "Loan-value shock and solvency."),
      T(175, "Bank assets and liabilities."),
    ],
  }),
  c({
    id: "bank-leverage",
    name: "Bank leverage",
    aliases: ["leverage ratio", "bank leverage"],
    searchTerms: ["assets relative to equity", "small equity buffer"],
    chapters: [6],
    tags: ["chapter-6", "finance", "calculation"],
    summary:
      "Bank leverage compares a bank’s assets or liabilities with its equity buffer.",
    intuition:
      "When equity is small relative to assets, a modest loss on loans can use up a large share of the owners’ buffer.",
    explanation: [
      "Leverage can magnify returns when assets perform well and losses when they do not. The precise ratio convention must be read from the course question.",
      "Capital requirements limit leverage partly to protect solvency and the payment system.",
    ],
    whyItMatters:
      "It explains why bank balance-sheet shocks can be amplified even when the initial loss is small relative to total assets.",
    prerequisites: ["bank-balance-sheet", "solvency", "ratio"],
    relatedConcepts: ["prudential-regulation", "bank-run", "liquidity"],
    sourceRefs: [
      L("lecture-w5-l1", 69, "Leverage ratio definitions."),
      T(175, "Bank balance sheets and equity."),
    ],
  }),
  c({
    id: "bank-run",
    name: "Bank run",
    aliases: ["bank runs", "run on a bank"],
    searchTerms: ["many depositors withdraw at once", "panic withdrawals"],
    chapters: [6],
    tags: ["chapter-6", "finance", "stability"],
    summary:
      "A bank run occurs when many depositors try to withdraw their deposits at the same time.",
    intuition:
      "A bank promises liquid access while holding assets that may pay later; fear that others will withdraw can make everyone rush first.",
    explanation: [
      "A run creates a liquidity problem because the bank may not have enough immediately usable reserves or cash, even if its loans are valuable over time.",
      "Deposit insurance, central-bank lending, and prudential regulation can reduce the incentive for destabilising runs, while worsening asset quality can create a separate solvency problem.",
    ],
    whyItMatters:
      "It connects deposit contracts, reserves, liquidity, lender-of-last-resort policy, and financial stability.",
    prerequisites: ["deposit", "liquidity", "bank"],
    relatedConcepts: [
      "solvency",
      "deposit-insurance",
      "lender-last-resort",
      "reserves",
    ],
    sourceRefs: [
      L("lecture-w5-l1", 75, "Bank runs and liquidity crisis."),
      T(176, "Bank stability discussion."),
    ],
  }),
  c({
    id: "deposit-insurance",
    name: "Deposit insurance",
    aliases: ["deposit guarantee", "deposit insurance scheme"],
    searchTerms: ["government protection for bank deposits", "insured deposits"],
    chapters: [6],
    tags: ["chapter-6", "finance", "stability"],
    summary:
      "Deposit insurance promises protection for eligible depositors if a bank fails, subject to the scheme’s rules.",
    intuition:
      "If depositors trust that small balances are protected, they have less reason to run merely because other depositors are withdrawing.",
    explanation: [
      "Insurance can improve stability but can also reduce depositors’ incentive to monitor bank risk, so regulation and limits matter.",
      "It protects a liability to depositors; it does not make every bank asset risk-free or guarantee solvency.",
    ],
    whyItMatters:
      "It is a policy response to liquidity and coordination problems in banking.",
    prerequisites: ["bank-run", "deposit", "liquidity"],
    relatedConcepts: ["prudential-regulation", "lender-last-resort", "solvency"],
    sourceRefs: [
      T(178, "Bank-stability policy discussion."),
      L("lecture-w5-l1", 80, "Regulation and bank stability."),
    ],
  }),
  c({
    id: "lender-last-resort",
    name: "Lender of last resort",
    aliases: ["lender of last resort", "central-bank emergency lending"],
    searchTerms: [
      "central bank lends during liquidity crisis",
      "emergency bank funding",
    ],
    chapters: [6, 7],
    tags: ["chapter-6", "chapter-7", "finance", "Australia"],
    summary:
      "A lender of last resort provides emergency liquidity to a bank that cannot obtain enough funds in the market, under defined conditions.",
    intuition:
      "A solvent bank with a temporary cash shortage may survive if a trusted institution lends against acceptable collateral while the panic passes.",
    explanation: [
      "The policy addresses liquidity, not automatically insolvency. Lending terms and supervision are important because unconditional rescue can create risk-taking incentives.",
      "In Australia the RBA’s central-bank role and settlement system provide the institutional background for emergency liquidity arrangements.",
    ],
    whyItMatters:
      "It connects bank stability to central-bank operations without confusing emergency lending with the normal cash-rate target mechanism.",
    prerequisites: ["liquidity", "solvency", "central-bank"],
    relatedConcepts: ["bank-run", "reserves", "prudential-regulation", "RBA"],
    sourceRefs: [
      L(
        "lecture-w5-l1",
        77,
        "Central-bank lending to banks with insufficient reserves.",
      ),
      T(177, "Bank stability and central banking."),
    ],
  }),
  c({
    id: "prudential-regulation",
    name: "Prudential regulation",
    aliases: ["macroprudential regulation", "bank regulation", "prudential rules"],
    searchTerms: [
      "rules for bank capital and liquidity",
      "financial stability regulation",
    ],
    chapters: [6],
    tags: ["chapter-6", "finance", "stability"],
    summary:
      "Prudential regulation sets constraints intended to make banks and the financial system safer.",
    intuition:
      "Rules require banks to keep buffers so a loan loss or withdrawal shock does not immediately threaten depositors and payments.",
    explanation: [
      "Capital ratios address solvency and loss absorption; liquidity coverage addresses the ability to meet withdrawals; loan-to-value limits can limit borrower and bank exposure.",
      "Regulation can reduce risk but may affect lending costs and behaviour, so it is not a free guarantee of stability.",
    ],
    whyItMatters:
      "It completes the banking mental model: assets, liabilities, risks, and policy safeguards.",
    prerequisites: ["bank-leverage", "liquidity", "solvency"],
    relatedConcepts: ["deposit-insurance", "lender-last-resort", "bank-run"],
    sourceRefs: [
      L("lecture-w5-l1", 80, "Prudential regulation tools."),
      T(179, "Macro-prudential regulation."),
    ],
  }),
  c({
    id: "interbank-payment",
    name: "Interbank payment",
    aliases: ["interbank payments", "bank settlement", "payment clearing"],
    searchTerms: ["payment between banks", "settling bank debts"],
    chapters: [6, 7],
    tags: ["chapter-6", "chapter-7", "Australia"],
    summary:
      "An interbank payment transfers settlement assets between banks when customers’ payments are cleared.",
    intuition:
      "A customer can pay someone at another bank with a deposit, but the banks still need to settle their net obligation using reserves.",
    explanation: [
      "The payment changes the distribution of reserves across banks. It need not change total system reserves, and it is not itself a new loan or new domestic output.",
      "In Australia, Exchange Settlement Accounts are the institutional accounts used for this settlement relationship with the RBA.",
    ],
    whyItMatters:
      "It is the missing operational step between private-bank deposits and the RBA’s cash-market framework.",
    prerequisites: ["deposit", "reserves", "bank-balance-sheet"],
    relatedConcepts: [
      "exchange-settlement-account",
      "settlement-balances",
      "cash-market",
      "money-creation",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 24, "ESAs used for payments clearing."),
      T(194, "Cash market and settlement accounts."),
    ],
  }),
  c({
    id: "central-bank",
    name: "Central bank",
    aliases: ["central banks", "monetary authority"],
    searchTerms: [
      "institution that runs monetary policy",
      "bank for the banking system",
    ],
    chapters: [6, 7],
    tags: ["chapter-7", "monetary-policy", "Australia"],
    summary:
      "A central bank is the institution that implements monetary policy and operates key parts of the payment and settlement system.",
    intuition:
      "It does not set every price in the economy; it uses a policy instrument to influence financial conditions and short-run outcomes.",
    explanation: [
      "Central banks can provide settlement balances, act as a bank for commercial banks, operate markets, and communicate targets. Their legal objectives and procedures vary by country.",
      "The Australian course focuses on the RBA and the cash rate rather than substituting US Federal Reserve terminology.",
    ],
    whyItMatters:
      "It is the institutional prerequisite for the RBA, cash-rate target, corridor, and monetary-transmission chain.",
    prerequisites: ["bank", "money"],
    relatedConcepts: [
      "RBA",
      "cash-rate",
      "exchange-settlement-account",
      "lender-last-resort",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 2, "Central banks and monetary policy."),
      T(187, "Central banks and monetary policy."),
    ],
  }),
  c({
    id: "monetary-policy",
    name: "Monetary policy",
    aliases: ["monetary policy", "central-bank policy"],
    searchTerms: [
      "central bank actions affecting interest rates",
      "policy for inflation and activity",
    ],
    chapters: [7, 8],
    tags: ["chapter-7", "chapter-8", "monetary-policy", "high-yield"],
    summary:
      "Monetary policy is central-bank action intended to influence short-run inflation, output, employment, and financial conditions.",
    intuition:
      "The central bank changes the price or availability of settlement funds, which changes market interest rates and then spending decisions.",
    explanation: [
      "The course distinguishes a target variable, such as inflation, from an instrument, such as the cash-rate target. The central bank does not directly command the target; it uses the instrument through a transmission mechanism.",
      "Expansionary policy generally lowers real interest rates and raises demand in the short-run model; contractionary policy generally does the reverse, conditional on expectations and other shocks.",
    ],
    whyItMatters:
      "It is the policy chain connecting the RBA’s operating procedures to aggregate demand and inflation.",
    prerequisites: [
      "central-bank",
      "cash-rate-target",
      "real-interest-rate",
      "planned-aggregate-expenditure",
    ],
    relatedConcepts: [
      "RBA",
      "monetary-transmission",
      "policy-instrument-vs-target",
      "taylor-rule",
      "inflation-target",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 3, "Monetary policy targets and instruments."),
      L("lecture-w7-l1", 45, "Monetary policy affects real GDP through PAE."),
      T(187, "Central banks and monetary policy."),
    ],
  }),
  c({
    id: "RBA",
    name: "Reserve Bank of Australia (RBA)",
    aliases: ["RBA", "Reserve Bank", "Reserve Bank of Australia"],
    searchTerms: ["Australian central bank", "Australian monetary authority"],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "Australia", "high-yield"],
    summary:
      "The RBA is Australia’s central bank and the institution that targets the Australian cash rate.",
    intuition:
      "The RBA influences the overnight interbank price of settlement funds rather than directly setting every mortgage, bond, or business rate.",
    explanation: [
      "The course describes the RBA’s objectives as including price stability and full employment, with a flexible 2–3% inflation target convention in the lecture material.",
      "It announces a target for the cash rate and uses Exchange Settlement balances, corridor facilities, and open-market operations to keep the actual rate near target.",
    ],
    whyItMatters:
      "Australian terminology and institutions are central to Chapters 7–9 and should not be replaced by a generic Federal Reserve story.",
    prerequisites: ["central-bank"],
    relatedConcepts: [
      "cash-rate-target",
      "exchange-settlement-account",
      "cash-rate-corridor",
      "inflation-target",
      "monetary-transmission",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 7, "RBA functions."),
      L("lecture-w5-l2", 19, "RBA cash-rate operating procedure."),
      T(187, "Central banks of various countries."),
    ],
  }),
  c({
    id: "central-bank-objectives",
    name: "Central-bank objectives",
    aliases: ["central bank goals", "monetary policy objectives"],
    searchTerms: ["inflation and employment goals", "what the RBA aims to influence"],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "Australia"],
    summary:
      "Central-bank objectives are the final economic outcomes the institution seeks to influence, such as inflation and resource utilisation.",
    intuition:
      "Objectives are destinations; the policy rate and operating procedures are tools used to move toward them.",
    explanation: [
      "The RBA lecture gives an explicit inflation target range and a full-employment objective. These objectives can conflict temporarily after a supply shock.",
      "An objective is not an instrument: the RBA cannot directly set the unemployment rate by announcement alone.",
    ],
    whyItMatters:
      "It prevents target/instrument confusion in policy questions and prepares the Taylor rule.",
    prerequisites: ["central-bank", "inflation", "unemployment-rate"],
    relatedConcepts: [
      "inflation-target",
      "policy-instrument-vs-target",
      "RBA",
      "output-gap",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 3, "Targets and instruments."),
      L("lecture-w5-l2", 8, "RBA inflation and employment targets."),
      T(188, "Monetary policy framework."),
    ],
  }),
  c({
    id: "policy-instrument-vs-target",
    name: "Policy instrument versus target",
    aliases: ["instrument versus target", "policy target and instrument"],
    searchTerms: ["tool versus outcome", "cash rate target versus inflation target"],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "contrast"],
    summary:
      "A policy instrument is a variable the central bank can operate directly; a target is an outcome it seeks to influence.",
    intuition:
      "The RBA can set an announced cash-rate target and adjust settlement operations, but it cannot directly command inflation or GDP.",
    explanation: [
      "The target guides the instrument reaction. The transmission mechanism runs from the instrument to market rates, spending, output, and inflation.",
      "The word target is used in both cash-rate target and inflation target, but one is an operational interest-rate setting and the other is a macroeconomic objective.",
    ],
    whyItMatters: "It is a direct exam distinction in the central-bank chapter.",
    prerequisites: ["central-bank-objectives", "cash-rate"],
    relatedConcepts: ["RBA", "inflation-target", "cash-rate", "monetary-transmission"],
    sourceRefs: [
      L("lecture-w5-l2", 3, "Targets and instruments."),
      T(192, "Cash rate as policy instrument."),
    ],
    contrasts: [
      {
        conceptId: "cash-rate-target",
        title: "Cash-rate target versus inflation target",
        difference:
          "The cash-rate target is an operating setting; the inflation target is a final policy objective.",
      },
    ],
  }),
  c({
    id: "cash-market",
    name: "Cash market",
    aliases: ["overnight cash market", "interbank cash market"],
    searchTerms: ["overnight bank lending market", "market for ES funds"],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "Australia"],
    summary:
      "The cash market is the overnight market in which banks lend and borrow Exchange Settlement funds.",
    intuition:
      "Banks with excess settlement balances lend to banks that need them, so the overnight price of those funds is the cash rate.",
    explanation: [
      "Only institutions with the relevant settlement access participate directly. The rate is short-term and differs conceptually from mortgage, business, and long-term bond rates, though it can influence them.",
      "The RBA manages the supply and corridor around the market to keep the actual cash rate close to its target.",
    ],
    whyItMatters:
      "It identifies what the Australian cash rate literally is before explaining how the RBA controls it.",
    prerequisites: ["bank", "reserves", "interbank-payment", "interest-rate"],
    relatedConcepts: [
      "cash-rate",
      "exchange-settlement-account",
      "reserve-demand",
      "cash-rate-corridor",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 25, "Overnight cash market."),
      T(194, "Cash market and ES funds."),
    ],
  }),
  c({
    id: "cash-rate",
    name: "Cash rate",
    aliases: ["cash rate", "overnight cash rate", "interbank cash rate"],
    searchTerms: [
      "RBA rate",
      "Australian overnight interest rate",
      "cost of overnight bank funds",
    ],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "Australia", "high-yield"],
    summary:
      "The cash rate is the overnight interest rate on loans of Exchange Settlement funds between Australian banks.",
    intuition:
      "It is the price banks charge each other for moving settlement balances overnight, not the rate on every loan in the economy.",
    explanation: [
      "The RBA uses the cash rate as its operational monetary-policy instrument. It announces a target and uses the settlement system to keep the actual market rate near it.",
      "Cash-rate changes influence other short and longer rates, expected real rates, investment, consumption, exchange rates, and aggregate demand through several conditional links.",
    ],
    whyItMatters:
      "It is the central Australian policy term and the first node in the monetary-transmission chain.",
    prerequisites: ["cash-market", "interest-rate", "reserves"],
    relatedConcepts: [
      "cash-rate-target",
      "RBA",
      "cash-rate-corridor",
      "monetary-transmission",
      "bond-yield",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 17, "Cash rate as the RBA instrument."),
      L("lecture-w5-l2", 25, "Overnight cash market."),
      T(194, "Cash rate definition."),
    ],
    misconceptions: [
      "Cash rate is not a synonym for the mortgage rate, every interest rate, or the inflation rate.",
      "Cash-rate target and actual cash rate are related but distinct: one is announced, the other is the market outcome the RBA manages.",
    ],
  }),
  c({
    id: "cash-rate-target",
    name: "RBA cash-rate target",
    aliases: ["cash-rate target", "target cash rate", "policy rate target"],
    searchTerms: ["RBA announced rate", "target for overnight cash rate"],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "Australia", "high-yield"],
    summary:
      "The cash-rate target is the overnight rate the RBA announces and operationally aims to achieve.",
    intuition:
      "It is the steering setting: the RBA adjusts settlement operations and corridor facilities so banks have little reason to trade far from the target.",
    explanation: [
      "The target is an instrument setting, not the final inflation target. The actual cash rate can move around it within the operating framework and is then managed toward it.",
      "A target increase is contractionary in the course’s usual interpretation because it raises the intended short-term nominal rate and, conditional on expectations, the real rate.",
    ],
    whyItMatters:
      "It is the exact term used for Australian monetary policy decisions and avoids treating an announcement as an automatic outcome for all rates.",
    prerequisites: ["cash-rate", "RBA"],
    relatedConcepts: [
      "cash-rate-corridor",
      "open-market-operation",
      "monetary-transmission",
      "inflation-target",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 19, "RBA announces the target for the cash rate."),
      T(193, "RBA cash-rate target."),
    ],
    contrasts: [
      {
        conceptId: "cash-rate",
        title: "Cash-rate target versus actual cash rate",
        difference:
          "The target is the RBA’s announced operating objective; the actual cash rate is the overnight market rate.",
      },
    ],
  }),
  c({
    id: "exchange-settlement-account",
    name: "Exchange Settlement Account (ESA)",
    aliases: ["ESA", "Exchange Settlement Accounts", "settlement account"],
    searchTerms: ["bank account at the RBA", "Australian bank settlement account"],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "Australia"],
    summary:
      "An Exchange Settlement Account is an account banks hold at the RBA for settling payments and holding settlement funds.",
    intuition:
      "Customer payments may move deposits between banks; ESAs provide the central-bank balances used to settle the banks’ obligations.",
    explanation: [
      "The balances in ESAs are the Australian form of reserves relevant to the cash market. They are not the same as the public’s bank deposits, even though both are balance-sheet claims.",
      "Government payments and RBA open-market operations can change the distribution or supply of ES balances.",
    ],
    whyItMatters:
      "It is the institutional foundation for the RBA corridor and cash-rate operations.",
    prerequisites: ["reserves", "interbank-payment", "RBA"],
    relatedConcepts: [
      "settlement-balances",
      "cash-market",
      "reserve-demand",
      "government-payments-esa",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 23, "Role of Exchange Settlement Accounts and funds."),
      T(194, "ES accounts and overnight cash market."),
    ],
  }),
  c({
    id: "settlement-balances",
    name: "Settlement balances",
    aliases: ["Exchange Settlement balances", "ES funds", "settlement funds"],
    searchTerms: ["reserves held for interbank settlement", "cash in ESAs"],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "Australia"],
    summary:
      "Settlement balances are the central-bank balances banks use to settle payments and trade overnight.",
    intuition:
      "They are the raw material of the cash market: banks with a surplus can lend it, while banks with a shortage borrow it.",
    explanation: [
      "An interbank payment can move balances from one ESA to another without changing the total supply. RBA operations or government transactions can change total system balances.",
      "Settlement balances are not broad money held by households, though the operating system can influence broader financial conditions.",
    ],
    whyItMatters:
      "It gives precise meaning to ‘reserves’ in Australian monetary-policy questions.",
    prerequisites: ["exchange-settlement-account", "reserves", "cash-market"],
    relatedConcepts: [
      "reserve-demand",
      "cash-rate-corridor",
      "open-market-operation",
      "government-payments-esa",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 23, "Exchange Settlement funds."),
      L("lecture-w5-l2", 40, "Supply of ES funds."),
      T(196, "Supply of ES funds."),
    ],
  }),
  c({
    id: "reserve-demand",
    name: "Reserve demand",
    aliases: ["demand for ES funds", "banks demand for reserves"],
    searchTerms: ["banks' desired settlement balances", "demand for cash reserves"],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "Australia", "graph"],
    summary:
      "Reserve demand is the amount of settlement balances banks wish to hold or trade at different cash rates.",
    intuition:
      "Banks hold reserves for payments and safety, but if the overnight rate is high they may prefer to lend excess balances rather than leave them idle.",
    explanation: [
      "The demand curve can be truncated by the RBA’s deposit and lending facilities, creating a corridor around the target. The exact shape follows the operating procedure in the course diagram.",
      "Reserve demand is demand for a settlement asset, not demand for consumer goods or broad money in every definition.",
    ],
    whyItMatters:
      "It explains how the RBA can control a market interest rate without fixing the quantity of every bank deposit.",
    prerequisites: ["settlement-balances", "cash-market", "interest-rate", "bank"],
    relatedConcepts: [
      "cash-rate-corridor",
      "cash-rate-target",
      "open-market-operation",
      "interbank-payment",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 37, "Banks’ demand curve for cash."),
      T(196, "Demand curve for ES funds."),
    ],
  }),
  c({
    id: "cash-rate-corridor",
    name: "Cash-rate corridor",
    aliases: ["corridor system", "interest-rate corridor", "cash rate channel"],
    searchTerms: ["floor and ceiling around cash-rate target", "RBA corridor"],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "Australia", "graph", "high-yield"],
    summary:
      "The cash-rate corridor is the band formed by RBA facilities that limits how far the overnight cash rate can move from target.",
    intuition:
      "A bank will not lend below the return it can receive safely from the RBA, and it will not borrow above the rate at which it can obtain funds from the RBA, all else equal.",
    explanation: [
      "The deposit facility supplies a lower bound and the lending facility supplies an upper bound in the lecture’s corridor framework. The target sits between them, with the exact spreads set by the operating procedure.",
      "The corridor is not the same as the target: it describes the range of possible market rates around the central bank’s operating aim.",
    ],
    whyItMatters:
      "It provides the first-principles answer to ‘how does the RBA make actual cash rate equal target?’",
    prerequisites: ["cash-rate-target", "reserve-demand", "settlement-balances", "RBA"],
    relatedConcepts: [
      "open-market-operation",
      "cash-rate",
      "exchange-settlement-account",
    ],
    mechanism: [
      "RBA announces target",
      "deposit and lending facilities create floor and ceiling",
      "banks trade ES funds inside the channel",
      "daily operations supply or drain balances as needed",
      "actual cash rate stays near target",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 28, "Channel facilities around the target."),
      L("lecture-w5-l2", 33, "Corridor limits on the cash rate."),
      T(195, "Channel for the cash-rate target."),
    ],
  }),
  c({
    id: "open-market-operation",
    name: "Open-market operation",
    aliases: ["OMO", "open market operations", "RBA market operation"],
    searchTerms: ["RBA buys or sells securities", "central bank bond operation"],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "Australia", "high-yield"],
    summary:
      "An open-market operation is an RBA purchase or sale of securities used to change settlement balances and keep the cash rate near target.",
    intuition:
      "When the RBA buys a bond, it pays by crediting a bank’s ESA; when it sells, it receives settlement funds and debits the banking system’s balances.",
    explanation: [
      "An operation changes the supply of ES funds in the cash market. Its effect on the cash rate depends on the corridor and reserve-demand framework.",
      "An OMO is not the same as the government issuing bonds to finance a deficit, although both involve securities and can interact with the financial system.",
    ],
    whyItMatters:
      "It is the operational mechanism linking the RBA’s announced target to actual overnight trading conditions.",
    prerequisites: ["RBA", "bond", "settlement-balances", "cash-market"],
    relatedConcepts: [
      "open-market-purchase",
      "open-market-sale",
      "cash-rate-corridor",
      "monetary-transmission",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 41, "Supply of cash through open-market operations."),
      T(196, "RBA buys and sells bonds to change ES funds."),
    ],
  }),
  c({
    id: "open-market-purchase",
    name: "Open-market purchase",
    aliases: ["RBA bond purchase", "central-bank bond purchase"],
    searchTerms: ["RBA buys bonds and credits ESAs", "purchase adds reserves"],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "Australia"],
    summary:
      "An open-market purchase is an RBA purchase of securities that pays sellers with settlement balances.",
    intuition:
      "The RBA gives the banking system an asset or payment balance in exchange for the bond, increasing the supply of ES funds all else equal.",
    explanation: [
      "In the corridor operating framework, the purchase can prevent the cash rate from rising above target when banks need more balances. The broader policy stance depends on the context and instrument setting.",
      "Do not reverse the balance-sheet direction: a purchase by the RBA adds settlement balances; a sale drains them.",
    ],
    whyItMatters:
      "It is a sign-direction question used to test understanding of reserves and cash-market supply.",
    prerequisites: ["open-market-operation", "bond", "settlement-balances"],
    relatedConcepts: [
      "open-market-sale",
      "cash-rate-corridor",
      "monetary-transmission",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 41, "Open-market operations and ES-fund supply."),
      T(196, "RBA purchase of bonds."),
    ],
  }),
  c({
    id: "open-market-sale",
    name: "Open-market sale",
    aliases: ["RBA bond sale", "central-bank bond sale"],
    searchTerms: ["RBA sells bonds and drains ESAs", "sale removes reserves"],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "Australia"],
    summary:
      "An open-market sale is an RBA sale of securities that receives settlement balances from buyers.",
    intuition:
      "The banking system gives up ES funds to obtain the bond, reducing the supply of settlement balances all else equal.",
    explanation: [
      "The direction of the cash-rate effect depends on the operating framework, but a sale is the opposite reserve-supply transaction to a purchase.",
      "Do not confuse selling a bond with lowering its price mechanically in every context; the market response depends on the transaction and current demand.",
    ],
    whyItMatters: "It is the paired sign-direction concept for open-market purchases.",
    prerequisites: ["open-market-operation", "bond", "settlement-balances"],
    relatedConcepts: ["open-market-purchase", "cash-rate-corridor", "cash-rate-target"],
    sourceRefs: [
      L("lecture-w5-l2", 41, "Open-market operations."),
      T(196, "Supply of ES funds with OMO."),
    ],
  }),
  c({
    id: "government-payments-esa",
    name: "Government payments and ES balances",
    aliases: ["government payments and ESAs", "fiscal payments settlement"],
    searchTerms: [
      "government spending changes bank reserves",
      "government transaction in settlement system",
    ],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "Australia"],
    summary:
      "Government payments can change the distribution or supply of Exchange Settlement balances as money moves through bank accounts.",
    intuition:
      "When the government pays a recipient, the recipient’s bank may receive settlement funds; when taxes are paid, funds move in the other direction.",
    explanation: [
      "The payment-system effect is distinct from the fiscal multiplier effect on income and output. The RBA may offset predictable balance changes through operations to keep the cash rate at target.",
      "This is why government cash management and central-bank operations interact without making fiscal and monetary policy the same thing.",
    ],
    whyItMatters:
      "It supplies the Australian operating detail behind settlement-balance movements.",
    prerequisites: [
      "exchange-settlement-account",
      "settlement-balances",
      "government-spending",
      "interbank-payment",
    ],
    relatedConcepts: [
      "open-market-operation",
      "reserve-demand",
      "cash-rate-corridor",
      "fiscal-policy",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 24, "ESAs in payments clearing."),
      L("lecture-w5-l2", 40, "Supply of ES funds and exogenous changes."),
      T(198, "Supply of ES funds."),
    ],
  }),
  c({
    id: "monetary-transmission",
    name: "Monetary-policy transmission",
    aliases: ["monetary transmission", "transmission mechanism"],
    searchTerms: ["how RBA rate changes affect the economy", "cash-rate policy chain"],
    chapters: [7, 8, 9],
    tags: ["chapter-7", "chapter-8", "monetary-policy", "high-yield"],
    summary:
      "Monetary transmission is the chain from the RBA’s operating rate to financial conditions, spending, output, inflation, and sometimes the exchange rate.",
    intuition:
      "A policy announcement matters economically only through the decisions it changes: borrowing, saving, investment, consumption, asset prices, and currency demand.",
    explanation: [
      "A simplified domestic chain is cash-rate target ↑ → market nominal/real rates ↑ → interest-sensitive spending ↓ → PAE and AD ↓ → output and inflation pressure tend to fall, conditional on the model.",
      "In an open economy, interest-rate changes can also affect capital flows, AUD demand, the exchange rate, and net exports. Expectations and timing can strengthen or weaken each link.",
    ],
    whyItMatters:
      "It is the course’s main causal bridge from institutional operations to macroeconomic outcomes.",
    prerequisites: [
      "cash-rate-target",
      "real-interest-rate",
      "planned-aggregate-expenditure",
      "aggregate-demand",
    ],
    relatedConcepts: [
      "real-rate-channel",
      "investment-demand",
      "exchange-rate",
      "inflation-dynamics",
    ],
    mechanism: [
      "RBA changes the cash-rate target",
      "short-term and expected longer-term rates adjust",
      "real borrowing costs and asset returns change",
      "consumption and investment plans respond",
      "aggregate demand and output change",
      "inflation pressure changes over time",
    ],
    sourceRefs: [
      L("lecture-w7-l1", 45, "Monetary policy affects real GDP through PAE."),
      L("lecture-w8-l2", 85, "Open-economy monetary transmission."),
      T(195, "Cash-rate transmission channel."),
    ],
  }),
  c({
    id: "real-rate-channel",
    name: "Real-rate channel",
    aliases: ["real interest-rate channel", "interest-rate channel"],
    searchTerms: [
      "interest rate affects spending and investment",
      "real borrowing cost channel",
    ],
    chapters: [7, 8],
    tags: ["chapter-7", "chapter-8", "monetary-policy"],
    summary:
      "The real-rate channel is the part of monetary transmission in which real interest rates change intertemporal spending incentives.",
    intuition:
      "A higher real rate makes postponing consumption more rewarding and makes marginal investment projects less profitable, all else equal.",
    explanation: [
      "The PAE model includes interest-sensitive consumption and investment. The real rate matters because it compares goods available today with goods available later, not simply because a nominal number changed.",
      "The response is conditional: expectations, wealth, credit constraints, and the model’s coefficients also affect spending.",
    ],
    whyItMatters: "It supplies the mechanical middle of the cash-rate → AD chain.",
    prerequisites: [
      "real-interest-rate",
      "investment-demand",
      "consumption",
      "planned-aggregate-expenditure",
    ],
    relatedConcepts: [
      "monetary-transmission",
      "aggregate-demand",
      "user-cost-capital",
      "cash-rate",
    ],
    sourceRefs: [
      L("lecture-w7-l1", 22, "PAE and the real interest rate."),
      T(215, "Interest-rate effect on PAE."),
    ],
  }),
  c({
    id: "yield-curve",
    name: "Yield curve",
    aliases: ["term structure", "yield curve", "term structure of interest rates"],
    searchTerms: ["interest rates by maturity", "short versus long bond yields"],
    chapters: [7],
    tags: ["chapter-7", "finance", "graph"],
    summary:
      "The yield curve plots bond yields or interest rates against the time to maturity.",
    intuition:
      "It is a map of the return required for lending for one year, two years, ten years, and so on, not one single interest rate.",
    explanation: [
      "Longer yields reflect expectations about future short-term rates plus any term premium in the course’s framework. The RBA targets a very short rate, but changes can transmit along the curve.",
      "The curve’s shape is not a direct forecast without assumptions about expectations and risk compensation.",
    ],
    whyItMatters:
      "It distinguishes the cash rate from longer bond yields and motivates the expectations hypothesis.",
    prerequisites: ["bond-yield", "maturity", "graph-axis", "expectations"],
    relatedConcepts: [
      "expectations-hypothesis",
      "term-premium",
      "cash-rate",
      "bond-price",
    ],
    sourceRefs: [
      L("lecture-w7-l1", 4, "Term structure and expectations hypothesis."),
      T(201, "Term-structure discussion."),
    ],
  }),
  c({
    id: "expectations-hypothesis",
    name: "Expectations hypothesis",
    aliases: ["expectations hypothesis", "term-structure expectations"],
    searchTerms: [
      "long rate reflects expected future short rates",
      "two-year rate average of one-year rates",
    ],
    chapters: [7],
    tags: ["chapter-7", "finance", "calculation"],
    summary:
      "The expectations hypothesis says a longer-term interest rate is related to the expected path of shorter-term rates.",
    intuition:
      "A two-year loan can be viewed as locking in two years now or rolling over one-year loans; arbitrage links their expected returns under the model.",
    explanation: [
      "The course’s simple formula treats a two-year rate as an average of the current one-year rate and the expected one-year rate next year. Risk or term premia can make actual yields differ.",
      "This is a model of the yield curve, not a guarantee that forecasts are correct.",
    ],
    whyItMatters:
      "It explains why a short cash-rate change can influence longer-term rates and investment decisions.",
    prerequisites: ["yield-curve", "bond-yield", "expectations", "rate"],
    relatedConcepts: ["term-premium", "cash-rate", "monetary-transmission"],
    sourceRefs: [
      L("lecture-w7-l1", 4, "Expectations hypothesis introduction."),
      L("lecture-w7-l1", 7, "Two-year rate formula."),
      T(202, "Term structure and expectations."),
    ],
    equations: [
      {
        label: "Simple two-period expectations relation",
        expression: "i₀² ≈ (i₀¹ + E₀i₁¹) / 2",
        variables: [
          { symbol: "i₀²", meaning: "two-year rate today" },
          { symbol: "i₀¹", meaning: "one-year rate today" },
          {
            symbol: "E₀i₁¹",
            meaning: "rate expected today for a one-year loan beginning next year",
          },
        ],
        interpretation:
          "The course relation abstracts from term premia and compounding details; follow the stated convention in calculations.",
      },
    ],
  }),
  c({
    id: "term-premium",
    name: "Term premium",
    aliases: ["term premium", "maturity risk premium"],
    searchTerms: ["extra return for lending longer", "risk compensation for maturity"],
    chapters: [7],
    tags: ["chapter-7", "finance"],
    summary:
      "A term premium is extra compensation investors may require for holding a longer-maturity asset rather than a sequence of short assets.",
    intuition:
      "Locking money away for longer exposes a lender to more uncertainty about rates, inflation, and resale conditions, so the return can include a premium.",
    explanation: [
      "The expectations hypothesis without a term premium is a simplifying benchmark. A yield curve can therefore reflect both expected future short rates and compensation for maturity risk.",
      "A term premium is not the same as expected inflation or the coupon payment.",
    ],
    whyItMatters:
      "It prevents the cash rate and long bond yield from being treated as mechanically identical.",
    prerequisites: ["yield-curve", "bond-yield", "expectations"],
    relatedConcepts: ["expectations-hypothesis", "cash-rate", "inflation-expectations"],
    sourceRefs: [
      L("lecture-w7-l1", 4, "Term structure and longer rates."),
      T(202, "Longer-term rate interpretation."),
    ],
  }),
  c({
    id: "inflation-target",
    name: "Inflation target",
    aliases: ["inflation target", "RBA inflation target", "2–3 percent target"],
    searchTerms: [
      "RBA target range",
      "desired inflation rate",
      "price stability objective",
    ],
    chapters: [7, 8],
    tags: ["chapter-7", "chapter-8", "monetary-policy", "Australia"],
    summary:
      "An inflation target is a publicly stated rate or range that guides monetary policy and expectations.",
    intuition:
      "It is a reference destination for policy, not a knob that sets CPI instantly.",
    explanation: [
      "The course material uses a flexible Australian target around 2–3% per year. Flexible means the RBA considers output and employment while returning inflation toward the target over time.",
      "A credible target can influence expected inflation, which changes real rates, wages, and price setting.",
    ],
    whyItMatters:
      "It links RBA objectives, policy rules, expectations, and the AD-AS inflation dynamics.",
    prerequisites: ["inflation", "central-bank-objectives", "RBA"],
    relatedConcepts: [
      "policy-instrument-vs-target",
      "taylor-rule",
      "adaptive-expectations",
      "inflation-dynamics",
    ],
    sourceRefs: [
      L("lecture-w5-l2", 8, "RBA explicit inflation target."),
      L("lecture-w7-l2", 41, "Inflation-target policy discussion."),
      T(190, "RBA target range figure."),
    ],
  }),
  c({
    id: "headline-underlying-inflation",
    name: "Headline versus underlying inflation",
    aliases: ["trimmed mean inflation", "underlying inflation", "headline inflation"],
    searchTerms: ["temporary price changes removed", "RBA core inflation measure"],
    chapters: [7],
    tags: ["chapter-7", "prices", "Australia", "contrast"],
    summary:
      "Headline inflation includes all measured consumer-price movements; underlying measures trim or smooth unusually volatile items to reveal persistent pressure.",
    intuition:
      "A petrol-price spike can move headline CPI sharply even when broader recurring price pressure changes less.",
    explanation: [
      "The RBA lecture refers to trimmed-mean inflation as an underlying measure. Neither measure is ‘the true inflation’ in every context; they answer slightly different monitoring questions.",
      "A temporary item can still matter for household budgets even if policymakers look through it when assessing persistence.",
    ],
    whyItMatters:
      "It reflects the Australian course convention and avoids replacing RBA terminology with a US-specific core measure.",
    prerequisites: ["cpi", "inflation", "price-index"],
    relatedConcepts: ["inflation-target", "price-level", "supply-shock"],
    sourceRefs: [
      L("lecture-w5-l2", 8, "RBA inflation measures and target."),
      T(191, "Headline and core inflation figure."),
    ],
    contrasts: [
      {
        conceptId: "inflation",
        title: "Headline versus underlying inflation",
        difference:
          "Headline includes all CPI movements; underlying measures are designed to reduce the influence of unusually volatile components.",
      },
    ],
  }),
  c({
    id: "policy-reaction-function",
    name: "Policy reaction function",
    aliases: ["policy reaction function", "PRF", "central-bank reaction function"],
    searchTerms: [
      "rule for how RBA changes real rate",
      "interest rate response to inflation and output",
    ],
    chapters: [7, 8],
    tags: ["chapter-7", "chapter-8", "monetary-policy", "calculation"],
    summary:
      "A policy reaction function describes how the central bank’s policy rate responds to inflation, output gaps, or other conditions.",
    intuition:
      "It is a behavioural rule for the policymaker: higher inflation or an output gap can trigger a different real-rate setting according to the chosen coefficients.",
    explanation: [
      "The course uses a simplified function such as r = r₀ + γπ and then adds an inflation target or output-gap term. The coefficients describe policy responsiveness under the model.",
      "A reaction function is not the same as the cash-rate operating procedure. The procedure achieves a chosen rate; the reaction function explains how the chosen rate is selected.",
    ],
    whyItMatters:
      "It closes the loop from inflation/output to policy and is used to derive AD.",
    prerequisites: [
      "real-interest-rate",
      "inflation",
      "output-gap",
      "central-bank-objectives",
      "linear-equation",
    ],
    relatedConcepts: [
      "taylor-rule",
      "taylor-principle",
      "aggregate-demand",
      "inflation-target",
    ],
    sourceRefs: [
      L("lecture-w7-l1", 47, "Simplified policy reaction function."),
      L("lecture-w7-l1", 54, "Policy reaction function with inflation target."),
      T(204, "Simple policy rule."),
    ],
  }),
  c({
    id: "taylor-rule",
    name: "Taylor rule",
    aliases: ["Taylor rule", "Taylor-type rule"],
    searchTerms: [
      "interest rate rule responds to inflation and output gap",
      "policy rule formula",
    ],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "calculation"],
    summary:
      "A Taylor rule is a policy reaction rule that adjusts an interest rate in response to inflation and economic slack.",
    intuition:
      "The central bank raises the policy rate when inflation is high and can lower it when output is below potential, with the strength encoded in coefficients.",
    explanation: [
      "The course’s illustrative rule uses a baseline real rate plus coefficients on inflation and the output gap. Symbols and numerical coefficients must follow the question’s notation.",
      "A rule is a simplified description of policy behaviour, not a legal instruction that mechanically determines every RBA decision.",
    ],
    whyItMatters:
      "It tests substitution, sign discipline, and the difference between policy objectives and the instrument response.",
    prerequisites: [
      "policy-reaction-function",
      "inflation",
      "output-gap",
      "algebraic-substitution",
    ],
    relatedConcepts: [
      "taylor-principle",
      "inflation-target",
      "RBA",
      "monetary-transmission",
    ],
    sourceRefs: [
      L("lecture-w7-l1", 14, "Taylor rule introduction."),
      T(204, "Simple policy rule."),
    ],
    equations: [
      {
        label: "Illustrative Taylor-type rule",
        expression: "i = i₀ + aπ + b·output gap",
        variables: [
          { symbol: "i", meaning: "policy interest rate in the chosen convention" },
          { symbol: "i₀", meaning: "baseline policy setting" },
          { symbol: "a", meaning: "response coefficient on inflation" },
          { symbol: "b", meaning: "response coefficient on the output gap" },
        ],
        interpretation:
          "Use the course’s exact real/nominal notation and target-centred terms when solving a given question.",
      },
    ],
  }),
  c({
    id: "taylor-principle",
    name: "Taylor principle",
    aliases: ["Taylor principle", "more-than-one-for-one rate response"],
    searchTerms: [
      "nominal rate rises more than inflation",
      "real rate rises when inflation rises",
    ],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy"],
    summary:
      "The Taylor principle says a central bank should raise the nominal policy rate more than one-for-one with a persistent rise in inflation to raise the real rate.",
    intuition:
      "If the nominal rate rises only as much as inflation, the real rate need not increase; a stronger response tightens real conditions.",
    explanation: [
      "The principle is about a policy response coefficient and the Fisher relationship. It is not a claim that every single observed rate move must follow a fixed number.",
      "The required response can depend on expected inflation, targets, and the policy rule’s exact notation.",
    ],
    whyItMatters:
      "It links the RBA policy rule to inflation stabilisation and real-rate effects.",
    prerequisites: ["taylor-rule", "fisher-relationship", "inflation"],
    relatedConcepts: [
      "policy-reaction-function",
      "real-interest-rate",
      "inflation-target",
    ],
    sourceRefs: [
      L("lecture-w7-l1", 14, "Taylor rule and policy response."),
      T(204, "Policy rule discussion."),
    ],
  }),
  c({
    id: "money-destruction",
    name: "Bank money destruction",
    aliases: [
      "money destruction",
      "deposit destruction",
      "loan repayment money effect",
    ],
    searchTerms: [
      "loan repayment destroys deposit money",
      "bank loan write-off money stock",
      "reverse of bank money creation",
    ],
    chapters: [6],
    tags: ["chapter-6", "finance", "money", "mechanism", "high-yield"],
    summary:
      "Bank money destruction is the reverse balance-sheet process in which loan repayment removes the matching deposit money; default write-offs reduce bank assets and equity and must be analysed separately.",
    intuition:
      "If a bank created a loan and a deposit together, paying back the principal cancels both entries rather than moving a fixed pile of money to another bank.",
    explanation: [
      "When a borrower repays principal from a deposit at the lending bank, the bank’s loan asset falls and its deposit liability falls by the same amount. The corresponding deposit money is destroyed in the simplified course model.",
      "An interbank payment normally transfers deposits and settlement balances between banks, so it need not change total deposit money. A default or write-off reduces the value of the bank’s loan asset and usually equity; its deposit effect depends on the settlement and accounting details, so it is not interchangeable with voluntary repayment.",
    ],
    whyItMatters:
      "It prevents the common error of treating bank money creation as one-way and distinguishes repayment, write-off, and interbank settlement.",
    prerequisites: ["money-creation", "bank-lending", "deposit", "bank-balance-sheet"],
    relatedConcepts: [
      "money-stock",
      "bank-leverage",
      "solvency",
      "liquidity",
      "interbank-payment",
    ],
    mechanism: [
      "bank loan principal is repaid",
      "borrower deposit falls",
      "bank loan asset falls",
      "corresponding deposit money is destroyed",
    ],
    sourceRefs: [
      L("lecture-w5-l1", 56, "Bank lending creates a loan and deposit together."),
      L("lecture-w5-l1", 58, "Calling in loans is a bank response to withdrawals."),
      T(173, "Bank lending and deposit creation."),
    ],
    misconceptions: [
      "A payment from one bank customer to another bank is not automatically money destruction; it may only transfer deposits and reserves.",
      "A loan default/write-off is not the same balance-sheet event as voluntary principal repayment.",
    ],
  }),
  c({
    id: "cash-rate-security-transmission",
    name: "Cash rate to short-term security yields",
    aliases: [
      "cash rate security transmission",
      "cash rate to Treasury bill yield",
      "short-term security return channel",
    ],
    searchTerms: [
      "cash rate required return Treasury bill",
      "cash rate security demand price yield",
      "short rate bond price transmission",
    ],
    chapters: [7],
    tags: ["chapter-7", "monetary-policy", "bond", "mechanism", "high-yield"],
    summary:
      "A cash-rate change can alter expected short-term returns and therefore the demand, price, and yield of existing fixed-payment short-term securities.",
    intuition:
      "When comparable new short-term returns rise, an existing bill must become cheaper before buyers will accept its fixed promised payment.",
    explanation: [
      "The cash rate is an overnight rate, so the expectations/term-structure link connects it to other short-term and longer-term market rates. A higher target can raise the required or expected return on a comparable short-term security, holding other conditions constant.",
      "For an existing fixed-payment Treasury bill or bond, lower demand at the old price pushes its price down. Because the promised payment is fixed, the lower price corresponds to a higher yield. RBA OMO changes ES balances in the cash market; that is related monetary-policy plumbing, not a reason to reverse the bond price/yield relationship.",
    ],
    whyItMatters:
      "It joins the cash-rate, expectations, bond-price, and yield concepts into the multi-step mechanism used by monetary-policy questions.",
    prerequisites: ["cash-rate", "bond-price", "bond-yield", "expectations-hypothesis"],
    relatedConcepts: [
      "cash-rate-target",
      "yield-curve",
      "interest-rate",
      "open-market-operation",
      "monetary-transmission",
    ],
    mechanism: [
      "cash-rate target changes",
      "expected/required short-term return changes",
      "demand for an existing fixed-payment security changes",
      "security price moves in the opposite direction to its yield",
    ],
    sourceRefs: [
      L("lecture-w7-l1", 8, "Cash rate and longer-term rates through expectations."),
      L("lecture-w7-l1", 9, "Cash rate and six-month bank-bill rate."),
      T(200, "Cash rate and government bonds and bills."),
      T(202, "Expectations hypothesis and longer-term rates."),
    ],
    contrasts: [
      {
        conceptId: "bond-price",
        title: "Security price versus security yield",
        difference:
          "A higher required return lowers the price of an existing fixed-payment security while raising its yield.",
      },
      {
        conceptId: "open-market-operation",
        title: "Transmission versus OMO plumbing",
        difference:
          "The transmission chain describes returns and security valuation; OMO directly changes ES balances to implement the cash-rate target.",
      },
    ],
  }),
] as const;
