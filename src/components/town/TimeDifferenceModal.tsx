/**
 * The Clock Tower - reading, setting, and measuring time on a dial.
 *
 * ================================================================================================
 * WHAT THIS REPLACES
 * ================================================================================================
 *
 * Two static clocks side by side and one question shape ("how long passed?") asked five times, at
 * every level. The level was recorded for the medal ladder and otherwise ignored - the component's
 * own comment admitted as much ("IT DOES NOT CHANGE THE ROUNDS"). That is a medal counter wearing a
 * level selector, and it teaches one skill: subtraction between two times.
 *
 * Now the station is the three Grade-3 skills the brief describes, and the level decides which one is
 * being practised: reading a dial (whole and half hours), moving along it (quarters, fives, counting
 * to the hour), and measuring between two points on it. See `timeRounds.ts` for the question shapes
 * and why each level's wrong answers are the errors of that specific skill.
 *
 * ================================================================================================
 * THE HANDS ARE STATE, NOT A RENDER OF THE ANSWER
 * ================================================================================================
 *
 * For the setting questions the child MOVES the hands, so the hands are the input: `hourAngle` and
 * `minuteAngle` are the two hands' rotation in degrees and the buttons add to one of them. The check
 * button folds each angle back to the position it points at and compares that to the round's target,
 * which is what makes a wrong setting wrong instead of simply being the new question.
 *
 * THE TWO HANDS ARE SET SEPARATELY, AND THAT IS THE POINT OF THE PAIR. A single shared minute count is
 * the mechanically faithful model - a real clock gears the minute hand twelve times faster than the hour
 * hand - but it cannot express the brief's `+1 שעה` moving the hour hand ALONE: adding 60 minutes swings
 * the minute hand a full 360 degrees, which to the eye is no movement at all, and the two hands then look
 * locked together at a fixed ratio. So each control drives exactly one angle.
 *
 * NEITHER ANGLE WRAPS BETWEEN QUESTIONS. That is both the fix for the backwards-sweeping hand and the
 * honest model of a clock: the hands are wound forward and the dial position is read off the angle,
 * rather than the angle being folded back into a time on every tap and the hands having to guess which
 * way round they went. See the note on the state itself.
 *
 * ================================================================================================
 * PROGRESSION, MEDALS AND THE RUN LENGTH ARE UNCHANGED
 * ================================================================================================
 *
 * The station key is still `clocks`, a run is still five questions, and a completed run is still a
 * gold medal (this station has no sprint score, so "finished" is the top tier - the reasoning is
 * unchanged and lives on the `recordGoldMedal` call below). What is new is only that the questions
 * now depend on the level the card was set to, which is a change to `buildClockRound`'s argument
 * rather than to the ladder.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import MiniGameShell from '../common/MiniGameShell';
import GameLaunchModal from '../kingdom/GameLaunchModal';
import ClockFace from './ClockFace';
/*
 * The same tower scene `ClockFace` used to draw behind the dial, hoisted here so it can be a full-bleed
 * backdrop for the whole modal. Imported rather than referenced by path so Vite fingerprints it and a
 * moved asset fails the build instead of silently rendering nothing.
 */
import clockBackdrop from '../../assets/clock/clock.png';
import {
  buildClockRound,
  clockLevel,
  formatMinutes,
  fromMinutes,
  medalForCorrect,
  MEDAL_EMOJI,
  MEDAL_LABEL,
  needsHands,
  RUN_SECONDS,
  type ClockRound,
  type ClockTask,
  type ClockTime,
  type TrainMedal,
} from './timeRounds';
import { MedalCounter } from '../../features/progression/ProgressionChrome';
import { useStationProgress, type StationLevel } from '../../features/progression/useStationProgress';

/** Paid once for correctly answering a clock question. A single-answer puzzle, not a sprint. */
const REWARD = 10;

const STATION_KEY = 'clocks';

/**
 * How long the success line is held before the next question is dealt.
 *
 * LONG ENOUGH TO READ THE HEBREW PHRASING, SHORT ENOUGH NOT TO STALL THE RUN. The success line is the
 * station's payoff - it is where "08:15" becomes "רבע אחרי שמונה" in words - so advancing the instant the
 * answer is graded would delete the thing the question was teaching. Just under a second is enough to
 * read three or four words without turning the run into a slideshow.
 */
const SUCCESS_HOLD_MS = 900;

/**
 * The steps the brass buttons move the hands by.
 *
 * `HOUR_STEP_DEG` IS IN DEGREES AND THE OTHER TWO ARE IN MINUTES, because that is the unit each button's
 * target state is measured in: `hourBase` is an angle (a whole hour is 30 degrees of it) while
 * `minutesTotal` is a count of minutes. Naming the unit in each constant keeps the conversion visible at
 * the two angle formulas rather than smeared across the buttons.
 */
const HOUR_STEP_DEG = 30;
const QUARTER_STEP_MIN = 15;
const FIVE_STEP_MIN = 5;

export default function TimeDifferenceModal({ onClose }: { onClose: () => void }) {
  const { addCookies } = useGame();
  const feedback = useAnswerFeedback();
  const { progress, recordGoldMedal } = useStationProgress(STATION_KEY);

  /**
   * THE LAUNCH CARD IS SHOWN FIRST, AND IT IS `status` RATHER THAN A SEPARATE FLAG.
   *
   * A boolean `launched` alongside the playing state would allow a fourth combination ("launched but
   * not started") that nothing can produce, so the two are one value. The card is also a real gate
   * rather than an overlay: nothing is drawn behind it.
   */
  const [status, setStatus] = useState<'intro' | 'playing'>('intro');

  /** The level chosen on the card. Set from `onStart`, the only place it can come from. */
  const [level, setLevel] = useState<StationLevel>(1);

  const spec = clockLevel(level);

  const [roundKey, setRoundKey] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  /** The shape of the previous question, so the level's alternation is honoured. */
  const [lastTask, setLastTask] = useState<ClockTask | undefined>(undefined);

  /**
   * THE RUN IS OVER, AND HOW IT WENT.
   *
   * ONE VALUE RATHER THAN A `finished` BOOLEAN PLUS A SEPARATE SCORE, for the same reason `status` is one
   * value rather than a flag: the two are always set together, at the moment the clock stops, and a pair
   * of states could only ever disagree about a run that had ended.
   *
   * The medal is part of the outcome because it is FROZEN here. Reading the live correct count when the
   * summary renders would let it keep climbing behind the modal if anything re-rendered, and a medal that
   * changed under the child after they had been shown it would be worse than no medal at all.
   */
  const [outcome, setOutcome] = useState<{ correct: number; medal: TrainMedal | null } | null>(null);
  const finished = outcome !== null;

  // THE QUESTION IS DERIVED, NEVER STORED, so a re-render cannot reshuffle it under the child's
  // finger. `roundKey` is the deal signal; `lastTask` and the level are its inputs.
  const round: ClockRound = useMemo(
    () => buildClockRound(level, lastTask),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roundKey, level],
  );

  /**
   * THE HANDS, AS AN HOUR BASE PLUS A RUNNING MINUTE COUNT.
   *
   * ================================================================================================
   * WHY NEITHER OF THE OBVIOUS MODELS WORKED, AND WHAT THIS ONE SPLITS APART
   * ================================================================================================
   *
   * Two earlier revisions of this file each got half of this right.
   *
   * SHARED MINUTE COUNT (mechanically faithful). One running total derived both hands, x6 and x0.5. That
   * is how a real clock is geared, but it made `+1 שעה` unusable: adding 60 minutes swings the minute
   * hand a full 360 degrees, which to the eye is no movement at all, while the hour hand steps a clear 30.
   * So the hour button appeared to move only the hour hand, by accident, and a child could not set an
   * exact minute without disturbing the hour.
   *
   * FULLY INDEPENDENT ANGLES. Each control drove one angle and nothing else. That fixed the hour button,
   * but it broke the thing a clock is FOR: the hour hand no longer crept with the minutes, so at half past
   * it still pointed exactly at the hour. A child told "the hour hand is halfway between 3 and 4 at 3:30"
   * would see it pointing straight at the 3 and be contradicted by the toy.
   *
   * THIS SPLIT KEEPS BOTH. The hour hand's position is the SUM of two parts:
   *
   *   `hourBase`     whole hours the child dialled in with `+1 שעה`, in degrees. Only that button moves it,
   *                  and it moves it alone - no minute ever leaks into this term.
   *   `minutesTotal` minutes the child dialled in with `+15 דק'` / `+5 דק'`, times 0.5 - the creep.
   *
   * So the hour button is independent (it never touches `minutesTotal`) while the minute buttons still
   * drag the hour hand round in proportion, which is what makes 3:30 read as 3:30.
   *
   * ================================================================================================
   * BOTH ARE MONOTONIC, AND THE CREEP IS WHAT MAKES GRADING CLEAN
   * ================================================================================================
   *
   * Neither value wraps: `hourBase` climbs in 30s and `minutesTotal` climbs in 5s, so every CSS
   * transition between two states is a single forward step and there is no backwards sweep to fix up.
   *
   * THE CREEP ALSO DISSOLVES THE GRADING PROBLEM THE LAST REVISION HAD TO PAPER OVER. With independent
   * hands the hour hand could only ever sit on multiples of 30 degrees, so a half-past target had no
   * reachable hour position and the check had to tolerate +/-15 degrees - which accepted three distinct
   * hour positions and made the check genuinely ambiguous. Now the creep moves the hand to exactly the
   * right angle for any minute value, so the hour can be graded exactly and the tolerance is deleted.
   *
   * BOTH ARE INITIALISED FROM THE FIRST ROUND'S START, so the dial opens showing the question's time.
   *
   * ================================================================================================
   * `minutesTotal` COUNTS THE CHILD'S DIALS ON TOP OF THE START'S MINUTE POSITION
   * ================================================================================================
   *
   * This is the one subtlety in the split, and getting it wrong drifts a hand by whole hours - or leaves
   * the two hands disagreeing about where the round begins.
   *
   * The creep term is `minutesTotal * 0.5`, and the minute hand is `minutesTotal * 6`, so `minutesTotal`
   * must NOT be the absolute time: seeding it with 525 for an 08:45 start would add a quarter-turn of
   * creep on top of an `hourBase` that already encodes the 8, and every reading would be hours out.
   *
   * IT IS SEEDED WITH THE START'S MINUTE-OF-HOUR, NOT WITH ZERO. Zero would fix the hour drift but leave
   * the minute hand at :00 while the hour hand sat three-quarters of the way from the 8 to the 9 - two
   * hands describing different times on the same dial. Seeding it with the start's minute (`270` for the
   * :45 of an 08:45 round) puts the minute hand on the 9 exactly where the round begins, and the child's
   * taps then count forward from there.
   *
   * The hour's whole hours live in `hourBase`, which is why only the MINUTE part is duplicated here.
   */
  const [hourBase, setHourBase] = useState<number>(() => {
    const start = buildClockRound(1).start;
    return ((start / 60) % 12) * 30;
  });
  const [minutesTotal, setMinutesTotal] = useState<number>(() => buildClockRound(1).start % 60);

  const [wrong, setWrong] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);
  const [earnedMedals, setEarnedMedals] = useState(progress.medals[1]);
  /**
   * Seconds left on the RUN, not on the question.
   *
   * IT USED TO COUNT THE QUESTION DOWN AND RE-ARM ON EVERY DEAL, which was the right shape when a run was
   * a fixed five questions and running out only cost a retry. With questions now arriving indefinitely
   * until the clock stops, a per-question timer could never end the run - each new question would re-arm
   * its own thirty seconds and the game would go on forever - so the clock measures the run itself.
   */
  const [secondsLeft, setSecondsLeft] = useState(RUN_SECONDS);

  /** True when this round is answered by moving the hands rather than by picking a plate. */
  const usesHands = needsHands(round.task);

  /**
   * Moves ONE hand, chosen by the control that was pressed.
   *
   * THE HAND IS NAMED BY THE CALLER RATHER THAN INFERRED FROM THE AMOUNT. Inferring it would mean
   * "60 or more is an hour tap", which is exactly the coupling this design removes - the hour button has
   * to be able to advance the hour without the minutes moving at all. The buttons pass their own hand.
   *
   * NOTE THAT THE MINUTE BUTTON MOVES BOTH HANDS, because the hour hand's angle is derived from
   * `minutesTotal`. That is not a leak: it is the creep. The hour button is the one that must stay
   * one-directional, and it does - it only ever touches `hourBase`.
   */
  const nudgeHand = useCallback(
    (hand: 'hour' | 'minute', amount: number) => {
      if (solved || wrong !== null) return;
      if (hand === 'hour') setHourBase((current) => current + amount);
      else setMinutesTotal((current) => current + amount);
      // A tap is audible feedback only; the answer is checked on the button, not on the nudge.
      feedback(true);
    },
    [solved, wrong, feedback],
  );

  /*
   * THE TWO ANGLES, DERIVED FROM THE STATE ON EVERY RENDER.
   *
   * `minuteAngle` is the running minute count at 6 degrees a minute, so it only ever climbs and the hand
   * never sweeps backwards - 45 minutes is 270deg, the next 60 is 360deg, and CSS interpolates one
   * forward step between them.
   *
   * `hourAngle` ADDS THE CREEP TO THE BASE: half a degree for every minute dialled in. This is the
   * gearing a real clock has, reintroduced as a derived term rather than by sharing a counter, which is
   * what lets the hour button stay independent while the minute buttons still drag the hour hand round.
   */
  const minuteAngle = minutesTotal * 6;
  const hourAngle = hourBase + minutesTotal * 0.5;

  /** Returns both hands to the round's starting position. */
  const resetHands = useCallback(() => {
    if (solved || wrong !== null) return;
    setHourBase(hourBaseFromMinutes(round.start));
    setMinutesTotal(round.start % 60);
  }, [solved, wrong, round.start]);

  /**
   * The pending auto-advance, so it can be cancelled.
   *
   * DECLARED FIRST BECAUSE BOTH `finishRun` AND `settle` REACH FOR IT, and a `const` referenced before its
   * line is in the temporal dead zone rather than merely undefined.
   */
  const advanceTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    },
    [],
  );

  /**
   * Deals the next question.
   *
   * CALLED AUTOMATICALLY BY `settle` AFTER THE SUCCESS PAUSE, and by the summary's restart. Bumping
   * `roundKey` is the deal signal; clearing `solved` and `wrong` returns the question UI to its unlocked
   * state. Declared above `settle` for the same temporal-dead-zone reason as `advanceTimer`.
   */
  const next = useCallback(() => {
    setRoundKey((k) => k + 1);
    setSolved(false);
    setWrong(null);
  }, []);

  /**
   * Ends the run: freezes the correct count and prices the medal from it.
   *
   * ================================================================================================
   * THE COUNT IS READ FROM A REF, AND THAT IS WHAT KEEPS THE CLOCK STABLE
   * ================================================================================================
   *
   * Taking `solvedCount` directly would put it in this callback's dependency array, so `finishRun` would
   * be a new function after every correct answer. The run clock depends on `finishRun`, so its effect
   * would tear down and re-run each time - and since the effect's first act is to reset the clock to
   * `RUN_SECONDS`, EVERY CORRECT ANSWER WOULD REFILL THE TIMER and a child answering steadily would
   * never reach the end of the run. That is precisely the "continue indefinitely" failure the sprint
   * exists to avoid, arrived at by accident.
   *
   * A ref is the right tool rather than a dependency: `finishRun` only ever needs the LATEST count at the
   * moment it is called, and nothing should re-render or re-subscribe when that count changes.
   *
   * THE MEDAL IS RECORDED HERE AND NOWHERE ELSE. This is the only instant the correct count is final, and
   * `recordGoldMedal` is called only when the ladder actually reaches gold - a bronze or silver run still
   * shows its medal on the summary, but does not bank one, which is what keeps the three-medal unlock
   * gate meaning "three good runs" rather than "three attempts".
   *
   * `advanceTimer` IS CANCELLED FIRST. A run can expire during the success pause, and letting that
   * pending advance fire afterwards would deal a fresh question onto a finished run.
   */
  const solvedCountRef = useRef(0);
  const finishRun = useCallback(() => {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    const correct = solvedCountRef.current;
    const medal = medalForCorrect(correct);
    setOutcome({ correct, medal });
    if (medal === 'gold') {
      setEarnedMedals(recordGoldMedal(level).newMedals);
    }
  }, [recordGoldMedal, level]);

  /**
   * Settles a correct answer: awards the cookie, counts it, and hands straight on to the next question.
   *
   * ================================================================================================
   * THE MEDAL IS NO LONGER DECIDED HERE
   * ================================================================================================
   *
   * This used to check `totalSolved >= totalRounds` and record a gold medal when the fixed five-question
   * set was finished. There is no longer a set to finish - questions arrive until the clock stops - so
   * the medal moved to the run timer's expiry, priced against the correct count at that moment. That is
   * the only place it can be decided, because the correct count is not final until then.
   *
   * ================================================================================================
   * ADVANCE AFTER A PAUSE, NOT ON A BUTTON
   * ================================================================================================
   *
   * The success line stays for `SUCCESS_HOLD_MS` and then `next` is called. `setLastTask` is what makes
   * the alternation work: the level's spec alternates between two shapes, and recording the shape just
   * answered is how `buildClockRound` knows which one to avoid dealing next.
   *
   * THE TIMEOUT IS CLEARED ON UNMOUNT so a run that ends during the pause cannot have a pending advance
   * fire into an unmounted component, and so restarting mid-pause does not leave two advances queued.
   */
  const settle = useCallback(() => {
    setSolved(true);
    setLastTask(round.task);
    // The ref is the count `finishRun` will read if the clock expires mid-pause; the state drives the
    // header readout. They must move together, so both are updated in this one place.
    solvedCountRef.current += 1;
    setSolvedCount(solvedCountRef.current);
    addCookies(REWARD);
    feedback.celebrate();

    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null;
      next();
    }, SUCCESS_HOLD_MS);
  }, [round.task, addCookies, feedback, next]);

  /** Checks a plate answer. */
  const pickPlate = useCallback(
    (choice: string) => {
      if (solved || wrong !== null) return;
      if (choice !== round.choices[round.correctIndex]) {
        setWrong(choice);
        feedback(false);
        window.setTimeout(() => setWrong(null), 450);
        return;
      }
      settle();
    },
    [solved, wrong, round.choices, round.correctIndex, feedback, settle],
  );

  /**
   * Checks the two hands against the round's target, EXACTLY AND WITH NO TOLERANCE.
   *
   * ================================================================================================
   * WHY THE TOLERANCE IS GONE
   * ================================================================================================
   *
   * The previous revision had to accept the hour hand within +/-15 degrees, and that was a real defect
   * rather than a nicety. With hour and minute fully independent, the hour hand could only ever sit on a
   * multiple of 30 degrees, so a half-past target had no reachable hour position at all - the check had
   * to be loosened or the question was unsolvable. Loosened by a half step, it accepted THREE distinct
   * hour positions for every target, so a child whose hour hand was a whole hour wrong could still pass.
   *
   * The creep removes the need for the compromise. `hourAngle` now includes half a degree per minute, so
   * the hand reaches the exact angle a real clock would show at that minute, and the grade can be exact.
   *
   * ================================================================================================
   * BOTH HANDS ARE COMPARED AS WHOLE NUMBERS
   * ================================================================================================
   *
   * Each angle is folded onto the dial and converted back to the hour or minute it points at, then the
   * pair is compared against the target's pair.
   *
   * THE HOUR IS READ FROM THE CREEPED ANGLE, NOT FROM `hourBase`. This is what a false rejection here
   * looked like: reading `hourBase` alone silently discards the creep the minute buttons contribute, so a
   * child who reached 03:30 with the hour hand correctly resting between the 3 and the 4 was graded as if
   * the hand were still on the 3 while the dial plainly showed otherwise.
   *
   * `Math.floor` ON THE HOUR, AND IT IS LOAD-BEARING. The creep means the hand sits strictly past each
   * numeral for most of the hour - 3:30 puts it at 105 degrees, which is 3.5 numerals' worth - so
   * `Math.round` would call that 4 and reject every correct half-past answer, while `Math.floor` reads
   * which numeral the hand is sitting in, which is exactly what a dial displays.
   *
   * `|| 12` FOLDS MIDNIGHT BACK TO TWELVE. There is no "0 o'clock" on a dial: a hand resting on the 12
   * floors to an angle bucket of 0, and the round generator stores noon as hour 12. Without this the
   * twelve o'clock questions graded as wrong however the child set them.
   *
   * Both sides are taken modulo the 12-hour face because a dial cannot distinguish 03:00 from 15:00.
   */
  const checkHands = useCallback(() => {
    if (solved || wrong !== null) return;

    const norm = (deg: number) => ((deg % 360) + 360) % 360;

    const currentHours = Math.floor(norm(hourAngle) / 30) % 12 || 12;
    const currentMinutes = Math.round(norm(minuteAngle) / 6) % 60;

    const target = heldTarget(round);
    const targetHour = (Math.floor(target / 60) % 12) || 12;
    const targetMinute = target % 60;

    if (currentHours !== targetHour || currentMinutes !== targetMinute) {
      setWrong('hands');
      feedback(false);
      window.setTimeout(() => setWrong(null), 450);
      return;
    }

    settle();
  }, [solved, wrong, round, hourAngle, minuteAngle, feedback, settle]);

  /**
   * THE RUN CLOCK. A DEADLINE RATHER THAN A TICK COUNT, so a throttled or backgrounded tab cannot make it
   * run slow: the remaining time is always recomputed from the wall clock, and the 250ms poll is only how
   * often that is sampled.
   *
   * KEYED ON `status` AND NOT ON `roundKey`, WHICH IS THE WHOLE CHANGE. It used to re-arm on every new
   * question, because it was timing the question. A run clock must do the opposite: dealing a question
   * must leave it alone, so the only thing that starts it is the run starting and the only thing that ends
   * it is the clock reaching zero.
   *
   * EXPIRY ENDS THE RUN. `finishRun` freezes the correct count and prices the medal from it, which is the
   * only moment either is final.
   */
  useEffect(() => {
    if (status !== 'playing') return;

    setSecondsLeft(RUN_SECONDS);
    const deadline = Date.now() + RUN_SECONDS * 1000;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) finishRun();
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [status, finishRun]);

  /** Starts the run over from the first question, with a fresh clock. */
  const restart = () => {
    solvedCountRef.current = 0;
    setSolvedCount(0);
    setOutcome(null);
    setSecondsLeft(RUN_SECONDS);
    setRoundKey((k) => k + 1);
    setSolved(false);
    setWrong(null);
    setLastTask(undefined);
    // Re-seed the card's counter from the store: a replay within the same session must show the
    // tally that includes the run just finished.
    setEarnedMedals(progress.medals[level]);
  };

  /*
   * THE HANDS FOLLOW THE ROUND WHEN IT CHANGES, INCLUDING THE FIRST DEAL.
   *
   * AN EFFECT, NOT A SIDE EFFECT OF DEALING. Every path that changes the question - `next`, `restart`,
   * a level change - would otherwise have to remember to reset the hands, and the one that forgot
   * would leave the previous question's answer on the dial for the child to "check" again. Keying the
   * reset to the round itself means there is exactly one place that can be wrong, and it is here.
   *
   * THIS IS ALSO THE ONLY PLACE THE ANGLES ARE REWOUND, which is what the brief asks for: a new question
   * (or `איפוס`, which sets them back to `round.start`) is the only event that may move the hands
   * backwards. Between those events each angle only grows, so roughly speaking the hands only advance.
   */
  const roundStart = round.start;
  const [roundStartSeen, setRoundStartSeen] = useState<number | null>(null);
  if (roundStartSeen !== roundKey) {
    // Adjusting state during render, which React supports for exactly this case: derive-from-props
    // without an extra commit and without a flash of the previous round's hands.
    setRoundStartSeen(roundKey);
    setHourBase(hourBaseFromMinutes(roundStart));
    setMinutesTotal(roundStart % 60);
  }

  if (status === 'intro') {
    return (
      <GameLaunchModal
        meta={STATION_KEY}
        onStart={(chosen) => {
          setLevel(chosen);
          setStatus('playing');
        }}
        onClose={onClose}
      />
    );
  }

  /*
   * THE DIAL'S TIME, DERIVED FROM THE TWO ANGLES RATHER THAN STORED.
   *
   * `ClockFace` needs a `time` for its ARIA label - a screen reader has to be able to announce what the
   * dial is showing - but the hands themselves are positioned from the angles passed below. So this is a
   * DISPLAY-ONLY reconstruction of the moment the hands point at, read from the same two quantities the
   * grading reads so the announced time cannot disagree with the graded one.
   *
   * THE HOUR IS TAKEN MODULO 12 BEFORE DIVIDING, because `hourBase` may sit past 360 once the child has
   * wound it round; the dial can only show twelve positions.
   *
   * THIS MIRRORS `checkHands` EXACTLY, including reading the CREEPED angle rather than the base and the
   * `|| 12` fold, so the time announced to a screen reader is the same time the child is graded against.
   */
  const norm = (deg: number) => ((deg % 360) + 360) % 360;
  const handsHour = Math.floor(norm(hourAngle) / 30) % 12 || 12;
  const handsMinute = Math.round(norm(minuteAngle) / 6) % 60;
  const handsTime: ClockTime = fromMinutes(handsHour * 60 + handsMinute);

  return (
    <MiniGameShell
      title="מגדל השעון"
      subtitle={`רמה ${level}: ${spec.title}`}
      icon="🕰️"
      frame="border-amber-300 bg-gradient-to-b from-amber-800 to-stone-900"
      progress={`${solvedCount} נכונות`}
      onRestart={restart}
      restartLabel="מהתחלה"
      onClose={onClose}
    >
      {/*
        ==========================================================================================
        THE ATMOSPHERIC BACKDROP, FULL-BLEED BEHIND EVERYTHING IN THE MODAL
        ==========================================================================================
        
        The clock tower artwork used to be confined to a 19rem square directly behind the dial, which
        meant a small picture floating in the middle of a large brown panel - and the panel's own
        gradient was what the child actually saw.
        
        It is now a single `absolute inset-0` layer that covers the WHOLE modal interior, with the dial,
        the digital target, the plates and the brass buttons all laid out on top of it. This is what the
        brief asks for: one continuous scene, with the controls floating over it.
        
        `-inset-*` CANCELS THE SHELL'S OWN PADDING AND HEADER. `MiniGameShell` insets its children by
        `p-4` inside a header-plus-body column, so a plain `inset-0` here would start below the header
        and leave a 16px frame of the old brown gradient around the scene - a visible seam that reads as
        a bug. Pulling the layer out by the padding it sits inside is what makes it genuinely full-bleed
        to the modal's rounded border.
        
        THE SCRIM IS NOT DECORATION. The illustration is a bright, busy painting, and the dial is a pale
        plate covered in small numerals while the buttons are dark wood. Both need a settled ground, so a
        vertical gradient sits between the art and the content: darker at the top and bottom where text
        and controls live, lighter through the middle where the dial reads against the tower. Without it
        the brass numerals and the digital plate compete with the painting behind them.
        
        `pointer-events-none` KEEPS THE LAYER INERT. It spans the entire modal, so without this it would
        swallow every tap meant for the buttons on top of it.
      */}
      <div aria-hidden className="pointer-events-none absolute -inset-4 -bottom-4 -top-20 z-0 overflow-hidden">
        <img
          src={clockBackdrop}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-900/45 to-stone-950/85" />
      </div>

      {/*
        EVERYTHING BELOW SITS ABOVE THE BACKDROP. `relative z-10` is applied to the content wrapper
        rather than to each control, so a new element added here is layered correctly by default instead
        of needing its own z-index to avoid disappearing behind the scene.
      */}
      <div className="relative z-10 flex h-full min-h-0 flex-col gap-3">
      {/*
        THE RUN CLOCK. It stays visible for the whole run, including during the success pause, because it
        is now timing the RUN rather than the question - hiding it while the answer is being read would
        hide the thing the child is racing, and it does not reset between questions so there is nothing
        misleading about it still counting.
      */}
      {status === 'playing' && (
        <div className="flex shrink-0 items-center justify-center">
          <span
            className={`rounded-full px-3 py-1 text-sm font-black tabular-nums transition-colors ${
              secondsLeft <= 10
                ? 'bg-rose-500/90 text-white motion-safe:animate-[pulseLock_1s_ease-in-out_infinite]'
                : 'bg-amber-950/55 text-amber-50'
            }`}
          >
            ⏱ {secondsLeft}s
          </span>
        </div>
      )}

      {/*
        THE QUESTION ITSELF, HIDDEN ONCE THE RUN IS OVER so the summary is not competing with a dial and
        four plates the child can no longer use.
      */}
      {!finished && (
        <>
          {/* THE TASK BADGE: the one line the child reads before acting. */}
      <p className="shrink-0 rounded-2xl bg-amber-950/60 px-3 py-2 text-center text-sm font-black text-amber-50">
        {round.prompt}
      </p>

      {/*
        FOR A SETTING QUESTION THE TARGET IS SHOWN AS A DIGITAL PLATE, and it is the only place the
        answer appears - so the dial below is the child's attempt at it rather than a copy of it.
      */}
      {usesHands && (
        <div className="flex shrink-0 items-center justify-center gap-2">
          <span className="text-xs font-bold text-amber-100/80">
            {round.task === 'future' ? 'מתחילים מ-' : 'היעד:'}
          </span>
          <span
            dir="ltr"
            className="rounded-xl border-2 border-amber-500/70 bg-stone-900 px-3 py-1 font-mono text-2xl font-black tracking-widest text-amber-300 shadow-[inset_0_0_12px_rgba(217,119,6,0.35)]"
          >
            {formatMinutes(round.task === 'future' ? round.start : round.target)}
          </span>
        </div>
      )}

      {/* THE DIAL, with the artwork behind it and the elapsed wedge for Level 3. */}
      {round.task === 'elapsed' ? (
        /*
          ==========================================================================================
          THE ELAPSED QUESTION NEEDS BOTH ENDS OF THE INTERVAL, SO IT GETS TWO DIALS.
          ==========================================================================================
          
          Every other shape on this station asks about ONE moment, and one dial is the whole
          stimulus. This one asks for the DISTANCE between two moments, which is not visible on
          either dial alone - the child would be asked to subtract a number they cannot see from
          one they can, which is a memory question rather than a clock one.
          
          So both times are drawn, side by side, and the SECOND dial carries the shaded wedge from
          the first - the duration as a region of the dial rather than as an arithmetic step. That
          is the brief's "visual time arc/wedge highlighting elapsed duration".
        */
        <div className="flex shrink-0 items-center justify-center gap-2">
          <div className="aspect-square w-full max-w-[9rem]">
            <ClockFace time={fromMinutes(round.target)} caption="התחלה" tone="#f97316" animate={false} className="h-full w-full" />
          </div>
          <div className="aspect-square w-full max-w-[9rem]">
            <ClockFace
              time={fromMinutes(round.end)}
              caption="סיום"
              tone="#0ea5e9"
              animate={false}
              wedge={wedgeFor(round)}
              className="h-full w-full"
            />
          </div>
        </div>
      ) : (
        /*
          THE MAIN PLAYING DIAL, WHICH OPTS OUT OF ITS OWN ARTWORK (`artwork={false}`).
          
          The tower painting is now the modal's full-bleed backdrop, so drawing it here as well would put
          a second, smaller copy of the same scene directly behind the dial - two towers at two scales,
          visibly misaligned, which is exactly the "confined to a small square in the middle" problem in
          reverse. The dial keeps only its pale plate, which reads cleanly against the backdrop's scrim.
          
          THE TWO SMALL DIALS ABOVE DELIBERATELY KEEP THEIRS: they are self-contained cards shown side by
          side, so each needs its own ground to sit on.
        */
        <div className="mx-auto aspect-square w-full max-w-[19rem] shrink-0">
          <ClockFace
            time={handsTime}
            hourAngleDeg={hourAngle}
            minuteAngleDeg={minuteAngle}
            tone="#f97316"
            animate={usesHands}
            artwork={false}
            caption={round.task === 'toHour' ? 'עכשיו' : undefined}
            className="h-full w-full"
          />
        </div>
      )}

      {usesHands ? (
        <>
          {/*
            THE BRASS CONTROLS.

            `+1 שעה` adds 60 minutes to `hourBase`, which is stored in degrees - so the 60 is converted
            by the one place that owns that relationship rather than by the button. The minute buttons
            feed `minutesTotal` directly, and because the derived hour angle reads from that same value,
            they creep the hour hand as a side effect of being correct.
          */}
          <div className="grid shrink-0 grid-cols-4 gap-2">
            <BrassButton onClick={() => nudgeHand('hour', HOUR_STEP_DEG)} disabled={solved}>
              +1 שעה
            </BrassButton>
            <BrassButton onClick={() => nudgeHand('minute', QUARTER_STEP_MIN)} disabled={solved}>
              +15 דק&apos;
            </BrassButton>
            <BrassButton onClick={() => nudgeHand('minute', FIVE_STEP_MIN)} disabled={solved}>
              +5 דק&apos;
            </BrassButton>
            <BrassButton onClick={resetHands} disabled={solved} tone="stone">
              🔄 איפוס
            </BrassButton>
          </div>

          <button
            type="button"
            onClick={checkHands}
            disabled={solved}
            className={`w-full shrink-0 rounded-2xl py-3 text-base font-black text-white shadow-[0_4px_0_#78350f] transition active:translate-y-[3px] active:shadow-none ${
              wrong === 'hands'
                ? 'bg-rose-600 motion-safe:animate-[shake_.4s_ease-in-out]'
                : 'bg-amber-600 hover:bg-amber-500'
            } disabled:opacity-50`}
          >
            🔔 אישור
          </button>
        </>
      ) : (
        /*
          THE DIGITAL PLATES, for the reading and duration questions.

          Wooden-looking cards with a monospaced LED readout, because the question is about the
          NUMBER rather than about a hand position - and a child comparing "07:30" against "06:15"
          needs the digits to line up in a column to see the difference, which proportional type
          would not do.
        */
        <div className="grid shrink-0 grid-cols-2 gap-2">
          {round.choices.map((choice, index) => (
            <button
              key={`${choice}-${index}`}
              type="button"
              disabled={solved}
              onClick={() => pickPlate(choice)}
              className={`rounded-2xl border-2 border-amber-900/60 bg-gradient-to-b from-amber-200 to-amber-400 py-3 text-lg font-black text-stone-900 shadow-[0_4px_0_#78350f] transition active:translate-y-[3px] active:shadow-none ${
                wrong === choice ? 'bg-rose-400 motion-safe:animate-[shake_.4s_ease-in-out]' : 'hover:brightness-105'
              } disabled:opacity-60`}
            >
              {choice}
            </button>
          ))}
        </div>
      )}
        </>
      )}

      {solved && (
        <div className="flex flex-col items-center gap-2">
          {/*
            THE SUCCESS LINE, AND NOTHING TO PRESS.

            It used to be an opaque "correct" state with a `לשאלה הבאה` button under it. Now it is a
            TRANSIENT FLASH: `settle` holds it for `SUCCESS_HOLD_MS` and then deals the next question on
            its own, so there is no button to press and nothing for a fast child to have to hit twice.
            The line stays because it carries `round.success` - the Hebrew phrasing of the answer, which
            is the thing this station is actually teaching.
          */}
          <p className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-400/20 px-3 py-2 text-center text-sm font-black text-emerald-100 motion-safe:animate-[rise_.2s_ease-out]">
            <Sparkles className="h-4 w-4 shrink-0" />
            {round.success} · +{REWARD} 🍪
          </p>
        </div>
      )}

      {/*
        THE FINAL SCREEN, SHOWN ONLY WHEN THE RUN CLOCK RUNS OUT.

        This replaced a block that appeared when the fixed five-question set was completed. There is no
        completion condition any more - questions arrive until the clock stops - so the summary is keyed to
        the frozen outcome instead, and it is the only way the modal ends.
      */}
      {finished && (
        <div className="flex w-full flex-col items-center gap-2 rounded-2xl bg-amber-400/95 px-3 py-3 shadow-[0_4px_0_#b45309]">
          <p className="text-sm font-black text-amber-950">
            {outcome.medal
              ? `${MEDAL_EMOJI[outcome.medal]} כל הכבוד! מדליית ${MEDAL_LABEL[outcome.medal]}`
              : 'הזמן נגמר! נסו שוב כדי לזכות במדליה'}
          </p>
          <p className="text-xs font-black text-amber-900/80">
            עניתם נכון על {outcome.correct} שאלות ברצף הזמן
          </p>
          <MedalCounter earned={earnedMedals} level={level} tone="dark" />
          <button
            type="button"
            onClick={restart}
            className="w-full rounded-2xl bg-emerald-600 py-3 text-base font-black text-white shadow-[0_4px_0_#047857] transition hover:bg-emerald-500 active:translate-y-[3px] active:shadow-none"
          >
            עוד סיבוב 🔁
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-amber-900/85 py-2.5 text-sm font-black text-amber-50 transition hover:bg-amber-900 active:translate-y-[2px]"
          >
            סיום
          </button>
        </div>
      )}
      </div>
    </MiniGameShell>
  );
}

/**
 * A brass control button.
 *
 * The station's controls are metal on the tower, so they get a bevelled face and a hard bottom edge
 * that collapses on press - the same "physical key" idiom the other stations use, in the tower's
 * colour rather than a shared one.
 */
function BrassButton({
  onClick,
  disabled,
  tone = 'amber',
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone?: 'amber' | 'stone';
  children: React.ReactNode;
}) {
  const skin =
    tone === 'amber'
      ? 'border-amber-900 bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 shadow-[0_4px_0_#78350f]'
      : 'border-stone-600 bg-gradient-to-b from-stone-300 to-stone-500 text-stone-900 shadow-[0_4px_0_#44403c]';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border-2 py-2.5 text-xs font-black transition active:translate-y-[3px] active:shadow-none disabled:opacity-50 sm:text-sm ${skin}`}
    >
      {children}
    </button>
  );
}

/**
 * The hour hand's BASE angle for a round starting at a given time - THE WHOLE HOURS ONLY.
 *
 * THE START'S MINUTES ARE NOT HERE. They live in `minutesTotal`, which opens at the start's
 * minute-of-hour, so the creep term supplies them. Splitting them that way is what keeps the two hands
 * agreeing: the minute hand is `minutesTotal * 6` and the creep is `minutesTotal * 0.5`, so both are
 * driven by the same quantity and neither can describe a different minute from the other.
 *
 * Putting the minutes in both places would double-count them, and putting them only here would leave the
 * minute hand at :00 - so this function deliberately carries the hours alone.
 *
 * The hours are taken modulo 12 because a dial cannot show more than twelve.
 */
function hourBaseFromMinutes(minutes: number): number {
  return (Math.floor(minutes / 60) % 12) * 30;
}

/**
 * The target a setting question is checked against, expressed on the 12-hour face.
 *
 * BOTH SIDES ARE COMPARED MODULO 12 HOURS. The dial cannot distinguish 08:00 from 20:00 - the hour
 * hand points at 8 either way - so a child who sets eight o'clock has answered the question that was
 * asked, however the generator happened to have stored the hour. Normalising here rather than at every
 * comparison keeps that rule in one place.
 */
function heldTarget(round: ClockRound): number {
  return ((round.target % 720) + 720) % 720;
}

/**
 * The elapsed-time wedge for a Level-3 question, or null.
 *
 * The arc spans from the FIRST time to the SECOND, clockwise, which is the direction time actually
 * travels - so the shaded region is the duration the child is being asked to name. Angles come from
 * the clock positions rather than from the minute counts, because the wedge has to line up with where
 * the hands are drawn, and the hour hand sits between the numbers.
 */
function wedgeFor(round: ClockRound): { fromDeg: number; toDeg: number } | null {
  if (round.task !== 'elapsed') return null;
  const start = fromMinutes(round.target);
  const end = fromMinutes(round.end);
  return {
    fromDeg: (start.hour % 12) * 30 + start.minute * 0.5,
    toDeg: (end.hour % 12) * 30 + end.minute * 0.5 + (round.elapsed >= 720 ? 360 : 0),
  };
}
