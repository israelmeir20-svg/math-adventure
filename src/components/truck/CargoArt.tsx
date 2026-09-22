/**
 * The drawn cargo: three crate illustrations and the flatbed truck that carries them.
 *
 * ============================================================
 * THE CRATES ARE PICTURES NOW, NOT BOXES WITH A NUMBER IN THEM.
 * ============================================================
 *
 * The previous bed drew each crate as a rounded rectangle whose width tracked its
 * weight. That worked, but it made every crate the same OBJECT at different zoom
 * levels, and a burlap sack does not read as "the same thing, smaller" than a steel
 * shipping container. Three distinct silhouettes - sack, wooden crate, steel container -
 * give the child three things to recognise by SHAPE alone, which is the fastest channel
 * they have: the load can be tallied by eye, without reading a single digit.
 *
 * The numbers are still printed on the cargo, and that is deliberate. The weight on the
 * crate is the OPERAND of the sum the child is being asked to do, not the answer to it.
 * What the game withholds is the running total.
 *
 * ============================================================
 * WHY THE WEIGHT BANDS ARE SPLIT THE WAY THEY ARE.
 * ============================================================
 *
 * <= 100kg  sack        (light, one person carries it)
 * == 200kg  wood crate  (heavy, needs a trolley)
 * >= 250kg  container   (industrial, needs the forklift)
 *
 * The bands line up with the cargo pools the tiers actually stock, so every crate a
 * child will ever see falls in exactly one band with no gaps or overlaps. The wood crate
 * claims only the single value 200 rather than a range: 200 is the one weight that sits
 * between the two extremes in every tier that uses it, and pinning it to its own
 * silhouette keeps the three shapes evenly represented in a loadout.
 */
import { useEffect, useState, type ReactNode } from 'react';
import cabinImg from '../../assets/truck/cabin.png';
import wheelImg from '../../assets/truck/pulley.png';

/** Which illustration a crate of this weight wears. */
export type CargoShape = 'sack' | 'wood' | 'container';

/**
 * Picks the illustration for a weight.
 *
 * Exported so the shelf and the bed cannot disagree about which shape a crate is - the
 * child has to recognise a crate AFTER it moves onto the truck, and a crate that changed
 * silhouette in transit would read as a different object.
 */
export function cargoShapeFor(weight: number): CargoShape {
  if (weight <= 100) return 'sack';
  if (weight === 200) return 'wood';
  return 'container';
}

interface CargoProps {
  weight: number;
  /**
   * Shrinks the illustration for the truck bed, where a full load has to fit on one
   * truck. Only the outer box changes - the artwork scales with it.
   */
  compact?: boolean;
}

/** A burlap sack: the light cargo, up to 100kg. */
export const SackCargo = ({ weight, compact = false }: CargoProps) => (
  <svg
    className={`${compact ? 'w-10 h-12' : 'w-12 h-14'} drop-shadow-md transition-transform hover:scale-105`}
    viewBox="0 0 60 70"
    aria-hidden
  >
    <path
      d="M15,25 C10,35 8,55 12,65 C16,68 44,68 48,65 C52,55 50,35 45,25 C40,24 20,24 15,25 Z"
      fill="#E2D4B7"
      stroke="#8C7355"
      strokeWidth="2.5"
    />
    <path d="M22,25 Q30,28 38,25 Q30,22 22,25 Z" fill="#C2410C" />
    <path
      d="M20,18 C22,12 28,14 30,16 C32,14 38,12 40,18 Z"
      fill="#D7C4A3"
      stroke="#8C7355"
      strokeWidth="2"
    />
    <text
      x="30"
      y="52"
      textAnchor="middle"
      fill="#5A4731"
      fontSize="13"
      fontWeight="900"
      fontFamily="sans-serif"
    >
      {weight}
    </text>
  </svg>
);

/** A wooden crate: the mid-weight cargo, 200kg. */
export const WoodCrateCargo = ({ weight, compact = false }: CargoProps) => (
  <svg
    className={`${compact ? 'w-14 h-14' : 'w-16 h-16'} drop-shadow-md transition-transform hover:scale-105`}
    viewBox="0 0 70 70"
    aria-hidden
  >
    <rect x="5" y="5" width="60" height="60" rx="6" fill="#D97706" stroke="#78350F" strokeWidth="3" />
    <rect x="10" y="10" width="50" height="50" rx="3" fill="#B45309" />
    <line x1="10" y1="10" x2="60" y2="60" stroke="#78350F" strokeWidth="3" opacity="0.6" />
    <line x1="60" y1="10" x2="10" y2="60" stroke="#78350F" strokeWidth="3" opacity="0.6" />
    <rect x="16" y="24" width="38" height="22" rx="4" fill="#FEF3C7" stroke="#78350F" strokeWidth="1.5" />
    <text
      x="35"
      y="40"
      textAnchor="middle"
      fill="#78350F"
      fontSize="14"
      fontWeight="900"
      fontFamily="sans-serif"
    >
      {weight}
    </text>
  </svg>
);

/** A steel shipping container: the heavy cargo, 250kg and up. */
export const HeavyContainerCargo = ({ weight, compact = false }: CargoProps) => (
  <svg
    className={`${compact ? 'w-16 h-16' : 'w-20 h-20'} drop-shadow-lg transition-transform hover:scale-105`}
    viewBox="0 0 80 80"
    aria-hidden
  >
    <rect x="4" y="8" width="72" height="64" rx="4" fill="#334155" stroke="#0F172A" strokeWidth="3.5" />
    <line x1="18" y1="12" x2="18" y2="68" stroke="#1E293B" strokeWidth="3" />
    <line x1="32" y1="12" x2="32" y2="68" stroke="#1E293B" strokeWidth="3" />
    <line x1="48" y1="12" x2="48" y2="68" stroke="#1E293B" strokeWidth="3" />
    <line x1="62" y1="12" x2="62" y2="68" stroke="#1E293B" strokeWidth="3" />
    <rect x="18" y="26" width="44" height="26" rx="4" fill="#FACC15" stroke="#854D0E" strokeWidth="2" />
    <text
      x="40"
      y="44"
      textAnchor="middle"
      fill="#000"
      fontSize="16"
      fontWeight="900"
      fontFamily="sans-serif"
    >
      {weight}
    </text>
  </svg>
);

/** One drawn crate, chosen by weight. */
export const CargoSvg = ({ weight, compact = false }: CargoProps) => {
  const shape = cargoShapeFor(weight);
  if (shape === 'sack') return <SackCargo weight={weight} compact={compact} />;
  if (shape === 'wood') return <WoodCrateCargo weight={weight} compact={compact} />;
  return <HeavyContainerCargo weight={weight} compact={compact} />;
};

/**
 * How far the chassis artwork is pushed down from the top of its stage, in pixels.
 *
 * `cabin.png` carries transparent margin above the vehicle, so anchoring the image box to
 * the top of the stage leaves the painted body floating well above the tyres. This offset
 * closes that gap so the painted wheel arches come down over the wheels.
 *
 * IT IS A PIXEL VALUE, NOT A PERCENTAGE, AND THAT IS DELIBERATE. The gap being corrected is
 * transparent padding INSIDE the image, so it scales with the image's rendered size - but
 * the wheels do not, they are a fixed 96px. A percentage would therefore drift out of
 * alignment as the truck resizes, while a pixel drop keeps pace with the fixed-size tyres.
 *
 * IT IS ADDED TO `suspensionOffset` RATHER THAN APPLIED AS A TAILWIND CLASS. Both are
 * offsets on the same axis, and the suspension is written as an inline `transform` - an
 * inline style beats a class, so `translate-y-[75px]` would be silently overridden the
 * moment the truck took on cargo. Summing them in one expression keeps the ride height and
 * the settle independent and visible in a single place.
 */
const CHASSIS_DROP_PX = 66;

/**
 * How long one exhaust puff lasts, in milliseconds. Matched to the `exhaustPuff` keyframe
 * so the element is unmounted as its animation ends rather than lingering invisibly.
 */
const PUFF_MS = 700;

interface FlatbedTruckProps {
  /** The loaded cargo, laid out on the flatbed deck. */
  children: ReactNode;  /**
   * How far the chassis has settled onto its tires, in pixels.
   *
   * A NUMBER RATHER THAN A TAILWIND CLASS, and that is the one place this file reaches
   * for an inline style. The sink has to interpolate smoothly across the whole load
   * range, and Tailwind only emits the translate classes it can see in the source - so a
   * stepped set of classes makes the settle visibly jump in 4px notches. An inline
   * pixel value is exact, animates on the compositor, and cannot be purged away.
   */
  suspensionOffset?: number;
  /**
   * Plays the drive-off. The truck leaves to the LEFT, off the edge it did not arrive on.
   *
   * THIS IS NOW THE OPPOSITE OF THE ARRIVAL DIRECTION, which is what makes the delivery
   * read as a journey rather than a truck bouncing back and forth. The two flags are
   * mutually exclusive in practice: the parent parks (neither set) between them, and this
   * component draws whichever the parent names.
   */
  isDispatched?: boolean;
  /**
   * True while the truck is still off-stage to the RIGHT, gliding in.
   *
   * THE ENTRANCE IS A STATE, NOT A MOUNT EFFECT. Expressing it as "offscreen, invisible"
   * rather than conditional rendering means the drive-in is a real CSS transition; a
   * conditional mount would pop the truck into place with no motion at all. The parent
   * flips this false to release it, usually a beat after the round is dealt so the child
   * sees the delivery arrive before they start loading.
   */
  isArriving?: boolean;
  /**
   * True for the moment the load hits the target exactly, which flares the headlight.
   *
   * A PULSE, NOT A LEVEL. The parent raises it and drops it again; holding it true would
   * leave the beam permanently flared, which reads as a rendering bug rather than as
   * praise. The keyframe plays twice over a short window, so the parent needs to hold this
   * for roughly the animation's length and no longer.
   */
  isTargetHit?: boolean;
  /**
   * Increments on every crate that lands on the bed, to fire one exhaust puff each.
   *
   * A COUNTER RATHER THAN A BOOLEAN, because the effect is a one-shot per event: a boolean
   * would give one puff for the first crate and then have nothing to re-trigger on the
   * second. The value is only ever compared for CHANGE, so its magnitude is meaningless.
   */
  loadPulse?: number;
  /** Fired when the child taps the cab, for the easter-egg honk. */
  onHonk?: () => void;
  /** The cab colour, which changes between trucks so a new one is visibly new. */
  cab?: 'blue' | 'red' | 'green' | 'purple';
  /** True when the load exceeds the target, which leans and shakes the truck. */
  overloaded?: boolean;
  /**
   * Hides the empty-bed hint once the child has loaded something, and shows it when the
   * bed is bare. The parent knows the load; this component only draws the hint.
   */
  showEmptyHint?: boolean;
  /**
   * Places left on the deck, or null when the tier does not cap it.
   *
   * Drawn as a small chip beside the cargo bay so a capped level states its limit where
   * the child is actually looking. Null on every other tier, so it never becomes
   * permanent chrome.
   */
  slotsRemaining?: number | null;
}

/**
 * The cab paint, as a colour transform rather than three separate illustrations.
 *
 * The flatbed is one large SVG; duplicating it four times to recolour the cab would be
 * four copies of a 30-element drawing to maintain. A `hue-rotate` on a group reuses the
 * single source of truth and keeps the shading consistent. `saturate` pulls the base
 * blue back to a flat mid-tone first, so rotating it lands on a recognisable colour
 * rather than a muddy variation of the original.
 */
const CAB_TINTS = {
  blue: { hue: '176deg', sat: '1' },
  red: { hue: '316deg', sat: '1.15' },
  green: { hue: '61deg', sat: '1' },
  purple: { hue: '230deg', sat: '1.05' },
} as const;

/**
 * The flatbed truck: a wooden deck, a cab facing the direction of travel, four wheels.
 *
 * ============================================================
 * `dir="ltr"` IS LOAD-BEARING, NOT DECORATION.
 * ============================================================
 *
 * The game renders inside a Hebrew `dir="rtl"` tree, and RTL reverses the flex and
 * inline flow of everything inside it. The truck is a physical object with a fixed
 * handedness - the cab is at the front and the bed trails behind it - so inheriting RTL
 * laid the bed out to the right of the cab and produced a truck driving backwards, with
 * the headlight beam shining into the cargo. Pinning this subtree to LTR makes the
 * vehicle immune to the document direction. The Hebrew strings inside the carrying
 * component still declare their own `dir` where they need it.
 *
 * ============================================================
 * THE SUSPENSION AND THE TILT LIVE ON SEPARATE ELEMENTS.
 * ============================================================
 *
 * The truck sinks on its springs as it loads, and leans when it is overloaded. Both are
 * `transform` changes, and an earlier version put them on one node on the reasoning that
 * a translate and a rotate compose cleanly. They do as VALUES - but the lean is a CSS
 * ANIMATION, and a running keyframe OWNS the `transform` property outright. The moment
 * the truck went over target, the keyframe's `rotate()` REPLACED the sink's
 * `translateY()` and the chassis snapped back up to ride height: a truck visibly
 * straining under too much weight sat level exactly when it should have been lowest.
 *
 * So the outer wrapper drives off, the middle node leans, and the inner node sinks. One
 * transform per element, and none of them can clobber another.
 */
export const FlatbedTruck = ({
  children,
  suspensionOffset = 0,
  isDispatched = false,
  isArriving = false,
  isTargetHit = false,
  loadPulse = 0,
  onHonk,
  cab = 'blue',
  overloaded = false,
  showEmptyHint = false,
  slotsRemaining = null,
}: FlatbedTruckProps) => {
  const tint = CAB_TINTS[cab];

  /** True for one frame after each crate lands, to fire a puff. */
  const [puffing, setPuffing] = useState(false);
  useEffect(() => {
    if (loadPulse === 0) return undefined;
    setPuffing(true);
    const id = window.setTimeout(() => setPuffing(false), PUFF_MS);
    return () => window.clearTimeout(id);
  }, [loadPulse]);

  return (
    <div
      data-testid="cargo-truck-wrap"
      /*
       * THE TRAVEL AXIS IS RIGHT-TO-LEFT, SO THE OFFSETS RUN THE OTHER WAY FROM THE
       * OBVIOUS ONES.
       *
       * The truck comes in from the RIGHT and leaves to the LEFT. In a `dir="ltr"` subtree a
       * positive `translate-x` moves right and a negative one moves left, so:
       *
       *   parked  -> translate-x-0
       *   waits   -> translate-x-[160%]   (off to the right, invisible)
       *   leaves  -> translate-x-[-160%]  (off to the left, invisible)
       *
       * TRANSLATING PLUS FADING, not translating alone. A truck merely parked off the edge
       * is still there on a wide screen, sitting in the margin - the fade is what makes it
       * genuinely gone. And the arriving state is expressed as an OPACITY of zero rather
       * than a conditional mount, so the glide-in is a real transition: unmounting and
       * remounting would give a pop instead of a drive.
       *
       * THE TRANSITION IS BIDIRECTIONAL ON PURPOSE. One declaration covers the arrival and
       * the departure because the state machine only ever moves between the three
       * positions, so a second duration would be two sources of truth for the same motion.
       */
      className={`relative mx-auto w-full max-w-2xl select-none transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none ${
        isDispatched
          ? '-translate-x-[160%] opacity-0'
          : isArriving
            ? 'translate-x-[160%] opacity-0'
            : 'translate-x-0 opacity-100'
      }`}
      dir="ltr"
    >
      {/*
        NO `scaleX(-1)` ANYWHERE IN THIS COMPONENT. The old SVG was drawn facing right and
        needed mirroring once the truck started travelling leftward; `cabin.png` is authored
        facing LEFT, which is already the direction of travel.

        THAT IS ALSO WHY THE CARGO NUMBERS ARE SAFE. A flip mirrors glyphs as surely as it
        mirrors a cab, and the previous build had to patch the two Hebrew deck labels with
        counter-flips to undo it. Removing the mirror deletes that entire class of bug: no
        text anywhere under the truck needs to defend itself against a transform.
      */}
      <div>
        {/* The lean. Owns `transform`, so the sink must not live here. */}
        <div
          data-testid="cargo-chassis-tilt"
          className={
            overloaded
              ? 'rotate-[-1.2deg] motion-safe:animate-[truckTilt_.9s_ease-in-out_infinite]'
              : 'rotate-0 duration-200'
          }
        >
          <div className="relative h-48 w-full">
            {/*
              THE WHEELS SIT ON THE STAGE FLOOR, AND THE ROAD LINE IS DRAWN TO MEET THEM.

              Sized `h-24 w-24` (96px) - roughly 1.7x the previous `h-14` - so the tyres
              actually fill the arches painted into `cabin.png` rather than rattling around
              inside them like castors. The stage is `h-48` (192px), so the wheels are half
              its height, which is the proportion a real truck's wheels have against its
              overall body height.

              `bottom-0` puts their contact patch on the floor of the stage, and the road
              line below is pulled up to overlap that edge so the tyres appear to stand ON
              the orange line rather than hover above it.
            */}
            <div
              data-testid="cargo-wheels"
              className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 h-24"
            >
              {/*
                FRONT AND REAR ARE POSITIONED BY THE CAB'S OWN PROPORTIONS, not by eye.

                `cabin.png` is 2752x1536 whose painted content runs x 197..2560. The cab sits
                at the LEFT of that artwork, so the front arch is roughly a fifth of the way
                across and the rear axle sits under the flatbed near the two-thirds mark.

                A PERCENTAGE OF THE CONTAINER RATHER THAN A PIXEL OFFSET, so both wheels stay
                under their arches at every width - the artwork is `object-contain`, so its
                painted features occupy a fixed fraction of this box no matter how it resizes.

                THE CENTERING TRANSLATE IS ON THE WRAPPER, NOT ON THE IMAGE. The spin keyframe
                sets `transform` outright, so on the image it would REPLACE the
                `-translate-x-1/2` and the wheel would jump half its width sideways the moment
                it began to turn. One transform per element.
              */}
              {[21.5, 74].map((pct) => (
                <div
                  key={pct}
                  style={{ left: `${pct}%` }}
                  className="absolute bottom-0 h-24 w-24 -translate-x-1/2"
                >
                  <img
                    src={wheelImg}
                    alt=""
                    aria-hidden
                    draggable={false}
                    className="h-full w-full object-contain drop-shadow-md motion-safe:animate-[wheelSpin_7s_linear_infinite]"
                  />
                </div>
              ))}
            </div>

            {/*
              THE SUSPENSION. Translates, and is never animated by a keyframe.

              `bottom-11` (44px) SETS THE RIDE HEIGHT, and it is a compromise between two
              constraints rather than a free choice. The wheels are 96px tall with their
              contact patch on the floor, so their tops reach 96px up; the chassis is
              `object-contain`, so the painted wheel wells sit some way INSIDE its box rather
              than at its bottom edge. Dropping the box too far buries the wheels entirely;
              too little and the arches float above them.

              44px brings the painted chassis frame and arches down over the tyres so the
              wheels read as seated in their wells. The `suspensionOffset` translate is
              added on top of this position, so the settle is measured from here.

              `suspensionOffset` is a continuous pixel value applied as an inline transform,
              for the same reason the old SVG did it: Tailwind only emits the translate
              classes it can see at build time, so a stepped set of classes would make the
              settle visibly jump in notches instead of gliding.
            */}
            <div
              data-testid="cargo-chassis"
              className="absolute inset-x-0 bottom-0 z-10 transition-transform duration-300 ease-out motion-reduce:transition-none"
              style={{ transform: `translateY(${CHASSIS_DROP_PX + suspensionOffset}px)` }}
            >
              {/*
                ONE NODE HOLDS THE ARTWORK AND THE CARGO. An earlier revision nested two
                absolutely-positioned wrappers here, both carrying `bottom-6`; the inner one
                became the parent that the bay's percentage offsets resolved against, and
                because that box was shorter than the stage the crates hung in mid-air below
                the deck. Percentages only mean anything relative to the box they are
                measured in, so the bay and the artwork must share one.
              */}
              <div
                data-testid="cargo-chassis-art"
                className="relative w-full"
              >
                <img
                  src={cabinImg}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="pointer-events-none w-full object-contain drop-shadow-xl"
                  style={{ filter: `hue-rotate(${tint.hue}) saturate(${tint.sat})` }}
                />

                {/*
                  THE HEADLIGHT BEAM. A cone of light leaving the front lamp and projecting
                  out onto the road ahead - which, since the truck faces LEFT, means it
                  extends leftward OFF THE FRONT OF THE TRUCK, not across it.

                  `left-[7.2%]` COMES FROM THE IMAGE'S OWN PIXELS, NOT FROM NUDGING.
                  `cabin.png` is 2752px wide with its painted content starting at x=197, so
                  there are 7.16% of transparent margin down the left side. The artwork is
                  `object-contain` on a fixed box, so that margin is a fixed FRACTION of the
                  box at every width - which makes `7.2%` the exact x of the painted bumper
                  rather than an approximation of it.

                  THAT PADDING WAS THE REPORTED GAP. With `left-0` the beam's edge sat at the
                  box's edge, ~48px short of the paint at this width, so light appeared to
                  start in mid-air beside the truck. Anchoring to the measured content edge
                  closes it by construction, instead of by tuning a value until it looked
                  right at one particular width.

                  `-translate-x-full` IS STILL WHAT MAKES IT PROJECT LEFTWARD. `left-[7.2%]`
                  positions the element's LEFT edge at the bumper, so the shift is what puts
                  the beam's BODY to the left of that line - the bright edge ends up on the
                  paint and the cone extends out over the road.

                  A TRANSFORM IS FREE HERE ONLY BECAUSE THE FLASH ANIMATES OPACITY. If the
                  flash keyframe ever moved this element, the two would fight for `transform`
                  and the beam would jump a full width sideways - the same collision the lean
                  and the suspension already document elsewhere in this file.

                  `bg-gradient-to-l` FADES THE RIGHT WAY. Its bright stop is the right edge -
                  the lamp - and it fades leftward as the light travels, so the cone is
                  brightest where it is emitted. Reversing the gradient would put the bright
                  end at the far tip, which reads as a glow hovering on the road rather than
                  light thrown by the truck.
                */}
                <div
                  data-testid="cargo-headlight-beam"
                  aria-hidden
                  className={`pointer-events-none absolute bottom-[39%] left-[10.5%] h-[18%] w-48 -translate-x-full bg-gradient-to-l from-yellow-300/35 via-yellow-100/15 to-transparent transition-opacity duration-500 ${
                    isTargetHit
                      ? 'opacity-100 motion-safe:animate-[headlightGlow_1.4s_ease-in-out_infinite]'
                      : 'opacity-0'
                  }`}
                  style={{
                    /*
                     * THE CONE NARROWS AT 100% - the RIGHT edge, which is the edge sitting
                     * against the truck after the -translate-x-full shift. The left edge
                     * (0%) is full height, so the beam is wide out on the road and comes to
                     * a point at the lamp.
                     *
                     * THE POLYGON IS WRITTEN IN THE ELEMENT'S OWN COORDINATES, so the
                     * `-translate-x-full` does not change it: a transform moves the box but
                     * does not renumber what is inside it. The taper therefore stays on the
                     * lamp side for free, and only the anchor class has to reason about
                     * screen position.
                     *
                     * A CLIP RATHER THAN A ROTATED TRIANGLE, so `transform` stays free for
                     * the `-translate-x-full` shift - a rotated element would own the
                     * property and the shift would silently clobber the rotation.
                     */
                    clipPath: 'polygon(0% 0%, 100% 40%, 100% 60%, 0% 100%)',
                  }}
                />

                {/*
                  THE HONK TARGET. A transparent button over the cab only - not the whole
                  truck - so tapping the cargo or the flatbed still does what it did before.
                  It is the only interactive element in this component that is not a crate.

                  `aria-label` CARRIES THE JOKE, because a screen reader cannot see a truck
                  bounce. The visual reply is a 2% scale flutter: enough to feel like the
                  truck heard you, small enough that mashing it cannot shake the cargo out of
                  registration with the deck.
                */}
                {onHonk && (
                  <button
                    type="button"
                    aria-label="צפצף בנהג המשאית"
                    onClick={onHonk}
                    className="absolute bottom-[26%] left-[2%] h-[46%] w-[26%] cursor-pointer rounded-2xl bg-transparent active:motion-safe:animate-[hornBounce_.35s_ease-out]"
                  />
                )}

                {/*
                  THE EXHAUST PUFF. Fired once per crate that lands, from the stack beneath
                  the chassis.

                  IT LIVES ABOVE THE WHEELS IN THE STACKING ORDER (z-40 against their z-30),
                  because smoke rises in front of whatever is behind it - including the
                  tyres it drifts past on the way up.

                  MOUNTED CONDITIONALLY ON A TIMER rather than left in the tree and retriggered:
                  a keyframe only replays if the element remounts, so a puff that stayed
                  mounted would fire exactly once and then never again.
                */}
                {puffing && (
                  <div
                    data-testid="cargo-exhaust-puff"
                    aria-hidden
                    className="pointer-events-none absolute bottom-[30%] left-[8%] z-40 h-6 w-6 rounded-full bg-slate-300/60 motion-safe:animate-[exhaustPuff_.7s_ease-out_forwards]"
                  />
                )}

                {/*
                  THE CARGO BAY IS INSIDE THIS NODE, SO THE CRATES SINK WITH THE DECK.

                  That containment is the entire reason the bay is nested here rather than
                  beside the artwork: `cabin.png` is a whole side-on vehicle, so translating
                  it moves the painted deck, and cargo left outside the translation would
                  hang at ride height while the planks dropped away beneath it.

                  The bay is deliberately not `flex-wrap`: a load that wrapped to a second
                  row would grow downwards through the deck. `gap-1` plus the compact crate
                  sizes bound the widest possible legal load instead.

                  IT SPANS THE FLATBED, NOT THE WHOLE IMAGE. `cabin.png` is 2.74:1 with the
                  cab at one end, so the deck occupies only part of its width - the bay is
                  inset from the cab side to sit over the planks.

                  `bottom-[30%]` IS THE DECK LINE, AND THE BAY RESTS ON IT. The bay is
                  anchored so its FLOOR (not its middle) meets the painted planks - which is
                  what `items-end` is for: children align to the bay's bottom edge, so a
                  crate's own bottom is placed exactly on the deck rather than floating at
                  some height governed by the bay's box.

                  WITH THE BAY AND THE ARTWORK NOW SHARING ONE PARENT BOX, this percentage
                  finally resolves against the image itself. That is what fixes the crates
                  hanging below the plank: the offset and what it is measured against are
                  finally the same coordinate space.
                */}
                <div className="absolute bottom-[46%] left-[41%] z-20 flex h-[26%] w-[35%] items-end justify-center gap-1 pointer-events-auto">
                  {showEmptyHint && (
                    /*
                     * The hint is the ONLY thing in the bay when it is empty, and it is
                     * `pointer-events-none` so it cannot swallow a tap meant for the deck.
                     */
                    <span
                      dir="rtl"
                      className="pointer-events-none mb-6 rounded-full bg-amber-900/25 px-3 py-1.5 text-[11px] font-black text-amber-900"
                    >
                      העמיסו ארגזים מהמחסן למטה
                    </span>
                  )}
                  {children}
                </div>

                {/*
                  The remaining-capacity chip. It sits ABOVE the deck, clear of the cargo
                  bay, so it cannot overlap a crate the child is trying to tap.

                  NO COUNTER-FLIP HERE ANY MORE. The `scale-x-[-1]` that used to mirror this
                  label is gone along with the truck's mirror, so the Hebrew renders
                  normally without defending itself against an ancestor transform.
                */}
                {slotsRemaining !== null && (
                  <span
                    dir="rtl"
                    className={`absolute bottom-[73%] left-[41%] z-30 rounded-full px-2.5 py-1 text-[11px] font-black ${
                      slotsRemaining === 0
                        ? 'bg-rose-600/90 text-white'
                        : 'bg-amber-900/70 text-amber-100'
                    }`}
                  >
                    {slotsRemaining === 0 ? 'המשאית מלאה' : `נשארו ${slotsRemaining} מקומות`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The ground line the truck sits on. */}
      <div className="-mt-2 h-2 w-full rounded-full bg-gradient-to-r from-amber-700/40 via-slate-500 to-amber-700/40" />
    </div>
  );
};
