// Seeded random numbers: the same seed always gives the same sequence (daily missions, challenge links)

export type Rng = () => number;

/** mulberry32, seeded from any string */
export function seededRandom(seed: string): Rng {
  let a = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    a ^= seed.charCodeAt(i);
    a = Math.imul(a, 16777619);
  }
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31).toString(36);
