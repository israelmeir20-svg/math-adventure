/**
 * Does a rotated 46px fruit stay inside the 50px row pitch?
 *
 * The row pitch is the tight axis on this floor: rows sit 50px apart while columns sit
 * 84-120px apart. A square s rotated by theta reaches half*(|cos|+|sin|) on each axis, so
 * the vertical reach grows with the tilt. This checks the worst case for every tier,
 * because "fruits never drift into adjacent slots" is the stated requirement and it is
 * arithmetic rather than a matter of taste.
 *
 * Run: npx tsx tools/picnicSlotProbe.ts
 */
import { FRUIT_JITTER, FRUIT_SIZE, PICNIC_SLOTS_16, SLOT_COLS } from '../src/components/farm/picnic/picnicData';
import { PICNIC_TIERS } from '../src/components/farm/picnic/picnicTiers';

/** Half-extent of a square rotated by `deg`. */
function reach(half: number, deg: number): number {
  const t = (deg * Math.PI) / 180;
  return half * (Math.abs(Math.cos(t)) + Math.abs(Math.sin(t)));
}

const half = FRUIT_SIZE / 2;
const rows = [0, 1, 2, 3].map((r) => PICNIC_SLOTS_16.slice(r * SLOT_COLS, r * SLOT_COLS + SLOT_COLS));

console.log(`fruit ${FRUIT_SIZE}px (half ${half}), jitter +-${FRUIT_JITTER}px\n`);

console.log('=== Vertical clearance between rows ===');
const pitchY = rows[1][0]!.y - rows[0][0]!.y;
for (const [level, tier] of Object.entries(PICNIC_TIERS)) {
  const rY = reach(half, tier.tilt) * 2;
  // Worst case: the upper fruit offset down and the lower offset up.
  const worst = rY + tier.jitter * 2;
  const clearance = pitchY - worst;
  console.log(
    `  L${level}: tilt ${String(tier.tilt).padStart(2)}deg jitter ${tier.jitter}px -> ` +
      `needs ${worst.toFixed(1)}px of ${pitchY}px -> ${clearance >= 0 ? `clear by ${clearance.toFixed(1)}px` : 'OVERLAP'}`,
  );
}

console.log('\n=== Horizontal clearance between neighbours (tightest row) ===');
{
  let tightest = Infinity;
  for (const row of rows) {
    for (let c = 0; c < row.length - 1; c += 1) {
      tightest = Math.min(tightest, row[c + 1]!.x - row[c]!.x);
    }
  }
  for (const [level, tier] of Object.entries(PICNIC_TIERS)) {
    const worst = reach(half, tier.tilt) * 2 + tier.jitter * 2;
    console.log(
      `  L${level}: needs ${worst.toFixed(1)}px, tightest pitch ${tightest}px -> ` +
        `${tightest - worst >= 0 ? `clear by ${(tightest - worst).toFixed(1)}px` : 'OVERLAP'}`,
    );
  }
}

console.log('\n=== What tilt would the 50px pitch allow, if any? ===');
// The floor cannot rotate its fruit, and this is the number that proves it: the bare fruit
// already spends most of the pitch, so almost no diagonal reach is affordable.
for (const deg of [0, 2, 4, 6, 8, 10]) {
  const need = reach(half, deg) * 2 + FRUIT_JITTER * 2;
  console.log(`  ${String(deg).padStart(2)}deg -> needs ${need.toFixed(1)}px of ${pitchY}px -> ${need <= pitchY ? 'fits' : 'OVERLAP'}`);
}

console.log('\n=== Does the worst-case footprint stay on the floor? ===');
const FLOOR = { l: 224, r: 576, t: 86, b: 236 };
{
  let widest = { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity };
  for (const [level, tier] of Object.entries(PICNIC_TIERS)) {
    const rx = reach(half, tier.tilt) + tier.jitter;
    const xs = PICNIC_SLOTS_16.map((s) => s.x);
    const ys = PICNIC_SLOTS_16.map((s) => s.y);
    const l = Math.min(...xs) - rx;
    const r = Math.max(...xs) + rx;
    const t = Math.min(...ys) - rx;
    const b = Math.max(...ys) + rx;
    widest = { l: Math.min(widest.l, l), r: Math.max(widest.r, r), t: Math.min(widest.t, t), b: Math.max(widest.b, b) };
    console.log(
      `  L${level}: sprite edge x ${l.toFixed(0)}..${r.toFixed(0)}, y ${t.toFixed(0)}..${b.toFixed(0)}`,
    );
  }
  console.log(
    `\n  The slots plus a ${FRUIT_SIZE}px fruit occupy ` +
      `x ${widest.l.toFixed(0)}..${widest.r.toFixed(0)}, y ${widest.t.toFixed(0)}..${widest.b.toFixed(0)}`,
  );
  console.log(`  The slot centres span x ${FLOOR.l}..${FLOOR.r}, y ${FLOOR.t}..${FLOOR.b}`);
  console.log(
    `  Overhang beyond the slot centres: left ${(FLOOR.l - widest.l).toFixed(0)}px, ` +
      `right ${(widest.r - FLOOR.r).toFixed(0)}px, top ${(FLOOR.t - widest.t).toFixed(0)}px, ` +
      `bottom ${(widest.b - FLOOR.b).toFixed(0)}px`,
  );
  const half2 = FRUIT_SIZE / 2;
  console.log(
    `\n  A centred ${FRUIT_SIZE}px fruit overhangs its slot by ${half2}px on every side, ` +
      `which is why the overhangs above are about ${half2 + 2}px rather than zero.`,
  );
}
