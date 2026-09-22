/**
 * Public surface for the Bridge Guard encounter.
 *
 * Lock names, guard dialogue and rewards live in `bridgeDialogue`.
 * The per-tier problem generators live in `bridgeProblems`.
 */
import type { MathProblem } from '../../types/game.types';
import type { LockTier } from './bridgeDialogue';
import { bronzeProblem, goldProblem, silverProblem } from './bridgeProblems';

export type { LockDefinition, LockTier } from './bridgeDialogue';
export {
  BRIDGE_COOKIE_REWARD,
  BRIDGE_STAR_REWARD,
  DIALOGUE,
  GUARD_NAME,
  LOCKS,
  pickDialogue,
} from './bridgeDialogue';

/** The order the locks must be opened in. */
export const LOCK_ORDER: LockTier[] = ['bronze', 'silver', 'gold'];

/** Builds the problem for a given lock tier. */
export function buildLockProblem(tier: LockTier): MathProblem {
  if (tier === 'bronze') return bronzeProblem();
  if (tier === 'silver') return silverProblem();
  return goldProblem();
}

/** 3-lock round with a fresh problem for each tier. */
export function buildBridgeRound(): Record<LockTier, MathProblem> {
  return {
    bronze: bronzeProblem(),
    silver: silverProblem(),
    gold: goldProblem(),
  };
}
