/**
 * Building a single order's requirement lines.
 *
 * Split out of the generator because this is where the game's one real hazard
 * lives: choosing, for each line, a fraction that is BOTH a true statement about a
 * whole number of wedges and a question worth asking.
 *
 * THE FRACTION IS DRAWN FIRST AND KEPT AS DRAWN. It is tempting to normalise "1/2"
 * back to "4/8" once the wedge count is known, but that silently deletes the whole
 * point of the conversion levels: the child must read the simplified name and work
 * out how many wedges it covers. So the drawn pair travels to the order intact,
 * with `requiredSlices` recording what it evaluates to.
 *
 * NO LINE EVER COVERS THE WHOLE PIE, AND NO TICKET IS A SINGLE LINE. See the note
 * on the split rule in `pizzaTiers`; the enforcement is in `buildSplitLines`,
 * which simply never lets the last line claim every remaining wedge.
 */
import type { OrderRequirement, SliceCount, ToppingId } from './pizzaTypes';
import { fractionText, fractionsFor, hebrewFraction, type WedgeBlock } from './pizzaTiers';

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

/** Fisher-Yates over a copy. */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function requirementFor(
  toppingId: ToppingId,
  requiredSlices: number,
  fraction: [number, number],
  scaffold: boolean,
): OrderRequirement {
  return {
    toppingId,
    fractionText: fractionText(fraction[0], fraction[1]),
    hebrewFraction: hebrewFraction(fraction[0], fraction[1]),
    requiredSlices,
    showVisualScaffold: scaffold,
  };
}

/**
 * Give a list of wedge blocks one topping each.
 *
 * THE BLOCK ORDER IS SHUFFLED BUT THE SIZES ARE NOT. Which topping lands on the
 * four-wedge block is arbitrary, so shuffling keeps repeat orders looking fresh;
 * the block sizes have to keep their order because the sums depend on it (see
 * `buildFixedSplit`).
 */
function assignToppings(
  blocks: readonly WedgeBlock[],
  toppingPool: ToppingId[],
  scaffold: boolean,
  random: () => number,
): OrderRequirement[] {
  const toppings = shuffle(toppingPool, random);
  return blocks.map((block, index) =>
    requirementFor(toppings[index]!, block.slices, block.fraction, scaffold),
  );
}

/**
 * Level 4: an eight-wedge pie carved 4+2+2, named with the mixed denominators the
 * level is about. The three blocks are always all dealt, so the ticket covers the
 * whole pie and every name has to be converted before a wedge is touched.
 */
export const MASTERY_BLOCKS: readonly WedgeBlock[] = [
  { slices: 4, fraction: [1, 2] },
  { slices: 2, fraction: [1, 4] },
  { slices: 2, fraction: [2, 8] },
];

/** Level 4's order: the fixed 4+2+2 split with its toppings assigned. */
export function buildMasteryOrder(
  toppingPool: ToppingId[],
  random: () => number,
): OrderRequirement[] {
  return assignToppings(MASTERY_BLOCKS, toppingPool, false, random);
}

/**
 * The fixed-split builder, used by level 3 and level 4.
 *
 * THE LINE COUNT IS NOT A FREE VARIABLE. Both levels deal one of a small set of
 * recipes whose wedges total exactly the pie, and a prefix of such a recipe is
 * still valid only because it is ordered largest first. Taking the first two
 * blocks of 4+2+2 leaves 4+2, which is six of the eight wedges - a legible question
 * about half and a quarter. Taking the first two of a differently ordered table
 * could leave half the pie named by nothing at all, which no child can satisfy.
 * Hence the caller offers a prefix length, and this function never reorders.
 */
export function buildFixedSplit(
  splits: readonly WedgeBlock[][],
  toppingPool: ToppingId[],
  scaffold: boolean,
  random: () => number,
): OrderRequirement[] {
  const recipe = pick(splits, random);
  return assignToppings(recipe, toppingPool, scaffold, random);
}

/**
 * Levels 1 and 2: two lines over a pie cut into halves, thirds, quarters or
 * eighths, with every fraction written over the slice count.
 *
 * THE LAST LINE CANNOT TAKE EVERYTHING THAT IS LEFT. Without this rule the loop's
 * final draw can land on the fraction naming the whole cut - and a line asking for
 * the whole pie in one topping is not a fraction question. So the last line is
 * drawn from the fractions that leave at least one wedge unnamed, which is also
 * what keeps the diagram honest: "3/4 tomatoes" shades three of four wedges and
 * the fourth stays visibly plain.
 *
 * THE SECOND LINE IS NOT OPTIONAL ON A BIG PIE, SO THE LOOP CANNOT `break` EARLY.
 * An earlier version emitted whatever it had when a draw consumed the rest of the
 * pie, which dealt single-line tickets like "3/4 olives" - the exact degenerate
 * order this builder exists to prevent. The rule now is that a two-line ticket is
 * built as a SPLIT OR NOT AT ALL: draw a first line that leaves at least one wedge
 * for a second, and draw the second to leave at least one wedge plain. On a
 * two-slice pie no such pair exists - the only proper fraction is a half, so the
 * split would be "a half plus the other half" - and the first line is emitted
 * alone, naming exactly one of the two wedges. That is the one-line shape that is
 * still a split, because the pie that remains is a different topping's territory.
 */
export function buildSplitLines(
  count: number,
  totalSlices: SliceCount,
  toppingPool: ToppingId[],
  scaffold: boolean,
  random: () => number,
): OrderRequirement[] {
  const fractions = fractionsFor(totalSlices, false);
  const wedgesOf = ([numerator, denominator]: [number, number]) =>
    Math.round((numerator * totalSlices) / denominator);
  const live = fractions.filter((pair) => wedgesOf(pair) < totalSlices);
  if (live.length === 0) return [];

  // A second line needs a wedge to live on, so the first may not claim them all.
  const opening = live.filter((pair) => wedgesOf(pair) <= totalSlices - 2);
  const first = pick(opening.length > 0 ? opening : live, random);
  const firstSlices = wedgesOf(first);
  const requirements = [
    requirementFor(toppingPool[0]!, firstSlices, first, scaffold),
  ];
  if (count < 2 || opening.length === 0) return requirements;

  const remaining = totalSlices - firstSlices;
  // The second line leaves at least one wedge plain, per the split rule.
  const seconds = live.filter((pair) => wedgesOf(pair) < remaining);
  if (seconds.length === 0) return requirements;
  const second = pick(seconds, random);
  requirements.push(
    requirementFor(toppingPool[1]!, wedgesOf(second), second, scaffold),
  );
  return requirements;
}

/** True when at least one line's displayed fraction is not the wedge count. */
export function hasSimplifiedLine(
  requirements: OrderRequirement[],
  totalSlices: number,
): boolean {
  return requirements.some(
    (requirement) => requirement.fractionText !== `${requirement.requiredSlices}/${totalSlices}`,
  );
}
