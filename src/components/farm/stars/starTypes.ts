/**
 * Shape and round types for "משחק הכוכבים".
 *
 * A round is a LIST OF SHAPES plus a total. Deliberately not a flat list of stars: the
 * whole skill is reading a constellation as "that is a pentagon, that is a square" and
 * adding the group sizes, so anything that flattened the shapes before the child saw them
 * would remove the thing being taught.
 */

export interface StarPoint {
  x: number;
  y: number;
}

/** One constellation: a ring of stars and where the anchor that owns it sits. */
export interface StarShape {
  /** How many stars are in this shape. */
  count: number;
  /** The shape's centre on the stage. Also the pivot for a Tier 3 spin. */
  anchor: StarPoint;
  /** The vertices, already offset into stage coordinates. */
  stars: StarPoint[];
  /**
   * The static rotation applied to this shape, in degrees.
   *
   * ZERO FOR TIER 1, random for Tier 2, and ZERO-but-animated for Tier 3 - a spinning
   * shape is rotated by CSS at its anchor, not by baking an angle into these coordinates.
   * Keeping the two separate is what lets the spin be smooth: re-deriving vertices every
   * frame would mean re-rendering React, which is exactly the jank this avoids.
   */
  rotation: number;
  /**
   * True when this shape should spin continuously in place.
   *
   * A PER-SHAPE DECISION, NOT A PER-LEVEL ONE. It used to be copied straight from the tier's
   * own `spin` flag, which made the whole stage all-or-nothing: every shape in a level either
   * turned together or none of them moved, and the "one shape spinning while another stays
   * still" that the design calls for was not expressible at all. It is rolled per shape now,
   * from the tier's `spinChance`, so a formation can mix a turning shape with a resting one.
   *
   * `rotation` IS STILL MEANINGFUL WHEN THIS IS TRUE. The CSS animation overrides the baked
   * angle while it runs, but the baked angle is the frame a reduced-motion child sees, and it
   * must not be zero - a still, upright silhouette is the one pose the spinning levels exist
   * to avoid.
   */
  spinning: boolean;
  /**
   * The sign of this shape's spin, +1 or -1, or 0 when it does not spin.
   *
   * CHOSEN PER SHAPE SO NEIGHBOURS TURN AGAINST EACH OTHER. Two shapes rotating the same way at
   * the same rate read as one rigidly rotating group - the eye locks onto the pairing and the
   * grouping stops being something the child has to count. Counter-rotation breaks that lock.
   */
  spinDirection: 1 | -1 | 0;
  /**
   * This shape's own turn duration in seconds.
   *
   * VARIED PER SHAPE FOR THE SAME REASON AS THE DIRECTION: identical rates re-create the rigid
   * formation. The renderer used to index a fixed table by the shape's position, which gave
   * every round the same three speeds in the same order - so the "independent rate" the design
   * asks for was a constant, not a variation.
   */
  spinSeconds: number;
}

export interface StarRound {
  /** 1-based round number within the run. */
  roundNumber: number;
  /** Which difficulty tier this round belongs to, 1 to 3. */
  level: number;
  shapes: StarShape[];
  /** The number of stars across every shape. The answer. */
  total: number;
  /** Exactly four unique candidates, always containing `total`, already shuffled. */
  options: number[];
}

/** The rounds at which each tier begins. */
export type StarTierId = 1 | 2 | 3;
