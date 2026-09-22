/**
 * Round generator for station 5 - "תעלומת העקבות" (Mud Tracks Mystery).
 *
 * A heads-and-feet riddle. Chickens have 2 legs, sheep have 4. The child is
 * given the totals plus one species' count and deduces the other.
 */
import { buildChoices, randInt } from '../farmRoundUtils';

export interface TracksRound {
  chickens: number;
  sheep: number;
  heads: number;
  feet: number;
  /** Which species the child must deduce. */
  asked: 'chickens' | 'sheep';
  answer: number;
  choices: number[];
  promptHebrew: string;
}

export function buildTracksRound(random = Math.random): TracksRound {
  const chickens = randInt(2, 6, random);
  const sheep = randInt(2, 6, random);
  const heads = chickens + sheep;
  const feet = chickens * 2 + sheep * 4;
  const asked: TracksRound['asked'] = random() < 0.5 ? 'chickens' : 'sheep';
  const given = asked === 'chickens' ? sheep : chickens;
  const givenName = asked === 'chickens' ? 'כבשים' : 'תרנגולות';
  const askedName = asked === 'chickens' ? 'תרנגולות' : 'כבשים';
  const answer = asked === 'chickens' ? chickens : sheep;

  return {
    chickens,
    sheep,
    heads,
    feet,
    asked,
    answer,
    choices: buildChoices(answer, 2, random),
    promptHebrew: `בבוץ יש ${heads} ראשים ו-${feet} רגליים, וכן ${given} ${givenName}. כמה ${askedName} עברו?`,
  };
}
