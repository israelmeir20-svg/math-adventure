/**
 * Answer options and the shuffle for "משחק הכוכבים".
 *
 * THE OPTION SET IS A COMMITMENT, and the previous game got it subtly wrong. It built
 * near-misses by adding "plausible errors" in a loop guarded at 80 iterations, so a
 * pathological random source could return FEWER THAN FOUR options - and nothing asserted
 * otherwise. A round with three buttons is not obviously broken; it just quietly asks less of
 * the child. This module derives the candidates arithmetically instead, so the count is
 * guaranteed by construction rather than by a loop that usually terminates.
 *
 * THE CANDIDATES ARE CLUSTERED TIGHTLY AROUND THE ANSWER. `[total, total+-1, total+-2]` makes
 * every button a number the child might genuinely have miscounted, which is what forces real
 * counting. A spread of ten would let a guesser eliminate half the buttons instantly.
 */

/**
 * The floor for any candidate. A constellation always has at least three stars, so an
 * option below three is not a number the child could have arrived at - it is a free
 * elimination.
 */
export const MIN_OPTION = 3;

/** How many choices every round offers. */
export const OPTION_COUNT = 4;

/** Fisher-Yates, so the correct answer lands in each slot equally often. */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Four unique candidates containing `total`, all at least `MIN_OPTION`, shuffled.
 *
 * THE OFFSETS ARE TRIED IN ORDER OF TIGHTNESS - +-1 first, then +-2 - and a candidate that
 * would fall below the floor is SKIPPED and the next offset outward is tried instead. That
 * is what keeps the set tight near the low end: with a total of 3 the options become
 * {3,4,5,6} rather than {1,2,3,4}, because 1 and 2 are refused outright.
 *
 * The set is built from a fixed candidate list rather than from random draws, so the result
 * is four options for every possible total without relying on a retry loop.
 */
export function buildOptions(total: number, random: () => number): number[] {
  const candidates = new Set<number>([total]);
  // Offsets alternate outward from the answer: -1, +1, -2, +2, -3, +3, ...
  for (let distance = 1; candidates.size < OPTION_COUNT && distance <= 8; distance += 1) {
    for (const candidate of [total - distance, total + distance]) {
      if (candidates.size >= OPTION_COUNT) break;
      if (candidate >= MIN_OPTION) candidates.add(candidate);
    }
  }
  // A total so small that the floor refuses every neighbour would leave fewer than four
  // choices. The smallest total the generator can produce is 3 (one triangle), which always
  // yields exactly four, so this is a backstop rather than an expected path.
  for (let filler = MIN_OPTION; candidates.size < OPTION_COUNT; filler += 1) {
    candidates.add(filler);
  }
  // The width is checked rather than trimmed. A `.slice` here would silently discard the
  // LARGEST candidate whenever five were gathered - dropping a tight neighbour in favour of a
  // far one, which is the exact opposite of what the set is for. If the loop above ever
  // overshoots, that is a bug worth hearing about.
  const options = [...candidates];
  if (options.length !== OPTION_COUNT) {
    throw new Error(
      `star options: built ${options.length} candidates for a total of ${total}, expected ${OPTION_COUNT}`,
    );
  }
  return shuffle(options, random);
}
