/**
 * The status bar for "סל הפיקניק".
 *
 * Read-only by design: round, score and remaining seconds. Starting the run is the
 * start overlay's job, so there is no second "start" button competing up here.
 *
 * The remaining-seconds chip goes red and pulses under 10 seconds, which is the
 * only urgency cue in the game - everything else is deliberately calm, because the
 * pressure the child has to handle is the lid, not the clock.
 */
import { Timer, Trophy, Layers } from 'lucide-react';
import type { ReactNode } from 'react';

interface PicnicHeaderProps {
  round: number;
  correct: number;
  secondsLeft: number;
  running: boolean;
  goldScore: number;
  /** District heading, passed in when the game is opened outside the farm hub. */
  titleLine?: string;
  /**
   * The level being played, shown beside the round chip.
   *
   * PASSED IN RATHER THAN READ FROM A HOOK, because this component is presentation only - `PicnicGame`
   * owns the progression and hands down both the number and the counter below.
   */
  level?: number;
  /** The medal counter, injected so this file stays free of progression imports. */
  medalCounter?: ReactNode;
}

export default function PicnicHeader({
  round,
  correct,
  secondsLeft,
  running,
  goldScore,
  titleLine,
  level,
  medalCounter,
}: PicnicHeaderProps) {
  const urgent = running && secondsLeft <= 10;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2" dir="rtl">
      {titleLine && (
        <span className="w-full truncate text-center text-base font-black text-emerald-900">
          {titleLine}
        </span>
      )}

      {level !== undefined && (
        <span className="flex items-center gap-1.5 rounded-2xl bg-violet-600 px-3 py-2 text-sm font-black text-white shadow-[0_3px_0_#5b21b6]">
          רמה <span className="tabular-nums">{level}</span>
        </span>
      )}

      {medalCounter}

      <span className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-black text-white shadow-[0_3px_0_#065f46]">
        <Layers className="h-4 w-4" />
        שלב <span className="tabular-nums">{round}</span>
      </span>

      <span className="flex items-center gap-1.5 rounded-2xl bg-amber-500 px-3 py-2 text-sm font-black text-white shadow-[0_3px_0_#92400e]">
        <Trophy className="h-4 w-4" />
        <span className="tabular-nums">
          {correct}/{goldScore}
        </span>
      </span>

      <span
        className={`flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-black tabular-nums shadow-[0_3px_0_rgba(0,0,0,0.2)] ${
          urgent ? 'animate-pulse bg-rose-500 text-white' : 'bg-stone-900/70 text-amber-100'
        }`}
      >
        <Timer className="h-4 w-4" />
        {secondsLeft}s
      </span>
    </div>
  );
}
