/**
 * "המתכון של השף" - the chef's sequential memory game.
 *
 * THE CLOCK PAUSES DURING PRESENTATION AND MEMORIZATION:
 * The 60-second timer ticks strictly during active INPUT, so children have
 * calm focus while reading the recipe without bleeding precious seconds.
 */
import { useEffect, useRef } from 'react';
import { useFarmTimer } from '../useFarmTimer';
import { GOLD_SCORE } from '../farmTimerData';
import type { FarmMedal } from '../farmTimerData';
import RecipeHeader from './RecipeHeader';
import RecipeStage from './RecipeStage';
import RecipeDPad from './RecipeDPad';
import RecipeResults from './RecipeResults';
import { useReveal } from './useReveal';
import { useRecipeRound } from './useRecipeRound';
import type { Direction } from './recipeTypes';

interface RecipeGameProps {
  onReward: (medal: FarmMedal) => void;
  bestMedalLabel?: string;
  titleLine?: string;
  /** Present only when opened from a map anchor, so the card can offer an exit. */
  onClose?: () => void;
}

const ARROWS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

export default function RecipeGame({ onReward, bestMedalLabel, titleLine, onClose }: RecipeGameProps) {
  const timer = useFarmTimer(onReward);
  const state = useRecipeRound({
    running: timer.running,
    settled: timer.settled,
    onScore: timer.score,
    onMiss: timer.miss,
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

  const revealed = useReveal({
    roundNumber: state.roundNumber,
    length: state.round.sequence.length,
    running: timer.running && state.revealing,
    onDone: state.openInput,
  });

  // הקפאת השעון: רץ אך ורק בזמן הקלדה פעילה של הילדה
  useEffect(() => {
    if (!timer.running || timer.settled) return;
    if (state.phase === 'input') {
      timer.resume();
    } else {
      timer.pause();
    }
  }, [state.phase, timer.running, timer.settled, timer.pause, timer.resume]);

  useEffect(() => {
    if (state.phase !== 'input' || !timer.running || timer.settled) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = ARROWS[event.key];
      if (direction === undefined) return;
      event.preventDefault();
      if (event.repeat) return;
      state.press(direction);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, timer.running, timer.settled]);

  const filled = state.revealing ? revealed : state.entered;

  /*
   * THE HEIGHT BUDGET IS EXPLICIT, AND `flex-1` ON THE STAGE WAS THE BUG.
   *
   * Both `RecipeStage` and `RecipeDPad` are `w-full` with a `viewBox` of 800x360, and a
   * `w-full` SVG with no height constraint sizes itself from its ASPECT RATIO - 360/800, so
   * 45% of the container's width EACH. The panel is `max-w-4xl` with padding, so that is
   * ~396px apiece and ~792px for the pair, inside a frame of roughly 85vh.
   *
   * AN EARLIER FIX MADE THE STAGE `min-h-0 flex-1` AND THAT SWAPPED ONE OVERFLOW FOR
   * ANOTHER. `flex-1` is a licence to GROW, and the stage's own SVG is `h-full` - so it
   * expanded into every pixel the pad did not claim, and `preserveAspectRatio="xMidYMid
   * meet"` then scaled the kitchen drawing up to fill that tall box. The visible result was
   * a board that ate the whole panel with the keypad squeezed to a sliver underneath it.
   * The pad was never clipped; it was being starved.
   *
   * SO THE STAGE IS NOW CAPPED AND THE PAD IS GUARANTEED. A percentage cap is the only
   * constraint that survives an unknown frame height - `max-h-[55%]` says "never more than
   * 55% of the panel" regardless of whether that panel is 500px or 900px tall. `min-h-0`
   * stays because a flex item's default `min-height: auto` floors it at its content size and
   * refuses to shrink, which is what pushes a sibling off-screen in the first place.
   *
   * THE PAD'S SHARE IS ITS OWN, NOT LEFTOVER. `h-[40%]` reserves the space outright and
   * `shrink-0` forbids the flex algorithm from taking it back, so the control surface is
   * sized by the frame rather than by whatever the stage happens to leave behind. Between
   * them the two bands claim 95% of the column and the `gap-2` and header take the rest -
   * and because both are percentages of the SAME box, they cannot add up to more than it.
   */
  return (
    <div className="relative flex h-full max-h-full min-h-0 flex-1 flex-col justify-between gap-2 overflow-hidden">
      <RecipeHeader
        round={state.roundNumber}
        correct={timer.correct}
        secondsLeft={timer.secondsLeft}
        running={timer.running}
        goldScore={GOLD_SCORE}
        titleLine={titleLine}
      />

      <div className="min-h-0 max-h-[55%] w-full flex-1">
        <RecipeStage
          key={state.roundNumber}
          round={state.round}
          phase={state.phase}
          filled={filled}
          shake={state.phase === 'wrong'}
        />
      </div>

      {/*
        The pad is the game's control surface: guaranteed height, never squeezed.

        THE INNER BOX IS SQUARE BECAUSE THE CROSS IS SQUARE. `viewBox` is now a tight square
        around the arms, and `xMidYMid meet` fits a square drawing into whatever box it gets -
        so in a wide, short band the cross would be sized by the HEIGHT and leave the extra
        width as dead space on both sides. A square, height-first box with `aspect-square`
        means the drawing always fills its container in both axes and the only variable is
        how large that container is.

        `max-w`/`max-h` CAPPED AGAINST THE BAND, NOT THE VIEWPORT. With `h-full` the square
        would otherwise take the full 40% band height and could push past the frame's bottom
        edge on a short window - which is the clipping this whole layout keeps fighting. The
        caps let it shrink instead, and `items-center justify-center` keeps it centred rather
        than pinned to a corner.
      */}
      <div className="flex h-[40%] w-full shrink-0 items-center justify-center overflow-hidden pb-1">
        <div className="flex h-full max-h-[min(38vh,15rem)] w-full max-w-[min(38vh,15rem)] items-center justify-center">
          <RecipeDPad
            round={state.round}
            disabled={state.phase !== 'input' || !timer.running || timer.settled}
            rejected={state.rejected}
            onTap={state.press}
          />
        </div>
      </div>

      {timer.medal && (
        <RecipeResults
          correct={timer.correct}
          medal={timer.medal}
          rewarded={timer.settled}
          bestMedalLabel={bestMedalLabel}
          onClose={onClose}
          onPlayAgain={() => {
            state.restart();
            timer.reset();
            timer.start();
          }}
        />
      )}
    </div>
  );
}