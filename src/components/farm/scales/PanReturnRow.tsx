/**
 * The "return to shelf" controls for "מאזניים בחווה".
 *
 * Each animal the child has added to the right pan gets a chip here. Tapping it sends the
 * animal back to the shelf, which is the other way to undo a placement besides tapping the
 * animal on the pan itself.
 *
 * ===================================================================
 * IT RENDERS ONLY WHEN THE PAN HOLDS SOMETHING.
 * ===================================================================
 *
 * This row and the shelf's hint line below it used to be able to render together, and
 * their texts collided. They are siblings in the game column rather than nested, so
 * neither could detect the other; the fix is to make them describe mutually exclusive
 * states.
 *
 * `placed.length === 0` returns null in the first line of the component - an empty pan has
 * nothing to return, so the label "החזרה למדף:" would be describing a control that does
 * not exist. That early return is what keeps the two hints from ever appearing at once.
 *
 * It is also given its own flex row with a fixed leading label, so the chips wrap beneath
 * the label instead of over the shelf's hint.
 */
import { ANIMAL_META, type ScaleAnimal } from './scaleWeights';

interface PanReturnRowProps {
  placed: ScaleAnimal[];
  /** True once the run is over or the puzzle is solved. */
  locked: boolean;
  onReturn: (index: number) => void;
}

export default function PanReturnRow({ placed, locked, onReturn }: PanReturnRowProps) {
  // Nothing on the pan means nothing to return - and no label competing with the
  // shelf's placement hint for the same line of the layout.
  if (placed.length === 0) return null;

  return (
    <div className="flex w-full shrink-0 flex-wrap items-center justify-center gap-2" dir="rtl">
      <span className="whitespace-nowrap text-[11px] font-bold text-amber-100/85">
        החזרה למדף:
      </span>
      {placed.map((animal, index) => (
        <button
          key={`${animal}-${index}`}
          type="button"
          disabled={locked}
          onClick={() => onReturn(index)}
          aria-label={`החזר ${ANIMAL_META[animal].label} למדף`}
          className="whitespace-nowrap rounded-xl border-b-2 border-amber-950 bg-amber-200 px-2 py-1 text-[11px] font-black text-amber-950 transition active:translate-y-[2px] active:shadow-none disabled:opacity-45"
        >
          ↩ {ANIMAL_META[animal].label}
        </button>
      ))}
    </div>
  );
}
