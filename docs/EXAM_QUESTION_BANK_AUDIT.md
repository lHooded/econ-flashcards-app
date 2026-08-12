# Exam Question Bank Audit

This document records the content, stimulus, accessibility and validation audit for
the static exam-question bank. The JSON collections are the source of truth; this
report deliberately does not repeat all question text or graph specifications.

## Authoring principles

- The exam bank is a separate immutable content domain. Its questions review the
  current 352-card canonical deck without creating a second mastery system.
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

The original authored questions and the seven new high-yield analogues remain in
`exam_questions/MACRO1_exam_questions.json`. The 30 additional stimulus questions are
in `exam_questions/MACRO1_exam_stimulus_questions.json`. All 137 authored questions
have `provenance: "authored_from_flashcards"`; each maps one primary
`reviewCardId`—the canonical concept most directly tested by a miss—and includes it
in `sourceCardIds`. Multiple representations of one concept are allowed and are
controlled at a maximum of two questions per review card. The future mock selector,
which is deliberately not implemented here, must select at most one question for a
given `reviewCardId` in a single attempt.

## Canonical 352-card inventory

The inventory below was generated programmatically from
`flashcards/MACRO1_master_flashcards.json`, not inferred from the question prompt.

### Authored MCQs and chapter coverage

| Chapter | Canonical cards | Valid authored MCQs | Calculation cards | High-yield cards |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 30 | 30 | 0 | 0 |
| 1 | 33 | 1 | 2 | 2 |
| 2 | 31 | 0 | 3 | 0 |
| 3 | 32 | 0 | 2 | 0 |
| 4 | 29 | 0 | 2 | 0 |
| 5 | 33 | 0 | 1 | 0 |
| 6 | 32 | 0 | 3 | 1 |
| 7 | 29 | 0 | 4 | 3 |
| 8 | 32 | 0 | 2 | 1 |
| 9 | 41 | 0 | 4 | 3 |
| 10 | 30 | 0 | 3 | 0 |
| **Total** | **352** | **31** | **26** | **10** |

The 31 valid authored MCQs are the 30 existing mixed Chapter 0 cards plus
`ch01-002`. The other 321 canonical cards have no authored four-choice MCQ.

### Cards by canonical kind

| Kind | Count |
| --- | ---: |
| recall | 117 |
| formula | 79 |
| scenario | 59 |
| mcq | 31 |
| calculation | 26 |
| contrast | 16 |
| relationship | 14 |
| classification | 3 |
| sequence | 6 |
| exam-trap | 1 |
| **Total** | **352** |

## Final unified bank

| Measure | Result |
| --- | ---: |
| Total questions | 168 |
| Canonical MCQs | 31 |
| New authored questions | 137 |
| Additional stimulus questions | 30 |
| Mixed questions (Chapter 0) | 30 |
| Unique `reviewCardId` values | 164 |
| Review cards with multiple questions | 4 |
| Maximum questions per `reviewCardId` | 2 |
| Calculation-style questions | 38 |
| Graph stimuli | 20 |
| Table stimuli | 10 |

### Chapter and topic/stimulus matrix

| Chapter | Exam questions | Stimuli | Representative coverage |
| ---: | ---: | ---: | --- |
| 1 | 14 total / 13 new | 2 graphs, 1 table | Price-index inflation, business-cycle position, GDP deflator |
| 2 | 14 | 2 graphs, 1 table | Wage floor, labour-demand shift, unemployment rate |
| 3 | 13 | 2 graphs, 1 table | Saving-investment equilibrium, investment demand, expected real rate |
| 4 | 13 | 2 graphs, 1 table | PAE/45-degree equilibrium, inventory pressure, open-economy multiplier |
| 5 | 13 | 2 graphs, 1 table | Fiscal PAE shift, debt-to-GDP dynamics, debt ratio |
| 6 | 15 | 2 graphs, 1 table | Bond price/yield, money demand, bank reserves, money destruction |
| 7 | 15 | 2 graphs, 1 table | ES-balance demand/corridor, PRF shift, cash-rate security transmission |
| 8 | 13 | 2 graphs, 1 table | AD shift, favourable supply shock, output gap |
| 9 | 15 | 2 graphs, 1 table | AUD FX demand, TWI, overvalued peg, cross-rate conversion |
| 10 | 13 | 2 graphs, 1 table | Production function, capital deepening, growth accounting |
| 0 | 30 | 0 | Existing canonical cross-model and cross-chapter questions retained unchanged |

Every Chapter 1–10 has three stimulus questions, exceeding the minimum of two per
chapter. The graphs demonstrate labour supply/demand, saving/investment, PAE, bond
and money markets, ES balances, PRF, AD-AS, foreign exchange and production
functions. Tables cover GDP deflators, labour statistics, Fisher calculations,
multipliers, debt, bank reserves, ES transactions, output gaps, cross rates and
growth accounting. Stimulus variants may intentionally share a review card with an
existing text question when that is the concept actually tested.

### Stimulus mapping audit

This table is the semantic provenance audit for all 30 stimulus questions. Supporting
cards remain in each JSON record where the graph, table, convention or calculation
genuinely uses them.

| Question | Primary card | Canonical topic |
| --- | --- | --- |
| `auth-stim-ch01-001` | `ch01-019` | Inflation |
| `auth-stim-ch01-002` | `ch01-025` | Business cycle |
| `auth-stim-ch01-003` | `ch01-017` | GDP deflator |
| `auth-stim-ch02-001` | `ch02-027` | Wage floor |
| `auth-stim-ch02-002` | `ch02-025` | Labour demand shift |
| `auth-stim-ch02-003` | `ch02-004` | Unemployment rate |
| `auth-stim-ch03-001` | `ch03-028` | Closed-economy equilibrium |
| `auth-stim-ch03-002` | `ch03-020` | Investment demand |
| `auth-stim-ch03-003` | `ch03-005` | Ex-post vs expected real rate |
| `auth-stim-ch04-001` | `ch04-016` | PAE shift |
| `auth-stim-ch04-002` | `ch04-006` | Disequilibrium inventories |
| `auth-stim-ch04-003` | `ch04-022` | Open-economy multiplier |
| `auth-stim-ch05-001` | `ch05-007` | Government spending multiplier |
| `auth-stim-ch05-002` | `ch05-026` | Debt stabilisation |
| `auth-stim-ch05-003` | `ch05-024` | Debt-to-GDP ratio |
| `auth-stim-ch06-001` | `ch06-004` | Bond price and interest rate |
| `auth-stim-ch06-002` | `ch06-012` | Money demand |
| `auth-stim-ch06-003` | `ch06-020` | Reserve-deposit ratio |
| `auth-stim-ch07-001` | `ch07-009` | Reserve demand |
| `auth-stim-ch07-002` | `ch07-027` | PRF shift |
| `auth-stim-ch07-003` | `ch07-013` | Government payments and ESAs |
| `auth-stim-ch08-001` | `ch08-008` | AD shift |
| `auth-stim-ch08-002` | `ch08-023` | Favourable supply shock |
| `auth-stim-ch08-003` | `ch08-016` | Inflation dynamics |
| `auth-stim-ch09-001` | `ch09-031` | FX shift |
| `auth-stim-ch09-002` | `ch09-036` | Overvalued peg |
| `auth-stim-ch09-003` | `ch09-021` | Cross rate |
| `auth-stim-ch10-001` | `ch10-011` | Diminishing marginal product |
| `auth-stim-ch10-002` | `ch10-015` | Capital deepening |
| `auth-stim-ch10-003` | `ch10-025` | Growth accounting |

## Style distribution

| Style | Unified | New authored | Unified share |
| --- | ---: | ---: | ---: |
| concept | 41 | 35 | 24.4% |
| scenario | 45 | 37 | 26.8% |
| calculation | 38 | 31 | 22.6% |
| model discrimination | 31 | 25 | 18.5% |
| sequence | 13 | 9 | 7.7% |
| **Total** | **168** | **137** | **100%** |

The chapter-specific pool therefore stays close to the intended concept/scenario/
calculation/model mix. The sequence remainder is used for mechanism and debt-path
questions where ordering is the examinable skill.

## Difficulty and answer positions

| Difficulty | Count | Share |
| ---: | ---: | ---: |
| 1 | 53 | 31.5% |
| 2 | 83 | 49.4% |
| 3 | 32 | 19.0% |
| **Total** | **168** | **100%** |

The unified shares remain inside the configured 25–35%, 45–55% and 15–25% target
ranges. The 30 stimulus questions contribute 10 / 15 / 5 at difficulties 1 / 2 / 3;
graph reading is not automatically treated as advanced.

| Correct position | Unified | Additional stimuli |
| --- | ---: | ---: |
| A | 43 | 7 |
| B | 43 | 9 |
| C | 42 | 7 |
| D | 40 | 7 |

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

The final validator output is:

```text
Exam question bank valid
Total: 168
Canonical MCQ: 31
New authored: 137
Mixed: 30
Chapter 1: 14
Chapter 2: 14
Chapter 3: 13
Chapter 4: 13
Chapter 5: 13
Chapter 6: 15
Chapter 7: 15
Chapter 8: 13
Chapter 9: 15
Chapter 10: 13
Stimuli: 30 (graphs 20 / tables 10)
Chapter 1 stimuli: 3
Chapter 2 stimuli: 3
Chapter 3 stimuli: 3
Chapter 4 stimuli: 3
Chapter 5 stimuli: 3
Chapter 6 stimuli: 3
Chapter 7 stimuli: 3
Chapter 8 stimuli: 3
Chapter 9 stimuli: 3
Chapter 10 stimuli: 3
Styles: concept 41 / scenario 45 / calculation 38 / model 31 / sequence 13
Difficulty: 1 53 / 2 83 / 3 32
Correct positions: A 43 / B 43 / C 42 / D 40
Calculation questions: 38
Unique reviewCardId: 164
Review cards with multiple questions: 4
Maximum questions per reviewCardId: 2
Warnings: none
```

## Content and stimulus review pass

I performed a separate second pass over the 30 new stimulus questions in addition to
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

A stimulus-aware blind-answer pass was performed after this hardening pass for all 30
stimulus questions using the stem, declarative graph/table data (including rendered
labels/captions) and choices without consulting `correctChoice`. The independently
selected answers matched all 30 keys. The pass also checked that titles, captions,
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

The final local suite is 15 test files and 112 tests.
