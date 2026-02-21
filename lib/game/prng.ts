/**
 * Mulberry32 — a fast, seedable 32-bit PRNG.
 * Both players use the same seed from the match PDA to generate identical boards.
 */
export function createPRNG(seed: number) {
  let state = seed | 0;

  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns an integer in [0, max) */
export function randomInt(rng: () => number, max: number): number {
  return Math.floor(rng() * max);
}
