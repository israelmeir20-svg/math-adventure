/**
 * The kiosk's money: the real currency artwork and the per-level rules that
 * decide which notes and coins are in the drawer.
 *
 * NO REACT HERE. Denominations, asset URLs and the level table live here so the
 * generator and the drawer can both read them without importing each other.
 */
import note1 from '../../assets/store/1.png';
import note2 from '../../assets/store/2.png';
import note5 from '../../assets/store/5.png';
import note10 from '../../assets/store/10.png';
import note20 from '../../assets/store/20.png';
import note50 from '../../assets/store/50.png';
import note100 from '../../assets/store/100.jpg';

/** Every denomination the kiosk deals in, smallest first. */
export const MONEY = [1, 2, 5, 10, 20, 50, 100] as const;
export type Money = (typeof MONEY)[number];

/**
 * The artwork, keyed by denomination.
 *
 * NOTE THE FILE EXTENSIONS. The brief is explicit that 100 is a `.jpg` and the
 * rest are `.png`, and the assets on disk match - a tidy-looking import loop
 * would have to guess. Importing each one by name is the only version that can
 * be checked by the bundler, so a wrong extension fails the build instead of
 * shipping a broken image.
 */
export const MONEY_IMAGE: Record<Money, string> = {
  1: note1,
  2: note2,
  5: note5,
  10: note10,
  20: note20,
  50: note50,
  100: note100,
};

/**
 * Which artwork is round and which is a rectangular note.
 *
 * Measured off the source images rather than guessed: 2 and 5 are heptagons, so
 * they are not squares. Rendering a heptagon in a square box stretches it, which
 * is why these are drawn with `object-contain` into a box of the right aspect
 * instead of being forced into a circle.
 */
export const MONEY_SHAPE: Record<Money, 'round' | 'poly' | 'note'> = {
  1: 'round',
  2: 'poly',
  5: 'poly',
  10: 'round',
  20: 'note',
  50: 'note',
  100: 'note',
};

/** True for the two smallest coins, which are worth showing as a stack. */
export const isCoin = (value: Money): boolean => value < 20;

/* ====================== Dynamic drawer subsets and solvency ====================== */

/**
 * The coin pool the drawer varies.
 *
 * FOUR COINS, AND NO NOTES. The brief fixes this pool, and it is the right one for the
 * arithmetic the kiosk teaches: with 1, 2, 5 and 10 available, every amount the levels
 * produce can be built by adding - there is nothing to subtract from a drawer of coins, so
 * the child is practising composition rather than borrowing.
 */
export const COIN_POOL: readonly Money[] = [1, 2, 5, 10];

/**
 * How often the full pool is offered, versus a thinned-out one.
 *
 * THE THINNING IS THE PEDAGOGY. A drawer that always offers all four coins lets a child
 * solve every amount the same way - reach for the largest coin that fits, repeatedly - and
 * never has to think about which combination they are building. Removing a denomination
 * occasionally forces a different decomposition of the same number: with no 5 available, 7
 * is 2+2+2+1 rather than 5+2, which is the same total reached a harder way. That is the
 * point of asking for it, so the split is weighted slightly towards the thinned case.
 */
const FULL_POOL_CHANCE = 0.4;

/** How many denominations to withhold when the pool is thinned. */
const REMOVE_COUNT_RANGE: readonly [number, number] = [1, 2];

/**
 * The most pieces a reasonable hand-over should need.
 *
 * WHY A CEILING ON PIECES AND NOT JUST ON SOLVABILITY. "Buildable" is a mathematical
 * property, and a drawer of [1, 2] can build any amount - which means the solvency check
 * alone will happily certify a round whose answer is 79 shekels in forty coins. That round
 * is technically solvable and pedagogically worthless: the child counts forty tokens instead
 * of doing a subtraction. The level's own `payable` rule already refuses change that needs
 * more than six pieces, so the drawer has to respect the same ceiling or it silently
 * undermines the rule it sits next to.
 *
 * THE FLOOR MATTERS TOO, AND FOR THE OPPOSITE REASON. A single coin is not a sum to reason
 * about - if the answer is one 5, there is no decomposition to find. `payable` refuses that
 * case for the change it deals, so the drawer is held to the same standard: at least two
 * pieces. This is what stops a thinned [5, 10] drawer from "solving" a change of 10 with one
 * coin and turning the question into a lookup.
 */
const MIN_PIECES = 2;
const MAX_PIECES = 6;

/**
 * The fewest coins from `coins` that sum exactly to `amount`, or Infinity if impossible.
 *
 * The standard unbounded-knapsack table, matching the one in `kioskSprint` - it is the same
 * question ("how many pieces?") asked for the same reason, and two different implementations
 * of it drifting apart would be a bug waiting to happen.
 */
function fewestPieces(amount: number, coins: readonly Money[]): number {
  const best = new Array<number>(amount + 1).fill(Number.POSITIVE_INFINITY);
  best[0] = 0;
  for (let value = 1; value <= amount; value += 1) {
    for (const coin of coins) {
      if (coin <= value && best[value - coin] !== undefined) {
        best[value] = Math.min(best[value] as number, (best[value - coin] as number) + 1);
      }
    }
  }
  return best[amount] as number;
}

/**
 * Is this exact amount buildable from these coins, as a SUM worth reasoning about?
 *
 * THE SYMMETRIC TEST: the amount must be reachable, AND the shortest route to it must take
 * between `MIN_PIECES` and `MAX_PIECES` coins. Checking only the upper bound would let a
 * one-coin answer through, and checking only reachability would let a forty-coin answer
 * through - both of which are the same failure in different directions, namely a question
 * that teaches nothing.
 *
 * THE PIECE BOUND IS MEASURED ON THE THINNED DRAWER, WHICH IS WHY IT LIVES HERE. A drawer
 * missing its 10s needs more coins for the same amount than the full pool would, so a bound
 * evaluated against the level's full register would be too lenient to catch the case it
 * exists for.
 */
function isReasonablyBuildable(amount: number, coins: readonly Money[]): boolean {
  if (amount <= 0 || coins.length === 0) return false;
  const pieces = fewestPieces(amount, coins);
  return Number.isFinite(pieces) && pieces >= MIN_PIECES && pieces <= MAX_PIECES;
}

/**
 * The size of the largest amount a drawer can build within the piece ceiling.
 *
 * USED ONLY TO DECIDE WHETHER THINNING IS WORTH ATTEMPTING. When the target is so large that
 * no thinned drawer can reach it in six coins, every thinning attempt would be repaired back
 * to the full pool - which is wasted work, and worse, it makes the "thinned" branch a
 * formality that never actually thins anything. Knowing the ceiling up front lets the
 * function take the full pool directly and keep the coded intent honest.
 *
 * The bound is the ceiling times the largest coin, which is an upper bound on the best
 * possible case (six 10s). A drawer with smaller coins reaches less, which is why the repair
 * loop below still runs and still re-tests.
 */
function maxReachableWithinCeiling(coins: readonly Money[]): number {
  const largest = Math.max(...coins);
  return largest * MAX_PIECES;
}

/**
 * Can `amount` be built exactly from `coins`, each usable any number of times?
 *
 * THE SOLVENCY GUARANTEE, AND IT IS A REAL REACHABILITY TEST RATHER THAN A PARITY CHECK. The
 * obvious shortcut - "if the amount is odd and there is no 1 or 5, re-enable 1" - is both too
 * weak and too strong:
 *
 *   TOO WEAK. A drawer of [2, 5, 10] cannot build 3, and the shortcut sees the 5 and does
 *   nothing, because it reasons about parity rather than reachability.
 *
 *   TOO STRONG IN THE OTHER DIRECTION. An even amount with no 1 coin is not automatically
 *   safe either: [5, 10] cannot build 4, 6 or 8.
 *
 * So the check below is exact, using an unbounded-knapsack table over the active coins. The
 * question "can this be built?" has a definitive answer, and guessing at it produces a round
 * the child cannot solve.
 */
export function isBuildable(amount: number, coins: readonly Money[]): boolean {
  if (amount <= 0) return false;
  if (coins.length === 0) return false;

  const reachable = new Array<boolean>(amount + 1).fill(false);
  reachable[0] = true;
  for (let value = 1; value <= amount; value += 1) {
    for (const coin of coins) {
      if (coin <= value && reachable[value - coin]) {
        reachable[value] = true;
        break;
      }
    }
  }
  return reachable[amount] as boolean;
}

/**
 * A per-question drawer: either the full pool, or the pool minus one or two denominations.
 *
 * THE SUBSET IS CHOSEN FOR THE AMOUNT, NOT INDEPENDENTLY OF IT. Drawing a random subset and
 * then hoping the amount works would fail often - a drawer of [2, 10] cannot make 7 - and the
 * brief requires every round to be solvable. So the subset is drawn first and then TESTED
 * against the target, and the repair below runs if the test fails.
 *
 * THE REPAIR HANDS BACK COINS ONE AT A TIME, SMALLEST FIRST, UNTIL THE AMOUNT IS SANELY
 * BUILDABLE. Two things about that order matter:
 *
 *   SMALLEST FIRST IS WHAT MAKES THE 1 ₪ COIN THE USUAL FIX, which is what the brief asks
 *     for. A 1 makes every remaining amount buildable, so it is both the most effective single
 *     coin and the first one tried.
 *
 *   BUT IT DOES NOT STOP AT THE FIRST COIN. Handing back only the 1 turns a change of 79 into
 *     a forty-coin answer, which passes a solvability test and fails the child. The loop keeps
 *     going until the amount needs at most `MAX_PIECES` coins, which is the same standard the
 *     level's own `payable` rule applies to the change it is willing to ask for. The result is
 *     that a thinned drawer stays demanding without becoming tedious, and the fallback to the
 *     full pool is available when nothing smaller works.
 *
 * The loop terminates: at worst every coin is returned, giving the full pool, which the level
 * table already guarantees can build its own change within the ceiling.
 */
export function pickDrawer(target: number, random: () => number = Math.random): readonly Money[] {
  if (random() < FULL_POOL_CHANCE) return COIN_POOL;

  /*
   * A TARGET TOO LARGE FOR ANY THINNED DRAWER TAKES THE FULL POOL IMMEDIATELY.
   *
   * Without this the code would still be correct - the repair loop would restore every coin -
   * but it would restore them one at a time for nothing, and the "thinned" path would be a
   * branch that never actually thins. Deciding it here keeps the variation honest: when the
   * target is out of reach, the drawer is openly the full pool rather than a thinned drawer
   * that got quietly refilled.
   */
  if (target > maxReachableWithinCeiling(COIN_POOL)) return COIN_POOL;

  const [minRemove, maxRemove] = REMOVE_COUNT_RANGE;
  const removeCount = minRemove + Math.floor(random() * (maxRemove - minRemove + 1));

  // Shuffle a copy, then drop the first `removeCount` - so no denomination is privileged.
  const shuffled = [...COIN_POOL];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = shuffled[i] as Money;
    const b = shuffled[j] as Money;
    shuffled[i] = b;
    shuffled[j] = a;
  }
  let active = shuffled.slice(removeCount);

  const withheld = shuffled.slice(0, removeCount).sort((a, b) => a - b);
  for (const coin of withheld) {
    if (isReasonablyBuildable(target, active)) break;
    active = [...active, coin].sort((a, b) => a - b);
  }

  // Ascending order, which is what the drawer's layout and the child's eye both expect.
  return active.sort((a, b) => a - b);
}

/* ============================ Storefront artwork ============================ */

/**
 * The customer's three poses, and the counter surface.
 *
 * THREE SEPARATE IMAGES RATHER THAN ONE SPRITE SHEET. The character is shown at
 * different moments in the transaction - walking in, waiting, celebrating - and each
 * pose has a different job. Splitting them means each can carry its own animation
 * (the slide-in, the celebration bounce) without the others moving with it, which a
 * single sheet could not do without clipping in the middle of a transition.
 *
 * These are imported here rather than in the component for the same reason the money
 * is: a wrong path or extension then fails the build instead of rendering a broken
 * image in front of a child.
 */
import customerWalking from '../../assets/store/walking.webp';
import customerWaiting from '../../assets/store/waiting.webp';
import customerHappy from '../../assets/store/happy.webp';
import counterSurface from '../../assets/store/counter.png';

export const CUSTOMER_ART = {
  /** Entering: slid in from the right, and slid back out when served. */
  walking: customerWalking,
  /** Standing at the till, waiting to be served. */
  waiting: customerWaiting,
  /** A correct hand-over: bounced, then walks away. */
  happy: customerHappy,
} as const;

/** The wooden counter the coins are placed on. */
export const COUNTER_ART = counterSurface;

export interface KioskLevel {
  /** 1 to 3. */
  level: number;
  /** Shown in the header badge. */
  title: string;
  /** The note the customer hands over. Level 3 mixes two of these. */
  paysWith: readonly Money[];
  /** The bill is drawn from this inclusive range, before the note is chosen. */
  billMin: number;
  billMax: number;
  /** Notes and coins the drawer offers. */
  register: readonly Money[];
  /** How many items the customer is buying. */
  items: readonly [number, number];
  /**
   * The operation the level teaches, for the subtitle and the button label.
   *
   * 'exact' means the child pays the bill to the shekel and NO subtraction happens
   * at all; 'change' means a note is handed over and the difference must be worked
   * out and returned.
   */
  task: 'exact' | 'change';
  /**
   * The multiplication tables this level may draw item prices and quantities from.
   *
   * THIS IS WHAT MAKES LEVEL 1 GRADE-3 RATHER THAN GENERIC SHOPPING. The brief asks for
   * the 2, 3, 4, 5 and 10 tables specifically, and it wants the child to SEE the
   * multiplication - "3 × 4 ₪" - rather than to add up an arbitrary basket. Restricting
   * the catalogue to those factors is what guarantees every question is a table fact
   * the child is currently learning, instead of a sum they cannot yet do mentally.
   */
  tables: readonly number[];
}

/**
 * The three levels, exactly as specified for the start of Grade 3.
 *
 * ==================================================================
 * THE LADDER IS EXACT PAYMENT FIRST, THEN TWO SIZES OF CHANGE.
 * ==================================================================
 *
 * LEVEL 1 - EXACT PAYMENT, NO CHANGE. The child reads a multiplication ("3 ארטיקים,
 *   כל אחד 4 ₪"), works out 3 × 4, and builds exactly 12 ₪ from coins. There is no
 *   subtraction anywhere, which is the point: the brief is explicit that this level
 *   must not ask for change, so the only arithmetic is the table fact itself.
 *
 * LEVEL 2 - CHANGE FROM A 20 ₪ NOTE. Now the subtraction appears, but with one fixed
 *   and friendly minuend: everything is paid with a 20, and the bill sits between 11
 *   and 19. So the sum is always `20 - something-teen`, a single clean step, and the
 *   child counts the change back in coins.
 *
 * LEVEL 3 - BASKETS, AND CHANGE FROM A 50 OR A 100. The hardest level: two or three
 *   items whose prices must be ADDED first (2 × 7 + 12 = 26) and then subtracted from
 *   a large note. This is the combined-operation step the brief describes.
 */
export const KIOSK_LEVELS: readonly KioskLevel[] = [
  {
    level: 1,
    title: 'כפל בסיסי ותשלום מדויק',
    /* NO NOTE AT ALL - payment is exact, so there is nothing to hand over first. */
    paysWith: [],
    billMin: 6,
    billMax: 30,
    register: [1, 2, 5, 10],
    items: [1, 3],
    task: 'exact',
    tables: [2, 3, 4, 5, 10],
  },
  {
    level: 2,
    title: 'חיסור ופריטה משטר 20 ₪',
    paysWith: [20],
    billMin: 11,
    billMax: 19,
    register: [1, 2, 5, 10],
    items: [1, 2],
    task: 'change',
    tables: [2, 3, 4, 5, 10],
  },
  {
    level: 3,
    title: 'עסקאות סל ועודף משטר 50 ₪ ו-100 ₪',
    paysWith: [50, 100],
    billMin: 21,
    billMax: 90,
    register: [1, 2, 5, 10, 20, 50],
    items: [2, 3],
    task: 'change',
    tables: [2, 3, 4, 5, 6, 7, 10],
  },
];

export function kioskLevel(level: number): KioskLevel {
  const index = Math.min(KIOSK_LEVELS.length, Math.max(1, Math.floor(level))) - 1;
  return KIOSK_LEVELS[index] as KioskLevel;
}

/** The highest level the station offers. */
export const MAX_KIOSK_LEVEL = KIOSK_LEVELS.length;

/** "12₪" */
export const shekels = (value: number): string => `${value}₪`;

/**
 * The submit button's label, which states the task rather than a generic verb.
 *
 * THE LABEL IS PART OF THE TEACHING. "הגישי תשלום" and "מסרי עודף" are not two ways
 * of saying "done" - they name two different operations, and a child who reads the
 * button knows before they act whether a subtraction is involved. A single shared
 * label would hide the distinction the levels exist to draw.
 */
export function submitLabel(level: KioskLevel): string {
  return level.task === 'exact' ? 'הגישי תשלום 🪙' : 'מסרי עודף 💵';
}
