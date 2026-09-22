/**
 * Small, dependency-free random utilities used by the math engine.
 */

export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const pick = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)] as T;

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy;
}

/** Maps a 1..5 map-difficulty level onto a numeric range. */
export function scale(level: number, min: number, max: number): number {
  const clamped = Math.min(5, Math.max(1, level));
  return Math.round(min + ((max - min) * (clamped - 1)) / 4);
}

/** Multiple-choice options: 1 correct + 3 plausible distractors. */
export function buildOptions(answer: number, maxDistractor: number): number[] {
  const options = new Set<number>([answer]);
  let guard = 0;
  while (options.size < 4 && guard < 100) {
    guard += 1;
    const delta = randomInt(1, Math.max(2, Math.min(9, maxDistractor)));
    const candidate = answer + (Math.random() < 0.5 ? -delta : delta);
    if (candidate >= 0 && candidate !== answer) options.add(candidate);
  }
  return shuffle([...options]);
}
