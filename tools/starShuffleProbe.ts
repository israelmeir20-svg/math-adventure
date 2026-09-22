/**
 * Why does the correct answer land in slot 0 less often than the other slots?
 *
 * The first suspicion was a biased Fisher-Yates, but V8's sort is not involved and the loop
 * looks canonical. The other candidate is that the SET INSERTION ORDER is not symmetric in the
 * candidates' values, and a shuffle that is only *nearly* uniform would then interact with the
 * four distinct values in a way that shows up per-value.
 *
 * This separates the two questions: where each VALUE lands (revealing a value-dependent bias)
 * versus where the answer as a whole lands (revealing a shuffle bias).
 *
 * Run: npx tsx tools/starShuffleProbe.ts
 */
import { buildOptions, shuffle } from '../src/components/farm/stars/starRules';

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

console.log('=== Where does each CANDIDATE VALUE land? (total = 12) ===');
{
  const rng = lcg(1);
  const landings = new Map<number, number[]>();
  const TRIALS = 60000;
  for (let i = 0; i < TRIALS; i += 1) {
    for (const [slot, value] of buildOptions(12, rng).entries()) {
      if (!landings.has(value)) landings.set(value, [0, 0, 0, 0]);
      landings.get(value)![slot] += 1;
    }
  }
  console.log('value |    slot0    slot1    slot2    slot3');
  for (const [value, arr] of [...landings].sort((a, b) => a[0] - b[0])) {
    console.log(`${String(value).padStart(5)} | ${arr.map((n) => String(n).padStart(8)).join(' ')}`);
  }
  console.log(`(each row should sum to ${TRIALS}, one landing per round)`);
}

console.log('\n=== Is the shuffle itself uniform? (4 distinct sentinel values) ===');
{
  const rng = lcg(7);
  const TRIALS = 60000;
  const landings = new Map<string, number[]>();
  for (let i = 0; i < TRIALS; i += 1) {
    for (const [slot, value] of shuffle(['A', 'B', 'C', 'D'], rng).entries()) {
      if (!landings.has(value)) landings.set(value, [0, 0, 0, 0]);
      landings.get(value)![slot] += 1;
    }
  }
  console.log('value |    slot0    slot1    slot2    slot3');
  for (const [value, arr] of [...landings].sort()) {
    const drift = arr.map((n) => ((n - TRIALS / 4) / (TRIALS / 4)) * 100);
    console.log(
      `${value.padStart(5)} | ${arr.map((n, i) => `${String(n).padStart(8)}(${drift[i]!.toFixed(1)}%)`).join(' ')}`,
    );
  }
}

console.log('\n=== Is the LCG itself the problem? Compare against Math.random ===');
{
  for (const [label, make] of [
    ['lcg', () => lcg(1)],
    ['Math.random', () => Math.random],
  ] as const) {
    const rng = make();
    const TRIALS = 60000;
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < TRIALS; i += 1) {
      const opts = buildOptions(12, rng);
      counts[opts.indexOf(12)] += 1;
    }
    const drifts = counts.map((n) => (((n - TRIALS / 4) / (TRIALS / 4)) * 100).toFixed(1));
    console.log(`  ${label.padEnd(12)}: ${counts.join(', ')}  drift ${drifts.join('%, ')}%`);
  }
}
