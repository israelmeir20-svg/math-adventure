/**
 * Shapes, anchors and timings for "משחק הכוכבים".
 *
 * PURE DATA AND GEOMETRY - no React, no imports beyond the tier table - so the generator
 * can be exercised from a plain Node script. Every `tools/star*.ts` check depends on that:
 * the moment this file imports a `.png` or a component, the checks stop being runnable
 * outside the bundler.
 *
 * THE CANVAS IS 800 x 360, MATCHING EVERY OTHER FARM STAGE. It was very nearly 600 x 320 -
 * the original anchors were measured for that canvas, where x = 300 is the true midpoint -
 * but a short stage renders visibly smaller than its five neighbours in the hub, so the
 * whole layout was translated by (+100, +20) instead. A rigid translation, chosen because it
 * preserves every separation between anchors exactly rather than approximately. The Tier 1
 * anchor is the proof: 400 x 165 is the exact centre of 800 x 360.
 */

/** The stage canvas. Matches every other farm station. */
export const VIEW_W = 800;
export const VIEW_H = 360;

/**
 * How many stars each shape has, and how far its vertices sit from its anchor.
 *
 * The radii grow with the vertex count so that every shape LOOKS about the same size - a
 * pentagon and a hexagon at equal circumradius read as different weights, because the
 * hexagon's vertices are closer together and its outline is rounder.
 *
 * THE LARGER COUNTS ARE THE LEVEL 2 "COMPLEX CONSTELLATION", and their radii do NOT keep
 * climbing at the same rate. Beyond about a dozen vertices a regular polygon stops reading
 * as a constellation and starts reading as a circle of dots, which defeats the point of
 * asking the child to count them. The steps therefore flatten off after 8: enough extra
 * reach that the shape feels bigger and busier, not so much that the vertices crowd into a
 * ring the eye reads as a single object.
 */
export const SHAPE_RADII: Record<number, number> = {
  3: 40,
  4: 44,
  5: 46,
  6: 48,
  7: 51,
  8: 54,
  9: 56,
  10: 58,
  12: 62,
};

/**
 * The shape sizes a round may draw.
 *
 * `SHAPE_SIZES` IS THE SET OF LEGAL SIZES, not the set any one level uses - the levels
 * pick their own subsets in `starTiers`. It exists so the import-time checks can reject a
 * size that has no radius, which is exactly the mistake a new level would otherwise make.
 */
export const SHAPE_SIZES = [3, 4, 5, 6, 7, 8, 9, 10, 12] as const;

/**
 * The sizes a Level 1 question draws: the simple, instantly-named constellations.
 *
 * SEVEN BELONGS HERE, AND IT IS EARNED RATHER THAN GIVEN. The brief asks for a single shape of
 * at most seven stars, with the seven-star shapes reserved for the back half of the run - the
 * size is a legal Level 1 shape, but WHEN it may appear is a separate rule (see
 * `LEVEL1_MAX_SIZE_EARLY`/`_LATE` in `starTiers`). Splitting the legal sizes from the
 * per-question allowance is what keeps "seven is drawable" and "seven is drawable from
 * question 5" from becoming the same fact in the table.
 *
 * NO CIRCLE. The brief for Level 1 asks for a circle, and a regular polygon is the wrong
 * primitive for one: a true circle has no vertices, so there would be no stars to place at
 * all. A 12-gon is what a circle looks like when drawn as stars, so it is offered as the
 * roundest shape rather than a special case - but it is NOT in this list, because a dozen
 * stars is a counting exercise and not a warm-up. It belongs to Level 3, where it lives.
 */
export const SIMPLE_SIZES = [3, 4, 5, 6, 7] as const;

/** The sizes Level 3's complex branch draws: busy enough to need real counting. */
export const COMPLEX_SIZES = [8, 10, 12] as const;


/** The sparkle's own arm length, so the drawing is bounded by radius + this. */
export const SPARKLE_ARM = 8;

/**
 * The largest distance from an anchor that anything is ever painted.
 *
 * Used by the placement check to prove two shapes cannot touch. Rotation does not change a
 * regular polygon's circumradius, so this single number bounds a rotating shape too - which
 * is why Tier 3's spin needs no separate clearance calculation.
 */
export const MAX_REACH = Math.max(...Object.values(SHAPE_RADII)) + SPARKLE_ARM;

/**
 * Where the shapes sit, per shape count.
 *
 * MEASURED, NOT COMPUTED, because the arrangements are asymmetric on purpose: two shapes sit
 * left and right of centre, but three sit in a triangle with one at the bottom, which reads
 * as a constellation rather than a row of objects.
 *
 * THE SEPARATION IS THE LOAD-BEARING PROPERTY. Two shapes whose anchors are closer than
 * `MAX_REACH * 2` would have touching outlines and the child could not tell where one ends
 * and the next begins - which is precisely the grouped-counting skill the game tests. Checks
 * assert a minimum centre distance of 140px, and the tightest actual pair is 173.3px, so
 * there is 33px of margin over the rule and 61px over the geometric minimum.
 */
export const ANCHORS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 400, y: 165 }],
  2: [
    { x: 290, y: 165 },
    { x: 510, y: 165 },
  ],
  3: [
    { x: 280, y: 115 },
    { x: 520, y: 115 },
    { x: 400, y: 240 },
  ],
  /*
   * FOUR SHAPES - the widest formation in the game, for Level 3's "four identical medium
   * shapes" branch.
   *
   * A 2x2 GRID, PUSHED TO THE OUTER EDGES. The binding constraint is the same 140px separation
   * the checker enforces, and on an 800x360 canvas a 2x2 arrangement has to be spread this wide
   * to clear it - the tightest pair here is 160px (the left column against the right), which
   * leaves 20px of margin over the rule. Anything narrower fails at import, so the extents are
   * not a style choice.
   *
   * THE VERTICAL SPREAD IS ALSO BOUNDED, but by the drawing rather than by the separation: an
   * anchor must keep `MAX_REACH` (70px) clear of every edge, so y must lie within 70..290. The
   * rows sit at 100 and 260 - 30px inside each limit - which is what stops the top and bottom
   * shapes from clipping the canvas.
   */
  4: [
    { x: 220, y: 100 },
    { x: 580, y: 100 },
    { x: 220, y: 260 },
    { x: 580, y: 260 },
  ],
};

/**
 * The gap between an answer and the next round, per outcome.
 *
 * BOTH ARE SHORT BECAUSE THE CLOCK NEVER STOPS. This game runs the same continuous 30-second
 * arcade countdown as the rest of the farm, so a long celebration is time the child does not
 * get back to spend on counting. A correct answer barely needs a pause at all; a miss needs
 * only long enough to register the shake and the "אופס!".
 */
export const CORRECT_MS = 300;
export const WRONG_MS = 450;

/**
 * How long each shape takes for one full turn, in seconds.
 *
 * SLOW ON PURPOSE. The point of the spinning tier is that the child cannot snap a single
 * glance and recognise the silhouette - but the stars still have to stay individually
 * trackable, or counting becomes luck. Around half a minute a turn means a vertex moves a few
 * degrees per second: enough to defeat pattern-matching, not enough to blur.
 *
 * THREE DIFFERENT RATES, one per shape, so the shapes never lock into a rigid formation that
 * the eye could read as a single rotating object. Indexed by the shape's position, and read
 * modulo its length, so it stays correct for any tier that spins.
 */
export const SPIN_SECONDS = [22, 27, 32];

/** How many background specks the sky is dusted with. Decorative only. */
export const BACKDROP_STARS = 25;

/** The gold used for both the connecting lines and the star cores' glow. */
export const LINE_COLOR = '#fde047';
export const SPARKLE_COLOR = '#fffdf0';
