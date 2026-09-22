/**
 * The fruit palette for "סל הפיקניק".
 *
 * NO IMAGE IMPORTS HERE, DELIBERATELY. The generator and four verification scripts
 * import this module in plain Node, where a `.png` import is not resolvable. The
 * sprite urls live in `picnicSprites.ts`, which only the rendering layer imports -
 * so the puzzle logic can still be tested without a bundler.
 *
 * THE TINTS ARE PICKED FOR CONTRAST, NOT FOR REALISM. The whole point of the
 * game is telling species apart at a glance, so each fruit gets a card background
 * that is clearly distinct from every other, and every one of them is dark enough
 * for white text to sit on top (the labels and counts are white).
 */
import type { PicnicFruit } from './picnicTypes';

export interface PicnicFruitInfo {
  /** Hebrew singular, used in the reveal ("היה הכי הרבה..."). */
  label: string;
  /** The glyph drawn in the crate. */
  emoji: string;
  /** Tailwind gradient for the choice card and the reveal badge. */
  tint: string;
}

export const PICNIC_FRUITS: Record<PicnicFruit, PicnicFruitInfo> = {
  strawberry: {
    label: 'תות',
    emoji: '🍓',
    tint: 'from-rose-500 to-rose-700',
  },
  apple: {
    label: 'תפוח',
    emoji: '🍎',
    tint: 'from-red-500 to-red-700',
  },
  banana: {
    label: 'בננה',
    emoji: '🍌',
    tint: 'from-amber-400 to-amber-600',
  },
  pear: {
    label: 'אגס',
    emoji: '🍐',
    tint: 'from-lime-500 to-green-700',
  },
  grapes: {
    label: 'ענבים',
    emoji: '🍇',
    tint: 'from-violet-500 to-purple-700',
  },
};

/** Every species, in a stable order so generation is reproducible. */
export const ALL_PICNIC_FRUITS: PicnicFruit[] = [
  'strawberry',
  'apple',
  'banana',
  'pear',
  'grapes',
];

/**
 * Info for a species, with a fallback that can never throw.
 *
 * Every species in `ALL_PICNIC_FRUITS` is described above, so this returns the
 * real entry in normal play. The fallback exists because a lookup miss would
 * otherwise be a hard crash inside puzzle generation, which freezes the round
 * instead of degrading it - and a slightly odd label is a far better outcome
 * than a dead board.
 */
export function picnicFruitInfo(fruit: string): PicnicFruitInfo {
  return (
    PICNIC_FRUITS[fruit as PicnicFruit] ?? {
      label: fruit,
      emoji: '❓',
      tint: 'from-stone-500 to-stone-700',
    }
  );
}
