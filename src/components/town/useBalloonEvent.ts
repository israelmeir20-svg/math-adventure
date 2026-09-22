/**
 * Drives the Bonus Island hot-air balloon's lifecycle.
 *
 * The balloon is a rare visitor, not a fixture: it descends on a slow schedule, sits on the meadow
 * for exactly one minute as a tap target, and then climbs away. The long gap between visits is the
 * point - a reward that is always available stops being a reward.
 *
 * ============================================================================
 * THE SCHEDULE, AND WHY IT CHANGED
 * ============================================================================
 *
 * The balloon used to arrive every 6 minutes, or after every 4 correct answers, and then wait up to
 * 90 seconds to be tapped. Measured end to end that meant it was on screen for a third of the time -
 * which is not a visit, it is a permanent resident that occasionally leaves. The brief's 10-minute
 * cooldown is what makes it an event.
 *
 * THE STREAK TRIGGER IS GONE. It was the other half of "lands constantly": four correct answers is
 * roughly a minute of play, so a child working steadily would summon the balloon far more often than
 * the timer ever could, and no cooldown would have survived it. Removing it leaves ONE schedule, so
 * the 10-minute promise is actually true rather than merely a lower bound.
 *
 * ============================================================================
 * WHY THE COOLDOWN IS ARMED FROM THE END OF THE VISIT, NOT THE START
 * ============================================================================
 *
 * The timer starts when the balloon finishes departing, so "once every 10 minutes" means ten quiet
 * minutes between sightings. Arming it at the START of the visit would instead give ten minutes from
 * the descent, which - once the 4.5s arrival and the 60s grounded window are subtracted - is really
 * an 8.5-minute gap. Arming at the end is the reading that matches what the child experiences.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type BalloonPhase = 'hidden' | 'landing' | 'landed' | 'departing';

/**
 * The gap between visits: 10 minutes of quiet, measured from the moment the balloon has gone.
 *
 * A REF, NOT A CONSTANT DELAY, so the schedule survives a re-render and cannot be shortened by one.
 * The remaining time is recomputed from a stored timestamp on every arm, which also means a child
 * who backgrounds the tab for an hour and comes back does not have to sit through a fresh 10 minutes
 * - the elapsed wall-clock time counts, because it is read from `Date.now()`.
 */
const COOLDOWN_MS = 10 * 60 * 1000;

/**
 * How long the balloon sits on the meadow, fully interactive. EXACTLY 60 seconds, per the brief.
 */
const GROUNDED_MS = 60 * 1000;

/**
 * Descent length. Mirrors `balloonDescend` in `index.css` - keep the two in step, or the balloon
 * will start its idle float before it has finished floating down.
 */
const LANDING_MS = 4500;
/** Climb-out length. Mirrors `balloonDepart` in `index.css`. */
const DEPARTING_MS = 2000;

interface BalloonEvent {
  phase: BalloonPhase;
  /** Present only while the balloon is on screen and tappable. */
  position: { x: number; y: number } | null;
  onOpen: () => void;
  onDismiss: () => void;
}

/** Meadows the balloon can settle into, so visits don't always look identical. */
const MEADOWS: { x: number; y: number }[] = [
  { x: 32, y: 36 },
  { x: 46, y: 30 },
  { x: 26, y: 58 },
  { x: 66, y: 34 },
];

export function useBalloonEvent(): BalloonEvent {
  const [phase, setPhase] = useState<BalloonPhase>('hidden');
  const [meadow, setMeadow] = useState(0);
  /**
   * When the next visit is due, as an epoch timestamp.
   *
   * Stored as a REF rather than in state because it is read inside timer callbacks and never
   * rendered - putting it in state would re-render the map every time it changed, for a value that
   * affects nothing on screen.
   */
  const nextVisitAt = useRef<number>(Date.now() + COOLDOWN_MS);
  const timers = useRef<number[]>([]);
  /**
   * The live phase, mirrored for the timer callbacks.
   *
   * The departure guard in `onOpen` needs to know the CURRENT phase, but a callback captured in a
   * timer would close over a stale one - which is how a balloon that had already begun climbing away
   * could still open the game.
   */
  const phaseRef = useRef<BalloonPhase>('hidden');
  phaseRef.current = phase;

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  /** Takes the balloon away, then arms the next visit once it is gone. */
  const depart = useCallback(() => {
    if (phaseRef.current === 'departing' || phaseRef.current === 'hidden') return;
    clearTimers();
    setPhase('departing');
    schedule(() => {
      setPhase('hidden');
      // Armed HERE, at the end of the visit, so the ten minutes is genuinely quiet time between
      // sightings rather than ten minutes measured from the start of the descent.
      nextVisitAt.current = Date.now() + COOLDOWN_MS;
    }, DEPARTING_MS);
  }, [clearTimers, schedule]);

  /*
   * The visit: descend, sit for a minute, climb away.
   *
   * WRITTEN AS ONE CHAINED SEQUENCE rather than three independent effects keyed on `phase`. Independent
   * effects have to agree on their durations, and a mismatch shows up as a visible stall or an early
   * cut - the exact class of bug that produced the original double-descent. Chaining makes the order
   * explicit and lets each leg start from the previous leg's callback.
   */
  const arrive = useCallback(() => {
    clearTimers();
    setMeadow((current) => (current + 1) % MEADOWS.length);
    setPhase('landing');
    schedule(() => {
      setPhase('landed');
      // The grounded window is exactly GROUNDED_MS, starting the moment the descent completes.
      schedule(() => depart(), GROUNDED_MS);
    }, LANDING_MS);
  }, [clearTimers, depart, schedule]);

  /*
   * THE SCHEDULE. A single timeout armed for whatever remains until `nextVisitAt`, re-armed after
   * every visit.
   *
   * IT RE-CHECKS THE CLOCK RATHER THAN TRUSTING THE DELAY. The effect is torn down and re-created
   * whenever the phase changes - which is three times per visit - so a naive `setTimeout(COOLDOWN_MS)`
   * would restart the full ten minutes on every one of those renders, and the balloon would never
   * arrive at all. Reading the remaining time from the stored timestamp makes the re-arming
   * idempotent: each run schedules only the time that is actually left.
   */
  useEffect(() => {
    if (phase !== 'hidden') return;
    const remaining = Math.max(0, nextVisitAt.current - Date.now());
    const id = window.setTimeout(() => {
      // Guarded on the live phase, so a visit that has already started cannot be started twice.
      if (phaseRef.current === 'hidden') arrive();
    }, remaining);
    return () => window.clearTimeout(id);
  }, [phase, arrive]);

  useEffect(() => clearTimers, [clearTimers]);

  const position = phase === 'landed' ? MEADOWS[meadow] ?? MEADOWS[0]! : null;

  return {
    phase,
    position,
    /*
     * A TAP DURING THE CLIMB-OUT IS IGNORED. The balloon is still on screen and still moving, so
     * opening the game would drop a modal over a departing animation - and the child would have
     * tapped a thing that was visibly leaving. `depart` itself re-checks the phase, so calling it
     * twice is harmless.
     */
    onOpen: () => {
      if (phaseRef.current !== 'landed') return;
      depart();
    },
    onDismiss: depart,
  };
}
