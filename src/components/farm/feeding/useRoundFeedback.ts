/**
 * Turns a tap into the board's feedback state, and into a hold duration.
 *
 * DERIVED, NEVER STORED. The status is recomputed from the puzzle and the tapped
 * value on every render, so it cannot survive into the next round - the classic
 * bug being a stale "too much" tinting a fresh, unanswered board. While nothing
 * has been tapped it is `idle`, which is also what keeps the answer from leaking
 * onto the stage before the child commits.
 *
 * The hold duration is part of the same decision because the two must agree: a
 * correct answer gets a short beat, a miss gets long enough to be READ.
 */
import { useMemo } from 'react';
import { FEEDBACK_MS } from './feedingData';
import { classify, IDLE_FEEDBACK, type FeedbackState } from './feedingFeedback';
import type { FeedingPuzzle } from './feedingTypes';

export interface RoundFeedback {
  feedback: FeedbackState;
  /** How long to hold the explanation before dealing the next round, in ms. */
  holdMs: number;
}

export function useRoundFeedback(puzzle: FeedingPuzzle, picked: number | null): RoundFeedback {
  return useMemo(() => {
    if (picked === null) return { feedback: IDLE_FEEDBACK, holdMs: 0 };
    // `classify` returns AnsweredStatus, so it indexes FEEDBACK_MS directly.
    const status = classify(puzzle.totalFood, puzzle.animals.length, picked, puzzle.quotient);
    return { feedback: { status, chosen: picked }, holdMs: FEEDBACK_MS[status] };
  }, [picked, puzzle]);
}
