# Exam Question Bank Audit

This document records the content, stimulus, accessibility and validation audit for
the static exam-question bank. The JSON collections are the source of truth; this
report deliberately does not repeat all question text or graph specifications.

## Authoring principles

- The exam bank is a separate immutable content domain. Its questions review the
  current 354-card canonical deck without creating a second mastery system.
- Every question has exactly four directly comparable choices, one best answer, a
  general explanation, and a specific rationale for every choice.
- New questions use the supplied course deck, its notation and its model closures.
  Stems specify assumptions when the answer depends on closed versus small-open
  economies, PAE versus AE, the PRF AD model, or the USD/AUD exchange-rate convention.
- Distractors are based on source-card traps, sign errors, model confusion,
  stock/flow confusion, nominal/real confusion, numerator/denominator errors,
  multiplier omissions and realistic arithmetic mistakes.
- Stimuli are declarative data. No question stores SVG/HTML strings, calls a network
  chart service, generates distractors or invokes an LLM at runtime.

## Stimulus domain

`ExamQuestion.stimulus` is optional and is a discriminated union of `econ_graph` and
`table` specifications. `src/stimulus/model.ts` contains the explicit graph axes,
curves, points, reference lines, arrows, annotations and semantic table types.
`src/stimulus/validateStimulus.ts` fails loudly for malformed domains, coordinates,
curves, primitives, table dimensions, IDs and accessibility text.

Graphs render through ordinary React and responsive SVG in `EconGraph.tsx`; they use a
`viewBox`, direct labels, solid/dashed styles and labelled points so meaning does not
depend on colour. Every graph includes a figure caption, SVG title, description and
explicit accessible label. Tables render as native semantic HTML with captions,
column headers, bounded rows and an optional note.

## Provenance and review mapping

`src/exam/questionBank.ts` adapts every canonical card with authored four-choice MCQ
content directly from the canonical deck. It preserves the canonical front, choices,
correct index, explanation, topic, difficulty and tags. A small static map supplies
the style and four choice rationales without modifying the canonical JSON.

The original authored questions and the five targeted 2026 practice-test analogues remain in
`exam_questions/MACRO1_exam_questions.json`. The 24 newly authored Formula Application
analogues are in `exam_questions/MACRO1_formula_application_questions.json`; the 30
existing stimulus questions remain in `exam_questions/MACRO1_exam_stimulus_questions.json`.
The full bank now has 39 stimulus-bearing questions. All 166 authored questions
have `provenance: "authored_from_flashcards"`; each maps one primary
`reviewCardId`—the canonical concept most directly tested by a miss—and includes it
in `sourceCardIds`. Multiple representations of one concept are allowed and are
controlled at a maximum of two questions per review card. The unified mock selector
selects at most one question for a given `reviewCardId` in a single attempt and is
covered by the 1,000-seed invariant test.

## Canonical 354-card inventory

The inventory below was generated programmatically from
`flashcards/MACRO1_master_flashcards.json`, not inferred from the question prompt.

### Authored MCQs and chapter coverage

|   Chapter | Canonical cards | Valid authored MCQs | Calculation cards | High-yield cards |
| --------: | --------------: | ------------------: | ----------------: | ---------------: |
|         0 |              30 |                  30 |                 0 |                0 |
|         1 |              33 |                   1 |                 2 |                2 |
|         2 |              31 |                   0 |                 3 |                0 |
|         3 |              32 |                   0 |                 2 |                0 |
|         4 |              29 |                   0 |                 2 |                0 |
|         5 |              33 |                   0 |                 1 |                0 |
|         6 |              32 |                   0 |                 3 |                1 |
|         7 |              29 |                   0 |                 4 |                3 |
|         8 |              33 |                   0 |                 2 |                2 |
|         9 |              41 |                   0 |                 4 |                3 |
|        10 |              31 |                   0 |                 3 |                1 |
| **Total** |         **354** |              **31** |            **26** |           **12** |

The 31 valid authored MCQs are the 30 existing mixed Chapter 0 cards plus
`ch01-002`. The other 323 canonical cards have no authored four-choice MCQ.

### Cards by canonical kind

| Kind           |   Count |
| -------------- | ------: |
| recall         |     117 |
| formula        |      80 |
| scenario       |      59 |
| mcq            |      31 |
| calculation    |      26 |
| contrast       |      17 |
| relationship   |      14 |
| classification |       3 |
| sequence       |       6 |
| exam-trap      |       1 |
| **Total**      | **354** |

## Final unified bank

| Measure                              | Result |
| ------------------------------------ | -----: |
| Total questions                      |    197 |
| Canonical MCQs                       |     31 |
| New authored questions               |    166 |
| Stimulus-bearing questions           |     39 |
| Mixed questions (Chapter 0)          |     30 |
| Unique `reviewCardId` values         |    175 |
| Review cards with multiple questions |     22 |
| Maximum questions per `reviewCardId` |      2 |
| Calculation-style questions          |     65 |
| Graph stimuli                        |     20 |
| Table stimuli                        |     19 |

### Chapter and topic/stimulus matrix

| Chapter | Exam questions |            Stimuli | Representative coverage                                                       |
| ------: | -------------: | -----------------: | ----------------------------------------------------------------------------- |
|       1 |             16 | 2 graphs, 3 tables | Price-index inflation, value-added, real GDP and GDP deflator                 |
|       2 |             15 |  2 graphs, 1 table | Wage floor, labour-demand shift, unemployment and Okun gap                    |
|       3 |             16 | 2 graphs, 2 tables | Saving-investment equilibrium, Fisher, user cost and saving identity          |
|       4 |             14 |  2 graphs, 1 table | PAE/45-degree equilibrium, inventory pressure, open-economy multiplier        |
|       5 |             19 | 2 graphs, 3 tables | Fiscal multipliers, tax schedules, budget balance and debt                    |
|       6 |             16 |  2 graphs, 1 table | Bond price/yield, money demand, quantity equation and bank reserves           |
|       7 |             16 | 2 graphs, 2 tables | ES-balance demand/corridor, PRF shift, OMO arithmetic                         |
|       8 |             17 |  2 graphs, 1 table | AD/PRF derivation, anchored expectations, supply shock and output gap         |
|       9 |             19 | 2 graphs, 3 tables | FX demand, BOP/current account, peg intervention and real exchange rate       |
|      10 |             19 | 2 graphs, 2 tables | Cobb-Douglas MPK/MPL, living standards, growth accounting and TFP             |
|       0 |             30 |                  0 | Existing canonical cross-model and cross-chapter questions retained unchanged |

Every Chapter 1–10 has at least three stimulus questions, exceeding the minimum of two per
chapter. The graphs demonstrate labour supply/demand, saving/investment, PAE, bond
and money markets, ES balances, PRF, AD-AS, foreign exchange and production
functions. Tables cover GDP deflators, labour statistics, Fisher calculations,
multipliers, debt, bank reserves, ES transactions, output gaps, cross rates and
growth accounting. Stimulus variants may intentionally share a review card with an
existing text question when that is the concept actually tested.

### Stimulus mapping audit

This table is the semantic provenance audit for the original 31 stimulus questions. Supporting
cards remain in each JSON record where the graph, table, convention or calculation
genuinely uses them.

| Question             | Primary card | Canonical topic                   |
| -------------------- | ------------ | --------------------------------- |
| `auth-stim-ch01-001` | `ch01-019`   | Inflation                         |
| `auth-stim-ch01-002` | `ch01-025`   | Business cycle                    |
| `auth-stim-ch01-003` | `ch01-017`   | GDP deflator                      |
| `auth-stim-ch02-001` | `ch02-027`   | Wage floor                        |
| `auth-stim-ch02-002` | `ch02-025`   | Labour demand shift               |
| `auth-stim-ch02-003` | `ch02-004`   | Unemployment rate                 |
| `auth-stim-ch03-001` | `ch03-028`   | Closed-economy equilibrium        |
| `auth-stim-ch03-002` | `ch03-020`   | Investment demand                 |
| `auth-stim-ch03-003` | `ch03-005`   | Ex-post vs expected real rate     |
| `auth-stim-ch04-001` | `ch04-016`   | PAE shift                         |
| `auth-stim-ch04-002` | `ch04-006`   | Disequilibrium inventories        |
| `auth-stim-ch04-003` | `ch04-022`   | Open-economy multiplier           |
| `auth-stim-ch05-001` | `ch05-007`   | Government spending multiplier    |
| `auth-stim-ch05-002` | `ch05-026`   | Debt stabilisation                |
| `auth-stim-ch05-003` | `ch05-024`   | Debt-to-GDP ratio                 |
| `auth-stim-ch06-001` | `ch06-004`   | Bond price and interest rate      |
| `auth-stim-ch06-002` | `ch06-012`   | Money demand                      |
| `auth-stim-ch06-003` | `ch06-020`   | Reserve-deposit ratio             |
| `auth-stim-ch07-001` | `ch07-009`   | Reserve demand                    |
| `auth-stim-ch07-002` | `ch07-027`   | PRF shift                         |
| `auth-stim-ch07-003` | `ch07-013`   | Government payments and ESAs      |
| `auth-stim-ch08-001` | `ch08-008`   | AD shift                          |
| `auth-stim-ch08-002` | `ch08-023`   | Favourable supply shock           |
| `auth-stim-ch08-003` | `ch08-016`   | Inflation dynamics                |
| `auth-stim-ch09-001` | `ch09-031`   | FX shift                          |
| `auth-stim-ch09-002` | `ch09-036`   | Overvalued peg                    |
| `auth-stim-ch09-003` | `ch09-021`   | Cross rate                        |
| `auth-ch09-013`      | `ch09-002`   | Current-account composition table |
| `auth-stim-ch10-001` | `ch10-011`   | Diminishing marginal product      |
| `auth-stim-ch10-002` | `ch10-015`   | Capital deepening                 |
| `auth-stim-ch10-003` | `ch10-025`   | Growth accounting                 |

## Style distribution

| Style                | Unified | New authored | Unified share |
| -------------------- | ------: | -----------: | ------------: |
| concept              |      42 |           36 |         21.3% |
| scenario             |      46 |           38 |         23.4% |
| calculation          |      65 |           58 |         33.0% |
| model discrimination |      31 |           25 |         15.7% |
| sequence             |      13 |            9 |          6.6% |
| **Total**            | **197** |      **166** |      **100%** |

The chapter-specific pool therefore stays close to the intended concept/scenario/
calculation/model mix. The sequence remainder is used for mechanism and debt-path
questions where ordering is the examinable skill.

## Difficulty and answer positions

| Difficulty |   Count |    Share |
| ---------: | ------: | -------: |
|          1 |      56 |    28.4% |
|          2 |     103 |    52.3% |
|          3 |      38 |    19.3% |
|  **Total** | **197** | **100%** |

The unified shares remain inside the configured 25–35%, 45–55% and 15–25% target
ranges. The current 39 stimulus questions contribute 10 / 20 / 9 at difficulties
1 / 2 / 3; graph reading is not automatically treated as advanced.

| Correct position | Unified | Additional stimuli |
| ---------------- | ------: | -----------------: |
| A                |      49 |                  6 |
| B                |      51 |                  6 |
| C                |      49 |                  6 |
| D                |      48 |                  6 |

The unified maximum-minus-minimum position count is 2. Positions remain static and
are not randomised at runtime.

## Validation infrastructure

`src/exam/validateQuestionBank.ts` validates individual questions and whole-bank
invariants. It fails loudly for malformed IDs, chapters, styles, difficulty values,
stems, choices, rationales, correct indexes, tags, provenance, unknown canonical
cards, missing review mappings, duplicate question IDs, more than two questions
mapped to one review card, duplicate normalised choices, duplicate normalised stems
and duplicate authored choice sets. Duplicate `reviewCardId` values are intentional
and reported rather than rejected.

The stimulus validator additionally enforces:

- finite, strictly increasing axis domains and in-domain ticks;
- nonempty graph titles/descriptions and at least one meaningful primitive;
- unique curve IDs, at least two curve points, in-domain finite coordinates and
  increasing curve x-coordinates;
- valid interpolation and line styles;
- unique point/reference-line/arrow/annotation IDs and in-domain primitive positions;
- two to six unique table columns with nonempty labels;
- two to twelve uniquely identified rows with exactly the declared cell count;
- nonempty table cells, captions and optional notes.

The bank-level validator enforces:

- at least 160 questions;
- at least 20 graph stimuli and 10 table stimuli;
- at least two stimulus questions in every Chapter 1–10;
- at least 10 chapter-specific questions in every Chapter 1–10 and at least 30 mixed;
- unique question IDs;
- review-card variant cap of two, with duplicate-group and maximum-variant statistics;
- answer-position imbalance no greater than 3;
- the configured difficulty ranges; and
- deterministic lexical-overlap warnings for high stem similarity.

The content command is:

```text
npm run validate:exam-questions
```

The current validator output is:

```text
Exam question bank valid
Total: 197
Canonical MCQ: 31
New authored: 166
Mixed: 30
Chapter 1: 14
Chapter 2: 14
Chapter 3: 13
Chapter 4: 13
Chapter 5: 14
Chapter 6: 15
Chapter 7: 15
Chapter 8: 14
Chapter 9: 16
Chapter 10: 15
Stimuli: 39 (graphs 20 / tables 19)
Chapter 1 stimuli: 5
Chapter 2 stimuli: 3
Chapter 3 stimuli: 4
Chapter 4 stimuli: 3
Chapter 5 stimuli: 5
Chapter 6 stimuli: 3
Chapter 7 stimuli: 4
Chapter 8 stimuli: 3
Chapter 9 stimuli: 5
Chapter 10 stimuli: 4
Styles: concept 42 / scenario 46 / calculation 65 / model 31 / sequence 13
Difficulty: 1 56 / 2 103 / 3 38
Correct positions: A 49 / B 51 / C 49 / D 48
Calculation questions: 65
Unique reviewCardId: 175
Review cards with multiple questions: 22
Maximum questions per reviewCardId: 2
Warnings: none
```

## Content and stimulus review pass

I performed a separate second pass over the original 31 stimulus questions in addition to
the original 100-question audit. It checked economic correctness, one-best-answer
quality, distractor plausibility, source-card consistency, model closure, signs and
units, arithmetic, wording cues, semantic duplication, graph scale and table units.
Particular scrutiny was given to:

- whether marked PAE, saving-investment, FX and AD equilibria lie on the displayed
  curves, and whether the repaired horizontal inflation-line intersections are
  geometrically valid;
- USD/AUD quotation direction, fixed-peg intervention, cross-rate units and ES-balance
  transaction signs;
- 45-degree geometry, curve-shift versus movement wording, wage-floor quantities,
  bond-price/yield direction, money-demand direction and the real-rate PRF
  convention; and
- production-function concavity, capital-deepening interpretation and growth-accounting
  weights.

A stimulus-aware blind-answer pass was performed after this hardening pass for the original 31
stimulus questions using the stem, declarative graph/table data (including rendered
labels/captions) and choices without consulting `correctChoice`. The independently
selected answers matched all 31 keys. The pass also checked that titles, captions,
notes and accessible descriptions did not add the economic inference being tested.
The earlier PR #4 blind pass over the original 100 authored questions also remains
documented in this audit history.

The mapping pass corrected the wage-floor, investment-demand, PAE-shift,
government-spending-multiplier, output-gap/inflation, and cross-rate primaries. It
also removed source-card IDs that were only adjacent rather than genuinely used.
The Chapter 8 supply-shock graph now uses the course's horizontal inherited-
inflation lines, and the PRF graph now labels the course's real policy rate.

The all-20-graph course-convention pass checked axes, orientation, notation,
equilibrium geometry and model closure. In particular, the PAE figures use PAE and
the 45-degree identity rather than an AE shortcut; saving/investment uses the closed-
economy real-rate market; Chapter 7 uses ES balances, the cash-rate corridor and the
real-rate PRF; Chapter 8 uses the course horizontal short-run inflation lines; and
Chapter 9 uses e = USD/AUD with the corresponding appreciation and peg-intervention
directions. The distractor pass also replaced the impossible unmarked “E” option in
`auth-stim-ch01-002` with graph-reading errors that refer to the marked observations.

The title/caption leakage pass neutralised answer-bearing labels including the
labour-demand-shift, investment-shift, PAE-disequilibrium, PRF-shift, AD-shift,
supply-shock and overvalued-peg titles. Captions and notes that only identify the
data or state a necessary calculation convention were retained.

For visual QA, a temporary local gallery rendered all 20 graphs and 10 tables. I
inspected the graph set in the desktop preview and checked every stimulus at a
constrained approximately 360px content width for label clipping, curve/point
alignment, table wrapping and horizontal overflow. The preview’s direct viewport
resize control timed out in this environment, so the mobile check used an exact 360px
content-width constraint rather than claiming a different browser viewport. The audit
found and fixed long corridor labels, small mobile SVG typography and table header
wrapping; the final constrained gallery had zero stimulus-container overflow.

## Source-card issues and limitations

No canonical content files were edited. The canonical deck itself flags two items for
independent review:

1. `ch03-011` notes an extracted-course-text plus/minus typo in the capital
   accumulation equation; the lectures and economic logic use depreciation with a
   minus sign. That disputed card is not used as a review mapping in the new bank.
2. `ch05-004` notes a likely typo in a bracketed source answer for consumption with
   proportional taxes. The stimulus bank does not map a question to that card.

The validator uses lightweight lexical similarity rather than an embedding model, so
semantic near-duplicates still require human review. The bank is content-audited but
not psychometrically calibrated against student response data. Mock selection, timing,
results, persistence, Study integration and Exam-SRS feedback are intentionally not
part of this PR.

## Automated tests

The exam-bank tests cover loading and determinism, malformed four-choice data, invalid
answer indexes, duplicate choices, unknown review/source cards, missing review
mappings, duplicate question IDs, allowed review-card variants and the two-question
variant cap, chapter/mixed quotas, graph/table/per-chapter stimulus quotas,
answer-position imbalance, canonical-adapter fidelity, corrected stimulus mappings,
course-specific horizontal inflation-line and real-rate PRF geometry, malformed
graph/table structures and representative economics geometry. Renderer tests cover
graph SVG primitives, labels, styles, accessibility, annotations, semantic table
structure and the no-stimulus case.

The current full local suite is 53 test files and 460 tests. The additional Formula
Application and Super Cram validators/tests are reported in the continuation below.

## Super Cram / Formula Application continuation

The Formula Application lane adds 24 original authored analogues in
`MACRO1_formula_application_questions.json`. They use changed numbers, names,
wording and distractor phrasing; they are not copied official questions. Their
metadata records the observed practice-test form and scoped source ID, not textual
provenance or a final-exam weighting claim.

The curated set contains 45 questions: 24 newly authored and 21 strong existing
calculation questions reused. It has 13 stimulus questions (all declarative tables or
existing calculation stimuli), and its chapter distribution is:

| Chapters | Curated questions |
| -------- | ----------------: |
| 1–4      |                14 |
| 5–7      |                14 |
| 8–10     |                17 |

The 26 broad formula families and 39 fine-grained formula coverage units cover value
added, base-year real GDP, Okun output gaps,
Fisher rates, investment user cost, national saving, PAE equilibrium, fiscal
arithmetic, tax schedules, debt financing, quantity theory, bond/return/corridor
arithmetic, ESA transactions, the course-specific AD/PRF chain, FX conversion and
real exchange rates, BOP/current-account tables, fixed-peg intervention, small-open
accounting, Cobb-Douglas output and MPK/MPL, growth accounting, and capital
deepening versus TFP. The validator checks the 32-question minimum, 16-new-question
minimum, chapter minimums, four-choice/rationale bank invariants, and the two-question
review-card cap.

The pure MPK/MPL formula-recognition item `auth-ch10-011` is now `concept` style and
is excluded from Formula Application. Numeric MPL and MPK application are separate
items (`auth-form-ch10-013` and `auth-form-ch10-014`).

### Formula Application semantic correction pass

The complete 45-question curated set was independently audited after the initial
bank validation. For each item the reviewer selected the intended formula, extracted
the supplied values, recomputed the result, checked the stored key and every
distractor rationale, and checked that declarative stimulus captions/notes did not
reveal the answer. The independent expected-key record is kept in
src/superCram/formulaAudit.ts; it is not generated from the question
correctChoice field.

The most convention-sensitive checks were:

- exact Fisher: (1.08 / 1.03) - 1 = 4.85%;
- user cost: (0.05 + 0.10) x $100 = $15, so only the first table machine is
  purchased;
- four-sector multiplier: 1 / [1 - 0.80(1 - 0.25) + 0.10] = 2.00;
- fiscal gap closure: $200m / 2.5 = $80m;
- government borrowing: $250m + $50m + 0.05($1,000m) - $200m = $150m;
- PAE/PRF: r = 4, then Y = 440, and the derived AD form is Y = 420 - 16pi;
- real FX: under the course quote q = e P_home / P_foreign,
  0.8 x 110 / 100 = 0.88;
- fixed peg: supply minus demand is 180 - 120 = $60m, requiring the authority
  to buy domestic currency and sell reserves;
- BOP: 1,000 - 3,500 - 1,200 = -$3,700m;
- Cobb-Douglas: MPL = (1 - 0.35)1,200/60 = 13 and
  MPK = 0.35(1,200)/100 = 4.2; and
- growth accounting: 2% + 0.3(6%) + 0.7(1%) = 4.5%.

Four confirmed errors were corrected: auth-form-ch08-013 now keys 2%; auth-form-
ch09-016 uses the current-course real-FX convention and keys 0.88; auth-form-
ch05-013 is a true four-sector multiplier with nonzero import leakage; and
auth-form-ch10-016 now applies y = A k^0.5 numerically to distinguish capital
deepening from TFP. The pure MPK/MPL recognition item auth-ch10-011 remains
concept style and outside Formula Application.

The Formula Application validator now requires four choices and rationales,
review-card/source-card consistency, valid operations metadata, and at least one
genuine application operation (rearrange, substitute, calculate or sign/units).
This is separate from the bank's existing blind/stimulus and two-question
review-card audits.
