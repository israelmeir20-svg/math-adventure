/**
 * Art assets for "מאזניים בחווה" (Animal Scales).
 *
 * ===================================================================
 * THE SCALE IS THREE PAINTED PIECES, ASSEMBLED IN CSS.
 * ===================================================================
 *
 * The balance used to be drawn as SVG: a post from rectangles, a beam from one
 * rounded rect, and each pan from two lines and a dish. It worked, but it read as a
 * diagram of a scale rather than a scale - flat fills, no shading, no material.
 *
 * It is now a composite of three painted PNGs layered in the DOM:
 *
 *   base.png       the wooden pillar and its foot
 *   rod.png        the beam, which is the ONLY thing that rotates
 *   scale_pan.png  one hanging pan, used twice (mirrored for the second side)
 *
 * ===================================================================
 * WHY THE ASSEMBLY IS DONE WITH MEASURED PIVOTS RATHER THAN EYEBALLED OFFSETS.
 * ===================================================================
 *
 * The filenames give no clue where the pivot pin is, and the beam has to turn about
 * exactly that point or the whole illusion collapses: the pillar would visibly
 * detach from the beam at any tilt. So the numbers below were MEASURED from the
 * artwork's alpha channel rather than guessed - `base.png`'s opaque region runs from
 * y=12.6% to y=77.7% of its square canvas, and its horizontal centre is 50.07%.
 *
 * Every viewport-relative size in `ScaleStage` therefore derives from the two aspect
 * ratios stored here, so replacing the art cannot silently de-align the layers.
 *
 * NOTE ON FILE TYPES, WHICH MATTER HERE: `background.png` is, despite the extension,
 * a JPEG (2752x1536, so 16:9). Browsers sniff the content and render it correctly -
 * the extension is cosmetic - but the ASPECT RATIO below is the real number, and any
 * future re-export must keep the same one or the viewBox ratio has to move with it.
 *
 * ===================================================================
 * THE TRAY FLOOR, MEASURED OFF THE PAN'S ALPHA.
 * ===================================================================
 *
 * `PAN_TRAY_*` below place the animals. They are read from `scale_pan.png`'s opaque
 * box (x=17.5%..82.7%, y=8.9%..80.3% of its square canvas): the dish's inner floor is
 * near the BOTTOM of that box, because the pan is a deep basket with its ropes rising
 * from the top. `PAN_TRAY_TOP_FRAC` is therefore how far down the pan's own box the
 * floor sits, and `PAN_TRAY_WIDTH_FRAC` is how wide the usable floor is.
 *
 * Both are expressed against the pan's box rather than as absolute pixels so the tray
 * moves with the artwork if it is ever re-exported, and so the whole assembly scales
 * as one unit.
 */
import background from '../../../assets/farm/background.png';
import base from '../../../assets/farm/base.png';
import rod from '../../../assets/farm/rod.png';
import scalePan from '../../../assets/farm/scale_pan.png';

export const SCALE_ART = {
  background,
  base,
  rod,
  pan: scalePan,
} as const;

/** `base.png` is square, so its own aspect is 1. */
export const BASE_ASPECT = 1;
/** `rod.png` is 3584x1184. */
export const ROD_ASPECT = 3584 / 1184;
/** `scale_pan.png` is square. */
export const PAN_ASPECT = 1;
/** The painted backdrop is 2752x1536 - 16:9, and the viewBox matches it exactly. */
export const BACKGROUND_ASPECT = 2752 / 1536;

/**
 * Where the beam's pivot sits inside `base.png`, as a fraction of the image.
 *
 * READ OFF THE ALPHA BOX: the base's opaque span is y=12.60%..77.69% of the canvas.
 * The painted pivot pin is at the very top of that span, so the fraction is the top
 * edge plus a hair, to sit on the pin's centre rather than its tip.
 */
export const BASE_PIVOT_Y_FRAC = 0.132;

/**
 * Where a pan's hook sits inside `scale_pan.png`, as a fraction of the image.
 *
 * The pan occupies x=17.5%..82.7% and y=8.9%..80.3% of its canvas. The rope tie is
 * at the top of that box, so the hook is the top edge nudged down by a hair - the
 * `img` is then positioned with this as its `transform-origin`, which is what lets
 * the pan counter-rotate about its own rope instead of about its middle.
 */
export const PAN_HOOK_Y_FRAC = 0.098;
/** The hook sits on the artwork's horizontal centre (measured 50.05%). */
export const PAN_HOOK_X_FRAC = 0.5;

/**
 * The tray's inner floor, as a fraction of the PAN's own height.
 *
 * This is where an animal's FEET land. The pan's opaque box ends at 80.3% of the
 * canvas; the floor is a little above that, because the artwork's bottom edge is the
 * outer curve of the basket rather than its inner surface.
 *
 * ===================================================================
 * IT MUST BE APPLIED INSIDE A BOX THE SIZE OF THE PAN.
 * ===================================================================
 *
 * This is a fraction OF THE PAN, so whatever consumes it has to be positioned against
 * the pan's own box. A CSS `top` percentage resolves against the CONTAINING BLOCK, not
 * the element, and the pan's containing block is the BEAM - which is `BEAM_H_PCT` of the
 * scene against the pan's `PAN_H_PCT`, i.e. less than half its height.
 *
 * Applying this value directly inside the pan therefore under-shoots by that ratio and
 * parks the animals roughly 11% of the assembly too high - up among the ropes, above the
 * basket. Nothing errors; the sprites are simply drawn in the wrong place, which reads
 * from the outside as animals missing from the pans entirely.
 *
 * `ScaleStage`'s `PanInterior` div exists precisely to be that correctly-sized box, so
 * this and `PAN_TRAY_WIDTH_FRAC` below can be used as written.
 */
export const PAN_TRAY_TOP_FRAC = 0.56;

/**
 * How wide the usable tray is, as a fraction of the PAN's width.
 *
 * Narrower than the pan: the basket's rim curves in at the sides, so a cluster that
 * used the pan's full width would have its outermost animals hanging over the rim in
 * mid-air rather than sitting in the basket.
 */
export const PAN_TRAY_WIDTH_FRAC = 0.72;
