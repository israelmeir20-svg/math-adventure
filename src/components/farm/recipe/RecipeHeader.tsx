/**
 * The status bar for "המתכון של השף".
 *
 * Read-only by design: round, score and remaining seconds. Starting the run is
 * the start overlay's job, so there is no second "start" button competing here.
 *
 * The remaining-seconds chip turns red and pulses under 10 seconds, matching
 * every other farm station - the urgency cue is learned once and reused.
 */
import { Timer, Trophy, Layers } from 'lucide-react';

interface RecipeHeaderProps {
  round: number;
  correct: number;
  secondsLeft: number;
  running: boolean;
  goldScore: number;
  /** District heading, passed in when the game is opened outside the farm hub. */
  titleLine?: string;
}

export default function RecipeHeader({
  round,
  correct,
  secondsLeft,
  running,
  goldScore,
  titleLine,
}: RecipeHeaderProps) {
  const urgent = running && secondsLeft <= 10;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2" dir="rtl">
      {titleLine && (
        <span className="w-full truncate text-center text-base font-black text-amber-900">
          {titleLine}
        </span>
      )}

      <span className="flex items-center gap-1.5 rounded-2xl bg-amber-700 px-3 py-2 text-sm font-black text-white shadow-[0_3px_0_#78350f]">
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
