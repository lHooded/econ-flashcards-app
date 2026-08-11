export const WORKER_PROTOCOL_VERSION = 1 as const;
export const SYNC_ENVELOPE_FORMAT = "econ-flashcards-sync-ciphertext" as const;
export const MAX_CIPHERTEXT_BYTES = 1024 * 1024;
export const MAX_REQUEST_BODY_BYTES = 1_500_000;

export interface EncryptedSyncEnvelope {
  readonly format: typeof SYNC_ENVELOPE_FORMAT;
  readonly version: typeof WORKER_PROTOCOL_VERSION;
  readonly iv: string;
  readonly ciphertext: string;
}

export interface StoredSyncRecord {
  readonly authHash: string;
  readonly blobVersion: number;
  readonly envelope: EncryptedSyncEnvelope;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PutRequest {
  readonly expectedVersion: number | null;
  readonly envelope: EncryptedSyncEnvelope;
}

export interface SyncRecordStore {
  get(): StoredSyncRecord | undefined;
  put(record: StoredSyncRecord): void;
  delete(): void;
}

export class WorkerProtocolError extends Error {
  public constructor(
    public readonly status: 400 | 401 | 404 | 409 | 413 | 500,
    message: string,
  ) {
    super(message);
    this.name = "WorkerProtocolError";
  }
}

export function validateSyncId(value: string): boolean {
  return fixedBase64Url(value, 16);
}

export function parseBearer(request: Request): string {
  const header = request.headers.get("Authorization");
  if (header === null || !/^Bearer [A-Za-z0-9_-]{43}$/u.test(header)) {
    throw new WorkerProtocolError(401, "Authentication required.");
  }
  const token = header.slice("Bearer ".length);
  if (!fixedBase64Url(token, 32)) {
    throw new WorkerProtocolError(401, "Authentication required.");
  }
  return token;
}

export async function parsePutRequest(request: Request): Promise<PutRequest> {
  const contentLength = request.headers.get("Content-Length");
  if (contentLength !== null && Number(contentLength) > MAX_REQUEST_BODY_BYTES) {
    throw new WorkerProtocolError(413, "Sync data is too large for v1.");
  }
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_REQUEST_BODY_BYTES) {
    throw new WorkerProtocolError(413, "Sync data is too large for v1.");
  }
  let value: unknown;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(body),
    ) as unknown;
  } catch {
    throw new WorkerProtocolError(400, "Sync request body is invalid.");
  }
  if (!isRecord(value) || !hasExactKeys(value, ["expectedVersion", "envelope"])) {
    throw new WorkerProtocolError(400, "Sync request body is invalid.");
  }
  const expectedVersion = value.expectedVersion;
  if (
    expectedVersion !== null &&
    (typeof expectedVersion !== "number" ||
      !Number.isInteger(expectedVersion) ||
      expectedVersion < 1)
  ) {
    throw new WorkerProtocolError(400, "Sync request version is invalid.");
  }
  const envelope = validateEnvelope(value.envelope);
  return { expectedVersion: expectedVersion as number | null, envelope };
}

export function validateEnvelope(value: unknown): EncryptedSyncEnvelope {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["format", "version", "iv", "ciphertext"]) ||
    value.format !== SYNC_ENVELOPE_FORMAT ||
    value.version !== WORKER_PROTOCOL_VERSION ||
    typeof value.iv !== "string" ||
    typeof value.ciphertext !== "string"
  ) {
    throw new WorkerProtocolError(400, "Encrypted envelope is invalid.");
  }
  const ivBytes = decodeBase64Url(value.iv);
  const ciphertextBytes = decodeBase64Url(value.ciphertext);
  if (
    ivBytes === null ||
    ivBytes.length !== 12 ||
    ciphertextBytes === null ||
    ciphertextBytes.length < 16
  ) {
    throw new WorkerProtocolError(400, "Encrypted envelope is invalid.");
  }
  if (ciphertextBytes.length > MAX_CIPHERTEXT_BYTES) {
    throw new WorkerProtocolError(413, "Sync data is too large for v1.");
  }
  return {
    format: SYNC_ENVELOPE_FORMAT,
    version: WORKER_PROTOCOL_VERSION,
    iv: value.iv,
    ciphertext: value.ciphertext,
  };
}

export async function hashAuthToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export function emptyResponse(status: 204): Response {
  return new Response(null, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function fixedBase64Url(value: string, bytes: number, maxBytes = bytes): boolean {
  const decoded = decodeBase64Url(value);
  if (decoded === null) return false;
  return bytes === maxBytes
    ? decoded.length === bytes
    : decoded.length >= bytes && decoded.length <= maxBytes;
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value) || value.length % 4 === 1) return null;
  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    return null;
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const keys = [...expected].sort();
  return (
    actual.length === keys.length && actual.every((key, index) => key === keys[index])
  );
}
