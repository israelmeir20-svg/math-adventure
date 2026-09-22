/**
 * Stage geometry and timing for "סל הפיקניק".
 *
 * Every number that positions something on the SVG canvas lives here, so the basket,
 * the lid and the fruit cannot drift apart. Kept free of React and of the puzzle logic,
 * so both the test scripts and the components read one source.
 *
 * ===================================================================
 * THE WHOLE SCENE IS ONE COORDINATE SPACE, AND THAT IS WHY THE
 * BASKET IS ENLARGED BY SHRINKING THE VIEWBOX.
 * ===================================================================
 *
 * The basket, lid, fruit, slots and floor are all expressed in the SAME units, and the
 * fruit's positions are hand-measured READINGS of the artwork. Growing `BASKET_W`/`BASKET_H`
 * in place would therefore stretch the photograph out from under a fixed slot table, and the
 * fruit would visibly slide off the cloth it rests on.
 *
 * Shrinking the viewBox has neither problem. The SVG scales its whole coordinate system to
 * fit the box it is given, so a smaller viewBox means every unit is drawn larger - the basket
 * occupies the same FRACTION of the scene, every slot stays exactly where it was measured,
 * and the fruit is still registered to the gingham. The only thing that changes is how big it
 * all appears.
 *
 * The scale is a uniform 0.8: 800x360 -> 640x288, the same aspect ratio, so nothing is ever
 * distorted by the resize itself. The basket goes from 70% x 76% of the viewport to the same
 * 70% x 76% of a viewport that renders ~25% larger on screen.
 */
export const VIEW_W = 488;
export const VIEW_H = 275;

/* --------------------------------------------------------------- the basket -- */

/**
 * The basket photo's box on the canvas.
 *
 * DRAWN WITH `preserveAspectRatio="none"`, DELIBERATELY. The artwork is 2816x1536
 * (aspect 1.833) and this box is 560x275 (aspect 2.036), so a letterboxing "meet" fit
 * would draw it at only 504x275 - 28px in from each side - while the slot coordinates
 * below are measured against the FULL box. The image is stretched by ~10% horizontally
 * instead, which is barely perceptible on woven wicker and keeps the fruit registered
 * against the floor the coordinates were measured from.
 */
export const BASKET_X = 73;
export const BASKET_Y = 16;
export const BASKET_W = 342;
export const BASKET_H = 211;

/**
 * The flat, usable floor INSIDE the basket photo.
 *
 * THESE ARE THE OUTERMOST SLOT CENTRES, NOT THE EXTENT OF THE FRUIT. The floor is where
 * a fruit may be CENTRED; a 46px fruit centred on the outermost slot still overhangs by
 * half its box (23px) plus the jitter, so its painted edge reaches roughly x 198..602 and
 * y 60..262. Measured against the artwork that still lands on the checkered cloth, because
 * the slots are inset from the rim - but the distinction matters, and an earlier version
 * of this file conflated the two and produced a check that failed perfectly good layouts.
 *
 * The bounds are recorded (rather than derived) because they are a reading of the artwork.
 * `tools/picnicFitProbe.ts` prints both extents so a re-measure is a deliberate act.
 */
export const FLOOR_L = 137;
export const FLOOR_R = 351;
export const FLOOR_T = 65;
export const FLOOR_B = 180;

/** The floor's width and height, in slot-centre terms. */
export const FLOOR_W = FLOOR_R - FLOOR_L;
export const FLOOR_H = FLOOR_B - FLOOR_T;

/* ------------------------------------------------------------ slot matrix -- */

/**
 * THE SLOT TABLE LIVES IN `picnicSlots.ts` and is re-exported here, so every existing
 * `from './picnicData'` import keeps working and there is still exactly one place that
 * knows where a fruit rests.
 */
export {
  PICNIC_SLOTS_16,
  MAX_PICNIC_SLOTS,
  SLOT_COLS,
  SLOT_PITCH_Y,
  ROW_INSET_X,
  getSlotCoords,
  slotRow,
  slotCol,
  type SlotCoord,
} from './picnicSlots';

/* ---------------------------------------------------------- fruit and tilt -- */

/**
 * The fruit sprite's box, in stage units.
 *
 * SIZED TO THE ROW PITCH, MINUS THE JITTER. The rows are 50px apart, and a fruit may be
 * nudged up to 2px each way, so the largest sprite that cannot touch its vertical neighbour
 * is 50 - 4 = 46px. That is exactly what this is: the biggest piece the floor will hold,
 * which is what makes it read as a photograph of fruit rather than a diagram.
 *
 * AN EARLIER REVISION USED 32px, BECAUSE THE ROWS WERE ONLY 36px APART. Widening the pitch
 * to 50px is what bought the extra size; the two numbers are a pair and changing one
 * without the other is what `picnicTierChecks.ts` refuses at import time.
 */
export const FRUIT_SIZE = 30;

/** Half the fruit box, for centring a sprite on its slot. */
export const FRUIT_HALF = FRUIT_SIZE / 2;

/**
 * The most a fruit may EVER be nudged, in stage units, and the most it may be rotated.
 *
 * BOTH ARE BOUNDED BY THE PITCH, NOT CHOSEN FOR LOOKS, and these are upper bounds rather
 * than the values in use. The rows are 50px apart and the fruit is 46px, so only 4px of
 * vertical clearance exists in total: a +-2px nudge spends all of it, and a +-3px nudge
 * would push two neighbouring piles into each other. The tiers therefore use 0 or 2, and
 * `picnicTierChecks.ts` refuses any tier that exceeds what the pitch allows.
 *
 * THE TILT CEILING IS DECORATIVE ONLY. At 10 degrees a square's diagonal reach grows by
 * 40%, needing 65px against a 50px pitch - so no tier on this floor can rotate its fruit at
 * all, and the max is recorded so that a future wider floor has a sane bound to reuse.
 */
export const FRUIT_JITTER = 2;
export const FRUIT_MAX_TILT = 10;
/* ---------------------------------------------------------------- timings -- */

/** How long the reveal stays up after a correct answer, in milliseconds. */
export const CORRECT_MS = 800;

/**
 * How long a wrong answer's reveal stays up.
 *
 * THE CLOCK NEVER STOPS IN THIS GAME, SO THIS DURATION IS PAID IN REAL TIME. That is what
 * sets it at 1200ms rather than the 2200ms a frozen clock could afford: long enough for the
 * child to see which pile really held the most (the lid lifts and the counts appear), short
 * enough that one mistake does not cost a twentieth of the run. A miss is meant to sting
 * slightly, not to end the game.
 */
export const WRONG_MS = 1200;

/** How long the lid takes to shut, in milliseconds. */
export const LID_MS = 260;

/**
 * Where the lid sits when open, and when shut, as a vertical offset.
 *
 * THE LID ALSO FADES, so the offset only has to clear the basket visually. It travels
 * further than the basket is tall so that even mid-transition it reads as "going away"
 * rather than sliding behind the cloth, and the opacity handles the rest.
 */
export const LID_OPEN_DY = -259;
export const LID_SHUT_DY = 0;

/** The grass line, below which the basket's shadow is cast. */
export const GROUND_Y = 191;
