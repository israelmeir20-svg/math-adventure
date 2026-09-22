/**
 * Pure logic for the Cookie Bakery's 30-second multiplication sprint.
 *
 * No React here. This module owns the four levels, the five question types and
 * the arithmetic behind them; the components own the tray and the buttons.
 *
 * THE FIVE TYPES ARE ONE STIMULUS WITH FIVE QUESTIONS. Every type renders the
 * same R x C tray, because the tray IS the multiplication - what changes is what
 * the child is asked to do with it. Type 1 reads the total off it, Type 2 reads
 * it backwards as an equation, Type 3 reads an area inside it, Type 4 reads it
 * once with holes in it, Type 5 reads two of them against each other. That is
 * the whole reason the game can be played at speed: there is never a new diagram
 * to decode, only a new question about the diagram already on screen.
 *
 * EVERY TRAP IS A MULTIPLICATION MISCONCEPTION, NOT A RANDOM NUMBER. The
 * distractors are chosen deliberately: R + C (adding the sides instead of
 * multiplying them), R x (C+1) and (R+1) x C (one row or column too many), and
 * R x C +/- C (an off-by-one group). A wrong answer therefore tells the child
 * something; a random one would only tell them they guessed.
 */

/**
 * The visual question types.
 *
 * `candy` is the Grade-3 two-step question: the tray is `rows x cols` cookies and each
 * cookie carries `candies` sweets, so the total is `rows x cols x candies`. `nibbled` asks
 * how many are MISSING rather than how many are left, which is the subtraction read
 * backwards and the harder of the two.
 */
export type SprintType = 'classic' | 'match' | 'candy' | 'nibbledLeft' | 'nibbledMissing' | 'compare';

/** How many options each type offers. `compare` is a three-way choice. */
export const OPTION_COUNT = 4;

export interface SprintLevel {
  /** 1 to 3. */
  level: number;
  /** Shown in the header chip. */
  title: string;
  /** The R x C trays this level draws from. */
  grids: ReadonlyArray<readonly [number, number]>;
  /** The types mixed at this level. */
  types: readonly SprintType[];
  /**
   * How many candies each flavour cookie carries, when this level asks a candy question.
   *
   * THE THIRD FACTOR, AND IT IS A LEVEL PROPERTY RATHER THAN A DRAW. Level 3's question is
   * `rows x cols x candies`, and for that to be answerable the child has to be able to see
   * and count the candies on one cookie - which only works if EVERY cookie on the tray
   * carries the SAME number. Drawing the count per cookie would make the tray uncountable.
   */
  candies: number;
}

/**
 * The three levels, per the Grade-3 brief.
 *
 * ==================================================================
 * LEVEL 1 IS FULL TRAYS AND TWO READINGS OF THE SAME DIAGRAM.
 * ==================================================================
 *
 * The tray is complete - no holes, no sub-blocks - and the level alternates between reading
 * its total ("כמה עוגיות יש?") and matching it to the multiplication that produces it
 * ("איזה תרגיל מתאים?"). Those are the two directions of the same fact, and alternating them
 * is what stops the child from learning to map shapes to numbers by rote.
 *
 * The grids are the 2, 3, 4 and 5 tables, capped so the largest tray is 5x5 = 25 items.
 *
 * ==================================================================
 * LEVEL 2 PUTS HOLES IN THE TRAY.
 * ==================================================================
 *
 * Now the tray is incomplete, which turns a multiplication into a multiplication AND a
 * subtraction. The two readings alternate: how many are LEFT (count the remainder) and how
 * many are MISSING (count the whole, subtract what remains). The second is the harder
 * question and is asked as often as the first, deliberately - it is the one that needs the
 * full product to be worked out rather than just the visible cookies counted.
 *
 * ==================================================================
 * LEVEL 3 ASKS FOR THE CANDIES, WHICH IS A THREE-FACTOR PRODUCT.
 * ==================================================================
 *
 * `rows x cols x candies` is the two-step multiplication the brief asks for. It is genuinely
 * two multiplications rather than one harder one: the child can find the cookies first
 * (`rows x cols`) and then multiply by the candies, or count candies per row. The grids are
 * kept SMALL here even though the level is the hardest, because the numbers grow fast - a
 * 4x4 tray with 4 candies is already 64 - and a large tray would push the total out of the
 * range a Grade-3 child can hold in their head.
 */
export const SPRINT_LEVELS: readonly SprintLevel[] = [
  {
    level: 1,
    title: 'שוליית המאפייה',
    grids: [
      [2, 2],
      [2, 3],
      [3, 2],
      [3, 3],
      [2, 4],
      [4, 2],
      [3, 4],
      [4, 3],
      [4, 4],
      [5, 5],
    ],
    types: ['classic', 'match'],
    candies: 0,
  },
  {
    level: 2,
    title: 'עוזרת האופה',
    grids: [
      [3, 4],
      [4, 4],
      [4, 5],
      [5, 4],
      [5, 5],
      [4, 6],
    ],
    types: ['nibbledLeft', 'nibbledMissing'],
    candies: 0,
  },
  {
    level: 3,
    title: 'שפית האופה',
    grids: [
      [2, 3],
      [3, 3],
      [2, 4],
      [3, 4],
      [4, 4],
    ],
    types: ['candy'],
    candies: 3,
  },
];

export function levelSpec(level: number): SprintLevel {
  const index = Math.min(SPRINT_LEVELS.length, Math.max(1, Math.floor(level))) - 1;
  return SPRINT_LEVELS[index] as SprintLevel;
}

/* --------------------------- The tray, as data ---------------------------- */

/** What sits in one slot of the tray. */
export type SlotKind = 'cookie' | 'chocolate' | 'berry' | 'crumbs';

/** One side of a comparison question. */
export interface TraySide {
  rows: number;
  cols: number;
  slots: SlotKind[];
}

export interface SprintQuestion {
  type: SprintType;
  /** What the child is asked, in Hebrew. Kept for the button/subtitle and for logs. */
  prompt: string;
  /**
   * The short visual badge shown ABOVE the tray, in place of the long question sentence.
   *
   * THE BADGE IS THE QUESTION, and the full sentence is gone. A sprint is played at speed,
   * and a paragraph of Hebrew above a grid is a reading task sitting in front of a counting
   * task - the child decodes the sentence, then starts the maths. A badge of one short phrase
   * with its emoji is recognised at a glance, which is the brief's "zero reading burden".
   */
  badge: string;
  /**
   * The emoji that heads the badge, and that is repeated on every answer button.
   *
   * REPEATING IT ON THE BUTTONS IS THE POINT. The child reads the badge once to learn what is
   * being asked, and every option then carries the same icon - so at the moment of choosing,
   * the thing being counted and the number being chosen are visually the same object. A plain
   * number among three other plain numbers gives no such confirmation.
   */
  icon: string;
  /** One tray for most types; two trays for Type `compare`. */
  trays: TraySide[];
  /** Button captions. Numeric types show the number; others show their own label. */
  options: string[];
  /** Index into `options`. */
  correctIndex: number;
  /** Shown for a beat after a correct answer, e.g. "3 × 4 = 12". */
  formula: string;
  /** How many candies each flavour cookie carries, for the tray renderer. */
  candies: number;
  /**
   * True for the candy question, which draws its badge with a glowing border.
   *
   * A FLAG RATHER THAN COMPARING THE TYPE STRING AT THE CALL SITE. The glow is a property of
   * the question ("this one is about candies, look closely"), and deriving it in the view
   * from `type === 'candy'` would put game logic in the renderer for no benefit.
   */
  glowing?: boolean;
}

/* -------------------------------- Random ---------------------------------- */

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

/* --------------------------- Distractor helpers --------------------------- */

/**
 * Turns a set of candidate answers into four shuffled buttons.
 *
 * The candidates are tried in order and de-duplicated, so the arithmetic traps
 * are kept ahead of the generic neighbours that only exist to fill the row when
 * a trap collapses onto the right answer (R + C equals R x C exactly when R or C
 * is 2, which happens constantly on the Level 1 trays).
 */
function buttons(correct: number, traps: number[]): { options: string[]; correctIndex: number } {
  const values: number[] = [];
  const push = (value: number) => {
    if (value > 0 && Number.isInteger(value) && !values.includes(value)) values.push(value);
  };
  push(correct);
  traps.forEach(push);

  // Fill any gap with the nearest plausible numbers, alternating around the answer.
  let bump = 1;
  while (values.length < OPTION_COUNT && bump < 40) {
    push(correct + bump);
    push(correct - bump);
    bump += 1;
  }

  const chosen = shuffle(values.slice(0, OPTION_COUNT));
  return {
    options: chosen.map(String),
    correctIndex: chosen.indexOf(correct),
  };
}

/** "3 × 4" */
const equation = (rows: number, cols: number): string => `${rows} × ${cols}`;

/* --------------------------- Type: classic ------------------------------ */

/**
 * "כמה עוגיות יש?" - read the total off a full tray.
 *
 * The distractors are the multiplication misconceptions, unchanged: R + C (adding the sides),
 * one row or column too many, and one group short. A wrong answer therefore tells the child
 * something rather than only telling them they guessed.
 */
function buildClassic(rows: number, cols: number): SprintQuestion {
  const total = rows * cols;
  const { options, correctIndex } = buttons(total, [
    rows + cols,
    rows * (cols + 1),
    (rows + 1) * cols,
    total - cols,
  ]);
  return {
    type: 'classic',
    prompt: 'כמה עוגיות יש?',
    badge: 'כמה עוגיות יש?',
    icon: '🍪',
    trays: [plainTray(rows, cols)],
    options,
    correctIndex,
    formula: `${rows} × ${cols} = ${total}`,
    candies: 0,
  };
}

/* ----------------------------- Type: match ------------------------------ */

/**
 * "איזה תרגיל מתאים?" - read the tray backwards as an equation.
 *
 * The same diagram as `classic` with the question inverted, which is why the two make a good
 * pair at Level 1: the child sees that `4 × 3` and twelve cookies are the same statement.
 */
function buildMatch(rows: number, cols: number): SprintQuestion {
  const correct = equation(rows, cols);
  const traps = [
    equation(rows + 1, cols),
    equation(rows, cols + 1),
    equation(rows + 1, cols + 1),
    equation(Math.max(1, rows - 1), cols),
    equation(rows, Math.max(1, cols - 1)),
  ];

  const captions: string[] = [];
  const push = (value: string) => {
    if (!captions.includes(value)) captions.push(value);
  };
  push(correct);
  traps.forEach(push);

  const chosen = shuffle(captions.slice(0, OPTION_COUNT));
  return {
    type: 'match',
    prompt: 'איזה תרגיל מתאים?',
    badge: 'איזה תרגיל מתאים?',
    icon: '🍪',
    trays: [plainTray(rows, cols)],
    options: chosen,
    correctIndex: chosen.indexOf(correct),
    formula: `${rows} × ${cols} = ${rows * cols}`,
    candies: 0,
  };
}

/* ----------------------------- Type: candy ------------------------------ */

/**
 * "כמה סוכריות בסך הכל?" - the two-step multiplication.
 *
 * ==================================================================
 * THREE FACTORS, AND THE TRAY HAS TO MAKE ALL THREE COUNTABLE.
 * ==================================================================
 *
 * The answer is `rows x cols x candies`. For that to be fair, the diagram must let the child
 * find each factor by looking: the rows and columns are the grid, and the candies are the
 * sweets on one cookie. So every cookie carries the SAME number of sweets - a tray where the
 * cookies differed would have no single answer, which is why `candies` is a level property
 * rather than a per-cookie draw.
 *
 * THE CANDIES ARE DRAWN AS COLOURFUL GEOMETRIC DOTS in the tray renderer, in subitizing
 * layouts, because this question requires counting them. Three sweets scattered at random on
 * a cookie would make the child count them one by one; three in a triangle are recognised as
 * "three" instantly, which is the skill that makes the multiplication possible at speed.
 *
 * THE DISTRACTORS ARE THE TWO-STEP ERRORS, not random numbers: the count of cookies alone
 * (forgetting the third factor), the count of candies in one row, and an off-by-one group.
 */
function buildCandy(rows: number, cols: number, candies: number): SprintQuestion {
  const cookies = rows * cols;
  const total = cookies * candies;

  const { options, correctIndex } = buttons(total, [
    cookies,
    cols * candies,
    rows * candies,
    total - candies,
  ]);

  return {
    type: 'candy',
    prompt: 'כמה סוכריות בסך הכל?',
    badge: 'כמה סוכריות בסך הכל?',
    icon: '🍬',
    trays: [{ rows, cols, slots: candySlots(rows, cols) }],
    options,
    correctIndex,
    formula: `${rows} × ${cols} × ${candies} = ${total}`,
    candies,
    glowing: true,
  };
}

/* ---------------------------- Type: nibbled ----------------------------- */

/**
 * "כמה עוגיות חסרות?" - count the holes, not the remainder.
 *
 * ==================================================================
 * THE HARDER OF THE TWO NIBBLED READINGS, AND THAT IS THE POINT.
 * ==================================================================
 *
 * "How many are left" can be answered by counting the cookies still on the tray, without
 * ever working out the product. "How many are missing" cannot: the child has to know the
 * full `rows x cols` before they can say what is gone. So this type is the one that actually
 * requires the multiplication, and it is why Level 2 alternates the two rather than asking
 * only the easier one.
 *
 * THE DISTRACTORS ARE THE REMAINDER AND ITS NEIGHBOURS, because the likeliest error is
 * answering the OTHER question - counting what is left when asked what is gone. `left` is
 * therefore the first trap, and it is the one that catches a child who read the badge too
 * quickly.
 */
function buildNibbledMissing(rows: number, cols: number): SprintQuestion {
  const { slots, missing, left } = nibbledTray(rows, cols);
  const { options, correctIndex } = buttons(missing, [left, missing + 1, Math.max(1, missing - 1)]);

  return {
    type: 'nibbledMissing',
    prompt: 'כמה עוגיות חסרות?',
    badge: 'כמה עוגיות חסרות?',
    icon: '💨',
    trays: [{ rows, cols, slots }],
    options,
    correctIndex,
    formula: `${rows * cols} − ${left} = ${missing}`,
    candies: 0,
  };
}

/**
 * "כמה עוגיות נשארו?" - count what is still on the tray.
 *
 * The easier reading, kept alongside the harder one so the level does not feel like a wall.
 * The traps include the full product, because a child who ignores the holes entirely will
 * reach for it.
 */
function buildNibbledLeft(rows: number, cols: number): SprintQuestion {
  const { slots, missing, left } = nibbledTray(rows, cols);
  const total = rows * cols;
  const { options, correctIndex } = buttons(left, [total, left - 1, left + 1, missing]);

  return {
    type: 'nibbledLeft',
    prompt: 'כמה עוגיות נשארו?',
    badge: 'כמה עוגיות נשארו?',
    icon: '🍪',
    trays: [{ rows, cols, slots }],
    options,
    correctIndex,
    formula: `${total} − ${missing} = ${left}`,
    candies: 0,
  };
}

/**
 * A tray with some slots turned to crumbs.
 *
 * EXTRACTED SO THE TWO NIBBLED TYPES DEAL THE SAME TRAY. They are the same diagram asked two
 * ways, so building the holes twice would be two chances to disagree about where the holes
 * are - and a child comparing the two questions would be right to be confused.
 *
 * `missing` is capped at three per the brief, and floored at one: a tray with no holes is not
 * a nibbled tray at all, and a tray with most of the cookies gone stops reading as a grid.
 */
function nibbledTray(rows: number, cols: number): { slots: SlotKind[]; missing: number; left: number } {
  const total = rows * cols;
  const missing = randInt(1, Math.min(3, Math.max(1, total - 1)));
  const slots: SlotKind[] = Array.from({ length: total }, () => 'cookie');
  const holes = shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, missing);
  holes.forEach((index) => {
    slots[index] = 'crumbs';
  });
  return { slots, missing, left: total - missing };
}

/* ----------------------------- Type: compare ---------------------------- */

/**
 * Two trays, side by side.
 *
 * The pairs are drawn so the totals are CLOSE but rarely equal: a pair that is
 * obviously lopsided can be answered by glancing at the outlines, without any
 * multiplication at all. Deliberately generous limits on the difference keep the
 * comparison honest - big enough that the answer exists, small enough that both
 * trays have to be counted.
 */
function buildCompare(level: SprintLevel): SprintQuestion {
  // BEST-OF SEARCH, NOT RE-DRAW-UNTIL-HAPPY. The previous version re-drew inside
  // `for (attempt < 12)` and then fell out of the loop WITHOUT re-checking the
  // final pair, so the twelve rejected draws were wasted and the last one - good
  // or bad - was the one that got used.
  //
  // Keeping the closest pair seen is also the honest fix for the case where no
  // pair in the level's grid list can hit the threshold: the level still gets the
  // tightest comparison it is capable of, instead of an arbitrary one.
  const target = 4;
  let best: { a: readonly [number, number]; b: readonly [number, number]; spread: number } | null = null;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const a = pick(level.grids);
    const b = pick(level.grids);
    const spread = Math.abs(a[0] * a[1] - b[0] * b[1]);
    if (best === null || spread < best.spread) best = { a, b, spread };
    if (spread <= target) break;
  }

  const [aRows, aCols] = (best as { a: readonly [number, number] }).a;
  const [bRows, bCols] = (best as { b: readonly [number, number] }).b;
  const totalA = aRows * aCols;
  const totalB = bRows * bCols;
  // The layout puts tray A on the RIGHT (first in RTL reading order) and tray B
  // on the left, so the captions must follow that, not the array order.
  const options = ['מגש ימין', 'שווים', 'מגש שמאל'];
  const correctIndex = totalA === totalB ? 1 : totalA > totalB ? 0 : 2;

  return {
    type: 'compare',
    prompt: 'איזה מגש גדול יותר?',
    badge: 'איזה מגש גדול יותר?',
    icon: '🍪',
    trays: [plainTray(aRows, aCols), plainTray(bRows, bCols)],
    options,
    correctIndex,
    formula:
      totalA === totalB
        ? `${totalA} = ${totalB}`
        : `${Math.max(totalA, totalB)} > ${Math.min(totalA, totalB)}`,
    candies: 0,
  };
}

/* ------------------------------ Construction ------------------------------ */

function plainTray(rows: number, cols: number): TraySide {
  return { rows, cols, slots: Array.from({ length: rows * cols }, () => 'cookie') };
}

/**
 * A tray where every cookie is a flavour cookie, so all of them carry candies.
 *
 * Level 3 needs EVERY cookie to carry the same number of sweets for the total to have one
 * answer, so this does not split the tray into flavours - the whole grid is countable as
 * `rows x cols x candies`.
 */
function candySlots(rows: number, cols: number): SlotKind[] {
  return Array.from({ length: rows * cols }, () => 'chocolate');
}

function traySizeFor(level: SprintLevel): readonly [number, number] {
  return pick(level.grids);
}

/**
 * Builds one question at the given level.
 *
 * `avoid` is the type of the previous question: repeating it back-to-back is
 * what makes a sprint feel like a drill, so a fresh type is drawn when the level
 * has one to spare.
 */
export function buildQuestion(level: number, avoid?: SprintType): SprintQuestion {
  const spec = levelSpec(level);
  const pool = spec.types.filter((type) => type !== avoid);
  const type = pick(pool.length > 0 ? pool : spec.types);

  // Type `compare` builds its own pair, because the comparison needs two grids chosen
  // together rather than one grid and a question about it.
  if (type === 'compare') return buildCompare(spec);

  const [rows, cols] = traySizeFor(spec);
  switch (type) {
    case 'match':
      return buildMatch(rows, cols);
    case 'candy':
      return buildCandy(rows, cols, spec.candies);
    case 'nibbledMissing':
      return buildNibbledMissing(rows, cols);
    case 'nibbledLeft':
      return buildNibbledLeft(rows, cols);
    default:
      return buildClassic(rows, cols);
  }
}

/**
 * Medal tiers for a finished 30-second round.
 *
 * RETUNED WITH THE CLOCK AND THE NEW LEVEL SHAPES. These were 8/5 against a 60-second round,
 * then 5/3 when it halved. The third revision is about what a question now COSTS: Level 3's
 * two-step candy questions (`4 x 4 x 3 = 48`) take visibly longer to work out than the Level 1
 * full-tray counts, and its trays are deliberately small to keep the totals in range - so a
 * flat 5 would make gold meaningfully harder on Level 3 than on Level 1 for no pedagogical
 * reason. Gold at 4 keeps every tier reachable at every level while still reserving the top
 * medal for a fast, accurate run.
 */
export type MedalKind = 'bronze' | 'silver' | 'gold';

export const MEDAL_FOR_CORRECT: ReadonlyArray<{ min: number; medal: MedalKind }> = [
  { min: 4, medal: 'gold' },
  { min: 2, medal: 'silver' },
  { min: 0, medal: 'bronze' },
];

/**
 * The score gold starts at, exported so the summary's "N more trays" copy cannot drift.
 *
 * This lived as a bare `8` in two places in `BakeryGame` while the table said 5, so the
 * summary promised a target the medal logic disagreed with. Deriving it means the number is
 * written once.
 */
export const GOLD_SCORE = MEDAL_FOR_CORRECT[0]?.min ?? 4;

export function medalFor(correct: number): MedalKind {
  const tier = MEDAL_FOR_CORRECT.find((entry) => correct >= entry.min) ?? MEDAL_FOR_CORRECT[2];
  return (tier as { medal: MedalKind }).medal;
}

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

/** Seconds in one sprint round. */
export const SPRINT_SECONDS = 30;
