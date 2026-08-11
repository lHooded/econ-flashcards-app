import { deleteDB } from "idb";
import { describe, expect, it, vi } from "vitest";
import { cardIds } from "../data/deck";
import { createReviewEvent } from "../domain/progress";
import { ProgressRepository } from "../db/progressRepository";
import { SyncApiError, type SyncApi } from "../sync/client";
import { decryptSyncPayload, encryptSyncPayload } from "../sync/crypto";
import { SyncCoordinator } from "../sync/coordinator";
import { toBase64Url } from "../sync/encoding";
import type {
  EncryptedSyncEnvelope,
  SyncGroupCredentials,
  SyncPayloadV1,
} from "../sync/model";

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

class ControlledRemote implements SyncApi {
  public pullCount = 0;
  public gate = deferred<void>();
  private envelope: EncryptedSyncEnvelope | undefined;
  private authToken: string | undefined;

  public async create(
    credentials: SyncGroupCredentials,
    envelope: EncryptedSyncEnvelope,
  ) {
    this.authToken = credentials.authToken;
    this.envelope = envelope;
    return { version: 1 };
  }

  public async pull(credentials: SyncGroupCredentials) {
    this.assert(credentials);
    this.pullCount += 1;
    await this.gate.promise;
    return { version: 1, envelope: this.envelope! };
  }

  public async push(
    credentials: SyncGroupCredentials,
    expectedVersion: number,
    envelope: EncryptedSyncEnvelope,
  ) {
    this.assert(credentials);
    void expectedVersion;
    void envelope;
    return { version: 2 };
  }

  public async delete(credentials: SyncGroupCredentials): Promise<void> {
    this.assert(credentials);
  }

  private assert(credentials: SyncGroupCredentials): void {
    if (this.authToken !== credentials.authToken || this.envelope === undefined) {
      throw new SyncApiError("auth", "bad auth", 401);
    }
  }
}

class DeferredCreateRemote implements SyncApi {
  public readonly createGate = deferred<void>();
  public createCount = 0;
  public pushCount = 0;
  public credentials: SyncGroupCredentials | undefined;
  public envelope: EncryptedSyncEnvelope | undefined;
  public version = 0;

  public async create(
    credentials: SyncGroupCredentials,
    envelope: EncryptedSyncEnvelope,
  ) {
    this.createCount += 1;
    this.credentials = credentials;
    this.envelope = envelope;
    await this.createGate.promise;
    this.version = 1;
    return { version: 1 };
  }

  public async pull(credentials: SyncGroupCredentials) {
    if (credentials.authToken !== this.credentials?.authToken)
      throw new SyncApiError("auth", "bad auth", 401);
    return { version: this.version, envelope: this.envelope! };
  }

  public async push(
    credentials: SyncGroupCredentials,
    expectedVersion: number,
    envelope: EncryptedSyncEnvelope,
  ) {
    if (credentials.authToken !== this.credentials?.authToken)
      throw new SyncApiError("auth", "bad auth", 401);
    if (expectedVersion !== this.version)
      throw new SyncApiError("conflict", "stale", 409);
    this.pushCount += 1;
    this.version += 1;
    this.envelope = envelope;
    return { version: this.version };
  }

  public async delete(): Promise<void> {
    this.version = 0;
    this.envelope = undefined;
  }
}

class DeferredJoinRemote implements SyncApi {
  public readonly pullGate = deferred<void>();
  public pullCount = 0;
  public pushCount = 0;
  public credentials: SyncGroupCredentials | undefined;
  public envelope: EncryptedSyncEnvelope | undefined;
  public version = 0;

  public async create(
    credentials: SyncGroupCredentials,
    envelope: EncryptedSyncEnvelope,
  ) {
    this.credentials = credentials;
    this.envelope = envelope;
    this.version = 1;
    return { version: this.version };
  }

  public async pull(credentials: SyncGroupCredentials) {
    this.assert(credentials);
    this.pullCount += 1;
    if (this.pullCount === 1) await this.pullGate.promise;
    return { version: this.version, envelope: this.envelope! };
  }

  public async push(
    credentials: SyncGroupCredentials,
    expectedVersion: number,
    envelope: EncryptedSyncEnvelope,
  ) {
    this.assert(credentials);
    if (expectedVersion !== this.version)
      throw new SyncApiError("conflict", "stale", 409);
    this.pushCount += 1;
    this.version += 1;
    this.envelope = envelope;
    return { version: this.version };
  }

  public async delete(credentials: SyncGroupCredentials): Promise<void> {
    this.assert(credentials);
    this.credentials = undefined;
    this.envelope = undefined;
    this.version = 0;
  }

  private assert(credentials: SyncGroupCredentials): void {
    if (
      credentials.authToken !== this.credentials?.authToken ||
      this.envelope === undefined
    ) {
      throw new SyncApiError("auth", "bad auth", 401);
    }
  }
}

class DownRemote implements SyncApi {
  public async create(
    _credentials: SyncGroupCredentials,
    _envelope: EncryptedSyncEnvelope,
  ) {
    void _credentials;
    void _envelope;
    return { version: 1 };
  }

  public async pull(
    credentials: SyncGroupCredentials,
  ): Promise<{ version: number; envelope: EncryptedSyncEnvelope }> {
    void credentials;
    throw new SyncApiError("network", "offline", 0);
  }

  public async push(
    credentials: SyncGroupCredentials,
    expectedVersion: number,
    envelope: EncryptedSyncEnvelope,
  ) {
    void credentials;
    void expectedVersion;
    void envelope;
    return { version: 2 };
  }

  public async delete(credentials: SyncGroupCredentials): Promise<void> {
    void credentials;
  }
}

class InvalidPayloadRemote implements SyncApi {
  private authToken: string | undefined;

  public async create(
    credentials: SyncGroupCredentials,
    envelope: EncryptedSyncEnvelope,
  ) {
    this.authToken = credentials.authToken;
    void envelope;
    return { version: 1 };
  }

  public async pull(credentials: SyncGroupCredentials) {
    this.assert(credentials);
    const invalidPayload = {
      format: "econ-flashcards-sync",
      version: 1,
      reviews: [{}],
      settings: {
        value: { examAt: null, studyBufferHours: 24 },
        updatedAt: "2026-08-11T00:00:00.000Z",
        deviceId: toBase64Url(new Uint8Array(16).fill(9)),
      },
      mockAttempts: [],
    } as unknown as SyncPayloadV1;
    return {
      version: 1,
      envelope: await encryptSyncPayload(invalidPayload, credentials),
    };
  }

  public async push(): Promise<{ readonly version: number }> {
    throw new Error("invalid remote should fail before push");
  }

  public async delete(): Promise<void> {
    return undefined;
  }

  private assert(credentials: SyncGroupCredentials): void {
    if (credentials.authToken !== this.authToken)
      throw new SyncApiError("auth", "bad auth", 401);
  }
}

describe("sync scheduling", () => {
  it("coalesces a burst into one pass plus at most one trailing pass", async () => {
    const databaseName = `sync-schedule-${Date.now()}`;
    const repository = new ProgressRepository(cardIds, databaseName);
    const remote = new ControlledRemote();
    const coordinator = new SyncCoordinator({
      repository,
      api: remote,
      validCardIds: cardIds,
      debounceMs: 0,
      now: () => "2026-08-11T12:00:00.000Z",
    });
    try {
      await repository.resetAll();
      await coordinator.createGroup();
      const running = coordinator.syncNow();
      await Promise.resolve();
      coordinator.request("review-1");
      coordinator.request("review-2");
      coordinator.request("review-3");
      remote.gate.resolve();
      await running;
      expect(remote.pullCount).toBe(2);
    } finally {
      coordinator.dispose();
      repository.close();
      await deleteDB(databaseName);
    }
  });

  it("reconciles local settings and reviews written during deferred creation", async () => {
    const databaseName = `sync-create-race-${Date.now()}`;
    const repository = new ProgressRepository(cardIds, databaseName);
    const remote = new DeferredCreateRemote();
    const coordinator = new SyncCoordinator({
      repository,
      api: remote,
      validCardIds: cardIds,
      debounceMs: 0,
      now: () => "2026-08-11T10:00:00.000Z",
    });
    try {
      await repository.resetAll();
      const creating = coordinator.createGroup();
      await vi.waitFor(() => expect(remote.createCount).toBe(1));
      const settingsB = {
        examAt: "2026-08-20T10:00:00.000Z",
        studyBufferHours: 6,
      } as const;
      await repository.saveSettings(settingsB);
      await repository.recordReview({
        ...createReviewEvent({
          id: "created-during-race",
          cardId: "ch01-001",
          reviewedAt: "2026-08-11T00:01:00.000Z",
          mode: "recall",
          correct: true,
          rating: "got_it",
          responseTimeMs: null,
          selectedChoice: null,
        }),
      });
      remote.createGate.resolve();
      await creating;

      const local = await repository.loadSyncState();
      expect(local.settings).toEqual(settingsB);
      expect(local.syncConfig.settingsStamp?.value).toEqual(settingsB);
      const remotePayload = await decryptSyncPayload(
        remote.envelope,
        remote.credentials!,
      );
      expect(remotePayload).toMatchObject({
        reviews: [{ id: "created-during-race" }],
        settings: { value: settingsB },
      });
      const pushes = remote.pushCount;
      await coordinator.syncNow();
      expect(remote.pushCount).toBe(pushes);
    } finally {
      coordinator.dispose();
      await repository.close();
      await deleteDB(databaseName);
    }
  });

  it("reconciles settings and a calculation review written during deferred join", async () => {
    const laptopName = `sync-join-source-${Date.now()}`;
    const phoneName = `sync-join-race-${Date.now()}`;
    const laptopRepository = new ProgressRepository(cardIds, laptopName);
    const phoneRepository = new ProgressRepository(cardIds, phoneName);
    const remote = new DeferredJoinRemote();
    const laptop = new SyncCoordinator({
      repository: laptopRepository,
      api: remote,
      validCardIds: cardIds,
      debounceMs: 0,
      now: () => "2030-01-01T00:00:00.000Z",
    });
    const phone = new SyncCoordinator({
      repository: phoneRepository,
      api: remote,
      validCardIds: cardIds,
      debounceMs: 0,
      now: () => "2026-08-11T10:00:00.000Z",
    });
    try {
      await laptopRepository.resetAll();
      await phoneRepository.resetAll();
      const initialLocalSettings = {
        examAt: "2030-01-15T10:00:00.000Z",
        studyBufferHours: 24,
      } as const;
      await phoneRepository.saveSettings(initialLocalSettings);
      const remoteSettings = {
        examAt: "2030-02-01T10:00:00.000Z",
        studyBufferHours: 12,
      } as const;
      await laptopRepository.saveSettings(remoteSettings);
      await laptop.createGroup();
      const initialRemote = (await decryptSyncPayload(
        remote.envelope!,
        remote.credentials!,
      )) as SyncPayloadV1;
      const pairingCode = await laptop.getPairingCode();
      const loadSpy = vi.spyOn(phoneRepository, "loadSyncState");
      const joining = phone.joinGroup(pairingCode);
      await vi.waitFor(() => expect(remote.pullCount).toBe(1));
      const joinSnapshotLoadCount = loadSpy.mock.calls.length;

      const localSettings = {
        examAt: "2030-03-01T10:00:00.000Z",
        studyBufferHours: 4,
      } as const;
      const review = createReviewEvent({
        id: "join-calculation-review",
        cardId: "ch01-003",
        reviewedAt: "2026-08-11T00:02:00.000Z",
        mode: "calculation",
        correct: true,
        rating: null,
        responseTimeMs: 812,
        selectedChoice: null,
      });
      await phoneRepository.saveSettings(localSettings);
      await phoneRepository.recordReview(review);
      phone.request("join-concurrent-write");

      // The scheduled request must actually run before the remote join pull is
      // released. It loads the still-disconnected state and returns without a
      // remote pull; the join transaction below performs the real reconciliation.
      await vi.waitFor(() => {
        expect(loadSpy.mock.calls.length).toBeGreaterThan(joinSnapshotLoadCount);
        expect(remote.pullCount).toBe(1);
      });
      expect((await phoneRepository.loadSyncState()).syncConfig.group).toBeNull();
      remote.pullGate.resolve();
      await joining;

      const local = await phoneRepository.loadSyncState();
      expect(local.settings).toEqual(localSettings);
      expect(local.reviews).toContainEqual(review);
      expect(local.syncConfig.settingsStamp?.value).toEqual(localSettings);
      expect(
        Date.parse(local.syncConfig.settingsStamp?.updatedAt ?? ""),
      ).toBeGreaterThan(Date.parse(initialRemote.settings.updatedAt));
      expect(local.syncConfig.lastSyncedAt).not.toBeNull();
      expect(phone.getStatus()).toMatchObject({ phase: "synced", connected: true });

      const finalRemote = (await decryptSyncPayload(
        remote.envelope!,
        remote.credentials!,
      )) as SyncPayloadV1;
      expect(finalRemote.settings.value).toEqual(localSettings);
      expect(finalRemote.reviews).toContainEqual(review);
      expect(remote.pushCount).toBe(1);

      const pushes = remote.pushCount;
      await phone.syncNow();
      expect(remote.pushCount).toBe(pushes);
    } finally {
      laptop.dispose();
      phone.dispose();
      laptopRepository.close();
      phoneRepository.close();
      await deleteDB(laptopName);
      await deleteDB(phoneName);
    }
  });

  it("keeps remote settings when no local write occurs during join", async () => {
    const laptopName = `sync-join-settings-source-${Date.now()}`;
    const phoneName = `sync-join-settings-no-write-${Date.now()}`;
    const laptopRepository = new ProgressRepository(cardIds, laptopName);
    const phoneRepository = new ProgressRepository(cardIds, phoneName);
    const remote = new DeferredJoinRemote();
    const laptop = new SyncCoordinator({
      repository: laptopRepository,
      api: remote,
      validCardIds: cardIds,
      debounceMs: 0,
      now: () => "2030-01-01T00:00:00.000Z",
    });
    const phone = new SyncCoordinator({
      repository: phoneRepository,
      api: remote,
      validCardIds: cardIds,
      debounceMs: 0,
      now: () => "2026-08-11T10:00:00.000Z",
    });
    try {
      await laptopRepository.resetAll();
      await phoneRepository.resetAll();
      const initialLocalSettings = {
        examAt: "2030-01-15T10:00:00.000Z",
        studyBufferHours: 24,
      } as const;
      await phoneRepository.saveSettings(initialLocalSettings);
      const remoteSettings = {
        examAt: "2030-02-01T10:00:00.000Z",
        studyBufferHours: 12,
      } as const;
      await laptopRepository.saveSettings(remoteSettings);
      await laptop.createGroup();
      const pairingCode = await laptop.getPairingCode();
      const joining = phone.joinGroup(pairingCode);
      await vi.waitFor(() => expect(remote.pullCount).toBe(1));
      remote.pullGate.resolve();
      await joining;

      expect((await phoneRepository.load()).settings).not.toEqual(initialLocalSettings);
      expect((await phoneRepository.load()).settings).toEqual(remoteSettings);
      expect(remote.pushCount).toBe(0);
      expect(phone.getStatus()).toMatchObject({ phase: "synced", connected: true });
    } finally {
      laptop.dispose();
      phone.dispose();
      laptopRepository.close();
      phoneRepository.close();
      await deleteDB(laptopName);
      await deleteDB(phoneName);
    }
  });

  it("keeps a locally durable review when every remote call fails", async () => {
    const databaseName = `sync-offline-${Date.now()}`;
    const repository = new ProgressRepository(cardIds, databaseName);
    const remote = new DownRemote();
    const coordinator = new SyncCoordinator({
      repository,
      api: remote,
      validCardIds: cardIds,
      debounceMs: 0,
    });
    try {
      await repository.resetAll();
      await coordinator.createGroup();
      await repository.recordReview({
        ...createReviewEvent({
          id: "offline-review",
          cardId: "ch01-001",
          reviewedAt: "2026-08-11T00:00:00.000Z",
          mode: "recall",
          correct: true,
          rating: "got_it",
          responseTimeMs: null,
          selectedChoice: null,
        }),
      });
      await expect(coordinator.syncNow()).rejects.toMatchObject({ kind: "network" });
      expect((await repository.load()).reviews.map((review) => review.id)).toEqual([
        "offline-review",
      ]);
      expect(coordinator.getStatus().phase).toBe("retry");
    } finally {
      coordinator.dispose();
      repository.close();
      await deleteDB(databaseName);
    }
  });

  it("does not apply an invalid decrypted remote payload", async () => {
    const databaseName = `sync-invalid-payload-${Date.now()}`;
    const repository = new ProgressRepository(cardIds, databaseName);
    const coordinator = new SyncCoordinator({
      repository,
      api: new InvalidPayloadRemote(),
      validCardIds: cardIds,
      debounceMs: 0,
    });
    try {
      await repository.resetAll();
      await repository.recordReview({
        ...createReviewEvent({
          id: "survives-invalid-remote",
          cardId: "ch01-001",
          reviewedAt: "2026-08-11T00:00:00.000Z",
          mode: "recall",
          correct: true,
          rating: "got_it",
          responseTimeMs: null,
          selectedChoice: null,
        }),
      });
      await coordinator.createGroup();
      await expect(coordinator.syncNow()).rejects.toThrow();
      expect(coordinator.getStatus().phase).toBe("needs-attention");
      expect(coordinator.getStatus().message).toMatch(/could not be verified/i);
      expect((await repository.load()).reviews.map((review) => review.id)).toEqual([
        "survives-invalid-remote",
      ]);
    } finally {
      coordinator.dispose();
      await repository.close();
      await deleteDB(databaseName);
    }
  });

  it("disconnects immediately during a hung pull and blocks stale completion", async () => {
    const databaseName = `sync-disconnect-${Date.now()}`;
    const repository = new ProgressRepository(cardIds, databaseName);
    const remote = new ControlledRemote();
    const coordinator = new SyncCoordinator({
      repository,
      api: remote,
      validCardIds: cardIds,
      debounceMs: 0,
      now: () => "2026-08-11T12:00:00.000Z",
    });
    try {
      await repository.resetAll();
      await repository.recordReview({
        ...createReviewEvent({
          id: "kept-after-disconnect",
          cardId: "ch01-001",
          reviewedAt: "2026-08-11T00:00:00.000Z",
          mode: "recall",
          correct: true,
          rating: "got_it",
          responseTimeMs: null,
          selectedChoice: null,
        }),
      });
      await coordinator.createGroup();
      const running = coordinator.syncNow();
      await vi.waitFor(() => expect(remote.pullCount).toBe(1));

      const disconnect = coordinator.disconnect();
      await expect(
        Promise.race([
          disconnect,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("disconnect hung")), 100),
          ),
        ]),
      ).resolves.toBeUndefined();
      expect((await repository.loadSyncState()).syncConfig.group).toBeNull();
      expect((await repository.load()).reviews.map((review) => review.id)).toEqual([
        "kept-after-disconnect",
      ]);

      remote.gate.reject(new SyncApiError("network", "late failure", 0));
      await expect(running).rejects.toMatchObject({ kind: "network" });
      expect(coordinator.getStatus().phase).toBe("disconnected");
      expect(coordinator.getStatus().message).toBeNull();
    } finally {
      coordinator.dispose();
      await repository.close();
      await deleteDB(databaseName);
    }
  });
});
