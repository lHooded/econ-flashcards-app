# Guided Cram

Guided Cram is the active-learning route at `#/guided`. It is designed for a
learner with weak background knowledge and a short, known exam horizon. It
combines two existing, deliberately separate signals:

- the immutable prerequisite DAG answers “what new idea should be introduced
  next?”;
- Exam-SRS answers “what previously attempted material is urgent to retrieve
  again?”

The next step is recomputed after every saved review or acknowledged lesson. There is
no precomputed lesson plan and no second scheduler.

## Finite-horizon scheduling

Guided Cram calls the same `deriveReviewEvidence`, `deriveCardState`, phase, and
interval code as ordinary Study. It does not implement FSRS, SM-2, a long-term
Anki schedule, or a duplicate interval table. Failure, weak success, strong
success, deadline contraction, and buffer behaviour therefore remain exactly the
Exam-SRS methodology:

- objective failure resets strength and returns on the short failure interval;
- weak success adds 0.5 strength and returns on the weak interval;
- objective MCQ success adds 0.75 strength;
- objective calculation success adds 1 strength;
- strong intervals are capped by the existing remaining-time deadline/buffer
  functions.

Guided Knowledge Checks are objective retrieval only. An MCQ or calculation
check records `correct: true/false` with `rating: null`, so a Guided Check can
produce objective success or objective failure but cannot produce a
`struggled` rating. Weak success remains a real Exam-SRS outcome, but it comes
from a canonical recall card (or another existing self-rated recall surface)
where the learner can choose `Struggled`.

An attempted guided check can interrupt new material only when its existing
Exam-SRS urgency is strictly higher than the canonical anchor. Canonical
relearning/due/weak priority remains first on equal or higher numeric priority.
Unseen guided checks are not put into the global scheduler; they become active
only when their concept is needed as a prerequisite.

## New concepts and evidence

For an unseen canonical anchor, Guided Cram collects the mapped concept IDs and
their prerequisite ancestors in deterministic topological order. It presents
one concise lesson at a time. After the learner explicitly continues past the lesson:

1. a no-card concept gets its registered Guided Knowledge Check;
2. a canonical-backed prerequisite gets a suitable linked canonical card;
3. when the prerequisite frontier is ready and the target bundle has been
   lesson-introduced, the selected canonical card is shown as retrieval
   evidence for that bundle.

The selector does not require every prerequisite to be `Solid`. “Introduced
enough” is a transient derived condition: any positive retrieval evidence,
including a weak success, is enough to let the frontier move forward. An
unseen concept or a concept with only failed evidence is not introduced. A
failure remains a real Exam-SRS failure and is allowed to return when due; the
selector avoids forcing the same failed check immediately when another action
exists. A final canonical fallback prevents a graph state from making Study
unreachable.

Reading or displaying an article never creates evidence. A lesson is persisted as
seen only when the learner explicitly continues past it with `Check understanding`.
That acknowledgement prevents unnecessary replay after navigation or reload, but it
is not mastery, learned status, solid status, or Exam-SRS strength. Only retrieval
creates Exam-SRS evidence. Leaving before the action intentionally leaves the lesson
eligible to be shown again.

### Failed frontiers and recursive preparation

If an unseen anchor depends on a check that has failed and is still in its
relearning interval, with no historical positive retrieval evidence, Guided
Cram returns a typed temporarily-blocked frontier rather than continuing down
that same branch. It then inspects the remaining unseen canonical anchors in
the ordinary Exam-SRS order and chooses the first independent branch that can
make useful progress. An urgent canonical review is still returned directly;
graph preparation applies only to unseen canonical material. Only after all
useful ranked branches are blocked does the deterministic coverage fallback
allow the selected unseen anchor through. That fallback is a deadlock escape,
not normal progression.

Every unseen canonical card, including a card selected as evidence for a
canonical-backed prerequisite, goes through the same recursive preparation
operation. Its whole mapped target bundle is lesson-introduced before the card
is returned. A visited-card guard terminates cycle-shaped card-to-concept
evidence dependencies deterministically. A weak success remains positive
introduction evidence and may unlock a dependent lesson immediately; a failure
remains unrehearsed/relearning and returns through the ordinary Exam-SRS due
logic.

## Guided Knowledge Checks

There is one stable skill, normally `knowledge-check:<concept-id>`, for each
concept with zero linked canonical cards. The validator derives this set from
the graph; it is not a hardcoded “28 forever” assumption. At the current
revision there are 28 no-card concepts and 28 skills. Canonical-backed concepts
use their richer existing cards and do not receive duplicate guided skills.

Static checks have multiple substantially different scenarios. Percentage and
ratio use deterministic numeric generators. Variant choice is derived from the
stable skill ID, review count, and transient session seed; it never uses raw
`Math.random()` and the parameters are not persisted. `npm run
validate:guided-learning` checks all static variants and fuzzes each generated
template over 500 deterministic seeds.

### Prerequisite-safety audit

Each emitted check variant carries `requiredConceptIds`. These are concepts
needed to reason through the prompt, excluding the skill's target concept. The
validator requires every required ID to be a strict transitive prerequisite of
the target; a descendant, the target itself, an unknown ID, or missing metadata
fails validation. This prevents a foundation check from quietly testing a
future lesson. The audit below covers all 28 current no-card skills. Source
labels are the existing source references inherited from the audited concept
articles; the underlying local files are listed in `knowledge/sources.json`.

| Target concept           | Variants / generator              | Required concepts                                           | Course source references                                       |
| ------------------------ | --------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| `percentage`             | generated `percentage-out-of-100` | none                                                        | Textbook p. 19                                                 |
| `percentage-point`       | 2 static                          | `percentage`                                                | Textbook p. 40                                                 |
| `ratio`                  | generated `ratio-per-unit`        | none                                                        | Textbook p. 56                                                 |
| `rate`                   | 2 static                          | `ratio`                                                     | Week 1 Lecture 2 p. 29                                         |
| `price`                  | 2 static                          | `market,buyer,seller`; second variant `buyer`               | Textbook p. 19                                                 |
| `quantity`               | 2 static                          | none                                                        | Week 1 Lecture 1 p. 23                                         |
| `market`                 | 2 static                          | `buyer,seller`                                              | Textbook p. 70                                                 |
| `buyer`                  | 2 static                          | none                                                        | Textbook p. 164                                                |
| `seller`                 | 2 static                          | none                                                        | Textbook p. 198                                                |
| `supply`                 | 2 static                          | `market,price,quantity`                                     | Textbook p. 70; Week 8 Lecture 2 p. 46                         |
| `demand`                 | 2 static                          | `market,price,quantity`                                     | Textbook p. 171; Week 8 Lecture 2 p. 57                        |
| `equilibrium`            | 2 static                          | `supply,demand,quantity`                                    | Textbook p. 123; Week 7 Lecture 1 p. 50                        |
| `shortage`               | 2 static                          | `supply,demand`                                             | Textbook p. 125                                                |
| `surplus`                | 2 static                          | `supply,demand`                                             | Week 3 Lecture 1 p. 18                                         |
| `income`                 | 2 static                          | `flow`                                                      | Week 1 Lecture 1 p. 53; Textbook p. 97                         |
| `expenditure`            | 2 static                          | `flow`                                                      | Week 1 Lecture 1 p. 49; Week 3 Lecture 1 p. 10                 |
| `lending`                | 2 static                          | `asset,flow`                                                | Textbook p. 164; Week 5 Lecture 1 p. 18                        |
| `index`                  | 2 static                          | `ratio,price,quantity`                                      | Week 1 Lecture 2 p. 4; Textbook p. 39                          |
| `graph-intercept`        | 2 static                          | `graph-axis`                                                | Week 3 Lecture 1 p. 36; Textbook p. 121                        |
| `income-approach`        | 2 static                          | `gross-domestic-product,income,value-added`                 | Week 1 Lecture 1 p. 53; Textbook p. 26                         |
| `exports`                | 2 static                          | `gross-domestic-product,expenditure,market`                 | Week 1 Lecture 1 p. 50; Week 8 Lecture 1 p. 8; Textbook p. 247 |
| `disinflation`           | 2 static                          | `inflation,price-level,percentage-point`                    | Textbook p. 40; Week 1 Lecture 2 p. 19                         |
| `population`             | 2 static                          | `stock`                                                     | Week 1 Lecture 1 p. 78; Week 1 Lecture 2 p. 22; Textbook p. 56 |
| `working-age-population` | 2 static                          | `population,stock`                                          | Week 1 Lecture 2 p. 22; Textbook p. 56                         |
| `expectations`           | 2 static                          | none                                                        | Textbook p. 86                                                 |
| `wage`                   | 2 static                          | `income,price`                                              | Textbook p. 70; Week 2 Lecture 1 p. 43                         |
| `credit`                 | 2 static                          | `borrowing,lending,bank`                                    | Textbook p. 164; Week 5 Lecture 1 p. 75                        |
| `catch-up-growth`        | 2 static                          | `convergence,technology-ideas,institutions-property-rights` | Week 9 Lecture 1 p. 10; Textbook p. 281                        |

The percentage generator deliberately uses only whole-number “marked squares
out of 100” prompts. It does not ask for a percentage change, use the original
amount as a denominator, or rely on the `ratio` lesson. The lending variants
use a plain “give funds now, repay later” scenario rather than a bond; wage
uses a direct payment-for-one-hour scenario rather than nominal versus real
wages; index uses the index scale rather than an inflation calculation; and
catch-up growth asks about narrowing an output-level gap without requiring a
separate compounding lesson. Distractors were also simplified where later
course vocabulary would add noise rather than test the target.

The current audit result is 28 / 28 prerequisite-safe skills, 0 descendant
dependencies, 0 unknown required concepts, and 0 prerequisite-unsafe emitted
variants. The validator reports these counts in CI. The source PDFs used for
this pass remain local reference material and are not bundled or committed.

### Beginner-safe distractor audit

All 52 static variants were manually inspected for distractors as well as
their correct-answer reasoning. The `quantity:units-sold` distractors no
longer use interest-rate or income-tax terminology; they use a close price
contrast and ordinary bakery facts. The first `lending` variant no longer uses
shortage or price-index distractors; it contrasts lending with a gift,
immediate purchase, and payment for work. The income-approach and catch-up
growth variants likewise use ordinary, non-technical alternatives where a
later course term was not needed.

The remaining technical distractors are intentional close contrasts taught by
the same concept or its immediate explanation: relative percentage versus
percentage points, price versus quantity, supply versus demand, equilibrium
versus shortage/surplus, exports versus imports, and deflation versus
disinflation. They are retained because the contrast is the pedagogical point
of the item, not because the learner must already know an unrelated future
chapter.

The command runs explicitly in pull-request CI and is also part of `prebuild`,
so a production bundle cannot omit the check-registry validation.

Checks use the existing ReviewEvent shape and modes. A guided MCQ records
`mode: "mcq"`, an objective boolean, `rating: null`, and the selected choice. A
numeric check records `mode: "calculation"`. The repository accepts only the
union of canonical card IDs and the registered check IDs. Unknown arbitrary IDs
are still rejected. Backup version 2 and sync protocol v1 remain unchanged.

## Disclosure and save safety

The active check passes its one tested concept to `KnowledgeText`. Before the
answer, a tested term opens the existing blocked notice, not its summary,
mechanism, equation, worked example, contrast, prerequisite list, or graph. An
incidental term keeps the existing restricted preview policy. After the answer
is saved, the full concept sheet and graph can be opened. This prevents a CPI,
bond-price/rate, or Rule-of-70 lookup from giving away the active answer.

The answer event is created once before the first repository call. If saving
fails, the exact event and exact rendered variant remain visible for Retry save;
the next step is not selected until the write succeeds. This also means a
generated numeric variant cannot change while a save is being retried.

The lesson `Check understanding` action follows the same save-before-advance rule:
the dedicated IndexedDB acknowledgement write completes before the next Guided step
is selected. While it is saving, duplicate activation is disabled and the lesson
remains visible. A failed write leaves the lesson unacknowledged and offers Retry
save. The write is idempotent and creates zero ReviewEvents, CardState changes,
correct/incorrect evidence, or mastery evidence.

## Coverage and existing modes

The canonical Exam-SRS selector remains the coverage anchor, including high-yield
tags, chapter pressure, due/relearning recovery, Study Ahead, and user scopes.
Normal `#/study` still selects only the 352 canonical cards. Practice Lab still
selects authored questions/calculations, and mocks remain unchanged; Guided Cram
is a separate route rather than a new Study preset.

The progress header reports canonical cards seen out of 352, concepts with
positive evidence, concepts currently `Solid`, due canonical/check retrievals,
and the existing Exam-SRS phase/time remaining. It does not report XP,
probabilities, or a persisted guided level.

The manual Knowledge foundation curriculum remains available. It uses the
stronger `Solid` recommendation criterion and now can move past a no-card
foundation after its check evidence becomes solid. Guided Cram uses the weaker
positive-evidence threshold so a weak success can unlock the next idea while its
short Exam-SRS review is still scheduled.

## Worked path

On a fresh device, the canonical anchor for an inflation-related card may cause
the graph to introduce percentage, percentage change, index/price index, and
price level one at a time. Each no-card lesson is followed by its stable check.
After positive evidence, Guided Cram can introduce inflation and then present
the relevant canonical card. A correct percentage calculation is an objective
calculation success (`rating: null`) and a failed percentage calculation is an
objective failure that returns on the short failure interval. A canonical
recall card such as the bank-balance-sheet card can produce a legitimate
`Struggled` rating for the asset concept and return in about 45 minutes; that
weak canonical evidence can unlock the dependent capital idea while its review
remains scheduled. Another due item or an independent new branch can appear
between a failure and its retry.

## Offline and persistence contract

All articles, check variants, generators, grading, graph traversal, and
selection code are bundled in the PWA. No runtime LLM, dictionary, textbook,
or network service is used. ReviewEvents and derived CardStates remain the only
learning evidence; the separate `guidedLessonSeen` store records only explicit
lesson acknowledgement. The database is version 5. `ProgressBackupV3` is the current
backup version and includes an optional backwards-compatible `lessonSeenConceptIds`
array. Sync protocol v1 and the Worker source/configuration are unchanged:
acknowledgement is currently local-device-only and is not synced across devices.
