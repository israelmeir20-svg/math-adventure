/**
 * Types for "פיצריית השברים" - the fractions pizzeria.
 *
 * EVERY QUANTITY IN THIS GAME IS A WHOLE NUMBER OF SLICES. The fraction is only
 * ever a LABEL wrapped around an integer - the order for "1/2 olives" on an
 * 8-slice pie stores `requiredSlices: 4`, and nothing downstream ever multiplies
 * or divides a float. That is the entire reason the game works: comparing two
 * counts cannot drift, whereas `0.5 * 8 === 4.000000000000001` can, and a child
 * who tops four slices correctly should never be told they are wrong.
 *
 * A fraction is also only ever written by a human as text, so the display forms
 * live here beside the counts rather than being computed at render time.
 */

export type ToppingId = 'olives' | 'corn' | 'tomatoes' | 'mushrooms';

export interface Topping {
  id: ToppingId;
  nameHebrew: string;
  emoji: string;
  /** Wedge fill when this topping is placed. */
  color: string;
  /** Keyboard slot, 1-4, in tray order. */
  key: string;
}

export const TOPPINGS: Topping[] = [
  { id: 'olives', nameHebrew: 'זיתים', emoji: '🫒', color: '#a3a3a3', key: '1' },
  { id: 'corn', nameHebrew: 'תירס', emoji: '🌽', color: '#facc15', key: '2' },
  { id: 'tomatoes', nameHebrew: 'עגבניות', emoji: '🍅', color: '#f87171', key: '3' },
  { id: 'mushrooms', nameHebrew: 'פטריות', emoji: '🍄', color: '#d6b28a', key: '4' },
];

/** Slice counts a pizza can be cut into. 3 never reaches tier 3+. */
export type SliceCount = 2 | 3 | 4 | 8;

/** One line of the order: this many slices of this topping. */
export interface OrderRequirement {
  toppingId: ToppingId;
  /** Display form, e.g. "1/2". Rendered LTR. */
  fractionText: string;
  /** Spoken form, e.g. "חצי". */
  hebrewFraction: string;
  /** THE ONLY NUMBER THAT MATTERS: how many wedges to top. */
  requiredSlices: number;
  /**
   * Tier 1 only: draw pie-diagram icons beside the fraction. From tier 2 the
   * text stands alone, so the child reads the fraction rather than counting
   * pictures.
   */
  showVisualScaffold: boolean;
}

export interface PizzaOrder {
  /** 1-based pizza number in the run, which is also the difficulty selector. */
  pizzaNumber: number;
  totalSlices: SliceCount;
  requirements: OrderRequirement[];
  /** True from tier 3: the fraction is simpler than the slice count. */
  isEquivalent: boolean;
}
