/**
 * Types for "המתכון של השף" - the chef's sequential memory game.
 *
 * The game is a working-memory drill, not arithmetic: four ingredients are
 * mapped to the four D-Pad arms, the chef shows a sequence one item at a time,
 * and the child enters it back as a PATH of directions. Order is carried
 * entirely by TIME - each item appears, then files itself into the next slot -
 * so nothing about the puzzle depends on reading direction.
 */

/** The four D-Pad arms, in the order the cross reads. */
export type Direction = 'up' | 'down' | 'left' | 'right';

/** Clockwise from the top, which is how the arms are drawn. */
export const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];

export interface Ingredient {
  id: string;
  nameHebrew: string;
  /** Bundler URL for the sprite. */
  spriteUrl: string;
}

export interface RecipeAssignment {
  direction: Direction;
  ingredient: Ingredient;
}

/**
 * What the stage is showing.
 *
 * `memorize` walks the slots; `input` is the child's turn; `right`/`wrong` are
 * the two outcome flashes. Modelling these as one union rather than a pair of
 * booleans is what stops the stage from being shown two contradictory things at
 * once - the class of bug where a lid is open and shut in the same render.
 */
export type RecipePhase = 'memorize' | 'input' | 'right' | 'wrong';

export interface RecipeRound {
  /** 1-based round number in the run. */
  roundNumber: number;
  /** The four ingredients assigned to this round, and their directions. */
  pad: RecipeAssignment[];
  /** The order the child must reproduce. */
  sequence: RecipeAssignment[];
}
