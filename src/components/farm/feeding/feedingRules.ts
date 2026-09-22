/**
 * The difficulty ladder and answer-shape rules for "שעת האכלה".
 *
 * Kept apart from the generator because these are the pedagogical decisions:
 * when to introduce a remainder, how big the numbers may get, and how tight the
 * wrong answers should be. A generator bug is a bug; a wrong number here is a
 * wrong lesson.
 */

/** How many animals at each tier, and how much food is involved. */
export interface TierSpec {
  minAnimals: number;
  maxAnimals: number;
  /** Legal remainders. `[0]` means the division is exact. */
  remainders: number[];
  /** Hard ceiling on the food in the basket. */
  maxTotal: number;
  /** Smallest fair share worth asking about. */
  minQuotient: number;
}

/**
 * The four tiers, keyed by level.
 *
 * Level 1 divides exactly (the onboarding case), level 2 always leaves one over,
 * level 3 leaves one or two, and level 4 widens the board and the leftovers.
 */
export const TIER_SPECS: Record<number, TierSpec> = {
  1: { minAnimals: 2, maxAnimals: 3, remainders: [0], maxTotal: 12, minQuotient: 2 },
  2: { minAnimals: 2, maxAnimals: 4, remainders: [1], maxTotal: 15, minQuotient: 2 },
  3: { minAnimals: 3, maxAnimals: 4, remainders: [1, 2], maxTotal: 20, minQuotient: 2 },
  4: { minAnimals: 3, maxAnimals: 4, remainders: [1, 2, 3], maxTotal: 25, minQuotient: 3 },
};

/** Round -> tier. Round 1-2 = L1, 3-4 = L2, 5-6 = L3, 7+ = L4. */
export function levelForRound(round: number): number {
  if (round <= 2) return 1;
  if (round <= 4) return 2;
  if (round <= 6) return 3;
  return 4;
}

/**
 * Builds the four answer buttons: four consecutive ascending integers with the
 * correct quotient inside the window, i.e. `[Q-1, Q, Q+1, Q+2]`.
 *
 * The window is deliberately TIGHT - every option is a neighbour of the right
 * answer - so the child has to divide rather than eliminate absurd choices. The
 * `max(1, ...)` shift keeps the lowest button at 1, which is what the tiers'
 * `minQuotient` guarantees will not normally be needed.
 *
 * NOTE THE ORDER. `candidatesFor` returns them ASCENDING, which is the readable
 * order; the shuffle is applied afterwards, in `optionsFor`. Keeping the two
 * steps apart means the correctness of the option SET can be reasoned about on
 * its own, without a shuffle scrambling the picture.
 */
export function candidatesFor(quotient: number): number[] {
  const base = Math.max(1, quotient - 1);
  return [base, base + 1, base + 2, base + 3];
}

/**
 * Fisher-Yates shuffle. Returns a new array; the input is never mutated.
 *
 * `rng` is threaded in rather than reaching for `Math.random` directly, so the
 * generator stays reproducible under a seeded RNG and the distribution of the
 * correct answer across the four button slots can actually be tested.
 */
export function shuffleOptions<T>(array: readonly T[], rng: () => number = Math.random): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * The four buttons, shuffled.
 *
 * THE POSITION OF THE RIGHT ANSWER MUST BE UNPREDICTABLE. Returning the
 * candidates ascending put `Q` in the same slot every single round, so a child
 * could learn "it's always the second button" and stop dividing - which defeats
 * the entire station. Shuffling gives each of the four slots an equal 1-in-4
 * chance of holding the answer.
 */
export function optionsFor(quotient: number, rng: () => number = Math.random): number[] {
  return shuffleOptions(candidatesFor(quotient), rng);
}

/**
 * The largest share whose total still fits the tier's food budget.
 *
 * With `count` animals and remainder `r` the total is `q*count + r`, so the cap
 * on `q` is `floor((maxTotal - r) / count)`. Subtracting the remainder BEFORE
 * dividing is essential - forgetting it lets an over-budget puzzle through.
 *
 * Returns null when even the smallest share overflows, telling the caller to
 * draw a different shape rather than emit an impossible total.
 */
export function maxQuotientFor(spec: TierSpec, count: number, remainder: number): number | null {
  const cap = Math.floor((spec.maxTotal - remainder) / count);
  if (cap < spec.minQuotient) return null;
  return cap;
}
