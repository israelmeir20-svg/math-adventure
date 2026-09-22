/**
 * The canvas for "שעת האכלה".
 *
 * The board reads as a picture of the problem: a signboard stating how much food
 * there is, and a row of hungry animals each waiting behind an empty bowl. The
 * whole question is "how do we share what is on the sign?", so the sign is the
 * biggest, highest-contrast thing on the canvas.
 *
 * ===================================================================
 * THE SCENERY IS A PAINTED BACKGROUND, NOT DRAWN SVG.
 * ===================================================================
 *
 * The sky, hills and meadow used to be three flat shapes in this component. They
 * are gone, replaced by a single `<image>` of the painted backdrop
 * (`cute/background.png`) pinned to the viewBox. The reasons are worth recording
 * because re-adding a stray <rect> here would silently paint over the artwork:
 *
 *   - the flat version had a hard horizon line and no depth, so the animals looked
 *     pasted onto a diagram rather than standing in a place;
 *   - a painted scene cannot be reproduced in a few <path>s without ballooning
 *     this file;
 *   - the viewBox is now exactly the artwork's aspect ratio, so one image with
 *     `preserveAspectRatio="none"` fills it exactly with no crop and no letterbox.
 *
 * ONLY THE INTERACTIVE PROPS ARE DRAWN IN SVG. Everything below is the sign, the
 * bowls, the animals and the feedback - the things whose position carries meaning.
 *
 * THE STAGE IS WHERE A WRONG ANSWER BECOMES VISIBLE. When the child answers, the
 * parent hands down a `feedback` describing what their number actually did to
 * the row of bowls, and this component draws the consequence: which bowls came
 * up short, how much is still in the basket, and a banner naming the arithmetic.
 * Nothing about the answer is derivable from the stage before the tap - every
 * field is null while `status` is 'idle'.
 *
 * THE REMAINDER IS NOT DRAWN DURING THE QUESTION. It exists only once the parent
 * supplies it, which keeps "the answer is hidden until answered" a property of
 * the data flow rather than a display flag someone could forget to reset.
 */
import Trough from './Trough';
import SupplySign from './SupplySign';
import LeftoverBasket from './LeftoverBasket';
import FeedbackBanner from './FeedbackBanner';
import { SIGN_CX, SIGN_CY, VIEW_H, VIEW_W, slotSpec } from './feedingData';
import { backgroundArt } from './feedingAnimals';
import { distribute, shortfallCount, type FeedbackState } from './feedingFeedback';
import type { FeedingAnimal, Food } from './feedingTypes';

interface FeedingStageProps {
  animals: FeedingAnimal[];
  food: Food;
  totalFood: number;
  /** What the child's answer did. `idle` means the question is still on screen. */
  feedback: FeedbackState;
  /** True while the food is dropping in. */
  filled: boolean;
}

export default function FeedingStage({
  animals,
  food,
  totalFood,
  feedback,
  filled,
}: FeedingStageProps) {
  const spec = slotSpec(animals.length);
  const count = animals.length;
  const asking = feedback.status === 'idle';

  // What each bowl actually receives. Null while asking, so no answer leaks.
  const actuals = asking ? null : distribute(totalFood, count, feedback.chosen);
  const short = actuals === null ? 0 : shortfallCount(actuals, feedback.chosen);

  return (
    /*
     * THE SVG MUST FIT THE BOX IT IS GIVEN, NOT THE OTHER WAY ROUND.
     *
     * It was `w-full h-auto`, which is an aspect-ratio-driven size: the browser
     * computes the height from the width and the viewBox. In a flex column, an
     * element whose height is derived from its width is unbounded from below - the
     * layout cannot shrink it, because its height is not the layout's to choose.
     * That is the mechanism that pushed the keypad off the bottom of the screen.
     *
     * `h-full w-full` inverts the relationship: the SVG takes exactly the box the
     * flex parent allocated and scales its contents to sit inside it.
     * `preserveAspectRatio="xMidYMid meet"` is then what keeps the artwork
     * undistorted - it fits the 16:9 scene inside whatever box it is handed,
     * letterboxing rather than stretching. The stage therefore shrinks gracefully
     * on a short viewport instead of overflowing, and grows to fill a tall one.
     *
     * The parent supplies that box; see the playfield wrapper in `FeedingGame`.
     */
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label={`${totalFood} ${food.name} ו-${count} חיות`}
    >
      {/*
        THE BACKDROP. Drawn first so everything else layers over it, and stretched
        across the whole viewBox. `none` is correct here rather than `cover`-style
        behaviour: the viewBox is already the artwork's own 16:9 ratio, so there is
        nothing to letterbox, and any other setting would reintroduce a crop.
      */}
      <image
        href={backgroundArt()}
        x={0}
        y={0}
        width={VIEW_W}
        height={VIEW_H}
        preserveAspectRatio="none"
      />

      {/* --- The supply signboard: the dividend, stated large. --- */}
      <g transform={`translate(${SIGN_CX} ${SIGN_CY})`}>
        <SupplySign food={food} totalFood={totalFood} />
      </g>

      {/* --- The leftover basket, beside the sign. Hidden on 'too_much', where
              the food ran out and there is nothing left to report. --- */}
      {!asking && feedback.status !== 'too_much' && (
        <g transform={`translate(${SIGN_CX + 214} ${SIGN_CY + 10})`}>
          <LeftoverBasket feedback={feedback} totalFood={totalFood} count={count} />
        </g>
      )}

      {/* --- The row of animals and their bowls. --- */}
      {animals.map((animal, index) => (
        <Trough
          key={`${animal}-${index}`}
          animal={animal}
          centreX={spec.centres[index] ?? 0}
          sprite={spec.sprite}
          foodEmoji={food.emoji}
          actual={actuals === null ? null : (actuals[index] ?? 0)}
          shortchanged={short > 0 && (actuals?.[index] ?? 0) < feedback.chosen}
          filled={filled}
          celebrating={feedback.status === 'correct'}
          index={index}
        />
      ))}

      {/* --- The explanation, over the meadow so it is never missed. --- */}
      <FeedbackBanner feedback={feedback} totalFood={totalFood} count={count} />
    </svg>
  );
}
