export type RandomValues = (bytes: Uint8Array) => Uint8Array | void;

export function randomBytes(length: number, randomValues?: RandomValues): Uint8Array {
  if (!Number.isInteger(length) || length < 0) {
    throw new Error("Random byte length must be a non-negative integer.");
  }

  const bytes = new Uint8Array(length);
  const fill =
    randomValues ?? ((value: Uint8Array) => globalThis.crypto.getRandomValues(value));
  fill(bytes);
  return bytes;
}

export function randomBase64Url(length: number, randomValues?: RandomValues): string {
  return toBase64Url(randomBytes(length, randomValues));
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/u.test(value) || value.length % 4 === 1) {
    throw new Error("Value is not valid base64url.");
  }

  const padded = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new Error("Value is not valid base64url.");
  }

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (toBase64Url(bytes) !== value) {
    throw new Error("Value is not canonical base64url.");
  }
  return bytes;
}

export function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === [...expected].sort()[index])
  );
}
