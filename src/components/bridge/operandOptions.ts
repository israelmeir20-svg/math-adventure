/**
 * Multiple-choice builder for missing-operand problems.
 *
 * The shared `buildOptions` helper produces distractors around a *result*,
 * but for "6 × ? = 42" the choices must be plausible *operands*. Here the
 * distractors are scaled to the answer's magnitude: a missing factor of 6
 * should never be offered alongside 106, and a plausible fraction of one
 * operand (e.g. x2, half, +-10) is far more instructive than a random jump.
 */
import { pick, shuffle } from '../../logic/random';

/**
 * Builds 4 distinct positive options around `answer`.
 * `maxSpread` caps how far a distractor may stray for small answers.
 */
export function operandOptions(answer: number, maxSpread: number): number[] {
  const candidates = new Set<number>([answer]);
  const ceiling = Math.max(maxSpread, answer);

  // Deltas scale with the answer so they stay believable.
  const base = Math.max(1, Math.round(Math.abs(answer) * 0.2));
  const deltas = [1, 2, base, base * 2, 10, 20];
  let guard = 0;

  while (candidates.size < 4 && guard < 200) {
    guard += 1;
    const delta = pick(deltas) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = answer + delta;
    if (candidate > 0 && candidate <= ceiling) candidates.add(candidate);
  }

  // Fill outwards from the answer, staying inside the plausible range.
  let step = 1;
  while (candidates.size < 4) {
    const up = answer + step;
    const down = answer - step;
    if (up <= ceiling && up > 0) candidates.add(up);
    if (candidates.size < 4 && down > 0) candidates.add(down);
    step += 1;
  }

  return shuffle([...candidates]);
}
