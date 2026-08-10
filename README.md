# Econ Cram Cards

Econ Cram Cards is an installable, offline-first React PWA for rapidly reviewing
the 349-card macroeconomics deck covering Chapters 1–10. It is designed for the
current exam-cramming vertical slice: answer cards, save every review locally, set
an exam target and buffer, and carry progress between devices with an explicit JSON
backup.

## Current scope

- Home progress facts: total, unseen, seen, and total reviews.
- A simple unscheduled study queue: unseen cards first, then stable chapter/card ID
  order.
- Authored MCQ cards with objective correctness, explanations, and common traps.
- Recall-style cards with `Forgot`, `Struggled`, and `Got it` self-ratings.
- Exam date/time and deliberate study buffer settings. The default buffer is 24 hours.
- IndexedDB persistence and validated replace-style JSON export/import.
- A service worker and web app manifest for installable offline use.

Exam-SRS, due dates, readiness metrics, daily limits, mock exams, analytics, cloud
sync, accounts, and backends are intentionally not implemented in this PR.

## Development

```bash
npm install
npm run dev
```

The development server is available at the URL Vite prints. The app uses the
browser's local timezone for the `datetime-local` exam setting.

## Quality checks

```bash
npm run validate:deck
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
```

`npm run build` validates the canonical deck before producing a static production
build. Generated output in `dist/` is not committed. Preview a production build
with:

```bash
npm run preview
```

## Static deployment and offline use

Deploy the contents of `dist/` to any static host that supports serving the SPA's
entry point for `/`. The Vite PWA plugin generates `manifest.webmanifest` and a
service worker that precaches the app shell and bundled assets. After one successful
visit, core studying and the bundled deck work without a network connection. The
service worker uses automatic update checks when a newer deployment is available.

## Content, progress, and backups

`flashcards/MACRO1_master_flashcards.json` is the canonical, immutable course-content
source. The application validates its metadata and every card at module startup and
before a production build; the real deck is bundled rather than copied into source
code by hand.

Mutable user data lives in IndexedDB database `econ-flashcards`, version 1:

- `cardStates`: one summary state per reviewed card;
- `reviewEvents`: append-only review history;
- `settings`: the app settings record, including `examAt` and
  `studyBufferHours`.

The app never stores a second mutable copy of the deck. The derived study deadline is
always calculated as `examAt - studyBufferHours`; it is not independently persisted.

Export files use this format:

```json
{
  "format": "econ-flashcards-progress",
  "version": 1,
  "exportedAt": "2026-08-10T00:00:00.000Z",
  "settings": {},
  "cardStates": [],
  "reviews": []
}
```

Imports are fully validated, including card IDs, timestamps, review fields, and
version, before the user confirms replacement. The replacement uses one IndexedDB
transaction so a failed write does not leave a half-imported database.

## Architecture

The immutable-content layer (`src/data` and `src/domain/content`) parses and freezes
the supplied deck. The progress domain (`src/domain/progress`) contains only mutable
review/state/settings concepts, while `src/db` is the small persistence boundary over
IndexedDB. React pages consume snapshots through the progress context rather than
talking to IndexedDB directly. `src/study/unscheduledStudyQueue.ts` is deliberately a
replaceable baseline scheduling boundary; a later Exam-SRS implementation can replace
it without changing storage or card rendering fundamentals.

No malformed economics records were found in the supplied 349-card JSON during this
PR. The 31 authored MCQs have valid zero-based correct-choice indexes, and the 318
non-MCQ cards validate without choices.
