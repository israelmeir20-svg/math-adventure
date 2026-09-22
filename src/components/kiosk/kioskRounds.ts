/**
 * Pure logic for the Kiosk: shopping totals, payment notes and change.
 * No React - denominations and validation live here.
 */

export interface KioskItem {
  nameHebrew: string;
  price: number;
  emoji: string;
}

/** Ready-made kiosk catalogue (prices in shekels). */
export const KIOSK_ITEMS: KioskItem[] = [
  { nameHebrew: 'ארטיק', price: 8, emoji: '🍦' },
  { nameHebrew: 'בייגלה', price: 14, emoji: '🥨' },
  { nameHebrew: 'מחברת', price: 15, emoji: '📓' },
  { nameHebrew: 'מיץ', price: 9, emoji: '🧃' },
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
];

/** Coins and notes the child can hand back. */
export const DENOMINATIONS = [1, 2, 5, 10, 20] as const;
export type Denomination = (typeof DENOMINATIONS)[number];

export interface KioskRound {
  items: KioskItem[];
  /** Sum of the purchased items. */
  total: number;
  /** The note the customer pays with: 50 or 100. */
  paidWith: number;
  /** Exact change owed = paidWith - total. */
  change: number;
}

const MIN_TOTAL = 12;
const MAX_TOTAL = 88;
const MAX_ITEMS = 3;
/** Totals below this get paid with a 50₪ note, at/above with a 100₪ note. */
const NOTE_THRESHOLD = 50;

/**
 * Builds a round whose total lands within the allowed band.
 * Roughly half the rounds deliberately land in the 100₪-note range so the
 * child practises both a 50₪ and a 100₪ subtraction.
 */
export function buildKioskRound(): KioskRound {
  const wantHundredNote = Math.random() < 0.5;
  const target =
    wantHundredNote && MAX_TOTAL - MAX_ITEMS >= NOTE_THRESHOLD
      ? randomInt(NOTE_THRESHOLD, MAX_TOTAL)
      : randomInt(MIN_TOTAL, NOTE_THRESHOLD - 1);

  const items = drawItemsClosestTo(target);
  const total = items.reduce((acc, item) => acc + item.price, 0);
  const paidWith = total < NOTE_THRESHOLD ? 50 : 100;
  return { items, total, paidWith, change: paidWith - total };
}

/** Draws 1..3 items whose sum is as close to `target` as possible. */
function drawItemsClosestTo(target: number): KioskItem[] {
  let best: KioskItem[] = [KIOSK_ITEMS[0] as KioskItem];
  let bestGap = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < 400; attempt += 1) {
    const count = 1 + Math.floor(Math.random() * MAX_ITEMS);
    const drawn: KioskItem[] = [];
    for (let i = 0; i < count; i += 1) {
      drawn.push(KIOSK_ITEMS[Math.floor(Math.random() * KIOSK_ITEMS.length)] as KioskItem);
    }
    const sum = drawn.reduce((acc, item) => acc + item.price, 0);
    if (sum < MIN_TOTAL || sum > MAX_TOTAL) continue;

    const gap = Math.abs(sum - target);
    if (gap < bestGap) {
      bestGap = gap;
      best = drawn;
    }
    if (gap <= 2) break;
  }
  return best;
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** The formula shown on success: "100 - 64 = 36₪". */
export function formatChangeFormula(round: KioskRound): string {
  return `${round.paidWith} - ${round.total} = ${round.change}₪`;
}

/** Hebrew hint describing how far off the tray total is. */
export function describeDifference(placed: number, change: number): string {
  const diff = placed - change;
  if (diff === 0) return 'בדיוק! 🎉';
  if (diff < 0) return `צריך עוד ${Math.abs(diff)}₪`;
  return `החזרת ${diff}₪ יותר מדי`;
}

/** Sum of the coins currently on the counter. */
export function sumCoins(coins: Denomination[]): number {
  return coins.reduce((acc, coin) => acc + coin, 0);
}

export const KIOSK_COOKIE_REWARD = 15;
