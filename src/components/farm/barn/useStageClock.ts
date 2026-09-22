/**
 * A deterministic animation clock driven by `requestAnimationFrame`.
 *
 * WHY THIS EXISTS. The stage previously moved animals with SVG SMIL
 * (`<animateTransform>`). SMIL runs on the DOCUMENT timeline, not on mount
 * time: an `<animate>` element that appears seconds after page load is measured
 * against elapsed document time, so a wave mounted late is treated as already
 * expired and `fill="freeze"` slams the animal straight to its end coordinate.
 * Exiting animals teleported off-screen in a single frame.
 *
 * This hook replaces that with an explicit clock that starts at zero when the
 * wave starts, so every animal's position is a pure function of "how long has
 * this wave been running" - identical on the first round and the tenth.
 *
 * Returns milliseconds elapsed since the clock started, re-rendering on every
 * animation frame. When `running` is false the clock reports its final elapsed
 * value, so actors hold their last position instead of snapping back.
 */
import { useEffect, useState } from 'react';

/**
 * @param running  Whether the clock should keep advancing.
 * @param epoch    Any value that changes when the wave restarts. A new epoch
 *                 resets the clock to zero.
 * @param totalMs  How long the wave lasts. Once the clock passes this, it stops
 *                 re-rendering: every actor is parked at its destination, so
 *                 further frames would be wasted work.
 */
export function useStageClock(running: boolean, epoch: string, totalMs: number): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;

    let frame = 0;
    let stopped = false;
    const startedAt = performance.now();

    const tick = (now: number) => {
      if (stopped) return;
      const next = now - startedAt;
      setElapsed(next);
      // Everything is parked once the wave is over; stop burning frames.
      if (next >= totalMs) {
        stopped = true;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, [running, epoch, totalMs]);

  return running ? elapsed : totalMs;
}
