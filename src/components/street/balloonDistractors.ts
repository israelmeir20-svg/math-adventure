/**
 * Builds numbers that *look* like real multiples but are not.
 *
 * The whole difficulty of the game is that a child cannot answer by eyeballing
 * magnitude - every distractor has to survive a quick "is that in the six
 * times table?" check. So distractors are drawn from the shapes that actually
 * catch people out:
 *
 *   - a real multiple nudged by 1 or 2   (16, 22, 26 for the 6s)
 *   - a neighbouring table's multiple    (5s and 7s when the target is 6)
 *   - a multiple shifted by a whole step (6 x 4 +/- 6)
 */

/** Nudges applied to a genuine multiple. Small, because +/-1 is the trap. */
const NUDGES = [1, -1, 2, -2] as const;

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

/**
 * The classic trap: a genuine multiple nudged just off the sequence, e.g. for
 * the six times table 16, 22, 26, 32, 40. Always adjacent to real table work.
 */
function nearMiss(table: number, random: () => number): number {
  const step = 3 + Math.floor(random() * 7);
  return table * step + pick(NUDGES, random);
}

/**
 * A real multiple of the target displaced by a whole extra step - it sits
 * between two genuine multiples, so it reads as "surely in the table".
 */
function shiftedStep(table: number, random: () => number): number {
  const step = 2 + Math.floor(random() * 7);
  const shift = pick([1, -1], random);
  const candidate = table * step + shift * table;
  return candidate + pick([1, -1], random);
}

/**
 * A neighbouring table's multiple, e.g. 5 x 7 = 35 or 7 x 6 = 42 for the sixes.
 *
 * Only odd multipliers are used. Even multipliers of two-digit tables collapse
 * into round numbers (5 x 8 = 40, 10 x 8 = 80) which are far too easy to
 * dismiss, and the whole point of a distractor is that it needs real thought.
 */
function neighbourTable(table: number, random: () => number): number {
  const offset = pick([-2, -1, 1, 2], random);
  const neighbour = Math.max(2, table + offset);
  const oddStep = 3 + 2 * Math.floor(random() * 4);
  return neighbour * oddStep;
}

/**
 * A credible non-multiple of `table`, never colliding with a number already
 * on stage. Falls back to a nudged multiple if the shapes all collide, which
 * cannot loop forever.
 */
export function pickDistractor(
  table: number,
  taken: ReadonlySet<number>,
  random: () => number = Math.random,
): number {
  for (let guard = 0; guard < 60; guard += 1) {
    const shape = random();
    const candidate =
      shape < 0.55
        ? nearMiss(table, random)
        : shape < 0.8
          ? shiftedStep(table, random)
          : neighbourTable(table, random);

    const usable =
      candidate > 0 &&
      candidate !== table &&
      candidate % table !== 0 &&
      !taken.has(candidate);
    if (usable) return candidate;
  }
  // Deterministic fallback that is still off-sequence.
  let fallback = table * 10 + 1;
  while (taken.has(fallback)) fallback += 1;
  return fallback;
}
