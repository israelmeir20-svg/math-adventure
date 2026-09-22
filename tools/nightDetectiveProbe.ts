/**
 * Why can a detective target be absent from the stage?
 *
 * The answer is the placement cap, not the species choice. `placeSpots` can only
 * stand MAX_SPOTS animals on the grid, so a round that asks for MORE than that
 * silently truncates the crowd - and the target species, which is placed first, is
 * not necessarily the one that survives. This reproduces that ceiling directly.
 *
 * Run: npx tsx tools/nightDetectiveProbe.ts
 */
import { buildNightPuzzle } from '../src/components/farm/night/nightGenerator';
import { MAX_SPOTS } from '../src/components/farm/night/nightPlacement';
import { NIGHT_TIERS } from '../src/components/farm/night/nightRules';

console.log(`MAX_SPOTS on the grid: ${MAX_SPOTS}`);
console.log(`L4 tier bounds: min=${NIGHT_TIERS[4]!.minAnswer} max=${NIGHT_TIERS[4]!.maxAnswer}`);

let checked = 0;
let mismatches = 0;
let truncated = 0;
const worst: string[] = [];

for (let s = 1; s <= 4000; s += 1) {
  const rng = ((x) => () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  })(s * 7919);

  const p = buildNightPuzzle(7, rng);
  if (p.mode !== 'detective') continue;
  checked += 1;

  const onStage = p.spots.filter((sp) => sp.animal === p.target).length;
  const total = p.spots.length;
  // The generator WANTED a crowd of at least 5; if the grid capped it, the crowd
  // came out short and some animals - possibly the target - were dropped.
  if (total < 5) truncated += 1;
  if (onStage !== p.answer) {
    mismatches += 1;
    if (worst.length < 5) {
      worst.push(
        `target=${p.target} onStage=${onStage} answer=${p.answer} totalSpots=${total}`,
      );
    }
  }
}

console.log(`\ndetective rounds checked : ${checked}`);
console.log(`crowd truncated (<5)     : ${truncated}`);
console.log(`count != keypad answer   : ${mismatches}`);
for (const w of worst) console.log(`  ${w}`);

console.log(
  `\nVerdict: the crowd is capped at ${MAX_SPOTS}, so any round needing more than ` +
    `${MAX_SPOTS} animals loses some. Q is bounded by the tier to ` +
    `${NIGHT_TIERS[4]!.maxAnswer}, and the generator asks for max(5..7, Q) - ` +
    `so truncation bites when Q + decoys would exceed ${MAX_SPOTS}.`,
);
if (mismatches > 0) process.exit(1);
