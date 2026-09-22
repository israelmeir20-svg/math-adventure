/**
 * Invariant fuzz test for the picnic crate generator.
 *
 * The whole game rests on two promises, and a violation of either one produces a
 * round that is impossible to answer correctly:
 *
 *   NO TIES      - two piles with the same count make "which was the MOST?"
 *                  ambiguous, and the child gets marked wrong for a right answer.
 *   NO COLLISIONS- two pieces in one compartment makes the displayed count a lie,
 *                  which is worse than a tie because it looks fine.
 *
 * Plus the two things that make the buttons fair:
 *   - every choice offered is a fruit that is actually in the crate
 *   - the answer is always among the choices
 *
 * This drives the real generator over every tier with adversarial RNGs as well as
 * uniform random, and checks all four properties on every round.
 *
 * Run: npx tsx tools/picnicFuzz.ts
 */
import { buildPicnicRound } from '../src/components/farm/picnic/picnicGenerator';
import { ALL_PICNIC_FRUITS } from '../src/components/farm/picnic/picnicFruits';
import { PICNIC_TIERS } from '../src/components/farm/picnic/picnicTiers';
import { FLOOR_L, FLOOR_R, FLOOR_T, FLOOR_B, FRUIT_SIZE, PICNIC_SLOTS_16 } from '../src/components/farm/picnic/picnicData';

let failures = 0;
const problems = new Map<string, number>();

function fail(label: string) {
  failures += 1;
  problems.set(label, (problems.get(label) ?? 0) + 1);
}

/** Every property a generated round must satisfy. */
function validate(round: ReturnType<typeof buildPicnicRound>, where: string) {
  const counts = round.piles.map((p) => p.count);

  // --- NO TIES -------------------------------------------------------------
  const unique = new Set(counts);
  if (unique.size !== counts.length) {
    fail(`${where}: TIE in counts [${counts.join(',')}]`);
  }

  // --- NO COLLISIONS -------------------------------------------------------
  const filled = round.cells.filter((c) => c.fruit !== null);
  const totalCount = counts.reduce((a, b) => a + b, 0);
  if (filled.length !== totalCount) {
    fail(`${where}: placed ${filled.length} pieces but counts sum to ${totalCount}`);
  }
  // THE COUNTS MUST FIT THE CRATE. If they do not, the generator is forced to drop
  // fruit and the crate silently holds less than the answer key assumes.
  if (totalCount > round.rows * round.cols) {
    fail(
      `${where}: counts [${counts.join(',')}] sum to ${totalCount} ` +
        `but the ${round.rows}x${round.cols} crate holds ${round.rows * round.cols}`,
    );
  }
  // Each species' count must match the cells it actually occupies.
  for (const pile of round.piles) {
    if (pile.cells.length !== pile.count) {
      fail(`${where}: ${pile.fruit} claims ${pile.count} but occupies ${pile.cells.length} cells`);
    }
  }
  // Each cell index is used at most once - the structural form of the guarantee.
  const occupied = new Set<number>();
  round.cells.forEach((cell, index) => {
    if (cell.fruit !== null) {
      if (occupied.has(index)) fail(`${where}: cell ${index} holds two pieces`);
      occupied.add(index);
    }
  });
  // And the piles' own cell lists must agree with the cells.
  const fromPiles = new Set(round.piles.flatMap((p) => p.cells));
  if (fromPiles.size !== totalCount) {
    fail(`${where}: pile cell lists cover ${fromPiles.size} but ${totalCount} pieces exist`);
  }

  // --- SLOTS NEVER EXCEED THE FLOOR, AND NEVER EXCEED THE TIER --------------
  // The floor holds exactly sixteen fruitlets. A tier may fill only some of them - a
  // sparse basket is what makes the first tier readable - so the cell count is the
  // tier's CAPACITY rather than the whole floor, and `rows x cols` describes the floor's
  // shape rather than how much of it this round uses.
  if (round.cells.length > round.rows * round.cols) {
    fail(`${where}: ${round.cells.length} cells exceeds the ${round.rows}x${round.cols} floor`);
  }
  if (round.cells.length !== (PICNIC_TIERS[round.level]?.capacity ?? round.cells.length)) {
    fail(
      `${where}: L${round.level} dealt ${round.cells.length} cells but its capacity is ` +
        `${PICNIC_TIERS[round.level]?.capacity}`,
    );
  }

  // --- ONLY PRESENT FRUITS ARE OFFERED ------------------------------------
  const present = new Set(round.piles.map((p) => p.fruit));
  for (const choice of round.choices) {
    if (!present.has(choice)) fail(`${where}: offered ${choice}, which is not in the crate`);
  }
  if (round.choices.length !== present.size) {
    fail(`${where}: ${round.choices.length} choices for ${present.size} species`);
  }

  // --- THE ANSWER IS CORRECT AND SELECTABLE -------------------------------
  const expected =
    round.question === 'most'
      ? counts.reduce((best, c, i) => (c > (counts[best] as number) ? i : best), 0)
      : counts.reduce((best, c, i) => (c < (counts[best] as number) ? i : best), 0);
  if (round.piles[expected]!.fruit !== round.answer) {
    fail(
      `${where}: answer is ${round.answer} but the ${round.question} pile is ` +
        `${round.piles[expected]!.fruit} (counts ${counts.join(',')})`,
    );
  }
  if (!round.choices.includes(round.answer)) {
    fail(`${where}: the answer ${round.answer} is not among the choices`);
  }

  // --- TIER SHAPE ----------------------------------------------------------
  const tier = PICNIC_TIERS[round.level]!;
  if (round.piles.length !== tier.species) {
    fail(`${where}: L${round.level} has ${round.piles.length} species, expected ${tier.species}`);
  }
  if (!tier.questions.includes(round.question)) {
    fail(`${where}: L${round.level} asked "${round.question}", which the tier forbids`);
  }

  // --- THE GAP REALLY IS THE TIER'S GAP ------------------------------------
  // The spread is the difficulty dial, so a round that ignores it is a round at
  // the wrong difficulty - which is how the easy tier once dealt "3 vs 2".
  const spread = Math.max(...counts) - Math.min(...counts);
  if (spread !== tier.spread) {
    fail(`${where}: L${round.level} spread is ${spread}, expected ${tier.spread}`);
  }

  // --- STRICT TIERS REALLY ARE STRICT --------------------------------------
  if (tier.jitter === 0 && tier.tilt === 0) {
    for (const cell of round.cells) {
      if (cell.tilt !== 0) fail(`${where}: L${round.level} has tilt ${cell.tilt} but should be upright`);
    }
  }

  // --- EVERY FRUIT SITS EXACTLY ON ITS MEASURED SLOT -----------------------
  // The slot is the fruit's hand-measured home on the perspective floor, and the jitter
  // may only nudge the fruit WITHIN that slot - never move the slot itself. Two
  // independent copies of these coordinates would be two chances to drift, so the
  // expected centre comes from the SAME matrix the stage renders with.
  {
    for (const cell of round.cells) {
      const index = PICNIC_SLOTS_16.findIndex((s) => s.x === cell.x && s.y === cell.y);
      if (index < 0) {
        fail(`${where}: L${round.level} slot at (${cell.x},${cell.y}) is not on the measured floor`);
      }
      const want = PICNIC_SLOTS_16[index];
      if (want && (Math.abs(cell.x - want.x) > 0.001 || Math.abs(cell.y - want.y) > 0.001)) {
        fail(`${where}: L${round.level} slot (${cell.row},${cell.col}) drifted from the matrix`);
      }
      // And the fruit may only be nudged within its own slot.
      if (Math.abs(cell.fruitX - cell.x) > tier.jitter + 0.001) {
        fail(`${where}: L${round.level} fruit x jitter exceeds +-${tier.jitter}`);
      }
      if (Math.abs(cell.fruitY - cell.y) > tier.jitter + 0.001) {
        fail(`${where}: L${round.level} fruit y jitter exceeds +-${tier.jitter}`);
      }
    }
  }

  // --- NEIGHBOURING PILES NEVER TOUCH ---------------------------------------
  // The whole round is a quantity comparison, so two piles that visually merge make it
  // unanswerable. The row pitch is the tight axis: 36px against a 32px fruit, so only 4px
  // of clearance exists and the jitter spends all of it. Checked by packing the worst-case
  // sprite boxes and looking for an overlap, which is the failure the child would see.
  {
    const half = FRUIT_SIZE / 2;
    const boxes = round.cells
      .filter((c) => c.fruit !== null)
      .map((c) => ({ l: c.fruitX - half, r: c.fruitX + half, t: c.fruitY - half, b: c.fruitY + half }));
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) {
          fail(`${where}: L${round.level} two fruit sprites overlap`);
        }
      }
    }
  }

  // --- EVERY FRUIT STAYS ON THE FLAT FLOOR OF THE BASKET -------------------
  // The basket photograph has a sloping woven rim, so a fruit centred outside these bounds
  // climbs the weave and reads as floating. This is the check that the artwork and the
  // geometry still agree after any of them change.
  //
  // MEASURED AGAINST THE SLOT CENTRE, NOT THE SPRITE'S EDGE. A centred fruit overhangs its
  // slot by half its box, so a check that compared the EDGE to the floor bound would reject
  // every legitimate layout - the bounds describe where a fruit may be centred.
  {
    for (const cell of round.cells) {
      if (cell.fruit === null) continue;
      if (cell.x < FLOOR_L - 1 || cell.x > FLOOR_R + 1) {
        fail(`${where}: L${round.level} fruit centred off the floor horizontally`);
      }
      if (cell.y < FLOOR_T - 1 || cell.y > FLOOR_B + 1) {
        fail(`${where}: L${round.level} fruit centred off the floor vertically`);
      }
    }
  }

  // --- A FRUIT AND ITS COMPARTMENT AGREE, EXCEPT FOR THE NUDGE -------------
  if (tier.jitter === 0) {
    for (const cell of round.cells) {
      if (cell.fruitX !== cell.x || cell.fruitY !== cell.y) {
        fail(`${where}: L${round.level} has zero jitter but fruit moved off centre`);
      }
    }
  }

  // --- EVERY PIECE IS A REAL SPECIES ---------------------------------------
  for (const cell of round.cells) {
    if (cell.fruit !== null && !ALL_PICNIC_FRUITS.includes(cell.fruit)) {
      fail(`${where}: unknown species ${cell.fruit}`);
    }
  }
}

const ADVERSARIAL: Array<[string, () => number]> = [
  ['always 0', () => 0],
  ['always 0.999999', () => 0.999999],
  ['always 0.5', () => 0.5],
  ['always 1/3', () => 1 / 3],
];

console.log('\n=== Adversarial RNGs ===');
for (const [label, rng] of ADVERSARIAL) {
  for (let round = 1; round <= 40; round += 1) {
    validate(buildPicnicRound(round, rng), `${label}/r${round}`);
  }
  console.log(`  ${label}: 40 rounds checked`);
}

console.log('\n=== Uniform random, 20000 rounds ===');
let seed = 12345;
const rng = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
for (let i = 0; i < 20000; i += 1) {
  validate(buildPicnicRound(1 + (i % 40), rng), `uniform/r${1 + (i % 40)}`);
}
console.log('  20000 rounds checked');

console.log('\n=== Determinism ===');
{
  const seeded = (s: number) => {
    let a = s;
    return () => {
      a = (a * 1103515245 + 12345) % 2147483648;
      return a / 2147483648;
    };
  };
  const a = buildPicnicRound(3, seeded(42));
  const b = buildPicnicRound(3, seeded(42));
  const same =
    JSON.stringify(a.piles) === JSON.stringify(b.piles) &&
    a.answer === b.answer &&
    a.question === b.question;
  if (!same) fail('same seed produced different rounds');
  console.log(`  same seed -> same crate: ${same}`);
}

console.log('\n=== Sample rounds, one per tier ===');
for (const round of [1, 3, 5, 8]) {
  const r = buildPicnicRound(round, ((s) => () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  })(round * 977));
  console.log(
    `  r${round} L${r.level} ${r.rows}x${r.cols} ask=${r.question} ` +
      `piles=${r.piles.map((p) => `${p.fruit}:${p.count}`).join(' ')} answer=${r.answer}`,
  );
}

if (failures === 0) {
  console.log('\nALL PICNIC INVARIANTS HOLD\n');
} else {
  console.error(`\n*** ${failures} INVARIANT VIOLATION(S) ***`);
  for (const [key, n] of [...problems.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.error(`  x${n}  ${key}`);
  }
  process.exit(1);
}
