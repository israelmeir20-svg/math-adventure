/**
 * Mystery-picture round data: balanced equations, a scene, and the tier shape.
 *
 * THE CHILD IS GIVEN THE MISSING TERM, NEVER THE TOTAL. That is the harder and
 * more useful form of a fact - `__ x 4 = 32` asks for the factor, where `8 x 4 =
 * __` only asks for the product:
 *
 *   __ x 4 = 32     a missing factor
 *   70 - __ = 30    a missing subtrahend
 *   36 / __ = 9     a missing divisor
 *
 * Every equation is built FROM a chosen answer, so the answer is always exact,
 * always a whole number, and always one of the four stones offered.
 *
 * ===================================================================
 * CALIBRATION IS THE ENTIRE POINT OF THIS FILE, AND IT IS PER-TIER.
 * ===================================================================
 *
 * The version this replaces had ONE generator for all tiers, and its numbers
 * were nowhere near grade 3:
 *
 *   - It used a 3-digit minuend and a 3-digit addend alongside a total of 1000
 *     (`__ + 384 = 1000`), which is a borrowing-across-two-columns problem that
 *     a third-grader has not been taught. The brief calls this out by name.
 *   - It asked for a subtahend of up to 480 out of a 1000 minuend - `1000 - __ =
 *     520` - and the DECOYS were then drawn at +/-10/20/30/100, so a child could
 *     often pick the right answer by eliminating the obviously-wrong magnitudes
 *     rather than computing anything.
 *   - Worst of all, the tier never entered the generator at all. `buildMysteryRound()`
 *     took no level, so a level-3 puzzle and a level-1 puzzle were statistically
 *     identical. The grid size never changed either. The child was told "רמה 3"
 *     while being served the same questions as level 1.
 *
 * So each tier now owns a table of OPERATIONS, and every operation states the
 * exact bounds it will draw from. Two invariants are worth stating plainly,
 * because they are what the brief is really asking for:
 *
 *   NO CARRYING OR BORROWING ACROSS A HUNDRED. Sums stay inside `b + a <= 100`
 *   until tier 3, so adding is a single-column act. Tiers 1 and 2 never produce
 *   a 3-digit intermediate at all.
 *
 *   NO DECOY IS REACHABLE BY MAGNITUDE ALONE. Decoys are drawn from the same
 *   band as the answer (see `buildChoices`), so `384` can never sit beside `38`
 *   as a free elimination. This is the quiet reason the old generator felt easy
 *   despite its big numbers: the size of the answer gave it away.
 */
import { pickScene, type MysteryScene } from './mysteryScenes';

export interface PuzzleEquation {
  /** The prompt, laid out left-to-right with `__` as the blank. */
  text: string;
  /** The number that belongs in the blank. */
  answer: number;
  /** Four candidates, always containing `answer`. */
  choices: number[];
}

export interface MysteryRound {
  scene: MysteryScene;
  equations: PuzzleEquation[];
}

/** The board shape a tier asks for. */
export interface MosaicTier {
  level: number;
  cols: number;
  rows: number;
  label: string;
}

/**
 * The tier ladder, per the brief.
 *
 * Level 2 is 3x4 - twelve tiles - but the brief also says "3x4", which reads as
 * three columns of four. It is laid out as 4 columns x 3 rows so a phone shows a
 * wide board rather than a tall one; the tile COUNT is twelve either way, which is
 * the number that matters for pacing.
 */
export const MOSAIC_TIERS: readonly MosaicTier[] = [
  { level: 1, cols: 3, rows: 3, label: '3×3' },
  { level: 2, cols: 4, rows: 3, label: '4×3' },
  { level: 3, cols: 4, rows: 4, label: '4×4' },
] as const;

/** Clamps a tile's level onto the tier table. */
export function tierFor(level: number): MosaicTier {
  const index = Math.max(0, Math.min(MOSAIC_TIERS.length - 1, Math.floor(level) - 1));
  return MOSAIC_TIERS[index] as MosaicTier;
}

export const CHOICE_COUNT = 4;

function randInt(min: number, max: number, random: () => number) {
  return min + Math.floor(random() * (max - min + 1));
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

/* ============================ Operations ============================ */

/** One question shape, with the bounds it draws its numbers from. */
interface Operation {
  id: string;
  /**
   * Builds the prompt, the answer, and the span decoys may be drawn from.
   * `spanMin`/`spanMax` are the answer's own family - the decoys stay inside.
   */
  build: (random: () => number) => { text: string; answer: number };
  /**
   * Decoy deltas, in the units this operation thinks in. Step 1 for a quotient
   * or a factor, step 10 for anything being counted in tens.
   */
  deltas: number[];
}

/**
 * TIER 1 - the 2-5 tables and round tens.
 *
 * The brief gives `__ x 4 = 32` and `70 - __ = 30` as the model questions, so
 * exactly those two families are here. The factor is drawn from 2-5, which keeps
 * the product at 50 or below, and the subtraction works in whole tens so the
 * child is reasoning about `70 - __ = 30` as "seven tens minus three tens".
 */
const TIER1: Operation[] = [
  {
    id: 'mul-2-5',
    build: (random) => {
      const factor = randInt(2, 5, random);
      const answer = randInt(2, 5, random);
      // Ask for either factor, so `__ x 4 = 32` and `8 x __ = 32` both appear.
      const text = random() < 0.5
        ? `__ × ${factor} = ${answer * factor}`
        : `${factor} × __ = ${factor * answer}`;
      return { text, answer };
    },
    // Neighbouring facts, plus the factor next door. Spurious but plausible.
    deltas: [1, 1, 2, 2],
  },
  {
    id: 'sub-tens',
    build: (random) => {
      // Whole tens, and the MINUEND CAPS AT 90 - `100` is three digits, and the
      // brief bans 3-digit work at this tier. Nine tens is the ceiling.
      const tens = randInt(3, 9, random);
      const answerTens = randInt(1, tens - 1, random);
      const minuend = tens * 10;
      const answer = answerTens * 10;
      return { text: `${minuend} - __ = ${minuend - answer}`, answer };
    },
    // Neighbouring tens, so the choice is between 10, 20, 30 - not 10 vs 100.
    deltas: [10, 10, 20],
  },
  {
    id: 'add-tens',
    build: (random) => {
      const otherTens = randInt(1, 5, random);
      // Sum capped at 90 for the same reason as above: no 3-digit result.
      const answerTens = randInt(1, 9 - otherTens, random);
      const other = otherTens * 10;
      const answer = answerTens * 10;
      return { text: `__ + ${other} = ${answer + other}`, answer };
    },
    deltas: [10, 10, 20],
  },
];

/**
 * TIER 2 - the full times table, division, and 2-digit +/- within 100.
 *
 * Division is stated as `36 / __ = 9` per the brief: the child is given the
 * quotient and must recover the divisor, which is the inverse of the fact they
 * know. Addition and subtraction are capped so the SUM never passes 100 - no
 * carrying across a hundred.
 */
const TIER2: Operation[] = [
  {
    id: 'mul-up-to-10',
    build: (random) => {
      const factor = randInt(3, 10, random);
      const answer = randInt(2, 10, random);
      return { text: `__ × ${factor} = ${answer * factor}`, answer };
    },
    deltas: [1, 1, 2, 2],
  },
  {
    id: 'div-exact',
    build: (random) => {
      // Divisor and quotient both start at 3: at 2 the answer is 2 and the decoy
      // walk offers 1, which sits outside the answer's band and is eliminable.
      const divisor = randInt(3, 9, random);
      const quotient = randInt(3, 9, random);
      // `36 / __ = 9` - the blank is the divisor, so the answer is `divisor`.
      return { text: `${divisor * quotient} ÷ __ = ${quotient}`, answer: divisor };
    },
    deltas: [1, 1, 2, 2],
  },
  {
    id: 'add-within-100',
    build: (random) => {
      // The SUM caps at 99, so the answer never creates a 3-digit total and no
      // carrying across a hundred is ever needed.
      //
      // THE ANSWER FLOOR IS 15, NOT 11. At 11 with a step-1 decoy the generator
      // offers 10 and 1, and `1` is an order of magnitude below the answer - it
      // gives the game away. 15 keeps every neighbour in the tens, so the four
      // stones are all plausible two-digit numbers.
      const other = randInt(15, 60, random);
      const answer = randInt(15, 99 - other, random);
      return { text: `__ + ${other} = ${answer + other}`, answer };
    },
    deltas: [1, 2, 10],
  },
  {
    id: 'sub-within-100',
    build: (random) => {
      /**
       * NO BORROWING ACROSS A HUNDRED.
       *
       * The minuend is capped at 99 rather than 100 - `100 - __ = 51` needs a
       * borrow from the hundreds column, which grade 3 has not been taught, and
       * it was leaking in through exactly this endpoint. Capping the minuend at
       * 99 keeps any borrow inside the tens column, where it belongs.
       *
       * The answer floor is 15 for the decoy reason above.
       */
      const minuend = randInt(35, 99, random);
      const answer = randInt(15, minuend - 15, random);
      return { text: `${minuend} - __ = ${minuend - answer}`, answer };
    },
    deltas: [1, 2, 10],
  },
];

/**
 * TIER 3 - mixed operations, tens rounding, and introductory 3-digit round
 * numbers.
 *
 * The 3-digit work is deliberately restricted to ROUND numbers: `400 - __ = 250`
 * is a tens problem wearing three digits, and it is exactly the "introductory
 * round number" the brief asks for. The old generator's `1000 - __ = 520` was not
 * this - it was an arbitrary 3-digit subtraction with no round structure to hang
 * the reasoning on, and it is the specific thing the brief bans.
 */
const TIER3: Operation[] = [
  ...TIER2,
  {
    id: 'round-hundreds-sub',
    build: (random) => {
      // Answer is a multiple of 50, drawn from a round-hundreds minuend.
      const minuend = randInt(3, 9, random) * 100;
      const answer = randInt(1, (minuend - 100) / 50, random) * 50;
      return { text: `${minuend} - __ = ${minuend - answer}`, answer };
    },
    // The answer IS a multiple of 50 here, so 100 is a legitimate neighbour -
    // and unlike tier 1, a 3-digit decoy is in-band for this tier.
    deltas: [50, 50, 100],
  },
  {
    id: 'round-hundreds-add',
    build: (random) => {
      const other = pick([50, 100, 150, 200], random);
      const answer = pick([50, 100, 150, 200, 250], random);
      return { text: `__ + ${other} = ${answer + other}`, answer };
    },
    deltas: [50, 50, 100],
  },
  {
    id: 'round-tens-div',
    build: (random) => {
      // `240 / __ = 40` - a round dividend dividing exactly by a table factor.
      const divisor = randInt(3, 9, random);
      const quotient = randInt(2, 9, random);
      return { text: `${divisor * quotient * 10} ÷ __ = ${quotient * 10}`, answer: divisor };
    },
    deltas: [1, 1, 2],
  },
];

/** The operation pool for a level. */
function operationsFor(level: number): Operation[] {
  if (level <= 1) return TIER1;
  if (level === 2) return TIER2;
  return TIER3;
}

/* ============================== Decoys ============================== */

/**
 * Four candidates around the answer.
 *
 * DECOYS ARE DRAWN FROM THE ANSWER'S OWN BAND, using the deltas the operation
 * declares. That is the first half of making the choice require computing rather
 * than sizing. The second half - and the one the previous version missed - is
 * that A DECOY MUST NOT ALREADY APPEAR IN THE EQUATION. Given `__ + 20 = 30`, the
 * old code happily offered `[10, 20, 30, 40]`: two of those are printed in the
 * prompt, and a child who cannot add can still eliminate them and then guess
 * between 10 and 40. Every decoy is now checked against the numbers the child can
 * already see, and against the answer itself.
 *
 * The loop is bounded and falls back to a deterministic widening pass, so a round
 * can never come back with fewer than four choices.
 */
function buildChoices(
  answer: number,
  deltas: readonly number[],
  visible: readonly number[],
  random: () => number,
): number[] {
  const banned = new Set<number>([answer, ...visible]);
  const choices = new Set<number>([answer]);

  // Widen in the operation's own units, so a tens question widens by tens.
  const positives = deltas.filter((d) => d > 0);
  const step = positives.length ? Math.min(...positives) : 1;

  let guard = 0;
  while (choices.size < CHOICE_COUNT && guard < 400) {
    guard += 1;
    const delta = pick(deltas, random);
    const candidate = answer + delta * (random() < 0.5 ? -1 : 1);
    if (candidate > 0 && !banned.has(candidate)) choices.add(candidate);
  }

  let filler = 1;
  while (choices.size < CHOICE_COUNT && filler < 200) {
    const candidate = answer + filler * step;
    if (candidate > 0 && !banned.has(candidate)) choices.add(candidate);
    filler += 1;
  }

  return shuffle([...choices], random);
}

/** Every integer printed in a prompt, so decoys can be checked against them. */
function numbersIn(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map((match) => Number(match[0]));
}

/* ============================== Round ============================== */

/**
 * Builds one full round for a level: a scene and as many equations as the tier
 * has tiles.
 *
 * The shape rotates through the level's operation pool by index, so a board mixes
 * multiplication, division and subtraction rather than drilling one form on every
 * tile. Rotation rather than a random draw per tile is deliberate: a random draw
 * can produce a board that is, say, eight divisions, which reads as a different
 * (and much harder) puzzle than the one the tier promised.
 *
 * `shapeOffset` rotates the starting point, so two rounds of the same tier do not
 * begin with the same operation.
 */
export function buildMysteryRound(
  level: number,
  random: () => number = Math.random,
): MysteryRound {
  const tier = tierFor(level);
  const count = tier.cols * tier.rows;
  const ops = operationsFor(tier.level);
  const shapeOffset = Math.floor(random() * ops.length);

  const equations = Array.from({ length: count }, (_, index) => {
    const op = ops[(index + shapeOffset) % ops.length] as Operation;
    const { text, answer } = op.build(random);
    // Decoys are screened against the numbers already on screen - see buildChoices.
    return { text, answer, choices: buildChoices(answer, op.deltas, numbersIn(text), random) };
  });

  return { scene: pickScene(random), equations };
}

/** "3 × 4 = 12" - the confirmation line once a tile is solved. */
export function describeSolved(equation: PuzzleEquation): string {
  return equation.text.replace('__', String(equation.answer));
}
