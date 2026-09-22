/**
 * Pure data + maths for the farm arcade medal system.
 *
 * Kept free of React so the tier table, the 15-second window and the score ->
 * medal mapping can be unit-tested and reused by every station.
 */

/** The five medal tiers, best first. `id` doubles as the persisted key. */
export type FarmMedalId = 'gold' | 'silver' | 'bronze' | 'star';

export interface FarmMedal {
  id: FarmMedalId;
  emoji: string;
  labelHebrew: string;
  /** Cookies awarded for finishing a run at this tier. */
  cookies: number;
  /** Celebration copy shown on the result card. */
  cheerHebrew: string;
  /** Tailwind classes for the result card frame + badge. */
  tone: string;
}

/** Ordered best -> worst, which is also the best-medal comparison order. */
export const FARM_MEDALS: FarmMedal[] = [
  {
    id: 'gold',
    emoji: '🥇',
    labelHebrew: 'זהב',
    /*
     * The cookie ladder, rebalanced against the sticker economy: the cheapest sticker is
     * 180 cookies, so a gold run is a little over a nineteenth of a purchase. The tiers
     * step 10/7/4/1 rather than the old 15/10/5/1 - the TOP came down to the brief's
     * "single correct action" figure of 10, and the steps below it were spread evenly so
     * a child can still see the ladder in the numbers rather than a flat floor.
     */
    cookies: 10,
    cheerHebrew: 'אלופות ואלופי החווה!',
    tone: 'from-amber-300 to-yellow-500 text-amber-950',
  },
  {
    id: 'silver',
    emoji: '🥈',
    labelHebrew: 'כסף',
    cookies: 7,
    cheerHebrew: 'עבודה מצוינת!',
    tone: 'from-slate-200 to-slate-400 text-slate-900',
  },
  {
    id: 'bronze',
    emoji: '🥉',
    labelHebrew: 'ארד',
    cookies: 4,
    cheerHebrew: 'כל הכבוד, ממשיכים!',
    tone: 'from-orange-300 to-amber-600 text-amber-950',
  },
  {
    id: 'star',
    emoji: '🌟',
    labelHebrew: 'כוכב תרגול',
    cookies: 1,
    cheerHebrew: 'ניסיון ראשון - יאללה עוד סיבוב!',
    tone: 'from-sky-200 to-indigo-300 text-indigo-950',
  },
];

/**
 * Gold 6+/silver 4/bronze 2, star 0.
 *
 * RETUNED FOUR TIMES, AND THE FOURTH IS A CHANGE OF SHAPE RATHER THAN A NUMBER.
 *
 * These began at 6/4/2 against a 60-second window, came down to 4/3/2 when the clock was
 * halved to 30 seconds, then to 3/2/1 against a 15-second window. The pattern is not
 * "halve the clock, halve the numbers": the clock controls how many ROUNDS fit, but a round
 * is not a fixed cost - each begins with the fruit being revealed and takes several seconds
 * of wall clock before it can be answered at all. Cutting the window from 30s to 15s
 * therefore removes far more than half the achievable score.
 *
 * The 3/2/1 ladder was right for the clock and too GENEROUS for the game: gold came out
 * reachable by a competent child with seconds to spare, which makes the top tier a
 * formality rather than a target.
 *
 * THE HARDENED LADDER IS 6/4/2, AND GOLD IS THE REASON. The clock no longer runs while the
 * basket is open, so the inspection window is free for every station that freezes on it;
 * the ladder therefore has to be set against the ANSWERING time, not the raw 15 seconds.
 * Six is roughly the ceiling a fast child can reach once the free windows are excluded, so
 * gold is priced at that ceiling rather than below it.
 *
 * There is deliberately NO "and zero mistakes" clause in this function. It receives only
 * the correct count and has no way to see how many attempts were made - and it is shared
 * with the feeding, night, recipe and stars stations, so widening its signature to accept
 * attempts would retune four games that were not part of this decision. A station that
 * needs a flawless-run rule applies it at its own settlement point, where the attempt
 * count is in scope.
 *
 *   star   0  - tried, did not finish one
 *   bronze 2  - a solid attempt
 *   silver 4  - competent
 *   gold   6  - at the answering-time ceiling, and a real achievement
 */
export function medalForScore(correct: number): FarmMedal {
  if (correct >= 6) return FARM_MEDALS[0]!;
  if (correct >= 4) return FARM_MEDALS[1]!;
  if (correct >= 2) return FARM_MEDALS[2]!;
  return FARM_MEDALS[3]!;
}

/** How many correct answers are needed for the next tier up (for hints). */
export const GOLD_SCORE = 6;

/** Correct answers required for silver, and for bronze. Exported for result copy. */
export const SILVER_SCORE = 4;
export const BRONZE_SCORE = 2;

/**
 * The star game's flawless-run rule, applied at its own settlement point.
 *
 * GOLD IN THE STAR GAME REQUIRES A RUN WITH NO MISTAKES, which no shared threshold can
 * express: `medalForScore` sees only the correct count and has no way to know how many
 * attempts were made, and widening its signature would retune six other stations that were
 * not part of this decision. So the station narrows its own gold - the medal it already
 * earned is DEMOTED one rung when the run was not clean - rather than the shared ladder
 * being changed underneath everyone.
 *
 * THE DEMOTION IS ONE RUNG, NOT TO THE BOTTOM. A child who scored a gold-worthy six with a
 * single fumble did nearly everything right, and dropping them to a practice star would read
 * as punishment rather than as a near miss. One rung says "almost", which is true.
 *
 * Silver and bronze are deliberately left alone: the brief tightens gold, and pushing the
 * lower tiers down as well would leave a struggling child with nothing for a genuine effort.
 */
export function starMedalFor(correct: number, attempts: number): FarmMedal {
  const earned = medalForScore(correct);
  const flawless = attempts === correct;

  if (earned.id === 'gold' && !flawless) {
    // Exactly one rung down the ordered ladder, which is why this indexes FARM_MEDALS
    // rather than hard-coding silver - the order of that array is the ranking.
    return FARM_MEDALS[medalRank(earned.id) + 1] ?? earned;
  }
  return earned;
}

/** Length of a speed-run, in seconds. The default for every station. */
export const RUN_SECONDS = 15;

/**
 * The barn's own run length, which is SHORTER than the shared default.
 *
 * WHY THIS STATION NEEDS ITS OWN NUMBER. `RUN_SECONDS` is read by thirteen files - every
 * farm station, the pizza game, and every start overlay, results card and hub blurb that
 * prints the length in prose. Lowering it globally to shorten one station would silently
 * retune the other six games and rewrite their copy. So the barn's duration is declared
 * here and passed in, rather than the shared constant being moved.
 *
 * TEN SECONDS IS DELIBERATELY TIGHT AND IS ONLY FAIR BECAUSE OF THE FREEZE. A single barn
 * round spends its wall-clock time on the herd animation before the keypad unlocks, and
 * `useFrozenClock` holds the countdown through all of it - so this budget is spent purely
 * on answering, not on watching. See `WhoIsInTheBarnGame` for the freeze, and note that
 * the deliberate consequence is a much harder gold: the ladder in `medalForScore` was
 * priced against a fifteen-second window, and at ten seconds six correct answers is a
 * genuinely difficult target rather than a comfortable one.
 */
export const BARN_RUN_SECONDS = 10;

/**
 * The star game's own run length, shorter than the shared default.
 *
 * WHY THIS STATION NEEDS ITS OWN NUMBER, for the same reason the barn does: `RUN_SECONDS` is
 * read by thirteen files, and lowering it globally to shorten one station would silently
 * retune the other six games and rewrite every piece of prose that prints the length. So the
 * star game declares its own and passes it in.
 *
 * THIRTEEN SECONDS IS THE WHOLE RUN, INCLUDING EVERY ROUND. At roughly 1.2 to 1.8 seconds per
 * round (the answer hold plus the next deal) this fits about six to eight rounds, which is
 * what the ladder in `medalForScore` is priced against: gold needs six correct, so a child at
 * the ceiling has to be quick without being lucky.
 *
 * IT WAS RAISED FROM TEN, TO GIVE THE LOWER LEVELS ROOM. At ten seconds the run frequently
 * ended before round 7, so Level 3 - the mixed, independently-spinning level the ladder builds
 * toward - was something most children never saw. The extra time is spent on the early rounds,
 * which is what makes reaching Level 3 a realistic outcome rather than a prize for only the
 * fastest players.
 *
 * IT IS NOT RAISED FURTHER ON LEVEL 3, AND THAT IS A DELIBERATE DEPARTURE FROM AN EARLIER
 * BRIEF. A run's duration is read ONCE, when `start` runs, and the countdown then runs
 * continuously to zero - so a duration that grew when the child crossed into Level 3 would
 * mean extending a clock already in flight, which `useFarmTimer` explicitly does not do and
 * which would make the gold threshold unreproducible. Level 3 is made harder by its shapes
 * instead, and the time it needs is already accounted for in the fact that reaching it at all
 * requires being fast enough to earn those extra rounds.
 */
export const STAR_RUN_SECONDS = 13;

/** Rank used to keep the *best* medal a player has earned per station. */
export function medalRank(id: FarmMedalId): number {
  return FARM_MEDALS.findIndex((medal) => medal.id === id);
}

/** Returns whichever of two medals is better (closer to gold). */
export function bestMedal(
  a: FarmMedalId | undefined,
  b: FarmMedalId,
): FarmMedalId {
  if (a === undefined) return b;
  return medalRank(a) <= medalRank(b) ? a : b;
}

export function findMedal(id: FarmMedalId): FarmMedal {
  return FARM_MEDALS.find((medal) => medal.id === id) ?? FARM_MEDALS[3]!;
}
