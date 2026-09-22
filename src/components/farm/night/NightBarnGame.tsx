/**
 * Station 6 - "האסם בלילה" (Night Barn).
 *
 * A pitch-dark barn. The child sweeps a flashlight to find animals, each marked
 * by a pair of glowing eyes, and answers a question about the 2x fact - either
 * "8 eyes, how many animals?" (halve) or "5 sheep, how many eyes?" (double).
 *
 * THE CLOCK IS FROZEN WHILE AN ANSWER IS EXPLAINED. From the instant a tap lands
 * the board holds the explanation, and the countdown pauses for that whole
 * window - otherwise the child pays up to 2.2 seconds of their 60 for reading
 * why they were wrong, which is time charged for learning.
 *
 * The 60-second clock starts on mount, because the rules are now read on the
 * launch card that opens the station rather than in a start overlay.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Flashlight as TorchIcon } from 'lucide-react';
import { useFarmTimer } from '../useFarmTimer';
import { GOLD_SCORE } from '../farmTimerData';
import NightHeader from './NightHeader';
import NightStage from './NightStage';
import NightControls from './NightControls';
import NightResults from './NightResults';
import { useNightRound } from './useNightRound';
import { useAnswerAdvance } from '../shared/useAnswerAdvance';
import { useFrozenClock } from '../shared/useFrozenClock';
import { CORRECT_MS, WRONG_MS } from './nightStageData';
import type { FarmMedal } from '../farmTimerData';
import { useStationProgress, type StationLevel } from '../../../features/progression/useStationProgress';

interface GameProps {
  onReward: (medal: FarmMedal) => void;
  bestMedalLabel?: string;
  /**
   * The station level chosen on the launch card.
   *
   * DEFAULTS TO 1 for the hosts that do not pass one yet, and - as in the other stations - it
   * does NOT retune the game: the 2x puzzles and the shared medal ladder are unchanged, and the
   * level exists so a gold run can be counted toward the three that open the next one.
   */
  level?: StationLevel;
}

export default function NightBarnGame({ onReward, bestMedalLabel, level = 1 }: GameProps) {
  const { progress, recordGoldMedal } = useStationProgress('nightBarn');
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
  const round = useNightRound();
  const { puzzle, right, wrong, correct, answered, pick, deal } = round;

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

  // A ref, not state: read in the click handler in the same frame as the tap, so
  // a double-tap cannot slip through a not-yet-flushed state update.
  const isSubmittingRef = useRef(false);
  const [lockedRound, setLockedRound] = useState<number | null>(null);
  const isSubmitting = lockedRound === round.roundNumber;

  const { isResolving, cancel } = useAnswerAdvance({
    answered,
    running: timer.running,
    settled: timer.settled,
    roundNumber: round.roundNumber,
    deal,
    correct,
    onCorrect: timer.score,
    onWrong: timer.miss,
    holdMs: correct ? CORRECT_MS : WRONG_MS,
  });

  // The clock freeze, guaranteed to resume on every way out of the window.
  useFrozenClock(isResolving, timer.pause, timer.resume);

  // THE SUBMIT LOCK MUST RELEASE ON EVERY NEW ROUND. It is a ref, so it does not
  // reset itself. Without this a tap would latch it true forever and the child
  // could never answer again.
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

  return (
    <div className="relative flex flex-col gap-3">
      <NightHeader
        round={round.roundNumber}
        correct={timer.correct}
        secondsLeft={timer.secondsLeft}
        running={timer.running}
        goldScore={GOLD_SCORE}
      />

      {/* Re-keying per round remounts the SVG, so no leftover blink phase or
          bounce survives into the next puzzle. */}
      <NightStage key={round.roundNumber} spots={puzzle.spots} revealed={answered} cheering={correct} />

      <NightControls
        options={puzzle.options}
        right={right}
        wrong={wrong}
        locked={locked}
        question={puzzle.question}
        onPick={handlePick}
      />

      {/* A wrong answer names the right count, so the round teaches something. */}
      {answered && !correct && (
        <p
          dir="rtl"
          className="rounded-2xl bg-rose-500/95 px-3 py-2 text-center text-[13px] font-black text-white shadow-[0_3px_0_#881337]"
        >
          {puzzle.mode === 'double'
            ? `${puzzle.spots.length} חיות - ולכל אחת 2 עיניים, אז ${puzzle.answer} עיניים.`
            : puzzle.mode === 'detective'
              ? `ספרו שוב: יש בדיוק ${puzzle.targetCount}. ספרו זוגות של עיניים.`
              : `לכל חיה יש 2 עיניים, אז ${puzzle.spots.length} חיות = ${puzzle.answer}.`}
        </p>
      )}

      <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-indigo-100/80">
        <TorchIcon className="h-3.5 w-3.5" />
        הזיזו אצבע או עכבר על הבמה כדי להאיר
      </p>

      {timer.medal && (
        <NightResults
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
