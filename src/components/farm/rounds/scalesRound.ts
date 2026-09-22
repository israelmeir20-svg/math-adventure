/**
 * Round generator for station 3 - "מאזני האסם" (Barn Scales).
 *
 * The beam balance must settle flat, which happens when the child supplies the
 * missing multiplier so that A x ? = B.
 */
import { buildChoices, randInt } from '../farmRoundUtils';

export interface ScalesRound {
  a: number;
  b: number;
  /** The missing multiplier, i.e. b / a. */
  answer: number;
  choices: number[];
}

export function buildScalesRound(random = Math.random): ScalesRound {
  const a = randInt(2, 6, random);
  const answer = randInt(2, 8, random);
  const b = a * answer;
  return { a, b, answer, choices: buildChoices(answer, 3, random) };
}
