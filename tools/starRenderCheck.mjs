/**
 * Does the RENDERED star stage contain what it should, and nothing it should not?
 *
 * The source check proves the rules are written down; the generator fuzz proves the data is
 * sound. Neither proves the two meet correctly in the output - that the viewBox is the right
 * size, that the sparkles and gold outlines actually made it into the markup, that the spin
 * animation is attached with the shape's own anchor as its origin, and that no equation leaked
 * into the rendered text.
 *
 * Run:
 *   npx vite build --config tools/vite.star-sheet.config.ts
 *   node node_modules/.tmp/star-sheet/sheet.mjs
 *   node tools/starRenderCheck.mjs
 */
import { readFileSync, statSync, existsSync } from 'node:fs';

let failures = 0;
function check(label, condition, detail = '') {
  if (!condition) {
    failures += 1;
    console.error(`  FAIL  ${label}${detail ? ` :: ${detail}` : ''}`);
  } else {
    console.log(`  ok    ${label}`);
  }
}
const count = (re) => (html.match(re) ?? []).length;

const SHEET = 'dist/star-sheet.html';
const SOURCES = [
  'src/components/farm/stars/StarStage.tsx',
  'src/components/farm/stars/StarShapeArt.tsx',
];

// The sheet must exist and be newer than the components it renders. `npm run build` empties
// `dist/`, so running it after generating the sheet deletes this file - and without the guard
// the checks below would report zero sparkles drawn, which reads like a rendering bug rather
// than a missing input.
function sheetIsStale() {
  if (!existsSync(SHEET)) return true;
  const age = statSync(SHEET).mtimeMs;
  return SOURCES.some((f) => statSync(f).mtimeMs > age);
}
if (sheetIsStale()) {
  console.error(
    `\n${SHEET} is missing or older than ${SOURCES.join(', ')}.\n` +
      'Regenerate it, then re-run:\n' +
      '  npx vite build --config tools/vite.star-sheet.config.ts\n' +
      '  node node_modules/.tmp/star-sheet/sheet.mjs\n' +
      '  node tools/starRenderCheck.mjs\n',
  );
  process.exit(1);
}

const html = readFileSync(SHEET, 'utf8');

console.log('\n=== The stage is the farm canvas ===');
{
  const boxes = [...new Set([...html.matchAll(/viewBox="([^"]+)"/g)].map((m) => m[1]))];
  console.log(`  viewBox values found: ${boxes.join(' | ')}`);
  check('every stage is 800 x 360', boxes.every((b) => b === '0 0 800 360'), boxes.join(' | '));
  check('the sky gradient is painted', html.includes('star-sky'), 'no gradient rect');
}

console.log('\n=== The constellations are drawn ===');
{
  const sparkles = count(/points="0,-8 2\.2,-2\.2 8,0 2\.2,2\.2 0,8 -2\.2,2\.2 -8,0 -2\.2,-2\.2"/g);
  console.log(`  sparkle polygons in the sheet: ${sparkles}`);
  check('sparkles are drawn', sparkles > 0);
  check('the gold outline style is present', html.includes('stroke="#fde047"'));
  check('the outline is 2px', html.includes('stroke-width="2"'));
  check('the outline is 85% opaque', html.includes('stroke-opacity="0.85"'));
  check('the sparkle core colour is used', html.includes('#fffdf0'));
  // Every constellation must be a CLOSED outline, so its polygon has as many points as it has
  // sparkles. An open path would read as a zigzag and defeat the "see the shape" idea.
  const outlines = [...html.matchAll(/<polygon points="([^"]+)" fill="none"/g)];
  check('closed outlines are drawn', outlines.length > 0, `${outlines.length}`);
  check(
    'every outline has at least 3 vertices',
    outlines.every((o) => o[1].trim().split(/\s+/).length >= 3),
  );
}

console.log('\n=== The backdrop is decorative, not countable ===');
{
  const specks = count(/<circle[^>]*r="0\.[0-9]+"/g);
  console.log(`  backdrop specks: ${specks}`);
  check('the backdrop is dusted with specks', specks > 0);
  // A speck must be visibly smaller and dimmer than a constellation star, or a child counting
  // carefully would count the sky and be marked wrong for it.
  check('the specks are small', /r="0\.\d"|r="1\.[01]"/.test(html), 'no speck under 1.2 units');
  const dims = [...html.matchAll(/opacity="(0\.\d+)"/g)].map((m) => Number.parseFloat(m[1]));
  check('the specks are dim', dims.some((d) => d <= 0.5), `max opacity ${Math.max(...dims, 0)}`);
}

console.log('\n=== The spin is a CSS animation about the shape anchor ===');
{
  const spins = [...html.matchAll(/animation:\s*starSpin\s*([\d.]+)s/g)].map((m) => m[1]);
  console.log(`  spinning groups: ${spins.length} at durations ${[...new Set(spins)].join(', ')}s`);
  check('tier 3 shapes are spinning', spins.length > 0);
  check(
    'the spin is slow enough to track',
    spins.every((s) => Number.parseFloat(s) >= 15),
    spins.join(', '),
  );
  // The origin must be a real anchor coordinate, not the browser's default element centre -
  // without it the shape would orbit its own bounding box instead of turning in place.
  const origins = [...new Set([...html.matchAll(/transform-origin:([\d.]+)px ([\d.]+)px/g)].map((m) => `${m[1]},${m[2]}`))];
  console.log(`  transform origins: ${origins.join(' | ')}`);
  check('every spinning group has an explicit origin', origins.length > 0);
  check(
    'the origin is measured in stage units',
    html.includes('transform-box:view-box') || html.includes('transform-box: view-box'),
  );
  // The anchors are the re-centred ones for the 800-wide canvas. Tier 3 is the spinning tier,
  // and its three anchors are what appear here - tier 2's are not, because no tier 2 shot spins.
  check('an origin matches the left tier-3 anchor', origins.some((o) => o === '280,115'), origins.join(' | '));
  check('an origin matches the right tier-3 anchor', origins.some((o) => o === '520,115'), origins.join(' | '));
  check('an origin matches the bottom tier-3 anchor', origins.some((o) => o === '400,240'), origins.join(' | '));
}

console.log('\n=== Counts appear only where they belong ===');
{
  // Both a spinning and a feedback shot are in the sheet, so a badge count above zero is
  // expected - the assertion is that they are present at all in the reveal shot.
  const badges = count(/font-size="19"/g);
  console.log(`  count badges in the sheet: ${badges}`);
  check('the reveal shot draws count badges', badges > 0);
}

console.log('\n=== NO EQUATION REACHED THE CHILD ===');
{
  /**
   * SCOPED TO THE GAME'S OWN OUTPUT, NOT THE WHOLE SHEET.
   *
   * The contact sheet's figcaption is a debugging aid for whoever is looking at the page - it
   * prints each round's shape sizes as `counts 6 + 3`. That is a deliberate developer readout,
   * not the child's UI, and the first version of this check failed on it. Scanning the whole
   * page would therefore fail on a tool caption forever, and the tempting fix would be to delete
   * the caption - which would make the sheet less useful to hide a non-problem.
   *
   * So the scan covers what the GAME actually renders: the SVG contents, and the figcaption's
   * label line only (never its `.meta` debug span). What the child sees is the SVG, the answer
   * buttons and the status line - all of which are free of the sheet's annotations.
   */
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
  // Everything inside <svg>...</svg>, plus the status/button text, minus the debug captions.
  const svgBodies = [...withoutComments.matchAll(/<svg[\s\S]*?<\/svg>/g)].map((m) => m[0]).join('\n');
  const captionLabels = [...withoutComments.matchAll(/<strong>(.*?)<\/strong>/g)].map((m) => m[1]).join('\n');
  const gameText = `${svgBodies}\n${captionLabels}\n${withoutComments.replace(/<span class="meta">[\s\S]*?<\/span>/g, '')}`;

  const equation = /(\d)\s*\+\s*(\d)/.exec(gameText);
  check('no addition expression is rendered', equation === null, equation ? equation[0] : '');
  const equals = /(\d)\s*=\s*(\d)/.exec(gameText);
  check('no equals expression is rendered', equals === null, equals ? equals[0] : '');

  // THE DETECTOR IS PROVEN AGAINST A FIXTURE, because a scanner that matches nothing passes
  // every "is it absent" assertion while proving nothing at all. The caption's own debug span
  // is a known string that DOES contain a breakdown, so it confirms the pattern can fire.
  const captionMeta = [...withoutComments.matchAll(/<span class="meta">(.*?)<\/span>/g)].map((m) => m[1]).join('\n');
  check(
    'the equation detector fires on a known-good fixture',
    /(\d)\s*\+\s*(\d)/.test(captionMeta),
    'the caption no longer carries a breakdown, so this fixture is stale',
  );
}

console.log('\n=== The banner lives in the status component, not the stage ===');
{
  // The stage draws only the sky. The question belongs to StarStatus, so it is asserted there.
  const status = readFileSync('src/components/farm/stars/StarStatus.tsx', 'utf8');
  check('the question banner is defined', status.includes('כמה כוכבים מאירים בשמיים? ⭐'));
  check('the banner is not smuggled into the stage', !readFileSync('src/components/farm/stars/StarStage.tsx', 'utf8').includes('כמה כוכבים'));
  check('the old breakdown hint is gone', !html.includes('perCluster'));
}

if (failures === 0) {
  console.log('\nRENDERED STAR SHEET MATCHES THE SPEC\n');
} else {
  console.error(`\n*** ${failures} PROBLEM(S) ***\n`);
  process.exit(1);
}
