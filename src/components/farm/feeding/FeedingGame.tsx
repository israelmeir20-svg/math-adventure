/**
 * Station 2 - "שעת האכלה" (Feeding Time).
 *
 * Division with a remainder, for 3rd graders, against a 60-second clock. The
 * child is told how much food is on the signboard and how many animals are
 * waiting, and must work out the fair share. Leftovers stay in the basket, which
 * is the concrete picture of a remainder.
 *
 * INTERACTION IS PURE TAP: pick one of four consecutive numbers. There is no
 * dragging and no per-item placement, by design.
 *
 * THE CLOCK IS FROZEN DURING FEEDBACK. From the instant an answer is tapped the
 * board is animating, and the countdown is paused for that whole window. Without
 * this the child paid up to 700ms of their 60 seconds for the privilege of
 * watching the animals eat, which is time charged for not doing maths.
 *
 * The 60-second clock starts on mount, because the rules are now read on the
 * launch card that opens the station rather than in a start overlay.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFarmTimer } from '../useFarmTimer';
import { GOLD_SCORE } from '../farmTimerData';
import FeedingHeader from './FeedingHeader';
import FeedingStage from './FeedingStage';
import FeedingControls from './FeedingControls';
import FeedingResults from './FeedingResults';
import { useFeedingRound } from './useFeedingRound';
import { useAnswerAdvance } from '../shared/useAnswerAdvance';
import { useFrozenClock } from '../shared/useFrozenClock';
import { useRoundFeedback } from './useRoundFeedback';
import type { FarmMedal } from '../farmTimerData';
import { useStationProgress, type StationLevel } from '../../../features/progression/useStationProgress';

interface GameProps {
  onReward: (medal: FarmMedal) => void;
  bestMedalLabel?: string;
  /**
   * The station level chosen on the launch card.
   *
   * DEFAULTS TO 1 for the hosts that do not pass one yet, and - as in the barn - it does NOT
   * retune the game: the division rounds and the shared medal ladder are unchanged, and the level
   * exists so a gold run can be counted toward the three that open the next one.
   */
  level?: StationLevel;
}

export default function FeedingGame({ onReward, bestMedalLabel, level = 1 }: GameProps) {
  const { progress, recordGoldMedal } = useStationProgress('feeding');
  // Snapshot for the results card, taken when the run settles.
  const [earnedMedals, setEarnedMedals] = useState(progress.medals[level]);

  /*
   * ONLY A GOLD RUN MOVES THE LADDER. `useFarmTimer` calls this exactly once per finished run
   * with the tier the run earned, so this is the single settlement point for the station.
   */
  const handleReward = useCallback(
    (medal: FarmMedal) => {
      if (medal.id === 'gold') {
        setEarnedMedals(recordGoldMedal(level).newMedals);
      } else {
        setEarnedMedals(progress.medals[level]);
      }
      onReward(medal);
    },
    [level, onReward, progress.medals, recordGoldMedal],
  );

  const timer = useFarmTimer(handleReward);
  const round = useFeedingRound();
  const { puzzle, picked, correct, answered, pick, deal } = round;

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

  // A ref, not state: it is read in the click handler in the same frame as the
  // tap, so a double-tap cannot slip through a not-yet-flushed state update.
  const isSubmittingRef = useRef(false);
  const [lockedRound, setLockedRound] = useState<number | null>(null);
  const isSubmitting = lockedRound === round.roundNumber;

  // What the answer did to the bowls, and how long to hold that explanation.
  // Derived from the tap, so it cannot survive into the next round.
  const { feedback, holdMs } = useRoundFeedback(puzzle, picked);

  const { isResolving, cancel } = useAnswerAdvance({
    answered,
    running: timer.running,
    settled: timer.settled,
    roundNumber: round.roundNumber,
    deal,
    correct,
    onCorrect: timer.score,
    onWrong: timer.miss,
    holdMs,
  });

  // The clock freeze, guaranteed to resume on every way out of the window.
  useFrozenClock(isResolving, timer.pause, timer.resume);

  // THE SUBMIT LOCK MUST RELEASE ON EVERY NEW ROUND. It is a ref, so it does not
  // reset itself. Without this a tap - right or wrong - would latch it true
  // forever and the child could never answer again.
  useEffect(() => {
    isSubmittingRef.current = false;
  }, [round.roundNumber]);

  const handlePick = useCallback(
    (value: number) => {
      if (isSubmitting || isResolving || isSubmittingRef.current || !timer.running) return;
      isSubmittingRef.current = true;
      setLockedRound(round.roundNumber);
      pick(value);
    },
    [isSubmitting, isResolving, pick, round.roundNumber, timer.running],
  );

  // Live only while a fresh, unanswered round is up and the clock is running.
  const locked = !timer.running || answered || isResolving || timer.settled || isSubmitting;

  // The food is on the board for any answered round; whether the animals
  // celebrate is decided by the stage from the feedback status.
  const filled = answered;

  return (
    /* ===================================================================
     * THE WHOLE STATION MUST FIT ONE SCREEN, SO HEIGHT IS BUDGETED, NOT STACKED.
     * ===================================================================
     *
     * This was a plain `flex flex-col gap-3` with no height constraint, and the
     * stage was an `h-auto` SVG. That combination has no ceiling: the SVG sized
     * itself from its own aspect ratio, and once the viewBox grew to match the
     * 16:9 backdrop, the stage alone was taller than the space available - so the
     * keypad was pushed past the bottom edge and clipped. Nothing overflowed to a
     * scrollbar because the modal body is `overflow-hidden`, so the buttons simply
     * vanished.
     *
     * The fix is three rules that have to be read together:
     *
     *   `h-full`          take the modal body's definite height
     *   `min-h-0`         allow this box to be SMALLER than its content's
     *                     intrinsic height (a flex item defaults to `min-height:
     *                     auto`, which is what let the SVG win)
     *   `justify-between` pin the HUD to the top and the keypad to the bottom, so
     *                     any slack lands in the middle instead of after the keys
     *
     * The header and the keypad are then `shrink-0` so they keep their natural
     * size, and the stage is the only `flex-1` child - it absorbs every remaining
     * pixel and scales itself down to fit. That is what makes the board shrink
     * instead of the keypad being cut off.
     *
     * NO PADDING HERE. `FarmModal` already wraps a live station in `p-3 sm:p-4`,
     * so adding another gutter at this level stacked to ~24px a side and spent
     * real vertical budget on nothing. The outer gutter is the station's margin.
     */
    <div className="relative flex h-full max-h-screen flex-col justify-between gap-2 overflow-hidden select-none">
      <div className="flex shrink-0 justify-center">
        <FeedingHeader
          round={round.roundNumber}
          correct={timer.correct}
          secondsLeft={timer.secondsLeft}
          running={timer.running}
          goldScore={GOLD_SCORE}
        />
      </div>

      {/* =================================================================
       * THE PLAYFIELD: THE ONLY FLEXIBLE ROW.
       * =================================================================
       *
       * `min-h-0` is doing the real work here. Without it a flex item refuses to
       * shrink below its content, and the SVG backdrop's intrinsic height becomes
       * a floor the layout cannot go under - which is precisely how the keypad got
       * shoved off the bottom.
       *
       * With it, this box takes whatever vertical space is left after the HUD and
       * the keypad have been measured, and the illustration scales DOWN to fit
       * that box rather than forcing its parent to grow. `overflow-hidden` and the
       * rounding clip the artwork to the card so no stray paint escapes.
       *
       * THE SKY-TINTED BACKGROUND IS THERE BECAUSE OF THE LETTERBOX. The stage
       * fits its 16:9 scene with `meet`, so on an unusually tall or narrow card
       * there are thin bands at the edges where the SVG has nothing to paint.
       * Left transparent those bands would show the modal's plank wall through the
       * play area, which reads as a rendering hole. A muted sky tone fills them so
       * the card looks like a framed picture rather than a broken one.
       *
       * Re-keying per round remounts the SVG, so no leftover drop animation,
       * bounce or red shortfall marker survives into the next puzzle.
       */}
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-2xl bg-sky-200/70">
        <FeedingStage
          key={round.roundNumber}
          animals={puzzle.animals}
          food={puzzle.food}
          totalFood={puzzle.totalFood}
          feedback={feedback}
          filled={filled}
        />
      </div>

      <FeedingControls
        options={puzzle.options}
        /* MUTUALLY EXCLUSIVE, and that is the fix for the green-on-wrong bug:
           `picked` is only ever the RIGHT answer, `wrong` only ever the WRONG
           one. Passing the tapped value to both made the green branch win every
           time, because FeedingControls tests `picked` first. */
        picked={answered && correct ? picked : null}
        wrong={answered && !correct ? picked : null}
        locked={locked}
        prompt={`כמה ${puzzle.food.name} נשים בכל קערה?`}
        foodEmoji={puzzle.food.emoji}
        onPick={handlePick}
      />

      {timer.medal && (
        <FeedingResults
          correct={timer.correct}
          medal={timer.medal}
          rewarded={timer.settled}
          level={level}
          earnedMedals={earnedMedals}
          bestMedalLabel={bestMedalLabel}
          onPlayAgain={() => {
            cancel();
            isSubmittingRef.current = false;
            setLockedRound(null);
            timer.reset();
            timer.start();
            deal(1);
          }}
        />
      )}
    </div>
  );
}
