# Manual learned overrides

“Mark learned permanently” is a learner-authored exclusion, not evidence that a
retrieval attempt succeeded. The app never creates a synthetic `ReviewEvent`, changes a
rating, or deletes historical review evidence for this action.

## Source records and expansion

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
- A concept override marks the concept satisfied, excludes its linked cards and linked
  questions, and excludes questions whose canonical review card is one of those cards.
  It does not mark prerequisites or related concepts.
- A direct card override contributes to a concept’s operational status only through
  the ordinary linked-card rules: a concept is treated as covered this way only when
  all of its linked canonical cards are manually learned. One excluded card does not
  silently declare a broader multi-card concept learned.
- A question override excludes only that question. Its canonical card and concept
  remain available.

Overlapping source records compose. Restoring a concept removes only the concept
record; a direct card record continues to exclude that card until it too is restored.
The Knowledge page remains browsable when a concept is manually learned.

## Scheduler and history

An active card override makes the override-aware Exam-SRS state operationally
`learned`, with `dueAt: null`, `isDue: false`, and `isManuallyLearned: true`. Its prior
evidence-derived strength, review count, timestamps, and outcome remain present. A
restored card is reconstructed from those same historical events, including a prior
failure or due state.

Manual exclusions count toward operational coverage and learned summaries, while the
canonical deck denominator remains unchanged. Forecast and other simulation consumers
should use the override-aware snapshot and never simulate future reviews for
`isManuallyLearned` cards.

## Persistence, backup, and sync

Overrides are stored in the local IndexedDB `manualLearnedOverrides` store (database
schema version 5). JSON backups include the source records in the existing backup
format v2; older v1/v2 backups migrate with an empty set. Import validates target IDs
and duplicate keys before replacement. Orphaned records already stored locally are
retained but ignored by the resolver if a future deck update removes their content.

Resetting local progress clears overrides. Restoring an override never deletes review
history. Manual overrides are included in export/import, but remain local-device-only
under encrypted sync protocol v1 because that version has no safe versioned field for
them. Sync does not clear or merge them incorrectly.

## Full mocks

New full mocks filter effective excluded questions and canonical cards before applying
the existing 60-question blueprint. If the quotas cannot be satisfied, creation fails
with an eligibility message rather than reintroducing excluded material. An active
mock keeps its immutable manifest if an override is created elsewhere; the override
applies to future mock creation only.
