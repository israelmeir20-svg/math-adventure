/**
 * "חקירת המתמטיקה" (Detective Math) - the case orchestrator.
 *
 * THIS FILE OWNS THE RUN AND NOTHING ELSE. It does not draw a grid, build an equation or move
 * a suspect; it decides which of the three stations is on screen, remembers the number the
 * notebook produced, counts the mistakes, and pays out when the case closes. Each station is a
 * component of its own - `Station1Scene`, `Station2Notebook`, `Station3Chase` - so the whole of
 * the game's structure is legible here without any one puzzle's mechanics.
 *
 * THE CASE IS CHOSEN ONCE PER RUN, NOT PER RENDER. `getRandomCase()` is passed to `useState`
 * as a LAZY INITIALISER rather than called inline. Called inline it would re-roll on every
 * render, so the briefing card would show one suspect and the station behind it another - and
 * because the state machine re-renders on every error tap, the case would quietly shuffle
 * itself several times per run.
 *
 * ERRORS ARE COUNTED, NEVER ENFORCED. `onError` increments a number and does nothing else: no
 * lives, no ejection, no restart. That is deliberate - the penalty for a wrong guess is the
 * medal at the end of the case, and a child who is thrown out of a puzzle for guessing will
 * stop guessing and stop learning. The top bar shows the count so the cost is visible while it
 * is still cheap.
 *
 * THE REWARD IS PAID INTO THE GLOBAL COOKIE BALANCE, through the same `addCookies` every other
 * mini-game uses, so a case's winnings are spendable in the shop exactly like any other coins.
 *
 * ================================================================================================
 * THE GAME IS THE VIEWPORT, AND THAT IS A LAYOUT DECISION WITH A REASON
 * ================================================================================================
 *
 * Every station is built around a photograph - the notebook, the tray, the garden bed, the path -
 * and those photographs are the puzzle. A child finds a note on the notebook or a route on the
 * soil by looking at it, so every pixel the chrome takes is a pixel of the thing being searched.
 *
 * So this renders `fixed inset-0` with ONE slim bar and then hands the rest of the screen to the
 * station. There are no cards inside cards: the bar is the only chrome, the station fills what is
 * left, and the photograph inside it is sized from the height actually available (see
 * `PuzzleStage`) rather than from a guessed maximum width.
 *
 * THE CHROME IS LEFT AS A SINGLE BAR RATHER THAN A HEADER PLUS A STATION BANNER. The stations used
 * to repeat their own title and instruction underneath this one, which cost about a fifth of the
 * screen to say the same thing twice. The instruction now lives here, in the bar, and each station
 * draws only its puzzle.
 */
import { useCallback, useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { getRandomCase, suspectSpriteFor, type DetectiveCase } from './caseData';
import Station1Scene from './components/Station1Scene';
import Station2Notebook from './components/Station2Notebook';
import Station3Chase from './components/Station3Chase';

/** Where the run is. `BRIEFING` and `CASE_CLOSED` are the two non-interactive bookends. */
export type DetectiveGameState =
  | 'BRIEFING'
  | 'STATION_1'
  | 'STATION_2'
  | 'STATION_3'
  | 'CASE_CLOSED';

/**
 * How long the briefing card holds before the first station appears.
 *
 * 2.5s IS THE BRIEF, NOT A TUNING KNOB. It has to be long enough to read a title, a suspect
 * name and a badge, and short enough that a child replaying a case they have already seen is
 * not made to wait. It is a constant rather than a literal so the test that drives the state
 * machine can be written against the same number.
 */
export const BRIEFING_MS = 2500;

interface RewardTier {
  cookies: number;
  label: string;
  emoji: string;
  tone: string;
}

/**
 * The cookie ladder, keyed on mistakes.
 *
 * A FLAWLESS CASE IS WORTH TRIPLE A SLOPPY ONE, so the incentive points at care rather than
 * at speed. There is no speed component at all: this game is about working the arithmetic
 * through three times, and a clock would push children toward the first plausible answer -
 * exactly the habit the three stations exist to break.
 *
 * The tiers are checked in order from fewest mistakes, so the first match wins and `2+` needs
 * no upper bound.
 */
const REWARD_TIERS: { maxErrors: number; tier: RewardTier }[] = [
  {
    maxErrors: 0,
    tier: { cookies: 30, label: 'חקירה מושלמת', emoji: '🥇', tone: 'from-amber-300 to-yellow-500 text-amber-950' },
  },
  {
    maxErrors: 1,
    tier: { cookies: 20, label: 'חקירה טובה', emoji: '🥈', tone: 'from-slate-200 to-slate-400 text-slate-900' },
  },
  {
    maxErrors: Number.POSITIVE_INFINITY,
    tier: { cookies: 10, label: 'התיק נסגר', emoji: '🥉', tone: 'from-orange-300 to-amber-600 text-amber-950' },
  },
];

/** The reward for a run with this many mistakes. See `REWARD_TIERS`. */
export function rewardForErrors(errorsCount: number): RewardTier {
  const match = REWARD_TIERS.find((entry) => errorsCount <= entry.maxErrors);
  // The ladder ends in `Infinity`, so a match always exists; the fallback is for the type
  // checker rather than for a reachable state.
  return (match ?? REWARD_TIERS[REWARD_TIERS.length - 1]!).tier;
}

/**
 * Leaves the feature and returns to the town map.
 *
 * OPTIONAL, SO THE GAME STILL MOUNTS WITHOUT IT. Every other mini-game in this app is reached
 * through a modal that always supplies a close handler; the detective office is opened from a
 * map anchor but its `onExit` is also the only way back, and making it required would break any
 * future caller that wants to embed the game without a map behind it. When it is absent the
 * exit button is simply not drawn, rather than rendered as a dead control.
 */
export interface DetectiveGameProps {
  onExit?: () => void;
}

export default function DetectiveGame({ onExit }: DetectiveGameProps = {}) {
  const { addCookies } = useGame();

  const [gameState, setGameState] = useState<DetectiveGameState>('BRIEFING');
  const [currentCase, setCurrentCase] = useState<DetectiveCase>(() => getRandomCase());  /** The unknown handed from station 2 to station 3. Null until the notebook is solved. */
  const [solutionX, setSolutionX] = useState<number | null>(null);
  const [errorsCount, setErrorsCount] = useState(0);

  /**
   * The briefing auto-advances. The timeout is keyed on `gameState` and `currentCase.id`, so
   * replaying re-arms it - and it is cleared on unmount, which is what stops a queued
   * transition from firing into a game the child has already left.
   */
  useEffect(() => {
    if (gameState !== 'BRIEFING') return undefined;
    const id = window.setTimeout(() => setGameState('STATION_1'), BRIEFING_MS);
    return () => window.clearTimeout(id);
  }, [gameState, currentCase.id]);

  const handleError = useCallback(() => {
    setErrorsCount((count) => count + 1);
  }, []);

  const handleStation1Complete = useCallback(() => {
    setGameState('STATION_2');
  }, []);

  const handleStation2Complete = useCallback((x: number) => {
    setSolutionX(x);
    setGameState('STATION_3');
  }, []);

  const handleStation3Complete = useCallback(() => {
    setGameState('CASE_CLOSED');
  }, []);

  const reward = rewardForErrors(errorsCount);

  /**
   * Pays the reward exactly once per closed case.
   *
   * KEYED ON `currentCase.id` RATHER THAN ON THE TRANSITION INTO `CASE_CLOSED`. A state-machine
   * transition can be re-entered - a double render, a remount of the overlay - and paying
   * cookies from a transition is how a reward gets granted twice. The case id is stable for the
   * life of the run and changes only when a new case is loaded, so an effect keyed on it fires
   * once and then goes quiet.
   *
   * It only runs in `CASE_CLOSED`, because that is the earliest the error count is final: the
   * count is still moving while the stations are up.
   */
  useEffect(() => {
    if (gameState !== 'CASE_CLOSED') return;
    addCookies(reward.cookies);
    // `reward.cookies` is derived from `errorsCount`, which cannot change once the case is
    // closed, so the value read here is the final one. Re-listing it as a dependency would
    // re-fire the payout whenever the ladder object was rebuilt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, currentCase.id, addCookies]);

  /**
   * Starts a fresh case.
   *
   * EVERY PIECE OF PER-RUN STATE IS RESET TOGETHER, in one handler. Resetting only some of it
   * is the classic way a replay breaks: a stale `solutionX` would run the new chase against the
   * last case's answer, and a stale error count would price the new case at the old one's
   * penalty. Grouping them makes "what belongs to a run" answerable by reading one function.
   */
  const playNextCase = useCallback(() => {
    setCurrentCase(getRandomCase());
    setSolutionX(null);
    setErrorsCount(0);
    setGameState('BRIEFING');
  }, []);

  const suspectSrc = suspectSpriteFor(currentCase.suspectAsset);

  /**
   * What the bar tells the child to do right now.
   *
   * IT FOLLOWS THE STATE MACHINE, because the instruction that matters changes with the station:
   * during the briefing it is that a case is starting, and once a station is up it is that
   * station's own `instruction`. Reading the config here is what let the stations stop drawing
   * their own banners - the text still exists, it just has one home instead of two.
   */
  const instructionText = (() => {
    switch (gameState) {
      case 'BRIEFING':
        return 'תיק חדש נפתח - שימו לב לחשוד';
      case 'STATION_1':
        return currentCase.station1.instruction;
      case 'STATION_2':
        /*
          STATION 2 HAS NO INSTRUCTION IN THE CASE DATA, so this one is written here rather than
          read. Its config carries only the four counts and the answer - the station teaches a
          single procedure (reduce the balance, then divide) and had no banner of its own because
          the controls below the desk explain each step as it becomes available. One line naming
          the goal is all this bar needs to add, and inventing a case-authored field for it would
          be a schema change for a sentence that is the same in every case.
        */
        return 'צמצמו את שני העמודים עד ש-X נשאר לבד';
      case 'STATION_3':
        return currentCase.station3.instruction;
      case 'CASE_CLOSED':
        return 'התיק נסגר!';
    }
  })();

  return (
    /*
      `fixed inset-0` AND NOT A CARD. The game takes the whole viewport so the station's photograph
      can be as large as the monitor allows - see the file header for why that is the whole point.
      `overflow-hidden` stops a station that overflows during an animation from giving the page a
      scrollbar it cannot use, since the game is already the size of the window.
    */
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-slate-900/95 p-2 md:p-4"
      data-testid="detective-game"
    >
      {/*
        ---- The one bar. Approximately 48px tall, and the only chrome in the feature. ----

        THE THREE GROUPS ARE ORDERED FOR AN RTL READING, which puts the exit on the RIGHT of the
        screen where a Hebrew reader's eye starts - the same corner as the close button on every
        other modal in the app. Marked with `justify-between` rather than explicit order so the
        DOM order stays the logical one (exit, identity, suspect) and the visual order follows the
        document direction.
      */}
      <header
        dir="rtl"
        className="flex h-12 shrink-0 items-center justify-between gap-2 rounded-xl border-2 border-amber-900/30 bg-amber-100/95 px-2 shadow-sm md:gap-3 md:px-3"
      >
        {/* ---- RIGHT (RTL start): back to the map, and the cost so far. ---- */}
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              data-testid="exit-to-map-header"
              className="rounded-lg border-b-2 border-amber-900/30 bg-white px-2.5 py-1.5 text-[11px] font-black text-amber-900 transition hover:bg-amber-50 active:translate-y-[2px] active:border-b-0 md:text-xs"
            >
              חזרה למפה
            </button>
          )}

          <span
            className="flex items-center gap-1 rounded-lg bg-amber-900/10 px-2 py-1.5"
            aria-label={`טעויות: ${errorsCount}`}
            title="טעויות"
          >
            <span aria-hidden className="text-sm">
              🔍
            </span>
            <span
              className="text-sm font-black tabular-nums text-amber-950"
              data-testid="error-count"
            >
              {errorsCount}
            </span>
          </span>
        </div>

        {/* ---- CENTRE: the case, and what to do. Truncates before it wraps, so the bar keeps its
                height on a narrow window instead of growing into the stage. ---- */}
        <div className="min-w-0 flex-1 text-center">
          <p
            className="truncate text-xs font-black leading-tight text-amber-950 md:text-sm"
            data-testid="case-title"
          >
            {currentCase.title}
          </p>
          <p className="truncate text-[10px] font-bold leading-tight text-amber-900/75 md:text-[11px]">
            {instructionText}
          </p>
        </div>

        {/* ---- LEFT (RTL end): who we are looking for, and the way out of the game. ---- */}
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          <span className="flex items-center gap-1.5 rounded-lg bg-amber-900/10 px-1.5 py-1">
            {suspectSrc ? (
              <img
                src={suspectSrc}
                alt=""
                aria-hidden
                className="h-7 w-7 rounded-md border-2 border-amber-900/25 bg-white object-contain"
              />
            ) : (
              <span aria-hidden className="text-base">
                🕵️
              </span>
            )}
            <span className="hidden text-[10px] font-black text-amber-900/80 lg:inline">
              {currentCase.suspectName}
            </span>
          </span>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              aria-label="סגור את משרד החקירות"
              data-testid="exit-to-map-close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-lg font-black leading-none text-slate-700 shadow-[0_2px_0_rgba(0,0,0,0.25)] transition hover:bg-slate-100 active:translate-y-[2px] active:shadow-none"
            >
              ×
            </button>
          )}
        </div>
      </header>

      {/*
        ---- The stage. Everything left after the bar. ----

        `min-h-0` IS LOAD-BEARING. A flex child defaults to `min-height: auto`, which refuses to
        shrink below its content - so a tall station would push the bar off the top instead of
        being constrained to the space below it. It is the difference between "fills the rest of
        the screen" and "grows the screen".

        THIS ELEMENT IS THE POSITIONING CONTEXT for every station's artwork: `PuzzleStage` places
        its fixed-shape box with `absolute inset-0` against it. `relative` here is what keeps that
        box inside the stage area rather than spanning the whole window behind the top bar.
      */}
      <div className="relative mt-2 flex min-h-0 flex-1 flex-col md:mt-3">
        {gameState === 'STATION_1' && (
          <Station1Scene
            config={currentCase.station1}
            onComplete={handleStation1Complete}
            onError={handleError}
          />
        )}

        {gameState === 'STATION_2' && (
          <Station2Notebook
            config={currentCase.station2}
            onComplete={handleStation2Complete}
            onError={handleError}
          />
        )}

        {gameState === 'STATION_3' && solutionX !== null && (
          <Station3Chase
            config={currentCase.station3}
            solutionX={solutionX}
            onComplete={handleStation3Complete}
            onError={handleError}
          />
        )}

        {/*
          A GUARD, NOT A STATION. Reaching station 3 without a `solutionX` means the notebook was
          skipped - which the state machine does not do today, but which a future "skip to chase"
          affordance or a bad reset easily could. Rendering nothing would look like a freeze, so it
          says what is wrong instead.
        */}
        {gameState === 'STATION_3' && solutionX === null && (
          <p className="self-center rounded-2xl bg-rose-100 p-4 text-center text-sm font-black text-rose-900">
            אין פתרון מהמחברת - לא ניתן להתחיל במרדף.
          </p>
        )}

        {/* ---- Briefing. Covers the stage while the suspect is introduced. ---- */}
        {gameState === 'BRIEFING' && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/85 p-4 backdrop-blur-sm">
            <div
              dir="rtl"
              role="status"
              aria-live="polite"
              className="w-full max-w-sm rounded-3xl border-4 border-amber-900/50 bg-gradient-to-b from-amber-100 to-amber-200 p-5 text-center shadow-[0_10px_0_rgba(0,0,0,0.35)] motion-safe:animate-[briefingIn_320ms_ease-out]"
            >
              <p className="text-[11px] font-black uppercase tracking-wide text-amber-900/60">
                תיק חדש נפתח
              </p>
              <h2 className="mt-1 text-2xl font-black text-amber-950">{currentCase.title}</h2>

              {suspectSrc ? (
                <img
                  src={suspectSrc}
                  alt=""
                  aria-hidden
                  className="mx-auto mt-3 h-28 w-28 rounded-2xl border-4 border-amber-900/30 bg-white object-contain motion-safe:animate-[suspectPop_600ms_cubic-bezier(0.34,1.56,0.64,1)]"
                />
              ) : null}

              <p className="mt-3 text-sm font-black text-amber-900">
                החשוד: {currentCase.suspectName}
              </p>
              <p className="mt-1 text-[11px] font-bold text-amber-900/70">
                שלוש תחנות. טעות אחת עולה מדליה.
              </p>
            </div>
          </div>
        )}

        {/* ---- Case closed. The results card, and the only way forward. ---- */}
        {gameState === 'CASE_CLOSED' && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div
              dir="rtl"
              role="status"
              aria-live="polite"
              className={`w-full max-w-sm rounded-3xl border-4 border-slate-950/60 bg-gradient-to-b ${reward.tone} p-5 text-center shadow-[0_10px_0_rgba(0,0,0,0.35)]`}
            >
              <div aria-hidden className="text-5xl motion-safe:animate-[suspectPop_600ms_cubic-bezier(0.34,1.56,0.64,1)]">
                {reward.emoji}
              </div>
              <h2 className="mt-1 text-2xl font-black" data-testid="result-label">
                {reward.label}!
              </h2>
              <p className="mt-1 text-sm font-black opacity-90">
                תפסתם את {currentCase.suspectName}
              </p>

              <div className="mt-3 rounded-xl bg-black/10 px-3 py-2">
                <p className="text-sm font-black">
                  <span className="tabular-nums" data-testid="result-errors">
                    {errorsCount}
                  </span>{' '}
                  טעויות בדרך
                </p>
                <p className="text-[11px] font-bold opacity-80" data-testid="result-cookies">
                  +{reward.cookies} עוגיות
                </p>
              </div>

              <button
                type="button"
                onClick={playNextCase}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-green-900 bg-gradient-to-b from-lime-300 to-green-600 px-4 py-3 text-lg font-black text-green-950 shadow-[0_5px_0_#14532d] transition active:translate-y-[4px] active:shadow-none"
              >
                תיק חדש
              </button>

              {/*
                THE WAY OUT. Secondary to "new case" on purpose: a child who has just solved a
                case is far more likely to want another one than to leave, so the exit is styled
                as the quieter of the two rather than given equal weight. It is still here on the
                victory screen, which is the one place a stuck or finished player looks.
              */}
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  data-testid="exit-to-map"
                  className="mt-2 w-full rounded-2xl border-2 border-black/20 bg-white/30 px-4 py-2.5 text-sm font-black opacity-90 transition hover:bg-white/50 active:translate-y-[2px]"
                >
                  חזרה למפה
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
