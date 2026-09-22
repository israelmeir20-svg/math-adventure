/**
 * The pizzeria counter: pick a topping, then bake.
 *
 * TWO SPEEDS OF INPUT FOR TWO KINDS OF CHOICE. Choosing a topping happens many
 * times per pizza, so it is bound to the number keys 1-4 and the tray shows the
 * same digit on each button - the shortcut is discoverable on the control itself
 * rather than hidden. Baking happens once and is irreversible, so it gets the
 * big button and the Space key, but NOT Enter: Enter is the "confirm" reflex on
 * any focused button, and a child tabbing around the tray would fire it by
 * accident and lose their pizza.
 *
 * The tray is `dir="ltr"` so the digits run left to right in the same order as
 * the keyboard, which is what makes key 1 the leftmost button rather than the
 * rightmost under the page's inherited RTL.
 */
import { Flame } from 'lucide-react';
import { TOPPINGS, type ToppingId } from './pizzaTypes';

interface PizzaControlsProps {
  selected: ToppingId;
  /** True while the pizza may still be changed. */
  live: boolean;
  onSelect: (topping: ToppingId) => void;
  onBake: () => void;
}

export default function PizzaControls({
  selected,
  live,
  onSelect,
  onBake,
}: PizzaControlsProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div dir="ltr" className="flex flex-wrap items-center justify-center gap-1.5">
        {TOPPINGS.map((topping) => {
          const isActive = topping.id === selected;
          return (
            <button
              key={topping.id}
              type="button"
              disabled={!live}
              onClick={() => onSelect(topping.id)}
              aria-pressed={isActive}
              className={`relative flex min-w-[4rem] flex-col items-center rounded-2xl border-4 px-2 py-0.5 text-[11px] font-black transition active:translate-y-[3px] active:shadow-none disabled:opacity-40 ${
                isActive
                  ? 'border-amber-500 bg-amber-300 text-amber-950 shadow-none'
                  : 'border-white bg-white text-stone-600 shadow-[0_3px_0_rgba(0,0,0,0.15)]'
              }`}
            >
              {/* The keyboard slot, so the number keys are discoverable. */}
              <span className="absolute left-1 top-0.5 rounded-md bg-stone-900/15 px-1.5 text-[10px] font-black tabular-nums">
                {topping.key}
              </span>
              <span aria-hidden className="text-xl">
                {topping.emoji}
              </span>
              {topping.nameHebrew}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!live}
        onClick={onBake}
        className="flex items-center gap-2 rounded-2xl border-b-4 border-orange-900 bg-gradient-to-b from-amber-300 to-orange-500 px-6 py-1.5 text-lg font-black text-orange-950 shadow-[0_4px_0_#7c2d12] transition active:translate-y-[4px] active:shadow-none disabled:opacity-40"
      >
        <Flame className="h-5 w-5" />
        לאפות! 🍕
        <span className="rounded-md bg-orange-950/15 px-1.5 text-[11px] font-black">SPACE</span>
      </button>
    </div>
  );
}
