/**
 * Body tones for the balloon field.
 *
 * ===================================================================
 * THE PALETTE IS A TEACHING AID, AND THAT IS THE WHOLE POINT.
 * ===================================================================
 *
 * Every balloon whose number could plausibly be a multiple looks the SAME. A
 * child cannot learn to filter the seven times table if the correct answers are a
 * different colour from the distractors - the number has to be the only signal,
 * or the game teaches colour-sorting and nothing else.
 *
 * So numbered balloons share one cool blue family and only the KIND of balloon
 * gets its own hue. Since the sprint has just two kinds, that means exactly one
 * exception: the golden balloon, which is a bonus by design and is meant to be
 * spotted at a glance.
 */
import type { FloatingBalloon } from './balloonTypes';

const NUMBER_TONES = [
  'from-sky-300 to-sky-500',
  'from-sky-200 to-sky-400',
  'from-cyan-300 to-cyan-500',
  'from-indigo-200 to-indigo-400',
  'from-teal-200 to-teal-400',
];

const GOLDEN_TONE = 'from-amber-200 to-amber-400';

/** Tailwind gradient stops for a balloon's teardrop body. */
export function toneFor(balloon: FloatingBalloon): string {
  if (balloon.kind === 'golden') return GOLDEN_TONE;
  return NUMBER_TONES[balloon.value % NUMBER_TONES.length]!;
}
