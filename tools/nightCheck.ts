/**
 * Verification for "האסם בלילה": arithmetic, tiers, shuffle, placement.
 *
 * Run with: npx tsx tools/nightCheck.ts
 *
 * Checks the things that are easy to get subtly wrong and impossible to eyeball:
 *   - every round's stated answer really is the right answer to its question
 *   - halving rounds always show an EVEN number of eyes, and no animal has more
 *     or fewer than two eyes
 *   - doubling rounds show exactly the number of animals they claim
 *   - detective rounds contain exactly the target count they will reveal
 *   - NO TWO ANIMALS EVER OVERLAP, at any tier
 *   - the four options are unique, contain the answer, and are tight neighbours
 *   - shuffleOptions puts the answer in each button slot about 25% of the time
 */
import { buildNightPuzzle, countSpecies } from '../src/components/farm/night/nightGenerator';
import { nightTierForRound, nightOptionsFor } from '../src/components/farm/night/nightRules';
import { ANIMAL_SIZE, MAX_SPOT_SCALE } from '../src/components/farm/night/nightStageData';

let failures = 0;
function check(label: string, condition: boolean, detail = '') {
  if (!condition) {
    failures += 1;
    console.error(`  FAIL  ${label}${detail ? ` :: ${detail}` : ''}`);
  }
}

/** A reproducible RNG so a failure can be re-run. */
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROUNDS = 60;
const TRIALS = 4000;
const seenLevels = new Set<number>();

console.log(`\n=== Arithmetic + shape, ${TRIALS} puzzles over ${ROUNDS} rounds ===`);
for (let trial = 0; trial < TRIALS; trial += 1) {
  const rng = mulberry(trial + 1);
  const round = 1 + (trial % ROUNDS);
  const puzzle = buildNightPuzzle(round, rng);
  seenLevels.add(puzzle.level);

  // --- The tier must match the round schedule. ---
  check('tier matches round', puzzle.level === nightTierForRound(round), `round ${round} -> L${puzzle.level}`);

  // --- The declared answer must satisfy the question. ---
  if (puzzle.mode === 'halve') {
    const eyes = Number(puzzle.question.match(/(\d+) עיניים/)![1]);
    check('halve: eyes == animals * 2', eyes === puzzle.answer * 2, `${eyes} vs ${puzzle.answer}`);
    check('halve: eyes are even', eyes % 2 === 0, `eyes=${eyes}`);
    check('halve: spot count == answer', puzzle.spots.length === puzzle.answer, `${puzzle.spots.length} vs ${puzzle.answer}`);
    check('halve: eyes in range 4..18', eyes >= 4 && eyes <= 18, `eyes=${eyes}`);
  } else if (puzzle.mode === 'double') {
    const animals = Number(puzzle.question.match(/יש (\d+) /)![1]);
    check('double: question count == spot count', animals === puzzle.spots.length, `${animals} vs ${puzzle.spots.length}`);
    check('double: answer == animals * 2', puzzle.answer === animals * 2, `${puzzle.answer} vs ${animals * 2}`);
    check('double: animals in 3..6', animals >= 3 && animals <= 6, `n=${animals}`);
    // Everyone visible must be the same species, or "N sheep" would be a lie.
    const species = new Set(puzzle.spots.map((s) => s.animal));
    check('double: one species', species.size === 1, `${[...species].join(',')}`);
  } else {
    check('detective: has a target', puzzle.target !== null);
    const actual = countSpecies(puzzle.spots, puzzle.target!);
    check('detective: target count == answer', actual === puzzle.answer, `${actual} vs ${puzzle.answer}`);
    check('detective: crowd has decoys', puzzle.spots.length > puzzle.answer, `${puzzle.spots.length} vs ${puzzle.answer}`);
    check('detective: crowd size 5..9', puzzle.spots.length >= 5 && puzzle.spots.length <= 9, `n=${puzzle.spots.length}`);
  }

  // --- Options. ---
  check('options: four of them', puzzle.options.length === 4, `${puzzle.options.length}`);
  check('options: unique', new Set(puzzle.options).size === 4, puzzle.options.join(','));
  check('options: contain the answer', puzzle.options.includes(puzzle.answer), puzzle.options.join(','));
  check('options: all positive', puzzle.options.every((o) => o >= 1), puzzle.options.join(','));
  // TIGHT: every distractor is within 2 of the answer, so the child cannot
  // eliminate absurd choices and must actually compute the doubling or halving.
  check(
    'options: tight distractors',
    puzzle.options.every((o) => Math.abs(o - puzzle.answer) <= 2),
    `${puzzle.options.join(',')} answer=${puzzle.answer}`,
  );

  // --- Placement: no two animals may overlap. ---
  const footprint = ANIMAL_SIZE * MAX_SPOT_SCALE;
  for (let i = 0; i < puzzle.spots.length; i += 1) {
    for (let j = i + 1; j < puzzle.spots.length; j += 1) {
      const a = puzzle.spots[i]!;
      const b = puzzle.spots[j]!;
      const overlapX = Math.abs(a.x - b.x) < footprint;
      const overlapY = Math.abs(a.y - b.y) < footprint;
      check('placement: no overlap', !(overlapX && overlapY), `#${a.id}(${a.x},${a.y}) vs #${b.id}(${b.x},${b.y})`);
    }
  }
  // Every animal must stand inside the pasture band.
  for (const spot of puzzle.spots) {
    check('placement: x in bounds', spot.x >= 80 && spot.x <= 720, `x=${spot.x}`);
    check('placement: y in bounds', spot.y >= 140 && spot.y <= 250, `y=${spot.y}`);
  }
}

console.log(`  tiers exercised: ${[...seenLevels].sort().join(', ')}`);
check('all four tiers reachable', seenLevels.size === 4, [...seenLevels].join(','));

// --- Shuffle uniformity: the answer must not favour a slot. ---
console.log(`\n=== Option slot distribution (${TRIALS} draws) ===`);
const slotHits = [0, 0, 0, 0];
const SHUF_TRIALS = 40000;
for (let i = 0; i < SHUF_TRIALS; i += 1) {
  const rng = mulberry(i + 7);
  const answer = 5;
  const options = nightOptionsFor(answer, rng);
  slotHits[options.indexOf(answer)] += 1;
}
const expected = SHUF_TRIALS / 4;
for (let slot = 0; slot < 4; slot += 1) {
  const pct = (slotHits[slot]! / SHUF_TRIALS) * 100;
  const drift = Math.abs(slotHits[slot]! - expected) / expected;
  // 5% tolerance around a uniform 25% is far tighter than any real bias.
  check(`slot ${slot} near 25%`, drift < 0.05, `${pct.toFixed(2)}% (drift ${(drift * 100).toFixed(1)}%)`);
  console.log(`  slot ${slot}: ${pct.toFixed(2)}%`);
}

console.log('\n=== Question samples ===');
for (const round of [1, 3, 5, 8]) {
  const rng = mulberry(round * 11);
  const puzzle = buildNightPuzzle(round, rng);
  console.log(
    `  L${puzzle.level} [${puzzle.mode}] "${puzzle.question}" -> ${puzzle.answer}` +
      `   options=[${puzzle.options.join(', ')}]  animals=${puzzle.spots.length}`,
  );
}

if (failures === 0) console.log('\nALL CHECKS PASSED\n');
else {
  console.error(`\n${failures} CHECK(S) FAILED\n`);
  process.exit(1);
}
