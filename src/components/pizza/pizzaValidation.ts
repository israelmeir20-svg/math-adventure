/**
 * Validation for a prepared pizza.
 *
 * PURE INTEGER COMPARISON, per requirement: the number of wedges carrying a
 * topping must EQUAL the number the order asked for. Nothing is converted, and
 * no fraction is evaluated - `requiredSlices` is already a count of wedges, which
 * is why a correct pizza cannot be rejected by a rounding error.
 *
 * EMPTY SLICES ARE ALLOWED. The child is not required to cover every wedge: an
 * order for "1/2 olives" on an 8-slice pie asks for four olive wedges and is
 * indifferent to the other four. Requiring full coverage would make tier 3
 * needlessly punishing, since there is no "plain cheese" line in the order to
 * tell them what belongs on the rest.
 *
 * The returned hint says WHICH way the pizza is wrong - too many or too few -
 * because those are different mistakes and lead to different corrections.
 */
import { TOPPINGS, type PizzaOrder, type ToppingId } from './pizzaTypes';

export function nameOf(toppingId: ToppingId): string {
  return TOPPINGS.find((topping) => topping.id === toppingId)?.nameHebrew ?? '';
}

/** How many wedges are carrying each topping. */
export function sliceCounts(placed: (ToppingId | null)[]): Map<ToppingId, number> {
  const counts = new Map<ToppingId, number>();
  for (const topping of placed) {
    if (!topping) continue;
    counts.set(topping, (counts.get(topping) ?? 0) + 1);
  }
  return counts;
}

/** A friendly Hebrew hint, or null when the pie matches the order exactly. */
export function validatePizza(
  order: PizzaOrder,
  placed: (ToppingId | null)[],
): string | null {
  const counts = sliceCounts(placed);

  for (const requirement of order.requirements) {
    const actual = counts.get(requirement.toppingId) ?? 0;
    if (actual > requirement.requiredSlices) {
      return `יותר מדי ${nameOf(requirement.toppingId)} - ${requirement.fractionText} זה ${requirement.requiredSlices} משולשים`;
    }
    if (actual < requirement.requiredSlices) {
      return `חסרים ${requirement.requiredSlices - actual} משולשים של ${nameOf(requirement.toppingId)}`;
    }
    counts.delete(requirement.toppingId);
  }

  // Anything left over was never ordered.
  const extra = counts.keys().next();
  if (!extra.done) {
    return `${nameOf(extra.value as ToppingId)} לא הוזמן בהזמנה הזו`;
  }

  return null;
}
