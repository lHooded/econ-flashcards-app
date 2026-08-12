import { deleteDB, openDB } from "idb";
import { describe, expect, it } from "vitest";
import { openProgressDatabase } from "../db/database";
import { buildMockExam } from "../exam/mock/selector";
import { createMockAttempt } from "../exam/mock/model";
import { examQuestions } from "../exam/questionBank";
import { fromBase64Url, randomBase64Url } from "../sync/encoding";

describe("IndexedDB migrations", () => {
  it("preserves every v2 record while adding current sync and lesson stores", async () => {
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
    expect(upgraded.objectStoreNames.contains("guidedLessonSeen")).toBe(true);
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
    expect(await upgraded.getAll("guidedLessonSeen")).toEqual([]);
    upgraded.close();
    await deleteDB(databaseName);
  });

  it("migrates v3 to v4 without rewriting existing progress", async () => {
    const databaseName = `econ-migration-v4-${Date.now()}-${Math.random()}`;
    const oldDatabase = await openDB(databaseName, 3, {
      upgrade(database) {
        database.createObjectStore("cardStates", { keyPath: "cardId" });
        database.createObjectStore("reviewEvents", { keyPath: "id" });
        database.createObjectStore("settings", { keyPath: "key" });
        database.createObjectStore("mockAttempts", { keyPath: "id" });
        database.createObjectStore("syncConfig", { keyPath: "key" });
      },
    });
    const settings = {
      key: "app",
      value: { examAt: null, studyBufferHours: 24 },
    };
    const cardState = {
      cardId: "ch01-002",
      firstSeenAt: "2026-08-11T00:00:00.000Z",
      lastSeenAt: "2026-08-11T00:00:00.000Z",
      totalReviews: 1,
      correctReviews: 1,
      consecutiveCorrect: 1,
    };
    const review = {
      id: "v4-migration-review",
      cardId: "ch01-002",
      reviewedAt: "2026-08-11T00:00:00.000Z",
      mode: "mcq",
      correct: true,
      rating: null,
      responseTimeMs: 500,
      selectedChoice: 0,
    };
    const syncConfig = {
      key: "app",
      deviceId: randomBase64Url(16),
      group: null,
      lastSyncedAt: null,
      settingsStamp: null,
    };
    await oldDatabase.put("settings", settings);
    await oldDatabase.put("cardStates", cardState);
    await oldDatabase.put("reviewEvents", review);
    await oldDatabase.put("syncConfig", syncConfig);
    oldDatabase.close();

    const upgraded = await openProgressDatabase(databaseName);
    expect(upgraded.objectStoreNames.contains("guidedLessonSeen")).toBe(true);
    expect(await upgraded.get("settings", "app")).toEqual(settings);
    expect(await upgraded.get("cardStates", "ch01-002")).toEqual(cardState);
    expect(await upgraded.get("reviewEvents", "v4-migration-review")).toEqual(review);
    expect(await upgraded.get("syncConfig", "app")).toEqual(syncConfig);
    expect(await upgraded.getAll("guidedLessonSeen")).toEqual([]);
    upgraded.close();
    await deleteDB(databaseName);
  });
});
