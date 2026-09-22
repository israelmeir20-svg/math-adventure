/**
 * Geometry + timing constants for the "שעת האכלה" canvas.
 *
 * Every coordinate in `FeedingStage` derives from here, so the animals, the bowls
 * they eat from and the signboard above them can never drift apart.
 *
 * ===================================================================
 * THE VIEWBOX MATCHES THE BACKGROUND ARTWORK EXACTLY.
 * ===================================================================
 *
 * The scene is now drawn over a painted background (`cute/background.png`) rather
 * than a flat SVG sky. That image is 2752x1536 - an aspect ratio of 1.792, i.e.
 * 16:9 - and the previous viewBox was 800x416 (1.923), which is very slightly
 * wider. Under `background-size: cover` a mismatched box crops the artwork, so the
 * viewBox is set to the SAME 1.792 ratio and the illustration lands whole, edge to
 * edge, with no letterboxing and no cropping.
 *
 * Changing this ratio moves every element below it, because the constants here are
 * absolute stage units - so if the artwork is ever re-exported at a new size, this
 * block and the ground line are what have to be revisited together.
 *
 * THE ONE RULE THAT MATTERS: A BOWL'S RIM IS BELOW AN ANIMAL'S FEET.
 *
 * `BOWL_Y` is the ellipse a bowl is drawn around, and it is deliberately lower
 * than the bottom of every animal sprite. The bowl is drawn AFTER the animal, so
 * its rim covers the animal's feet and the animal reads as standing behind the
 * bowl rather than balancing on top of it. Get this order or this offset wrong
 * and the animals become acrobats again.
 */

/** The SVG viewport the stage draws into. */
export const VIEW_W = 800;
/**
 * Canvas height.
 *
 * 446 rather than 416: this is exactly 800 / 1.792, so the viewBox matches the
 * background artwork's own proportions. The extra 30px over the old value all
 * lands in the upper scene, giving the hanging sign more headroom without moving
 * the ground line or the bowls.
 */
export const VIEW_H = 446;

/**
 * Where the artwork's lawn begins, in stage units.
 *
 * This is the horizon the animals stand on. It is placed by eye against the
 * background illustration rather than derived, because the lawn's edge is a
 * property of the painting: the bowls are planted just below it, and the animals'
 * feet are hidden behind the bowls, so the exact value only has to read as
 * "standing on the grass".
 */
export const MEADOW_Y = 300;

/**
 * A feeding bowl's rim. Lower than every animal's feet, on purpose.
 *
 * It also sits BELOW the meadow line (300), so the bowl is planted on the grass
 * rather than hovering just above the horizon. It moved down with `MEADOW_Y` when
 * the background artwork replaced the flat SVG ground.
 */
export const BOWL_Y = 312;
/** Half-width of a bowl's mouth, and the depth of its inner cavity. */
export const BOWL_RX = 46;
export const BOWL_RY = 13;

/** The signboard at the top of the scene. */
export const SIGN_CX = 400;
export const SIGN_CY = 62;
/** The signboard's lower edge, in stage units. The sprite ceiling is measured from here. */
export const SIGN_BOTTOM = SIGN_CY + 34;

/**
 * The sprite ceiling: the highest a sprite's ARTWORK may reach.
 *
 * The artwork's top is what a child sees, so this is the number that must clear
 * the signboard - not the sprite's box. Air is left deliberately rather than
 * butting the sign, so a tall animal never appears to touch it.
 */
export const SPRITE_CEILING = SIGN_BOTTOM + 16;

/**
 * Per-count animal sizing and spacing.
 *
 * Fewer animals get drawn bigger, so N=2 fills the same visual weight as N=4.
 * `sprite` is the sprite box WIDTH; the centres are hand-placed because an even
 * split reads as a row of clones rather than a farmyard.
 *
 * ============================================================
 * WHY THE BOX WIDTH IS PER-COUNT BUT THE BOX HEIGHT IS NOT FIXED.
 * ============================================================
 *
 * This table used to describe a SQUARE box, and a square box is the bug behind
 * the "animals float above their bowls" defect. Seven of the eight sprites are
 * 16:9 landscape canvases with the animal drawn in the middle. Dropped into a
 * square box with `preserveAspectRatio="meet"`, the WIDTH becomes the limiting
 * dimension: the artwork is scaled to the box width and comes up roughly half the
 * box height SHORT, leaving a wide empty band. Measured on the real assets, an
 * N=2 box of 187px showed only 104px of artwork - 83px of nothing.
 *
 * The bowl is anchored to the box's bottom edge, which the artwork only barely
 * reaches, so the animal painted small and high while the bowl sat below it. That
 * gap is the floating.
 *
 * So the box is now sized by the SLIDE's own aspect ratio: the width stays pinned
 * (it is what the spacing maths below is built on) and the HEIGHT is derived per
 * species, which makes `meet` exact and leaves no empty band. `Trough` does that
 * derivation; this table only fixes the width.
 *
 * HORIZONTALLY, a sprite is centred on its slot, so neighbouring centres must be
 * at least the widest sprite's width apart. The centres below are spaced with
 * slack in every count, so enlarged animals never intrude on a neighbour.
 */
export interface SlotSpec {
  sprite: number;
  centres: number[];
}

export const SLOT_SPECS: Record<number, SlotSpec> = {
  2: { sprite: 190, centres: [250, 550] },
  3: { sprite: 165, centres: [160, 400, 640] },
  4: { sprite: 148, centres: [110, 305, 495, 690] },
  5: { sprite: 136, centres: [90, 245, 400, 555, 710] },
};

/**
 * How far a sprite's ARTWORK bottom sits BELOW the bowl rim.
 *
 * THE TUCK IS WHAT MAKES THE ANIMAL STAND BEHIND THE BOWL. The bowl's body and
 * cavity are drawn after the sprite, so everything below the rim is covered: the
 * feet, the ankles, and the bottom of the belly. Raise this number to sink the
 * animals further behind their bowls; lower it to show more leg.
 *
 * It was 12, which left only a sliver of the sprite behind the bowl and was a
 * large part of why the animals read as standing on top of the trough rather than
 * behind it.
 */
export const SPRITE_TUCK = 30;

/**
 * The size of a sprite's box, derived from the artwork's own proportions.
 *
 * `width` is the slot's budget from `SLOT_SPECS`. A 16:9 slide is only about half
 * as tall as it is wide, so the height follows the slide and `meet` fills the box
 * with no empty band. A PORTRAIT slide (the donkey is 2:3) would otherwise become
 * enormously tall and drive its head through the signboard, so a portrait slide
 * is fitted the other way round - its HEIGHT is capped and its width is derived -
 * which keeps it in scale with the landscape animals beside it.
 *
 * `ceiling` is the highest the artwork may reach; anything taller is scaled back
 * so the tallest animal in the row still clears the signboard.
 */
export function spriteBox(width: number, aspect: number, ceiling: number): { w: number; h: number } {
  if (!Number.isFinite(aspect) || aspect <= 0) return { w: width, h: width };
  const height = width / aspect;
  // A portrait slide can only be as tall as the ceiling allows, from the rim up.
  const maxHeight = Math.max(1, BOWL_Y - ceiling);
  if (height > maxHeight) {
    const h = maxHeight;
    return { w: h * aspect, h };
  }
  return { w: width, h: height };
}

/**
 * The highest a shortfall complaint bubble may sit, in stage units.
 *
 * The bubble is 38px tall and is positioned by its centre, so its top edge is
 * `bubbleY - 19`; clamping the centre keeps that top clear of the signboard.
 *
 * The clamp exists because the bubble used to sit a fixed distance above the
 * bowl, which pushed it into the signboard once the sprites grew.
 */
export const BUBBLE_MIN_Y = SIGN_BOTTOM + 26;

/** Fallback for an unexpected count, so nothing off-board is ever drawn. */
export function slotSpec(count: number): SlotSpec {
  const fixed = SLOT_SPECS[count];
  if (fixed) return fixed;
  const step = VIEW_W / (count + 1);
  // Size against the tightest realistic spacing, so an unusual count shrinks
  // rather than overlapping.
  return {
    sprite: Math.min(148, Math.round(step * 0.82)),
    centres: Array.from({ length: count }, (_, i) => Math.round(step * (i + 1))),
  };
}

/** Even centres only, for callers that do not need the sprite size. */
export function slotCentres(count: number): number[] {
  return slotSpec(count).centres;
}

/**
 * How long each outcome is held on screen before the next puzzle is dealt.
 *
 * THE THREE ARE NOT THE SAME, and that is deliberate. A correct answer is
 * already understood, so a short 800ms beat keeps the run brisk. A wrong answer
 * has to be READ - the child must see which bowl came up short, or how much is
 * still in the basket - so the explanation gets the larger window. "Too much"
 * takes longest because it has a per-animal story to tell.
 *
 * In every case the 60-second clock is paused, so this is thinking time the
 * child is given, not time they are charged.
 */
export const FEEDBACK_MS: Record<'correct' | 'too_little' | 'too_much', number> = {
  correct: 800,
  too_little: 2200,
  too_much: 2400,
};

/** Duration of the food dropping into the bowls, in ms. */
export const FOOD_DROP_MS = 420;
