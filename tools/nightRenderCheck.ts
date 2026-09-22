/**
 * SVG verification for the night barn.
 *
 * RUNS UNDER VITE, NOT UNDER tsx. The stage uses the automatic JSX runtime,
 * which Vite is configured for and a bare Node loader is not - and rather than
 * bolt a second JSX toolchain onto the test, this renders through the SAME
 * pipeline the app uses. That also means sprite imports resolve exactly as they
 * do in production.
 *
 * The two defects this guards against are both about the DARKNESS:
 *
 *   1. A semi-transparent overlay left the animal bodies faintly visible, so the
 *      barn was dim rather than dark. The overlay must be fully opaque.
 *   2. The eyes used to be drawn inside the animal's own group, which put them
 *      UNDER that overlay - so making it opaque would have hidden them too. They
 *      must now be a separate layer rendered AFTER the darkness.
 *
 * It also checks that each species' eyes land on ITS OWN face, using the
 * per-species percentage offsets rather than one shared guess.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import NightStage from '../src/components/farm/night/NightStage';
import { buildNightPuzzle } from '../src/components/farm/night/nightGenerator';
import { eyePosition, bodyBox } from '../src/components/farm/night/nightGeometry';
import {
  ANIMAL_EYE_OFFSETS,
  animalSize,
  BEAM_R,
  DARK_OPACITY,
  PASTURE_Y0,
  PASTURE_Y1,
} from '../src/components/farm/night/nightStageData';

let failures = 0;
function check(label: string, condition: boolean, detail = '') {
  if (!condition) {
    failures += 1;
    console.error(`  FAIL  ${label}${detail ? ` :: ${detail}` : ''}`);
  } else {
    console.log(`  ok    ${label}`);
  }
}

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Index of the first occurrence of a needle, or -1. */
function at(html: string, needle: string): number {
  return html.indexOf(needle);
}

console.log('\n=== Rendered stage, several tiers ===');
for (const [salt, round] of [[1, 1], [2, 3], [3, 5], [4, 8], [5, 1], [6, 5]] as const) {
  const puzzle = buildNightPuzzle(round, seeded(round * 13 + salt));
  const html = renderToStaticMarkup(
    createElement(NightStage, { spots: puzzle.spots, revealed: false, cheering: false }),
  );
  console.log(`\n-- L${puzzle.level} [${puzzle.mode}] ${puzzle.spots.length} animals  "${puzzle.question}"`);
  runChecks(puzzle, html);
}

console.log('\n=== Per-species eye anchoring ===');
// Every species must have an entry, and its eyes must sit in the UPPER-LEFT-ish
// region of the box - i.e. on a face, not on the feet.
const EXPECTED = ['duck', 'rabbit', 'cat', 'dog', 'sheep', 'donkey', 'cow', 'horse'];
for (const animal of EXPECTED) {
  const offsets = ANIMAL_EYE_OFFSETS[animal];
  check(`${animal}: has offsets`, Boolean(offsets));
  if (!offsets) continue;
  for (const side of ['left', 'right'] as const) {
    const [xPct, yPct] = offsets[side];
    check(`${animal}.${side}: x in 0..100`, xPct >= 0 && xPct <= 100, `${xPct}`);
    check(`${animal}.${side}: y in 0..100`, yPct >= 0 && yPct <= 100, `${yPct}`);
    // These heads sit in the upper half of the sprite. The band is deliberately
    // generous rather than tight: the offsets are calibrated per species against
    // the real artwork, and several animals (sheep, rabbit, duck) genuinely wear
    // their faces low on the sprite because the sprite includes a tall body.
    // A tight "top third" rule would reject correct measurements.
    check(`${animal}.${side}: in the head band (y<=60%)`, yPct <= 60, `${yPct}%`);
    check(`${animal}.${side}: not on the legs (y>=15%)`, yPct >= 15, `${yPct}%`);
  }
  // The two eyes must not be in the same place, but must also not span the whole
  // body. The upper bound is generous because these sprites are not all
  // front-facing portraits: duck, rabbit and cow are drawn wide, and their faces
  // genuinely span a large fraction of the box (36%, 32%, 24% respectively). A
  // tighter rule would reject the calibrated values, so it would be testing the
  // rule rather than the artwork.
  const gap = Math.abs(offsets.left[0] - offsets.right[0]);
  check(`${animal}: two distinct eyes`, gap > 2, `gap ${gap}%`);
  check(`${animal}: eyes are a pair, not a spread`, gap < 45, `gap ${gap}%`);
}
// The offsets must actually differ between species, or the dictionary is pointless.
const signatures = new Set(
  EXPECTED.map((a) => `${ANIMAL_EYE_OFFSETS[a]!.left}|${ANIMAL_EYE_OFFSETS[a]!.right}`),
);
check('offsets differ between species', signatures.size >= 6, `${signatures.size} unique`);
// A species with no entry must still land somewhere sane rather than crash.
check('unknown species falls back safely', (() => {
  const spot = { id: 0, animal: 'duck' as const, x: 400, y: 200, scale: 1 };
  const p = eyePosition({ ...spot, animal: 'unknown' as never }, 'left');
  return Number.isFinite(p.x) && Number.isFinite(p.y);
})());

function runChecks(puzzle: ReturnType<typeof buildNightPuzzle>, html: string) {
  // === 1. THE OVERLAY MUST BE FULLY OPAQUE. ===
  // This is defect #1: any value below 1 lets the bodies bleed through.
  check('darkness is 100% opaque', DARK_OPACITY === 1, `DARK_OPACITY=${DARK_OPACITY}`);
  check('overlay renders fill-opacity="1"', html.includes('fill-opacity="1"'));
  check('overlay has no fractional opacity', !/fill-opacity="0\.\d+"/.test(html));

  // === 2. THE EYES MUST BE DRAWN ABOVE THE DARKNESS. ===
  // This is defect #2. Compare document positions: the eye circles must appear
  // AFTER the overlay path in paint order.
  const overlayAt = at(html, 'fill-rule="evenodd"');
  const firstGlowAt = at(html, 'drop-shadow(0 0 5px #ffd54f)');
  check('overlay is present', overlayAt >= 0);
  check('eye glow is present', firstGlowAt >= 0);
  check('eyes render AFTER the darkness', firstGlowAt > overlayAt, `eyes@${firstGlowAt} overlay@${overlayAt}`);

  // And the bodies must come BEFORE the darkness, or they would never be hidden.
  const firstImageAt = at(html, '<image');
  check('bodies render BEFORE the darkness', firstImageAt >= 0 && firstImageAt < overlayAt, `img@${firstImageAt} overlay@${overlayAt}`);

  // === 3. One eye group per animal, two dots each. ===
  check('one glow group per animal', (html.match(/eyeGlow/g) ?? []).length === puzzle.spots.length);
  const glowDots = (html.match(/fill="#fff176"/g) ?? []).length;
  check('exactly two dots per animal', glowDots === puzzle.spots.length * 2, `${glowDots} vs ${puzzle.spots.length * 2}`);

  // === 4. Eyes must land ON the animal's face, per species. ===
  for (const spot of puzzle.spots) {
    const { size, left, top } = bodyBox(spot);
    for (const side of ['left', 'right'] as const) {
      const { x, y } = eyePosition(spot, side);
      const [xPct, yPct] = ANIMAL_EYE_OFFSETS[spot.animal]![side];
      // The arithmetic must match the declared percentages exactly.
      const wantX = left + (xPct / 100) * size;
      const wantY = top + (yPct / 100) * size;
      check(
        `${spot.animal}#${spot.id}.${side} eye computed from offsets`,
        Math.abs(x - wantX) < 0.001 && Math.abs(y - wantY) < 0.001,
        `(${x.toFixed(2)},${y.toFixed(2)}) vs (${wantX.toFixed(2)},${wantY.toFixed(2)})`,
      );
      // And the dot must be INSIDE the sprite box, on the head.
      check(
        `${spot.animal}#${spot.id}.${side} eye inside the box`,
        x > left && x < left + size && y > top && y < top + size,
        `eye(${x.toFixed(1)},${y.toFixed(1)}) box[${left.toFixed(1)},${top.toFixed(1)}..+${size.toFixed(1)}]`,
      );
      check(
        `${spot.animal}#${spot.id}.${side} eye on the face, not the feet`,
        y < top + size * 0.65,
        `y=${y.toFixed(1)} face band ends ${(top + size * 0.65).toFixed(1)}`,
      );
    }
  }

  // === 5. Beam geometry unchanged. ===
  const arcRadius = /a (\d+),(\d+) 0 1,0/.exec(html);
  check(`cutout arc radius is ${BEAM_R}`, arcRadius?.[1] === String(BEAM_R), `found ${arcRadius?.[1]}`);
  const paths = [...html.matchAll(/ d="([^"]+)"/g)].map((m) => m[1] as string);
  const donut = paths.find((d) => d.includes('M0,0 H800 V360 H0 Z'));
  check('donut has the full-stage rect', Boolean(donut));
  check('donut has two arcs (a circle)', (donut?.match(/a /g) ?? []).length === 2, donut?.slice(0, 80));

  // === 6. Nothing outside the pasture band. ===
  for (const spot of puzzle.spots) {
    // The footprint is now PER-SPECIES, so the head-clearance check has to ask
    // the animal how tall it is rather than assume one size for all of them.
    const drawn = animalSize(spot.animal) * spot.scale;
    check(
      `animal #${spot.id} upright in band`,
      spot.y >= PASTURE_Y0 - 1 && spot.y <= PASTURE_Y1 + 1 && spot.y - drawn > 0,
      `y=${spot.y} drawn=${drawn.toFixed(1)}`,
    );
  }

  // === 7. Every sprite must reference a real url. ===
  const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1] as string);
  check('every animal drew a sprite', hrefs.length === puzzle.spots.length, `${hrefs.length}`);
  check('no empty sprite urls', hrefs.every((h) => h.length > 0), hrefs.join(','));
}

if (failures === 0) console.log('\nALL GEOMETRY CHECKS PASSED\n');
else {
  console.error(`\n${failures} GEOMETRY CHECK(S) FAILED\n`);
  process.exit(1);
}
