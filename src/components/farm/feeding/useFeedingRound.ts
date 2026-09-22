/**
 * Per-round state for "שעת האכלה".
 *
 * Owns three things: which puzzle is on the board, which option (if any) the
 * child tapped, and whether that tap was right.
 *
 * The correctness flag is DERIVED from the puzzle and the tapped value, never
 * stored, so it is impossible for the two to disagree - the classic bug being a
 * stale `isCorrect` surviving into the next round.
 */
import { useCallback, useMemo, useState } from 'react';
import { buildFeedingPuzzle } from './feedingGenerator';
import type { FeedingPuzzle } from './feedingTypes';

export interface FeedingRound {
  /** 1-based puzzle number in the current run. */
  roundNumber: number;
  puzzle: FeedingPuzzle;
  /** The option the child tapped this round, or null. */
  picked: number | null;
  /** True when `picked` is the fair share. False before any tap. */
  correct: boolean;
  /** True once a tap has been registered and the board must not accept more. */
  answered: boolean;
  /** Left-over food, computed only after a correct answer. Null while asking. */
  remainder: number | null;
  /** Records a tap. No-op once the round is answered. */
  pick: (value: number) => void;
  /** Installs a fresh puzzle. */
  deal: (round: number) => FeedingPuzzle;
}

export function useFeedingRound(): FeedingRound {
  const [roundNumber, setRoundNumber] = useState(1);
  const [puzzle, setPuzzle] = useState<FeedingPuzzle>(() => buildFeedingPuzzle(1));
  const [picked, setPicked] = useState<number | null>(null);

  const deal = useCallback((round: number): FeedingPuzzle => {
    const fresh = buildFeedingPuzzle(round);
    setRoundNumber(round);
    setPuzzle(fresh);
    setPicked(null);
    return fresh;
  }, []);

  const pick = useCallback((value: number) => {
    setPicked((current) => (current === null ? value : current));
  }, []);

  return useMemo(() => {
    const correct = picked !== null && picked === puzzle.quotient;
    return {
      roundNumber,
      puzzle,
      picked,
      correct,
      answered: picked !== null,
      // The leftovers are only surfaced on a correct answer, which is what keeps
      // them out of the question phase entirely.
      remainder: correct ? puzzle.totalFood - puzzle.quotient * puzzle.animals.length : null,
      pick,
      deal,
    };
  }, [roundNumber, puzzle, picked, pick, deal]);
}
