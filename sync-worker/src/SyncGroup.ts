import {
  constantTimeEqual,
  emptyResponse,
  hashAuthToken,
  jsonResponse,
  parseBearer,
  parsePutRequest,
  type StoredSyncRecord,
  type SyncRecordStore,
  WorkerProtocolError,
} from "./protocol";
import type { Env } from "./index";

interface SqlExecutor {
  exec<T extends Record<string, unknown> = Record<string, unknown>>(
    query: string,
    ...bindings: unknown[]
  ): Iterable<T>;
}

export interface DurableObjectContextLike {
  readonly storage: { readonly sql: SqlExecutor };
}

export class SqliteSyncRecordStore implements SyncRecordStore {
  public constructor(private readonly sql: SqlExecutor) {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS sync_record (
        record_id INTEGER PRIMARY KEY CHECK (record_id = 1),
        auth_hash TEXT NOT NULL,
        blob_version INTEGER NOT NULL,
        envelope TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  public get(): StoredSyncRecord | undefined {
    const rows = this.sql.exec<{
      auth_hash: string;
      blob_version: number;
      envelope: string;
      created_at: string;
      updated_at: string;
    }>(
      "SELECT auth_hash, blob_version, envelope, created_at, updated_at FROM sync_record WHERE record_id = 1",
    );
    const row = [...rows][0];
    if (row === undefined) return undefined;
    return {
      authHash: row.auth_hash,
      blobVersion: row.blob_version,
      envelope: JSON.parse(row.envelope) as StoredSyncRecord["envelope"],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public put(record: StoredSyncRecord): void {
    this.sql.exec(
      `INSERT INTO sync_record (record_id, auth_hash, blob_version, envelope, created_at, updated_at)
       VALUES (1, ?, ?, ?, ?, ?)
       ON CONFLICT(record_id) DO UPDATE SET
         auth_hash = excluded.auth_hash,
         blob_version = excluded.blob_version,
         envelope = excluded.envelope,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`,
      record.authHash,
      record.blobVersion,
      JSON.stringify(record.envelope),
      record.createdAt,
      record.updatedAt,
    );
  }

  public delete(): void {
    this.sql.exec("DELETE FROM sync_record WHERE record_id = 1");
  }
}

export class MemorySyncRecordStore implements SyncRecordStore {
  private record: StoredSyncRecord | undefined;

  public get(): StoredSyncRecord | undefined {
    return this.record;
  }

  public put(record: StoredSyncRecord): void {
    this.record = record;
  }

  public delete(): void {
    this.record = undefined;
  }
}

export class SyncGroup {
  private readonly store: SyncRecordStore;

  public constructor(ctx: DurableObjectContextLike, env: Env) {
    void env;
    this.store = new SqliteSyncRecordStore(ctx.storage.sql);
  }

  public fetch(request: Request): Promise<Response> {
    return handleSyncGroupRequest(request, this.store);
  }
}

export async function handleSyncGroupRequest(
  request: Request,
  store: SyncRecordStore,
  now: () => string = () => new Date().toISOString(),
): Promise<Response> {
  try {
    const token = parseBearer(request);
    const current = store.get();
    if (request.method === "GET") {
      if (current === undefined)
        throw new WorkerProtocolError(404, "Sync group was not found.");
      await assertAuth(current, token);
      return jsonResponse({ version: current.blobVersion, envelope: current.envelope });
    }

    if (request.method === "DELETE") {
      if (current === undefined)
        throw new WorkerProtocolError(404, "Sync group was not found.");
      await assertAuth(current, token);
      store.delete();
      return emptyResponse(204);
    }

    if (request.method !== "PUT")
      throw new WorkerProtocolError(400, "Method is not supported.");
    if (current !== undefined) await assertAuth(current, token);
    const input = await parsePutRequest(request);
    const timestamp = now();
    if (current === undefined) {
      if (input.expectedVersion !== null)
        throw new WorkerProtocolError(404, "Sync group was not found.");
      store.put({
        authHash: await hashAuthToken(token),
        blobVersion: 1,
        envelope: input.envelope,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      return jsonResponse({ version: 1 });
    }
    if (input.expectedVersion === null)
      throw new WorkerProtocolError(409, "Sync group is already initialized.");
    if (input.expectedVersion !== current.blobVersion) {
      throw new WorkerProtocolError(409, "Sync state changed; pull and merge again.");
    }
    store.put({
      ...current,
      blobVersion: current.blobVersion + 1,
      envelope: input.envelope,
      updatedAt: timestamp,
    });
    return jsonResponse({ version: current.blobVersion + 1 });
  } catch (error: unknown) {
    if (error instanceof WorkerProtocolError)
      return jsonResponse({ error: error.message }, error.status);
    return jsonResponse({ error: "Sync request failed." }, 500);
  }
}

async function assertAuth(record: StoredSyncRecord, token: string): Promise<void> {
  const supplied = await hashAuthToken(token);
  if (!constantTimeEqual(record.authHash, supplied)) {
    throw new WorkerProtocolError(401, "Authentication failed.");
  }
}
