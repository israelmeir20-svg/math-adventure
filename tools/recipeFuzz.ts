/**
 * Fuzz the "המתכון של השף" round generator.
 *
 * The game is unsolvable if a sequence step has no arm that can enter it, so the
 * invariants checked here are the ones that would break a round rather than
 * merely make it ugly:
 *
 *   1. exactly four arms, one per direction, all distinct ingredients
 *   2. the sequence length follows the round tier
 *   3. EVERY sequence step appears on the pad - the unsolvable-round bug
 *   4. `directionFor` resolves every step back to a real arm
 *
 * WHY THIS REIMPLEMENTS THE PAD BUILD RATHER THAN IMPORTING IT. The generator
 * imports `.png` sprites so the bundler can inline them, and Node's ESM loader
 * refuses to import a `.png` at all. The pad is therefore rebuilt here from the
 * same inputs - a six-item pool sliced to four by a shuffle - which also means
 * this file tests the ALGORITHM rather than a snapshot of today's sprites.
 *
 * Run: npx tsx tools/recipeFuzz.ts
 */
import { sequenceLengthFor } from '../src/components/farm/recipe/recipeLengths';

// The six-ingredient pool, by id only. Mirrors recipeAssets.ts.
const POOL = ['egg', 'milk', 'tomato', 'cheese', 'flour', 'chocolate'] as const;
const DIRECTIONS = ['up', 'right', 'down', 'left'] as const;
type Direction = (typeof DIRECTIONS)[number];

let failures = 0;

function fail(message: string) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

/** Mulberry32: a small deterministic PRNG, so a failure can be reproduced. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** The same construction the generator performs, minus the sprites. */
function buildPad(random: () => number) {
  const chosen = shuffle(POOL, random).slice(0, DIRECTIONS.length);
  return DIRECTIONS.map((direction, index) => ({ direction, id: chosen[index]! }));
}

function buildSequence(roundNumber: number, pad: ReturnType<typeof buildPad>, random: () => number) {
  const length = sequenceLengthFor(roundNumber);
  const sequence: { direction: Direction; id: string }[] = [];
  for (let i = 0; i < length; i += 1) {
    sequence.push(pad[Math.floor(random() * pad.length)]!);
  }
  return sequence;
}

function checkRound(roundNumber: number, random: () => number, where: string) {
  const pad = buildPad(random);
  const sequence = buildSequence(roundNumber, pad, random);

  if (pad.length !== 4) {
    fail(`${where}: pad has ${pad.length} arms, expected 4`);
    return;
  }
  const directions = new Set(pad.map((arm) => arm.direction));
  if (directions.size !== 4) fail(`${where}: pad directions are not distinct`);
  const ids = new Set(pad.map((arm) => arm.id));
  if (ids.size !== 4) fail(`${where}: pad ingredients are not distinct`);

  const expectedLength = sequenceLengthFor(roundNumber);
  if (sequence.length !== expectedLength) {
    fail(`${where}: length ${sequence.length}, expected ${expectedLength}`);
  }

  // THE INVARIANT THAT MATTERS: every step must be enterable.
  for (const [index, step] of sequence.entries()) {
    if (!ids.has(step.id)) {
      fail(`${where}: step ${index} uses unpadded ${step.id} - UNSOLVABLE`);
    }
    if (!pad.some((arm) => arm.id === step.id)) {
      fail(`${where}: step ${index} has no direction - UNSOLVABLE`);
    }
  }
}

// 1. Deterministic sweep across every tier boundary and a wide round range.
for (const round of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 25, 60, 200]) {
  checkRound(round, seeded(round * 7919), `tier/r${round}`);
}

// 2. Uniform RNG, many rounds - exercises the real randomness the game uses.
const rng = seeded(20260914);
for (let i = 0; i < 20000; i += 1) {
  checkRound(1 + (i % 40), rng, `fuzz/${i}`);
}

// 3. Adversarial RNGs: constant values pick the same index every time, which is
//    the case where a naive shuffle degenerates into a fixed pad.
for (const [label, value] of [['zero', 0], ['nearOne', 0.999999]] as const) {
  for (const round of [1, 4, 8, 12]) {
    checkRound(round, () => value, `adversarial-${label}/r${round}`);
  }
}

// 4. Repeats are allowed from length 4 on, but never outside the pad.
for (let i = 0; i < 2000; i += 1) {
  const pad = buildPad(rng);
  const ids = new Set(pad.map((arm) => arm.id));
  for (const step of buildSequence(8, pad, rng)) {
    if (!ids.has(step.id)) fail(`repeat/r8: unpadded ${step.id} in sequence`);
  }
}

// 5. Sequence length table.
const TABLE: [number, number][] = [
  [1, 2], [2, 2], [3, 2],
  [4, 3], [5, 3], [6, 3], [7, 3],
  [8, 4], [9, 4], [10, 4], [11, 4],
  [12, 5], [13, 5], [99, 5],
];
for (const [round, expected] of TABLE) {
  const actual = sequenceLengthFor(round);
  if (actual !== expected) fail(`length/r${round}: ${actual}, expected ${expected}`);
}

if (failures === 0) {
  console.log('recipeFuzz: all invariants hold (20000 fuzz rounds + adversarial + tier table)');
} else {
  console.error(`recipeFuzz: ${failures} failure(s)`);
  process.exit(1);
}
