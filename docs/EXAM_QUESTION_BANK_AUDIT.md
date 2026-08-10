# Exam Question Bank Audit

This document records the content and validation audit for the static exam-question
bank. The JSON file is the source of truth; this report deliberately does not repeat
all question text.

## Authoring principles

- The exam bank is a separate immutable content domain. The canonical flashcard deck
  remains unchanged.
- Every question has exactly four directly comparable choices, one best answer, a
  general explanation, and a specific rationale for every choice.
- New questions are authored from the supplied course deck and use the course’s
  notation and model closures. Stems specify assumptions when the answer depends on
  them, especially for closed versus small-open economies, PAE versus AE, the PRF AD
  model, and the USD/AUD exchange-rate convention.
- Distractors are based on source-card traps, sign errors, model confusion,
  stock/flow confusion, nominal/real confusion, numerator/denominator errors,
  multiplier omissions, and realistic arithmetic mistakes.
- There is no runtime LLM generation, API call, random distractor synthesis, or
  network dependency in the question-bank loader.

## Provenance and review mapping

`src/exam/questionBank.ts` adapts every canonical card with authored four-choice MCQ
content directly from the canonical deck. It preserves the canonical front, choices,
correct index, explanation, topic, difficulty and tags. A small static map supplies
the style and four choice rationales without modifying the canonical JSON.

The 100 new questions are stored in
`exam_questions/MACRO1_exam_questions.json` with
`provenance: "authored_from_flashcards"`. Each question has one globally unique
`reviewCardId`, and that ID is included in `sourceCardIds`. The combined bank has no
review-card mapping exceptions.

## Canonical 349-card inventory

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
| 6 | 31 | 0 | 3 | 1 |
| 7 | 28 | 0 | 4 | 3 |
| 8 | 32 | 0 | 2 | 1 |
| 9 | 40 | 0 | 4 | 3 |
| 10 | 30 | 0 | 3 | 0 |
| **Total** | **349** | **31** | **26** | **10** |

The 31 valid authored MCQs are the 30 existing mixed Chapter 0 cards plus
`ch01-002`. The other 318 canonical cards have no authored four-choice MCQ.

### Cards by canonical kind

| Kind | Count |
| --- | ---: |
| recall | 117 |
| formula | 79 |
| scenario | 58 |
| mcq | 31 |
| calculation | 26 |
| contrast | 16 |
| relationship | 14 |
| classification | 3 |
| sequence | 4 |
| exam-trap | 1 |
| **Total** | **349** |

## Final unified bank

| Measure | Result |
| --- | ---: |
| Total questions | 131 |
| Canonical MCQs | 31 |
| New authored questions | 100 |
| Mixed questions (Chapter 0) | 30 |
| Unique `reviewCardId` values | 131 |
| Calculation-style questions | 28 |

### Chapter and topic matrix

| Chapter | Chapter-specific exam questions | Main concepts represented in the new authored set |
| ---: | ---: | --- |
| 1 | 11 total / 10 new | GDP and imports, value added, inventories, GDP/GNI, real GDP, CPI/deflator, growth and inflation/deflation |
| 2 | 10 | Labour statistics, steady-state unemployment, output gaps, MPL/VMPL, labour-demand and supply shifts, wage floors, tax wedges |
| 3 | 10 | Exact and expected real rates, zero lower bound, stocks/flows, capital accumulation, user cost, investment demand, public saving, closed-economy adjustment, housing |
| 4 | 10 | AE versus PAE, inventories, MPC, equilibrium, multiplier comparative statics, open-economy PAE, paradox of thrift, leakages/injections |
| 5 | 10 | Taxes, four-sector PAE, tax leakage, automatic stabilisers, policy lags, debt stocks/flows, debt sustainability, four-sector multiplier |
| 6 | 10 | Asset returns, bond pricing, money functions/demand, bank balance sheets and lending, liquidity/solvency, quantity identity versus theory |
| 7 | 10 | RBA target, cash rate, ES balances, corridor arithmetic, open-market operations, interbank settlement, transmission, expectations, Taylor rule, PRF |
| 8 | 10 | PAE/output/AD derivation, AD movements and shifts, supply shocks, inflation dynamics, self-correction, potential output and financial crises |
| 9 | 10 | Current account/BOP, small-open-economy financing, PPP limitations, currency conversion/cross rates, real exchange rates, FX transmission |
| 10 | 10 | GDP per capita, compounding, rule of 70, TFP, diminishing MPK, output per worker, ideas, institutions, catch-up growth |
| 0 | 30 mixed | Existing canonical cross-model and cross-chapter discrimination questions retained unchanged through the adapter |

## Style distribution

The unified distribution is:

| Style | Unified | New authored | Unified share |
| --- | ---: | ---: | ---: |
| concept | 31 | 25 | 23.7% |
| scenario | 35 | 27 | 26.7% |
| calculation | 28 | 21 | 21.4% |
| model discrimination | 28 | 22 | 21.4% |
| sequence | 9 | 5 | 6.9% |
| **Total** | **131** | **100** | **100%** |

The 101 chapter-specific questions (including the canonical Chapter 1 MCQ) are
spread across concepts, applications, calculations, model discrimination and
mechanism sequences rather than concentrating ten items on one formula. The
canonical deck’s 26 calculation-kind cards are inventory context; the exam bank
contains 21 new calculation-style questions plus seven canonical MCQs classified as
calculation-style, for a final calculation-style count of 28.

## Difficulty and answer positions

| Difficulty | Count | Share |
| ---: | ---: | ---: |
| 1 | 43 | 32.8% |
| 2 | 66 | 50.4% |
| 3 | 22 | 16.8% |
| **Total** | **131** | **100%** |

The authored subset is 25 / 53 / 22 at difficulties 1 / 2 / 3. The unified shares
are inside the configured 25–35%, 45–55% and 15–25% target ranges.

| Correct position | Unified | New authored |
| --- | ---: | ---: |
| A | 34 | 31 |
| B | 32 | 21 |
| C | 33 | 21 |
| D | 32 | 27 |

The unified maximum-minus-minimum position count is 2; answer positions are static
and are not randomised at runtime.

## Validation infrastructure

`src/exam/validateQuestionBank.ts` validates individual questions and whole-bank
invariants. It fails loudly for malformed IDs, chapters, styles, difficulty values,
stems, choices, rationales, correct indexes, tags, provenance, unknown canonical
cards, missing review mappings, duplicate question IDs, duplicate review-card IDs,
duplicate normalised choices, duplicate normalised stems, and duplicate authored
choice sets.

The bank-level validator enforces:

- at least 130 questions;
- at least 10 chapter-specific questions in every Chapter 1–10;
- at least 30 mixed questions;
- unique question IDs and globally unique review-card mappings;
- answer-position imbalance no greater than 3;
- the configured difficulty ranges;
- deterministic lexical-overlap warnings for high stem similarity.

The content command is:

```text
npm run validate:exam-questions
```

The final validator output is:

```text
Exam question bank valid
Total: 131
Canonical MCQ: 31
New authored: 100
Mixed: 30
Chapter 1: 11
Chapter 2: 10
Chapter 3: 10
Chapter 4: 10
Chapter 5: 10
Chapter 6: 10
Chapter 7: 10
Chapter 8: 10
Chapter 9: 10
Chapter 10: 10
Styles: concept 31 / scenario 35 / calculation 28 / model 28 / sequence 9
Difficulty: 1 43 / 2 66 / 3 22
Correct positions: A 34 / B 32 / C 33 / D 32
Calculation questions: 28
Unique reviewCardId: 131
Warnings: none
```

## Content review pass

I performed a separate manual second pass over all 100 new questions. The review
checked economic correctness, one-best-answer quality, distractor plausibility,
source-card consistency, model closure, signs and units, arithmetic, wording cues,
and semantic duplication. Particular scrutiny was given to:

- PAE versus the ex-post AE identity and the different Chapter 3 closed-economy
  versus Chapter 9 small-open-economy interest-rate closures;
- the course’s USD/AUD convention, real exchange-rate formula, PPP direction and
  foreign-exchange transmission;
- RBA cash-rate and Exchange Settlement terminology;
- nominal versus real rates, exact versus approximate Fisher calculations, and
  stock-versus-flow distinctions;
- tax leakage, public saving, debt-to-GDP signs, multipliers and percentage-point
  arithmetic;
- potential output, AD movements versus shifts, supply shocks and long-run
  self-correction; and
- TFP, diminishing returns, institutions and catch-up growth.

I also performed a blind-answer pass over all 100 authored questions by reviewing
each stem and its four choices without displaying the stored `correctChoice` key,
then comparing the independently selected best answer with the key. No disagreement
remained after the review.

## Source-card issues and limitations

No canonical content files were edited. The canonical deck itself flags two items
for independent review:

1. `ch03-011` notes an extracted-course-text plus/minus typo in the capital
   accumulation equation; the lectures and economic logic use depreciation with a
   minus sign. That disputed card is not used as a review mapping in the new bank.
2. `ch05-004` notes a likely typo in a bracketed source answer for consumption with
   proportional taxes. The new bank does not map a question to that card; the
   four-sector PAE item instead uses the independent `ch05-031` source.

The validator uses lightweight lexical similarity rather than an embedding model, so
semantic near-duplicates still require human review. The bank is content-audited but
not psychometrically calibrated against student response data. Mock selection,
timing, results, persistence and Exam-SRS feedback are intentionally not part of this
PR.

## Automated tests

The exam-bank test file covers loading and determinism, malformed four-choice data,
invalid answer indexes, duplicate choices, unknown review/source cards, missing
review mappings, duplicate question IDs, duplicate review-card mappings, chapter and
mixed quotas, answer-position imbalance, and canonical-adapter fidelity. The full
suite at this audit point is 14 test files and 91 tests.
