/**
 * Order generation for "פיצריית השברים".
 *
 * THE WHOLE GAME IS BUILT BACKWARDS FROM WHOLE SLICES. Each requirement holds a
 * whole number of wedges - `requiredSlices` - and the displayed fraction is chosen
 * to be a TRUE statement about that count. So there is never a fraction to convert
 * and no float anywhere: the odd time a fraction is written over a smaller
 * denominator, the wedge count is simply computed from it once, in integers.
 *
 * THE LEVEL COMES FROM PIZZAS BAKED, so `bakedCount` is the argument, not the
 * order number. See `pizzaTiers` for why that distinction matters: gating on
 * completions is what stops a run of mistakes from promoting a child past help.
 *
 * HOW EACH LEVEL IS SHAPED:
 *   level 1  half and quarter cuts, two lines, mini-pie diagrams, 1:1 reading.
 *   level 2  same arithmetic on halves, thirds and quarters, diagrams withdrawn.
 *   level 3  the gentle conversions: "חצי" on quarters, "רבע" on eighths.
 *   level 4  eighths, the mixed-denominator 4+2+2 split.
 *
 * The line-by-line construction lives in `pizzaLines`; this file chooses the cut,
 * the level and the toppings, then hands off.
 */
import { TOPPINGS, type PizzaOrder, type SliceCount, type ToppingId } from './pizzaTypes';
import {
  GENTLE_SPLITS,
  levelForBaked,
  requirementCountFor,
  sliceOptionsFor,
} from './pizzaTiers';
import {
  buildFixedSplit,
  buildMasteryOrder,
  buildSplitLines,
  hasSimplifiedLine,
} from './pizzaLines';

/** Fisher-Yates over a copy. */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** One of the slice counts this level allows, drawn uniformly. */
function slicesForLevel(level: number, random: () => number): SliceCount {
  const options = sliceOptionsFor(level) as SliceCount[];
  return options[Math.floor(random() * options.length)]!;
}

export function buildPizzaOrder(
  bakedCount: number,
  random: () => number = Math.random,
): PizzaOrder {
  const level = levelForBaked(bakedCount);
  // Level 3 is the only level whose cut is dictated by the fraction rather than
  // drawn: "רבע" needs eighths to mean two wedges, and "חצי" needs quarters.
  const totalSlices = level === 3 ? 4 : slicesForLevel(level, random);
  const [minReq, maxReq] = requirementCountFor(level);
  const count = minReq + Math.floor(random() * (maxReq - minReq + 1));
  const toppingPool: ToppingId[] = shuffle(TOPPINGS, random).map((topping) => topping.id);
  // The order number is only a label on the ticket; the level drives the recipe.
  const pizzaNumber = bakedCount + 1;

  // Each level deals its own way; the shared prologue only picks the parameters.
  const requirements =
    level === 4
      ? buildMasteryOrder(toppingPool, random)
      : level === 3
        ? buildFixedSplit(GENTLE_SPLITS, toppingPool, false, random)
        : buildSplitLines(count, totalSlices, toppingPool, level === 1, random);

  return {
    pizzaNumber,
    totalSlices: level === 3 ? 4 : totalSlices,
    requirements,
    isEquivalent: hasSimplifiedLine(requirements, totalSlices),
  };
}

/** The order as a short line, e.g. "חצי (1/2) זיתים · רבע (1/4) פטריות". */
export function describeOrder(order: PizzaOrder): string {
  return order.requirements
    .map((requirement) => {
      const name =
        TOPPINGS.find((topping) => topping.id === requirement.toppingId)?.nameHebrew ?? '';
      return `${requirement.hebrewFraction} (${requirement.fractionText}) ${name}`;
    })
    .join(' · ');
}
