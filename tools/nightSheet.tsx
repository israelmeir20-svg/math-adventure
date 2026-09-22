/**
 * Visual proof sheet for the night barn: writes `dist/night-sheet.html`.
 *
 * WHY THIS IS SEPARATE FROM THE ASSERTIONS. `nightLayoutCheck.ts` and the render
 * check prove the numbers are self-consistent - eyes inside the sprite box, box
 * inside the pasture, layer order correct. None of them can prove the eyes sit on
 * the FACES, because that is a question about artwork. The only honest way to
 * answer it is to look at the sprites at their real drawn size with the eyes
 * marked, which is what this writes out.
 *
 * It renders through the app's own asset pipeline (Vite), so the sprites resolve
 * exactly as they do in the game.
 *
 * Open: dist/night-sheet.html
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { NIGHT_SPRITES } from '../src/components/farm/night/nightSprites';
import { bodyBox, eyePosition } from '../src/components/farm/night/nightGeometry';
import { animalSize, EYE_R } from '../src/components/farm/night/nightStageData';
import { ALL_NIGHT_ANIMALS } from '../src/components/farm/night/nightNames';
import type { NightSpot } from '../src/components/farm/night/nightTypes';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CELL = { w: 240, h: 300 };

/** One species at its real drawn size, with its real eye positions marked. */
function cell(animal: string, ox: number, oy: number) {
  const size = animalSize(animal);
  // Feet on the cell's floor line, exactly as the stage anchors them.
  const spot: NightSpot = {
    id: 0,
    animal: animal as NightSpot['animal'],
    x: CELL.w / 2,
    y: 260,
    scale: 1,
  };
  const { left, top } = bodyBox(spot);
  const l = eyePosition(spot, 'left');
  const r = eyePosition(spot, 'right');

  return (
    <g transform={`translate(${ox} ${oy})`}>
      <rect x={left} y={top} width={size} height={size} fill="#161233" stroke="#3b3355" />
      <image
        href={NIGHT_SPRITES[animal as NightSpot['animal']]}
        x={left}
        y={top}
        width={size}
        height={size}
        preserveAspectRatio="xMidYBottom meet"
      />
      {[l, r].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={EYE_R} fill="#fff176" stroke="#ffd54f" strokeWidth="1.5" />
      ))}
      <text x={CELL.w / 2} y={285} textAnchor="middle" fill="#e8e0ff" fontSize="14" fontWeight="700">
        {animal} — {size}px
      </text>
    </g>
  );
}

const cols = 4;
const rows = Math.ceil(ALL_NIGHT_ANIMALS.length / cols);
const W = cols * CELL.w;
const H = rows * CELL.h;

const markup = renderToStaticMarkup(
  <svg xmlns="http://www.w3.org/2000/svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ background: '#0d0a18' }}>
    {ALL_NIGHT_ANIMALS.map((animal, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return <g key={animal}>{cell(animal, col * CELL.w + CELL.w / 2, row * CELL.h)}</g>;
    })}
  </svg>,
);

const page = `<!doctype html><meta charset="utf-8"><title>Night barn eye sheet</title>
<body style="margin:0;background:#0d0a18">
<p style="color:#e8e0ff;font:14px system-ui;padding:10px">
Eye calibration sheet — each sprite at its REAL drawn size with the eyes the game draws.
Check that every pair sits on the animal's face. Floor line at y=260 in each cell.
</p>
${markup}</body>`;

const out = fileURLToPath(new URL('../dist/night-sheet.html', import.meta.url));
mkdirSync(fileURLToPath(new URL('../dist', import.meta.url)), { recursive: true });
writeFileSync(out, page);
console.log(`wrote ${out}`);
console.log(`sizes: ${ALL_NIGHT_ANIMALS.map((a) => `${a}=${animalSize(a)}`).join(' ')}`);
