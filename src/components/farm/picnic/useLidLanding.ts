/**
 * Tracks whether the lid has finished travelling.
 *
 * WHY THIS IS NOT JUST `covered`. `covered` flips true the instant the cloth starts
 * to drop, but the cloth takes `LID_MS` to reach the crate and the fruit stays
 * legible the whole way down. If the countdown resumed on `covered`, the child would
 * be charged 300ms of their 60 seconds on EVERY round for watching a piece of cloth
 * fall - a slow, invisible tax that adds up to about ten seconds over a full run.
 *
 * So the clock waits for the lid to LAND, not merely to be dispatched.
 *
 * THE RESET IS DERIVED, NOT SET. Storing "which round has landed" and comparing it
 * to the current round means a new crate is automatically treated as still falling -
 * no clearing inside an effect, and no stale `true` leaking into the next round.
 */
import { useEffect, useState } from 'react';

/**
 * @param covered True once the cloth is on its way down.
 * @param roundNumber Re-arms the travel timer for each new crate.
 * @param travelMs How long the cloth takes to reach the crate.
 */
export function useLidLanding(covered: boolean, roundNumber: number, travelMs: number): boolean {
  // The round whose lid has finished travelling, or null. Because the CURRENT round
  // is compared against it, a new round reads as "not landed" for free.
  const [landedRound, setLandedRound] = useState<number | null>(null);

  useEffect(() => {
    if (!covered) return undefined;
    const timer = window.setTimeout(() => setLandedRound(roundNumber), travelMs);
    return () => window.clearTimeout(timer);
  }, [covered, roundNumber, travelMs]);

  return landedRound === roundNumber;
}

