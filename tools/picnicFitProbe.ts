/**
 * Is 46px the right fruit size for this floor?
 *
 * The size and the row pitch are a PAIR: the pitch decides how tall a fruit can be before
 * it touches its vertical neighbour, and that is what sets the largest piece the basket can
 * show. This prints the tradeoff so the pair can be re-chosen deliberately rather than by
 * guesswork, which is how an earlier revision ended up with a 42px sprite on a 36px pitch
 * and a 12px overlap on every row.
 *
 * Run: npx tsx tools/picnicFitProbe.ts
 */
const SLOTS = [
  { x: 260, y: 86 }, { x: 350, y: 86 }, { x: 450, y: 86 }, { x: 540, y: 86 },
  { x: 248, y: 136 }, { x: 348, y: 136 }, { x: 452, y: 136 }, { x: 552, y: 136 },
  { x: 236, y: 186 }, { x: 346, y: 186 }, { x: 454, y: 186 }, { x: 564, y: 186 },
  { x: 224, y: 236 }, { x: 344, y: 236 }, { x: 456, y: 236 }, { x: 576, y: 236 },
];
const PITCH = SLOTS[4].y - SLOTS[0].y; // 50
const JITTER = 2;
const TILT = 0;

/** Half-extent of a square rotated by `deg`. */
function reach(half: number, deg: number): number {
  const t = (deg * Math.PI) / 180;
  return half * (Math.abs(Math.cos(t)) + Math.abs(Math.sin(t)));
}

console.log(`row pitch ${PITCH}px, jitter +-${JITTER}px, tilt ${TILT}deg\n`);

console.log('=== What fruit size fits, at the current jitter and tilt? ===');
for (const size of [32, 38, 42, 44, 46, 48, 50]) {
  const need = reach(size / 2, TILT) * 2 + JITTER * 2;
  const spare = PITCH - need;
  console.log(
    `  ${String(size).padStart(2)}px -> needs ${need.toFixed(1)}px of ${PITCH}px -> ` +
      `${spare >= 0 ? `fits, ${spare.toFixed(1)}px spare` : `OVERLAP by ${(-spare).toFixed(1)}px`}`,
  );
}

console.log('\n=== The chosen size ===');
{
  const size = 46;
  const need = size + JITTER * 2;
  console.log(`  ${size}px with +-${JITTER}px jitter needs ${need}px of the ${PITCH}px pitch`);
  console.log(`  remaining clearance: ${(PITCH - need).toFixed(0)}px at maximum jitter`);
  console.log(
    `\n  THIS IS THE LARGEST FRUIT THE FLOOR WILL HOLD. Going to 48px would need the rows\n` +
      `  widened again, or the jitter removed altogether - the two are a package.`,
  );
}

console.log('\n=== Rows and the full floor extent ===');
{
  const ys = [...new Set(SLOTS.map((s) => s.y))];
  console.log(`  rows at y = ${ys.join(', ')}`);
  console.log(`  the fruit's painted edge reaches y ${ys[0] - 23}..${ys[ys.length - 1] + 23}`);
  const xs = SLOTS.map((s) => s.x);
  console.log(`  slot centres span x ${Math.min(...xs)}..${Math.max(...xs)}`);
  console.log(`  the fruit's painted edge reaches x ${Math.min(...xs) - 23}..${Math.max(...xs) + 23}`);
  console.log(`  the basket photo box is x 120..680, y 25..300`);
}

console.log('\n=== Vertical gap between adjacent piles, at the extremes ===');
{
  const size = 46;
  // The worst case is two neighbours nudged toward each other by the full jitter.
  const gap = PITCH - size - JITTER * 2;
  console.log(
    `  top fruit pushed down ${JITTER}px, bottom pushed up ${JITTER}px -> ` +
      `${gap}px between the sprite boxes`,
  );
  console.log('  (a zero or positive number means the boxes never interpenetrate)');
}
