/**
 * The end-of-run card for "פיצריית השברים".
 *
 * The medal's own `tone` paints the frame so it matches the other stations, and
 * the scoreboard counts PIZZAS BAKED rather than correct answers - that is the
 * run's objective, and the medal thresholds are read on the same number.
 */
import { Play, RotateCcw, Trophy } from 'lucide-react';
import { GOLD_SCORE, RUN_SECONDS, type FarmMedal } from '../farm/farmTimerData';

interface PizzaResultsProps {
  baked: number;
  medal: FarmMedal;
  rewarded: boolean;
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

export default function PizzaResults({
  baked,
  medal,
  rewarded,
  bestMedalLabel,
  onPlayAgain,
}: PizzaResultsProps) {
  const toGold = Math.max(0, GOLD_SCORE - baked);

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-stone-950/80 p-3">
      <div
        dir="rtl"
        className={`w-full max-w-sm rounded-2xl border-4 border-orange-950/80 bg-gradient-to-b ${medal.tone} px-4 py-4 text-center shadow-[0_10px_0_rgba(0,0,0,0.35)]`}
      >
        <div aria-hidden className="text-5xl">
          {medal.emoji}
        </div>
        <h3 className="mt-1 text-2xl font-black">מדליית {medal.labelHebrew}!</h3>
        <p className="mt-1 text-[13px] font-bold opacity-90">{medal.cheerHebrew}</p>

        <div className="mt-3 rounded-xl bg-orange-950/15 px-3 py-2">
          <p className="flex items-center justify-center gap-1.5 text-sm font-black">
            <Trophy className="h-4 w-4" />
            <span className="tabular-nums">{baked}</span> פיצות נאפו
          </p>
          <p className="text-[11px] font-bold opacity-80">מתוך {RUN_SECONDS} שניות</p>
        </div>

        <p className="mt-2 text-[12px] font-black">
          {rewarded ? `+${medal.cookies} עוגיות נאספו!` : 'העוגיות בדרך...'}
        </p>

        {toGold > 0 && (
          <p className="mt-1 text-[11px] font-bold opacity-80">
            עוד <span className="tabular-nums">{toGold}</span> למדליית זהב 🥇
          </p>
        )}

        {/* The previous best, shown only when it exists - an empty "best: none" line is noise. */}
        {bestMedalLabel && (
          <p className="mt-1 text-[11px] font-black opacity-80">🏅 השיא הקודם: {bestMedalLabel}</p>
        )}

        <button
          type="button"
          onClick={onPlayAgain}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-green-900 bg-gradient-to-b from-lime-300 to-green-600 px-4 py-3 text-lg font-black text-green-950 shadow-[0_5px_0_#14532d] transition active:translate-y-[4px] active:shadow-none"
        >
          <Play className="h-5 w-5" />
          עוד סיבוב
        </button>

        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-bold opacity-75">
          <RotateCcw className="h-3.5 w-3.5" />
          סגרו כדי לחזור לפיצרייה
        </p>
      </div>
    </div>
  );
}
