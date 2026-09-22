/**
 * The shared stage that every puzzle in the Detective Math feature draws on.
 *
 * ================================================================================================
 * WHY THIS EXISTS RATHER THAN EACH PUZZLE POSITIONING ITS OWN BACKGROUND
 * ================================================================================================
 *
 * Every puzzle in this feature does the identical thing: put a photograph in a box of the
 * photograph's own aspect ratio, then layer an SVG over it in normalised coordinates. A copy of
 * that per puzzle would be a copy per chance to get the aspect ratio wrong, and an aspect ratio
 * that is wrong by a little puts the overlay off the feature it is meant to cover.
 *
 * So the box is built once, here, and each puzzle supplies only the drawing.
 *
 * THIS USED TO LIVE IN `components/station1/Station1Stage.tsx`. Station 3 needed exactly the same
 * box, and importing a *station 1* component into the chase would have made one station's
 * internals part of another's contract - a rename over there breaking the chase here. It was
 * promoted to this shared location instead, and Station 1's file now just re-exports it so its
 * four puzzles did not have to change.
 *
 * ================================================================================================
 * THE SVG STRETCHES, AND THAT IS THE POINT
 * ================================================================================================
 *
 * The overlay uses `viewBox="0 0 1 1"` with `preserveAspectRatio="none"`, so that (0,0) is the
 * top-left of the photograph and (1,1) is the bottom-right no matter what size it is displayed
 * at. The DEFAULT `meet` WOULD BE A BUG: it would letterbox the viewBox inside the box, so a
 * shape declared at x=0.5 would not land at the image's horizontal centre and every hit target
 * would sit slightly away from the thing it is meant to be.
 *
 * The cost of `none` is that stroke widths are stretched non-uniformly, which is why strokes are
 * specified with `vectorEffect="non-scaling-stroke"` and widths in CSS pixels rather than in
 * viewBox units.
 *
 * ================================================================================================
 * THE RENDER PROP RECEIVES THE IMAGE'S ASPECT RATIO
 * ================================================================================================
 *
 * A puzzle that draws a circle - the crest's medallion, the chase's runners - needs to know how
 * wide the box is relative to its height, because a circle in a stretched 1x1 viewBox comes out as
 * an ellipse. The render prop hands that ratio over so callers can correct for it without
 * measuring anything themselves.
 *
 * THE CORRECTION GOES IN OPPOSITE DIRECTIONS DEPENDING ON WHAT IS BEING DONE, which is the one
 * thing to get right here. A shape being PLACED in the stretched space (a dot, a badge) needs its
 * vertical radius divided by the aspect. A shape being DRAWN in its own square space and then
 * mapped in needs its vertical scale MULTIPLIED by the aspect. Both are present across the
 * stations, and each site says which it is and why.
 *
 * ================================================================================================
 * THE BOX FITS ITS CONTAINER WITHOUT MEASURING ANYTHING IN JAVASCRIPT
 * ================================================================================================
 *
 * The obvious implementation is `w-full` with an `aspect-ratio`, and it is what this used to do. It
 * is wrong for a full-screen game, and so is the obvious repair:
 *
 *   - `w-full` alone makes the box as wide as the window and lets the height fall where it may, so
 *     a short window pushes the bottom of the photograph off the screen;
 *   - ADDING `max-h-full` DOES NOT FIX IT. A declared width beats `aspect-ratio`, so the box keeps
 *     the container's width while only the height is capped - a 1.792 photograph laid out at 3.18
 *     on a 1600x620 window, visibly stretched;
 *   - SWAPPING to `h-full max-w-full` only moves the problem: the declared height now wins and a
 *     tall window squashes the art instead (0.69 on a 560x900 window).
 *
 * So neither axis may be declared as a bare percentage. Instead the WIDTH is computed as the
 * smaller of the two valid answers - `min(100%, <container height> * aspect)` - using the container
 * query unit `100cqh`, after which `aspect-ratio` derives a height that cannot overflow. See the
 * comment on the wrapper for the full reasoning.
 *
 * `min-h-0` ON THE PARENTS IS LOAD-BEARING. A flex child defaults to `min-height: auto`, which
 * refuses to shrink below its content, so without it the box would push the bar off the top of the
 * screen instead of being constrained to the space beneath it.
 */
import type { ReactNode } from 'react';
import { backgroundFor } from '../mysteryAssets';

interface PuzzleStageProps {
  /** Background art filename, as stored on the case. */
  bgAsset: string;
  /** Alt text for the background. Empty string for decorative scenery. */
  bgAlt?: string;
  /**
   * The photograph's aspect ratio, as width / height.
   *
   * PASSED IN RATHER THAN DERIVED, because deriving it needs the image to have loaded and the
   * first paint would flash a wrongly-shaped box. These are fixed shipped assets, so the ratio
   * is a constant of each puzzle and there is nothing to discover at runtime.
   */
  aspect: number;
  /**
   * Draws the overlay. `aspect` is the same ratio the box uses, so a circle can be drawn with
   * `rx = ry / aspect` in normalised units when it is being placed in the stretched space.
   */
  children: (ctx: { aspect: number }) => ReactNode;
  /** Extra classes for the wrapper, so a puzzle can tint or animate the whole stage. */
  className?: string;
  /** `data-testid` for the aspect box. Defaults to the shared one. */
  testId?: string;
}

export default function PuzzleStage({
  bgAsset,
  bgAlt = '',
  aspect,
  children,
  className = '',
  testId = 'puzzle-stage',
}: PuzzleStageProps) {
  const src = backgroundFor(bgAsset);

  return (
    /*
      ============================================================================================
      HOW A FIXED-SHAPE BOX FILLS AN UNKNOWN SPACE, WITH NO MEASURING AND NO CONSTANTS
      ============================================================================================
      *
      * The box must be the photograph's exact shape, as large as the space allows, and centred.
      * The pattern is three elements, each doing one job:
      *
      *   outer   absolute inset-0, flex, centred, p-0   - reports the true available box
      *   mid     min-h-0 min-w-0 flex-1                 - a flex item that may shrink below its
      *                                                    content, so the ratio is free to resolve
      *   box     h-full w-auto aspect-ratio, max-w-full - fills the height, derives the width from
      *                                                    the ratio, and gives that up symmetrically
      *                                                    when the width is the binding limit
      *
      * `min-h-0`/`min-w-0` ARE THE LOAD-BEARING PART. A flex item defaults to `min-*: auto`, which
      * refuses to shrink below its content - so without them the box would push the layout instead
      * of being sized by it, and the bar would be shoved off the top of the screen.
      *
      * `h-full w-auto` IS THE OTHER LOAD-BEARING PART. Height is the definite axis, so the width is
      * DERIVED from it through the ratio rather than declared independently. An earlier attempt set
      * both `width: 100%` and `height: 100%` and capped them separately: the two clamps fought, the
      * ratio lost, and a 1.339 photograph was laid out in a 992x768 (ratio 1.291) box - visibly
      * stretched. Deriving one axis from the other is what makes that impossible.
      *
      * WHY NOT A VIEWPORT CONSTANT. The version before that guessed with `calc(100vh - 7rem)`. A
      * guessed constant is wrong in exactly the way constants are always wrong: the real space
      * depends on the bar's height, the padding and whatever controls the station draws, so the
      * guess was too large on one window and too small on another and the box quietly stopped
      * matching the photograph's shape. This version reads the true container instead.
    */
    <div className="absolute inset-0 flex items-center justify-center">
      {/*
        THE MIDDLE LAYER DOES TWO JOBS: it gives the box a definite height to measure against, and
        it declares itself as a size container so `100cqh` below resolves to its real height.

        WHY A CONTAINER QUERY UNIT RATHER THAN A CLAMP. `aspect-ratio` cannot express "fit inside",
        because whichever axis is declared wins and clamping the other one afterwards breaks the
        shape. Both of the obvious attempts failed here, in opposite directions:

          `w-full max-h-full`  stretched a 1.792 photograph to 3.18 on a 1600x620 window, because
                               the declared width stayed pinned while only the height was capped.
          `h-full max-w-full`  squashed the same photograph to 0.69 on a 560x900 window, because
                               the declared height stayed pinned while only the width was capped.

        Each fixed one window shape and broke the other. The way out is to give the box a width that
        is ALREADY the smaller of the two valid answers, so no clamp ever has to fight the ratio:

          width: min(100%, <container height> * aspect)

        With the width decided, `aspect-ratio` derives a height that is guaranteed to fit, and both
        orientations come out right under one rule. `100cqh` is the container's height, and
        `container-type: size` on this wrapper is what makes that available.

        `min-h-0 min-w-0` are what allow the box to be smaller than its content: a flex item
        defaults to `min-*: auto`, which resolves to the content's size and would push the bar off
        the top of the screen rather than fitting under it.
      */}
      <div
        className="flex h-full w-full min-h-0 min-w-0 items-center justify-center"
        style={{ containerType: 'size' }}
      >
        <div
          className={`relative w-[min(100%,calc(100cqh*var(--stage-aspect)))] overflow-hidden rounded-lg bg-slate-900/40 shadow-2xl ${className}`}
          style={
            {
              '--stage-aspect': aspect,
              aspectRatio: `${aspect}`,
            } as React.CSSProperties
          }
          data-testid={testId}
        >
          {src ? (
            <img
              src={src}
              alt={bgAlt}
              aria-hidden={bgAlt === ''}
              draggable={false}
              /*
                `object-fill`, NOT `contain` AND NOT `cover`.

                The box is already the photograph's exact aspect ratio - that is what the
                `aspectRatio` style above is for - so "fit the image to the box" and "fill the box"
                are the same instruction here, and `fill` says it without a second guess. `contain`
                was a real bug: it preserved the image's ratio inside the box and letterboxed it,
                which on a box that was itself slightly the wrong shape left dark bands top and
                bottom. `cover` would hide the mismatch by cropping instead, which is worse - it
                eats the edges of the artwork, and the puzzles are searched by looking at those
                edges.
              */
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
            />
          ) : (
            // A missing background is a data error, not a crash: the puzzles are still solvable on
            // a plain dark field, so the station stays playable and the gap is obvious to a
            // developer.
            <div className="absolute inset-0 bg-slate-800" />
          )}

          <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {children({ aspect })}
          </svg>
        </div>
      </div>
    </div>
  );
}
