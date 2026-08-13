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

## Study Time Forecast

Home's Study Time Forecast is a derived, cram-oriented estimate of how much more
active review the learner may need to reach several useful study targets. It does not
add scheduler state to IndexedDB, backups, or sync. Given the same canonical cards,
ReviewEvents, exam settings, effective manual card/concept exclusions, model version,
and effective current time, another device can recreate the same forecast.

### Operational targets

The V1 targets are defined together in `src/study/forecast/targets.ts`:

| Target        | Operational criterion                                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full coverage | Every canonical card is operationally covered: reviewed with usable evidence or manually marked learned.                                                               |
| Working       | 100% operational coverage and at least 80% of canonical cards are operationally `learned`.                                                                            |
| Exam-ready    | 100% operational coverage, at least 90% are operationally `learned`, and every critical exam-yield card is operationally covered.                                    |
| Strong        | 100% operational coverage, at least 95% are operationally `learned`, and every current `critical` card is operationally `learned`.                                   |
| Near-complete | 100% of canonical cards are operationally `learned`.                                                                                                                  |

`critical` is read through the existing exam-yield API only as a transparent
importance constraint. Its numerical score is not treated as a probability, mark,
recall estimate, or mastery score. These targets are app-defined study labels, not
scientifically validated proficiency levels.

An active manual learned card is treated as operationally completed for these targets
and is excluded from forward simulation, while remaining separate from retrieval
evidence in the Home provenance summary. The resolver's `coveredConceptIds` are passed
to prerequisite guidance directly, so a manually satisfied concept can be non-blocking
even when its linked card has no ReviewEvent. Restoring an override immediately
reconstructs the ordinary forecast state from the unchanged historical review events.

### Calibration and simulation

Pace calibration sorts review events with the canonical chronological comparator and
uses gaps between adjacent completed reviews. Gaps shorter than about 1.5 seconds or
longer than seven minutes are excluded; the latter are treated as session breaks. At
most the latest 100 usable gaps are retained. Robust 20th-percentile, median, and
80th-percentile cycle values describe the overall pace distribution. These gaps are
not assigned to recall/calculation versus MCQ: persistence timing can include feedback
and navigation belonging to both cards. The simulation therefore uses one global
pace distribution for all canonical modes. Valid `responseTimeMs` values are only a
secondary cold-start fallback because they do not include explanation reading and
navigation. With insufficient history, named conservative fallback cycle values are
also mixed into the sampled pace distribution as pseudo-observations; three repeats
of the fallback low/median/high values provide strong regularisation for the first
few real gaps, while 50 recent gaps make the prior relatively small. Calibration
confidence still reflects real timestamp-gap evidence, not pseudo-samples.

Outcome calibration interprets ReviewEvents through `deriveReviewEvidence`, then
replays all usable history chronologically to classify each observation by mode family
and its true previous learning bucket (`unseen`, recovery, `learning`, or `learned`),
then counts only the most recent 300 observations. This bounded recency window keeps
old performance from dominating a finite-horizon cram estimate without making the
first retained observation look artificially unseen. Outcome estimates use explicit
hierarchical smoothing: fallback prior → global learner distribution → mode family
distribution → learning-bucket distribution. Each level retains named prior weight,
so sparse evidence cannot make the next-review outcome effectively 0% or 100%; with
enough consistent observations, the empirical evidence dominates. MCQ smoothing is
performed only over failure and strong success, preserving zero `weak_success` for
canonical MCQ outcomes. These frequencies describe only simulated next-review
outcomes under this app—not a probability of remembering at the exam.

Each of 256 deterministic simulation runs starts from the current compact Exam-SRS
snapshot. It asks the ordinary selector for each next candidate, keeps its ordering,
Chapter 0 gate, high-yield pressure, prerequisite guidance, recent-card avoidance,
and deadline intervals, samples a calibrated outcome and active review cycle, and
applies the shared strength/learning-state/due-date transition. Pace samples span the
full calibrated distribution after break filtering and sparse-history regularisation;
the displayed 20th-percentile, median,
and 80th-percentile values are a separate uncertainty summary across trajectories,
subject to the censoring rules below. When no card is currently eligible, the virtual
clock advances to the next due time without adding active study time.

A run either reaches a target with a genuine completion record or is censored at the
defensive review-count/elapsed-time horizon (or because no eligible card remains).
Censored runs retain their actual progress and reason for diagnostics; they are not
assigned fabricated completion values. Completed trajectories provide observed
completion times, while censored trajectories establish that completion exceeded the
horizon. For each requested unconditional quantile `q` (20th percentile, median, or
80th percentile), if the completion fraction is `c` and `q < c`, the reported value
uses the completed-trajectory quantile `q / c`. If `q >= c`, that quantile is marked
unresolved. Thus a target at 80% completion can have a corrected numeric median but
not an ordinary p80; below 50% completion its median is unresolved. The UI shows
numeric values only where identifiable and never substitutes the largest completed
trajectory.

Active study time is therefore separate from elapsed time: five hours of active work
may require more than five hours of wall-clock time when Exam-SRS spacing intervenes.
Deadline labels compare the corrected median and, only when identifiable, the upper
model-range completion time with the effective study deadline
(`examAt - studyBufferHours`) and exam time. They distinguish achieved, comfortable,
tight, buffer, after-exam, no-exam, and unresolved cases. `comfortable` requires an
identifiable upper quantile that fits; an identifiable median with an unresolved or
late upper quantile is `tight`. Recommendations require an identifiable median and
choose the highest such target before the effective deadline, then before the exam
when buffer use is necessary. They call out spacing when waiting—not active workload—
is the main constraint.

The model version, ordered ReviewEvent content/settings, and effective manual
card/concept sets seed a local deterministic
PRNG. The current clock is deliberately not part of that random seed: it can change
which cards are due, but React renders do not randomly jitter the simulated outcomes.
When an estimate is sufficiently resolved, recommendation ordering is hierarchical:
choose the highest target whose median completion is before the effective study
deadline; describe it as comfortable when its upper range also fits, otherwise tight.
If none fit the effective deadline, choose the highest reliable median before the exam
and identify buffer use. If no reliable target fits before the exam, the next unmet
target is shown only as a priority fallback.
Forecast calibration confidence is `low`, `medium`, or `high` according to the amount
of usable pace and recent outcome evidence; it is not confidence of passing the exam.

The forecast runs in a worker on Home. A worker/model failure displays a retryable
availability message and does not affect the learner's saved progress.

The Study Time Forecast is not a predicted exam mark, probability of recall, or
guarantee of exam performance.

## Limitations

Exam-SRS optimises for the current product goal: complete coverage, fast correction,
repeated successful retrieval, and useful maintenance through a configured deadline
with no daily quota. It does not estimate a learner's recall probability, model every
memory variable, guarantee exam performance, or claim optimality. The constants are
deliberately inspectable engineering choices and may be revised in future versions;
because state is derived, a future implementation can do so without adding persisted
scheduler migrations.
