/**
 * Per-question state for "משחק הכוכבים": which sky is up, and what was tapped.
 *
 * THE RUN'S LEVEL IS AN INPUT, NOT SOMETHING THIS HOOK DERIVES. It is handed in once and used
 * for every question, which is the whole point of the fix this hook went through: the level
 * used to be read off the question number inside the generator, so a run drifted up the ladder
 * no matter what the child had chosen on the launch card. Passing the level down here makes the
 * card's choice the only thing that decides difficulty.
 *
 * THE SCORE IS DERIVED, NOT STORED. There is one piece of stored truth here besides the
 * question itself - the number the child tapped - and `correct`/`answered` are read off it in a
 * `useMemo`. A stored `correct` flag alongside a stored `picked` value can disagree after a
 * fast tap, and the disagreement shows up as a button that lights up green for an answer the
 * round never accepted. Deriving removes the possibility rather than guarding against it.
 *
 * `pick` IS IDEMPOTENT. It only records the first tap of a round, so a double-fire from a
 * keyboard repeat or a finger bouncing on a touch screen cannot overwrite a right answer with
 * a wrong one - the second tap is simply ignored.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { buildStarRound } from './starGenerator';
import { clampLevel } from './starTiers';
import type { StarRound } from './starTypes';

export interface StarRoundState {
  /** 1-based question index in the run. */
  roundNumber: number;
  round: StarRound;
  /** The number the child tapped, or null. */
  picked: number | null;
  /** True when the tap was the answer. False before any tap. */
  correct: boolean;
  /** True once a tap has been registered. */
  answered: boolean;
  /** Records a tap. No-op once the question is answered. */
  pick: (value: number) => void;
  /** Installs a fresh sky for the given question and clears the tap. */
  deal: (question: number) => StarRound;
}

/**
 * @param level The station level the child chose. Fixed for the whole run - every question is
 *   built from it, and it is never re-derived from the question index.
 */
export function useStarRound(level: number = 1): StarRoundState {
  const playLevel = clampLevel(level);

  /*
   * THE LEVEL IS HELD IN A REF AS WELL AS IN THE CLOSURE.
   *
   * `deal` is memoised and the game's timer calls it from an effect chain that must not have to
   * re-create itself whenever the level prop changes. Reading through a ref keeps the callback's
   * identity stable while still picking up the current level, so a run started at a newly
   * unlocked level is built from that level rather than from whatever was current when the
   * callback happened to be created.
   */
  const levelRef = useRef(playLevel);
  levelRef.current = playLevel;

  const [roundNumber, setRoundNumber] = useState(1);
  const [round, setRound] = useState<StarRound>(() => buildStarRound(1, playLevel));
  const [picked, setPicked] = useState<number | null>(null);

  const deal = useCallback((next: number): StarRound => {
    const fresh = buildStarRound(next, levelRef.current);
    setRoundNumber(next);
    setRound(fresh);
    setPicked(null);
    return fresh;
  }, []);

  const pick = useCallback((value: number) => {
    // The guard lives in the updater, so it reads the truest available value - a stale
    // closure over `picked` could let a second tap through in the same tick.
    setPicked((current) => (current === null ? value : current));
  }, []);

  return useMemo(() => {
    const answered = picked !== null;
    return {
      roundNumber,
      round,
      picked,
      answered,
      correct: answered && picked === round.total,
      pick,
      deal,
    };
  }, [roundNumber, round, picked, pick, deal]);
}
