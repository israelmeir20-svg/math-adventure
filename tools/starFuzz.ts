/**
 * Do the star rounds actually obey the rules they claim to?
 *
 * Every invariant in the spec is checked against the REAL generator rather than a
 * reimplementation of it, because a check that models the code instead of running it passes
 * happily while the shipped game is broken.
 *
 * The generator's hostile-input behaviour matters as much as the average case. `pick` and the
 * option builder both index into arrays, and an off-by-one there would not throw - it would
 * quietly return `undefined` and paint a shape with no stars, or a button reading "NaN". So the
 * extremes are driven explicitly.
 *
 * Run: npx tsx tools/starFuzz.ts
 */
import { buildStarRound } from '../src/components/farm/stars/starGenerator';
import { levelForRound } from '../src/components/farm/stars/starTiers';
import {
  ANCHORS,
  MAX_REACH,
  SHAPE_RADII,
  SHAPE_SIZES,
  VIEW_H,
  VIEW_W,
} from '../src/components/farm/stars/starData';
import { MIN_OPTION, OPTION_COUNT } from '../src/components/farm/stars/starRules';
import type { StarRound } from '../src/components/farm/stars/starTypes';

let failures = 0;
function check(label: string, condition: boolean, detail = '') {
  if (!condition) {
    failures += 1;
    console.error(`  FAIL  ${label}${detail ? ` :: ${detail}` : ''}`);
  }
}

/** Every property a round must satisfy, checked in one place so no driver can skip one. */
function validate(round: StarRound, where: string): void {
  const tag = `${where} (round ${round.roundNumber})`;

  // --- the answer is the sum of what is actually drawn ---
  const drawn = round.shapes.reduce((sum, shape) => sum + shape.stars.length, 0);
  check(`${tag}: total equals the drawn vertices`, round.total === drawn, `${round.total} vs ${drawn}`);
  check(
    `${tag}: the shape count matches its stars`,
    round.shapes.every((s) => s.count === s.stars.length),
  );

  // --- shape sizes are legal ---
  check(
    `${tag}: every shape has a supported size`,
    round.shapes.every((s) => SHAPE_SIZES.includes(s.count as (typeof SHAPE_SIZES)[number])),
    round.shapes.map((s) => s.count).join(','),
  );

  // --- no NaN or undefined leaked into the geometry ---
  const badCoord = round.shapes.some((s) =>
    s.stars.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)),
  );
  check(`${tag}: no non-finite vertex coordinates`, !badCoord);
  check(
    `${tag}: no non-finite anchors`,
    round.shapes.every((s) => Number.isFinite(s.anchor.x) && Number.isFinite(s.anchor.y)),
  );

  // --- every vertex sits at the right radius from its anchor ---
  for (const [i, shape] of round.shapes.entries()) {
    const radius = SHAPE_RADII[shape.count]!;
    const worst = Math.max(
      ...shape.stars.map((p) => Math.abs(Math.hypot(p.x - shape.anchor.x, p.y - shape.anchor.y) - radius)),
    );
    // 0.02 allows for the two-decimal rounding the generator applies.
    check(`${tag}: shape ${i} vertices sit on their ring`, worst < 0.02, `off by ${worst.toFixed(4)}`);
  }

  // --- options ---
  check(`${tag}: exactly four options`, round.options.length === OPTION_COUNT, `${round.options.length}`);
  check(`${tag}: the options are unique`, new Set(round.options).size === round.options.length);
  check(`${tag}: the answer is among the options`, round.options.includes(round.total));
  check(`${tag}: no option is below the floor`, round.options.every((o) => o >= MIN_OPTION));
  check(`${tag}: no option is NaN`, round.options.every((o) => Number.isInteger(o)));
  check(
    `${tag}: options stay tight around the answer`,
    round.options.every((o) => Math.abs(o - round.total) <= 8),
    round.options.join(','),
  );

  // --- separation: shapes must not touch, so the groups stay countable ---
  const anchors = round.shapes.map((s) => s.anchor);
  for (let i = 0; i < anchors.length; i += 1) {
    for (let j = i + 1; j < anchors.length; j += 1) {
      const d = Math.hypot(anchors[i]!.x - anchors[j]!.x, anchors[i]!.y - anchors[j]!.y);
      check(`${tag}: shapes ${i} and ${j} are >= 140px apart`, d >= 140, `${d.toFixed(1)}px`);
      check(`${tag}: shapes ${i} and ${j} cannot touch`, d >= MAX_REACH * 2, `${d.toFixed(1)}px`);
    }
  }

  // --- everything stays on the canvas, including the spin sweep ---
  for (const shape of round.shapes) {
    const { x, y } = shape.anchor;
    check(
      `${tag}: a shape at (${x}, ${y}) stays on canvas`,
      x - MAX_REACH >= 0 && y - MAX_REACH >= 0 && x + MAX_REACH <= VIEW_W && y + MAX_REACH <= VIEW_H,
    );
  }

  // --- the tier's own rules ---
  const expectedShapes = ANCHORS[round.shapes.length] ? round.shapes.length : -1;
  check(`${tag}: the shape count matches a defined layout`, expectedShapes !== -1);
  check(`${tag}: the reported level matches the ladder`, round.level === levelForRound(round.roundNumber));

  if (round.level === 1) {
    check(`${tag}: tier 1 is upright and still`, round.shapes.every((s) => s.rotation === 0 && !s.spinning));
  }
  if (round.level === 2) {
    check(`${tag}: tier 2 does not spin`, round.shapes.every((s) => !s.spinning));
    check(`${tag}: tier 2 has exactly 2 shapes`, round.shapes.length === 2);
  }
  if (round.level === 3) {
    check(`${tag}: tier 3 spins every shape`, round.shapes.every((s) => s.spinning));
    check(`${tag}: tier 3 has exactly 3 shapes`, round.shapes.length === 3);
  }
}

console.log('\n=== Hostile random sources ===');
const ADVERSARIAL: [string, () => number][] = [
  ['always 0', () => 0],
  ['always 0.999999', () => 0.999999],
  ['always 0.5', () => 0.5],
  ['always 1/3', () => 1 / 3],
];
for (const [name, rng] of ADVERSARIAL) {
  for (let roundNumber = 1; roundNumber <= 40; roundNumber += 1) {
    validate(buildStarRound(roundNumber, rng), `rng ${name}`);
  }
}
console.log(`  drove ${ADVERSARIAL.length * 40} rounds through ${ADVERSARIAL.length} adversarial sources`);

console.log('\n=== Uniform random, 20000 rounds ===');
{
  let seed = 12345;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < 20000; i += 1) {
    validate(buildStarRound((i % 30) + 1, rng), 'uniform');
  }
  console.log('  20000 rounds checked');
}

console.log('\n=== Determinism: the same seed must give the same sky ===');
{
  const make = (s: number) => {
    let seed = s;
    return () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
  };
  for (const roundNumber of [1, 3, 5, 8, 12]) {
    const a = JSON.stringify(buildStarRound(roundNumber, make(999)));
    const b = JSON.stringify(buildStarRound(roundNumber, make(999)));
    const c = JSON.stringify(buildStarRound(roundNumber, make(1000)));
    check(`round ${roundNumber}: identical seeds reproduce`, a === b);
    check(`round ${roundNumber}: different seeds generally differ`, a !== c);
  }
}

console.log('\n=== The ladder boundaries ===');
for (const roundNumber of [1, 2, 3, 4, 5, 6, 7, 8, 20, 60]) {
  const round = buildStarRound(roundNumber, () => 0.42);
  console.log(
    `  round ${String(roundNumber).padStart(2)}: level ${round.level}, ${round.shapes.length} shape(s), ` +
      `sizes [${round.shapes.map((s) => s.count).join(',')}], total ${round.total}, ` +
      `spin ${round.shapes.some((s) => s.spinning) ? 'yes' : 'no'}`,
  );
}

console.log('\n=== The correct answer lands in each slot about equally often ===');
{
  // A MULBERRY32, NOT THE LCG USED ELSEWHERE IN THIS FILE. The test above asserts INVARIANTS,
  // which hold for any random source. This one asserts a DISTRIBUTION, and a linear
  // congruential generator is a poor tool for that: its low bits are strongly correlated
  // between successive draws, and Fisher-Yates consumes draws in sequence, so the correlation
  // survives into the output. Run with an LCG, this check reported slot 0 six percent light -
  // which looked like a biased shuffle but was the generator. Verified by `starShuffleProbe.ts`,
  // which shows the same shuffle is uniform to within 0.6% under `Math.random` and skewed under
  // the LCG regardless of the values being shuffled.
  const SLOTS = 4;
  const TRIALS = 40000;
  const counts = [0, 0, 0, 0];
  let seed = 2024;
  const rng = () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < TRIALS; i += 1) {
    const round = buildStarRound((i % 30) + 1, rng);
    counts[round.options.indexOf(round.total)] += 1;
  }
  const expected = TRIALS / SLOTS;
  for (const [slot, n] of counts.entries()) {
    const drift = Math.abs(n - expected) / expected;
    console.log(`  slot ${slot}: ${n} (${(drift * 100).toFixed(1)}% from even)`);
    check(`slot ${slot} is within 5% of even`, drift <= 0.05, `${(drift * 100).toFixed(1)}%`);
  }
}

if (failures === 0) console.log('\nALL STAR ROUND INVARIANTS HOLD\n');
else {
  console.error(`\n${failures} STAR CHECK(S) FAILED\n`);
  process.exit(1);
}
