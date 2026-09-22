/**
 * Ambient cloud shadows sweeping across the town map.
 *
 * These are not clouds. They are the SHADOWS clouds cast - large, soft patches of darkness that
 * travel diagonally across the terrain and briefly dim whatever they pass over. The intent is that
 * a child never sees a "cloud" here; they notice only that the light on the rooftops keeps changing.
 *
 * ============================================================================
 * THE PREVIOUS VERSION NEVER ACTUALLY CROSSED THE MAP, AND THAT WAS THREE BUGS
 * ============================================================================
 *
 * The brief reported that the shadows did not move across the map surface. They did not, and the
 * cause was not one mistake but three compounding ones - each individually survivable, fatal together.
 *
 * 1. THE BLOBS STARTED JUST OFF THE LEFT EDGE. `left: -18%` on a 544px blob puts its right edge at
 *    only ~+292px - so it began barely clipping the left edge of the map rather than entering from
 *    outside it.
 *
 * 2. THE KEYFRAME STARTED AT `translate3d(-x)` - it moved each blob FURTHER LEFT before drifting
 *    right. So for the first half of every cycle the shadow was travelling AWAY from the village.
 *    Combined with (1), the second blob's low point put its right edge ~478px off the left edge:
 *    fully invisible, and receding.
 *
 * 3. THE TRAVEL WAS IN `vw`, BUT THE STAGE IS CAPPED AT 1400px. `55vw` on a 1600px viewport is 880px
 *    of travel for a blob that needs to cross 1400px - so even the "correct" half of the cycle only
 *    carried it about halfway over the map, and the amount it fell short grew as the monitor widened.
 *
 * The fix for all three is to stop describing the motion relative to the blob or the viewport and
 * describe it relative to THE MAP: measure the stage, start each shadow fully outside one edge, and
 * end it fully outside the opposite edge. Then a crossing is a crossing at any window size.
 *
 * ============================================================================
 * WHY IT SITS ABOVE THE BUILDINGS RATHER THAN BELOW THEM
 * ============================================================================
 *
 * A shadow that only darkens the ground is a stain on the artwork; the effect only reads as a shadow
 * if it falls on the ROOFS AND WALLS TOO. So the layer paints over the buildings, at `z-30` - above
 * the town's own overlays and below the events (the balloon and eagle at `z-40`), because weather
 * should never dim a rare reward.
 *
 * That ordering is also why there is no `mix-blend-mode`. Multiply blending would combine with the
 * artwork more convincingly, but it forces the browser to rasterise everything beneath it on every
 * frame of a permanently-running animation - precisely the cost `translate3d` exists to avoid.
 *
 * ============================================================================
 * WHY 2-3 BLOBS AND NOT MORE
 * ============================================================================
 *
 * Three is the most that stays subtle: a fourth overlaps the others often enough that the map reads
 * as patchy rather than as drifting weather. Each has its own duration, delay and diagonal, and the
 * durations share no common factor, so the layer does not visibly loop.
 *
 * THE DELAYS ARE NEGATIVE ON PURPOSE. With positive delays the map is unshadowed for the first
 * minute and the shadows then arrive in sequence; negative delays start each animation partway
 * through, so shadows are already spread across the terrain on the very first frame.
 */
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';

/** One sweeping shadow. */
interface Shadow {
  /** Size in rem - large, because a real cloud's shadow dwarfs a village. */
  width: number;
  height: number;
  /** Peak opacity of the dark fill. Kept low: this is weather, not a dimmer switch. */
  opacity: number;
  /** Blur radius in px. Very high, so no edge is ever discernible. */
  blur: number;
  /** Seconds for one full crossing. All differ; none share a factor. */
  durationSec: number;
  /** Negative = already partway through the crossing on the first frame. */
  delaySec: number;
  /**
   * The crossing, as multiples of the STAGE's width and height.
   *
   * `startX` is measured in stage widths from the left edge, and is deliberately NEGATIVE and large
   * enough to put the blob entirely outside the map; `endX` is positive and large enough to put it
   * outside the opposite edge.
   *
   * THE START HAS TO CLEAR THE BLOB'S OWN WIDTH, WHICH IS WHY THE FRACTIONS ARE NOT UNIFORM. The
   * offset is a fraction of the STAGE while the blob is a fixed pixel size, so a start of `-0.55`
   * places a 544px blob's right edge at +192px on a 640px stage - partially on-screen, so the shadow
   * pops into view mid-map instead of sliding in from outside. The values below subtract enough for
   * the widest blob to start fully clear at the narrowest stage (640px).
   */
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const SHADOWS: Shadow[] = [
  {
    width: 34,
    height: 20,
    opacity: 0.15,
    blur: 110,
    durationSec: 60,
    delaySec: -12,
    startX: -1.25,
    startY: -0.1,
    endX: 1.45,
    endY: 1.05,
  },
  {
    width: 44,
    height: 26,
    opacity: 0.12,
    blur: 130,
    durationSec: 80,
    delaySec: -50,
    startX: -1.55,
    startY: 0.15,
    endX: 1.5,
    endY: 0.95,
  },
  {
    width: 26,
    height: 16,
    opacity: 0.13,
    blur: 90,
    durationSec: 50,
    delaySec: -30,
    startX: -1.1,
    startY: -0.15,
    endX: 1.4,
    endY: 1.1,
  },
];

export default function CloudShadows() {
  /*
   * THE STAGE IS MEASURED, BECAUSE THE CROSSING HAS TO BE EXPRESSED IN MAP UNITS.
   *
   * A percentage inside `translate()` resolves against the element's OWN box - a 44rem blob would
   * travel 44rem, not "one and a half maps" - and `vw` tracks the VIEWPORT, which stops matching the
   * map as soon as the window is wider than the stage's 1400px cap. So the travel is computed in
   * pixels from the measured stage, and the CSS variables carry plain lengths.
   *
   * The layer is the stage's own `inset-0` child, so measuring it measures the map exactly.
   */
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const measure = () => {
      const el = layerRef.current;
      if (!el) return;
      setStage({ width: el.offsetWidth, height: el.offsetHeight });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  /*
   * The fallback keeps the shadows animating for the frame or two before the effect's first
   * measurement lands. Without it the travel would be `0px` and every blob would sit still at its
   * starting position until the resize listener happened to fire.
   */
  const stageW = stage.width || 1200;
  const stageH = stage.height || 800;

  return (
    /*
     * `pointer-events-none` IS THE ENTIRE SAFETY CONTRACT FOR THIS LAYER.
     *
     * It spans the full stage at `z-30`, which puts it over every building hitbox and every coin
     * pin. Without this rule it would be an invisible sheet swallowing every map tap - and because
     * the blobs are so diffuse, nothing about the screen would suggest why. `aria-hidden` follows
     * for the same reason: there is nothing here to announce.
     *
     * `overflow-hidden` keeps a blob from widening the shrink-wrapping stage box as it crosses. The
     * stage is `inline-block`, so a blob escaping sideways would make the map scrollable and shift
     * the layout - a bug that would only appear a minute into a session, once a blob had travelled
     * past the edge.
     */
    <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {SHADOWS.map((shadow, index) => {
        /*
         * The travel, in pixels, from one fully-off-map position to the other. `translate3d` receives
         * these directly, so the keyframe needs no unit conversion at all.
         */
        const style = {
          top: '0px',
          left: '0px',
          width: `${shadow.width}rem`,
          height: `${shadow.height}rem`,
          opacity: shadow.opacity,
          filter: `blur(${shadow.blur}px)`,
          backgroundColor: '#0f172a',
          borderRadius: '100%',
          '--shadow-from-x': `${(shadow.startX * stageW).toFixed(0)}px`,
          '--shadow-from-y': `${(shadow.startY * stageH).toFixed(0)}px`,
          '--shadow-to-x': `${(shadow.endX * stageW).toFixed(0)}px`,
          '--shadow-to-y': `${(shadow.endY * stageH).toFixed(0)}px`,
          animationName: 'cloudShadowSweep',
          animationDuration: `${shadow.durationSec}s`,
          animationDelay: `${shadow.delaySec}s`,
          /*
           * `linear` is deliberate: an eased crossing would visibly accelerate through the middle of
           * the map and linger at the edges, which is the one thing a drifting shadow never does. The
           * organic feel comes from the differing durations and diagonals, not the timing function.
           */
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
          /*
           * PROMOTE THE BLOB TO ITS OWN COMPOSITED LAYER.
           *
           * `translate3d` in the keyframe already promotes it, but `will-change` states the intent up
           * front so the promotion happens on mount rather than on the first animated frame - avoiding
           * one repaint of a 130px-blurred box right as the map appears. It also survives anyone later
           * "simplifying" the keyframe back to a 2D `translate`, which would quietly move this work
           * back onto the main thread.
           */
          willChange: 'transform',
        } as CSSProperties & Record<string, string | number>;

        return <span key={index} className="absolute block" style={style} />;
      })}
    </div>
  );
}
