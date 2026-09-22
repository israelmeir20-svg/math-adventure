/**
 * The answer keypad for "שעת האכלה".
 *
 * dir="ltr" IS LOAD-BEARING. The page is Hebrew (RTL), so a flex row would lay
 * the four options out right-to-left and the sequence would read "4 3 2 1"
 * instead of "1 2 3 4". Since the options are four ascending neighbours, the
 * ascending order is part of what makes them scannable, so the row is pinned to
 * LTR. The prompt above it stays RTL.
 *
 * EACH KEY HAS ITS OWN COLOUR. The pad used to be four identical mustard keys,
 * which gave the child no positional anchor - every option looked the same, so
 * the only way to tell them apart was to read the number. Four distinct hues
 * (emerald, sky, amber, rose) let a value be recognised by POSITION as well as by
 * face, which is how a child builds speed on a keypad.
 *
 * ONE TAP = ONE ANSWER. The moment a button is tapped the pad locks itself via
 * `onPick`, which the parent pairs with `isSubmittingRef` so a double-tap can
 * never score twice.
 *
 * A WRONG ANSWER IS NEVER GREEN AND NEVER TICKED. The parent used to pass the
 * tapped value as BOTH `picked` and `wrong`; because `picked` is tested first,
 * the "correct" branch always won and a miss rendered as a green button with a
 * checkmark - the opposite of the feedback it was supposed to give. The two
 * states are now MUTUALLY EXCLUSIVE and `picked` is only ever set on a hit, so
 * the green path is unreachable for a miss. The miss shows red with a ✕.
 */
import { Check, X } from 'lucide-react';

interface FeedingControlsProps {
  /** The four options. */
  options: number[];
  /** The tapped option, but ONLY when it was right. Null otherwise. */
  picked: number | null;
  /** The tapped option, but ONLY when it was wrong. Null otherwise. */
  wrong: number | null;
  /** True once a tap has been registered for this round. */
  locked: boolean;
  /** The question, e.g. "כמה גזרים נשים בכל קערה?". */
  prompt: string;
  /** The food's emoji, shown beside the question. */
  foodEmoji: string;
  onPick: (value: number) => void;
}

/**
 * The shared 3D tactile face. Each key supplies its own colours.
 *
 * A FIXED HEIGHT, NOT PADDING. The key's face is `h-14` (with a slightly taller
 * floor on small screens) rather than being grown by vertical padding. Padding
 * makes the button's height depend on its line-height and font size, so the row
 * could silently get taller than budgeted and push itself off the bottom of the
 * screen. A fixed height makes the keypad's total height a KNOWN quantity, which
 * is what lets the playfield above it take exactly the remaining space.
 *
 * The pressed state collapses the bottom border and nudges the key down by the
 * same 4px, so the key visibly travels into the board rather than just changing
 * colour - that travel is what makes it feel like a physical button.
 */
const KEY_BASE =
  'grid h-14 place-items-center rounded-2xl border-b-4 font-black tabular-nums sm:h-16 ' +
  'text-2xl md:text-3xl transition active:translate-y-1 active:border-b-0 ' +
  'disabled:opacity-60 disabled:active:translate-y-0 disabled:active:border-b-4';

/**
 * The four key faces, in ascending order.
 *
 * Amber carries DARK text (`amber-950`) while the other three carry white: the
 * amber face is far lighter, so white on it would fail contrast. That is a
 * legibility fix, not a stylistic one.
 */
const KEY_FACES = [
  'bg-emerald-500 hover:bg-emerald-400 border-emerald-700 text-white',
  'bg-sky-500 hover:bg-sky-400 border-sky-700 text-white',
  'bg-amber-400 hover:bg-amber-300 border-amber-600 text-amber-950',
  'bg-rose-500 hover:bg-rose-400 border-rose-700 text-white',
] as const;

/*
 * The right/wrong overlays replace the key's own colours entirely, so a verdict is
 * unambiguous whichever hue the key normally wears. `!important` via Tailwind's
 * `!` prefix is required because the base face classes are equally specific.
 */
const RIGHT_KEY = '!bg-emerald-400 !border-emerald-700 !text-emerald-950';
const WRONG_KEY = '!bg-rose-500 !border-rose-700 !text-white animate-[shake_.4s_ease-in-out]';

export default function FeedingControls({
  options,
  picked,
  wrong,
  locked,
  prompt,
  foodEmoji,
  onPick,
}: FeedingControlsProps) {
  return (
    /* `shrink-0` IS THE KEYPAD'S GUARANTEE. In a flex column whose total content
       exceeds the viewport, every child is a shrink candidate - so without this
       the browser is free to squash the answer row, and a squashed 3D key loses
       its travel and its label. Marking the whole control block unsrinkable makes
       the PLAYFIELD above it the only thing that gives way, which is the correct
       order: the board is decorative and can scale, the answers cannot. */
    <div className="flex shrink-0 flex-col gap-2">
      {/* The question bar. Deliberately has NO leading icon: a themed emoji here
          renders as a blurry monochrome silhouette next to the text, so the food
          emoji is placed AFTER the question instead, where it is sharp and
          actually informative.

          `my-2` breathes a little space above and below the prompt WITHOUT adding
          it to the block's own height budget in a way that could squeeze the keys
          - both it and the keypad are inside the same shrink-0 block, so the gap
          is accounted for before the playfield takes its share.

          The vertical padding is tight (`py-1.5`) and the line-height is pinned,
          because the default line box on a `text-base` Hebrew string left a band
          of dead space above and below that made the pill look like a paragraph
          rather than a label. */}
      <p className="my-2 flex flex-wrap items-center justify-center gap-2 rounded-full bg-white/95 px-4 py-1.5 text-center text-base leading-tight font-black text-stone-800 shadow-[0_3px_0_rgba(0,0,0,0.15)]">
        <span>{prompt}</span>
        <span className="text-2xl leading-none" aria-hidden>
          {foodEmoji}
        </span>
      </p>

      {/* dir="ltr" keeps the options in ascending order. `mb-1` gives the row a
          little lift off the card's bottom edge so the keys' 4px of travel on
          press is not clipped by the rounded container. */}
      <div dir="ltr" className="mb-1 grid grid-cols-4 gap-2">
        {options.map((value, index) => {
          // Mutually exclusive by construction: a value can be the right answer
          // or the wrong one, never both.
          const isRight = picked === value;
          const isWrong = !isRight && wrong === value;
          /*
           * Falls back to the last face for an unexpected fifth option, so an
           * unusual option count can never render an undefined class.
           */
          const face = KEY_FACES[index] ?? KEY_FACES[KEY_FACES.length - 1];
          return (
            <button
              key={value}
              type="button"
              disabled={locked}
              onClick={() => onPick(value)}
              aria-label={`${value} בכל קערה`}
              aria-invalid={isWrong || undefined}
              className={`${KEY_BASE} ${face} ${isRight ? RIGHT_KEY : isWrong ? WRONG_KEY : ''}`}
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
