# Course knowledge graph

This feature is a bundled, offline course map for the macroeconomics app. It is
deliberately a learning structure rather than a dictionary: each article starts
with a literal meaning, builds an intuition, explains the mechanism, and then
points to prerequisites, contrasts, examples, equations, traps, and course
sources.

## Data and graph semantics

The static content is split into foundation records and course records in
`src/knowledge/`. `KnowledgeConceptRecord` contains the article and graph
structure; `KnowledgeConcept` adds derived links to canonical cards and exam
questions. `knowledge/sources.json` is the source catalogue. The content is
deep-frozen when assembled in `src/knowledge/data.ts`.

`concept.prerequisites` is the directed learning relation. For `A → B`, `A`
appears in `B.prerequisites`; the graph renderer draws the same direction. The
prerequisite graph is validated as a DAG and receives a deterministic
topological order and depth. `relatedConcepts` is a separate, non-directional
discovery relation and is allowed to form cycles. Contrasts are also separate
links so a familiar-looking term does not collapse two pedagogically distinct
concepts.

There are 43 foundation-tagged concepts, including percentage change and
percentage points, stock/flow, price and quantity, market participants,
supply/demand/equilibrium, income/expenditure, asset/liability,
borrowing/lending, principal/interest/rates, present value, indexes,
nominal/real, graph axes/slope/intercept, simple algebra, future payments, and
expectations. The graph has 10 roots: asset, buyer, expectations, flow,
graph axes, percentage, quantity, ratio, seller, and stock.

## Source policy

The primary local materials consulted were:

- `/home/ifrankling/unsw/econ/lectures/Week1_Lecture1.pdf`
- `/home/ifrankling/unsw/econ/lectures/Week1_Lecture2.pdf`
- `/home/ifrankling/unsw/econ/lectures/Week2_Lecture1.pdf`
- `/home/ifrankling/unsw/econ/lectures/Week2_Lecture2.pdf`
- `/home/ifrankling/unsw/econ/lectures/Week3_Lecture1.pdf`
- `/home/ifrankling/unsw/econ/lectures/Week3_Lecture2.pdf`
- `/home/ifrankling/unsw/econ/lectures/Week4_Lecture1.pdf`
- `/home/ifrankling/unsw/econ/lectures/Week4_Lecture2.pdf`
- `/home/ifrankling/unsw/econ/lectures/Week5_Lecture1.pdf`
- `/home/ifrankling/unsw/econ/lectures/Week5_Lecture2.pdf`
- `/home/ifrankling/unsw/econ/lectures/Week7_Lecture1.pdf`
- `/home/ifrankling/unsw/econ/lectures/Week7_Lecture2.pdf`
- `/home/ifrankling/unsw/econ/lectures/Week8_Lecture1.pdf`
- `/home/ifrankling/unsw/econ/lectures/Week8_Lecture2.pdf`
- `/home/ifrankling/unsw/econ/lectures/Week9Lec125.pdf`
- `/home/ifrankling/unsw/econ/Playconomics Textbook.pdf`
- the canonical deck, question banks, and course map in this repository.

PDF text was extracted with `pdftotext -layout` for source inventory and page
checking; OCR was not needed. The PDFs remain local reference material and are
not copied into the repository. Explanatory prose in the graph is newly written
paraphrase. `sourceRefs` store a source ID, PDF page, and a short traceability
note; they do not display long quotations.

The course’s Australian convention is retained: RBA, cash rate, Exchange
Settlement Accounts, settlement balances, and AUD quotation examples are used
where the lectures use them.

## Validation and mappings

`npm run validate:knowledge` runs `scripts/validate-knowledge.ts`. It rejects
duplicate or missing concept IDs, missing prerequisite/related/contrast targets,
self prerequisites, duplicate edges, cycles, malformed aliases, unknown card or
question links, missing canonical-card coverage, malformed source references,
out-of-range PDF pages, and empty required article fields. It also checks reverse
graph assumptions through deterministic topological sorting and prints graph
statistics.

`src/knowledge/contentMap.ts` is the single typed card mapping. Its authored
topic rules produce a frozen map for every canonical card, with a chapter
fallback so graph guidance can never strand a card. Questions do not have a
second independent map: their existing `reviewCardId` transits through this map.
The assembled concepts derive `linkedQuestionIds` from that relationship.

The current validation output is:

```text
Knowledge graph valid
Concepts: 297
Prerequisite edges: 894
Related edges: 1132
Roots: 10
Foundation concepts: 43
Maximum prerequisite depth: 15
Cards mapped: 349 / 349
Exam questions mapped: 161 / 161
Concepts with lecture source: 287
Concepts with textbook source: 290
Concepts without source support: 0
Ambiguous inline aliases: 1
Cycles: 0
```

## Aliases and inline terms

`KnowledgeText` uses a prebuilt trie over concept names and safe aliases. Matching
is case-insensitive, phrase-boundary aware, longest-match first, deterministic,
and non-overlapping. Hyphenation and punctuation are normalised without changing
the source text displayed to the learner. Broader beginner phrases such as
`government IOU`, `cost of borrowing`, `RBA rate`, and `prices going up` live in
`searchTerms`; they aid search but are not automatically highlighted in every
paragraph. Very short/common words are excluded from inline rendering even when
they are useful formal abbreviations.

Ambiguous aliases are represented as a chooser rather than silently selecting a
concept. The current authored set has one deliberate ambiguity: the everyday
word `depreciation` can refer to currency depreciation or capital depreciation.
The chooser displays both formal concepts, while the more specific aliases and
course mapping distinguish them. The matcher and UI treat every future
ambiguity the same way.

## Learning status and study ordering

There is no concept database, mastery field, due date, or second scheduler.
`deriveConceptStatuses` reads the existing Exam-SRS snapshot derived from
`ReviewEvents` and card mappings:

- `Unseen`: no usable review evidence for any linked card;
- `Needs work`: any linked card is relearning, weak, or currently due;
- `Solid`: all linked cards are learned;
- `Learning`: evidence exists but the conservative solid/needs-work conditions
  do not apply.

Concepts with no linked card are treated as introduced background for readiness,
which prevents a deadlock. They remain `Unseen` in the display because no review
evidence exists. Multiple linked cards aggregate conservatively: one weak or due
card keeps the concept at `Needs work`; a mix of reviewed and unreviewed linked
cards stays `Learning` rather than being promoted to `Solid`.

The prerequisite signal is passed to Exam-SRS only as
`newCardPrerequisiteReadyByCardId`. It is consulted after the existing priority
calculation and only when both candidates are unseen. Due, failed, relearning,
weak, study-ahead, deadline contraction, buffers, review-event semantics, and
focused candidate pools remain controlled by the existing selector. If every new
card has unmet prerequisites, the selector still returns its deterministic normal
fallback. This is guidance, not a hard lock.

“Learn from foundations” chooses the earliest not-yet-introduced concept in the
topological order that has useful linked course material, shows its short
explanation, and links to existing Study and Practice Lab surfaces. It does not
create another scheduler; answering a linked card continues to create ordinary
review evidence.

## UI and disclosure

The primary `Knowledge` navigation item opens `#/knowledge`. A concept deep link
is `#/knowledge?concept=bond`. The page supports local search, foundation/
chapter/topic browsing, concept articles, status labels, “What you should know
first”, “What this unlocks”, deterministic learning paths, and a focused SVG
graph. The graph includes a bounded set of ancestors, the selected node, and
direct dependants, with arrows from prerequisite to dependent. The same links
are rendered as ordinary text buttons below the SVG for accessibility and phone
use.

`KnowledgeText` safely renders trusted plain text as React nodes; it does not use
`dangerouslySetInnerHTML`. It is available in Study prompts and answers,
Practice stems and feedback, generated calculation prompts and solutions, mock
results, and knowledge articles. Answer choices remain plain text controls, so a
term explanation cannot be nested inside a radio-label/button interaction.

During a live timed mock, `MockQuestion` leaves terms plain and does not open the
detailed explainer. Full explanations are available in Mock results. In ordinary
Study and Practice, a pre-answer term opens only the summary and intuition
preview; the mechanism, examples, equations, and traps are available after the
answer/reveal. This avoids turning a direct objective question into an answer
lookup while retaining useful vocabulary support.

The explainer is a reusable dialog/sheet with an accessible name, Escape close,
focus return, keyboard-focusable term buttons, a nested local back stack, and
scrollable mobile layout. Looking up a term does not alter the current Study,
Practice, or mock state.

## Offline, persistence, and limitations

All graph content, indexes, articles, source labels, and traversal code ship in
the static frontend bundle. Search and lookup perform no runtime network calls.
Knowledge data is not included in encrypted sync payloads and is not uploaded
to Cloudflare. No database migration is used: DB version remains 3, manual
backup format remains `ProgressBackupV2`/version 2, and sync protocol remains
version 1.

The graph is an authored teaching model, not an automatically inferred causal
model. Text extraction was used to inventory headings and check references; it
was not used to infer prerequisite edges from co-occurrence. Some everyday
language searches intentionally resolve through `searchTerms` rather than
inline aliases to avoid noisy highlights. Future content additions should run
the validator and manually inspect long/high-degree paths before merging.
