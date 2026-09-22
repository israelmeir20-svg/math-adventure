/**
 * Pure logic for the Bonus Island mini-games.
 *
 * ZERO arithmetic: these exercises train cognitive control, visual perception
 * and spatial memory only. Nothing here imports the math engine.
 */

/* ===================== Hot Air Balloons (Stroop), arcade ===================== */

/**
 * ================================================================================================
 * THE STATION LEVEL, WHICH IS NOT THE SAME THING AS THE TIER
 * ================================================================================================
 *
 * These two numbers arriving at the same function is the most confusing thing in this file, so it is
 * worth being exact about it.
 *
 *   - The STATION LEVEL (1|2|3) is what the child picks on the launch card. It is per-session and
 *     explicit: this is the game I want to play right now.
 *
 *   - The TIER (1..3) is the PERSISTENT ladder in `useWindowsProgress` / `useBalloonProgress`. It
 *     rises when three gold medals are banked and never falls.
 *
 * THEY DISAGREE, AND BOTH HAVE TO BE HONOURED. A child who has cleared the tower three times has
 * tier 3 banked, and may still tap "Level 1" on the card to play an easy round - the picker is
 * there precisely so they can go back. Grading the harder board off the tier while the card says
 * Level 1 is the bug that would create, which is why the level is now passed IN rather than
 * inferred, and why the tier only ever acts as a FLOOR for the pattern vocabulary (never as a
 * difficulty override).
 *
 * The mapping the brief asks for:
 *
 *   LEVEL 1 - 3x3, three lit.  LEVEL 2 - 4x4, four lit.  LEVEL 3 - 4x4, five lit, shorter look.
 */
export type StationLevel = 1 | 2 | 3;

/**
 * The five balloon sizes are a RANK, not a diameter.
 *
 * `balloonScale` maps each to a multiplier, and the game only ever compares two
 * ranks, so the multipliers can be tuned purely for legibility. The old model had
 * three sizes with a 0.7 / 1.0 / 1.3 spread, and a "big" versus "medium" pair was
 * genuinely hard to tell apart at a glance - which is fatal here, because the
 * whole exercise is deciding which of two things is physically larger.
 */
export type BalloonSize = 'xs' | 'small' | 'large' | 'xl';

const BALLOON_SCALE: Record<BalloonSize, number> = {
  xs: 0.55,
  small: 0.72,
  large: 0.88,
  xl: 1,
};

export function balloonScale(size: BalloonSize): number {
  return BALLOON_SCALE[size];
}

/**
 * How a station level configures a balloon session.
 *
 * THE LEVEL IS NOT "MORE OF THE SAME", IT IS A DIFFERENT KIND OF TEMPTATION. Each rung attacks a
 * different way of answering on autopilot, which is the only thing this game is actually testing:
 *
 *   LEVEL 1 - WIDE DIVERGENCE, CALM PACE. The digits are far apart and the sizes are the extremes,
 *     so both cues are trivially readable and the child can practise the RULE ("read the prompt")
 *     without the reading itself being hard. The task also holds still for the whole session, which
 *     is what makes the rule learnable.
 *
 *   LEVEL 2 - CLOSE NUMBERS, INVERTED SIZE. The digits are one or two apart (7 vs 8), which is the
 *     brief's example, and the two sizes converge so the size cue stops being an easy tiebreaker.
 *     Now the digits must actually be compared rather than glanced at - and the classic trap, a huge
 *     balloon carrying the SMALLER digit, is where the interference is strongest.
 *
 *   LEVEL 3 - MULTI-ROUND FAST CHALLENGE. The task itself changes constantly (see `taskForItem`),
 *     so the rule has to be re-read every item, and the pair is replaced on a much shorter beat. This
 *     is the only rung where the cost of misreading the prompt is paid immediately and repeatedly.
 */
export interface BalloonLevelSpec {
  /** Minimum gap between the two digits - the brief's "wide" vs "close". */
  minDigitGap: number;
  /** How often the two cues are made to disagree, 0..1. */
  conflictRate: number;
  /** True when the two sizes are pushed to the extremes, so size reads at a glance. */
  wideSizeSpread: boolean;
  /** How often the DIGITS are swapped between the two balloons each item. */
  swapRate: number;
  /** Milliseconds the green/red marking lingers. Shorter = faster pace. */
  markMs: number;
}

export function balloonLevelSpec(level: StationLevel): BalloonLevelSpec {
  switch (level) {
    case 1:
      return { minDigitGap: 5, conflictRate: 0.7, wideSizeSpread: true, swapRate: 1, markMs: 220 };
    case 2:
      // Gap 1 is the brief's 7-vs-8. `wideSizeSpread: false` is the "inverted size contrast" ask:
      // the envelopes get close enough in size that the digit is the only reliable cue.
      return { minDigitGap: 1, conflictRate: 0.8, wideSizeSpread: false, swapRate: 1, markMs: 170 };
    default:
      // The gap stays small AND the conflict rate is at its highest, so the fast pace cannot be
      // beaten by falling back on the size cue.
      return { minDigitGap: 1, conflictRate: 0.85, wideSizeSpread: false, swapRate: 1, markMs: 140 };
  }
}

/** Rank order, smallest first. Comparisons go through this, never through pixels. */
const BALLOON_RANK: BalloonSize[] = ['xs', 'small', 'large', 'xl'];

export type BalloonTask = 'size' | 'value';

/** One of the two balloons. `side` is its fixed position, not a label. */
export interface Balloon {
  side: 'left' | 'right';
  size: BalloonSize;
  /** Printed digit 1-9. Deliberately unrelated to `size` in conflicting rounds. */
  digit: number;
  /** Which balloon the task wants. */
  correct: boolean;
}

export interface BalloonRound {
  balloons: [Balloon, Balloon];
  task: BalloonTask;
  /** True when the physically larger balloon holds the smaller digit. */
  conflict: boolean;
}

/** Rank, not pixels - so a comparison can never be broken by a CSS change. */
function rank(size: BalloonSize): number {
  return BALLOON_RANK.indexOf(size);
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = items[i] as T;
    const b = items[j] as T;
    items[i] = b;
    items[j] = a;
  }
  return items;
}

/**
 * Two distinct sizes with the widest available rank difference.
 *
 * The two most extreme sizes are paired (xs against xl) so the size comparison is
 * never a squint, which matters most in level 1 where the player is still learning
 * that the digit must be ignored.
 */
function pairedSizes(wideSpread: boolean): [BalloonSize, BalloonSize] {
  if (!wideSpread) {
    // The adjacent pair, so the envelopes are close enough in size that the size cue stops being a
    // free answer. `small` against `large` is the closest legal rank pair.
    const swap = Math.random() < 0.5;
    return swap ? ['small', 'large'] : ['large', 'small'];
  }
  const lo = pick(['xs', 'small'] as const);
  const hi = pick(['large', 'xl'] as const);
  return [lo, hi];
}

/**
 * Builds one round FOR A GIVEN TASK.
 *
 * THE TASK IS A PARAMETER, AND THAT IS THE POINT. An earlier version let this
 * function pick its own task while the component displayed the task from
 * `taskForItem`. Those were two independent draws from the same coin, so they
 * disagreed about half the time - and the real symptom was a game that marked a
 * correct answer wrong, with no pattern the player could learn from. The task the
 * player reads on the banner and the task this function grades against must be the
 * same value, and passing it in is the only way to guarantee that.
 *
 * CONFLICT IS FORCED 70% OF THE TIME, per the brief. A conflict means the two
 * cues disagree: the physically bigger balloon carries the smaller digit. Without
 * a deliberate majority of these, a child can answer both tasks on autopilot by
 * picking the big one and never read the prompt - which is the failure mode the
 * Stroop exercise exists to prevent. The remaining 30% is left random so the
 * player cannot learn "always distrust the big balloon" as a shortcut either.
 */
export function buildBalloonRound(task: BalloonTask, level: StationLevel = 1): BalloonRound {
  const spec = balloonLevelSpec(level);
  const wantConflict = Math.random() < spec.conflictRate;
  const gap = spec.minDigitGap;

  // Sizes differ by rank by construction, so the size task is always answerable.
  const [sizeA, sizeB] = pairedSizes(spec.wideSizeSpread);

  // First digit is free; the second is retried until the gap is met AND, when a
  // conflict is wanted, the value order opposes the size order.
  const aIsBigger = rank(sizeA) > rank(sizeB);
  let digitA = 1 + Math.floor(Math.random() * 9);
  let digitB = 1 + Math.floor(Math.random() * 9);

  for (let guard = 0; guard < 200; guard += 1) {
    const farEnough = Math.abs(digitA - digitB) >= gap;
    const conflicts = aIsBigger !== digitA > digitB;
    if (farEnough && conflicts === wantConflict && digitA !== digitB) break;
    digitA = 1 + Math.floor(Math.random() * 9);
    digitB = 1 + Math.floor(Math.random() * 9);
  }

  // Deterministic fallback for the rare draw the retry loop cannot satisfy (a
  // large gap combined with an awkward size order). Built outright rather than
  // retried, because a round must always be dealable.
  if (Math.abs(digitA - digitB) < gap || (aIsBigger !== digitA > digitB) !== wantConflict) {
    // A conflict means the BIGGER balloon (A, when aIsBigger) holds the LOWER
    // digit; a non-conflict means the bigger one holds the higher digit.
    const bigIsLow = wantConflict;
    const low = 1;
    const high = Math.min(9, 1 + gap);
    if (aIsBigger) {
      digitA = bigIsLow ? low : high;
      digitB = bigIsLow ? high : low;
    } else {
      digitB = bigIsLow ? low : high;
      digitA = bigIsLow ? high : low;
    }
  }

  // Which of the two drawn sizes lands on the left is a coin flip, so the answer
  // is never consistently on one side.
  const sides = shuffle(['left', 'right'] as ('left' | 'right')[]);

  const raw: { side: 'left' | 'right'; size: BalloonSize; digit: number }[] = [
    { side: sides[0] as 'left' | 'right', size: sizeA, digit: digitA },
    { side: sides[1] as 'left' | 'right', size: sizeB, digit: digitB },
  ];

  const winner =
    task === 'size'
      ? raw.reduce((best, b) => (rank(b.size) > rank(best.size) ? b : best))
      : raw.reduce((best, b) => (b.digit > best.digit ? b : best));

  const balloons = raw.map((b) => ({ ...b, correct: b.side === winner.side })) as [
    Balloon,
    Balloon,
  ];

  const bigOne = raw.reduce((best, b) => (rank(b.size) > rank(best.size) ? b : best));
  const smallOne = raw.reduce((best, b) => (rank(b.size) < rank(best.size) ? b : best));

  return {
    balloons,
    task,
    conflict: bigOne.digit < smallOne.digit,
  };
}

/**
 * Which task is live for a given item index, per LEVEL.
 *
 * The brief's pacing, expressed as one function:
 *   Level 1 - a single task for the whole session, so the rule can be learned.
 *   Level 2 - the task swaps every 5 items, a predictable rhythm.
 *   Level 3 - the task swaps on EVERY item, so the rule must be re-read each time.
 *
 * This is a pure function of the item index, NOT state that is mutated as the
 * player answers. That distinction matters at speed: at under 120ms per item, a
 * stateful swap can be one item behind the balloon on screen, and the player is
 * then graded against a prompt they were never shown.
 *
 * IT TAKES THE LEVEL, NOT THE TIER. Those were the same number in the old code by
 * coincidence - the caller passed `progress.tier`, which happened to be 1..3. Now that
 * the launch card supplies its own 1..3, the parameter has to mean the LEVEL, or a child
 * who picked Level 1 while sitting on tier 3 would get the tier-3 rule-roulette.
 */
export function taskForItem(level: number, itemIndex: number): BalloonTask {
  // Level 1 holds one task. The slot is drawn once per session from `sessionTask`
  // so the player does not get the same task every time they open the game.
  if (level <= 1) return sessionTask;
  if (level === 2) return seededTask(level, Math.floor(itemIndex / 5));
  return seededTask(level, itemIndex);
}

/**
 * The fixed task for a tier-1 session, chosen fresh on each call.
 *
 * Read once per session by the component and passed through `taskForItem` via
 * this module-level slot, rather than being called per item - calling it per item
 * would flip the task on every balloon and turn tier 1 into tier 3.
 */
let sessionTask: BalloonTask = 'size';

/** Rolls the tier-1 task for a new session. Returns it for convenience. */
export function rollSessionTask(): BalloonTask {
  sessionTask = Math.random() < 0.5 ? 'size' : 'value';
  return sessionTask;
}

/** Stable pseudo-random task per (tier, slot) so a re-render cannot flip it. */
function seededTask(tier: number, slot: number): BalloonTask {
  const h = Math.imul(tier * 7919 + slot * 104729, 2654435761) >>> 0;
  return h % 2 === 0 ? 'size' : 'value';
}

export const TASK_META: Record<BalloonTask, { icon: string; title: string; hint: string }> = {
  size: { icon: '📏', title: 'איזה כדור גדול יותר פיזית?', hint: 'התעלמו מהמספרים!' },
  value: { icon: '🔢', title: 'איזה מספר גדול יותר?', hint: 'התעלמו מהגודל!' },
};

/** Paid per solved round in the bonus island games - the brief's single-correct figure. */
export const BONUS_COOKIE_REWARD = 10;

/* ========================= Lighted Windows ========================= */

export interface WindowsRound {
  /** Indices in row-major order that light up. */
  pattern: number[];
  /** 3, 4 or 5 - how many windows light up. */
  count: number;
  /** Grid shape, e.g. 3 x 3. */
  cols: number;
  rows: number;
}

/**
 * The difficulty ladder.
 *
 * TIERS, NOT A ROUND COUNT. The first version keyed difficulty off how many
 * rounds deep the player was, which was fine for an endless mode but wrong now
 * that the game runs in 30-second sessions: a session is only five or six rounds,
 * so a ladder indexed on `round` would reset the player to the easiest board every
 * single session and they would never see tier 2 or 3 at all.
 *
 * The tier is persistent instead, and it changes only when three gold medals have
 * been banked at the current one.
 */
export interface WindowsLevel {
  cols: number;
  rows: number;
  count: number;
  /** Which pattern vocabulary this level draws from - see `shapesFor`. */
  tier: ShapeTier;
  /**
   * The range the lit count is drawn from, when a level varies it per round.
   *
   * LEVEL 1 USES THIS, and it is the reason `count` alone is not enough. The brief
   * gives Level 1 a range of three to four windows rather than a fixed three, and a
   * level that always lights the same number lets the child learn the count instead
   * of the position - they can answer by tapping any three windows they half-remember.
   * Varying it inside the level forces the positions to be the thing that is stored.
   *
   * When absent the level's `count` is exact, which is what Levels 2 and 3 want: both
   * ask for a specific number so the board's width, not the tally, is the difficulty.
   */
  countRange?: readonly number[];
}

/**
 * The level architecture, keyed by station level.
 *
 * THE LEVELS ARE DIFFERENT EXERCISES, NOT THREE SIZES OF THE SAME ONE:
 *
 *   LEVEL 1 - 3x3, three or four lit. All of the figures are the simplest
 *     Gestalts: a straight row or column, a diagonal, a corner L, a 2x2 block.
 *     The child can name what they saw, which is what makes it recallable.
 *
 *   LEVEL 2 - 4x4, four lit. Still recognisable figures, but the wider board adds
 *     the structured shapes a 3x3 has no room for: a 2x2 box, a plus, a T, the
 *     four outer corners.
 *
 *   LEVEL 3 - 4x4, four or five lit, AND DELIBERATELY SHAPELESS. The patterns are
 *     scattered - see `scatteredPattern` - so there is no figure to name and the
 *     board has to be held as pure spatial memory. Resisting the urge to impose
 *     structure is the whole exercise.
 */
export function levelForTier(tier: number): WindowsLevel {
  if (tier <= 1) return { cols: 3, rows: 3, count: 3, tier: 1, countRange: [3, 4] };
  if (tier === 2) return { cols: 4, rows: 4, count: 4, tier: 2 };
  return { cols: 4, rows: 4, count: 5, tier: 3, countRange: [4, 5] };
}

/**
 * ================================================================================================
 * THE BOARD FOR A CHOSEN STATION LEVEL - WHAT THE LAUNCH CARD ACTUALLY PROMISES
 * ================================================================================================
 *
 * The brief specifies three boards, and they are SIMPLER AND MORE PREDICTABLE than the tier ladder
 * above, which is deliberate. A child tapping "Level 2" on the card is told "4x4, four windows", so
 * that is exactly what every round must deal:
 *
 *   LEVEL 1 - 3x3, THREE lit.        (tier-1 vocabulary: rows, diagonals, corner Ls, 2x2 blocks)
 *   LEVEL 2 - 4x4, FOUR lit.         (tier-2 vocabulary: boxes, pluses, Ts, corners, lines)
 *   LEVEL 3 - 4x4, FIVE lit, and a SHORTER look at the pattern.
 *
 * NO `countRange` ON ANY OF THEM, and that is a change from the tier ladder rather than an oversight.
 * The tier ladder varies level 1 between three and four windows to stop the child learning the tally
 * instead of the positions - a real concern, but it belongs to the ENDLESS tier flow, where the child
 * never chose the difficulty. Here they did choose it, and the card's promise has to match what they
 * see: "Level 1" that sometimes deals four windows is a broken promise, and a child counting taps is
 * the first to notice. Levels 2 and 3 are exact for the same reason.
 *
 * THE `tier` FIELD DRIVES THE PATTERN VOCABULARY, NOT THE DIFFICULTY. Level 1 draws on tier-1 figures
 * because those are the nameable ones, Level 2 on tier-2 figures, and Level 3 uses the tier-3
 * scatter. `showMs` is the level-3 twist the brief asks for: less time to memorise five windows than
 * any other rung.
 */
export interface WindowsBoardSpec extends WindowsLevel {
  /** How long the pattern stays lit. Overrides `WINDOWS_SHOW_MS` for this level. */
  showMs: number;
}

export function windowsBoardForLevel(level: StationLevel): WindowsBoardSpec {
  switch (level) {
    case 1:
      return { cols: 3, rows: 3, count: 3, tier: 1, showMs: WINDOWS_SHOW_MS };
    case 2:
      return { cols: 4, rows: 4, count: 4, tier: 2, showMs: WINDOWS_SHOW_MS };
    default:
      // Five windows on a 4x4, and a look that is ~25% shorter: five positions cannot be held in the
      // time four were, so the constraint has to tighten with the load or the level is not harder.
      return { cols: 4, rows: 4, count: 5, tier: 3, showMs: Math.round(WINDOWS_SHOW_MS * 0.75) };
  }
}

/** Total windows on a board. */
export const windowTotal = (level: WindowsLevel): number => level.cols * level.rows;

/**
 * The shapes worth aiming for, as fractions of the grid.
 *
 * A uniformly random sample of five cells out of sixteen usually produces a
 * shapeless blob, which is the one pattern a person cannot hold in memory: there
 * is no structure to hang the recall on. Stroking a known figure - a diagonal, a
 * border, a corner block - is what makes the round memorable, and therefore
 * winnable.
 *
 * EVERY TEMPLATE IS A FUNCTION OF THE GRID, NOT A FIXED INDEX LIST, so a shape
 * that works on 3x3 also exists on 4x4. That matters more than it looks: the
 * first version listed concrete indices for a 3x3 board, and because none of them
 * happened to have FIVE cells, every round from 10 onward quietly fell through to
 * a random scatter - a 0% shape rate on the hardest rounds of the game.
 *
 * ------------------------------------------------------------------
 * THE CATALOG IS CURATED PER TIER, AND THE CALLER SAYS WHICH TIER IT IS.
 * ------------------------------------------------------------------
 *
 * Level 1 wants the simplest Gestalts a child can name out loud - a row, a
 * diagonal, a corner L, a 2x2 block. Level 2 wants figures that still read as a
 * single object on a wider 4x4 board but carry more structure: a 2x2 box, a plus,
 * a T, the four outer corners. Those are different intents, and they cannot both be
 * served by one undifferentiated list - so the tier is a parameter and each gets its
 * own shortlist of the figures that suit it. Everything in both shortlists is drawn
 * from the same vocabulary below, so a figure that works on one grid works on the
 * other.
 */
type ShapeTier = 1 | 2 | 3;

function shapesFor(cols: number, rows: number, tier: ShapeTier): number[][] {
  const at = (c: number, r: number) => r * cols + c;

  // A shape that starts at (c0,r0) and steps down-right, as far as the grid allows.
  const diagonal = (c0: number, r0: number, dc: number, dr: number) => {
    const out: number[] = [];
    for (let c = c0, r = r0; c >= 0 && c < cols && r >= 0 && r < rows; c += dc, r += dr) {
      out.push(at(c, r));
    }
    return out;
  };

  const row = (r: number) => Array.from({ length: cols }, (_, c) => at(c, r));
  const col = (c: number) => Array.from({ length: rows }, (_, r) => at(c, r));

  // An L: a full edge plus most of the edge next to it.
  const corner = (c0: number, r0: number, dc: number, dr: number) => {
    const out = new Set<number>();
    for (let c = c0; c >= 0 && c < cols; c += dc) out.add(at(c, r0));
    for (let r = r0; r >= 0 && r < rows; r += dr) out.add(at(c0, r));
    return [...out];
  };

  /**
   * A 2x2 block at (c0,r0). Needs one column and one row of room to its right
   * and below, so the last legal position is (cols-2, rows-2).
   */
  const box = (c0: number, r0: number) => [
    at(c0, r0),
    at(c0 + 1, r0),
    at(c0, r0 + 1),
    at(c0 + 1, r0 + 1),
  ];

  /** A plus: the centre cell plus its four orthogonal neighbours. */
  const plus = (c0: number, r0: number) => [
    at(c0, r0),
    at(c0 - 1, r0),
    at(c0 + 1, r0),
    at(c0, r0 - 1),
    at(c0, r0 + 1),
  ];

  /** A T: a full run of three across, with one stem hanging below the middle. */
  const tee = (c0: number, r0: number) => [
    at(c0, r0),
    at(c0 + 1, r0),
    at(c0 + 2, r0),
    at(c0 + 1, r0 + 1),
  ];

  /** Every 2x2 block the grid can hold, in reading order. */
  const boxes = () => {
    const out: number[][] = [];
    for (let r = 0; r + 1 < rows; r += 1) {
      for (let c = 0; c + 1 < cols; c += 1) out.push(box(c, r));
    }
    return out;
  };

  /**
   * Every plus whose arms all fit. Requires a one-cell margin on all four sides,
   * so the centres run from (1,1) to (cols-2, rows-2).
   */
  const pluses = () => {
    const out: number[][] = [];
    for (let r = 1; r + 1 < rows; r += 1) {
      for (let c = 1; c + 1 < cols; c += 1) out.push(plus(c, r));
    }
    return out;
  };

  /**
   * Every T that fits. The crossbar needs three columns, so it runs from c0 to
   * cols-3, and the stem needs a row below, so r0 stops one short of the bottom.
   */
  const tees = () => {
    const out: number[][] = [];
    for (let r = 0; r + 1 < rows; r += 1) {
      for (let c = 0; c + 2 < cols; c += 1) out.push(tee(c, r));
    }
    return out;
  };

  const corners = [
    at(0, 0),
    at(cols - 1, 0),
    at(0, rows - 1),
    at(cols - 1, rows - 1),
  ];

  /** Straight runs: every row, then every column. */
  const lines = [
    ...Array.from({ length: rows }, (_, r) => row(r)),
    ...Array.from({ length: cols }, (_, c) => col(c)),
  ];

  const diagonals = [
    diagonal(0, 0, 1, 1),
    diagonal(cols - 1, 0, -1, 1),
    // The inner starts, so a 4x4 can offer a 5-long diagonal too.
    diagonal(0, 1, 1, 1),
    diagonal(1, 0, 1, 1),
  ];

  const frame = [...row(0), ...row(rows - 1), ...col(0), ...col(cols - 1)];
  const cornerLs = [
    corner(0, 0, 1, 1),
    corner(cols - 1, 0, -1, 1),
    corner(0, rows - 1, 1, -1),
    corner(cols - 1, rows - 1, -1, -1),
  ];

  /*
   * LEVEL 2 - STRUCTURED FIGURES ON THE WIDER BOARD.
   *
   * The brief names these explicitly: 2x2 boxes, straight lines of three or four,
   * crosses, Ts, and the four outer corners. Every one is a figure a child can
   * describe in a word, which is exactly what makes it holdable in memory - and
   * several of them (the box, the plus, the T) exist ONLY here, because a 3x3 has
   * no room for a plus and a 2x2 box is most of a nine-cell board.
   */
  if (tier === 2) {
    return [
      ...boxes(),
      ...pluses(),
      ...tees(),
      corners,
      ...lines,
      ...diagonals,
      frame,
    ];
  }

  /*
   * LEVEL 1 - THE SIMPLEST GESTALTS.
   *
   * Rows, columns, diagonals, corner Ls, and the 2x2 block where it fits. No
   * frames and no staircase: those sprawl across the whole board and are far
   * harder to name than the figure they are made of, which defeats the point of a
   * warm-up level.
   */
  return [
    ...lines,
    ...diagonals,
    ...cornerLs,
    ...boxes(),
  ];
}

/**
 * Picks a recognisable figure of exactly `count` cells, or the nearest figure
 * larger than it, trimmed ONLY where trimming keeps the shape recognisable.
 *
 * ------------------------------------------------------------------
 * A LONGER FIGURE MAY BE CUT DOWN TO `count`, AND THAT IS THE FIX FOR THE
 * "SAME FOUR WINDOWS EVERY ROUND" DEFECT.
 * ------------------------------------------------------------------
 *
 * This used to accept only figures whose size EQUALLED `count`. On the tiers that
 * ask for four lit windows, exactly ONE figure in the whole catalog was four cells
 * long: the four corners. `pick` was therefore choosing from a one-element list,
 * `Math.random()` had nothing to pick between, and every round lit [0,2,6,8] and
 * nothing else.
 *
 * EVERY FIGURE OF `count` CELLS OR MORE IS THEREFORE A CANDIDATE, and the window is
 * taken from a RANDOM OFFSET within it. Randomising the offset rather than always
 * taking the first `count` cells matters: the eight-cell frame would otherwise
 * yield the same four window every time, which would simply trade one fixed pattern
 * for another.
 *
 * ------------------------------------------------------------------
 * BUT A SLICED FRAGMENT IS NOT ALWAYS A SHAPE, AND THAT IS THE SECOND DEFECT.
 * ------------------------------------------------------------------
 *
 * The offset fix traded a fixed pattern for a shapeless one. Cutting the border
 * frame at an arbitrary offset gives four cells running along one edge - at which
 * point it is a straight line, not a frame - and cutting a long diagonal at a
 * random start gives a four-cell stub that is no longer a diagonal anybody would
 * name. The board then looks random while claiming to be shaped, which is worse
 * than either extreme: the child is told to look for structure and shown rubble.
 *
 * SO EXACT FITS WIN, AND A CUT IS ONLY MADE WHEN THE RESULT IS STILL A NAMED FIGURE.
 * The grid is small, so most figures of the size a level asks for are exact fits -
 * a 4x4 offers four-cell rows, columns, boxes, Ts and corner sets, and a 3x3 offers
 * three-cell rows, columns and diagonals. Where the level asks for a size no figure
 * has, the caller falls back to scattering rather than cutting.
 */
function shapedPattern(level: WindowsLevel): number[] | null {
  const { cols, rows, count } = level;

  const figures = shapesFor(cols, rows, level.tier).filter((shape) => shape.length >= count);
  if (figures.length === 0) return null;

  /*
   * EXACT FITS FIRST. A figure the size of the target is always a real shape, so
   * if any exist the round is built from those and never from a cut.
   */
  const exact = figures.filter((shape) => shape.length === count);
  if (exact.length > 0) return pick(exact).slice().sort((a, b) => a - b);

  /*
   * OTHERWISE A CUT, BUT ONLY OF A FIGURE THAT SURVIVES IT. Only figures that are
   * straight runs of cells - rows, columns and diagonals - can be trimmed and still
   * read as a figure, because any contiguous run of a straight line is still a
   * straight line. A frame or an L cut at an offset is not, which is why there is
   * no general trimming here.
   */
  const lines = figures.filter((shape) => isStraightRun(shape, cols));
  if (lines.length === 0) return null;

  const figure = pick(lines);
  const lastOffset = figure.length - count;
  const start = Math.floor(Math.random() * (lastOffset + 1));
  return figure
    .slice(start, start + count)
    .sort((a, b) => a - b);
}

/**
 * True when every cell in `cells` sits on one straight line - the same row, the
 * same column, or a single 45-degree diagonal.
 *
 * THIS IS THE TEST THAT MAKES TRIMMING SAFE. A run of cells is only re-cuttable if
 * any contiguous slice of it is still the same kind of figure: a row stays a row, a
 * diagonal stays a diagonal. A frame fails it (its cells span two rows and two
 * columns), and so does an L, which is exactly the behaviour `shapedPattern` needs.
 */
function isStraightRun(cells: number[], cols: number): boolean {
  if (cells.length <= 2) return true;
  const coords = cells.map((index) => [index % cols, Math.floor(index / cols)] as const);

  const sameRow = coords.every(([, r]) => r === coords[0]![1]);
  const sameCol = coords.every(([c]) => c === coords[0]![0]);
  if (sameRow || sameCol) return true;

  // A diagonal: the step between consecutive cells is the same in both axes.
  const sorted = [...coords].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const dc = sorted[1]![0] - sorted[0]![0];
  const dr = sorted[1]![1] - sorted[0]![1];
  if (Math.abs(dc) !== Math.abs(dr) || dc === 0) return false;

  return sorted.every((cell, i) => i === 0 || (cell[0] - sorted[i - 1]![0] === dc && cell[1] - sorted[i - 1]![1] === dr));
}

/**
 * Level 3's anti-pattern: `count` cells with NO recognisable figure.
 *
 * THE DELIBERATE ABSENCE OF STRUCTURE IS THE EXERCISE. Levels 1 and 2 both hand the
 * child a shape to name, which is a crutch: the figure does the remembering. This
 * level removes the crutch, so the board has to be held as raw spatial memory.
 *
 * THE CONSTRAINT IS THE POINT - a naive random sample is not good enough. Out of
 * sixteen cells, four or five draws will frequently happen to form a line, a block
 * or a corner, and a child who spots that has been handed exactly the structure
 * this level exists to withhold. So every candidate is REJECTED unless it avoids:
 *
 *   - any three cells in a straight line (a row, a column or a 45-degree diagonal),
 *   - any 2x2 block completed,
 *   - any plus, T or corner L.
 *
 * Rejection is bounded and falls back to the best candidate seen, so the round is
 * always dealable even if the constraint cannot be fully met - which is why the
 * fallback is tracked rather than the function being allowed to loop forever.
 */
function scatteredPattern(level: WindowsLevel): number[] {
  const { cols, rows, count } = level;
  const total = cols * rows;

  let best: number[] | null = null;
  let bestScore = -1;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    const pool = Array.from({ length: total }, (_, i) => i);
    shuffle(pool);
    const pattern = pool.slice(0, count).sort((a, b) => a - b);

    const score = structuralScore(pattern, cols);
    if (score === 0) return pattern;
    // Keep the least-structured candidate seen, so an unsatisfiable constraint
    // still yields the most scatter-like board rather than the last roll.
    if (best === null || score < bestScore) {
      best = pattern;
      bestScore = score;
    }
  }

  return best ?? Array.from({ length: count }, (_, i) => i);
}

/**
 * How much recognisable structure a candidate contains. Zero is a clean scatter.
 *
 * COUNTED RATHER THAN BOOLEAN SO THE CALLER CAN PICK THE BEST OF MANY ROLLS when no
 * candidate is perfectly clean. Lines are counted first because they are the
 * structure a child notices fastest and the one that most gives the game away.
 */
function structuralScore(cells: number[], cols: number): number {
  let score = 0;
  const rows = new Set<number>();
  const columns = new Set<number>();

  for (const index of cells) {
    rows.add(Math.floor(index / cols));
    columns.add(index % cols);
  }

  // Three in a row or a column.
  for (const row of rows) {
    const inRow = cells.filter((i) => Math.floor(i / cols) === row).length;
    if (inRow >= 3) score += inRow >= 4 ? 4 : 2;
  }
  for (const col of columns) {
    const inCol = cells.filter((i) => i % cols === col).length;
    if (inCol >= 3) score += inCol >= 4 ? 4 : 2;
  }

  /*
   * THREE OR MORE ON A 45-DEGREE DIAGONAL.
   *
   * THE TWO DIAGONAL FAMILIES ARE COUNTED IN SEPARATE MAPS, AND THE KEY IS A PLAIN
   * NUMBER. Encoding the direction into a string key (`d3`, `a5`) was both a type
   * error and a correctness one: the two families share the same key space, so a
   * descending run of three could be added to an ascending run and reported as a
   * single longer line that does not exist on the board.
   *
   * `c - r` is constant along a down-right diagonal and `c + r` is constant along a
   * down-left one, so each family gets its own map keyed by that constant.
   */
  const downRight = new Map<number, number>();
  const downLeft = new Map<number, number>();
  for (const index of cells) {
    const c = index % cols;
    const r = Math.floor(index / cols);
    downRight.set(c - r, (downRight.get(c - r) ?? 0) + 1);
    downLeft.set(c + r, (downLeft.get(c + r) ?? 0) + 1);
  }
  for (const run of [...downRight.values(), ...downLeft.values()]) {
    if (run >= 3) score += run >= 4 ? 4 : 2;
  }

  /*
   * A COMPLETED 2x2 BLOCK: the single most shape-like thing four cells can do.
   *
   * THE ROW BOUNDS ARE CHECKED, not just the column bounds. `index + 1` from the last
   * column of a row wraps to the first cell of the next, so a block straddling the
   * right edge would be counted from cells that are not adjacent at all.
   */
  const set = new Set(cells);
  for (const index of cells) {
    const c = index % cols;
    // The row bound is implied: a cell with no cell below it has no `index + cols` in
    // the set, so a block straddling the bottom edge cannot be counted either.
    if (c + 1 < cols && set.has(index + 1) && set.has(index + cols) && set.has(index + cols + 1)) {
      score += 4;
    }
  }

  return score;
}

/**
 * Builds a round for a level.
 *
 * THE TIER DECIDES WHICH PATTERN VOCABULARY IS USED, and the three are genuinely
 * different exercises rather than three difficulties of one:
 *
 *   Levels 1 and 2 are SHAPED. The figure is either drawn from the level's own
 *   curated shortlist or - if the shortlist has nothing of the right size - built
 *   as a connected cluster. The shape bias is high because in a 30-second sprint
 *   there is no time to recover from a round whose pattern was an unmemorisable
 *   scatter, and the shaped path is what makes the round recallable at all.
 *
 *   Level 3 is SCATTERED BY DESIGN and never touches the shape catalog. It is the
 *   only level where the pattern is chosen for having NO figure in it, which is
 *   what forces pure spatial memory instead of shape recognition. Falling back to a
 *   connected cluster here would quietly undo the level, so the fallback is a
 *   scatter rather than a growth.
 */
export function buildWindowsRound(tier = 1): WindowsRound {
  /*
   * A THIN WRAPPER OVER THE SHARED BUILDER. The tier ladder only ever decided the SPEC; the board
   * construction below it is identical for both entry points, so duplicating it is how the two flows
   * would silently diverge the first time either was tuned.
   */
  return buildWindowsRoundFromSpec(levelForTier(tier));
}

/**
 * Builds a round for a CHOSEN STATION LEVEL (1|2|3) rather than a persistent tier.
 *
 * IT DELEGATES RATHER THAN DUPLICATING, and that is the point: the pattern vocabulary, the shape bias,
 * the scatter constraint and the connected-cluster fallback are all things this file spent a long time
 * getting right, and a second implementation for the level path would drift from the first the moment
 * either was touched. The ONLY difference the level makes to the board is which spec is passed in.
 *
 * `levelForTier` still exists and is still used by the tier-driven flow, so `WindowsLevel.tier` keeps
 * meaning what it meant: which shortlist of figures to draw from.
 */
export function buildWindowsRoundForLevel(level: StationLevel): {
  round: WindowsRound;
  showMs: number;
} {
  const board = windowsBoardForLevel(level);
  const round = buildWindowsRoundFromSpec(board);
  return { round, showMs: board.showMs };
}

/**
 * The shared board builder: same logic as `buildWindowsRound`, taking a ready-made spec.
 *
 * The tier-driven entry point below is now a thin wrapper over this, so the endless-ladder flow and
 * the level-picker flow produce boards by exactly the same code path.
 */
function buildWindowsRoundFromSpec(board: WindowsLevel): WindowsRound {
  const count = board.countRange && board.countRange.length > 0 ? pick(board.countRange) : board.count;
  const sized: WindowsLevel = { ...board, count };

  if (board.tier === 3) {
    const scattered = scatteredPattern(sized);
    return {
      pattern: scattered.slice().sort((a, b) => a - b),
      count,
      cols: board.cols,
      rows: board.rows,
    };
  }

  const shapeBias = 0.9;
  let pattern: number[] | null = null;
  if (Math.random() < shapeBias) pattern = shapedPattern(sized);
  if (!pattern) pattern = grownPattern(sized);

  return {
    pattern: pattern.slice().sort((a, b) => a - b),
    count,
    cols: board.cols,
    rows: board.rows,
  };
}

/** Grows a connected cluster of `count` cells from a random seed. */
function grownPattern(level: WindowsLevel): number[] {
  const { cols, rows, count } = level;
  const at = (c: number, r: number) => r * cols + c;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const out = new Set<number>([
      at(Math.floor(Math.random() * cols), Math.floor(Math.random() * rows)),
    ]);

    for (let guard = 0; out.size < count && guard < 300; guard += 1) {
      const seed = pick([...out]);
      const c = seed % cols;
      const r = Math.floor(seed / cols);
      const options = (
        [
          [c - 1, r],
          [c + 1, r],
          [c, r - 1],
          [c, r + 1],
        ] as const
      ).filter(([nc, nr]) => nc >= 0 && nc < cols && nr >= 0 && nr < rows);
      if (options.length === 0) break;
      const [nc, nr] = pick(options);
      out.add(at(nc, nr));
    }

    if (out.size === count) return [...out];
  }

  // Unreachable for the grids this game uses, but a round must always be dealt.
  return Array.from({ length: count }, (_, i) => i);
}

/** True when the tapped set matches the lit pattern exactly. */
export function isWindowsMatch(pattern: number[], selected: number[]): boolean {
  if (pattern.length !== selected.length) return false;
  const wanted = new Set(pattern);
  return selected.every((index) => wanted.has(index));
}

/** How long the pattern stays lit, in milliseconds. */
export const WINDOWS_SHOW_MS = 1000;
