/**
 * Layer 4 of the picnic stage: the lid that covers the basket.
 *
 * WHY THE LID IS A TRANSLATED, FADING LAYER rather than a scale or a colour change: the
 * child's job is to remember what was underneath it. If the lid only half-hid the fruit
 * the game would become a stare-at-it puzzle instead of a memory one, so it both travels
 * clear of the basket and fades fully out.
 *
 * IT IS A SEPARATE TRANSPARENT PNG FROM THE BASKET, aligned to the SAME box. That is what
 * lets the two line up exactly when shut - both are stretched identically with
 * `preserveAspectRatio="none"`, so a mismatched aspect ratio cannot reveal a sliver of
 * basket around the lid's edges.
 *
 * THE TRANSITION IS ASYMMETRIC ON PURPOSE. On the way down the lid leads with the
 * transform and fades in over 150ms, so it is already opaque by the time it lands and the
 * fruit never shows through the closing crack. On the way up it just slides, because
 * revealing the fruit early is harmless and a fast retract keeps the reveal snappy.
 */
import { BASKET_H, BASKET_W, BASKET_X, BASKET_Y, LID_MS, LID_OPEN_DY, LID_SHUT_DY } from './picnicData';
import { BASKET_LID_SPRITE } from './picnicSprites';

interface PicnicLidProps {
  /** True while the lid is covering the basket. */
  shut: boolean;
}

export default function PicnicLid({ shut }: PicnicLidProps) {
  // Shutting leads with the transform so the lid is opaque before it lands; opening
  // simply slides out, since showing the fruit early costs nothing.
  const transition = shut
    ? `transform ${LID_MS}ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease-in`
    : `transform ${LID_MS}ms ease-out, opacity 150ms ease-out`;

  return (
    <g
      style={{
        transform: `translateY(${shut ? LID_SHUT_DY : LID_OPEN_DY}px)`,
        opacity: shut ? 1 : 0,
        transition,
        // The lid is scenery: it must never intercept a tap meant for the choice cards,
        // in either state. An element that is fading out still hit-tests until it is
        // fully transparent, which would swallow the first tap after the reveal.
        pointerEvents: 'none',
      }}
    >
      <image
        href={BASKET_LID_SPRITE}
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
