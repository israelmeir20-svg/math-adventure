/**
 * Station 1 - "מי באסם?" (Who's in the Barn?).
 *
 * The conductor: it wires the shared medal engine to the round loop, lays out the
 * stage, the six-key pad and the end-game party, and maps the loop's phase onto
 * the stage's animation state. All pacing lives in `useBarnLoop`; all geometry in
 * `stageGeometry`; all artwork in `animalAssets`.
 *
 * ===================================================================
 * THE STAGE IS A CSS SANDWICH: BACKDROP - ANIMALS - FOREGROUND.
 * ===================================================================
 *
 * The scene is no longer drawn in SVG. `BarnTunnelStage` stacks three layers:
 * the painted backdrop, the actor lane, and the barn's front face as a solid
 * overlay. The animals vanish into the barn because that foreground art covers
 * them completely - the occlusion comes from the artwork rather than from clip
 * geometry the code has to keep aligned with the picture.
 *
 * That matters for the game's core mechanic: the child is holding a running total
 * in their head, and the barn must never reveal how many animals are inside. The
 * layering is what guarantees it.
 *
 * ===================================================================
 * THE CLOCK WAITS FOR THE ANIMALS.
 * ===================================================================
 *
 * The countdown is FROZEN for the whole time the herds are moving and only starts
 * ticking once the keypad is live.
 *
 * This is a fairness rule, not a nicety. A round begins with several seconds of
 * animals walking - roughly 8 seconds on a full wave pair - during which the child
 * has nothing to answer: the keypad is locked and the question is not yet
 * answerable. Letting the clock run through that would charge them a large slice
 * of a 15-second run simply for watching, and the gold medal would depend on how
 * fast the animation happened to play rather than on the arithmetic.
 *
 * THAT SLICE IS NOW MOST OF THE RUN. At 30 seconds the walk-in was merely a large
 * fraction of the clock; against a 15-second window a full wave pair can consume
 * over half of it, so the freeze stops being a fairness nicety and becomes what
 * makes the round answerable at all. The freeze is therefore not optional here -
 * removing it would leave the timer expiring mid-animation.
 *
 * The freeze is implemented with `useFrozenClock`, the same helper the feeding
 * station uses, keyed on whether the round is still animating. It is released on
 * every path out - including teardown and unmount - so the clock can never be
 * left paused by a round that ended while frozen.
 *
 * ===================================================================
 * THE LAYOUT IS HEIGHT-FIRST, AND THAT DRIVES EVERYTHING HERE.
 * ===================================================================
 *
 * This board has four stacked bands to fit on one screen - HUD, stage, question,
 * keypad - and the modal around it only guarantees about 85vh with a 760px cap.
 * The old board let each band size itself, so the total exceeded the viewport and
 * a scrollbar appeared that cut the keypad off mid-row.
 *
 * The fix is to make the STAGE the only flexible band:
 *
 *   - The root is `h-full` with `overflow-hidden`, so nothing can escape.
 *   - The stage is `min-h-0 flex-1`, so it ABSORBS the leftover height instead of
 *     demanding a fixed one. `min-h-0` is load-bearing: a flex item's default
 *     `min-height: auto` refuses to shrink below its content, which is exactly
 *     what pushes a sibling off-screen.
 *   - The HUD, banner and keypad are `shrink-0`, so they keep their natural size
 *     and are never the things that get squeezed.
 *
 * The stage fills its box with `object-cover` artwork and percentage-positioned
 * actors, so shrinking it scales the whole scene rather than cropping it.
 *
 * ===================================================================
 * THE INSTRUCTION LINE IS NO LONGER IN THE HUD.
 * ===================================================================
 *
 * The old HUD carried a persistent "חיות דוהרות פנימה והחוצה - ספרו!" line. It
 * was the same sentence every round, so it stopped being read after the first
 * time while continuing to take vertical space and to compete with the countdown
 * for attention. The instruction now appears once, in the intro card, where it is
 * actually needed - and the running HUD keeps only the live numbers.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFarmTimer } from '../useFarmTimer';
import { BARN_RUN_SECONDS } from '../farmTimerData';
import { FarmTimerHud } from '../FarmTimerHud';
import { useFrozenClock } from '../shared/useFrozenClock';
import { useBarnLoop, type Phase } from './useBarnLoop';
import BarnTunnelStage, { type StagePhase } from './BarnTunnelStage';
import BarnKeypad from './BarnKeypad';
import BarnPartyResults from './BarnPartyResults';
import type { FarmMedal } from '../farmTimerData';
import { useStationProgress, type StationLevel } from '../../../features/progression/useStationProgress';

interface GameProps {
  onReward: (medal: FarmMedal) => void;
  bestMedalLabel?: string;
  /**
   * The station level chosen on the launch card.
   *
   * DEFAULTS TO 1 SO THE STANDALONE HOSTS STILL COMPILE, and so a station reached by some path
   * that has not been given a level yet plays the first one rather than refusing to mount. The
   * farm hub always passes the child's real choice.
   *
   * IT CHANGES NOTHING ABOUT THE RUN ITSELF. The barn's difficulty is the shared medal ladder
   * against a fixed ten-second clock; the level is tracked so a gold run can be counted toward
   * the three that open the next one, not so the board can be retuned. That is deliberate - the
   * brief for this change is progression, and retuning the maths underneath it would be a
   * different decision made in the wrong place.
   */
  level?: StationLevel;
}

export default function WhoIsInTheBarnGame({ onReward, bestMedalLabel, level = 1 }: GameProps) {
  /*
   * The unified 3-level record for this station.
   *
   * ONLY THE MEDALS ARE READ HERE - the run is not gated on `progress` and the child cannot be
   * sent back to a start screen mid-session. `recordGoldMedal` is called from the settlement
   * handler below, and because the store is read through a ref-backed lookup it is safe to call
   * from a timer callback that closed over an older render.
   */
  const { progress, recordGoldMedal } = useStationProgress('barnWho');
  // The count for the card, snapshotted at settlement; null until the run's medal is decided.
  const [earnedMedals, setEarnedMedals] = useState(progress.medals[level]);

  /*
   * A GOLD RUN COUNTS TOWARD THE UNLOCK; SILVER, BRONZE AND A PRACTICE STAR DO NOT.
   *
   * WRAPPING `onReward` RATHER THAN THE TIMER'S SETTLEMENT. `useFarmTimer` already guarantees the
   * callback fires exactly once per finished run, and the medal it passes is the one the run
   * actually earned - so this is the only place that can both see the tier and know the run has
   * ended. It also keeps the rule in one line: the medal is graded by the timer, and only the top
   * grade is progression.
   */
  const handleReward = useCallback(
    (medal: FarmMedal) => {
      if (medal.id === 'gold') {
        const outcome = recordGoldMedal(level);
        setEarnedMedals(outcome.newMedals);
      } else {
        // A non-gold run still shows the ladder; it simply did not move the counter.
        setEarnedMedals(progress.medals[level]);
      }
      onReward(medal);
    },
    [level, onReward, progress.medals, recordGoldMedal],
  );

  // The barn runs a shorter clock than the rest of the farm; see `BARN_RUN_SECONDS`.
  const timer = useFarmTimer(handleReward, BARN_RUN_SECONDS);
  const loop = useBarnLoop({
    onCorrect: timer.score,
    onWrong: timer.miss,
    over: timer.settled,
  });

  const { phase, round, feedback } = loop;
  const playing = phase !== 'INTRO' && phase !== 'GAME_OVER';

  /**
   * THE RUN STARTS ITSELF, BECAUSE THE RULES ARE NOW READ ON THE LAUNCH CARD.
   *
   * This station used to open on `BarnIntroCard`, and the child left it by tapping a button that
   * called `timer.start()` and `loop.begin()`. The launch card now carries Teacher Tamar's tip and the
   * task, so that card was a second reading screen - and the tap did nothing the game cannot do for
   * itself.
   *
   * BOTH CALLS ARE REQUIRED, AND THE SECOND ONE IS THE EASY ONE TO MISS. `begin()` is what leaves the
   * `INTRO` phase and builds round 1, so starting only the clock would leave the board showing the
   * empty barn with a countdown already running against it - the worst possible state, since the child
   * would be charged for time they cannot yet spend.
   *
   * IT RUNS ONCE, ON MOUNT. The party card's "play again" calls `reset()`, `start()` and `begin()`
   * itself; re-firing here would restart round 1 a second time and race that explicit sequence.
   */
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    timer.start();
    loop.begin();
  }, [timer.start, loop.begin]);

  /*
   * THE CLOCK FREEZE.
   *
   * The countdown is held while the herds are on the move, and released the
   * moment the keypad goes live. Everything except ANSWERING counts as "still
   * animating": the two run waves, the pause between them, and the brief
   * FAST_FEEDBACK beat where the child's answer is being acknowledged.
   *
   * A DENY-LIST WOULD BE THE WRONG SHAPE HERE. Writing it as "not ANSWERING" rather
   * than "is RUNNING_IN or RUNNING_OUT or SLAMMING or FAST_FEEDBACK" means any
   * phase added later is frozen by default - the safe direction. A new phase that
   * forgot to declare itself would otherwise silently start charging the child for
   * animation time.
   *
   * The intro and the party are excluded deliberately: INTRO has no run to pace,
   * and GAME_OVER means the run is already settled, where continuing to call
   * `pause` would fight the timer's own teardown.
   */
  const animating = playing && phase !== 'ANSWERING';
  useFrozenClock(animating, timer.pause, timer.resume);

  return (
    /*
     * `h-full` rather than the old auto height, and `overflow-hidden` so a
     * rounding error can never produce a scrollbar. `select-none` keeps a child's
     * repeated taps from selecting text instead of pressing keys.
     */
    <div className="relative flex h-full max-h-full select-none flex-col gap-2 overflow-hidden">
      <div className="shrink-0">
        <FarmTimerHud
          timer={timer}
          runSeconds={BARN_RUN_SECONDS}
          readyHint={
            bestMedalLabel ? `השיא שלכם: ${bestMedalLabel}` : 'ספרו נכון 6 פעמים למדליית זהב!'
          }
        />
      </div>

      {/*
        THE STAGE - the only flexible band.
        `min-h-0` lets it shrink below its content height; `flex-1` lets it grow
        into spare space on a tall screen. The explicit floor stops it collapsing
        to nothing on a very short viewport.
      */}
      <div className="flex min-h-[180px] flex-1 items-center justify-center">
        {/*
          Keyed on the round id, so each round gets a brand-new stage: a fresh rAF
          clock at zero and fresh actor nodes. That is what guarantees round 2
          animates exactly like round 1, instead of inheriting a finished wave.
        */}
        <BarnTunnelStage
          key={round.id}
          phase={stagePhaseFor(phase)}
          incoming={round.incoming}
          outgoing={round.outgoing}
        />
      </div>

      {playing && (
        <div className="shrink-0">
          <BarnKeypad
            locked={!loop.live}
            shake={feedback === 'wrong'}
            prompt={round.prompt}
            onPick={loop.pick}
          />
        </div>
      )}

      {phase === 'GAME_OVER' && timer.medal && (
        <BarnPartyResults
          correct={timer.correct}
          medal={timer.medal}
          rewarded={timer.settled}
          level={level}
          earnedMedals={earnedMedals}
          bestMedalLabel={bestMedalLabel}
          onPlayAgain={() => {
            timer.reset();
            timer.start();
            loop.begin();
          }}
        />
      )}

      {/* Fast feedback: a quick green or red pulse over the whole board. */}
      {feedback !== 'none' && (
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-2xl ${
            feedback === 'correct' ? 'bg-emerald-400/25' : 'bg-rose-400/20'
          }`}
        />
      )}
    </div>
  );
}

/** The intro shows the empty barn; the party shows the dancing herd. */
function stagePhaseFor(phase: Phase): StagePhase {
  if (phase === 'GAME_OVER') return 'PARTY';
  if (phase === 'RUNNING_IN') return 'RUNNING_IN';
  if (phase === 'RUNNING_OUT') return 'RUNNING_OUT';
  if (phase === 'SLAMMING') return 'SLAMMING';
  // During the answer itself the herds are fully done and off the stage.
  return 'ANSWERING';
}
