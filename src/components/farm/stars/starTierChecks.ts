/**
 * Import-time validation for the star difficulty ladder.
 *
 * WHY THIS RUNS AT IMPORT RATHER THAN IN A TEST: the failures it catches are the ones that
 * would otherwise only surface as a subtly unfair round - two shapes overlapping so the child
 * cannot tell them apart, or a layout with no entry for the shape count the tier asks for.
 * Both render perfectly happily and produce an unanswerable puzzle. Failing loudly the moment
 * the module loads makes that impossible to ship.
 *
 * The checks take the tier table as an ARGUMENT rather than importing it. That is deliberate:
 * importing the table here while `starTiers.ts` imports this file would be a cycle, and the
 * table would be read before it was fully defined.
 */

import { ANCHORS, MAX_REACH, SHAPE_RADII, SHAPE_SIZES, VIEW_H, VIEW_W } from './starData';
import type { StarTier } from './starTiers';

/** The minimum distance two anchors may sit apart. */
const MIN_SEPARATION = 140;

/**
 * Throws if any tier asks for something that cannot be drawn fairly.
 *
 * Called by `starTiers.ts` at the bottom of the module, once the table is fully built.
 */
export function assertStarTiers(tiers: Record<number, StarTier>): void {
  for (const [level, tier] of Object.entries(tiers)) {
    const label = `star tier ${level}`;

    if (tier.shapes < 1) {
      throw new Error(`${label}: must draw at least one shape, got ${tier.shapes}`);
    }

    // The layout must exist, or the generator throws at round time instead of at startup.
    const anchors = ANCHORS[tier.shapes];
    if (!anchors) {
      throw new Error(`${label}: no anchor layout is defined for ${tier.shapes} shapes`);
    }
    if (anchors.length !== tier.shapes) {
      throw new Error(
        `${label}: asks for ${tier.shapes} shapes but the layout has ${anchors.length}`,
      );
    }

    // Every size the tier may draw must have a defined radius.
    for (const size of tier.sizes) {
      if (!SHAPE_SIZES.includes(size as (typeof SHAPE_SIZES)[number])) {
        throw new Error(`${label}: size ${size} is not a supported shape`);
      }
      if (SHAPE_RADII[size] === undefined) {
        throw new Error(`${label}: size ${size} has no radius defined`);
      }
    }

    /*
     * THE ROTATION CHANCE MUST BE A PROBABILITY, NOT A FLAG.
     *
     * It is rolled per shape and compared with `random()`, so a value outside 0..1 does not
     * fail loudly - it fails silently in one of two ways. Above 1 every shape always tilts,
     * and at or below 0 none ever does, both of which are legal-looking rounds that have
     * quietly lost the difficulty the level was tuned for. A level asking for "always" or
     * "never" should say so in the numbers, and 0 and 1 are still expressible here.
     */
    if (!(tier.rotateChance >= 0 && tier.rotateChance <= 1)) {
      throw new Error(
        `${label}: rotateChance must be between 0 and 1, got ${tier.rotateChance}`,
      );
    }

    /*
     * A LEVEL THAT SPINS MUST SAY HOW, AND HOW OFTEN.
     *
     * `spinChance` is rolled per shape and compared against `random()`, so like `rotateChance`
     * it has to be a real probability - a value above 1 silently means "always" and a value at
     * or below 0 silently means "never", both of which look legal at a glance while quietly
     * removing the level's motion. The duration range is checked for the same reason: a
     * zero-width or inverted range would produce either an instant spin or a NaN duration.
     */
    if (!(tier.spinChance >= 0 && tier.spinChance <= 1)) {
      throw new Error(`${label}: spinChance must be between 0 and 1, got ${tier.spinChance}`);
    }
    const [spinMin, spinMax] = tier.spinSecondsRange;
    if (!(spinMin > 0) || !(spinMax > 0) || spinMax < spinMin) {
      throw new Error(
        `${label}: spinSecondsRange must be a positive, ascending pair, got [${spinMin}, ${spinMax}]`,
      );
    }

    /*
     * A LEVEL MUST DRAW FROM SIZES THAT EXIST AND ARE DISTINCT.
     *
     * Level 3's unlike branch forces its shapes to have different vertex counts, which needs at
     * least as many distinct legal sizes as it has shapes. Checking that here means a future edit
     * that trims `SIMPLE_SIZES` or raises the shape count fails at import rather than throwing
     * mid-round, in front of the child.
     */
    if (new Set(tier.sizes).size !== tier.sizes.length) {
      throw new Error(`${label}: sizes contain duplicates`);
    }
    if (tier.mode === 'mixed') {
      const pool = tier.sizeBands?.[0] ?? [];
      if (pool.length < 3) {
        throw new Error(
          `${label}: the unlike branch needs at least 3 distinct sizes, has ${pool.length}`,
        );
      }
      for (const size of pool) {
        if (SHAPE_RADII[size] === undefined) {
          throw new Error(`${label}: unlike-branch size ${size} has no radius defined`);
        }
      }
    }

    /*
     * `maxSizeEarly` MUST ACTUALLY EXCLUDE SOMETHING.
     *
     * The field exists to hold a level's largest shapes back to the second half of the run. A cap
     * at or above the level's biggest size filters nothing, so the field would look like a
     * deliberate pacing rule while doing nothing at all - which is precisely the kind of silent
     * no-op that makes a difficulty setting untrustworthy. A cap below the SMALLEST size is
     * rejected for the opposite reason: it would empty the pool.
     */
    if (tier.maxSizeEarly !== undefined) {
      const biggest = Math.max(...tier.sizes);
      const smallest = Math.min(...tier.sizes);
      if (tier.maxSizeEarly >= biggest) {
        throw new Error(
          `${label}: maxSizeEarly ${tier.maxSizeEarly} excludes nothing from sizes ${tier.sizes.join(', ')}`,
        );
      }
      if (tier.maxSizeEarly < smallest) {
        throw new Error(
          `${label}: maxSizeEarly ${tier.maxSizeEarly} would exclude every size`,
        );
      }
    }

    // THE SEPARATION RULE. Two clusters closer than the sum of their reaches would have
    // touching outlines, and the child could not tell where one group ends - which is the
    // skill the game exists to test.
    for (let i = 0; i < anchors.length; i += 1) {
      for (let j = i + 1; j < anchors.length; j += 1) {
        const a = anchors[i]!;
        const b = anchors[j]!;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance < MIN_SEPARATION) {
          throw new Error(
            `${label}: shapes ${i} and ${j} sit ${distance.toFixed(1)}px apart, ` +
              `below the ${MIN_SEPARATION}px minimum`,
          );
        }
      }
    }

    // A ROTATING SHAPE SWEEPS A DISC OF THE SAME RADIUS, because turning a regular polygon
    // does not change its circumradius. So one bound covers both the still and the spinning
    // case, and there is no separate calculation to keep in step - which is exactly the kind
    // of second formula that drifts. The sparkle arms rotate with the shape, hence MAX_REACH
    // rather than the bare ring radius.
    for (const anchor of anchors) {
      if (anchor.x - MAX_REACH < 0 || anchor.y - MAX_REACH < 0) {
        throw new Error(`${label}: a shape at (${anchor.x}, ${anchor.y}) reaches off the top or left`);
      }
      if (anchor.x + MAX_REACH > VIEW_W || anchor.y + MAX_REACH > VIEW_H) {
        throw new Error(
          `${label}: a shape at (${anchor.x}, ${anchor.y}) reaches off the bottom or right`,
        );
      }
    }
  }
}
