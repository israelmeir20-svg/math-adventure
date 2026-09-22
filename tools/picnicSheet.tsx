/**
 * Renders the picnic stage to a static HTML page for visual inspection.
 *
 * The generator and the clock are both covered by automated checks, but whether the
 * fruit actually sits centred in its compartments, whether the tilt at higher tiers
 * spills outside the cells, and whether the lid really covers everything are all
 * things only a picture can answer. This draws several rounds - one per tier, in both
 * the open and covered states - so they can be compared side by side.
 *
 * Run: npx tsx tools/picnicSheet.tsx
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync, mkdirSync } from 'node:fs';
import PicnicGridStage from '../src/components/farm/picnic/PicnicGridStage';
import { buildPicnicRound } from '../src/components/farm/picnic/picnicGenerator';
import { picnicFruitInfo } from '../src/components/farm/picnic/picnicFruits';

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
  shut: boolean;
  showCounts: boolean;
  correct: boolean;
}

const SHOTS: Shot[] = [
  // The intro tier: a sparse floor, upright, two piles far apart.
  { label: 'L1 open (2 piles, huge gap)', round: 1, shut: false, showCounts: false, correct: false },
  // The same basket with the lid down - the state the child answers from.
  { label: 'L1 covered (the question)', round: 1, shut: true, showCounts: false, correct: false },
  // Feedback on a RIGHT answer: lid up, counts shown, winner green.
  { label: 'L1 reveal - correct', round: 1, shut: false, showCounts: true, correct: true },
  // A 3-species tier.
  { label: 'L2 open (3 piles)', round: 3, shut: false, showCounts: false, correct: false },
  // The tighter tier: more of the floor filled, narrower gap.
  { label: 'L3 open (3 piles, tighter)', round: 5, shut: false, showCounts: false, correct: false },
  // A WRONG pick, so the red badge can be checked against the green winner.
  { label: 'L3 reveal - wrong pick', round: 5, shut: false, showCounts: true, correct: false },
  // The densest tier: all sixteen slots, three species, tightest gap.
  { label: 'L4 open (all 16 slots)', round: 8, shut: false, showCounts: false, correct: false },
  { label: 'L4 covered', round: 8, shut: true, showCounts: false, correct: false },
];

const cards = SHOTS.map((shot, i) => {
  const round = buildPicnicRound(shot.round, seeded(1000 + i * 37));
  // A correct reveal marks the real answer. A wrong reveal marks some OTHER fruit that is
  // actually in the basket, so the red badge is guaranteed to land on a real pile - a
  // hard-coded species might not be in this round's crate at all.
  const wrongPick = round.choices.find((f) => f !== round.answer) ?? null;
  const picked = shot.showCounts
    ? shot.correct
      ? round.answer
      : wrongPick
    : null;
  const markup = renderToStaticMarkup(
    <PicnicGridStage
      round={round}
      shut={shot.shut}
      showCounts={shot.showCounts}
      picked={picked}
      correct={shot.correct}
    />,
  );
  const counts = round.piles
    .map((p) => `${picnicFruitInfo(p.fruit).emoji}${p.count}`)
    .join('  ');
  return `
  <figure>
    <figcaption>
      <strong>${shot.label}</strong><br/>
      <span class="meta">${round.rows}x${round.cols} &middot; ask=${round.question} &middot; answer=${picnicFruitInfo(round.answer).emoji} &middot; ${counts}</span>
    </figcaption>
    <div class="stage">${markup}</div>
  </figure>`;
}).join('\n');

const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>סל הפיקניק - contact sheet</title>
<style>
  body { margin:0; padding:20px; background:#1c1917; color:#fef3c7;
         font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  h1 { font-size:20px; margin:0 0 4px; }
  p.sub { margin:0 0 18px; font-size:13px; color:#a8a29e; }
  .grid { display:grid; grid-template-columns:repeat(2, minmax(360px, 1fr)); gap:18px; }
  figure { margin:0; background:#292524; border:1px solid #44403c; border-radius:12px; overflow:hidden; }
  figcaption { padding:8px 10px; font-size:13px; border-bottom:1px solid #44403c; }
  .meta { font-size:11px; color:#a8a29e; }
  .stage svg { display:block; width:100%; height:auto; }
</style>
</head>
<body>
  <h1>סל הפיקניק 🧺 - stage contact sheet</h1>
  <p class="sub">One crate per tier, in the open and covered states, plus the reveal with counts.</p>
  <div class="grid">${cards}</div>
</body>
</html>`;

mkdirSync('dist', { recursive: true });
writeFileSync('dist/picnic-sheet.html', html);
console.log('wrote dist/picnic-sheet.html');
for (const shot of SHOTS) {
  const r = buildPicnicRound(shot.round, () => 0.5);
  console.log(`  ${shot.label}: ${r.rows}x${r.cols}, ${r.piles.length} piles, ask=${r.question}`);
}
