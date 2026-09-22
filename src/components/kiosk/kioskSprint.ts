/**
 * Pure logic for the kiosk sprint: customer transactions and medal scoring.
 *
 * THE BILL AND THE PAYMENT NOTE ARE NOT INDEPENDENT. The brief pins each level
 * to one note (20, 50, 100) and a bill range, and it also requires the change to
 * be payable FROM THAT LEVEL'S REGISTER. Those two constraints have to be solved
 * together, because a bill of 95 paid with a 100 leaves 5 shekels of change - a
 * single coin, which is not change-making at all - while the same bill paid with
 * a 50 is impossible.
 *
 * So the generator walks the bill outward from a random start, in BOTH
 * directions, and takes the first value whose change is payable. That produces a
 * bill anywhere in the level's band rather than always the same "nice" one, and
 * it can never emit a transaction the drawer cannot actually settle.
 */
import { isCoin, kioskLevel, pickDrawer, type KioskLevel, type Money } from './kioskMoney';

export interface KioskItem {
  nameHebrew: string;
  price: number;
  emoji: string;
}

/** Ready-made kiosk catalogue, priced so single items can reach a 95 shekel bill. */
export const KIOSK_ITEMS: KioskItem[] = [
  { nameHebrew: 'ארטיק', price: 8, emoji: '🍦' },
  { nameHebrew: 'בייגלה', price: 14, emoji: '🥨' },
  { nameHebrew: 'מחברת', price: 15, emoji: '📓' },
  { nameHebrew: 'מיץ', price: 8, emoji: '🧃' },
  { nameHebrew: 'במבה', price: 6, emoji: '🥜' },
  { nameHebrew: 'שוקולד', price: 12, emoji: '🍫' },
  { nameHebrew: 'עיפרון', price: 5, emoji: '✏️' },
  { nameHebrew: 'סופגנייה', price: 7, emoji: '🍩' },
  { nameHebrew: 'ספר צביעה', price: 22, emoji: '🎨' },
  { nameHebrew: 'משחק קופסה', price: 26, emoji: '🎲' },
  { nameHebrew: 'כדור', price: 18, emoji: '⚽' },
  { nameHebrew: 'אוזניות', price: 35, emoji: '🎧' },
  { nameHebrew: 'קלמר', price: 24, emoji: '🖊️' },
  { nameHebrew: 'מחזיק מפתחות', price: 11, emoji: '🔑' },
  { nameHebrew: 'חטיף', price: 9, emoji: '🍿' },
  { nameHebrew: 'מחברת ציור', price: 17, emoji: '🖍️' },
  { nameHebrew: 'יוגורט', price: 4, emoji: '🥛' },
  { nameHebrew: 'עוגייה', price: 3, emoji: '🍪' },
  { nameHebrew: 'פאזל', price: 31, emoji: '🧩' },
  { nameHebrew: 'קלפים', price: 13, emoji: '🃏' },
  // Larger goods, so a 50 and a 100 note have something to actually be spent on.
  // Without these the dearest thing in the shop was 35, the dearest basket of two
  // was 70, and Levels 3 and 4 could not reach most of the 35-95 band they claim.
  { nameHebrew: 'תיק גב', price: 52, emoji: '🎒' },
  { nameHebrew: 'רמקול', price: 44, emoji: '🔊' },
  { nameHebrew: 'משחק הרכבה', price: 38, emoji: '🧱' },
  { nameHebrew: 'כרית', price: 29, emoji: '🛋️' },
  { nameHebrew: 'מטען', price: 33, emoji: '🔌' },
  { nameHebrew: 'ספר קריאה', price: 40, emoji: '📚' },
  { nameHebrew: 'מצלמה', price: 27, emoji: '📷' },
  { nameHebrew: 'שעון יד', price: 19, emoji: '⌚' },
];

export interface KioskTransaction {
  items: KioskItem[];
  /** What the customer owes. */
  bill: number;
  /** The note they hand over, or null when payment is exact (Level 1). */
  paidWith: Money | null;
  /** How much change is owed: paidWith - bill. Zero on an exact-payment level. */
  change: number;
  /** The drawer the child can build the payment or change from. */
  register: readonly Money[];
  /**
   * The multiplication the question teaches, when this is a table question.
   *
   * PRESENT ONLY ON LEVEL 1, AND IT IS THE QUESTION. The brief wants the child to see
   * "3 × 4 ₪" - the quantity and the unit price stated as a multiplication - rather
   * than to infer it from a receipt. When this is set, the bubble shows the
   * multiplication and the item list is a single repeated line, because the whole
   * point is that 3 identical items at 4 shekels each IS the table fact.
   */
  table?: { count: number; price: number };
}

/**
 * How many medal tiers, and what each needs.
 *
 * RETUNED FOR THE 75-SECOND ROUND. These were 4/2 against a 30-second sprint, where
 * each customer takes roughly six seconds of counting change. The clock is now two and
 * a half times longer AND a correct answer buys five extra seconds, so the same bars
 * would make gold almost automatic. 7/3 keeps the ladder honest: gold still requires a
 * brisk, accurate run, and the +5s bonus is what makes it reachable rather than the
 * bars having been lowered for it.
 */
export const MEDAL_FOR_SERVED: ReadonlyArray<{ min: number; medal: MedalKind }> = [
  { min: 7, medal: 'gold' },
  { min: 3, medal: 'silver' },
  { min: 0, medal: 'bronze' },
];

export type MedalKind = 'bronze' | 'silver' | 'gold';

export const MEDAL_EMOJI: Record<MedalKind, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
};

export const MEDAL_LABEL: Record<MedalKind, string> = {
  bronze: 'ארד',
  silver: 'כסף',
  gold: 'זהב',
};

export function medalFor(served: number): MedalKind {
  const tier = MEDAL_FOR_SERVED.find((entry) => served >= entry.min) ?? MEDAL_FOR_SERVED[2];
  return (tier as { medal: MedalKind }).medal;
}

/** The base length of a round, in seconds. */
export const SPRINT_SECONDS = 75;

/**
 * Seconds added to the clock for each correctly served customer.
 *
 * ACCURACY IS REWARDED WITH TIME RATHER THAN WITH POINTS. The brief asks for accuracy
 * to beat speed, and the cleanest way to say that inside a countdown is to give the
 * careful child more of the thing the countdown measures. A score bonus would reward
 * speed after the fact; a time bonus actively buys back the seconds spent thinking,
 * so working out the change properly is never the slower strategy.
 */
export const BONUS_SECONDS = 5;

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = items[i] as T;
    const b = items[j] as T;
    items[i] = b;
    items[j] = a;
  }
}

/**
 * The smallest number of pieces that add up to `amount` using only `coins`.
 *
 * A greedy pass is not enough on its own: with a drawer of 1/2/5/10 the amount 6
 * is greedy 5+1 (two pieces, correct) but with only 2/5/10 available greedy
 * fails outright on 6 while 2+2+2 works. This is the standard unbounded
 * coin-change table, so the answer is exact.
 */
function fewestPieces(amount: number, coins: readonly Money[]): number {
  const best = new Array<number>(amount + 1).fill(Number.POSITIVE_INFINITY);
  best[0] = 0;
  for (let value = 1; value <= amount; value += 1) {
    for (const coin of coins) {
      if (coin <= value && best[value - coin] !== undefined) {
        const candidate = (best[value - coin] as number) + 1;
        if (candidate < (best[value] as number)) best[value] = candidate;
      }
    }
  }
  return best[amount] as number;
}

/**
 * Can this change actually be built from this register?
 *
 * The reason this matters more than it looks: the drawer shows the child a
 * LIMITED set of money. If the generator hands them a bill whose change needs a
 * 50 that the drawer is hiding, the customer becomes unservable and the sprint
 * becomes a soft-lock. So every generated transaction is validated here.
 *
 * The upper bound also rejects the degenerate cases the brief's pedagogy rules
 * out: change that is a single coin (no subtraction to reason about) and change
 * that is more than six pieces (tedious rather than instructive).
 */
function payable(change: number, register: readonly Money[]): boolean {
  if (change <= 0) return false;
  const pieces = fewestPieces(change, register);
  if (!Number.isFinite(pieces)) return false;
  return pieces >= 2 && pieces <= 6;
}

/** Draws `count` items whose prices sum to exactly `bill`, or null. */
function itemsFor(bill: number, count: number): KioskItem[] | null {
  if (count === 1) {
    const single = KIOSK_ITEMS.find((item) => item.price === bill);
    return single ? [single] : null;
  }
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const basket: KioskItem[] = [];
    let sum = 0;
    let ok = true;
    for (let i = 0; i < count; i += 1) {
      const item = pick(KIOSK_ITEMS);
      // No duplicates: a receipt that lists the same thing twice reads as a bug.
      if (basket.some((existing) => existing.nameHebrew === item.nameHebrew)) {
        ok = false;
        break;
      }
      basket.push(item);
      sum += item.price;
    }
    if (ok && sum === bill) return basket;
  }
  return null;
}

/**
 * Draws a basket for `bill`, within the level's item range.
 *
 * THE RANGE IS A CEILING. A first version treated `items[0]` as a minimum and
 * grew the basket to three items to reach the dearer bills - which quietly broke
 * Level 1, where the brief specifies a single item and a bill of 5 to 19. If the
 * band's upper end is genuinely unreachable at this level's basket size, the
 * right answer is to skip that bill, not to sell the child three things.
 */
function basketFor(bill: number, range: readonly [number, number]): KioskItem[] | null {
  const [min, max] = range;
  for (let count = min; count <= max; count += 1) {
    const basket = itemsFor(bill, count);
    if (basket) return basket;
  }
  return null;
}

/**
 * Builds one customer.
 *
 * THREE DIFFERENT CONSTRUCTIONS, ONE PER LEVEL SHAPE. They are not variations on a
 * single recipe, because the arithmetic they teach is different in kind:
 *
 *   EXACT (Level 1) - a TABLE QUESTION. The quantity comes from the level's tables and
 *     the unit price is the other factor, so the bill is a product the child is
 *     currently learning. There is no note and no subtraction.
 *
 *   CHANGE FROM 20 (Level 2) - one or two items summing to 11..19, paid with a 20.
 *
 *   CHANGE FROM 50/100 (Level 3) - a two- or three-item basket, added up first and then
 *     subtracted from a large note.
 *
 * THE EXACT AND CHANGE PATHS ARE SEPARATE FUNCTIONS RATHER THAN ONE FUNCTION WITH A
 * FLAG. A flag would have to guard every subtraction in the shared body, and the
 * Level 1 path must not merely skip the subtraction - it must not have one available
 * to leak into a hint. Keeping them apart means the exact-payment construction has no
 * `note - bill` expression anywhere in it.
 */
export function buildTransaction(level: number): KioskTransaction {
  const spec = kioskLevel(level);
  const built = spec.task === 'exact' ? buildExactTransaction(spec) : buildChangeTransaction(spec);

  /*
   * THE DRAWER IS RESOLVED LAST, BECAUSE IT DEPENDS ON THE ANSWER.
   *
   * The target the child must build is the bill on an exact-payment level and the change on
   * a change level - and only the finished transaction knows either. So the subset is drawn
   * against that final number rather than in advance: a drawer picked before the amount
   * existed would be blind to whether it could build it, and the solvency guarantee in
   * `pickDrawer` needs the number to test against.
   *
   * NOTES ARE NOT PART OF THE VARIATION. On Levels 2 and 3 the customer's note is the point
   * of the question and the child never rebuilds it, so the note stays in the drawer and only
   * the COIN pool is thinned. That keeps the variation confined to the piece of the drawer
   * the child is actually composing with.
   */
  const target = spec.task === 'exact' ? built.bill : built.change;
  const coins = pickDrawer(target);
  const notes = spec.register.filter((value) => !isCoin(value));

  return { ...built, register: [...coins, ...notes] };
}
/**
 * Level 1: a multiplication the child pays exactly.
 *
 * THE QUESTION IS THE PRODUCT, AND IT IS FORCED TO BE ONE. Both factors come from the
 * level's table list, so every customer asks a realised table fact - 3 × 4, 5 × 2,
 * 10 × 3 - rather than a basket whose total happens to be reachable. That is what the
 * brief means by "multiplication focus": the child should be recalling 3 × 4, not
 * adding three prices they have to read first.
 *
 * THE PRICE IS THE SECOND FACTOR, so the item is chosen from those priced at it, and
 * the catalogue is filtered rather than rerolled - a retry loop against a table with
 * few matching items would be slow and could still fail.
 */
function buildExactTransaction(spec: KioskLevel): KioskTransaction {
  const tables = spec.tables.length > 0 ? spec.tables : [2, 3, 4, 5, 10];

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const price = pick(tables);
    const count = pick(tables);
    const bill = price * count;

    // The brief's band for this level. Products outside it are skipped rather than
    // clamped, because clamping would break the multiplication it is meant to show.
    if (bill < spec.billMin || bill > spec.billMax) continue;

    const candidates = KIOSK_ITEMS.filter((item) => item.price === price);
    if (candidates.length === 0) continue;

    const item = pick(candidates);
    return {
      // The SAME item listed `count` times, which is what makes the receipt read as a
      // repeated addition and therefore as a multiplication.
      items: Array.from({ length: count }, () => item),
      bill,
      paidWith: null,
      change: 0,
      register: spec.register,
      table: { count, price },
    };
  }

  // Every factor pair in the tables is out of band would be a table error, but a sprint
  // must still deal: 3 × 4 is in band for every level that uses this path.
  const fallbackItem = KIOSK_ITEMS.find((item) => item.price === 4) ?? (KIOSK_ITEMS[0] as KioskItem);
  return {
    items: [fallbackItem, fallbackItem, fallbackItem],
    bill: 12,
    paidWith: null,
    change: 0,
    register: spec.register,
    table: { count: 3, price: 4 },
  };
}

/**
 * Levels 2 and 3: a note is handed over and the difference must be returned.
 *
 * The bill is searched outward from a random point inside the level's band, so every
 * level produces a spread of bills rather than a handful of repeats, and the very
 * first acceptable one wins.
 */
function buildChangeTransaction(spec: KioskLevel): KioskTransaction {
  const note = pick(spec.paysWith);
  const span = spec.billMax - spec.billMin + 1;
  const start = randInt(spec.billMin, spec.billMax);
  const change = (bill: number) => note - bill;

  // Walk outward from `start`, alternating below and above, within the band.
  const order: number[] = [];
  for (let step = 0; step < span; step += 1) {
    const below = start - step;
    const above = start + step;
    if (below >= spec.billMin && below <= spec.billMax) order.push(below);
    if (step > 0 && above >= spec.billMin && above <= spec.billMax) order.push(above);
  }

  // A HANDFUL OF BILLS ARE REJECTED, AND THEY ARE REJECTED FOR A GOOD REASON:
  // the ones whose change is a SINGLE coin (change of 50, 20, 10 or 5). Those need no
  // subtraction at all, which is the one thing this level exists to practise.
  //
  // Because the walk takes the FIRST acceptable bill it finds, the most common
  // rejection it can meet is one of those, and it then falls to the neighbour - which
  // is always a much smaller bill. Shuffling the candidates first keeps the whole band
  // in play without ever returning an unpayable bill.
  shuffleInPlace(order);

  for (const bill of order) {
    if (!payable(change(bill), spec.register)) continue;
    const basket = basketFor(bill, spec.items);
    if (!basket) continue;
    return { items: basket, bill, paidWith: note, change: change(bill), register: spec.register };
  }

  // A level whose band cannot produce a payable bill would be a bug in the level
  // table, not a runtime condition - but a sprint must never stall, so fall back
  // to one combination that is payable for every level's drawer.
  const fallbackBill = note === 20 ? 13 : 32;
  return {
    items: basketFor(fallbackBill, spec.items) ?? [KIOSK_ITEMS[0] as KioskItem],
    bill: fallbackBill,
    paidWith: note,
    change: note - fallbackBill,
    register: spec.register,
  };
}

/** Sum of a set of placed pieces. */
export function sumPieces(values: readonly Money[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** "100 - 64 = 36₪" - the worked answer, shown only after a correct hand-over. */
export function formatChange(bill: number, paidWith: Money, change: number): string {
  return `${paidWith} - ${bill} = ${change}₪`;
}

/**
 * "3 × 4 = 12₪" - the worked multiplication, shown after an exact payment.
 *
 * THE ANSWER IS SHOWN AS A MULTIPLICATION, NEVER AS A SUM. Writing "4 + 4 + 4 = 12" would
 * teach repeated addition, which is the step BEFORE the one this level is practising. The
 * child is meant to be recalling the table fact, so the confirmation states it as one.
 */
export function formatTable(count: number, price: number): string {
  return `${count} × ${price} = ${count * price}₪`;
}

/** True when a placed set is exactly the change owed. */
export function isExact(placed: readonly Money[], change: number): boolean {
  return sumPieces(placed) === change;
}

/**
 * The number of pieces a child has to reason about, used only to keep the
 * difficulty inside the level's band.
 */
export const coinCount = (pieces: readonly Money[]): number => pieces.filter((p) => isCoin(p)).length;
