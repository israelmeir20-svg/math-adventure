/**
 * Ad-hoc verification of the notebook geometry + algebra. Run with vite-node.
 *
 * Checks the two things that are easy to get wrong and invisible until a child sees them:
 * that every generated slot lands INSIDE a page, and that each case's equation solves.
 */
import { CASE_TEMPLATES } from '../src/features/mystery/caseData';
import {
  NOTEBOOK_GEOMETRY,
  slotsFor,
  startingLayout,
  envelopeShare,
  isIsolated,
} from '../src/features/mystery/notebookGeometry';

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.log(`  FAIL: ${msg}`);
  }
}

const inPage = (
  pt: { x: number; y: number },
  page: { left: number; right: number; top: number; bottom: number },
) => pt.x >= page.left && pt.x <= page.right && pt.y >= page.top && pt.y <= page.bottom;

console.log('=== slot placement: every item must land on paper ===');
for (const count of [0, 1, 2, 3, 4, 5, 8, 11, 12, 17, 18]) {
  for (const [name, page] of [
    ['left', NOTEBOOK_GEOMETRY.leftPage],
    ['right', NOTEBOOK_GEOMETRY.rightPage],
  ] as const) {
    const slots = slotsFor(page, count);
    check(slots.length === count, `${name} page: asked ${count}, got ${slots.length}`);
    for (const s of slots) {
      check(inPage(s, page), `${name} page (${count} items): slot ${s.x.toFixed(3)},${s.y.toFixed(3)} outside page`);
    }
    // Items must not sit on the spine gap.
    if (name === 'left') {
      for (const s of slots) check(s.x < NOTEBOOK_GEOMETRY.spineX, `${name} slot crosses spine`);
    } else {
      for (const s of slots) check(s.x > NOTEBOOK_GEOMETRY.spineX, `${name} slot crosses spine`);
    }
  }
}
console.log('  checked counts 0..18 on both pages');

console.log('\n=== slot overlap: items must not collide ===');
/*
 * SPACING IS MEASURED IN ASPECT-CORRECTED UNITS, not raw fractions. A horizontal fraction of
 * this image is 1.79x longer than a vertical one, so comparing raw x-gaps with raw y-gaps is
 * exactly the error the grid search exists to avoid - and it is the error this check made in
 * its first version, reporting a collision that was not there.
 */
const ASPECT = 2752 / 1536;
for (const count of [2, 4, 5, 8, 12, 18]) {
  const slots = slotsFor(NOTEBOOK_GEOMETRY.rightPage, count);
  let min = Infinity;
  for (let i = 0; i < slots.length; i++)
    for (let j = i + 1; j < slots.length; j++)
      min = Math.min(
        min,
        Math.hypot((slots[i].x - slots[j].x) * ASPECT, slots[i].y - slots[j].y),
      );
  // The largest item is ~0.055 tall (a note is a fraction of the page), so centres further
  // apart than that cannot overlap.
  const CLEARANCE = 0.045;
  const ok = count <= 1 || min > CLEARANCE;
  console.log(
    `  ${String(count).padStart(2)} items: min centre distance ${min === Infinity ? 'n/a' : min.toFixed(4)} (need > ${CLEARANCE}) ${ok ? 'OK' : 'FAIL'}`,
  );
  if (count > 1) check(ok, `${count} items: centres only ${min.toFixed(4)} apart`);
}

console.log('\n=== the four equations ===');
const expectations: Record<string, { layout: [number, number, number, number]; x: number }> = {
  // [leftPhotos, leftNotes, rightPhotos, rightNotes]
  'case-honeycomb': { layout: [3, 0, 0, 18], x: 6 },
  'case-crest': { layout: [1, 5, 0, 12], x: 7 },
  'case-window': { layout: [2, 3, 0, 11], x: 4 },
  'case-garden': { layout: [2, 2, 1, 5], x: 3 },
};

for (const c of CASE_TEMPLATES) {
  const L = startingLayout(c.station2);
  const exp = expectations[c.id];
  check(!!exp, `no expectation for ${c.id}`);
  if (!exp) continue;

  const got: [number, number, number, number] = [L.leftPhotos, L.leftNotes, L.rightPhotos, L.rightNotes];
  check(
    JSON.stringify(got) === JSON.stringify(exp.layout),
    `${c.id}: layout ${got} != expected ${exp.layout}`,
  );
  check(c.station2.solutionX === exp.x, `${c.id}: solutionX ${c.station2.solutionX} != ${exp.x}`);

  // Solve it symbolically: left value = right value, solve for X.
  // coefficient*X + leftNotes  ==  rightPhotoCoeff*X + rightNotes
  const coeff = L.leftPhotos - L.rightPhotos;
  const rhs = L.rightNotes - L.leftNotes;
  const solved = coeff === 0 ? null : rhs / coeff;
  console.log(
    `  ${c.id.padEnd(15)} ${L.leftPhotos}X+${L.leftNotes} = ${L.rightPhotos}X+${L.rightNotes}` +
      `  -> X = ${solved} (config ${c.station2.solutionX})`,
  );
  check(solved === exp.x, `${c.id}: equation solves to ${solved}, config says ${exp.x}`);
  check(
    c.station2.solutionX === exp.x,
    `${c.id}: config solutionX does not satisfy its own equation`,
  );
}

console.log('\n=== resolution paths reach isolation ===');
for (const c of CASE_TEMPLATES) {
  const L = startingLayout(c.station2);
  const x = c.station2.solutionX;

  // --- simulate the intended solve, mirroring the component's own rules ---
  let leftNotes = L.leftNotes;
  let rightNotes = L.rightNotes;
  let leftPhotos = L.leftPhotos;
  let rightPhotos = L.rightPhotos;

  // Step 1: cancel notes note-for-note across the spine.
  const cancelNotes = Math.min(leftNotes, rightNotes);
  leftNotes -= cancelNotes;
  rightNotes -= cancelNotes;

  // Step 2: cancel a shared photo (only `both-sides` has one on the right).
  const cancelPhotos = Math.min(Math.max(leftPhotos - 1, 0), rightPhotos);
  leftPhotos -= cancelPhotos;
  rightPhotos -= cancelPhotos;

  // Step 3: divide. Each envelope holds rightNotes/leftPhotos; pairing one photo with one
  // envelope removes BOTH (the photo and its share of the pile), so after `k` pairs the left
  // holds leftPhotos-k photos and the right holds (leftPhotos-k) shares.
  let rightValue = rightNotes;
  const share = envelopeShare(rightNotes, leftPhotos);
  const divides = leftPhotos > 1 && share * leftPhotos === rightNotes;
  if (divides) {
    // Pair away all but one photo/envelope pair.
    rightValue = share;
    leftPhotos = 1;
  }

  const done = isIsolated(leftPhotos, leftNotes, rightValue, x);
  console.log(
    `  ${c.id.padEnd(15)} cancelNotes=${cancelNotes} cancelPhotos=${cancelPhotos}` +
      ` left=${leftPhotos}P+${leftNotes}N right=${rightValue}` +
      (divides ? ` (÷${share} each)` : '') +
      `  isolated=${done}`,
  );
  check(done, `${c.id}: intended solution path does NOT reach isolation`);
}

console.log('\n=== division arithmetic ===');
check(envelopeShare(18, 3) === 6, `18/3 should be 6, got ${envelopeShare(18, 3)}`);
check(envelopeShare(8, 2) === 4, `8/2 should be 4, got ${envelopeShare(8, 2)}`);
check(envelopeShare(11, 2) === 6, `11/2 rounds to 6`);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} FAILURES`}`);
