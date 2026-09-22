/**
 * Puzzle generation for "האסם בלילה".
 *
 * REVERSE GENERATION, like the other farm stations: we CHOOSE the answer first
 * and build the question from it, so the arithmetic can never come out wrong.
 * For a halving round we pick the animal count and derive `eyes = animals * 2`;
 * for a doubling round we pick the count and ask for the eyes. Either way the
 * answer is a whole number by construction.
 *
 * Placement is delegated to `nightPlacement`, where non-overlap is a property of
 * a fixed grid rather than of a retry loop.
 */
import { ALL_NIGHT_ANIMALS, getDetectiveQuestion, nightAnimalName, nightDetectiveSpecies } from './nightNames';
import { NIGHT_TIERS, nightInt, nightOptionsFor, nightPick, nightTierForRound } from './nightRules';
import { MAX_SPOTS, placeSpots, randomScale } from './nightPlacement';
import type { NightAnimal, NightPuzzle, NightSpot } from './nightTypes';

/** The smallest and largest crowd a detective round may put on stage. */
const DETECTIVE_MIN_CROWD = 5;
const DETECTIVE_MAX_CROWD = 7;

/** Builds the visible animals for a round. */
function buildSpots(
  mode: string,
  answer: number,
  rng: () => number,
  target: NightAnimal | null,
): NightSpot[] {
  const species: NightAnimal[] = [];
  let total: number;

  if (mode === 'detective') {
    // A crowd of EXACTLY `answer` target animals plus decoys, so the answer IS
    // the count of the named species - there is no second number to keep in sync.
    const decoys = ALL_NIGHT_ANIMALS.filter((animal) => animal !== target);
    total = Math.max(nightInt(DETECTIVE_MIN_CROWD, DETECTIVE_MAX_CROWD, rng), answer);
    for (let i = 0; i < total; i += 1) {
      species.push(i < answer ? (target as NightAnimal) : nightPick(decoys, rng));
    }
  } else {
    // Everyone is the same species, so "one animal, two eyes" stays unambiguous.
    total = answer;
    const single = nightPick(ALL_NIGHT_ANIMALS, rng);
    for (let i = 0; i < total; i += 1) species.push(single);
  }

  const positions = placeSpots(total, rng);

  // THE GRID IS THE CEILING, AND EXCEEDING IT SILENTLY DROPS ANIMALS. `placeSpots`
  // returns at most MAX_SPOTS positions, so a crowd larger than that would be cut
  // short - and because the target species is placed first, a truncated crowd can
  // lose exactly the animals the question is about, leaving a keypad with no correct
  // answer. That is a generator bug, not a layout condition, so it fails loudly.
  if (positions.length < total) {
    throw new Error(
      `night puzzle wants ${total} animals but the barn holds ${MAX_SPOTS}`,
    );
  }

  return positions.map((position, index) => ({
    id: index,
    animal: species[index] as NightAnimal,
    x: position.x,
    y: position.y,
    scale: randomScale(rng),
  }));
}

/**
 * REVERSE CONSTRUCTION for a detective round.
 *
 * The question is "how many X are hiding?", so the generator decides the answer
 * FIRST and then builds a stage that contains exactly that many:
 *
 *   1. pick a target species
 *   2. pick Q from the tier's range - never 0, so the species is always present
 *   3. stand exactly Q of them on the grid
 *   4. fill the rest with OTHER species, to a crowd of 5-7
 *   5. build four options around Q, so Q is always among them
 *
 * The previous version picked a random `answer` and built the crowd from it, which
 * relied on the crowd size happening to stay under the placement cap for the species
 * to survive. Deriving everything from Q makes presence and correctness properties of
 * the construction rather than of luck.
 */
function buildDetectivePuzzle(level: number, rng: () => number): NightPuzzle {
  const tier = NIGHT_TIERS[level] ?? NIGHT_TIERS[4]!;

  // 1 & 2. A species, and a count that is never zero.
  const target = nightPick(nightDetectiveSpecies(), rng);
  const q = nightInt(Math.max(1, tier.minAnswer), tier.maxAnswer, rng);

  // 3 & 4. Q of the target, then decoys of other species up to the crowd size.
  const spots = buildSpots('detective', q, rng, target);

  // 5. The options always contain Q, so the round is answerable by construction.
  return {
    level,
    mode: 'detective',
    spots,
    question: getDetectiveQuestion(target),
    answer: q,
    options: nightOptionsFor(q, rng),
    target,
    targetCount: q,
  };
}

export function buildNightPuzzle(round: number, rng: () => number = Math.random): NightPuzzle {
  const level = nightTierForRound(round);
  const tier = NIGHT_TIERS[level] ?? NIGHT_TIERS[1]!;

  // Detective rounds derive their own answer, so the generic draw is skipped.
  if (tier.mode === 'detective') return buildDetectivePuzzle(level, rng);

  const answer = nightInt(tier.minAnswer, tier.maxAnswer, rng);

  if (tier.mode === 'double') {
    // The animals are the prompt; the eyes are the answer.
    const spots = buildSpots('double', answer, rng, null);
    // `nightAnimalName` never throws, and the `?? 'חיות'` covers the theoretical
    // empty-spot case rather than asserting it away with a `!`.
    const species = spots[0] ? nightAnimalName(spots[0].animal).plural : 'חיות';
    return {
      level,
      mode: 'double',
      spots,
      question: `בחושך יש ${answer} ${species}. כמה עיניים יזהרו לנו?`,
      answer: answer * 2,
      options: nightOptionsFor(answer * 2, rng),
      target: null,
      targetCount: answer,
    };
  }

  // Halve: the eyes are the prompt; the animals are the answer.
  const spots = buildSpots('halve', answer, rng, null);
  return {
    level,
    mode: 'halve',
    spots,
    question: `נספרו ${answer * 2} עיניים זוהרות. כמה חיות באסם?`,
    answer,
    options: nightOptionsFor(answer, rng),
    target: null,
    targetCount: answer,
  };
}

/** How many of `animal` are visible - used to reveal a detective answer. */
export function countSpecies(spots: readonly NightSpot[], animal: NightAnimal): number {
  return spots.filter((spot) => spot.animal === animal).length;
}
