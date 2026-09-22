/**
 * Does the lid actually clear the basket when open?
 *
 * The claim to check is that an open lid leaves NO part of the top row of fruit covered.
 * That is a geometric fact about a few constants, so it is worth asserting rather than
 * eyeballing - a lid lip hanging over row 0 makes those slots uncountable, which silently
 * breaks the round.
 *
 * The lid also FADES, so the requirement is slightly weaker than pure geometry: it must be
 * fully transparent when open, and must cover the basket box exactly when shut.
 *
 * Run: npx tsx tools/picnicLidCheck.ts
 */
import {
  BASKET_H,
  BASKET_W,
  BASKET_X,
  BASKET_Y,
  FLOOR_B,
  FLOOR_L,
  FLOOR_R,
  FLOOR_T,
  FRUIT_SIZE,
  LID_MS,
  LID_OPEN_DY,
  LID_SHUT_DY,
  PICNIC_SLOTS_16,
  VIEW_H,
} from '../src/components/farm/picnic/picnicData';
import { PICNIC_TIERS } from '../src/components/farm/picnic/picnicTiers';

let failures = 0;
function check(ok: boolean, msg: string) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
  if (!ok) failures += 1;
}

console.log('=== The basket box ===');
console.log(`  basket      : x ${BASKET_X}..${BASKET_X + BASKET_W}, y ${BASKET_Y}..${BASKET_Y + BASKET_H}`);
console.log(`  slot centres: x ${FLOOR_L}..${FLOOR_R}, y ${FLOOR_T}..${FLOOR_B}`);
console.log(`  fruit size  : ${FRUIT_SIZE}`);

console.log('\n=== The slot matrix must lie inside the basket box ===');
check(FLOOR_L > BASKET_X, `slots start inside the basket's left edge (${FLOOR_L} > ${BASKET_X})`);
check(FLOOR_R < BASKET_X + BASKET_W, `slots end inside the basket's right edge (${FLOOR_R} < ${BASKET_X + BASKET_W})`);
check(FLOOR_T > BASKET_Y, `slots start below the basket's rim (${FLOOR_T} > ${BASKET_Y})`);
check(FLOOR_B < BASKET_Y + BASKET_H, `slots end above the basket's base (${FLOOR_B} < ${BASKET_Y + BASKET_H})`);

console.log('\n=== Every measured slot must lie inside the floor bounds ===');
{
  const out = PICNIC_SLOTS_16.filter(
    (s) => s.x < FLOOR_L || s.x > FLOOR_R || s.y < FLOOR_T || s.y > FLOOR_B,
  );
  check(out.length === 0, `all ${PICNIC_SLOTS_16.length} slots are inside the floor (${out.length} outside)`);
  check(PICNIC_SLOTS_16.length === 16, `the floor holds exactly 16 slots`);
}

console.log('\n=== Rows must not overlap a 46px fruit ===');
{
  const rows = [0, 1, 2, 3].map((r) => PICNIC_SLOTS_16.slice(r * 4, r * 4 + 4));
  for (const [level, tier] of Object.entries(PICNIC_TIERS)) {
    const pitch = rows[1]![0]!.y - rows[0]![0]!.y;
    // A square rotated by theta reaches half*(|cos|+|sin|) on each axis.
    const t = (tier.tilt * Math.PI) / 180;
    const reach = FRUIT_SIZE * (Math.abs(Math.cos(t)) + Math.abs(Math.sin(t))) + tier.jitter * 2;
    console.log(`  L${level}: pitch ${pitch}px, needs ${reach.toFixed(1)}px`);
    check(reach <= pitch + 0.001, `L${level}: a 46px fruit at ${tier.tilt}deg fits the ${pitch}px row pitch`);
  }
}

console.log('\n=== The lid ===');
const openTop = BASKET_Y + LID_OPEN_DY;
const openBottom = openTop + BASKET_H;
const shutTop = BASKET_Y + LID_SHUT_DY;
const shutBottom = shutTop + BASKET_H;
console.log(`  open : lid spans y ${openTop}..${openBottom} (opacity 0)`);
console.log(`  shut : lid spans y ${shutTop}..${shutBottom} (opacity 1)`);

check(openBottom <= 0, `open lid is fully off-canvas (bottom ${openBottom} <= 0)`);
check(shutTop <= BASKET_Y && shutBottom >= BASKET_Y + BASKET_H, 'shut lid covers the basket box exactly');
check(LID_OPEN_DY < 0, 'the open offset moves the lid up');
check(LID_MS > 0 && LID_MS <= 400, `${LID_MS}ms is a snappy lid travel`);
check(BASKET_Y + BASKET_H <= VIEW_H, 'the basket fits on the canvas');

if (failures === 0) {
  console.log('\nLID, SLOT AND FLOOR GEOMETRY ARE SOUND\n');
} else {
  console.error(`\n*** ${failures} PROBLEM(S) ***\n`);
  process.exit(1);
}
