/**
 * A tactile coin / note button for the cash register drawer.
 */
import type { Denomination } from './kioskRounds';

interface CoinButtonProps {
  value: Denomination;
  disabled?: boolean;
  onAdd: () => void;
}

/** Notes look like banknotes; coins look like coins. */
const STYLES: Record<Denomination, { tone: string; shadow: string; label: string }> = {
  1: { tone: 'bg-amber-100 text-amber-900 border-amber-400', shadow: 'shadow-[0_4px_0_#b45309]', label: '1' },
  2: { tone: 'bg-amber-200 text-amber-900 border-amber-500', shadow: 'shadow-[0_4px_0_#b45309]', label: '2' },
  5: { tone: 'bg-yellow-200 text-yellow-900 border-yellow-500', shadow: 'shadow-[0_4px_0_#a16207]', label: '5' },
  10: { tone: 'bg-slate-200 text-slate-900 border-slate-400', shadow: 'shadow-[0_4px_0_#475569]', label: '10' },
  20: { tone: 'bg-emerald-200 text-emerald-900 border-emerald-500', shadow: 'shadow-[0_4px_0_#047857]', label: '20' },
};

export default function CoinButton({ value, disabled = false, onAdd }: CoinButtonProps) {
  const style = STYLES[value];
  const isNote = value >= 20;

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      aria-label={`הוסף ${value} שקלים`}
      className={`grid place-items-center border-4 font-black tabular-nums transition active:translate-y-[3px] active:shadow-none disabled:opacity-40 disabled:active:translate-y-0 ${style.tone} ${style.shadow} ${
        isNote
          ? 'h-14 w-24 rounded-lg text-xl'
          : 'h-14 w-14 rounded-full text-lg'
      }`}
    >
      <span aria-hidden className="text-[10px] font-bold opacity-70">
        ₪
      </span>
      {style.label}
    </button>
  );
}
