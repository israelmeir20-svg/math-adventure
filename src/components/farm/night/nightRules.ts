/**
 * The difficulty ladder and answer-shape rules for "האסם בלילה".
 *
 * Kept apart from the generator because these are the pedagogical decisions:
 * which direction of the 2x fact to drill, how far the numbers may go, and how
 * tight the wrong answers should be.
 *
 * THE FOUR TIERS ALTERNATE DIRECTION ON PURPOSE. Levels 1 and 3 halve (eyes ->
 * animals), level 2 doubles (animals -> eyes), and level 4 asks for a count of
 * one species among a crowd. A child who only ever halved would learn "divide
 * the number by two" as a trick rather than understanding that eyes and animals
 * are the same fact read in two directions.
 */
import type { NightMode } from './nightTypes';

/** What one tier is allowed to ask. */
export interface NightTierSpec {
  mode: NightMode;
  /** Smallest and largest answer the tier may produce. */
  minAnswer: number;
  maxAnswer: number;
}

/**
 * The four tiers, keyed by level.
 *
 * The bounds are in terms of the ANSWER, not the prompt. Level 1 divides 4-8
 * eyes (answers 2-4), level 2 doubles 3-6 animals (answers 6-12), level 3
 * divides up to 18 eyes (answers up to 9), and level 4 counts a species in a
 * crowd of 5-7.
 *
 * LEVEL 4 STARTS AT 1, NOT 2. There is exactly one cow hiding among six other
 * animals, and finding the single member of a species is the purest form of the
 * selective attention this tier drills - it cannot be done by estimating a mass,
 * only by checking each animal in turn. `nightOptionsFor` drops the would-be
 * "0" neighbour, so a Q of 1 still yields a full four-wide keypad.
 */
export const NIGHT_TIERS: Record<number, NightTierSpec> = {
  1: { mode: 'halve', minAnswer: 2, maxAnswer: 4 },
  2: { mode: 'double', minAnswer: 3, maxAnswer: 6 },
  3: { mode: 'halve', minAnswer: 4, maxAnswer: 9 },
  4: { mode: 'detective', minAnswer: 1, maxAnswer: 4 },
};

/** Round -> tier. Rounds 1-2 = L1, 3-4 = L2, 5-6 = L3, 7+ = L4. */
export function nightTierForRound(round: number): number {
  if (round <= 2) return 1;
  if (round <= 4) return 2;
  if (round <= 6) return 3;
  return 4;
}

/**
 * Fisher-Yates shuffle. Returns a new array; the input is never mutated.
 *
 * `rng` is threaded in so the generator stays reproducible under a seeded RNG,
 * which is what makes the distribution of the correct answer across the four
 * button slots testable rather than a matter of trust.
 */
export function shuffleNight<T>(array: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Three tight wrong answers around `answer`, plus the answer itself, shuffled.
 *
 * TIGHT is the requirement: every distractor is a near neighbour (off by one or
 * two), so the child cannot eliminate absurd choices and must actually compute.
 * The pool is filtered to stay positive and deduplicated, and if a tier ever
 * produced too few neighbours the set is topped up from further out rather than
 * emitting a short keypad.
 */
export function nightOptionsFor(answer: number, rng: () => number = Math.random): number[] {
  const near = [answer - 2, answer - 1, answer + 1, answer + 2];
  const pool = near.filter((value) => value >= 1 && value !== answer);

  const chosen: number[] = [];
  const bag = shuffleNight(pool, rng);
  while (chosen.length < 3 && bag.length > 0) {
    const value = bag.pop() as number;
    if (!chosen.includes(value)) chosen.push(value);
  }
  // Safety net: only reachable if `answer` were tiny, but a short keypad would
  // break the layout, so it is worth the two lines.
  let filler = 1;
  while (chosen.length < 3) {
    if (filler !== answer && !chosen.includes(filler)) chosen.push(filler);
    filler += 1;
  }

  return shuffleNight([answer, ...chosen], rng);
}

/** A uniform integer in [min, max]. */
export function nightInt(min: number, max: number, rng: () => number): number {
  if (max <= min) return min;
  return min + Math.floor(rng() * (max - min + 1));
}

/** One element of `items`. */
export function nightPick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] as T;
}
