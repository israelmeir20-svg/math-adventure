/**
 * The choice cards for "סל הפיקניק".
 *
 * ONLY THE FRUITS IN THE CRATE APPEAR, and the list is sized to them rather than to
 * a fixed palette. Offering a fruit that is not in the crate would make the
 * question unanswerable by inspection - the child would be hunting for a pile that
 * does not exist - so the options are exactly the contents, 2 to 4 of them.
 *
 * `dir="ltr"` on the row is deliberate even though the page is Hebrew: the cards are
 * read left-to-right as a set of choices, and matching the numeric keypads in the
 * other stations keeps the tap targets in the same place from round to round.
 */
import { picnicFruitInfo } from './picnicFruits';
import { picnicSpriteUrl } from './picnicSprites';
import type { PicnicQuestion, PicnicRound } from './picnicTypes';

interface PicnicControlsProps {
  round: PicnicRound;
  /** The fruit the child tapped, or null. */
  picked: string | null;
  /** True when that tap was correct. */
  correct: boolean;
  /** True once the round is answered - the cards stop responding. */
  answered: boolean;
  /** True while the lid is shut and the child may choose. */
  live: boolean;
  onPick: (fruit: string) => void;
}

/**
 * How many of a fruit the crate held, or null when counts are not being shown.
 *
 * THE COUNT GOES ON THE BUTTON, NOT ONLY ON THE CRATE. The crate's own badges sit on
 * the fruit, so a child reading them there compares piles by position and can lose
 * track of which pile they picked. Putting the number under the card they tapped ties
 * the count to the choice itself - "the one I said held the most held 7".
 */
function countOn(round: PicnicRound, fruit: string, show: boolean): number | null {
  if (!show) return null;
  return round.piles.find((pile) => pile.fruit === fruit)?.count ?? null;
}

/** The banner copy for each question direction. */
const PROMPT: Record<PicnicQuestion, string> = {
  most: 'איזה פרי הופיע הכי הרבה? 🧺',
  least: 'איזה פרי הופיע הכי מעט? 🔍',
};

export default function PicnicControls({
  round,
  picked,
  correct,
  answered,
  live,
  onPick,
}: PicnicControlsProps) {
  // The winning pile, so the correct card can be outlined green even on a miss. Derived
  // once rather than per card.
  const topCount = Math.max(...round.piles.map((pile) => pile.count));

  return (
    <div className="flex flex-col gap-3" dir="rtl">
      {/* The question banner. Fixed height, so switching between the two prompts
          cannot nudge the cards down and move the tap targets mid-round. */}
      <p className="min-h-[52px] rounded-2xl border-4 border-amber-900/70 bg-gradient-to-b from-amber-50 to-amber-100 px-4 py-2 text-center text-xl font-black text-amber-950 shadow-[0_4px_0_rgba(120,53,15,0.45)]">
        {PROMPT[round.question]}
      </p>

      <div dir="ltr" className="flex items-stretch justify-center gap-3">
        {round.choices.map((fruit) => {
          const info = picnicFruitInfo(fruit);
          const sprite = picnicSpriteUrl(fruit);
          const count = countOn(round, fruit, answered);
          const isPicked = picked === fruit;
          // A WRONG PICK IS NEVER GREEN. Only the winning card earns the tick, and
          // only when it was actually the card that was tapped - so the feedback can
          // never contradict the banner below it.
          const state = !answered
            ? 'idle'
            : isPicked && correct
              ? 'right'
              : isPicked
                ? 'wrong'
                : 'muted';

          // A WRONG CARD IS TINTED RED RATHER THAN LEFT IN ITS FRUIT COLOUR. The card's
          // own colour is a fruit tint (lime for pear, rose for strawberry), so a red
          // outline alone would fight it; overriding the fill is what makes "that was
          // the wrong one" readable at a glance.
          const skin = state === 'wrong' ? 'bg-gradient-to-b from-rose-500 to-rose-700' : info.tint;
          // The winner is outlined green once the round is answered, picked or not, so a
          // miss still shows the child which pile actually held the most.
          const winner = answered && count !== null && count === topCount;
          const border =
            state === 'wrong'
              ? 'border-red-950 ring-4 ring-red-300'
              : winner
                ? 'border-emerald-900 ring-4 ring-emerald-300'
                : 'border-black/30';

          return (
            <button
              key={fruit}
              type="button"
              onClick={() => onPick(fruit)}
              disabled={!live}
              aria-label={info.label}
              className={`flex min-w-[104px] flex-col items-center gap-1 rounded-2xl border-b-4 px-3 py-2 text-white shadow-lg transition active:translate-y-[3px] active:border-b-0 active:shadow-none disabled:cursor-not-allowed ${skin} ${border} ${
                state === 'wrong' ? 'animate-[shake_.4s_ease-in-out]' : ''
              } ${state === 'muted' ? 'opacity-40 saturate-50' : ''}`}
            >
              {sprite ? (
                <img src={sprite} alt="" className="mx-auto h-10 w-10 object-contain drop-shadow" />
              ) : (
                <span className="text-4xl leading-none drop-shadow">{info.emoji}</span>
              )}
              <span className="text-[13px] font-black leading-none">{info.label}</span>
              <span className="h-5 text-[17px] font-black leading-none">
                {state === 'right' ? (
                  '✓'
                ) : state === 'wrong' ? (
                  '✕'
                ) : (
                  // The count rides on the button, so the child ties the number to the
                  // choice they made rather than to a badge somewhere on the basket.
                  <span className="text-[15px] tabular-nums">{count ?? ''}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
