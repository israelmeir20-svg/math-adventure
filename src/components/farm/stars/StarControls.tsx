/**
 * The answer pad for "משחק הכוכבים".
 *
 * READ LEFT TO RIGHT, even though the page is Hebrew. The buttons are a numbered sequence -
 * 1 through 4 - and the number keys select them by position, so the on-screen order and the
 * key order have to agree. `dir="ltr"` on the row is what makes key 1 the leftmost button;
 * under the page's inherited RTL it would be the rightmost, and the shortcut would be
 * backwards. This matches the numeric keypads in the other farm stations.
 *
 * THE SHORTCUT IS DELIBERATELY UNLABELLED. Each button shows only the number the child is
 * choosing; the "press 1-4" hint belongs on the start overlay, not on the answer itself,
 * where a small digit in the corner reads as part of the answer. The keys still work.
 *
 * THE SUBMIT LOCK IS SET SYNCHRONOUSLY, IN THE HANDLER. Both the tap and the key listener call
 * the same `submit`, which checks the lock and sets it BEFORE doing anything else. React state
 * would be too slow: a held-down key fires repeats faster than a re-render, so a state-based
 * guard lets several presses through in the same tick. A ref flips immediately and stays
 * flipped until the next round resets it.
 *
 * THE KEY LISTENER IS BOUND ONLY WHILE THE ROUND IS LIVE. It is attached in an effect that
 * depends on `live`, so it exists exactly during the window where a choice is meaningful and is
 * removed on answer, on unmount, and between rounds. A listener that outlived the round would
 * let a child answer the NEXT round with a keypress they made during the last one.
 */
import { useCallback, useEffect, useRef } from 'react';

/** The physical key for each slot, so the badge and the handler cannot disagree. */
const KEYS = ['1', '2', '3', '4'] as const;

interface StarControlsProps {
  options: number[];
  /** The number the child tapped, or null. */
  picked: number | null;
  /** True when that tap was correct. */
  correct: boolean;
  /** True once the round is answered - the pad stops responding. */
  answered: boolean;
  /** True while the sky is up and the child may choose. */
  live: boolean;
  onPick: (value: number) => void;
}

export default function StarControls({
  options,
  picked,
  correct,
  answered,
  live,
  onPick,
}: StarControlsProps) {
  // THE LOCK. A ref, not state, so a fast key repeat cannot slip past a pending render.
  const lockedRef = useRef(false);

  // RELEASED WHEN THE ROUND CHANGES, keyed on the options array identity, which the round hook
  // replaces on every deal. Without this the pad would stay locked forever after the first tap.
  useEffect(() => {
    lockedRef.current = false;
  }, [options]);

  const submit = useCallback(
    (value: number) => {
      if (lockedRef.current || !live) return;
      lockedRef.current = true;
      onPick(value);
    },
    [live, onPick],
  );

  useEffect(() => {
    if (!live) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      // Modifier chords belong to the browser, not the game.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const slot = KEYS.indexOf(event.key as (typeof KEYS)[number]);
      if (slot === -1) return;
      const value = options[slot];
      if (value === undefined) return;
      event.preventDefault();
      submit(value);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [live, options, submit]);

  return (
    <div dir="ltr" className="flex items-stretch justify-center gap-3">
      {options.map((option) => {
        const isPicked = picked === option;
        // A WRONG PICK IS NEVER GREEN. Only the button the child actually tapped can be marked
        // wrong, and only a correct tap earns the tick - so the colour can never contradict
        // which number the child chose.
        const state = !answered ? 'idle' : isPicked && correct ? 'right' : isPicked ? 'wrong' : 'muted';

        const skin =
          state === 'wrong'
            ? 'bg-gradient-to-b from-rose-500 to-rose-700 text-white'
            : state === 'right'
              ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-emerald-950'
              : 'bg-gradient-to-b from-indigo-400 to-indigo-600 text-white';

        return (
          <button
            key={option}
            type="button"
            onClick={() => submit(option)}
            disabled={!live}
            aria-label={`${option}`}
            className={`relative min-w-[84px] rounded-2xl border-b-4 border-indigo-950 px-3 pb-2 pt-3 text-3xl font-black tabular-nums shadow-lg transition active:translate-y-[3px] active:border-b-0 active:shadow-none disabled:cursor-not-allowed ${skin} ${
              state === 'wrong' ? 'animate-[shake_.4s_ease-in-out]' : ''
            }`}
          >
            {option}

            {/* The outcome mark, in the top corner, so it never collides with the
                number itself. */}
            {(state === 'right' || state === 'wrong') && (
              <span className="absolute right-1.5 top-1 text-[15px] font-black">
                {state === 'right' ? '✓' : '✕'}
              </span>
            )}

            {state === 'wrong' && (
              <span className="absolute inset-x-0 -bottom-6 text-center text-[13px] font-black text-rose-300">
                אופס!
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
