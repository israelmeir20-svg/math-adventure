/**
 * The customer: their shopping list and the Hebrew prompt in a speech bubble.
 */
import type { KioskRound } from './kioskRounds';

export default function CustomerBubble({ round }: { round: KioskRound }) {
  return (
    <section className="flex items-start gap-3">
      <span
        aria-hidden
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sky-200 text-2xl shadow-[0_3px_0_#0369a1]"
      >
        🧒
      </span>

      <div className="relative flex-1 rounded-2xl rounded-ts-none border-2 border-sky-200 bg-sky-50 p-3">
        <ul className="mb-2 flex flex-wrap gap-2">
          {round.items.map((item, index) => (
            <li
              key={`${item.nameHebrew}-${index}`}
              className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-black text-stone-600 shadow-[0_2px_0_rgba(0,0,0,0.08)]"
            >
              <span aria-hidden>{item.emoji}</span>
              {item.nameHebrew}
              <span className="tabular-nums text-sky-700">{item.price}₪</span>
            </li>
          ))}
        </ul>

        <p className="text-sm font-bold leading-snug text-stone-700">
          שלום! החשבון שלי הוא{' '}
          <span className="text-lg font-black tabular-nums text-sky-800">
            {round.total}₪
          </span>
          , הנה שטר של{' '}
          <span className="font-black tabular-nums text-emerald-700">
            {round.paidWith}₪
          </span>
          . כמה עודף מגיע לי?
        </p>
      </div>
    </section>
  );
}
