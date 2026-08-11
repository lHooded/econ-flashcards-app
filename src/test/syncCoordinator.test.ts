import { deleteDB } from "idb";
import { describe, expect, it } from "vitest";
import { cards } from "../data/deck";
import { createReviewEvent } from "../domain/progress";
import { ProgressRepository } from "../db/progressRepository";
import { MockExamRepository } from "../db/mockExamRepository";
import { buildMockExam } from "../exam/mock/selector";
import { createMockAttempt } from "../exam/mock/model";
import { examQuestions } from "../exam/questionBank";
import { SyncApiError, type SyncApi } from "../sync/client";
import { SyncCoordinator } from "../sync/coordinator";
import { buildSyncPayload } from "../sync/merge";
import type { EncryptedSyncEnvelope, SyncGroupCredentials } from "../sync/model";
import { deriveExamSrsSnapshot } from "../study/examSrs/deriveState";
import { cardIds } from "../data/deck";

interface RemoteRecord {
  readonly authToken: string;
  readonly version: number;
  readonly envelope: EncryptedSyncEnvelope;
}

class FakeRemote implements SyncApi {
  public pushCount = 0;
  public conflictNextPush = false;
  private record: RemoteRecord | undefined;

  public async create(
    credentials: SyncGroupCredentials,
    envelope: EncryptedSyncEnvelope,
  ) {
    if (this.record !== undefined) throw new SyncApiError("conflict", "exists", 409);
    this.record = { authToken: credentials.authToken, version: 1, envelope };
    return { version: 1 };
  }

  public async pull(credentials: SyncGroupCredentials) {
    this.assertAuth(credentials);
    if (this.record === undefined) throw new SyncApiError("not-found", "missing", 404);
    return { version: this.record.version, envelope: this.record.envelope };
  }

  public async push(
    credentials: SyncGroupCredentials,
    expectedVersion: number,
    envelope: EncryptedSyncEnvelope,
  ) {
    this.assertAuth(credentials);
    if (this.record === undefined) throw new SyncApiError("not-found", "missing", 404);
    this.pushCount += 1;
    if (this.conflictNextPush) {
      this.conflictNextPush = false;
      throw new SyncApiError("conflict", "stale", 409);
    }
    if (expectedVersion !== this.record.version)
      throw new SyncApiError("conflict", "stale", 409);
    this.record = {
      authToken: this.record.authToken,
      version: this.record.version + 1,
      envelope,
    };
    return { version: this.record.version };
  }

  public async delete(credentials: SyncGroupCredentials): Promise<void> {
    this.assertAuth(credentials);
    if (this.record === undefined) throw new SyncApiError("not-found", "missing", 404);
    this.record = undefined;
  }

  private assertAuth(credentials: SyncGroupCredentials): void {
    if (this.record !== undefined && this.record.authToken !== credentials.authToken) {
      throw new SyncApiError("auth", "bad auth", 401);
    }
  }
}

const questionIds = new Set(examQuestions.map((question) => question.id));

function createCoordinator(
  repository: ProgressRepository,
  api: SyncApi,
  now = "2026-08-11T12:00:00.000Z",
) {
  return new SyncCoordinator({
    repository,
    api,
    validCardIds: cardIds,
    validQuestionIds: questionIds,
    now: () => now,
    debounceMs: 0,
  });
}

function review(id: string, cardId: string, reviewedAt: string) {
  return createReviewEvent({
    id,
    cardId,
    reviewedAt,
    mode: "recall",
    correct: true,
    rating: "got_it",
    responseTimeMs: null,
    selectedChoice: null,
  });
}

describe("two-device encrypted sync coordinator", () => {
  it("merges the laptop/phone offline example and converges scheduler snapshots", async () => {
    const laptopName = `sync-laptop-${Date.now()}`;
    const phoneName = `sync-phone-${Date.now()}`;
    const laptop = new ProgressRepository(cardIds, laptopName);
    const phone = new ProgressRepository(cardIds, phoneName);
    const remote = new FakeRemote();
    const laptopSync = createCoordinator(laptop, remote);
    const phoneSync = createCoordinator(phone, remote);
    try {
      await laptop.resetAll();
      await phone.resetAll();
      await laptop.recordReview({
        ...review("a", "ch01-001", "2026-08-11T00:00:00.000Z"),
      });
      await laptop.recordReview({
        ...review("b", "ch01-002", "2026-08-11T00:01:00.000Z"),
      });
      await laptopSync.createGroup();
      const pairingCode = await laptopSync.getPairingCode();
      await phoneSync.joinGroup(pairingCode);
      expect((await phone.loadSyncState()).reviews.map((event) => event.id)).toEqual([
        "a",
        "b",
      ]);

      await laptop.recordReview({
        ...review("c", "ch01-003", "2026-08-11T00:02:00.000Z"),
      });
      await phone.recordReview({
        ...review("d", "ch01-004", "2026-08-11T00:03:00.000Z"),
      });
      await laptopSync.syncNow();
      await phoneSync.syncNow();
      await laptopSync.syncNow();

      const laptopState = await laptop.loadSyncState();
      const phoneState = await phone.loadSyncState();
      expect(laptopState.reviews.map((event) => event.id)).toEqual([
        "a",
        "b",
        "c",
        "d",
      ]);
      expect(phoneState.reviews).toEqual(laptopState.reviews);
      expect(phoneState.mockAttempts).toEqual(laptopState.mockAttempts);
      const laptopProgress = await laptop.load();
      const phoneProgress = await phone.load();
      expect(phoneProgress.cardStates).toEqual(laptopProgress.cardStates);
      expect(laptopProgress.cardStates).toHaveLength(cardIds.size);

      const now = Date.parse("2026-08-11T12:00:00.000Z");
      const laptopScheduler = deriveExamSrsSnapshot(
        cards,
        laptopState.reviews,
        laptopState.settings,
        now,
      );
      const phoneScheduler = deriveExamSrsSnapshot(
        cards,
        phoneState.reviews,
        phoneState.settings,
        now,
      );
      expect(phoneScheduler).toEqual(laptopScheduler);
    } finally {
      laptopSync.dispose();
      phoneSync.dispose();
      laptop.close();
      phone.close();
      await deleteDB(laptopName);
      await deleteDB(phoneName);
    }
  });

  it("keeps an active mock local-only, then syncs its terminal attempt and 60 reviews exactly once", async () => {
    const laptopName = `mock-sync-laptop-${Date.now()}`;
    const phoneName = `mock-sync-phone-${Date.now()}`;
    const laptop = new ProgressRepository(cardIds, laptopName);
    const phone = new ProgressRepository(cardIds, phoneName);
    const laptopMocks = new MockExamRepository(
      cardIds,
      questionIds,
      undefined,
      laptopName,
    );
    const remote = new FakeRemote();
    const laptopSync = createCoordinator(laptop, remote);
    const phoneSync = createCoordinator(phone, remote);
    try {
      await laptop.resetAll();
      await phone.resetAll();
      const attempt = createMockAttempt({
        ...buildMockExam({ bank: examQuestions, seed: "sync-mock" }),
        id: "sync-mock",
        seed: "sync-mock",
        createdAt: "2026-08-10T00:00:00.000Z",
      });
      await laptopMocks.createAttempt(attempt);
      const outgoingState = await laptop.loadSyncState();
      const outgoing = buildSyncPayload(outgoingState, {
        value: outgoingState.settings,
        updatedAt: "2026-08-10T00:00:00.000Z",
        deviceId: outgoingState.syncConfig.deviceId,
      });
      expect(outgoing.mockAttempts).toEqual([]);
      expect(outgoingState.mockAttempts).toHaveLength(1);
      await laptopSync.createGroup();
      await phoneSync.joinGroup(await laptopSync.getPairingCode());
      expect((await phone.loadSyncState()).mockAttempts).toEqual([]);
      expect((await laptop.loadSyncState()).mockAttempts[0].status).toBe("active");

      await laptopMocks.finalizeAttempt(attempt.id, "2026-08-10T02:00:00.000Z");
      await laptopSync.syncNow();
      await phoneSync.syncNow();
      const synced = await phone.loadSyncState();
      expect(synced.mockAttempts).toHaveLength(1);
      expect(synced.mockAttempts[0].status).toBe("submitted");
      expect(synced.reviews).toHaveLength(60);
      await phoneSync.syncNow();
      expect((await phone.loadSyncState()).reviews).toHaveLength(60);
    } finally {
      laptopSync.dispose();
      phoneSync.dispose();
      laptopMocks.close();
      laptop.close();
      phone.close();
      await deleteDB(laptopName);
      await deleteDB(phoneName);
    }
  });

  it("re-pulls and retries after a conditional-write conflict", async () => {
    const databaseName = `sync-cas-${Date.now()}-${Math.random()}`;
    const repository = new ProgressRepository(cardIds, databaseName);
    const remote = new FakeRemote();
    const coordinator = createCoordinator(repository, remote);

    try {
      await repository.resetAll();
      await coordinator.createGroup();
      await repository.recordReview(
        review("cas-review", "ch01-001", "2026-08-11T00:00:00.000Z"),
      );
      remote.conflictNextPush = true;

      await coordinator.syncNow();

      expect(remote.pushCount).toBe(2);
      expect((await repository.loadSyncState()).syncConfig.group?.remoteVersion).toBe(
        2,
      );
    } finally {
      coordinator.dispose();
      await repository.close();
      await deleteDB(databaseName);
    }
  });
});
