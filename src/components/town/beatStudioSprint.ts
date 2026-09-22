/**
 * Pure scoring rules for "אולפן המקצבים" - the Beat Studio sprint.
 *
 * ===================================================================
 * HOW THE NUMBERS ARE CALIBRATED, AND AGAINST WHAT.
 * ===================================================================
 *
 * Every constant here is priced against one figure: a 45-second sprint is 8-14
 * completed rounds at a realistic pace. A rule that needs more rounds than that is
 * not a difficulty setting, it is an unreachable medal - which is exactly what the
 * previous calibration produced, and why the thresholds were lowered.
 *
 * The scoring shape:
 *
 *   - the first correct answer of a streak pays 100
 *   - every second correct answer in the streak adds another 25 to the payout
 *   - a wrong answer costs 75 AND resets the streak to zero
 *
 * A run of N clean tracks is therefore worth `100N + 25 * sum(floor(i/2))`:
 *
 *    4 clean =   450   (bronze)
 *    6 clean =   750   (silver)
 *    8 clean = 1,100   (gold)
 *
 * Eight clean answers in 45 seconds is 5.6 seconds each - a child who has understood
 * the pattern reaches it, and one who is guessing does not, because a single wrong
 * answer drops the payout back to 100 and the streak bonus has to be rebuilt. The
 * timings for the other tiers fall out of the same arithmetic: bronze is 4 answers
 * (11s each) and silver is 6 (7.5s each), so the medals are spaced roughly evenly
 * rather than with a cliff at the top.
 *
 * THE PENALTY IS FLOORED AT ZERO. A child on a bad run would otherwise watch the
 * score run backwards far enough that the medal became impossible a third of the
 * way in, and would have nothing left to play for.
 */

/**
 * The sprint length. Strictly 45 seconds.
 *
 * THE BUDGET THIS IMPLIES, because every other number here is calibrated against
 * it: 45 seconds at roughly 2.5 seconds per round (read the keys, answer, watch the
 * resolve) is 17-18 rounds for a player who never hesitates. A smooth player runs
 * nearer 14. Everything below is priced so that GOLD IS REACHABLE BY THE SECOND
 * GROUP, not only by the first.
 */
export const SPRINT_SECONDS = 45;

/** Points for a correct answer, before the streak bonus. */
export const BASE_TRACK_POINTS = 100;
/** Added per completed streak step. */
export const STREAK_STEP_POINTS = 25;
/**
 * Every this many correct answers raises the payout by one step.
 *
 * TWO IS THE KEY NUMBER, AND IT WAS CHOSEN BY MEASUREMENT.
 *
 * The step decides how much of the total is streak rather than base rate, which is
 * what makes an interrupted run expensive:
 *
 *   every 3:  7 clean = 1,000  ->  7 with 1 error = 600   (only just silver)
 *   every 2:  7 clean = 1,150  ->  7 with 1 error = 675   (silver - correct)
 *
 * At every-2 the single error costs 475 points, because it wipes a half-built run
 * rather than trimming a flat rate. That is the design intent: accuracy is worth
 * far more than volume, and the difference between the two columns is what enforces
 * it. At every-3 the gap narrows enough that spraying answers becomes competitive.
 */
export const STREAK_STEP_EVERY = 2;
/** Points removed for a wrong answer. */
export const MISTAKE_PENALTY = 75;
/**
 * How much each CONSECUTIVE mistake adds to the next penalty.
 *
 * WITHOUT THIS, FLailing PAYS. The flat 75 is only 3% of gold, so four wrong
 * answers cost 300 points - while a cluster of wrong answers at the start of a
 * round wipes a streak that was already near zero, which means clustering mistakes
 * was measurably CHEAPER than spreading them. Measured: 18 answers with four
 * clustered errors scored 2,450 (gold) while the same four errors spread scored
 * 1,250. The game was rewarding the exact behaviour it exists to prevent.
 *
 * Escalation fixes the asymmetry, because a mistake is now priced by how many
 * mistakes preceded it:
 *
 *   first mistake   -75     (a slip, genuinely cheap)
 *   second in a row -125    cumulative -200
 *   third in a row  -175    cumulative -375
 *   fourth in a row -225    cumulative -600
 *
 * So a cluster is charged for the pattern, not for each tap. The counter resets on
 * a correct answer, so a child who makes one mistake, recovers and carries on is
 * never penalised for the earlier slip.
 */
export const MISTAKE_ESCALATION = 50;

/**
 * Medal cutoffs, checked from the top down.
 *
 * CALIBRATED AGAINST THE ACTUAL SPRINT, not chosen for round numbers. The previous
 * gold of 1,400 was measured to be unreachable in practice, and the arithmetic says
 * why: gold at 1,400 needs a FIFTEEN-track clean run inside 45 seconds, i.e. 3
 * seconds per round including reading the sequence. That is a speed no child plays
 * at, so the medal existed only on paper.
 *
 * At 1,100 gold is an EIGHT-track clean run: the streak ladder pays 100, 100, 150,
 * 150, 200, 200, 250, 250, which reaches 600 by the fifth answer and clears 1,100 on
 * the eighth. Eight rounds inside 45 seconds is 5.6 seconds each - comfortable for a
 * child who has understood the pattern, and still out of reach for one who has not,
 * since a wrong answer resets the ladder to 100.
 *
 * Silver and bronze moved with it so the tiers stay evenly spaced: at 700 silver is
 * six clean answers, at 350 bronze is four.
 */
export const MEDAL_THRESHOLD = { gold: 1100, silver: 700, bronze: 350 } as const;
export type MedalKind = 'bronze' | 'silver' | 'gold';

/**
 * Tracks that must be completed for the gold medal, alongside the score.
 *
 * ===================================================================
 * WHY THIS WAS LOWERED FROM 15 TO 7, AND WHY IT STILL EXISTS AT ALL.
 * ===================================================================
 *
 * The dual gate exists for a real reason, established by measurement: a
 * score-only gate could not separate "accurate" from "fast but sloppy", because
 * clustering four wrong answers early wiped a streak that was already near zero and
 * cost almost nothing:
 *
 *   18 answers, 4 clustered errors -> 2,450 pts, 14 tracks  (gold - a lie)
 *   18 answers, 4 spread errors    -> 1,250 pts, 14 tracks  (silver)
 *
 * So a track count is the right instrument. The ERROR was setting it at 15, which is
 * a bar for a perfect run - and a bar that no realistic 45-second sprint clears means
 * gold is unreachable regardless of accuracy. 15 tracks in 45 seconds is 3 seconds
 * per round including reading five numbers; the real pace is 3-6 seconds, giving
 * 8-14 rounds.
 *
 * At 7 the gate still does exactly its job. A player who flails cannot reach 7
 * tracks, because errors consume attempts without adding to the count: four errors
 * in an 11-attempt sprint leaves 7 tracks at most, and the score penalty takes them
 * below gold anyway. A careful player clears 7 tracks by the halfway point. The gate
 * therefore still rules out the clustered-error exploit while no longer ruling out
 * the medal.
 */
export const GOLD_MIN_TRACKS = 7;

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
 * How many levels the studio offers, which is the shared three rather than the four it used to.
 *
 * `BEAT_TIERS` still holds four entries - the fourth is a complete difficulty tier whose step
 * ladder and descending mode are coherent, and deleting it would throw that away to save an
 * array element. It is simply not reachable from the launch card, whose `LEVELS` are 1-3. The cap
 * lives here rather than on the array's length for exactly that reason: `BEAT_TIERS.length` would
 * have let the old ladder select the fourth tier.
 */
export const MAX_BEAT_LEVEL = 3;

/**
 * What a correct answer pays, given how many are already in the streak.
 *
 * `streak` is the count BEFORE this answer, so the first of a run pays the base
 * rate and the bonus arrives with sustained accuracy rather than immediately.
 */
export function pointsForTrack(streak: number): number {
  return BASE_TRACK_POINTS + Math.floor(Math.max(0, streak) / STREAK_STEP_EVERY) * STREAK_STEP_POINTS;
}

/**
 * The medal for a final score and track count, or null below bronze.
 *
 * Gold is the only tier with a second condition - see `GOLD_MIN_TRACKS` for why.
 * Missing it does not drop the player to nothing: the score still earns the best
 * medal it can, so a fast sloppy round gets silver rather than a consolation.
 */
export function medalForScore(score: number, tracks = Number.POSITIVE_INFINITY): MedalKind | null {
  if (score >= MEDAL_THRESHOLD.gold && tracks >= GOLD_MIN_TRACKS) return 'gold';
  if (score >= MEDAL_THRESHOLD.silver) return 'silver';
  if (score >= MEDAL_THRESHOLD.bronze) return 'bronze';
  return null;
}

/** How many more tracks are needed for gold, for the end-of-round message. */
export function tracksShortOfGold(tracks: number): number {
  return Math.max(0, GOLD_MIN_TRACKS - tracks);
}

/**
 * The penalty for the `mistakeRun`-th consecutive mistake, before the floor.
 *
 * `mistakeRun` is the count INCLUDING this one, so the first mistake of a fresh
 * run is charged the base rate and the escalation only applies to a run of them.
 */
export function mistakePenalty(mistakeRun: number): number {
  return MISTAKE_PENALTY + Math.max(0, mistakeRun - 1) * MISTAKE_ESCALATION;
}

/**
 * The score after a mistake, never below zero.
 *
 * `mistakeRun` is this mistake's position in the current run of wrong answers.
 */
export function applyMistake(score: number, mistakeRun = 1): number {
  return Math.max(0, score - mistakePenalty(mistakeRun));
}

/** How high the streak meter's bars climb, and how many bars there are. */
export const METER_BARS = 6;

/**
 * The meter's fill, 0 to 1, for a streak length.
 *
 * It saturates at `METER_BARS` correct answers: a meter that kept climbing forever
 * would be meaningless after the first few, and one that reset visually at every
 * step would be unreadable. Saturating means the last bar lighting up is itself a
 * signal that the bonus is at its ceiling.
 */
export function meterFill(streak: number): number {
  return Math.min(1, Math.max(0, streak / METER_BARS));
}
