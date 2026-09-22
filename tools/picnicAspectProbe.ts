/**
 * Does the basket artwork's aspect ratio match the box it is drawn into?
 *
 * `preserveAspectRatio="xMidYMid meet"` NEVER distorts - it fits the image inside the
 * box and letterboxes the remainder. So if the artwork's aspect ratio differs from the
 * box's, the drawn image is SMALLER than the box on one axis, and any slot coordinate
 * measured against the box drifts relative to the picture the child actually sees.
 *
 * That is the question this answers, because the hand-measured slot matrix can only be
 * trusted if the image really spans x=120..680 and y=25..300.
 *
 * Run: npx tsx tools/picnicAspectProbe.ts
 */
import { readFileSync } from 'node:fs';

const DIR = 'src/assets/fruit/';

/** Reads a PNG's pixel dimensions from the IHDR chunk. */
function pngSize(file: string): { w: number; h: number } {
  const b = readFileSync(DIR + file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const BOX = { x: 120, y: 25, w: 560, h: 275 };
const boxAspect = BOX.w / BOX.h;

console.log(`target box: x ${BOX.x}..${BOX.x + BOX.w}, y ${BOX.y}..${BOX.y + BOX.h}`);
console.log(`target aspect W/H = ${BOX.w}/${BOX.h} = ${boxAspect.toFixed(4)}\n`);

console.log('file            | native        | aspect | vs box  | drawn with meet  | gap');
console.log('----------------+---------------+--------+---------+------------------+-----');

for (const f of ['basket.png', 'Basket lid.png']) {
  const { w, h } = pngSize(f);
  const aspect = w / h;
  const deltaPct = ((aspect - boxAspect) / boxAspect) * 100;

  // With `meet`, the image is scaled to FIT: the limiting axis fills the box and the
  // other axis is letterboxed.
  const scale = Math.min(BOX.w / w, BOX.h / h);
  const drawnW = w * scale;
  const drawnH = h * scale;
  const gapX = BOX.w - drawnW;
  const gapY = BOX.h - drawnH;

  console.log(
    `${f.padEnd(15)} | ${`${w}x${h}`.padEnd(13)} | ${aspect.toFixed(4)} | ` +
      `${(deltaPct >= 0 ? '+' : '') + deltaPct.toFixed(1)}%`.padEnd(7) + ' | ' +
      `${`${drawnW.toFixed(0)}x${drawnH.toFixed(0)}`.padEnd(16)} | ` +
      `${gapX > 0.5 ? `${gapX.toFixed(0)}px horizontal` : ''}` +
      `${gapY > 0.5 ? `${gapY.toFixed(0)}px vertical` : ''}` +
      `${gapX <= 0.5 && gapY <= 0.5 ? 'none' : ''}`,
  );
}

console.log('\nSlot matrix extents (hand-measured), for comparison:');
const SLOTS = [
  { x: 260, y: 86 }, { x: 350, y: 86 }, { x: 450, y: 86 }, { x: 540, y: 86 },
  { x: 248, y: 136 }, { x: 348, y: 136 }, { x: 452, y: 136 }, { x: 552, y: 136 },
  { x: 236, y: 186 }, { x: 346, y: 186 }, { x: 454, y: 186 }, { x: 564, y: 186 },
  { x: 224, y: 236 }, { x: 344, y: 236 }, { x: 456, y: 236 }, { x: 576, y: 236 },
];
const xs = SLOTS.map((s) => s.x);
const ys = SLOTS.map((s) => s.y);
console.log(`  x spans ${Math.min(...xs)}..${Math.max(...xs)} (slot centres 224..576)`);
console.log(`  y spans ${Math.min(...ys)}..${Math.max(...ys)} (slot centres 86..236)`);

console.log('\nRow pitches (must stay under the fruit width to avoid a fat gap,');
console.log('and over the fruit width to avoid overlap):');
const rows = [0, 1, 2, 3].map((r) => SLOTS.slice(r * 4, r * 4 + 4).map((s) => s.x));
for (const [i, row] of rows.entries()) {
  const pitches = row.slice(1).map((x, k) => x - row[k]);
  console.log(`  row ${i}: x = [${row.join(', ')}]  pitches = [${pitches.join(', ')}]`);
}
const colYs = [SLOTS[0].y, SLOTS[4].y, SLOTS[8].y, SLOTS[12].y];
console.log(`  row y = [${colYs.join(', ')}]  pitch = ${colYs[1] - colYs[0]}px`);
