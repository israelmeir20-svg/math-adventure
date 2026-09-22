/**
 * Placing fruit on the basket's floor.
 *
 * TWO JOBS, AND BOTH ARE ABOUT NON-COLLISION:
 *
 *   `slotCentre` returns where each piece rests. It reads the hand-measured perspective
 *   matrix rather than computing a grid, because the floor is not a rectangle - it
 *   widens toward the front of the basket.
 *
 *   `assignCells` decides which fruit goes in which slot. It builds a bag of every slot
 *   index and draws from it WITHOUT REPLACEMENT, which makes a collision structurally
 *   impossible - as opposed to picking random indices and retrying, which can spin, or
 *   worse, quietly duplicate and make the displayed counts a lie.
 *
 * A SHORT BAG IS AN ERROR, NOT SOMETHING TO SKIP. An earlier version simply stopped
 * placing when the bag ran out, producing a basket that held fewer pieces than the
 * counts claimed - and a child who counted correctly would be marked wrong. If the
 * counts do not fit, that is a generator bug and it should say so loudly.
 */
import { MAX_PICNIC_SLOTS, getSlotCoords, slotRow, type SlotCoord } from './picnicData';
import { shufflePicnic } from './picnicRules';
import type { PicnicFruit } from './picnicTypes';

/**
 * The resting place of slot `index`.
 *
 * DELEGATES TO THE SHARED MATRIX rather than recomputing a position. The stage renders
 * fruit at these same coordinates, so the generator and the stage must agree to the
 * pixel - the non-collision guarantee is a statement about these numbers, and two
 * independent copies would be two chances to drift apart.
 */
export function slotCentre(index: number): SlotCoord {
  const slot = getSlotCoords(index + 1)[index];
  if (!slot) {
    throw new Error(`picnic slot ${index} does not exist (floor holds ${MAX_PICNIC_SLOTS})`);
  }
  return slot;
}

/** The row a slot belongs to, for the badge layer and the orthogonal-tier checks. */
export function slotRowOf(index: number): number {
  return slotRow(index);
}

/**
 * Assigns each species its own set of slots.
 *
 * @returns the slots per fruit, and a lookup from slot index to the fruit on it.
 */
export function assignCells(
  fruits: PicnicFruit[],
  counts: number[],
  cellCount: number,
  rng: () => number,
): { byFruit: Map<PicnicFruit, number[]>; cellFruit: Map<number, PicnicFruit> } {
  const needed = counts.reduce((a, b) => a + b, 0);
  if (needed > cellCount) {
    throw new Error(`picnic basket too small: ${needed} pieces for ${cellCount} slots`);
  }

  const bag = shufflePicnic(
    Array.from({ length: cellCount }, (_, i) => i),
    rng,
  );
  const byFruit = new Map<PicnicFruit, number[]>();
  const cellFruit = new Map<number, PicnicFruit>();
  let cursor = 0;

  fruits.forEach((fruit, i) => {
    const count = counts[i] as number;
    const taken: number[] = [];
    for (let n = 0; n < count; n += 1) {
      const cell = bag[cursor] as number;
      cursor += 1;
      taken.push(cell);
      cellFruit.set(cell, fruit);
    }
    byFruit.set(fruit, taken);
  });

  return { byFruit, cellFruit };
}
