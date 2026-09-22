/**
 * Visual readout of the rendered tier 3 sky, for eyeballing the geometry.
 *
 * Run: node tools/starGeometryDump.mjs
 */
import { readFileSync } from 'node:fs';

const html = readFileSync('dist/star-sheet.html', 'utf8');
const svgs = html
  .split('<svg')
  .slice(1)
  .map((s) => '<svg' + s.split('</svg>')[0]);

console.log(`total stages rendered: ${svgs.length}`);

const t3 = svgs.find((s) => s.includes('starSpin'));
if (!t3) {
  console.error('no spinning stage found in the sheet');
  process.exit(1);
}

const outlines = [...t3.matchAll(/<polygon points="([^"]+)" fill="none"/g)].map((m) => m[1]);
console.log('\n=== tier 3 outline vertices, per shape ===');
for (const [i, points] of outlines.entries()) {
  const verts = points.trim().split(/\s+/);
  console.log(`  shape ${i}: ${verts.length} vertices`);
  for (const v of verts) console.log(`      ${v}`);
}

const sparkles = (t3.match(/0,-8 2\.2/g) ?? []).length;
console.log(`\nsparkles in this sky: ${sparkles}`);

const origins = [...t3.matchAll(/transform-origin:([\d.]+)px ([\d.]+)px/g)].map(
  (m) => `${m[1]},${m[2]}`,
);
console.log(`spin origins: ${origins.join('  |  ')}`);

const durations = [...t3.matchAll(/animation:starSpin ([\d.]+)s/g)].map((m) => m[1]);
console.log(`spin durations: ${durations.join(', ')}s`);

// The bounding box of every vertex, so an off-canvas or misplaced shape is obvious.
const all = outlines
  .join(' ')
  .trim()
  .split(/\s+/)
  .map((pair) => pair.split(',').map(Number));
const xs = all.map((p) => p[0]);
const ys = all.map((p) => p[1]);
console.log(
  `\nvertex bounds: x ${Math.min(...xs)}..${Math.max(...xs)}, y ${Math.min(...ys)}..${Math.max(...ys)}`,
);
console.log('canvas:        x 0..800, y 0..360');
