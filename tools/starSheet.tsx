/**
 * Renders the star stage to a static HTML page for visual inspection.
 *
 * The generator and the clock are covered by automated checks, but whether the shapes actually
 * sit apart on the canvas, whether the spin looks like a spin rather than a jitter, and whether
 * the count badges land clear of the rotating vertices are questions only a picture answers.
 * This draws one round per tier, plus a feedback state, side by side.
 *
 * The spin is live in this sheet - it is plain CSS, so it runs in the browser with no JavaScript
 * at all. That is itself worth seeing: if the keyframe were misnamed the shapes would sit still
 * here, which is exactly the failure a still screenshot would hide.
 *
 * Run: npx tsx tools/starSheet.tsx
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync, mkdirSync } from 'node:fs';
import StarStage from '../src/components/farm/stars/StarStage';
import { buildStarRound } from '../src/components/farm/stars/starGenerator';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

interface Shot {
  label: string;
  round: number;
  showCounts: boolean;
}

const SHOTS: Shot[] = [
  { label: 'L1 triangle (upright)', round: 1, showCounts: false },
  { label: 'L1 square (upright)', round: 2, showCounts: false },
  { label: 'L1 pentagon (upright)', round: 3, showCounts: false },
  { label: 'L2 two shapes (static angle)', round: 4, showCounts: false },
  { label: 'L2 two shapes (static angle)', round: 5, showCounts: false },
  { label: 'L3 three shapes (spinning)', round: 7, showCounts: false },
  { label: 'L3 three shapes (spinning)', round: 8, showCounts: false },
  { label: 'L3 reveal - the counts', round: 8, showCounts: true },
];

const cards = SHOTS.map((shot, i) => {
  const round = buildStarRound(shot.round, seeded(2000 + i * 41));
  const markup = renderToStaticMarkup(
    <StarStage round={round} showCounts={shot.showCounts} />,
  );
  const sizes = round.shapes.map((s) => s.count).join(' + ');
  return `
  <figure>
    <figcaption>
      <strong>${shot.label}</strong><br/>
      <span class="meta">level ${round.level} &middot; answer=${round.total} &middot; options=[${round.options.join(', ')}] &middot; counts ${sizes}</span>
    </figcaption>
    <div class="stage">${markup}</div>
  </figure>`;
}).join('\n');

const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>משחק הכוכבים - contact sheet</title>
<style>
  body { margin:0; padding:20px; background:#050814; color:#e0e7ff;
         font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  h1 { font-size:20px; margin:0 0 4px; }
  p.sub { margin:0 0 18px; font-size:13px; color:#818cf8; }
  .grid { display:grid; grid-template-columns:repeat(2, minmax(360px, 1fr)); gap:18px; }
  figure { margin:0; background:#0b1220; border:1px solid #1e293b; border-radius:12px; overflow:hidden; }
  figcaption { padding:8px 10px; font-size:13px; border-bottom:1px solid #1e293b; }
  .meta { font-size:11px; color:#818cf8; }
  .stage svg { display:block; width:100%; height:auto; }
</style>
</head>
<body>
  <h1>משחק הכוכבים 🌟 - stage contact sheet</h1>
  <p class="sub">One sky per tier. The tier 3 shapes are spinning - these are live CSS animations.</p>
  <div class="grid">${cards}</div>
</body>
</html>`;

mkdirSync('dist', { recursive: true });
writeFileSync('dist/star-sheet.html', html);
console.log('wrote dist/star-sheet.html');
for (const shot of SHOTS) {
  const r = buildStarRound(shot.round, () => 0.42);
  console.log(
    `  ${shot.label}: level ${r.level}, ${r.shapes.length} shape(s), ` +
      `total ${r.total}, options [${r.options.join(',')}]`,
  );
}
