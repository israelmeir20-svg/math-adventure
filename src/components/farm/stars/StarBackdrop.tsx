/**
 * The deep-space backdrop for "משחק הכוכבים".
 *
 * THE SPECKS ARE DELIBERATELY NOT STARS TO COUNT. They are small, dim and only partially
 * opaque, while a constellation vertex is a large bright four-pointed sparkle joined to its
 * neighbours by a gold line. The distinction has to be obvious at a glance, because a child
 * who counts a background speck is not making a careless mistake - they are answering the
 * question they were actually asked, and the round becomes unfair.
 *
 * Their positions are a FIXED FORMULA rather than random draws, so the sky does not reshuffle
 * every time the stage remounts. A round remounts on every answer, and a backdrop that
 * re-scattered each time would read as the whole scene flickering.
 *
 * The dots are placed in a grid cell each and then nudged by the formula's own drift, which
 * spreads them evenly - a pure `random()` scatter tends to clump, leaving obvious empty patches
 * and a few pairs close enough to look like a deliberate group.
 */
import { BACKDROP_STARS, VIEW_H, VIEW_W } from './starData';

/** A stable scatter: even coverage, no clumping, identical on every render. */
const SPECKS = Array.from({ length: BACKDROP_STARS }, (_, i) => {
  // A stride co-prime with the grid width visits every cell before repeating.
  const col = i % 5;
  const row = Math.floor(i / 5);
  const jitterX = ((i * 37) % 61) / 61;
  const jitterY = ((i * 53) % 67) / 67;
  return {
    x: +((col + jitterX) * (VIEW_W / 5)).toFixed(1),
    y: +((row + jitterY) * (VIEW_H / 5)).toFixed(1),
    // A gentle spread of radii and opacities, so the sky has depth rather than looking printed.
    r: +(0.9 + ((i * 17) % 7) / 10).toFixed(2),
    opacity: +(0.2 + ((i * 29) % 31) / 100).toFixed(2),
  };
});

export default function StarBackdrop() {
  return (
    <g>
      <defs>
        <linearGradient id="star-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050814" />
          <stop offset="100%" stopColor="#0d1733" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#star-sky)" />

      {SPECKS.map((speck, i) => (
        <circle
          key={`speck-${i}`}
          cx={speck.x}
          cy={speck.y}
          r={speck.r}
          // Cyan and white mixed, so the sky is not one flat colour of dust.
          fill={i % 3 === 0 ? '#a5f3fc' : '#ffffff'}
          opacity={speck.opacity}
        />
      ))}
    </g>
  );
}
