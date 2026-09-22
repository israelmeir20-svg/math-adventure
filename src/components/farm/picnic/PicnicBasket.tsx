/**
 * Layer 2 of the picnic stage: the basket itself.
 *
 * THE PHOTOGRAPH IS THE BASKET AND THE CLOTH IN ONE PIECE. It carries the woven rim, the
 * checkered floor the child counts against, and the shadow in its own weave - so nothing
 * else may draw inside its bounds. An earlier version painted compartment rectangles over
 * this area and they fought the real fabric visibly.
 *
 * THE ONE THING DRAWN UNDER IT IS A GROUND SHADOW, and it is drawn BEFORE the image so it
 * sits behind rather than on top. The artwork is transparent around the base, so without a
 * shadow the basket looks like it is floating above the grass.
 *
 * `preserveAspectRatio="none"` STRETCHES THE IMAGE TO THE BOX. The artwork is 2816x1536
 * (aspect 1.833) and the box is 560x275 (aspect 2.036), so a "meet" fit would letterbox it
 * 28px in from each side and every hand-measured slot coordinate would miss the picture it
 * was measured against. A ~10% horizontal stretch is imperceptible on wicker, and it keeps
 * the fruit registered to the floor.
 */
import { BASKET_H, BASKET_W, BASKET_X, BASKET_Y, GROUND_Y } from './picnicData';
import { BASKET_SPRITE } from './picnicSprites';

export default function PicnicBasket() {
  const centreX = BASKET_X + BASKET_W / 2;
  const baseY = Math.min(BASKET_Y + BASKET_H - 10, GROUND_Y + 26);

  return (
    <g>
      {/* The shadow the basket casts, drawn first so it lies underneath. */}
      <ellipse cx={centreX} cy={baseY} rx={BASKET_W / 2.4} ry={16} fill="#33511f" opacity={0.32} />
      <image
        href={BASKET_SPRITE}
        x={BASKET_X}
        y={BASKET_Y}
        width={BASKET_W}
        height={BASKET_H}
        preserveAspectRatio="none"
        className="pointer-events-none select-none"
      />
    </g>
  );
}
