/**
 * Does the star game's SOURCE obey the rules that no runtime test can see?
 *
 * Some of this game's requirements are about what must never be written, not what must be
 * computed. "No equation ever reaches the child" and "no SMIL animation" cannot be established
 * by driving the generator - they are properties of the source text. So they are read directly.
 *
 * This is the same shape as `picnicSheetCheck.mjs`, and it is deliberately brittle: it asserts
 * exact strings so that a refactor which reintroduces a spoiler fails here rather than silently
 * shipping.
 *
 * Run: node tools/starSheetCheck.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';

let failures = 0;
function check(label, condition, detail = '') {
  if (!condition) {
    failures += 1;
    console.error(`  FAIL  ${label}${detail ? ` :: ${detail}` : ''}`);
  } else {
    console.log(`  ok    ${label}`);
  }
}

const DIR = 'src/components/farm/stars';
const files = readdirSync(DIR).sort();
const src = Object.fromEntries(files.map((f) => [f, readFileSync(`${DIR}/${f}`, 'utf8')]));

console.log('\n=== The files that must exist ===');
for (const f of [
  'ConstellationGame.tsx',
  'StarStage.tsx',
  'StarControls.tsx',
  'StarShapeArt.tsx',
  'StarCounts.tsx',
  'StarBackdrop.tsx',
  'StarHeader.tsx',
  'StarStatus.tsx',
  'StarStartOverlay.tsx',
  'StarResults.tsx',
  'starGenerator.ts',
  'starData.ts',
  'starTypes.ts',
  'starTiers.ts',
  'starTierChecks.ts',
  'starRules.ts',
  'useStarRound.ts',
]) {
  check(`${f} exists`, files.includes(f));
}

console.log('\n=== NO EQUATION MAY EVER REACH THE CHILD ===');
{
  const status = src['StarStatus.tsx'];
  // The prompt is a plain literal. Any template interpolation or string concatenation in the
  // banner would open the door to a per-shape breakdown leaking back in.
  check(/const PROMPT = 'כמה כוכבים מאירים בשמיים\? ⭐'/.test(status), 'the prompt is a plain string literal');
  check(!/PROMPT\s*=\s*`/.test(status), 'the prompt is not a template literal');
  const promptLine = status.split('\n').find((l) => l.includes('const PROMPT'));
  check(!promptLine.includes('${'), 'the prompt interpolates nothing');
  // The '+' operator must not appear in rendered text anywhere in the component tree.
  for (const f of ['StarStatus.tsx', 'StarStage.tsx', 'StarCounts.tsx', 'StarShapeArt.tsx']) {
    const body = src[f];
    const leaks = body
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('//'))
      .filter((l) => /['"`]\s*\+\s*['"`]/.test(l) || /\.join\(\s*['"`]\s*\+\s*['"`]/.test(l));
    check(`${f} renders no string concatenation of numbers`, leaks.length === 0, leaks.join(' | '));
  }
  // The old town game's giveaway was a joined breakdown hint. It must not appear here.
  for (const f of files) {
    check(`${f} does not print a per-shape breakdown`, !/describeRound|perCluster\.join/.test(src[f]));
  }
}

console.log('\n=== The spin is CSS, never SMIL ===');
{
  /**
   * Strips comments, so the checks below test the CODE and not the prose.
   *
   * This matters because `StarShapeArt.tsx` explains at length why SMIL was rejected - and that
   * explanation necessarily names `<animateTransform>`. Scanning the raw file would fail on the
   * very comment that documents the decision, which would push a future author to delete the
   * rationale to make the check pass. That is the wrong trade.
   */
  const codeOnly = (text) =>
    text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('//'))
      .join('\n');

  for (const f of files) {
    const code = codeOnly(src[f]);
    check(`${f} contains no <animate> element`, !/<animate/.test(code));
    check(`${f} contains no animateTransform`, !/animateTransform/.test(code));
  }
  const art = src['StarShapeArt.tsx'];
  check(/animation: `starSpin/.test(art), 'the spin uses the CSS starSpin keyframe');
  check(/transformOrigin/.test(art), 'the spin origin is pinned to the shape anchor');
  check(/transformBox: 'view-box'/.test(art), 'the origin is measured in stage units');
  // The keyframe must actually be declared, or the animation silently does nothing.
  const css = readFileSync('src/index.css', 'utf8');
  check(/@keyframes starSpin/.test(css), 'the starSpin keyframe is declared');
  check(/\[style\*='starSpin'\]/.test(css), 'reduced motion switches the spin off');
}

console.log('\n=== The keyboard and the pad agree ===');
{
  const controls = src['StarControls.tsx'];
  check(/const KEYS = \['1', '2', '3', '4'\]/.test(controls), 'the key list is the four digits');
  check(/dir="ltr"/.test(controls), 'the pad is laid out left to right');
  check(/lockedRef/.test(controls), 'the submit lock is a ref, so it flips synchronously');
  check(/lockedRef\.current = true/.test(controls), 'the lock is set on submit');
  check(/lockedRef\.current = false/.test(controls), 'the lock is released for the next round');
  check(/addEventListener\('keydown'/.test(controls), 'a keydown listener is bound');
  check(/removeEventListener\('keydown'/.test(controls), 'the keydown listener is cleaned up');
  check(/if \(!live\) return undefined/.test(controls), 'the listener is bound only while the round is live');
  check(/\{KEYS\[slot\]\}/.test(controls), 'each button renders its key badge');
}

console.log('\n=== The stage contract ===');
{
  const stage = src['StarStage.tsx'];
  check(/VIEW_W/.test(stage) && /VIEW_H/.test(stage), 'the stage sizes itself from the shared constants');
  check(/showCounts && <StarCounts/.test(stage), 'counts appear only during feedback');
  const game = src['ConstellationGame.tsx'];
  check(/key=\{roundNumber\}/.test(game), 'the stage is re-keyed per round');
  check(/useAnswerAdvance/.test(game), 'the submit lock is delegated to the shared hook');
  check(!/pause|resume|useFrozenClock/.test(game), 'the clock is never paused');
}

console.log('\n=== Line budget: every file strictly under 150 ===');
for (const f of files) {
  const n = src[f].split('\n').length;
  check(`${f} is ${n} lines`, n < 150);
}

if (failures === 0) {
  console.log('\nSTAR SOURCE MATCHES THE SPEC\n');
} else {
  console.error(`\n*** ${failures} PROBLEM(S) ***\n`);
  process.exit(1);
}
