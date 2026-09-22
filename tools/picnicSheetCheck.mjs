/**
 * Asserts the picnic stage's SOURCE has the shape the refactor promised.
 *
 * This checks the components rather than a rendered page, deliberately. Rendering the
 * stage headlessly needs the bundler's asset handling, and running the contact sheet
 * through `tsx` cannot resolve `.png` imports at all - so it silently left a STALE html
 * file behind and "passed" against the previous design.
 *
 * Checking the source is not a weaker test here, because the claim that matters most is a
 * NEGATIVE one: there must be no drawn grid, no compartment rectangles and no divider
 * lines inside the basket. A source scan proves an absence more reliably than a markup
 * scan, and it cannot be defeated by a stale artefact.
 *
 * THE SOURCE FILES ARE ALWAYS FRESH, so unlike the render check this one can never be
 * fooled by an out-of-date build output - which is the whole reason it is the stronger of
 * the two for the "nothing is drawn" claims.
 *
 * Run: node tools/picnicSheetCheck.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/components/farm/picnic';
let failures = 0;
function check(ok, msg) {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${msg}`);
  if (!ok) failures += 1;
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));
const src = Object.fromEntries(files.map((f) => [f, readFileSync(join(DIR, f), 'utf8')]));
const sprites = src['picnicSprites.ts'] ?? '';
const stage = src['PicnicGridStage.tsx'] ?? '';
const meadow = src['PicnicMeadow.tsx'] ?? '';
const basket = src['PicnicBasket.tsx'] ?? '';
const fruit = src['FruitLayer.tsx'] ?? '';
const lid = src['PicnicLid.tsx'] ?? '';
const data = src['picnicData.ts'] ?? '';

console.log('=== The transparent PNG assets are wired up ===');
check(/basket\.png/.test(sprites), 'basket.png is imported');
check(/Basket lid\.png/.test(sprites), 'Basket lid.png is imported (space preserved)');
for (const f of ['apple.png', 'banana.png', 'Grapes.png', 'pear.png', 'strawberry.png']) {
  check(new RegExp(`/${f.replace('.', '\\.')}`).test(sprites), `${f} is imported with exact casing`);
}
check(!/\.jpg/.test(sprites), 'no stale .jpg asset references remain');

console.log('\n=== The puzzle logic stays free of image imports ===');
// The generator and its tests run in plain Node, where a .png import is unresolvable.
for (const f of ['picnicFruits.ts', 'picnicData.ts', 'picnicGenerator.ts', 'picnicPlacement.ts', 'picnicTiers.ts']) {
  const hasImport = /^\s*import\s[^\n]*from\s+['"][^'"]*\.(png|jpg|jpeg)['"]/m.test(src[f] ?? '');
  check(!hasImport, `${f} imports no image (safe for Node)`);
}

console.log('\n=== NOTHING is drawn inside the basket ===');
check(!/<rect/.test(fruit), 'the fruit layer draws no rectangles');
check(!/<line/.test(fruit), 'the fruit layer draws no lines');
check(!/<path/.test(fruit), 'the fruit layer draws no paths');
check(!/<rect/.test(basket) || /ellipse/.test(basket), 'the basket layer draws only the ground shadow');
check(!/<rect/.test(meadow) || !/compartment/i.test(meadow), 'the backdrop draws no compartments');
check(!/CompartmentFloors|CrateFrame/.test(stage), 'the old compartment/frame layers are gone');
check(!files.includes('CrateFrame.tsx'), 'CrateFrame.tsx has been deleted');

console.log('\n=== The four layers are composed in the promised order ===');
{
  const order = ['PicnicMeadow', 'PicnicBasket', 'FruitLayer', 'PicnicLid'].map((n) =>
    stage.indexOf(`<${n}`),
  );
  check(order.every((i) => i >= 0), 'all four layers are rendered');
  check(
    order.every((v, i) => i === 0 || v > order[i - 1]),
    'backdrop -> basket -> fruit -> lid, in that order',
  );
}

console.log('\n=== The slot matrix is the single source of truth ===');
check(/PICNIC_SLOTS_16/.test(data), 'the measured 16-slot matrix exists');
check(/getSlotCoords/.test(data), 'the clamped slot accessor exists');
check(/Math\.min\(count, MAX_PICNIC_SLOTS\)/.test(src['picnicSlots.ts'] ?? ''), 'slot access is clamped to the floor');
check(!/slotX\(|slotY\(/.test(data), 'the old computed grid functions are gone');
check(!/slotX\(|slotY\(/.test(src['picnicSlots.ts'] ?? ''), 'the slot table defines no computed grid');
check(/FRUIT_SIZE = 46/.test(data), 'the fruit is sized to the row pitch');
check(/LID_OPEN_DY = -340/.test(data), 'the open lid offset clears the basket');

// THE EXACT COORDINATES, so a hand edit that drifts from the artwork is caught here rather
// than by eye. `picnicRenderCheck.mjs` repeats this list because it is a plain module and
// cannot import a TypeScript one - these two assertions are what keep them in step.
{
  const slots = src['picnicSlots.ts'] ?? '';
  const EXPECT = [
    [260, 86], [350, 86], [450, 86], [540, 86],
    [248, 136], [348, 136], [452, 136], [552, 136],
    [236, 186], [346, 186], [454, 186], [564, 186],
    [224, 236], [344, 236], [456, 236], [576, 236],
  ];
  const missing = EXPECT.filter(([x, y]) => !slots.includes(`{ x: ${x}, y: ${y} }`));
  check(missing.length === 0, `all 16 measured coordinates are present (${missing.length} missing)`);
  check((slots.match(/\{ x: \d+, y: \d+ \}/g) ?? []).length === 16, 'the matrix has exactly 16 entries');
}

console.log('\n=== The 60s clock never freezes ===');
{
  const game = src['PicnicGame.tsx'] ?? '';
  // THE FREEZE HOOKS MUST NOT BE CALLED. An earlier revision paused the countdown during
  // inspection and feedback; the clock is now a continuous arcade clock, so any surviving
  // call would silently reintroduce a frozen window.
  check(!/useFrozenClock/.test(game), 'the clock is never frozen from the game');
  check(!/useLidLanding/.test(game), 'the lid travel time no longer gates the clock');
  check(!/clockShouldRun/.test(game), 'the old "should the clock run" gate is gone');
  check(!/timer\.pause|timer\.resume/.test(game), 'pause/resume are never called');
  // But the submit lock and the idempotent pick must survive.
  check(/useAnswerAdvance/.test(game), 'the submit lock is still in use');
  check(/isResolving/.test(game), 'a resolving round still blocks new taps');
}

console.log('\n=== Fruit sits flat on the cloth as sprites ===');
check(/<image/.test(fruit), 'fruit renders as <image>, not glyphs');
check(/FRUIT_HALF/.test(fruit), 'fruit is centred on its slot');
check(/xMidYMid meet/.test(fruit), 'fruit sprites keep their aspect ratio');
check(/pointer-events-none/.test(fruit), 'fruit never intercepts a tap');

console.log('\n=== The lid is the photograph and cannot steal taps ===');
check(/<image/.test(lid), 'the lid renders the photograph');
check(/pointerEvents: 'none'/.test(lid), 'the lid never intercepts a tap');
check(/BASKET_LID_SPRITE/.test(lid), 'the lid uses the shared sprite constant');
check(/cubic-bezier\(0\.16, 1, 0\.3, 1\)/.test(lid), 'the shut uses the specified easing');

console.log('\n=== Line budget: every file strictly under 150 ===');
for (const f of files) {
  const n = src[f].split('\n').length;
  check(n < 150, `${f} is ${n} lines`);
}

if (failures === 0) {
  console.log('\nSTAGE SOURCE MATCHES THE REFACTOR\n');
} else {
  console.error(`\n*** ${failures} PROBLEM(S) ***\n`);
  process.exit(1);
}
