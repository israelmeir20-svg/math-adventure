/**
 * Measured geometry for the notebook background, and the algebra the station teaches.
 *
 * EVERY NUMBER HERE WAS MEASURED FROM `notebook.jpg`, NOT GUESSED. The asset is a photograph,
 * and it is off-centre: it carries dark margins on both sides and a void along the right-hand
 * fifth, so the notebook does not sit where a `left: 25% / right: 25%` layout would put it.
 * These constants are the difference between items landing on paper and items landing on the
 * desk beside it.
 *
 * MEASURED FROM THE SHIPPED FILE (2752 x 1536), read back out of a canvas at display size:
 *
 *   x  0.0% - 15.4%   dark margin      (empty desk)
 *   x 15.4% - 47.0%   LEFT PAGE
 *   x 47.0% - 53.4%   SPINE GAP        (the stitched binding)
 *   x 53.4% - 83.5%   RIGHT PAGE       (dimmer - it is in shadow and foreshortened)
 *   x 83.5% - 100%    dark void        (empty desk again)
 *   y 15.1% - 83.3%   the vertical extent of both pages
 *
 * THE FIRST PASS MEASURED THE LIT PAPER AND CALLED IT THE PAGE, and that under-reported where
 * each page ends. The left page's bright area stops around 41%, but the paper itself carries on
 * to about 47% before the binding; the right page's shadowed inner edge begins at 53.4%, not the
 * 55.2% the lit region suggested. Treating the lit extents as page bounds wrote off a strip of
 * usable paper on both sides of the spine, which is why items crowded away from the centre.
 *
 * THE SPINE IS AT ~50%, and it is worth stating because it is near enough to centre to be
 * mistaken for it - a naive 50/50 split would push the left page's content about 3% too far
 * right and the right page's into the binding.
 *
 * THE PAGES ARE NOT THE SAME WIDTH - about 31.6% against 30.1% - because the photograph is taken
 * slightly from the left, so the right page is foreshortened. One shared width would leave a
 * visible gap on one side.
 */

/** The page and spine rectangles, as fractions of the background image. */
export interface NotebookGeometry {
  /** Left page bounds, as the fraction of the image the page occupies. */
  leftPage: { left: number; right: number; top: number; bottom: number };
  /** Right page bounds. */
  rightPage: { left: number; right: number; top: number; bottom: number };
  /** The horizontal centre of the spine gap, where connector lines cross. */
  spineX: number;
}

export const NOTEBOOK_GEOMETRY: NotebookGeometry = {
  leftPage: { left: 0.154, right: 0.47, top: 0.151, bottom: 0.833 },
  rightPage: { left: 0.534, right: 0.835, top: 0.151, bottom: 0.833 },
  spineX: (0.47 + 0.534) / 2,
};

/** The background image's aspect ratio, so band widths and heights compare honestly. */
export const NOTEBOOK_ASPECT = 2752 / 1536;

/* ------------------------------------------------------------------------------------------------
 * The algebra.
 *
 * THE FOUR CASES ARE FOUR EQUATION SHAPES, and the station's job is to let a child undo them by
 * hand: pair a note with a note to cancel equal amounts on both pages, or divide both sides into
 * equal envelopes. What remains here is the one piece of that arithmetic the component itself does
 * not carry - how much goes into an envelope.
 *
 * THE LAYOUT HELPERS THAT USED TO LIVE HERE (`bestGrid`, `slotsFor`, `startingLayout`, `isIsolated`)
 * ARE GONE, and deliberately rather than by tidy-up: they computed a centre point per item at
 * arbitrary offsets, and `Station2Notebook` now lays its items out as CSS GRID CELLS so that
 * non-overlap is a property of the container rather than something the arithmetic has to preserve.
 * They had no remaining callers. The page bounds and the aspect ratio above are still the measured
 * truth about the photograph and are still what the component positions its two pages against.
 * ---------------------------------------------------------------------------------------------- */

/**
 * How many notes one envelope hides, for the division step.
 *
 * `notes / photos`, exactly as the brief describes - 18 notes into 3 envelopes is 6 each. It is
 * computed rather than stored so the envelopes can never claim a share that does not multiply
 * back to the pile: the child is entitled to check the arithmetic by re-multiplying.
 */
export function envelopeShare(rightNotes: number, leftPhotos: number): number {
  if (leftPhotos <= 0) return 0;
  return Math.round(rightNotes / leftPhotos);
}
