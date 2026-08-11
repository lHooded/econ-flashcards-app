# Exam-SRS

Exam-SRS is the default study mode in Econ Cram Cards. It is a transparent,
finite-horizon engineering heuristic for a nearby exam. It applies retrieval practice,
corrective feedback, successive relearning, shorter spacing near the study target, and
explicit coverage protection to the immutable current canonical deck (352 cards
at the high-yield release).

It is not SM-2 or FSRS. It is not a validated memory model, a probability model, or a
predicted exam mark. Its strength values and labels are operational scheduling evidence
that can be recomputed from the review history; they are not probabilities of recall.

## Derived state

IndexedDB and version-1 backups store cards, review events, card counters, and exam
settings. Exam-SRS does not persist `dueAt`, ease, stability, strength, readiness, or a
phase. `src/study/examSrs/deriveState.ts` groups the chronological review history by
card and derives the current state whenever the app needs it. This means imports and
exam-setting changes automatically recreate the schedule without a migration.

For every card, strength starts at `0` and is bounded to `0..6`:

| Evidence                                                              | Strength update | Outcome          |
| --------------------------------------------------------------------- | --------------: | ---------------- |
| `correct === false`, or `rating === "forgot"`                         |    reset to `0` | `failure`        |
| `rating === "struggled"` when not objectively incorrect               |          `+0.5` | `weak_success`   |
| authored MCQ: `mode === "mcq"`, `correct === true`, `rating === null` |         `+0.75` | `strong_success` |
| successful `got_it` or another non-MCQ objective success              |          `+1.0` | `strong_success` |

Explicit objective failure takes precedence over a contradictory imported rating.
Other combinations with no usable correctness evidence do not increase strength and do
not make a card seen. Semantically odd imported combinations are handled
deterministically: explicit failure still wins, recognized `struggled` still counts as
weak evidence, and an MCQ only gets the recognition increment when its rating is null.

The latest usable outcome determines the learning state:

- **Unseen** — no usable review evidence.
- **Relearning** — the latest usable outcome was a failure.
- **Weak** — the latest usable outcome was a `Struggled` success.
- **Learning** — the latest usable outcome was a strong success, but strength is below
  `2`.
- **Learned** — the latest usable outcome was a strong success and strength is at least
  `2`.

Thus two clean recall `Got it` reviews can reach Learned, while three successful MCQ
reviews are needed. A failure resets the evidence, and a latest Struggled result is
Weak even if older evidence had reached a higher strength.

## Baseline intervals

The unit-safe constants live in
`src/study/examSrs/intervals.ts` (`EXAM_SRS_INTERVALS`). The baseline after the latest
usable evidence is:

| Outcome / resulting strength    | Baseline interval |
| ------------------------------- | ----------------: |
| Failure                         |        10 minutes |
| Weak success                    |        45 minutes |
| Strong success, strength `< 1`  |           2 hours |
| Strong success, strength `< 2`  |           6 hours |
| Strong success, strength `< 3`  |          16 hours |
| Strong success, strength `< 4`  |          30 hours |
| Strong success, strength `< 5`  |          48 hours |
| Strong success, strength `< 6`  |          96 hours |
| Strong success, strength `>= 6` |            7 days |

## Deadline phases and contraction

With an exam configured:

```text
studyDeadline = examAt - studyBufferHours
```

The phase is:

- `cram`: `now < studyDeadline`;
- `buffer`: `studyDeadline <= now < examAt`;
- `post_exam`: `now >= examAt`.

Without an exam, the phase is `no_exam` and baseline intervals are used.

For a review performed during the cram phase, the implementation uses the constants
`deadline.minimumMs`, `deadline.maximumMs`, and `deadline.fractionOfRemaining` from
`EXAM_SRS_INTERVALS`:

```text
remaining = studyDeadline - reviewedAt
deadlineCap = clamp(1 hour, 24 hours, 0.35 * remaining)
interval = min(baseInterval, deadlineCap)
dueAt = min(reviewedAt + interval, studyDeadline)
```

The actual timestamp arithmetic is epoch-millisecond arithmetic. There is no random
fuzz, and no pre-deadline review is scheduled after the effective deadline.

## Buffer behaviour

The buffer is a recovery and polish period, not a second mandatory full-deck sweep.

- A Learned card whose pre-deadline due point reaches the effective deadline is frozen
  until `examAt`. A Learned card that was already overdue before the deadline keeps its
  earlier due point and remains due.
- Relearning, Weak, and Learning cards continue to receive reviews. A review performed
  during the buffer uses `buffer.minimumMs`, `buffer.maximumMs`, and
  `buffer.fractionOfRemaining` from `EXAM_SRS_INTERVALS`:

  ```text
  remaining = examAt - reviewedAt
  bufferCap = clamp(15 minutes, 4 hours, 0.25 * remaining)
  interval = min(baseInterval, bufferCap)
  dueAt = min(reviewedAt + interval, examAt)
  ```

- When a buffer review brings a card to Learned, it is current through the exam.
- After `examAt`, every card is evaluated using its ordinary baseline maintenance
  interval from the latest usable review, regardless of whether that review occurred
  during cram, buffer, or post-exam. Cram contraction and buffer freezing no longer
  apply. The resulting baseline due time may already be before the current time, in
  which case the card remains due; returning to maintenance does not forgive overdue
  reviews.

## Selection policy

Normal `Study now` eligibility is `unseen` or `dueAt <= now`. A future-due card is not
silently reviewed early. If no unseen or due card remains, the page says “You’re caught
up for now”, shows the next scheduled review, and offers “Study ahead anyway”.

The deterministic base priorities are:

| Candidate      | Base priority |
| -------------- | ------------: |
| due Relearning |          1400 |
| due Weak       |          1250 |
| Unseen         |          1100 |
| due Learning   |           950 |
| due Learned    |           700 |

Seen due cards get an overdue boost of
`min(400, overdueHours * 20)`. A `high-yield` tag adds `40`. Unseen cards in Chapters
1–10 receive `round(100 * (1 - chapterCoverage))`, where coverage is seen cards divided
by cards in that chapter.

Unseen Chapter 0 cards are mixed exam-discrimination material. They receive `-500`
before 60% non-mixed coverage, `-200` from 60% to below 80%, and `+50` at 80% or
above. Once a Chapter 0 card has been seen, this gate no longer applies to its due
reviews.

The selector first excludes the most recent three completed card IDs, then falls back
to them only if that would leave no candidate. Ties use earlier due time, fewer
historical reviews, lower chapter number, and lexical card ID. There is no random
ordering.

## Focused candidate scopes

The Study page can apply a small `StudyScope` before this selector runs. Smart leaves
the canonical deck unchanged. Needs work restricts the pool to Relearning, Weak, and
Learning states; New restricts it to Unseen; Due restricts it to seen cards; and the
content presets restrict it to calculation cards, valid authored MCQs (actual
`choices` plus `correctChoice`), or cards with the existing `high-yield` tag. Normal
unseen/due eligibility and the selector above still decide which card is eligible and
which eligible card wins. In particular, Due does not select a future-due card during
normal study; it can only be chosen by the explicit Study Ahead action.

The chapter filter intersects the preset pool. It does not change coverage accounting,
Chapter 0 thresholds, evidence, intervals, or priority constants. The one deliberate
exception is candidate gating: an explicit Chapter 0 scope tells the selector that the
learner deliberately restricted the universe to mixed exam-discrimination cards, so
unseen Chapter 0 cards can be selected. Smart / All chapters continues to apply the
automatic Chapter 0 gate. A scoped result distinguishes an eligible card, a matching
pool that is caught up with its next due time, an empty canonical focus, and a New
focus with no unseen cards remaining.

## Limitations

Exam-SRS optimises for the current product goal: complete coverage, fast correction,
repeated successful retrieval, and useful maintenance through a configured deadline
with no daily quota. It does not estimate a learner's recall probability, model every
memory variable, guarantee exam performance, or claim optimality. The constants are
deliberately inspectable engineering choices and may be revised in future versions;
because state is derived, a future implementation can do so without adding persisted
scheduler migrations.
