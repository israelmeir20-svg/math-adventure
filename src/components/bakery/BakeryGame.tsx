/**
 * Cookie Bakery: a 30-second visual multiplication sprint.
 *
 * WHAT THIS REPLACED. The old game alternated two modes - an oven tray of
 * multiplication and a box-packing division puzzle with a stepper for boxes and
 * a second stepper for the chef's remainder - behind a row of stat cards. The
 * stepper round needed two answers typed in and a submit, which is a quiz, not a
 * sprint; and the stat cards were three backdrop-blurred slabs sitting on top of
 * the bakery illustration. Both are gone. Every round is now one tray, one
 * question and one tap, and the only chrome left is a single 40px line.
 *
 * THE CLOCK OWNS THE ROUND, NOT THE COMPONENT MOUNT. The district delimiters
 * (`isOpen`) do not exist in this app - a district is mounted when it is opened
 * and unmounted when it closes - so the round starts on mount and the timer hook
 * cleans itself up on unmount. The interval is driven by a DEADLINE rather than
 * by counting ticks: `setInterval` is throttled to ~1Hz in a background tab and
 * drifts even in the foreground, and a child who tabs away for ten seconds must
 * come back to a clock that lost ten seconds, not one.
 *
 * A WRONG ANSWER COSTS TIME, NOT PROGRESS. Nothing is reset, no streak is broken
 * and the child is never blocked: they get a short wobble and are free to tap
 * again. The only stake is the second they spent, which is what a sprint should
 * cost.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import BakeryTray from './BakeryTray';
import {
  buildQuestion,
  GOLD_SCORE,
  medalFor,
  MEDAL_EMOJI,
  MEDAL_LABEL,
  SPRINT_SECONDS,
  type MedalKind,
  type SprintType,
} from './bakerySprint';
import {
  GOLD_MEDALS_PER_LEVEL,
  useStationProgress,
  type StationLevel,
} from '../../features/progression/useStationProgress';
import { LevelCompleteCard, MedalCounter } from '../../features/progression/ProgressionChrome';

/**
 * The key this game's progression is stored under. Matches its `GAME_META` entry (`cookieBakery`),
 * which is distinct from its district `kind` (`bakery`) - see `DistrictMeta.stationKey`.
 */
const STATION_KEY = 'cookieBakery';

/** Cookies paid per correct tray. */
const COOKIE_PER_TRAY = 3;
/** Cookies paid for a completed round, on top of the per-tray pay. */
const COOKIE_PER_ROUND = 10;
/**
 * How long a correct answer is celebrated before the next tray slides in. The
 * brief asks for under 250ms; this is the whole hand-off, so the green flash and
 * the next question overlap rather than queue.
 */
const ADVANCE_MS = 220;
/** How long a wrong answer wobbles before the child can answer again. */
const WRONG_MS = 380;

interface BakeryGameProps {
  /** Called after each completed 30-second round. */
  onComplete: () => void;
  /** Closes the district, for the header's ✕. */
  onClose: () => void;
  /** The level chosen on the launch card. */
  level?: StationLevel;
}

const DEFAULT_LEVEL: StationLevel = 1;

export default function BakeryGame({
  onComplete,
  onClose,
  level = DEFAULT_LEVEL,
}: BakeryGameProps) {
  const { addCookies } = useGame();
  const feedback = useAnswerFeedback();
  const { progress, recordGoldMedal } = useStationProgress(STATION_KEY);

  const [secondsLeft, setSecondsLeft] = useState(SPRINT_SECONDS);
  const [correct, setCorrect] = useState(0);
  const [round, setRound] = useState<'playing' | 'done'>('playing');
  /** Bumped to deal a new tray; the question itself is derived, never stored. */
  const [deal, setDeal] = useState(0);
  const [lastType, setLastType] = useState<SprintType | undefined>(undefined);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  /** What the medal just did, captured at settlement. */
  const [outcome, setOutcome] = useState<{ unlockedNext: boolean; completedAll: boolean } | null>(
    null,
  );

  /** The medals earned at the level being played. */
  const earnedMedals = progress.medals[level];

  // The tray is a pure function of where we are in the round, so a re-render can
  // never reshuffle the question under a child's finger.
  const question = useMemo(
    () => buildQuestion(level, lastType),
    // `deal` is the re-roll signal; `lastType` and the level are inputs to it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deal, level],
  );

  const timers = useRef<number[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );
  const after = (ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  };

  /** The round clock. A deadline, not a tick count, so it cannot drift. */
  useEffect(() => {
    if (round !== 'playing') return;
    const deadline = Date.now() + SPRINT_SECONDS * 1000;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setRound('done');
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [round]);

  /** Settles the round exactly once, however it was reached. */
  const settled = useRef(false);
  useEffect(() => {
    if (round !== 'done' || settled.current) return;
    settled.current = true;
    const medal = medalFor(correct);
    if (medal === 'gold') {
      setOutcome(recordGoldMedal(level));
      feedback.celebrate();
    }
    addCookies(correct * COOKIE_PER_TRAY + COOKIE_PER_ROUND);
    onComplete();
    // `recordGoldMedal` and `correct` are read, not tracked: this must run on the frame
    // the round ends, not again when a dependent identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const answer = useCallback(
    (optionIndex: number) => {
      if (round !== 'playing') return;
      // LOCK ONLY THE BUTTON THAT WAS JUST ANSWERED, NOT THE WHOLE TRAY.
      //
      // The first version blocked every option for the full 220ms advance
      // window, which silently ATE keystrokes: a child who typed "1" then "2" a
      // tenth of a second later had the "2" dropped on the floor, with the
      // second tap landing on a tray that was already being replaced. A
      // double-score is impossible anyway, because answering changes the question
      // and this callback closes over the one it was built for - so the cost of
      // the old guard was purely lost input.
      if (flashIndex === optionIndex) return;

      if (optionIndex !== question.correctIndex) {
        setWrongIndex(optionIndex);
        feedback(false);
        after(WRONG_MS, () => setWrongIndex(null));
        return;
      }

      setFlashIndex(optionIndex);
      setCorrect((current) => current + 1);
      addCookies(COOKIE_PER_TRAY);
      feedback(true);
      after(ADVANCE_MS, () => {
        setFlashIndex(null);
        setLastType(question.type);
        setDeal((current) => current + 1);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round, flashIndex, question, feedback, addCookies],
  );

  /** 1-4 answer the buttons. Ignored while typing anywhere else on the page. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < question.options.length) {
        event.preventDefault();
        answer(index);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [answer, question.options.length]);

  const restart = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    settled.current = false;
    setSecondsLeft(SPRINT_SECONDS);
    setCorrect(0);
    setWrongIndex(null);
    setFlashIndex(null);
    setOutcome(null);
    setDeal((current) => current + 1);
    setRound('playing');
  };

  const medal = medalFor(correct);
  const urgent = secondsLeft <= 10 && round === 'playing';

  return (
    <div
      dir="rtl"
      className="flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-2xl bg-gradient-to-b from-amber-50/35 to-amber-900/25 p-2"
    >
      {/* ONE slim line: level and medals, clock, bake count, close. */}
      <header className="flex shrink-0 items-center gap-2">
        <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-amber-950/55 px-2.5 py-1 backdrop-blur-sm">
          <span className="truncate text-[11px] font-black text-amber-50">
            רמה {level}: {levelTitle(level)}
          </span>
        </span>
        <MedalCounter
          earned={earnedMedals}
          level={level}
          celebrate={earnedMedals >= GOLD_MEDALS_PER_LEVEL}
        />

        <span
          className={`mx-auto shrink-0 rounded-full px-3 py-1 text-sm font-black tabular-nums transition-colors ${
            urgent
              ? 'bg-rose-500/90 text-white motion-safe:animate-[pulseLock_1s_ease-in-out_infinite]'
              : 'bg-amber-950/55 text-amber-50'
          }`}
        >
          ⏱ {secondsLeft}s
        </span>

        <span className="shrink-0 rounded-full bg-amber-950/55 px-2.5 py-1 text-sm font-black text-amber-50 tabular-nums backdrop-blur-sm">
          🍪 {correct}
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-950/70 text-amber-50 transition hover:bg-amber-950/90 active:scale-90"
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </button>
      </header>

      {round === 'playing' ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
          {/*
            THE CATEGORY BADGE REPLACES THE QUESTION SENTENCE.

            One short phrase and its emoji, sized and spaced to be read at a glance from
            across a counter. The candy question gets a glowing animated border, because it is
            the one question whose subject is not the obvious thing on the tray - every cookie
            looks the same, and the child has to notice the sweets ON them.
          */}
          <div className="flex shrink-0 justify-center">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-lg font-black shadow-md sm:text-xl ${
                question.glowing
                  ? 'bg-fuchsia-600 text-white ring-4 ring-fuchsia-300/80 motion-safe:animate-[glowPulse_1.4s_ease-in-out_infinite]'
                  : 'bg-amber-950/85 text-amber-50 ring-2 ring-amber-200/60'
              }`}
            >
              <span aria-hidden className="text-xl sm:text-2xl">
                {question.icon}
              </span>
              <span>{question.badge}</span>
            </span>
          </div>

          {/* The tray, centred, with the whole remaining height to fill. */}
          <div className="flex min-h-0 flex-1 items-center justify-center py-1">
            <BakeryTray trays={question.trays} candies={question.candies} />
          </div>

          {/* Four tactile buttons. The index is the keyboard shortcut. */}
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
            {question.options.map((option, index) => {
              const isRight = flashIndex === index;
              const isWrong = wrongIndex === index;
              return (
                <button
                  key={`${deal}-${option}`}
                  type="button"
                  onClick={() => answer(index)}
                  className={`relative rounded-xl border-b-4 py-3 transition ${
                    isRight
                      ? 'border-emerald-700 bg-emerald-400 text-emerald-950 motion-safe:animate-[hopSmall_.2s_ease-out]'
                      : isWrong
                        ? 'border-rose-800 bg-rose-300 text-rose-950 motion-safe:animate-[wobble_.38s_ease-in-out]'
                        : 'border-amber-700 bg-amber-100 text-amber-950 hover:brightness-105 active:translate-y-[3px] active:border-b-0'
                  }`}
                >
                  {/*
                    A TABULAR CONTENT ROW, NOT AN ABSOLUTE-POSITIONED BADGE.

                    The shortcut digit used to be a `span` with `ms-1 align-middle` sitting
                    directly against the caption, which meant a MATHS option (`4 × 3`) and its
                    digit (`4`) rendered as one continuous run - "4 × 3  4" reads as a fifth
                    number glued to the equation, which is exactly the reported bug.

                    So the caption and the digit are now separate cells in a ROW, pushed to
                    opposite ends, with the digit in its own fixed-size, low-contrast chip. The
                    digit is no longer adjacent to the maths, and no longer ambiguous with it.
                  */}
                  <span className="flex items-center justify-between gap-2 px-3">
                    <span className="text-xl font-black leading-none tabular-nums">{option}</span>
                    <span
                      aria-hidden
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-amber-950/10 text-[10px] font-bold leading-none text-amber-900/50 tabular-nums"
                    >
                      {index + 1}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <RoundSummary
          correct={correct}
          medal={medal}
          outcome={outcome}
          level={level}
          earnedMedals={progress.medals[level]}
          onRestart={restart}
          onLeave={onClose}
        />
      )}
    </div>
  );
}

function levelTitle(level: number): string {
  return ['שוליית המאפייה', 'עוזרת האופה', 'שפית האופה'][level - 1] ?? '';
}

/**
 * The end-of-round screen. Deliberately small: it reports the medal, pays out,
 * and gets out of the way so the next sprint can start with one tap.
 */
function RoundSummary({
  correct,
  medal,
  outcome,
  level,
  earnedMedals,
  onRestart,
  onLeave,
}: {
  correct: number;
  medal: MedalKind;
  outcome: { unlockedNext: boolean; completedAll: boolean } | null;
  level: StationLevel;
  earnedMedals: number;
  onRestart: () => void;
  onLeave: () => void;
}) {
  const toGold = Math.max(0, GOLD_SCORE - correct);
  const cleared = earnedMedals >= GOLD_MEDALS_PER_LEVEL;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl motion-safe:animate-[popBounce_.5s_ease-out]">{MEDAL_EMOJI[medal]}</p>
      <p className="text-xl font-black text-amber-950">
        מדליית {MEDAL_LABEL[medal]}! אפית {correct} מגשים
      </p>

      {cleared ? (
        <LevelCompleteCard
          level={level}
          unlockedNext={outcome?.unlockedNext ?? false}
          completedStation={outcome?.completedAll ?? false}
          nextLevelName={levelTitle(level + 1)}
          onReplay={onRestart}
          onLeave={onLeave}
        />
      ) : (
        <>
          <MedalCounter earned={earnedMedals} level={level} />
          <p className="text-xs font-bold text-amber-950/70">
            {correct >= GOLD_SCORE
              ? `עוד מדליית זהב לרמה ${level}: ${earnedMedals}/${GOLD_MEDALS_PER_LEVEL}`
              : `עוד ${toGold} מגשים למדליית זהב 🥇`}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onRestart}
              className="rounded-xl border-b-4 border-amber-700 bg-amber-300 px-4 py-2 text-sm font-black text-amber-950 transition hover:brightness-105 active:translate-y-[3px] active:border-b-0"
            >
              ספרינט נוסף ⏱
            </button>
            <button
              type="button"
              onClick={onLeave}
              className="rounded-xl border-b-4 border-stone-500 bg-amber-50/90 px-4 py-2 text-sm font-black text-amber-950 transition hover:brightness-105 active:translate-y-[3px] active:border-b-0"
            >
              סיום
            </button>
          </div>
        </>
      )}
    </div>
  );
}
