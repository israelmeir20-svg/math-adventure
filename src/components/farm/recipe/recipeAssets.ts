/**
 * The six chef ingredients.
 *
 * Imported rather than referenced by path string, following `nightSprites.ts`:
 * a rename or a missing file then becomes a build error instead of a broken
 * image at runtime. Six are available but only four are ever in play in a
 * round, which is what keeps the D-Pad mapping learnable.
 *
 * The picture files under `src/assets/shef/` are full-resolution photographs a
 * megabyte apiece - the folder name is a legacy misspelling and is left alone so
 * the imports here, and the art, keep matching. They are only ever asked to
 * render at 36-76px, so each import takes Vite's `?url` suffix deliberately: the
 * game draws the original file rather than paying for an emitted copy.
 */
import eggUrl from '../../../assets/shef/egg.png?url';
import milkUrl from '../../../assets/shef/milk.png?url';
import tomatoUrl from '../../../assets/shef/tomato.png?url';
import cheeseUrl from '../../../assets/shef/cheese.png?url';
import flourUrl from '../../../assets/shef/flour.png?url';
import chocolateUrl from '../../../assets/shef/chocolate.png?url';
import type { Ingredient } from './recipeTypes';

/** Every ingredient, with a `spriteUrl` the SVG can hand straight to an image. */
export const INGREDIENTS: Ingredient[] = [
  { id: 'egg', nameHebrew: 'ביצה', spriteUrl: eggUrl },
  { id: 'milk', nameHebrew: 'חלב', spriteUrl: milkUrl },
  { id: 'tomato', nameHebrew: 'עגבנייה', spriteUrl: tomatoUrl },
  { id: 'cheese', nameHebrew: 'גבינה', spriteUrl: cheeseUrl },
  { id: 'flour', nameHebrew: 'קמח', spriteUrl: flourUrl },
  { id: 'chocolate', nameHebrew: 'שוקולד', spriteUrl: chocolateUrl },
];
