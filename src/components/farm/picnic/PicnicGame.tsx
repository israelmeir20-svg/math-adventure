/**
 * Station 6 - "סל הפיקניק" (Picnic Basket).
 *
 * A crate of fruit is shown for a couple of seconds, a cloth drops over it, and the
 * child answers whether a named fruit was the MOST or the LEAST abundant. The skill
 * is subitizing - judging quantity at a glance - and the difficulty comes from how
 * long the look lasts, how close the pile sizes are, and how much of the floor the
 * fruit fills.
 *
 * THE CLOCK IS A TRUE ARCADE CLOCK: IT STARTS ONCE AND NEVER STOPS. From the moment
 * round 1 is dealt, the 60 seconds run continuously - through the inspection window,
 * through the cloth falling, and through every answer's feedback. Nothing pauses it.
 * The per-round windows are therefore SPENT, not free, which is why the feedback hold
 * is short (`WRONG_MS`) and the inspection window is the tier's own budget.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePicnicTimer } from './usePicnicTimer';
import { GOLD_SCORE } from '../farmTimerData';
import {
  useStationProgress,
  type StationLevel,
} from '../../../features/progression/useStationProgress';
import {
  LevelCompleteCard,
  MedalCounter,
} from '../../../features/progression/ProgressionChrome';
import PicnicHeader from './PicnicHeader';
import PicnicGridStage from './PicnicGridStage';
import PicnicControls from './PicnicControls';
import PicnicStatus from './PicnicStatus';
import PicnicResults from './PicnicResults';
import { usePicnicRound } from './usePicnicRound';
import { useInspectionWindow } from './useInspectionWindow';
import { useAnswerAdvance } from '../shared/useAnswerAdvance';
import { useFrozenClock } from '../shared/useFrozenClock';
import { CORRECT_MS, WRONG_MS } from './picnicData';
import type { FarmMedal } from '../farmTimerData';

/**
 * `titleLine` is only supplied when the game is opened straight from its own
 * town-map anchor; inside the hub the list sends nothing extra. Declared here
 * rather than shared, so this file depends on nothing but the medal type.
 */
interface GameProps {
  onReward: (medal: FarmMedal) => void;
  bestMedalLabel?: string;
  titleLine?: string;
  /**
   * Present only when the game is opened straight from its own map anchor. Inside
   * the hub there is no card to escape from, so the results card hides its exit.
   */
  onClose?: () => void;
  /** The level chosen on the launch card. */
  level?: StationLevel;
}

/** The key this game's progression is stored under. Matches its `GAME_META` entry. */
const STATION_KEY = 'picnic';

const DEFAULT_LEVEL: StationLevel = 1;

export default function PicnicGame({
  onReward,
  bestMedalLabel,
  titleLine,
  onClose,
  level = DEFAULT_LEVEL,
}: GameProps) {
  const { progress, recordGoldMedal } = useStationProgress(STATION_KEY);
  /** The medals earned at the level being played. */
  const earnedMedals = progress.medals[level];
  /**
   * What the medal did at settlement.
   *
   * THE REWARD IS BRIDGED RATHER THAN REPLACED. `usePicnicTimer` already owns the payout and hands
   * the tier to `onReward`, so this wraps that callback and adds the level medal on top - the
   * cookie payout and the farm's own best-medal board keep working exactly as they did.
   */
  const [outcome, setOutcome] = useState<{ unlockedNext: boolean; completedAll: boolean } | null>(
    null,
  );

  const handleReward = useCallback(
    (medal: FarmMedal) => {
      onReward(medal);
      /*
       * A GOLD RUN IS ONE GOLD MEDAL TOWARD THE LEVEL, matching the other stations: the RUN is the
       * unit of work, so three gold runs clear a level. The picnic's own flawless rule already
       * demotes a gold earned with a miss before this callback fires, so a sloppy run correctly
       * advances nothing.
       */
      if (medal.id === 'gold') {
        setOutcome(recordGoldMedal(level));
      }
    },
    // `recordGoldMedal` and `level` are stable inputs to the settlement; re-creating this on an
    // unrelated render would not re-fire it, since the timer holds the first reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onReward, level],
  );

  // THE FLAWLESS-GOLD RULE LIVES IN THE WRAPPER, not in the shared ladder. Gold requires
  // six correct with no misses, and `medalForScore` cannot see the miss count. See
  // `usePicnicTimer` for why the demotion happens at settlement rather than in the table.
  const timer = usePicnicTimer(handleReward);
  const round = usePicnicRound();
  const { roundNumber, round: crate, picked, correct, answered, covered, inspectMs, closeLid, pick, deal, phase } = round;

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
   * `timer.start` IS STABLE - `usePicnicTimer` wraps it in `useCallback` with no dependencies - so the
   * dependency array is honest rather than a suppressed lint.
   */
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    timer.start();
  }, [timer.start]);

  // THE INSPECTION WINDOW STILL RUNS, and it is the only thing that shuts the lid: the
  // child gets `inspectMs` to read the crate, and then it is covered whether they are
  // ready or not.
  useInspectionWindow(timer.running ? 'INSPECTING' : 'IDLE', roundNumber, inspectMs, closeLid);

  // THE CLOCK IS HELD STILL WHILE THE CRATE IS OPEN. Reading the basket is the skill this
  // station teaches, so charging the child seconds for it would tax the very thing being
  // measured - and because the window reopens on every round, an un-paused clock would lose
  // `inspectMs` per round rather than once per run.
  //
  // THIS USES THE SHARED `useFrozenClock` RATHER THAN A LOCAL FLAG, so the pause follows the
  // same rule as the other stations: frozen exactly while `isResolving`, resumed on the
  // transition out, and unconditionally resumed whenever the freeze is not active - which is
  // what heals a pause that outlived its cause (a finished run, a remount, a fresh game).
  //
  // KEYED ON THE PHASE, NOT ON `covered`. `covered` is false both before the run starts and
  // while inspecting, so freezing on it would park the clock during the start overlay too.
  // The phase already folds in "has the round been answered", so INSPECTING is precisely the
  // memorisation window and QUESTION is precisely the answering window. The lid shutting is
  // what flips the phase, so the clock resumes the moment it lands.
  useFrozenClock(phase === 'INSPECTING', timer.pause, timer.resume);

  // THE SUBMIT LOCK LIVES IN `useAnswerAdvance`, NOT HERE. It derives the lock from
  // "this round is answered and the next has not been dealt", so it is already true in
  // the same commit as the tap and a fast double-tap cannot score twice. A local
  // `isSubmitting` flag alongside it would be a second source of truth that could latch
  // and freeze the board - the exact failure this hook was hardened against.
  const { isResolving, cancel } = useAnswerAdvance({
    answered,
    running: timer.running,
    settled: timer.settled,
    roundNumber,
    deal,
    correct,
    onCorrect: timer.score,
    onWrong: timer.miss,
    holdMs: correct ? CORRECT_MS : WRONG_MS,
  });

  const handlePick = useCallback(
    (fruit: string) => {
      // `pick` is a no-op once the round is answered, so this guard only has to keep a
      // tap from landing before the run starts or after it ends. `isResolving` is
      // included so a tap during the feedback hold cannot queue up a second answer.
      if (!timer.running || timer.settled || isResolving) return;
      pick(fruit);
    },
    [pick, timer.running, timer.settled, isResolving],
  );

  const live = timer.running && covered && !answered && !isResolving && !timer.settled;
  return (
    <div className="relative flex flex-col gap-3">
      <PicnicHeader
        round={roundNumber}
        correct={timer.correct}
        secondsLeft={timer.secondsLeft}
        running={timer.running}
        goldScore={GOLD_SCORE}
        titleLine={titleLine}
        level={level}
        medalCounter={
          <MedalCounter earned={earnedMedals} level={level} celebrate={earnedMedals >= 3} />
        }
      />

      {/* Re-keying per round remounts the SVG, so no leftover lid transition or tilt
          animation survives into the next crate. */}
      <PicnicGridStage
        key={roundNumber}
        round={crate}
        shut={covered}
        showCounts={answered}
        picked={picked}
        correct={correct}
      />

      <PicnicControls
        round={crate}
        picked={picked}
        correct={correct}
        answered={answered}
        live={live}
        onPick={handlePick}
      />

      <PicnicStatus
        covered={covered}
        answered={answered}
        correct={correct}
        question={crate.question}
        answer={crate.answer}
      />

      {timer.medal && (
        <>
          <PicnicResults
            correct={timer.correct}
            attempts={timer.attempts}
            medal={timer.medal}
            rewarded={timer.settled}
            bestMedalLabel={bestMedalLabel}
            onClose={onClose}
            onPlayAgain={() => {
              cancel();
              timer.reset();
              timer.start();
              deal(1);
            }}
          />

          {/*
            THE LEVEL-COMPLETE CARD SITS OVER THE STATION'S OWN RESULTS CARD rather than replacing it.

            The two say different things and both are worth reading: the farm card explains the MEDAL
            (including the flawless-run rule that makes this station's gold unusual), and this one
            reports the LEVEL - the third gold, the unlock, and what to do next. Folding them
            together would mean rewriting a card whose own header documents the medal ladder, which is
            a bigger change than this roll-out should make to a game's teaching copy.
          */}
          {earnedMedals >= 3 && (
            <div className="absolute inset-0 z-40 grid place-items-center bg-emerald-950/75 p-3">
              <LevelCompleteCard
                level={level}
                unlockedNext={outcome?.unlockedNext ?? false}
                completedStation={outcome?.completedAll ?? false}
                onReplay={() => {
                  setOutcome(null);
                  cancel();
                  timer.reset();
                  timer.start();
                  deal(1);
                }}
                onLeave={onClose ?? (() => undefined)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
