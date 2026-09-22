/**
 * Round data for "מי באסם?" - Who Is In The Barn?
 *
 * The barn door cracks open just enough to show pairs of legs. The child counts
 * the legs and works out how many animals are inside, which is grouping and
 * division dressed up as a guessing game:
 *
 *   4 animals x 4 legs = 16 legs, so 16 legs means 4 cows.
 *
 * Only whole animals are ever produced, so the answer is always exact.
 */
import { FARM_ANIMALS } from '../farm/farmAnimalsData';

/** Animals with a known leg count, keyed by the farm sprite id. */
const LEGS: Record<string, number> = {
  rabbit: 4,
  lamb: 4,
  foal: 4,
  puppy: 4,
  kitten: 4,
  duckling: 2,
};

export interface BarnRound {
  /** The animal peeking through the door. */
  animalId: string;
  nameHebrew: string;
  emoji: string;
  legsPerAnimal: number;
  /** How many animals are hidden. */
  count: number;
  /** Total legs visible - the number the child is told. */
  totalLegs: number;
  /** Candidate counts, always containing `count`. */
  choices: number[];
}

const CHOICE_COUNT = 4;

function randInt(min: number, max: number, random: () => number) {
  return min + Math.floor(random() * (max - min + 1));
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function buildBarnRound(random: () => number = Math.random): BarnRound {
  const animal = FARM_ANIMALS[Math.floor(random() * FARM_ANIMALS.length)]!;
  const legsPerAnimal = LEGS[animal.id] ?? 4;

  // Keep the totals inside the 1-10 tables: two-legged animals can go higher
  // because their products stay smaller.
  const maxCount = legsPerAnimal === 2 ? 9 : 8;
  const count = randInt(2, maxCount, random);
  const totalLegs = count * legsPerAnimal;

  const choices = new Set<number>([count]);
  let guard = 0;
  while (choices.size < CHOICE_COUNT && guard < 80) {
    guard += 1;
    // Plausible mistakes: off by one animal, or a neighbour pair/triple.
    const candidate = count + randInt(1, 3, random) * (random() < 0.5 ? -1 : 1);
    if (candidate >= 1 && candidate <= 12) choices.add(candidate);
  }
  let filler = 1;
  while (choices.size < CHOICE_COUNT) {
    if (!choices.has(count + filler)) choices.add(count + filler);
    filler += 1;
  }

  return {
    animalId: animal.id,
    nameHebrew: animal.nameHebrew,
    emoji: animal.emoji,
    legsPerAnimal,
    count,
    totalLegs,
    choices: shuffle([...choices], random),
  };
}

/** "16 ÷ 4 = 4" - the confirmation line once the barn is solved. */
export function describeBarn(round: BarnRound): string {
  return `${round.totalLegs} ÷ ${round.legsPerAnimal} = ${round.count}`;
}
