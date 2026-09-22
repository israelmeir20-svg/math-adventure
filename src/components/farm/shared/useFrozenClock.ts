/**
 * Freezes the farm speed-run clock while an answer's feedback animation plays.
 *
 * WHY THIS IS ITS OWN HOOK: the rule "the child is not charged time for watching
 * the animals eat" is a single, load-bearing decision, and burying it inside the
 * game component made that component long enough to be hard to read. Isolated
 * here it is one sentence of intent.
 *
 * THE CALLBACKS ARE HELD IN A REF, AND THAT IS THE POINT. `useFarmTimer` builds
 * `pause`/`resume` inside a `useMemo` that depends on `secondsLeft`, so their
 * identities are NEW ON EVERY TICK. If they were effect dependencies, the effect
 * would re-run every tick and fire its `resume` cleanup - un-pausing the clock
 * nine times during a 2200ms explanation. Reading them through a ref keeps the
 * effect keyed on the ONE thing that actually matters: whether we are resolving.
 *
 * THE FREEZE IS ALWAYS RELEASED. The cleanup only exists while frozen, so React
 * runs it exactly once per freeze - when the explanation ends, when the run is
 * torn down, or on unmount. And the un-frozen branch calls `resume()`
 * unconditionally, which additionally heals any state where a pause outlived its
 * freeze (a finished run, a remount, a fresh game).
 */
import { useEffect, useRef } from 'react';

export function useFrozenClock(
  isResolving: boolean,
  pause: () => void,
  resume: () => void,
): void {
  // Latest callbacks, so the effect does not depend on their identities.
  const latest = useRef({ pause, resume });
  useEffect(() => {
    latest.current = { pause, resume };
  });

  useEffect(() => {
    if (!isResolving) {
      // Not resolving: make sure the clock is running. This also heals any state
      // where a pause outlived its freeze.
      latest.current.resume();
      return undefined;
    }
    latest.current.pause();
    // Only the END of the freeze resumes. An unconditional cleanup would fire on
    // every dependency change, including a mere callback-identity change.
    return () => latest.current.resume();
  }, [isResolving]);
}
