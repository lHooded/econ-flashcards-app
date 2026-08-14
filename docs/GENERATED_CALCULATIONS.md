# Generated calculation practice

This document is the audit and design record for Practice Lab → Calculations →
Generated numeric. It is deliberately separate from the main README so the generated
calculation registry and its validation evidence remain easy to review.

## Coverage

- Canonical deck: 354 cards.
- Canonical `kind === "calculation"` cards: 26.
- Generated-enabled cards: 26 / 26.
- Templates: 26, one per canonical calculation card.
- Excluded cards: none.
- Generated table templates: 2 (`ch01-015` real GDP and `ch02-007` labour statistics).
- Chapter coverage: Chapter 1 (2), Chapter 2 (3), Chapter 3 (2), Chapter 4 (2),
  Chapter 5 (1), Chapter 6 (3), Chapter 7 (4), Chapter 8 (2), Chapter 9 (4),
  Chapter 10 (3).
- Chapter 0 is not offered as a generated filter because it has no canonical
  calculation cards.

The registry validator instantiates every template for 500 deterministic seeds.
The validation command therefore checks 13,000 generated instances before the
application build completes.

## Canonical calculation audit

The following table was prepared from the canonical card's ID, chapter, topic,
front, answer, explanation, common trap, tags, and sources. Formulas below use
the notation and quote/unit conventions stated by the canonical card and its
course notes.

| Card ID    | Chapter | Topic                      | Canonical prompt                                                                                                                                                   | Calculation / formula being tested                                                            | Parameterisable? | Reason                                                                                                                                                                                  | Implemented template ID(s)             |
| ---------- | ------: | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `ch01-010` |       1 | Inventory investment       | Beginning inventories are 100 and end-of-period inventories are 75. What is inventory investment?                                                                  | `I_inventory = inventories_end − inventories_begin`                                           | Yes              | Beginning stock and ending stock can vary independently while preserving a positive stock and either accumulation or rundown.                                                           | `generated-inventory-investment`       |
| `ch01-015` |       1 | Real GDP                   | How do you calculate real GDP using a fixed base year?                                                                                                             | `real GDP = Σ(base-year price × current-year quantity)`                                       | Yes              | A declarative table can vary prices, quantities, and the number of goods without changing the fixed-base convention.                                                                    | `generated-real-gdp-fixed-base`        |
| `ch02-007` |       2 | Labour statistics          | A country has working-age population 1,000, participation 70%, and employment-to-population 60%. Find LF, E, U and u.                                              | `LF = participation × WAP`; `E = employment/population × WAP`; `U = LF − E`; `u = U/LF × 100` | Yes              | Population and rates are constrained to produce integer people, with employment below the labour force. The numeric field grades `u`; LF, E, and U remain meaningful worked steps.      | `generated-labour-statistics`          |
| `ch02-014` |       2 | Natural rate flows         | If s = 0.02 and f = 0.13, what is the steady-state unemployment rate?                                                                                              | `u* = s/(s + f)`                                                                              | Yes              | Positive separation and finding rates can vary over sensible ranges while keeping `0 < u* < 100%`.                                                                                      | `generated-natural-rate-flows`         |
| `ch02-019` |       2 | Okun's law                 | If the output gap is -2%, β = 2.5 and u* = 4%, what is u?                                                                                                          | `output gap = −β(u − u*)`; `u = u* − gap/β`                                                   | Yes              | Output gaps vary on both sides of zero, beta remains positive, and the resulting unemployment rate stays valid.                                                                         | `generated-okun-law`                   |
| `ch03-007` |       3 | Fisher effect              | A deposit pays 1.75% nominal and a saver expects a 1.5% real return. What expected inflation is consistent with the approximate Fisher effect?                     | `πᵉ ≈ i − r`                                                                                  | Yes              | Nominal and expected real returns vary in half-point increments; positive, zero, and negative implied inflation are possible.                                                           | `generated-fisher-effect`              |
| `ch03-013` |       3 | Capital accumulation       | K₀=100, I=20 and K₁=115. What depreciation rate δ is implied?                                                                                                      | `K₁ = K₀ + I − δK₀`; `δ = (K₀ + I − K₁)/K₀`                                                   | Yes              | Beginning capital, investment, and a directly constructed positive ending stock vary while depreciation remains in a sensible range.                                                    | `generated-capital-accumulation`       |
| `ch04-013` |       4 | Multiplier                 | If c=0.6 and autonomous planned investment rises by 20, what is ΔY?                                                                                                | `k = 1/(1 − c)`; `ΔY = k × Δ autonomous spending`                                             | Yes              | MPC and autonomous changes vary; positive and negative output changes are both generated.                                                                                               | `generated-simple-multiplier`          |
| `ch04-024` |       4 | Open economy               | C=200+0.6Y, Iᴾ=80, X=60 and M=0.1Y. Find equilibrium Y.                                                                                                            | `Y = (C₀ + Iᴾ + X)/(1 − c + m)`                                                               | Yes              | Autonomous spending, MPC, and import propensity vary under a positive leakage-adjusted denominator.                                                                                     | `generated-open-economy-equilibrium`   |
| `ch05-011` |       5 | Balanced-budget multiplier | If c=0.8 and t=0.3, what is k_BB?                                                                                                                                  | `k_BB = (1 − c)/[1 − c(1 − t)]`                                                               | Yes              | MPC and proportional tax rates vary within the three-sector course model.                                                                                                               | `generated-balanced-budget-multiplier` |
| `ch06-005` |       6 | Bond price                 | A one-period bond pays $100 next year. What is its price if i=4%?                                                                                                  | `P = face value/(1 + i)` with `i` in decimal form                                             | Yes              | Face values and market rates vary; the final price is rounded to cents.                                                                                                                 | `generated-bond-price`                 |
| `ch06-014` |       6 | Money demand               | Suppose MD/P = 0.8Y - 1200i, with i in decimal form. If Y=1000 and i=5%, what is real money demand?                                                                | `MD/P = 0.8Y − 1200i`, with `i = 0.05` for 5%                                                 | Yes              | Income and the decimal interest rate vary while real money demand remains positive.                                                                                                     | `generated-money-demand`               |
| `ch06-030` |       6 | Quantity theory            | If money grows 8%, velocity is constant and real output grows 3%, what inflation rate does simple quantity theory predict?                                         | `π ≈ g_M − g_Y` when velocity growth is zero                                                  | Yes              | Money and real-output growth vary, including directions that imply negative inflation.                                                                                                  | `generated-quantity-theory`            |
| `ch07-008` |       7 | Corridor calculation       | A hypothetical corridor is 50 basis points wide and centred on a 2.00% target. What are the floor and ceiling?                                                     | `floor = target − width/2`; `ceiling = target + width/2`; 100 bp = 1 percentage point         | Yes              | Target and total width vary. The numeric field asks for the floor and the worked solution also computes the ceiling.                                                                    | `generated-corridor-floor`             |
| `ch07-010` |       7 | Reserve demand             | If reserve demand is Rᵈ=10-2.5i, with i measured in percentage points, how many reserves are demanded at i=2?                                                      | `Rᵈ = 10 − 2.5i`, with `i = 2` for 2%                                                         | Yes              | Percentage-point rates vary within the positive range of the course equation.                                                                                                           | `generated-reserve-demand`             |
| `ch07-020` |       7 | Expectations hypothesis    | If the current one-year rate is 2% and the expected one-year rate next year is 4%, what is the approximate two-year annual rate under the expectations hypothesis? | `i₂ ≈ (current one-year rate + expected next one-year rate)/2`                                | Yes              | Both one-year rates vary and the output remains an annualised rate.                                                                                                                     | `generated-expectations-hypothesis`    |
| `ch07-023` |       7 | Taylor rule                | Using i = 4 + 1.5(π-πᵀ) + 0.5(output gap), what is i if π=4%, πᵀ=2% and the output gap is +2%?                                                                     | `i = 4 + 1.5(π − πᵀ) + 0.5(output gap)` in percentage-point units                             | Yes              | Inflation, target inflation, and signed output gaps vary; the inflation gap is calculated explicitly.                                                                                   | `generated-taylor-rule`                |
| `ch08-003` |       8 | PAE with real rate         | If C=200+0.6Y-20r and I=80-10r, with no other sectors, what is PAE?                                                                                                | `PAE = C + I`; combine the autonomous intercept and both `r` coefficients                     | Yes              | Generated coefficients vary and the numeric target alternates between the combined autonomous intercept and the combined coefficient on `r`; the full PAE equation is always derived.   | `generated-pae-with-real-rate`         |
| `ch08-005` |       8 | Derive AD                  | If equilibrium output is Y=700-75r and the PRF is r=1.5+0.5π, what is the AD curve?                                                                                | Substitute `r = r₀ + γπ` into `Y = A − Br` to derive `(A − Br₀) − (Bγ)π`                      | Yes              | Generated values vary and the numeric target alternates between the AD intercept and coefficient on `π`; no arbitrary inflation point is supplied.                                      | `generated-ad-substitution`            |
| `ch09-019` |       9 | Currency conversion        | If e=0.65 USD/AUD, how many USD does A$200 buy?                                                                                                                    | `USD = AUD × (USD/AUD)`                                                                       | Yes              | Australian amounts and the exact course quote vary.                                                                                                                                     | `generated-aud-to-usd`                 |
| `ch09-020` |       9 | Currency conversion        | If e=0.65 USD/AUD, how many AUD are needed for US$130?                                                                                                             | `AUD = USD ÷ (USD/AUD)`                                                                       | Yes              | The reciprocal direction varies in amount while preserving the `USD/AUD` quote.                                                                                                         | `generated-usd-to-aud`                 |
| `ch09-021` |       9 | Cross rate                 | If 1 AUD=0.65 USD and 1 EUR=1.10 USD, approximately how many EUR does 1 AUD buy?                                                                                   | `EUR/AUD = (USD/AUD) ÷ (USD/EUR)`                                                             | Yes              | Both rates share USD and vary positively; the resulting cross-rate quote remains EUR per AUD.                                                                                           | `generated-cross-rate`                 |
| `ch09-025` |       9 | LOOP exchange rate         | A Big Mac costs A$8 in Australia and US$5.20 in the US. What USD/AUD rate would equalise the common-currency price under LOOP?                                     | `USD/AUD = US price ÷ Australian price`                                                       | Yes              | Australian and US prices vary positively and the answer preserves the course foreign-currency-per-AUD quote.                                                                            | `generated-loop-exchange-rate`         |
| `ch10-005` |      10 | Rule of 70                 | At 2.5% annual real GDP per capita growth, about how long does living-standard output take to double?                                                              | `doubling time ≈ 70/growth rate in percent units`                                             | Yes              | Growth rates vary in calculator-friendly half-point increments; the answer is in years.                                                                                                 | `generated-rule-of-70`                 |
| `ch10-026` |      10 | Growth accounting          | If output grows 3.5%, K grows 2%, L grows 2%, and α=0.25, what is TFP growth?                                                                                      | `g_A = g_Y − αg_K − (1 − α)g_L`                                                               | Yes              | Output, capital, labour growth, and alpha vary; residual TFP can be positive or negative. The final answer is a growth rate in `%`; weighted input contributions are percentage points. | `generated-tfp-growth`                 |
| `ch10-027` |      10 | Growth accounting          | If α=0.3, K grows 5%, L grows 1% and TFP grows 2%, what is predicted output growth?                                                                                | `g_Y = g_A + αg_K + (1 − α)g_L`                                                               | Yes              | TFP, capital, labour growth, and alpha vary; contributions are calculated in percentage points, then the final predicted growth rate is reported in `%`.                                | `generated-output-growth-accounting`   |

There are no excluded card IDs. The two cards whose authored answer contains
multiple outputs (`ch02-007` and `ch07-008`) use a single clearly labelled
numeric target while retaining every economically meaningful intermediate or
companion value in the worked solution. The two Chapter 8 symbolic cards use a
numeric derivation target: the full PAE or AD equation is derived in the worked
solution, while the learner enters one generated intercept or coefficient. No
free-form equation parser or point-evaluation shortcut is used.

## Canonical evidence checked

The generated templates take the canonical `common_trap` directly from the
bundled deck. The following compact evidence table records the remaining
card-level fields inspected while authoring.

| Card ID    | Canonical answer (summary)                     | Explanation / trap used to guide the template                                                                                        | Tags                                         | Sources                                                                               |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `ch01-010` | `-25`                                          | End stock minus beginning stock; do not use the level.                                                                               | `calculation`, `investment`                  | Textbook Ch 1; Week1_Lecture1/2; Tutorial solutions week 2; Worksheet 1               |
| `ch01-015` | Base-year prices × current quantities, summed. | Common prices isolate quantity changes; base year sets prices, not quantities.                                                       | `calculation`, `real-GDP`                    | Textbook Ch 1; Week1_Lecture1/2; Tutorial solutions week 2; Worksheet 1               |
| `ch02-007` | LF 700; E 600; U 100; u 14.29%.                | Participation gives LF; employment ratio gives E; unemployment is residual within LF.                                                | `calculation`, `labour-force`                | Textbook Ch 2; Week2_Lecture1; Tutorial solutions week 2/3                            |
| `ch02-014` | `0.02/(0.02+0.13) = 13.33%`                    | Separations equal findings at steady state; rates need common time units.                                                            | `calculation`, `natural-rate`                | Textbook Ch 2; Week2_Lecture1; Tutorial solutions week 2/3                            |
| `ch02-019` | `u = 4.8%`                                     | Negative gap raises cyclical unemployment; keep percentage points consistent.                                                        | `calculation`, `Okun`                        | Textbook Ch 2; Week2_Lecture1; Tutorial solutions week 2/3                            |
| `ch03-007` | `0.25%`                                        | `πᵉ = i − r`; subtract real from nominal.                                                                                            | `calculation`, `Fisher-effect`               | Textbook Ch 3; Week2_Lecture2; Tutorial solutions week 3/4; Worksheet 2               |
| `ch03-013` | `δ = 5%`                                       | Depreciation is on beginning capital in the one-period equation.                                                                     | `calculation`, `capital`                     | Textbook Ch 3; Week2_Lecture2; Tutorial solutions week 3/4; Worksheet 2               |
| `ch04-013` | `k=2.5`, `ΔY=50`                               | Include all induced rounds, not only the first round.                                                                                | `calculation`, `multiplier`                  | Textbook Ch 4; Week3_Lecture1/2; Tutorial solutions week 4; Worksheet 3               |
| `ch04-024` | `PAE=340+0.5Y`, `Y=680`                        | Imports subtract from the induced term; `0.6Y−0.1Y=0.5Y`.                                                                            | `calculation`, `open-economy`                | Textbook Ch 4; Week3_Lecture1/2; Tutorial solutions week 4; Worksheet 3               |
| `ch05-011` | `k_BB≈0.45`                                    | Proportional taxes mean the multiplier is not generally one.                                                                         | `calculation`, `balanced-budget`             | Textbook Ch 5; Week4_Lecture1/2; Tutorial solutions week 5; Worksheet 4               |
| `ch06-005` | `$96.15`                                       | Convert 4% to `0.04` before discounting.                                                                                             | `bonds`, `calculation`                       | Textbook Ch 6; Week5_Lecture1; Worksheet 5; Tutorial solutions week 7                 |
| `ch06-014` | `740`                                          | `i` is decimal here; interest cost subtracts from income term.                                                                       | `money-demand`, `calculation`                | Textbook Ch 6; Week5_Lecture1; Worksheet 5; Tutorial solutions week 7                 |
| `ch06-030` | About `5%`                                     | Subtract real-output growth when velocity is constant.                                                                               | `quantity-theory`, `calculation`             | Textbook Ch 6; Week5_Lecture1; Worksheet 5; Tutorial solutions week 7                 |
| `ch07-008` | Floor `1.75%`, ceiling `2.25%`                 | 50 basis points is 0.50 percentage points total, split around target.                                                                | `cash-rate`, `calculation`                   | Textbook Ch 7; Week5_Lecture2; Week7_Lecture1; Worksheet 6; Tutorial solutions week 8 |
| `ch07-010` | `5` units                                      | This equation uses `i=2` for 2%, not `0.02`.                                                                                         | `ESA`, `calculation`                         | Textbook Ch 7; Week5_Lecture2; Week7_Lecture1; Worksheet 6; Tutorial solutions week 8 |
| `ch07-020` | About `3%`                                     | Average expected short rates; do not add to 6%.                                                                                      | `yield-curve`, `calculation`                 | Textbook Ch 7; Week5_Lecture2; Week7_Lecture1; Worksheet 6; Tutorial solutions week 8 |
| `ch07-023` | `8%`                                           | Use `π−πᵀ`, not π, and preserve signed output gap.                                                                                   | `Taylor-rule`, `calculation`                 | Textbook Ch 7; Week5_Lecture2; Week7_Lecture1; Worksheet 6; Tutorial solutions week 8 |
| `ch08-003` | `280+0.6Y−30r`                                 | Add both interest-rate coefficients and investment intercept; generated targets are the combined intercept or `r` coefficient.       | `PAE`, `real-interest-rate`, `calculation`   | Textbook Ch 8; Week7_Lecture2; Worksheet 7; Tutorial solutions week 9                 |
| `ch08-005` | `Y=587.5−37.5π`                                | Substitute PRF into output; derive the negative AD slope and intercept, rather than evaluating one `π`.                              | `AD`, `derivation`, `calculation`            | Textbook Ch 8; Week7_Lecture2; Worksheet 7; Tutorial solutions week 9                 |
| `ch09-019` | `US$130`                                       | Multiply AUD by USD per AUD.                                                                                                         | `exchange-rate`, `calculation`               | Textbook Ch 9; Week8_Lecture1/2; Worksheet 8; Tutorial solutions week 10              |
| `ch09-020` | `A$200`                                        | Divide USD by USD/AUD for the reciprocal conversion.                                                                                 | `exchange-rate`, `calculation`               | Textbook Ch 9; Week8_Lecture1/2; Worksheet 8; Tutorial solutions week 10              |
| `ch09-021` | About `0.591 EUR`                              | Divide the two USD-denominated quotes to get EUR/AUD.                                                                                | `exchange-rate`, `cross-rate`, `calculation` | Textbook Ch 9; Week8_Lecture1/2; Worksheet 8; Tutorial solutions week 10              |
| `ch09-025` | `0.65 USD/AUD`                                 | Foreign price divided by Australian price under LOOP.                                                                                | `LOOP`, `exchange-rate`, `calculation`       | Textbook Ch 9; Week8_Lecture1/2; Worksheet 8; Tutorial solutions week 10              |
| `ch10-005` | About 28 years                                 | Divide 70 by the growth rate written in percent units.                                                                               | `growth`, `compound-growth`, `calculation`   | Textbook Ch 10; Week9_Lecture1; Tutorial solutions week 10                            |
| `ch10-026` | `1.5%`                                         | Weighted input contribution is subtracted from output growth; contributions are percentage points but final TFP growth is a percent. | `growth-accounting`, `calculation`           | Textbook Ch 10; Week9_Lecture1; Tutorial solutions week 10                            |
| `ch10-027` | `4.2%`                                         | Add TFP and weighted input contributions as percentage points; final predicted output growth is a percent.                           | `growth-accounting`, `calculation`           | Textbook Ch 10; Week9_Lecture1; Tutorial solutions week 10                            |

## Runtime design

### Deterministic instances

`CalculationTemplate.instantiate(seed)` is React-independent. It uses the local
seeded PRNG only; the domain does not call `Math.random()`, `Date.now()`, or
browser crypto. The same template ID and seed reproduce the same parameters,
prompt, table, answer, and worked solution. The Practice Lab chooses the initial
session seed at the UI boundary. `New numbers` derives deterministic child
seeds from the session seed, slot index, refresh counter, and candidate attempt
for the same template. It searches for a different prompt/stimulus fingerprint
from every fingerprint already shown in that slot and resets the instance timer.

Instances are deeply frozen and retain `templateId`, `reviewCardId`,
`sourceCardIds`, seed, and generated parameters in memory. No instance,
parameter, seed, or numeric answer is added to `ReviewEvent` or persisted.

### Numeric input and grading

The parser accepts ordinary decimal entries, signed values, commas in valid
thousands groups, and a trailing `%` only when the answer unit is percent. It
does not evaluate expressions, fractions, exponent notation, symbolic algebra,
or unit conversions. A percent field displays `%` outside the input and expects
`5` for `5%`; a percentage-points field says `percentage points` and does not
accept a percent suffix.

Each template declares the answer unit, display unit, decimal places, and
rounding instruction. The generator calculates from full-precision parameters
and rounds only in the displayed worked answer. Default grading tolerance is
half of one unit in the final displayed decimal place, plus a tiny numerical
guard (for example, `0.005000001` for two decimal places). Equality is never
tested with fragile floating-point `===`.

Semantic units are a finite type-level set. Presentation labels remain
flexible: for example, a coefficient can use semantic unit
`currency_millions_per_percentage_point` while displaying `$ million per
percentage point`. In Chapter 10, the weighted capital and labour lines say
“percentage points”, but the final TFP and predicted output answers use
semantic unit `percent`, display `%`, and render final lines such as
`TFP growth = 1.50%`.

### Session selection

Sessions are seeded from `session seed + template ID + ordinal`. The selector
prefers one instance per `reviewCardId` when enough eligible concepts exist,
then fills a smaller chapter pool with fresh variants. It requires every
accepted instance to have an unseen prompt/stimulus fingerprint. A generous
deterministic search bound is used; exhaustion throws a clear error instead of
silently accepting a duplicate. The generated mode offers All chapters or
Chapters 1–10 and set sizes 5, 10, or 20; no misleading Chapter 0 option is
shown.

The Chapter 5 filter has one canonical concept but a 5 × 4 parameter grid for
the balanced-budget multiplier. A deterministic stress run over 100 session
seeds builds 20-question Chapter 5 sets with 20 distinct prompt/stimulus
fingerprints every time. The same fingerprint search is used for repeated
variants in other small chapter pools.

`New numbers` uses the same template and canonical review card, but searches
for content different from the current and previously shown fingerprint in
that slot. Regression coverage exercises ten successive refreshes for both
the finite Rule-of-70 space and the balanced-budget multiplier space. When a
set ends, the entire requested set is rebuilt; completed items are not kept
as stale entries for the next cycle.

If a finite space is exhausted, the domain search still fails clearly at its
10,000-attempt bound, but the Practice Lab catches that failure. The current
instance and input remain unchanged, an inline message explains that no more
unseen variants are available, and only that slot's New numbers action is
disabled. Submit, New set, filters, and format changes remain available when
the save lifecycle permits them. Base-set construction failures use a separate
inline callout rather than an uncaught render error.

### Save lifecycle and SRS mapping

The generated question lifecycle is `answering → pending_save → completed`.
Submit parses and grades the immutable current instance, creates one immutable
`ReviewEvent` payload, measures response time from `performance.now()`, and
persists before revealing the worked result. The payload is:

```text
cardId = instance.reviewCardId
mode = "calculation"
rating = null
correct = objective numeric result
selectedChoice = null
responseTimeMs = monotonic duration
```

On a save failure the prompt, parameters, input, correctness, response time,
and exact payload remain unchanged. Retry uses the same payload object; Next,
New numbers, filters, and set changes remain unavailable until persistence
succeeds. Invalid or empty input shows “Please enter a number.” and records no
review. New numbers before submission creates no review, preserves the same
canonical concept, changes the prompt/stimulus fingerprint, and resets the
timer. After the final question, Next starts a completely rebuilt set from a
fresh session seed; it never refreshes only the first item of a stale cycle.

The existing authored calculation MCQ flow remains available as a secondary
submode and continues to record its existing MCQ review evidence. Generated
reviews use only the existing ReviewEvent schema and ordinary calculation SRS
semantics.

## Answer-diversity audit

`npm run validate:calculations` samples 100 additional seeds per template and
prints distinct answers, distinct prompt/stimulus content, minimum and
maximum answer, and positive/negative/zero counts. Representative results from
the committed registry are below; table stimuli count as prompt variation even
when the short prompt sentence is shared.

| Template                               | Distinct answers | Distinct prompt/stimulus content |    Min |    Max | Positive / negative / zero |
| -------------------------------------- | ---------------: | -------------------------------: | -----: | -----: | -------------------------: |
| `generated-inventory-investment`       |               18 |                               83 |    -90 |     90 |                51 / 49 / 0 |
| `generated-real-gdp-fixed-base`        |               87 |                              100 |    760 |  5,780 |                100 / 0 / 0 |
| `generated-labour-statistics`          |               29 |                               92 |   6.25 |     50 |                100 / 0 / 0 |
| `generated-natural-rate-flows`         |               45 |                               53 |   4.76 |  42.86 |                100 / 0 / 0 |
| `generated-okun-law`                   |               65 |                               82 |   1.33 |   9.67 |                100 / 0 / 0 |
| `generated-fisher-effect`              |               25 |                               79 |     -6 |      8 |                59 / 35 / 6 |
| `generated-capital-accumulation`       |               11 |                               82 |      2 |     12 |                100 / 0 / 0 |
| `generated-simple-multiplier`          |               32 |                               36 |   -400 | 533.33 |                58 / 42 / 0 |
| `generated-open-economy-equilibrium`   |               83 |                              100 | 346.67 |  1,500 |                100 / 0 / 0 |
| `generated-balanced-budget-multiplier` |               19 |                               20 |   0.31 |   0.91 |                100 / 0 / 0 |
| `generated-bond-price`                 |               78 |                               78 |  74.77 | 291.26 |                100 / 0 / 0 |
| `generated-money-demand`               |               64 |                               64 |    384 |  1,588 |                100 / 0 / 0 |
| `generated-quantity-theory`            |               33 |                               83 |     -4 |     13 |                83 / 16 / 1 |
| `generated-corridor-floor`             |               47 |                               57 |      1 |    4.4 |                100 / 0 / 0 |
| `generated-reserve-demand`             |               34 |                               34 |    0.5 |    9.5 |                100 / 0 / 0 |
| `generated-expectations-hypothesis`    |               22 |                               74 |   1.25 |      7 |                100 / 0 / 0 |
| `generated-taylor-rule`                |               40 |                               69 |  -0.25 |   12.5 |                 94 / 2 / 4 |
| `generated-pae-with-real-rate`         |               23 |                              100 |    -35 |    400 |                46 / 54 / 0 |
| `generated-ad-substitution`            |               51 |                               97 |   -100 |    855 |                50 / 50 / 0 |
| `generated-aud-to-usd`                 |               78 |                               85 |     56 |  484.5 |                100 / 0 / 0 |
| `generated-usd-to-aud`                 |               46 |                               85 |     80 |    600 |                100 / 0 / 0 |
| `generated-cross-rate`                 |               40 |                               41 |   0.44 |   0.89 |                100 / 0 / 0 |
| `generated-loop-exchange-rate`         |               32 |                               41 |   0.17 |   0.83 |                100 / 0 / 0 |
| `generated-rule-of-70`                 |               14 |                               14 |   8.75 |  46.67 |                100 / 0 / 0 |
| `generated-tfp-growth`                 |               89 |                               99 |   -3.5 |    7.1 |                74 / 26 / 0 |
| `generated-output-growth-accounting`   |               79 |                               99 |     -1 |  11.53 |                 96 / 4 / 0 |

The audit confirms that no template relies on a single memorised answer. Where
a formula's answer is naturally one-directional (for example, bond price or
labour force), the numerical inputs still vary materially and the solution
requires the course operation. Sign-changing families intentionally include
both directions where the canonical concept supports them.

## Anti-memorisation review

| Template family                                     | Values varied                                   | Direction / sign treatment                                                         | Why wording does not leak the result                                                                                                                        |
| --------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inventory, real GDP                                 | Stocks; prices; quantities; good rows           | Inventory accumulation and rundown both occur                                      | Prompt gives levels and asks for the calculation; it does not state “change” or the sign.                                                                   |
| Labour statistics, natural-rate flows, Okun         | Population/rates; flows; gap/beta/natural rate  | Okun varies positive and negative gaps; rates remain valid                         | Intermediate LF/E/U or flow logic is required; no fixed answer pair is repeated.                                                                            |
| Fisher, capital accumulation                        | Nominal/real rates; K₀/I/K₁                     | Fisher includes positive, zero, and negative implied inflation                     | Learner must choose subtraction or stock equation from course knowledge.                                                                                    |
| Simple/open multipliers, balanced-budget multiplier | MPC; tax/import rates; autonomous spending      | Spending shock changes sign; multiplier values vary                                | Formula is not embedded as a result; worked solution reveals it only after save.                                                                            |
| Bond, money demand, quantity theory                 | Face value/rate; income/rate; growth rates      | Quantity-theory inflation can be negative; other constraints preserve valid values | Unit conventions are explicit, but the operation and result are not prefilled.                                                                              |
| Corridor, reserve, expectations, Taylor             | Target/width; rate; expected rates; signed gaps | Taylor response varies with both inflation and output gaps                         | Basis-point, percentage-point, and annualised conventions are labelled rather than inferred from old numbers.                                               |
| PAE and AD                                          | Equation coefficients and derivation target     | Intercept targets are positive; rate/inflation coefficients are negative           | The learner must combine terms or distribute the PRF; the full derived equation is shown only in the worked solution, and no point evaluation is requested. |
| Currency conversion, cross rate, LOOP               | AUD/USD/EUR quotes and prices                   | Reciprocal and cross directions are exercised                                      | Exact `USD/AUD` and `EUR/AUD` units make multiply/divide reasoning necessary.                                                                               |
| Rule of 70, growth accounting                       | Growth rates, factor growth, alpha              | TFP and output-growth residuals can be positive or negative                        | The learner must apply percent-unit formulas and weighted contributions.                                                                                    |

## Files and boundaries

Generated calculations are contained in `src/calculations/**`,
`src/components/calculations/**`, the focused Practice Lab branch in
`src/pages/PracticePage.tsx`, the dedicated validation script, tests, styles,
and this document. The following remain unchanged:

- `flashcards/MACRO1_master_flashcards.json` and readable/TSV exports;
- all `exam_questions/*.json` files;
- Study calculation selection and card rendering;
- full mock selection, manifests, attempts, results, and persistence;
- `ReviewEvent`, `MockAttempt`, IndexedDB, backup, progress repository, and sync
  code;
- sync-PR files including `src/db/database.ts`, `src/db/progressRepository.ts`,
  `src/db/mockExamRepository.ts`, `src/domain/backup.ts`,
  `src/app/ProgressProvider.tsx`, `src/pages/SettingsPage.tsx`, and deployment
  workflow files.

`npm run validate:calculations` is part of `prebuild`. CI workflow wiring is
intentionally left untouched to avoid a parallel-PR conflict; the ordinary
`npm run test` suite includes the registry, fuzz, grading, session, and UI
checks, and the build runs the dedicated validator.
