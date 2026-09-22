/**
 * The pure mechanics behind "סל הפיקניק": randomness, count selection and the
 * tier validity check.
 *
 * Free of React and of the stage geometry, so the arithmetic can be tested in
 * plain Node and the same functions serve the generator and the verification
 * scripts.
 */
import type { PicnicQuestion } from './picnicTypes';

/** An inclusive random integer. */
export function picnicInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** One random element. Throws only if handed an empty list, which callers avoid. */
export function picnicPick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] as T;
}

/** Fisher-Yates, returning a new array. */
export function shufflePicnic<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/**
 * `count` DISTINCT counts whose biggest and smallest differ by exactly `spread`.
 *
 * THREE PROPERTIES, AND ALL THREE MATTER:
 *
 *   UNIQUE. "Which fruit was the most?" has no answer if two piles tie, so no two
 *   counts may be equal.
 *
 *   THE SPREAD IS EXACT. The gap between the biggest and smallest pile is the
 *   difficulty dial. Left to chance, a draw produces runs like 7/6/5, whose gap is
 *   1 - which is how an earlier version dealt "3 vs 2" on the introductory tier
 *   instead of the intended "7 vs 2". Pinning the spread makes the tier mean what
 *   it says.
 *
 *   IT FITS. The counts must not exceed the crate's cells. A tier whose piles want
 *   8+7+6 = 21 pieces in a 16-cell crate would force the generator to drop fruit,
 *   leaving a crate that shows fewer pieces than the answer key assumes - and a
 *   child counting correctly would be marked wrong.
 *
 * The two ends are fixed first (which is what makes the spread exact), then the
 * CHEAPEST middles are taken, because taking the smallest available values is what
 * keeps the total inside the crate.
 */
export function distinctPicnicCounts(
  count: number,
  min: number,
  max: number,
  spread: number,
  capacity: number,
  rng: () => number,
): number[] {
  const topFloor = Math.min(min + spread, max);
  const topCeil = Math.max(topFloor, max);

  // The cheapest possible total for a candidate top: both ends plus the smallest
  // middles. If even that overflows, no valid packing exists and the top must drop.
  const cheapestTotal = (candidate: number) => {
    const low = Math.max(1, candidate - spread);
    let sum = candidate + low;
    for (let v = low + 1, taken = 0; taken < count - 2; v += 1, taken += 1) sum += v;
    return sum;
  };

  let top = picnicInt(topFloor, topCeil, rng);
  let guard = 0;
  while (top > topFloor && cheapestTotal(top) > capacity && guard < 200) {
    guard += 1;
    top -= 1;
  }

  const bottom = Math.max(1, top - spread);
  const middles: number[] = [];
  for (let value = bottom + 1; value < top; value += 1) middles.push(value);

  // Shuffle for variety, then take them cheapest-first so the budget always holds.
  const ordered = shufflePicnic(middles, rng).sort((a, b) => a - b);

  const result = new Set<number>([top, bottom]);
  for (const value of ordered) {
    if (result.size >= count) break;
    result.add(value);
  }

  // Unreachable while the tier assertions hold, but a short list would become a
  // NaN count one layer up, so it is worth failing here where the cause is clear.
  if (result.size < count) {
    throw new Error(
      `picnic counts: only ${result.size} distinct values in [${bottom}..${top}] ` +
        `but ${count} species requested`,
    );
  }

  return [...result].sort((a, b) => b - a);
}

/** Which fruit wins the comparison the child is being asked about. */
export function picnicWinner(
  counts: Array<{ fruit: string; count: number }>,
  question: PicnicQuestion,
): string {
  // Counts are unique by construction, so a simple reduce has exactly one answer.
  return counts.reduce((best, entry) => {
    if (question === 'most') return entry.count > best.count ? entry : best;
    return entry.count < best.count ? entry : best;
  }).fruit;
}
