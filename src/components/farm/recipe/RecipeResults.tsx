/**
 * The end-of-run card for "המתכון של השף".
 *
 * Mirrors the other farm stations: the medal's own `tone` paints the frame, the
 * score is stated plainly, and the cookie line distinguishes "already banked"
 * from "in flight" so the reward never appears twice.
 *
 * Both exits are offered because they mean different things: `עוד סיבוב` starts
 * a fresh 60 seconds, `חזרה למפה` leaves. The exit is only rendered when the
 * game was opened from a map anchor - inside the hub the hub's own header is the
 * way out, and a second exit button there would be a dead end.
 */
import { LogOut, Play, Trophy } from 'lucide-react';
import { GOLD_SCORE, RUN_SECONDS, type FarmMedal } from '../farmTimerData';

interface RecipeResultsProps {
  correct: number;
  medal: FarmMedal;
  /** True once the reward has been handed to the hub. */
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
  onClose?: () => void;
}

export default function RecipeResults({
  correct,
  medal,
  rewarded,
  bestMedalLabel,
  onPlayAgain,
  onClose,
}: RecipeResultsProps) {
  const toGold = Math.max(0, GOLD_SCORE - correct);

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-amber-950/75 p-3">
      <div
        dir="rtl"
        className={`relative w-full max-w-sm rounded-2xl border-4 border-amber-950/80 bg-gradient-to-b ${medal.tone} px-4 py-4 text-center shadow-[0_10px_0_rgba(0,0,0,0.35)]`}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור וחזרה למפה"
            className="absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-xl bg-amber-950/25 text-lg font-black text-white transition hover:bg-amber-950/40 active:translate-y-[2px]"
          >
            ✕
          </button>
        )}

        <div aria-hidden className="text-5xl">
          {medal.emoji}
        </div>
        <h3 className="mt-1 text-2xl font-black">מדליית {medal.labelHebrew}!</h3>
        <p className="mt-1 text-[13px] font-bold opacity-90">{medal.cheerHebrew}</p>

        <div className="mt-3 rounded-xl bg-amber-950/15 px-3 py-2">
          <p className="flex items-center justify-center gap-1.5 text-sm font-black">
            <Trophy className="h-4 w-4" />
            <span className="tabular-nums">{correct}</span> מתכונים נכונים
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

        {/* Secondary tone on purpose: it is the way out, not the thing to do next. */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-amber-950/40 bg-amber-950/10 px-4 py-2 text-sm font-black text-amber-950 transition hover:bg-amber-950/20 active:translate-y-[2px]"
          >
            <LogOut className="h-4 w-4" />
            חזרה למפה
          </button>
        )}
      </div>
    </div>
  );
}
