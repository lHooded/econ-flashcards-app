# ECON1102 exam-priority research brief

This is the repository copy of the supplied `ECON1102_exam_priority_audit_and_high_yield_cram.md`, cleaned into a short implementation brief. The supplied file was read in full before the local content audit and remains the detailed research record outside the committed app sources.

## Evidence hierarchy

Use current course truth first: lectures, required textbook/tutorials and the
current canonical deck outrank historical phrasing. Use public past-final
material only to identify recurring skills and useful reasoning structures, not
to predict the next exam.

1. Current exam/course information.
2. Real T2 2020 ECON1102 final: strong content/reasoning evidence, weaker
   current-format evidence because the visible paper uses extended questions.
3. 2018/19 ECON1102 final MCQ practice: course-specific and format-close, but
   not authenticated as the final.
4. 2020 official-style/sample final questions.
5. Recent assessments/data exercises.
6. Pre-2017 finals as weak historical consistency evidence only.

The source weights in the bundled registry are heuristics: authenticity and
format-fit values are evidence quality controls, not probabilities. No field in
the app represents probability of appearance, expected marks, or probability of
passing.

## Public sources

- Current course outline (2025 T2):
  https://www.studocu.com/en-au/document/university-of-new-south-wales/macroeconomics/econ1102-macroeconomics-1-course-outline-2025-term-2-details/132155065
- Current UNSW handbook:
  https://handbook.unsw.edu.au/undergraduate/courses/2026/econ1102
- Real ECON1102 T2 2020 final:
  https://www.studocu.com/en-au/document/university-of-new-south-wales/macroeconomics/econ1102-final-exam-2020-t2/13869269
- ECON1102 2018/19 MCQ practice:
  https://www.studocu.com/en-au/document/university-of-new-south-wales/macroeconomics-1/econ1102-mcq-practice-it-is-a-good-revision-for-your-final-exam/5453129
- 2020 sample final:
  https://www.studocu.com/en-au/document/university-of-new-south-wales/macroeconomics-1/macro-1-final-sample-econ1102/13032548
- 2004 final:
  https://www.studocu.com/en-au/document/university-of-new-south-wales/macroeconomics-1/econ1102-final-exam-2004/7446882

The app stores only this metadata, paraphrased skill evidence, and newly
authored analogous questions. It does not store the source PDFs or copied
question sets.

## Priority interpretation

The current final remains comprehensive. The public practice set is
late-course-heavy, and the visible 2020 final strongly features banking,
AD-AS/policy, exchange rates and growth. That supports a bounded Chapter 8–10
uplift, strongest for Chapter 9, while retaining Chapters 1–7 as examinable
and as prerequisites for later chains. Chapter 6 banking and Chapter 7 monetary
policy receive direct evidence priority even where their chapter number is
lower.

The initial priors are deliberately modest:

```text
Ch1 0.85  Ch2 0.80  Ch3 0.85  Ch4 0.80  Ch5 0.90
Ch6 1.10  Ch7 1.15  Ch8 1.30  Ch9 1.40  Ch10 1.25  mixed 1.25
```

They are a bounded unseen-material tie-break component, never a direct exam
weight and never a replacement for Exam-SRS urgency or the prerequisite DAG.

## Skill tiers

Critical families: AD-AS demand shocks/self-correction; adverse supply shocks
and inflation-target trade-offs; FX quote conventions and market shifts;
nominal/real exchange rates; LOOP/PPP; BOP/current account; fixed rates and
over/undervalued pegs; speculative attacks and defence; Cobb-Douglas; growth
accounting/TFP; and capital deepening versus sustained technology growth.

Very-high families: bank balance sheets/deposit creation; bank leverage,
liquidity/solvency, runs, insurance moral hazard and prudential regulation;
PRF/Taylor/Taylor principle; deflation and the ZLB; monetary transmission;
small-open saving/investment/fiscal interaction; RBA cash-rate/corridor/OMO;
growth catch-up/convergence; money destruction; and the cash-rate/security
market chain where current-source support exists.

Core families: GDP/value added; nominal/real/CPI/inflation; labour statistics
and wage floors; PAE/inventories/multiplier; fiscal multipliers/stabilisers and
debt; bond price/yield; and Fisher real-rate reasoning. Other examinable
material remains support material, not disposable material.

## Three candidate gaps

- TWI is supported by the current Week 8 lecture/textbook, so it receives a
  normal source-backed node rather than an old-paper-only label.
- Money creation is already strong, but repayment and asset-loss/write-off
  reversals were not standalone retrieval skills. A small reverse-mechanism
  addition is justified.
- Cash-rate transmission to longer rates is current-course material, while the
  exact security-demand/price/yield chain was split across cards. One integrated
  analogous item is justified.

The exact before/after IDs, ratings and actions are in
[`ECON1102_EXTERNAL_EXAM_COVERAGE.md`](./ECON1102_EXTERNAL_EXAM_COVERAGE.md).

## 2026 current-course practice-test audit addendum

The repository now records three newly supplied official/current-course practice
sets from `practice_tests/cleaned_practice_tests/`:

| Registry source        | Supplied scope | De-duplicated source material |
| ---------------------- | -------------- | ----------------------------: |
| `practice-test-1-2026` | Chapters 1–4   |                  20 questions |
| `practice-test-2-2026` | Chapters 5–7   |                  38 questions |
| `practice-test-3-2026` | Chapters 8–10  |                  58 questions |

The saved material has no answer key, and the registry stores provenance and
paraphrased skill signals rather than copied question sets. Each source uses the
existing `recent-assessment` evidence kind with strong authenticity and exact-MCQ
format-fit heuristics. The sets are chapter-restricted. Therefore raw totals across
Test 1, Test 2 and Test 3 are not comparable as comprehensive-final chapter
appearance probabilities. Repeated questions within one chapter block indicate a
skill being actively practised/tested, not a calibrated probability that it will
appear on the final. The final remains comprehensive across Chapters 1–10, and no
learner-visible numerical probability was introduced.

### Bounded priors

The exact prior change is:

```text
Before: Ch0 1.25  Ch1 0.85  Ch2 0.80  Ch3 0.85  Ch4 0.80  Ch5 0.90
        Ch6 1.10  Ch7 1.15  Ch8 1.30  Ch9 1.40  Ch10 1.25
After:  Ch0 1.25  Ch1 0.85  Ch2 0.80  Ch3 0.85  Ch4 0.80  Ch5 1.05
        Ch6 1.10  Ch7 1.15  Ch8 1.40  Ch9 1.40  Ch10 1.40
```

The maximum chapter-prior contribution remains 8 points. Priors remain a bounded
secondary signal around the larger tier signal; no scheduler, SRS, forecast, sync,
manual-learned, mock, censoring or persistence semantics changed.

### Content gaps and deliberately non-gaps

The audit found only two justified retrieval additions: `ch08-033` for anchored
inflation expectations after temporary supply shocks, and `ch10-031` for the direct
Cobb-Douglas MPK/MPL formulas. Existing coverage was already strong for the Ch8
PAE/PRF derivation, fiscal multipliers and debt mechanics, BOP definitions, growth
accounting, productivity, capital deepening and living-standards decomposition.
Those areas received evidence/priority recalibration rather than bulk card creation.

The five new authored questions are:

1. `auth-ch08-011`: anchored expectations and credibility after a supply shock;
2. `auth-ch10-011`: Cobb-Douglas MPK/MPL formula discrimination;
3. `auth-ch10-012`: numerical GDP-per-capita = output-per-worker × employment intensity;
4. `auth-ch09-013`: full current-account component table with an explicit sign convention;
5. `auth-ch05-011`: primary versus overall government budget balance.

The current bank is 354 canonical cards, 301 knowledge concepts and 197 unified
exam questions. All five original recalibration questions and the 24 new Formula
Application analogues use four static choices, specific rationales,
canonical review-card/source-card mappings and remain within the maximum two
variants per `reviewCardId`.

### Exam-yield changes

- Added critical `critical-ad-prf-quantitative-chain`, targeting only the
  interest-sensitive C/I → PAE equilibrium → Y(r) → PRF substitution → negative
  inflation coefficient of AD chain. It has direct current-course and strong
  Practice Test 3 evidence.
- Expanded critical supply-shock policy trade-offs with
  `anchored-inflation-expectations`; expanded critical BOP/current-account with
  primary income, secondary income and composition; and expanded critical
  Cobb-Douglas with direct MPK/MPL retrieval.
- Added very-high `very-high-growth-living-standards` for GDP per capita,
  output per worker, employment intensity, productivity/TFP, capital and the
  decomposition identity. Natural capital remains supporting, not a direct target.
- Replaced core `core-fiscal-multipliers-debt` with very-high
  `very-high-fiscal-multipliers-stabilisers` and
  `very-high-budget-debt-sustainability`, supported directly by Practice Test 2.
  Peripheral fiscal-rule material was not promoted.
- Added core `core-investment-user-cost` for real rate → user cost → marginal
  profitability → desired investment, supported directly by Practice Test 1.
  It is intentionally not critical.

After the change the registry has 11 evidence sources and 33 skills: 13 critical,
13 very-high, 7 core and 0 support. Practice-test strengths are stored on the
affected skill evidence entries; they are not a pseudo-probability field.

### Source-verification decisions

The apparent wealth-effect reason for a downward AD slope was rejected as a new
canonical Chapter 8 explanation. The current local lecture/textbook model derives
the course AD curve through inflation → PRF real rate → interest-sensitive C/I →
PAE → equilibrium output. A generic textbook wealth-effect story would not be
encoded where it conflicts with that course-specific derivation.

The land/physical-capital item was also not used to flatten the ontology. Current
course records distinguish produced physical capital from natural capital (which
includes land and natural resources), while financial assets are not physical
capital. The practice item’s broad option set is therefore treated as imprecise;
the cleaner current-course distinction remains canonical.

## Super Cram continuation audit

The separate Super Cram layer does not reinterpret the three practice blocks as final
weights. It uses them to identify practice-test forms for the Formula Application
lane and keeps scoped source IDs in `src/superCram/formulaFamilies.ts`. The 24 new
analogues are original wording and numbers, not official question reproductions.

Two bounded corrections were made during the continuation audit. `auth-ch10-011` is
now `concept` style because it asks for MPK/MPL formula recognition; numeric
application is supplied separately by `auth-form-ch10-013` and
`auth-form-ch10-014`. The cards `ch08-001` and `ch08-002` remain direct Critical
assets in `critical-ad-prf-quantitative-chain`: the first is the exact course model
selection/three-link chain, and the second is the constitutive interest-rate effect
on C/I and PAE. They are not generic neighbouring facts. The direct mapping is
documented and the existing test continues to ensure unrelated Ch8 cards do not
leak into that family.

The generic wealth-effect explanation for a downward AD curve remains rejected as a
canonical current-course explanation. The course derivation is inflation → PRF real
rate → interest-sensitive C/I → PAE → equilibrium output. The practice wording does
not override that model. Likewise, land/natural capital remains distinct from
produced physical capital; the broad practice option set is treated as imprecise
rather than changing the course ontology.
