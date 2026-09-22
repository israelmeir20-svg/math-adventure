/**
 * Per-round state for "האסם בלילה".
 *
 * Owns three things: which puzzle is on the board, which option the child
 * tapped, and whether that tap was right.
 *
 * CORRECTNESS IS DERIVED, never stored, so it is impossible for the flag and the
 * tap to disagree - the classic bug being a stale `correct` surviving into the
 * next round. `right` and `wrong` are also derived here rather than in the view,
 * AND THEY ARE MUTUALLY EXCLUSIVE: `right` only ever holds the winning value and
 * `wrong` only ever the losing one. Handing the same value to both is what once
 * made a wrong tap render as a green tick.
 */
import { useCallback, useMemo, useState } from 'react';
import { buildNightPuzzle } from './nightGenerator';
import type { NightPuzzle } from './nightTypes';

export interface NightRound {
  /** 1-based puzzle number in the current run. */
  roundNumber: number;
  puzzle: NightPuzzle;
  /** The option the child tapped, or null. */
  picked: number | null;
  /** The tapped value, but only when it was correct. */
  right: number | null;
  /** The tapped value, but only when it was wrong. */
  wrong: number | null;
  /** True when the tap was the answer. False before any tap. */
  correct: boolean;
  /** True once a tap has been registered. */
  answered: boolean;
  /** Records a tap. No-op once the round is answered. */
  pick: (value: number) => void;
  /** Installs a fresh puzzle. */
  deal: (round: number) => NightPuzzle;
}

export function useNightRound(): NightRound {
  const [roundNumber, setRoundNumber] = useState(1);
  const [puzzle, setPuzzle] = useState<NightPuzzle>(() => buildNightPuzzle(1));
  const [picked, setPicked] = useState<number | null>(null);

  const deal = useCallback((round: number): NightPuzzle => {
    const fresh = buildNightPuzzle(round);
    setRoundNumber(round);
    setPuzzle(fresh);
    setPicked(null);
    return fresh;
  }, []);

  const pick = useCallback((value: number) => {
    setPicked((current) => (current === null ? value : current));
  }, []);

  return useMemo(() => {
    const answered = picked !== null;
    const correct = answered && picked === puzzle.answer;
    return {
      roundNumber,
      puzzle,
      picked,
      correct,
      answered,
      right: correct ? picked : null,
      wrong: answered && !correct ? picked : null,
      pick,
      deal,
    };
  }, [roundNumber, puzzle, picked, pick, deal]);
}
