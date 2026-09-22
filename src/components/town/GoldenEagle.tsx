/**
 * The golden eagle - the rarest event on the town map.
 *
 * It glides diagonally across the upper third of the map, is clickable while it is up there,
 * and pays out a one-time secret bonus if the child catches it. Follows `HotAirBalloon`: the
 * wrapper is `pointer-events-none` and `overflow-hidden` so the map stays fully clickable and
 * the bird cannot widen the shrink-wrapping stage, and ONLY the bird re-enables pointer events.
 *
 * ============================================================================
 * WHY THE WRAPPER IS NONE AND THE BIRD IS AUTO
 * ============================================================================
 *
 * The flight crosses the entire map width. A wrapper with pointer events would therefore be a
 * full-width invisible sheet over the sky, and while the sky has no tiles in it, the wrapper's
 * box is the full height of the stage - so it would also cover every building below. Hitboxing
 * the bird alone means the only clickable thing here is the eagle itself, which is what makes
 * it feel like touching a real object.
 *
 * ============================================================================
 * WHY THE TARGET IS PADDED BEYOND THE BIRD
 * ============================================================================
 *
 * The art is ~56px wide and moves at roughly 100px per second. A click that is two pixels off
 * on a moving target is a miss, and a child who aimed correctly and missed by a hair would
 * read that as the game being broken rather than as their own timing. So the button carries
 * `padding` that extends its hit area a little past the visible bird - generous enough to
 * forgive a near-miss on a moving target, small enough that it never steals a click from a
 * building under the flight path.
 *
 * ============================================================================
 * WHY THE DIRECTION IS A SCALE, NOT A SECOND ASSET
 * ============================================================================
 *
 * `scaleX(-1)` mirrors the bird rather than needing art that faces the other way, and it is
 * applied on an INNER element so it composes with the outer glide's `translate` + `rotate`
 * instead of overwriting them. A single element cannot carry both without one clobbering the
 * other's `transform`.
 */
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { EagleEvent } from './useEagleEvent';
import eagleImg from '../../assets/eagle.webp';

interface GoldenEagleProps {
  phase: EagleEvent['phase'];
  flight: EagleEvent['flight'];
  onCatch: () => void;
}

/** The reward's six feathers, fanned out from the catch point. */
const FEATHERS: { x: string; y: string; delayMs: number }[] = [
  { x: '-46px', y: '-28px', delayMs: 0 },
  { x: '42px', y: '-34px', delayMs: 40 },
  { x: '-58px', y: '10px', delayMs: 80 },
  { x: '54px', y: '6px', delayMs: 20 },
  { x: '-24px', y: '-52px', delayMs: 60 },
  { x: '26px', y: '40px', delayMs: 100 },
];

/** How long the reward toast stays up. Matches `eagleToast` in `index.css`. */
const TOAST_MS = 3400;

export default function GoldenEagle({ phase, flight, onCatch }: GoldenEagleProps) {
  /*
   * THE STAGE WIDTH IS MEASURED, NOT ASSUMED.
   *
   * The glide's travel has to be an absolute length (see the keyframe's comment in `index.css`),
   * so the distance the bird covers is the width of the map it is flying over. That width is
   * responsive - the stage is `min-w-[640px] max-w-[1400px]` - so it cannot be a constant, and
   * a hardcoded value would either fall short on a wide window (leaving the eagle stranded
   * mid-map) or overshoot on a narrow one.
   *
   * The layer is the stage's own `inset-0` child, so measuring IT measures the map exactly. The
   * read happens in an effect - after layout - and is skipped entirely while the eagle is
   * hidden, so no measurement work happens on the 99.9% of renders where there is no flight.
   */
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [stageWidth, setStageWidth] = useState(0);

  useEffect(() => {
    if (phase !== 'flying') return;
    const measure = () => setStageWidth(layerRef.current?.offsetWidth ?? 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [phase]);

  if (phase === 'hidden') return null;

  /*
   * The travel distance, in pixels. `startEdge` puts the bird just OUTSIDE one side, so it has
   * to cover a full stage width plus its own box (the two `6%` insets) before it clears the far
   * edge. The fallback keeps a flight visible for the single frame between the phase flipping to
   * `flying` and the effect's measurement landing - without it the bird would sit motionless at
   * the edge for one frame before starting.
   */
  const travelPx = flight
    ? (stageWidth || 900) * 1.12
    : 0;

  const style = flight
    ? ({
        top: `${flight.y}%`,
        '--eagle-x': `${flight.rightToLeft ? -travelPx : travelPx}px`,
        animationName: 'eagleGlide',
        animationDuration: `${flight.durationMs}ms`,
        animationTimingFunction: 'ease-in-out',
        animationFillMode: 'both',
      } as CSSProperties & Record<string, string | number>)
    : undefined;

  /*
   * STARTING EDGE. The bird is placed at the side it flies FROM, so the glide carries it across
   * the stage. `-6%` / `94%` rather than 0 / 100 puts the bird just outside the frame at rest,
   * so it enters and exits off the edge instead of appearing on it.
   */
  const startEdge = flight
    ? { [flight.rightToLeft ? 'right' : 'left']: flight.rightToLeft ? '-6%' : '6%' }
    : undefined;

  return (
    <>
      <div
        ref={layerRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
      >
        {flight && (
          <div className="absolute" style={{ ...startEdge, ...style }}>
            {/*
              THE OUTER BUTTON GLIDES; THE INNER IMAGE FLAPS AND MIRRORS. Three nested elements
              because three independent `transform`s are needed - glide, flap, and mirror - and
              a single element can only carry one without the others being clobbered.
            */}
            <button
              type="button"
              onClick={onCatch}
              disabled={phase !== 'flying'}
              aria-label="נשר מלכותי - תפסו אותו!"
              title="תפסו את הנשר המלכותי!"
              className={`pointer-events-auto relative block cursor-pointer select-none border-0 bg-transparent p-3 outline-none ${
                phase === 'caught'
                  ? 'motion-safe:animate-[eagleCaught_1.1s_ease-out_both]'
                  : ''
              }`}
              style={
                phase === 'leaving'
                  ? {
                      /*
                       * ACCELERATED EXIT. The eagle speeds off and fades, so a missed bird leaves
                       * rather than blinking out of existence.
                       *
                       * ONLY `opacity` AND `filter` ARE TRANSITIONED - NOT `transform`. The glide
                       * animation is holding the bird at its final translate, and setting a
                       * `transform` here would OVERWRITE that and teleport the eagle back to the
                       * side it started from, which is precisely the bug this comment exists to
                       * prevent. A blurred, fading bird reads as "leaving quickly" without
                       * touching the position the animation owns.
                       */
                      opacity: 0,
                      filter: 'blur(3px)',
                      transition: 'opacity 2s ease-in, filter 2s ease-in',
                    }
                  : undefined
              }
            >
              {/*
                THE MIRROR IS APPLIED ON LEFT-TO-RIGHT FLIGHTS, NOT RIGHT-TO-LEFT ONES.

                `eagle.webp` FACES LEFT AS STORED - beak and head on the left of the frame. The
                original version of this line assumed the opposite (`scaleX(-1)` when
                `rightToLeft`), which mirrored a left-facing bird into a right-facing one on
                every leftward flight - so it flew tail-first in BOTH directions. The mirror and
                the assumed base orientation have to agree, and only one of the two was written
                down, which is exactly how the error survived review.

                So: a RIGHTWARD flight (`rightToLeft === false`) is the one that needs the flip,
                and a leftward flight is left alone because the bird already points that way.
              */}
              <span
                className="block animate-[eagleFlap_1.5s_ease-in-out_infinite] motion-reduce:animate-none"
                style={flight && !flight.rightToLeft ? { transform: 'scaleX(-1)' } : undefined}
              >
                <img
                  src={eagleImg}
                  alt=""
                  draggable={false}
                  /* `w-14 md:w-16` is the brief's 56px, kept deliberately small: the eagle has
                     to read as a bird passing overhead, not as another tap target competing with
                     the buildings. */
                  className="h-auto w-14 select-none object-contain drop-shadow-md md:w-16"
                />
              </span>
            </button>
          </div>
        )}

        {/* THE CATCH. A ring and six feathers, both anchored to the bird's last position so the
            burst happens where the child actually clicked. */}
        {phase === 'caught' && flight && (
          <div className="absolute" style={startEdge}>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-amber-300 animate-[catchRing_1s_ease-out_both] motion-reduce:animate-none" />
              {FEATHERS.map((feather, index) => (
                <span
                  key={index}
                  className="absolute left-1/2 top-1/2 h-3 w-1.5 rounded-full bg-amber-300 animate-[featherPuff_1.1s_ease-out_both] motion-reduce:animate-none"
                  style={
                    {
                      '--puff-x': feather.x,
                      '--puff-y': feather.y,
                      animationDelay: `${feather.delayMs}ms`,
                    } as CSSProperties & Record<string, string>
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/*
        THE TOAST LIVES OUTSIDE THE `overflow-hidden` LAYER. The sky box clips its contents, and a
        toast anchored near the top of the map would be cut off at the stage's own edge - so it is
        a sibling, positioned against the stage directly.
      */}
      {phase === 'caught' && (
        <div
          key={TOAST_MS}
          role="status"
          className="pointer-events-none absolute inset-x-0 top-2 z-50 flex justify-center"
        >
          <p className="rounded-2xl bg-gradient-to-b from-amber-200 to-amber-400 px-4 py-2 text-sm font-black text-amber-950 shadow-xl ring-2 ring-amber-100 animate-[eagleToast_3.4s_ease-in-out_both] motion-reduce:animate-none sm:text-base">
            תפסתם את הנשר המלכותי! ﬩10 🍪
          </p>
        </div>
      )}
    </>
  );
}
