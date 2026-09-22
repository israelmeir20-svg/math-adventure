/**
 * Core types for "סל הפיקניק" (Picnic Basket).
 *
 * The game is a subitizing drill: fruit is shown in a crate for a couple of
 * seconds, the lid shuts, and the child says which fruit there was MOST or LEAST
 * of. Nothing here is arithmetic - the skill is reading quantity at a glance.
 */

/** A fruit species that can appear in the crate. */
export type PicnicFruit = 'strawberry' | 'apple' | 'banana' | 'pear' | 'grapes';

/**
 * Which question is being asked about a crate.
 *
 * Both are the same comparison with the direction flipped, so they share every
 * other code path - the only difference is which extreme the child names.
 */
export type PicnicQuestion = 'most' | 'least';

/**
 * The round's state machine.
 *
 * INSPECTING - fruit is visible, the lid is open, the clock is FROZEN.
 * QUESTION   - the lid has shut, the clock runs, the child is choosing.
 * FEEDBACK   - an answer landed, the lid is lifting, the clock is FROZEN.
 * COMPLETE   - the 60 seconds are up and the medal card is showing.
 *
 * The clock rule falls straight out of this: time is only charged in QUESTION.
 */
export type PicnicPhase = 'INSPECTING' | 'QUESTION' | 'FEEDBACK' | 'COMPLETE';

/** One species' presence in a crate: how many, and where they sit. */
export interface PicnicPile {
  fruit: PicnicFruit;
  /** How many of this fruit are in the crate. Unique across the round. */
  count: number;
  /** Grid cells (0-based indices into the crate's cell list) holding this fruit. */
  cells: number[];
}

/**
 * A single cell of the crate: where its compartment is, and where the fruit on it
 * has been nudged to.
 *
 * THE TWO POSITIONS ARE DELIBERATELY SEPARATE. `x`/`y` is the compartment, which is
 * stage furniture and must line up with every other compartment; `fruitX`/`fruitY`
 * is the piece of fruit inside it, which higher tiers nudge off centre so a crate
 * cannot be read by scanning straight rows.
 *
 * An earlier version had only the jittered position, and the compartment floors were
 * drawn from it - so the wood itself wandered and the grid came out as crooked,
 * misaligned bricks. Keeping the compartment fixed and moving only the glyph is what
 * makes "the crate is straight, the fruit is scattered" expressible at all.
 */
export interface PicnicCell {
  /** 0-based row/column, kept for debugging and for orthogonal-tier assertions. */
  row: number;
  col: number;
  /** Centre of the COMPARTMENT, in stage coordinates. Never jittered. */
  x: number;
  y: number;
  /** Where the FRUIT sits, in stage coordinates. Equals `x`/`y` when jitter is 0. */
  fruitX: number;
  fruitY: number;
  /** Which fruit sits here, or null for an empty compartment. */
  fruit: PicnicFruit | null;
  /** Rotation in degrees. Zero in the strict tiers, random in the jittered ones. */
  tilt: number;
}

/** A complete, solvable crate of fruit. */
export interface PicnicRound {
  /** 1-based round number in the run. */
  roundNumber: number;
  /** Difficulty tier, 1..4. */
  level: number;
  /** Grid dimensions, as generated. */
  rows: number;
  cols: number;
  /** Every compartment, including the empty ones. */
  cells: PicnicCell[];
  /** How many of each present fruit, unsorted. */
  piles: PicnicPile[];
  /** Which comparison the child is being asked for. */
  question: PicnicQuestion;
  /** The fruit that answers the question. Always exactly one, by the no-tie rule. */
  answer: PicnicFruit;
  /**
   * The species present this round, in a stable order.
   *
   * THE BUTTONS COME FROM HERE. Offering a fruit that is not in the crate would
   * make the question unanswerable by inspection, so the option list is exactly
   * the contents of the crate - never a fixed palette.
   */
  choices: PicnicFruit[];
}
