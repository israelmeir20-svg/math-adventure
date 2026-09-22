/**
 * Renders the star stage to a PNG so the sky can actually be looked at.
 *
 * The automated checks confirm the geometry is arithmetically correct, but arithmetic does not
 * tell you whether three triangles read as constellations a child would want to count, or
 * whether the sparkles are large enough to see against the gold lines. This draws the tier 3
 * sky standalone so it can be inspected.
 *
 * Run: npx tsx tools/starShot.tsx
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import StarStage from '../src/components/farm/stars/StarStage';
import { buildStarRound } from '../src/components/farm/stars/starGenerator';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const shots: [string, number][] = [
  ['tier-1', 1],
  ['tier-2', 5],
  ['tier-3', 8],
];

const cards = shots
  .map(([label, roundNumber]) => {
    const round = buildStarRound(roundNumber, seeded(4242 + roundNumber));
    const markup = renderToStaticMarkup(<StarStage round={round} showCounts={false} />);
    return `<figure><figcaption>${label} &middot; answer ${round.total} &middot; counts [${round.shapes
      .map((s) => s.count)
      .join(', ')}]</figcaption>${markup}</figure>`;
  })
  .join('\n');

const html = `<!doctype html><html><head><meta charset="utf-8"/><style>
  body{margin:0;padding:16px;background:#111;}
  figure{margin:0 0 14px;}
  figcaption{color:#93c5fd;font:600 13px system-ui;padding:4px 2px;}
  svg{display:block;width:100%;max-width:820px;height:auto;}
</style></head><body>${cards}</body></html>`;

writeFileSync('dist/star-shot.html', html);
console.log('wrote dist/star-shot.html');
