/**
 * The difficulty ladder for "משחק הכוכבים".
 *
 * ==================================================================
 * THE LEVEL IS CHOSEN ON THE CARD AND DOES NOT MOVE DURING A RUN.
 * ==================================================================
 *
 * THIS IS THE CENTRAL RULE OF THIS FILE, and it replaces the ladder that used to be here.
 *
 * The old design escalated INSIDE a run: `levelForRound(roundNumber)` walked 1 -> 2 -> 3 as
 * the questions went by, so a child who picked "רמה 1" on the launch card was served a
 * two-shape multiplication question by question 4 and a three-shape spinning addition
 * question by question 7 - regardless of what they had chosen. The card's level was decorative;
 * the round number was the real difficulty knob. A child on Level 1 who could not yet hold two
 * groups in mind was therefore guaranteed to meet them anyway, halfway through a run they had
 * deliberately asked to play on easy.
 *
 * So the ladder is now indexed by the SELECTED LEVEL ONLY. Level 1 plays six Level 1 questions,
 * Level 2 plays six Level 2 questions, Level 3 plays six Level 3 questions. The question index
 * is still passed in, because Level 1 uses it to hold its seven-star shapes back to the second
 * half of the run - but it can no longer change WHICH LEVEL is being played.
 *
 * ==================================================================
 * THE PROGRESSION THAT REMAINS IS THE GROUPING, NOT THE LEVEL.
 * ==================================================================
 *
 *   1. ONE shape, at most seven stars. Nothing to group; the task is to count a single
 *      constellation. The larger shapes arrive late in the run so the warm-up is gentle.
 *   2. TWO OR THREE IDENTICAL shapes - the multiplication bridge. The child counts one group
 *      and repeats it ("two fours"), which is the mental move the level exists to teach.
 *   3. UNLIKE AND/OR IRREGULAR groups, up to ten stars, rotating. Either four identical medium
 *      shapes, or three unlike small ones that must be summed rather than multiplied.
 */
import { COMPLEX_SIZES, SIMPLE_SIZES } from './starData';
import { assertStarTiers } from './starTierChecks';

/**
 * A level's rule for building one question.
 *
 * THE MODE FIELD IS THE PEDAGOGY, and it is named rather than inferred from `shapes`. A
 * level that draws two shapes because they are IDENTICAL is teaching multiplication
 * ("three fours"); a level that draws two DIFFERENT shapes is teaching addition of unlike
 * groups. Both are "two shapes", and a table that only recorded the count could not tell
 * them apart - so the generator would have no way to know which it was building.
 */
export type StarMode =
  /** One shape. Counting, nothing to group. */
  | 'single'
  /** Two or three shapes of the SAME size, so the child can multiply. */
  | 'identical'
  /** One large, busy shape. Counting, without a group to lean on. */
  | 'complex'
  /** Several unlike shapes, so the child must add rather than multiply. */
  | 'mixed';

export interface StarTier {
  /** How many shapes are on the stage. */
  shapes: number;
  /** Which shape sizes may be drawn. */
  sizes: readonly number[];
  /** How the round is assembled - see `StarMode`. */
  mode: StarMode;
  /** Chance in 0..1 that each shape is given a static tilt. */
  rotateChance: number;
  /**
   * Chance in 0..1 that each shape spins, ROLLED PER SHAPE.
   *
   * THIS REPLACED A BOOLEAN, AND THAT IS THE WHOLE FIX FOR THE MISSING ANIMATION. As a boolean
   * it could only say "this level spins" or "this level does not", so:
   *   - Levels 1 and 2 were pinned to `false`, and their shapes never animated at all - the only
   *     movement on screen was the baked `rotation` angle, which is static by definition;
   *   - Level 3 was pinned to `true`, so every shape spun and the mixed "one turning, one still"
   *     formation the design asks for was unreachable.
   * As a probability it can express all three: never, sometimes (per shape), and always.
   */
  spinChance: number;
  /** The range of spin durations in seconds this level draws from, per shape. */
  spinSecondsRange: readonly [number, number];
  /**
   * The largest shape allowed in the FIRST half of the run, if the level restricts it.
   *
   * LEVEL 1 ONLY, AND IT IS THE ONE PLACE THE QUESTION INDEX STILL MATTERS. The brief allows a
   * seven-star shape on Level 1 but reserves it for the later questions, so that a child meets
   * the biggest single shape they will see only once they are settled in. Leaving it `undefined`
   * means "no early cap" - every size the level lists is available from question 1.
   */
  maxSizeEarly?: number;
  /**
   * The size ranges each shape draws from, when a level wants unlike shapes of roughly
   * matched weight. Ignored unless `mode` is `'mixed'` and `sizeBands` is present.
   *
   * LEVEL 3's "three different small shapes" branch uses this to hold every shape inside
   * 3..5 (`3 + 4 + 5`), which is what makes the arithmetic a two-digit sum rather than a
   * sprawl. Without it, a `mixed` level drawing freely from 3..10 could deal `3 + 9 + 10`.
   */
  sizeBands?: readonly (readonly number[])[];
}

/** How many questions a run contains. The header reports the index against this. */
export const QUESTIONS_PER_RUN = 6;

/**
 * The question from which Level 1 starts spinning its shape, and the one from which it may
 * draw its larger shapes.
 *
 * BOTH ARE THE SAME THRESHOLD, AND THAT IS DELIBERATE. Questions 1-3 are the still, gentle
 * introduction: one shape, no movement, at most six stars. Questions 4-6 add the motion and
 * the seven-star shapes together, so the back half of the run is a clearly harder phase rather
 * than two independent ramps that happen to overlap.
 */
export const LEVEL1_MOTION_FROM = 4;
export const LEVEL1_LATE_SHAPES_FROM = 4;

/**
 * The three levels, keyed by level number.
 *
 * LEVEL 1 - ONE SIMPLE SHAPE. Questions 1-3 are completely still and capped at six stars;
 * questions 4-6 begin to turn and may draw the seven-star shapes. There is never a second
 * shape and never a multiplication at this level.
 *
 * LEVEL 2 - GROUPING, AND THE MOST VARIED LEVEL. The question mix is the point: it is not
 * always two shapes. Roughly a third of questions are a single shape (the `complex` branch from
 * `LEVEL2_SINGLE`), and the rest are two or three IDENTICAL shapes so the child can multiply.
 * Rotation arrives gradually - questions 1-2 are mostly still, and from question 3 the shapes
 * turn independently of one another.
 *
 * LEVEL 3 - UNPREDICTABLE ON EVERY AXIS. Asymmetric single shapes, two to four identical medium
 * shapes, or two to three unlike shapes - and every shape rolls its own spin, direction and
 * rate, so no two rounds move alike.
 */
export const STAR_TIERS: Record<number, StarTier> = {
  1: {
    shapes: 1,
    sizes: SIMPLE_SIZES,
    mode: 'single',
    // STILL THROUGH QUESTIONS 1-3, MOTION FROM 4. The renderer reads `spinChance` together
    // with the question index, so the early questions of this level are genuinely static.
    rotateChance: 0.3,
    spinChance: 1,
    spinSecondsRange: [16, 22],
    maxSizeEarly: 6,
  },
  2: {
    shapes: 2,
    sizes: SIMPLE_SIZES,
    mode: 'identical',
    rotateChance: 0.5,
    /**
     * THE PER-SHAPE ROLL IS WHAT MAKES THE EARLY QUESTIONS "MOSTLY" STATIC.
     *
     * `spinCeilingForQuestion` limits how many shapes MAY turn; this probability decides whether
     * each of those candidates actually does. At 1 the ceiling is a guarantee, so a question
     * with a ceiling of one would always show exactly one spinner - never a still board - which
     * is not "mostly static". At 0.5 the early Level 2 questions come out still about half the
     * time, and from question 3 - where the ceiling lifts - the mix becomes two turning while a
     * third rests, or both turning in opposite directions.
     */
    spinChance: 0.5,
    spinSecondsRange: [11, 17],
  },
  3: {
    shapes: 3,
    sizes: COMPLEX_SIZES,
    mode: 'mixed',
    rotateChance: 0.8,
    /*
     * HIGH, BUT NOT CERTAIN. Every shape turning every round is its own kind of monotony, and
     * the brief asks for rotation "frequently and independently" rather than universally. At
     * this rate most shapes in most rounds turn, and the odd resting shape inside a turning
     * formation is itself a variation the eye has to work to read.
     */
    spinChance: 0.85,
    spinSecondsRange: [7, 13],
    sizeBands: [
      [3, 4, 5],
      [3, 4, 5],
      [3, 4, 5],
    ],
  },
};

/**
 * Level 2's question mix, as weights rather than a single coin flip.
 *
 * THE BRIEF'S CENTRAL COMPLAINT ABOUT THIS LEVEL IS MONOTONY - "do not generate 2-3 shapes every
 * single time" - and a two-way coin flip cannot fix that on its own: it can only ever trade one
 * repeat for another. A weighted draw across three configurations is what makes consecutive
 * questions actually differ.
 *
 * These are WEIGHTS, not probabilities, and they are normalised by their sum. They read
 * directly as the brief's percentages: 30% single, 45% two, 25% three.
 */
export const LEVEL2_MIX: readonly { shapes: number; weight: number }[] = [
  { shapes: 1, weight: 30 },
  { shapes: 2, weight: 45 },
  { shapes: 3, weight: 25 },
];

/**
 * Level 2's single-shape branch, for the ~30% of questions that show one constellation.
 *
 * UP TO EIGHT STARS, which is larger than anything Level 2's grouped branches deal. A single
 * big constellation is the same counting skill the `complex` mode was written for, so the sizes
 * are the bigger end of the simple range plus the smallest complex size.
 */
export const LEVEL2_SINGLE = {
  shapes: 1,
  sizes: [6, 7, 8] as const,
} as const;

/**
 * Level 3's question mix.
 *
 * THREE DIFFERENT EXERCISES, DRAWN BY WEIGHT: an asymmetric single shape, a repeat of two to
 * four identical medium shapes, and two to three unlike shapes that must be summed.
 */
export const LEVEL3_MIX: readonly { branch: 'single' | 'quad' | 'triple'; weight: number }[] = [
  { branch: 'single', weight: 30 },
  { branch: 'quad', weight: 40 },
  { branch: 'triple', weight: 30 },
];

/** Level 3's asymmetric single-shape branch: one big, irregular constellation. */
export const LEVEL3_SINGLE = {
  shapes: 1,
  sizes: [8, 9, 10] as const,
} as const;

/**
 * Level 3's identical-shapes branch: TWO TO FOUR of the same medium shape.
 *
 * A RANGE RATHER THAN A FIXED FOUR. Always drawing four would make the branch as predictable as
 * the level is supposed to be unpredictable, so the count is drawn from this list.
 */
export const LEVEL3_QUAD_COUNTS: readonly number[] = [2, 3, 4];

/** Level 3's identical branch draws from these sizes - medium, so a few of them stay countable. */
export const LEVEL3_QUAD_SIZES: readonly number[] = [4, 5, 6];

/**
 * Level 3's unlike-shapes branch: the number of shapes, and the bands they draw from.
 *
 * TWO OR THREE SHAPES, because the brief asks for variety rather than a fixed triple, and the
 * bands hold every shape inside 3..5 so the sum stays a two-digit number. Distinctness within a
 * question is enforced by the generator.
 */
export const LEVEL3_TRIPLE_COUNTS: readonly number[] = [2, 3];
export const LEVEL3_TRIPLE_BANDS: readonly (readonly number[])[] = [
  [3, 4, 5],
  [3, 4, 5],
  [3, 4, 5],
];

/**
 * Which level a question belongs to: ALWAYS the level the child chose.
 *
 * The parameter is kept in the signature even though it is unused, because every call site
 * still passes a question index and silently dropping it here would hide the fact that the
 * escalation has been deliberately removed. Anything that reintroduces round-based difficulty
 * has to do it in the open.
 */
export function levelForRound(_questionIndex: number, selectedLevel: number): number {
  return clampLevel(selectedLevel);
}

/** Keeps a level inside the three the station offers. */
export function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(3, Math.trunc(level)));
}

/** The tier for a question: the selected level's tier, for every question in the run. */
export function starTierForRound(questionIndex: number, selectedLevel: number): StarTier {
  const level = levelForRound(questionIndex, selectedLevel);
  return STAR_TIERS[level] ?? STAR_TIERS[1]!;
}

/**
 * Whether a question should include ANY motion at all.
 *
 * LEVEL 2's GRADUAL INTRODUCTION. Its questions 1-2 are mostly still - one shape may turn, and
 * often none does - and from question 3 the motion mixes in properly. This is the per-question
 * pacing the brief asks for, and it is expressed as a ceiling on how many shapes may spin
 * rather than as a separate tier, because the level's grouping rules must not change with it.
 */
export function spinCeilingForQuestion(questionIndex: number, level: number): number {
  if (level === 1) {
    // Still through the first half, moving through the second.
    return questionIndex >= LEVEL1_MOTION_FROM ? 1 : 0;
  }
  if (level === 2) {
    if (questionIndex <= 2) return 1;
    return Number.POSITIVE_INFINITY;
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * The sizes a question may draw, after the level's own early-run restriction.
 *
 * LEVEL 1'S SEVEN-STAR SHAPES ARRIVE AT QUESTION 4, alongside the motion. Questions 1-3 are
 * capped at `maxSizeEarly`, so the biggest single constellation the child will be asked to count
 * is held back until they are settled into the run. Every other level returns its sizes
 * untouched, because the cap is `undefined` for them.
 */
export function sizesForQuestion(tier: StarTier, questionIndex: number): readonly number[] {
  const cap = tier.maxSizeEarly;
  if (cap === undefined || questionIndex >= LEVEL1_LATE_SHAPES_FROM) return tier.sizes;
  const allowed = tier.sizes.filter((size) => size <= cap);
  // A cap that emptied the list would strand the generator with nothing to draw. The table and
  // the checks are written so it cannot happen, and this guarantees the round is dealable
  // anyway rather than throwing in front of the child.
  return allowed.length > 0 ? allowed : tier.sizes;
}

/** Draws one entry from a weighted list. Tolerates a hostile random source. */
export function pickWeighted<T>(items: readonly { weight: number }[] & readonly T[], random: () => number): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[items.length - 1]!;
}

// VALIDATED AT IMPORT, once the table above is fully built. Passing the table in rather than
// letting the check import it is what avoids a cycle - see `starTierChecks.ts`.
assertStarTiers(STAR_TIERS);
