/**
 * Shared chrome for every farm station: the live timer/score readout, the
 * start button, the run-over medal card and the practice (untimed) toggle.
 *
 * Stations render their own board and question; this component owns the parts
 * that must look and behave identically everywhere so a child learns one set
 * of controls.
 */
import { Cookie, Pause, Play, RotateCcw, Timer, Trophy } from 'lucide-react';
import type { FarmTimer } from './useFarmTimer';
import { GOLD_SCORE, RUN_SECONDS, medalForScore } from './farmTimerData';

interface FarmTimerHudProps {
  timer: FarmTimer;
  /** Shown above the board while a run has not started yet. */
  readyHint: string;
  /**
   * Optional line shown beside the countdown while running.
   *
   * Optional because the barn board no longer passes one: it was a constant
   * sentence that took a row of the HUD without being read twice. Stations that
   * have something genuinely round-specific to say can still supply it.
   */
  challengeLabel?: string;
  /**
   * The run's length, for the idle readout and the "start" button's copy.
   *
   * DEFAULTS TO THE SHARED `RUN_SECONDS`, so only a station with its own pacing passes it.
   * The barn does, at ten seconds - without this it would print "אתגר 15 שניות" and then
   * deal a ten-second run.
   */
  runSeconds?: number;
}

export function FarmTimerHud({
  timer,
  readyHint,
  challengeLabel,
  runSeconds = RUN_SECONDS,
}: FarmTimerHudProps) {
  const { running, paused, secondsLeft, correct, medal, start, reset, settled } = timer;
  /*
   * A HELD CLOCK IS NOT AN URGENT ONE. `urgent` drives the red pulse, and a paused clock is
   * usually paused because an animation is playing - so letting the pulse keep flashing
   * while the number is frozen would advertise danger at the one moment the child is not
   * losing any time. The hold style takes precedence over the warning.
   *
   * THE THRESHOLD IS A FRACTION, NOT A LITERAL TEN. It used to be a hardcoded `<= 10`, which
   * was right for a fifteen-second default and WRONG the moment a station ran a shorter
   * clock: the barn's ten-second run starts at 10, so the chip would have flashed red from
   * the very first tick and never stopped. Deriving it from the run's own length keeps the
   * warning meaning "the last third" whatever the duration is.
   */
  const held = running && paused;
  const urgent = running && !paused && secondsLeft <= Math.max(3, Math.round(runSeconds / 3));

  /*
   * THE LIVE COOKIE READOUT.
   *
   * Cookies are only actually banked when the run settles, but a child has no way
   * to know what they are playing FOR unless the HUD tells them. This shows the
   * payout they have already secured at their current score, so the number ticks
   * up the moment they cross a medal threshold - which is the reward signal that
   * keeps a 15-second sprint feeling like it is going somewhere.
   *
   * It reads from the same `medalForScore` table the settlement path uses, rather
   * than a parallel formula, so the running figure can never disagree with what
   * the result card ends up paying out.
   */
  const secured = medalForScore(correct).cookies;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span
        className={`flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-black tabular-nums shadow-[0_3px_0_rgba(0,0,0,0.2)] ${
          held
            ? 'bg-sky-500/90 text-white'
            : urgent
              ? 'animate-pulse bg-rose-500 text-white'
              : 'bg-stone-900/70 text-amber-100'
        }`}
        aria-label={
          held ? `הזמן מוקפא, ${secondsLeft} שניות נותרו` : `${secondsLeft} שניות נותרו`
        }
      >
        {/*
          A FROZEN COUNTER NEEDS TO SAY IT IS FROZEN. The barn holds the clock for the whole
          herd walk-in, which can be more than half a fifteen-second run, so the readout
          genuinely sits still for seconds at a time. Left unmarked that is indistinguishable
          from a crashed timer - so a held clock swaps the hourglass for a pause glyph and
          gains a short label, and the number keeps showing the time that REMAINS rather than
          hiding.
        */}
        {held ? <Pause className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
        {/*
          The idle readout must come from RUN_SECONDS, not a literal. It used to be a
          hardcoded '60s', which silently became a lie the moment the round length
          changed - the HUD would have promised a minute and then dealt thirty seconds.
        */}
        {running || settled ? `${secondsLeft}s` : `${runSeconds}s`}
        {held && <span className="text-[10px] font-bold opacity-90">מוקפא</span>}
      </span>

      <span className="flex items-center gap-1.5 rounded-2xl bg-emerald-500 px-3 py-2 text-sm font-black text-white shadow-[0_3px_0_#065f46]">
        <Trophy className="h-4 w-4" />
        <span className="tabular-nums">
          {correct}/{GOLD_SCORE}
        </span>
      </span>

      {/* Cookies secured at the current score. */}
      <span
        className="flex items-center gap-1.5 rounded-2xl bg-amber-400 px-3 py-2 text-sm font-black tabular-nums text-amber-950 shadow-[0_3px_0_#b45309]"
        aria-label={`${secured} עוגיות עד כה`}
      >
        <Cookie className="h-4 w-4" />
        {secured}
      </span>

      {running ? (
        challengeLabel ? (
          <span className="rounded-2xl bg-white/15 px-3 py-2 text-xs font-bold text-white">
            {challengeLabel}
          </span>
        ) : null
      ) : (
        <button
          type="button"
          onClick={settled ? reset : start}
          className="flex items-center gap-1.5 rounded-2xl bg-amber-400 px-4 py-2 text-sm font-black text-amber-950 shadow-[0_4px_0_#b45309] transition active:translate-y-[3px] active:shadow-none"
        >
          {settled ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {settled ? 'סיבוב חדש' : `אתגר ${runSeconds} שניות`}
        </button>
      )}

      {!running && !settled && (
        <p className="w-full text-center text-[11px] font-bold text-amber-100/85">
          {readyHint}
        </p>
      )}

      {medal && <MedalCard medal={medal} correct={correct} />}
    </div>
  );
}

function MedalCard({
  medal,
  correct,
}: {
  medal: FarmTimer['medal'];
  correct: number;
}) {
  if (!medal) return null;
  return (
    <div
      className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b px-3 py-2 text-center text-sm font-black shadow-lg ${medal.tone}`}
    >
      <span aria-hidden className="text-2xl">
        {medal.emoji}
      </span>
      <span>
        מדליית {medal.labelHebrew} · {correct} נכונות
      </span>
      <span className="rounded-full bg-black/15 px-2 py-0.5">+{medal.cookies} 🍪</span>
    </div>
  );
}
