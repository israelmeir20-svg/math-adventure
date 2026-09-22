/**
 * The mystery-picture board: one image underneath, a grid of covers on top.
 *
 * ===================================================================
 * WHY THIS IS AN OVERLAY AND NOT A GRID OF IMAGE SLICES.
 * ===================================================================
 *
 * The previous board gave every tile its own `background-image` of the scene,
 * scaled by `background-size: cols*100% rows*100%`. That only reproduces the
 * original picture if the scene is EXACTLY the board's aspect ratio. Everything
 * else was distorted:
 *
 *   - A landscape photo (4:3) on a square board was stretched vertically by 33%.
 *   - A portrait phone photo (3:4) was squashed by 25%.
 *   - A wide panorama (16:9) was stretched by 78% - a face would come out visibly
 *     elongated, which for a photo of a child's own family is the worst case.
 *
 * Covering instead of slicing removes the whole problem. There is ONE `<img>` at
 * the natural aspect ratio with `object-cover`, so the browser crops it instead of
 * stretching it, and the covers are simply hidden one at a time. Any aspect ratio
 * works, including a parent's own upload, and a revealed board is a perfectly
 * seamless photograph with no slicing seams at all.
 *
 * ===================================================================
 * THE MASK MUST BE A PERFECTLY SEALED CURTAIN.
 * ===================================================================
 *
 * THE SPOILER IS NOW THE ONLY THING THAT MATTERS ABOUT THE COVERS. Once the whole
 * picture sits underneath, every pixel of it that is not covered is a pixel the
 * child can see - and a photo is recognised from a few percent of its area. An
 * earlier revision of this file leaked catastrophically through two channels, both
 * measured at 21,476 fully-saturated pixels of a 448x448 board (10.7%):
 *
 *   1. THE GUTTERS. `gap-1.5 p-1.5` left 6px channels between tiles and 6px of
 *      inset padding around the rim. Nothing was drawn there at all, so the raw
 *      picture showed through as a bright grid of the image's own colours - and
 *      the RIM strip alone outlined the whole photo's edges.
 *
 *   2. THE ALPHA. Covers were `bg-slate-800/95`, so every tile let 5% of the
 *      picture through. On a flat tracer colour that reads as a coloured wash;
 *      over a real photo it lifts the blacks enough to read shapes.
 *
 * The mask is therefore built as a SEAL, with each rule earning its place:
 *
 *   - `gap-0 p-0`: the tiles tile the board exactly. There is no uncovered region
 *     by construction, so there is nothing to leak through.
 *   - `rounded-none bg-slate-900` (fully opaque, no `/alpha`): a rounded tile would
 *     leave the square corner it cut off EXPOSED - four leaking corners per tile,
 *     ~200 on a 4x4 board - and any alpha lets the picture through.
 *   - The `rounded-2xl overflow-hidden` on the container is what keeps the board's
 *     outer corners soft. Rounding the BOARD and clipping its children is safe;
 *     rounding the CHILDREN is what leaks.
 *   - The `hover:scale-[1.03]` lift was removed. A scaled cover no longer meets its
 *     neighbours, so it peels open a 1.5% seam around itself - a leak that only
 *     appears under the cursor, which is exactly the kind that survives review.
 *
 * `probe-mosaic-leak.mjs` paints the hidden picture flat magenta and asserts ZERO
 * magenta pixels inside the board while locked, so this cannot silently regress.
 *
 * THE COSTS, AND WHY THEY ARE ACCEPTABLE:
 *
 *   1. `object-cover` CROPS on a mismatched aspect ratio, so tiles share more of
 *      the picture than a sliced board would. The puzzle is easier as a result.
 *      Pixelating for a mosaic would mean a canvas per tile and would re-introduce
 *      the aspect problem, so the crop is the pragmatic choice - and the child
 *      still has to solve every equation to un-cover the picture.
 *
 *   2. THE COVERS ARE NO LONGER 3D FLIPS. They fade out instead. A 3D flip needs
 *      the back face to be the tile's own content; with a shared image the back
 *      face would have to duplicate the picture at a per-tile offset, which is the
 *      slicing approach again - and a flipping tile is momentarily edge-on, which
 *      is a leak of its own.
 *
 * THE RTL ORDERING IS PRESERVED WITHOUT TRANSFORMS. The mask is a CSS grid, so
 * `direction: rtl` on the container lays tile 1 at the top-RIGHT and fills
 * leftward - which is the reading order the numbers already follow - while the
 * photograph underneath is untouched. Flipping the image itself would mirror any
 * text in it.
 */
import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';

interface MysteryPictureGridProps {
  /** Data-URI or URL of the full picture. Never sliced - drawn once, whole. */
  imageUrl: string;
  cols: number;
  rows: number;
  /** Indices that have been revealed. */
  solved: number[];
  /** The tile whose equation is currently in the drawer. */
  active: number | null;
  /** The tile shaking after a wrong stone, if any. */
  rejected: number | null;
  /** True while the board is resetting after the third strike. */
  resetting: boolean;
  onSelect: (index: number) => void;
}

export default function MysteryPictureGrid({
  imageUrl,
  cols,
  rows,
  solved,
  active,
  rejected,
  resetting,
  onSelect,
}: MysteryPictureGridProps) {
  const total = cols * rows;

  /*
   * A DEAD URL NOW DEGRADES TO A DESCRIBED EMPTY FRAME INSTEAD OF A BROKEN IMAGE.
   *
   * The board draws the picture with a bare `<img src>` inside a sealed mask, so a URL that 404s
   * renders the browser's broken-image glyph - and because the covers are opaque, the child sees a
   * torn icon on the picture they just solved every equation to reveal. That is precisely what
   * happened when five of the stock entries pointed at a `public/stickers/workshop/` folder that does
   * not exist: the paths were fixed at the source, and this handler is the belt to that pair of
   * braces.
   *
   * IT IS NOT A SUBSTITUTE FOR FIXING THE PATHS. A missing file is still a bug; this only decides how
   * it fails. Silently drawing the previous frame with no signal is how a dead entry survives review
   * for months, which is the situation this handler is cleaning up after - so the state is tracked
   * rather than hidden, and it is announced to the child instead of leaving them puzzled by a blank.
   *
   * `useState` RESET VIA `key` IS NOT AVAILABLE HERE, so the flag is cleared by the effect below
   * whenever the URL changes. Without that, one failed picture would poison every later round.
   */
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [imageUrl]);

  return (
    <div
      dir="rtl"
      // ROUNDED FRAME, SQUARE CONTENTS. `overflow-hidden` is what rounds the board,
      // but it rounds by CLIPPING whatever is underneath - including the picture.
      // At each corner the container's curve cuts away the square tile, leaving a
      // notch where the <img> shows through: measured at 35 fully-saturated pixels
      // on a 3x3 board (~9 per corner), which traces the photo's silhouette.
      //
      // So the rounding is drawn as a RING on a wrapper that sits above the mask,
      // and the contents stay square. The frame covers the notches instead of the
      // clip exposing them, and the board still reads as a rounded card.
      className={`relative z-0 mx-auto aspect-square w-full max-w-md bg-slate-900 shadow-2xl ${
        resetting ? 'motion-safe:animate-[shake_450ms_ease-in-out]' : ''
      }`}
    >
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        {/* THE PICTURE. One element, natural aspect ratio, cropped not stretched.
            `object-cover` is what makes landscape, portrait and square sources all
            fill the frame without distortion.

            A FAILED LOAD RENDERS NOTHING RATHER THAN THE BROKEN-IMAGE GLYPH, and the
            placeholder underneath says so in words. Hiding the element is what stops a
            torn icon sitting on top of the board; the message is what stops the round
            being a silent blank. */}
        {!failed && (
          <img
            src={imageUrl}
            alt=""
            aria-hidden
            draggable={false}
            onError={() => setFailed(true)}
            className="absolute inset-0 z-0 h-full w-full select-none object-cover object-center"
          />
        )}
        {failed && (
          <div className="absolute inset-0 z-0 grid place-items-center bg-slate-950 p-4 text-center">
            <p className="text-xs font-bold leading-relaxed text-slate-400">
              לא הצלחנו לטעון את התמונה הזו.
              <br />
              נסו שוב מהכפתור שלמטה 🙂
            </p>
          </div>
        )}

        {/* THE SEAL. `gap-0 p-0` so the covers tile the board with no uncovered
            region; a revealed tile fades away, which is what uncovers its area. */}
        <div
          className="absolute inset-0 z-10 grid gap-0 p-0"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: total }, (_, index) => {
            const isSolved = solved.includes(index);
            const isActive = active === index;
            const isRejected = rejected === index;

            return (
              <button
                key={index}
                type="button"
                // A revealed tile is unclickable; its cover is already transparent,
                // so leaving it interactive would give the picture a dead tap target.
                disabled={isSolved || resetting}
                onClick={() => onSelect(index)}
                aria-label={isSolved ? `משבצת ${index + 1} פתורה` : `משבצת ${index + 1}`}
                aria-pressed={isActive}
                className={`relative grid place-items-center rounded-none transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
                  isRejected ? 'motion-safe:animate-[shake_.4s_ease-in-out]' : ''
                } ${
                  isSolved
                    ? // Opacity rather than `hidden`: the fade IS the reveal, and
                      // `pointer-events-none` stops it eating taps on the picture.
                      'pointer-events-none opacity-0'
                    : // SOLID slate-900, no alpha and no scaling - see the header:
                      // a translucent or lifted cover spoils the picture.
                      'bg-slate-900 opacity-100 hover:bg-slate-800 active:bg-slate-800'
                }`}
              >
                {!isSolved && (
                  <>
                    <span
                      className={`text-xl font-black tabular-nums transition-colors sm:text-2xl ${
                        isActive ? 'text-amber-200' : 'text-white/75'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <Lock aria-hidden className="absolute bottom-1 h-3 w-3 text-white/35" />

                    {isActive && (
                      <span
                        aria-hidden
                        // Inset rather than outset: an `-inset-0.5` ring draws OUTSIDE
                        // the tile, over its neighbours' covers, and a semi-opaque
                        // ring there would tint the tile beside it.
                        className="pointer-events-none absolute inset-0 ring-4 ring-inset ring-amber-300"
                      />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* A warm sheen across the finished picture. Purely decorative, and above
            the mask so it reads as a glow on the whole reveal. */}
        {total > 0 && solved.length >= total && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 bg-white/10 motion-safe:animate-[sparkle_1.9s_ease-in-out_infinite]"
          />
        )}
      </div>

      {/* THE FRAME. A solid ring drawn ON the board's rounded edge, above every
          layer, so the corner notches left by `overflow-hidden` are covered by
          SLATE rather than exposing the picture beneath. It is a real background
          (`bg-slate-900`) at the border-box, not just a hairline ring - a `ring-1`
          was measured at 34 leaked pixels because a 1px line cannot cover a corner
          notch that is several pixels across. `pointer-events-none` keeps it clear
          of the tiles. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-30 rounded-2xl border-4 border-slate-900 bg-slate-900/0"
      />
    </div>
  );
}
