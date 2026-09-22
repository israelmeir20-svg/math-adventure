/**
 * The concrete, physical consequence of an answer for "שעת האכלה".
 *
 * A wrong answer here is not "try again". It is a DISTRIBUTION THAT FAILED, and
 * the child should see exactly how it failed:
 *
 *   too_much   the food ran out part-way down the row, so the last animals got
 *              nothing (or less than the others). The bowl that came up short is
 *              the whole lesson: "we wanted 6 each, but there was only enough
 *              for 4".
 *   too_little every animal got the smaller share and food is still sitting in
 *              the basket. The overflow is the lesson.
 *   correct    the share divides the food evenly (up to a remainder).
 *
 * This module is pure arithmetic so the distribution can be tested directly and
 * the render layer only has to draw what it is handed.
 */

/** What the child's answer turned out to mean, once the maths is done. */
export type FeedbackStatus = 'idle' | 'correct' | 'too_much' | 'too_little';

/** Every status that describes an ANSWER, i.e. everything but the idle board. */
export type AnsweredStatus = Exclude<FeedbackStatus, 'idle'>;

export interface FeedbackState {
  status: FeedbackStatus;
  /** The number of items the child chose to give each animal. */
  chosen: number;
}

export const IDLE_FEEDBACK: FeedbackState = { status: 'idle', chosen: 0 };

/**
 * How many items each bowl actually receives, in row order.
 *
 * THE ROW IS FILLED LEFT TO RIGHT OUT OF ONE FINITE PILE, which is what makes
 * "too much" visible. Asking for 6 each when there are only 8 means the first
 * bowl gets 6, the second gets the remaining 2, and there is nothing left for
 * anyone after that.
 */
export function distribute(totalFood: number, count: number, chosen: number): number[] {
  let left = totalFood;
  return Array.from({ length: count }, () => {
    const give = Math.min(chosen, Math.max(0, left));
    left -= give;
    return give;
  });
}

/** The number of bowls that received less than the child intended. */
export function shortfallCount(actual: readonly number[], chosen: number): number {
  return actual.filter((got) => got < chosen).length;
}

/** Food still sitting in the basket once the row is fed. */
export function leftoverAfter(totalFood: number, count: number, chosen: number): number {
  return Math.max(0, totalFood - chosen * count);
}

/**
 * Classifies an answer.
 *
 * `too_much` is decided by whether the row can actually be fed what was asked -
 * `chosen * count > totalFood` - NOT by comparing against the share. Those
 * differ when the division leaves a remainder: with 9 food and 2 animals the
 * share is 4, but giving 5 each is still possible (it uses 10 > 9, so it is not),
 * whereas giving 4 each leaves 1 over. Comparing against the pile is what the
 * child is being taught.
 */
export function classify(
  totalFood: number,
  count: number,
  chosen: number,
  quotient: number,
): AnsweredStatus {
  if (chosen === quotient) return 'correct';
  if (chosen * count > totalFood) return 'too_much';
  return 'too_little';
}
