import { deleteDB } from "idb";
import { describe, expect, it } from "vitest";
import { cardIds, cards } from "../data/deck";
import {
  createProgressBackup,
  parseProgressBackupText,
  serializeProgressBackup,
} from "../domain/backup";
import { ProgressRepository } from "../db/progressRepository";
import { deriveExamSrsSnapshot } from "../study/examSrs/deriveState";
import { createDeviceId, createSyncGroupCredentials } from "../sync/pairing";

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

  it("keeps imported review timestamps intact while exposing chronological history", async () => {
    const repository = new ProgressRepository(cardIds);
    await repository.resetAll();
    const backup = createProgressBackup({
      settings: { examAt: null, studyBufferHours: 24 },
      cardStates: {},
      reviewEvents: [
        {
          id: "a-later",
          cardId: "ch01-001",
          reviewedAt: "2026-08-10T12:00:00+02:00",
          mode: "recall",
          correct: true,
          rating: "got_it",
          responseTimeMs: null,
          selectedChoice: null,
        },
        {
          id: "z-earlier",
          cardId: "ch01-002",
          reviewedAt: "2026-08-10T09:00:00.000Z",
          mode: "recall",
          correct: false,
          rating: "forgot",
          responseTimeMs: null,
          selectedChoice: null,
        },
        {
          id: "b-tie",
          cardId: "ch01-003",
          reviewedAt: "2026-08-10T11:00:00+02:00",
          mode: "recall",
          correct: true,
          rating: "struggled",
          responseTimeMs: null,
          selectedChoice: null,
        },
      ],
    });

    const parsed = parseProgressBackupText(JSON.stringify(backup), cardIds);
    await repository.replaceAll(parsed);
    const loaded = await repository.load();

    expect(loaded.reviews.map((review) => review.id)).toEqual([
      "b-tie",
      "z-earlier",
      "a-later",
    ]);
    expect(loaded.reviews.map((review) => review.reviewedAt)).toEqual([
      "2026-08-10T11:00:00+02:00",
      "2026-08-10T09:00:00.000Z",
      "2026-08-10T12:00:00+02:00",
    ]);
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

  it("recreates Exam-SRS state from a version-one backup without scheduler fields", async () => {
    const repository = new ProgressRepository(cardIds);
    await repository.resetAll();
    const backup = createProgressBackup({
      settings: {
        examAt: "2026-08-20T10:00:00.000Z",
        studyBufferHours: 24,
      },
      cardStates: {},
      reviewEvents: [
        {
          id: "derived-a",
          cardId: "ch01-001",
          reviewedAt: "2026-08-10T00:00:00.000Z",
          mode: "recall",
          correct: true,
          rating: "got_it",
          responseTimeMs: null,
          selectedChoice: null,
        },
        {
          id: "derived-b",
          cardId: "ch01-001",
          reviewedAt: "2026-08-10T01:00:00.000Z",
          mode: "recall",
          correct: true,
          rating: "got_it",
          responseTimeMs: null,
          selectedChoice: null,
        },
      ],
    });
    const backupText = serializeProgressBackup(
      {
        settings: backup.settings,
        cardStates: {},
        reviewEvents: backup.reviews,
      },
      "2026-08-10T02:00:00.000Z",
    );
    expect(backupText).not.toContain("dueAt");
    expect(backupText).not.toContain("strength");

    await repository.replaceAll(parseProgressBackupText(backupText, cardIds));
    const loaded = await repository.load();
    const derived = deriveExamSrsSnapshot(
      cards,
      loaded.reviews,
      loaded.settings,
      Date.parse("2026-08-10T02:00:00.000Z"),
    );

    expect(derived.stateByCardId["ch01-001"]).toMatchObject({
      learningState: "learned",
      strength: 2,
      reviewCount: 2,
    });
    expect(derived.stateByCardId["ch01-002"].learningState).toBe("unseen");
  });

  it("keeps sync credentials out of the portable backup", () => {
    const text = serializeProgressBackup(
      {
        settings: { examAt: null, studyBufferHours: 24 },
        cardStates: {},
        reviewEvents: [],
        mockAttempts: [],
      },
      "2026-08-10T02:00:00.000Z",
    );

    expect(text).not.toMatch(/authToken|encryptionKey|syncId|pairing/i);
  });

  it("stamps imported settings as a local edit when connected", async () => {
    const databaseName = `backup-sync-${Date.now()}-${Math.random()}`;
    const repository = new ProgressRepository(cardIds, databaseName);
    const credentials = createSyncGroupCredentials();
    const deviceId = createDeviceId();
    const nextSettings = { examAt: "2026-08-20T10:00:00.000Z", studyBufferHours: 6 };

    try {
      await repository.resetAll();
      await repository.saveSyncConfig({
        key: "app",
        deviceId,
        group: { ...credentials, remoteVersion: 1 },
        lastSyncedAt: "2026-08-10T00:00:00.000Z",
        settingsStamp: {
          value: { examAt: null, studyBufferHours: 24 },
          updatedAt: "2026-08-10T00:00:00.000Z",
          deviceId,
        },
      });
      await repository.replaceAll(
        createProgressBackup({
          settings: nextSettings,
          cardStates: {},
          reviewEvents: [],
          mockAttempts: [],
        }),
      );

      const state = await repository.loadSyncState();
      expect(state.settings).toEqual(nextSettings);
      expect(state.syncConfig.group).toEqual({ ...credentials, remoteVersion: 1 });
      expect(state.syncConfig.settingsStamp?.value).toEqual(nextSettings);
      expect(
        Date.parse(state.syncConfig.settingsStamp?.updatedAt ?? ""),
      ).toBeGreaterThan(Date.parse("2026-08-10T00:00:00.000Z"));
    } finally {
      await repository.close();
      await deleteDB(databaseName);
    }
  });
});
