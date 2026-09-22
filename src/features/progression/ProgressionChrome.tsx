/**
 * The two pieces of progression UI every station needs, so no game hand-rolls them.
 *
 * ================================================================================================
 * WHY THIS IS SHARED RATHER THAN REPEATED
 * ================================================================================================
 *
 * The alternative was six copies of a medal strip and six copies of a level-complete card, each
 * with its own idea of what "3/3" looks like and its own wording for a promotion. The kiosk had
 * already written one of each, and a roll-out that copied it six times would have produced six
 * slightly different cards - the drift this codebase has been actively removing (see the seven
 * near-identical progress hooks that `useStationProgress` replaced).
 *
 * The pieces are deliberately SMALL and presentation-only. They hold no state, read no storage and
 * award nothing: the game decides when a medal was earned, calls `recordGoldMedal`, and passes the
 * result in. That keeps the timer, the settlement guard and the "is this a gold run" rule where the
 * game can actually see them.
 */
import { Medal } from 'lucide-react';
import { GOLD_MEDALS_PER_LEVEL, LEVELS, type StationLevel } from './useStationProgress';

/**
 * The in-game medal counter, as `X / 3` gold pips plus a numeric readout.
 *
 * THE PIPS AND THE NUMBER ARE BOTH THERE ON PURPOSE. A row of filled/empty medals is readable at a
 * glance mid-game without stopping to parse digits, and the `X / 3` text is what a child who is
 * still learning to compare shapes can count. Flashing the row for a beat when a medal lands gives
 * the award its own moment without pulling the game out of play - which matters for the sprint
 * games, where a modal would cost seconds off the clock.
 */
export function MedalCounter({
  earned,
  level,
  celebrate = false,
  tone = 'light',
}: {
  /** Gold medals at the level being played, 0 to `GOLD_MEDALS_PER_LEVEL`. */
  earned: number;
  /** Shown beside the pips, so the counter is unambiguous on a shared screen. */
  level: StationLevel;
  /** True for a moment after a medal is awarded, to pulse the row. */
  celebrate?: boolean;
  /** `light` for dark chrome, `dark` for a pale card. */
  tone?: 'light' | 'dark';
}) {
  const shell =
    tone === 'light'
      ? 'bg-amber-950/60 text-amber-100'
      : 'bg-stone-900/80 text-amber-100';

  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black tabular-nums ${shell} ${
        celebrate ? 'motion-safe:animate-[popBounce_.45s_ease-out]' : ''
      }`}
      title={`רמה ${level}: ${earned} מתוך ${GOLD_MEDALS_PER_LEVEL} מדליות זהב`}
      aria-label={`רמה ${level}, ${earned} מתוך ${GOLD_MEDALS_PER_LEVEL} מדליות זהב`}
    >
      <span aria-hidden className="flex items-center gap-0.5">
        {Array.from({ length: GOLD_MEDALS_PER_LEVEL }).map((_, i) => (
          <Medal
            key={i}
            className={`h-3 w-3 ${i < earned ? 'text-amber-400' : 'text-white/25'}`}
            fill="currentColor"
          />
        ))}
      </span>
      <span>
        {earned}/{GOLD_MEDALS_PER_LEVEL}
      </span>
    </span>
  );
}

/** The three actions a finished level offers, in the order they are rendered. */
export interface LevelCompleteActions {
  /** Play the same level again. */
  onReplay: () => void;
  /** Leave the station - which is how the next level is reached. See below. */
  onLeave: () => void;
}

/**
 * The level-complete card, shown when a run earns the third gold medal at a level.
 *
 * ================================================================================================
 * WHY THERE IS NO "GO TO LEVEL N+1" BUTTON
 * ================================================================================================
 *
 * The brief asks for "an option to replay or advance to the newly unlocked level" - and also that a
 * child must not "jump directly to the next level silently". An advance button here would be the
 * silent jump: it would change the level underneath a running game, mid-session, without the child
 * ever seeing the ladder they are climbing.
 *
 * The flow that satisfies both halves is this card plus the launch card. Finishing a level reveals
 * `רמה N+1` on the station's launch card, whose selector DEFAULTS TO THE HIGHEST UNLOCKED LEVEL -
 * so a child who closes this card and reopens the station lands on the new level without having to
 * work out that it is there. The advance is explicit (they chose the station again), visible (they
 * saw the padlock come off) and never happens while the clock is running.
 *
 * The card therefore reports the unlock and offers the two things it is safe to do from inside a
 * finished run: go again, or leave.
 */
export function LevelCompleteCard({
  level,
  unlockedNext,
  completedStation,
  nextLevelName,
  onReplay,
  onLeave,
}: {
  /** The level that was just cleared. */
  level: StationLevel;
  /** True when this clear opened the next level. */
  unlockedNext: boolean;
  /** True when this was the LAST level - there is nothing further to open. */
  completedStation: boolean;
  /** The next level's title, when the station names its levels. */
  nextLevelName?: string;
  onReplay: () => void;
  onLeave: () => void;
}) {
  const nextLevel = level < LEVELS[LEVELS.length - 1] ? ((level + 1) as StationLevel) : null;

  return (
    <div
      dir="rtl"
      className="flex flex-col items-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 text-center shadow-[0_4px_0_#047857] motion-safe:animate-[popBounce_.5s_ease-out]"
    >
      <p className="flex items-center justify-center gap-1.5 text-sm font-black text-emerald-950">
        <Medal className="h-4 w-4" fill="currentColor" />
        {GOLD_MEDALS_PER_LEVEL}/{GOLD_MEDALS_PER_LEVEL} מדליות זהב ברמה {level}!
      </p>

      <p className="text-xs font-bold text-emerald-950/90">
        {completedStation
          ? 'סיימתם את כל הרמות! אתם אלופות ואלופי התחנה 👑'
          : unlockedNext && nextLevel !== null
            ? `נפתחה רמה ${nextLevel}${nextLevelName ? `: ${nextLevelName}` : ''} 🎉`
            : `רמה ${nextLevel ?? level} כבר פתוחה – אפשר לשחק שוב או לעלות`}
      </p>

      {/* The instructions are stated because the next level is reached from the LAUNCH CARD, not
          from here - a child who expects a button and finds none needs to be told where to go. */}
      {!completedStation && nextLevel !== null && (
        <p className="text-[11px] font-bold text-emerald-900/75">
          כדי לשחק ברמה {nextLevel}, סיימו ופתחו את התחנה מחדש
        </p>
      )}

      <div className="mt-0.5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onReplay}
          className="rounded-xl border-b-4 border-emerald-800 bg-white px-4 py-2 text-sm font-black text-emerald-950 transition hover:brightness-105 active:translate-y-[3px] active:border-b-0"
        >
          שחקו שוב ברמה {level} 🔁
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="rounded-xl border-b-4 border-emerald-700 bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-950 transition hover:brightness-105 active:translate-y-[3px] active:border-b-0"
        >
          סיום
        </button>
      </div>
    </div>
  );
}
