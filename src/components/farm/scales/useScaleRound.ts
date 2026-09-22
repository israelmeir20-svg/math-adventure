/**
 * Placement state for one challenge in "מאזניים בחווה".
 *
 * Owns the three piles that matter: the shelf pool, the right pan, and the
 * fixed left pan. Placing and removing are pure list moves, so the invariant
 * "every animal is in exactly one place" holds by construction - no animal can
 * be duplicated or lost.
 *
 * The balance check is derived from the weights, never from a flag, so it can
 * never disagree with what is drawn on the pans.
 */
import { useCallback, useMemo, useState } from 'react';
import { PAN_CAPACITY } from './scaleStageData';
import { sumWeight, type ScaleAnimal } from './scaleWeights';
import { buildScalePuzzle, type ScalePuzzle } from './scaleGenerator';

export interface ScaleRound {
  /** 1-based puzzle number in the current run. */
  roundNumber: number;
  puzzle: ScalePuzzle;
  /** Animals still on the shelf. */
  pool: ScaleAnimal[];
  /** Animals the player has added to the right pan. */
  placed: ScaleAnimal[];
  /** Left pan (fixed) + right pan (pre-filled + placed). */
  left: ScaleAnimal[];
  right: ScaleAnimal[];
  leftWeight: number;
  rightWeight: number;
  /** The weight the right pan must reach. */
  targetWeight: number;
  /** True when both pans weigh exactly the same. */
  balanced: boolean;
  /** True when the pan is at capacity and taps must be refused. */
  full: boolean;
  place: (animal: ScaleAnimal) => void;
  removeAt: (index: number) => void;
  /**
   * Swap in a freshly generated puzzle for `round`, clearing the pan and
   * refilling the shelf in the SAME commit. Returns the new puzzle so callers
   * can log or react to it without waiting a render.
   */
  deal: (round: number) => ScalePuzzle;
}

export function useScaleRound(): ScaleRound {
  const [roundNumber, setRoundNumber] = useState(1);
  const [puzzle, setPuzzle] = useState<ScalePuzzle>(() => buildScalePuzzle(1));

  /**
   * `placed` and `pool` are the two moving halves of ONE invariant: every
   * animal is either on the pan or on the shelf, never both and never neither.
   * Holding them in a single state object makes every transition one atomic,
   * idempotent update - React may invoke an updater twice, so a transition that
   * read one half and wrote the other could duplicate or lose an animal.
   */
  const [tray, setTray] = useState<{ placed: ScaleAnimal[]; pool: ScaleAnimal[] }>(() => ({
    placed: [],
    pool: [...puzzle.shelf],
  }));

  const place = useCallback((animal: ScaleAnimal) => {
    setTray((current) => {
      if (current.placed.length >= PAN_CAPACITY) return current;
      const index = current.pool.indexOf(animal);
      if (index === -1) return current;
      const pool = [...current.pool];
      pool.splice(index, 1);
      return { placed: [...current.placed, animal], pool };
    });
  }, []);

  const removeAt = useCallback((index: number) => {
    setTray((current) => {
      const animal = current.placed[index];
      if (animal === undefined) return current;
      const placed = [...current.placed];
      placed.splice(index, 1);
      return { placed, pool: [...current.pool, animal] };
    });
  }, []);

  /**
   * Deal a puzzle for `round`.
   *
   * All setters are called at the top level of this callback - never inside
   * another setter's updater function. React runs updaters during the render
   * phase, and a setter called from there is discarded, which left the round
   * number advancing while the puzzle stayed stale. That is what froze the board
   * on "מאוזן!": the weights still matched, so the game kept re-entering its
   * solved state and could never move on.
   *
   * The round number is passed in explicitly by the caller, so this callback
   * never has to read state and can stay referentially stable.
   */
  const deal = useCallback((round: number): ScalePuzzle => {
    const fresh = buildScalePuzzle(round);
    setRoundNumber(round);
    setPuzzle(fresh);
    setTray({ placed: [], pool: [...fresh.shelf] });
    return fresh;
  }, []);

  const { placed, pool } = tray;

  return useMemo(() => {
    const left = puzzle.left;
    const right = [...puzzle.right, ...placed];
    const leftWeight = sumWeight(left);
    const rightWeight = sumWeight(right);
    return {
      roundNumber,
      puzzle,
      pool,
      placed,
      left,
      right,
      leftWeight,
      rightWeight,
      targetWeight: leftWeight,
      balanced: leftWeight === rightWeight,
      full: placed.length >= PAN_CAPACITY,
      place,
      removeAt,
      deal,
    };
  }, [roundNumber, puzzle, pool, placed, place, removeAt, deal]);
}
