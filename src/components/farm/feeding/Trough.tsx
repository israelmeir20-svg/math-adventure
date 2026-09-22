/**
 * One animal standing behind its trough, plus the food that lands in it.
 *
 * THE LAYER ORDER IS THE WHOLE POINT:
 *
 *   1. the animal      sprite, feet BELOW the trough's rim (BOWL_Y)
 *   2. the cast shadow a soft ellipse on the grass, drawn first so it is BEHIND
 *   3. the trough      body, plank panel, and the thick rim lip
 *   4. the cavity      the dark opening at the rim
 *   5. the food        drawn last, so it sits INSIDE the cavity
 *
 * Because the trough hides the lower part of the sprite, the animal appears to
 * stand on the grass behind it. The rim LIP is drawn deliberately proud of the
 * body - that overhang is what swallows the feet convincingly.
 *
 * THE TROUGH SHOWS WHAT IT ACTUALLY GOT, NOT WHAT WAS ASKED FOR. That distinction
 * is the entire error-feedback design: when the child gives 6 each from a pile
 * of 8, the first trough really does hold 6 and the second really does hold 2. A
 * trough that came up short is washed red and the animal says so. If every trough
 * just showed "6", the child would be told the answer was fine.
 *
 * TWO CSS-TRIGGERED ANIMATIONS, NO REACT STATE:
 *
 *   foodDrop     plays on the food group the moment `filled` flips true
 *   happyBounce  plays on the animal for the same reason
 *
 * Both end at the identity transform, so the element lands and stays there.
 */
import { ANIMAL_META, spriteAspect } from './feedingAnimals';
import BowlContents from './BowlContents';
import {
  BOWL_RX,
  BOWL_RY,
  BOWL_Y,
  BUBBLE_MIN_Y,
  SPRITE_CEILING,
  SPRITE_TUCK,
  spriteBox,
} from './feedingData';
import type { FeedingAnimal } from './feedingTypes';

interface TroughProps {
  animal: FeedingAnimal;
  /** Centre x of this slot. */
  centreX: number;
  /**
   * The slot's sprite budget, in stage units. This is the box WIDTH; the height
   * is derived from the slide's own proportions so the artwork fills the box.
   */
  sprite: number;
  /** The food emoji, once known. */
  foodEmoji: string;
  /**
   * How many items THIS bowl actually received. Null while the question is on
   * screen, so nothing about the answer leaks before the tap.
   */
  actual: number | null;
  /** True when this bowl got less than the child intended - ring it in red. */
  shortchanged: boolean;
  /** True once the food should drop in. */
  filled: boolean;
  /** True for the happy jump; false on a miss, where the animals stay put. */
  celebrating: boolean;
  /** Staggers the drop so a row of bowls does not move in lockstep. */
  index: number;
}

export default function Trough({
  animal,
  centreX,
  sprite,
  foodEmoji,
  actual,
  shortchanged,
  filled,
  celebrating,
  index,
}: TroughProps) {
  const meta = ANIMAL_META[animal];
  const delay = `${index * 90}ms`;

  /**
   * The sprite's box, sized to the slide's own proportions.
   *
   * `sprite` is the slot's WIDTH budget. The height follows the slide so `meet`
   * fills the box exactly - a square box around a 16:9 slide is the bug that made
   * the animals float, because the artwork came up roughly half the box short and
   * left a wide empty band between the animal and its bowl. A portrait slide is
   * fitted the other way round so it cannot outgrow the signboard.
   */
  const box = spriteBox(sprite, spriteAspect(animal), SPRITE_CEILING);

  /**
   * The box's top edge.
   *
   * The BOTTOM is pinned to the bowl rim plus the tuck, so the artwork's lower
   * edge sits `SPRITE_TUCK` below the rim and the bowl - drawn after this - covers
   * the feet and the bottom of the belly. Everything above the rim stays visible.
   */
  const boxTop = BOWL_Y + SPRITE_TUCK - box.h;

  /**
   * Where the animal's head sits, for the complaint bubble above it.
   *
   * Clamped so a large sprite cannot push its bubble into the signboard. `Math.max`
   * because a SMALLER bubbleY is HIGHER on the canvas - the clamp is therefore a
   * floor on the value, not a ceiling.
   */
  const bubbleY = Math.max(BUBBLE_MIN_Y, boxTop - 6);

  return (
    <g transform={`translate(${centreX} 0)`}>
      {/* --- 1. The animal, firmly BEHIND the trough. ---
              LAYER ORDER IS THE CONTRACT: this <image> is emitted FIRST, and the
              trough body, rim lip and cavity are drawn after it, so they paint
              over the sprite's lower body. That is what makes the animal look like
              it is standing behind the trough rather than balanced on the rim.

              The box is centred on the slot and sized so the artwork fills it, so
              there is no empty band between the animal and its trough. */}
      <g
        style={
          celebrating
            ? {
                animation: `happyBounce 500ms ease-in-out ${delay}`,
                transformBox: 'fill-box',
                transformOrigin: 'center bottom',
              }
            : undefined
        }
      >
        <image
          href={meta.src}
          x={-box.w / 2}
          y={boxTop}
          width={box.w}
          height={box.h}
          preserveAspectRatio="xMidYMax meet"
        />
      </g>

      {/* --- 2. The cast shadow, on the grass, BEFORE the trough is drawn. ---
              A soft ellipse under the bowl is what plants it on the ground. Drawn
              first so the trough's own body sits on top of it, and kept wide and
              shallow so it reads as contact shadow rather than a second object. */}
      <ellipse
        cx={0}
        cy={BOWL_Y + BOWL_RY * 2 + 4}
        rx={BOWL_RX + 8}
        ry={BOWL_RY * 0.9}
        fill="#1c1206"
        opacity={0.28}
      />

      {/* --- 3. The wooden trough: a planed plank body with a rim and a belly. ---
              Built as three stacked pieces so it reads as joinery rather than a
              flat silhouette:

                a) the BODY, a rounded vessel in warm wood
                b) the FRONT PANEL, a lighter plank across the belly for grain
                c) the RIM LIP, a thick band along the top edge

              The lip is what the animal stands behind, so it is drawn thick and
              slightly proud of the body - that overhang is what makes the sprite's
              feet disappear convincingly. */}
      <g transform={`translate(0 ${BOWL_Y})`}>
        {/* a) The body. */}
        <path
          d={`M ${-BOWL_RX},0 Q ${-BOWL_RX - 3},${BOWL_RY * 2.1} 0,${BOWL_RY * 2.1} Q ${BOWL_RX + 3},${BOWL_RY * 2.1} ${BOWL_RX},0 Z`}
          fill={shortchanged ? '#b45309' : '#a1662f'}
          stroke={shortchanged ? '#7f1d1d' : '#5b3410'}
          strokeWidth={shortchanged ? 4 : 2}
        />

        {/* b) The front panel: a horizontal plank, a shade lighter, with a couple
            of end-grain lines so the surface is not one flat block of colour. */}
        <path
          d={`M ${-BOWL_RX + 7},${BOWL_RY * 0.75} Q 0,${BOWL_RY * 1.75} ${BOWL_RX - 7},${BOWL_RY * 0.75} L ${BOWL_RX - 9},${BOWL_RY * 1.15} Q 0,${BOWL_RY * 2.05} ${-BOWL_RX + 9},${BOWL_RY * 1.15} Z`}
          fill="#c08552"
          opacity={0.85}
        />

        {/* c) The rim lip: a thick band the sprite tucks behind. */}
        <path
          d={`M ${-BOWL_RX - 4},0 Q 0,${BOWL_RY * 0.95} ${BOWL_RX + 4},0 L ${BOWL_RX + 4},${-BOWL_RY * 0.5} Q 0,${BOWL_RY * 0.45} ${-BOWL_RX - 4},${-BOWL_RY * 0.5} Z`}
          fill="#b97a44"
          stroke={shortchanged ? '#7f1d1d' : '#5b3410'}
          strokeWidth={shortchanged ? 4 : 2}
        />

        {/* A highlight along the lip, so the wood catches light. */}
        <path
          d={`M ${-BOWL_RX + 6},${-BOWL_RY * 0.32} Q 0,${BOWL_RY * 0.5} ${BOWL_RX - 6},${-BOWL_RY * 0.32}`}
          stroke="#e8c9a0"
          strokeWidth={2.5}
          strokeLinecap="round"
          fill="none"
          opacity={0.7}
        />
      </g>

      {/* --- 4. The cavity: the dark opening the food drops into. --- */}
      <ellipse
        cx={0}
        cy={BOWL_Y}
        rx={BOWL_RX - 2}
        ry={BOWL_RY * 0.72}
        fill={shortchanged ? '#6b1a1a' : '#4a2c0a'}
      />

      {/* --- 5. What this trough actually got, and any complaint about it. --- */}
      {filled && actual !== null && (
        <BowlContents
          actual={actual}
          foodEmoji={foodEmoji}
          shortchanged={shortchanged}
          bubbleY={bubbleY}
          delay={delay}
        />
      )}
    </g>
  );
}
