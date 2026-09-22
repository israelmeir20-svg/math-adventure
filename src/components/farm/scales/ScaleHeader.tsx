/**
 * The status bar for "מאזניים בחווה".
 *
 * Deliberately read-only: it shows the level, the running score and the remaining
 * seconds, and nothing else. Starting the game is the job of the start overlay, so
 * there is no "start challenge" button competing for the child's attention up here.
 *
 * ===================================================================
 * THE STAGE CHIP IS PROGRESS FEEDBACK, NOT A WIN CONDITION.
 * ===================================================================
 *
 * `round` counts puzzles solved and keeps climbing; `stageTarget` is only the point at
 * which the counter stops advertising a goal, so the chip reads `שלב 3` rather than
 * `שלב 7` once the child is past it. The run itself is ended by the clock, never by
 * reaching a stage - see the note in `AnimalScaleGame`.
 *
 * Capping the DISPLAY rather than the run is what keeps the two ideas compatible: the
 * child still sees every solve acknowledged, but the chip never implies that a seventh
 * solve is invalid because "there are only three stages".
 */
import { Timer, Trophy, Layers } from 'lucide-react';

interface ScaleHeaderProps {
  /** 1-based puzzle number in the current run. */
  round: number;
  /** Puzzles balanced so far. */
  correct: number;
  /** Seconds left in the run. */
  secondsLeft: number;
  /** True while the countdown is live. */
  running: boolean;
  /** How many correct answers earn gold. */
  goldScore: number;
  /** The stage count the chip advertises before it stops counting up. */
  stageTarget: number;
}

export default function ScaleHeader({
  round,
  correct,
  secondsLeft,
  running,
  goldScore,
  stageTarget,
}: ScaleHeaderProps) {
  const urgent = running && secondsLeft <= 10;
  const stage = Math.min(round, stageTarget);

  return (
    /*
     * `shrink-0` and a tighter `py` on each pill.
     *
     * The stats bar competes with the arena for the modal's fixed height, and on a short
     * window every pixel it holds is a pixel taken from the scene and the drawer below -
     * where the answer cards and the tilted pans live. Trimming the pills to `py-1` buys
     * the artwork real headroom while keeping the numbers at the same size, and
     * `shrink-0` stops flex from squashing them into an unreadable smear instead.
     *
     * `mb-1` adds a little separation from the scene without spending a full gap on it.
     */
    <div className="mb-1 flex shrink-0 flex-wrap items-center justify-center gap-2" dir="rtl">
      <span className="flex items-center gap-1.5 rounded-2xl bg-sky-500 px-3 py-1 text-sm font-black text-white shadow-[0_3px_0_#075985]">
        <Layers className="h-4 w-4" />
        שלב <span className="tabular-nums">{stage}</span>
      </span>

      <span className="flex items-center gap-1.5 rounded-2xl bg-emerald-500 px-3 py-1 text-sm font-black text-white shadow-[0_3px_0_#065f46]">
        <Trophy className="h-4 w-4" />
        <span className="tabular-nums">
          {correct}/{goldScore}
        </span>
      </span>

      <span
        className={`flex items-center gap-1.5 rounded-2xl px-3 py-1 text-sm font-black tabular-nums shadow-[0_3px_0_rgba(0,0,0,0.2)] ${
          urgent ? 'animate-pulse bg-rose-500 text-white' : 'bg-stone-900/70 text-amber-100'
        }`}
      >
        <Timer className="h-4 w-4" />
        {secondsLeft}s
      </span>
    </div>
  );
}
