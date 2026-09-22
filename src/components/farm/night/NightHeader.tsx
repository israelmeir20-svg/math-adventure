/**
 * The status bar for "האסם בלילה".
 *
 * Read-only by design: it shows the round, the running score and the remaining
 * seconds. Starting the run is the start overlay's job, so there is no second
 * "start" button competing up here.
 */
import { Timer, Trophy, Layers } from 'lucide-react';

interface NightHeaderProps {
  /** 1-based puzzle number in the current run. */
  round: number;
  /** Correct answers so far. */
  correct: number;
  /** Seconds left in the run. */
  secondsLeft: number;
  /** True while the countdown is live. */
  running: boolean;
  /** How many correct answers earn gold. */
  goldScore: number;
}

export default function NightHeader({
  round,
  correct,
  secondsLeft,
  running,
  goldScore,
}: NightHeaderProps) {
  const urgent = running && secondsLeft <= 10;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2" dir="rtl">
      <span className="flex items-center gap-1.5 rounded-2xl bg-indigo-500 px-3 py-2 text-sm font-black text-white shadow-[0_3px_0_#312e81]">
        <Layers className="h-4 w-4" />
        שלב <span className="tabular-nums">{round}</span>
      </span>

      <span className="flex items-center gap-1.5 rounded-2xl bg-emerald-500 px-3 py-2 text-sm font-black text-white shadow-[0_3px_0_#065f46]">
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
