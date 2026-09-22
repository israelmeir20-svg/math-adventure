/**
 * The difficulty ladder for "סל הפיקניק".
 *
 * Kept separate from the arithmetic in `picnicRules.ts` because this table is the
 * DESIGN - it says what each tier should feel like - while the rules module holds
 * the mechanics that make it true.
 *
 * THE PROGRESSION IS ABOUT SCANNING, NOT COUNTING. Level 1 is a sparse basket with two
 * wildly different piles, which a young child can read at a glance. Later tiers keep the
 * counts close AND fill more of the floor, so the piles interleave across the four
 * perspective rows and a child can no longer sweep a straight line and tally it - they
 * have to judge the piles as pictures. That is the subitizing skill the game trains.
 */
import type { PicnicQuestion } from './picnicTypes';
import { assertTiers } from './picnicTierChecks';

export interface PicnicTier {
  /** How many distinct fruit species appear. */
  species: number;
  /**
   * The grid the floor is read as, for the badge layer and the source checks.
   *
   * FOUR COLUMNS AND FOUR ROWS IS THE FLOOR'S REAL SHAPE, not a free parameter: the
   * slot matrix is hand-measured in perspective and there are exactly sixteen of them.
   * A tier picks how MANY of those sixteen to fill, not a different grid.
   */
  rows: number;
  cols: number;
  /** How many of the sixteen slots this tier may fill. */
  capacity: number;
  /** Inclusive range the biggest pile is drawn from. */
  minCount: number;
  maxCount: number;
  /**
   * The gap between the biggest and smallest pile.
   *
   * THIS IS THE DIFFICULTY DIAL, and it is separate from `species`. With the gap
   * at 5, level 1 deals something like 7 vs 2 - two piles so different that the
   * winner is obvious from the shape of the basket alone, which is exactly the
   * no-effort win the first tier is for. Tightening the gap later is what forces a
   * real comparison, because 5/3/2 cannot be ranked without looking.
   */
  spread: number;
  /** How long the basket stays open, in milliseconds. */
  inspectMs: number;
  /** Maximum random position offset, in stage pixels. Zero means a strict layout. */
  jitter: number;
  /** Maximum random rotation, in degrees. Zero means perfectly upright. */
  tilt: number;
  /**
   * Which questions this tier may ask.
   *
   * Level 1 only ever asks for the MOST: with two piles and a huge gap, "most" is
   * the easier comparison to frame, and introducing the flipped question in the
   * same breath would double the reading load on a first-timer.
   */
  questions: PicnicQuestion[];
}

/**
 * The ladder, indexed by level.
 *
 * TILT IS ZERO EVERYWHERE, AND THAT IS FORCED BY THE FLOOR. Rows sit 36px apart while
 * columns sit 95-119px apart, so the vertical clearance is the binding constraint. At
 * 12 degrees a square's diagonal reach grows by 41%, and even a 28px fruit then needs
 * 39px vertically - more than the 36px the rows allow. There is no fruit size that both
 * fits the row pitch and can be rotated, so this floor buys its anti-scanning property
 * with JITTER and with how many of the sixteen slots are filled, not with tilt.
 *
 * THE COUNTS ARE BOUNDED BY THE SIXTEEN SLOTS. Four species need four DISTINCT counts,
 * which spans at least a spread of 3, which in turn needs 18 pieces at minimum - more
 * than the floor can hold. So four species is not a hard tier on this basket, it is an
 * impossible one, and every tier uses two or three. Level 4 keeps its difficulty by
 * filling all sixteen slots and narrowing the gap instead. `picnicTierChecks.ts` refuses
 * a tier whose minimum packing exceeds its capacity, and `picnicCapacityProbe.ts` prints
 * the arithmetic that sets these numbers.
 */
export const PICNIC_TIERS: Record<number, PicnicTier> = {
  1: { species: 2, rows: 4, cols: 4, capacity: 10, minCount: 2, maxCount: 8, spread: 5, inspectMs: 2000, jitter: 0, tilt: 0, questions: ['most'] },
  2: { species: 3, rows: 4, cols: 4, capacity: 12, minCount: 2, maxCount: 8, spread: 3, inspectMs: 2200, jitter: 0, tilt: 0, questions: ['most', 'least'] },
  3: { species: 3, rows: 4, cols: 4, capacity: 14, minCount: 3, maxCount: 8, spread: 4, inspectMs: 2200, jitter: 2, tilt: 0, questions: ['most', 'least'] },
  4: { species: 3, rows: 4, cols: 4, capacity: 16, minCount: 3, maxCount: 10, spread: 2, inspectMs: 2500, jitter: 2, tilt: 0, questions: ['most', 'least'] },
};

/** The highest defined tier; later rounds stay here rather than overflowing. */
export const MAX_PICNIC_LEVEL = 4;

// Validated once the table is fully initialized, so a bad tier is a build error rather
// than a run that silently deals fewer piles than it promised. Called here rather than
// in `picnicTierChecks.ts` because that module cannot import `PICNIC_TIERS` without a
// cycle - the constant would still be in its temporal dead zone.
assertTiers(PICNIC_TIERS);

/**
 * Which tier a round belongs to.
 *
 * Two rounds per tier up to level 3, then level 4 forever: a run is 60 seconds, so
 * a child who reaches the top tier should stay there and be measured on it rather
 * than run out of difficulty.
 */
export function picnicTierForRound(round: number): number {
  if (round <= 2) return 1;
  if (round <= 4) return 2;
  if (round <= 6) return 3;
  return 4;
}

/** The tier config for a round, clamped to the defined ladder. */
export function picnicTier(round: number): PicnicTier {
  const level = Math.min(picnicTierForRound(round), MAX_PICNIC_LEVEL);
  return PICNIC_TIERS[level] ?? PICNIC_TIERS[1]!;
}
