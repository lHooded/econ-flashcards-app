import { deleteDB, openDB } from "idb";
import { describe, expect, it } from "vitest";
import { openProgressDatabase } from "../db/database";
import { buildMockExam } from "../exam/mock/selector";
import { createMockAttempt } from "../exam/mock/model";
import { examQuestions } from "../exam/questionBank";
import { fromBase64Url } from "../sync/encoding";

describe("IndexedDB v2 to v3 migration", () => {
  it("preserves every v2 record while adding a disconnected local sync config", async () => {
    const databaseName = `econ-migration-${Date.now()}-${Math.random()}`;
    const oldDatabase = await openDB(databaseName, 2, {
      upgrade(database) {
        database.createObjectStore("cardStates", { keyPath: "cardId" });
        database.createObjectStore("reviewEvents", { keyPath: "id" });
        database.createObjectStore("settings", { keyPath: "key" });
        database.createObjectStore("mockAttempts", { keyPath: "id" });
      },
    });
    const settings = {
      key: "app",
      value: { examAt: null, studyBufferHours: 24 },
    };
    const cardState = {
      cardId: "ch01-001",
      firstSeenAt: null,
      lastSeenAt: null,
      totalReviews: 0,
      correctReviews: 0,
      consecutiveCorrect: 0,
    };
    const review = {
      id: "migration-review",
      cardId: "ch01-001",
      reviewedAt: "2026-08-11T00:00:00.000Z",
      mode: "recall",
      correct: null,
      rating: null,
      responseTimeMs: null,
      selectedChoice: null,
    };
    const activeAttempt = createMockAttempt({
      ...buildMockExam({ bank: examQuestions, seed: "migration" }),
      id: "migration-mock",
      seed: "migration",
      createdAt: "2026-08-11T00:00:00.000Z",
    });
    await oldDatabase.put("settings", settings);
    await oldDatabase.put("cardStates", cardState);
    await oldDatabase.put("reviewEvents", review);
    await oldDatabase.put("mockAttempts", activeAttempt);
    oldDatabase.close();

    const upgraded = await openProgressDatabase(databaseName);
    expect(upgraded.objectStoreNames.contains("mockAttempts")).toBe(true);
    expect(upgraded.objectStoreNames.contains("syncConfig")).toBe(true);
    expect(await upgraded.get("settings", "app")).toEqual(settings);
    expect(await upgraded.get("cardStates", "ch01-001")).toEqual(cardState);
    expect(await upgraded.get("reviewEvents", "migration-review")).toEqual(review);
    expect(await upgraded.get("mockAttempts", "migration-mock")).toEqual(activeAttempt);
    const syncConfig = await upgraded.get("syncConfig", "app");
    expect(syncConfig).toMatchObject({
      key: "app",
      group: null,
      lastSyncedAt: null,
      settingsStamp: null,
    });
    expect(fromBase64Url(syncConfig!.deviceId)).toHaveLength(16);
    upgraded.close();
    await deleteDB(databaseName);
  });
});
