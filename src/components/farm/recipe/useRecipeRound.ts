/**
 * Round state and input handling for "המתכון של השף".
 *
 * THE LOCK IS A REF, AND IT IS TAKEN SYNCHRONOUSLY. A held arrow key fires
 * repeats faster than React re-renders, so a state-based guard would let several
 * presses through in the same tick - enough for a completed step to be
 * overwritten by the next key. The ref flips immediately and is only released
 * when the next recipe is dealt.
 *
 * A MISTAKE ABORTS THE ROUND. One wrong arm flashes red, holds the partial entry
 * on screen so the child can see how far they got, and then deals the next
 * recipe. The partial entry is deliberately NOT cleared: seeing three filled
 * slots while the fourth shakes is what explains what went wrong.
 *
 * THE ADVANCE IS UNCONDITIONAL once scheduled, and the timeout is cleared on
 * unmount, so a run that ends mid-flash cannot advance into a dead component.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { buildRecipeRound, directionFor } from './recipeGenerator';
import { CORRECT_MS, WRONG_MS } from './recipeData';
import type { Direction, RecipePhase, RecipeRound } from './recipeTypes';

interface UseRecipeRoundOptions {
  /** True while the 60-second run is live. */
  running: boolean;
  /** True once the run is over and the medal card is showing. */
  settled: boolean;
  onScore: () => void;
  onMiss: () => void;
}

export interface RecipeRoundState {
  roundNumber: number;
  round: RecipeRound;
  phase: RecipePhase;
  /** How many slots the child has filled correctly this round. */
  entered: number;
  /** The arm currently shaking, if any. */
  rejected: Direction | null;
  /** True while the reveal is walking the sequence. */
  revealing: boolean;
  /** Marks the reveal finished and hands control to the child. */
  openInput: () => void;
  press: (direction: Direction) => void;
  restart: () => void;
}

export function useRecipeRound({
  running,
  settled,
  onScore,
  onMiss,
}: UseRecipeRoundOptions): RecipeRoundState {
  const [roundNumber, setRoundNumber] = useState(1);
  const [round, setRound] = useState<RecipeRound>(() => buildRecipeRound(1));
  const [phase, setPhase] = useState<RecipePhase>('memorize');
  const [entered, setEntered] = useState(0);
  const [rejected, setRejected] = useState<Direction | null>(null);

  const lockedRef = useRef(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  const clearPending = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const install = useCallback((next: number) => {
    setRoundNumber(next);
    setRound(buildRecipeRound(next));
    setEntered(0);
    setRejected(null);
    setPhase('memorize');
    lockedRef.current = false;
  }, []);

  const advance = useCallback(() => {
    clearPending();
    install(roundNumber + 1);
  }, [clearPending, install, roundNumber]);

  const openInput = useCallback(() => setPhase('input'), []);

  const press = useCallback(
    (direction: Direction) => {
      if (!running || settled || phase !== 'input' || lockedRef.current) return;
      const expected = round.sequence[entered]?.ingredient.id;

      // WRONG: abort the recipe, keeping the partial entry visible under the flash.
      if (directionFor(round, expected ?? '') !== direction) {
        lockedRef.current = true;
        setPhase('wrong');
        setRejected(direction);
        onMiss();
        timeoutRef.current = window.setTimeout(advance, WRONG_MS);
        return;
      }

      const next = entered + 1;
      setEntered(next);

      // COMPLETE: score, flash green, then deal.
      if (next >= round.sequence.length) {
        lockedRef.current = true;
        setPhase('right');
        onScore();
        timeoutRef.current = window.setTimeout(advance, CORRECT_MS);
      }
    },
    [advance, entered, onMiss, onScore, phase, round, running, settled],
  );

  const restart = useCallback(() => {
    clearPending();
    install(1);
  }, [clearPending, install]);

  // Unmount safety, and no advance once the run has settled.
  useEffect(() => clearPending, [clearPending]);
  useEffect(() => {
    if (settled) clearPending();
  }, [settled, clearPending]);

  return {
    roundNumber,
    round,
    phase,
    entered,
    rejected,
    revealing: phase === 'memorize',
    openInput,
    press,
    restart,
  };
}
