/**
 * The counter: coins the player has placed, the running total and the hint.
 */
import { HandCoins, Undo2 } from 'lucide-react';
import type { Denomination } from './kioskRounds';
import { describeDifference, sumCoins } from './kioskRounds';

interface ChangeTrayProps {
  coins: Denomination[];
  change: number;
  revealed: boolean;
  onUndo: () => void;
  onClear: () => void;
}

export default function ChangeTray({
  coins,
  change,
  revealed,
  onUndo,
  onClear,
}: ChangeTrayProps) {
  const placed = sumCoins(coins);
  const exact = placed === change;

  return (
    <section className="rounded-3xl border-4 border-dashed border-emerald-300 bg-emerald-50 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-1.5 text-xs font-black text-emerald-900">
          <HandCoins className="h-4 w-4" />
          הדלפק - סה״כ {placed}₪
        </p>

        <span
          className={`ms-auto rounded-full px-3 py-1 text-xs font-black ${
            exact
              ? 'bg-emerald-500 text-white'
              : placed > change
                ? 'bg-rose-300 text-rose-950'
                : 'bg-white text-stone-600'
          }`}
        >
          {revealed ? `צריך ${change}₪` : describeDifference(placed, change)}
        </span>

        <button
          type="button"
          onClick={onUndo}
          disabled={coins.length === 0}
          className="grid h-8 w-8 place-items-center rounded-xl bg-white text-stone-500 shadow-[0_2px_0_rgba(0,0,0,0.15)] transition active:translate-y-[2px] active:shadow-none disabled:opacity-40"
          aria-label="בטל מטבע אחרון"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={coins.length === 0}
          className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-stone-600 shadow-[0_2px_0_rgba(0,0,0,0.15)] transition active:translate-y-[2px] active:shadow-none disabled:opacity-40"
        >
          נקה דלפק
        </button>
      </div>

      <div className="flex min-h-[3.5rem] flex-wrap items-center gap-1.5 rounded-2xl bg-white/70 p-2">
        {coins.length === 0 ? (
          <span className="text-xs font-bold text-stone-400">
            לחצו על מטבעות ושטרות כדי להניח עודף
          </span>
        ) : (
          coins.map((coin, index) => (
            <span
              key={`${coin}-${index}`}
              className={`grid h-9 w-9 place-items-center rounded-full text-xs font-black tabular-nums shadow-[0_2px_0_rgba(0,0,0,0.2)] ${
                coin >= 20
                  ? 'w-14 rounded-lg bg-emerald-300 text-emerald-950'
                  : 'bg-amber-200 text-amber-900'
              }`}
            >
              {coin}
            </span>
          ))
        )}
      </div>
    </section>
  );
}
