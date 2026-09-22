/**
 * Shared scaffolding for a farm station's board.
 *
 * Every station needs: a live question line, the four bright answer buttons
 * with a gentle shake on a miss (never a penalty), and a side panel that shows
 * the timed-run state. Centralising the answer pad keeps the five game files
 * about their own mechanic.
 */
import { Check } from 'lucide-react';

interface AnswerPadProps {
  choices: number[];
  /** The choice currently being shaken, or null. */
  wrong: number | null;
  /** The accepted choice, or null. */
  picked: number | null;
  disabled: boolean;
  onPick: (value: number) => void;
  /** Optional suffix, e.g. "רגליים". */
  unit?: string;
  columns?: 2 | 4;
}

export function AnswerPad({
  choices,
  wrong,
  picked,
  disabled,
  onPick,
  unit,
  columns = 4,
}: AnswerPadProps) {
  return (
    <div
      className={`grid gap-2 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-4'}`}
    >
      {choices.map((value, index) => {
        const isPicked = picked === value;
        return (
          <button
            key={`${value}-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => onPick(value)}
            aria-label={`${value} ${unit ?? ''}`}
            className={`grid min-h-[3.5rem] place-items-center rounded-2xl text-2xl font-black tabular-nums transition active:translate-y-[3px] active:shadow-none ${
              isPicked
                ? 'bg-emerald-400 text-emerald-950 shadow-[0_4px_0_#047857]'
                : wrong === value
                  ? 'animate-[shake_.4s_ease-in-out] bg-rose-500 text-white shadow-[0_4px_0_#881337]'
                  : 'bg-amber-100 text-amber-950 shadow-[0_4px_0_#b45309] hover:bg-amber-50'
            } disabled:opacity-60`}
          >
            <span className="flex items-center gap-1">
              {isPicked && <Check className="h-5 w-5" strokeWidth={4} />}
              {value}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The prompt strip above the board. Large, high-contrast, RTL. */
export function QuestionBanner({
  emoji,
  children,
}: {
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center justify-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-center text-base font-black text-stone-800 shadow-[0_3px_0_rgba(0,0,0,0.15)]">
      <span aria-hidden className="text-2xl">
        {emoji}
      </span>
      <span>{children}</span>
    </p>
  );
}

/**
 * The rustic wooden plaque used for a station's live question line.
 *
 * ===================================================================
 * WHY A PLAQUE RATHER THAN THE WHITE PILL.
 * ===================================================================
 *
 * `QuestionBanner` above is a white/cream pill, and it reads as a UI element dropped
 * on top of the illustration. That is fine for the stations whose board is a flat
 * diagram, but the stations that were given a painted backdrop (the scales, the
 * feeding game) are scenes - a floating white card in the middle of a painting looks
 * pasted on, while a signboard looks like something that belongs in the farmyard.
 *
 * THE PLANKS ARE WHAT SELL IT. A single rounded rect with a wood colour reads as a
 * sticker however it is shaded; three stacked bands with slightly different tones and
 * dark seams between them read as boards. The rope loops at the top corners finish the
 * illusion by giving the sign a reason to be hanging there.
 *
 * The seams and the grain are pure CSS - no asset - so the plaque scales to any width
 * and costs nothing to load.
 */
export function WoodenPlaque({
  emoji,
  children,
  className = '',
}: {
  emoji?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative mx-auto w-full max-w-xl shrink-0 ${className}`}>
      {/* The rope, drawn behind the boards so they cover where it enters. */}
      <div aria-hidden className="pointer-events-none absolute -top-3 left-6 h-6 w-1 rounded-full bg-amber-900/70" />
      <div aria-hidden className="pointer-events-none absolute -top-3 right-6 h-6 w-1 rounded-full bg-amber-900/70" />

      <div className="relative overflow-hidden rounded-xl border-2 border-amber-950 bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900 px-3 py-2 shadow-[0_5px_0_#451a03,0_10px_18px_rgba(0,0,0,0.35)]">
        {/* The two plank seams and the top highlight that give it thickness. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-[33%] h-[2px] bg-amber-950/50" />
          <div className="absolute inset-x-0 top-[66%] h-[2px] bg-amber-950/50" />
          <div className="absolute inset-x-0 top-0 h-[3px] bg-amber-300/25" />
        </div>

        <p className="relative flex items-center justify-center gap-2 text-center text-base font-black leading-snug text-amber-50 drop-shadow-[0_2px_1px_rgba(0,0,0,0.6)] md:text-lg">
          {emoji && (
            <span aria-hidden className="text-2xl">
              {emoji}
            </span>
          )}
          <span>{children}</span>
        </p>
      </div>
    </div>
  );
}

/** Frosted board frame shared by the stations. */
export function StationBoard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border-2 border-amber-200/40 bg-amber-950/45 p-3 shadow-xl backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}
