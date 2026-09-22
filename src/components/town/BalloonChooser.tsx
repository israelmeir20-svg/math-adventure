/**
 * The chooser shown when the hot-air balloon is tapped.
 *
 * The balloon used to open the Bonus Island directly. Now that it also carries
 * the night-sky constellation game, tapping it asks which - so neither activity
 * is lost behind the other.
 */
import { MoonStar, Palmtree, X } from 'lucide-react';

export type BalloonChoice = 'island' | 'stars';

interface BalloonChooserProps {
  /** Night sky is only offered when the balloon is flying after dark. */
  isNight: boolean;
  onPick: (choice: BalloonChoice) => void;
  onClose: () => void;
}

export default function BalloonChooser({ isNight, onPick, onClose }: BalloonChooserProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="מה נעשה בכדור הפורח?"
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md animate-[rise_.2s_ease-out] rounded-t-3xl border-4 border-indigo-300 bg-indigo-950 p-5 shadow-2xl sm:rounded-3xl"
      >
        <header className="mb-4 flex items-center gap-3">
          <span aria-hidden className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-2xl">
            🎈
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-white">הכדור הפורח</h2>
            <p className="text-xs font-bold text-indigo-200/80">בחרו פעילות</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="grid h-9 w-9 place-items-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20 active:translate-y-[2px]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => onPick('stars')}
            className="flex items-center gap-3 rounded-2xl bg-indigo-400 px-4 py-3 text-start text-indigo-950 shadow-[0_5px_0_#3730a3] transition active:translate-y-[4px] active:shadow-none"
          >
            <MoonStar className="h-6 w-6 shrink-0" />
            <span>
              <span className="block text-base font-black">משחק הכוכבים</span>
              <span className="block text-xs font-bold opacity-80">
                ספרו כוכבים בקבוצות · {isNight ? 'שמי הלילה' : 'נוף הכוכבים'}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onPick('island')}
            className="flex items-center gap-3 rounded-2xl bg-amber-300 px-4 py-3 text-start text-amber-950 shadow-[0_5px_0_#b45309] transition active:translate-y-[4px] active:shadow-none"
          >
            <Palmtree className="h-6 w-6 shrink-0" />
            <span>
              <span className="block text-base font-black">אי ההפוגה</span>
              <span className="block text-xs font-bold opacity-80">
                משחקי חשיבה ומרחב ללא חשבון
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
