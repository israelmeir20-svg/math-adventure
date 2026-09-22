/**
 * The wooden selection shelf for "מאזניים בחווה".
 *
 * Tap-to-place only: there is no drag-and-drop and no pointer tracking. Each card shows
 * the animal, its Hebrew name and its weight, so a child can do the arithmetic from the
 * tray without memorising the table.
 *
 * Ownership is one-directional and lives in the parent: this component only reports
 * taps. That keeps the "who is where" state in a single place.
 *
 * ===================================================================
 * TWO ANIMALS OF ONE SPECIES ARE NEVER THE SAME PICTURE.
 * ===================================================================
 *
 * The cast is not a fixed set of eight species - each species is a small pool of
 * animated poses, and this shelf draws a fresh pose per card. So a round that deals two
 * dogs shows two different dogs, and the tray reads as a group of animals rather than
 * the same stamp twice.
 *
 * The pose is resolved per CARD, from the card's own index, rather than per species.
 * Deriving it from the species alone would give every dog on the shelf the identical
 * face, which is exactly the flatness the variants exist to avoid.
 */
import { ANIMAL_META, animalArt, poseSeed, weightOf, type ScaleAnimal } from './scaleWeights';

interface ScaleShelfProps {
  /** Animals currently available to place. */
  pool: ScaleAnimal[];
  /** True once the run is over, or the puzzle is solved mid-transition. */
  locked: boolean;
  /** True when the pan is full, so taps must be ignored. */
  full: boolean;
  onPick: (animal: ScaleAnimal) => void;
}

export default function ScaleShelf({ pool, locked, full, onPick }: ScaleShelfProps) {
  const disabled = locked || full;

  return (
    /*
     * THE SHELF FILLS THE DRAWER'S RESERVED HEIGHT.
     *
     * The game column gives this block a definite 112px (`h-28`), so the shelf must live
     * inside that rather than sizing itself. `h-full` takes the height it is offered, and
     * `flex flex-col` lets the card row sit centred in whatever is left after the tray's
     * own padding and the hint line below.
     *
     * This replaced a `min-h` floor that was TALLER than the drawer: the inner tray's
     * `min-h-[5.5rem]` (88px) plus the tray's padding, the outer padding and the hint line
     * came to roughly 150px, so the shelf overflowed the 112px it was given and its bottom
     * - the hint text and the weight badges - was clipped. A floor larger than the space
     * available is not a floor, it is an overflow.
     */
    <div className="flex h-full w-full flex-col rounded-3xl border-2 border-amber-200/40 bg-amber-950/45 p-1.5 shadow-xl backdrop-blur-md">
      {/* The wooden tray the cards sit in. */}
      <div className="flex flex-1 items-center justify-center rounded-2xl border-4 border-amber-950/80 bg-gradient-to-b from-amber-700 to-amber-900 p-1.5 shadow-[inset_0_4px_10px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-end justify-center gap-2" dir="rtl">
          {pool.length === 0 && (
            <span className="px-2 py-4 text-sm font-black text-amber-100/80">
              הכף מלאה - הקישו על חיה כדי להחזיר אותה
            </span>
          )}

          {pool.map((animal, index) => (
            <ShelfCard
              key={`${animal}-${index}`}
              animal={animal}
              /* The card's seat in the shelf, so its pose is stable across re-renders. */
              poseIndex={index}
              disabled={disabled}
              onPick={onPick}
            />
          ))}
        </div>
      </div>

      {/*
        ONE HINT AT A TIME, AND ONLY WHEN IT APPLIES.

        This line and the "החזרה למדף" row below the drawer used to be able to render at
        the same moment, and their texts ran over each other. They are two separate
        components in two separate flex rows, so neither could see the other - the shelf
        always drew its placement hint, and the return row drew its own label whenever
        anything sat on the pan, with no coordination between them.

        The resolution is that they describe MUTUALLY EXCLUSIVE situations, so only one is
        ever useful:

          - the drawer has room  -> the child's next action is to PLACE, so this hint shows
                                    and the return row below stays hidden;
          - the drawer is full   -> the only way forward is to REMOVE, so this hint becomes
                                    the "pan is full" nudge.

        `whitespace-nowrap` stops the line wrapping to two rows on a narrow window, which
        is what made the collision look like overlapping text rather than two stacked
        hints - a wrapped hint takes vertical space the layout had not budgeted for.
      */}
      <p className="mt-1 shrink-0 whitespace-nowrap text-center text-[11px] font-bold leading-tight text-amber-100/85">
        {full
          ? 'הכף מלאה! הקישו על חיה על הכף כדי לפנות מקום'
          : 'הקישו על חיה כדי להעלות אותה לכף הימנית'}
      </p>
    </div>
  );
}

/** A single tappable animal card. */
function ShelfCard({
  animal,
  poseIndex,
  disabled,
  onPick,
}: {
  animal: ScaleAnimal;
  /** The card's seat in the shelf; the source of its otherwise-random pose. */
  poseIndex: number;
  disabled: boolean;
  onPick: (animal: ScaleAnimal) => void;
}) {
  const meta = ANIMAL_META[animal];
  const shelfSeed = poseSeed(poseIndex, 3);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(animal)}
      aria-label={`העלה ${meta.label} במשקל ${weightOf(animal)}`}
      /*
       * A PHYSICAL PUSH-DOWN CARD.
       *
       * The 4px bottom border is the card's "thickness", and a press collapses it while
       * travelling the card down by the same 4px - so the card visibly sinks into the
       * tray rather than merely changing colour. That travel is the whole difference
       * between a button and a button that feels like an object.
       *
       * An inset highlight along the top edge reads as the tray's lip catching the
       * light, which stops the card looking flat against the wood behind it.
       */
      className="flex w-[4.5rem] shrink-0 flex-col items-center gap-0.5 rounded-2xl border-2 border-amber-950/80 border-b-4 bg-gradient-to-b from-amber-50 via-amber-100 to-amber-300 px-1 pb-1 pt-1 text-amber-950 shadow-[0_4px_0_#78350f,inset_0_2px_3px_rgba(255,255,255,0.7)] transition-all duration-100 hover:from-amber-50 hover:to-amber-200 active:translate-y-[4px] active:border-b-2 active:shadow-[0_1px_0_#78350f] disabled:opacity-45 disabled:active:translate-y-0 disabled:active:border-b-4"
    >
      {/*
        The ANIMATED sprite: a six-frame WebP the browser plays by itself, with the
        static PNG as the fallback baked into `animalArt`. A random pose per render is
        fine here because the shelf is rebuilt whenever the pool changes, so the cards do
        not flicker while the child is looking at them.

        `h-9` rather than `h-10`: the card has to fit its sprite, its name AND its weight
        badge inside the drawer's 112px, and the badge below is the element that must never
        be the one to get clipped - it is the number the whole puzzle is about.

        A FIXED BOUNDING BOX, THE SAME FOR EVERY ANIMAL.

        The box is a constant 48px square and the sprite fills it with `object-contain`, so
        every card's preview is centred and identically framed. Critically, the sprite's size
        is NOT derived from the animal's species or variant factors - those exist to order
        the animals against each other ON THE PAN, where relative size is the cue the child
        reads. Applying them here made the duck microscopic, because it is the smallest
        factor in the catalogue. A shelf card is a BUTTON, not a scale model: what it needs
        is a recognisable animal and a legible number.
      */}
      <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center">
        <img
          src={animalArt(animal, shelfSeed)}
          alt=""
          aria-hidden
          className="max-h-full max-w-full select-none object-contain drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]"
          draggable={false}
        />
      </div>
      <span className="text-[10px] font-black leading-tight">{meta.label}</span>
      {/*
        THE WEIGHT IS THE MOST IMPORTANT NUMBER ON THIS CARD.
        It is sized above the name, given the strongest contrast on the card and a ring,
        because it is what the child reads to do the arithmetic. A weight badge that is
        merely present but visually subordinate to the animal's name is a badge the child
        will hunt for mid-round.
      */}
      <span className="mt-0.5 grid min-w-[1.9em] place-items-center rounded-full border border-amber-300/60 bg-amber-950 px-1.5 py-px text-[11px] font-black leading-none tabular-nums text-amber-50 shadow-[0_1px_0_rgba(0,0,0,0.4)]">
        {weightOf(animal)}
      </span>
    </button>
  );
}
