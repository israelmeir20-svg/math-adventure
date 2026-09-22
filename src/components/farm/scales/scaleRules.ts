/**
 * The "no lazy answers" rules for "מאזניים בחווה".
 *
 * Kept apart from the generator because these are the pedagogically important
 * decisions: round 1-2 teach the mechanic with a gentle 1:1 match, and from
 * round 3 the child must actually decompose a weight into DIFFERENT animals
 * rather than tapping a clone of what is already on the left pan.
 */
import { sumWeight, weightOf, type ScaleAnimal } from './scaleWeights';
import { PAN_CAPACITY } from './scaleStageData';

/**
 * One generated challenge.
 *
 * `left` is the puzzle's given side and never changes; `right` holds any
 * pre-placed seed (level 3's missing-addend shape) and `shelf` is everything the
 * child may tap, including the distractors that make the answer non-obvious.
 */
export interface ScalePuzzle {
  /** Level tier that produced this puzzle, 1-5. */
  level: number;
  /** Animals already sitting on the left pan. */
  left: ScaleAnimal[];
  /** Animals pre-placed on the right pan (level 3 fills one). */
  right: ScaleAnimal[];
  /** Everything the player may tap, including distractors. */
  shelf: ScaleAnimal[];
  /** The weight the right pan must reach to balance. */
  target: number;
}

/**
 * True when `combo` is a lazy "same animal again" answer rather than real
 * decomposition.
 *
 * A single animal is a 1:1 ping. Several animals of ONE species (duck + duck
 * for a cat) also teach nothing about combining weights, because the child only
 * has to count copies. A genuinely mixed combo (sheep + cat = 4 + 2) is the
 * interesting case and is never trivial.
 */
export function isTrivialCombo(combo: readonly ScaleAnimal[], target: number): boolean {
  if (combo.length < 2) return true;
  if (new Set(combo).size > 1) return false;
  // All one species: it tiles the target exactly, which is the lazy case.
  return sumWeight(combo) === target;
}

/**
 * True when `combo` merely reuses a species the child can already SEE on the
 * left pan - i.e. "put another rabbit on because there is a rabbit over there".
 *
 * This matters because higher tiers put several animals on the left, so a
 * multi-animal combo can still be a clone answer: with `rabbit + rabbit` (2) on
 * the left, adding a third rabbit is not addition, it is pattern matching.
 */
export function isCloneOfLeft(combo: readonly ScaleAnimal[], left: readonly ScaleAnimal[]): boolean {
  const onLeft = new Set(left);
  return combo.length > 0 && combo.every((animal) => onLeft.has(animal));
}

/**
 * True when placing this single animal would immediately balance the scale - a
 * one-tap shortcut that skips the arithmetic entirely.
 */
export function canSingleTapSolve(
  animal: ScaleAnimal,
  target: number,
  alreadyOnPan: number,
): boolean {
  return alreadyOnPan + weightOf(animal) === target;
}

/**
 * True when some combination of shelf animals fits the remaining pan capacity
 * and closes the gap exactly.
 *
 * This is the generator's core contract ("every dealt puzzle can be finished"),
 * so it lives here as an independently checkable predicate rather than being
 * buried in the generator's construction path.
 */
export function isSolvable(puzzle: ScalePuzzle): boolean {
  const panNow = sumWeight(puzzle.right);
  const capacity = PAN_CAPACITY - puzzle.right.length;
  const shelf = puzzle.shelf;
  let found = false;

  const walk = (start: number, chosen: ScaleAnimal[]) => {
    if (found) return;
    if (chosen.length > 0 && sumWeight(chosen) + panNow === puzzle.target) {
      found = true;
      return;
    }
    if (chosen.length >= capacity) return;
    for (let i = start; i < shelf.length; i += 1) {
      walk(i + 1, [...chosen, shelf[i] as ScaleAnimal]);
    }
  };

  walk(0, []);
  return found;
}

/**
 * True when the puzzle can be finished using at least two DIFFERENT species,
 * which is the round-3+ requirement. A pan finished with a single species is a
 * clone answer, not a decomposition.
 */
export function hasMixedSolution(puzzle: ScalePuzzle): boolean {
  const capacity = PAN_CAPACITY - puzzle.right.length;
  const shelf = puzzle.shelf;
  let found = false;

  const walk = (start: number, chosen: ScaleAnimal[]) => {
    if (found) return;
    const complete = [...puzzle.right, ...chosen];
    if (
      chosen.length > 0 &&
      sumWeight(complete) === puzzle.target &&
      new Set(complete).size > 1
    ) {
      found = true;
      return;
    }
    if (chosen.length >= capacity) return;
    for (let i = start; i < shelf.length; i += 1) {
      walk(i + 1, [...chosen, shelf[i] as ScaleAnimal]);
    }
  };

  walk(0, []);
  return found;
}
