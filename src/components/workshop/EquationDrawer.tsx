/**
 * The bottom equation drawer for the mystery picture.
 *
 * Keeping the equation out of the tile is the whole point of the refactor: the
 * prompt gets one clean line, and the four candidate stones sit beneath it in
 * generous tap targets. When no tile is active the drawer explains what to do
 * rather than sitting empty.
 */
import { Frame, HelpCircle, Sparkles } from 'lucide-react';
import { describeSolved, type PuzzleEquation } from './mysteryPictureData';

/** Stone colours, cycled by position so neighbouring stones always differ. */
const STONE_TONES = [
  'from-rose-400 to-rose-600 shadow-[0_5px_0_#9f1239]',
  'from-amber-300 to-amber-500 shadow-[0_5px_0_#b45309]',
  'from-sky-400 to-sky-600 shadow-[0_5px_0_#075985]',
  'from-emerald-400 to-emerald-600 shadow-[0_5px_0_#065f46]',
];

interface EquationDrawerProps {
  /** null until the child taps a tile. */
  equation: PuzzleEquation | null;
  /** The stone shaking after a wrong tap. */
  rejected: number | null;
  disabled: boolean;
  onPick: (value: number) => void;
}

export default function EquationDrawer({
  equation,
  rejected,
  disabled,
  onPick,
}: EquationDrawerProps) {
  if (!equation) {
    return (
      <div className="rounded-2xl bg-slate-900/60 p-4 text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-bold text-white/80">
          <HelpCircle className="h-4 w-4 text-violet-200" />
          הקישו על משבצת כדי לפתוח את המשוואה שלה
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-slate-900/60 p-3">
      {/* The prompt, then a solved form once it has been answered. */}
      <p dir="ltr" className="text-center text-3xl font-black tabular-nums text-white">
        {equation.text}
      </p>

      <div className="grid grid-cols-4 gap-2">
        {equation.choices.map((value, index) => (
          <button
            key={`${value}-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => onPick(value)}
            aria-label={`אבן ${value}`}
            className={`rounded-2xl bg-gradient-to-br py-3 text-xl font-black text-white tabular-nums transition active:translate-y-[4px] active:shadow-none disabled:opacity-40 ${
              STONE_TONES[index % STONE_TONES.length]
            } ${
              rejected === value
                ? 'animate-[wobble_.45s_ease-in-out]'
                : 'hover:scale-[1.04]'
            }`}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The confirmation line shown briefly after a tile flips. */
export function SolvedFlash({ equation }: { equation: PuzzleEquation }) {
  return (
    <p className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-400/20 px-3 py-2 text-sm font-black text-emerald-100">
      <Sparkles className="h-4 w-4" />
      <span dir="ltr" className="tabular-nums">
        {describeSolved(equation)}
      </span>
    </p>
  );
}

/** The victory banner shown once the last tile flips. */
export function CompletionBanner({ reward, title }: { reward: number; title: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-emerald-400/20 px-3 py-3 text-center motion-safe:animate-[popBounce_.5s_ease-out]">
      <p className="flex items-center justify-center gap-1.5 text-base font-black text-emerald-100">
        <Frame className="h-4 w-4" />
        כל הכבוד! גילית: {title} 🎉
      </p>
      <p className="text-xs font-black text-emerald-200/80">קיבלתם {reward} 🍪</p>
    </div>
  );
}
