/**
 * The picnic stage: backdrop, basket, fruit, lid.
 *
 * FOUR LAYERS, AND THE ORDER IS THE WHOLE DESIGN:
 *
 *   1. backdrop    - the blanket photograph, which shows through the transparent PNGs
 *   2. basket      - the photograph, carrying the woven rim and the gingham floor
 *   3. fruit       - the sprites resting directly on that cloth
 *   4. lid         - last, so an opaque cover hides everything above
 *
 * NOTHING IS DRAWN BETWEEN THEM. There are no compartment rects, no grid lines and no
 * wooden frame: the artwork replaces all of it, and every line of SVG furniture that used
 * to sit here would now be paint on top of a photograph. The count badges are the one
 * exception, and they only appear during feedback when the lid is up and the child is
 * meant to be reading numbers.
 *
 * The lid coming last is load-bearing. If it were drawn before the badges, a "shut" basket
 * would still be leaking counts through the cover, and the game would stop being a memory
 * test at exactly the moment it matters.
 *
 * THE SKY GRADIENT'S `<defs>` ARE GONE, and that is deliberate rather than an oversight.
 * They existed only for the old vector meadow's sky band; the backdrop is a photograph now,
 * so a gradient nothing references would be dead markup. The `SKY_GRADIENT_ID` export
 * remains so nothing that imported it breaks.
 */
import PicnicMeadow from './PicnicMeadow';
import PicnicBasket from './PicnicBasket';
import FruitLayer from './FruitLayer';
import CountBadges from './CountBadges';
import PicnicLid from './PicnicLid';
import { VIEW_H, VIEW_W } from './picnicData';
import type { PicnicRound } from './picnicTypes';

interface PicnicGridStageProps {
  round: PicnicRound;
  /** True while the lid covers the basket. */
  shut: boolean;
  /** True during feedback, when the counts are shown over the fruit. */
  showCounts: boolean;
  /** Which fruit the player chose, so it can be marked right or wrong. */
  picked: string | null;
  /** True when the player's choice was correct. */
  correct: boolean;
}

export default function PicnicGridStage({
  round,
  shut,
  showCounts,
  picked,
  correct,
}: PicnicGridStageProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="touch-none select-none"
      role="img"
      aria-label="סל הפיקניק"
    >
      <PicnicMeadow />
      <PicnicBasket />
      <FruitLayer round={round} />
      {showCounts && <CountBadges round={round} picked={picked} correct={correct} />}
      <PicnicLid shut={shut} />
    </svg>
  );
}
