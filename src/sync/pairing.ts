import {
  fromBase64Url,
  hasExactKeys,
  isRecord,
  randomBase64Url,
  type RandomValues,
  toBase64Url,
} from "./encoding";
import { PAIRING_PREFIX, type SyncGroupCredentials } from "./model";

export const DEFAULT_APP_URL = "https://lhooded.github.io/econ-flashcards-app/";

export function createDeviceId(randomValues?: RandomValues): string {
  return randomBase64Url(16, randomValues);
}

export function createSyncGroupCredentials(
  randomValues?: RandomValues,
): SyncGroupCredentials {
  return {
    syncId: randomBase64Url(16, randomValues),
    authToken: randomBase64Url(32, randomValues),
    encryptionKey: randomBase64Url(32, randomValues),
  };
}

export function serializePairingCredential(credentials: SyncGroupCredentials): string {
  validateCredentials(credentials);
  const compact = JSON.stringify({
    i: credentials.syncId,
    a: credentials.authToken,
    k: credentials.encryptionKey,
  });
  return `${PAIRING_PREFIX}${toBase64Url(new TextEncoder().encode(compact))}`;
}

export function parsePairingCredential(value: string): SyncGroupCredentials {
  if (typeof value !== "string" || !value.startsWith(PAIRING_PREFIX)) {
    throw new Error("Pairing code is invalid.");
  }

  const encoded = value.slice(PAIRING_PREFIX.length);
  if (encoded.length === 0 || encoded.length > 512) {
    throw new Error("Pairing code is invalid.");
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(fromBase64Url(encoded)),
    ) as unknown;
  } catch {
    throw new Error("Pairing code is invalid.");
  }

  if (!isRecord(decoded) || !hasExactKeys(decoded, ["i", "a", "k"])) {
    throw new Error("Pairing code is invalid.");
  }
  if (
    typeof decoded.i !== "string" ||
    typeof decoded.a !== "string" ||
    typeof decoded.k !== "string"
  ) {
    throw new Error("Pairing code is invalid.");
  }
  const credentials: SyncGroupCredentials = {
    syncId: decoded.i,
    authToken: decoded.a,
    encryptionKey: decoded.k,
  };
  try {
    validateCredentials(credentials);
  } catch {
    throw new Error("Pairing code is invalid.");
  }
  return credentials;
}

export function buildPairingDeepLink(
  pairingCode: string,
  baseUrl = DEFAULT_APP_URL,
): string {
  parsePairingCredential(pairingCode);
  const url = new URL(baseUrl);
  url.search = "";
  url.hash = `#/settings?pair=${encodeURIComponent(pairingCode)}`;
  return url.toString();
}

export function pairingCodeFromHash(hash: string): string | null {
  const raw = hash.replace(/^#/u, "") || "/";
  const queryIndex = raw.indexOf("?");
  const path = queryIndex === -1 ? raw : raw.slice(0, queryIndex);
  if (path !== "/settings") return null;
  const query = queryIndex === -1 ? "" : raw.slice(queryIndex + 1);
  let code: string | null;
  try {
    code = new URLSearchParams(query).get("pair");
  } catch {
    return null;
  }
  return code === null || code.trim() === "" ? null : code;
}

function validateCredentials(credentials: SyncGroupCredentials): void {
  if (
    !isRecord(credentials) ||
    !hasExactKeys(credentials, ["syncId", "authToken", "encryptionKey"])
  ) {
    throw new Error("Pairing credentials are invalid.");
  }
  fixedRandomValue(credentials.syncId, 16, "sync ID");
  fixedRandomValue(credentials.authToken, 32, "authentication token");
  fixedRandomValue(credentials.encryptionKey, 32, "encryption key");
}

function fixedRandomValue(value: unknown, length: number, label: string): void {
  if (typeof value !== "string") throw new Error(`${label} is invalid.`);
  let decoded: Uint8Array;
  try {
    decoded = fromBase64Url(value);
  } catch {
    throw new Error(`${label} is invalid.`);
  }
  if (decoded.length !== length) throw new Error(`${label} is invalid.`);
}
