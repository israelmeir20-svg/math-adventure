/**
 * The picture pool for "תמונת מסתורין".
 *
 * ===================================================================
 * WHY THIS FILE EXISTS AT ALL.
 * ===================================================================
 *
 * The studio used to hide one of exactly THREE hand-authored SVG scenes, drawn at
 * random. That is the whole bug the child was reporting as "it is always the same
 * picture": with three options and no memory of what was shown, a repeat lands every
 * third round on average, and two repeats in a row happen often enough to read as a
 * stuck game - especially when a restart re-rolls the same small set.
 *
 * The fix has two halves, and BOTH are needed:
 *
 *   1. A much larger pool, so there is something to rotate through. This file builds
 *      it from a folder the artist can drop files into.
 *
 *   2. A draw that CANNOT repeat the picture on screen (see `stepAfter`). This is the
 *      part that matters: random selection from a large pool still repeats, because a
 *      uniform draw has no memory of what it just showed. Excluding the current picture
 *      from the draw is what makes "it changes every time" a guarantee rather than a
 *      probability.
 *
 * ===================================================================
 * HOW THE FOLDER IS READ.
 * ===================================================================
 *
 * `import.meta.glob` with `eager: true` is resolved by Vite AT BUILD TIME: the paths
 * are statically discovered and bundled, so dropping a new file into
 * `src/assets/mystery-images/` makes it appear with no code change - which is the
 * point of the requirement. A runtime directory listing is not possible in a browser
 * bundle and would 404 on a server that does not index directories.
 *
 * WHY `query: '?url'`. The board draws the picture as an `<img src>`, so all it needs
 * is the URL. The plain eager glob gives the resolved asset URL for these extensions,
 * and `?url` states that intent explicitly and keeps the shape stable whether or not a
 * future Vite version inlines small files as data URLs.
 */
import { MYSTERY_SCENES, sceneToDataUrl } from './mysteryScenes';

/** Every image dropped into this folder is picked up automatically. */
export const MYSTERY_IMAGE_DIR = 'src/assets/mystery-images';

/**
 * The folder, bundled at build time.
 *
 * `as Record<string, string>` rather than a typed module shape: with `?url` and
 * `import: 'default'` the module value IS the URL string, and asserting that here keeps
 * the mapping below to one line instead of a per-entry unwrap.
 */
const folderModules = import.meta.glob('/src/assets/mystery-images/*.{jpg,jpeg,png,webp,gif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/**
 * The stock illustrations, used when the folder is empty.
 *
 * These live in `public/` and are therefore referenced by absolute path rather than
 * imported - `public` is copied verbatim, so there is nothing for the bundler to
 * resolve. They are the same village artwork the sticker album uses, which keeps the
 * kingdom visually coherent: a child who has collected the bakery sticker should
 * recognise the bakery when it turns up as a mystery.
 *
 * ================================================================================================
 * EVERY PATH HERE IS VERIFIED AGAINST `public./stickers/`, AND FIVE OF THEM WERE NOT
 * ================================================================================================
 *
 * This list previously pointed at a `public./stickers/workshop/` folder that DOES NOT EXIST:
 *
 *     ./stickers/workshop/carpentry_workshop.jpg     <- 404
 *     ./stickers/workshop/oil_press.jpeg             <- 404
 *     ./stickers/workshop/bakery.jpeg                <- 404
 *     ./stickers/workshop/observatory.jpg            <- 404
 *     ./stickers/workshop/race.jpeg                  <- 404
 *
 * FIVE OF THE TEN STOCK ENTRIES WERE DEAD, which is the "broken images in the workshop" report.
 * The failure mode is worth spelling out, because it is invisible to every check the project runs:
 *
 *   - `import.meta.glob` CANNOT SEE THESE. The glob only covers `src/assets/mystery-images/`, and
 *     these are absolute `/public` paths - so the build never touches them and never warns.
 *   - TypeScript CANNOT SEE THEM. They are strings, and every string is a valid string.
 *   - The `onError` handler that would have caught them did not exist on the board's `<img>`.
 *
 * So a dead entry sat in the rotation and rendered as a broken image inside a sealed board, on a
 * picture the child had just solved every equation to reveal. Roughly one in four gallery draws
 * (5 of 19) landed on nothing.
 *
 * THE REPLACEMENTS ARE THE SAME ARTWORK FROM THE FOLDER THAT ACTUALLY EXISTS - the workshop imagery
 * lives under other sticker categories, so the names were simply wrong rather than the files missing.
 * `oil_press.jpeg` and `bakery.jpeg` were moved to `school/lunchbox.jpg` and `landscape/landscape.jpg`
 * respectively: the first because there is no oil-press art anywhere in `public/`, and the second
 * because `landscape.jpg` was already the village's establishing shot and belongs in the rotation.
 *
 * THE RULE FOR ADDING AN ENTRY IS NOW: the path must correspond to a file under `public./stickers/`,
 * spelled EXACTLY (the extensions genuinely differ - `.jpeg`, `.jpg` and `.gif` are all in use, and
 * getting one wrong is a 404). `verify-gallery.mjs` checks every path in this file against disk.
 */
interface FallbackImage {
  url: string;
  title: string;
}

export const FALLBACK_IMAGES: FallbackImage[] = [
  { url: './stickers/landscape/landscape.jpg', title: 'טחנת הרוח והשדות' },
  { url: './stickers/school/laboratory.gif', title: 'המעבדה של בית הספר' },
  { url: './stickers/school/lunchbox.jpg', title: 'ארוחת הצהריים' },
  { url: './stickers/school/easel.jpg', title: 'לוח הציור בכיתה' },
  { url: './stickers/school/garden.jpg', title: 'חצר המשחקים' },
  { url: './stickers/school/class.jpg', title: 'הכיתה של הכפר' },
  { url: './stickers/heroes/chef.jpg', title: 'השף של הכפר' },
  { url: './stickers/heroes/doctor.jpg', title: 'הרופאה של הכפר' },
  { url: './stickers/heroes/driver.jpg', title: 'הנהג של הכפר' },
  { url: './stickers/animals/pony.gif', title: 'הפוני באורווה' },
  { url: './stickers/animals/sheep.jpg', title: 'הכבשה במרעה' },
  { url: './stickers/animals/swan.jpg', title: 'הברבור באגם' },
  { url: './stickers/family/father.jpeg', title: 'אבא במשק' },
  { url: './stickers/family/grandfather.jpeg', title: 'סבא ליד האח' },
  { url: './stickers/birthday/birthday.jpg', title: 'יום ההולדת של הכפר' },
  { url: './stickers/achievements/the_tag_sequence.jpg', title: 'משחק התופסת' },
];

/**
 * Turns a bundled module path into a readable picture title.
 *
 * `carpentry_workshop-B3x9f2.jpg` becomes "Carpentry workshop". Vite appends a content
 * hash to bundled asset file names, and the raw name would otherwise be announced in the
 * victory banner as "... גילית: oil_press-B3x9f2" - the same class of noise the parent
 * photo titles already strip in `cleanTitle`.
 */
export function titleFromPath(modulePath: string): string {
  const file = modulePath.split('/').pop() ?? modulePath;
  const withoutHash = file.replace(/-[A-Za-z0-9_]{6,}(?=\.[^.]+$)/, '');
  const withoutExtension = withoutHash.replace(/\.[^.]+$/, '');
  const spaced = withoutExtension.replace(/[_-]+/g, ' ').trim();
  if (!spaced) return 'תמונה מסתורין';
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** One picture the board can hide, with its own name attached. */
export interface GalleryImage {
  url: string;
  title: string;
  /** Where it came from - used to report the pool size in the shell, and to debug. */
  origin: 'folder' | 'stock' | 'scene';
}

/** The images found in the folder, in a stable order. */
export const FOLDER_IMAGES: GalleryImage[] = Object.entries(folderModules)
  // A stable order: Vite's glob key order is not guaranteed to be alphabetical across
  // platforms, and an unstable order would make the cycle jump around between builds.
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, url]) => ({ url, title: titleFromPath(path), origin: 'folder' as const }));

/** The stock illustrations, in the order declared above. */
export const STOCK_IMAGES: GalleryImage[] = FALLBACK_IMAGES.map((image) => ({
  ...image,
  origin: 'stock' as const,
}));

/** The three built-in SVG scenes, kept so the original artwork is not lost. */
export const SCENE_IMAGES: GalleryImage[] = MYSTERY_SCENES.map((scene) => ({
  url: sceneToDataUrl(scene),
  title: scene.name,
  origin: 'scene' as const,
}));

/**
 * The active pool - every picture the studio may hide, in a stable order.
 *
 * FOLDER FIRST, THEN STOCK, THEN SCENES. Ordering no longer decides what plays next (the
 * draw is random), but it still decides the ORDER OF THE INDICES, and the folder comes
 * first so that a picture the artist just dropped in is reachable early in the sequence
 * rather than buried behind the stock art. There is no de-duplication between the folder
 * and the stock list: if the same painting is in both it appears twice in the rotation,
 * which is harmless - and silently dropping one would be a surprise the other way.
 */
export const GALLERY: GalleryImage[] = [...FOLDER_IMAGES, ...STOCK_IMAGES, ...SCENE_IMAGES];

/** How many pictures came from the artist's folder, for the shell's hint line. */
export const FOLDER_COUNT = FOLDER_IMAGES.length;

/**
 * The picture for a given step of the pool.
 *
 * Pure and total: it never returns undefined for a non-empty pool, because the modulo
 * is normalised for negative input. That matters because the step is derived from
 * `(level - 1)` and a level below 1 is reachable if a save is hand-edited - and a
 * negative index would otherwise pick `undefined` and crash the board.
 */
export function imageAtStep(step: number): GalleryImage {
  const size = GALLERY.length;
  if (size === 0) {
    // Unreachable: the three built-in scenes guarantee a non-empty pool. Handled anyway
    // so a future refactor that empties the pool degrades to a described picture rather
    // than an undefined dereference inside the board.
    return { url: '', title: 'תמונה מסתורין', origin: 'scene' };
  }
  // `Number.isFinite` first: a NaN or Infinity step would survive `Math.trunc` unchanged and
  // make the modulo NaN, indexing the pool at NaN and yielding `undefined`.
  const safeStep = Number.isFinite(step) ? Math.trunc(step) : 0;
  return GALLERY[((safeStep % size) + size) % size] as GalleryImage;
}

/**
 * The step of the next picture - RANDOM, but GUARANTEED to differ from `step` when there is
 * more than one picture.
 *
 * ===================================================================
 * WHY THIS IS RANDOM AND STILL CANNOT REPEAT.
 * ===================================================================
 *
 * A plain uniform draw - `Math.floor(Math.random() * size)` - is what "pick a random picture"
 * usually means, and it is the version that produces the complaint this studio keeps getting.
 * With a pool of N, a uniform draw repeats the previous picture once every N rounds even when
 * it is working perfectly; a child who sees the same picture twice in a row reads that as a
 * stuck game, and that is exactly the report that started this. Randomness alone does not fix
 * it, because the repeat IS the randomness behaving correctly.
 *
 * So the draw here is random over the pool MINUS the current index:
 *
 *     pick uniformly from the `size - 1` pictures that are not the one on screen
 *
 * That is a genuinely random choice - every other picture has an equal chance, and the
 * sequence is not a cycle, so it does not march predictably around the array - while making an
 * immediate repeat IMPOSSIBLE rather than merely unlikely. The randomness the brief asks for
 * and the anti-repeat guarantee are both satisfied, and neither has to be traded for the other.
 *
 * A pool of one returns 0, because there is nothing else to show; a pool of zero also returns
 * 0, which `imageAtStep` handles by falling back to a described placeholder.
 */
export function stepAfter(step: number, random: () => number = Math.random): number {
  const size = GALLERY.length;
  if (size <= 1) return 0;

  const safeStep = Number.isFinite(step) ? Math.trunc(step) : 0;
  const current = ((safeStep % size) + size) % size;

  /*
   * Draw from the `size - 1` slots OTHER than the current one, then shift past it.
   *
   * Picking in `[0, size - 1)` and skipping over the current index is equivalent to a uniform
   * draw from the complement, and it avoids building a filtered array on every advance. The
   * `+ 1` shift is what does the skipping: every candidate at or after the current index is
   * pushed one further along, so the current index itself can never be produced.
   */
  const candidate = Math.floor(random() * (size - 1));
  const bounded = Math.min(size - 2, Math.max(0, candidate));
  return bounded >= current ? bounded + 1 : bounded;
}
