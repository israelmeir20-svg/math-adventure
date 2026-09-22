/**
 * The animated balance for "מאזניים בחווה" - assembled from painted art in the DOM.
 *
 * ===================================================================
 * WHY THIS IS DOM/CSS AND NOT SVG ANY MORE.
 * ===================================================================
 *
 * The old stage was an SVG scene: a post and a beam drawn from `<rect>`s, pans from
 * `<line>`s and a `<rect>` dish, and animals placed with `<image>`. Everything in it
 * was geometry, so the scale looked like a diagram of a scale.
 *
 * It is now three painted PNGs and a set of animated WebPs, layered in the DOM. The
 * rotation still works exactly the same way - the beam turns, the pans cancel that
 * turn - but CSS `transform` on a positioned box does it without a viewBox, and the
 * artwork brings shading and material that no reasonable amount of hand-written
 * `<path>` was going to produce.
 *
 * ===================================================================
 * THE COMPOSITION, AND WHY THE PAN COUNTER-ROTATION IS STILL THE WHOLE TRICK.
 * ===================================================================
 *
 *        scene (aspect-locked box, painted backdrop behind)
 *          base        absolutely placed, static, z-10, never transforms
 *          beam        absolutely placed over the base's pin, z-20, rotate(theta)
 *            pan-left    at the beam's left end, z-25, rotate(-theta)
 *            pan-right   at the beam's right end, z-25, rotate(-theta)
 *
 * The pans are children of the beam, so they inherit its rotation and their ropes
 * stay welded to the beam's ends - that is what makes it read as a hanging balance
 * instead of a seesaw whose pans float free.
 *
 * TO KEEP THE PANS UPRIGHT, EACH ONE APPLIES THE EXACT INVERSE ROTATION about its own
 * rope tie. `transform-origin` is therefore the HOOK, not the centre: rotating about
 * the centre would swing the rope sideways and the pan would hang at an angle, which
 * looks like a bug even though the dish itself would end up level.
 *
 * The two rotations must also share their DURATION AND EASING exactly, or the pans
 * visibly lag the beam and the assembly comes apart mid-swing.
 *
 * ===================================================================
 * THE SIZE-INDEPENDENCE TRICK, WHICH IS WHAT MAKES PERCENTAGES WORK HERE.
 * ===================================================================
 *
 * Children of a rotated element are placed in the ROTATED frame, but `left`/`top` on
 * the beam's own children are still resolved against the BEAM's untransformed box.
 * So the pan anchors below are plain percentages of the beam and need no trigonometry
 * - and, more importantly, the beam's rotation cannot feed back into its own size.
 *
 * ===================================================================
 * ANIMALS ON A PAN ARE STATIC: THE WEBP ANIMATES ITSELF.
 * ===================================================================
 *
 * Each species ships six-frame animated WebPs, which the browser plays natively in a
 * plain `<img>`. So there is no sprite-sheet timer and no idle-bob keyframe - the
 * artwork is already breathing. Layering a CSS bob on top of an already animated
 * animal is what would make it look seasick.
 */
import {
  ANIMAL_META,
  animalArt,
  animalScale,
  poseSeed,
  sumWeight,
  variantIndex,
  weightOf,
  type ScaleAnimal,
} from './scaleWeights';
import { useEffect, useRef, useState } from 'react';
import {
  BALANCE_GLOW,
  BASE_H_PCT,
  BASE_W_PCT,
  BEAM_EASE,
  BEAM_H_PCT,
  BEAM_TRANSITION_MS,
  BEAM_W_PCT,
  PAN_H_PCT,
  PAN_HANG_FRAC,
  PAN_W_PCT,
  CURLED_SHEEP_MAX_PX,
  MAX_TRAY_ANIMAL_PX,
  PAN_ANIMAL_BASE_PCT,
  PAN_ANIMAL_MIN_PX,
  PIVOT_X_PCT,
  PIVOT_Y_PCT,
  VIEW_ASPECT,
} from './scaleStageData';
import {
  BASE_PIVOT_Y_FRAC,
  PAN_HOOK_Y_FRAC,
  SCALE_ART,
} from './scaleArt';

interface ScaleStageProps {
  left: ScaleAnimal[];
  right: ScaleAnimal[];
  /** Beam angle in degrees; negative tips the left (heavier) side down. */
  angle: number;
  /** True once both pans weigh the same and the puzzle is solved. */
  balanced: boolean;
  /** True while a solved puzzle is being swapped; disables the pointer. */
  inert?: boolean;
  /**
   * Called with the index of an animal in the RIGHT pan that was tapped, so the owner can
   * return it to the shelf. The LEFT pan is the puzzle's given side and is deliberately
   * not interactive.
   */
  onRemoveAnimal?: (index: number) => void;
}

export default function ScaleStage({
  left,
  right,
  angle,
  balanced,
  inert = false,
  onRemoveAnimal,
}: ScaleStageProps) {
  const swing = `transform ${BEAM_TRANSITION_MS}ms ${BEAM_EASE}`;
  // While a puzzle is resolving the pans are frozen, so nothing may be tapped off them.
  const interactive = Boolean(onRemoveAnimal) && !inert;
  // The sprite size basis: the pan is a percentage of the scene, so the animals must be too.
  const { ref: sceneRef, width: sceneWidth } = useSceneWidth();

  return (
    /*
     * THE SCENE IS A FOREGROUND PROP, NOT A CENTRED VIEWPORT ITEM.
     *
     * The scale used to be a plainly-centred flex child of the game column, which put
     * it at the vertical middle of the frame - floating at the horizon line and
     * visually clipping against the painted fence. A balance is an object standing in
     * the farmyard, so it belongs down on the near lawn.
     *
     * The wrapper is therefore a relative box that the parent can still lay out
     * normally, with the assembly absolutely anchored inside it near the bottom.
     */
    <div
      /*
       * THE SCENE FILLS ITS PARENT, RATHER THAN SIZING ITSELF.
       *
       * `h-full w-full` makes the scene exactly as big as the flexible box the game column
       * gives it, so the drawer below gets its reserved height no matter what. The parent
       * is the one deciding how much room the picture gets, which is the only way a flex
       * column with a shrinking middle and a fixed bottom can stay inside its container.
       *
       * THIS REPLACED `shrink-0` + `aspect-ratio` + `max-h-[50vh]`, WHICH WAS THE ACTUAL
       * CAUSE OF THE CLIPPED DRAWER. `shrink-0` told the scene to keep its full intrinsic
       * height (the aspect-locked backdrop plus the scale hanging 15px past its bottom
       * edge) and to never give any of it up. On a short window that height plus the fixed
       * drawer came to more than the dialog had, so the overflow landed on the drawer -
       * measured live as the game column standing 827px tall inside an 800px dialog.
       *
       * The aspect ratio is kept as a CEILING rather than a driver: `aspect-ratio` with
       * `max-h-full` lets the backdrop stay proportionate while still yielding to the
       * parent's height, so the farmyard never stretches. `overflow-hidden` clips the few
       * pixels of the pedestal that deliberately hang below the frame, so they are cut by
       * the picture's edge instead of creating a scrollbar.
       */
      className="relative h-full w-full overflow-hidden"
      ref={sceneRef}
      style={{ aspectRatio: `${VIEW_ASPECT}`, maxHeight: '100%' }}
      role="img"
      aria-label="מאזניים עם חיות על שתי הכפות"
    >
      {/*
        --- 0. The backdrop. ---
        Deliberately below everything and unclipped, so the scene reads as one picture
        rather than a framed panel: the artwork is already a farmyard with a fence, and
        boxing it in a border is what made the scale look pasted over a card.
      */}
      <img
        src={SCALE_ART.background}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full select-none object-cover"
        draggable={false}
      />

      {/*
        --- 1. THE SCALE, ANCHORED TO THE FOREGROUND GRASS. ---
        One wrapper holding every moving part, pinned to the BOTTOM EDGE of the lawn and
        centred horizontally. Everything inside is positioned in PERCENTAGES OF THIS
        WRAPPER, so the whole balance scales as a single unit and the layering order below
        cannot be disturbed by a sub-element's own positioning context.

        `bottom: 16px` is the load-bearing part, and it is the third value this offset has
        taken. It started at `0`, which put the pedestal's foot on the FENCE line - the
        backdrop's fence runs through the vertical middle of `background.png`, so the scale
        read as resting on the fence rather than standing on the grass. A `-15px` nudge
        dropped it onto the near lawn, but that was overcorrected: a pan carrying weight
        tilts down, and with the assembly that low the dipped pan slid behind the question
        banner at the bottom of the frame - the pan the child is counting animals on was the
        one that got hidden.

        `16px` lifts the assembly clear of the banner, and the pans' clearance is then
        decided entirely by the beam's pivot (see `scaleStageData.ts`), which is solved so
        the LOWEST pan stays inside this box at the maximum 18 degree tilt. Those two are
        deliberately separate jobs now: this offset positions the prop on the lawn, and the
        pivot decides how far the pans are allowed to swing.

        `height: 100%` rather than `88%` is what re-grounds the stand. With the pivot at 52%
        to buy the pans their clearance, the pedestal's foot only reaches ~82% of this box -
        so the box has to extend all the way to the scene's bottom padding for the foot to
        land on the grass. At `88%` the whole assembly floated with the foot hanging in
        mid-air above the lawn.
      */}
      <div
        className="absolute"
        style={{
          left: '50%',
          bottom: 16,
          width: '85%',
          maxWidth: '680px',
          height: '100%',
          transform: 'translateX(-50%)',
          zIndex: 20,
        }}
      >
        {/* --- The stand: static, never transforms, BEHIND the beam. --- */}
        <img
          src={SCALE_ART.base}
          alt=""
          aria-hidden
          className="absolute select-none"
          draggable={false}
          style={{
            left: `${PIVOT_X_PCT}%`,
            top: `${PIVOT_Y_PCT}%`,
            width: `${BASE_W_PCT}%`,
            height: `${BASE_H_PCT}%`,
            objectFit: 'contain',
            // The pin's centre is the origin of the offset, so the art is lifted by the
            // distance from its own top edge down to the pin.
            transform: `translate(-50%, -${BASE_PIVOT_Y_FRAC * 100}%)`,
            // 10: behind the beam and the pans, so the beam crosses in front of the post.
            zIndex: 10,
          }}
        />

        {/*
          --- The beam: the only element that rotates. ---
          Its `transform-origin` is the pivot, expressed in the beam's own coordinates:
          the beam's left edge is inset from the assembly's centre by half its width.
        */}
        <div
          className="absolute"
          style={{
            left: `${PIVOT_X_PCT}%`,
            top: `${PIVOT_Y_PCT}%`,
            width: `${BEAM_W_PCT}%`,
            height: `${BEAM_H_PCT}%`,
            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
            transformOrigin: 'center center',
            transition: swing,
            // 20: the beam sits over the post's pin but under the pans it carries.
            zIndex: 20,
            // A solved beam glows, so the moment of balance is visible as well as flat.
            filter: balanced
              ? `drop-shadow(0 0 14px ${BALANCE_GLOW}) drop-shadow(0 0 26px ${BALANCE_GLOW})`
              : 'drop-shadow(0 3px 4px rgba(0,0,0,0.35))',
          }}
        >
          <img
            src={SCALE_ART.rod}
            alt=""
            aria-hidden
            className="h-full w-full select-none object-fill"
            draggable={false}
          />

          {/*
            The pans hang from the beam's ends. They are children of the BEAM, so their
            percentages resolve against the beam's box even though the beam is rotated.

            Only the RIGHT pan is interactive: it holds the child's own placements, so its
            animals can be tapped to return them to the shelf. The left pan is the puzzle's
            given fact and stays static.
          */}
          <Pan
            side="left"
            angle={angle}
            swing={swing}
            animals={left}
            label="כף שמאל"
            interactive={false}
            sceneWidth={sceneWidth}
          />
          <Pan
            side="right"
            angle={angle}
            swing={swing}
            animals={right}
            label="כף ימין"
            interactive={interactive}
            sceneWidth={sceneWidth}
            onRemove={onRemoveAnimal}
          />
        </div>

        {/*
          --- The pivot cap, drawn last so it sits over the beam's centre. ---
          A small painted dot rather than an asset: it reads as the pin the whole thing
          turns about, and it is the cheapest way to hide the seam where the beam meets
          the post.
        */}
        <div
          aria-hidden
          className="absolute rounded-full bg-amber-400 ring-4 ring-amber-800/80"
          style={{
            left: `${PIVOT_X_PCT}%`,
            top: `${PIVOT_Y_PCT}%`,
            width: '2.4%',
            height: '2.4%',
            minWidth: '12px',
            minHeight: '12px',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 10px rgba(251,191,36,0.7)',
            // 40: above everything, including the animals (35), so the pin that the whole
            // assembly turns about is never hidden by a sprite standing near it.
            zIndex: 40,
          }}
        />
      </div>
    </div>
  );
}

/** Which side of the beam a pan hangs from. */
type Side = 'left' | 'right';

interface PanProps {
  side: Side;
  /** The beam's angle, so this pan can cancel it. */
  angle: number;
  /** The beam's transition, so the two stay in lockstep. */
  swing: string;
  animals: ScaleAnimal[];
  label: string;
  /**
   * True when this pan's animals can be tapped to send them back to the shelf.
   *
   * The LEFT pan is the puzzle's given side and is never interactive: its animals are the
   * facts the child reasons from. The RIGHT pan holds the child's own moves, so it is the
   * only side that needs a remove handler.
   */
  interactive: boolean;
  /** The measured scene width, so the sprites can be sized proportionally to the pan. */
  sceneWidth: number;
  onRemove?: (index: number) => void;
}

/**
 * One hanging pan, its animals, and its weight badge.
 *
 * The right pan is mirrored horizontally so the two read as a matched pair rather
 * than the same image stamped twice. The mirror is applied to the pan's ARTWORK only,
 * never to its contents - flipping the container would mirror every animal standing
 * on it, and a horse facing backwards next to a horse facing forwards is the kind of
 * detail that turns a prop into a bug.
 */
function Pan({
  side,
  angle,
  swing,
  animals,
  label,
  interactive,
  sceneWidth,
  onRemove,
}: PanProps) {
  /** Where along the beam this pan's rope is tied. */
  const anchor = side === 'left' ? PAN_HANG_FRAC * 100 : (1 - PAN_HANG_FRAC) * 100;

  return (
    <div
      className="absolute"
      style={{
        left: `${anchor}%`,
        /*
         * The pan hangs so its HOOK lands on the beam's end.
         *
         * `top: 0` puts the pan's box top on the beam's top edge; the hook sits a
         * little way down inside the pan's artwork, so the box is lifted by that
         * fraction of its own height in the `transform` below. Expressing it as a
         * transform rather than a negative `top` keeps the origin maths and the
         * placement maths reading from the same number.
         */
        top: '0%',
        width: `${(PAN_W_PCT / BEAM_W_PCT) * 100}%`,
        /*
         * The height, converted once, here, with the ratio inverted.
         *
         * `PAN_H_PCT` means "this fraction of the SCENE" everywhere else in the file. The
         * beam is this element's containing block, so the scene-relative value has to be
         * re-expressed against the beam. Doing that conversion HERE - at the one boundary
         * where the containing block changes - is what lets every descendant inside
         * `PanInterior` use plain scene/pan percentages with no conversion at all.
         *
         * The bug this replaced was exactly the opposite arrangement: the conversion was
         * missing here, and each child silently compensated (or failed to), which is how
         * the animals ended up hanging above the basket.
         */
        height: `${(PAN_H_PCT / BEAM_H_PCT) * 100}%`,
        transform: `translate(-50%, -${PAN_HOOK_Y_FRAC * 100}%) rotate(${-angle}deg)`,
        transformOrigin: `50% ${PAN_HOOK_Y_FRAC * 100}%`,
        transition: swing,
        // 25: the pan is always OVER the beam's end so the rope disappears behind it.
        zIndex: 25,
      }}
    >
      <PanInterior
        side={side}
        animals={animals}
        interactive={interactive}
        sceneWidth={sceneWidth}
        onRemove={onRemove}
      />

      <span className="sr-only">{label}</span>
    </div>
  );
}

interface PanInteriorProps {
  side: Side;
  animals: ScaleAnimal[];
  /** True when this pan's animals can be tapped to return them to the shelf. */
  interactive: boolean;
  /** The measured scene width, so the sprites can be sized proportionally to the pan. */
  sceneWidth: number;
  onRemove?: (index: number) => void;
}

/**
 * Everything that has to be positioned against the PAN's own box.
 *
 * ===================================================================
 * THIS WRAPPER EXISTS TO FIX A UNITS BUG, AND IT IS THE WHOLE REASON THE
 * ANIMALS WERE INVISIBLE.
 * ===================================================================
 *
 * A CSS percentage on `top` resolves against the CONTAINING BLOCK's height, not against
 * the element's own height. The animals' cluster was placed with
 * `top: PAN_TRAY_TOP_FRAC` directly inside the pan, and the pan's containing block is the
 * BEAM. So `top: 56%` was resolved as 56% of the BEAM's height (~51px) instead of 56% of
 * the PAN's (~123px) - a 40px displacement that parked the whole cluster up among the
 * ropes, above the basket.
 *
 * The arithmetic is worth stating plainly because it is silent:
 *
 *   tray line, intended   panTop + 56% of the pan   ~= 140px
 *   tray line, actual     panTop + 56% of the beam  ~=  99px   <- 41px too high
 *
 * Nothing errored. Nothing was hidden. The animals were drawn in the wrong place, in
 * mid-air, which reads from the outside as "no animals appear on the pans".
 *
 * THE FIX IS A LAYER WITH A KNOWN BOX. This div is absolutely positioned to fill the pan
 * exactly, so every percentage inside it - the tray line, the cluster's width, the
 * badge's offset - resolves against the PAN. A single correct containing block removes
 * the whole class of bug rather than correcting one offset at a time.
 *
 * `inset: 0` is what makes it exact: the wrapper cannot drift from the art it is
 * positioning against, even if the pan's size changes.
 */
function PanInterior({ side, animals, interactive, sceneWidth, onRemove }: PanInteriorProps) {
  return (
    <div className="absolute inset-0">
      {/*
        The pan's artwork, mirrored on the right so the pair is symmetrical.

        z-20, and its children sit ABOVE it - which is the correct depth order for a
        basket: the animals stand inside the tray, so their bodies are drawn over the
        back rim. Because the artwork is a single flat image there is no separate front
        rim to draw over them, so the animals win and simply sit on top.
      */}
      <img
        src={SCALE_ART.pan}
        alt=""
        aria-hidden
        className="relative h-full w-full select-none object-fill"
        draggable={false}
        style={{
          transform: side === 'right' ? 'scaleX(-1)' : undefined,
          zIndex: 20,
        }}
      />

      {/*
        THE ANIMALS, RENDERED DIRECTLY IN THE TRAY.
        
        ===================================================================
        WHY THE SIZES ARE HARD PIXELS HERE, AFTER PERCENTAGES FAILED.
        ===================================================================
        
        The previous version sized each sprite as `PAN_ANIMAL_BASE_PCT * scale` PERCENT of
        its containing block. That is elegant - it keeps the cast proportional at every
        window size - but it is fragile in exactly the way that produced a 0x0 sprite: a
        percentage width on an element whose containing block has itself been sized from a
        percentage can resolve to zero, and the browser reports that as a completely
        invisible image with no error anywhere.
        
        The live DOM confirmed it: `duck1.webp box(407,531) 0x0 ... loaded`. The file had
        decoded (naturalWidth was correct) and the element was in the tree, but its box had
        collapsed. Nothing was hidden and nothing threw - the sprite was simply not there.
        
        Fixed pixels remove that failure mode entirely. A `w-14 h-14` box cannot collapse
        because it does not depend on any ancestor's resolved size. The cost is that the
        cast no longer shrinks with the window, which is a real trade-off - but a sprite
        that is always the right size for the pan it sits in beats one that scales
        perfectly and sometimes disappears.
        
        `items-end` puts every animal's feet on the tray's floor line, whatever its species.
        The cluster is lifted by `bottom: 20px` rather than sitting at 0, because the wooden
        dish is NOT at the absolute bottom of `scale_pan.png` - the artwork has rope and
        basket-curve below the plank. At 0 the animals sank into the wood; 20px seats their
        feet on the plank itself.

        `pointer-events-none` is set on the RIGHT pan only, further down - the left pan is the
        puzzle's given fact and is never tappable.

        ===================================================================
        THE RIGHT PAN'S ANIMALS ARE TAPPABLE; THE LEFT PAN'S ARE NOT.
        ===================================================================

        `pointer-events-none` on this container was WHY tapping an animal on the right pan
        did nothing. It disabled the pointer for the container AND everything inside it, so
        the `<button>` wrapped around each sprite never received a click - the sprites were
        purely decorative no matter what handlers they carried.

        It is removed here, and interaction is instead controlled per side:

          - the LEFT pan is the puzzle's GIVEN fact. Its animals are the numbers the child
            reasons from, so they are static and `pointer-events-none` is applied to THAT
            side alone, leaving the pan non-interactive as intended;
          - the RIGHT pan holds the child's own moves, so each animal is a real button that
            returns it to the shelf.

        This is the difference between "the pan is not interactive" and "the animal is not
        interactive": the constraint belongs to the left side, not to the tray as a whole.
      */}
      {animals.length > 0 && (
        <div
          className="absolute z-50 flex items-end justify-center"
          style={{
            bottom: 20,
            left: 0,
            right: 0,
            // The left pan is the puzzle's GIVEN fact and is never interactive; only the
            // right pan's animals are real controls.
            pointerEvents: interactive ? undefined : 'none',
          }}
        >
          {animals.map((a, i) => (
            <AnimalInTray
              key={`${a}-${i}`}
              animal={a}
              index={i}
              side={side}
              interactive={interactive}
              sceneWidth={sceneWidth}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      {/* --- The weight badge, hung beneath the pan. --- */}
      <WeightBadge value={sumWeight(animals)} />
    </div>
  );
}

interface AnimalInTrayProps {
  animal: ScaleAnimal;
  /** The animal's seat in this pan; the source of its stable pose. */
  index: number;
  side: Side;
  /** True when this pan's animals can be tapped to return them to the shelf. */
  interactive: boolean;
  /** The measured scene width, so the sprite can be sized proportionally to the pan. */
  sceneWidth: number;
  onRemove?: (index: number) => void;
}

/**
 * One animal standing in a pan.
 *
 * THE POSE IS A PURE FUNCTION OF THE ANIMAL'S SEAT IN THIS PAN.
 *
 * `animalArt` used to be called with no seed, which meant it read `Math.random()` in the
 * render body. The round's one-second countdown re-renders this tree every tick, so each
 * animal drew a fresh random number every second and the whole pan visibly flickered
 * between poses. `poseSeed` hashes the seat index instead, so it returns the same number
 * for as long as the animal occupies that seat - and a different number for its
 * neighbours, so two cats on one pan stay two different cats.
 *
 * The species `scale` factor exists because the artwork is not consistently cropped:
 * `sheep1`/`sheep2` carry noticeably more transparent padding around the body than the
 * other sprites, so at a shared box size a sheep renders visibly smaller than a duck it
 * outweighs. The factor restores the visual hierarchy the game relies on - the child
 * reads relative size as a cue to relative weight - and the sheep's larger box also
 * plants its hooves on the dish rather than leaving it hovering above the floor line.
 */
function AnimalInTray({
  animal,
  index,
  side,
  interactive,
  sceneWidth,
  onRemove,
}: AnimalInTrayProps) {
  const meta = ANIMAL_META[animal];
  /*
   * ONE SEED FOR EVERYTHING ABOUT THIS ANIMAL.
   *
   * The same value picks the artwork and the size factors, so those two can never disagree
   * about which variant this animal is - a bug that would only surface on some seeds, which
   * is the worst kind to find later.
   */
  const seed = poseSeed(index, side === 'left' ? 1 : 2);
  const scale = animalScale(animal, seed);

  /*
   * The sprite's box is a FRACTION OF THE SCENE WIDTH, multiplied by the animal's scale.
   *
   * The pan's artwork is sized as a percentage of the scene, so the container the animals
   * stand in is proportional to the backdrop at every window size. Hard pixels here would
   * therefore be proportionate only at ONE window size: measured against the real pan box,
   * a fixed 66px horse is 60% of the pan on a desktop and over 100% of it on a narrow
   * window, so three of them spilled far outside the tray.
   *
   * `PAN_ANIMAL_BASE_PCT * sceneWidth` restores that proportionality, and multiplying by
   * the animal's scale keeps the visible size hierarchy that tells the child which animal
   * is heavier.
   *
   * THE EARLIER 0x0 SPRITE FAILURE IS STILL AVOIDED, and this is the part worth stating:
   * that bug came from a PERCENTAGE whose containing block was itself percentage-sized,
   * which can resolve to zero and produces a silently invisible element. Here the
   * percentage is resolved ONCE, against the scene, into a concrete pixel number - and the
   * `PAN_ANIMAL_MIN_PX` floor below makes a collapsed box impossible.
   *
   * THE CEILING IS PER-ANIMAL, FOR ONE SPECIFIC REASON. A single flat cap forced one number
   * to serve two different jobs: it had to be high enough for the curled lamb, whose artwork
   * is mostly transparent margin, and that same height made every OTHER animal larger than
   * the tray wants. Splitting it lets the lamb keep the size that finally read correctly
   * while the rest of the cast sits at a natural scale.
   *
   * The cap bounds the BOX, which is the measure that has to fit a huddle of three - it is
   * still not divided by aspect, which is what squeezed the tall-cropped species before.
   */
  const isCurledSheep = animal === 'sheep' && variantIndex(animal, seed) === 1;
  const maxPx = isCurledSheep ? CURLED_SHEEP_MAX_PX : MAX_TRAY_ANIMAL_PX;

  const size = Math.round(
    Math.min(maxPx, Math.max(PAN_ANIMAL_MIN_PX, sceneWidth * PAN_ANIMAL_BASE_PCT * scale)),
  );

  /*
   * THE CURLED LAMB GETS A SMALL DOWNWARD NUDGE; NOTHING ELSE MOVES.
   *
   * `sheep2`'s canvas has transparent space BELOW the belly as well as around it. The box
   * grows the drawn lamb, but `items-end` aligns the bottom of the BOX with the dish - and the
   * bottom of the box is empty padding, so the lamb hovers above the plank by exactly that
   * gap. A few pixels of downward translate closes it.
   *
   * A bare `translateY` rather than a `scale` is deliberate: this correction is pure
   * positioning, so it cannot change how large the animal draws. That keeps the size decisions
   * in `scale` and `variantScale`, where they are index-aligned with the species and cannot
   * leak onto another animal's variant list.
   *
   * 22px is tuned against the container's own 20px lift: the two move in opposite directions,
   * so the lamb ends up 2px BELOW the baseline the other animals stand on. That net downward
   * offset is the point - the lamb's transparent bottom margin means its box must sit lower
   * than everyone else's before its body reaches the plank.
   */
  const sheepDrop = isCurledSheep ? 'translateY(22px)' : undefined;
  const sprite = (
    <img
      src={animalArt(animal, seed)}
      alt=""
      aria-hidden={interactive ? undefined : true}
      draggable={false}
      className="select-none object-contain object-bottom drop-shadow-[0_3px_3px_rgba(0,0,0,0.3)]"
      style={{
        width: size,
        height: size,
        marginLeft: index === 0 ? 0 : -4,
        marginRight: index === 0 ? 0 : -4,
        transform: sheepDrop,
      }}
      onError={(e) => {
        /*
         * A LAST-RESORT GUARD. `animalArt` already falls back through the variant list to
         * a static PNG, so this should never fire - but a sprite that fails to DECODE (a
         * truncated file, a format the browser rejects) still arrives here, and without
         * this the pan would render empty and the child would count zero. Pointing at the
         * species' static PNG is the one recovery available from inside an `<img>`.
         */
        const fallback = meta?.still;
        if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
      }}
    />
  );

  // The left pan is the puzzle's given fact: its animals are static, not controls.
  if (!interactive || !onRemove) return <span className="inline-flex">{sprite}</span>;

  return (
    <button
      type="button"
      onClick={() => onRemove(index)}
      aria-label={`החזר ${meta.label} במשקל ${weightOf(animal)} למדף`}
      className="inline-flex cursor-pointer bg-transparent p-0 transition-transform hover:scale-110 active:scale-95"
    >
      {sprite}
    </button>
  );
}

/**
 * The pan's total weight, on a wooden badge hung beneath the dish.
 *
 * Styled as a carved plank rather than a UI chip so it belongs to the prop, and given
 * high contrast because it is the number the whole puzzle is about - a child doing the
 * arithmetic reads this, not the shelf.
 *
 * IT HANGS ON THE PAN'S OUTER FACE, NOT INSIDE IT. The offset is a fraction of the PAN's
 * height, so it must have a containing block the size of the pan - which the
 * `PanInterior` wrapper provides. Sitting at 86% of the pan puts it below the basket's
 * rim, on the outside, where a real hanging scale's weight plate would be; the 6% of
 * slack below it keeps the whole badge inside the assembly rather than clipped by the
 * scene's `overflow-hidden`.
 *
 * IMPORTANTLY IT IS NOT MIRRORED. The right pan's ARTWORK is flipped so the two pans
 * read as a matched pair, but that flip is applied to the `<img>` alone precisely so
 * that nothing with meaning on it - the animals, and this number - is ever rendered
 * backwards. A mirrored numeral is the kind of thing that looks like a bug and is
 * unreadable to a child who is still learning to recognise digits.
 */
function WeightBadge({ value }: { value: number }) {
  return (
    <span
      className="absolute grid -translate-x-1/2 place-items-center rounded-lg border-2 border-amber-950/90 bg-gradient-to-b from-amber-600 to-amber-800 px-2 py-0.5 font-black tabular-nums text-amber-50 shadow-[0_3px_0_rgba(0,0,0,0.4)]"
      style={{
        left: '50%',
        top: '92%',
        minWidth: '2.1em',
        fontSize: 'clamp(0.7rem, 2.1vw, 1.15rem)',
        // Below the cluster (35): the badge hangs on the pan's outer face, and the
        // animals must never be occluded by their own weight readout.
        zIndex: 28,
      }}
      aria-hidden
    >
      {value}
    </span>
  );
}

/**
 * Measures an element's rendered WIDTH, and keeps it current as the window resizes.
 *
 * ===================================================================
 * WHY A MEASUREMENT, AND WHY IN JAVASCRIPT RATHER THAN A CSS PERCENTAGE.
 * ===================================================================
 *
 * The animals must be sized relative to the pan, and the pan is a percentage of the scene.
 * A CSS percentage would express that directly - and it is exactly what this component did
 * before, which produced a sprite measuring `0x0` and rendering completely invisibly, with
 * nothing logged anywhere. A percentage width on an element whose containing block is
 * itself percentage-sized can resolve to zero, and the box collapses silently.
 *
 * Resolving the fraction here instead - one multiplication against a real pixel
 * measurement - gets the same proportionality with none of that failure mode. Together
 * with `PAN_ANIMAL_MIN_PX` the box is guaranteed non-zero.
 *
 * `ResizeObserver` rather than a `resize` listener: the scene's width is driven by the
 * dialog's size, which is driven by the window, but the two are not the same number and
 * the dialog can change size without the window doing so. The observer sees the element's
 * own box actually changing, whatever caused it.
 *
 * The initial `useState` seeds a sensible default so the FIRST paint is already sized. The
 * observer then corrects it in the same frame the layout settles, so there is no visible
 * jump - only a correct image from the start rather than a zero-width one.
 */
function useSceneWidth(): {
  ref: React.RefObject<HTMLDivElement | null>;
  width: number;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const apply = () => {
      const next = element.getBoundingClientRect().width;
      // A zero measurement means "not laid out yet" (a hidden or unopened dialog), not
      // "zero wide" - so it is ignored rather than written, which would collapse the cast.
      if (next > 0) setWidth((current) => (Math.abs(current - next) < 1 ? current : next));
    };

    apply();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(apply);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
