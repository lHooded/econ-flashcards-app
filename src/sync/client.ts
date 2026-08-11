import { validateEncryptedSyncEnvelope } from "./crypto";
import type { EncryptedSyncEnvelope, SyncGroupCredentials } from "./model";

export type SyncApiErrorKind =
  "network" | "auth" | "not-found" | "conflict" | "too-large" | "invalid" | "server";

export class SyncApiError extends Error {
  public constructor(
    public readonly kind: SyncApiErrorKind,
    message: string,
    public readonly status: number,
    options?: { readonly cause?: unknown },
  ) {
    super(message, options);
    this.name = "SyncApiError";
  }
}

export interface SyncApi {
  create(
    credentials: SyncGroupCredentials,
    envelope: EncryptedSyncEnvelope,
  ): Promise<{ readonly version: number }>;
  pull(
    credentials: SyncGroupCredentials,
  ): Promise<{ readonly version: number; readonly envelope: EncryptedSyncEnvelope }>;
  push(
    credentials: SyncGroupCredentials,
    expectedVersion: number,
    envelope: EncryptedSyncEnvelope,
  ): Promise<{ readonly version: number }>;
  delete(credentials: SyncGroupCredentials): Promise<void>;
}

export class SyncApiClient implements SyncApi {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  public constructor(
    baseUrl: string,
    fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {
    if (baseUrl.trim() === "") throw new Error("Sync API URL cannot be empty.");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
    this.fetcher = fetcher;
  }

  public async create(
    credentials: SyncGroupCredentials,
    envelope: EncryptedSyncEnvelope,
  ): Promise<{ readonly version: number }> {
    return this.put(credentials, null, envelope);
  }

  public async pull(
    credentials: SyncGroupCredentials,
  ): Promise<{ readonly version: number; readonly envelope: EncryptedSyncEnvelope }> {
    const response = await this.request("GET", credentials, undefined);
    const body = await parseJson(response);
    return parseBlobResponse(body);
  }

  public async push(
    credentials: SyncGroupCredentials,
    expectedVersion: number,
    envelope: EncryptedSyncEnvelope,
  ): Promise<{ readonly version: number }> {
    return this.put(credentials, expectedVersion, envelope);
  }

  public async delete(credentials: SyncGroupCredentials): Promise<void> {
    const response = await this.request("DELETE", credentials, undefined);
    if (response.status !== 204) {
      throw new SyncApiError(
        "invalid",
        "Sync server returned an invalid delete response.",
        response.status,
      );
    }
  }

  private async put(
    credentials: SyncGroupCredentials,
    expectedVersion: number | null,
    envelope: EncryptedSyncEnvelope,
  ): Promise<{ readonly version: number }> {
    const response = await this.request("PUT", credentials, {
      expectedVersion,
      envelope,
    });
    return parseVersionResponse(await parseJson(response));
  }

  private async request(
    method: "GET" | "PUT" | "DELETE",
    credentials: SyncGroupCredentials,
    body: unknown,
  ): Promise<Response> {
    const url = `${this.baseUrl}/v1/sync/${encodeURIComponent(credentials.syncId)}`;
    try {
      const response = await this.fetcher(url, {
        method,
        headers: {
          Authorization: `Bearer ${credentials.authToken}`,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
      });
      if (!response.ok) throw responseError(response.status);
      return response;
    } catch (error: unknown) {
      if (error instanceof SyncApiError) throw error;
      throw new SyncApiError("network", "Sync network request failed.", 0, {
        cause: error,
      });
    }
  }
}

export function configuredSyncApi(): SyncApi | undefined {
  const value = import.meta.env.VITE_SYNC_API_URL as string | undefined;
  return value === undefined || value.trim() === ""
    ? undefined
    : new SyncApiClient(value);
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch (error: unknown) {
    throw new SyncApiError(
      "invalid",
      "Sync server returned invalid JSON.",
      response.status,
      { cause: error },
    );
  }
}

function parseVersionResponse(value: unknown): { readonly version: number } {
  if (
    !isObject(value) ||
    typeof value.version !== "number" ||
    !Number.isInteger(value.version) ||
    value.version < 1
  ) {
    throw new SyncApiError("invalid", "Sync server returned an invalid version.", 200);
  }
  return { version: value.version };
}

function parseBlobResponse(value: unknown): {
  readonly version: number;
  readonly envelope: EncryptedSyncEnvelope;
} {
  if (
    !isObject(value) ||
    typeof value.version !== "number" ||
    !Number.isInteger(value.version) ||
    value.version < 1
  ) {
    throw new SyncApiError(
      "invalid",
      "Sync server returned an invalid sync record.",
      200,
    );
  }
  try {
    return {
      version: value.version,
      envelope: validateEncryptedSyncEnvelope(value.envelope),
    };
  } catch (error: unknown) {
    throw new SyncApiError(
      "invalid",
      "Sync server returned an invalid encrypted envelope.",
      200,
      { cause: error },
    );
  }
}

function responseError(status: number): SyncApiError {
  if (status === 401 || status === 403)
    return new SyncApiError(
      "auth",
      "Could not authenticate with the sync server.",
      status,
    );
  if (status === 404)
    return new SyncApiError("not-found", "Sync group was not found.", status);
  if (status === 409)
    return new SyncApiError("conflict", "Remote sync state changed; retrying.", status);
  if (status === 413)
    return new SyncApiError("too-large", "Sync data is too large for v1.", status);
  if (status >= 500)
    return new SyncApiError("server", "The sync server is unavailable.", status);
  return new SyncApiError("invalid", "The sync request was rejected.", status);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
