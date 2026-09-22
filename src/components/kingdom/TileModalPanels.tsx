/**
 * Body panel for the tile inspection drawer: the unlock challenge on a locked tile.
 *
 * ================================================================================================
 * THIS FILE IS DOWN TO ONE PANEL, AND THAT IS THE RESULT OF A DELIBERATE REMOVAL
 * ================================================================================================
 *
 * It used to export a second `UnlockedActions` panel whose entire content was the button
 * "פתחו את כרטיס המשחק". That button opened the district, whose modal opens on `GameLaunchModal` -
 * the screen carrying the banner, the task, Tamar's tip and the level chips. So the panel was a
 * button whose only effect was to reveal a screen that says more than it did, on a tile the child
 * had already unlocked.
 *
 * Unlocked tiles now open their district straight from the map click, so the panel had no remaining
 * caller and was deleted rather than left exported for nothing.
 *
 * WHAT SURVIVES IS THE HALF THAT CANNOT BE REPLACED. `LockedPanel` is the only surface in the app
 * that resolves a locked tile: the cookie cost, the problem text, the 50/50 lifeline and the button
 * into the solver. There is nowhere else for it to live, which is why the drawer itself was kept
 * while this panel was not.
 *
 * THE LEVEL SELECTOR IS NOT COMING BACK HERE. It once rendered three chips derived from `tile.level`
 * - a field nothing writes - so it showed every level open and announced "רמה 3 נבחרה" while the
 * launch card correctly showed level 1 behind two padlocks. Two selectors reading two sources
 * disagreed on screen at the same time; there is now exactly one, and it is the launch card.
 */
import { Lock } from 'lucide-react';

export function LockedPanel({
  cost,
  affordable,
  problemText,
  lifelines,
  onSolve,
  onUseLifeline,
}: {
  cost: number;
  affordable: boolean;
  problemText: string | null;
  lifelines: number;
  onSolve: () => void;
  onUseLifeline: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-white/70 p-3">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-black text-amber-700">
          <Lock className="h-3.5 w-3.5" /> אתגר הפתיחה
        </p>
        <p className="text-base font-bold text-stone-700">
          {problemText ?? 'לחצו על הכפתור הירוק כדי להתחיל לפתור.'}
        </p>
      </div>

      <p className="text-sm font-bold text-stone-600">
        עלות פתיחה: <span className="text-amber-800">{cost} 🍪</span>{' '}
        {!affordable && <span className="text-rose-600">(אין מספיק עוגיות)</span>}
      </p>

      <button
        type="button"
        disabled={lifelines <= 0}
        onClick={onUseLifeline}
        className="rounded-2xl bg-violet-200 px-4 py-2.5 text-sm font-black text-violet-900 shadow-[0_4px_0_#6d28d9] transition active:translate-y-[3px] active:shadow-none disabled:opacity-40"
      >
        50/50 ({lifelines})
      </button>

      <button
        type="button"
        onClick={onSolve}
        className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-base font-black text-emerald-950 shadow-[0_5px_0_#047857] transition active:translate-y-[4px] active:shadow-none"
      >
        פתור כדי לפתוח 🔓
      </button>
    </div>
  );
}
