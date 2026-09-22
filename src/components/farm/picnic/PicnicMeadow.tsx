/**
 * Layer 1 of the picnic stage: the blanket the basket sits on.
 *
 * A PHOTOGRAPH, NOT A DRAWING. This layer used to be three hand-coded bands - a sky
 * gradient, a hill path and a grass rect - which existed so the transparent basket PNG had
 * somewhere to sit rather than looking pasted onto a swatch. `blanket.png` now does that job
 * with real texture and shading, and every line of the old vector scenery would be paint on
 * top of a photograph.
 *
 * IT DRAWS NOTHING INSIDE THE BASKET. The gingham floor the child counts against is part of
 * the basket artwork, and anything drawn here would sit between the fruit and the texture
 * they are reading. The rectangle below deliberately covers the WHOLE canvas rather than
 * stopping at the grass line, because the blanket is a full backdrop and the basket is what
 * defines the horizon now.
 *
 * `preserveAspectRatio="xMidYMid slice"` IS THE SVG EQUIVALENT OF `object-cover`. The
 * artwork will not match the viewBox's aspect ratio exactly, so the choices are `meet`
 * (letterbox, leaving bare canvas at the edges) or `slice` (fill the box and crop the
 * overflow). A backdrop has to reach the edges, so it slices - and because the basket and
 * fruit are drawn AFTER this layer, any cropping happens behind them and cannot displace
 * anything the child is counting.
 *
 * THIS IS AN `<image>` INSIDE THE STAGE'S SVG, NOT A SIBLING `<img>`. The whole stage -
 * meadow, basket, fruit, lid - is one `viewBox="0 0 800 360"` SVG, so a positioned HTML
 * element could not participate in that coordinate space. It would sit outside the SVG's
 * stacking context entirely: either behind an opaque SVG background (invisible) or in front
 * of the fruit (hiding it). As the SVG's first child it is simply the bottom layer, which is
 * the same guarantee the old vector meadow had.
 */
import { VIEW_H, VIEW_W } from './picnicData';
import { BLANKET_SPRITE } from './picnicSprites';

/** The sky gradient the backdrop used to reference. Kept exported so nothing else breaks. */
export const SKY_GRADIENT_ID = 'picnic-sky';

export default function PicnicMeadow() {
  return (
    <image
      href={BLANKET_SPRITE}
      x={0}
      y={0}
      width={VIEW_W}
      height={VIEW_H}
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none select-none"
    />
  );
}
