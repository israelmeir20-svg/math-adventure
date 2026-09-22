/**
 * Chrome for the workshop mystery-mosaic studio.
 *
 * Separated from the board so the board's file can stay focused on the flip
 * mechanic, the strikes and the auto-advance logic.
 *
 * THE HEADER DOES NOT NAME THE PICTURE. The previous version printed the scene's
 * name - "קשת בענן" - next to the level, which gave away the entire reveal before
 * a single tile was turned. The name is the reward for solving; printing it in the
 * chrome is the one thing that makes the puzzle pointless. The header now carries
 * only "תמונת מסתורין | רמה N", and the name appears in the victory banner.
 */
import type { ReactNode } from 'react';
import { Camera, RotateCcw, X } from 'lucide-react';

interface PictureStudioShellProps {
  level: number;
  /** How many tiles are revealed so far. */
  solvedCount: number;
  total: number;
  /** Hearts remaining, 0 to `maxStrikes`. */
  strikesLeft: number;
  maxStrikes: number;
  /**
   * How much of the completion hold is left, 0 to 1 - or null when not holding.
   *
   * While a finished picture is being held, the shell says so in the header
   * ("התמונה הושלמה") instead of showing the tiles-remaining count, which would
   * otherwise sit at a frozen 9/9 and read as a stalled game.
   */
  holdFraction: number | null;
  onRestart: () => void;
  onClose: () => void;
  onOpenParent: () => void;
  children: ReactNode;
}

export default function PictureStudioShell({
  level,
  solvedCount,
  total,
  strikesLeft,
  maxStrikes,
  holdFraction,
  onRestart,
  onClose,
  onOpenParent,
  children,
}: PictureStudioShellProps) {
  const progress = total > 0 ? (solvedCount / total) * 100 : 0;
  const holding = holdFraction !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="סטודיו לפסיפס ותמונות מסתורין"
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-lg animate-[rise_.2s_ease-out] flex-col overflow-hidden rounded-t-3xl border-4 border-violet-300 bg-gradient-to-b from-slate-800 to-slate-900 shadow-2xl sm:rounded-3xl"
      >
        <header className="flex flex-col gap-2 border-b-2 border-white/10 px-3 py-3 sm:px-4">
          {/* THREE ZONES, and the title NEVER truncates.
            The title used to sit in a `min-w-0 flex-1` box with `truncate`, while
            four siblings (hearts, progress, camera, reload, close) all competed for
            the same row. Flexbox resolves that by shrinking the only child allowed
            to shrink, so on a narrow viewport the title collapsed to an ellipsis -
            hiding the name of the game and the current level, which are the two
            things the header exists to say.
            `shrink-0` on the title side, and letting the CENTRE absorb the pressure
            instead, inverts that: the piece of information that must never be cut is
            now the piece that cannot be cut. */}
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-violet-400/20 text-xl"
          >
            🧩
          </span>
          {/* Right side: the title. `whitespace-nowrap` so it stays on one line and
              `shrink-0` so no sibling can squeeze it into an ellipsis. */}
          <h2 className="shrink-0 whitespace-nowrap text-base font-black text-white sm:text-lg">
            תמונת מסתורין <span className="text-violet-300/50">|</span> רמה {level}
          </h2>

          {/* Centre: hearts and progress, given the flexible space between the two
              fixed ends. `justify-center` keeps them centred in whatever room is
              left rather than pinned to one side. */}
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <span
              className="shrink-0 text-base leading-none tracking-tight"
              aria-label={`נשארו ${strikesLeft} מתוך ${maxStrikes} ניסיונות`}
              title={`נשארו ${strikesLeft} מתוך ${maxStrikes} ניסיונות`}
            >
              {Array.from({ length: maxStrikes }, (_, i) => (
                <span key={i} aria-hidden className={i < strikesLeft ? '' : 'opacity-30'}>
                  {/* A lost heart stays a heart but dims, so the row never reflows
                      and the child can count what is left without reading. */}
                  {i < strikesLeft ? '❤️' : '💔'}
                </span>
              ))}
            </span>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-black tabular-nums ${
                holding ? 'bg-emerald-400/25 text-emerald-100' : 'bg-white/10 text-white'
              }`}
            >
              {holding ? 'הושלם! 🎉' : `${solvedCount}/${total}`}
            </span>
          </div>

          {/* Left side: compact icon buttons. `p-1.5` with an 8x8 box keeps them
              tappable without letting the row's fixed widths crowd the title. */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenParent}
              aria-label="הגדרת תמונות אישיות"
              title="הגדרת תמונות אישיות"
              className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 p-1.5 text-white/70 transition hover:bg-white/20 hover:text-white active:translate-y-[2px]"
            >
              <Camera className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onRestart}
              aria-label="תמונה חדשה"
              title="תמונה חדשה"
              className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 p-1.5 text-white transition hover:bg-white/20 active:translate-y-[2px]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="סגור"
              className="grid h-8 w-8 place-items-center rounded-xl bg-white p-1.5 text-slate-700 shadow-[0_3px_0_rgba(0,0,0,0.35)] transition active:translate-y-[2px] active:shadow-none"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Progress bar, so the reveal has a sense of approach. */}
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={solvedCount}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <span
            className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
