/**
 * The star burst that fires when a puzzle balances.
 *
 * ===================================================================
 * WHY THIS IS HAND-ROLLED RATHER THAN A CONFETTI LIBRARY.
 * ===================================================================
 *
 * The project already depends on `canvas-confetti`, but that library paints onto a
 * full-viewport `<canvas>`. That is the right tool for a run-complete celebration, and
 * the medal cards use it. It is the wrong tool here: this burst has to appear INSIDE
 * the scale's scene, anchored to the pivot, so it reads as the balance itself throwing
 * sparks rather than as a page-level effect that happens to be on screen at the same
 * time.
 *
 * It is also fired every few seconds for the whole run, unlike a run-complete effect,
 * so it must be cheap: a fixed set of CSS-animated spans costs one style recalculation
 * and no canvas work at all.
 *
 * ===================================================================
 * THE GEOMETRY IS FIXED; ONLY THE PHASE IS RANDOM.
 * ===================================================================
 *
 * The particles are laid out on evenly-spaced angles, which guarantees an even ring
 * rather than the clumps a uniform random angle produces. Each one then gets a random
 * delay, duration and distance, so the ring does not read as a rigid mechanical
 * starburst.
 *
 * Randomising at render time is safe here because the whole burst is remounted (via a
 * `key`) once per solve, so the values are sampled exactly once and then held for the
 * animation's lifetime. Sitting on a re-rendered component they would jitter.
 */
import { useMemo } from 'react';
import { PIVOT_X_PCT, PIVOT_Y_PCT } from './scaleStageData';

interface BalanceBurstProps {
  /** True while the burst should be mounted. */
  active: boolean;
  /** How many stars to throw. */
  count?: number;
}

export default function BalanceBurst({ active, count = 12 }: BalanceBurstProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        // Evenly spaced around the ring, then jittered a little so it is not a clock face.
        const baseAngle = (index / count) * 360;
        const angle = baseAngle + (Math.random() * 24 - 12);
        const distance = 46 + Math.random() * 34;
        const radians = (angle * Math.PI) / 180;
        return {
          id: index,
          // The translate is what throws the star outward; it is composed into the
          // keyframe's own transform so the two never fight.
          dx: `${Math.cos(radians) * distance}px`,
          dy: `${Math.sin(radians) * distance}px`,
          delay: `${Math.random() * 90}ms`,
          duration: `${520 + Math.random() * 260}ms`,
          size: 10 + Math.round(Math.random() * 8),
          // Two tints so the ring has some variety without breaking the palette.
          tint: index % 3 === 0 ? 'text-amber-200' : 'text-yellow-300',
        };
      }),
    [count],
  );

  if (!active) return null;

  return (
    <div
      /*
       * `pointer-events-none` is essential: the burst sits over the pivot, and the right
       * pan's animals are clickable targets nearby. Without it, the particles would
       * swallow taps during the 1.5-second hold for any animal that happened to be under
       * one.
       *
       * The position is read from the SAME constants the scale uses, never hardcoded.
       * A literal here would silently drift the burst off the beam the first time the
       * pivot moved - and the pivot is solved rather than chosen, so it does move.
       */
      className="pointer-events-none absolute z-50"
      aria-hidden
      style={{ left: `${PIVOT_X_PCT}%`, top: `${PIVOT_Y_PCT}%` }}
    >
      {particles.map((particle) => (
        <span
          key={particle.id}
          className={`absolute select-none font-black leading-none ${particle.tint}`}
          style={
            {
              fontSize: `${particle.size}px`,
              // Custom properties are consumed by the `starBurst` keyframe, which is why
              // the throw distance can be per-particle without a style tag per element.
              '--burst-x': particle.dx,
              '--burst-y': particle.dy,
              animation: `starBurst ${particle.duration} ${particle.delay} ease-out forwards`,
              textShadow: '0 0 6px rgba(253,224,71,0.9)',
            } as React.CSSProperties
          }
        >
          ✦
        </span>
      ))}
    </div>
  );
}
