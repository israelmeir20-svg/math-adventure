/**
 * Mode A - Baking Tray Grid.
 *
 * Multiplication as area: tap the cookies on the sheet to make the rows and
 * columns physical, then choose the total. A correct answer sizzles the tray
 * and slides it into the glowing oven before the round advances.
 */
import { useState } from 'react';
import { Flame } from 'lucide-react';
import OvenTray from './OvenTray';
import { formatTrayFormula, type TrayRound } from './bakeryRounds';
import { InteriorPanel } from '../common/DistrictInteriorShell';

interface BakeryTrayModeProps {
  round: TrayRound;
  /** Fired once the tray has finished baking. */
  onSolved: () => void;
}

export default function BakeryTrayMode({ round, onSolved }: BakeryTrayModeProps) {
  const [revealed, setRevealed] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [baking, setBaking] = useState(false);
  const isRight = picked !== null && picked === round.total;
  const total = round.rows * round.cols;

  const handleCookie = (index: number) => {
    if (baking) return;
    setRevealed((current) => (index < current ? current : index + 1));
  };

  const handlePick = (value: number) => {
    if (baking || picked !== null) return;
    setPicked(value);
    if (value !== round.total) return;

    // Correct: sizzle, then slide the tray into the oven.
    window.setTimeout(() => setBaking(true), 420);
    window.setTimeout(() => onSolved(), 1500);
  };

  return (
    <div className="flex flex-col gap-3">
      <InteriorPanel className="text-center">
        <p className="text-sm font-black leading-snug text-amber-50 sm:text-base">
          {round.prompt}
        </p>
        <p className="mt-1 text-[11px] font-bold text-amber-200/90">
          לחצו על העוגיות כדי לספור שורה-שורה: {revealed} מתוך {total}
        </p>
      </InteriorPanel>

      <div className="flex justify-center py-2">
        <OvenTray
          rows={round.rows}
          cols={round.cols}
          revealed={revealed}
          baking={baking}
          disabled={picked !== null && picked !== round.total}
          onCookieClick={handleCookie}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {round.options.map((option) => {
          const chosen = picked === option.value;
          const wrongPick = chosen && !option.correct;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handlePick(option.value)}
              disabled={baking}
              className={`rounded-2xl px-3 py-3 text-xl font-black tabular-nums transition ${
                chosen && option.correct
                  ? 'bg-emerald-400 text-emerald-950 shadow-[0_5px_0_#047857]'
                  : wrongPick
                    ? 'animate-[wobble_.45s_ease-in-out] bg-rose-300 text-rose-950 shadow-[0_5px_0_#9f1239]'
                    : 'bg-amber-100 text-amber-900 shadow-[0_5px_0_#b45309] hover:brightness-105 active:translate-y-[4px] active:shadow-none'
              }`}
            >
              {option.value}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <p
          className={`text-center text-sm font-black drop-shadow ${
            isRight ? 'text-emerald-300' : 'text-amber-100'
          }`}
        >
          {isRight
            ? `${formatTrayFormula(round)} - המגש נכנס לתנור! 🔥`
            : picked === round.rows + round.cols
              ? 'כמעט! חיבור מחבר את השורות, אבל כאן צריך לכפול אותן.'
              : `נסו לספור שורה-שורה: ${round.rows} שורות של ${round.cols}. אין קנס, ממשיכים! 💪`}
        </p>
      )}

      {isRight && (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs font-bold text-amber-200/90">
          <Flame className="h-4 w-4" /> אופים בתנור הלבנים...
        </p>
      )}
    </div>
  );
}
