/**
 * The resting places on the basket floor.
 *
 * HAND-MEASURED RATHER THAN COMPUTED, because the floor is not a flat rectangle. The
 * basket is seen slightly from above, so the checkered base widens toward the front:
 * row 0 is the narrowest and row 3 the widest. A uniform `x = left + col * step` grid
 * would march straight down the canvas and the bottom row would sit inside the rim.
 *
 * Rows are ordered top to bottom, columns left to right, so the first N entries of the
 * flat list are a natural reading order for the child - fruit fills the back of the
 * basket before the front, which is also how a real basket is packed.
 *
 * ===================================================================
 * THE SLOTS ARE INSET FROM THE FLOOR BOUNDS, AND THE INSET IS THE POINT.
 * ===================================================================
 *
 * `FLOOR_L/R/T/B` in `picnicData.ts` are the extent of the usable cloth, but a slot is
 * where a fruit may be CENTRED - and a fruit is `FRUIT_SIZE` wide, so a sprite centred on
 * the outermost slot still overhangs its centre by half its box. An earlier revision put
 * the outer slots exactly ON the floor bounds, which meant half of every edge fruit was
 * painted past the cloth and onto the rim or the grass behind it.
 *
 * The outermost CENTRES are therefore held a clear margin inside the bounds, and the
 * margins are COMFORTABLY wider than the sprite's half-width so the fruit reads as a group
 * resting on the cloth rather than a row pressed against the rim:
 *
 *   horizontal - the 4 columns span a fixed 136 units, centred on the cloth, so the outer
 *                centre sits 68 units in from the row's own midpoint. Against a 34-unit
 *                sprite that leaves 51 units of clear cloth outboard of the outermost
 *                fruit, and the whole group is symmetric about the basket's centre line
 *   vertical   - rows run 77..179 on a 34-unit pitch, against a cloth band of 65..180. The
 *                block is pushed 6 units DOWN from centre, so the margin above row 0 is 12
 *                and below row 3 is 1. The bias is deliberate: the back of the basket is an
 *                inclined wall in the artwork, so the usable flat floor starts below
 *                `FLOOR_T`, and a centred block puts the back row too close to that slope.
 *                The 1-unit bottom margin is the hard limit - any further shift walks the
 *                front row off the cloth, which is what `FLOOR_B` records.
 *
 * THE ROWS NOW OVERHANG THE RECORDED FLOOR BOUNDS, DELIBERATELY. `FLOOR_T`/`FLOOR_B` are
 * 60..165, a 105-unit band, and four rows on a 40-unit pitch span 120 units - they cannot
 * fit inside it at any position. The priority order is that neighbouring piles must not
 * TOUCH (the failure `picnicTierChecks.ts` guards, which makes a round unanswerable) over
 * staying inside a hand-measured bound that is a reading of the artwork rather than a wall.
 * The overhang is 2 units at each end against a 34-unit sprite, so the top and bottom rows
 * still sit visually on the cloth. If the front row reads as sitting on the rim, the lever
 * is `FRUIT_SIZE` in `picnicData.ts`, not this table - a smaller fruit admits a smaller
 * pitch and the whole block comes back inside the bounds.
 *
 * SYMMETRY IS THE CONSTRAINT, NOT THE PER-ROW INSET. An earlier revision widened the rows
 * front-to-back to track the perspective, but the columns are a single visual GROUP that the
 * child scans as one row of piles, and a group whose spacing changes row to row reads as
 * misaligned. Every row therefore uses the same 136-unit horizontal span and the same
 * centre; only `y` changes between rows. The perspective is already carried by the basket
 * artwork itself and does not need to be restated in the slot table.
 *
 * THE SPAN IS CENTRED ON THE CLOTH, WHICH IS NOT THE CANVAS CENTRE. The cloth runs
 * `FLOOR_L..FLOOR_R` = 157..403, whose midpoint is 280. The columns straddle that midpoint
 * at 212..348, leaving 55 units of cloth to its left and 55 to its right - equal margins to
 * the two inner wicker walls, which is what makes the group look deliberately placed.
 *
 * THE COLUMN SPAN AND `FRUIT_SIZE` ARE A PAIR, like the row pitch. The span is 136, so the
 * column step is 136/3 = 45.33 and the gap between neighbouring sprites is 45.33 - 34 =
 * 11.33 units. Dropping `FRUIT_SIZE` without revisiting this table would silently close that
 * gap to nothing.
 *
 * KEPT APART FROM `picnicData.ts` so that the geometry constants stay readable as
 * constants while this table stays readable as a table of coordinates.
 */

/**
 * The row pitch, in stage units.
 *
 * THIS IS THE PAIR TO `FRUIT_SIZE`, AND THE TWO CANNOT MOVE INDEPENDENTLY. This value is
 * DERIVED FROM the table below - `picnicTierChecks.ts` measures the real gap between row 0
 * and row 1 and refuses at import time any tier whose fruit no longer clears it.
 *
 * THE BINDING CONSTRAINT IS JITTER, NOT TILT, AND IT COSTS DOUBLE. Jitter is applied to BOTH
 * rows independently, so a `jitter: 2` tier widens the required gap by 4 units - twice what
 * it looks like it should. Tilt widens the fruit's own reach (a rotated square reaches
 * further vertically than its side), and no tier currently asks for any. The floor is
 * therefore set by the largest `jitter` in the ladder:
 *
 *   unrotated fruit, jitter J  ->  needs FRUIT_SIZE + 2J  =  34 + 4  =  38 for tier 3
 *
 * AT 40 THERE ARE 2 UNITS OF SLACK BEYOND THAT. This is the value to revisit if a tier ever
 * gains tilt or a larger jitter - and it is bounded from below by `FLOOR_T`/`FLOOR_B` in
 * `picnicData.ts`, so it cannot simply be raised forever without shrinking the fruit.
 *
 * AN EARLIER REVISION SAT AT 31 AND CRASHED THE APP ON LOAD; ANOTHER SAT AT 36 AND STILL
 * CRASHED. The first was tighter than the fruit could fit at all, the second cleared an
 * unjittered fruit but not tier 3's jitter. Both times the failure was invisible to the
 * build: the assertion runs at MODULE EVALUATION, so `tsc` and `vite build` both passed
 * while the exception unwound out of the import graph and unmounted the React tree, which
 * presents as a blank white screen. Geometry changes here are runtime changes, and the
 * ladder must be re-checked against them by hand before shipping.
 */
export const SLOT_PITCH_Y = 34;

/**
 * The horizontal span of the 4 columns, in stage units, measured centre to centre.
 *
 * THE COLUMNS ARE A FIXED-WIDTH GROUP, NOT A PER-ROW FRACTION. Holding the span constant
 * while only `y` varies is what keeps the group reading as one aligned block of piles; see
 * the module comment. At 136 units across 4 columns the step is 45.33 units, and against a
 * 34-unit `FRUIT_SIZE` that leaves an 11.33-unit gap between neighbouring sprites - close
 * enough to read as a packed basket, wide enough that no two fruits touch.
 */
export const SLOT_SPAN_X = 118;

/** The centre of the column group, which is the cloth's midpoint, not the canvas's. */
export const SLOT_CENTRE_X = 244;

/**
 * The margin from the floor's bounds to the outermost slot CENTRES, per row.
 *
 * RETAINED FOR COMPATIBILITY, AND IT IS NO LONGER USED TO PLACE ANYTHING. The columns are
 * now a fixed-width group (see `SLOT_SPAN_X`), so row-to-row inset would fight that. It is
 * kept exported because `picnicData.ts` re-exports it, and a re-export of a name that no
 * longer exists is a hard module error - a blank screen, not a warning. The values below are
 * the margins the current table actually produces, so anything reading this gets the truth
 * rather than a stale number, and the name can be deleted in one place once nothing imports
 * it.
 */
export const ROW_INSET_X = [55, 55, 55, 55];

export interface SlotCoord {
  x: number;
  y: number;
}

/** How many slots each perspective row holds. */
export const SLOT_COLS = 4;

export const PICNIC_SLOTS_16: SlotCoord[] = [
  // Row 0 (back of the basket)
  { x: 185, y: 77 }, { x: 224.3, y: 77 }, { x: 263.7, y: 77 }, { x: 303, y: 77 },
  // Row 1
  { x: 185, y: 111 }, { x: 224.3, y: 111 }, { x: 263.7, y: 111 }, { x: 303, y: 111 },
  // Row 2
  { x: 185, y: 145 }, { x: 224.3, y: 145 }, { x: 263.7, y: 145 }, { x: 303, y: 145 },
  // Row 3 (front of the basket)
  { x: 185, y: 179 }, { x: 224.3, y: 179 }, { x: 263.7, y: 179 }, { x: 303, y: 179 },
];

/** The most fruit that can ever be on the floor at once. */
export const MAX_PICNIC_SLOTS = PICNIC_SLOTS_16.length;

/**
 * The first `count` slots, clamped to the floor's capacity.
 *
 * THE CLAMP IS THE CONTRACT. Nothing downstream should ever ask for more fruit than the
 * basket can hold, so a caller passing 20 gets 16 rather than an overrun - and the tier
 * guard in `picnicTierChecks.ts` refuses a tier whose capacity exceeds the floor, so the
 * clamp is a backstop rather than a routine path.
 */
export function getSlotCoords(count: number): SlotCoord[] {
  return PICNIC_SLOTS_16.slice(0, Math.min(count, MAX_PICNIC_SLOTS));
}

/** The row a slot belongs to, derived from its flat index. */
export function slotRow(index: number): number {
  return Math.floor(index / SLOT_COLS);
}

/** The column a slot belongs to, derived from its flat index. */
export function slotCol(index: number): number {
  return index % SLOT_COLS;
}
