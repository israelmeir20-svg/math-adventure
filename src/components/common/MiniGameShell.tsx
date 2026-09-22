/**
 * Shared chrome for the three visual/memory mini-games.
 *
 * They differ only in content: a dimmed backdrop, a coloured frame, a titled
 * header with an icon, an optional progress readout and a close button. Sharing
 * it keeps each game file focused on its own mechanic.
 */
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface MiniGameShellProps {
  title: string;
  subtitle: string;
  /** Emoji shown in the header bubble. */
  icon: string;
  /** Tailwind classes for the outer frame, e.g. border + gradient. */
  frame: string;
  /** Optional progress readout, e.g. "2/5". */
  progress?: string;
  /** Optional restart control, rendered beside the close button. */
  onRestart?: () => void;
  restartLabel?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function MiniGameShell({
  title,
  subtitle,
  icon,
  frame,
  progress,
  onRestart,
  restartLabel = 'סיבוב חדש',
  onClose,
  children,
}: MiniGameShellProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
        className={`flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border-4 shadow-2xl sm:rounded-3xl ${frame}`}
      >
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 text-2xl"
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-white">{title}</h2>
            <p className="text-xs font-bold text-white/70">{subtitle}</p>
          </div>

          {progress !== undefined && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-black tabular-nums text-white">
              {progress}
            </span>
          )}

          {onRestart && (
            <button
              type="button"
              onClick={onRestart}
              aria-label={restartLabel}
              className="rounded-2xl bg-white/15 px-3 py-2 text-xs font-black text-white transition hover:bg-white/25 active:translate-y-[2px]"
            >
              {restartLabel}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-white text-slate-700 shadow-[0_3px_0_rgba(0,0,0,0.35)] transition active:translate-y-[2px] active:shadow-none"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

/** A frosted hint strip used by all three games for their instruction line. */
export function GameHint({ children }: { children: ReactNode }) {
  return (
    <p className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-center text-sm font-bold text-white">
      {children}
    </p>
  );
}
