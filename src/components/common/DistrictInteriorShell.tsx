/**
 * Immersive district stage: a full-bleed interior illustration with a frosted
 * vignette so gameplay sits legibly on top of the artwork.
 *
 * Districts pass their own interior art, title and icon; the shell owns the
 * frame, the vignette, the wooden title sign and the close button.
 */
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface DistrictInteriorShellProps {
  /** Interior illustration imported from `src/assets/interiors`. */
  bgImage: string;
  title: string;
  /** Emoji shown on the rustic title sign. */
  icon: string;
  onClose: () => void;
  children: ReactNode;
  /**
   * Hides the wooden title sign and its close button.
   *
   * For districts whose game draws its own slim HUD with the level, the score and a
   * single exit control, the shell's sign is a SECOND title and a SECOND ✕ stacked
   * directly above the first - duplicated chrome the brief asks to remove. The game
   * owns the whole top of the panel in that case, and the shell becomes a pure frame.
   */
  hideTitleBar?: boolean;
  /** Short supporting line under the title (e.g. the skill being practised). */
  subtitle?: string;
}

export default function DistrictInteriorShell({
  bgImage,
  title,
  icon,
  onClose,
  children,
  hideTitleBar = false,
  subtitle,
}: DistrictInteriorShellProps) {
  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center bg-stone-900/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
        className="relative flex h-[92vh] w-[94vw] max-w-4xl animate-[rise_.2s_ease-out] flex-col overflow-hidden rounded-t-3xl border-4 border-amber-300/80 shadow-2xl sm:h-[85vh] sm:max-h-[720px] sm:rounded-3xl"
      >
        {/* Interior illustration */}
        <img
          src={bgImage}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Warm vignette keeps text readable over any part of the artwork. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-amber-950/55 via-stone-950/45 to-amber-950/70"
        />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col p-2 sm:p-3">
          {!hideTitleBar && (
            /* Rustic wooden title sign. The subtitle is dropped because the game
               below now carries its own title in its header strip, and printing
               "פיצריית השברים" twice in two rows was pure duplicated chrome. */
            <header className="mb-2 flex items-start gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border-2 border-amber-700/70 bg-gradient-to-b from-amber-700 to-amber-900 px-3 py-1.5 shadow-[0_4px_0_rgba(0,0,0,0.35)]">
                <span aria-hidden className="text-xl drop-shadow sm:text-2xl">
                  {icon}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black text-amber-50 drop-shadow sm:text-lg">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="truncate text-[11px] font-bold text-amber-200/90">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="סגור"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border-2 border-amber-600 bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950 shadow-[0_4px_0_#78350f] transition hover:brightness-110 active:translate-y-[3px] active:shadow-none"
              >
                <X className="h-5 w-5" strokeWidth={3} />
              </button>
            </header>
          )}

          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Frosted panel for gameplay that should look like it rests on the counter.
 * Exported here so every district gets the identical legibility treatment.
 */
export function InteriorPanel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-amber-200/40 bg-amber-950/40 p-2 text-white shadow-xl backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}
