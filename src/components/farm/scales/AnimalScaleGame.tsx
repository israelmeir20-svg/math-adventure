/**
 * Station 3 - "מאזניים בחווה" (Animal Scales).
 *
 * The child taps animals from the shelf onto the right pan until both pans weigh the
 * same. The beam tilts proportionally as the pans fill, and the moment the weights
 * match it locks flat, glows, throws a burst of stars, chimes and holds for a beat
 * before the next puzzle is dealt.
 *
 * There is no wrong answer to punish: overloading simply tilts the beam and, if the
 * imbalance is big enough, flings the lighter pan's animals in a hop.
 *
 * ===================================================================
 * THE ROUND IS A SPEED RUN, NOT A FIXED SET OF STAGES.
 * ===================================================================
 *
 * The run ends when the clock hits zero, and the medal comes from how many scales were
 * balanced in that window (`medalForScore`). The `שלב N` counter in the header is
 * therefore PROGRESS FEEDBACK, not a win condition - it counts puzzles solved and keeps
 * climbing for as long as the child keeps balancing. There is no final stage to reach
 * and no stage-victory modal, because the timer already supplies the ending and the
 * results card already reports the score.
 *
 * Framing it this way matters because the two are easy to conflate: a "stage 3 of 3"
 * counter implies the run is bounded by puzzles, which would contradict a clock that
 * can run out at stage 7.
 *
 * ===================================================================
 * THE CLOCK STARTS ON MOUNT, AND FREEZES ON A SOLVE.
 * ===================================================================
 *
 * The rules are now read on the launch card that opens the station rather than in
 * a start overlay, so nothing is timed before the child reaches their first puzzle.
 * And during the 1.5-second hold after a correct answer the countdown is paused:
 * the child has already earned the point, so charging them time to watch their own
 * celebration would be a penalty for succeeding.
 *
 * Placement state lives in `useScaleRound`, the solved->next hand-off in
 * `useResolveAdvance`, and all geometry in `ScaleStage`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFarmTimer } from '../useFarmTimer';
import { GOLD_SCORE } from '../farmTimerData';
import { playTone } from '../../math/audioTone';
import { WoodenPlaque } from '../StationParts';
import ScaleStage from './ScaleStage';
import ScaleShelf from './ScaleShelf';
import ScaleResults from './ScaleResults';
import ScaleHeader from './ScaleHeader';
import PanReturnRow from './PanReturnRow';
import BalanceBurst from './BalanceBurst';
import { useScaleRound } from './useScaleRound';
import { useResolveAdvance } from './useResolveAdvance';
import { DEGREES_PER_UNIT, MAX_TILT } from './scaleStageData';
import type { FarmMedal } from '../farmTimerData';
import type { ScaleAnimal } from './scaleWeights';
import { useStationProgress, type StationLevel } from '../../../features/progression/useStationProgress';

/** How many stages the header counts towards before it stops counting up. */
const STAGE_TARGET = 3;

interface GameProps {
  onReward: (medal: FarmMedal) => void;
  bestMedalLabel?: string;
  /**
   * The station level chosen on the launch card.
   *
   * DEFAULTS TO 1 for the hosts that do not pass one yet, and - as in the other stations - it
   * does NOT retune the game: the puzzles and the shared medal ladder are unchanged, and the
   * level exists so a gold run can be counted toward the three that open the next one.
   */
  level?: StationLevel;
}

export default function AnimalScaleGame({ onReward, bestMedalLabel, level = 1 }: GameProps) {
  const { progress, recordGoldMedal } = useStationProgress('scales');
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
  const sc = useScaleRound();
  const { balanced, leftWeight, rightWeight, roundNumber, place, removeAt, deal } = sc;

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

  const { isResolving, justSolved, cancel } = useResolveAdvance({
    leftWeight,
    rightWeight,
    running: timer.running,
    settled: timer.settled,
    roundNumber,
    deal,
    onSolved: timer.score,
  });

  /*
   * THE CELEBRATION, AND THE CLOCK FREEZE THAT GOES WITH IT.
   *
   * Keyed on `justSolved` rather than `isResolving`: the latter stays true for the whole
   * 1.5-second hold, so an unrelated re-render mid-hold would re-fire the chime. This
   * runs exactly once per solved puzzle.
   *
   * The freeze is scoped to the same window and released in the cleanup, so the clock
   * can never be left paused if this component unmounts mid-hold.
   */
  useEffect(() => {
    if (!justSolved) return;
    playTone('balance');
    timer.pause();
    return () => timer.resume();
    // `timer` is a stable memo from the hook whose identity only changes when its own
    // state does; depending on it here would re-run this effect mid-hold and re-chime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justSolved]);

  const handlePlace = useCallback(
    (animal: ScaleAnimal) => {
      if (isResolving || !timer.running) return;
      place(animal);
    },
    [isResolving, place, timer.running],
  );

  /**
   * Tapping an animal on the right pan sends it back to the shelf.
   *
   * The right pan renders `[...prePlaced, ...placed]`, so the first `prePlaced` sprites
   * belong to the puzzle (level 3's missing-addend seed) and only the ones after them
   * are the child's own moves. `removeAt` indexes into `placed`, so the offset must be
   * subtracted - and pre-placed animals are ignored, since removing them would change
   * the puzzle's given facts.
   */
  /**
   * Tapping an animal on the right pan sends it back to the shelf.
   *
   * The right pan renders `[...prePlaced, ...placed]`, so the first `prePlaced` sprites
   * belong to the puzzle (level 3's missing-addend seed) and only the ones after them
   * are the child's own moves. `removeAt` indexes into `placed`, so the offset must be
   * subtracted - and pre-placed animals are ignored, since removing them would change
   * the puzzle's given facts.
   *
   * The guard is the same one `handlePlace` uses: no removals while a solved puzzle is
   * being swapped, and none before the clock starts or after it stops.
   */
  const prePlacedCount = sc.puzzle.right.length;
  const handleRemoveAnimal = useCallback(
    (index: number) => {
      if (isResolving || !timer.running || timer.settled) return;
      const placedIndex = index - prePlacedCount;
      if (placedIndex < 0) return;
      removeAt(placedIndex);
    },
    [isResolving, prePlacedCount, removeAt, timer.running, timer.settled],
  );

  const diff = leftWeight - rightWeight;
  /*
   * THE BEAM ANGLE, AND WHY THE SIGN IS NEGATED.
   *
   * `diff` is positive when the LEFT pan is heavier, and a heavier pan must sink. CSS
   * rotation is CLOCKWISE-POSITIVE: `rotate(+theta)` lifts the beam's left end and drops
   * its right end. So a heavier left pan needs a NEGATIVE angle.
   *
   * This was a latent bug carried over from the SVG stage, where the same expression
   * happened to look right under a different coordinate system. Moving to CSS transforms
   * silently inverted it, so the scale began tipping AWAY from the heavier side - adding
   * an animal made that pan rise. Nothing in the types or the build can catch that, which
   * is why the geometry is verified numerically instead.
   */
  const angle = balanced
    ? 0
    : Math.max(-MAX_TILT, Math.min(MAX_TILT, -diff * DEGREES_PER_UNIT));
  const locked = !timer.running || balanced || isResolving || timer.settled;

  const prompt = balanced
    ? `מאוזן! ${leftWeight} = ${rightWeight} 🎉`
    : `${leftWeight} מול ${rightWeight} - כמה חסר כדי לאזן?`;

  return (
    /*
     * THE GAME COLUMN FILLS ITS PARENT AND CLIPS ITS OWN OVERFLOW.
     *
     * `h-full` + `min-h-0` is what makes the column the same height as the modal's content
     * box rather than "as tall as its contents". Without it a flex column grows to fit its
     * children, so nothing below ever shrinks - which is precisely how the drawer ended up
     * 27px past the dialog's bottom edge with the page scrolling at 818px in an 800px
     * window.
     *
     * `overflow-hidden` is the backstop: if a child still refuses to shrink, it is clipped
     * at the column's boundary instead of pushing the whole dialog into a scrollbar.
     */
    <div className="relative flex h-full min-h-0 flex-col gap-1 overflow-hidden">
      <ScaleHeader
        round={roundNumber}
        correct={timer.correct}
        secondsLeft={timer.secondsLeft}
        running={timer.running}
        goldScore={GOLD_SCORE}
        stageTarget={STAGE_TARGET}
      />

      {/*
        THE FARM SCENE: THE ONE THING THAT GIVES UP SPACE.
        `flex-1 min-h-0` lets the backdrop shrink so the drawer below can keep its full
        height, which is the trade the layout needs - the picture can lose a few pixels
        without anything becoming unreadable, whereas a clipped answer card is a card the
        child cannot tap.

        `min-h-0` is the load-bearing half and is mandatory here: a flex item defaults to
        `min-height: auto`, which means it REFUSES to shrink below its content. Without it
        the scene holds its full intrinsic height (the aspect-locked backdrop plus the
        scale hanging past its bottom edge) and the overflow lands on the drawer - the
        exact cut-off this fixes. The earlier `max-h-[52vh]` cap was not enough on its own
        because the scene's intrinsic height is driven by its aspect ratio, not the
        viewport.

        The scene clips its own overflow, so the few pixels of the pedestal that hang below
        the frame are cut by the picture's edge rather than creating a scrollbar.
      */}
      <div className="relative min-h-0 w-full flex-1 overflow-hidden">
        {/* Re-keying on the round remounts every painted layer, so no leftover
            transform, transition or flung state survives into the next puzzle. */}
        <ScaleStage
          key={roundNumber}
          left={sc.left}
          right={sc.right}
          angle={angle}
          balanced={balanced}
          inert={locked}
          onRemoveAnimal={handleRemoveAnimal}
        />

        {/* Keyed on the round so each solve mounts a fresh burst with freshly
            sampled particle geometry, instead of reusing the previous ring. */}
        <BalanceBurst key={`burst-${roundNumber}`} active={justSolved} />
      </div>

      <WoodenPlaque emoji="⚖️" className="my-0.5">
        {prompt}
      </WoodenPlaque>

      {/*
        THE DRAWER IS FIXED HEIGHT AND NEVER SHRINKS.
        `shrink-0 h-28` reserves exactly 112px for the cards whatever the window does, so
        the sprites and their weight badges are always fully visible. `h-28` rather than a
        `min-h` floor: the cards are a fixed size, so a definite height removes the last
        way this block could grow and steal space from the scene.

        The 12px bottom padding is the breathing room under the badges - without it the
        drawer's last row sits flush against the column's clipped edge.
      */}
      <div className="flex h-28 w-full shrink-0 items-center justify-center gap-3 pb-3">
        <ScaleShelf pool={sc.pool} locked={locked} full={sc.full} onPick={handlePlace} />
      </div>

      <PanReturnRow placed={sc.placed} locked={locked} onReturn={removeAt} />

      {timer.medal && (
        <ScaleResults
          correct={timer.correct}
          medal={timer.medal}
          rewarded={timer.settled}
          level={level}
          earnedMedals={earnedMedals}
          bestMedalLabel={bestMedalLabel}
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
