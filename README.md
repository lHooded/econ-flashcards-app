# Econ Cram Cards

Econ Cram Cards is an installable, offline-first React PWA for the 349-card
macroeconomics deck covering Chapters 1–10. Its default study mode is **Exam-SRS**, a
transparent deadline-aware heuristic for retrieval practice, corrective feedback,
successive relearning, and full-deck coverage.

Exam-SRS is not SM-2 or FSRS. It is not a validated memory model, a probability of
recall, a predicted exam mark, or a guarantee of exam performance. Its strength values,
learning states, and deadlines are recomputed from immutable card content, chronological
review events, and exam settings; scheduler state is not persisted.

## Study behaviour

- Configure the actual exam time and a deliberate study buffer, defaulting to 24 hours.
  The effective study deadline is `examAt - studyBufferHours`.
- Before the deadline, intervals contract toward the target. During the buffer,
  Learned cards carried through the deadline are held for the exam while Relearning,
  Weak, and Learning cards continue receiving recovery reviews. After the exam,
  ordinary baseline maintenance intervals resume.
- `Learned` means that repeated successful retrieval evidence reaches this app's current
  operational criterion. It does not mean permanent retention; learned cards can become
  due again.
- `Study now` selects dynamically after each persisted review. Unseen cards protect
  coverage, failures return after a short relearning interval without immediate
  repetition, and weak/due cards are prioritised deterministically.
- When no unseen or due card remains, Study says “You’re caught up for now”, shows the
  next scheduled review, and offers explicit “Study ahead anyway” behaviour.
- Recall cards retain `Forgot`, `Struggled`, and `Got it` self-ratings. Authored MCQs
  use objective grading and retain the failed-save retry flow and exact retry payload.

### Focused study

The Study page has one small, optional focus scope. **Smart** is the recommended
default and keeps the ordinary Exam-SRS candidate pool: all unseen or due cards.
**Needs work** restricts normal study to due Relearning, Weak, and Learning cards;
**New** selects unseen cards; **Due** selects scheduled seen reviews without introducing
new cards; **Calculations**, **MCQs**, and **High yield** restrict by canonical card
content, authored choices, and the existing `high-yield` tag respectively. Exam-SRS
still decides the order inside every pool, so focused study does not create a second
scheduler or a second score.

Any preset can combine with an independent chapter restriction, including the explicit
`Chapter 0 · Mixed exam discrimination` option. Smart / All chapters keeps the normal
automatic Chapter 0 unseen-card gate; explicitly choosing Chapter 0 bypasses only that
candidate-selection gate and leaves due dates, evidence, intervals, and priorities
unchanged. Study Ahead remains an explicit action and stays inside the active focus.

Focus state is represented in the hash (for example
`#/study?preset=calculations&chapter=8`) for reload-safe GitHub Pages navigation. It is
not written to review history or backups; every focused review uses the same existing
`recall`, `mcq`, or `calculation` event mode and IndexedDB persistence rules.

See [docs/EXAM_SRS.md](docs/EXAM_SRS.md) for the evidence rules, interval table,
deadline contraction, buffer semantics, selector priorities, and limitations.

## Static exam-question bank

The repository also contains a separate, immutable multiple-choice exam bank for
later realistic mock-exam work. Questions live in
[exam_questions/MACRO1_exam_questions.json](exam_questions/MACRO1_exam_questions.json)
alongside the declarative graph/table stimuli in
[exam_questions/MACRO1_exam_stimulus_questions.json](exam_questions/MACRO1_exam_stimulus_questions.json).
Questions are mapped back to canonical flashcards and include per-choice rationales
and provenance. Graphs render locally as responsive SVG and tables use semantic HTML;
distractors are statically authored and validated. There is no external chart service,
runtime LLM generation, API call, or random distractor synthesis. The mock-exam UI and
exam-performance persistence are intentionally reserved for a later phase. Because
multiple representations may share a canonical concept, a future mock attempt must
select at most one question for each `reviewCardId`.

## Development

```bash
npm install
npm run dev
```

The development server is available at the URL Vite prints. The app uses the browser's
local timezone for the `datetime-local` exam setting.

## Quality checks

```bash
npm run validate:deck
npm run validate:exam-questions
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
```

`npm run build` validates the canonical deck before producing a static production
bundle. Preview it with:

```bash
npm run preview
```

## GitHub Pages and offline use

The production build is configured for the repository subpath and is intended for:

<https://lhooded.github.io/econ-flashcards-app/>

`.github/workflows/deploy-pages.yml` builds and deploys only pushes to
`agent/initial-import`, plus manual `workflow_dispatch`. It uses the official Pages
artifact/deploy actions, with `pages: write`, `id-token: write`, and the
`github-pages` environment. Production deployment can only occur after this feature
branch is merged (or otherwise lands) on `agent/initial-import`; this PR does not
deploy its own branch over production. The repository owner may need to enable Pages
with **GitHub Actions** once in the repository Settings → Pages → Build and deployment
menu; that owner-side toggle cannot be encoded in this repository.

Vite uses `/econ-flashcards-app/` as the production base, and the manifest start URL,
scope, icons, favicon, service-worker registration, precache, and generated asset links
use that same base. Hash navigation remains in use, so no server-side SPA rewrite is
required. The generated service worker is scoped inside the project directory. After a
successful visit, the app shell, bundled deck, and IndexedDB progress continue to work
offline. Push notifications are not part of this app.

## Content, progress, and backups

`flashcards/MACRO1_master_flashcards.json` is the canonical, immutable course-content
source. The application validates its metadata and every card at module startup and
before a production build; the real deck is bundled rather than copied into source
code by hand.

Mutable user data lives in IndexedDB database `econ-flashcards`, version 1:

- `cardStates`: existing review counters and transactionally maintained card summaries;
- `reviewEvents`: append-only chronological review history;
- `settings`: the exam target and deliberate buffer.

Exam-SRS does not add persisted due dates, strength, ease, stability, readiness, or
phase. Export/import remains the current device-sync mechanism: export a validated JSON
backup from Settings / Data, then import it on another device. Backup format version 1
is retained, and importing review history plus settings recreates the derived scheduler
state without scheduler fields.

## Architecture

The immutable-content layer (`src/data` and `src/domain/content`) parses and freezes the
deck. The progress domain (`src/domain/progress`) contains mutable review/state/settings
concepts, while `src/db` is the transactional IndexedDB boundary. The pure Exam-SRS
boundary is under `src/study/examSrs/`: it derives evidence/state and intervals,
selects the next card, and produces dashboard summaries without calling `Date.now()`.
React pages pass an explicit current time and consume snapshots through the progress
context rather than talking to IndexedDB directly.

Mock exams, generated distractors, integrations, accounts, cloud sync, notifications,
daily quotas, numeric-answer parsing, FSRS, SM-2, and projected scores are intentionally
out of scope.

The reusable stimulus domain under `src/stimulus` and `src/components/stimulus` is
bundled content infrastructure only. It is not wired into ordinary Study mode; the
later mock-exam UI can render a question’s optional `question.stimulus` without
knowing whether it is a graph, table, or absent.

No malformed economics records were found in the supplied 349-card JSON. The 31
authored MCQs have valid zero-based correct-choice indexes, and the 318 non-MCQ cards
validate without choices.
