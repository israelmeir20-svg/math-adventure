/**
 * Station - "משחק הכוכבים" (Constellation Counting).
 *
 * Constellations appear in the sky and the child reports how many stars are shining in total.
 * The skill is GROUPED COUNTING: reading three shapes of four, five and three vertices as
 * "three groups" rather than counting individual stars, which is the mental bridge to
 * multiplication. The difficulty comes from how many groups are up and whether they are still.
 *
 * THE CLOCK IS A TRUE ARCADE CLOCK - it starts once and never stops, matching the rest of the
 * farm. Both the correct and the wrong holds are therefore spent time rather than free time,
 * which is why they are short: 300ms and 450ms. There is no pause and no resume anywhere in
 * this file, so there is no freeze that can outlive its window and strand the countdown.
 *
 * THE ANSWER IS ALWAYS THE SUM OF WHAT IS DRAWN. The generator derives `total` from the shapes
 * it actually placed, never the other way round, so a round can never be unanswerable by looking
 * at it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFarmTimer } from '../useFarmTimer';
import { GOLD_SCORE, STAR_RUN_SECONDS, starMedalFor } from '../farmTimerData';
import StarHeader from './StarHeader';
import StarStage from './StarStage';
import StarControls from './StarControls';
import StarStatus from './StarStatus';
import StarResults from './StarResults';
import { useStarRound } from './useStarRound';
import { useAnswerAdvance } from '../shared/useAnswerAdvance';
import { CORRECT_MS, WRONG_MS } from './starData';
import { QUESTIONS_PER_RUN } from './starTiers';
import type { FarmMedal } from '../farmTimerData';
import { useStationProgress, type StationLevel } from '../../../features/progression/useStationProgress';

/**
 * `titleLine` is only supplied when the game is opened straight from its own
 * town-map anchor; inside the hub the list sends nothing extra. Declared here
 * rather than shared, so this file depends on nothing but the medal type.
 */
interface StarGameProps {
  onReward: (medal: FarmMedal) => void;
  bestMedalLabel?: string;
  titleLine?: string;
  /**
   * The station level chosen on the launch card.
   *
   * DEFAULTS TO 1 for a host that has not been wired yet. IT IS NOW THE ONLY DIFFICULTY KNOB:
   * every one of the run's six questions is built from this value, and nothing escalates it
   * mid-run. It used to merely tag the run while the generator walked its own 1 -> 2 -> 3 ladder
   * by question number, which meant a child on Level 1 was served multiplication questions from
   * question 4 onward regardless of what they had picked.
   */
  level?: StationLevel;
  /**
   * Present only when the game is opened straight from its own map anchor. Inside
   * the hub there is no card to escape from, so the results card hides its exit.
   */
  onClose?: () => void;
}

export default function ConstellationGame({
  onReward,
  bestMedalLabel,
  titleLine,
  level = 1,
  onClose,
}: StarGameProps) {
  const { progress, recordGoldMedal } = useStationProgress('observatory');
  // Snapshot for the results card, taken at settlement.
  const [earnedMedals, setEarnedMedals] = useState(progress.medals[level]);

  /*
   * THE RUN'S FINAL COUNTS, MIRRORED INTO A REF FOR THE SETTLEMENT CALLBACK.
   *
   * `useFarmTimer` reports a finished run from inside its own interval callback, so the callback
   * that decides progression must not read `timer.correct` from the render closure: the tick that
   * ended the run is the same tick that is reporting it, and the counts it closed over are the
   * ones from BEFORE the last answer landed. `useFarmTimer` keeps its own `correctRef` for exactly
   * this reason; this is the station's matching pair, written on every render so the callback
   * always sees the current score.
   */
  const countsRef = useRef({ correct: 0, attempts: 0 });

  /*
   * THE FLAWLESS-RUN RULE IS APPLIED AT SETTLEMENT, NOT BY THE SHARED TIMER.
   *
   * `useFarmTimer` reports the medal `medalForScore` gives it, which can only see the correct
   * count. A gold that requires a clean run therefore has to be narrowed here, where the miss
   * count is in scope - and it is narrowed for DISPLAY AND REWARD ONLY, because the cookie
   * payout has already been issued by the timer against the shared ladder.
   *
   * That split is intentional rather than an oversight: this station's rule is a local
   * difficulty setting, and pushing it into the shared timer would silently retune the six
   * other stations that use the same hook.
   *
   * PROGRESSION USES THE NARROWED MEDAL, NOT THE LADDER'S TIER. A six-answer run with one fumble
   * is demoted to silver for display and reward, and it must not open the next level either -
   * reading the timer's raw tier here would let a run unlock a level its own card called silver.
   */
  const handleReward = useCallback(
    (earned: FarmMedal) => {
      const { correct: finalCorrect, attempts: finalAttempts } = countsRef.current;
      if (starMedalFor(finalCorrect, finalAttempts).id === 'gold') {
        setEarnedMedals(recordGoldMedal(level).newMedals);
      } else {
        setEarnedMedals(progress.medals[level]);
      }
      onReward(earned);
    },
    [level, onReward, progress.medals, recordGoldMedal],
  );

  const timer = useFarmTimer(handleReward, STAR_RUN_SECONDS);
  const { roundNumber, round, picked, correct, answered, pick, deal } = useStarRound(level);

  /**
   * THE RUN STARTS ITSELF, BECAUSE THE RULES ARE NOW READ ON THE LAUNCH CARD.
   *
   * This station used to gate the clock behind a start overlay stating the rules and the run length.
   * The card that opens the station now carries Teacher Tamar's tip and the task, so the overlay was
   * a second reading screen between the child and their first question - and the only thing it still
   * did was call `timer.start`.
   *
   * THE EFFECT STARTS THE CLOCK ONCE, AND `timer.reset()` SETS THAT UP AGAIN. `start` is idempotent
   * while running, but the guard is about the PLAY AGAIN path rather than about double-starts: the
   * results card calls `reset()` and then `start()`, which leaves `timer.running` false for one
   * commit. Running this effect on that commit would be harmless here (it would only start the run
   * the button was about to start anyway) but it would race the explicit `deal(1)`, so the effect
   * deliberately does not re-fire on anything but mount.
   *
   * `timer.start` IS STABLE - `useFarmTimer` wraps it in `useCallback` with no dependencies - so the
   * empty dependency array is honest rather than a suppressed lint.
   */
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    timer.start();
  }, [timer.start]);

  // Written after the timer exists, which is where its counts are first readable. Every render
  // refreshes them, so the settlement callback below never sees a stale score.
  countsRef.current = { correct: timer.correct, attempts: timer.attempts };

  /** The medal the card shows: the ladder's tier, narrowed by this station's flawless-run rule. */
  const medal = timer.medal ? starMedalFor(timer.correct, timer.attempts) : null;

  // THE SUBMIT LOCK LIVES IN `useAnswerAdvance`, NOT HERE. It derives the lock from "this round
  // is answered and the next has not been dealt", so it is already true in the same commit as
  // the tap and a fast double-tap cannot score twice. A local `isSubmitting` flag alongside it
  // would be a second source of truth that could latch and freeze the board.
  const { isResolving, cancel } = useAnswerAdvance({
    answered,
    running: timer.running,
    settled: timer.settled,
    roundNumber,
    deal,
    correct,
    onCorrect: timer.score,
    onWrong: timer.miss,
    // Short holds: with a running clock these are the child's own seconds.
    holdMs: correct ? CORRECT_MS : WRONG_MS,
  });

  const handlePick = useCallback(
    (value: number) => {
      // A tap before the run starts or after it ends is ignored, and so is one that arrives
      // during the feedback hold - without the last clause a rapid keypress could queue a second
      // answer for the round that is already being torn down.
      if (!timer.running || timer.settled || isResolving) return;
      pick(value);
    },
    [pick, timer.running, timer.settled, isResolving],
  );

  const live = timer.running && !answered && !isResolving && !timer.settled;

  return (
    <div className="relative flex flex-col gap-3">
      <StarHeader
        level={level}
        question={roundNumber}
        totalQuestions={QUESTIONS_PER_RUN}
        correct={timer.correct}
        secondsLeft={timer.secondsLeft}
        running={timer.running}
        goldScore={GOLD_SCORE}
        titleLine={titleLine}
      />

      {/* Re-keying per round rebuilds the SVG, so no CSS spin or shake survives into the next
          sky - and no shape arrives already part-way through its rotation. */}
      <StarStage key={roundNumber} round={round} showCounts={answered} />

      <StarControls
        options={round.options}
        picked={picked}
        correct={correct}
        answered={answered}
        live={live}
        onPick={handlePick}
      />

      <StarStatus round={round} answered={answered} correct={correct} />

      {medal && (
        <StarResults
          correct={timer.correct}
          medal={medal}
          rewarded={timer.settled}
          level={level}
          earnedMedals={earnedMedals}
          bestMedalLabel={bestMedalLabel}
          onClose={onClose}
          onPlayAgain={() => {
            cancel();
            timer.reset();
            timer.start();
            deal(1);
          }}
        />
      )}
    </div>
  );
}
