/**
 * Build-time validation of the difficulty ladder.
 *
 * Kept apart from `picnicTiers.ts` so that the table stays readable as a table. These
 * assertions are arithmetic, not taste, and they run when the ladder calls `assertTiers`
 * - so a bad tier is a build error rather than a run that silently deals fewer piles
 * than it promised.
 *
 * WHY THIS IS WORTH ITS OWN MODULE. Three separate failure modes are silent otherwise:
 *
 *   A tier can ask for more distinct counts than its spread can hold. Four species
 *   with a spread of 2 is not a hard round, it is an impossible one - there are only
 *   three integers available, so the fourth pile cannot exist.
 *
 *   A tier can ask for more pieces than the floor has slots. There are exactly sixteen,
 *   so a capacity over that is unconstructible.
 *
 *   A tier can ask for a tilt and a jitter that together exceed the row pitch. The rows
 *   sit 36px apart and the fruit is 32px, so this is the tight axis: a few degrees of
 *   rotation or a few pixels of nudge is all the clearance there is. Exceed it and two
 *   neighbouring piles visually merge, and the child counts the wrong pile - which fails
 *   the round in a way no amount of generator correctness can rescue.
 *
 * THE LADDER IS PASSED IN RATHER THAN IMPORTED. Importing it here would be a cycle -
 * this module is loaded from the tier file, so the constant would still be in its
 * temporal dead zone when these checks ran.
 */
import { FRUIT_SIZE, PICNIC_SLOTS_16, SLOT_COLS } from './picnicData';
import type { PicnicTier } from './picnicTiers';

/** The smallest number of pieces a tier's counts can add up to. */
function minPieces(tier: PicnicTier): number {
  const lowestTop = Math.min(tier.minCount + tier.spread, tier.maxCount);
  const bottom = Math.max(1, lowestTop - tier.spread);
  let total = lowestTop + bottom;
  for (let v = bottom + 1, taken = 0; taken < tier.species - 2; v += 1, taken += 1) {
    total += v;
  }
  return total;
}

/** Half-extent of a square s rotated by `deg`, along either axis. */
function halfReach(half: number, deg: number): number {
  const t = (deg * Math.PI) / 180;
  return half * (Math.abs(Math.cos(t)) + Math.abs(Math.sin(t)));
}

/** The tightest vertical gap between two adjacent rows of the floor. */
const ROW_PITCH = PICNIC_SLOTS_16[SLOT_COLS].y - PICNIC_SLOTS_16[0].y;

/** Throws if any tier in the ladder asks for something unconstructible. */
export function assertTiers(tiers: Record<number, PicnicTier>): void {
  for (const [level, tier] of Object.entries(tiers)) {
    if (tier.spread + 1 < tier.species) {
      throw new Error(
        `picnic tier ${level}: spread ${tier.spread} cannot hold ${tier.species} ` +
          `distinct counts (needs spread >= species - 1)`,
      );
    }

    if (tier.capacity > PICNIC_SLOTS_16.length) {
      throw new Error(
        `picnic tier ${level}: capacity ${tier.capacity} exceeds the ` +
          `${PICNIC_SLOTS_16.length} slots on the basket floor`,
      );
    }

    const need = minPieces(tier);
    if (need > tier.capacity) {
      throw new Error(
        `picnic tier ${level}: needs at least ${need} pieces but its capacity is ` +
          `${tier.capacity}`,
      );
    }

    // The vertical axis is the tight one, so the reach is measured against the row pitch.
    // A rotated square reaches further vertically, and the jitter adds on both sides.
    const vertical = halfReach(FRUIT_SIZE / 2, tier.tilt) * 2 + tier.jitter * 2;
    if (vertical > ROW_PITCH) {
      throw new Error(
        `picnic tier ${level}: a ${FRUIT_SIZE}px fruit at ${tier.tilt} degrees with ` +
          `${tier.jitter}px jitter needs ${vertical.toFixed(1)}px vertically but the ` +
          `rows are only ${ROW_PITCH}px apart - neighbouring piles would touch`,
      );
    }
  }
}
