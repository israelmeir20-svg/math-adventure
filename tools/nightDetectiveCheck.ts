/**
 * Soundness checks for detective rounds: solvable, self-consistent, and grammatical.
 *
 * Three separate promises are verified over 1000+ generated rounds:
 *
 *   SOLVABLE     - the target species is ALWAYS on stage, and its actual count equals
 *                  the keypad's correct answer. A round failing this marks a correct
 *                  child wrong, which is the worst bug this station can have.
 *   SELECTABLE   - the correct answer is always among the four options.
 *   GRAMMATICAL  - the verb agrees with the species' Hebrew gender, because
 *                  "כמה פרות מסתתרים" is simply wrong and a child learning to read
 *                  would be taught the wrong form.
 *
 * Also checks Q stays inside [1..4], since a count of 0 would mean asking about a
 * species that is not there.
 *
 * Run: npx tsx tools/nightDetectiveCheck.ts
 */
import { buildNightPuzzle, countSpecies } from '../src/components/farm/night/nightGenerator';
import {
  ALL_NIGHT_ANIMALS,
  getDetectiveQuestion,
  nightAnimalName,
} from '../src/components/farm/night/nightNames';
import { NIGHT_TIERS, nightOptionsFor } from '../src/components/farm/night/nightRules';
import type { NightAnimal } from '../src/components/farm/night/nightTypes';

let failures = 0;
const problems = new Map<string, number>();
function fail(label: string) {
  failures += 1;
  problems.set(label, (problems.get(label) ?? 0) + 1);
}

/** The species whose Hebrew plural takes a feminine verb. */
const FEMININE: NightAnimal[] = ['cow', 'sheep'];

console.log('=== The gender table itself ===');
for (const animal of ALL_NIGHT_ANIMALS) {
  const info = nightAnimalName(animal);
  const shouldBeFeminine = FEMININE.includes(animal);
  if (shouldBeFeminine !== (info.gender === 'f')) {
    fail(`gender table wrong for ${animal} (says ${info.gender})`);
  }
}
for (const animal of FEMININE) {
  if (nightAnimalName(animal).gender !== 'f') fail(`${animal} must be feminine`);
}
console.log(`  ${ALL_NIGHT_ANIMALS.length} species, feminine: ${FEMININE.join(', ')}`);

console.log('\n=== getDetectiveQuestion agrees with the table ===');
for (const animal of ALL_NIGHT_ANIMALS) {
  const q = getDetectiveQuestion(animal);
  const plural = nightAnimalName(animal).plural;
  const wantVerb = nightAnimalName(animal).gender === 'f' ? 'מסתתרות' : 'מסתתרים';
  const want = `האירו עם הפנס: כמה ${plural} ${wantVerb}?`;
  if (q !== want) fail(`question for ${animal} was "${q}", expected "${want}"`);
}
console.log('  every species formats with its own gender');
console.log(`  masc sample: ${getDetectiveQuestion('horse')}`);
console.log(`  fem  sample: ${getDetectiveQuestion('cow')}`);
console.log(`  fem  sample: ${getDetectiveQuestion('sheep')}`);

console.log('\n=== 1000 detective rounds ===');

let seed = 4242;
const rng = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

const tier = NIGHT_TIERS[4]!;
let checked = 0;
const seenTargets = new Set<string>();
const seenQ = new Set<number>();

for (let i = 0; i < 1000; i += 1) {
  // Round 7+ is always level 4 (detective).
  const p = buildNightPuzzle(7 + (i % 5), rng);
  if (p.mode !== 'detective') continue;
  checked += 1;

  const target = p.target as NightAnimal;
  seenTargets.add(target);
  seenQ.add(p.answer);

  // --- SOLVABLE: the species is on stage, exactly as many as the keypad says ---
  const onStage = countSpecies(p.spots, target);
  if (onStage < 1) fail(`target ${target} absent from stage`);
  if (onStage !== p.answer) {
    fail(`stage holds ${onStage} ${target} but the answer is ${p.answer}`);
  }

  // --- THE CROWD IS THE SHAPE THE TIER PROMISES -------------------------------
  if (p.spots.length < 5 || p.spots.length > 7) {
    fail(`crowd of ${p.spots.length} is outside 5..7`);
  }
  if (p.spots.length > 10) fail('crowd exceeds the barn grid');

  // --- Q IS IN RANGE AND NON-ZERO ---------------------------------------------
  if (p.answer < 1) fail(`Q was ${p.answer}, which asks about nothing`);
  if (p.answer < tier.minAnswer || p.answer > tier.maxAnswer) {
    fail(`Q ${p.answer} outside the tier's ${tier.minAnswer}..${tier.maxAnswer}`);
  }

  // --- SELECTABLE: the answer is on the keypad, and the keypad is 4 wide -------
  if (!p.options.includes(p.answer)) fail(`answer ${p.answer} not among options`);
  if (p.options.length !== 4) fail(`keypad has ${p.options.length} options`);
  if (new Set(p.options).size !== p.options.length) fail('keypad has duplicates');

  // --- GRAMMATICAL ------------------------------------------------------------
  const wantVerb = nightAnimalName(target).gender === 'f' ? 'מסתתרות' : 'מסתתרים';
  const otherVerb = wantVerb === 'מסתתרות' ? 'מסתתרים' : 'מסתתרות';
  if (!p.question.includes(wantVerb)) fail(`${target} question missing "${wantVerb}"`);
  if (p.question.includes(otherVerb)) fail(`${target} question wrongly uses "${otherVerb}"`);
  if (p.question !== getDetectiveQuestion(target)) fail('question came from elsewhere');

  // --- the decoys must not be the target, or the count would be wrong ---------
  const targetCount = countSpecies(p.spots, target);
  if (targetCount !== p.targetCount) {
    fail(`targetCount ${p.targetCount} disagrees with ${targetCount} on stage`);
  }
}

console.log(`  rounds checked      : ${checked}`);
console.log(`  distinct targets    : ${seenTargets.size} (${[...seenTargets].sort().join(', ')})`);
console.log(`  distinct Q values   : ${[...seenQ].sort((a, b) => a - b).join(', ')}`);

console.log('\n=== Option shapes around each legal Q ===');
{
  // The keypad must always contain Q, never offer 0 or a negative, and stay four
  // wide. Q=1 is the tightest case: the natural neighbours are 0, 2 and 3, and 0
  // must be dropped rather than shown.
  let optionFailures = 0;
  for (const q of [1, 2, 3, 4]) {
    const shapes = new Set<string>();
    for (let i = 0; i < 400; i += 1) {
      const opts = nightOptionsFor(q, rng);
      if (!opts.includes(q)) {
        fail(`Q=${q}: correct answer missing from the keypad`);
        optionFailures += 1;
      }
      if (opts.length !== 4) {
        fail(`Q=${q}: keypad has ${opts.length} options`);
        optionFailures += 1;
      }
      if (opts.some((v) => v < 1)) {
        fail(`Q=${q}: keypad offers a non-positive choice (${opts.join(',')})`);
        optionFailures += 1;
      }
      if (new Set(opts).size !== opts.length) {
        fail(`Q=${q}: keypad has duplicates (${opts.join(',')})`);
        optionFailures += 1;
      }
      shapes.add([...opts].sort((a, b) => a - b).join(','));
    }
    console.log(`  Q=${q} -> ${[...shapes].join('  |  ')}`);
  }
  console.log(`  (${optionFailures} option failures)`);
}

console.log('\n=== Q distribution ===');
{
  const tally = new Map<number, number>();
  let s2 = 777;
  const r2 = () => {
    s2 = (s2 * 1103515245 + 12345) % 2147483648;
    return s2 / 2147483648;
  };
  for (let i = 0; i < 4000; i += 1) {
    const p = buildNightPuzzle(7, r2);
    if (p.mode === 'detective') tally.set(p.answer, (tally.get(p.answer) ?? 0) + 1);
  }
  for (const q of [...tally.keys()].sort((a, b) => a - b)) {
    const n = tally.get(q) as number;
    console.log(`  Q=${q}: ${n} rounds (${((n / 4000) * 100).toFixed(1)}%)`);
  }
  if (tally.has(0)) fail('Q=0 appeared');
}

console.log('\n=== Adversarial RNGs ===');
for (const [label, r] of [
  ['always 0', () => 0],
  ['always 0.999999', () => 0.999999],
  ['always 0.5', () => 0.5],
] as const) {
  for (let i = 0; i < 500; i += 1) {
    const p = buildNightPuzzle(7, r);
    if (p.mode !== 'detective') continue;
    const t = p.target as NightAnimal;
    const n = countSpecies(p.spots, t);
    if (n !== p.answer) fail(`adversarial ${label}: ${n} on stage vs answer ${p.answer}`);
    if (!p.options.includes(p.answer)) fail(`adversarial ${label}: answer not offered`);
    if (n < 1) fail(`adversarial ${label}: target missing`);
  }
  console.log(`  ${label}: 500 rounds sound`);
}

if (failures === 0) {
  console.log('\nDETECTIVE ROUNDS ARE SOLVABLE, SELECTABLE AND GRAMMATICAL\n');
} else {
  console.error(`\n*** ${failures} PROBLEM(S) ***`);
  for (const [k, n] of [...problems.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.error(`  x${n}  ${k}`);
  }
  process.exit(1);
}
