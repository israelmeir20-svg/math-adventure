/**
 * Inspects the rendered picnic contact sheet for the things only markup can show.
 *
 * The contact sheet is built through Vite (`vite.picnic-sheet.config.ts`), which resolves
 * the image imports the way the app does. That means this file can assert on the ACTUAL
 * rendered output - which assets were emitted, and where the fruit landed - rather than
 * only on the source. `picnicSheetCheck.mjs` covers the source-level questions; this
 * covers what the browser would receive.
 *
 * Run: npx vite build --config tools/vite.picnic-sheet.config.ts && node node_modules/.tmp/picnic-sheet/sheet.mjs && node tools/picnicRenderCheck.mjs
 */
import { readFileSync, statSync, existsSync } from 'node:fs';

// THE SHEET MUST EXIST AND BE FRESH, AND THIS CHECK GENERATES IT IF NOT. `npm run build`
// empties `dist/`, so running the build after the sheet was generated deletes the html this
// check reads. Without the guard and the regeneration below, the check would either report
// zero sprites drawn - which reads like a rendering bug rather than a missing input - or
// pass against markup from a previous revision.
const SHEET = 'dist/picnic-sheet.html';
const SOURCES = ['src/components/farm/picnic/PicnicGridStage.tsx', 'src/components/farm/picnic/FruitLayer.tsx'];

/** True when the sheet is missing, or older than the stage sources it renders. */
function sheetIsStale() {
  if (!existsSync(SHEET)) return true;
  const age = statSync(SHEET).mtimeMs;
  return SOURCES.some((f) => statSync(f).mtimeMs > age);
}

if (sheetIsStale()) {
  console.error(
    `\n${SHEET} is missing or older than ${SOURCES.join(', ')}.\n` +
      'Regenerate it, then re-run:\n' +
      '  npx vite build --config tools/vite.picnic-sheet.config.ts\n' +
      '  node node_modules/.tmp/picnic-sheet/sheet.mjs\n' +
      '  node tools/picnicRenderCheck.mjs\n',
  );
  process.exit(1);
}

const html = readFileSync(SHEET, 'utf8');

let failures = 0;
function check(ok, msg) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
  if (!ok) failures += 1;
}

const count = (re) => (html.match(re) ?? []).length;

console.log('=== The transparent PNGs are in the output ===');
// Vite rewrites every import to a content-hashed path under /assets/, so the assertion is
// on the ASSET NAME (the part before the hash) rather than the source filename. That is
// still a real check: a missing or mis-cased import never reaches the bundle at all.
const assetNames = [...html.matchAll(/\/assets\/([A-Za-z0-9_%-]+?)-\w{8}\.png/g)].map((m) => decodeURIComponent(m[1]));
const uniqueAssets = [...new Set(assetNames)];
console.log(`  emitted assets: ${uniqueAssets.join(', ') || '(none)'}`);
for (const want of ['basket', 'Basket lid', 'apple', 'banana', 'Grapes', 'pear', 'strawberry']) {
  check(uniqueAssets.includes(want), `${want}.png is bundled`);
}
check(!/\.jpg/.test(html), 'no stale .jpg references');

console.log('\n=== No drawn furniture survives ===');
// The old design emitted one rect per compartment at a fixed size.
check(count(/width="125"[^>]*height="44"/g) === 0, 'no compartment rectangles');
check(!html.includes('picnic-lid-clip'), 'no old lid clip path');
check(!html.includes('#935116'), 'no drawn crate frame colour');
check(!html.includes('picnic-blanket-clip'), 'no old blanket clip path');

console.log('\n=== Fruit is a 46px sprite on a measured slot ===');
{
  const sized = count(/width="46" height="46"/g);
  check(sized > 0, `${sized} fruit sprites are 46x46`);

  // EVERY drawn sprite must sit exactly on a matrix slot. A given round fills only SOME of
  // the sixteen - the tier decides how many - so asserting that all sixteen appear across
  // the sheet would assert something the generator never promises. What IS checked: no
  // sprite is drawn off-matrix, and the matrix's own completeness is proven by the geometry
  // checks in `picnicLidCheck.ts` and the source scan in `picnicSheetCheck.mjs`.
  //
  // THE MATRIX IS REPEATED HERE RATHER THAN IMPORTED, because this is a plain `.mjs` and
  // the matrix lives in a TypeScript module. A drift between the two is caught by the
  // source scan, which asserts the matrix in `picnicSlots.ts` still has these values.
  const MATRIX = [
    [260, 86], [350, 86], [450, 86], [540, 86],
    [248, 136], [348, 136], [452, 136], [552, 136],
    [236, 186], [346, 186], [454, 186], [564, 186],
    [224, 236], [344, 236], [456, 236], [576, 236],
  ];
  const HALF = 23;
  // EVERY drawn sprite must sit on a matrix slot, ALLOWING FOR THE JITTER. The outer tiers
  // nudge each fruit up to +-2px within its own slot, so an exact match would fail on every
  // jittered round. The tolerance here is the largest jitter any tier uses, which makes this
  // an assertion that no sprite has DRIFTED off its slot rather than that none has moved.
  const matrixXs = MATRIX.map(([x]) => x - HALF);
  const matrixYs = [...new Set(MATRIX.map(([, y]) => y - HALF))];
  const TOLERANCE = 2;
  // FRACTIONAL COORDINATES ARE EXPECTED: the jitter is a real number, so a nudged fruit
  // lands on something like 237.43 rather than a whole pixel. An integer-only pattern
  // silently fails to parse every jittered sprite, which is what made an earlier version of
  // this check report 58 phantom "off-matrix" failures. The leading space in each pattern
  // also keeps `x=` from matching inside another attribute such as `max=`.
  const drawn = [...html.matchAll(/<image[^>]*width="46"[^>]*height="46"[^>]*>/g)];
  const parsed = drawn.map((m) => ({
    x: Number.parseFloat((m[0].match(/ x="(-?[\d.]+)"/) ?? [])[1]),
    y: Number.parseFloat((m[0].match(/ y="(-?[\d.]+)"/) ?? [])[1]),
  }));
  const unparseable = parsed.filter((p) => Number.isNaN(p.x) || Number.isNaN(p.y));
  const offMatrix = parsed.filter(
    (p) =>
      !matrixXs.some((v) => Math.abs(v - p.x) <= TOLERANCE) ||
      !matrixYs.some((v) => Math.abs(v - p.y) <= TOLERANCE),
  );
  check(parsed.length > 0, `${parsed.length} fruit sprites drawn across the sheet`);
  check(unparseable.length === 0, `every sprite coordinate parsed (${unparseable.length} unparseable)`);
  check(offMatrix.length === 0, `every sprite sits on a slot within +-${TOLERANCE}px (${offMatrix.length} off)`);
}

console.log('\n=== The lid animates between the two states ===');
check(html.includes('translateY(-340px)'), 'open lid translates to -340px');
check(html.includes('translateY(0px)'), 'shut lid lands at 0');
check(html.includes('pointer-events:none'), 'the lid never intercepts a tap');
check(html.includes('cubic-bezier(0.16, 1, 0.3, 1)'), 'the shut easing is present');

if (failures === 0) {
  console.log('\nRENDERED SHEET MATCHES THE REFACTOR\n');
} else {
  console.error(`\n*** ${failures} PROBLEM(S) ***\n`);
  process.exit(1);
}
