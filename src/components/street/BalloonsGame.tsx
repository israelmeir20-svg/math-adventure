/**
 * "בלוני הכפולות" - a 45-second sprint of popping multiples.
 *
 * ===================================================================
 * THE ROUND IS A CLOCK, NOT A CHECKLIST.
 * ===================================================================
 *
 * The old game was a finite quest: pop five multiples, the level ends, repeat.
 * That made "wrong" almost free, because a miss cost nothing but a second and the
 * level still finished. Here the finish line is a 45-second deadline, so every
 * second spent on a wrong tap is a second not spent scoring.
 *
 * THE DEADLINE IS STORED, NOT COUNTED. `setInterval` is throttled to roughly 1Hz
 * in a background tab, so a child who tabs away for ten seconds would come back
 * to a clock that only lost one. Storing an absolute deadline and recomputing the
 * remainder means the clock always tells the truth, however long the tab slept.
 *
 * ===================================================================
 * THE STREAK IS THE GAME.
 * ===================================================================
 *
 * Gold needs 2,600 points, and a flat 100 a pop would make that reachable by
 * clicking everything - the +100s arrive as fast as the -75s cancel them. What
 * makes random clicking fail is the streak: the first correct pop pays 100 and
 * every later one pays more, so a run of seventeen is worth far more than
 * seventeen scattered hits. A button-masher loses the 75 AND resets the run,
 * which is why they land on bronze. The arithmetic lives in `balloonSprint.ts`.
 *
 * A FLOAT-OFF COSTS NOTHING AT ALL. A balloon reaching the top unpopped - whether
 * it was a multiple or a distractor - neither scores nor penalises. An earlier
 * version broke the streak on a missed multiple, but that made the run depend on
 * the spawner's layout rather than the child's decisions, and could end a long
 * streak on a balloon they never had a fair chance to read. The streak is broken
 * by exactly one thing now: clicking a wrong number.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flame, SkipForward, Trophy, X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import FloatingBalloonsStage from './FloatingBalloonsStage';
import {
  GOLDEN_COOKIES,
  GOLDEN_POINTS,
  MEDAL_EMOJI,
  MEDAL_LABEL,
  SPRINT_SECONDS,
  TARGET_SWITCH_SECONDS,
  WRONG_POP_PENALTY,
  balloonLevel,
  isCorrectPick,
  medalForScore,
  nextTarget,
  pointsForPop,
  type MedalKind,
} from './balloonSprint';
import {
  GOLD_MEDALS_PER_LEVEL,
  useStationProgress,
  type StationLevel,
} from '../../features/progression/useStationProgress';
import {
  LevelCompleteCard,
  MedalCounter,
} from '../../features/progression/ProgressionChrome';
import type { FloatingBalloon } from './balloonTypes';

/**
 * Cookies paid for finishing a sprint, on top of what the score earns.
 *
 * REBALANCED to the shared shape (base 10, +4 per tier) so every timed game in the
 * kingdom pays on the same curve - see the Beat Studio's constants for the reasoning.
 */
const COOKIE_PER_SPRINT = 10;
/** Cookies added per medal tier, so a better run pays more. */
const COOKIE_PER_MEDAL = 4;

/** The key this game's progression is stored under. Matches its `GAME_META` entry. */
const STATION_KEY = 'balloons';

interface BalloonsGameProps {
  /** Closes the street hub. */
  onExit: () => void;
  /** The level chosen on the launch card. */
  level?: StationLevel;
}

const DEFAULT_LEVEL: StationLevel = 1;

export default function BalloonsGame({ onExit, level = DEFAULT_LEVEL }: BalloonsGameProps) {
  const { addCookies } = useGame();
  const feedback = useAnswerFeedback();
  const { progress, recordGoldMedal } = useStationProgress(STATION_KEY);

  const [run, setRun] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [poppedCount, setPoppedCount] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'done'>('playing');
  const [secondsLeft, setSecondsLeft] = useState(SPRINT_SECONDS);
  /**
   * What the medal just did, captured at settlement - see `HopscotchGame` for why the live record
   * cannot answer this.
   */
  const [outcome, setOutcome] = useState<{ unlockedNext: boolean; completedAll: boolean } | null>(
    null,
  );
  const [chime, setChime] = useState(false);

  /** The medals earned at the level being played. */
  const earnedMedals = progress.medals[level];

  /*
   * SCORE AND STREAK ARE MIRRORED IN REFS. The scoring must read the CURRENT
   * streak to price the next pop, but React batches state updates, so reading
   * `streak` inside a handler would see whatever it was when the handler was
   * created. The refs are the synchronous truth and the state is for rendering.
   */
  const scoreRef = useRef(0);
  const streakRef = useRef(0);

  /*
   * THE TARGET IS THE ONE PIECE OF STATE THAT CANNOT BE DERIVED. At levels 1-2 it
   * is fixed for the whole sprint; at level 3 it changes every 15 seconds. Deriving
   * it from the clock would re-pick it on every tick, so it lives in state and is
   * only written by the switch below.
   *
   * IT IS KEYED ON THE PASSED LEVEL, NOT ON A STORED ONE. `balloonLevel` still maps a number to a
   * tier, but the number now comes from the launch card, so the tier is whatever the child chose
   * rather than whatever their furthest-ever run unlocked.
   */
  const tier = useMemo(() => balloonLevel(level), [level]);
  const [target, setTarget] = useState(() => pickTargetFor(level));

  const deadlineRef = useRef(Date.now() + SPRINT_SECONDS * 1000);
  const timers = useRef<number[]>([]);
  /** Guards the end-of-sprint payout so it can only run once per sprint. */
  const settled = useRef(false);
  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  /** Starts (or restarts) everything that a fresh sprint needs. */
  const begin = useCallback((level: number) => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    // The settle guard must be released here, or a second sprint in the same
    // session would never settle and the child would get no payout or medal.
    settled.current = false;
    scoreRef.current = 0;
    streakRef.current = 0;
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setPoppedCount(0);
    setOutcome(null);
    setChime(false);
    setSecondsLeft(SPRINT_SECONDS);
    setTarget(pickTargetFor(level));
    deadlineRef.current = Date.now() + SPRINT_SECONDS * 1000;
    setPhase('playing');
    setRun((current) => current + 1);
  }, []);

  /*
   * The sprint clock. A stored deadline, recomputed on each tick, so a background
   * tab cannot quietly buy the child extra time.
   */
  useEffect(() => {
    if (phase !== 'playing') return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setPhase('done');
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [phase, run]);

  /*
   * Level 3's shifting target. It changes on its own 15-second cadence, independent
   * of the sprint clock, and announces itself with a chime and a banner pulse -
   * without the announcement a child would keep popping the old table and lose the
   * streak to a rule they never saw change.
   */
  const canShift = tier.shifting;
  useEffect(() => {
    if (phase !== 'playing' || !canShift) return;
    const id = window.setInterval(() => {
      setTarget((current) => nextTarget(tier, current));
      setChime(true);
      after(900, () => setChime(false));
    }, TARGET_SWITCH_SECONDS * 1000);
    return () => window.clearInterval(id);
  }, [phase, canShift, tier, run]);

  /** Settles the sprint exactly once, however the clock ran out. */
  useEffect(() => {
    if (phase !== 'done' || settled.current) return;
    settled.current = true;

    const final = scoreRef.current;
    const medal = medalForScore(final);
    if (medal === 'gold') {
      /*
       * A GOLD RUN IS ONE GOLD MEDAL TOWARD THE LEVEL, matching the farm's model: the run is the
       * unit of work, so a sprint that reaches the gold threshold moves the child one third of the
       * way up. Counting individual pops instead would clear a level inside a single 45-second run
       * and leave the ladder with nothing to climb.
       */
      setOutcome(recordGoldMedal(level));
      feedback.celebrate();
    }
    addCookies(COOKIE_PER_SPRINT + (medal ? COOKIE_PER_MEDAL * medalRank(medal) : 0));
    // Read once on the frame the sprint ends; re-running on a dependency change
    // would settle the same round twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /**
   * Grades a tap and reacts.
   *
   * Returns whether the pick was correct, because the stage plays the matching
   * animation - that keeps the shake and the score from ever disagreeing.
   */
  const handlePop = useCallback(
    (balloon: FloatingBalloon): boolean => {
      if (phase !== 'playing') return false;

      if (balloon.kind === 'golden') {
        scoreRef.current += GOLDEN_POINTS;
        setScore(scoreRef.current);
        setPoppedCount((current) => current + 1);
        /*
         * Real cookies, paid on the spot. Deliberately NOT routed through the
         * streak or the score: the golden balloon is meant to be a free gift that
         * can never hurt a run, so it must not depend on - or disturb - the combo
         * the child is building.
         */
        addCookies(GOLDEN_COOKIES);
        feedback.celebrate();
        return true;
      }

      /*
       * THE ONE AND ONLY STREAK BREAK. Clicking a number that is not a multiple of
       * the target is the single event that resets the run - it is the only signal
       * that reflects a decision the child actually made. Balloons drifting away,
       * gaps between spawns, and a momentarily empty field are all deliberately
       * NOT punished; see `handleFloatOff` for why.
       */
      if (!isCorrectPick(balloon, target)) {
        scoreRef.current = Math.max(0, scoreRef.current - WRONG_POP_PENALTY);
        streakRef.current = 0;
        setScore(scoreRef.current);
        setStreak(0);
        feedback(false);
        return false;
      }

      // The bonus is priced off the streak BEFORE this pop, so the first hit of a
      // run pays the flat base and the run pays more as it grows.
      scoreRef.current += pointsForPop(streakRef.current);
      streakRef.current += 1;
      setScore(scoreRef.current);
      setStreak(streakRef.current);
      setBestStreak((current) => Math.max(current, streakRef.current));
      setPoppedCount((current) => current + 1);
      feedback(true);
      return true;
    },
    [phase, target, feedback, addCookies],
  );

  /**
   * A balloon left the top unpopped.
   *
   * THIS NO LONGER TOUCHES THE STREAK. It used to break the streak when an
   * unpopped multiple drifted away, on the theory that it was a missed
   * opportunity. That is wrong for two reasons:
   *
   *   1. The child may never have had a fair chance at it. With a busy field the
   *      balloon could have entered while they were reading a different one, or
   *      been partially hidden behind a neighbour - losing a long streak to a
   *      balloon they never had a realistic shot at is punishing the wrong thing.
   *
   *   2. It made the streak hostage to the SPAWNER rather than the player. A run
   *      would collapse because of how balloons happened to be laid out, which the
   *      child has no control over and cannot even see coming.
   *
   * The streak is now broken by exactly one thing: clicking a wrong number. That
   * is the only event that reflects a decision the child actually made, which is
   * what a streak is supposed to measure.
   *
   * `onFloatOff` is kept as a hook rather than deleted, because the stage still
   * has to report the exit and future rules (a level-end tally, an analytics
   * signal) may want it. It is deliberately a no-op for scoring today.
   */
  const handleFloatOff = useCallback(
    (balloon: FloatingBalloon) => {
      if (phase !== 'playing') return;
      // Intentionally empty: a balloon drifting away never penalises the player.
      void balloon;
    },
    [phase],
  );

  const finalScore = scoreRef.current;
  const medal = medalForScore(finalScore);
  const urgent = secondsLeft <= 10 && phase === 'playing';

  if (phase === 'done') {
    return (
      <RoundSummary
        score={finalScore}
        medal={medal}
        bestStreak={bestStreak}
        poppedCount={poppedCount}
        outcome={outcome}
        level={level}
        earnedMedals={progress.medals[level]}
        onRestart={() => begin(level)}
        onLeave={onExit}
      />
    );
  }

  return (
    <div dir="rtl" className="flex h-full min-h-0 flex-col gap-2">
      {/*
        ONE SLIM BAR, IN THREE ZONES.
        
        Right: level and gold medals. Centre: the objective and the streak, which
        are the two things the child must read while playing. Left: score, clock
        and exit.
        
        The zones are explicit flex children rather than a wrapping row with
        `mx-auto` on the middle chip. That version let the trailing chips fall to a
        second line as soon as the bar ran out of room, which split the clock away
        from the score it belongs with and made the bar two rows tall on a phone.
        The centre zone takes the leftover space and the outer zones stay at their
        natural width, so everything stays on one line.
      */}
      <header className="flex shrink-0 items-center gap-1.5">
        {/* Right: level + medals. */}
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-violet-200 px-2.5 py-1 text-xs font-black text-violet-950">
          רמה {level}
        </span>
        <MedalCounter
          earned={earnedMedals}
          level={level}
          tone="dark"
          celebrate={earnedMedals >= GOLD_MEDALS_PER_LEVEL}
        />

        {/* Centre: the objective, then the streak. */}
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
          <span
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-black transition-all ${
              chime
                ? 'scale-110 bg-amber-400 text-amber-950 shadow-lg motion-safe:animate-[popBounce_.4s_ease-out]'
                : 'bg-rose-200 text-rose-900'
            }`}
          >
            🎯 כפולות של <span className="tabular-nums text-base">{target}</span>!
          </span>

          <span
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black tabular-nums transition-colors ${
              streak > 0 ? 'bg-orange-400 text-orange-950' : 'bg-stone-200 text-stone-500'
            }`}
            aria-label={`רצף ${streak}`}
          >
            <Flame className="h-3.5 w-3.5" strokeWidth={3} />x{streak}
          </span>
        </div>

        {/* Left: score, clock, exit. */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-emerald-200 px-2.5 py-1 text-xs font-black tabular-nums text-emerald-900">
            <Trophy className="h-3.5 w-3.5" strokeWidth={3} />
            {score}
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-black tabular-nums transition-colors ${
              urgent
                ? 'bg-rose-500 text-white motion-safe:animate-[pulseLock_1s_ease-in-out_infinite]'
                : 'bg-indigo-950/80 text-white'
            }`}
          >
            ⏱ {secondsLeft}s
          </span>

          <button
            type="button"
            onClick={onExit}
            aria-label="סגור"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/80 text-stone-600 shadow-[0_2px_0_rgba(0,0,0,0.15)] transition hover:bg-white active:translate-y-[2px] active:shadow-none"
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <FloatingBalloonsStage
          /*
           * The `key` is what actually restarts the field. It remounts the stage
           * on a new sprint, which clears the balloons, the pop markers and every
           * timer in one step - the alternative, resetting each piece of state in
           * an effect, leaves a committed frame holding the last sprint's balloons.
           */
          key={`${run}:${level}`}
          target={target}
          tier={tier}
          paused={false}
          onPop={handlePop}
          onFloatOff={handleFloatOff}
        />

        {chime && (
          <p className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit animate-[rise_.25s_ease-out] rounded-2xl bg-white/95 px-4 py-2 text-sm font-black text-violet-800 shadow-xl">
            <SkipForward className="me-1 inline h-4 w-4" />
            המטרה התחלפה! עכשיו כפולות של {target}
          </p>
        )}
      </div>
    </div>
  );
}

/** Draws a starting target from the level's table list. */
function pickTargetFor(level: number): number {
  const tier = balloonLevel(level);
  if (tier.tables.length === 1) return tier.tables[0]!;
  const options = tier.tables;
  return options[Math.floor(Math.random() * options.length)]!;
}

/** 1 for bronze, 2 for silver, 3 for gold - used to scale the cookie payout. */
function medalRank(medal: MedalKind): number {
  return medal === 'gold' ? 3 : medal === 'silver' ? 2 : 1;
}

/** The end-of-sprint screen: the medal, the numbers, and the level-complete state. */
function RoundSummary({
  score,
  medal,
  bestStreak,
  poppedCount,
  outcome,
  level,
  earnedMedals,
  onRestart,
  onLeave,
}: {
  score: number;
  medal: MedalKind | null;
  bestStreak: number;
  poppedCount: number;
  outcome: { unlockedNext: boolean; completedAll: boolean } | null;
  level: StationLevel;
  earnedMedals: number;
  onRestart: () => void;
  onLeave: () => void;
}) {
  const cleared = earnedMedals >= GOLD_MEDALS_PER_LEVEL;

  return (
    <div
      dir="rtl"
      className="flex h-full min-h-0 flex-col items-center justify-center gap-3 text-center"
    >
      <p className="text-5xl motion-safe:animate-[popBounce_.5s_ease-out]">
        {medal ? MEDAL_EMOJI[medal] : '🎈'}
      </p>
      <p className="text-2xl font-black text-stone-800">{score} נקודות</p>
      <p className="text-sm font-black text-stone-600">
        {medal
          ? `מדליית ${MEDAL_LABEL[medal]}! פוצצתם ${poppedCount} בלונים`
          : `פוצצתם ${poppedCount} בלונים - עוד קצת למדליית ארד!`}
      </p>

      {bestStreak > 0 && (
        <p className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-900">
          הרצף הארוך ביותר: x{bestStreak} 🔥
        </p>
      )}

      {cleared ? (
        <LevelCompleteCard
          level={level}
          unlockedNext={outcome?.unlockedNext ?? false}
          completedStation={outcome?.completedAll ?? false}
          onReplay={onRestart}
          onLeave={onLeave}
        />
      ) : (
        <>
          <MedalCounter earned={earnedMedals} level={level} tone="dark" />
          <p className="max-w-sm text-xs font-bold text-stone-500">
            {medal === 'gold'
              ? `מדליית זהב לרמה ${level}: ${earnedMedals}/${GOLD_MEDALS_PER_LEVEL}`
              : `מדליית זהב לרמה ${level} פותחת את הרמה הבאה`}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onRestart}
              className="rounded-2xl border-b-4 border-rose-700 bg-rose-400 px-4 py-2.5 text-sm font-black text-white transition hover:brightness-105 active:translate-y-[3px] active:border-b-0"
            >
              ספרינט נוסף ⏱
            </button>
            <button
              type="button"
              onClick={onLeave}
              className="rounded-2xl border-b-4 border-stone-400 bg-amber-100 px-4 py-2.5 text-sm font-black text-stone-800 transition hover:brightness-105 active:translate-y-[3px] active:border-b-0"
            >
              חזרה לרחוב
            </button>
          </div>
        </>
      )}
    </div>
  );
}
