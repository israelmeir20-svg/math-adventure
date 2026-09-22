/**
 * Single-species eye-anchor zoom.
 *
 * The 8-up contact sheet is too small to judge a face by, so this renders ONE
 * species large, with a fine percentage grid and the eye markers. Pass the
 * species as argv[2].
 *
 * Run: npx vite build --config tools/vite.night-eye.config.ts
 *      node node_modules/.tmp/night-eye-probe/probe.mjs cat
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { ANIMAL_EYE_OFFSETS } from '../src/components/farm/night/nightStageData';
import { NIGHT_SPRITES } from '../src/components/farm/night/nightSprites';
import type { NightAnimal } from '../src/components/farm/night/nightTypes';

const animal = (process.argv[2] ?? 'duck') as NightAnimal;
const SIZE = 520;

function gridLines() {
  const lines = [];
  for (let p = 0; p <= 100; p += 5) {
    const major = p % 20 === 0;
    lines.push(
      <line key={`v${p}`} x1={(p / 100) * SIZE} y1={0} x2={(p / 100) * SIZE} y2={SIZE}
        stroke={major ? '#4fc3f7' : '#2a3a44'} strokeWidth={major ? 1.5 : 0.7} />,
      <line key={`h${p}`} x1={0} y1={(p / 100) * SIZE} x2={SIZE} y2={(p / 100) * SIZE}
        stroke={major ? '#4fc3f7' : '#2a3a44'} strokeWidth={major ? 1.5 : 0.7} />,
    );
  }
  return lines;
}

function labels() {
  const out = [];
  for (let p = 0; p <= 100; p += 20) {
    out.push(
      <text key={`lx${p}`} x={(p / 100) * SIZE + 3} y={16} fontSize={15} fill="#4fc3f7">
        {p}
      </text>,
      <text key={`ly${p}`} x={3} y={(p / 100) * SIZE + 18} fontSize={15} fill="#4fc3f7">
        {p}
      </text>,
    );
  }
  return out;
}

const offsets = ANIMAL_EYE_OFFSETS[animal]!;

const svg = (
  <svg viewBox={`0 0 ${SIZE + 40} ${SIZE + 40}`} width={SIZE + 40} height={SIZE + 40} xmlns="http://www.w3.org/2000/svg">
    <rect x={0} y={0} width={SIZE + 40} height={SIZE + 40} fill="#0b0913" />
    <g transform="translate(20 20)">
      <rect x={0} y={0} width={SIZE} height={SIZE} fill="#241d38" />
      <image
        href={NIGHT_SPRITES[animal]}
        x={0}
        y={0}
        width={SIZE}
        height={SIZE}
        preserveAspectRatio="xMidYBottom meet"
      />
      {gridLines()}
      {labels()}
      {(['left', 'right'] as const).map((side) => {
        const [xPct, yPct] = offsets[side];
        const x = (xPct / 100) * SIZE;
        const y = (yPct / 100) * SIZE;
        return (
          <g key={side}>
            <circle cx={x} cy={y} r={13} fill="#fff176" />
            <path d={`M${x - 34},${y} H${x + 34} M${x},${y - 34} V${y + 34}`} stroke="#ff1744" strokeWidth={2.5} />
          </g>
        );
      })}
      <text x={8} y={SIZE - 10} fontSize={22} fill="#ffd54f" fontWeight={800}>
        {`${animal}  L=${offsets.left[0]},${offsets.left[1]}  R=${offsets.right[0]},${offsets.right[1]}`}
      </text>
    </g>
  </svg>
);

const markup = renderToStaticMarkup(svg);
mkdirSync('tools/out', { recursive: true });
const out = `tools/out/eye-${animal}.svg`;
writeFileSync(out, `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`);
console.log(`wrote ${out}`);
