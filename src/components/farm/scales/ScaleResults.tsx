/**
 * The end-of-run card for "מאזניים בחווה".
 *
 * Shown once the 60-second clock reaches zero: the medal earned, how many
 * scales were balanced, the cookies and a restart button. Mirrors the barn
 * station's result card so the farm feels like one place.
 */
import type { FarmMedal } from '../farmTimerData';
import { GOLD_SCORE, RUN_SECONDS } from '../farmTimerData';
import { MedalCounter } from '../../../features/progression/ProgressionChrome';
import type { StationLevel } from '../../../features/progression/useStationProgress';

interface ScaleResultsProps {
  correct: number;
  medal: FarmMedal;
  rewarded: boolean;
  /** The station level this run was played at; see `BarnPartyResults` for why it is passed in. */
  level: StationLevel;
  /** Gold medals banked at `level` after this run settled. */
  earnedMedals: number;
  /**
   * The child's best medal at this level from previous runs, if any.
   *
   * MOVED HERE FROM THE START OVERLAY, which used to be the only thing that showed it. Seeing a
   * "previous best" before a run means nothing to act on; beside the medal just earned it is the
   * comparison a child actually makes.
   */
  bestMedalLabel?: string;
  onPlayAgain: () => void;
}

export default function ScaleResults({
  correct,
  medal,
  rewarded,
  level,
  earnedMedals,
  bestMedalLabel,
  onPlayAgain,
}: ScaleResultsProps) {
  const toGold = Math.max(0, GOLD_SCORE - correct);

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-amber-950/55 p-3">
      <div
        dir="rtl"
        className={`w-full max-w-sm rounded-2xl border-4 border-amber-950/80 bg-gradient-to-b ${medal.tone} px-4 py-4 text-center shadow-[0_10px_0_rgba(0,0,0,0.35)]`}
      >
        {/* The station ladder, beside this run's medal: the same 3-medal counter the level
            picker reads, so a gold run visibly moves the child toward the next level. */}
        <div className="mb-2 flex justify-center">
          <MedalCounter earned={earnedMedals} level={level} tone="dark" />
        </div>

        <span aria-hidden className="block text-4xl leading-none">
          {medal.emoji}
        </span>
        <h3 className="mt-1 text-xl font-black">מדליית {medal.labelHebrew}!</h3>
        <p className="mt-0.5 text-[13px] font-bold opacity-90">{medal.cheerHebrew}</p>

        <div className="mt-2 rounded-xl bg-amber-950/15 px-3 py-1.5 text-[12px] font-bold">
          <span className="block">
            ⚖️ {correct} מאזניים אוזנו מתוך {RUN_SECONDS} שניות
          </span>
          <span className="mt-0.5 block">
            🍪 {rewarded ? `+${medal.cookies} עוגיות נאספו!` : 'העוגיות בדרך...'}
          </span>
          {toGold > 0 && (
            <span className="mt-0.5 block opacity-80">עוד {toGold} איזונים למדליית זהב 🥇</span>
          )}
          {/* The previous best, shown only when it exists - an empty "best: none" line is noise. */}
          {bestMedalLabel && (
            <span className="mt-0.5 block opacity-80">🏅 השיא הקודם: {bestMedalLabel}</span>
          )}
        </div>

        <button
          type="button"
          onClick={onPlayAgain}
          className="mt-3 w-full rounded-xl border-b-4 border-amber-950 bg-gradient-to-b from-lime-300 to-green-600 px-4 py-3 text-lg font-black text-green-950 shadow-[0_5px_0_#14532d] transition active:translate-y-[4px] active:shadow-none"
        >
          שחקי שוב ⏱️
        </button>
      </div>
    </div>
  );
}
