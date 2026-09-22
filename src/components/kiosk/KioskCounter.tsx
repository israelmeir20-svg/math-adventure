/**
 * The counter tray: only what the child has put down so far.
 *
 * WHAT IS DELIBERATELY ABSENT. The old tray printed a live hint - "צריך עוד 12₪"
 * / "החזרתם 7₪ יותר מדי" - which is the whole sum worked out for the child. The
 * brief calls this out as the critical pedagogical fix, and it is right: telling
 * someone the remainder turns a subtraction into a copying exercise. So this
 * component knows the running total and NOTHING ELSE. It cannot leak the answer
 * because it is never told what the answer is - the `change` prop it used to
 * take is gone from its interface entirely, which is a stronger guarantee than
 * remembering not to render it.
 *
 * ONE CHIP, NO INSTRUCTIONS. The header used to carry a title, a total, an item
 * count and a sentence telling the child which button to press. A child who has
 * been handed a drawer of money and a customer asking for change does not need to
 * be told to tap a coin, and "0 פריטים" said nothing at all. What is left is the
 * one fact the tray genuinely knows and the child cannot see: what it all adds up
 * to. An EMPTY tray shows no chip rather than "0₪", so the empty state reads as a
 * surface waiting for money instead of a scoreboard showing a zero.
 *
 * Pieces come back off the tray by tapping them, which is stated without words by
 * the hover lift and the cursor.
 */
import { Undo2 } from 'lucide-react';
import { COUNTER_ART, MONEY_IMAGE, MONEY_SHAPE, isCoin, shekels, type Money } from './kioskMoney';

interface KioskCounterProps {
  /** Pieces currently on the counter, in the order they were placed. */
  placed: Money[];
  /** Removes one piece by its index. */
  onTakeBack: (index: number) => void;
  onClear: () => void;
  /** True while the celebration is running; the tray is frozen. */
  frozen: boolean;
}

export default function KioskCounter({ placed, onTakeBack, onClear, frozen }: KioskCounterProps) {
  const total = placed.reduce((acc, value) => acc + value, 0);

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border-2 border-amber-700/60 bg-gradient-to-b from-amber-800/75 to-amber-950/80 p-2 shadow-[0_6px_16px_rgba(0,0,0,0.35),inset_0_2px_0_rgba(255,255,255,0.12)]">
      {/* The action row only materialises once there is something to act on. */}
      {placed.length > 0 && (
        <div className="mb-1.5 flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-amber-950/70 px-3 py-1 text-sm font-black tabular-nums text-amber-50 shadow-inner">
            על הדלפק: {shekels(total)}
          </span>

          <span className="ms-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onTakeBack(placed.length - 1)}
              disabled={frozen}
              aria-label="החזר את הפריט האחרון"
              className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100/90 text-amber-900 shadow-[0_2px_0_rgba(0,0,0,0.25)] transition hover:bg-amber-50 active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:active:translate-y-0"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={frozen}
              className="rounded-xl bg-amber-100/90 px-3 py-1.5 text-xs font-black text-amber-900 shadow-[0_2px_0_rgba(0,0,0,0.25)] transition hover:bg-amber-50 active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:active:translate-y-0"
            >
              נקה דלפק
            </button>
          </span>
        </div>
      )}

      {/*
        THE COUNTER SURFACE IS THE REAL ARTWORK, WITH THE MONEY ON TOP OF IT.

        It used to be a CSS gradient standing in for a counter. `counter.png` is the
        actual wooden surface, so the coins now sit on something that looks like a till
        rather than on a coloured panel - and the layout is unchanged, because the image
        is a background layer rather than a child that would push the money around.

        `bg-cover` with a centred position keeps the grain readable at every width; the
        inset shadow is kept on top of it so the surface still reads as RECESSED into the
        cabinet rather than pasted onto it.
      */}
      <div
        className="flex min-h-[5.5rem] max-h-44 flex-wrap items-center justify-center gap-2 overflow-y-auto rounded-xl px-3 py-2.5 shadow-[inset_0_4px_12px_rgba(120,53,15,0.55)]"
        style={{
          backgroundImage: `url(${COUNTER_ART})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {placed.map((value, index) => (
          /*
            TAPPING A COIN SENDS THAT ONE COIN BACK, AND THE HIT TARGET IS THE COIN.

            This already removed by index, so a child could take back the third coin
            without disturbing the first two - which is the interaction the brief asks
            for. What was missing was any signal that it is possible: the hover lift was
            subtle against a busy counter, and the label said "החזר" without saying which
            coin. The ring on hover plus the per-coin title makes the affordance explicit
            without adding a button to every piece.
          */
          <button
            key={`${value}-${index}`}
            type="button"
            onClick={() => onTakeBack(index)}
            disabled={frozen}
            aria-label={`החזר ${value} שקלים לקופה`}
            title={`החזר ${value}₪ לקופה`}
            className="group relative rounded-full transition duration-150 hover:-translate-y-1.5 hover:scale-105 hover:ring-4 hover:ring-rose-400/70 focus-visible:ring-4 focus-visible:ring-rose-400 active:translate-y-0 active:scale-95 motion-safe:hover:-rotate-2 disabled:active:scale-100"
          >
            <MoneyImage value={value} size={isCoin(value) ? 58 : 76} />
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * One piece of money artwork.
 *
 * The image is drawn with `object-contain` into a box whose aspect ratio matches
 * the artwork's own shape. Forcing the heptagonal 2 and 5 coins into a square
 * would stretch them, so the polygons and notes get a wider box and the round
 * coins get a square one.
 */
export function MoneyImage({ value, size }: { value: Money; size: number }) {
  const shape = MONEY_SHAPE[value];
  const width = shape === 'note' ? Math.round(size * 1.7) : size;
  const height = shape === 'round' || shape === 'poly' ? size : Math.round(size * 0.62);

  return (
    <img
      src={MONEY_IMAGE[value]}
      alt={`${value} שקלים`}
      draggable={false}
      style={{ width, height }}
      className="object-contain drop-shadow-[0_4px_4px_rgba(0,0,0,0.35)] transition duration-150 group-hover:drop-shadow-[0_8px_10px_rgba(0,0,0,0.45)]"
    />
  );
}
