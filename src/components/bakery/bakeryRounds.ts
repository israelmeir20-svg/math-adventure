/**
 * Pure logic for the Cookie Bakery mini-game.
 *
 * The game alternates two intellectual modes so it never becomes repetitive:
 *   - `tray_grid`: multiplication as area (rows x columns on a baking sheet)
 *   - `box_pack` : division with remainder (boxes + the chef's snack)
 *
 * No React here - this module owns the arithmetic, the components own the UI.
 */

export const BAKERY_COOKIE_REWARD = 15;

/* ------------------------------ Shared bits ------------------------------ */

/** A multiple-choice answer that carries the value it represents. */
export interface BakeOption {
  value: number;
  correct: boolean;
}

/* --------------------------- Mode A: tray grid --------------------------- */

export interface TrayRound {
  kind: 'tray_grid';
  rows: number;
  cols: number;
  /** rows * cols - the total number of cookies baked. */
  total: number;
  options: BakeOption[];
  prompt: string;
}

/* ---------------------------- Mode B: box pack ---------------------------- */

export interface PackRound {
  kind: 'box_pack';
  /** Total loose cookies. */
  total: number;
  /** How many cookies fit in one box. */
  capacity: number;
  /** Full boxes to fill: floor(total / capacity). */
  boxes: number;
  /** Cookies left for the chef: total % capacity. */
  remainder: number;
  prompt: string;
}

export type BakeryRound = TrayRound | PackRound;

/* ------------------------------- Ranges ---------------------------------- */

const MIN_ROWS = 2;
const MAX_ROWS = 6;
const MIN_COLS = 2;
const MAX_COLS = 8;

const CAPACITIES = [3, 4, 5, 6] as const;
const MIN_TOTAL = 17;
const MAX_TOTAL = 38;

/* ------------------------------ Generators ------------------------------- */

/** Mode A: a rows x columns baking tray with four plausible options. */
export function buildTrayRound(): TrayRound {
  const rows = randInt(MIN_ROWS, MAX_ROWS);
  const cols = randInt(MIN_COLS, MAX_COLS);
  const total = rows * cols;

  return {
    kind: 'tray_grid',
    rows,
    cols,
    total,
    options: trayOptions(rows, cols),
    prompt: `אופים מגש עם ${rows} שורות ובכל שורה ${cols} עוגיות! כמה עוגיות נאפה בסך הכל?`,
  };
}

/**
 * Builds four options around R x C. Distractors are the classic multiplication
 * slips: adding instead of multiplying, and one group too many or too few.
 */
function trayOptions(rows: number, cols: number): BakeOption[] {
  const total = rows * cols;
  const candidates = [total, rows + cols, rows * (cols + 1), (rows + 1) * cols];

  const unique: number[] = [];
  for (const value of candidates) {
    if (value > 0 && !unique.includes(value)) unique.push(value);
  }
  // Fall back to neighbours if the arithmetic collapses onto a duplicate.
  let bump = 1;
  while (unique.length < 4 && bump < 20) {
    const fallback = total + bump * (bump % 2 === 0 ? 1 : -1);
    if (fallback > 0 && !unique.includes(fallback)) unique.push(fallback);
    bump += 1;
  }

  return shuffle(unique)
    .slice(0, 4)
    .map((value) => ({ value, correct: value === total }));
}

/**
 * Mode B: a total between 17 and 38 that is deliberately NOT a multiple of the
 * box capacity, so there is always something left for the chef to nibble.
 */
export function buildPackRound(): PackRound {
  const capacity = CAPACITIES[randInt(0, CAPACITIES.length - 1)] ?? 4;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const total = randInt(MIN_TOTAL, MAX_TOTAL);
    const remainder = total % capacity;
    // Skip exact multiples - the chef must always get a snack.
    if (remainder === 0) continue;
    return {
      kind: 'box_pack',
      total,
      capacity,
      boxes: Math.floor(total / capacity),
      remainder,
      prompt: `אורזים ${total} עוגיות בקופסאות של ${capacity}! כמה קופסאות נמלא, וכמה עוגיות יישארו לשף לנשנש? 😋`,
    };
  }

  // Deterministic fallback that still leaves a remainder.
  const total = MIN_TOTAL + (capacity % 3) + 1;
  return {
    kind: 'box_pack',
    total,
    capacity,
    boxes: Math.floor(total / capacity),
    remainder: total % capacity,
    prompt: `אורזים ${total} עוגיות בקופסאות של ${capacity}! כמה קופסאות נמלא, וכמה עוגיות יישארו לשף לנשנש? 😋`,
  };
}

/** Odd rounds bake (multiplication), even rounds pack (division). */
export function buildRound(index: number): BakeryRound {
  return index % 2 === 0 ? buildTrayRound() : buildPackRound();
}

/* ------------------------------- Helpers --------------------------------- */

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Fisher-Yates, so the right answer is never in a predictable slot. */
function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a !== undefined && b !== undefined) {
      copy[i] = b;
      copy[j] = a;
    }
  }
  return copy;
}

/** "3 x 4 = 12" - the worked answer shown after a tray round. */
export function formatTrayFormula(round: TrayRound): string {
  return `${round.rows} × ${round.cols} = ${round.total}`;
}

/** "17 ÷ 4 = 4 (שארית 1)" - the worked answer shown after a pack round. */
export function formatPackFormula(round: PackRound): string {
  return `${round.total} ÷ ${round.capacity} = ${round.boxes} (שארית ${round.remainder})`;
}
