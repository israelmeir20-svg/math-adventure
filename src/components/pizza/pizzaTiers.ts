/**
 * The four-level progression - the pizzeria's curriculum.
 *
 * Deliberately free of imports so Node tooling can load it. The generator next
 * door pulls in sprite-free data, but a fuzz harness reaches the ramp through
 * this file so the level boundaries can be asserted without a bundler.
 *
 * THE LEVEL IS DRIVEN BY PIZZAS BAKED, NOT BY THE ATTEMPT COUNT. That distinction
 * is the whole design. An order number counts every dealt pizza, so a child who
 * mis-bakes three in a row is silently promoted past the scaffolding they still
 * need. Gating on `bakedCount` - pizzas actually completed - means the ramp only
 * advances on success, and a struggling child stays on the level that teaches the
 * idea rather than being pushed to one that assumes it.
 *
 *   Level 1 (0-2 baked)   2 or 4 slices, TWO lines whose denominators equal the
 *                         slice count, so each numerator is literally a wedge
 *                         count. Mini-pie diagrams on. Pure 1:1 matching.
 *   Level 2 (3-5 baked)   Same 1:1 arithmetic, 2, 3 or 4 slices, but the diagrams
 *                         are gone: the child must read the numerals.
 *   Level 3 (6-8 baked)   The first conversion. 4 or 8 slices and a GENTLE
 *                         simplified name - "חצי" on quarters, "רבע" on eighths -
 *                         mapping onto a half or a quarter of the pie.
 *   Level 4 (9+ baked)    Advanced eighths: mixed denominators across a 4-2-2
 *                         split, every name simplified.
 */

/**
 * NO ORDER IS EVER ONE FRACTION COVERING THE WHOLE PIE. A ticket reading "2/2
 * tomatoes" is not a fraction task at all - the pie is entirely one topping, so
 * there is nothing to partition and no reason to read the numerals. Every order
 * is therefore a SPLIT: two or three lines whose wedges add up to no more than
 * the pie. The one exception is deliberate and does not leak into the game: a
 * two-slice pie is inherently a half-and-half, which `buildSplitLines` handles by
 * requiring exactly one half of it, leaving the other half plain dough.
 */

/** How many pizzas must be baked before each level opens. */
export const LEVEL_AFTER_BAKED = [0, 3, 6, 9] as const;

/** The 1-based level a baker at this progress belongs to, 1-4. */
export function levelForBaked(bakedCount: number): 1 | 2 | 3 | 4 {
  if (bakedCount < 3) return 1;
  if (bakedCount < 6) return 2;
  if (bakedCount < 9) return 3;
  return 4;
}

/** Slice counts that may be used at each level. */
export function sliceOptionsFor(level: number): number[] {
  if (level === 1) return [2, 4];
  if (level === 2) return [2, 3, 4];
  if (level === 3) return [4, 8];
  // Level 4 is always eighths: the 4-2-2 split only exists at 8.
  return [8];
}

/**
 * HOW MANY LINES ARE LEFT FOR THE RANDOM BUILDER TO FILL.
 *
 * The split geometry is decided before the fractions are, so this only governs
 * the random builder (levels 1-2). Levels 3 and 4 deal fixed recipes and read
 * their line counts from `GENTLE_SPLITS` and `MASTERY_BLOCKS`; their entries here
 * are unused, and are set to match those recipes so the two cannot disagree.
 *
 * IT IS NEVER 1, AND THAT IS THE ANTI-DEGENERACY RULE. One line on a pie whose
 * fractions run up to the whole slice count can be dealt as "2/2" - a single
 * topping on every wedge, which is not a fraction question. Two lines make the
 * ticket a split by construction.
 */
export function requirementCountFor(level: number): [number, number] {
  if (level === 2) return [2, 3];
  return [2, 2];
}

/**
 * Whether the fraction shown is a SIMPLIFIED name rather than the exact slice
 * count - i.e. whether the child has to convert rather than copy.
 */
export function requiresConversionFor(level: number): boolean {
  return level >= 3;
}

/**
 * The Hebrew spoken form of a fraction, falling back to the numeral pair.
 *
 * The fallback matters more than it looks: `?? key` used to leave an unsimplified
 * name like "2/8" printing the bare numerals, which reads as a stutter next to
 * the fraction chip. Anything reachable from a real order is listed here.
 */
export function hebrewFraction(numerator: number, denominator: number): string {
  const key = `${numerator}/${denominator}`;
  const TABLE: Record<string, string> = {
    '1/2': 'חצי',
    '2/2': 'שלם',
    '1/3': 'שליש',
    '2/3': 'שני שליש',
    '3/3': 'שלם',
    '1/4': 'רבע',
    '2/4': 'חצי',
    '3/4': 'שלושה רבעים',
    '4/4': 'שלם',
    '1/8': 'שמינית',
    '2/8': 'רבע',
    '3/8': 'שלוש שמיניות',
    '4/8': 'חצי',
    '5/8': 'חמש שמיניות',
    '6/8': 'שלושה רבעים',
    '7/8': 'שבע שמיניות',
    '8/8': 'שלם',
  };
  return TABLE[key] ?? key;
}

/** "1/2" - always a literal, never computed, so it cannot render as a float. */
export function fractionText(numerator: number, denominator: number): string {
  return `${numerator}/${denominator}`;
}

/** A requirement as a plain wedge count, before it is given a fraction name. */
export interface WedgeBlock {
  /** Wedges of the pie this line covers. */
  slices: number;
  /** The displayed fraction. Its value MUST equal `slices`. */
  fraction: [number, number];
}

/**
 * LEVEL 3: THE GENTLE CONVERSIONS, AS AN EXPLICIT TABLE.
 *
 * Level 3 exists to introduce ONE new idea - that a fraction name does not have
 * to be written over the slice count - and it introduces it on the two names that
 * need the least reasoning: a half of a quartered pie, and a quarter of an
 * eight-cut one. Both are "count the wedges in the picture" once the child
 * realises the name and the cut are different questions.
 *
 * A TABLE RATHER THAN A FILTER OVER A FRACTION POOL. The earlier design drew from
 * a pool of simplified names and then tried to make the drawn lines add up, which
 * quietly produced tickets like "1/2 + 1/2" - correct arithmetic that teaches
 * nothing, since the child never has to look at the pie to know both halves are
 * equal. These three splits are each a genuine question, and the two-line option
 * is a half against a quarter, which is the comparison this level is really for.
 *
 * Ordered largest first so a two-line deal is a sound prefix that still fills the
 * pie; see `pizzaLines` for why that ordering is a constraint and not a taste.
 */
export const GENTLE_SPLITS: readonly WedgeBlock[][] = [
  [
    { slices: 2, fraction: [1, 2] },
    { slices: 2, fraction: [1, 2] },
  ],
  [
    { slices: 2, fraction: [1, 2] },
    { slices: 1, fraction: [1, 4] },
    { slices: 1, fraction: [1, 4] },
  ],
  [
    { slices: 1, fraction: [1, 4] },
    { slices: 1, fraction: [1, 4] },
    { slices: 1, fraction: [1, 4] },
    { slices: 1, fraction: [1, 4] },
  ],
];

/**
 * The fraction pairs a random builder may deal, given the cut and whether
 * conversion is on the table.
 *
 * Without conversion the only honest fractions are those over the slice count
 * itself, so the numerator is literally the number of wedges to top. The
 * `denominator < totalSlices` filter is the anti-degeneracy rule in arithmetic
 * form: it is what removes "2/2" and "4/4" - the whole-pie tickets - from the
 * pool, because a fraction whose denominator equals the cut and whose numerator
 * has reached the cut is not a question.
 */
export function fractionsFor(totalSlices: number, requireConversion: boolean): [number, number][] {
  const seen = new Set<string>();
  const source: [number, number][] = requireConversion
    ? [[1, 2], [1, 4], [3, 4], [1, 8]]
    : Array.from({ length: totalSlices - 1 }, (_, i) => [i + 1, totalSlices] as [number, number]);

  const out: [number, number][] = [];
  for (const pair of source) {
    // A fraction is only usable when it names a whole number of wedges. A third
    // of an eight-slice pie is 2.67 wedges, and no child can place that - so 1/3
    // simply does not exist here rather than being rounded off to 3.
    if (totalSlices % pair[1] !== 0) continue;
    // Never the whole pie, and never an exact-name fraction at a conversion
    // level: "4/8" on eighths hands over the wedge count the child is meant to
    // work out, and "4/4" names every wedge there is.
    if (pair[1] >= totalSlices && requireConversion) continue;
    const key = fractionText(pair[0], pair[1]);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pair);
  }
  // Drop any pair worth the entire pie; a split needs at least two live blocks.
  return out.filter(([numerator, denominator]) => (numerator * totalSlices) / denominator < totalSlices);
}
