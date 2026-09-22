/**
 * Shared geometry for a placed animal.
 *
 * WHY THIS IS ITS OWN MODULE. The sprite box a spot occupies is needed in three
 * places: the body layer draws into it, the eyes layer positions dots inside it,
 * and the verification suite recomputes it to check the anchoring. Deriving it
 * twice invites the two copies to drift apart, and a drift here is invisible
 * until a child notices that the eyes are not on the animal.
 *
 * One definition, imported by all three.
 */
import { animalSize, eyeOffsetsFor } from './nightStageData';
import type { NightSpot } from './nightTypes';

/**
 * The sprite box for a spot: its size, and its top-left in stage coords.
 *
 * THE SIZE IS PER-SPECIES. A horse is drawn at 115 and a duck at 85, so a single
 * shared size would either squash the horse or inflate the duck. Everything that
 * positions an animal - its body, its eyes, the collision check - goes through
 * here, so those three can never disagree about how big it is.
 *
 * The box is anchored so its BOTTOM is at `spot.y`, which is what puts the
 * animal's feet on the straw.
 */
export function bodyBox(spot: NightSpot) {
  const size = animalSize(spot.animal) * spot.scale;
  return { size, left: spot.x - size / 2, top: spot.y - size };
}

/** Where one eye sits, in stage coordinates, for a given spot. */
export function eyePosition(spot: NightSpot, side: 'left' | 'right') {
  const { size, left, top } = bodyBox(spot);
  const [xPct, yPct] = eyeOffsetsFor(spot.animal)[side];
  return { x: left + (xPct / 100) * size, y: top + (yPct / 100) * size };
}
