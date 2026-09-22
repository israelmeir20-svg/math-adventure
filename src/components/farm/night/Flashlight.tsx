/**
 * The flashlight: a blackout with a circular hole cut out of it.
 *
 * ZERO REACT STATE ON POINTER MOVEMENT. This is the performance rule of the
 * station, and it is why the beam is not a `useState({x, y})`. A state write per
 * `pointermove` fires 60-120 renders a second, and every one of them reconciles
 * the whole barn - dozens of `<image>` and `<circle>` elements - which is what
 * makes a torch feel like it is dragging through treacle.
 *
 * Instead the pointer handler writes the `d` ATTRIBUTE on two DOM nodes that
 * React never re-renders. The component is `memo`-ed and takes no changing props
 * (except the flood flag), so reconciliation is skipped entirely and the browser
 * repaints the beam. The result is a beam that tracks the pointer exactly.
 *
 * The hole is made with `fillRule="evenodd"`: an outer rectangle wound one way
 * and an inner circle wound the other subtract, leaving a hole. One path, one
 * paint, no masking, no canvas.
 *
 * THE FILL IS FULLY OPAQUE. At any transparency the animal bodies bleed through
 * and the barn is merely dim, which defeats the whole station: outside the beam
 * nothing may be visible at all. The eyes are drawn ABOVE this layer by the
 * stage, so they shine through the blackout while the bodies do not.
 */
import { memo, useEffect, useRef } from 'react';
import {
  BEAM_FLOOD_MS,
  BEAM_FLOOD_R,
  BEAM_R,
  BEAM_START,
  DARK_COLOR,
  DARK_OPACITY,
  VIEW_H,
  VIEW_W,
} from './nightStageData';

interface FlashlightProps {
  /** The SVG element, so the parent can map client coords into viewBox coords. */
  svgRef: React.RefObject<SVGSVGElement | null>;
  /** True once the round is answered - the beam then floods the whole barn. */
  flood: boolean;
}

/** The donut path: outer rect, inner circle, subtracted by the even-odd rule. */
function beamPath(x: number, y: number, r: number): string {
  return `M0,0 H${VIEW_W} V${VIEW_H} H0 Z M ${x},${y} m -${r},0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`;
}

/** Just the rim circle, as its own path, so only the edge is stroked. */
function ringPath(x: number, y: number, r: number): string {
  return `M ${x - r},${y} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`;
}

function Flashlight({ svgRef, flood }: FlashlightProps) {
  const darkRef = useRef<SVGPathElement>(null);
  const ringRef = useRef<SVGPathElement>(null);
  // The beam's own position, so the flood can re-cut the hole at the last place
  // the child pointed rather than snapping back to the centre of the stage.
  const posRef = useRef({ ...BEAM_START });

  /** Repaints both paths at a given radius. No state, no re-render. */
  function paint(x: number, y: number, r: number) {
    darkRef.current?.setAttribute('d', beamPath(x, y, r));
    ringRef.current?.setAttribute('d', ringPath(x, y, r));
  }

  // Move the beam by rewriting the paths' `d`. No state, no re-render.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const move = (event: PointerEvent) => {
      const box = svg.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      // Map the pointer from screen space into the 800x360 viewBox.
      const x = ((event.clientX - box.left) / box.width) * VIEW_W;
      const y = ((event.clientY - box.top) / box.height) * VIEW_H;
      posRef.current = { x, y };
      paint(x, y, BEAM_R);
    };

    // Listening on the window (not the SVG) means the beam keeps tracking even
    // when the pointer outruns the element, without capture or a state flag.
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [svgRef]);

  /**
   * On a correct answer the hole swells to swallow the whole stage.
   *
   * The `d` ATTRIBUTE CANNOT BE CSS-TRANSITIONED, so the swell is driven here by
   * requestAnimationFrame: a short eased ramp of the radius, written straight to
   * the path. Only ~33 frames, all outside React, so it costs nothing.
   */
  useEffect(() => {
    if (!flood) return;
    const { x, y } = posRef.current;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / BEAM_FLOOD_MS);
      // Ease-out cubic, so the light rushes out then settles.
      const eased = 1 - (1 - t) ** 3;
      paint(x, y, BEAM_R + (BEAM_FLOOD_R - BEAM_R) * eased);
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [flood]);

  return (
    <g
      style={{ transition: `opacity ${BEAM_FLOOD_MS}ms ease-out` }}
      // A sliver of residual darkness keeps the flood reading as "the torch swept
      // the room" rather than as a hard cut to daylight.
      opacity={flood ? 0.06 : 1}
      pointerEvents="none"
    >
      <path
        ref={darkRef}
        d={beamPath(BEAM_START.x, BEAM_START.y, BEAM_R)}
        fill={DARK_COLOR}
        fillOpacity={DARK_OPACITY}
        fillRule="evenodd"
      />
      {/* The glow ring around the beam edge. */}
      <path
        ref={ringRef}
        d={ringPath(BEAM_START.x, BEAM_START.y, BEAM_R)}
        fill="none"
        stroke="#ffd54f"
        strokeWidth={4}
        opacity={flood ? 0 : 0.6}
        style={{ transition: `opacity ${BEAM_FLOOD_MS}ms ease-out` }}
      />
    </g>
  );
}

export default memo(Flashlight);
