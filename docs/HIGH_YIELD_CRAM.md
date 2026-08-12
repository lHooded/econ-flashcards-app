# High-Yield Cram

High-Yield Cram is an additional `#/high-yield` policy layered over the
existing finite-horizon Exam-SRS and prerequisite-aware Guided Cram systems.
It prioritises evidence-backed final-exam skill families while preserving
urgent attempted material, ordinary learning evidence, and breadth across the
course. It is not an exam-prediction model.

## Evidence and disclosure

The bundled registry is static, deterministic and offline. It contains eight
source records and 29 skill-family records. Each source has an authenticity
weight and a current-format-fit weight. These are transparent heuristics, not
calibrated probabilities. The UI therefore says `Critical`, `Very high`,
`Core`, `Support`, or gives a short source explanation; it never shows a
chance of appearance, expected marks, predicted mark, or probability of
passing.

The source hierarchy is:

1. current exam/course information;
2. the public T2 2020 final;
3. 2018/19 course-specific final MCQ practice;
4. 2020 sample/final-style material;
5. recent course assessments and data exercises;
6. pre-2017 finals as weak historical consistency evidence.

Current lectures, required textbook/tutorial material and current course
conventions outrank historical wording. Source URLs and metadata are in
`src/examYield/sources.ts`; the full cleaned research brief is in
[`ECON1102_EXAM_PRIORITY_AUDIT.md`](./ECON1102_EXAM_PRIORITY_AUDIT.md), and the
before/after local mapping audit is in
[`ECON1102_EXTERNAL_EXAM_COVERAGE.md`](./ECON1102_EXTERNAL_EXAM_COVERAGE.md).

The source URLs used by the registry are:

- https://www.studocu.com/en-au/document/university-of-new-south-wales/macroeconomics/econ1102-macroeconomics-1-course-outline-2025-term-2-details/132155065
- https://handbook.unsw.edu.au/undergraduate/courses/2026/econ1102
- https://www.studocu.com/en-au/document/university-of-new-south-wales/macroeconomics/econ1102-final-exam-2020-t2/13869269
- https://www.studocu.com/en-au/document/university-of-new-south-wales/macroeconomics-1/econ1102-mcq-practice-it-is-a-good-revision-for-your-final-exam/5453129
- https://www.studocu.com/en-au/document/university-of-new-south-wales/macroeconomics-1/macro-1-final-sample-econ1102/13032548
- https://www.studocu.com/en-au/document/university-of-new-south-wales/macroeconomics-1/econ1102-final-exam-2004/7446882

No past-exam PDFs or large verbatim question collections are bundled.

Each skill-source relation is explicit: `direct` means the exact skill or
mechanism is visible in that source; `family` means a related mechanism is
visible; `scope` and `format` are current-course or exam-format context. The
UI uses the relation when choosing a reason, so a family-level 2020 signal is
never presented as direct testing of a particular card.

## Tiers and chapter priors

The final remains comprehensive. Critical families are AD-AS self-correction
and supply-shock policy trade-offs; FX quotes, real/nominal exchange rates,
LOOP/PPP, BOP/current account, fixed pegs and speculative attacks; and
Cobb-Douglas, growth accounting/TFP, and capital deepening versus sustained
technology growth.

Very-high families cover bank creation and risk, money destruction, PRF/Taylor
reasoning, deflation/ZLB, monetary transmission, small-open fiscal interaction,
RBA corridor/OMO mechanics, cash-rate/security transmission, and convergence.
Core families cover GDP/value added, CPI/inflation, labour and wage floors,
PAE/multipliers, fiscal/debt reasoning, bond price/yield, and Fisher reasoning.
Everything else remains examinable support material.

The bounded chapter priors are:

```text
Ch1 0.85  Ch2 0.80  Ch3 0.85  Ch4 0.80  Ch5 0.90
Ch6 1.10  Ch7 1.15  Ch8 1.30  Ch9 1.40  Ch10 1.25  mixed 1.25
```

They explain a modest late-course uplift, not predicted exam weights. Chapter
6 and 7 direct evidence can therefore outrank an obscure Chapter 10 detail.

## Score construction

For a skill `s`, the direct yield is exactly:

```text
weightedEvidence(s) = Σ strength(e) × authenticity(source(e)) × formatFit(source(e))
evidenceBonus       = min(18, 4 × weightedEvidence(s))
chapterContribution  = clamp(0, 8, ((maxChapterPrior(s) − 0.8) / 0.6) × 8)
directYield(s)       = tierBase(s) + evidenceBonus + chapterContribution
                       + (6 if crossChapterMechanism else 0)
```

The tier bases are `Critical=100`, `Very high=78`, `Core=56`, and
`Support=34`. The chapter-prior contribution is capped at 8 points and the
cross-chapter mechanism contribution at 6 points.

Only a skill's `targetConceptIds` can originate direct concept yield. Its
optional `supportingConceptIds` are explanatory/indexing links and do not
receive the full direct skill score. Effective concept yield is propagated
backwards through the DAG:

```text
effectiveYield(c) = max(
  max(directYield(s) for s whose targetConceptIds include c),
  min(72, directYield(descendant) × 0.60 ^ distance(descendant, c))
)
```

Propagation is transient and recomputed from the immutable graph. The 0.60
decay and 72-point propagated cap let foundations unlock valuable branches
without turning every distant root into a critical skill.

`skill.cardIds` is the authoritative set of direct retrieval assets. For an
unseen card, the yield signal is:

```text
cardYield(card) = max(
  directYield(s) for explicitly mapped skills s whose cardIds include card,
  propagatedYield(c) for concepts c mapped to card
)
```

An unlisted card therefore cannot inherit a skill's full direct score merely
because it shares a broad concept such as inflation, price level, deposit, or
bond price. A small deterministic readiness/cost term is then applied:

```text
candidateScore = cardYield
               + coveragePressure
               + (8 if scheduler prerequisite-ready else 0)
               + min(12, high-yield descendant skills unlocked)
               − 2.5 × unmet prerequisite concepts
               − 1.5 × unmet no-card checks
               − recent-display tie penalty
```

Coverage pressure is `42 × (1 − chapterCoverage) + 35 × max(0,
globalCoverage − chapterCoverage)`, plus 90 for a completely unseen numbered
chapter. Mixed cards receive a smaller remaining-coverage term. This is a
soft breadth pressure, not a rigid quota.

## Scheduling policy

The order is deliberately:

1. Exam-SRS identifies urgent attempted cards and checks using the existing
   review events, failure/weak intervals, deadline and buffer caps.
2. Only when the ordinary Guided selector would choose an unseen branch does
   High-Yield Cram rank otherwise eligible unseen canonical anchors.
3. The selected anchor is passed back through the existing Guided recursive
   preparation. Missing lessons, checks, failed-frontier blocking, independent
   branch selection and deterministic fallback remain unchanged.
4. Due Guided Knowledge Checks and canonical reviews continue to return through
   the existing Exam-SRS urgency comparison.

If ordinary Exam-SRS selects an attempted due/relearning item ahead of unseen
material, High-Yield Cram returns that item unchanged. Exam-yield scoring is
only consulted when choosing among unseen/new branches. An already-strong FX
branch also does not win merely because its historical tier is high; current
unseen gaps and review state are part of the decision.

Ordinary `#/guided` omits the high-yield candidate restriction and uses the
same selector inputs and ordering as before. `#/study`, mocks, Practice Lab,
and the ReviewEvent/CardState evidence model are not weighted by this registry.

## Content additions after the 161-question audit

The exact local audit found 349 canonical cards, 161 exam questions and 297
knowledge concepts before additions. Three current-course retrieval skills
were genuinely undertrained:

- `ch09-041` / `trade-weighted-index` / `auth-ch09-011`: current Week 8 and
  textbook support for TWI interpretation alongside PPP/inflation;
- `ch06-032` / `money-destruction` / `auth-ch06-011`: repayment and
  create-versus-destroy balance-sheet operations. Principal repayment is the
  clean reverse of loan-created deposit money; a write-off primarily reduces
  the loan asset and bank equity and does not automatically destroy an equal
  deposit balance. `auth-ch06-011` tests same-bank principal repayment;
- `ch07-029` / `cash-rate-security-transmission` / `auth-ch07-011`: cash rate
  to short-security required return, demand, price and yield.

Four additional analogous MCQs strengthen integrated gaps without copying
historical stems: `auth-ch06-012` (bank-risk chain), `auth-ch07-012`
(PRF/deflation/ZLB/Fisher), `auth-ch09-012` (fixed-peg speculative attack),
and `auth-ch02-011` (wage-floor policy comparison). The final bundle therefore
has 352 canonical cards, 168 exam questions and 300 knowledge concepts. The
three new concepts are `money-destruction`,
`cash-rate-security-transmission`, and `trade-weighted-index`.

## Persistence and offline behaviour

High-Yield Cram is offline after installation: its registry, scoring, graph
propagation, selector, questions and explanations are bundled. A High-Yield
answer is an ordinary canonical or Guided Knowledge Check ReviewEvent. There
is no `examYieldMastery`, probability, expected-mark field, second scheduler,
or second mastery database. DB version remains 3, `ProgressBackupV2` remains
version 2, sync protocol remains v1, and the sync worker source/configuration
does not change.

The build-time `npm run validate:exam-yield` check validates source/skill IDs,
all concept/card/question mappings, chapters, source weights and URLs,
retrieval paths, duplicates, and forbidden prediction fields.
