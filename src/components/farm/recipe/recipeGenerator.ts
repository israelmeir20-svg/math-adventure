/**
 * Round building for "המתכון של השף".
 *
 * THE PAD IS BUILT FIRST, THEN THE SEQUENCE FROM IT. Four of the six
 * ingredients are dealt onto the D-Pad arms, and the sequence is then drawn
 * ONLY from those four. That ordering is the whole design: if the sequence were
 * generated freely and the pad assigned afterwards, an item could appear that
 * has no arm to press, and the round would be unsolvable.
 *
 * SEQUENCE LENGTH IS THE ONLY DIFFICULTY KNOB, and it is deliberately gentle
 * at the start. Two items is comfortably inside a young child's span; the
 * length grows every few rounds and then holds at five, so a run gets harder
 * without ever becoming a memory feat that no one can pass. The table itself
 * lives in `recipeLengths.ts`, which is import-free so tooling can test it.
 */
import { INGREDIENTS } from './recipeAssets';
import { DIRECTIONS, type Direction, type Ingredient, type RecipeAssignment, type RecipeRound } from './recipeTypes';
import { sequenceLengthFor } from './recipeLengths';

export { sequenceLengthFor };

/** Fisher-Yates over a copy, so the caller's array is never touched. */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Four distinct ingredients, dealt onto the four arms. */
export function buildPad(random: () => number = Math.random): RecipeAssignment[] {
  const chosen = shuffle(INGREDIENTS, random).slice(0, DIRECTIONS.length);
  return DIRECTIONS.map((direction, index) => ({
    direction,
    ingredient: chosen[index]!,
  }));
}

export function buildRecipeRound(
  roundNumber: number,
  random: () => number = Math.random,
): RecipeRound {
  const pad = buildPad(random);
  const length = sequenceLengthFor(roundNumber);
  const sequence: RecipeAssignment[] = [];
  for (let i = 0; i < length; i += 1) {
    // Drawn from the padded four, so every step has a key that can enter it.
    sequence.push(pad[Math.floor(random() * pad.length)]!);
  }
  return { roundNumber, pad, sequence };
}

/** The ingredient the k-th reveal shows, or undefined once the walk is done. */
export function revealAt(round: RecipeRound, step: number): Ingredient | undefined {
  return round.sequence[step]?.ingredient;
}

/** The arm that answers for the given ingredient, or undefined if unpadded. */
export function directionFor(
  round: RecipeRound,
  ingredientId: string,
): Direction | undefined {
  return round.pad.find((arm) => arm.ingredient.id === ingredientId)?.direction;
}
