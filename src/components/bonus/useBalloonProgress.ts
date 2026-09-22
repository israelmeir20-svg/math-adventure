/**
 * Hot Air Balloons' own progress record: which tier the player is on, and how
 * many gold medals they have banked there.
 *
 * A SEPARATE KEY FROM STILL AWAKE'S, DELIBERATELY. Both games live on the same
 * island and share a modal, but they train different things - one is visual
 * memory, this one is impulse control - and a player can be strong at either. A
 * single shared record would mean grinding windows to unlock harder balloons.
 *
 * TIER AND MEDALS ARE WRITTEN TOGETHER, DELIBERATELY. Earning the third gold
 * medal and being promoted is one event. Storing the two fields separately would
 * leave a window where the promotion had landed but the medal reset had not, and
 * a reload inside that window would hand the player a fourth gold medal.
 *
 * This mirrors the kiosk's, bakery's and windows' progress hooks rather than
 * sharing one record with any of them, because all four level up independently.
 */
import { useCallback, useRef, useState } from 'react';

/** Gold medals needed at a tier before the next tier unlocks. */
export const GOLD_MEDALS_PER_TIER = 3;

/** How many tiers the game has. */
export const MAX_BALLOON_TIER = 3;

const STORAGE_KEY = 'math-adventure:balloons-progress:v1';

interface BalloonProgress {
  tier: number;
  goldMedals: number;
}

const FIRST_TIER: BalloonProgress = { tier: 1, goldMedals: 0 };

function clampTier(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.min(MAX_BALLOON_TIER, Math.max(1, n));
}

function clampMedals(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.min(GOLD_MEDALS_PER_TIER - 1, Math.max(0, n));
}

function load(): BalloonProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return FIRST_TIER;
    const parsed = JSON.parse(raw) as Partial<BalloonProgress>;
    return { tier: clampTier(parsed.tier), goldMedals: clampMedals(parsed.goldMedals) };
  } catch {
    // A corrupt record must never keep a player out of the game.
    return FIRST_TIER;
  }
}

function save(progress: BalloonProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* storage is optional - the session still plays, it just will not persist */
  }
}

export interface BalloonProgressHandle {
  /** 1 to 3. */
  tier: number;
  /** 0 to `GOLD_MEDALS_PER_TIER - 1` - banked golds at the current tier. */
  goldMedals: number;
  atMaxTier: boolean;
  /** Banks a gold medal. Returns true when it triggered a tier promotion. */
  awardGoldMedal: () => boolean;
}

export function useBalloonProgress(): BalloonProgressHandle {
  const [progress, setProgress] = useState<BalloonProgress>(load);
  // The hook's own copy, kept in step with the state above.
  //
  // The promotion flag CANNOT come out of the `setProgress` updater: React defers
  // that function, so a value assigned inside it is still stale when the call
  // returns, and the caller would be told "no promotion" on the very session that
  // promoted them. Reading from a ref makes the answer synchronous.
  const latest = useRef(progress);

  const apply = useCallback((next: BalloonProgress) => {
    latest.current = next;
    save(next);
    setProgress(next);
  }, []);

  const awardGoldMedal = useCallback((): boolean => {
    const current = latest.current;
    const medals = current.goldMedals + 1;
    const promoted = medals >= GOLD_MEDALS_PER_TIER && current.tier < MAX_BALLOON_TIER;
    apply(
      promoted
        ? { tier: current.tier + 1, goldMedals: 0 }
        : { tier: current.tier, goldMedals: Math.min(medals, GOLD_MEDALS_PER_TIER - 1) },
    );
    return promoted;
  }, [apply]);

  return {
    tier: progress.tier,
    goldMedals: progress.goldMedals,
    atMaxTier: progress.tier >= MAX_BALLOON_TIER,
    awardGoldMedal,
  };
}

/* ============================= Scoring ============================= */

export const POINTS_CORRECT = 100;
/** Each point of active streak adds this much to a correct answer. */
export const POINTS_PER_STREAK = 25;
export const POINTS_WRONG = 75;

export const MEDAL_THRESHOLDS = { bronze: 600, silver: 1200, gold: 1800 } as const;
export type MedalKind = keyof typeof MEDAL_THRESHOLDS;

/**
 * The cookie payout for a finished session: a flat base for showing up, plus a step per
 * medal tier. Same shape as every other timed game in the kingdom, so no single game is
 * quietly the best cookie-per-minute farm.
 */
export const COOKIE_PER_SESSION = 10;
export const COOKIE_PER_MEDAL = 4;

/** 1 for bronze, 2 for silver, 3 for gold - used to scale the per-medal cookie bonus. */
export function medalRank(medal: MedalKind): number {
  return medal === 'gold' ? 3 : medal === 'silver' ? 2 : 1;
}

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

/** The best medal a score has earned, or null below bronze. */
export function medalForScore(score: number): MedalKind | null {
  if (score >= MEDAL_THRESHOLDS.gold) return 'gold';
  if (score >= MEDAL_THRESHOLDS.silver) return 'silver';
  if (score >= MEDAL_THRESHOLDS.bronze) return 'bronze';
  return null;
}

/** The points a correct answer is worth, given the streak it is extending. */
export function pointsForCorrect(streak: number): number {
  return POINTS_CORRECT + POINTS_PER_STREAK * streak;
}

/**
 * Altitude as a fraction of the climb, 0 to 1.
 *
 * The meter tracks the CURRENT STREAK, not the score. A score meter only ever
 * climbs within a session, so it reads as a progress bar and stops carrying any
 * information once the player is doing well - whereas the streak is the thing
 * that is actually at risk on every balloon, and watching it fall is the feedback
 * that makes a miss land.
 */
export function altitudeForStreak(streak: number): number {
  const CLIMB = 8;
  return Math.max(0, Math.min(1, streak / CLIMB));
}
