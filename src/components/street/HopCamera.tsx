/**
 * The hopscotch camera.
 *
 * The board is a bottom-to-top column: step 1 sits at the *bottom* of the
 * track and the finish line at the top. The track's own origin is its top edge,
 * so step 1's screen position is roughly `boardHeight` - which means the track
 * must be pushed UP (a negative translateY) for the player's square to sit
 * inside the window.
 *
 * The pan is therefore computed as the negative of how far the active square's
 * baseline sits from where we want it, and clamped so the first square rests at
 * the bottom edge and the last square cannot be dragged past the top.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface HopCameraProps {
  /** Index of the square the player is standing on. */
  step: number;
  /** Total squares on the board. */
  total: number;
  children: ReactNode;
}

export default function HopCamera({ step, total, children }: HopCameraProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [shift, setShift] = useState<number | null>(null);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    // The pan is an inline transition, so the global reduced-motion rule
    // cannot reach it - it has to be disabled explicitly.
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setInstant(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const windowH = track.parentElement?.clientHeight ?? 0;
      const squares = Array.from(track.children) as HTMLElement[];
      if (windowH === 0 || squares.length === 0) return;

      // Measure the real square rather than dividing the track evenly: gaps and
      // varying content height make `board / total` drift over eight rows.
      const active = squares[Math.min(step, squares.length - 1)]!;
      const board = track.scrollHeight;

      // Distance from the track's top edge down to the active square's bottom.
      const baseline = active.offsetTop + active.offsetHeight;

      // Park that baseline exactly on the window's bottom edge. The track's own
      // `pb-3` is what lifts the square off the edge - subtracting a separate
      // FOOTING here as well double-counted the gap and stranded step 1 above
      // the bottom with the clamp fighting it.
      const wanted = windowH - baseline;

      // `min` stops the track rising so far that its bottom edge leaves the
      // window; 0 stops the top edge dropping below the window's top.
      // `pt-[42%]` guarantees both bounds are satisfiable for every step.
      const min = Math.min(windowH - board, 0);
      setShift(Math.min(Math.max(wanted, min), 0));
    };

    measure();
    // Web fonts can reflow the choices after first paint, so measure again.
    const raf = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [step, total]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        ref={trackRef}
        className="flex w-full flex-col-reverse items-center gap-3 px-3 pb-3 pt-[42%] will-change-transform"
        style={{
          transform: `translate3d(0, ${shift ?? 0}px, 0)`,
          // Until the first measurement lands, sit still rather than animate
          // in from an arbitrary offset.
          visibility: shift === null ? 'hidden' : undefined,
          transition: instant
            ? 'none'
            : 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
