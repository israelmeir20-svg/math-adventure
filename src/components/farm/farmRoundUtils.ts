/**
 * Pure round generators for the five farm arcade stations.
 *
 * Every generator returns the numbers the station needs to render *and* the
 * single correct answer, so the components stay presentational. All of them
 * are deterministic given a random source, which keeps them testable.
 */

/** Small inclusive random integer helper shared by every generator. */
export function randInt(min: number, max: number, random = Math.random): number {
  return min + Math.floor(random() * (max - min + 1));
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/** Distinct plausible answers around the target, always including it. */
export function buildChoices(target: number, spread: number, random = Math.random): number[] {
  const set = new Set<number>([target]);
  let guard = 0;
  while (set.size < 4 && guard < 60) {
    guard += 1;
    const delta = randInt(1, spread, random) * (random() < 0.5 ? -1 : 1);
    const candidate = target + delta;
    if (candidate >= 0 && candidate <= 30) set.add(candidate);
  }
  let filler = 1;
  while (set.size < 4) {
    set.add(target + filler);
    filler += 1;
  }
  return shuffle([...set], random);
}
