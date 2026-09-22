/**
 * The deterministic round builder for "משחק הכוכבים".
 *
 * DETERMINISTIC MEANS REPRODUCIBLE, NOT PREDICTABLE. The generator takes its random source as
 * an argument, defaulting to `Math.random`. Passing a seeded generator reproduces a run
 * exactly, which is what lets the checks drive every level through thousands of rounds and
 * assert the invariants hold - including for hostile random sources that always return 0 or
 * always return 0.999999.
 *
 * ==================================================================
 * THE LEVEL IS AN INPUT, NOT SOMETHING DERIVED FROM THE QUESTION INDEX.
 * ==================================================================
 *
 * THIS IS THE FIX FOR THE ESCALATING-LADDER BUG. Every entry point used to take a bare
 * `roundNumber` and call `levelForRound(roundNumber)` to decide its own difficulty, which meant
 * the launch card's choice was overridden a few questions into every run. The level is now
 * threaded in from the caller - the value the child picked - and the question index is kept
 * only for the rules that legitimately vary within a run (Level 1's seven-star shapes, and the
 * per-question branch flips on Levels 2 and 3).
 *
 * ONE FUNCTION PER LEVEL, DISPATCHED BY A THIN WRAPPER. The levels differ in things a single
 * table cannot express - Level 2 flips between two and three identical shapes, Level 3 picks
 * unlike sizes - so the rules live in named functions rather than in conditionals threaded
 * through one builder. `buildStarRound` is the only entry point callers use, and it is
 * deliberately boring: its whole job is to pick the level's builder and delegate.
 *
 * THE ANSWER IS NEVER COMPUTED SEPARATELY FROM THE STARS. `total` is always the sum of the
 * vertices actually placed, because a total that drifted from what is drawn would make a
 * round unanswerable by looking at it - and no amount of correct arithmetic would help.
 */

import { ANCHORS, SHAPE_RADII } from './starData';
import { buildOptions } from './starRules';
import {
  LEVEL2_MIX,
  LEVEL2_SINGLE,
  LEVEL3_MIX,
  LEVEL3_QUAD_COUNTS,
  LEVEL3_QUAD_SIZES,
  LEVEL3_SINGLE,
  LEVEL3_TRIPLE_COUNTS,
  levelForRound,
  pickWeighted,
  sizesForQuestion,
  spinCeilingForQuestion,
  starTierForRound,
  type StarTier,
} from './starTiers';
import type { StarPoint, StarRound, StarShape } from './starTypes';

/**
 * A ring of `count` vertices at `radius` around an anchor.
 *
 * STARTS AT THE TOP (angle -90 degrees) so that an unrotated shape reads the way a child
 * expects: a triangle pointing up, a square sitting square on its base. Rotating away from
 * that baseline is the level's job, not the ring's.
 *
 * Coordinates are rounded to two decimals. The rounding is not cosmetic - full float
 * precision produces SVG attribute strings like `312.00000000000006`, which bloat the
 * markup and make the rendered-output checks far harder to read.
 */
function ring(count: number, anchor: StarPoint, radius: number): StarPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
    return {
      x: +(anchor.x + Math.cos(angle) * radius).toFixed(2),
      y: +(anchor.y + Math.sin(angle) * radius).toFixed(2),
    };
  });
}

/** Picks uniformly from a non-empty list. */
function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))]!;
}

/** Where the shapes sit for a given count. Always defined for the level's own shape count. */
function anchorsFor(shapeCount: number): StarPoint[] {
  const slots = ANCHORS[shapeCount];
  if (!slots) {
    throw new Error(`star generator: no anchor layout for ${shapeCount} shapes`);
  }
  // Copied rather than handed out by reference, so a shape can never mutate the layout table.
  return slots.map((slot) => ({ ...slot }));
}

/** Radius for a vertex count, or a loud failure rather than an unrenderable shape. */
function radiusFor(count: number): number {
  const radius = SHAPE_RADII[count];
  if (radius === undefined) {
    throw new Error(`star generator: no radius for a ${count}-vertex shape`);
  }
  return radius;
}

/**
 * Rolls one shape's tilt, spin, direction and rate.
 *
 * `rotateChance` IS THE LEVER, NOT A BOOLEAN, and it is rolled PER SHAPE rather than per
 * round. A round-wide roll would either tilt every shape or none, which produces formations
 * that all share an angle - and a set of shapes tilted in unison reads as one rotated group,
 * not as separate constellations.
 *
 * THE TILT IS ROLLED EVEN WHEN THE SHAPE SPINS. The CSS animation overrides the baked angle
 * while it runs, but this is the static fallback frame, and leaving it at zero would make a
 * reduced-motion child see every shape bolt upright - the one pose the level exists to avoid.
 *
 * THE SPIN IS ROLLED PER SHAPE TOO, and that is what makes "one shape turning while the other
 * rests" possible. The ceiling caps how many shapes in this question may spin; within that
 * budget each shape decides independently, so a two-shape question can mix a moving shape with
 * a still one rather than committing the whole stage to one behaviour.
 */
function rollMotion(
  tier: StarTier,
  random: () => number,
  allowSpin: boolean,
): { rotation: number; spinning: boolean; spinDirection: 1 | -1 | 0; spinSeconds: number } {
  const rotation = random() < tier.rotateChance ? +(random() * 360).toFixed(2) : 0;
  const spinning = allowSpin && random() < tier.spinChance;

  if (!spinning) return { rotation, spinning: false, spinDirection: 0, spinSeconds: 0 };

  // DIRECTION AND RATE ARE BOTH PER SHAPE. Two shapes turning the same way at the same speed
  // read as one rigidly rotating object, which is exactly the grouping the child is meant to be
  // counting - so neighbours are given both a sign and a period of their own.
  const spinDirection: 1 | -1 = random() < 0.5 ? 1 : -1;
  const [min, max] = tier.spinSecondsRange;
  const spinSeconds = +(min + random() * (max - min)).toFixed(2);

  return { rotation, spinning: true, spinDirection, spinSeconds };
}

/**
 * The spin budget for one question, as a set of shape positions that may spin.
 *
 * `spinCeilingForQuestion` says how many shapes MAY spin; this decides WHICH, by shuffling the
 * positions and taking the front. Choosing positions rather than rolling each shape
 * independently against a count matters when the ceiling is one: independent rolls could
 * produce zero spinners as easily as one, and the early Level 2 questions are supposed to show
 * motion, not merely permit it.
 */
function spinSlots(shapeCount: number, ceiling: number, random: () => number): boolean[] {
  if (!Number.isFinite(ceiling)) return Array.from({ length: shapeCount }, () => true);
  const allowed = Math.max(0, Math.min(shapeCount, Math.trunc(ceiling)));
  const positions = Array.from({ length: shapeCount }, (_, i) => i);
  // Fisher-Yates, so the spinner's position is not always the first shape.
  for (let i = positions.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [positions[i], positions[j]] = [positions[j]!, positions[i]!];
  }
  const maySpin = new Set(positions.slice(0, allowed));
  return Array.from({ length: shapeCount }, (_, i) => maySpin.has(i));
}

/** One shape at an anchor, with the level's tilt and spin rules applied. */
function makeShape(
  count: number,
  anchor: StarPoint,
  tier: StarTier,
  random: () => number,
  allowSpin: boolean,
): StarShape {
  return {
    count,
    anchor,
    stars: ring(count, anchor, radiusFor(count)),
    ...rollMotion(tier, random, allowSpin),
  };
}

/**
 * Assembles the round object, summing the answer from the vertices actually placed.
 *
 * `questionIndex` and `level` are BOTH stored, and they are no longer the same number. The
 * UI reports the question index against `QUESTIONS_PER_RUN`, and the level is what the
 * question was built from - which is now always the level the child chose.
 */
function assemble(
  questionIndex: number,
  level: number,
  shapes: StarShape[],
  random: () => number,
): StarRound {
  // NEVER COMPUTED, ALWAYS SUMMED. The answer is what is on the stage.
  const total = shapes.reduce((sum, shape) => sum + shape.count, 0);
  return {
    roundNumber: questionIndex,
    level,
    shapes,
    total,
    options: buildOptions(total, random),
  };
}

/**
 * Level 1: one small constellation, at most seven stars.
 *
 * The warm-up. EXACTLY ONE SHAPE, ALWAYS - there is no grouping and no multiplication at this
 * level, which is the whole contract. `sizesForQuestion` applies the run's one time-varying
 * rule: questions 1-4 are capped at six stars, and the seven-star shapes join for questions
 * 5-6, so the largest thing the child is ever asked to count arrives once they are settled in.
 */
export function generateLevel1Round(
  questionIndex: number,
  level: number,
  tier: StarTier,
  random: () => number,
): StarRound {
  const [anchor] = anchorsFor(1);
  const count = pick(sizesForQuestion(tier, questionIndex), random);
  // One shape, so the budget is a plain yes or no for this question - see `spinCeilingForQuestion`.
  const allowSpin = spinCeilingForQuestion(questionIndex, level) >= 1;
  return assemble(
    questionIndex,
    level,
    [makeShape(count, anchor!, tier, random, allowSpin)],
    random,
  );
}

/**
 * Level 2: a weighted mix of one, two or three shapes - NOT always two.
 *
 * THE MIX IS THE FIX. This level used to alternate between two and three identical shapes on a
 * coin flip, which is a variation in count but never in KIND: every single question showed a
 * multiplied group, so the level read as the same exercise six times over. The brief's
 * complaint about monotony is about exactly that, and no amount of shuffling the count fixes it,
 * because two shapes and three shapes are the same question with a different number.
 *
 * The three configurations now differ in kind:
 *   ~30% SINGLE - one larger constellation (`LEVEL2_SINGLE`, up to eight stars). Counting, not
 *        multiplying, so the question feels different from its neighbours even though the level
 *        is nominally about grouping.
 *   ~45% TWO IDENTICAL - the central multiplication exercise ("two fours").
 *   ~25% THREE IDENTICAL - the same multiplication with more groups.
 *
 * ROTATION ARRIVES GRADUALLY. `spinCeilingForQuestion` allows at most one turning shape in the
 * first two questions and lifts the ceiling from question 3, so the mixed formation the brief
 * asks for appears part-way into the run rather than immediately.
 */
export function generateLevel2Round(
  questionIndex: number,
  level: number,
  tier: StarTier,
  random: () => number,
): StarRound {
  const branch = pickWeighted(LEVEL2_MIX, random);

  if (branch.shapes === 1) {
    const [anchor] = anchorsFor(1);
    const count = pick(LEVEL2_SINGLE.sizes, random);
    return assemble(
      questionIndex,
      level,
      [makeShape(count, anchor!, tier, random, true)],
      random,
    );
  }

  const anchors = anchorsFor(branch.shapes);
  /*
   * ONE SIZE FOR EVERY SHAPE, WHICH IS THE ENTIRE LEVEL. Drawing the size per shape would
   * silently turn the multiplication question into an addition question, so it is rolled once
   * and shared - enforced by construction rather than by a comment.
   */
  const count = pick(tier.sizes, random);
  const maySpin = spinSlots(anchors.length, spinCeilingForQuestion(questionIndex, level), random);
  const shapes = anchors.map((anchor, i) => makeShape(count, anchor, tier, random, maySpin[i]!));
  return assemble(questionIndex, level, shapes, random);
}

/**
 * Level 3: the unpredictable pool.
 *
 * THREE BRANCHES, DRAWN BY WEIGHT, SO CONSECUTIVE QUESTIONS DIFFER IN KIND:
 *
 *   SINGLE - one big, irregular constellation of eight to ten stars. The hardest pure counting
 *            question in the game, with nothing to group at all.
 *   QUAD   - TWO TO FOUR identical medium shapes (up to six stars each). Repetition, but with
 *            more groups than Level 2 ever shows, and the count varies so the branch itself is
 *            not predictable.
 *   TRIPLE - TWO OR THREE unlike small shapes, each in 3..5. This is the branch that cannot be
 *            doubled: `3 + 4 + 5` has to be summed.
 *
 * THE TRIPLE'S SIZES ARE FORCED DISTINCT, by shuffling a pool and taking the front rather than
 * by rejection sampling. Rejection would loop an unbounded number of times against a random
 * source that always returns the same value, which the checks deliberately exercise; shuffling
 * a fixed pool is a fixed number of steps that cannot fail. Distinctness is what keeps the
 * branch from collapsing back into the Level 2 trick.
 *
 * EVERY SHAPE ROLLS ITS OWN SPIN, DIRECTION AND RATE, so no two rounds move alike.
 */
export function generateLevel3Round(
  questionIndex: number,
  level: number,
  tier: StarTier,
  random: () => number,
): StarRound {
  const branch = pickWeighted(LEVEL3_MIX, random).branch;

  if (branch === 'single') {
    const [anchor] = anchorsFor(1);
    const count = pick(LEVEL3_SINGLE.sizes, random);
    return assemble(
      questionIndex,
      level,
      [makeShape(count, anchor!, tier, random, true)],
      random,
    );
  }

  if (branch === 'quad') {
    const shapeCount = pick(LEVEL3_QUAD_COUNTS, random);
    const anchors = anchorsFor(shapeCount);
    // ONE size for all of them: this branch is the multiplication branch, so the repetition has
    // to be exact or the question becomes an addition.
    const count = pick(LEVEL3_QUAD_SIZES, random);
    const shapes = anchors.map((anchor) => makeShape(count, anchor, tier, random, true));
    return assemble(questionIndex, level, shapes, random);
  }

  const shapeCount = pick(LEVEL3_TRIPLE_COUNTS, random);
  const anchors = anchorsFor(shapeCount);
  const bands = tier.sizeBands ?? [];
  /*
   * A SHUFFLED COPY OF THE FIRST BAND, TAKEN FROM THE FRONT. The bands are the allowed size
   * pool for the unlike branch; shuffling and slicing gives distinct sizes in a fixed number
   * of steps.
   */
  const pool = [...(bands[0] ?? [3, 4, 5])];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  const shapes = anchors.map((anchor, index) => {
    // A pool shorter than the shape count would yield `undefined`; the checks guarantee at
    // least as many distinct sizes as shapes, and this makes a future edit fail loudly.
    const count = pool[index];
    if (count === undefined) {
      throw new Error(
        `star generator: level 3 needs ${anchors.length} distinct sizes but only ${pool.length} exist`,
      );
    }
    return makeShape(count, anchor, tier, random, true);
  });

  return assemble(questionIndex, level, shapes, random);
}

/**
 * Builds one question, dispatching to the selected level's own generator.
 *
 * @param questionIndex 1-based position in the run. Used only for Level 1's late seven-star
 *   shapes; it can no longer change which level is played.
 * @param selectedLevel 1, 2 or 3 - the level the child chose on the launch card. Every
 *   question in the run is built from this, and nothing overrides it.
 * @param random Injectable, so a seeded source reproduces a run exactly.
 */
export function buildStarRound(
  questionIndex: number,
  selectedLevel = 1,
  random: () => number = Math.random,
): StarRound {
  const tier = starTierForRound(questionIndex, selectedLevel);
  const level = levelForRound(questionIndex, selectedLevel);

  if (level === 3) return generateLevel3Round(questionIndex, level, tier, random);
  if (level === 2) return generateLevel2Round(questionIndex, level, tier, random);
  return generateLevel1Round(questionIndex, level, tier, random);
}

/**
 * How many separate shapes a question draws.
 *
 * Exposed for the status line, which may say how many groups are on the stage - a grouping
 * hint that reveals no sum. Nothing in the UI ever prints the per-shape counts.
 */
export function shapeCountOf(round: StarRound): number {
  return round.shapes.length;
}
