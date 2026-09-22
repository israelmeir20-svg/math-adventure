/**
 * What capacities and clearances does each tier actually need?
 *
 * Two questions, both arithmetic, both of which have already bitten once:
 *
 *   How many pieces must a tier hold at minimum, given its spread and species count?
 *   A capacity below that is unconstructible, and the guard in `picnicTierChecks.ts`
 *   will refuse it at import time.
 *
 *   How much vertical room does a tilted, jittered fruit need, against the 36px row
 *   pitch? This is the tight axis on the perspective floor.
 *
 * Run: npx tsx tools/picnicCapacityProbe.ts
 */
const FRUIT_SIZE = 46;
const SLOTS_Y = [86, 136, 186, 236];
const ROW_PITCH = SLOTS_Y[1] - SLOTS_Y[0];

/** The smallest number of pieces a tier's counts can add up to. */
function minPieces(species: number, spread: number, minCount: number, maxCount: number): number {
  const lowestTop = Math.min(minCount + spread, maxCount);
  const bottom = Math.max(1, lowestTop - spread);
  let total = lowestTop + bottom;
  for (let v = bottom + 1, taken = 0; taken < species - 2; v += 1, taken += 1) total += v;
  return total;
}

/** Half-extent of a square rotated by `deg`. */
function halfReach(half: number, deg: number): number {
  const t = (deg * Math.PI) / 180;
  return half * (Math.abs(Math.cos(t)) + Math.abs(Math.sin(t)));
}

console.log(`fruit ${FRUIT_SIZE}px, row pitch ${ROW_PITCH}px, 16 slots on the floor\n`);

// The tier shapes, with the capacity I intend to give each.
const PLAN = [
  { l: 1, species: 2, spread: 5, minCount: 2, maxCount: 8, capacity: 10, tilt: 0, jitter: 0 },
  { l: 2, species: 3, spread: 3, minCount: 2, maxCount: 8, capacity: 12, tilt: 0, jitter: 0 },
  { l: 3, species: 3, spread: 4, minCount: 3, maxCount: 8, capacity: 14, tilt: 0, jitter: 2 },
  { l: 4, species: 3, spread: 2, minCount: 3, maxCount: 10, capacity: 16, tilt: 0, jitter: 2 },
];

console.log('tier | species | spread | minPieces | capacity | fits?');
console.log('-----+---------+--------+-----------+----------+------');
for (const t of PLAN) {
  const need = minPieces(t.species, t.spread, t.minCount, t.maxCount);
  console.log(
    `L${t.l}   | ${String(t.species).padStart(7)} | ${String(t.spread).padStart(6)} | ` +
      `${String(need).padStart(9)} | ${String(t.capacity).padStart(8)} | ${need <= t.capacity ? 'yes' : 'NO'}`,
  );
}

console.log('\ntier | tilt | jitter | needs vertically | row pitch | clearance');
console.log('-----+------+--------+------------------+-----------+----------');
for (const t of PLAN) {
  const need = halfReach(FRUIT_SIZE / 2, t.tilt) * 2 + t.jitter * 2;
  const clear = ROW_PITCH - need;
  console.log(
    `L${t.l}   | ${String(t.tilt).padStart(3)}d | ${String(t.jitter).padStart(5)}px | ` +
      `${need.toFixed(1).padStart(16)} | ${String(ROW_PITCH).padStart(9)} | ` +
      `${clear >= 0 ? `+${clear.toFixed(1)}px` : `${clear.toFixed(1)}px OVERLAP`}`,
  );
}

console.log('\n=== What is constructible on 16 slots? ===');
console.log('species | spread | minPieces | fits in 16? | distinct counts span');
console.log('--------+--------+-----------+-------------+----------------------');
for (const species of [2, 3, 4]) {
  for (const spread of [2, 3, 4, 5]) {
    if (spread + 1 < species) continue;
    const need = minPieces(species, spread, species === 4 ? 3 : 2, 8);
    console.log(
      `${String(species).padStart(7)} | ${String(spread).padStart(6)} | ${String(need).padStart(9)} | ` +
        `${(need <= 16 ? 'yes' : 'NO').padStart(11)} | ${spread + 1} integers`,
    );
  }
}

console.log('\nTilt feasibility at the 50px row pitch (jitter 2px):');
for (const size of [32, 38, 42, 44, 46]) {
  const need = halfReach(size / 2, 10) * 2 + 2 * 2;
  console.log(
    `  ${String(size).padStart(2)}px fruit -> ${need.toFixed(1)}px needed, ` +
      `${(ROW_PITCH - need).toFixed(1)}px clearance`,
  );
}

