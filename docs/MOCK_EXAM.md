# Full mock exams and Practice Lab

The full mock simulates the supplied course format: 60 multiple-choice questions,
10 minutes of reading time, and 100 minutes of writing/answering time. It is an
engineering simulation based on the course structure and authored bank. It is not a
prediction of the real exam's exact question distribution.

## Selection

Each attempt is built from a deterministic seed and stores its selected question
manifest. It contains five questions from each Chapter 1–10 and ten Chapter 0
mixed/integrated questions. A review-card concept can appear at most once in an
attempt. The current bank target is one graph from each substantive chapter plus
five tables from five distinct chapters: 10 graphs and 5 tables in total. Difficulty
is constrained to 15–21 / 27–33 / 9–15 for levels 1 / 2 / 3. The selector also
requires at least 10 calculations, 20 scenario-or-model-discrimination questions,
2 sequences, and keeps each answer position between 12 and 18. If the immutable
bank cannot satisfy those bounds, construction fails clearly rather than silently
returning a weaker mock.

Question freshness is a preference. Completed attempt history supplies use counts;
questions with lower prior use are considered first, with seeded tie-breaking. It
cannot override chapter, concept, stimulus, difficulty, or style requirements.

## Timing and persistence

Reading and writing phases are derived from absolute timestamps, so refreshes,
background tabs, PWA suspension, and device sleep do not pause the exam. Reading
allows navigation, stimulus inspection, and flags, but not answers. Writing enables
answers and keyboard shortcuts. Progress is autosaved after answer/flag/navigation
changes and at approximate active-question checkpoints; per-question time is
explicitly approximate active interaction time.

There is only one unfinished attempt. An unfinished attempt can be resumed or
abandoned. Submission is irreversible and may happen early. Expiry is finalised on
the next foreground/reopen if the app was closed at the deadline.

## Exam-SRS integration

Finalisation is one IndexedDB transaction over the attempt, card states, and review
events. It creates exactly one deterministic event per question using IDs of the
form `mock:<attempt-id>:<question-id>`, `mode: "mcq"`, `rating: null`, the final
selected choice, and objective correctness. Unanswered questions are failures.
Repeating finalisation is idempotent and cannot increment card states twice.

## Practice Lab

Practice Lab is untimed and user-directed. Question-bank drills expose chapter,
style, stimulus, and small set-size filters. Graphs & Tables focuses the 30 audited
stimulus questions, and Calculations focuses authored calculation MCQs. These modes
give immediate feedback only after their normal MCQ review has saved successfully.

Written Response selects canonical non-MCQ cards. The learner types a response,
explicitly reveals the model answer and canonical explanation, then self-rates with
Forgot, Struggled, or Got it. Free text is not automatically graded and is not
persisted in IndexedDB or backups. All modes use the existing Exam-SRS evidence
semantics; Practice Lab is not a second scheduler or analytics database.

The interaction formats are informed by common economics-learning formats such as
MCQs, written responses, graph/table interpretation, and applied problem solving.
No authenticated Playconomics/Academia content was accessed, scraped, copied, or
used as question text.
