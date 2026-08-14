# Super Cram — Cheat-Sheet Aware

Super Cram is the separate `#/super-cram` final-stage practice mode. It is an
MCQ-first policy for the situation in which a comprehensive two-page cheat sheet is
available during the ECON1102 exam. It asks which question is most valuable to
practise now, not which card should be memorised next.

## Three signals, kept separate

Super Cram combines three distinct inputs:

1. Exam yield: the existing bounded `examYield` skill evidence and tier.
2. Study worthiness: how much extra value there is in understanding a skill without
   outsourcing it to the cheat sheet.
3. Formula application need: whether a formula form has actually been applied in the
   current Super Cram session.

Study worthiness and formula-family state are not stored in `examYield`, do not change
Exam-SRS intervals, and are not learner-visible probabilities. No score shown in this
mode means probability of exam appearance, expected marks, recall probability, or
probability of passing.

## Cheat-sheet worthiness scale

`src/superCram/cheatSheet.ts` has one explicit profile for each of the 33 current
exam-yield skills. The scale is:

| Level | Meaning                                                                                                  |
| ----: | -------------------------------------------------------------------------------------------------------- |
|     1 | Lookup-skippable: once recognised, the sheet normally answers it mechanically.                           |
|     2 | Mostly lookupable: identify the right formula/definition, then the sheet does most of the work.          |
|     3 | Mixed: the sheet supplies ingredients, but application or interpretation still matters.                  |
|     4 | Study-worthy: model selection, comparative statics, causal direction or interpretation is the hard part. |
|     5 | Must understand: integrated or multi-step reasoning where finding a rule is not a reliable substitute.   |

Profiles also carry transparent cheat-sheet section identifiers such as `8D`, `9J`,
`10C`, `Q3`, `T1`, `T2` and `T3`. The app does not reproduce or embed the cheat
sheet itself.

Question-level overrides are explicit. For example, `auth-ch10-011` is level 1 and
`concept` style because identifying the MPK/MPL pair is recognition; it is not a
calculation or Formula Application question. The numeric MPK/MPL applications are
`auth-form-ch10-013` and `auth-form-ch10-014`.

The section tags come from the typed 80-entry catalog in
src/superCram/cheatSheetCatalog.ts. Unknown identifiers are rejected by validation;
the app stores section IDs rather than reproducing the supplied cheat sheet.

The four corrected current Formula Application items are auth-form-ch08-013
(reverse PAE, 2%), auth-form-ch09-016 (the course convention
q=eP_home/P_foreign, giving 0.88), auth-form-ch05-013 (a genuine four-sector
multiplier including import leakage), and auth-form-ch10-016 (numeric per-worker
Cobb-Douglas application distinguishing capital deepening from TFP).

## Selection policy

The selector in `src/superCram/selector.ts` keeps ordinary Exam-SRS evidence
authoritative. The effective ordering is:

1. urgent attempted-and-due evidence;
2. high-yield reasoning and model-discrimination questions;
3. formula application, with a cold-family bonus until a family is successfully
   applied in this session;
4. lookup validation and breadth checks.

An urgent target is never multiplied by cheat-sheet worthiness. An attempted target
whose scheduled review is due can therefore outrank a fashionable unseen skill even
when the latter is harder to outsource. Scenario, model-discrimination, sequence and
stimulus questions receive modest form bonuses; direct substitution is not rewarded
merely because its style is called `calculation`.

The exam-yield part retains approximately this transparent fraction of ordinary
yield by worthiness:

```text
1 -> 35%    2 -> 50%    3 -> 70%    4 -> 85%    5 -> 100%
```

The current selector constants are:

```text
urgent override                 5000 + existing Exam-SRS state priority
weak attempted evidence          300 + existing state priority
cheat resistance                 6 points per worthiness level above 1
cold formula family              42
failed formula family            60
covered formula family            8
unfamiliar chapter               90
model/scenario/sequence/stimulus 22 / 14 / 10 / 8
underrepresented lookup mix      70
cheap level-1/2 lookup validation 150 after the first answer, capped at two
```

These are bounded policy constants, not calibration parameters. The cheap lookup
pressure is a soft cold-validation push, not a quota, and never competes with the
5,000-point due override. A short recent
question/card memory avoids immediate repetition and encourages a different variant
when a formula family is remediated. The selector retains the existing late-course
evidence uplift but applies a strong finite chapter-breadth push for a chapter not yet
touched in the session.

Non-due weak or relearning labels do not receive the urgent override. They have a
separate bounded weak-evidence bonus and are not labelled urgent.

The page samples the scheduler clock every 30 seconds with useNow. A clock refresh
can expose a newly due target or phase transition, but the unanswered question is
held stable until it is answered or advanced. Canonical fallbacks keep a
session-local set of completed card IDs, so the next due fallback can appear
without looping back to the just-completed card from a stale snapshot.

## Session-only formula coverage

Formula coverage is held in React session state only. A successful Formula Application
question marks its family covered, reducing its cold bonus. A wrong application keeps
the family uncovered and raises a short-term remediation bonus; the identical question
is not immediately repeated, but a different family question can return after the
short review-card cooldown. No new IndexedDB field, sync field, backup field, SRS, or
mastery model is created.

Super Cram answers use the existing `ReviewEvent` with `mode: "mcq"`, the canonical
`reviewCardId`, and an actual `responseTimeMs` measured from question presentation to
submission. Save failures retain the exact immutable payload and expose the existing
retry path. Response time is diagnostic/session data only; it does not alter intervals.

The feedback surface shows correctness, the explanation, all choice rationales, the
reason the question appeared, its worthiness description, and tagged cheat-sheet
sections. It never shows an appearance percentage.

## Formula Application Practice Lab

Practice Lab retains **Calculations** unchanged and adds a fifth entry,
**Formula Application**. Its route is `#/practice?mode=formula-application` and its
controls are chapter, formula family, set size and deterministic new-set selection.
It contains only the curated four-choice application bank, not generated numeric
templates and not unrelated conceptual questions. It uses the same ordinary MCQ
renderer, keyboard shortcuts (`1`–`4`, Enter), `ReviewEvent`/Exam-SRS evidence and
immutable save retry behaviour.

The curated set has 45 questions:

| Source                                                   | Count |
| -------------------------------------------------------- | ----: |
| Newly authored in this continuation                      |    24 |
| Existing strong calculation/application questions reused |    21 |
| Total                                                    |    45 |

| Chapter range | Questions |
| ------------- | --------: |
| Chapters 1–4  |        14 |
| Chapters 5–7  |        14 |
| Chapters 8–10 |        17 |

There are 26 formula families and 13 stimulus questions in the curated set. New
tables cover value-added chains, real GDP, investment/user cost, tax brackets,
government borrowing, ESA transactions, fixed-peg intervention and capital-versus-
TFP comparison. No screenshot or raw scrape is committed.

### Newly authored question IDs

```text
auth-form-ch01-011  auth-form-ch01-012  auth-form-ch02-012
auth-form-ch03-011  auth-form-ch03-012  auth-form-ch03-013
auth-form-ch04-011  auth-form-ch05-012  auth-form-ch05-013
auth-form-ch05-014  auth-form-ch05-015  auth-form-ch05-016
auth-form-ch06-013  auth-form-ch07-013  auth-form-ch08-012
auth-form-ch08-013  auth-form-ch08-014  auth-form-ch09-014
auth-form-ch09-015  auth-form-ch09-016  auth-form-ch10-013
auth-form-ch10-014  auth-form-ch10-015  auth-form-ch10-016
```

### Reused question IDs

```text
auth-ch01-005  auth-ch03-001  auth-stim-ch03-003  auth-ch03-008
auth-ch04-004  auth-ch04-007  auth-stim-ch04-003  auth-ch05-001
auth-ch05-009  auth-ch05-011  auth-stim-ch05-003  auth-ch06-001
auth-ch06-002  auth-ch07-004  auth-ch08-001  auth-ch08-003
auth-ch09-005  auth-ch09-006  auth-ch09-013  auth-ch10-006
auth-stim-ch10-003
```

The exact family-to-question mapping is the static
`formulaApplicationFamilies` registry. Every question has four static choices,
four rationales, a canonical review-card mapping, and stays within the bank's
maximum two questions per `reviewCardId`.

Each Formula Application metadata record declares application operations such as
formula selection, input extraction, rearrangement, substitution, calculation and
sign/unit control. The validator rejects missing or recognition-only records.

## Practice-test form provenance

The three supplied official/current-course sets remain scoped recent-assessment
evidence:

| Source                 | Scope         | Formula forms used                                                                                     |
| ---------------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| `practice-test-1-2026` | Chapters 1–4  | value added, base-year real GDP, Okun, Fisher, investment/user cost, saving, PAE                       |
| `practice-test-2-2026` | Chapters 5–7  | MPC, fiscal multipliers, tax schedules, gap closure, debt, quantity theory, returns, corridor, ESA     |
| `practice-test-3-2026` | Chapters 8–10 | AD/PRF, long-run inflation, FX, BOP, peg intervention, small-open accounting, Cobb-Douglas, growth/TFP |

The analogue metadata records the form observed in a source. It does not claim the
authored item appeared in that source. The three blocks are chapter-restricted, so
raw counts across them are not comprehensive-final probabilities or final weights.
Repeated questions within a block indicate active practice/testing of a skill, not a
calibrated chance of final appearance. The final remains comprehensive Chapters
1–10.

## Deterministic audit

Run:

```bash
npm run validate:super-cram
npm run audit:super-cram
```

The fixed 30-question audit currently reports:

```text
Empty/new learner
  chapters: 0=4, 1=1, 2=1, 3=1, 4=1, 5=1, 6=1, 7=1, 8=7, 9=6, 10=6
  mix: reasoning 18, formula 9, lookup 3, urgent 0
  tiers: critical 23, very-high 4, core 3, support 0
  worthiness: 1=2, 2=1, 3=3, 4=1, 5=23
  unique review cards: 18; formula families: 6

Weak learner (failed ch10-031)
  chapters: 0=3, 1=1, 2=1, 3=1, 4=1, 5=1, 6=1, 7=1, 8=5, 9=5, 10=10
  mix: reasoning 15, formula 8, lookup 2, urgent 5
  tiers: critical 23, very-high 4, core 3, support 0
  worthiness: 1=4, 2=4, 3=1, 4=1, 5=20
  unique review cards: 17; formula families: 6
```

This is a deterministic pathology check, not an optimality claim. It catches a
late-chapter loop, zero formula application, zero chapter breadth, and immediate
question repetition without changing ordinary Study, Guided Cram, High-Yield Cram,
Mock selection, Exam-SRS intervals, forecast, persistence, backup or sync.

## Semantic audit and hardening record

All 45 curated Formula Application questions were independently checked against
the intended formula, inputs, signs, units, course convention, distractor logic and
stimulus leakage. The static audit record is
src/superCram/formulaAudit.ts and is exercised by both the Formula Application
tests and the Super Cram validator; it is independent of the JSON correctChoice
field. The 24 authored IDs are the auth-form IDs listed above; the remaining 21
are reused existing application questions.

| Area independently recomputed                   | Result                                                |
| ----------------------------------------------- | ----------------------------------------------------- |
| Ch1–2 value added, base-price GDP and Okun      | 3 / 1 / 1 curated forms                               |
| Ch3 Fisher, user cost, saving and PAE           | exact Fisher 4.85%; user cost $15; first machine only |
| Ch5 fiscal multiplier and gap closure           | four-sector k = 2.00 with m = 0.10; gap closure $80m  |
| Ch5 primary/overall balance and debt constraint | +$130m primary, +$50m overall; borrowing $150m        |
| Ch6–7 quantity, PV, returns, corridor and ESA   | keys and signs match the course identities            |
| Ch8 PAE/PRF and AD                              | reverse PAE gives r = 2%; AD is Y = 420 − 16π         |
| Ch9 FX, BOP and peg                             | q = 0.88; CA = −$3,700m; peg purchase = $60m          |
| Ch10 MPK/MPL and growth accounting              | MPL = 13; MPK = 4.2; growth = 4.5%                    |

The four confirmed content corrections are:

- auth-form-ch08-013 now keys 2%, independently solving
  750 = 500 + 0.4(750) − 25r;
- auth-form-ch09-016 uses q = e P_home / P_foreign, so 0.8 × 110 / 100
  gives 0.88. The related Ch9 real-FX questions were checked against the same
  convention;
- auth-form-ch05-013 includes nonzero import leakage m in
  1 / [1 − c(1 − t) + m]; and
- auth-form-ch10-016 is now a numeric y = A k^0.5 application, not a
  conceptual-only classification item.

The MPK/MPL recognition item auth-ch10-011 remains outside Formula Application.
The direct Critical AD/PRF set retains ch08-001 and ch08-002: the former retrieves
the three constitutive links in the course derivation and the latter directly
retrieves the interest-sensitive C/I channel that must precede solving Y(r).
Neither is treated as evidence that every adjacent card is direct Critical.
