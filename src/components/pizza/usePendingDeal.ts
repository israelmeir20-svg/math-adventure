/**
 * The delayed hand-off between one pizza and the next.
 *
 * Kept apart from the run's state so the timing rules sit in one place and can be
 * read without wading through the placement logic.
 *
 * NOTHING IS DEALT ONCE THE CLOCK HAS STOPPED. The guard is checked INSIDE the
 * timeout through a ref, not by cancelling the timeout from an effect. The clock
 * can hit zero in the same frame as the final bake, and a cancelled-by-effect
 * timeout still leaves a window where the last pizza of the run pulls a fresh order
 * in behind the medal card. Reading the ref at firing time closes it.
 *
 * The ref is also why `running` is not a dependency of the caller's callback: the
 * hand-off does not need rebuilding on every tick.
 */
import { useCallback, useEffect, useRef } from 'react';

/** How long the finished pizza slides out before the next order arrives. */
export const OUT_MS = 250;
/** How long a ruined pizza shakes before the next order arrives. */
export const SHAKE_MS = 600;

interface UsePendingDealOptions {
  /** True while the 60-second run is live. */
  running: boolean;
  /** True once the run has settled and the medal card is up. */
  settled: boolean;
}

export interface PendingDeal {
  /** Run `deal` after `delayMs`, unless the clock has stopped by then. */
  schedule: (deal: () => void, delayMs: number) => void;
  /** Drop anything scheduled - used on restart and on unmount. */
  clear: () => void;
}

export function usePendingDeal({ running, settled }: UsePendingDealOptions): PendingDeal {
  const timeoutRef = useRef<number | undefined>(undefined);
  const aliveRef = useRef(running);
  aliveRef.current = running;

  const clear = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const schedule = useCallback(
    (deal: () => void, delayMs: number) => {
      clear();
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = undefined;
        if (aliveRef.current) deal();
      }, delayMs);
    },
    [clear],
  );

  // Unmount safety, and no hand-off once the run has settled.
  useEffect(() => clear, [clear]);
  useEffect(() => {
    if (settled) clear();
  }, [settled, clear]);

  return { schedule, clear };
}
