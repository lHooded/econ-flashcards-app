import {
  encodeUtf8,
  fromBase64Url,
  hasExactKeys,
  isRecord,
  randomBytes,
  toBase64Url,
  type RandomValues,
} from "./encoding";
import {
  SYNC_ENVELOPE_FORMAT,
  SYNC_PROTOCOL_VERSION,
  type EncryptedSyncEnvelope,
  type SyncGroupCredentials,
  type SyncPayloadV1,
} from "./model";

export const AES_GCM_IV_BYTES = 12;
export const MAX_CIPHERTEXT_BYTES = 1024 * 1024;

export class SyncCryptoError extends Error {
  public constructor(message = "Encrypted sync data could not be verified.") {
    super(message);
    this.name = "SyncCryptoError";
  }
}

export class SyncPayloadTooLargeError extends Error {
  public constructor(message = "Sync data is too large for v1.") {
    super(message);
    this.name = "SyncPayloadTooLargeError";
  }
}

export function validateEncryptedSyncEnvelope(value: unknown): EncryptedSyncEnvelope {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["format", "version", "iv", "ciphertext"])
  ) {
    throw new SyncCryptoError();
  }
  if (
    value.format !== SYNC_ENVELOPE_FORMAT ||
    value.version !== SYNC_PROTOCOL_VERSION ||
    typeof value.iv !== "string" ||
    typeof value.ciphertext !== "string"
  ) {
    throw new SyncCryptoError();
  }

  try {
    if (fromBase64Url(value.iv).length !== AES_GCM_IV_BYTES) throw new Error();
    const ciphertextBytes = fromBase64Url(value.ciphertext);
    if (ciphertextBytes.length > MAX_CIPHERTEXT_BYTES) {
      throw new SyncPayloadTooLargeError();
    }
    if (ciphertextBytes.length < 16) {
      throw new Error();
    }
  } catch (error: unknown) {
    if (error instanceof SyncPayloadTooLargeError) throw error;
    throw new SyncCryptoError();
  }

  return {
    format: SYNC_ENVELOPE_FORMAT,
    version: SYNC_PROTOCOL_VERSION,
    iv: value.iv,
    ciphertext: value.ciphertext,
  };
}

export async function encryptSyncPayload(
  payload: SyncPayloadV1,
  credentials: SyncGroupCredentials,
  randomValues?: RandomValues,
): Promise<EncryptedSyncEnvelope> {
  const key = await importEncryptionKey(credentials.encryptionKey);
  const iv = randomBytes(AES_GCM_IV_BYTES, randomValues);
  const plaintext = encodeUtf8(JSON.stringify(payload));
  let ciphertext: ArrayBuffer;
  try {
    ciphertext = await getCrypto().subtle.encrypt(
      {
        name: "AES-GCM",
        iv: asBufferSource(iv),
        additionalData: asBufferSource(associatedData(credentials.syncId)),
        tagLength: 128,
      },
      key,
      asBufferSource(plaintext),
    );
  } catch {
    throw new SyncCryptoError("Sync payload could not be encrypted.");
  }

  const envelope = {
    format: SYNC_ENVELOPE_FORMAT,
    version: SYNC_PROTOCOL_VERSION,
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(new Uint8Array(ciphertext)),
  } satisfies EncryptedSyncEnvelope;
  return validateEncryptedSyncEnvelope(envelope);
}

export async function decryptSyncPayload(
  envelopeValue: unknown,
  credentials: SyncGroupCredentials,
): Promise<unknown> {
  const envelope = validateEncryptedSyncEnvelope(envelopeValue);
  let plaintext: ArrayBuffer;
  try {
    const key = await importEncryptionKey(credentials.encryptionKey);
    plaintext = await getCrypto().subtle.decrypt(
      {
        name: "AES-GCM",
        iv: asBufferSource(fromBase64Url(envelope.iv)),
        additionalData: asBufferSource(associatedData(credentials.syncId)),
        tagLength: 128,
      },
      key,
      asBufferSource(fromBase64Url(envelope.ciphertext)),
    );
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(plaintext)),
    ) as unknown;
  } catch {
    throw new SyncCryptoError();
  }
}

async function importEncryptionKey(value: string): Promise<CryptoKey> {
  let bytes: Uint8Array;
  try {
    bytes = fromBase64Url(value);
  } catch {
    throw new SyncCryptoError();
  }
  if (bytes.length !== 32) throw new SyncCryptoError();
  try {
    return await getCrypto().subtle.importKey(
      "raw",
      asBufferSource(bytes),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
  } catch {
    throw new SyncCryptoError();
  }
}

function associatedData(syncId: string): Uint8Array {
  return encodeUtf8(`econ-flashcards-sync-v1:${syncId}`);
}

function getCrypto(): Crypto {
  if (
    typeof globalThis.crypto === "undefined" ||
    globalThis.crypto.subtle === undefined
  ) {
    throw new SyncCryptoError("Web Crypto is unavailable in this browser.");
  }
  return globalThis.crypto;
}

function asBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}
