# Guided Cram

Guided Cram is the active-learning route at `#/guided`. It is designed for a
learner with weak background knowledge and a short, known exam horizon. It
combines two existing, deliberately separate signals:

- the immutable prerequisite DAG answers “what new idea should be introduced
  next?”;
- Exam-SRS answers “what previously attempted material is urgent to retrieve
  again?”

The next step is recomputed after every saved review. There is no precomputed
lesson plan and no second scheduler.

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

An attempted guided check can interrupt new material only when its existing
Exam-SRS urgency is strictly higher than the canonical anchor. Canonical
relearning/due/weak priority remains first on equal or higher numeric priority.
Unseen guided checks are not put into the global scheduler; they become active
only when their concept is needed as a prerequisite.

## New concepts and evidence

For an unseen canonical anchor, Guided Cram collects the mapped concept IDs and
their prerequisite ancestors in deterministic topological order. It presents
one concise lesson at a time. After the lesson:

1. a no-card concept gets its registered Guided Knowledge Check;
2. a canonical-backed prerequisite gets a suitable linked canonical card;
3. when all relevant concepts have positive evidence, the selected canonical
   card is shown.

The selector does not require every prerequisite to be `Solid`. “Introduced
enough” is a transient derived condition: any positive retrieval evidence,
including a weak success, is enough to let the frontier move forward. An
unseen concept or a concept with only failed evidence is not introduced. A
failure remains a real Exam-SRS failure and is allowed to return when due; the
selector avoids forcing the same failed check immediately when another action
exists. A final canonical fallback prevents a graph state from making Study
unreachable.

Reading an article, clicking “I understand”, and advancing a lesson never
creates evidence.

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

## Coverage and existing modes

The canonical Exam-SRS selector remains the coverage anchor, including high-yield
tags, chapter pressure, due/relearning recovery, Study Ahead, and user scopes.
Normal `#/study` still selects only the 349 canonical cards. Practice Lab still
selects authored questions/calculations, and mocks remain unchanged; Guided Cram
is a separate route rather than a new Study preset.

The progress header reports canonical cards seen out of 349, concepts with
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
the relevant canonical card. A weak percentage check can be revisited in about
45 minutes without blocking inflation forever; a failed check returns on the
failure interval, while another due item or a different new branch can appear
in between.

## Offline and persistence contract

All articles, check variants, generators, grading, graph traversal, and
selection code are bundled in the PWA. No runtime LLM, dictionary, textbook,
or network service is used. ReviewEvents and derived CardStates continue to be
the only mutable truth. DB version 3, `ProgressBackupV2`/version 2, sync
protocol v1, and the Worker are unchanged.
