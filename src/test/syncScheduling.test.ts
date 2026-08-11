import { deleteDB } from "idb";
import { describe, expect, it } from "vitest";
import { cardIds } from "../data/deck";
import { createReviewEvent } from "../domain/progress";
import { ProgressRepository } from "../db/progressRepository";
import { SyncApiError, type SyncApi } from "../sync/client";
import { SyncCoordinator } from "../sync/coordinator";
import type { EncryptedSyncEnvelope, SyncGroupCredentials } from "../sync/model";

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
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
});
