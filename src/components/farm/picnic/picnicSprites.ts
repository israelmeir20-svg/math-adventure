/**
 * Sprite urls for "סל הפיקניק".
 *
 * SEPARATE FROM `picnicFruits.ts` ON PURPOSE, mirroring `nightSprites.ts`. This is the
 * only module in the station that imports a `.png`, and only the rendering layer imports
 * IT. That keeps asset resolution out of the puzzle generator, so the arithmetic can
 * still be tested in plain Node - no bundler, no loader hooks, no stubbed image modules.
 *
 * FILENAMES ARE CASE-SENSITIVE AND ONE HAS A SPACE. `Grapes.png` is capitalised while
 * every other fruit is lower-case, and the lid is `Basket lid.png`. A mismatch here is
 * invisible on a case-insensitive filesystem (macOS, Windows dev boxes) and then fails
 * the build on a case-sensitive one, so these are imported rather than built from a
 * template string - an import that cannot resolve is a build error, not a broken image
 * at runtime.
 *
 * THE BASKET AND LID ARE TRANSPARENT PNGs, which is what lets them sit on the drawn
 * meadow without a rectangle of baked-in background around them. They are also drawn
 * with `preserveAspectRatio="none"`: the artwork is 2816x1536 (aspect 1.833) while the
 * stage box is 560x275 (aspect 2.036), so a "meet" fit would letterbox it 28px in from
 * each side and every hand-measured slot would miss the picture it was measured against.
 */
import basket from '../../../assets/fruit/basket.png';
import basketLid from '../../../assets/fruit/Basket lid.png';
import blanket from '../../../assets/fruit/blanket.png';
import apple from '../../../assets/fruit/apple.png';
import banana from '../../../assets/fruit/banana.png';
import grapes from '../../../assets/fruit/Grapes.png';
import pear from '../../../assets/fruit/pear.png';
import strawberry from '../../../assets/fruit/strawberry.png';
import type { PicnicFruit } from './picnicTypes';

/** Fruit sprite url for each species. */
export const PICNIC_SPRITES: Record<PicnicFruit, string> = {
  strawberry,
  apple,
  banana,
  pear,
  grapes,
};

/** The woven basket the fruit sits in, and the lid that covers it. */
export const BASKET_SPRITE = basket;
export const BASKET_LID_SPRITE = basketLid;

/**
 * The picnic blanket used as the stage backdrop.
 *
 * Exported through this module rather than imported directly by the stage, for the same
 * reason as everything else here: this is the only file in the station that resolves a
 * `.png`, so asset paths stay in one place and the puzzle generator keeps working in plain
 * Node without image loader hooks.
 */
export const BLANKET_SPRITE = blanket;

/**
 * Sprite url for a species, safe against an unknown key.
 *
 * Returns `undefined` rather than throwing: `picnicFruitInfo` is called in a few
 * places where a missing species should degrade to a labelled card, not kill the
 * round. The caller checks for `undefined` and falls back to the emoji.
 */
export function picnicSpriteUrl(fruit: string): string | undefined {
  return PICNIC_SPRITES[fruit as PicnicFruit];
}
