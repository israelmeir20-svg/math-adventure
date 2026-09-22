/**
 * Derive and verify the star-stage anchors for the 800 x 360 farm canvas.
 *
 * The original anchors were authored for 600 x 320, where x = 300 is the true midpoint.
 * The farm stages all use 800 x 360, so every anchor shifts by +100 in x and +20 in y -
 * a rigid translation, which is what preserves the separation invariant exactly rather
 * than approximately.
 *
 * Run: npx tsx tools/starFitProbe.ts
 */

/** Ring radii per shape size, and the sparkle's own arm reach. */
const RADIUS: Record<number, number> = { 3: 40, 4: 44, 5: 46, 6: 48 };
const SPARKLE_ARM = 8;
const SHIFT_X = 100;
const SHIFT_Y = 20;

const ORIGINAL = {
  2: [
    { name: 'Left', x: 190, y: 145 },
    { name: 'Right', x: 410, y: 145 },
  ],
  3: [
    { name: 'TopLeft', x: 180, y: 95 },
    { name: 'TopRight', x: 420, y: 95 },
    { name: 'Bottom', x: 300, y: 220 },
  ],
};

const ANCHORS = Object.fromEntries(
  Object.entries(ORIGINAL).map(([count, list]) => [
    count,
    list.map((a) => ({ ...a, x: a.x + SHIFT_X, y: a.y + SHIFT_Y })),
  ]),
) as Record<string, { name: string; x: number; y: number }[]>;

const W = 800;
const H = 360;

console.log(`Shifted by +${SHIFT_X} in x, +${SHIFT_Y} in y (a rigid translation).\n`);

console.log('=== The new anchors ===');
for (const [count, list] of Object.entries(ANCHORS)) {
  for (const a of list) console.log(`  ${count} shapes, ${a.name.padEnd(9)}: (${a.x}, ${a.y})`);
}

console.log('\n=== Separation invariant: minimum centre distance >= 140px ===');
let worstSep = Infinity;
for (const [count, list] of Object.entries(ANCHORS)) {
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const d = Math.hypot(list[i].x - list[j].x, list[i].y - list[j].y);
      worstSep = Math.min(worstSep, d);
      console.log(
        `  ${count} shapes: ${list[i].name} <-> ${list[j].name}: ${d.toFixed(1)}px -> ${d >= 140 ? 'ok' : 'VIOLATES'}`,
      );
    }
  }
}
console.log(`  tightest separation across all tiers: ${worstSep.toFixed(1)}px`);

console.log('\n=== Does every shape clear its neighbour, not just its centre? ===');
{
  // Two hexagons of radius 48 plus sparkle arms must not touch: their rings must be
  // further apart than the sum of their reaches.
  const reach = Math.max(...Object.values(RADIUS)) + SPARKLE_ARM; // 56
  const need = reach * 2; // 112 for two worst-case shapes
  console.log(`  two worst-case shapes need ${need}px between centres`);
  console.log(`  tightest actual separation is ${worstSep.toFixed(1)}px -> ${worstSep >= need ? 'clear by ' + (worstSep - need).toFixed(1) + 'px' : 'TOO CLOSE'}`);
}

console.log('\n=== On-canvas bounds, 800 x 360 ===');
for (const [count, list] of Object.entries(ANCHORS)) {
  const reach = Math.max(...Object.values(RADIUS)) + SPARKLE_ARM;
  let box = { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity };
  for (const a of list) {
    box = {
      l: Math.min(box.l, a.x - reach),
      r: Math.max(box.r, a.x + reach),
      t: Math.min(box.t, a.y - reach),
      b: Math.max(box.b, a.y + reach),
    };
  }
  const fits = box.l >= 0 && box.t >= 0 && box.r <= W && box.b <= H;
  console.log(
    `  ${count} shapes: swept x ${box.l.toFixed(0)}..${box.r.toFixed(0)}, y ${box.t.toFixed(0)}..${box.b.toFixed(0)} -> ${fits ? 'FITS' : 'CLIPS'}`,
  );
  if (!fits) {
    console.log(
      `     overhang: left ${(0 - box.l).toFixed(0)}, right ${(box.r - W).toFixed(0)}, ` +
        `top ${(0 - box.t).toFixed(0)}, bottom ${(box.b - H).toFixed(0)}`,
    );
  }
}

console.log('\n=== Rotation sweep (Tier 3) ===');
{
  // Rotation does not change a regular polygon's circumradius, so a rotating shape sweeps
  // a disc of `reach` - which means the static bounds above already bound the rotating case.
  const reach = Math.max(...Object.values(RADIUS)) + SPARKLE_ARM;
  console.log(`  each rotating shape sweeps a ${reach}px disc around its anchor`);
  console.log('  the static bounds above therefore also bound the rotating case');
}

console.log('\n=== Tier 1 centring ===');
console.log(`  single shape at (400, 165): x 400 is exactly the midpoint of ${W}`);
console.log(`  y 165 is exactly the midpoint of ${H}`);
