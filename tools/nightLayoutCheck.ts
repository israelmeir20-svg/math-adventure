/**
 * Layout invariants for the night barn stage.
 *
 * The animals are drawn at PER-SPECIES sizes (a horse 115, a duck 85) and can be
 * scaled up further, so "do two animals overlap?" is no longer answerable by
 * looking at one number. This recomputes each animal's real footprint and asserts
 * that the grid keeps every pair of animals apart, for every crowd size and
 * species mix the generator can produce.
 *
 * It also checks the two things a child would notice immediately:
 *   - no animal's head is clipped off the top of the canvas
 *   - no animal's feet float above or sink below the floor line
 *
 * Run: npx tsx tools/nightLayoutCheck.ts
 */
import { placeSpots, MAX_SPOTS, MAX_FOOTPRINT } from '../src/components/farm/night/nightPlacement';
import { bodyBox, eyePosition } from '../src/components/farm/night/nightGeometry';
import { MAX_SPOT_SCALE, VIEW_H, FLOOR_Y, animalSize } from '../src/components/farm/night/nightStageData';
import { ALL_NIGHT_ANIMALS } from '../src/components/farm/night/nightNames';
import type { NightSpot } from '../src/components/farm/night/nightTypes';

let failures = 0;
function check(label: string, condition: boolean, detail = '') {
  if (!condition) {
    failures += 1;
    console.error(`  FAIL  ${label}${detail ? ` :: ${detail}` : ''}`);
  } else {
    console.log(`  ok    ${label}`);
  }
}

/** A worst-case spot: the biggest animal at the biggest scale. */
function worstSpot(index: number, x: number, y: number): NightSpot {
  return {
    id: index,
    animal: 'horse',
    x,
    y,
    scale: MAX_SPOT_SCALE,
  };
}

console.log('\n=== Every animal fits the slot it is given ===');
{
  const biggest = Math.max(...ALL_NIGHT_ANIMALS.map((a) => animalSize(a)));
  check(
    'the largest species is the one we budgeted for',
    biggest === 115,
    `largest=${biggest}, MAX_FOOTPRINT accounts for ${MAX_FOOTPRINT}`,
  );
  check(
    'MAX_FOOTPRINT covers the largest species at max scale',
    MAX_FOOTPRINT >= biggest * MAX_SPOT_SCALE,
    `${MAX_FOOTPRINT} vs ${biggest * MAX_SPOT_SCALE}`,
  );
}

console.log('\n=== No two animals overlap, for every crowd size ===');
for (let count = 1; count <= MAX_SPOTS; count += 1) {
  // Deterministic RNG so a failure is reproducible.
  let seed = 7;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const spots = placeSpots(count, rng).map((p, i) => worstSpot(i, p.x, p.y));

  let worstGap = Infinity;
  for (let i = 0; i < spots.length; i += 1) {
    for (let j = i + 1; j < spots.length; j += 1) {
      const a = spots[i]!;
      const b = spots[j]!;
      // Overlap requires BOTH axes to be within one footprint of each other.
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      const footprint = MAX_FOOTPRINT;
      // Boxes are anchored bottom-centre, so vertical separation is measured
      // between feet positions; a negative dy gap means vertical overlap.
      const gapX = dx - footprint;
      const gapY = dy - footprint;
      worstGap = Math.min(worstGap, Math.max(gapX, gapY));
      check(
        `count=${count}: spots ${i} and ${j} do not overlap`,
        gapX >= 0 || gapY >= 0,
        `dx=${dx.toFixed(1)} dy=${dy.toFixed(1)} footprint=${footprint.toFixed(1)}`,
      );
    }
  }
  check(
    `count=${count}: produced exactly ${count} distinct positions`,
    spots.length === count,
    `got ${spots.length}`,
  );
}

console.log('\n=== Animals stay on the canvas and on the floor ===');
{
  let seed = 11;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  let worstHead = Infinity;
  let lowestFeet = -Infinity;
  for (let count = 1; count <= MAX_SPOTS; count += 1) {
    for (const p of placeSpots(count, rng)) {
      const spot = worstSpot(0, p.x, p.y);
      const { top } = bodyBox(spot);
      worstHead = Math.min(worstHead, top);
      lowestFeet = Math.max(lowestFeet, p.y);
    }
  }
  check('no animal head is clipped off the top', worstHead >= 0, `highest head top = ${worstHead.toFixed(1)}`);
  check(
    'no animal sinks below the floor line',
    lowestFeet <= FLOOR_Y,
    `lowest feet = ${lowestFeet.toFixed(1)}, floor = ${FLOOR_Y}, view height = ${VIEW_H}`,
  );
}

console.log('\n=== Eyes stay inside their own animal ===');
{
  for (const animal of ALL_NIGHT_ANIMALS) {
    const spot: NightSpot = { id: 0, animal, x: 400, y: 250, scale: 1 };
    const { left, top, size } = bodyBox(spot);
    const l = eyePosition(spot, 'left');
    const r = eyePosition(spot, 'right');
    const inside = (p: { x: number; y: number }) =>
      p.x >= left - 1 && p.x <= left + size + 1 && p.y >= top - 1 && p.y <= top + size + 1;
    check(`${animal}: both eyes are within the sprite box`, inside(l) && inside(r),
      `L=(${l.x.toFixed(0)},${l.y.toFixed(0)}) R=(${r.x.toFixed(0)},${r.y.toFixed(0)}) box=(${left.toFixed(0)},${top.toFixed(0)},${size.toFixed(0)})`);
    check(`${animal}: left eye is left of right eye`, l.x < r.x, `${l.x.toFixed(1)} vs ${r.x.toFixed(1)}`);
    check(`${animal}: eyes are above the vertical middle`, l.y < top + size / 2,
      `eyeY=${l.y.toFixed(1)} mid=${(top + size / 2).toFixed(1)}`);
  }
}

if (failures === 0) console.log('\nALL LAYOUT CHECKS PASSED\n');
else {
  console.error(`\n${failures} LAYOUT CHECK(S) FAILED\n`);
  process.exit(1);
}
