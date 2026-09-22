/**
 * The lifelines bar: 50/50, visual array reveal and the eraser.
 * Each button is a tactile 3D press button and reports its own state.
 */
import { CircleDot, Eraser, PieChart } from 'lucide-react';
import type { LifelineId } from '../../types/game.types';

interface LifelinesBarProps {
  charges: Record<LifelineId, number>;
  disabled?: boolean;
  /** Lifelines already spent on this problem. */
  used: Partial<Record<LifelineId, boolean>>;
  dotGridOn: boolean;
  onFiftyFifty: () => void;
  onRevealArray: () => void;
  onToggleDotGrid: () => void;
  onEraser: () => void;
  eraserArmed: boolean;
}

export default function LifelinesBar({
  charges,
  disabled = false,
  used,
  dotGridOn,
  onFiftyFifty,
  onRevealArray,
  onToggleDotGrid,
  onEraser,
  eraserArmed,
}: LifelinesBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <LifelineButton
        label="50/50"
        emoji="➗"
        icon={<PieChart className="h-4 w-4" />}
        count={charges.fiftyFifty}
        tone="bg-violet-300 text-violet-950 shadow-[0_4px_0_#6d28d9]"
        disabled={disabled}
        spent={Boolean(used.fiftyFifty)}
        onClick={onFiftyFifty}
      />
      <LifelineButton
        label="מערך נקודות"
        emoji="🔢"
        icon={<CircleDot className="h-4 w-4" />}
        count={charges.dotGrid}
        tone="bg-sky-300 text-sky-950 shadow-[0_4px_0_#0369a1]"
        disabled={disabled}
        spent={false}
        active={dotGridOn}
        onClick={onToggleDotGrid}
      />
      <LifelineButton
        label="חשיפת מערך"
        emoji="👀"
        icon={<CircleDot className="h-4 w-4" />}
        count={charges.dotGrid}
        tone="bg-amber-300 text-amber-950 shadow-[0_4px_0_#b45309]"
        disabled={disabled}
        spent={Boolean(used.dotGrid)}
        onClick={onRevealArray}
      />
      <LifelineButton
        label="מחק"
        emoji="🧽"
        icon={<Eraser className="h-4 w-4" />}
        count={charges.eraser}
        tone="bg-emerald-300 text-emerald-950 shadow-[0_4px_0_#047857]"
        disabled={disabled}
        spent={Boolean(used.eraser)}
        active={eraserArmed}
        onClick={onEraser}
      />
    </div>
  );
}

function LifelineButton({
  label,
  emoji,
  icon,
  count,
  tone,
  disabled,
  spent,
  active = false,
  onClick,
}: {
  label: string;
  emoji: string;
  icon: React.ReactNode;
  count: number;
  tone: string;
  disabled: boolean;
  spent: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  const unavailable = disabled || spent || count <= 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={unavailable}
      title={spent ? `${label} - כבר נוצל` : label}
      className={`flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-black transition active:translate-y-[3px] active:shadow-none disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none ${tone} ${
        active ? 'ring-4 ring-white/70' : ''
      }`}
    >
      <span aria-hidden>{emoji}</span>
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="tabular-nums">({spent ? 0 : count})</span>
    </button>
  );
}
