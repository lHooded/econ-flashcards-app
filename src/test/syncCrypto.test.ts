import { describe, expect, it, vi } from "vitest";
import {
  decryptSyncPayload,
  encryptSyncPayload,
  SyncCryptoError,
} from "../sync/crypto";
import {
  buildPairingDeepLink,
  createDeviceId,
  createSyncGroupCredentials,
  parsePairingCredential,
  serializePairingCredential,
} from "../sync/pairing";
import { toBase64Url } from "../sync/encoding";
import { SyncApiClient } from "../sync/client";
import type { SyncPayloadV1 } from "../sync/model";
import QRCode from "qrcode";

const deviceA = toBase64Url(new Uint8Array(16).fill(1));
const payload: SyncPayloadV1 = {
  format: "econ-flashcards-sync",
  version: 1,
  reviews: [],
  settings: {
    value: { examAt: null, studyBufferHours: 24 },
    updatedAt: "2026-08-11T00:00:00.000Z",
    deviceId: deviceA,
  },
  mockAttempts: [],
};

describe("sync credentials and AES-GCM encryption", () => {
  it("generates independent secrets and round-trips the versioned pairing credential", () => {
    let call = 0;
    const credentials = createSyncGroupCredentials((bytes) => bytes.fill(++call));
    const deviceId = createDeviceId((bytes) => bytes.fill(9));
    expect(credentials.syncId).not.toBe(credentials.authToken);
    expect(credentials.authToken).not.toBe(credentials.encryptionKey);
    expect(deviceId).not.toBe(credentials.syncId);
    const code = serializePairingCredential(credentials);
    expect(code.startsWith("ecs1:")).toBe(true);
    expect(parsePairingCredential(code)).toEqual(credentials);
    expect(code).not.toContain(credentials.encryptionKey.slice(0, 12));
  });

  it("uses a fresh IV, authenticates the context, and fails closed on tampering or a wrong key", async () => {
    const credentials = createSyncGroupCredentials();
    const wrong = {
      ...credentials,
      encryptionKey: createSyncGroupCredentials().encryptionKey,
    };
    const first = await encryptSyncPayload(payload, credentials);
    const second = await encryptSyncPayload(payload, credentials);
    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
    await expect(decryptSyncPayload(first, credentials)).resolves.toEqual(payload);
    await expect(decryptSyncPayload(first, wrong)).rejects.toBeInstanceOf(
      SyncCryptoError,
    );
    await expect(
      decryptSyncPayload(
        {
          ...first,
          ciphertext: `${first.ciphertext.slice(0, -1)}${first.ciphertext.endsWith("A") ? "B" : "A"}`,
        },
        credentials,
      ),
    ).rejects.toBeInstanceOf(SyncCryptoError);
    await expect(
      decryptSyncPayload(
        { ...first, iv: toBase64Url(new Uint8Array(12).fill(8)) },
        credentials,
      ),
    ).rejects.toBeInstanceOf(SyncCryptoError);
  });

  it("does not put the encryption key in an HTTP request body", async () => {
    let sentBody = "";
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      sentBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ version: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const credentials = createSyncGroupCredentials();
    const envelope = await encryptSyncPayload(payload, credentials);
    await new SyncApiClient("https://sync.example", fetcher).create(
      credentials,
      envelope,
    );
    expect(sentBody).not.toContain(credentials.encryptionKey);
    expect(sentBody).toContain(envelope.ciphertext);
    expect(sentBody).toContain("expectedVersion");
  });

  it("builds a fragment-only deep link", () => {
    const credentials = createSyncGroupCredentials();
    const code = serializePairingCredential(credentials);
    const link = buildPairingDeepLink(
      code,
      "https://lhooded.github.io/econ-flashcards-app/",
    );
    const parsed = new URL(link);
    expect(parsed.pathname).toBe("/econ-flashcards-app/");
    expect(parsed.search).toBe("");
    expect(parsed.hash).toContain("#/settings?pair=");
    expect(link.slice(0, link.indexOf("#"))).not.toContain(code);
  });

  it("renders the QR locally from the deep link", async () => {
    const code = serializePairingCredential(createSyncGroupCredentials());
    const dataUrl = await QRCode.toDataURL(buildPairingDeepLink(code));
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });
});
