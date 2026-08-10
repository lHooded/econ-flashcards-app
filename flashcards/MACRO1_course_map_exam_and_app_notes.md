# Macroeconomics exam synthesis and flashcard design

## Exam constraints found in the uploaded material

- **60 multiple-choice questions**.
- **110 minutes total**: 10 minutes reading + 100 minutes writing. That is about **100 seconds of writing time per question** on average.
- Scope: **all examinable material in Chapters 1–10**, including lectures, tutorials and e-book.
- One notes sheet, both sides, plus an approved calculator.

## What the course actually tests

The solved worksheets/tutorials and lecture questions repeatedly use a small set of question families. The deck deliberately mirrors them:

1. **Definition and classification:** GDP inclusions, unemployment categories, saving vs investment, BOP accounts.
2. **Sign/direction reasoning:** which curve shifts, whether a currency appreciates, whether reserves rise, whether inflation pressure rises.
3. **Short calculations:** percentage growth, CPI/real GDP, labour statistics, bond present value, multipliers, money demand, BOP identities, exchange rates, growth accounting.
4. **Algebraic equilibrium:** solve Y=PAE, substitute a tax rule, derive multipliers, combine PAE with a monetary-policy reaction function to derive AD.
5. **Model discrimination:** closed versus small-open saving/investment; movement along versus shift; actual versus planned investment; short run versus long run.
6. **Policy chains:** fiscal/monetary shock → intermediate variable → expenditure/AD → output/inflation; fixed-exchange-rate intervention direction.
7. **Diagram interpretation:** identify the axis variable, distinguish movement from shift, and infer the new equilibrium.

The highest-yield MCQ traps are therefore not obscure facts. They are **near-neighbour concepts with one sign, timing, definition or model assumption changed**.

## Chapter map

- **Ch 1 — Aggregate Production and Prices (33 cards):** GDP accounting, nominal/real, CPI, inflation and welfare.
- **Ch 2 — Labour Market (31):** labour-force statistics, unemployment flows/types, Okun, competitive labour market.
- **Ch 3 — Interest, Investment and Saving (32):** real/nominal rates, user cost, investment, saving, national saving and crowding out.
- **Ch 4 — Income–Expenditure (29):** PAE, inventories, consumption, multiplier, paradox of thrift, open-economy leakages.
- **Ch 5 — Fiscal Policy (33):** tax function, fiscal multipliers, stabilisers, deficits/debt and debt sustainability.
- **Ch 6 — Money and Banks (31):** assets/bonds, money demand, bank balance sheets/money creation, bank stability, quantity theory.
- **Ch 7 — Central Bank (28):** RBA, cash market/ESAs, corridor/OMO, transmission, yield curve and policy rules.
- **Ch 8 — AD–AS (32):** derive AD from PAE+real rate+PRF, inflation dynamics, demand/supply shocks and stabilisation.
- **Ch 9 — International Macro (40):** BOP, saving/investment, exchange rates/PPP, FX supply-demand, fixed rates and attacks.
- **Ch 10 — Growth (30):** compounding, convergence, Cobb-Douglas, per-worker output, productivity and growth accounting.
- **Mixed exam discrimination (30):** authored four-option questions that force model/sign selection across chapters.

## Data format chosen for a custom app

The canonical file is `MACRO1_master_flashcards.json`. It is deliberately richer than Anki front/back. Every record includes a short answer, full explanation, common trap, difficulty, topic/type tags and source-family metadata. Some cards include authored MCQ choices and a zero-based correct-choice index.

This supports a later app without regenerating content: spaced repetition for recall, a calculation mode, chapter filters, “show me why my distractor was wrong”, adaptive weak-topic weighting, and 60-question mixed mocks. JSONL is also supplied for streaming/CLI tooling, and TSV is supplied as an escape hatch for generic flashcard import.

## Suggested study order

A brute-force strategy should still separate **recognition** from **production**. First learn each chapter’s direct/formula cards until the short answers are automatic. Then do scenario/relationship cards without viewing diagrams. Finally switch heavily to mixed MCQs and calculations. When you miss a question, review the `common_trap` field as well as the explanation; that field is designed to train away the exact confusions multiple-choice distractors exploit.

For the eventual software, I would avoid generating arbitrary LLM distractors during study. Start with authored distractors and deterministic transformations of known traps, so the app never trains you on a subtly false “explanation.” Luna can add optional generated questions later behind validation.
