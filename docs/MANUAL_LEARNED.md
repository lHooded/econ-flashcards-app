# Manual learned overrides

“Mark learned permanently” is a learner-authored exclusion, not evidence that a
retrieval attempt succeeded. The app never creates a synthetic `ReviewEvent`, changes a
rating, or deletes historical review evidence for this action.

## Source records and effective suppression

The durable source record is keyed by `(kind, targetId)` and contains its creation
timestamp:

```ts
type ManualLearnedKind = "card" | "concept" | "question";

interface ManualLearnedOverride {
  kind: ManualLearnedKind;
  targetId: string;
  createdAt: string;
}
```

The pure resolver derives effective concept, card, and question sets from those source
records and the current immutable content.

- A card override excludes that canonical card and questions whose
  `reviewCardId` is that card. A question that merely lists the card in
  `sourceCardIds` is not automatically excluded.
- A direct question override excludes only that question. Its canonical card and
  concept remain available.
- A direct concept override marks only that concept as manually satisfied. A card is
  excluded by concept sources only when every concept in the production
  `card-concept-map.json` entry for that card is manually satisfied. Thus `mix-002`
  remains available after marking only `nominal-gdp`; it is excluded only after
  `real-gdp`, `nominal`, and `real` are also marked. The same conservative rule
  applies to `mix-020`, `ch01-019`, and `ch02-027`.
- A question is excluded by a direct question source or when its canonical
  `reviewCardId` is effectively excluded. Concept `linkedQuestionIds` alone do not
  suppress a question whose multi-concept card remains active.
- A concept can also be operationally covered when all of its linked cards are
  excluded by manual sources. That derived coverage is kept separate from explicit
  concept source records and never becomes a new source that recursively suppresses
  neighbouring cards or concepts.

Overlapping source records compose. Restoring a concept removes only the concept
record; a direct card record continues to exclude that card until it too is restored.
The Knowledge page remains browsable when a concept is manually learned.

## Scheduler and history

An active card override makes the override-aware Exam-SRS state operationally
`learned`, with `dueAt: null`, `isDue: false`, and `isManuallyLearned: true`. Its prior
evidence-derived strength, review count, timestamps, and outcome remain present. A
restored card is reconstructed from those same historical events, including a prior
failure or due state.

Manual exclusions count toward operational coverage and the operational learned
summary, while the canonical deck denominator remains unchanged. Home and chapter
summaries distinguish evidence-derived learned cards from manual-only cards; a manual
assertion is never retrieval evidence. Forecast and other simulation consumers should
use the override-aware snapshot and short-circuit cards with `isManuallyLearned: true`
instead of deriving a future due date from preserved history.

## Persistence, backup, and sync

Overrides are stored in the local IndexedDB `manualLearnedOverrides` store (database
schema version 5). JSON backups include the source records in backup format v3. V1 and
ordinary V2 backups migrate with an empty override set. The transitional V2 format
emitted by the first PR #13 implementation optionally included the records, so those
records are validated and preserved when present; all new exports are unambiguously V3.
V3 validates the source records before replacement. Local IndexedDB rows are
structurally validated on load: malformed rows are ignored, while structurally valid
orphan records are retained but ignored by the resolver if a future deck update removes
their content.

Resetting local progress clears overrides. Restoring an override never deletes review
history. Manual overrides are included in export/import, but remain local-device-only
under encrypted sync protocol v1 because that version has no safe versioned field for
them. The confirmation and Settings UI make this scope explicit. Sync does not clear
or merge them incorrectly.

## Full mocks

New full mocks filter effective excluded questions and canonical cards before applying
the existing 60-question blueprint. If the quotas cannot be satisfied, creation fails
with an eligibility message rather than reintroducing excluded material. An active
mock keeps its immutable manifest if an override is created elsewhere; the override
applies to future mock creation only.
