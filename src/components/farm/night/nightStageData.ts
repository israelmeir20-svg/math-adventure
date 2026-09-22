/**
 * Geometry + timing constants for the "האסם בלילה" canvas.
 *
 * The pasture band and the animal footprint are declared together because they
 * are coupled: `MAX_SPOTS` animals must fit across `PASTURE_W` without touching.
 * Changing one without the other is how animals end up stacked on top of each
 * other, so the collision-free property is asserted in the generator rather than
 * eyeballed here.
 */

/** The SVG viewport the stage draws into. */
export const VIEW_W = 800;
export const VIEW_H = 360;

/** The barn interior, and the straw floor the animals stand on. */
export const WALL_COLOR = '#1a1528';
export const FLOOR_Y = 264;
export const FLOOR_COLOR = '#241d38';

/**
 * Where animals may be placed. Kept clear of the walls and the floor edge.
 *
 * THE BAND IS SET BY THE LARGEST ANIMAL. A horse is drawn at 115 and can scale to
 * `MAX_ANIMAL_SIZE * MAX_SPOT_SCALE` = 128.8, so the two rows must be at least
 * 128.8 apart and the top row's head must still land on the canvas. `PASTURE_Y0`
 * is therefore pushed down to 130 and `PASTURE_Y1` sits just above the floor,
 * which is the only band where a two-row crowd of horses fits without overlap and
 * without clipping the ceiling.
 */
export const PASTURE_X0 = 70;
export const PASTURE_X1 = 730;
export const PASTURE_Y0 = 131;
export const PASTURE_Y1 = 260;

/** The default sprite box, used for species without an explicit size. */
export const ANIMAL_SIZE = 85;
export const EYE_R = 4;

/**
 * PER-SPECIES DRAWN SIZE.
 *
 * One size for every animal makes the barn read as a sticker sheet: a horse and a
 * duck drawn at the same width are obviously the same sprite scaled, and a child
 * notices immediately that the big animals look wrong. These sizes follow real
 * relative bulk - a horse at 115, a cow at 90, the small animals at 85 - so the
 * crowd looks like a barn rather than a set of icons.
 *
 * THIS IS ALSO THE COLLISION BUDGET. `MAX_ANIMAL_SIZE` below is the largest of
 * these, and the pasture grid is spaced wider than that, so no two animals can
 * overlap no matter which species the generator deals.
 */
export const ANIMAL_SIZES: Record<string, number> = {
  horse: 115,
  sheep: 105,
  cow: 90,
  duck: 85,
  rabbit: 85,
  cat: 85,
  dog: 85,
  donkey: 85,
};

/** The largest drawn size, which sets the minimum spacing on the grid. */
export const MAX_ANIMAL_SIZE = 115;

/** The draw size for a species. */
export function animalSize(animal: string): number {
  return ANIMAL_SIZES[animal] ?? ANIMAL_SIZE;
}

/**
 * WHERE EACH SPECIES' EYES SIT ON ITS FACE, AS A PERCENTAGE OF THE SPRITE BOX.
 *
 * A single `(EYE_DX, EYE_Y)` pair cannot work here: these sprites are pictures of
 * eight different animals, and a duck's head is not where a donkey's head is.
 * Using one generic offset puts every pair of eyes somewhere on the body rather
 * than on the face.
 *
 * These values were calibrated by eye against the actual artwork: each species is
 * rendered large with a percentage grid over it, and the pair is placed until it
 * sits on the pupils. `npx vite build --config tools/vite.night-eye.config.ts`
 * regenerates that calibration sheet, so the numbers can be checked rather than
 * trusted.
 *
 * Percentages rather than pixels, so an animal drawn at any size gets its eyes in
 * the right place - the box is `animalSize(...) * scale` wide, and the offsets are
 * resolved against whatever that comes to.
 *
 * `left`/`right` are `[xPercent, yPercent]`, measured from the sprite box's
 * top-left corner.
 */
export const ANIMAL_EYE_OFFSETS: Record<string, { left: [number, number]; right: [number, number] }> = {
  dog: { left: [43, 28], right: [61, 28] },
  cat: { left: [22, 34], right: [37, 34] },
  rabbit: { left: [34, 43], right: [66, 43] },
  duck: { left: [32, 42], right: [68, 42] },
  cow: { left: [38, 35], right: [62, 35] },
  sheep: { left: [41, 48], right: [59, 48] },
  horse: { left: [46, 36], right: [56, 36] },
  donkey: { left: [82, 34], right: [87, 35] },
};

/** The eye offset for a species, falling back to the centre of the box. */
export function eyeOffsetsFor(animal: string) {
  return ANIMAL_EYE_OFFSETS[animal] ?? { left: [40, 35], right: [60, 35] };
}

/** The largest footprint any animal is drawn at, used for collision spacing. */
export const MAX_SPOT_SCALE = 1.12;

/**
 * The darkness. STRICTLY OPAQUE, with no transparency at all.
 *
 * Any value below 1.0 lets the animal bodies bleed through, and at 0.92 the barn
 * is not dark - it is a dim room with faintly visible animals. The whole point of
 * the station is that you can ONLY see what the torch touches, so the overlay has
 * to be a hard blackout and the eyes have to be drawn above it (see the stage's
 * layer order).
 */
export const DARK_COLOR = '#07050d';
export const DARK_OPACITY = 1;

/** The flashlight beam. */
export const BEAM_R = 85;
/** The radius the beam swells to on a correct answer, flooding the whole barn. */
export const BEAM_FLOOD_R = 900;
/** How long that swell takes. */
export const BEAM_FLOOD_MS = 550;
/** Where the beam rests before the child moves the pointer. */
export const BEAM_START = { x: 400, y: 200 };

/** How long the celebration is held before the next round is dealt. */
export const CORRECT_MS = 700;
/** How long a wrong answer is explained (with the count revealed) before moving on. */
export const WRONG_MS = 2200;
