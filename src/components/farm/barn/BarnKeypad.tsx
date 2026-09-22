/**
 * The six-key answer pad for "מי באסם?".
 *
 * ===================================================================
 * SIX KEYS, NOT TEN.
 * ===================================================================
 *
 * The rounds ask how many animals are in the barn, and the answer is always
 * between 1 and 6. The old pad was a full telephone keypad (0-9) which asked the
 * child to search nine irrelevant keys for one of six possible answers, and cost
 * two extra rows of vertical space that the stage needed. Six keys is both the
 * smaller board and the faster one to read.
 *
 * The pad stays `dir="ltr"` so the digits run in the familiar numeric order even
 * though the surrounding app is RTL. Only the number row flips; the Hebrew
 * prompt above it stays RTL.
 *
 * ===================================================================
 * WHY THE KEYS ARE COLOUR-CODED RATHER THAN UNIFORM.
 * ===================================================================
 *
 * Six identical amber blocks give a child nothing to aim at - every key looks
 * like every other key, so each round starts with a fresh scan of the whole pad.
 * A distinct colour per digit makes the position of a number memorable, which
 * matters most for the digits they reach for often. The colours are also chosen
 * to differ in LIGHTNESS as well as hue (the amber key is dark-on-light while the
 * rest are light-on-dark), so the pad is still readable to a child who cannot
 * separate red from green.
 *
 * Every key keeps the same tactile treatment: a solid bottom border that the
 * button collapses into on press, so the key visibly depresses like a real
 * button rather than just changing shade.
 */
interface BarnKeypadProps {
  /** False once the shutters are down and the child may answer. */
  locked?: boolean;
  /** True while a wrong answer is being rattled away. */
  shake?: boolean;
  /** The question for this round, e.g. "כמה כבשים נשארו באסם?". */
  prompt: string;
  onPick: (digit: number) => void;
}

/**
 * One colour per digit, spread around the wheel so no two neighbours share a hue.
 *
 * Written out rather than generated: these are design decisions, and a computed
 * palette would silently change the board the next time someone touched it.
 * Each entry carries its own bottom-border shade, which is what gives the key its
 * physical depth.
 */
const KEYS = [
  { digit: 1, face: 'bg-emerald-500 border-emerald-700 text-white' },
  { digit: 2, face: 'bg-sky-500 border-sky-700 text-white' },
  { digit: 3, face: 'bg-amber-400 border-amber-600 text-amber-950' },
  { digit: 4, face: 'bg-indigo-500 border-indigo-700 text-white' },
  { digit: 5, face: 'bg-rose-500 border-rose-700 text-white' },
  { digit: 6, face: 'bg-teal-500 border-teal-700 text-white' },
] as const;

/** Shared key geometry: the 3D press, the type scale and the disabled state. */
const KEY_BASE =
  'select-none rounded-2xl border-b-4 font-black text-2xl shadow-md ' +
  'transition-all duration-75 md:text-3xl ' +
  'active:border-b-0 active:translate-y-1 active:shadow-none ' +
  'disabled:opacity-45 disabled:active:translate-y-0 disabled:active:border-b-4';

export default function BarnKeypad({
  locked = false,
  shake = false,
  prompt,
  onPick,
}: BarnKeypadProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* THE QUESTION BANNER.
          Compact padding so it costs as little vertical space as possible, but
          the TEXT is larger than the old board's - the question is the one thing
          the child must read every round, so it gets the space rather than the
          furniture around it. White on a dark translucent panel with a drop
          shadow gives high contrast against the sky behind the stage. */}
      <div
        className={`rounded-xl bg-stone-900/80 px-3 py-1.5 text-center shadow-lg backdrop-blur-sm ${
          shake ? 'animate-[shake_.4s_ease-in-out]' : ''
        }`}
      >
        <p
          className={`text-lg font-black leading-tight text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)] md:text-xl ${
            shake ? 'text-rose-200' : ''
          }`}
        >
          {shake ? 'אופס, לא קרה כלום! נסו שוב' : prompt}
        </p>
      </div>

      {/* dir="ltr" pins the pad to standard numeric order: 1-2-3 / 4-5-6.
          Three columns (two rows) rather than six in a line: six across would
          make each key narrow on a phone, and the pad would no longer line up
          with the banner above it. The full-width grid keeps every key a
          comfortable target and aligns the pad with the question. */}
      <div dir="ltr" className="grid grid-cols-3 gap-2">
        {KEYS.map(({ digit, face }) => (
          <button
            key={digit}
            type="button"
            disabled={locked}
            onClick={() => onPick(digit)}
            aria-label={`ענה ${digit}`}
            className={`${KEY_BASE} ${face} min-h-[3rem] md:min-h-[3.5rem]`}
          >
            {digit}
          </button>
        ))}
      </div>
    </div>
  );
}
