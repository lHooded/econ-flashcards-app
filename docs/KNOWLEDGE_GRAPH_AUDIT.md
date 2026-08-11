# Knowledge graph audit artifact

Generated from the bundled records on 2026-08-11 with
`npm run validate:knowledge`. This is a review aid, not a second runtime data
source.

## Inventory

| Area          | Concepts |
| ------------- | -------: |
| Foundations   |       43 |
| Chapter 1     |       30 |
| Chapter 2     |       36 |
| Chapter 3     |       33 |
| Chapter 4     |       29 |
| Chapter 5     |       30 |
| Chapter 6     |       35 |
| Chapter 7     |       41 |
| Chapter 8     |       36 |
| Chapter 9     |       41 |
| Chapter 10    |       32 |
| Total records |      297 |

The chapter counts overlap where a reusable concept belongs to more than one
chapter. The 10 graph roots are asset, buyer, expectations, flow, graph axes,
percentage, quantity, ratio, seller, and stock. Maximum prerequisite depth is 15. There are 894 prerequisite edges and 1,132 related-concept edges.

## Coverage and source checks

- Canonical cards: **349 / 349** mapped.
- Exam questions: **161 / 161** mapped transitively through `reviewCardId`.
- Concepts with at least one lecture reference: **287**.
- Concepts with at least one textbook reference: **290**.
- Concepts lacking source support: **0**.
- Cycles: **0**.
- Ambiguous inline aliases: **1** (the deliberate everyday `depreciation` chooser).
- Source page checks: all references are within the local PDF page counts.

The mapped course assets are the 349-card canonical deck, the 100 ordinary
authored questions, the 30 authored stimulus questions, and 31 canonical MCQ
adaptations (161 validated exam questions after assembly).

## Manual prerequisite chains inspected

These paths were checked after graph construction; arrows point in learning
order. Intermediate foundation nodes are intentionally explicit.

- Bond: borrowing/lending → interest → interest rate → future payment → financial
  asset → bond → bond price → bond yield.
- Fisher relationship: percentage/price index → price level → inflation → nominal
  interest rate and inflation expectations → expected real interest rate → Fisher
  relationship.
- Australian cash system: bank → reserves → interbank payment → cash market →
  cash rate → RBA cash-rate target → Exchange Settlement Account → settlement
  balances → reserve demand → cash-rate corridor → open-market operation.
- Monetary transmission: cash-rate target → real-rate channel → planned
  aggregate expenditure/aggregate demand → output gap and inflation dynamics.
- GDP: price and quantity → final good → GDP → nominal GDP/real GDP → GDP growth.
- Prices and inflation: index → price index → price level → CPI → inflation →
  disinflation.
- Labour: working-age population → employment/unemployed → labour force →
  unemployment rate/participation rate → frictional, structural, and cyclical
  unemployment → natural rate.
- Saving and investment: income/expenditure → saving → national saving →
  investment demand → saving-investment equilibrium → crowding out/capital
  accumulation.
- Aggregate expenditure: consumption and macroeconomic investment → planned
  aggregate expenditure → inventories/equilibrium → multiplier → aggregate
  demand.
- Exchange rates: ratio/price → exchange-rate quotation → foreign-exchange
  market → appreciation/depreciation → real exchange rate → purchasing power
  parity/law of one price.
- Growth accounting: production function → output per worker → productivity →
  Cobb-Douglas/TFP → growth accounting.

## Outliers and review notes

The largest direct prerequisite in-degree nodes are expenditure approach (6),
leakages and injections (6), planned aggregate expenditure (5), bond (5), bond
price (5), bank (5), policy reaction function (5), AD slope (5), exchange rate
(5), interest rate (4), GDP (4), and macroeconomic investment (4). High-degree
nodes such as flow, ratio, income, price, inflation, market, and PAE are shared
foundations by design; their explanations stay short and link onward rather than
duplicating chapter prose.

237 concepts currently have no directly mapped canonical card. This is expected
for background foundations and bridge concepts; they are still reachable from
course concepts and are not treated as a readiness blocker. The validator only
requires the reverse guarantee: every canonical card has at least one concept.

No PDF files were copied or added to Git. The source paths actually consulted
are listed in `docs/KNOWLEDGE_GRAPH.md` and in `knowledge/sources.json`.
