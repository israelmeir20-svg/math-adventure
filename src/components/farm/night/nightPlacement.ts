/**
 * Where animals stand in the dark.
 *
 * NON-OVERLAP IS A PROPERTY OF THE GRID, NOT OF LUCK. The barn floor is divided
 * into a fixed lattice, and the spacing is wider than the largest sprite the
 * generator can draw, so two animals can never touch - no rejection loop, no
 * "usually it looks fine", no retry that might spin.
 *
 * The grid lives here rather than in the generator because it is pure geometry:
 * it has no idea what the question will be, only where a body may legally stand.
 */
import { MAX_ANIMAL_SIZE, MAX_SPOT_SCALE, PASTURE_X0, PASTURE_X1, PASTURE_Y0, PASTURE_Y1 } from './nightStageData';

/**
 * Five columns by two rows = 10 slots, one more than the largest crowd any tier
 * can produce (level 3 divides up to 18 eyes = 9 animals).
 *
 * The spacing is the point: a sprite can be drawn as large as
 * `MAX_ANIMAL_SIZE * MAX_SPOT_SCALE` (115 * 1.12 = 128.8), and both `COL_STEP`
 * and `ROW_STEP` are kept at or above that, so a full grid of horses still cannot
 * touch. Measuring this against the OLD fixed `ANIMAL_SIZE` (80) is what used to
 * let a grown horse overlap its neighbour.
 */
const COLS = 5;
const ROWS = 2;
const COL_STEP = (PASTURE_X1 - PASTURE_X0) / (COLS - 1);
const ROW_STEP = (PASTURE_Y1 - PASTURE_Y0) / (ROWS - 1);

/** The footprint a slot must reserve for the largest possible animal. */
export const MAX_FOOTPRINT = MAX_ANIMAL_SIZE * MAX_SPOT_SCALE;

/**
 * Fails loudly at import time if the grid is too tight for the artwork.
 *
 * This is a layout invariant, not a runtime condition: the numbers are all
 * constants, so if someone enlarges the horse or narrows the pasture, the honest
 * outcome is a build-time error explaining why, not a barn where animals quietly
 * stand inside each other.
 */
if (COL_STEP < MAX_FOOTPRINT || ROW_STEP < MAX_FOOTPRINT) {
  throw new Error(
    `Night barn grid too tight: footprint ${MAX_FOOTPRINT.toFixed(1)} needs ` +
      `colStep/rowStep >= it, got ${COL_STEP.toFixed(1)}/${ROW_STEP.toFixed(1)}`,
  );
}

interface Slot {
  x: number;
  y: number;
  row: number;
}

/** Every legal standing position, in a stable order. */
const SLOTS: Slot[] = Array.from({ length: COLS * ROWS }, (_, index) => {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    x: Math.round(PASTURE_X0 + col * COL_STEP),
    y: Math.round(PASTURE_Y0 + row * ROW_STEP),
    row,
  };
});

/** The most animals a single round may place. */
export const MAX_SPOTS = SLOTS.length;

/** In-place Fisher-Yates, used only to vary the order of already-chosen slots. */
function shuffleInPlace<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Chooses `count` distinct positions, alternating rows so a small crowd fills the
 * barn's width instead of huddling on the left.
 *
 * The result is shuffled at the end: the positions are already distinct, so the
 * shuffle varies which animal lands where without ever risking a collision.
 */
export function placeSpots(count: number, rng: () => number): Array<{ x: number; y: number }> {
  const top = SLOTS.filter((slot) => slot.row === 0);
  const bottom = SLOTS.filter((slot) => slot.row === 1);
  const picked: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < count; i += 1) {
    const slot = (i % 2 === 0 ? top : bottom)[Math.floor(i / 2) % COLS];
    if (slot) picked.push({ x: slot.x, y: slot.y });
  }

  return shuffleInPlace(picked, rng);
}

/** A comfortable spread of animal sizes, so a crowd does not look cloned. */
export function randomScale(rng: () => number): number {
  return 0.92 + rng() * (MAX_SPOT_SCALE - 0.92);
}
