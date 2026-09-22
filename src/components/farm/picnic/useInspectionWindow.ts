/**
 * The inspection window: how long the crate stays open, and when the lid shuts.
 *
 * WHY THIS IS ITS OWN HOOK. The rule "the child is not charged time for looking"
 * is the single load-bearing decision in this game, and it is implemented in two
 * halves that must agree: this hook owns the open window, and `useFrozenClock`
 * owns the countdown. Keeping them in separate, single-purpose modules makes it
 * obvious that one opens a window while the other holds the clock still.
 *
 * THE TIMER IS KEYED ON THE ROUND, so a new round gets a fresh window and a stale
 * timeout from the previous round can never shut a crate the child has not seen.
 * The cleanup clears it on every round change and on unmount.
 */
import { useEffect } from 'react';

/**
 * @param phase The round's current phase. The window runs only while INSPECTING.
 * @param roundNumber Re-arms the window for each new crate.
 * @param inspectMs How long the child gets to look.
 * @param onElapsed Called when the window closes - the caller shuts the lid.
 */
export function useInspectionWindow(
  phase: string,
  roundNumber: number,
  inspectMs: number,
  onElapsed: () => void,
): void {
  useEffect(() => {
    // Only an open crate runs a countdown. Once the lid is shut the window is over,
    // and once the round is answered there is nothing left to look at.
    if (phase !== 'INSPECTING') return undefined;

    const timer = window.setTimeout(onElapsed, inspectMs);
    return () => window.clearTimeout(timer);
    // `onElapsed` is deliberately not a dependency: it is a stable setter from the
    // round hook, and including it would restart the window on any parent render -
    // which would silently extend the child's look every time the clock ticked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, roundNumber, inspectMs]);
}
