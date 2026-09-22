/**
 * Puzzle generation for "מאזניים בחווה".
 *
 * REVERSE GENERATION - the reason no puzzle can ever deadlock.
 *
 * A naive generator picks a left pan then hopes a matching right pan exists on
 * the shelf; that is how an unsolvable level ships. Here the TARGET is chosen
 * first, and every later decision is derived from a solution that is known to
 * work:
 *
 *   1. choose a target weight;
 *   2. build the LEFT pan (1-2 animals) summing to it;
 *   3. build the RIGHT solution summing to it - forced to mix species from
 *      round 3, so the answer is real addition rather than a clone;
 *   4. deal that solution's animals into the shelf, then pad with distractors.
 *
 * Because step 4 starts from the solution, the puzzle is solvable by
 * construction. The only thing needing care afterwards is that padding must not
 * accidentally introduce a one-tap shortcut.
 */
import { ALL_SCALE_ANIMALS, sumWeight, weightOf, type ScaleAnimal } from './scaleWeights';
import { comboFor, findDecomposition, padShelf, pickOne, randInt, reachableSums, shuffle } from './scaleMath';
import type { ScalePuzzle } from './scaleRules';

export type { ScalePuzzle } from './scaleRules';

/** Species per tier: light animals first so the sums stay in a child's head. */
const TIER_POOL: Record<number, ScaleAnimal[]> = {
  1: ['duck', 'cat'],
  2: ['duck', 'rabbit', 'cat', 'sheep'],
  3: ['duck', 'rabbit', 'cat', 'dog', 'sheep', 'donkey'],
  4: ALL_SCALE_ANIMALS,
  5: ALL_SCALE_ANIMALS,
};

/** Difference in the pans' sums: >0 means the left pan is heavier. */
export function tiltFor(left: readonly ScaleAnimal[], right: readonly ScaleAnimal[]): number {
  return sumWeight(left) - sumWeight(right);
}

/** Round -> tier, escalating as the run goes on. */
export function levelForRound(round: number): number {
  if (round <= 2) return 1;
  if (round <= 4) return 2;
  if (round <= 6) return 3;
  if (round <= 9) return 4;
  return 5;
}

/** Generates a solvable puzzle for a 1-based round, escalating through 5 tiers. */
export function buildScalePuzzle(
  round: number,
  rng: () => number = Math.random,
): ScalePuzzle {
  const level = levelForRound(round);
  const pool = TIER_POOL[level] ?? ALL_SCALE_ANIMALS;
  // Round 1-2 are the onboarding tier. From round 3 the answer must be a real
  // decomposition, so the right pan is required to mix species.
  const mustDecompose = level >= 2;

  // 1. A target weight this tier can build, used only as a HINT.
  const target = pickOne(reachableSums(pool), rng) || weightOf(pool[0] as ScaleAnimal);

  // 2. The left pan. Level 4+ may split the target over two animals, which makes
  //    the child combine on both sides.
  const leftSize = level >= 4 ? randInt(1, 2, rng) : 1;
  // The pan's real weight is authoritative: if the combo search failed we fall
  // back to one animal and re-read the target from it, so the two can never
  // disagree (a mismatch there is how an unbalanceable puzzle ships).
  const left = comboFor(pool, target, leftSize, rng) ?? [pickOne(pool, rng)];
  const weight = sumWeight(left);

  // 3. The right solution. From round 3 it must use at least two DIFFERENT
  //    species AND introduce one the left pan does not already show, so the
  //    child is doing addition rather than mirroring an animal they can see.
  //    If the pool cannot express the weight that way, the round is re-rolled
  //    instead of downgraded to a clone.
  const right = mustDecompose
    ? findDecomposition(pool, weight, left, rng)
    : (comboFor(pool, weight, 1, rng) ?? comboFor(pool, weight, 2, rng));
  if (right === null) return buildScalePuzzle(round, rng);

  // Level 3 is the "missing addend" shape: seed the pan with one animal and let
  // the child supply the rest. Only worth it if a real gap remains.
  const canSeed = level === 3 && right.length >= 2;
  const prePlaced = canSeed ? right.slice(0, 1) : [];
  const missing = right.slice(prePlaced.length);

  // 4. The shelf starts as the animals the child still needs, so the puzzle is
  //    solvable by construction, then gets padded with distractors.
  const wanted = missing.length + (level >= 5 ? 2 : randInt(2, 3, rng));
  const shelf = padShelf([...missing], pool, weight, sumWeight(prePlaced), rng, wanted);

  return {
    level,
    left,
    right: prePlaced,
    shelf: shuffle(shelf, rng),
    target: weight,
  };
}
