/**
 * "חלונות מוארים" / Still Awake: a 30-second memory sprint.
 *
 * NO WHITE CARDS. Every colour here is a night colour - slate, indigo and the
 * amber of a lit window. The prompt, the score and the banner all sit directly on
 * the sky, because a bright panel in a dark room is both ugly and harder to look
 * at. The only opaque surfaces are the tower and the thin top bar.
 *
 * NO SUBMIT BUTTON, AND NO BUTTONS AT ALL. The round evaluates ITSELF the moment
 * the player has tapped as many windows as there were lit ones. That is what makes
 * a 30-second sprint possible: a submit step costs a glance, a reach and a tap on
 * every single round, which in a session this short is most of the game. It also
 * removes a whole class of hesitation - the player cannot stall on "am I sure?",
 * because the game has already moved on.
 *
 * THE CLOCK IS A STORED DEADLINE, NOT A COUNTED TICK. `setInterval` is throttled
 * to about 1Hz in a background tab, so a player who tabs away for ten seconds must
 * come back to a clock that lost ten seconds rather than one. The deadline is
 * absolute, so a throttled interval still lands on the right second.
 *
 * SCORING IS DELIBERATELY ONE-SIDED. A correct round is worth 100 plus 20 per
 * point of streak, and a wrong one costs 50 and zeroes the streak. Gold needs 750,
 * which is only reachable by chaining flawless rounds - the first version of this
 * scored 100 flat, and a player who answered every round in a 30-second session
 * would clear 750 on volume alone, which is not a memory test. The streak term is
 * what makes gold mean "you did not miss".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import BuildingFacade from './BuildingFacade';
import buildingBackdrop from '../../assets/island/building_screen.png';
import {
  BONUS_COOKIE_REWARD,
  buildWindowsRoundForLevel,
  isWindowsMatch,
  windowsBoardForLevel,
  type StationLevel,
} from './bonusRounds';
import {
  COOKIE_PER_MEDAL,
  COOKIE_PER_SESSION,
  GOLD_MEDALS_PER_TIER,
  MEDAL_EMOJI,
  MEDAL_LABEL,
  MEDAL_THRESHOLDS,
  medalForScore,
  medalRank,
  pointsForCorrect,
  POINTS_WRONG,
  useWindowsProgress,
  type MedalKind,
} from './useWindowsProgress';

/** Length of a session. */
const SESSION_SECONDS = 30;
/** How long the green success glow holds before the next tower. */
const NEXT_ROUND_MS = 300;
/** How long the "אופס, לא נורא!" banner is on screen after a mistake. */
const BANNER_MS = 400;
/** Beat between the round starting and the windows waking, so the eye can land. */
const LEAD_IN_MS = 350;

/** Rounds a session must contain at minimum, even at zero score. */
interface StillAwakeProps {
  /**
   * The rung chosen on the launch card: 1, 2 or 3.
   *
   * OPTIONAL SO THE COMPONENT STILL MOUNTS WITHOUT ONE. The tier-driven flow and any older caller
   * pass nothing, and `windowsBoardForLevel` treats a missing level as 1. Defaulting here rather than
   * marking the prop required keeps this a non-breaking change for every existing call site.
   */
  level?: StationLevel;
  onSolved: () => void;
  onClose: () => void;
}

export default function LightedWindowsGame({ level: stationLevel = 1, onSolved, onClose }: StillAwakeProps) {
  const { addCookies } = useGame();
  const feedback = useAnswerFeedback();
  const progress = useWindowsProgress();

  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [session, setSession] = useState<'playing' | 'done'>('playing');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [missed, setMissed] = useState(false);
  const [banner, setBanner] = useState(false);
  const [lit, setLit] = useState(false);
  /** Bumped to deal a fresh pattern. */
  const [deal, setDeal] = useState(0);
  const [promoted, setPromoted] = useState(false);

  /*
   * THE BOARD COMES FROM THE CHOSEN LEVEL, NOT FROM THE PERSISTENT TIER.
   *
   * This is the whole point of wiring the prop through. The tier only decides how hard the game gets
   * over time; the LEVEL is what the child asked for on the card this session, and it has to win. Both
   * the grid and (at level 3) the memorise window are read from `windowsBoardForLevel` so a level-3
   * board cannot accidentally be shown the level-1 look-time.
   */
  const board = useMemo(() => windowsBoardForLevel(stationLevel), [stationLevel]);
  const level = board;
  const showMs = board.showMs;

  const current = useMemo(() => {
    // `deal` is the re-roll trigger; the level is what shapes the board.
    void deal;
    return buildWindowsRoundForLevel(stationLevel).round;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal, stationLevel]);

  const timers = useRef<number[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );
  const after = useCallback((ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  }, []);

  /* ------------------------------- clocks ------------------------------- */

  /** The session clock: an absolute deadline, so throttling cannot drift it. */
  useEffect(() => {
    if (session !== 'playing') return;
    const deadline = Date.now() + SESSION_SECONDS * 1000;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setSession('done');
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [session]);

  /** The memorise window: dark lead-in, then lit for the level's look-time. */
  useEffect(() => {
    if (session !== 'playing') return;
    let cancelled = false;
    const lead = window.setTimeout(() => {
      if (cancelled) return;
      setLit(true);
      const show = window.setTimeout(() => {
        if (!cancelled) setLit(false);
      }, showMs);
      timers.current.push(show);
    }, LEAD_IN_MS);
    timers.current.push(lead);
    return () => {
      cancelled = true;
      window.clearTimeout(lead);
    };
  }, [deal, session, showMs]);

  // The streak is read for scoring through a ref, and the two updates are plain
  // assignments.
  //
  // This MUST NOT be written as `setStreak((value) => { setScore(...); return ... })`.
  // That nests one state update inside another state's updater, and an updater is
  // allowed to run more than once for a single logical update - StrictMode does
  // exactly that in development. The score then advances once per invocation, so a
  // first correct round scored 200 instead of 100.
  const streakRef = useRef(0);

  /* ----------------------------- evaluation ----------------------------- */

  const finish = useCallback(
    (correct: boolean) => {
      if (correct) {
        const earned = pointsForCorrect(streakRef.current);
        streakRef.current += 1;
        setScore((points) => points + earned);
        setStreak(streakRef.current);
        setSolved(true);
        feedback.celebrate();
        addCookies(BONUS_COOKIE_REWARD);
        onSolved();
        // 300ms: long enough for the green flash to register, short enough that a
        // 30-second session still fits the rounds the medal thresholds assume.
        after(NEXT_ROUND_MS, () => {
          setSolved(false);
          setSelected([]);
          setDeal((value) => value + 1);
        });
        return;
      }

      streakRef.current = 0;
      setStreak(0);
      setScore((points) => Math.max(0, points - POINTS_WRONG));
      setMissed(true);
      setBanner(true);
      feedback(false);
      // The banner clears fast, but the miss shading stays for the whole beat so
      // the player can see WHICH windows they got wrong before it wipes.
      after(BANNER_MS, () => setBanner(false));
      after(NEXT_ROUND_MS, () => {
        setMissed(false);
        setSelected([]);
        setDeal((value) => value + 1);
      });
    },
    [addCookies, after, feedback, onSolved],
  );

  const toggle = (index: number) => {
    if (session !== 'playing' || solved || missed || lit) return;
    // Tapping an already-picked window takes it back, so a mis-tap is recoverable
    // up until the moment the round evaluates itself.
    const next = selected.includes(index)
      ? selected.filter((value) => value !== index)
      : [...selected, index];
    setSelected(next);

    // AUTO-EVALUATION: the round resolves the instant the pick count matches the
    // lit count. There is no submit step, by design - see the file header.
    if (next.length === current.pattern.length) {
      finish(isWindowsMatch(current.pattern, next));
    }
  };

  /* ------------------------------ session end ------------------------------ */

  const settled = useRef(false);
  useEffect(() => {
    if (session !== 'done' || settled.current) return;
    settled.current = true;
    if (medalForScore(score) === 'gold') {
      setPromoted(progress.awardGoldMedal());
      feedback.celebrate();
    }
    /*
     * A FLAT, TIERED PAYOUT - NOT A FRACTION OF THE SCORE. See the identical note in
     * HotAirBalloonsGame: `Math.round(score / 50)` paid 0 cookies for a poor run and
     * barely rewarded the skill gradient. Base + per-tier is the shared kingdom shape.
     */
    const sessionMedal = medalForScore(score);
    addCookies(COOKIE_PER_SESSION + (sessionMedal ? COOKIE_PER_MEDAL * medalRank(sessionMedal) : 0));
    onSolved();
    // Reads `score` and `progress` at the moment the clock expires; it must not
    // re-run when their identities change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const restart = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    settled.current = false;
    streakRef.current = 0;
    setSecondsLeft(SESSION_SECONDS);
    setScore(0);
    setStreak(0);
    setSelected([]);
    setSolved(false);
    setMissed(false);
    setBanner(false);
    setLit(false);
    setPromoted(false);
    setDeal((value) => value + 1);
    setSession('playing');
  };

  const medal = medalForScore(score);
  const urgent = secondsLeft <= 10 && session === 'playing';

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl">
      {/*
        THE ISLAND'S OWN ART, AS THE BACKDROP.

        `object-cover` on a full-bleed absolutely-positioned image, with the night gradient kept on top
        as a MULTIPLY-ISH wash rather than replaced. The art is a bright daylight illustration and this
        is a memory game played at night, so the two need reconciling: `cover` fills the frame at any
        aspect, and the translucent indigo wash pulls the brightness down so the gold windows stay the
        brightest thing on screen. Dropping the wash entirely would leave lit windows competing with a
        sunlit sky, which is fatal for a game about noticing which windows are lit.
      */}
      <img
        src={buildingBackdrop}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-indigo-950/75 to-slate-900/85"
      />
      <StarField />
      <span
        aria-hidden
        className="absolute end-4 top-12 text-3xl drop-shadow-[0_0_18px_rgba(226,232,240,0.55)] sm:text-4xl"
      >
        🌙
      </span>

      <div dir="rtl" className="relative flex h-full min-h-0 flex-col gap-1.5 p-2">
        {/* ONE clean bar: level and medals, score and streak, clock, exit. */}
        <header className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-slate-950/60 px-2.5 py-1 text-[11px] font-black text-indigo-100 backdrop-blur-sm">
            רמה {stationLevel}
            <span className="text-indigo-300/50">|</span>
            <span className="tabular-nums">
              {MEDAL_EMOJI.gold} {progress.goldMedals}/{GOLD_MEDALS_PER_TIER}
            </span>
          </span>

          <span className="mx-auto flex items-center gap-1.5">
            <span className="rounded-full bg-slate-950/60 px-2.5 py-1 text-[11px] font-black tabular-nums text-amber-200 backdrop-blur-sm">
              🏆 {score}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-black tabular-nums backdrop-blur-sm transition ${
                streak > 0 ? 'bg-amber-400/25 text-amber-100' : 'bg-slate-950/60 text-slate-500'
              }`}
            >
              🔥 x{streak}
            </span>
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-black tabular-nums backdrop-blur-sm transition-colors ${
              urgent
                ? 'bg-rose-500/90 text-white motion-safe:animate-[pulseLock_1s_ease-in-out_infinite]'
                : 'bg-slate-950/60 text-indigo-100'
            }`}
          >
            ⏱ {secondsLeft}s
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-950/60 text-indigo-100 backdrop-blur-sm transition hover:bg-slate-800/80 active:scale-90"
          >
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        </header>

        {session === 'playing' ? (
          <>
            {/* Prompt or banner - same line, so nothing shifts when they swap. */}
            <p
              className={`flex h-6 shrink-0 items-center justify-center text-center text-sm font-black transition-colors ${
                banner
                  ? 'text-rose-300'
                  : solved
                    ? 'text-emerald-300'
                    : lit
                      ? 'text-amber-200'
                      : 'text-indigo-100'
              }`}
            >
              {banner
                ? 'אופס, לא נורא!'
                : solved
                  ? 'כל הכבוד! 🎉'
                  : lit
                    ? 'שימו לב! ✨'
                    : `הקישו על ${current.count} החלונות המוארים`}
            </p>

            <div className="flex min-h-0 flex-1 items-center justify-center">
              <BuildingFacade
                pattern={current.pattern}
                selected={selected}
                lit={lit}
                reveal={solved}
                wrong={missed}
                missed={missed ? current.pattern.filter((i) => !selected.includes(i)) : []}
                cols={level.cols}
                rows={level.rows}
                disabled={lit || solved || missed}
                onToggle={toggle}
              />
            </div>

            <p className="shrink-0 text-center text-[10px] font-bold text-indigo-200/45">
              {level.cols}×{level.rows} · {current.count} חלונות · {(showMs / 1000).toFixed(2)} שניות זכירה
            </p>
          </>
        ) : (
          <Summary
            score={score}
            medal={medal}
            promoted={promoted}
            tier={progress.tier}
            goldMedals={progress.goldMedals}
            atMaxTier={progress.atMaxTier}
            onRestart={restart}
            onLeave={onClose}
          />
        )}
      </div>
    </div>
  );
}

/** The end-of-session screen: medal, score, and one tap to go again. */
function Summary({
  score,
  medal,
  promoted,
  tier,
  goldMedals,
  atMaxTier,
  onRestart,
  onLeave,
}: {
  score: number;
  medal: MedalKind | null;
  promoted: boolean;
  tier: number;
  goldMedals: number;
  atMaxTier: boolean;
  onRestart: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl motion-safe:animate-[popBounce_.5s_ease-out]">
        {medal ? MEDAL_EMOJI[medal] : '🌙'}
      </p>
      <p className="text-xl font-black text-indigo-50">
        {medal ? `מדליית ${MEDAL_LABEL[medal]}!` : 'הסתיים הזמן!'}
      </p>
      <p className="text-sm font-black tabular-nums text-amber-200">🏆 {score} נקודות</p>

      {promoted ? (
        <p className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-black text-emerald-950 shadow-[0_3px_0_#047857]">
          🎉 שלוש מדליות זהב! עליתם לרמה {tier}
        </p>
      ) : (
        <p className="text-xs font-bold text-indigo-200/70">
          {atMaxTier
            ? `אספתם ${goldMedals}/${GOLD_MEDALS_PER_TIER} מדליות זהב ברמה ${tier} 👑`
            : medal === 'gold'
              ? `מדליית זהב נוספת לרמה ${tier}: ${goldMedals}/${GOLD_MEDALS_PER_TIER}`
              : `עוד ${MEDAL_THRESHOLDS.gold - score} נקודות למדליית זהב 🥇`}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-amber-950 shadow-[0_3px_0_#b45309] transition hover:brightness-105 active:translate-y-[3px] active:shadow-none"
        >
          סבב נוסף ⏱
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-black text-indigo-100 transition hover:bg-slate-700/80 active:translate-y-[3px]"
        >
          סיום
        </button>
      </div>
    </div>
  );
}

/**
 * The star field.
 *
 * Generated once per mount from a cheap deterministic walk rather than
 * `Math.random`, so the sky does not reshuffle on every re-render - a twinkling
 * field that jumps when you tap a window is very distracting.
 */
function StarField() {
  const stars = useMemo(() => {
    const out: { left: number; top: number; size: number; delay: number; dim: number }[] = [];
    let seed = 7;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 46; i += 1) {
      out.push({
        left: next() * 100,
        top: next() * 100,
        size: 1 + next() * 2,
        delay: next() * 4,
        dim: 0.25 + next() * 0.55,
      });
    }
    return out;
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {stars.map((star, index) => (
        <span
          key={index}
          className="absolute rounded-full bg-slate-100 motion-safe:animate-[sparkle_3.5s_ease-in-out_infinite]"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.dim,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
