/**
 * "קלאס ברחוב" - chalk hopscotch on asphalt.
 *
 * Pick the next multiple of the table to hop forward; eight correct hops reach
 * the finish line. The board is laid out bottom-to-top, so the camera starts
 * anchored on step 1 and pans upward as the player climbs.
 */
import { useMemo, useState } from 'react';
import { PartyPopper, RotateCcw, Trophy } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import ChalkStep from './ChalkStep';
import HopCamera from './HopCamera';
import { buildHopscotchSteps, pickTableFrom, STREET_GAME_COOKIE_REWARD } from './streetRounds';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import {
  useStationProgress,
  type StationLevel,
} from '../../features/progression/useStationProgress';
import {
  LevelCompleteCard,
  MedalCounter,
} from '../../features/progression/ProgressionChrome';

/**
 * The key this game's progression is stored under. Matches its `GAME_META` entry, which is what the
 * launch card reads - a mismatch would mean medals that never light a padlock.
 */
const STATION_KEY = 'hopscotch';

/**
 * Different tables per level, so the ladder is a real difficulty ramp rather than the same board
 * three times. Level 1 stays on the small tables a child meets first; level 3 reaches the 6-9 range.
 */
const TABLES_BY_LEVEL: Record<StationLevel, number[]> = {
  1: [2, 3, 4, 5],
  2: [3, 4, 6, 7],
  3: [6, 7, 8, 9],
};

interface HopscotchGameProps {
  /** Closes the street hub. */
  onExit: () => void;
  /** The level chosen on the launch card. */
  level?: StationLevel;
}

const DEFAULT_LEVEL: StationLevel = 1;

export default function HopscotchGame({ onExit, level = DEFAULT_LEVEL }: HopscotchGameProps) {
  const { addCookies } = useGame();
  const feedback = useAnswerFeedback();
  const { progress, recordGoldMedal } = useStationProgress(STATION_KEY);
  const [seed, setSeed] = useState(0);
  const [step, setStep] = useState(0);
  const [wrongChoice, setWrongChoice] = useState<number | null>(null);
  const [landed, setLanded] = useState<number | null>(null);
  /**
   * What the medal just did, captured at the finish line.
   *
   * READ THE RESULT HERE RATHER THAN THE LIVE RECORD LATER. Once `recordGoldMedal` has fired, the
   * live `progress` already reflects the new count - so a card rendered from it would show "3/3"
   * for a promotion and also for a replay of an already-cleared level, and could not tell the child
   * whether anything new had opened.
   */
  const [outcome, setOutcome] = useState<{ unlockedNext: boolean; completedAll: boolean } | null>(
    null,
  );

  /** The medals earned at the level being played - what the header counter shows. */
  const earnedMedals = progress.medals[level];

  const { table, steps } = useMemo(() => {
    void seed;
    // One table for both the banner and the steps - picking twice could show
    // a different table to the one the steps actually use.
    const nextTable = pickTableFrom(TABLES_BY_LEVEL[level]);
    return { table: nextTable, steps: buildHopscotchSteps(nextTable) };
  }, [seed, level]);

  const finished = step >= steps.length;
  const current = finished ? null : steps[step];
  /** True once this level has its three golds, whether earned now or on an earlier run. */
  const cleared = earnedMedals >= 3;

  const handleChoice = (choice: number) => {
    if (!current || wrongChoice !== null) return;

    if (choice !== current.correct) {
      // Mistake: shake the tapped number and drop the player back one square.
      // The camera follows automatically because it tracks `step`.
      setWrongChoice(choice);
      feedback(false);
      window.setTimeout(() => setWrongChoice(null), 500);
      setStep((current_) => Math.max(0, current_ - 1));
      return;
    }

    // Intermediate hops get step feedback only - no confetti until the end.
    const landedIndex = step;
    setLanded(landedIndex);
    window.setTimeout(() => setLanded(null), 520);

    window.setTimeout(() => {
      const nextStep = step + 1;
      setStep(nextStep);
      if (nextStep >= steps.length) {
        addCookies(STREET_GAME_COOKIE_REWARD);
        // Full celebration only once the finish line is reached.
        feedback.celebrate();
        /*
         * ONE GOLD MEDAL PER COMPLETED BOARD, which is the level's own unit of work. The alternative
         * - a medal per correct hop - would clear a level in a single board and make the ladder
         * meaningless for a game whose whole shape is "cross the street".
         */
        const result = recordGoldMedal(level);
        setOutcome({ unlockedNext: result.unlockedNext, completedAll: result.completedAll });
      }
    }, 380);
  };

  const replay = () => {
    setSeed((current) => current + 1);
    setStep(0);
    setWrongChoice(null);
    setLanded(null);
    setOutcome(null);
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <header className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-300 px-3 py-1 text-sm font-black text-amber-950">
          דלגו בכפולות של {table} עד לקו הסיום!
        </span>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-black tabular-nums text-stone-700">
          {Math.min(step, steps.length)}/{steps.length} 👣
        </span>
        <MedalCounter earned={earnedMedals} level={level} tone="dark" celebrate={cleared} />
        <button
          type="button"
          onClick={replay}
          className="ms-auto flex items-center gap-1 rounded-2xl bg-white px-3 py-1.5 text-xs font-black text-stone-700 shadow-[0_3px_0_rgba(0,0,0,0.25)] transition active:translate-y-[2px] active:shadow-none"
        >
          <RotateCcw className="h-3.5 w-3.5" /> סבב חדש
        </button>
      </header>

      {/* Asphalt pavement. Scrollbars are suppressed everywhere. */}
      <div className="relative flex-1 overflow-hidden rounded-3xl border-4 border-stone-700 bg-slate-800/95">
        {/* Faint chalk scuffs so the surface reads as used pavement. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(115deg, #fff 0 2px, transparent 2px 34px), repeating-linear-gradient(64deg, #fff 0 1px, transparent 1px 52px)',
          }}
        />

        <HopCamera step={step} total={steps.length}>
          {steps.map((hopStep) => (
            <ChalkStep
              key={hopStep.index}
              index={hopStep.index}
              choices={hopStep.choices}
              cleared={hopStep.index < step}
              isCurrent={hopStep.index === step}
              wrongChoice={hopStep.index === step ? wrongChoice : null}
              justLanded={landed === hopStep.index}
              isLast={hopStep.index === steps.length - 1}
              onChoose={handleChoice}
            />
          ))}
        </HopCamera>

        {finished && (
          <div className="absolute inset-0 grid place-items-center bg-emerald-500/25 backdrop-blur-[2px]">
            <div className="animate-[rise_.25s_ease-out] rounded-3xl border-4 border-emerald-400 bg-white px-6 py-5 text-center shadow-2xl">
              <p className="mb-1 flex items-center justify-center gap-2 text-2xl font-black text-emerald-700">
                <Trophy className="h-7 w-7 text-amber-500" /> הגעתם לקו הסיום!
              </p>
              <p className="mb-1 flex items-center justify-center gap-1.5 text-sm font-bold text-stone-600">
                <PartyPopper className="h-4 w-4" /> +{STREET_GAME_COOKIE_REWARD} 🍪
              </p>
              <p className="mb-3 text-xs font-bold text-stone-500">
                דילגתם על כל הכפולות של {table}
              </p>

              {/*
                THE LEVEL-COMPLETE CARD REPLACES THE TWO PLAIN BUTTONS ON THE THIRD GOLD, and keeps
                the same two actions it did before. That matters here more than in a sprint game: a
                board that ends has nowhere to put a "next level" prompt of its own, so reusing this
                card means the promotion is announced in the one moment the child is already stopped
                and looking at the screen.
              */}
              {cleared ? (
                <LevelCompleteCard
                  level={level}
                  unlockedNext={outcome?.unlockedNext ?? false}
                  completedStation={outcome?.completedAll ?? false}
                  onReplay={replay}
                  onLeave={onExit}
                />
              ) : (
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={replay}
                    className="rounded-2xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-emerald-950 shadow-[0_4px_0_#047857] transition active:translate-y-[3px] active:shadow-none"
                  >
                    שחקו שוב
                  </button>
                  <button
                    type="button"
                    onClick={onExit}
                    className="rounded-2xl bg-amber-300 px-4 py-2.5 text-sm font-black text-amber-950 shadow-[0_4px_0_#b45309] transition active:translate-y-[3px] active:shadow-none"
                  >
                    חזרה לרחוב
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
