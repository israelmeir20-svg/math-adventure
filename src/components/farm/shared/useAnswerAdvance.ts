/**
 * The answered -> next-round handoff, shared by the farm's quiz stations.
 *
 * Both a correct and an incorrect tap hold the board for an outcome-specific
 * spell (see the caller's hold durations) so the child can see what happened,
 * then swap in the next puzzle. Only a correct answer scores, but the PAUSE is
 * the same either way - a miss must not feel like it skipped past, and a hit
 * must be allowed to land.
 *
    10| * THIS HOOK ALSO DRIVES THE CLOCK FREEZE. `isResolving` is true for exactly the
 * window in which the board is explaining the answer, and the caller pauses the
 * 60-second countdown for that whole window. Reading an explanation must not
 * cost the child time they should be spending on arithmetic.
 *
 * THE LOCK IS DERIVED, NOT STORED. A stored `isSubmitting` flag flips a render
 * later, leaving a one-frame window in which a fast double-tap scores twice.
 * Deriving it from "this round is answered and not yet dealt" makes it true in
 * the same commit as the tap.
 *
    20| * ADVANCE IS UNCONDITIONAL. The timeout ALWAYS deals the next round when it
 * fires - there is no early return based on `running` or `settled`. An earlier
 * version could schedule the timeout and then bail on a guard, leaving the board
 * locked on the answered round forever. The only thing that stops an advance is
 * `cancel`, which the caller invokes on a finished run.
 *
 * THE LOCK IS RELEASED BY ANY ROUND CHANGE, NOT ONLY A FORWARD ONE. This was the
 * replay freeze. The lock used to be released by recording the round number it
 * had unlocked (`unlockedRound`) and comparing it with the round on the board,
 * which assumed round numbers only ever climb. A replay deals round 1 again, so
 * after a run that ended on round 8 the comparison became `8 === 1` - false
 * forever - and `isResolving` could never go true again. The board did not hang
 * on a timeout or a stale interval: it hung because the condition that was
 * supposed to release the lock could no longer be satisfied by any input.
 *
 * The fix inverts the dependency. `dealsRef` counts how many rounds have been
 * dealt, and the lock is released whenever that count changes - in EITHER
 * direction, and including a rewind. A round generator is free to deal 1 again
 * without the handoff having to know that a restart happened.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAnswerAdvanceOptions {
  /** True once the child has tapped this round. */
  answered: boolean;
  /** True while the 60-second run is live. */
  running: boolean;
  /** True once the run is over and the medal card is showing. */
  settled: boolean;
  /** 1-based number of the round on the board. */
  roundNumber: number;
  /** Deals the next round. */
  deal: (round: number) => unknown;
  /** Called once per round, before the swap, when the answer was right. */
  onCorrect: () => void;
  /** Called once per round, before the swap, when the answer was wrong. */
  onWrong: () => void;
  /** Whether the current round's answer was right. */
  correct: boolean;
  /**
   * How long to hold the explanation before dealing the next round. Supplied per
   * outcome rather than fixed, so a wrong answer gets long enough to be read
   * while a correct one stays brisk.
   */
  holdMs: number;
}

export interface AnswerAdvance {
  /** True from the moment of the tap until the next round is dealt. */
  isResolving: boolean;
  /** Cancels a queued advance and releases the lock. */
  cancel: () => void;
}

export function useAnswerAdvance({
  answered,
  running,
  settled,
  roundNumber,
  deal,
  onCorrect,
  onWrong,
  correct,
  holdMs,
}: UseAnswerAdvanceOptions): AnswerAdvance {
  const timeoutRef = useRef<number | undefined>(undefined);
  const lockRef = useRef(false);

  /**
   * The round whose advance is still pending, or null when nothing is queued.
   *
   * IT MUST START AS A NON-MATCHING SENTINEL, NOT AS `roundNumber`. This is the subtle part,
   * and getting it wrong is what makes the whole board unanswerable rather than merely
   * frozen: `isResolving` is defined in terms of this value, and the effect that SETS it is
   * gated on `isResolving`. If the initial value equalled the round on the board, the gate
   * would already be open and the effect could arm it - fine. But if the initial value is
   * `null` and `isResolving` requires `pendingRound === roundNumber`, the gate never opens,
   * the effect never runs, and the value is never set: a deadlock in which no tap is ever
   * accepted.
   *
   * THE MEANING IS THEREFORE "THE ROUND THIS ADVANCE BELONGS TO", and it is deliberately NOT
   * the thing that gates re-entry. Re-entry is gated by `lockRef`, which is a plain ref and
   * has no part in the derived lock - so the derived value can start permissive (meaning
   * "nothing queued, the board is answerable") without letting a double-tap through.
   *
   * Starting `null` and treating null as "answerable" is the same shape the original code had
   * with `unlockedRound === roundNumber`, restored without the round-number comparison that
   * caused the replay freeze.
   */
  const [pendingRound, setPendingRound] = useState<number | null>(null);

  /**
   * Newest inputs, so the timeout body reads current values without the effect
   * having to depend on them (which would restart the hold).
   *
   * `holdMs` lives here too, and deliberately: the hold length must be CAPTURED
   * at the moment the answer is evaluated, not read as a dependency. A re-render
   * mid-explanation would otherwise restart the timeout and the child would
   * never see the round advance.
   */
  const latest = useRef({ roundNumber, deal, onCorrect, onWrong, correct, holdMs });
  useEffect(() => {
    latest.current = { roundNumber, deal, onCorrect, onWrong, correct, holdMs };
  });

  /*
   * ANY ROUND CHANGE CLEARS A PENDING ADVANCE.
   *
   * This is the whole replay fix. It runs on the commit that installs a new round, so it
   * covers the rewind even when the caller's `deal(1)` and `timer.start()` land in the same
   * batch - and it covers the timeout's own deal, because that changes the round too. Nothing
   * here compares the new round with the old one: a deal is a deal whether the number went up
   * or back to one.
   *
   * The pending timeout is torn down as well, because `cancel()` - which a replay calls first
   * - discards a scheduled advance WITHOUT ever running its body, and the stale callback would
   * otherwise fire a round later against the new run.
   */
  const dealtRef = useRef(roundNumber);
  useEffect(() => {
    if (dealtRef.current === roundNumber) return;
    dealtRef.current = roundNumber;
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    lockRef.current = false;
    setPendingRound(null);
  }, [roundNumber]);

  /*
   * THE LOCK IS "AN ADVANCE IS QUEUED FOR THE ROUND ON THE BOARD".
   *
   * THE `null` CASE IS WHAT BREAKS THE DEADLOCK. The effect that queues an advance is gated on
   * this expression, so the expression must be able to become true from a standing start - and
   * it does, because a tap sets `answered` while `pendingRound` is still `null`. The first
   * clause below is therefore "a tap has landed on this round and nothing has been queued for
   * it yet", which is exactly the state the effect needs to fire in.
   *
   * WRITING IT AS `pendingRound === roundNumber` ALONE DEADLOCKS. That form can only be true
   * after the queue has been set, and the queue is only set when it is true - so on the very
   * first round of the very first run, no tap would ever be accepted. It is an easy mistake
   * because the value does end up equal to the round; it just cannot START that way.
   *
   * A QUEUED ADVANCE FOR A DIFFERENT ROUND IS STALE and must not lock the board. That is the
   * replay case: `deal(1)` after a run ending on round 8 leaves a round-8 queue behind, and
   * round 1 has to stay answerable. The round-change effect clears the stale queue on the next
   * commit; this clause is what keeps the board usable in the commit before that.
   */
  const isResolving =
    answered &&
    running &&
    !settled &&
    (pendingRound === null || pendingRound === roundNumber);

  const release = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    lockRef.current = false;
    setPendingRound(null);
  }, []);

  // The hold length is read from `latest` at fire time, so a re-render during
  // the explanation cannot restart the countdown.
  useEffect(() => {
    if (!isResolving || lockRef.current) return;

    // Take the lock and settle the score BEFORE scheduling, so a re-entrant
    // render during the hold cannot fire a second evaluation.
    lockRef.current = true;
    // The round this advance belongs to, captured now so the body cannot be confused by a
    // round change that lands mid-hold.
    const heldRound = latest.current.roundNumber;
    setPendingRound(heldRound);
    // SCORING MUST NOT BE ABLE TO CANCEL THE TRANSITION. These callbacks update
    // the scoreboard; if one threw, the `setTimeout` below would never be
    // scheduled and the round would never advance - a freeze caused by a
    // bookkeeping bug. The score is worth a try/catch; the transition is not
    // negotiable.
    try {
      if (latest.current.correct) latest.current.onCorrect();
      else latest.current.onWrong();
    } catch {
      // Ignore: a scoring failure must not strand the child on a dead round.
    }

    // THE TRANSITION IS UNCONDITIONAL. Whatever the outcome, this timeout deals
    // the next round, clears the lock and re-arms. A miss is held longer than a
    // hit (see FEEDBACK_MS) but never blocks the path onwards - that was the
    // freeze: the board locked on a wrong answer and never came back.
    //
    // THE HANDOFF IS WRAPPED IN try/finally. `deal` builds the next puzzle, and a
    // throw in there (a bad species, a generator edge case) would otherwise skip
    // the two lines that unlock the board - and because the timeout ref was
    // already cleared, nothing would ever retry. The child would be stuck on a
    // dead round with a locked keypad. Unlocking must not depend on the deal
    // succeeding: a failed deal leaves the board answerable, not frozen.
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = undefined;
      const next = heldRound + 1;
      try {
        latest.current.deal(next);
      } finally {
        lockRef.current = false;
        /*
         * Cleared only if it still refers to the round this timeout held. A replay's
         * `deal(1)` may already have installed a new round and cleared the marker, and this
         * late callback must not re-latch a lock onto a run it knows nothing about.
         */
        setPendingRound((current) => (current === heldRound ? null : current));
      }
    }, latest.current.holdMs);

    // Only the scheduled timeout is torn down here. The lock is NOT released on
    // cleanup: this effect re-runs whenever `isResolving` flips, and releasing
    // the lock on the way out would let a second tap slip through the window
    // between the tap and the deal.
    return () => {
      if (timeoutRef.current !== undefined) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    };
  }, [isResolving]);

  // A finished run must not swap a puzzle in behind the results card.
  useEffect(() => {
    if (settled) release();
  }, [settled, release]);

  useEffect(() => release, [release]);

  return { isResolving, cancel: release };
}
