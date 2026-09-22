/**
 * The resolve-and-advance sequence for "מאזניים בחווה".
 *
 * Kept in its own hook so the game component stays a thin layout shell, and so
 * the timeout lifecycle (celebrate -> swap) has exactly one owner.
 *
 * The sequence:
 *
 *   1. the puzzle balances, so `isResolving` flips true in that same commit -
 *      there is no window where a further tap could land;
 *   2. the game chimes and holds the level beam for SOLVED_HOLD_MS;
 *   3. the next puzzle is dealt and the lock releases.
 *
 * `isResolving` is DERIVED (solved AND not yet dealt) rather than stored, which
 * removes a setState-in-effect cascade and keeps the lock airtight.
 *
 * The pending timeout lives in a ref so it can be cancelled on unmount or when
 * the clock expires - a queued advance must never write state after the run is over.
 *
 * ===================================================================
 * WHY THE CELEBRATION AND THE ADVANCE ARE SPLIT ACROSS TWO EFFECTS.
 * ===================================================================
 *
 * `celebrate` is a separate `useEffect` keyed on `isResolving` from the one that owns
 * the timeout. That is deliberate: the timeout effect must stay keyed ONLY on
 * `isResolving` so a re-render mid-hold cannot restart the clock, but the chime should
 * fire on the rising edge and nothing else. Bundling them would mean either the chime
 * re-firing on unrelated renders or the hold restarting whenever the callback identity
 * changed - both of which are audible.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { SOLVED_HOLD_MS } from './scaleStageData';

interface UseResolveAdvanceOptions {
  /** The left pan's total, re-checked numerically before the lock may engage. */
  leftWeight: number;
  /** The right pan's total, re-checked numerically before the lock may engage. */
  rightWeight: number;
  /** True while the timed run is live. */
  running: boolean;
  /** True once the run is over and the medal card is showing. */
  settled: boolean;
  /** 1-based number of the puzzle currently on the board. */
  roundNumber: number;
  /** Generates and installs a puzzle; returns its target weight. */
  deal: (round: number) => { target: number };
  /** Called once per solved puzzle, before the swap. */
  onSolved: () => void;
}

export interface ResolveAdvance {
  /** True from the moment a puzzle is solved until the next one is dealt. */
  isResolving: boolean;
  /**
   * True only on the commit in which a puzzle was JUST solved.
   *
   * Distinct from `isResolving` on purpose. `isResolving` stays true for the whole
   * 1.5-second hold, so keying the chime or the particle burst on it would re-fire them
   * on every render that happens to land inside the hold. This flips true for a single
   * render, which is what makes the celebration fire exactly once.
   *
   * It is true on the same commit `isResolving` becomes true, so the sound starts with
   * the beam's arrival rather than a frame later.
   */
  justSolved: boolean;
  /** Cancels a queued advance and releases the lock. */
  cancel: () => void;
}

export function useResolveAdvance({
  leftWeight,
  rightWeight,
  running,
  settled,
  roundNumber,
  deal,
  onSolved,
}: UseResolveAdvanceOptions): ResolveAdvance {
  /**
   * `isResolving` is DERIVED, not stored: the lock is exactly "a solved puzzle
   * is on the board and its advance has not been dealt yet". Deriving it avoids
   * a setState-in-effect cascade, and it becomes true in the same commit that
   * the puzzle is solved - so the shelf is disabled immediately, with no
   * one-frame window where a second tap could land.
   */
  const lockRef = useRef(false);
  const timeoutRef = useRef<number | undefined>(undefined);
  const [unlockedRound, setUnlockedRound] = useState(roundNumber);

  /*
   * THE BALANCE TEST IS MADE EXPLICIT AND NUMERIC HERE.
   *
   * `balanced` arrives from the round hook as `leftWeight === rightWeight`, which is
   * already a numeric comparison of two `sumWeight` results. Re-asserting it as
   * `Number(a) === Number(b) && a > 0` guards against the one case the plain equality
   * cannot distinguish: a board where BOTH pans are empty. `0 === 0` is true, so an empty
   * tray would read as "solved" the instant it was dealt - the lock would engage before
   * the child touched anything, the advance would fire, the next puzzle would also start
   * empty, and the game would appear to be stuck in a loop of instant non-advances.
   *
   * That is the most plausible mechanism for the "some questions do not advance" report,
   * and requiring a positive weight closes it.
   */
  const numericallyBalanced = Number.isFinite(leftWeight) && Number.isFinite(rightWeight)
    ? Number(leftWeight) === Number(rightWeight) && Number(leftWeight) > 0
    : false;

  const isResolving = numericallyBalanced && unlockedRound === roundNumber && running && !settled;

  /**
   * The rising edge of `isResolving`, as render-visible state.
   *
   * `lockRef` already tracks this for the timeout's benefit, but a ref cannot drive a
   * render and therefore cannot drive a sound or an animation. This mirrors the same
   * edge into state so the celebration has something to key on.
   */
  const [justSolved, setJustSolved] = useState(false);

  // Mirrors the latest inputs so the timeout body reads current values without
  // making the effect depend on them (which would restart the hold). Written in
  // an effect, never during render.
  const latest = useRef({ roundNumber, deal, onSolved });
  useEffect(() => {
    latest.current.roundNumber = roundNumber;
    latest.current.deal = deal;
    latest.current.onSolved = onSolved;
  }, [roundNumber, deal, onSolved]);

  const cancel = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    setUnlockedRound(latest.current.roundNumber);
  }, []);

  useEffect(() => {
    if (!isResolving || lockRef.current) return;

    // Take the lock and score BEFORE scheduling, so a re-entrant render during
    // the hold cannot start a second celebration.
    lockRef.current = true;
    setJustSolved(true);
    /*
     * `onSolved` is called inside a try/catch, and the RELEASE below is in a `finally`.
     *
     * The lock is the one piece of state that, if left set, freezes the game permanently:
     * `isResolving` stays true, the shelf stays disabled, and no further puzzle can ever
     * be dealt. It is set here and released in two other places (the timeout body and
     * `cancel`), so any path that skips the release strands the board for the rest of the
     * run - which is exactly the "some questions get stuck" symptom.
     *
     * A throwing score callback is the realistic way in: it would propagate out of the
     * effect, React would tear down the tree, and the pending timeout would be cleared by
     * the cleanup without ever releasing the lock. A `finally` guarantees the lock is
     * cleared on every path, including the exceptional one. The error is still re-thrown
     * so it is not silently swallowed.
     */
    try {
      latest.current.onSolved();
    } catch (error) {
      lockRef.current = false;
      setJustSolved(false);
      setUnlockedRound(latest.current.roundNumber);
      throw error;
    }

    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = undefined;
      const nextRoundIndex = latest.current.roundNumber + 1;
      /*
       * The deal and the lock release share a try/finally for the same reason: if
       * `deal` throws, the board must not be left locked. Releasing the round number is
       * what re-arms the derived lock, and it happens whether or not the deal succeeded -
       * so a failed deal leaves a playable (if stale) board rather than a frozen one.
       */
      try {
        latest.current.deal(nextRoundIndex);
      } finally {
        lockRef.current = false;
        setJustSolved(false);
        // Marking the new round as unlocked also re-arms the derived lock.
        setUnlockedRound(nextRoundIndex);
      }
    }, SOLVED_HOLD_MS);

    return () => {
      if (timeoutRef.current !== undefined) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
      /*
       * THE CLEANUP RELEASES THE LOCK TOO.
       *
       * This effect's cleanup runs on unmount and whenever `isResolving` flips, which
       * covers the case where the timeout was cancelled before it could fire - the clock
       * hitting zero mid-hold, or the component being torn down. Without this, a cancelled
       * timeout was indistinguishable from a fired one as far as the lock was concerned,
       * and the board stayed locked with no pending advance to release it.
       */
      lockRef.current = false;
    };
  }, [isResolving]);

  // A finished run must never let a queued advance fire.
  useEffect(() => {
    if (settled) {
      cancel();
      setJustSolved(false);
    }
  }, [settled, cancel]);

  /*
   * A SAFETY RESET ON EVERY NEW ROUND.
   *
   * Whenever the puzzle on the board changes, the lock is force-cleared. This is the
   * belt-and-braces half of the fix above: the try/finally blocks guarantee the lock is
   * released on the normal and exceptional paths, and this guarantees it even if some
   * future code path sets the lock and never releases it.
   *
   * It is deliberately keyed on `roundNumber` alone for that reason - it must run when
   * the board turns over regardless of why, and it must not depend on any of the values
   * that could themselves be stale.
   *
   * `setUnlockedRound` is idempotent here, so the common case of a round that was already
   * unlocked costs one no-op state update.
   */
  useEffect(() => {
    lockRef.current = false;
    setJustSolved(false);
    setUnlockedRound(roundNumber);
  }, [roundNumber]);

  // Unmount safety.
  useEffect(() => cancel, [cancel]);

  return { isResolving, justSolved, cancel };
}
