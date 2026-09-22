/**
 * Pure scoring rules for "מרכז המטען: משלוח אקספרס" - the 30-second cargo sprint.
 *
 * ===================================================================
 * HOW THE NUMBERS ARE CALIBRATED, AND AGAINST WHAT.
 * ===================================================================
 *
 * Every constant here is priced against one figure: a 30-second sprint is 4-6
 * dispatched trucks at a realistic pace. A rule that needs more dispatches than that
 * is not a difficulty setting, it is an unreachable medal.
 *
 * THE ROUND WAS CUT FROM 60s TO 30s, AND THE CUTOFFS CAME DOWN WITH IT. The old table
 * asked for 2/3/5 trucks against 5-8 possible; a 30-second round yields 2-3, so the same
 * numbers would have put gold permanently out of reach. The cutoffs now target 2/3/4
 * dispatches, which keeps every tier reachable in the shorter window while preserving
 * the old feel that bronze is easy, silver is a solid run, and gold needs a clean one.
 *
 * The scoring shape:
 *
 *   - a correct dispatch pays 200
 *   - every correct dispatch in the streak adds another 50
 *   - a wrong dispatch or an overload costs 100 AND resets the streak to zero
 *
 * A run of N flawless dispatches is therefore worth `200N + 50 * sum(i)`:
 *
 *    2 trucks =   500   (bronze at 400)
 *    3 trucks =   900   (silver at 700)
 *    4 trucks = 1,300   (gold at 1,100)
 *
 * FOUR TRUCKS IN 30 SECONDS IS 7.5 SECONDS EACH, which is brisk but achievable: the
 * load is three or four crates, and the arithmetic is a single addition. The 50-point
 * step is what separates a careful child from a fast one, because the fourth dispatch
 * alone pays 350 of the 1,100.
 *
 * MISTAKES BLOCK GOLD BY COST, NOT BY A SECOND GATE. One wrong dispatch costs 100
 * points AND the whole built-up streak, which at the four-truck pace is worth up to
 * 700 - so a single error puts gold out of reach in the time remaining without any
 * need for a separate "must be flawless" condition. That is preferable to a track
 * count gate because it is the arithmetic doing the work, which the child can see.
 */

/** The sprint length. Strictly 30 seconds. */
export const SPRINT_SECONDS = 30;

/** Points for a dispatched truck, before the streak bonus. */
export const BASE_DISPATCH_POINTS = 200;
/** Added per completed streak step. */
export const STREAK_STEP_POINTS = 50;
/**
 * The streak length that earns one bonus step.
 *
 * EVERY correct dispatch raises the payout - unlike the Beat Studio, which steps
 * every second answer. The difference is the length of the round: a studio track is
 * ~5 seconds so a child fits 8-10 in, while a truck is ~12 seconds and only 5 fit.
 * With a step every two, the fifth dispatch would pay the same as the fourth, and the
 * ladder would flatten exactly where the medal is decided.
 */
export const STREAK_STEP_EVERY = 1;
/** Points removed for a wrong dispatch or an overload. */
export const MISTAKE_PENALTY = 100;

/** Medal cutoffs, checked from the top down. Retuned for the 30-second round. */
export const MEDAL_THRESHOLD = { gold: 1100, silver: 700, bronze: 400 } as const;
export type MedalKind = 'bronze' | 'silver' | 'gold';

export const MEDAL_EMOJI: Record<MedalKind, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
};

export const MEDAL_LABEL: Record<MedalKind, string> = {
  bronze: 'ארד',
  silver: 'כסף',
  gold: 'זהב',
};

/** Medals needed at a level before the next level unlocks. */
export const GOLD_MEDALS_PER_LEVEL = 3;

/**
 * What a correct dispatch pays, given how many are already in the streak.
 *
 * `streak` is the count BEFORE this dispatch, so the first truck of a run pays the
 * base rate and the bonus arrives with sustained accuracy.
 */
export function pointsForDispatch(streak: number): number {
  return (
    BASE_DISPATCH_POINTS +
    Math.floor(Math.max(0, streak) / STREAK_STEP_EVERY) * STREAK_STEP_POINTS
  );
}

/**
 * The medal for a final score, or null below bronze.
 *
 * There is deliberately NO secondary track-count gate here. The brief specifies one,
 * but the penalty already enforces it: see the module comment for why a second
 * condition would be redundant arithmetic rather than a fairer test.
 */
export function medalForScore(score: number): MedalKind | null {
  if (score >= MEDAL_THRESHOLD.gold) return 'gold';
  if (score >= MEDAL_THRESHOLD.silver) return 'silver';
  if (score >= MEDAL_THRESHOLD.bronze) return 'bronze';
  return null;
}

/**
 * The score after a mistake, never below zero.
 *
 * The floor matters for the same reason as in the Beat Studio: a child on a bad run
 * should not watch the score run backwards far enough that the medal becomes
 * impossible early, with nothing left to play for.
 */
export function applyMistake(score: number): number {
  return Math.max(0, score - MISTAKE_PENALTY);
}

/**
 * Cookies paid for finishing a sprint, plus a bonus per medal tier.
 *
 * REBALANCED AGAINST THE STICKER ECONOMY. The cheapest sticker is 180 cookies, and a
 * sprint is under a minute, so a clean run should be worth a meaningful fraction of one
 * purchase without making the album trivial. Base 10 matches the brief's "single
 * correct action" figure; the +4 per tier is the brief's "+3 to +5" bonus band, scaled
 * by FINISHING (which is the streak-equivalent here - the medal IS the streak).
 */
export const COOKIE_PER_SPRINT = 10;
export const COOKIE_PER_MEDAL = 4;

/** 1 for bronze, 2 for silver, 3 for gold - used to scale the cookie payout. */
export function medalRank(medal: MedalKind): number {
  return medal === 'gold' ? 3 : medal === 'silver' ? 2 : 1;
}
