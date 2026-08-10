import { describe, expect, it } from "vitest";
import { cardIds } from "../data/deck";
import {
  createProgressBackup,
  parseProgressBackupText,
  serializeProgressBackup,
} from "../domain/backup";
import { ProgressRepository } from "../db/progressRepository";

describe("progress backups", () => {
  it("round-trips export, reset, and import with exact mutable state", async () => {
    const repository = new ProgressRepository(cardIds);
    await repository.resetAll();
    await repository.saveSettings({
      examAt: "2026-08-20T10:00:00.000Z",
      studyBufferHours: 24,
    });
    await repository.recordReview({
      id: "backup-review-1",
      cardId: "ch01-001",
      reviewedAt: "2026-08-10T00:00:00.000Z",
      mode: "recall",
      correct: false,
      rating: "forgot",
      responseTimeMs: 1500,
      selectedChoice: null,
    });

    const before = await repository.load();
    const backupText = serializeProgressBackup(
      {
        settings: before.settings,
        cardStates: Object.fromEntries(
          before.cardStates.map((state) => [state.cardId, state]),
        ),
        reviewEvents: before.reviews,
      },
      "2026-08-10T02:00:00.000Z",
    );
    const parsed = parseProgressBackupText(backupText, cardIds);

    await repository.resetAll();
    await repository.replaceAll(parsed);
    const after = await repository.load();

    expect(after.settings).toEqual(before.settings);
    expect(after.cardStates).toEqual(before.cardStates);
    expect(after.reviews).toEqual(before.reviews);
    expect(parsed.exportedAt).toBe("2026-08-10T02:00:00.000Z");
  });

  it("rejects invalid JSON and unsupported versions", () => {
    expect(() => parseProgressBackupText("not json", cardIds)).toThrow(/valid JSON/);

    const valid = createProgressBackup({
      settings: { examAt: null, studyBufferHours: 24 },
      cardStates: {},
      reviewEvents: [],
    });
    expect(() =>
      parseProgressBackupText(JSON.stringify({ ...valid, version: 99 }), cardIds),
    ).toThrow(/Unsupported backup version/);
  });

  it("does not change current state when validation fails before replacement", async () => {
    const repository = new ProgressRepository(cardIds);
    await repository.resetAll();
    await repository.saveSettings({ examAt: null, studyBufferHours: 24 });
    await repository.recordReview({
      id: "preserve-me",
      cardId: "ch01-001",
      reviewedAt: "2026-08-10T00:00:00.000Z",
      mode: "recall",
      correct: true,
      rating: "got_it",
      responseTimeMs: null,
      selectedChoice: null,
    });
    const before = await repository.load();

    expect(() =>
      parseProgressBackupText(
        JSON.stringify({
          format: "econ-flashcards-progress",
          version: 1,
          exportedAt: "2026-08-10T00:00:00.000Z",
          settings: { examAt: null, studyBufferHours: 24 },
          cardStates: [],
          reviews: [
            {
              id: "bad-review",
              cardId: "not-in-deck",
              reviewedAt: "2026-08-10T00:00:00.000Z",
              mode: "recall",
              correct: true,
              rating: "got_it",
              responseTimeMs: null,
              selectedChoice: null,
            },
          ],
        }),
        cardIds,
      ),
    ).toThrow(/unknown card ID/);

    expect(await repository.load()).toEqual(before);
  });
});
