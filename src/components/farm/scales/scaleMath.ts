/**
 * Small random + combinatorics helpers for the Animal Scales puzzle engine.
 *
 * Split out of `scaleGenerator.ts` because "find me a combination of n animals
 * weighing exactly w" is the one operation the whole reverse-generation trick
 * leans on, and keeping it isolated makes the failure mode obvious: it returns
 * null rather than a wrong-weight guess.
 */
import { sumWeight, weightOf, type ScaleAnimal } from './scaleWeights';

export function randInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pickOne<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] as T;
}

/** Every distinct weight reachable using 1-3 animals drawn from `pool`. */
export function reachableSums(pool: readonly ScaleAnimal[]): number[] {
  const sums = new Set<number>();
  for (const a of pool) {
    sums.add(weightOf(a));
    for (const b of pool) {
      sums.add(weightOf(a) + weightOf(b));
      for (const c of pool) sums.add(weightOf(a) + weightOf(b) + weightOf(c));
    }
  }
  return [...sums];
}

/**
 * Builds a combination of exactly `size` animals from `pool` that sums to
 * `target`. Returns null when no such combination is found, so the caller can
 * fall back to a different size instead of emitting an unsolvable puzzle.
 *
 * This is a bounded random search rather than a full enumeration: the pools are
 * tiny (max 8 species, size <= 3) and the caller retries, so hitting a valid
 * combination is cheap, and a miss is harmless.
 *
 * `distinct` additionally requires every animal in the result to be a DIFFERENT
 * species. That is what forces genuine decomposition (sheep + cat) instead of a
 * lazy repeat (duck + duck), and it is why the search window is wide: mixed
 * combos are a smaller slice of the space, so more samples are needed.
 */
export function comboFor(
  pool: readonly ScaleAnimal[],
  target: number,
  size: number,
  rng: () => number,
  distinct = false,
): ScaleAnimal[] | null {
  const attempts = distinct ? 160 : 40;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const combo = Array.from({ length: size }, () => pickOne(pool, rng));
    if (sumWeight(combo) !== target) continue;
    if (distinct && new Set(combo).size !== size) continue;
    return combo;
  }
  return null;
}

/** Fisher-Yates, so the shelf order never hints at the answer. */
export function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

/**
 * Finds a right-pan solution that counts as real decomposition: 2-3 animals
 * summing to `weight`, mixing species, and including at least one species the
 * left pan does not already show.
 *
 * That last condition is what stops the "put another rabbit on because there is
 * a rabbit over there" shortcut at higher tiers, where the left pan itself holds
 * several animals. Returns null when the pool cannot do it, so the caller can
 * re-roll the round rather than ship a clone.
 */
export function findDecomposition(
  pool: readonly ScaleAnimal[],
  weight: number,
  left: readonly ScaleAnimal[],
  rng: () => number,
): ScaleAnimal[] | null {
  const onLeft = new Set(left);
  for (let i = 0; i < 200; i += 1) {
    const size = randInt(2, 3, rng);
    const combo = Array.from({ length: size }, () => pickOne(pool, rng));
    if (sumWeight(combo) !== weight) continue;
    if (new Set(combo).size !== size) continue; // must mix species
    if (combo.every((animal) => onLeft.has(animal))) continue; // must add something new
    return combo;
  }
  return null;
}

/**
 * Pads the shelf with plausible distractors.
 *
 * CRITICAL: `missing` is the solution and is carried through UNTOUCHED. Only the
 * padding is filtered, so a distractor can never be a one-tap shortcut - and,
 * just as importantly, the solution can never be filtered away, which would make
 * the level unsolvable.
 *
 * A level-3 seed makes this subtle: with the pan already holding `cat` and the
 * answer needing a second `cat`, that second cat IS a one-tap balance. It is
 * still the correct decomposition, so it must survive. Only extras are filtered.
 */
export function padShelf(
  missing: ScaleAnimal[],
  pool: readonly ScaleAnimal[],
  target: number,
  alreadyOnPan: number,
  rng: () => number,
  wanted: number,
): ScaleAnimal[] {
  const shelf = [...missing];

  let guard = 0;
  while (shelf.length < wanted && guard < 80) {
    guard += 1;
    const candidate = pickOne(pool, rng);
    // Never pad with a single animal that immediately balances the scale.
    if (alreadyOnPan + weightOf(candidate) === target) continue;
    shelf.push(candidate);
  }

  return shelf.length > 0 ? shelf : [pickOne(pool, rng)];
}
