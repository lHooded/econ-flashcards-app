import { deleteDB, openDB } from "idb";
import { describe, expect, it } from "vitest";
import { openProgressDatabase } from "../db/database";

describe("IndexedDB v1 to v2 migration", () => {
  it("keeps old settings, card state, and review records while adding mockAttempts", async () => {
    const databaseName = `econ-migration-${Date.now()}-${Math.random()}`;
    const oldDatabase = await openDB(databaseName, 1, {
      upgrade(database) {
        database.createObjectStore("cardStates", { keyPath: "cardId" });
        database.createObjectStore("reviewEvents", { keyPath: "id" });
        database.createObjectStore("settings", { keyPath: "key" });
      },
    });
    await oldDatabase.put("settings", {
      key: "app",
      value: { examAt: null, studyBufferHours: 24 },
    });
    await oldDatabase.put("cardStates", {
      cardId: "ch01-001",
      firstSeenAt: null,
      lastSeenAt: null,
      totalReviews: 0,
      correctReviews: 0,
      consecutiveCorrect: 0,
    });
    await oldDatabase.put("reviewEvents", {
      id: "migration-review",
      cardId: "ch01-001",
      reviewedAt: "2026-08-11T00:00:00.000Z",
      mode: "recall",
      correct: null,
      rating: null,
      responseTimeMs: null,
      selectedChoice: null,
    });
    oldDatabase.close();

    const upgraded = await openProgressDatabase(databaseName);
    expect(upgraded.objectStoreNames.contains("mockAttempts")).toBe(true);
    expect(await upgraded.get("settings", "app")).toMatchObject({
      value: { studyBufferHours: 24 },
    });
    expect(await upgraded.get("cardStates", "ch01-001")).toMatchObject({
      cardId: "ch01-001",
    });
    expect(await upgraded.get("reviewEvents", "migration-review")).toMatchObject({
      id: "migration-review",
    });
    upgraded.close();
    await deleteDB(databaseName);
  });
});
