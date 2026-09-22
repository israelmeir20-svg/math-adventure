/**
 * Pure round builders for the street mini-games.
 *
 * Hopscotch builds from here. The balloon sprint no longer does: it is an endless
 * timed run rather than a fixed board, so its targets, spawner and scoring live in
 * `balloonSprint.ts`, `balloonSpawner.ts` and `balloonTypes.ts`. The old
 * `buildBalloonRound` grid - every multiple of a table laid out in a 4x3 board to
 * be cleared - is gone with the quest it belonged to.
 *
 * No React - just deterministic data the components can render.
 */
import { shuffle } from '../../logic/random';

const MIN_TABLE = 2;
const MAX_TABLE = 9;

/** A random table between 2 and 9, for games that pick one at the start. */
export function pickTable(): number {
  return MIN_TABLE + Math.floor(Math.random() * (MAX_TABLE - MIN_TABLE + 1));
}

/**
 * A random table from a caller-supplied list.
 *
 * WHY THE CALLER SUPPLIES THE POOL. The hopscotch board is now levelled, and a level's difficulty is
 * exactly "which tables may appear" - level 1 drawing from 2-5, level 3 from 6-9. Keeping the pool
 * in the game rather than in a second table here means the difficulty ramp sits next to the copy
 * that describes it, and this file stays what its header claims: deterministic data with no opinion
 * about progression.
 *
 * AN EMPTY POOL FALLS BACK TO THE FULL RANGE rather than throwing. A misconfigured level is a bug,
 * but it is not one worth breaking a child's game over - and a board that builds is easier to
 * diagnose than a crashed street.
 */
export function pickTableFrom(tables: readonly number[]): number {
  if (tables.length === 0) return pickTable();
  return tables[Math.floor(Math.random() * tables.length)]!;
}

export interface HopStep {
  index: number;
  correct: number;
  choices: number[];
}

/** 8 chalk steps, each asking for the next multiple of `table`. */
export function buildHopscotchSteps(table: number): HopStep[] {
  const STEPS = 8;
  return Array.from({ length: STEPS }, (_, index) => {
    const correct = (index + 1) * table;
    const wrongPool = new Set<number>();
    let guard = 0;
    while (wrongPool.size < 2 && guard < 60) {
      guard += 1;
      const offset = (1 + Math.floor(Math.random() * 3)) * (Math.random() < 0.5 ? -1 : 1);
      const candidate = correct + offset;
      if (candidate > 0 && candidate !== correct) wrongPool.add(candidate);
    }
    return {
      index,
      correct,
      choices: shuffle([correct, ...wrongPool]),
    };
  });
}

/**
 * Paid once when the hopscotch run reaches the finish line - a full-stage reward, so it
 * takes the brief's "+15 for completing a stage" figure rather than a per-hop one.
 */
export const STREET_GAME_COOKIE_REWARD = 15;
