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

## Explicit card-mapping audit

The production map is `knowledge/card-concept-map.json`. It contains one
readable row per canonical stable card ID, with the concept IDs selected after
reviewing each card’s chapter, topic, kind, front, answer, explanation,
common-trap text, and tags. It is the source of truth for reverse card links;
topic matching is not a runtime mapping mechanism.

| Metric                                 |    Result |
| -------------------------------------- | --------: |
| Explicit canonical card mappings       | 349 / 349 |
| Production fallback mappings           |         0 |
| Duplicate/unknown/missing mapping rows |         0 |

Representative rows from the full JSON audit table:

| Card ID    | Chapter | Topic                        | Mapped concept IDs                                                                             |
| ---------- | ------: | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `mix-001`  |       0 | GDP synthesis                | `gross-domestic-product`, `final-good`                                                         |
| `ch01-006` |       1 | Value added formula          | `value-added`                                                                                  |
| `ch01-018` |       1 | CPI definition               | `cpi`                                                                                          |
| `ch02-004` |       2 | Unemployment rate            | `unemployment-rate`, `labour-force`                                                            |
| `ch03-006` |       3 | Fisher relationship          | `fisher-relationship`, `nominal-interest-rate`, `real-interest-rate`, `inflation-expectations` |
| `ch04-012` |       4 | Multiplier                   | `multiplier`                                                                                   |
| `ch05-010` |       5 | Balanced-budget multiplier   | `balanced-budget-multiplier`                                                                   |
| `ch06-001` |       6 | Asset return                 | `asset-return`                                                                                 |
| `ch06-002` |       6 | Bond terminology             | `bond`, `face-value`, `coupon-payment`, `maturity`, `principal`, `future-payment`              |
| `ch06-003` |       6 | Bond price formula           | `bond`, `bond-price`, `present-value`, `interest-rate`                                         |
| `ch06-004` |       6 | Bond price and interest rate | `bond-price`, `interest-rate`                                                                  |
| `ch07-005` |       7 | Cash rate                    | `cash-rate`, `cash-market`, `interest-rate`                                                    |
| `ch08-008` |       8 | Aggregate demand shift       | `aggregate-demand`, `ad-shift`, `net-exports`                                                  |
| `ch09-017` |       9 | Appreciation                 | `appreciation`, `exchange-rate`                                                                |
| `ch10-005` |      10 | Rule of 70                   | `rule-of-70`, `compound-growth`, `growth-rate`                                                 |

The mandatory audit cases are intentional: `ch06-001` does not map to the
generic `money` concept, and `ch06-002` does not receive any chapter fallback.
Every other row is available for direct review in the JSON file; there are no
unmapped canonical cards or opaque production rules.

## Coverage and source checks

- Canonical cards: **349 / 349** mapped.
- Explicit canonical card mappings: **349 / 349**.
- Production fallback mappings: **0**.
- Exam questions: **161 / 161** mapped transitively through `reviewCardId`.
- Concepts with at least one lecture reference: **287**.
- Concepts with at least one textbook reference: **290**.
- Concepts lacking source support: **0**.
- Concepts with at least one linked canonical card: **269**.
- Concepts with no linked canonical card: **28** (background/bridge concepts,
  not discarded from the foundation curriculum).
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

The scheduler and curriculum intentionally use different readiness functions.
An unreviewable no-card prerequisite is non-blocking for the Exam-SRS unseen-card
tie-break, so the full deck cannot deadlock. The learner-facing foundation
curriculum includes those same concepts and treats them as needing explanation;
for concepts with linked cards, only derived `Solid` is sufficient for a
foundation recommendation to move on. This does not persist a second mastery
state.

Pre-answer disclosure is also explicit rather than global: the active card’s
mapped concept IDs are blocked, while incidental concepts can show only a short
meaning and intuition. After grading, the full article and graph navigation are
available. This protects CPI construction, bond-price/interest-rate direction,
Fisher, Rule-of-70, unemployment-rate construction, and exchange-rate
conversion questions from being answered by their own explanations.

No PDF files were copied or added to Git. The source paths actually consulted
are listed in `docs/KNOWLEDGE_GRAPH.md` and in `knowledge/sources.json`.
