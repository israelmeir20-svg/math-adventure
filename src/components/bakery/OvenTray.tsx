/**
 * The baking sheet: a rows x columns grid of cookies sitting in front of a
 * glowing brick oven. Whichever interaction the mode needs is passed in as a
 * click handler, so the same artwork serves both gentle reveal and drilling.
 */
import Cookie from './Cookie';

interface OvenTrayProps {
  rows: number;
  cols: number;
  /** How many cookies are lit up right now. */
  revealed: number;
  /** Glows gold and slides into the oven once the answer is right. */
  baking: boolean;
  disabled?: boolean;
  onCookieClick?: (index: number) => void;
}

export default function OvenTray({
  rows,
  cols,
  revealed,
  baking,
  disabled = false,
  onCookieClick,
}: OvenTrayProps) {
  const total = rows * cols;

  return (
    <div className="relative flex flex-col items-center">
      {/* Brick oven behind the sheet */}
      <div
        aria-hidden
        className="absolute -top-6 flex h-24 w-40 items-end justify-center rounded-t-3xl border-4 border-stone-700 bg-gradient-to-b from-stone-700 to-stone-900 shadow-inner"
      >
        <div
          className={`mb-2 h-10 w-28 rounded-t-2xl transition-colors duration-700 ${
            baking ? 'bg-amber-400 shadow-[0_0_36px_#f59e0b]' : 'bg-stone-950/80'
          }`}
        />
      </div>

      <div
        className={`relative mt-16 rounded-2xl border-4 p-3 shadow-xl transition-all duration-700 ${
          baking
            ? 'translate-y-3 border-amber-300 bg-gradient-to-br from-amber-200 to-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.85)]'
            : 'border-stone-500 bg-gradient-to-br from-stone-300 to-stone-400'
        }`}
      >
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: total }, (_, index) => {
            const lit = index < revealed;
            return (
              <div
                key={index}
                className={`transition duration-300 ${
                  baking
                    ? 'animate-[wobble_.45s_ease-in-out_infinite] motion-reduce:animate-none'
                    : ''
                } ${lit ? 'scale-100 opacity-100' : 'scale-75 opacity-25'}`}
              >
                <Cookie
                  size="tray"
                  disabled={!onCookieClick || disabled}
                  {...(onCookieClick && !disabled
                    ? { onClick: () => onCookieClick(index) }
                    : {})}
                  label={`עוגייה ${index + 1} במגש`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
