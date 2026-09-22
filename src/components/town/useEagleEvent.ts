/**
 * Drives the golden eagle's rare flight across the town map.
 *
 * The eagle is the rarest thing in the game on purpose: it is a story a child tells
 * someone else ("I caught the eagle!"), and an event that turns up often is not a story.
 * So there are two independent doors into it, and BOTH are deliberately narrow:
 *
 *   1. A LONG AMBIENT TIMER (30-40 minutes, re-rolled after every visit). This is the
 *      "you happened to be looking at the sky" path. At 30-40 minutes it is genuinely
 *      possible to play a whole session and never see it, which is the intent.
 *
 *   2. A PER-STREAK ROLL (15% on each fresh streak of 4). This is the "it rewarded me
 *      for doing well" path. A 15% roll is what makes it feel earned-but-surprising
 *      rather than scheduled.
 *
 * ============================================================================
 * WHY THE ROLL IS TAKEN ON THE TRANSITION, NOT ON THE CURRENT VALUE
 * ============================================================================
 *
 * The streak arrives as a NUMBER that grows (3 -> 4 -> 5 ...), and the naive check is
 * `if (streak >= 4) maybeSpawn()`. That fires on EVERY render while the streak sits at 4
 * or above - and because the streak also persists across sessions, a child returning with
 * a streak of 4 would be re-rolled on every single map visit until the eagle finally
 * appeared. The 15% would become "certain within a few visits", which is exactly the
 * rarity this feature is trying to protect.
 *
 * So the hook watches for a CROSSING: it fires only when the streak passes a multiple of
 * `STREAK_INTERVAL` that it has not already credited. `creditedUpTo` records the highest
 * milestone paid out, so a streak of 12 pays out at 4, 8 and 12 rather than once, and a
 * streak that drops back to 0 and climbs again pays out once more - which is correct,
 * because that is genuinely a second accomplishment.
 *
 * The ambient timer needs the same care for the same reason: it is re-armed only after a
 * visit finishes, so a long session cannot accumulate overlapping eagles.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/** The eagle's flight states. `flying` is the only one the player can act on. */
export type EaglePhase = 'hidden' | 'flying' | 'caught' | 'leaving';

/** Correct answers in a row between eagle rolls. */
export const STREAK_INTERVAL = 4;
/** Chance of the eagle appearing on any one fresh streak milestone. */
export const STREAK_CHANCE = 0.15;

/**
 * The ambient window. Re-rolled uniformly inside it after every flight, so the eagle
 * never arrives on a predictable beat - a fixed 30 minutes would eventually be noticed
 * and waited for.
 */
const AMBIENT_MIN_MS = 30 * 60 * 1000;
const AMBIENT_MAX_MS = 40 * 60 * 1000;

/** How long the caught celebration plays before the eagle is whisked away. */
const CAUGHT_MS = 1100;
/** How long the ordinary exit takes. */
const LEAVING_MS = 2200;

/** Where along the map's sky the eagle flies. Percentages of the stage box. */
export interface EagleFlight {
  /** Starting Y, in percent - the upper third only. */
  y: number;
  /** Travels right-to-left or left-to-right, so repeat sightings are not identical. */
  rightToLeft: boolean;
  /** Total crossing time in ms; the CSS animation is given the same value. */
  durationMs: number;
  /** Seconds of drift already elapsed on the clock, so the flight is not in lockstep. */
  delayMs: number;
}

export interface EagleEvent {
  phase: EaglePhase;
  /** The current flight, or null while hidden. */
  flight: EagleFlight | null;
  /** The reward picked up, or null if the eagle has not been caught this session. */
  reward: { cookies: number } | null;
  /** Called by the layer when the player clicks the eagle in time. */
  onCatch: () => void;
}

/**
 * Rolls the flight path for one visit.
 *
 * `y` is confined to the upper third because the flight has to read as "in the sky". Lower
 * than about 30% and it crosses the buildings, where it would be read as a bird flying
 * behind the town rather than over it - and, worse, would pass under the header pins the
 * child is aiming at.
 */
function rollFlight(): EagleFlight {
  const y = 6 + Math.random() * 18; // 6% - 24% of the stage height
  const rightToLeft = Math.random() < 0.5;
  const durationMs = 14000 + Math.round(Math.random() * 4000); // 14-18s
  return { y, rightToLeft, durationMs, delayMs: 0 };
}

export function useEagleEvent(consecutiveCorrect: number, onReward: () => void): EagleEvent {
  const [phase, setPhase] = useState<EaglePhase>('hidden');
  const [flight, setFlight] = useState<EagleFlight | null>(null);
  const [reward, setReward] = useState<{ cookies: number } | null>(null);

  /** Highest streak milestone already rolled for, so a milestone pays out once. */
  const creditedUpTo = useRef(0);
  const timers = useRef<number[]>([]);
  /** Read inside timers without making them depend on the phase. */
  const phaseRef = useRef<EaglePhase>('hidden');
  phaseRef.current = phase;

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  /** Sends the eagle across. Ignored unless the sky is currently empty. */
  const launch = useCallback(() => {
    if (phaseRef.current !== 'hidden') return;
    setFlight(rollFlight());
    setPhase('flying');
  }, []);

  /** The reward path - only ever called from `onCatch`. */
  const onCatch = useCallback(() => {
    if (phaseRef.current !== 'flying') return;
    clearTimers();
    setPhase('caught');
    // The cookies are granted HERE rather than in the layer's click handler so the reward
    // and the phase move together: there is no window in which the toast is shown without
    // the cookies having been added, or vice versa.
    onReward();
    setReward({ cookies: 10 });
    schedule(() => setPhase('leaving'), CAUGHT_MS);
  }, [clearTimers, onReward, schedule]);

  // The flight ends on its own if the player never touches it.
  useEffect(() => {
    if (phase !== 'flying' || !flight) return;
    const id = window.setTimeout(() => setPhase('leaving'), flight.durationMs);
    return () => window.clearTimeout(id);
  }, [phase, flight]);

  // `leaving` always finishes by clearing the sky. `caught` does NOT end here - it hands
  // off to `leaving` via the timer in `onCatch` first, so the celebration is not cut short.
  useEffect(() => {
    if (phase !== 'leaving') return;
    const id = window.setTimeout(() => {
      setPhase('hidden');
      setFlight(null);
    }, LEAVING_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  // The toast outlives the eagle by design, so the child can still read it once the bird
  // is gone; it is cleared when the next flight begins rather than here.
  useEffect(() => {
    if (phase === 'flying') setReward(null);
  }, [phase]);

  // The ambient timer. Re-armed whenever the sky empties, so visits cannot stack up and
  // the 30-40 minutes is measured from the END of the last flight rather than in parallel
  // with it.
  useEffect(() => {
    if (phase !== 'hidden') return;
    const wait = AMBIENT_MIN_MS + Math.random() * (AMBIENT_MAX_MS - AMBIENT_MIN_MS);
    const id = window.setTimeout(() => setPhase((current) => (current === 'hidden' ? 'flying' : current)), wait);
    return () => window.clearTimeout(id);
  }, [phase]);

  // Every entry into `flying` gets a fresh path. Keying this off the phase rather than
  // rolling inside the setters keeps the two ambient entry points (this timer and the
  // streak roll) from having to duplicate the roll.
  useEffect(() => {
    if (phase === 'flying' && flight === null) setFlight(rollFlight());
  }, [phase, flight]);

  // The per-streak roll, taken on the CROSSING only - see the file header.
  useEffect(() => {
    if (consecutiveCorrect < STREAK_INTERVAL) return;
    const milestone = Math.floor(consecutiveCorrect / STREAK_INTERVAL) * STREAK_INTERVAL;
    if (milestone <= creditedUpTo.current) return;
    // Credit the milestone whether or not the roll succeeds, so a streak of 4 is rolled
    // for exactly once. Leaving it uncredited would let the next correct answer re-roll,
    // and 15% per answer across a long streak is a certainty rather than a rarity.
    creditedUpTo.current = milestone;
    if (Math.random() < STREAK_CHANCE) launch();
  }, [consecutiveCorrect, launch]);

  useEffect(() => clearTimers, [clearTimers]);

  return { phase, flight, reward, onCatch };
}
