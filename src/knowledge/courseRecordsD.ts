import { c, L, T } from "./records";

export const courseRecordsD = [
  c({
    id: "marginal-product-labour",
    name: "Marginal product of labour",
    aliases: ["MPL", "marginal product of labor", "marginal product of labour"],
    searchTerms: [
      "extra output from one more worker",
      "productivity of the next worker",
    ],
    chapters: [2],
    tags: ["chapter-2", "labour", "calculation"],
    summary:
      "The marginal product of labour is the extra output produced by one additional unit of labour, holding other inputs fixed.",
    intuition:
      "It asks what the next worker-hour contributes, not what the average worker produces.",
    explanation: [
      "A firm compares the value of the extra output with the real wage or other cost of hiring. With capital fixed, the marginal product can fall as more labour is added.",
      "A technology improvement can raise the marginal product of labour and shift labour demand outward.",
    ],
    whyItMatters:
      "It is the benefit side of firm labour demand and the source of productivity shifts in the labour-market model.",
    prerequisites: ["capital", "quantity", "rate"],
    relatedConcepts: [
      "value-marginal-product-labour",
      "labour-demand",
      "productivity",
      "diminishing-marginal-product",
    ],
    sourceRefs: [
      L("lecture-w2-l1", 24, "Higher marginal productivity shifts labour demand."),
      T(69, "Production and employment of Kitchen Café."),
    ],
  }),
  c({
    id: "value-marginal-product-labour",
    name: "Value of the marginal product of labour",
    aliases: [
      "VMPL",
      "value marginal product of labour",
      "value marginal product of labor",
    ],
    searchTerms: [
      "wage value of extra worker output",
      "price times marginal product of labour",
    ],
    chapters: [2],
    tags: ["chapter-2", "labour", "calculation"],
    summary:
      "The value of the marginal product of labour is the market value of the extra output produced by another worker or hour.",
    intuition:
      "A worker’s extra physical output matters to a firm through what that output can be sold for.",
    explanation: [
      "In a competitive model the firm hires labour until the value of the marginal product is equal to the real wage. A higher output price raises the value of a given physical marginal product.",
      "VMPL is marginal, not total revenue and not the average wage paid to all workers.",
    ],
    whyItMatters:
      "It supplies the curve behind firm labour demand and wage-employment equilibrium.",
    prerequisites: ["marginal-product-labour", "price"],
    relatedConcepts: [
      "firm-labour-demand",
      "aggregate-labour-demand",
      "real-wage",
      "labour-supply",
    ],
    sourceRefs: [
      T(70, "Demand for labour and VMPL."),
      L("lecture-w2-l1", 24, "Marginal productivity and labour demand."),
    ],
    equations: [
      {
        label: "Value marginal product",
        expression: "VMPL = P × MPL",
        variables: [
          { symbol: "P", meaning: "price of the firm’s output" },
          { symbol: "MPL", meaning: "extra output from another unit of labour" },
        ],
        interpretation:
          "In the competitive model the firm compares VMPL with the real wage or its equivalent cost.",
      },
    ],
  }),
  c({
    id: "labour-demand",
    name: "Labour demand",
    aliases: ["demand for labour", "labour demand curve", "labor demand"],
    searchTerms: ["firms wanting workers", "employer demand for labour"],
    chapters: [2],
    tags: ["chapter-2", "labour", "graph"],
    summary:
      "Labour demand is the amount of labour firms want to hire at different real wages, given productivity and output conditions.",
    intuition:
      "A firm hires another worker when the value of what that worker adds is at least as large as the real cost of employing them.",
    explanation: [
      "A movement along labour demand follows from a real-wage change. A shift can come from productivity, the price of output, capital available to workers, or demand for the firm’s product.",
      "Aggregate labour demand adds firms’ labour-demand decisions, subject to the course’s competitive assumptions.",
    ],
    whyItMatters:
      "It gives a graph-based way to predict employment and wage changes after productivity, tax, or output shocks.",
    prerequisites: ["value-marginal-product-labour", "real-wage", "demand"],
    relatedConcepts: [
      "firm-labour-demand",
      "aggregate-labour-demand",
      "labour-supply",
      "wage-floor",
    ],
    sourceRefs: [
      L("lecture-w2-l1", 24, "Firm labour-demand shifts."),
      T(70, "Demand for labour."),
    ],
    misconceptions: [
      "A higher employment caused by a lower real wage is movement along labour demand, not necessarily an outward shift in demand.",
    ],
  }),
  c({
    id: "firm-labour-demand",
    name: "Firm labour demand",
    aliases: ["individual firm labour demand", "firm demand for labour"],
    searchTerms: ["one business hiring rule", "employer hiring decision"],
    chapters: [2],
    tags: ["chapter-2", "labour"],
    summary:
      "Firm labour demand is the individual firm’s desired employment at each real wage.",
    intuition:
      "The firm compares the next worker’s value of marginal product with the wage cost and stops when the next hire is no longer worthwhile.",
    explanation: [
      "A firm’s demand can change when its technology, capital stock, product price, or expected product demand changes.",
      "Aggregate labour demand is built by combining many firms, so a single firm’s decision is not automatically the whole labour market.",
    ],
    whyItMatters:
      "It makes the firm-level reasoning behind the aggregate labour-demand curve explicit.",
    prerequisites: ["value-marginal-product-labour", "labour-demand"],
    relatedConcepts: [
      "aggregate-labour-demand",
      "marginal-product-labour",
      "real-wage",
    ],
    sourceRefs: [
      T(69, "Kitchen Café labour-demand example."),
      L("lecture-w2-l1", 24, "Shift in a business’s labour demand."),
    ],
  }),
  c({
    id: "aggregate-labour-demand",
    name: "Aggregate labour demand",
    aliases: ["economy-wide labour demand", "aggregate demand for labour"],
    searchTerms: ["all firms' demand for workers", "economy labour demand curve"],
    chapters: [2],
    tags: ["chapter-2", "labour", "graph"],
    summary:
      "Aggregate labour demand combines firms’ desired employment at each real wage across the economy.",
    intuition:
      "The economy-wide curve is the sum of many employer decisions, so common productivity or demand shocks can move it.",
    explanation: [
      "An outward shift can raise equilibrium employment and real wages if labour supply is upward sloping. A tax wedge can separate the worker’s real wage from the firm’s effective labour cost.",
      "The curve is about labour input, not the number of unemployed people directly.",
    ],
    whyItMatters:
      "It is one side of the competitive labour-market equilibrium diagram.",
    prerequisites: ["firm-labour-demand", "labour-demand", "real-wage"],
    relatedConcepts: [
      "labour-supply",
      "labour-tax-wedge",
      "marginal-product-labour",
      "potential-output",
    ],
    sourceRefs: [
      T(72, "Economy-wide labour demand curve."),
      L("lecture-w2-l1", 41, "Productivity shift in labour demand."),
    ],
  }),
  c({
    id: "labour-supply",
    name: "Labour supply",
    aliases: ["supply of labour", "labour supply curve", "labor supply"],
    searchTerms: ["workers willing to work", "household labour decision"],
    chapters: [2],
    tags: ["chapter-2", "labour", "graph"],
    summary:
      "Labour supply is the amount of labour people are willing and able to offer at different real wages.",
    intuition:
      "People compare the reward from working with the value of leisure and other uses of time, subject to their circumstances.",
    explanation: [
      "A movement along the curve follows from a real-wage change. A shift can come from population, preferences, taxes, migration, demographics, or other conditions.",
      "The labour force is a statistical category; labour supply is a behavioural schedule in the model. They overlap conceptually but are not synonyms.",
    ],
    whyItMatters:
      "It supplies the other side of labour-market wage and employment equilibrium.",
    prerequisites: ["labour-force", "real-wage", "supply"],
    relatedConcepts: [
      "aggregate-labour-demand",
      "participation-rate",
      "labour-tax-wedge",
      "wage-floor",
    ],
    sourceRefs: [
      L("lecture-w2-l1", 41, "Real labour supply and productivity graph."),
      T(73, "Economy-wide labour supply."),
    ],
  }),
  c({
    id: "nominal-wage",
    name: "Nominal wage",
    aliases: ["money wage", "nominal wages", "wage in dollars"],
    searchTerms: ["dollar pay per hour", "wage before price adjustment"],
    chapters: [2],
    tags: ["chapter-2", "labour", "measurement"],
    summary:
      "A nominal wage is the money payment for labour before adjusting for the price level.",
    intuition:
      "A $30 hourly wage tells you the dollar cheque, not how many goods and services that cheque can buy.",
    explanation: [
      "The real wage divides the nominal wage by a price index or price level. Inflation can reduce the purchasing-power change even when the nominal wage rises.",
      "Labour-market supply and demand in the course are usually expressed in real-wage terms so firms and workers compare quantities and purchasing power.",
    ],
    whyItMatters:
      "It is a near-neighbour contrast in labour statistics and inflation-adjusted incentives.",
    prerequisites: ["wage", "nominal", "price-level"],
    relatedConcepts: ["real-wage", "inflation", "labour-demand", "labour-supply"],
    sourceRefs: [
      L("lecture-w2-l1", 43, "Competitive labour-market wages."),
      T(70, "Real wage and labour demand."),
    ],
  }),
  c({
    id: "wage",
    name: "Wage",
    aliases: ["wages", "pay", "hourly wage"],
    searchTerms: ["payment for labour", "worker pay"],
    chapters: [2],
    tags: ["foundation", "chapter-2", "labour"],
    summary:
      "A wage is payment for labour services, usually stated per hour or per period.",
    intuition:
      "It is the price of a unit of labour time from the firm’s viewpoint and income from the worker’s viewpoint.",
    explanation: [
      "Wages can be quoted in nominal dollars or real purchasing-power terms. A wage floor is a legal or institutional minimum, not necessarily the equilibrium wage.",
      "The firm compares wage cost with the value of a worker’s extra output; workers compare the wage with the opportunity cost of time.",
    ],
    whyItMatters:
      "It gives the ordinary-language starting point for real wages, labour demand, labour supply, and wage floors.",
    prerequisites: ["income", "market", "price"],
    relatedConcepts: ["nominal-wage", "real-wage", "wage-floor", "labour-demand"],
    sourceRefs: [
      T(70, "Labour-market wage and VMPL."),
      L("lecture-w2-l1", 43, "Competitive labour market."),
    ],
  }),
  c({
    id: "real-wage",
    name: "Real wage",
    aliases: ["real wages", "wage purchasing power"],
    searchTerms: ["inflation-adjusted wage", "goods a wage can buy"],
    chapters: [2],
    tags: ["chapter-2", "labour", "measurement"],
    summary:
      "A real wage is a nominal wage adjusted for the price level, measuring labour income’s purchasing power.",
    intuition:
      "If the pay packet rises 3% but prices rise 5%, the worker’s command over goods has fallen approximately 2%.",
    explanation: [
      "The real wage is the relevant comparison for labour supply and labour demand in the simple competitive model. Its movement depends on both nominal wages and prices.",
      "A nominal wage floor can have a different real effect when the price level changes.",
    ],
    whyItMatters:
      "It connects the labour market to inflation and keeps wage diagrams in purchasing-power units.",
    prerequisites: ["nominal-wage", "price-level", "real"],
    relatedConcepts: ["labour-demand", "labour-supply", "wage-floor", "inflation"],
    sourceRefs: [
      L("lecture-w2-l1", 43, "Real wage in the competitive model."),
      T(70, "Labour demand and real wage."),
    ],
    equations: [
      {
        label: "Real wage",
        expression: "nominal wage / price level",
        variables: [
          { symbol: "nominal wage", meaning: "money payment for labour" },
          { symbol: "price level", meaning: "cost of goods and services" },
        ],
        interpretation:
          "The result is in purchasing-power units; compare rates of change consistently when using approximations.",
      },
    ],
  }),
  c({
    id: "wage-floor",
    name: "Wage floor",
    aliases: ["minimum wage", "minimum wage law", "wage floor"],
    searchTerms: ["legal minimum pay", "minimum hourly wage"],
    chapters: [2],
    tags: ["chapter-2", "labour", "graph"],
    summary:
      "A wage floor is a minimum wage employers are legally or institutionally required to pay.",
    intuition:
      "If the floor is above the market-clearing wage, more people want jobs than firms want to hire at that wage, creating a surplus of labour.",
    explanation: [
      "A binding floor affects the quantity of labour demanded and supplied; a floor below equilibrium has no effect in the simple model.",
      "The course’s graph usually uses a real wage, so check whether the stated floor is nominal or real before interpreting it.",
    ],
    whyItMatters:
      "It is a direct application of supply-demand equilibrium and a common labour-market diagram trap.",
    prerequisites: ["real-wage", "labour-demand", "labour-supply", "surplus"],
    relatedConcepts: ["unemployment-rate", "equilibrium", "labour-tax-wedge"],
    sourceRefs: [
      L("lecture-w2-l1", 44, "Minimum wage laws."),
      T(75, "Real wage floor in aggregate labour market."),
    ],
  }),
  c({
    id: "labour-tax-wedge",
    name: "Labour tax wedge",
    aliases: ["tax wedge", "labour tax wedge", "labor tax wedge"],
    searchTerms: [
      "difference between worker pay and employer cost",
      "tax on employment",
    ],
    chapters: [2],
    tags: ["chapter-2", "labour", "fiscal"],
    summary:
      "A labour tax wedge is the gap created by taxes or charges between the worker’s real wage and the firm’s real labour cost.",
    intuition:
      "The worker may receive one dollar amount while the firm must pay more, or the firm’s payment may be higher than the worker’s take-home amount.",
    explanation: [
      "The wedge changes the relative price of employing labour and can reduce equilibrium employment in the simple competitive model, depending on who bears it.",
      "A tax wedge is not the same as a wage cut: incidence and the two sides of the market determine the outcome.",
    ],
    whyItMatters:
      "It connects fiscal instruments to labour demand, supply, wages, and employment.",
    prerequisites: ["tax", "real-wage", "labour-demand", "labour-supply"],
    relatedConcepts: ["wage-floor", "marginal-tax-rate", "employment"],
    sourceRefs: [
      L("lecture-w2-l1", 47, "Effects of a tax on labour."),
      T(77, "Tax on labour figure."),
    ],
  }),
  c({
    id: "discouraged-workers",
    name: "Discouraged workers",
    aliases: ["discouraged worker", "discouraged job seekers"],
    searchTerms: ["stopped looking for work", "job seekers leaving labour force"],
    chapters: [2],
    tags: ["chapter-2", "labour", "high-yield"],
    summary:
      "Discouraged workers are people who want work but stop actively searching, so they may be counted outside the labour force.",
    intuition:
      "A weak job market can make someone give up searching; the unemployment rate can then fall even though the person has not found a job.",
    explanation: [
      "The classification depends on search and availability criteria. Broader measures of labour underutilisation may include people who are marginally attached, but the course’s official unemployment rate follows the formal labour-force definition.",
      "Participation and employment-to-population ratios help reveal this hidden movement.",
    ],
    whyItMatters:
      "It is the most important labour-statistics example of why one headline rate can mislead.",
    prerequisites: ["unemployed", "not-in-labour-force", "labour-market-flows"],
    relatedConcepts: [
      "participation-rate",
      "unemployment-rate",
      "cyclical-unemployment",
    ],
    sourceRefs: [
      L("lecture-w1-l2", 26, "Not-in-labour-force classification."),
      T(56, "Labour-market definitions."),
    ],
  }),
  c({
    id: "structural-change",
    name: "Structural change",
    aliases: ["structural economic change", "industry change"],
    searchTerms: [
      "economy shifts between industries",
      "technology and job composition",
    ],
    chapters: [2, 10],
    tags: ["chapter-2", "chapter-10", "labour", "growth"],
    summary:
      "Structural change is a persistent change in the industries, technologies, skills, or institutions that shape production and work.",
    intuition:
      "The economy can create new jobs while old skills or locations no longer match demand, so adjustment takes time.",
    explanation: [
      "Structural change can produce structural unemployment during reallocation and can raise productivity over time if workers, capital, and ideas move successfully.",
      "It differs from a cyclical downturn, which changes the overall level of demand around the economy’s structure.",
    ],
    whyItMatters:
      "It links labour-market mismatch to long-run productivity and growth without treating all unemployment as a demand problem.",
    prerequisites: ["structural-unemployment", "productivity", "capital"],
    relatedConcepts: ["technology-ideas", "labour-productivity", "economic-growth"],
    sourceRefs: [
      T(63, "Structural change and unemployment."),
      L("lecture-w9-l1", 63, "Technology and productivity influences."),
    ],
  }),
  c({
    id: "aggregate-demand",
    name: "Aggregate demand (AD)",
    aliases: ["AD", "aggregate demand curve"],
    searchTerms: [
      "total demand for domestic output",
      "output-inflation demand relationship",
    ],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "high-yield"],
    summary:
      "Aggregate demand is the relationship between real output and inflation or the price condition consistent with goods-market and policy equilibrium.",
    intuition:
      "For each inflation rate, the PAE and policy rule imply a real rate and an equilibrium output level; plotting those pairs gives AD.",
    explanation: [
      "In this course AD is derived from the income-expenditure model plus the real-rate-sensitive spending relationship and policy reaction function. It is not simply the sum of four micro demand curves.",
      "A movement along AD follows from inflation changing with the curve fixed. A shift changes an underlying determinant such as fiscal settings, autonomous demand, potential output, or the policy rule.",
    ],
    whyItMatters:
      "It is the demand side of the AD-AS model and the destination of monetary and fiscal transmission chains.",
    prerequisites: [
      "planned-aggregate-expenditure",
      "real-interest-rate",
      "policy-reaction-function",
      "graph-axis",
    ],
    relatedConcepts: [
      "ad-equation",
      "ad-slope",
      "ad-shift",
      "movement-along-ad",
      "aggregate-supply",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 2, "AD curve building blocks."),
      T(215, "Aggregate demand from PAE and the real rate."),
    ],
  }),
  c({
    id: "ad-equation",
    name: "AD equation",
    aliases: ["aggregate demand equation", "AD model equation"],
    searchTerms: ["derive AD from PAE and policy rule", "formula for aggregate demand"],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "calculation"],
    summary:
      "The AD equation is the algebraic relationship obtained by combining PAE with the real-rate and policy equations.",
    intuition:
      "It compresses several causal links into one line, but every coefficient still carries the assumptions of the underlying model.",
    explanation: [
      "The course substitutes the policy reaction function into PAE and solves for Y as a function of inflation and exogenous terms. A negative coefficient on inflation gives a downward-sloping AD curve under the model.",
      "When an autonomous spending term changes, the equation shifts rather than simply moving the economy along a fixed curve.",
    ],
    whyItMatters:
      "It is the algebraic version of the AD graph and a test of substitution and sign discipline.",
    prerequisites: [
      "aggregate-demand",
      "policy-reaction-function",
      "planned-aggregate-expenditure",
      "algebraic-substitution",
    ],
    relatedConcepts: [
      "ad-slope",
      "ad-shift",
      "movement-along-ad",
      "short-run-equilibrium",
    ],
    sourceRefs: [
      L("lecture-w7-l1", 32, "PAE equation with the real rate."),
      L("lecture-w7-l2", 8, "Simplified AD equation."),
      T(217, "Deriving AD."),
    ],
  }),
  c({
    id: "ad-slope",
    name: "AD slope",
    aliases: ["downward-sloping AD", "slope of AD"],
    searchTerms: [
      "why aggregate demand slopes down",
      "inflation raises real rate and lowers output",
    ],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "graph"],
    summary:
      "The AD curve slopes down in the course model because higher inflation induces a higher policy real rate, reducing interest-sensitive spending and output.",
    intuition:
      "With the policy rule reacting to inflation, a higher inflation rate leads to tighter real conditions, so the compatible equilibrium output is lower.",
    explanation: [
      "The chain is conditional on the policy reaction function, expected inflation treatment, and PAE response to the real rate. It is not the same explanation as an individual demand curve’s price effect.",
      "A steeper or flatter AD curve reflects the strength of those links, not a different definition of aggregate demand.",
    ],
    whyItMatters:
      "It is a core diagram explanation and a good example of a mechanism rather than a memorised curve shape.",
    prerequisites: [
      "aggregate-demand",
      "ad-equation",
      "policy-reaction-function",
      "real-rate-channel",
      "graph-slope",
    ],
    relatedConcepts: ["ad-shift", "movement-along-ad", "monetary-transmission"],
    sourceRefs: [
      L("lecture-w7-l2", 8, "AD has a negative slope."),
      T(217, "Aggregate demand slope."),
    ],
  }),
  c({
    id: "movement-along-ad",
    name: "Movement along AD",
    aliases: ["move along AD", "movement along aggregate demand"],
    searchTerms: ["inflation changes on fixed AD curve", "same AD curve new point"],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "graph", "high-yield"],
    summary:
      "A movement along AD is a change in output caused by a change in inflation with the underlying AD determinants held fixed.",
    intuition:
      "The curve is a menu of compatible output levels; a new inflation rate selects a different point on that same menu.",
    explanation: [
      "If fiscal policy, the policy rule, autonomous spending, and potential output change, the AD curve shifts instead. Read the question for what changed before drawing an arrow.",
      "A movement along AD is not a demand shift, even though output and inflation both change between equilibria.",
    ],
    whyItMatters:
      "It is one of the most common graph and model-discrimination traps in Chapter 8.",
    prerequisites: ["aggregate-demand", "ad-slope", "inflation", "graph-axis"],
    relatedConcepts: ["ad-shift", "aggregate-supply", "short-run-equilibrium"],
    sourceRefs: [
      L("lecture-w7-l2", 5, "Movement along the AD curve."),
      T(218, "Movement along AD figure."),
    ],
  }),
  c({
    id: "ad-shift",
    name: "AD shift",
    aliases: ["shift in AD", "aggregate-demand shift"],
    searchTerms: [
      "whole AD curve moves",
      "autonomous spending or policy change shifts AD",
    ],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "graph", "high-yield"],
    summary:
      "An AD shift changes the output compatible with each inflation rate because an underlying determinant of demand changed.",
    intuition:
      "A fiscal expansion, stronger autonomous consumption, or an easier policy rule changes the whole set of demand outcomes, not just the selected point.",
    explanation: [
      "The direction depends on the shock and the model. A fall in autonomous spending shifts AD left; a lower policy intercept or stronger exports can shift it right.",
      "A change in inflation with no change in the determinants is a movement along the existing curve instead.",
    ],
    whyItMatters:
      "It organises the sign logic for demand shocks and policy responses in AD-AS questions.",
    prerequisites: [
      "aggregate-demand",
      "ad-equation",
      "autonomous-expenditure",
      "graph-slope",
    ],
    relatedConcepts: [
      "movement-along-ad",
      "demand-shock",
      "demand-stabilisation",
      "aggregate-supply",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 10, "Shifts in the AD curve."),
      T(220, "AD shifts figure."),
    ],
  }),
  c({
    id: "aggregate-supply",
    name: "Aggregate supply (AS)",
    aliases: ["AS", "aggregate supply curve"],
    searchTerms: [
      "output and inflation supply relationship",
      "firms' price-setting relationship",
    ],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "high-yield"],
    summary:
      "Aggregate supply is the relationship between output and inflation generated by firms’ price-setting and production conditions.",
    intuition:
      "When output is above sustainable capacity, firms face stronger cost or demand pressure and inflation can rise; when output is weak, inflation pressure can ease.",
    explanation: [
      "The course’s short-run AS relationship uses expected inflation, shocks, and the output gap. Long-run equilibrium returns output to potential under the model’s adjustment process.",
      "AS is not a list of every firm’s supply curve and does not have one universal shape independent of the time horizon.",
    ],
    whyItMatters:
      "It supplies the price/inflation side needed to solve for both output and inflation in AD-AS.",
    prerequisites: [
      "potential-output",
      "inflation-expectations",
      "output-gap",
      "supply",
    ],
    relatedConcepts: [
      "short-run-aggregate-supply",
      "long-run-equilibrium",
      "inflation-dynamics",
      "supply-shock",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 13, "Aggregate supply building block."),
      T(221, "Aggregate supply and inflation."),
    ],
  }),
  c({
    id: "short-run-aggregate-supply",
    name: "Short-run aggregate supply",
    aliases: ["short-run AS", "SRAS"],
    searchTerms: [
      "short-run inflation-output curve",
      "AS before expectations fully adjust",
    ],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "graph"],
    summary:
      "Short-run aggregate supply describes how inflation responds to output relative to potential while expectations and some costs adjust slowly.",
    intuition:
      "Firms can change prices and production, but contracts, expectations, and capacity do not all reset instantly.",
    explanation: [
      "The short-run curve shifts with expected inflation and supply shocks. A positive output gap tends to create upward inflation pressure in the course model.",
      "As expectations and costs adjust, the economy can move toward a long-run equilibrium with output at potential.",
    ],
    whyItMatters:
      "It explains temporary output gaps and the inflation trade-off after demand or supply shocks.",
    prerequisites: ["aggregate-supply", "inflation-expectations", "output-gap"],
    relatedConcepts: [
      "long-run-equilibrium",
      "adaptive-expectations",
      "adverse-supply-shock",
      "favourable-supply-shock",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 17, "Aggregate supply with constant inflation."),
      T(222, "AS curve and constant inflation."),
    ],
  }),
  c({
    id: "inflation-dynamics",
    name: "Inflation dynamics",
    aliases: ["inflation dynamics", "inflation adjustment"],
    searchTerms: ["how inflation evolves over time", "output gap changes inflation"],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "high-yield"],
    summary:
      "Inflation dynamics describe how current inflation responds to expected or past inflation, the output gap, and supply shocks.",
    intuition:
      "Inflation can carry momentum because firms and workers look at recent prices, but an economy-wide gap between demand and capacity adds pressure or slack.",
    explanation: [
      "The course’s short-run relationship includes expected or lagged inflation, the output gap, and a shock term. The coefficients determine how strongly each component matters.",
      "A one-off supply shock can shift inflation temporarily; persistent expectations or accommodation can make the effect last longer.",
    ],
    whyItMatters:
      "It ties the AD-AS graph to a causal time sequence instead of treating inflation as a static label.",
    prerequisites: [
      "short-run-aggregate-supply",
      "output-gap",
      "inflation-expectations",
    ],
    relatedConcepts: [
      "adaptive-expectations",
      "accommodating-inflation",
      "supply-shock",
      "inflation-target",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 18, "Inflation shocks and dynamics."),
      T(226, "Inflation response to output gap."),
    ],
    equations: [
      {
        label: "Illustrative inflation dynamics",
        expression: "π = πᵉ + λ(output gap) + ε",
        variables: [
          { symbol: "π", meaning: "current inflation" },
          { symbol: "πᵉ", meaning: "expected inflation" },
          { symbol: "λ", meaning: "output-gap response coefficient" },
          { symbol: "ε", meaning: "supply/inflation shock" },
        ],
        interpretation:
          "Use the course’s exact lag and shock notation; the equation says the output gap creates pressure around expected inflation.",
      },
    ],
  }),
  c({
    id: "adaptive-expectations",
    name: "Adaptive expectations",
    aliases: ["adaptive inflation expectations", "backward-looking expectations"],
    searchTerms: [
      "expectations based on past inflation",
      "last period inflation forecast",
    ],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "expectations"],
    summary:
      "Adaptive expectations form beliefs about future inflation partly from past inflation outcomes.",
    intuition:
      "If prices rose faster than expected last period, people revise their next expectation upward rather than forgetting the surprise instantly.",
    explanation: [
      "The exact adaptive rule can use last period’s inflation or a weighted adjustment. It creates persistence: shocks can affect expectations and therefore future inflation.",
      "This is one model of expectations, not a claim that every learner or firm forecasts identically.",
    ],
    whyItMatters:
      "It explains why inflation can continue adjusting after the initial demand or supply shock.",
    prerequisites: ["inflation-expectations", "inflation-dynamics", "growth-rate"],
    relatedConcepts: [
      "short-run-aggregate-supply",
      "inflation-target",
      "accommodating-inflation",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 15, "Expected and actual inflation."),
      T(221, "Expected inflation in AS."),
    ],
  }),
  c({
    id: "demand-shock",
    name: "Demand shock",
    aliases: ["aggregate-demand shock", "AD shock"],
    searchTerms: ["unexpected change in spending demand", "demand disturbance"],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "shock"],
    summary:
      "A demand shock changes aggregate demand through spending, policy, confidence, exports, or financial conditions.",
    intuition:
      "It changes how much output buyers collectively want at a given inflation rate, shifting AD in the model.",
    explanation: [
      "An expansionary demand shock tends to raise output and inflation in the short run; a negative shock tends to lower both, subject to the AS slope and policy response.",
      "A change in inflation that merely selects another point on a fixed AD curve is not itself an AD shift.",
    ],
    whyItMatters:
      "It organises the shock-response diagrams and the distinction between demand and supply disturbances.",
    prerequisites: ["ad-shift", "aggregate-demand", "planned-aggregate-expenditure"],
    relatedConcepts: [
      "adverse-demand-shock",
      "demand-stabilisation",
      "financial-crisis",
      "supply-shock",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 27, "Economic shocks and business cycle."),
      T(227, "AD shock and short-run effects."),
    ],
  }),
  c({
    id: "adverse-demand-shock",
    name: "Negative demand shock",
    aliases: ["adverse AD shock", "negative AD shock", "unfavourable demand shock"],
    searchTerms: ["fall in aggregate demand", "demand slump"],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "shock"],
    summary:
      "A negative demand shock shifts AD left, tending to lower short-run output and inflation.",
    intuition:
      "Households, firms, government, or foreigners plan less spending, so firms sell less at the previous conditions and reduce production.",
    explanation: [
      "The output effect and inflation effect depend on short-run supply and the policy response. Self-correction can return output toward potential, while stabilisation policy can speed or alter the adjustment.",
      "The shock is a change in the demand schedule, not a movement along it.",
    ],
    whyItMatters:
      "It is the standard contractionary AD-AS scenario behind financial-crisis and policy questions.",
    prerequisites: ["demand-shock", "ad-shift", "short-run-aggregate-supply"],
    relatedConcepts: [
      "financial-crisis",
      "demand-stabilisation",
      "self-correction",
      "output-gap",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 35, "Unfavourable AD shock and policy."),
      T(229, "Temporary demand shock response."),
    ],
  }),
  c({
    id: "supply-shock",
    name: "Supply shock",
    aliases: ["aggregate-supply shock", "inflation shock"],
    searchTerms: [
      "unexpected change in production costs or capacity",
      "supply disturbance",
    ],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "shock"],
    summary:
      "A supply shock changes production costs, productivity, expectations, or capacity and shifts the aggregate-supply relationship.",
    intuition:
      "The amount firms can profitably produce at existing prices changes even if planned spending has not changed.",
    explanation: [
      "A favourable supply shock can lower inflation pressure and raise output; an adverse shock can raise inflation while lowering output, creating a policy trade-off.",
      "The persistence of the effect depends on whether the shock is temporary, permanent, and incorporated into expectations.",
    ],
    whyItMatters:
      "It distinguishes the stagflation-like supply scenario from a demand shock that moves output and inflation together.",
    prerequisites: [
      "aggregate-supply",
      "short-run-aggregate-supply",
      "inflation-dynamics",
    ],
    relatedConcepts: [
      "adverse-supply-shock",
      "favourable-supply-shock",
      "potential-output-shock",
      "demand-shock",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 18, "Shocks to inflation and AS."),
      T(224, "Supply shock and AS shift."),
    ],
  }),
  c({
    id: "adverse-supply-shock",
    name: "Adverse supply shock",
    aliases: ["unfavourable supply shock", "negative supply shock", "adverse AS shock"],
    searchTerms: ["oil-price or cost shock", "higher inflation and lower output"],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "shock", "high-yield"],
    summary:
      "An adverse supply shock raises inflation pressure or reduces productive capacity, tending to lower output and raise inflation in the short run.",
    intuition:
      "Firms face worse production conditions: selling prices need to rise or output must fall, so policymakers cannot improve both inflation and output with one simple demand move.",
    explanation: [
      "The course treats a temporary inflation shock as shifting short-run AS. Accommodating it can support output at the cost of more persistent inflation; resisting it can reduce inflation but deepen the output gap in the short run.",
      "A permanent fall in potential output is a different shock because the benchmark Y* also changes.",
    ],
    whyItMatters:
      "It is the core AD-AS policy trade-off and a common shock-classification question.",
    prerequisites: ["supply-shock", "short-run-aggregate-supply", "output-gap"],
    relatedConcepts: [
      "favourable-supply-shock",
      "accommodating-inflation",
      "potential-output-shock",
      "demand-stabilisation",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 39, "Unfavourable AS shock and policy response."),
      T(225, "Unfavourable inflation shock."),
    ],
  }),
  c({
    id: "favourable-supply-shock",
    name: "Favourable supply shock",
    aliases: ["positive supply shock", "favourable AS shock"],
    searchTerms: [
      "productivity improvement lowers inflation",
      "better production conditions",
    ],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "shock"],
    summary:
      "A favourable supply shock improves production conditions or capacity, tending to raise output and reduce inflation pressure in the short run.",
    intuition:
      "Firms can produce more at the same prices or face lower costs, so the economy can move toward higher output without the same inflation pressure.",
    explanation: [
      "The effect depends on whether the shock is temporary or permanent and how expectations adjust. A technology improvement can also raise potential output.",
      "It is not an AD expansion: the source is the supply side, even though both output and inflation may move.",
    ],
    whyItMatters:
      "It trains the learner to identify the side of the model that moved rather than infer it from the direction of output alone.",
    prerequisites: ["supply-shock", "short-run-aggregate-supply", "productivity"],
    relatedConcepts: [
      "adverse-supply-shock",
      "potential-output-shock",
      "aggregate-demand",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 32, "Favourable AS shock."),
      T(224, "Favourable inflation shock."),
    ],
  }),
  c({
    id: "potential-output-shock",
    name: "Potential-output shock",
    aliases: ["shock to potential output", "fall in potential output"],
    searchTerms: ["change in sustainable capacity", "potential GDP shock"],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "output"],
    summary:
      "A potential-output shock changes the economy’s sustainable production benchmark.",
    intuition:
      "The ruler used to judge the output gap moves: a damaged capital stock or productivity change can lower potential even before actual output changes.",
    explanation: [
      "A fall in potential output can create an expansionary-looking gap at the old benchmark while also raising inflation pressure through tighter capacity. A rise in potential output can do the opposite.",
      "Do not treat a change in actual GDP alone as a potential-output shock; identify the productive-capacity cause.",
    ],
    whyItMatters:
      "It is the AD-AS distinction between a moving outcome and a moving long-run benchmark.",
    prerequisites: ["potential-output", "supply-shock", "aggregate-supply"],
    relatedConcepts: [
      "favourable-supply-shock",
      "adverse-supply-shock",
      "output-gap",
      "productivity",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 44, "Shocks to potential output."),
      T(237, "Fall in potential output."),
    ],
  }),
  c({
    id: "long-run-equilibrium",
    name: "Long-run equilibrium",
    aliases: ["long run equilibrium", "long-run output equilibrium"],
    searchTerms: ["output returns to potential", "AD-AS long-run point"],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "output"],
    summary:
      "Long-run equilibrium is the AD-AS state in which output equals potential output after expectations and prices have adjusted.",
    intuition:
      "A temporary demand push can move actual output away from potential, but price and expectation adjustment changes the short-run conditions until the gap closes in the model.",
    explanation: [
      "Long-run equilibrium does not mean inflation is zero. It means output is at potential; inflation can be at a target or another stable rate depending on the model.",
      "A permanent change in productivity or capital can move potential output, so the new long-run point need not have the old output level.",
    ],
    whyItMatters:
      "It separates temporary output gaps from long-run growth and capacity changes.",
    prerequisites: [
      "aggregate-demand",
      "aggregate-supply",
      "potential-output",
      "short-run-equilibrium",
    ],
    relatedConcepts: [
      "self-correction",
      "output-gap",
      "inflation-dynamics",
      "potential-output-shock",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 26, "Long-run equilibrium."),
      T(226, "Long-run equilibrium in AD-AS."),
    ],
  }),
  c({
    id: "self-correction",
    name: "Self-correction",
    aliases: ["self-correcting economy", "market self-correction"],
    searchTerms: [
      "economy returns toward potential without policy",
      "natural adjustment",
    ],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "policy"],
    summary:
      "Self-correction is the modelled movement of output and inflation toward long-run equilibrium without discretionary stabilisation.",
    intuition:
      "An output gap changes inflation pressure and expectations, which shifts short-run supply until output moves back toward potential.",
    explanation: [
      "The speed and direction depend on the AS relationship and expectations. Self-correction can be slow and can involve costs, so the possibility does not make policy irrelevant.",
      "A shock to potential output changes the benchmark and can leave the economy with a different long-run level.",
    ],
    whyItMatters:
      "It is the counterfactual against which discretionary demand stabilisation is compared.",
    prerequisites: ["long-run-equilibrium", "inflation-dynamics", "output-gap"],
    relatedConcepts: [
      "demand-stabilisation",
      "adverse-demand-shock",
      "short-run-aggregate-supply",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 33, "Whether the economy is self-correcting."),
      T(228, "Long-run adjustment after AD shock."),
    ],
  }),
  c({
    id: "demand-stabilisation",
    name: "Demand stabilisation",
    aliases: ["stabilisation policy", "output-gap stabilisation"],
    searchTerms: ["monetary or fiscal response to demand shock", "close an output gap"],
    chapters: [5, 8],
    tags: ["chapter-5", "chapter-8", "policy", "high-yield"],
    summary:
      "Demand stabilisation uses fiscal or monetary policy to reduce an output gap caused by a demand shock.",
    intuition:
      "Policy adds demand after a contraction or withdraws demand after an overheating shock, aiming to keep output near potential.",
    explanation: [
      "The intervention shifts AD in the opposite direction to the shock. Timing, multipliers, expectations, debt, and inflation objectives determine whether it helps or overshoots.",
      "Stabilising demand is different from correcting a supply shock, where policy faces a trade-off between output and inflation.",
    ],
    whyItMatters:
      "It integrates fiscal policy, monetary transmission, AD shifts, and output gaps.",
    prerequisites: [
      "demand-shock",
      "fiscal-policy",
      "monetary-transmission",
      "output-gap",
    ],
    relatedConcepts: [
      "self-correction",
      "ad-shift",
      "adverse-supply-shock",
      "fiscal-policy-lags",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 34, "Policy response to AD shocks."),
      T(230, "Policy response to an unfavourable AD shock."),
    ],
  }),
  c({
    id: "accommodating-inflation",
    name: "Accommodating an inflation shock",
    aliases: ["accommodation of inflation shock", "accommodating policy"],
    searchTerms: [
      "policy accepts higher inflation to support output",
      "accommodate supply shock",
    ],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "policy"],
    summary:
      "Accommodating an adverse supply shock means using demand policy to support output even though inflation remains higher for a time.",
    intuition:
      "Policy shifts AD right to offset lost output, but that supports the price pressure created by the supply shock rather than removing its cause.",
    explanation: [
      "The alternative is to resist inflation with contractionary demand policy, accepting a larger short-run output cost. The course presents this as a trade-off rather than a free choice.",
      "Accommodation can affect expectations and make inflation more persistent if credibility is weakened.",
    ],
    whyItMatters: "It makes the supply-shock policy dilemma explicit.",
    prerequisites: [
      "adverse-supply-shock",
      "demand-stabilisation",
      "inflation-dynamics",
    ],
    relatedConcepts: [
      "inflation-target",
      "short-run-aggregate-supply",
      "monetary-policy",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 37, "Policy responses to supply shocks."),
      T(231, "Accommodation of an inflation shock."),
    ],
  }),
  c({
    id: "financial-crisis",
    name: "Financial crisis and AD",
    aliases: ["financial crisis", "GFC demand shock", "global financial crisis"],
    searchTerms: [
      "credit crisis lowers aggregate demand",
      "financial shock and output",
    ],
    chapters: [8],
    tags: ["chapter-8", "AD-AS", "finance", "shock"],
    summary:
      "A financial crisis can lower aggregate demand by damaging wealth, credit, confidence, and interest-sensitive spending.",
    intuition:
      "When lenders and borrowers fear losses, asset values fall and credit becomes harder to obtain, so households and firms cut spending.",
    explanation: [
      "The course uses the global financial crisis as an example of a large leftward AD shift followed by policy responses and slow adjustment.",
      "The precise chain depends on whether the shock is represented through investment, consumption, credit spreads, wealth, or a policy rule.",
    ],
    whyItMatters:
      "It is a concrete application of financial assets, bank stability, AD shifts, and stabilisation policy.",
    prerequisites: [
      "adverse-demand-shock",
      "financial-asset",
      "credit",
      "aggregate-demand",
    ],
    relatedConcepts: [
      "bank-run",
      "demand-stabilisation",
      "monetary-transmission",
      "output-gap",
    ],
    sourceRefs: [
      L("lecture-w7-l2", 27, "Economic shocks and the business cycle."),
      T(234, "Real GDP and the GFC."),
    ],
  }),
  c({
    id: "credit",
    name: "Credit",
    aliases: ["credit conditions", "access to credit"],
    searchTerms: ["ability to borrow", "loan availability"],
    chapters: [6, 8],
    tags: ["foundation", "finance", "AD-AS"],
    summary:
      "Credit is the ability to obtain funds now in exchange for repayment later, under terms set by lenders and borrowers.",
    intuition:
      "The interest rate is only one part of borrowing conditions; a bank may refuse a loan, require collateral, or charge a risk spread.",
    explanation: [
      "Credit conditions affect consumption and investment, especially for borrowers who cannot fund spending from current income.",
      "A financial crisis can tighten credit even if the central-bank policy rate changes little, shifting aggregate demand through another channel.",
    ],
    whyItMatters:
      "It supplies a small foundation for financial-crisis questions without treating borrowing as a synonym for a cash rate.",
    prerequisites: ["borrowing", "lending", "bank"],
    relatedConcepts: [
      "financial-asset",
      "bank-lending",
      "financial-crisis",
      "monetary-transmission",
    ],
    sourceRefs: [
      T(164, "Financial markets and asset returns."),
      L("lecture-w5-l1", 75, "Bank liquidity and lending conditions."),
    ],
  }),
  c({
    id: "balance-of-payments",
    name: "Balance of payments",
    aliases: ["BOP", "balance of payments"],
    searchTerms: [
      "record of international transactions",
      "country transactions with rest of world",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "accounting", "high-yield"],
    summary:
      "The balance of payments records a country’s transactions with the rest of the world over a period.",
    intuition:
      "It is an accounting record of flows: trade in goods and services, income and transfers, and financial claims crossing borders.",
    explanation: [
      "The course separates the current account from the financial account. A transaction can have a goods/service side and a financing or asset side.",
      "The accounts must satisfy the balance-of-payments identity under the recording convention, even when one component is in deficit.",
    ],
    whyItMatters:
      "It is the accounting foundation for current-account, capital-flow, exchange-rate, and open-economy saving questions.",
    prerequisites: ["flow", "income", "expenditure", "financial-asset"],
    relatedConcepts: [
      "current-account",
      "financial-account",
      "bop-identity",
      "trade-balance",
      "small-open-economy",
    ],
    sourceRefs: [
      L("lecture-w8-l1", 8, "Australian current-account components."),
      T(243, "International macroeconomics and exchange rates."),
    ],
  }),
  c({
    id: "trade-balance",
    name: "Trade balance",
    aliases: ["balance on goods and services", "trade surplus", "trade deficit"],
    searchTerms: ["exports minus imports", "goods and services balance"],
    chapters: [9],
    tags: ["chapter-9", "international", "calculation"],
    summary:
      "The trade balance is exports of goods and services minus imports of goods and services.",
    intuition:
      "It compares sales of current domestic production to foreigners with purchases of current foreign production.",
    explanation: [
      "A trade surplus means exports exceed imports; a trade deficit means imports exceed exports. The current account can also include primary and secondary income, so it is not always identical to the trade balance.",
      "Trade balance is a flow and is not the stock of foreign assets or liabilities.",
    ],
    whyItMatters:
      "It is a near-neighbour of net exports and current account that appears in BOP classification questions.",
    prerequisites: ["exports", "imports", "flow"],
    relatedConcepts: ["net-exports", "current-account", "balance-of-payments"],
    sourceRefs: [
      L("lecture-w8-l1", 8, "Exports and current-account components."),
      T(245, "Australian current account."),
    ],
    equations: [
      {
        label: "Trade balance",
        expression: "exports − imports",
        variables: [
          { symbol: "exports", meaning: "goods and services sold abroad" },
          { symbol: "imports", meaning: "goods and services bought from abroad" },
        ],
        interpretation:
          "Do not add income flows unless the question asks for the current account.",
      },
    ],
  }),
  c({
    id: "current-account",
    name: "Current account",
    aliases: ["current account", "current-account balance", "CA"],
    searchTerms: [
      "trade plus income and transfers",
      "current international transactions",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "accounting", "high-yield"],
    summary:
      "The current account records trade in goods and services plus primary-income and secondary-income flows with the rest of the world.",
    intuition:
      "It records current deliveries and income transfers, while the financial account records the claims and liabilities used to finance them.",
    explanation: [
      "The trade balance is a major component. Interest, dividends, wages across borders, and transfers can make the current account differ from trade alone.",
      "A current-account deficit means the country is a net borrower from the rest of the world in the broader accounting sense, subject to the course’s sign convention.",
    ],
    whyItMatters:
      "It links saving-investment gaps to international borrowing and BOP identities.",
    prerequisites: ["trade-balance", "balance-of-payments"],
    relatedConcepts: [
      "financial-account",
      "bop-identity",
      "national-saving",
      "small-open-economy",
    ],
    sourceRefs: [
      L("lecture-w8-l1", 8, "Current-account components."),
      T(245, "Australian current account and components."),
    ],
  }),
  c({
    id: "primary-income",
    name: "Primary income",
    aliases: [
      "primary income account",
      "investment income",
      "factor income from abroad",
    ],
    searchTerms: [
      "interest dividends wages across borders",
      "income from foreign assets",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "accounting"],
    summary:
      "Primary income records income earned from providing labour or owning financial and other productive assets across borders.",
    intuition:
      "A country can export a good today, but it can also receive interest or dividends because residents own claims on foreign production.",
    explanation: [
      "Primary income is part of the current account, not the financial account itself. The underlying asset purchase or sale is recorded in the financial account; the return is current income.",
      "This is one reason GDP and resident income measures can differ.",
    ],
    whyItMatters:
      "It prevents international-income flows from being misclassified as trade in goods or financial-account transactions.",
    prerequisites: ["income", "financial-asset"],
    relatedConcepts: ["secondary-income", "financial-account", "gdp-vs-gni"],
    sourceRefs: [
      L("lecture-w8-l1", 8, "Current-account components."),
      T(246, "BOP account classification."),
    ],
  }),
  c({
    id: "secondary-income",
    name: "Secondary income",
    aliases: ["secondary income account", "transfers from abroad", "current transfers"],
    searchTerms: [
      "one-way international transfers",
      "gifts and remittances across borders",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "accounting"],
    summary:
      "Secondary income records one-way current transfers where no corresponding good, service, or asset claim is exchanged.",
    intuition:
      "A transfer changes the recipient’s current resources but is not payment for a newly produced export or a financial asset purchase.",
    explanation: [
      "Government aid, remittances, and similar transfers can enter this account under the course classification. The exact item depends on the statistical convention.",
      "Do not confuse a transfer with primary income, which is payment for labour or asset ownership.",
    ],
    whyItMatters:
      "It completes the current-account classification and helps distinguish income from financial transactions.",
    prerequisites: ["income", "flow"],
    relatedConcepts: ["primary-income", "financial-account", "balance-of-payments"],
    sourceRefs: [
      T(246, "BOP account terminology."),
      L("lecture-w8-l1", 8, "Current-account components."),
    ],
  }),
  c({
    id: "financial-account",
    name: "Financial account",
    aliases: ["financial account", "capital and financial account", "financial flows"],
    searchTerms: [
      "cross-border asset purchases",
      "international borrowing and lending",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "finance", "high-yield"],
    summary:
      "The financial account records cross-border purchases and sales of financial assets and liabilities.",
    intuition:
      "When a country buys more from abroad than it sells, the financing counterpart may be a foreign loan or sale of a domestic asset.",
    explanation: [
      "The account includes transactions in debt, equity, direct investment, and other claims. The asset transaction is a flow; the resulting foreign asset or liability position is a stock.",
      "The financial account is not the same as primary income: receiving interest is current income, while buying the asset that generates it is a financial transaction.",
    ],
    whyItMatters:
      "It connects BOP accounting to saving-investment gaps and international capital flows.",
    prerequisites: ["financial-asset", "balance-of-payments", "flow"],
    relatedConcepts: [
      "current-account",
      "bop-identity",
      "small-open-economy",
      "exchange-rate",
    ],
    sourceRefs: [
      L("lecture-w8-l1", 12, "Capital and financial account."),
      T(247, "Financial account transactions."),
    ],
  }),
  c({
    id: "bop-identity",
    name: "Balance-of-payments identity",
    aliases: ["BOP identity", "current plus financial account"],
    searchTerms: [
      "current account financed by financial account",
      "accounts sum to zero",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "accounting", "calculation"],
    summary:
      "The balance-of-payments identity links the current account and financial-account entries under the recording convention.",
    intuition:
      "A country’s current transactions and the asset transactions used to settle them are two sides of a complete international ledger.",
    explanation: [
      "The sign of the financial-account balance depends on whether the course records net capital inflows or net acquisition of foreign assets. Read the convention rather than importing a memorised sign.",
      "An accounting identity is not a behavioural explanation of why the current account changed; saving, investment, exchange rates, and income determine the underlying behaviour.",
    ],
    whyItMatters:
      "It is a sign-discipline calculation and a safeguard against treating a current-account deficit as an unexplained disappearance of money.",
    prerequisites: [
      "current-account",
      "financial-account",
      "balance-of-payments",
      "algebraic-substitution",
    ],
    relatedConcepts: ["national-saving", "small-open-economy", "trade-balance"],
    sourceRefs: [
      T(247, "Balance-of-payments aggregates."),
      L("lecture-w8-l1", 16, "Balance on financial account."),
    ],
    equations: [
      {
        label: "Simplified BOP identity",
        expression: "current account + financial-account balance = 0",
        variables: [
          {
            symbol: "current account",
            meaning: "current goods, services, income, and transfer balance",
          },
          {
            symbol: "financial-account balance",
            meaning: "matching financial-flow entry under the convention",
          },
        ],
        interpretation:
          "Sign conventions vary; use the definitions supplied in the question or course table.",
      },
    ],
  }),
  c({
    id: "small-open-economy",
    name: "Small open economy",
    aliases: ["SOE", "small open economy"],
    searchTerms: [
      "economy that can borrow and lend internationally",
      "world interest rate taker",
    ],
    chapters: [3, 9],
    tags: ["chapter-3", "chapter-9", "international", "high-yield"],
    summary:
      "A small open economy can trade goods and financial claims with the rest of the world and takes the world real interest rate as given.",
    intuition:
      "Domestic saving need not equal domestic investment because residents can borrow from or lend to foreigners at the world rate.",
    explanation: [
      "If domestic investment exceeds national saving, the economy borrows from abroad and can run a current-account deficit. If saving exceeds investment, it lends abroad and can run a surplus.",
      "‘Small’ refers to limited influence on the world interest rate in the model, not necessarily a small land area or population.",
    ],
    whyItMatters:
      "It is the course’s key contrast with closed-economy crowding out and the route to current-account analysis.",
    prerequisites: [
      "saving-investment-equilibrium",
      "national-saving",
      "financial-account",
      "real-interest-rate",
    ],
    relatedConcepts: [
      "open-economy-saving-identity",
      "current-account",
      "exchange-rate",
      "crowding-out",
    ],
    sourceRefs: [
      L("lecture-w8-l1", 32, "Small open economy and world real rate."),
      T(249, "National saving and investment in an open economy."),
    ],
  }),
  c({
    id: "open-economy-saving-identity",
    name: "Open-economy saving identity",
    aliases: ["S − I = NX", "saving investment net exports", "open economy identity"],
    searchTerms: [
      "national saving minus investment equals current account",
      "saving gap and trade balance",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "calculation", "high-yield"],
    summary:
      "In the course’s open-economy accounting, national saving minus investment equals net exports and is closely linked to the current account.",
    intuition:
      "If a country saves more than it invests domestically, it has resources to lend abroad and tends to sell more current output abroad than it buys.",
    explanation: [
      "The identity rearranges the GDP expenditure and income relationships. It does not say that saving physically travels directly into a particular export; it describes the accounting counterpart.",
      "An investment boom can reduce net exports and the current account when national saving is unchanged.",
    ],
    whyItMatters:
      "It is the cleanest bridge from domestic saving-investment choices to international deficits and surpluses.",
    prerequisites: [
      "national-saving",
      "macro-investment",
      "net-exports",
      "small-open-economy",
    ],
    relatedConcepts: [
      "current-account",
      "financial-account",
      "macro-investment",
      "trade-balance",
    ],
    sourceRefs: [
      L("lecture-w8-l1", 50, "Saving, investment, and net exports."),
      T(250, "Small open-economy identity."),
    ],
    equations: [
      {
        label: "Open-economy saving identity",
        expression: "NS − I = NX",
        variables: [
          { symbol: "NS", meaning: "national saving" },
          { symbol: "I", meaning: "domestic investment" },
          { symbol: "NX", meaning: "net exports" },
        ],
        interpretation:
          "With the course’s convention, a saving shortfall relative to investment corresponds to negative net exports.",
      },
    ],
  }),
  c({
    id: "exchange-rate",
    name: "Exchange rate",
    aliases: ["exchange rates", "FX rate", "foreign exchange rate"],
    searchTerms: ["price of one currency in another", "currency conversion rate"],
    chapters: [9],
    tags: ["chapter-9", "international", "high-yield"],
    summary:
      "An exchange rate is the price of one currency expressed in units of another currency.",
    intuition:
      "It tells an Australian resident how many foreign dollars are needed for one AUD, or how many AUD buy one foreign dollar, depending on the quotation.",
    explanation: [
      "The quotation convention is part of the definition. A currency can appreciate in one quotation and the numerical exchange rate can move in the opposite direction in its inverse quotation.",
      "Nominal exchange rates compare currencies; real exchange rates also compare price levels and therefore relate to international competitiveness.",
    ],
    whyItMatters:
      "It is the foundation for AUD conversion, appreciation/depreciation, PPP, and open-economy monetary transmission.",
    prerequisites: ["price", "ratio", "market", "buyer", "seller"],
    relatedConcepts: [
      "nominal-exchange-rate",
      "real-exchange-rate",
      "currency-conversion",
      "appreciation",
      "currency-depreciation",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 2, "Nominal exchange-rate definition."),
      T(243, "International macroeconomics and exchange rates."),
    ],
  }),
  c({
    id: "nominal-exchange-rate",
    name: "Nominal exchange rate",
    aliases: ["nominal FX rate", "bilateral exchange rate", "e"],
    searchTerms: [
      "currency price before inflation adjustment",
      "foreign currency per AUD",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "calculation"],
    summary:
      "A nominal exchange rate is the market conversion rate between two currencies, without adjusting for price levels.",
    intuition:
      "It is the sticker price for currencies; it does not by itself say whether Australian goods became cheaper or more expensive relative to foreign goods.",
    explanation: [
      "Write the units beside the number. ‘USD per AUD’ and ‘AUD per USD’ are reciprocals, not interchangeable labels.",
      "Nominal appreciation or depreciation is about the currency’s value in the stated quotation; real appreciation also includes domestic and foreign inflation.",
    ],
    whyItMatters:
      "Most exchange-rate errors are unit and quotation errors before they are economics errors.",
    prerequisites: ["exchange-rate", "nominal", "ratio"],
    relatedConcepts: [
      "aud-quotation",
      "currency-conversion",
      "cross-rate",
      "real-exchange-rate",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 10, "Quoting bilateral exchange rates."),
      T(253, "Nominal bilateral exchange rates."),
    ],
  }),
  c({
    id: "aud-quotation",
    name: "AUD exchange-rate quotation",
    aliases: ["AUD per USD", "USD per AUD", "foreign currency per AUD"],
    searchTerms: ["Australian dollar quotation", "AUD quotation convention"],
    chapters: [9],
    tags: ["chapter-9", "international", "Australia", "calculation"],
    summary:
      "An AUD quotation states whether the exchange rate is foreign currency per AUD or AUD per unit of foreign currency.",
    intuition:
      "The same currency pair has two reciprocal numbers; the words after ‘per’ tell you which number rises when the AUD appreciates.",
    explanation: [
      "If the rate is USD per AUD, a higher number means one AUD buys more USD and therefore represents an AUD appreciation. If the rate is AUD per USD, an AUD appreciation means the number falls.",
      "Always convert quantities with units before applying an appreciation or depreciation label.",
    ],
    whyItMatters:
      "It directly addresses the course’s AUD-focused exchange-rate sign traps.",
    prerequisites: ["nominal-exchange-rate", "currency-conversion", "ratio"],
    relatedConcepts: [
      "appreciation",
      "currency-depreciation",
      "cross-rate",
      "real-exchange-rate",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 10, "Bilateral exchange-rate quotation."),
      T(253, "Australian exchange-rate table."),
    ],
  }),
  c({
    id: "currency-conversion",
    name: "Currency conversion",
    aliases: ["convert currencies", "currency conversion"],
    searchTerms: ["multiply or divide by exchange rate", "convert AUD and USD"],
    chapters: [9],
    tags: ["chapter-9", "international", "calculation"],
    summary:
      "Currency conversion changes a money amount into another currency using a clearly stated exchange-rate quotation.",
    intuition:
      "The correct operation is the one that makes the original currency unit cancel and leaves the target currency unit.",
    explanation: [
      "Write the exchange rate as a fraction with units. Multiplication and division are not matters of memorisation once the units are visible.",
      "Round only after the conversion and keep track of whether the rate is direct or reciprocal.",
    ],
    whyItMatters:
      "It is a small algebra foundation for exchange-rate and cross-rate questions.",
    prerequisites: ["nominal-exchange-rate", "ratio", "algebraic-substitution"],
    relatedConcepts: [
      "cross-rate",
      "aud-quotation",
      "appreciation",
      "currency-depreciation",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 2, "Nominal exchange rates and conversion."),
      T(253, "Bilateral exchange-rate table."),
    ],
  }),
  c({
    id: "cross-rate",
    name: "Cross rate",
    aliases: ["cross exchange rate", "cross-rate calculation"],
    searchTerms: [
      "derive a currency pair from two other rates",
      "indirect exchange-rate calculation",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "calculation"],
    summary:
      "A cross rate is an exchange rate between two currencies derived through a third currency.",
    intuition:
      "If you know how many USD buy one AUD and how many EUR buy one USD, multiply the conversion chains so USD cancels.",
    explanation: [
      "Treat rates as unit fractions and check that the intermediate currency cancels. The result should have only the desired numerator and denominator units.",
      "A cross rate can be checked by converting one unit through the third currency in both directions.",
    ],
    whyItMatters:
      "It is the algebraic version of quotation discipline and a common exam calculation.",
    prerequisites: ["currency-conversion", "nominal-exchange-rate", "ratio"],
    relatedConcepts: ["aud-quotation", "law-one-price", "purchasing-power-parity"],
    sourceRefs: [
      L("lecture-w8-l2", 3, "Cross-rate examples."),
      T(253, "Nominal exchange-rate table."),
    ],
  }),
  c({
    id: "real-exchange-rate",
    name: "Real exchange rate",
    aliases: ["real FX rate", "real exchange rate"],
    searchTerms: [
      "relative price of domestic and foreign goods",
      "competitiveness-adjusted exchange rate",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "calculation"],
    summary:
      "The real exchange rate compares the price of domestic goods with foreign goods after converting them into a common currency.",
    intuition:
      "The nominal currency price can stay unchanged while domestic inflation makes local goods more expensive relative to foreign goods.",
    explanation: [
      "The exact expression depends on the quotation convention, but it combines the nominal exchange rate with domestic and foreign price levels.",
      "A real appreciation generally makes domestic goods less competitive relative to foreign goods, tending to reduce net exports in the course’s mechanism, other things equal.",
    ],
    whyItMatters:
      "It connects exchange-rate movements to trade and aggregate demand rather than stopping at currency conversion.",
    prerequisites: [
      "nominal-exchange-rate",
      "price-level",
      "currency-conversion",
      "real",
    ],
    relatedConcepts: [
      "real-appreciation",
      "appreciation",
      "purchasing-power-parity",
      "net-exports",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 15, "Real exchange-rate definition."),
      L("lecture-w8-l2", 19, "Real appreciation and competitiveness."),
      T(254, "Real exchange rate."),
    ],
  }),
  c({
    id: "appreciation",
    name: "Currency appreciation",
    aliases: ["appreciation", "AUD appreciation", "currency strengthens"],
    searchTerms: ["currency gets stronger", "AUD buys more foreign currency"],
    chapters: [9],
    tags: ["chapter-9", "international", "high-yield"],
    summary:
      "A currency appreciates when its value rises relative to another currency under the stated quotation.",
    intuition:
      "The same amount of AUD buys more foreign currency, or the same foreign purchase costs fewer AUD, depending on how the rate is written.",
    explanation: [
      "In a USD-per-AUD quotation, appreciation is a rise in the number. In an AUD-per-USD quotation, appreciation is a fall in the number. The economic label must follow the units.",
      "A real appreciation also reflects relative price-level movements and can reduce export competitiveness, conditional on trade responses.",
    ],
    whyItMatters: "It is the course’s central exchange-rate sign and quotation trap.",
    prerequisites: ["aud-quotation", "nominal-exchange-rate", "real-exchange-rate"],
    relatedConcepts: [
      "currency-depreciation",
      "real-appreciation",
      "foreign-exchange-market",
      "net-exports",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 46, "Equilibrium in the foreign-exchange market."),
      L("lecture-w8-l2", 78, "Real appreciation and net exports."),
      T(260, "Supply and demand for AUD."),
    ],
    misconceptions: [
      "A higher numerical exchange rate does not tell you appreciation until the quotation’s numerator and denominator are known.",
    ],
  }),
  c({
    id: "currency-depreciation",
    name: "Currency depreciation",
    aliases: ["depreciation", "AUD depreciation", "currency weakens"],
    searchTerms: [
      "currency gets weaker",
      "AUD buys less foreign currency",
      "decline in currency value",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "high-yield"],
    summary:
      "A currency depreciates when its value falls relative to another currency under the stated quotation.",
    intuition:
      "The same amount of AUD buys less foreign currency, or the same foreign purchase costs more AUD, depending on how the rate is written.",
    explanation: [
      "In a USD-per-AUD quotation, depreciation is a fall in the number. In an AUD-per-USD quotation, depreciation is a rise in the number. The economic label must follow the units.",
      "A currency can depreciate because demand for it falls, supply of it rises, or expectations and relative inflation change; the particular cause depends on the model being used.",
      "The course’s foreign-exchange diagram connects an increase in AUD supply with a depreciation of the AUD, while PPP provides a longer-run inflation-based benchmark.",
    ],
    whyItMatters:
      "It is the opposite side of appreciation and a key link from exchange-rate movements to competitiveness, net exports, and monetary transmission.",
    prerequisites: ["aud-quotation", "nominal-exchange-rate", "real-exchange-rate"],
    relatedConcepts: [
      "appreciation",
      "real-appreciation",
      "foreign-exchange-market",
      "aud-supply",
      "net-exports",
      "relative-ppp",
    ],
    mechanism: [
      "demand for AUD falls or supply of AUD rises",
      "the foreign-exchange market clears at a lower AUD value",
      "the AUD depreciates under the stated quotation",
      "Australian goods may become more competitive for foreign buyers, other things equal",
      "net exports may rise with lags and depending on trade elasticities",
    ],
    examples: [
      {
        title: "Quotation example",
        text: "If the rate is USD per AUD, a move from 0.70 to 0.65 means one AUD buys fewer USD: the AUD depreciated.",
      },
      {
        title: "Inverse quotation",
        text: "The same move is an increase from about 1.43 to 1.54 AUD per USD, so the numerical direction reverses when the quotation is inverted.",
      },
    ],
    misconceptions: [
      "A higher numerical exchange rate does not tell you that the AUD appreciated or depreciated until the quotation’s units are known.",
      "Depreciation is not the same thing as physical capital depreciation; the former is a currency-value movement and the latter is loss of productive capital.",
    ],
    contrasts: [
      {
        conceptId: "appreciation",
        title: "versus currency appreciation",
        difference:
          "Depreciation is a fall in currency value; appreciation is a rise, with the numerical sign determined by the quotation.",
      },
      {
        conceptId: "depreciation",
        title: "versus capital depreciation",
        difference:
          "Currency depreciation concerns an exchange rate. Capital depreciation concerns productive assets wearing out or becoming obsolete.",
      },
    ],
    sourceRefs: [
      L("lecture-w8-l2", 12, "Definition and reciprocal quotation examples."),
      L("lecture-w8-l2", 49, "AUD supply shift and depreciation."),
      L("lecture-w8-l2", 29, "Relative PPP and depreciation example."),
      T(260, "Supply and demand for AUD."),
    ],
  }),
  c({
    id: "real-appreciation",
    name: "Real appreciation",
    aliases: ["real currency appreciation", "real AUD appreciation"],
    searchTerms: [
      "domestic goods become relatively expensive",
      "competitiveness falls",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "high-yield"],
    summary:
      "A real appreciation makes domestic goods more expensive relative to foreign goods after currency and price-level effects are combined.",
    intuition:
      "Foreign buyers find domestic output less competitive, while domestic buyers find foreign goods relatively cheaper, all else equal.",
    explanation: [
      "A real appreciation can arise from a nominal appreciation, higher domestic inflation, or lower foreign inflation depending on the convention.",
      "The course links it to lower net exports, but trade quantities may adjust with lags and elasticities.",
    ],
    whyItMatters: "It is the trade-relevant version of currency appreciation.",
    prerequisites: ["real-exchange-rate", "appreciation", "price-level"],
    relatedConcepts: [
      "currency-depreciation",
      "net-exports",
      "foreign-exchange-market",
      "purchasing-power-parity",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 19, "Real exchange rate and competitiveness."),
      T(256, "Real TWI and net exports."),
    ],
  }),
  c({
    id: "foreign-exchange-market",
    name: "Foreign-exchange market",
    aliases: ["FX market", "foreign exchange market", "currency market"],
    searchTerms: ["market for currencies", "AUD supply and demand"],
    chapters: [9],
    tags: ["chapter-9", "international", "graph"],
    summary:
      "The foreign-exchange market is where currencies are bought and sold and their relative price is determined.",
    intuition:
      "Demand for AUD comes from people needing AUD to buy Australian goods or assets; supply of AUD comes from Australians offering AUD to buy foreign goods or assets.",
    explanation: [
      "The axes and quotation determine how an appreciation appears on the graph. A shift in AUD demand or supply changes the equilibrium exchange rate and quantity.",
      "Interest rates, trade, expected returns, and policy can shift currency demand or supply.",
    ],
    whyItMatters:
      "It provides the market mechanism behind appreciation, depreciation, fixed-rate defence, and monetary transmission via the exchange rate.",
    prerequisites: ["exchange-rate", "demand", "supply", "market"],
    relatedConcepts: [
      "aud-demand",
      "aud-supply",
      "appreciation",
      "fixed-exchange-rate",
      "flexible-exchange-rate",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 46, "Equilibrium in foreign-exchange market."),
      T(260, "Supply and demand for the AUD."),
    ],
  }),
  c({
    id: "aud-demand",
    name: "Demand for AUD",
    aliases: ["AUD demand", "demand for Australian dollars"],
    searchTerms: ["foreigners wanting AUD", "demand curve for Australian dollar"],
    chapters: [9],
    tags: ["chapter-9", "international", "graph"],
    summary:
      "Demand for AUD comes from transactions that require buyers to acquire Australian dollars.",
    intuition:
      "Foreigners demand AUD to buy Australian exports, assets, or other claims denominated in AUD.",
    explanation: [
      "Higher Australian interest rates can attract demand for AUD-denominated assets, while stronger foreign demand for Australian goods can also shift the curve.",
      "Whether the exchange rate rises or falls depends on the AUD quotation and the direction of the demand shift.",
    ],
    whyItMatters:
      "It turns exchange-rate movements into a supply-demand mechanism rather than a label.",
    prerequisites: ["foreign-exchange-market", "buyer", "financial-asset", "exports"],
    relatedConcepts: [
      "aud-supply",
      "appreciation",
      "monetary-transmission",
      "fixed-exchange-rate",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 57, "Demand curve for AUD and shifts."),
      T(262, "Demand curve for the AUD."),
    ],
  }),
  c({
    id: "aud-supply",
    name: "Supply of AUD",
    aliases: ["AUD supply", "supply of Australian dollars"],
    searchTerms: [
      "Australians offering AUD for foreign currency",
      "supply curve for Australian dollar",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "graph"],
    summary:
      "Supply of AUD comes from Australians offering Australian dollars to buy foreign goods, services, or assets.",
    intuition:
      "An Australian importer supplies AUD in the currency market to obtain USD; an Australian investor buying a foreign asset does the same.",
    explanation: [
      "Import demand, foreign asset purchases, and expected returns can shift AUD supply. Read the quote before translating a supply shift into appreciation or depreciation.",
      "The supply curve is a currency-market schedule, not the domestic supply curve for Australian output.",
    ],
    whyItMatters: "It completes the AUD demand-supply diagram and its sign logic.",
    prerequisites: ["foreign-exchange-market", "seller", "imports", "financial-asset"],
    relatedConcepts: [
      "aud-demand",
      "appreciation",
      "currency-depreciation",
      "fixed-exchange-rate",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 47, "Supply curve for the AUD."),
      T(260, "Supply curve for the Australian dollar."),
    ],
  }),
  c({
    id: "flexible-exchange-rate",
    name: "Flexible exchange rate",
    aliases: ["floating exchange rate", "floating currency"],
    searchTerms: ["currency value set by market", "floating AUD"],
    chapters: [9],
    tags: ["chapter-9", "international", "policy"],
    summary:
      "Under a flexible exchange-rate regime, the currency’s value is allowed to move with market demand and supply.",
    intuition:
      "The exchange rate absorbs part of a shock rather than being held at a fixed announced number by official intervention.",
    explanation: [
      "Demand or supply shifts change the equilibrium exchange rate. The central bank may still influence it through interest rates, but it does not promise a fixed peg in the model.",
      "Flexible does not mean random or unmanaged in every institutional setting; it means the market rate is not fixed at a defended parity.",
    ],
    whyItMatters:
      "It is the regime contrast with fixed exchange rates and speculative attacks.",
    prerequisites: [
      "foreign-exchange-market",
      "exchange-rate",
      "appreciation",
      "currency-depreciation",
    ],
    relatedConcepts: [
      "fixed-exchange-rate",
      "monetary-transmission",
      "aud-demand",
      "aud-supply",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 87, "Fixed versus flexible exchange rates."),
      T(264, "Flexible exchange-rate regime."),
    ],
  }),
  c({
    id: "fixed-exchange-rate",
    name: "Fixed exchange rate",
    aliases: ["fixed exchange rates", "peg", "exchange-rate peg"],
    searchTerms: ["currency fixed at an announced value", "defend a currency parity"],
    chapters: [9],
    tags: ["chapter-9", "international", "policy", "high-yield"],
    summary:
      "A fixed exchange rate is a commitment to keep a currency at a specified value against another currency or basket.",
    intuition:
      "If private demand and supply would move the currency away from the peg, the central bank must buy or sell currency and use reserves or policy changes.",
    explanation: [
      "Defending an overvalued peg requires buying the domestic currency and selling foreign reserves, which drains domestic liquidity. Defending an undervalued peg requires the opposite intervention, subject to the model’s convention.",
      "A peg can become vulnerable when reserves are limited or markets expect a devaluation.",
    ],
    whyItMatters:
      "It is the institutional setup for fixed-rate intervention and speculative attacks.",
    prerequisites: [
      "foreign-exchange-market",
      "exchange-rate",
      "reserves",
      "central-bank",
    ],
    relatedConcepts: [
      "flexible-exchange-rate",
      "defending-peg",
      "speculative-attack",
      "overvalued-peg",
      "undervalued-peg",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 87, "Fixed exchange rates."),
      T(264, "Fixed exchange-rate regime."),
    ],
  }),
  c({
    id: "defending-peg",
    name: "Defending a fixed exchange rate",
    aliases: ["defend a peg", "FX intervention", "fixed-rate intervention"],
    searchTerms: [
      "central bank buys or sells currency to hold peg",
      "reserve intervention",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "policy", "high-yield"],
    summary:
      "Defending a peg means intervening in the foreign-exchange market so the market price remains at the announced fixed value.",
    intuition:
      "The central bank trades against the pressure that would otherwise move the currency away from the peg.",
    explanation: [
      "If the currency is overvalued at the peg, excess supply of the domestic currency appears; the authority buys domestic currency with foreign reserves. If undervalued, it sells domestic currency and buys foreign assets.",
      "The intervention direction must be inferred from the graph and quotation, not from the word ‘overvalued’ alone.",
    ],
    whyItMatters:
      "It is a sign-direction chain involving FX supply, reserves, and monetary conditions.",
    prerequisites: ["fixed-exchange-rate", "aud-demand", "aud-supply", "reserves"],
    relatedConcepts: [
      "overvalued-peg",
      "undervalued-peg",
      "speculative-attack",
      "cash-rate",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 96, "Overvalued currency and reserve intervention."),
      T(265, "Fixed exchange-rate intervention."),
    ],
  }),
  c({
    id: "overvalued-peg",
    name: "Overvalued peg",
    aliases: ["overvalued currency", "overvalued fixed exchange rate"],
    searchTerms: [
      "fixed currency price too high",
      "excess supply of domestic currency",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "policy"],
    summary:
      "An overvalued peg fixes the domestic currency above the market-clearing value it would have without intervention.",
    intuition:
      "At the official price, more domestic currency is offered than buyers want, so the authority must absorb the excess to keep the price high.",
    explanation: [
      "Defence requires buying domestic currency and selling foreign reserves in the usual diagram. Persistent pressure can deplete reserves and invite speculation against the peg.",
      "The label depends on the currency quotation and the market-clearing comparison.",
    ],
    whyItMatters: "It is the standard fixed-rate sign problem in the course.",
    prerequisites: ["fixed-exchange-rate", "defending-peg", "foreign-exchange-market"],
    relatedConcepts: ["undervalued-peg", "speculative-attack", "reserves"],
    sourceRefs: [
      L("lecture-w8-l2", 96, "Overvalued currency intervention."),
      T(267, "Speculative attack on a peg."),
    ],
  }),
  c({
    id: "undervalued-peg",
    name: "Undervalued peg",
    aliases: ["undervalued currency", "undervalued fixed exchange rate"],
    searchTerms: [
      "fixed currency price too low",
      "excess demand for domestic currency",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "policy"],
    summary:
      "An undervalued peg fixes the domestic currency below the market-clearing value it would have without intervention.",
    intuition:
      "At the official price, buyers want more domestic currency than sellers provide, so the authority must supply the currency to hold the price down.",
    explanation: [
      "Defence normally means selling domestic currency and acquiring foreign reserves. The reserve accumulation and monetary effects differ from an overvalued-peg defence.",
      "Again, write the quotation before deciding whether a numerical move is appreciation or depreciation.",
    ],
    whyItMatters: "It is the mirror image of the overvalued-peg intervention chain.",
    prerequisites: ["fixed-exchange-rate", "defending-peg", "foreign-exchange-market"],
    relatedConcepts: ["overvalued-peg", "reserves", "speculative-attack"],
    sourceRefs: [
      L("lecture-w8-l2", 118, "Undervalued currency case."),
      T(264, "Fixed exchange-rate intervention."),
    ],
  }),
  c({
    id: "speculative-attack",
    name: "Speculative attack",
    aliases: ["speculative attack on a peg", "currency attack"],
    searchTerms: [
      "investors sell currency expecting devaluation",
      "run on foreign reserves",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "policy", "high-yield"],
    summary:
      "A speculative attack is a coordinated or self-reinforcing attempt to sell a currency because traders expect a fixed peg to be abandoned or devalued.",
    intuition:
      "If everyone expects the central bank to run out of reserves, everyone tries to convert first, making the defence harder and potentially creating the predicted crisis.",
    explanation: [
      "The mechanism depends on the peg being inconsistent with market conditions, limited reserves, and expectations. A fixed rate is not automatically vulnerable.",
      "The central bank can raise interest rates, use reserves, impose other measures, devalue, or abandon the peg depending on the institutional model.",
    ],
    whyItMatters:
      "It combines fixed-rate defence, reserves, expectations, and monetary-policy conflict.",
    prerequisites: [
      "fixed-exchange-rate",
      "defending-peg",
      "overvalued-peg",
      "expectations",
    ],
    relatedConcepts: [
      "undervalued-peg",
      "reserves",
      "cash-rate",
      "monetary-transmission",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 100, "Fixed exchange rates subject to speculative attacks."),
      T(267, "Speculative attack figure."),
    ],
  }),
  c({
    id: "law-one-price",
    name: "Law of one price",
    aliases: ["LOOP", "law of one price"],
    searchTerms: [
      "same good same price after currency conversion",
      "arbitrage equalises prices",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "calculation"],
    summary:
      "The law of one price says an identical tradable good should have the same price in different markets after currency conversion when trade is frictionless.",
    intuition:
      "If the same iPad is cheaper in one country after conversion, traders could buy there and sell in the other country until the gap narrows.",
    explanation: [
      "The law relies on identical goods, low transport and transaction costs, no trade barriers, and arbitrage that can operate. Real economies violate these assumptions often.",
      "PPP extends the logic from one good to a basket or overall price levels.",
    ],
    whyItMatters:
      "It is the first-principles intuition for purchasing power parity and exchange-rate calculations.",
    prerequisites: ["exchange-rate", "price", "currency-conversion", "market"],
    relatedConcepts: [
      "purchasing-power-parity",
      "relative-ppp",
      "cross-rate",
      "real-exchange-rate",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 21, "Models of nominal exchange rate and LOOP."),
      T(257, "Law of one price and PPP."),
    ],
  }),
  c({
    id: "purchasing-power-parity",
    name: "Purchasing power parity (PPP)",
    aliases: ["PPP", "purchasing power parity"],
    searchTerms: [
      "exchange rate based on relative price levels",
      "basket prices equalised across countries",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "calculation"],
    summary:
      "Purchasing power parity is the idea that exchange rates adjust so comparable baskets have the same purchasing power across countries.",
    intuition:
      "The exchange rate is the conversion needed to make a domestic basket and a foreign basket cost the same in one currency.",
    explanation: [
      "Absolute PPP is a level comparison; relative PPP says exchange-rate changes are related to inflation differences over time. PPP is a benchmark, not a precise short-run forecast.",
      "Transport costs, non-traded services, taxes, quality differences, and market power can prevent the law of one price from holding.",
    ],
    whyItMatters:
      "It links exchange rates, CPI, inflation, and international price comparisons.",
    prerequisites: [
      "law-one-price",
      "price-index",
      "nominal-exchange-rate",
      "currency-conversion",
    ],
    relatedConcepts: [
      "relative-ppp",
      "ppp-limitations",
      "real-exchange-rate",
      "inflation",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 22, "Purchasing power parity model."),
      T(257, "PPP and law of one price."),
    ],
  }),
  c({
    id: "relative-ppp",
    name: "Relative purchasing power parity",
    aliases: ["relative PPP", "relative purchasing-power parity"],
    searchTerms: [
      "exchange-rate depreciation equals inflation difference",
      "PPP inflation relationship",
    ],
    chapters: [9],
    tags: ["chapter-9", "international", "calculation"],
    summary:
      "Relative PPP links the percentage change in an exchange rate to the difference between domestic and foreign inflation rates.",
    intuition:
      "If domestic prices rise faster, the currency must adjust over time under PPP to keep comparable goods from becoming permanently more expensive at home.",
    explanation: [
      "The sign depends on the exchange-rate quotation. State the units before interpreting which currency depreciates.",
      "Relative PPP is a long-run benchmark and can fail in the short run because goods are not identical and arbitrage is costly.",
    ],
    whyItMatters:
      "It is a common inflation/exchange-rate calculation and sign question.",
    prerequisites: [
      "purchasing-power-parity",
      "inflation",
      "nominal-exchange-rate",
      "percentage-change",
    ],
    relatedConcepts: [
      "ppp-limitations",
      "appreciation",
      "currency-depreciation",
      "real-exchange-rate",
    ],
    sourceRefs: [
      L("lecture-w8-l2", 27, "Implications of PPP and relative prices."),
      T(258, "PPP implications."),
    ],
    equations: [
      {
        label: "Relative PPP intuition",
        expression: "Δ% exchange rate ≈ domestic inflation − foreign inflation",
        variables: [
          { symbol: "Δ% exchange rate", meaning: "change under the chosen quotation" },
          { symbol: "domestic inflation", meaning: "home price-index growth" },
          { symbol: "foreign inflation", meaning: "foreign price-index growth" },
        ],
        interpretation:
          "The sign must be adapted to whether the quote is foreign currency per AUD or AUD per foreign currency.",
      },
    ],
  }),
  c({
    id: "ppp-limitations",
    name: "PPP limitations",
    aliases: ["limitations of PPP", "why PPP fails short run"],
    searchTerms: ["transport costs and non-traded goods", "PPP is not exact"],
    chapters: [9],
    tags: ["chapter-9", "international", "contrast"],
    summary:
      "PPP is limited by transport costs, trade barriers, non-traded goods, taxes, quality differences, and market power.",
    intuition:
      "Arbitrage cannot instantly make a haircut or a restaurant meal cost the same worldwide, and even traded goods can be costly to move.",
    explanation: [
      "PPP is more useful as a long-run benchmark than as a day-to-day explanation of the exchange rate. Short-run capital flows, interest rates, expectations, and risk can dominate.",
      "A deviation from PPP is not automatically an arbitrage profit once real-world costs are included.",
    ],
    whyItMatters:
      "It qualifies a clean law-of-one-price story and prevents overconfident exchange-rate forecasts.",
    prerequisites: ["purchasing-power-parity", "law-one-price", "real-exchange-rate"],
    relatedConcepts: ["relative-ppp", "foreign-exchange-market", "appreciation"],
    sourceRefs: [
      L("lecture-w8-l2", 29, "PPP implications and limitations."),
      T(258, "PPP limitations."),
    ],
  }),
  c({
    id: "economic-growth",
    name: "Economic growth",
    aliases: ["long-run economic growth", "growth of living standards"],
    searchTerms: [
      "sustained increase in output per person",
      "long-run productivity growth",
    ],
    chapters: [10],
    tags: ["chapter-10", "growth", "high-yield"],
    summary:
      "Economic growth is a sustained increase in productive capacity and usually real output per person over time.",
    intuition:
      "Growth is the economy learning, building, and organising better ways to produce, not merely having a one-quarter demand boom.",
    explanation: [
      "The course studies growth through real GDP per capita, capital, labour, and total factor productivity. Compounding makes small persistent rate differences large over decades.",
      "Growth can raise material resources without resolving distribution, environmental, or wellbeing questions captured imperfectly by GDP.",
    ],
    whyItMatters:
      "It is the organising concept for Chapter 10 and the long-run contrast with business-cycle fluctuations.",
    prerequisites: [
      "real-gdp",
      "gdp-per-capita",
      "growth-rate",
      "capital-accumulation",
    ],
    relatedConcepts: [
      "compound-growth",
      "productivity",
      "growth-accounting",
      "convergence",
      "capital-deepening",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 3, "Measuring economic growth."),
      T(273, "Economic growth chapter."),
    ],
  }),
  c({
    id: "compound-growth",
    name: "Compound growth",
    aliases: ["compounding", "compound growth rate"],
    searchTerms: ["growth on growth", "future output after repeated growth"],
    chapters: [10],
    tags: ["chapter-10", "growth", "calculation"],
    summary:
      "Compound growth applies each period’s growth rate to the level reached in the previous period.",
    intuition:
      "A 2% annual increase is not 2% of the original amount every year; later increases build on earlier increases.",
    explanation: [
      "The compound formula is useful for long-run output, population, and debt examples. A small difference in persistent growth rates can create a large level difference over many periods.",
      "Do not add percentage rates when the question requires compounding, unless the course explicitly gives a small-change approximation.",
    ],
    whyItMatters:
      "It explains why growth rates are economically consequential even when they look small.",
    prerequisites: ["growth-rate", "percentage", "algebraic-substitution"],
    relatedConcepts: ["rule-of-70", "economic-growth", "gdp-per-capita"],
    sourceRefs: [
      L("lecture-w9-l1", 7, "Rule of 70 and compound growth."),
      T(276, "Growth-rate compounding table."),
    ],
    equations: [
      {
        label: "Compound level",
        expression: "future level = starting level × (1 + g)ᵀ",
        variables: [
          { symbol: "g", meaning: "growth rate per period as a decimal" },
          { symbol: "T", meaning: "number of periods" },
        ],
        interpretation:
          "Use g = 0.02 for a 2% rate and keep the number of periods consistent with the rate.",
      },
    ],
  }),
  c({
    id: "rule-of-70",
    name: "Rule of 70",
    aliases: ["rule of 70", "doubling-time rule"],
    searchTerms: ["years to double", "70 divided by growth rate"],
    chapters: [10],
    tags: ["chapter-10", "growth", "calculation"],
    summary:
      "The Rule of 70 approximates the number of years needed for a quantity to double as 70 divided by its annual percentage growth rate.",
    intuition:
      "Persistent 2% growth doubles a level in roughly 35 years; 5% growth doubles it in roughly 14 years.",
    explanation: [
      "The rule is an approximation for a constant positive growth rate expressed in percent, not decimal form. It becomes less accurate for very large rates or changing growth.",
      "It describes a level outcome from a rate; it does not say the annual growth rate itself doubles.",
    ],
    whyItMatters:
      "It is a fast calculation and a memorable demonstration of compounding.",
    prerequisites: ["compound-growth", "growth-rate", "percentage"],
    relatedConcepts: ["economic-growth", "gdp-per-capita"],
    sourceRefs: [
      L("lecture-w9-l1", 7, "Rule of 70."),
      T(276, "Growth-rate and doubling examples."),
    ],
    equations: [
      {
        label: "Rule of 70",
        expression: "doubling time ≈ 70 / annual growth rate (%)",
        variables: [
          { symbol: "70", meaning: "approximation constant" },
          {
            symbol: "annual growth rate (%)",
            meaning: "growth stated as a number such as 2, not 0.02",
          },
        ],
        interpretation:
          "The result is in years when the rate is annual and approximately constant.",
      },
    ],
  }),
  c({
    id: "production-function",
    name: "Production function",
    aliases: ["aggregate production function", "production technology"],
    searchTerms: [
      "output produced from labour capital and technology",
      "Y as a function of inputs",
    ],
    chapters: [2, 10],
    tags: ["chapter-10", "growth", "model"],
    summary:
      "A production function describes the maximum output obtainable from inputs and technology under a stated production process.",
    intuition:
      "It is a recipe or map from labour, capital, and ideas to output, holding the rules of production fixed.",
    explanation: [
      "Changing an input moves along the production function; changing technology or organisation can shift it. Marginal products describe the extra output from one more input.",
      "The function is a model abstraction: it does not mean the economy literally has one machine with a single formula.",
    ],
    whyItMatters:
      "It is the foundation for labour productivity, capital deepening, Cobb-Douglas, and growth accounting.",
    prerequisites: ["capital", "labour-force", "quantity"],
    relatedConcepts: [
      "cobb-douglas",
      "marginal-product-labour",
      "marginal-product-capital",
      "productivity",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 12, "Aggregate production function."),
      T(284, "Production function and inputs."),
    ],
  }),
  c({
    id: "cobb-douglas",
    name: "Cobb-Douglas production function",
    aliases: ["Cobb-Douglas"],
    searchTerms: [
      "Y equals A K alpha L one minus alpha",
      "production function with factor shares",
    ],
    chapters: [10],
    tags: ["chapter-10", "growth", "calculation"],
    summary:
      "The Cobb-Douglas function represents output as productivity multiplied by capital and labour inputs raised to factor-share powers.",
    intuition:
      "It gives a compact way to ask how output responds to more capital, more labour, or better technology.",
    explanation: [
      "A is total factor productivity, K is capital, L is labour, and α determines capital’s output elasticity in the course form. With constant returns, the exponents sum to one.",
      "The function is not a production recipe for every firm; it is a structured approximation useful for growth accounting.",
    ],
    whyItMatters:
      "It is the algebraic engine for capital deepening, output per worker, and factor contributions to growth.",
    prerequisites: ["production-function", "capital", "labour-force", "productivity"],
    relatedConcepts: [
      "constant-returns-to-scale",
      "diminishing-marginal-product",
      "output-per-worker",
      "growth-accounting",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 15, "Cobb-Douglas production function."),
      T(284, "Cobb-Douglas properties."),
    ],
    equations: [
      {
        label: "Cobb-Douglas form",
        expression: "Y = A Kᵅ L¹⁻ᵅ",
        variables: [
          { symbol: "Y", meaning: "real output" },
          { symbol: "A", meaning: "total factor productivity" },
          { symbol: "K", meaning: "capital input" },
          { symbol: "L", meaning: "labour input" },
          { symbol: "α", meaning: "capital output elasticity or factor share" },
        ],
        interpretation:
          "Changing A shifts productivity; changing K or L changes inputs. The course’s exponent assumptions determine returns to scale.",
      },
    ],
  }),
  c({
    id: "constant-returns-to-scale",
    name: "Constant returns to scale",
    aliases: ["constant returns", "CRS"],
    searchTerms: [
      "double all inputs doubles output",
      "scale up production proportionally",
    ],
    chapters: [10],
    tags: ["chapter-10", "growth", "math"],
    summary:
      "Constant returns to scale means multiplying all inputs by the same factor multiplies output by that factor.",
    intuition:
      "If a production operation doubles every relevant input and can reproduce the same process, it doubles output rather than becoming more or less efficient just from scale.",
    explanation: [
      "Constant returns concerns changing all inputs together. It is different from diminishing marginal product, which holds other inputs fixed while one input rises.",
      "In Cobb-Douglas, exponents that sum to one give constant returns to scale.",
    ],
    whyItMatters:
      "It is a graph/algebra distinction that prevents returns-to-scale and marginal-return concepts being merged.",
    prerequisites: ["production-function", "cobb-douglas", "ratio"],
    relatedConcepts: [
      "diminishing-marginal-product",
      "capital-deepening",
      "growth-accounting",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 45, "Properties of aggregate production function."),
      T(285, "Cobb-Douglas properties."),
    ],
  }),
  c({
    id: "diminishing-marginal-product",
    name: "Diminishing marginal product",
    aliases: ["diminishing returns", "diminishing marginal product"],
    searchTerms: ["extra input adds less output", "marginal product falls"],
    chapters: [3, 10],
    tags: ["chapter-3", "chapter-10", "growth"],
    summary:
      "Diminishing marginal product means the extra output from adding one more unit of an input falls when other inputs are held fixed.",
    intuition:
      "More workers sharing the same fixed equipment may still raise output, but each additional worker has less room or equipment to work with.",
    explanation: [
      "It does not mean total output falls as the input rises; it means output rises more slowly at the margin in the relevant range.",
      "Diminishing returns to capital explain why capital deepening alone cannot generally generate indefinite growth in output per worker.",
    ],
    whyItMatters:
      "It is the long-run reason productivity and technology matter alongside capital accumulation.",
    prerequisites: [
      "production-function",
      "marginal-product-capital",
      "marginal-product-labour",
    ],
    relatedConcepts: [
      "capital-deepening",
      "capital-accumulation-limits",
      "constant-returns-to-scale",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 45, "Production-function properties."),
      T(286, "Diminishing marginal product."),
    ],
  }),
  c({
    id: "output-per-worker",
    name: "Output per worker",
    aliases: ["Y/L", "per-worker output", "output per labour"],
    searchTerms: ["production per worker", "GDP divided by workers"],
    chapters: [10],
    tags: ["chapter-10", "growth", "calculation"],
    summary:
      "Output per worker is real output divided by the number of workers or labour input.",
    intuition:
      "It asks how much production is associated with an average worker, which can rise through more capital per worker or better technology.",
    explanation: [
      "Output per worker is a productivity measure, but it is not identical to output per person because not everyone works and hours can differ.",
      "The per-worker Cobb-Douglas form makes capital deepening and total factor productivity visible.",
    ],
    whyItMatters:
      "It is the growth chapter’s bridge between production inputs and living-standard measures.",
    prerequisites: ["real-gdp", "labour-force", "ratio", "production-function"],
    relatedConcepts: [
      "labour-productivity",
      "capital-deepening",
      "gdp-per-capita",
      "growth-accounting",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 50, "Per-worker production function."),
      T(288, "Per-worker production function."),
    ],
    equations: [
      {
        label: "Output per worker",
        expression: "y = Y / L",
        variables: [
          { symbol: "y", meaning: "output per worker" },
          { symbol: "Y", meaning: "real output" },
          { symbol: "L", meaning: "labour input or workers" },
        ],
        interpretation:
          "Use the specified labour measure; hours and persons are not interchangeable without an assumption.",
      },
    ],
  }),
  c({
    id: "labour-productivity",
    name: "Labour productivity",
    aliases: ["labour productivity", "labor productivity"],
    searchTerms: ["output per hour worked", "how much each worker produces"],
    chapters: [2, 10],
    tags: ["chapter-2", "chapter-10", "growth", "high-yield"],
    summary:
      "Labour productivity is output per worker or per hour worked, depending on the course measure.",
    intuition:
      "Productivity is not how hard a person tries in isolation; it reflects tools, skills, technology, organisation, and the production environment around labour.",
    explanation: [
      "Higher labour productivity can shift labour demand and raise potential output. It can come from more capital per worker, better ideas, or improved human and social capital.",
      "Be precise about the denominator: output per hour, per worker, and per person answer different questions.",
    ],
    whyItMatters:
      "It is a central growth driver and appears in labour-demand shifts, potential output, and growth accounting.",
    prerequisites: ["output-per-worker", "production-function", "growth-rate"],
    relatedConcepts: [
      "total-factor-productivity",
      "capital-deepening",
      "technology-ideas",
      "potential-output",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 47, "Sources of economic growth and productivity."),
      T(290, "Differences in productivity."),
    ],
  }),
  c({
    id: "capital-deepening",
    name: "Capital deepening",
    aliases: ["capital deepening", "more capital per worker"],
    searchTerms: ["capital per worker rises", "worker has more equipment"],
    chapters: [10],
    tags: ["chapter-10", "growth"],
    summary:
      "Capital deepening is an increase in capital per worker or per unit of labour.",
    intuition:
      "A worker with better tools can produce more, even if the worker’s skills and technology are unchanged.",
    explanation: [
      "Capital deepening raises output per worker in the production model, but diminishing marginal product means its effect tends to shrink as capital per worker becomes larger.",
      "Capital deepening is not the same as total factor productivity growth: one increases an input ratio, the other shifts the efficiency of the production process.",
    ],
    whyItMatters:
      "It separates one source of productivity growth from technology and TFP.",
    prerequisites: [
      "capital-accumulation",
      "output-per-worker",
      "diminishing-marginal-product",
    ],
    relatedConcepts: [
      "labour-productivity",
      "total-factor-productivity",
      "growth-accounting",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 50, "Per-worker production and capital."),
      T(288, "Per-worker production function."),
    ],
  }),
  c({
    id: "productivity",
    name: "Productivity",
    aliases: ["total productivity", "productive efficiency"],
    searchTerms: ["output from inputs", "how efficiently resources produce"],
    chapters: [2, 10],
    tags: ["chapter-2", "chapter-10", "growth", "high-yield"],
    summary:
      "Productivity describes how much output is produced from given inputs and technology.",
    intuition:
      "It is the economy’s ability to turn labour, capital, and ideas into useful output, not simply the number of inputs employed.",
    explanation: [
      "Labour productivity holds the focus on output per worker or hour. Total factor productivity captures efficiency or technology after accounting for measured labour and capital inputs.",
      "Productivity improvements can raise potential output and shift labour demand, but measurement and causation require care.",
    ],
    whyItMatters:
      "It is the beginner-friendly umbrella concept for MPL, labour productivity, TFP, and long-run growth.",
    prerequisites: ["production-function", "output-per-worker", "capital"],
    relatedConcepts: [
      "labour-productivity",
      "total-factor-productivity",
      "technology-ideas",
      "potential-output",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 13, "Productive inputs and productivity."),
      T(290, "Productivity differences."),
    ],
  }),
  c({
    id: "total-factor-productivity",
    name: "Total factor productivity (TFP)",
    aliases: ["TFP", "multi-factor productivity", "total factor productivity"],
    searchTerms: [
      "technology and efficiency residual",
      "output not explained by measured inputs",
    ],
    chapters: [10],
    tags: ["chapter-10", "growth", "calculation", "high-yield"],
    summary:
      "TFP measures the efficiency or technology component of output after accounting for labour and capital inputs in the production model.",
    intuition:
      "If the economy produces more without proportionally adding measured labour or capital, the production process or knowledge has improved in the model.",
    explanation: [
      "TFP is often a residual: it can capture technology, organisation, skills not measured as labour quality, and measurement error. It is not literally one single machine or idea.",
      "In the Cobb-Douglas model, a rise in A shifts the production function and raises output per worker at a given capital-labour ratio.",
    ],
    whyItMatters:
      "It is the course’s central long-run growth concept beyond simply accumulating capital.",
    prerequisites: ["productivity", "cobb-douglas", "growth-rate", "output-per-worker"],
    relatedConcepts: [
      "growth-accounting",
      "technology-ideas",
      "capital-deepening",
      "labour-productivity",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 60, "Productivity A in the per-worker function."),
      L("lecture-w9-l1", 69, "Growth-accounting decomposition."),
      T(295, "Multi-factor productivity growth."),
    ],
  }),
  c({
    id: "growth-accounting",
    name: "Growth accounting",
    aliases: ["growth accounting", "growth-accounting decomposition"],
    searchTerms: [
      "decompose output growth into inputs and TFP",
      "sources of GDP growth",
    ],
    chapters: [10],
    tags: ["chapter-10", "growth", "calculation", "high-yield"],
    summary:
      "Growth accounting decomposes output growth into contributions from productivity, capital, and labour under a production model.",
    intuition:
      "It asks how much of observed growth can be associated with more inputs and how much is left as improved efficiency or technology.",
    explanation: [
      "In the course’s Cobb-Douglas approximation, output growth equals TFP growth plus the capital share times capital growth plus the labour share times labour growth.",
      "The decomposition is accounting within the model; it does not by itself prove that a particular policy caused TFP or capital growth.",
    ],
    whyItMatters:
      "It is the final synthesis of production functions, factor shares, productivity, and compounding.",
    prerequisites: [
      "cobb-douglas",
      "total-factor-productivity",
      "capital-deepening",
      "growth-rate",
    ],
    relatedConcepts: [
      "labour-productivity",
      "economic-growth",
      "production-function",
      "constant-returns-to-scale",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 65, "Accounting for growth."),
      L("lecture-w9-l1", 69, "Growth-accounting formula."),
      T(294, "Growth accounting."),
    ],
    equations: [
      {
        label: "Course growth-accounting approximation",
        expression: "Δ%Y ≈ Δ%A + αΔ%K + (1 − α)Δ%L",
        variables: [
          { symbol: "Δ%Y", meaning: "real-output growth" },
          { symbol: "Δ%A", meaning: "TFP growth" },
          { symbol: "Δ%K", meaning: "capital-input growth" },
          { symbol: "Δ%L", meaning: "labour-input growth" },
          { symbol: "α", meaning: "capital output elasticity or factor share" },
        ],
        interpretation:
          "Each input-growth contribution is weighted by its production share; all rates must use the same period.",
      },
    ],
  }),
  c({
    id: "technology-ideas",
    name: "Technology and ideas",
    aliases: ["technology", "ideas and knowledge", "technological progress"],
    searchTerms: ["know-how", "ways of producing more efficiently", "R&D"],
    chapters: [10],
    tags: ["chapter-10", "growth", "productivity"],
    summary:
      "Technology and ideas are knowledge about how to combine resources to produce goods and services more effectively.",
    intuition:
      "A better production method can let the same workers and machines produce more, so the economy’s productive map shifts.",
    explanation: [
      "Ideas can be reused by many producers and can spread through education, research, imitation, and institutions. The course links them to TFP.",
      "Technology is broader than a physical gadget: organisation, software, processes, and knowledge can all matter.",
    ],
    whyItMatters:
      "It gives meaning to the A in Cobb-Douglas and the productivity residual in growth accounting.",
    prerequisites: ["productivity", "production-function"],
    relatedConcepts: [
      "total-factor-productivity",
      "innovation-incentives",
      "public-good-properties",
      "economic-growth",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 63, "Technology, ideas, and R&D."),
      T(292, "Technology and economic growth."),
    ],
  }),
  c({
    id: "institutions-property-rights",
    name: "Institutions and property rights",
    aliases: ["institutions", "property rights", "economic institutions"],
    searchTerms: ["rules that support investment and exchange", "secure ownership"],
    chapters: [10],
    tags: ["chapter-10", "growth", "policy"],
    summary:
      "Institutions and property rights are rules that shape incentives to invest, innovate, exchange, and maintain productive assets.",
    intuition:
      "People are more willing to build a factory or develop an idea when they can expect the returns to remain theirs under stable rules.",
    explanation: [
      "Secure property rights, courts, contract enforcement, and predictable policy can support capital accumulation and innovation. Weak institutions can divert resources into protection or rent-seeking.",
      "Institutions influence growth through incentives and coordination; they are not themselves a single input measured in the production function.",
    ],
    whyItMatters:
      "It is one of the course’s policy explanations for cross-country growth differences.",
    prerequisites: ["capital-accumulation", "technology-ideas", "market"],
    relatedConcepts: [
      "innovation-incentives",
      "economic-growth",
      "social-capital",
      "public-good-properties",
    ],
    sourceRefs: [
      T(292, "Institutions and long-run growth."),
      L("lecture-w9-l1", 64, "Policies to promote economic growth."),
    ],
  }),
  c({
    id: "innovation-incentives",
    name: "Innovation incentives",
    aliases: ["incentives to innovate", "R&D incentives"],
    searchTerms: ["rewards for new ideas", "why firms invest in innovation"],
    chapters: [10],
    tags: ["chapter-10", "growth", "policy"],
    summary:
      "Innovation incentives are rewards and institutions that encourage the creation and adoption of productivity-improving ideas.",
    intuition:
      "Research is costly today and its benefits may be uncertain or copied, so expected returns and ownership rules affect how much innovation occurs.",
    explanation: [
      "Patents, competition, education, public research, and property rights can influence innovation, with trade-offs between reward and diffusion.",
      "Innovation can raise TFP and potential output, but not every new product is a measured productivity improvement.",
    ],
    whyItMatters:
      "It connects institutions and ideas to the policy side of long-run growth.",
    prerequisites: [
      "technology-ideas",
      "institutions-property-rights",
      "total-factor-productivity",
    ],
    relatedConcepts: ["economic-growth", "public-good-properties", "social-capital"],
    sourceRefs: [
      L("lecture-w9-l1", 64, "Policies to promote economic growth."),
      T(293, "Growth policy and innovation."),
    ],
  }),
  c({
    id: "public-good-properties",
    name: "Public-good properties of ideas",
    aliases: ["non-rival ideas", "non-excludable ideas", "public good properties"],
    searchTerms: [
      "ideas can be used by many",
      "knowledge spillovers",
      "non-rival knowledge",
    ],
    chapters: [10],
    tags: ["chapter-10", "growth", "policy"],
    summary:
      "Ideas can have public-good properties because one person’s use need not reduce another’s and exclusion can be difficult.",
    intuition:
      "A production method can be copied or shared without being used up like a machine, so society may gain more than the original inventor can capture.",
    explanation: [
      "Non-rivalry can create large social benefits from spreading knowledge; imperfect excludability can weaken private innovation incentives. Policy may support research while balancing access and reward.",
      "Not every idea is completely non-rival or non-excludable; the properties are degrees in real institutions.",
    ],
    whyItMatters:
      "It explains why growth policy may support knowledge creation and why institutions matter for TFP.",
    prerequisites: ["technology-ideas", "market", "innovation-incentives"],
    relatedConcepts: [
      "total-factor-productivity",
      "institutions-property-rights",
      "social-capital",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 63, "Ideas and knowledge."),
      T(293, "Technology and institutions."),
    ],
  }),
  c({
    id: "social-capital",
    name: "Social capital",
    aliases: ["social capital", "trust and networks"],
    searchTerms: ["trust and cooperation in society", "networks supporting production"],
    chapters: [10],
    tags: ["chapter-10", "growth", "policy"],
    summary:
      "Social capital is trust, networks, and shared norms that make cooperation and exchange easier.",
    intuition:
      "When people expect contracts to be honoured and information to travel through trusted relationships, fewer resources are spent guarding against opportunism.",
    explanation: [
      "Social capital can support innovation, institutions, and human-capital use, but it is difficult to measure and should not be treated as a literal pile of money.",
      "Its effects are complementary to physical capital and ideas rather than a replacement for them.",
    ],
    whyItMatters:
      "It is a course growth concept that ordinary language can confuse with financial capital.",
    prerequisites: ["capital", "institutions-property-rights", "market"],
    relatedConcepts: ["technology-ideas", "economic-growth", "public-good-properties"],
    sourceRefs: [
      T(292, "Institutions and growth conditions."),
      L("lecture-w9-l1", 64, "Policies and growth environment."),
    ],
  }),
  c({
    id: "natural-capital",
    name: "Natural capital",
    aliases: ["natural resources", "natural capital"],
    searchTerms: [
      "land and natural resources used in production",
      "environmental productive assets",
    ],
    chapters: [10],
    tags: ["chapter-10", "growth"],
    summary:
      "Natural capital is the productive value of land, ecosystems, climate, and natural resources.",
    intuition:
      "A forest, mineral deposit, or stable climate can support production just as a machine does, although it is not produced by current investment in the same way.",
    explanation: [
      "Using natural capital can raise current output while reducing future productive capacity if depletion or damage is ignored.",
      "The growth model’s capital concept can be broadened to include natural resources, but the accounting and sustainability questions need explicit assumptions.",
    ],
    whyItMatters:
      "It qualifies a narrow focus on produced capital in discussions of long-run growth and welfare.",
    prerequisites: ["capital", "production-function", "stock"],
    relatedConcepts: ["economic-growth", "capital-accumulation-limits", "gdp-welfare"],
    sourceRefs: [
      L("lecture-w9-l1", 64, "Growth policy and types of capital."),
      T(292, "Natural capital."),
    ],
  }),
  c({
    id: "capital-accumulation-limits",
    name: "Limits to capital accumulation",
    aliases: ["capital accumulation limits", "diminishing returns to capital"],
    searchTerms: [
      "why more machines alone cannot sustain growth",
      "capital deepening eventually slows",
    ],
    chapters: [10],
    tags: ["chapter-10", "growth", "high-yield"],
    summary:
      "Capital accumulation faces limits because the marginal product of additional capital tends to diminish when other inputs are fixed.",
    intuition:
      "Adding the first machine to an under-equipped worker may help greatly; adding the hundredth machine to the same worker may help much less.",
    explanation: [
      "Capital deepening can raise output per worker, but sustained growth requires continuing improvements in productivity, ideas, human capital, or other inputs.",
      "This is a production-model result, not a claim that investment becomes useless or that capital cannot remain important.",
    ],
    whyItMatters:
      "It distinguishes one-off level effects from persistent growth rates.",
    prerequisites: [
      "capital-deepening",
      "diminishing-marginal-product",
      "economic-growth",
    ],
    relatedConcepts: [
      "total-factor-productivity",
      "growth-accounting",
      "capital-accumulation",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 45, "Diminishing marginal products."),
      T(286, "Diminishing marginal product."),
    ],
  }),
  c({
    id: "convergence",
    name: "Convergence",
    aliases: ["economic convergence"],
    searchTerms: ["poorer economies catching up", "growth related to initial income"],
    chapters: [10],
    tags: ["chapter-10", "growth"],
    summary:
      "Convergence is the hypothesis that economies starting with lower output per person may grow faster and catch up with richer economies.",
    intuition:
      "A country far below its productive frontier may gain a lot by adopting existing technologies and adding basic capital, while a frontier country must innovate.",
    explanation: [
      "The course notes that unconditional convergence is weak across all countries; differences in institutions, human capital, geography, and technology can prevent catch-up.",
      "Conditional convergence means economies with similar structural conditions may converge toward their own steady states.",
    ],
    whyItMatters:
      "It qualifies a common growth intuition with the course’s empirical caution.",
    prerequisites: [
      "economic-growth",
      "gdp-per-capita",
      "productivity",
      "capital-accumulation",
    ],
    relatedConcepts: [
      "catch-up-growth",
      "technology-ideas",
      "institutions-property-rights",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 10, "Evidence on convergence."),
      T(281, "Cross-country growth and convergence."),
    ],
  }),
  c({
    id: "catch-up-growth",
    name: "Catch-up versus frontier growth",
    aliases: ["catch-up growth", "frontier growth"],
    searchTerms: ["copying existing technology versus inventing", "latecomer growth"],
    chapters: [10],
    tags: ["chapter-10", "growth"],
    summary:
      "Catch-up growth comes from adopting existing technologies and practices, while frontier growth requires pushing the technology boundary.",
    intuition:
      "It may be easier to copy a proven process than to invent the next one, but copying opportunities shrink as an economy approaches the frontier.",
    explanation: [
      "Catch-up is not automatic: institutions, skills, infrastructure, and access to ideas determine whether adoption succeeds.",
      "Frontier innovation depends more heavily on incentives, research, human capital, and institutions that support experimentation.",
    ],
    whyItMatters:
      "It explains why the same capital or technology policy can have different effects across countries.",
    prerequisites: ["convergence", "technology-ideas", "institutions-property-rights"],
    relatedConcepts: [
      "economic-growth",
      "innovation-incentives",
      "total-factor-productivity",
    ],
    sourceRefs: [
      L("lecture-w9-l1", 10, "Catch-up and frontier growth evidence."),
      T(281, "Convergence discussion."),
    ],
  }),
] as const;
