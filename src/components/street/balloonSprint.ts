/**
 * Pure rules for the balloon sprint: the clock, the four tiers, and the scoring.
 *
 * No React and - importantly - no randomness. Everything here is data plus
 * functions over it, so the level table, the medal cutoffs and the points
 * arithmetic can be reasoned about in one read.
 *
 * ===================================================================
 * WHY THE POINTS ARE SHAPED THE WAY THEY ARE.
 * ===================================================================
 *
 * THE STREAK BONUS IS THE WHOLE GAME. Gold is 2,600 points in 45 seconds, and a
 * flat 100 points a pop would need 26 correct pops - reachable by a child who
 * simply clicks everything, because the +100s would arrive as fast as the -75s
 * cancelled them out. The bonus is what makes that strategy fail:
 *
 *   - the FIRST correct pop of a streak is worth only 100
 *   - every following one adds another 25, so a run of N is worth
 *     100N + 25 * (N-1)(N-2)/2
 *
 * Seventeen consecutive pops are therefore worth 2,700 points, which is the Gold
 * cutoff exactly. The same eighteen pops broken up into singles are worth 1,800 -
 * so the streak is worth 1,125 more than the same number of scattered hits, and
 * that gap is only paid to a child who is reading the numbers. A button-masher
 * still loses 75 every time they hit a distractor, and their streak never survives
 * long enough to pay out.
 *
 * THE THRESHOLDS WERE RAISED WHEN THE FIELD WAS FIXED. They were originally set
 * (gold 1,600) against a stage that spent most of the sprint with no valid target
 * on screen at all, so a child who could physically land 40 pops was landing 9-18.
 * Once the emergency refill put targets back on the stage, 1,600 became a target a
 * slow, careless run could clear, and the medal stopped distinguishing anything.
 * Gold now needs 17 consecutive correct pops - a pop roughly every 1.5 seconds
 * across the sprint, comfortably inside the clock for a child who is reading the
 * numbers, and out of reach for one who is not.
 *
 * A PENALTY NEVER GOES BELOW ZERO. Scores are clamped, because a child on a bad
 * run would otherwise watch their score run backwards far enough that the medal
 * became arithmetically impossible a third of the way into the sprint. The miss
 * still costs them the 75 points and the streak - that is the punishment - but
 * the floor keeps the round worth finishing.
 */
import type { FloatingBalloon } from './balloonTypes';

/** The sprint length. Strictly 45 seconds. */
export const SPRINT_SECONDS = 45;

/** Points for a correct pop, before the streak bonus. */
export const BASE_POP_POINTS = 100;
/** Added per already-active streak step, so the Nth pop of a run pays this much more. */
export const STREAK_STEP_POINTS = 25;
/** Points removed for popping a distractor. */
export const WRONG_POP_PENALTY = 75;
/** Every this many correct pops pushes the streak bonus up a step. */
export const STREAK_STEP_EVERY = 3;

/**
 * A golden balloon: worth a large score bonus, a handful of real cookies, and it
 * does not touch the streak - so taking one can never cost the child their run.
 */
export const GOLDEN_POINTS = 500;

/**
 * Cookies paid immediately for popping a golden balloon.
 *
 * These are spent-currency cookies, not score - they land in the child's balance
 * the moment the balloon bursts, on top of whatever the sprint pays at the end.
 * Kept modest (the sprint itself pays 10 plus a medal bonus) so the golden balloon
 * is a nice surprise rather than the main way to earn, and deliberately NOT scaled
 * by the sprint's score so it cannot be farmed by a lucky run.
 */
export const GOLDEN_COOKIES = 3;

/** Medal cutoffs, checked from the top down. */
export const MEDAL_THRESHOLD = { gold: 2600, silver: 1600, bronze: 800 } as const;
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
 * The points a correct pop is worth at a given streak length.
 *
 * `streak` is how many correct pops have ALREADY landed in this run, so the
 * first pop of a run (streak 0) is worth the flat base. The bonus climbs by
 * `STREAK_STEP_POINTS` for every `STREAK_STEP_EVERY` pops, which keeps the early
 * pops worth roughly the same and makes the back half of a long run explosive.
 */
export function pointsForPop(streak: number): number {
  const step = Math.floor(Math.max(0, streak) / STREAK_STEP_EVERY);
  return BASE_POP_POINTS + step * STREAK_STEP_POINTS;
}

/** The medal for a final score, or null below bronze. */
export function medalForScore(score: number): MedalKind | null {
  if (score >= MEDAL_THRESHOLD.gold) return 'gold';
  if (score >= MEDAL_THRESHOLD.silver) return 'silver';
  if (score >= MEDAL_THRESHOLD.bronze) return 'bronze';
  return null;
}

/** One tier of the sprint's four-step progression. */
export interface BalloonLevel {
  /** 1 to 4. */
  level: number;
  /** Describes the tier on the summary screen. */
  title: string;
  /** Tables the target is drawn from. */
  tables: readonly number[];
  /** Balloons the stage tries to keep in the air at once. */
  fieldSize: number;
  /** Seconds for a balloon to cross the stage, bottom to top. */
  riseSeconds: number;
  /** Share of spawns that are real multiples of the target. */
  multipleShare: number;
  /** True when the target number itself changes partway through the sprint. */
  shifting: boolean;
}

/**
 * The four tiers.
 *
 * LEVEL 4'S SHIFTING IS WHAT MAKES IT HARD, not its table choice. A static
 * target can be answered from a memorised list; a target that changes mid-sprint
 * forces the child to re-read the banner and rebuild the list in working memory
 * while the clock runs. That is why levels 1-3 are single fixed targets and only
 * the last tier moves.
 *
 * FIELD SIZE IS THE DENSITY, AND IT IS BOUNDED BY THE LANE COUNT. These are the
 * caps on how many balloons may be aloft at once, and they were raised (3/4/5/5 to
 * 7/8/10/10) to make the stage feel busy rather than sparse. A `fieldSize` above
 * `LANE_CENTRES.length` would be silently unreachable, because the spawner refuses
 * to place two balloons in one lane - so the lane table has to grow with this one.
 * Ten balloons is the ceiling for that reason.
 */
export const BALLOON_LEVELS: readonly BalloonLevel[] = [
  {
    level: 1,
    title: 'כפולות של 2, 5 ו-10',
    tables: [2, 5, 10],
    fieldSize: 7,
    riseSeconds: 11,
    multipleShare: 0.5,
    shifting: false,
  },
  {
    level: 2,
    title: 'כפולות של 3 ו-4',
    tables: [3, 4],
    fieldSize: 8,
    riseSeconds: 9,
    multipleShare: 0.45,
    shifting: false,
  },
  {
    /*
     * THE FORMER LEVEL 3 AND LEVEL 4 ARE NOW ONE TIER, AND THE MERGE IS FORCED RATHER THAN CHOSEN.
     *
     * There were four rungs here - the fixed 6-9 tier and a fourth "shifting target" tier - because
     * this game levelled itself up on its own wrapping record. The kingdom's ladder has exactly
     * three levels, and `useStationProgress` opens level N+1 only on the third gold at N, so a
     * fourth rung is unreachable: nothing can ever award it, and the padlock the launch card draws
     * for level 3 would be the last one a child could ever open.
     *
     * The shifting behaviour is the interesting half of level 4 and it is what makes this tier a
     * real step up, so it is folded in here rather than dropped: level 3 draws from 6-9 AND moves
     * its target every `TARGET_SWITCH_SECONDS`, announced by the chime. A child who reaches it gets
     * both the hardest tables and the moving goal, which is a harder rung than the old level 3 was.
     *
     * The docs above still describe 1-3 fixed / last moving, which this preserves exactly - it is
     * the last tier that moves, now that there are three of them.
     */
    level: 3,
    title: 'מטרה מתחלפת: 6, 7, 8 ו-9',
    tables: [6, 7, 8, 9],
    fieldSize: 10,
    riseSeconds: 7.5,
    multipleShare: 0.4,
    shifting: true,
  },
];

/** How often the shifting (final) level's target changes, in seconds. */
export const TARGET_SWITCH_SECONDS = 15;

/** Clamps a level number into the table's range. */
export function clampLevel(level: number): number {
  return Math.min(BALLOON_LEVELS.length, Math.max(1, level));
}

/** The tier for a level number, clamped. */
export function balloonLevel(level: number): BalloonLevel {
  return BALLOON_LEVELS[clampLevel(level) - 1]!;
}

/**
 * The tables a level can draw its target from, minus a target already in play.
 *
 * Used by the shifting tier so a switch is always a visible change: re-picking
 * the same table would show no chime-worthy difference and would let a child
 * who never re-read the banner keep scoring.
 */
export function nextTarget(
  level: BalloonLevel,
  current: number,
  random: () => number = Math.random,
): number {
  const options = level.tables.filter((table) => table !== current);
  if (options.length === 0) return current;
  return options[Math.floor(random() * options.length)]!;
}

/**
 * True when a balloon is a real multiple of the round's target.
 *
 * Read from `value` rather than trusting `intent`, because the target can CHANGE
 * while a balloon is mid-flight at level 4. A balloon spawned as a correct
 * multiple of 6 is simply a number once the target becomes 7 - and it has to be
 * graded against the number the child can see on the banner right now, not the
 * one that was true when it spawned.
 */
export function isCorrectPick(balloon: FloatingBalloon, target: number): boolean {
  if (balloon.kind === 'golden') return true;
  if (booleanMask(balloon)) return false;
  return target > 0 && balloon.value % target === 0;
}

/**
 * Placeholder for any future non-numeric balloon kinds.
 *
 * The old game had hazards and nested balloons, both of which are gone - this
 * sprint is deliberately numbers and one golden bonus. Keeping the guard means
 * `isCorrectPick` cannot accidentally treat a decorative balloon as the number 0
 * (which is a multiple of everything) if one is ever reintroduced.
 */
function booleanMask(balloon: FloatingBalloon): boolean {
  return balloon.kind !== 'number' && balloon.kind !== 'golden';
}

/** The final score after a penalty, never below zero. */
export function applyPenalty(score: number): number {
  return Math.max(0, score - WRONG_POP_PENALTY);
}

/** Which level's gold count a promotion leaves behind. */
export function medalsAfterGold(goldMedals: number): number {
  return Math.min(goldMedals + 1, GOLD_MEDALS_PER_LEVEL);
}
