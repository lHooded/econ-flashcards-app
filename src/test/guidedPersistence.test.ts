import { deleteDB } from "idb";
import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import { parseProgressBackupText, serializeProgressBackup } from "../domain/backup";
import { ProgressRepository } from "../db/progressRepository";
import { deriveExamSrsSnapshot } from "../study/examSrs/deriveState";
import { reviewableProgressIds } from "../knowledge/guided/registry";

describe("Guided Knowledge Check progress persistence", () => {
  it("survives repository writes, backup round-trip, and derived state rebuild", async () => {
    const databaseName = `guided-persistence-${Date.now()}-${Math.random()}`;
    const repository = new ProgressRepository(reviewableProgressIds, databaseName);
    const event = {
      id: "guided-persistence-review",
      cardId: "knowledge-check:percentage",
      reviewedAt: "2026-08-11T00:00:00.000Z",
      mode: "mcq" as const,
      correct: true,
      rating: null,
      responseTimeMs: 620,
      selectedChoice: 0,
    };
    try {
      await repository.resetAll();
      await repository.recordReview(event);
      const before = await repository.load();
      const backupText = serializeProgressBackup(
        {
          settings: before.settings,
          cardStates: Object.fromEntries(
            before.cardStates.map((state) => [state.cardId, state]),
          ),
          reviewEvents: before.reviews,
          mockAttempts: [],
        },
        "2026-08-11T00:01:00.000Z",
      );

      await repository.resetAll();
      await repository.replaceAll(
        parseProgressBackupText(backupText, reviewableProgressIds),
      );
      const after = await repository.load();
      expect(after.reviews).toEqual([expect.objectContaining(event)]);
      expect(after.cardStates).toEqual([
        expect.objectContaining({
          cardId: event.cardId,
          totalReviews: 1,
          correctReviews: 1,
        }),
      ]);

      const scheduler = deriveExamSrsSnapshot(
        cards,
        after.reviews,
        after.settings,
        Date.parse("2026-08-11T00:02:00.000Z"),
      );
      expect(scheduler.states).toHaveLength(349);
      expect(scheduler.stateByCardId[event.cardId]).toBeUndefined();
    } finally {
      await repository.close();
      await deleteDB(databaseName);
    }
  });
});
