# High-Yield Cram

High-Yield Cram is an additional `#/high-yield` policy layered over the
existing finite-horizon Exam-SRS and prerequisite-aware Guided Cram systems.
It prioritises evidence-backed final-exam skill families while preserving
urgent attempted material, ordinary learning evidence, and breadth across the
course. It is not an exam-prediction model.

## Evidence and disclosure

The bundled registry is static, deterministic and offline. It contains eleven
source records and 33 skill-family records. Each source has an authenticity
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
6. supplied 2026 current-course practice tests, used as scoped recent-assessment
   evidence for active practice and format fit;
7. pre-2017 finals as weak historical consistency evidence.

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
Ch0 1.25  Ch1 0.85  Ch2 0.80  Ch3 0.85  Ch4 0.80  Ch5 1.05
Ch6 1.10  Ch7 1.15  Ch8 1.40  Ch9 1.40  Ch10 1.40
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

The separate Super Cram policy also uses the ordinary attempted-and-due eligibility
rule; a non-due weak or relearning card does not bypass Exam-SRS spacing. This
does not alter High-Yield's prerequisite-aware Guided selection or its scheduler
semantics.

`#/super-cram` is intentionally a separate policy. It is question-first and
cheat-sheet-aware: it discounts lookup-skippable exam content, applies explicit
question-level form metadata, and tracks cold formula-family application only for
the current session. It does not change this page's prerequisite-aware Guided-based
`#/high-yield` behaviour, and it does not add a second scheduler or learner model.
See [`SUPER_CRAM.md`](./SUPER_CRAM.md) for its selector and Formula Application
registry.

Guided and High-Yield Cram share one persisted lesson acknowledgement set. A lesson
is recorded as seen only when the learner explicitly presses `Check understanding`;
displaying or opening it does not persist exposure. This prevents unnecessary
replay after route changes or reloads, while leaving an incomplete lesson eligible
to appear again. Lesson acknowledgement is not mastery, learned status, solid
status, or Exam-SRS strength; only a canonical-card or Guided Knowledge Check
retrieval creates evidence. The acknowledgement write completes before High-Yield
advances, and a failed write leaves the lesson visible for retry.

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
and `auth-ch02-011` (wage-floor policy comparison). The earlier content-addition
bundle therefore
has 352 canonical cards, 168 exam questions and 300 knowledge concepts. The
three new concepts are `money-destruction`,
`cash-rate-security-transmission`, and `trade-weighted-index`.

## 2026 current-course practice-test recalibration

The supplied practice sets are registered as `recent-assessment` sources:
`practice-test-1-2026` (Chapters 1–4), `practice-test-2-2026` (Chapters 5–7),
and `practice-test-3-2026` (Chapters 8–10). They are exact current-course MCQ
evidence with strong authenticity and format-fit heuristics. Their scopes are
chapter-restricted, so raw question totals across the three sets are not
comparable as comprehensive-final chapter probabilities. Repeated questions
within one block indicate active practice/testing of a skill, not a calibrated
final appearance probability. The final remains comprehensive across Chapters
1–10, and no learner-visible numerical probability is added.

The bounded chapter priors changed exactly as follows:

```text
Before: Ch0 1.25  Ch1 0.85  Ch2 0.80  Ch3 0.85  Ch4 0.80  Ch5 0.90
        Ch6 1.10  Ch7 1.15  Ch8 1.30  Ch9 1.40  Ch10 1.25
After:  Ch0 1.25  Ch1 0.85  Ch2 0.80  Ch3 0.85  Ch4 0.80  Ch5 1.05
        Ch6 1.10  Ch7 1.15  Ch8 1.40  Ch9 1.40  Ch10 1.40
```

The maximum chapter-prior contribution remains 8 points; tier bases, evidence
caps, propagation, scheduler semantics, and forecast calibration are unchanged.

The targeted content additions are deliberately small:

- Canonical cards `ch08-033` (anchored inflation expectations) and `ch10-031`
  (Cobb-Douglas MPK/MPL formulas).
- Knowledge concept `anchored-inflation-expectations`, with prerequisite and
  related edges to expectations, the inflation target, supply shocks, policy
  credibility and accommodation. No separate human-capital concept was added;
  the existing `ch10-017` card remains the course-backed retrieval surface for
  human capital within the broader capital family.
- Authored questions `auth-ch08-011`, `auth-ch10-011`, `auth-ch10-012`,
  `auth-ch09-013` (a declared-sign-convention current-account table), and
  `auth-ch05-011` (primary versus overall budget balance). All have four static
  choices, specific rationales, valid review-card links and stay within the
  two-variant cap.

High-yield attribution changed as follows:

- Added critical `critical-ad-prf-quantitative-chain` for the PAE → Y(r) → PRF
  → AD equation chain, with direct Practice Test 3 evidence and only the
  constitutive Ch8 cards/concepts.
- Expanded critical supply-shock policy trade-offs with anchored expectations,
  and expanded critical BOP/current-account coverage with primary income,
  secondary income and current-account composition.
- Expanded critical Cobb-Douglas production with direct MPK/MPL retrieval.
- Added very-high `very-high-growth-living-standards` for GDP per capita,
  productivity, output per worker, employment intensity, capital and the
  decomposition identity; `natural-capital` remains supporting rather than a
  direct target.
- Replaced core `core-fiscal-multipliers-debt` with very-high
  `very-high-fiscal-multipliers-stabilisers` and
  `very-high-budget-debt-sustainability`, using direct Practice Test 2 evidence
  without promoting peripheral fiscal-rule material.
- Added core `core-investment-user-cost` for the real-rate → user-cost → VMPK
  → desired-investment chain, using direct Practice Test 1 evidence. It remains
  core rather than critical.

The ambiguous practice claims were checked against the current local course
sources. The wealth-effect explanation for a downward AD curve was rejected as
canonical Chapter 8 teaching: current course material derives AD through the
PRF, interest-sensitive C/I, PAE and equilibrium output. The generic textbook
wealth-effect explanation is not encoded where it would conflict with that
course-specific derivation. The land/physical-capital item was also not used to
flatten the ontology: current course records distinguish natural capital from
produced physical capital, while financial assets are not physical capital. The
imprecise option set does not justify changing that distinction.

The post-change registry validates at 11 sources, 33 skills (13 critical,
13 very-high, 7 core), 301 knowledge concepts, 354 canonical cards and 197
unified exam questions. The separate Formula Application registry contains 45
curated questions, including 24 newly authored practice-form analogues; see
[`SUPER_CRAM.md`](./SUPER_CRAM.md).

## Persistence and offline behaviour

High-Yield Cram is offline after installation: its registry, scoring, graph
propagation, selector, questions and explanations are bundled. A High-Yield
answer is an ordinary canonical or Guided Knowledge Check ReviewEvent. There
is no `examYieldMastery`, probability, expected-mark field, second scheduler,
or second mastery database. The dedicated `guidedLessonSeen` IndexedDB store is
local acknowledgement only: it creates no ReviewEvent or CardState change. The
database is version 5, while `ProgressBackupV3` is the current backup format with an optional
`lessonSeenConceptIds` field for portable backups. Sync protocol v1 remains
unchanged, so lesson acknowledgement is not synced across devices; the sync Worker
source and configuration do not change.

The build-time `npm run validate:exam-yield` check validates source/skill IDs,
all concept/card/question mappings, chapters, source weights and URLs,
retrieval paths, duplicates, and forbidden prediction fields.
