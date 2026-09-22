/**
 * Shared geometry, arithmetic and palette for Station 3's four chase puzzles.
 *
 * ================================================================================================
 * THE NUMBER LINE IS THE WHOLE STATION, SO IT IS DEFINED ONCE
 * ================================================================================================
 *
 * All four chases are the same object seen from different angles: a horizontal line from 0 to 30,
 * with a suspect who moves along it in fixed leaps, and a decision about WHERE to strike. Only the
 * story around that line differs - a net on a post, a puddle with a key in it, two runners meeting,
 * a burrow to dig out.
 *
 * So the line, its ticks and its labels live here, and each chase supplies its own decoration. That
 * also fixes the thing most likely to go wrong: the four chases place markers at case-supplied
 * numbers (`options`), and if each derived its own x-scale, then "12" could land in a different
 * place in the window case than in the garden case - which a child comparing the two would notice
 * even if they could not say what was wrong.
 *
 * ================================================================================================
 * THE TRACK IS MEASURED OFF THE PHOTOGRAPH
 * ================================================================================================
 *
 * `path.jpeg` is a 1376x768 view of a dirt track across a field. Scanning its rows for warmth shows
 * the dirt (warm, y > 66%) clearly separated from the grass and foliage above it (cooler, y 17-65%).
 * The track band below is that measurement, and the number line is drawn inside it with room beneath
 * for the labels.
 */

/* ------------------------------------------------------------------------------------------------
 * Geometry of the track, as fractions of `path.jpeg`.
 * ---------------------------------------------------------------------------------------------- */

/** `path.jpeg` is 1376x768. */
export const PATH_ASPECT = 1376 / 768;

/**
 * The dirt track, as a fraction of the image.
 *
 * MEASURED, NOT GUESSED: the path's warmth and luminance in the row scan put the dirt from y 66% to
 * the bottom of the frame, and it spans the full width. The number line runs along the MIDDLE of
 * this band rather than its top, so the markers standing on it have the path's surface beneath them.
 */
export const TRACK = { left: 0.04, top: 0.66, width: 0.92, height: 0.34 };

/**
 * Where the number line itself sits within the track band.
 *
 * THE LINE IS NOT THE TOP OF THE BAND. Markers (signposts, burrows, runners) are drawn STANDING ON
 * the line, so they occupy space above it; the line is placed low enough in the band that a marker's
 * full height still lands on dirt rather than floating over the field behind.
 */
export const LINE_Y = TRACK.top + TRACK.height * 0.62;

/** How far the line is inset from the track's edges, so the end labels are not clipped. */
export const LINE_INSET = 0.035;

/* ------------------------------------------------------------------------------------------------
 * The scale.
 *
 * ZERO AND MAX ARE FIXED FOR EVERY CASE. The cases' numbers run from 10 to 30, so a line of 0..30
 * gives every one of them room on both sides - a chase whose target sat exactly at the end of the
 * line would have nowhere for the label, and one whose suspects started partway would give the
 * child no way to see how far they had come.
 * ---------------------------------------------------------------------------------------------- */

export const SCALE_MIN = 0;
export const SCALE_MAX = 30;

/** Every fifth number gets a labelled milestone; every unit gets a tick. */
export const MAJOR_STEP = 5;

/**
 * Converts a number on the line to an x, in the stage's normalised units.
 *
 * THE SINGLE SOURCE OF TRUTH FOR PLACEMENT. Every marker, tick, label and runner goes through this,
 * so they cannot disagree about where "12" is. Values outside 0..30 are extrapolated rather than
 * clamped, because clamping would silently stack off-scale markers on the end tick and hide the
 * data error that put them there.
 */
export function xForValue(value: number): number {
  const span = 1 - LINE_INSET * 2;
  return LINE_INSET + ((value - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * span;
}

/* ------------------------------------------------------------------------------------------------
 * The arithmetic each chase is teaching.
 *
 * EACH FUNCTION DERIVES ITS ANSWER FROM THE CONFIG, and the chase validates the child's choice
 * against that derivation rather than against a hardcoded number. The case carries an
 * `options` list that is meant to include the answer, so a disagreement between the two means the
 * CASE is wrong - and `assertChase` surfaces that in development rather than letting a child meet
 * an unsolvable puzzle.
 * ---------------------------------------------------------------------------------------------- */

/** The greatest common divisor, for the intersection chase. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** The least common multiple, by way of the gcd. */
function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

/**
 * Where the ambush should be sprung.
 *
 * `solutionX` leaps of `totalSteps`, which is what `targetPosition` records for this type. The
 * `totalSteps` fallback exists because the case marks it optional, and a missing one would
 * otherwise make the expected answer `NaN` and the puzzle unwinnable.
 */
export function ambushTarget(solutionX: number, totalSteps: number | undefined): number {
  return solutionX * (totalSteps ?? 4);
}

/**
 * The number missing from the footprint trail.
 *
 * The case's trail is `x, 2x, __, 4x` and the gap is the third print. Derived as `3 * solutionX`
 * rather than read from `targetPosition`, so the puzzle and the chase agree by construction.
 */
export function puddleTarget(solutionX: number): number {
  return solutionX * 3;
}

/** The first number both the suspect and the dog stand on. */
export function intersectionTarget(suspectStep: number, dogStep: number): number {
  return lcm(suspectStep, dogStep);
}

/**
 * The number of the burrow the thief is hiding in.
 *
 * THE REMAINDER IS THE WHOLE PUZZLE. `stolen` items go into baskets of `solutionX` with `leftOver`
 * spilled outside, so the thief made `floor((stolen - leftOver) / solutionX)` full trips - and the
 * burrow is that many steps along. Computing it from the three numbers rather than hardcoding 15 is
 * what makes the arithmetic on the header mean something.
 */
export function burrowTarget(solutionX: number, stolen: number, leftOver: number): number {
  return Math.floor((stolen - leftOver) / solutionX) * solutionX;
}

/**
 * Checks that a chase's ON-SCREEN ANSWER is one the child is actually offered.
 *
 * ================================================================================================
 * WHY THIS EXISTS - A REAL HOLE THIS CLOSES
 * ================================================================================================
 *
 * Every chase derives its answer from `solutionX` and then expects the child to pick that number
 * from the case's `options`. IF THE DERIVED ANSWER IS NOT IN `options`, THE PUZZLE CANNOT BE
 * SOLVED: the board draws the thief at a position with no gate, no burrow and no signpost on it, and
 * the child is left poking at four choices none of which is right.
 *
 * That is not hypothetical. Running the burrow chase with a notebook answer of 2 instead of 3 moves
 * the derived target to 14, while `options` remains `[12, 15, 18, 21]` - the game is unwinnable and
 * NOTHING ON SCREEN SAYS SO. The same is true of the intersection chase with an answer of 3: the
 * runners first meet at 6 and no gate stands there.
 *
 * ================================================================================================
 * WHY IT IS A WARNING AND NOT A THROW
 * ================================================================================================
 *
 * Production cannot reach the broken state today - station 2 only calls `onComplete` once the
 * notebook is correct, so `solutionX` is always the case's own, and every shipped case has its
 * answer in its own options. Throwing would turn a data mistake into a white screen in front of a
 * child, which is a worse failure than a puzzle that is merely unwinnable. So this warns in
 * development, where a case author will see it, and stays quiet in a production build.
 */
export function warnIfChaseUnsolvable(
  chase: string,
  derivedTarget: number,
  options: number[],
  solutionX: number,
): void {
  if (options.includes(derivedTarget)) return;
  if (!import.meta.env.DEV) return;

  console.warn(
    `[station3] ${chase}: the derived answer ${derivedTarget} is not among the case's options ` +
      `[${options.join(', ')}], so this chase cannot be won. It was derived from a notebook answer ` +
      `of ${solutionX}; check that station 2's solutionX and station 3's options agree.`,
  );
}

/* ------------------------------------------------------------------------------------------------
 * Palette.
 *
 * SHARED WITH THE OTHER STATIONS' MEANING: cyan is what you have picked, green is right, red is a
 * miss. Kept local rather than imported so the chase can use its own dusk tint for the track without
 * changing what those three colours mean anywhere else.
 * ---------------------------------------------------------------------------------------------- */

export const CHASE_PALETTE = {
  /** The track's surface line. */
  line: '#fbbf24',
  /** Major milestone ticks and their labels. */
  milestone: '#fef3c7',
  /** Unit ticks, deliberately quieter than the milestones. */
  tick: 'rgba(255, 255, 255, 0.45)',
  /** The current selection. */
  active: '#22d3ee',
  success: '#4ade80',
  error: '#f87171',
  /** The number line track ribbon under the ticks. */
  ribbon: 'rgba(15, 23, 42, 0.55)',
} as const;

/* ------------------------------------------------------------------------------------------------
 * Timing.
 * ---------------------------------------------------------------------------------------------- */

/** How long one leap of the suspect takes. Shared so the four chases move alike. */
export const LEAP_MS = 420;
/** How long a wrong answer is shown before the board resets. */
export const WRONG_FLASH_MS = 620;
/**
 * How long a successful capture is held before the station hands over.
 *
 * THE SPEC'S 1.2 SECONDS, and it is longer than the other stations' one second deliberately: the
 * pay-off here is a capture rather than a reveal, and the child needs a beat to see WHERE it
 * happened relative to the line before the case moves on.
 */
export const CAPTURE_HOLD_MS = 1200;
