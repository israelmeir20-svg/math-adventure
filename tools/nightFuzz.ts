/**
 * Hostile fuzz test: does `buildNightPuzzle` ever THROW?
 *
 * The reported symptom is that certain rounds freeze the game, so this drives the
 * real generator over a large number of rounds and seeds and reports any
 * exception, along with the mode and species that produced it.
 *
 * It deliberately probes the paths most likely to break:
 *   - every tier, including the mathematically awkward boundaries
 *   - adversarial RNGs that always return 0 or always return ~1, which force the
 *     first/last element of every pool and every min/max branch
 *
 * Run: npx tsx tools/nightFuzz.ts
 */
import { buildNightPuzzle } from '../src/components/farm/night/nightGenerator';
import { NIGHT_ANIMAL_NAMES } from '../src/components/farm/night/nightNames';

/** RNGs that always pick the same end of every range. */
const ADVERSARIAL: Array<[string, () => number]> = [
  ['always 0', () => 0],
  ['always 0.999999', () => 0.999999],
  ['always 0.5', () => 0.5],
  ['always 1/3', () => 1 / 3],
];

let crashCount = 0;
let checked = 0;
const crashes = new Map<string, number>();

function record(label: string, round: number, error: unknown) {
  crashCount += 1;
  const key = `${label} @round=${round} :: ${(error as Error).message}`;
  crashes.set(key, (crashes.get(key) ?? 0) + 1);
}

console.log('\n=== Adversarial RNGs, rounds 1..40 ===');
for (const [label, rng] of ADVERSARIAL) {
  for (let round = 1; round <= 40; round += 1) {
    checked += 1;
    try {
      const puzzle = buildNightPuzzle(round, rng);
      // Also validate the output is usable, not merely non-throwing.
      if (puzzle.spots.length === 0) throw new Error('produced ZERO spots');
      if (!puzzle.question.includes('?') && !puzzle.question.includes('?')) {
        // Hebrew question mark differs; just require a non-empty question.
        if (puzzle.question.trim().length === 0) throw new Error('empty question');
      }
      if (!Number.isFinite(puzzle.answer)) throw new Error('non-finite answer');
      if (puzzle.options.length !== 4) throw new Error(`options=${puzzle.options.length}`);
      if (!puzzle.options.includes(puzzle.answer)) throw new Error('answer not in options');
      for (const spot of puzzle.spots) {
        if (!spot.animal) throw new Error('spot with no species');
        if (!NIGHT_ANIMAL_NAMES[spot.animal]) throw new Error(`unknown species ${spot.animal}`);
        if (spot.animal !== 'undefined' && !NIGHT_ANIMAL_NAMES[spot.animal]) {
          throw new Error(`unnameable species ${spot.animal}`);
        }
      }
    } catch (error) {
      record(label, round, error);
    }
  }
}

console.log('\n=== Uniform random, 20000 rounds ===');
let seed = 1;
const rng = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
for (let i = 0; i < 20000; i += 1) {
  const round = 1 + (i % 40);
  checked += 1;
  try {
    const puzzle = buildNightPuzzle(round, rng);
    if (puzzle.spots.length === 0) throw new Error('produced ZERO spots');
    if (!Number.isFinite(puzzle.answer)) throw new Error('non-finite answer');
    for (const spot of puzzle.spots) {
      if (!NIGHT_ANIMAL_NAMES[spot.animal]) throw new Error(`unknown species ${spot.animal}`);
    }
    // A doubling question must name the species it drew.
    if (puzzle.mode === 'double') {
      const named = puzzle.spots[0]!.animal;
      if (!puzzle.question.includes(NIGHT_ANIMAL_NAMES[named].plural)) {
        throw new Error(`question does not name ${named}`);
      }
    }
  } catch (error) {
    record('uniform', round, error);
  }
}

console.log(`\nchecked ${checked} puzzles`);
if (crashCount > 0) {
  console.error(`\n*** ${crashCount} CRASH(ES) ***`);
  for (const [key, n] of [...crashes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.error(`  x${n}  ${key}`);
  }
  process.exit(1);
}
console.log('ZERO CRASHES\n');
