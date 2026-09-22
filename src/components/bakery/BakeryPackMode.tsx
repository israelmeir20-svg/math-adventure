/**
 * Mode B - Box Packing & Chef's Snack.
 *
 * Division with remainder: the player sets how many boxes get filled and how
 * many cookies are left for the chef, then packs. A wrong guess gets a friendly
 * hint and never costs a streak.
 */
import { useState } from 'react';
import { Package, UtensilsCrossed } from 'lucide-react';
import Cookie from './Cookie';
import NumberStepper from './NumberStepper';
import { formatPackFormula, type PackRound } from './bakeryRounds';
import { InteriorPanel } from '../common/DistrictInteriorShell';

interface BakeryPackModeProps {
  round: PackRound;
  onSolved: () => void;
}

export default function BakeryPackMode({ round, onSolved }: BakeryPackModeProps) {
  const [boxes, setBoxes] = useState(0);
  const [remainder, setRemainder] = useState(0);
  const [result, setResult] = useState<'idle' | 'wrong' | 'right'>('idle');

  const total = round.total;

  const handleSubmit = () => {
    if (result === 'right') return;
    const ok = boxes === round.boxes && remainder === round.remainder;
    setResult(ok ? 'right' : 'wrong');
    if (ok) window.setTimeout(onSolved, 1300);
  };

  return (
    <div className="flex flex-col gap-3">
      <InteriorPanel className="text-center">
        <p className="text-sm font-black leading-snug text-amber-50 sm:text-base">
          {round.prompt}
        </p>
      </InteriorPanel>

      {/* Loose cookies waiting to be packed */}
      <InteriorPanel className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="me-2 text-[11px] font-black text-amber-200/90">
          {total} עוגיות לארוז
        </span>
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className="animate-[hopSmall_.4s_ease-out_both]"
            style={{ animationDelay: `${index * 12}ms` }}
          >
            <Cookie size="packed" />
          </span>
        ))}
      </InteriorPanel>

      <div className="grid gap-3 sm:grid-cols-2">
        <NumberStepper
          icon={<Package className="h-4 w-4" />}
          label="קופסאות מלאות"
          value={boxes}
          max={Math.ceil(total / round.capacity) + 2}
          onChange={(next) => {
            setBoxes(next);
            setResult('idle');
          }}
        />
        <NumberStepper
          icon={<UtensilsCrossed className="h-4 w-4" />}
          label="עוגיות לשף 😋"
          value={remainder}
          max={round.capacity - 1}
          onChange={(next) => {
            setRemainder(next);
            setResult('idle');
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={result === 'right'}
        className={`w-full rounded-2xl px-4 py-3 text-base font-black transition ${
          result === 'right'
            ? 'bg-emerald-400 text-emerald-950 shadow-[0_5px_0_#047857]'
            : 'bg-rose-300 text-rose-950 shadow-[0_5px_0_#9f1239] hover:brightness-105 active:translate-y-[4px] active:shadow-none'
        }`}
      >
        ארוז עכשיו! 🎁
      </button>

      {result !== 'idle' && (
        <p
          className={`text-center text-sm font-black drop-shadow ${
            result === 'right' ? 'text-emerald-300' : 'text-amber-100'
          }`}
        >
          {result === 'right'
            ? `${formatPackFormula(round)} - העוגיות נארזו! 🎉`
            : `${total} עוגיות, וכל קופסה מחזיקה ${round.capacity}. נסו לחשב כמה קופסאות שלמות נכנסות.`}
        </p>
      )}
    </div>
  );
}
