/**
 * Round generator for station 4 - "פנס בלילה באסם" (Night Spotlight).
 *
 * Animals are scattered across a dark stage at fixed percentage coordinates.
 * Each one is revealed by a pair of glowing eyes; the child counts the animals.
 */
import { buildChoices, randInt } from '../farmRoundUtils';

export interface SpotlightRound {
  spots: { id: string; x: number; y: number; animalId: number }[];
  answer: number;
  choices: number[];
}

export const SPOT_ANIMALS = ['🐄', '🐑', '🐐', '🐔', '🦆', '🐖', '🐈', '🐕'] as const;

export function buildSpotlightRound(random = Math.random): SpotlightRound {
  const count = randInt(3, 7, random);
  const spots = Array.from({ length: count }, (_, i) => ({
    id: `spot-${i}`,
    // Kept away from the very edges so the torch can still reach every animal.
    x: randInt(12, 88, random),
    y: randInt(18, 82, random),
    animalId: randInt(0, SPOT_ANIMALS.length - 1, random),
  }));
  return { spots, answer: count, choices: buildChoices(count, 2, random) };
}
