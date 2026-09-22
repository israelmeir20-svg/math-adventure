/**
 * Puzzle generation for "שעת האכלה" (Feeding Time).
 *
 * REVERSE GENERATION, the same trick the scales station uses, and for the same
 * reason: a division puzzle is only fair if the share is a whole number, so we
 * never "hope" the food divides evenly. We CHOOSE the quotient first and build
 * the total from it:
 *
 *   totalFood = quotient * animalCount + remainder
 *
 * so the division the child performs is exactly the one we designed. The
 * remainder is the point of levels 2-4: the answer stays `quotient` even though
 * food is left over, which is the intuition this station exists to build.
 */
import { ALL_ANIMALS, BULK_FOODS, foodFor } from './feedingAnimals';
import {
  TIER_SPECS,
  levelForRound,
  maxQuotientFor,
  optionsFor,
  type TierSpec,
} from './feedingRules';
import type { FeedingAnimal, FeedingPuzzle } from './feedingTypes';

export { TIER_SPECS, levelForRound, optionsFor } from './feedingRules';
export function buildFeedingPuzzle(round: number, rng: () => number = Math.random): FeedingPuzzle {
  const level = levelForRound(round);
  const spec = TIER_SPECS[level] ?? TIER_SPECS[1]!;

  const { count, remainder, cap } = drawShape(spec, rng);
  const quotient = randInt(spec.minQuotient, cap, rng);

  // Reverse generation: the total is derived from the share, never guessed.
  const totalFood = quotient * count + remainder;

  // Hard guard: the question is only answerable if the total really does divide
  // to the stated share. Cheap, always on, and it turns a silent arithmetic bug
  // into a loud one.
  if (Math.floor(totalFood / count) !== quotient) {
    throw new Error(
      `[Feeding] puzzle does not divide to its own quotient: ` +
        `round=${round} level=${level} count=${count} r=${remainder} ` +
        `q=${quotient} total=${totalFood}`,
    );
  }

  const animals = pickAnimals(count, level, rng);
  // The bulk menu is drawn per round, so a herd of cows eats corn one round and
  // apples the next; `foodFor` fixes the pets to their own favourite.
  const bulk = pickOne(BULK_FOODS, rng);
  const food = foodFor(animals[0] as FeedingAnimal, bulk);

  return { level, animals, food, totalFood, quotient, options: optionsFor(quotient, rng) };
}

/**
 * Draws an animal count, a remainder and the matching share cap, all three
 * consistent with each other.
 *
 * THE REMAINDER MUST BE SMALLER THAN THE ANIMAL COUNT. That is the definition,
 * not a preference: `floor(total / count)` only equals `q` when `r < count`.
 * With 3 animals and a remainder of 3 the total is `3q + 3`, which divides out
 * to `q + 1` with no remainder - the puzzle would state a share that does not
 * divide its own total.
 *
 * The cap is returned alongside the pair because the budget couples all three,
 * so the caller never recomputes it against a count that may have changed.
 */
function drawShape(
  spec: TierSpec,
  rng: () => number,
): { count: number; remainder: number; cap: number } {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const count = randInt(spec.minAnimals, spec.maxAnimals, rng);
    const usable = spec.remainders.filter((r) => r < count);
    if (usable.length === 0) continue;
    const remainder = pickOne(usable, rng);
    const cap = maxQuotientFor(spec, count, remainder);
    if (cap !== null) return { count, remainder, cap };
  }

  // Guaranteed-valid fallback: the widest board always has room for a remainder
  // of one, so this branch cannot be reached in practice.
  const count = spec.maxAnimals;
  const cap = maxQuotientFor(spec, count, 1) ?? spec.minQuotient;
  return { count, remainder: 1, cap };
}

/**
 * Picks the animals for one trough.
 *
 * A single species per round keeps the question unambiguous ("חלקו בין 3 פרות"),
 * which matters more here than variety: a mixed pen would make the food pairing
 * meaningless, since each animal eats something different.
 */
function pickAnimals(count: number, level: number, rng: () => number): FeedingAnimal[] {
  // Early tiers stick to the small pets, whose food is unmistakable.
  const pool = level <= 2 ? ALL_ANIMALS.slice(0, 5) : ALL_ANIMALS;
  const species = pickOne(pool, rng);
  return Array.from({ length: count }, () => species);
}

function randInt(min: number, max: number, rng: () => number): number {
  if (max <= min) return min;
  return min + Math.floor(rng() * (max - min + 1));
}

function pickOne<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] as T;
}
