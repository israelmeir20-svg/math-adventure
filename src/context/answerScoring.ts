/**
 * Pure scoring logic for a single answer: streak bookkeeping, tile levelling,
 * mistake scheduling and the cookie payout. Kept out of the reducer to keep
 * both files small and focused.
 */
import type { HexTile, StreakState } from '../types/game.types';
import { scheduleReview } from '../logic/mistakeTracker';
import { withTileProblem, type GameState } from './gameState';

export const STREAK_THRESHOLD = 3;
export const COOKIES_PER_CORRECT = 5;

export const nextLevel = (tile: HexTile): number => Math.min(5, tile.level + 1);

export function applyAnswer(
  state: GameState,
  isCorrect: boolean,
  tileId?: string,
  forgive = false,
): GameState {
  // The Eraser lifeline keeps the streak alive on a mistake.
  const keepsStreak = isCorrect || forgive;
  const consecutiveCorrect = isCorrect
    ? state.streak.consecutiveCorrect + 1
    : forgive
      ? state.streak.consecutiveCorrect
      : 0;
  const streak: StreakState = keepsStreak
    ? { consecutiveCorrect, multiplier: state.streak.multiplier }
    : {
        consecutiveCorrect,
        multiplier: consecutiveCorrect >= STREAK_THRESHOLD ? 2 : 1,
      };

  let next: GameState = {
    ...state,
    streak,
    totalAnswered: state.totalAnswered + 1,
    totalCorrect: state.totalCorrect + (isCorrect ? 1 : 0),
  };

  const activeTileId = tileId ?? state.lastActiveTileId;
  const tile = activeTileId ? state.tiles[activeTileId] : undefined;
  const problem = tile?.currentMathProblem ?? null;

  if (activeTileId && tile && problem) {
    next = withTileProblem(next, activeTileId, isCorrect ? null : problem);
    next = {
      ...next,
      mistakes: scheduleReview(next.mistakes, problem, isCorrect),
      tiles: {
        ...next.tiles,
        [activeTileId]: {
          ...tile,
          level: isCorrect ? nextLevel(tile) : tile.level,
        },
      },
    };
  }

  if (!isCorrect) return next;

  return {
    ...next,
    inventory: {
      ...next.inventory,
      cookies: next.inventory.cookies + COOKIES_PER_CORRECT * streak.multiplier,
      starCookies:
        next.inventory.starCookies + (streak.multiplier === 2 ? 1 : 0),
    },
  };
}
