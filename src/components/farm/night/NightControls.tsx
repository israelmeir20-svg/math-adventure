/**
 * The answer keypad for "האסם בלילה".
 *
 * dir="ltr" IS LOAD-BEARING. The page is Hebrew (RTL), so a flex row would lay
 * the four options out right-to-left and the sequence would read backwards. The
 * prompt above stays RTL, because that is a Hebrew sentence.
 *
 * A WRONG ANSWER IS NEVER GREEN AND NEVER TICKED. The two states are mutually
 * exclusive by construction - `right` and `wrong` can never both match a button
 * - so a miss shows red with an ✕ and a hit shows green with a ✓.
 */
import { Check, X } from 'lucide-react';

interface NightControlsProps {
  /** The four shuffled options. */
  options: number[];
  /** The tapped option, but ONLY when it was right. */
  right: number | null;
  /** The tapped option, but ONLY when it was wrong. */
  wrong: number | null;
  /** True once a tap has been registered for this round. */
  locked: boolean;
  /** The question, e.g. "נספרו 8 עיניים זוהרות. כמה חיות באסם?". */
  question: string;
  onPick: (value: number) => void;
}

/** Chunky wooden key, matching the rest of the farm's keypads. */
const KEY =
  'grid min-h-[3.5rem] place-items-center rounded-2xl text-2xl font-black tabular-nums ' +
  'border-b-4 border-amber-950 bg-gradient-to-b from-amber-300 to-amber-600 text-amber-950 ' +
  'shadow-[0_5px_0_#78350f] transition active:translate-y-[4px] active:shadow-none ' +
  'disabled:opacity-55 disabled:active:translate-y-0';

const RIGHT_KEY = '!bg-none !bg-emerald-400 !text-emerald-950 !shadow-[0_5px_0_#047857]';
const WRONG_KEY =
  'animate-[shake_.4s_ease-in-out] !bg-none !bg-rose-500 !text-white !shadow-[0_5px_0_#881337]';

export default function NightControls({
  options,
  right,
  wrong,
  locked,
  question,
  onPick,
}: NightControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* The question bar. The 👀 emoji is placed AFTER the text: a leading icon
          renders as a blurry silhouette against the dark theme. */}
      <p
        dir="rtl"
        className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-indigo-950/90 px-3 py-2 text-center text-base font-black text-amber-50 ring-2 ring-indigo-800/60"
      >
        <span>{question}</span>
        <span className="text-2xl" aria-hidden>
          👀
        </span>
      </p>

      {/* dir="ltr" keeps the options in the order they were generated. */}
      <div dir="ltr" className="grid grid-cols-4 gap-2">
        {options.map((value) => {
          const isRight = right === value;
          const isWrong = !isRight && wrong === value;
          return (
            <button
              key={value}
              type="button"
              disabled={locked}
              onClick={() => onPick(value)}
              aria-label={`${value}`}
              aria-invalid={isWrong || undefined}
              className={`${KEY} ${isRight ? RIGHT_KEY : isWrong ? WRONG_KEY : ''}`}
            >
              <span className="flex items-center gap-1">
                {isRight && <Check className="h-5 w-5" strokeWidth={4} />}
                {isWrong && <X className="h-5 w-5" strokeWidth={4} />}
                {value}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
