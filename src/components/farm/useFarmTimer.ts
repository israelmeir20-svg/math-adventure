/**
 * Shared arcade engine for every farm station.
 *
 * Owns the optional 15-second speed-run countdown, the correct-answer counter,
 * the medal result and the cookie payout. A mistake never touches the clock or
 * the score: the station just shakes and offers the next attempt.
 *
 * Persisted best medals are passed in (and reported back) by the hub, so this
 * hook stays free of storage concerns.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { playTone } from '../math/audioTone';
import {
  medalForScore,
  RUN_SECONDS,
} from './farmTimerData';
import type { FarmMedal } from './farmTimerData';

export interface FarmTimer {
  /** True once a timed run has started and not yet ended. */
  running: boolean;
  /**
   * True while the countdown is deliberately held, even though the run is live.
   *
   * EXPOSED FOR DISPLAY ONLY, AND IT EXISTS BECAUSE A FROZEN CLOCK LOOKS BROKEN.
   * Stations that freeze the clock during an animation - the barn holds it for the whole
   * herd walk-in, which can be over half a fifteen-second run - would otherwise show a
   * counter that simply stops moving, with nothing on screen to say why. A child (or a
   * parent) reads that as a bug. The HUD uses this to mark the readout as paused rather
   * than stalled.
   *
   * It is a read of the existing `paused` axis, not a new one: `pause`/`resume` already
   * own the state, and this only names it for consumers. Nothing else should branch on it -
   * the timing rule itself stays in the interval effect.
   */
  paused: boolean;
  /** Whole seconds left in the run. */
  secondsLeft: number;
  /** Correct answers so far this run. */
  correct: number;
  /** Total attempts this run (correct + gentle misses). */
  attempts: number;
  /** Set once the countdown hits zero; null while playing. */
  medal: FarmMedal | null;
  /** Begin/resume the timed run (no-op while already running). */
  start: () => void;
  /** Count a correct answer. */
  score: () => void;
  /** Register a gentle miss - never affects time or score. */
  miss: () => void;
  /**
   * Freeze the countdown without ending the run. Used while an answer's
   * feedback animation plays, so watching the animals eat does not cost the
   * child time they should be spending on arithmetic.
   */
  pause: () => void;
  /** Resume a paused countdown. */
  resume: () => void;
  /** End the run early and settle on the current medal. */
  finish: () => void;
  /** Rewind to a fresh, idle run. */
  reset: () => void;
  /** Swallow no errors: true when the run is over and the card should show. */
  settled: boolean;
}

/**
 * @param onReward Called exactly once per finished run with the medal earned.
 */
export function useFarmTimer(
  onReward: (medal: FarmMedal) => void,
  /**
   * The run's length in seconds.
   *
   * DEFAULTS TO THE SHARED `RUN_SECONDS` SO NO EXISTING CALLER CHANGES. A station whose
   * pacing differs from the farm's default passes its own value - the barn is the only one
   * that does today, at ten seconds - which keeps the shared constant as the single source
   * of the default without forcing every station onto it.
   *
   * IT IS READ ONCE PER RUN, NOT LIVE. The value seeds the initial state and is re-read by
   * `start` and `reset`; changing the prop mid-run would not retroactively shorten a
   * countdown already in flight, which is the behaviour you want - a duration that shifted
   * under a running clock would make the medal unreproducible.
   */
  durationSeconds: number = RUN_SECONDS,
): FarmTimer {
  /** The duration this run was started with, so `start`/`reset` cannot disagree. */
  const durationRef = useRef(durationSeconds);
  useEffect(() => {
    durationRef.current = durationSeconds;
  }, [durationSeconds]);

  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [medal, setMedal] = useState<FarmMedal | null>(null);

  // Pausing is a distinct axis from running: a paused run is still live (the
  // medal is unsettled, the child can still answer) - it simply is not losing
  // seconds. Keeping it separate is what lets `pause` be a pure freeze.
  const [paused, setPaused] = useState(false);

  // The reward callback is mirrored into a ref by an effect (never during
  // render) so `settle` can stay stable and the interval effect never restarts.
  const rewardRef = useRef(onReward);
  const correctRef = useRef(0);
  const rewardedRef = useRef(false);

  useEffect(() => {
    rewardRef.current = onReward;
  }, [onReward]);

  const settle = useCallback((finalCorrect: number) => {
    setRunning(false);
    const earned = medalForScore(finalCorrect);
    setMedal(earned);
    if (!rewardedRef.current) {
      rewardedRef.current = true;
      rewardRef.current(earned);
    }
  }, []);

  // One interval for the whole run. It ticks the clock and settles the run in
  // the same callback when the time runs out, so nothing reacts from an effect.
  // The countdown value is mirrored in a ref so the ticker itself stays a pure
  // side-effect writer rather than mutating other state from inside an updater.
  //
  // `paused` is in the dependency list rather than checked inside the callback,
  // so pausing actually CLEARS the interval. Skipping ticks inside a live
  // interval would drift: the pending tick still fires on its original schedule
  // and the second it was mid-way through would still come off the clock.
  const secondsRef = useRef(durationSeconds);
  useEffect(() => {
    if (!running || paused) return;
    const id = window.setInterval(() => {
      if (secondsRef.current <= 1) {
        secondsRef.current = 0;
        setSecondsLeft(0);
        window.clearInterval(id);
        settle(correctRef.current);
        return;
      }
      secondsRef.current -= 1;
      setSecondsLeft(secondsRef.current);
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, paused, settle]);;

  const start = useCallback(() => {
    rewardedRef.current = false;
    correctRef.current = 0;
    // Read from the ref, so a station that changes its duration prop still starts each run
    // from its own current length rather than a value captured at the first render.
    secondsRef.current = durationRef.current;
    setCorrect(0);
    setAttempts(0);
    setMedal(null);
    setSecondsLeft(durationRef.current);
    setPaused(false);
    setRunning(true);
    playTone('pop');
  }, []);

  const score = useCallback(() => {
    correctRef.current += 1;
    setCorrect(correctRef.current);
    setAttempts((value) => value + 1);
    playTone('success');
  }, []);

  const miss = useCallback(() => {
    setAttempts((value) => value + 1);
    playTone('gentle');
  }, []);

  const finish = useCallback(() => {
    if (running) settle(correctRef.current);
  }, [running, settle]);

  // Both are guarded so they are idempotent: `pause` while paused, or `resume`
  // while live, must not churn state and re-render the board mid-animation.
  const pause = useCallback(() => {
    setPaused((wasPaused) => (wasPaused ? wasPaused : true));
  }, []);

  const resume = useCallback(() => {
    setPaused((wasPaused) => (wasPaused ? false : wasPaused));
  }, []);

  const reset = useCallback(() => {
    rewardedRef.current = false;
    correctRef.current = 0;
    secondsRef.current = durationRef.current;
    setRunning(false);
    setPaused(false);
    setSecondsLeft(durationRef.current);
    setCorrect(0);
    setAttempts(0);
    setMedal(null);
  }, []);

  return useMemo(
    () => ({
      running,
      paused,
      secondsLeft,
      correct,
      attempts,
      medal,
      settled: medal !== null,
      start,
      score,
      miss,
      pause,
      resume,
      finish,
      reset,
    }),
    [
      running,
      paused,
      secondsLeft,
      correct,
      attempts,
      medal,
      start,
      score,
      miss,
      pause,
      resume,
      finish,
      reset,
    ],
  );
}

export { RUN_SECONDS, medalForScore };
export type { FarmMedal };
export { bestMedal } from './farmTimerData';
export type { FarmMedalId } from './farmTimerData';
