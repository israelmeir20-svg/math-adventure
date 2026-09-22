/**
 * Shared geometry, palette and helpers for Station 1's four puzzles.
 *
 * ================================================================================================
 * WHY THE VIGNETTES ARE IN HERE AND NOT IN EACH PUZZLE
 * ================================================================================================
 *
 * Each puzzle draws an SVG overlay on top of a photograph, and the overlay only works if it sits
 * where the photograph's feature actually is. Those positions were MEASURED from the shipped
 * assets, not eyeballed - the medallion is not centred in its frame, the window's glass is not
 * the whole image, and the tray does not fill its own canvas.
 *
 * Putting them in one table means the numbers can be compared against each other and against the
 * images at a glance, which is how the two mistakes in this file were caught. Scattered across
 * four components they would have been four independent guesses.
 *
 * ================================================================================================
 * THE VIGNETTE IS A FRACTION OF THE IMAGE, AND THE OVERLAY IS AN SVG VIEWBOX
 * ================================================================================================
 *
 * Everything below is expressed as a fraction of the background image (0..1), and each puzzle
 * renders ONE svg with `viewBox="0 0 1 1"` stretched over the image box (`preserveAspectRatio`
 * left at its default `meet` is WRONG here - see the note in each puzzle). That way a puzzle's
 * geometry and its hit targets are in the same coordinate space, so an item cannot be drawn in
 * one place and clickable in another.
 */

import type { Station1Config, Station1Data } from './caseData';

/* ------------------------------------------------------------------------------------------------
 * Measured vignettes.
 *
 * EACH PUZZLE OWNS THE VIGNETTE IT DRAWS ON, and that is deliberate. A shared table of four
 * rectangles was the first draft here, and it was wrong: each puzzle's geometry is its own (the
 * crest's grid is placed against the medallion's centre, the window's against the glazing's corners)
 * so every puzzle ended up with a local constant anyway and the shared table became a SECOND COPY
 * of the same numbers that nothing read - free to drift out of step with the one that did.
 *
 * The measurements themselves are documented at each puzzle, next to the code that depends on them.
 * ---------------------------------------------------------------------------------------------- */

/** A rectangle as fractions of a background image. */
export interface Vignette {
  left: number;
  top: number;
  width: number;
  height: number;
}

/* ------------------------------------------------------------------------------------------------
 * Palette.
 *
 * THE SAME THREE COLOURS MEAN THE SAME THREE THINGS IN ALL FOUR PUZZLES, so a child who learns
 * that gold is "already correct" in the crest does not have to relearn it in the tray. Cyan is
 * always the thing you have picked up, green is always success, red is always a miss.
 * ---------------------------------------------------------------------------------------------- */

export const PALETTE = {
  /** Given, already-correct, and not to be edited. */
  given: '#f5c542',
  /** The player's current selection. */
  active: '#22d3ee',
  /** Correct. */
  success: '#4ade80',
  /** Refused, or wrong. */
  error: '#f87171',
  /** Cell that has not been decided yet. */
  empty: 'rgba(8, 12, 28, 0.55)',
  /** Outline on an undecided cell. */
  emptyStroke: 'rgba(255, 255, 255, 0.35)',
} as const;

/**
 * The colours used to tint the tray's sectors once a candidate map has been applied.
 *
 * THREE DISTINCT HUES, DELIBERATELY NOT SHADES OF ONE. The whole question the tray puzzle asks is
 * "are these three groups the same size", and three tints of the same colour would make their
 * boundaries hard to follow - a child would have to count rather than see.
 */
export const SECTOR_COLOURS = ['#60a5fa', '#f472b6', '#34d399'] as const;

/* ------------------------------------------------------------------------------------------------
 * Timing.
 *
 * Shared so the four puzzles hold their success beat for the same length of time. A station that
 * paused for a second in one puzzle and half a second in another would feel inconsistent in a way
 * a child notices even if they cannot name it.
 * ---------------------------------------------------------------------------------------------- */

/** How long a wrong answer flashes before the board resets. */
export const WRONG_FLASH_MS = 520;
/** How long the success state holds before the station hands over. */
export const SUCCESS_HOLD_MS = 1000;
/** How long a piece takes to snap or settle into place. Kept in step with the CSS keyframe. */
export const SNAP_MS = 340;

/* ------------------------------------------------------------------------------------------------
 * Narrowing helpers.
 *
 * THE DISPATCHER SWITCHES ON `config.type`, BUT TYPESCRIPT CANNOT CARRY THAT NARROWING ACROSS A
 * COMPONENT BOUNDARY. `Station1Config` holds `data: Station1Data`, a union keyed by the same
 * `type` field, and nothing in the type system says the two agree.
 *
 * They DO agree - `caseData.ts` is the only producer and it writes them together - but a puzzle
 * that receives `config` and blindly reads `config.data.rows` would be one bad case definition
 * away from rendering `undefined` cells in front of a child. These two helpers make the coupling
 * explicit and fail loudly in development instead.
 * ---------------------------------------------------------------------------------------------- */

/** Narrows a config to its `tray` variant, or null if the case is malformed. */
export function asTray(config: Station1Config): Extract<Station1Data, { type: 'tray' }> | null {
  return config.data.type === 'tray' ? config.data : null;
}

/** Narrows a config to its `symmetry` variant, or null. */
export function asSymmetry(
  config: Station1Config,
): Extract<Station1Data, { type: 'symmetry' }> | null {
  return config.data.type === 'symmetry' ? config.data : null;
}

/** Narrows a config to its `window` variant, or null. */
export function asWindow(config: Station1Config): Extract<Station1Data, { type: 'window' }> | null {
  return config.data.type === 'window' ? config.data : null;
}

/** Narrows a config to its `garden` variant, or null. */
export function asGarden(config: Station1Config): Extract<Station1Data, { type: 'garden' }> | null {
  return config.data.type === 'garden' ? config.data : null;
}

/**
 * The URL for a case's background.
 *
 * DELEGATES TO THE SHARED LOOKUP in `mysteryAssets.ts`, which holds the one glob for the whole
 * feature. This was the original home of that glob; it moved when Station 3 needed to resolve its
 * own props, and re-exporting keeps Station 1's four puzzles - and their imports - untouched.
 */
export { backgroundFor } from './mysteryAssets';
