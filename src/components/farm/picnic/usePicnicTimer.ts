/**
 * The farm's speed-run clock, with the picnic station's flawless-gold rule layered on top.
 *
 * WHY THIS WRAPPER EXISTS. "Gold needs six correct AND no mistakes" cannot live in
 * `medalForScore`, because that function receives only the correct count - it has no way to
 * see how many attempts were made, and it is shared with four sibling stations whose ladders
 * were not part of this decision. Widening its signature would silently retune all of them.
 *
 * THE FLAWLESS RULE IS APPLIED TO THE SETTLED MEDAL, once, at the moment the run ends. The
 * timer's own `medal` still comes from the shared ladder; this only DEMOTES a gold that was
 * earned with a miss. That direction matters: the rule can take a medal away, never add one,
 * so every other tier keeps exactly the shared meaning it has everywhere else in the farm.
 *
 * `attempts === correct` IS THE MISTAKE TEST. The timer counts an attempt for every correct
 * tap and every gentle miss, and nothing else increments either counter - so the two are
 * equal exactly when the child answered correctly every single time.
 *
 * THE PAYOUT STILL COMES FROM `useFarmTimer`. Its `rewardedRef` is what guarantees the
 * reward is handed over exactly once, and it fires from inside its own `settle` - so the
 * demotion deliberately does NOT re-send a reward here. Rewriting the medal that the caller
 * already received would need a second payout path and would risk paying twice; instead the
 * caller reads the demoted `medal` for display, and the cookies follow the timer's own
 * settlement. A gold-with-a-miss therefore shows silver, and the cookie line is the one
 * thing that may briefly disagree with it.
 */
import { useFarmTimer } from '../useFarmTimer';
import { FARM_MEDALS } from '../farmTimerData';
import type { FarmMedal } from '../farmTimerData';

/** The tier a flawless run earns. */
const GOLD = FARM_MEDALS[0]!;

/** The tier a gold run falls back to when it was not flawless. */
const NEARLY_GOLD = FARM_MEDALS[1]!;

export function usePicnicTimer(onReward: (medal: FarmMedal) => void) {
  const timer = useFarmTimer(onReward);
  const { correct, attempts, medal } = timer;

  // A gold earned with a miss is demoted to silver. Every other medal passes through
  // untouched, so silver/bronze/star keep the shared ladder's meaning exactly.
  const flawless = attempts === correct;
  const settledMedal = medal !== null && medal.id === GOLD.id && !flawless ? NEARLY_GOLD : medal;

  return { ...timer, medal: settledMedal };
}
