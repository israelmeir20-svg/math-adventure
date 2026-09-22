/**
 * "פיצריית השברים" - the 60-second fractions pizzeria.
 *
 * READ THE ORDER, TOP THE PIE, BAKE IT. Every pizza is a race: the goal is to bake
 * as many as the clock allows, so the difficulty ramp and the clock pull in the
 * same direction. The ramp is keyed on pizzas BAKED, not on orders dealt, and
 * starts with picture-scaffolded halves and quarters before moving to eighth-slice
 * pies where a simplified fraction has to be turned into a real number of wedges.
 *
 * THE CHROME IS ONE LINE AND THE PIE IS THE PAGE. Three stacked stat cards used to
 * sit above the board and ate roughly 40% of the vertical budget, which a pie that
 * wants ~360px simply does not have. So the whole header is now a single slim
 * strip - order on the left, three micro-badges on the right - and the pie gets
 * everything else. Nothing that could be a badge is allowed to be a box.
 *
 * THE ORDER TICKET MUST STAY OUT OF `PizzaStage`. It was once a `<div>` inside the
 * stage's `<svg>`, where SVG semantics silently discarded it: a `<div>` under an
 * `<svg>` root is an unknown SVG element, so it never painted. As HTML above the
 * stage it is an ordinary box.
 *
 * THE PIE IS A SQUARE AND THE STAGE IS AN OBLONG. The stage canvas is 800x380 with
 * the pie centred, so on a landscape screen its height binds and the square inside
 * it is comfortably tall. On a portrait or short window the reverse happens and the
 * pie is capped by the stage's width instead; the `w-80 h-80 md:w-96 md:h-96`
 * wrapper is the target, and the stage honours it whenever the viewport allows.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pizza, Star, Timer } from 'lucide-react';
import { useFarmTimer } from '../farm/useFarmTimer';
import type { FarmMedal } from '../farm/farmTimerData';
import {
  useStationProgress,
  type StationLevel,
} from '../../features/progression/useStationProgress';
import {
  LevelCompleteCard,
  MedalCounter,
} from '../../features/progression/ProgressionChrome';
import PizzaStage from './PizzaStage';
import PizzaControls from './PizzaControls';
import PizzaResults from './PizzaResults';
import PieFraction from './PieFraction';
import { useBakeRun } from './useBakeRun';
import { TOPPINGS } from './pizzaTypes';
import { levelForBaked } from './pizzaTiers';

/** The key this game's progression is stored under. Matches its `GAME_META` entry. */
const STATION_KEY = 'pizza';

interface PizzaGameProps {
  onReward: (medal: FarmMedal) => void;
  bestMedalLabel?: string;
  /** The level chosen on the launch card. */
  level?: StationLevel;
}

const DEFAULT_LEVEL: StationLevel = 1;

const BADGE =
  'flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums';
const GOAL = 6;

export default function PizzaGame({
  onReward,
  bestMedalLabel,
  level = DEFAULT_LEVEL,
}: PizzaGameProps) {
  const { progress, recordGoldMedal } = useStationProgress(STATION_KEY);
  /** The medals earned at the level being played. */
  const earnedMedals = progress.medals[level];
  /** What the medal did at settlement. */
  const [outcome, setOutcome] = useState<{ unlockedNext: boolean; completedAll: boolean } | null>(
    null,
  );

  /*
   * THE LAUNCH LEVEL IS A FLOOR ON THE IN-RUN RAMP, NOT A REPLACEMENT FOR IT.
   *
   * `useBakeRun` ramps its own difficulty from `bakedCount` within a single 60-second run - that is
   * the pizzeria's curriculum and it is what makes one run a progression rather than a static quiz.
   * It tops out at its own level 4.
   *
   * The kingdom's ladder is a different axis: it is what the child has unlocked ACROSS runs. Feeding
   * the chosen level straight into `useBakeRun` would either flatten that in-run ramp or need its
   * four-rung scale rewritten to three. So the chosen level sets the FLOOR the run starts at and the
   * in-run ramp climbs from there - picking level 3 opens on the conversion recipes and still lets a
   * strong run reach the mastery ones. The two ramps compose instead of competing.
   */
  const startTier = useMemo(() => levelForBaked((level - 1) * 3), [level]);

  /** A gold run, bridged so the farm's own payout and board still fire. */
  const handleReward = useCallback(
    (medal: FarmMedal) => {
      onReward(medal);
      if (medal.id === 'gold') setOutcome(recordGoldMedal(level));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onReward, level],
  );

  const timer = useFarmTimer(handleReward);
  const run = useBakeRun({
    running: timer.running,
    settled: timer.settled,
    onScore: timer.score,
    onMiss: timer.miss,
    tierOffset: startTier,
  });

  /**
   * THE RUN STARTS ITSELF, BECAUSE THE RULES ARE NOW READ ON THE LAUNCH CARD.
   *
   * This station used to gate the clock behind a start overlay stating the rules and the run length.
   * The card that opens the station now carries Teacher Tamar's tip and the task, so the overlay was a
   * second reading screen between the child and their first question - and the only thing it still did
   * was call `timer.start`.
   *
   * THE EFFECT STARTS THE CLOCK ONCE. `start` is idempotent while running, but the guard is about the
   * PLAY AGAIN path rather than double-starts: the results card calls `reset()` and then `start()`,
   * which leaves `timer.running` false for one commit, and re-firing here would race that explicit
   * restart.
   *
   * `timer.start` IS STABLE - `useFarmTimer` wraps it in `useCallback` with no dependencies - so the
   * dependency array is honest rather than a suppressed lint.
   */
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    timer.start();
  }, [timer.start]);

  // Keyboard: 1-4 choose a topping, Space bakes. Enter is deliberately excluded,
  // because Enter is the "confirm" reflex on a focused button and would let a
  // child tabbing through the tray fire the oven by accident.
  useEffect(() => {
    if (!timer.running || timer.settled) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === 'Space') {
        // Space scrolls the page by default and would drag the board around.
        event.preventDefault();
        run.bake();
        return;
      }
      const topping = TOPPINGS.find((item) => item.key === event.key);
      if (topping) run.select(topping.id);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [run, timer.running, timer.settled]);

  const showing = run.order.requirements;
  /**
   * The tier the RUN has climbed to, from its own `baked` count.
   *
   * NAMED `runTier` RATHER THAN `level`, because `level` is now the STATION level from the launch
   * card and the two are different axes. They were briefly both called `level` here, which silently
   * shadowed the prop and would have shown the child's in-run tier where the station level belongs.
   */
  const runTier = levelForBaked(run.baked + startTier);

  return (
    <div className="relative flex h-full max-h-[90vh] select-none flex-col gap-1.5 overflow-hidden px-1 py-1">
      {/* THE WHOLE HEADER, in one strip: the order on the left, then the three
          things worth glancing at. Nothing here is a card. */}
      <div
        dir="rtl"
        className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border-2 border-amber-300 bg-orange-50 px-2 py-1 shadow-[0_2px_0_rgba(0,0,0,0.22)]"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[13px] font-black text-amber-950">פיצריית השברים</span>
          <span className="text-base font-black text-amber-700">·</span>
          <span className="text-[13px] font-black text-amber-950">הזמנה:</span>
          {showing.map((requirement, index) => (
            <div key={requirement.toppingId} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-base font-bold text-amber-700">+</span>}
              <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5">
                {/* The diagram and the numerals are one idea at level 1, so they
                    are rendered as one chip; it is withdrawn from level 2 on. */}
                {requirement.showVisualScaffold && (
                  <PieFraction
                    filled={requirement.requiredSlices}
                    total={run.order.totalSlices}
                  />
                )}
                {/*
                  THE SPOKEN NAME SITS IMMEDIATELY LEFT OF THE NUMERALS, and that
                  adjacency is the whole point of the nesting. In an RTL row a bare
                  Hebrew word, an LTR numeral island and a Hebrew word lay out as
                  name, numeral, name - so "חצי" and "זיתים" end up at opposite ends
                  of the chip with the fraction stranded between them, and it reads
                  as if "חצי" belongs to the previous line. Wrapping the name and
                  the fraction in ONE `dir="ltr"` span makes that pair a single
                  left-to-right run, so the chip reads חצי (1/2) זיתים.
                */}
                <span dir="ltr" className="flex items-baseline gap-1 whitespace-nowrap">
                  <span className="text-sm font-bold text-stone-800">
                    {requirement.hebrewFraction}
                  </span>
                  <span className="font-mono text-xl font-bold text-amber-950">
                    ({requirement.fractionText})
                  </span>
                </span>
                <span className="text-sm font-bold text-stone-800">
                  {TOPPINGS.find((item) => item.id === requirement.toppingId)?.nameHebrew ?? ''}
                </span>
              </div>
            </div>
          ))}
        </div>

        <span className={`${BADGE} bg-stone-900/80 text-amber-100`} title="נשאר זמן">
          <Timer className="h-3 w-3" />
          {timer.secondsLeft}s
        </span>
        <span className={`${BADGE} bg-violet-600 text-white`} title="רמת הפיצרייה">
          <Star className="h-3 w-3" />
          רמה {level} · {runTier}
        </span>
        <MedalCounter
          earned={earnedMedals}
          level={level}
          celebrate={earnedMedals >= 3}
        />
        <span className={`${BADGE} bg-amber-500 text-white`} title="פיצות שנאפו">
          <Pizza className="h-3 w-3" />
          {timer.correct} / {GOAL}
        </span>
      </div>

      {/* The hero: whatever height is left, all of it, goes to the pie. */}
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          className={`flex h-full w-full max-w-2xl items-center justify-center ${
            run.sliding
              ? 'transition-transform duration-200 motion-safe:translate-x-full'
              : 'transition-transform duration-200'
          }`}
        >
          <PizzaStage
            order={run.order}
            placed={run.placed}
            shake={run.shake}
            disabled={!run.live}
            onSliceClick={run.applyTopping}
            className="h-80 w-80 md:h-96 md:w-96"
          />
        </div>
      </div>

      {run.hint && (
        <p className="shrink-0 rounded-2xl bg-rose-500/30 px-3 py-1 text-center text-xs font-black text-rose-50">
          אופס, המתכון לא מדויק! {run.hint}
        </p>
      )}

      <div className="shrink-0">
        <PizzaControls
          selected={run.selected}
          live={run.live}
          onSelect={run.select}
          onBake={run.bake}
        />
      </div>

      {timer.medal && (
        <>
          <PizzaResults
            baked={timer.correct}
            medal={timer.medal}
            rewarded={timer.settled}
            bestMedalLabel={bestMedalLabel}
            onPlayAgain={() => {
              run.restart();
              timer.reset();
              timer.start();
            }}
          />

          {/*
            THE LEVEL-COMPLETE CARD LAYERS OVER THE STATION'S OWN RESULTS CARD, as in the picnic: the
            farm card teaches the MEDAL, this one reports the LEVEL. Both are worth a beat, and folding
            them together would mean rewriting a card this roll-out has no business touching.
          */}
          {earnedMedals >= 3 && (
            <div className="absolute inset-0 z-40 grid place-items-center bg-stone-950/75 p-3">
              <LevelCompleteCard
                level={level}
                unlockedNext={outcome?.unlockedNext ?? false}
                completedStation={outcome?.completedAll ?? false}
                onReplay={() => {
                  setOutcome(null);
                  run.restart();
                  timer.reset();
                  timer.start();
                }}
                /*
                 * THE PIZZERIA HAS NO CLOSE HANDLER OF ITS OWN - the district shell owns the exit -
                 * so "leave" clears the results card rather than pretending to navigate. That is
                 * honest: it returns the child to the station, from which the shell's own
                 * close button is the way out.
                 */
                onLeave={() => {
                  setOutcome(null);
                  run.restart();
                  timer.reset();
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
