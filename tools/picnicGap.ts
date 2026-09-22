/**
 * Reports the pile sizes the generator actually produces, per tier.
 *
 * A round can satisfy every structural invariant and still be a bad round: if
 * level 1 keeps dealing "3 vs 2", there is no gap to subitize and the tier stops
 * being the easy introduction it is supposed to be. This prints the real
 * distributions so the difficulty curve can be checked rather than assumed.
 *
 * Run: npx tsx tools/picnicGap.ts
 */
import { buildPicnicRound } from '../src/components/farm/picnic/picnicGenerator';

let seed = 999;
const rng = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

for (const round of [1, 3, 5, 8]) {
  const tops: number[] = [];
  const gaps: number[] = [];
  const totals: number[] = [];
  for (let i = 0; i < 4000; i += 1) {
    const r = buildPicnicRound(round, rng);
    const counts = r.piles.map((p) => p.count).sort((a, b) => b - a);
    tops.push(counts[0] as number);
    gaps.push((counts[0] as number) - (counts[counts.length - 1] as number));
    totals.push(counts.reduce((a, b) => a + b, 0));
  }
  const avg = (xs: number[]) => (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1);
  const min = (xs: number[]) => Math.min(...xs);
  const max = (xs: number[]) => Math.max(...xs);
  const cells = buildPicnicRound(round, () => 0.5).cells.length;
  console.log(
    `r${round}: top pile ${min(tops)}-${max(tops)} (avg ${avg(tops)})  ` +
      `gap ${min(gaps)}-${max(gaps)} (avg ${avg(gaps)})  ` +
      `pieces ${min(totals)}-${max(totals)} of ${cells} cells`,
  );
}
