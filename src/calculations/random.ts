import type { CalculationSeed } from "./model";

export function normalizeCalculationSeed(seed: CalculationSeed): string {
  if (typeof seed === "number") {
    if (!Number.isFinite(seed)) {
      throw new Error("Calculation seeds must be finite numbers or strings.");
    }
    return String(seed);
  }
  if (seed.trim().length === 0) {
    throw new Error("Calculation seeds must not be empty.");
  }
  return seed;
}

/** A small deterministic PRNG suitable for reproducible practice instances. */
export class SeededRandom {
  private state: number;

  constructor(seed: CalculationSeed) {
    this.state = hashSeed(normalizeCalculationSeed(seed));
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let value = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  integer(min: number, max: number): number {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max < min) {
      throw new Error("SeededRandom.integer requires an ordered safe-integer range.");
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  decimal(min: number, max: number, decimals: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
      throw new Error("SeededRandom.decimal requires an ordered finite range.");
    }
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 8) {
      throw new Error(
        "SeededRandom.decimal decimals must be an integer from 0 through 8.",
      );
    }
    const factor = 10 ** decimals;
    const lower = Math.ceil(min * factor);
    const upper = Math.floor(max * factor);
    if (upper < lower) {
      throw new Error("SeededRandom.decimal range contains no representable values.");
    }
    return this.integer(lower, upper) / factor;
  }

  pick<T>(values: readonly T[]): T {
    if (values.length === 0) {
      throw new Error("SeededRandom.pick requires at least one value.");
    }
    return values[this.integer(0, values.length - 1)];
  }

  boolean(): boolean {
    return this.next() >= 0.5;
  }

  shuffle<T>(values: readonly T[]): T[] {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = this.integer(0, index);
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }
}

export function deriveCalculationSeed(...parts: readonly CalculationSeed[]): string {
  return parts.map(normalizeCalculationSeed).join("::");
}

export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash | 0;
}

export function seedFingerprint(seed: CalculationSeed): string {
  return (hashSeed(normalizeCalculationSeed(seed)) >>> 0).toString(16).padStart(8, "0");
}
