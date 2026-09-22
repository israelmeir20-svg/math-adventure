/**
 * The cast and the menu for "שעת האכלה".
 *
 * ===================================================================
 * SPRITES COME FROM `src/assets/cute/`, AND THIS GAME ALONE USES THEM.
 * ===================================================================
 *
 * Every other farm station (the barn, the scales, the night game) draws from
 * `src/assets/farm/` or `src/assets/game/`. This station deliberately does NOT:
 * "שעת האכלה" is the counting-and-sharing game, so it uses the softer, rounder
 * "cute" art to read as its own thing rather than as another barn board. Changing
 * the directory here is therefore a deliberate visual separation, not an
 * oversight - if you are looking for the other stations' sprites, they are in
 * `farm/` and `game/` and this file is not the place to change them.
 *
 * ===================================================================
 * WHY THIS IS A GLOB RATHER THAN EIGHT STATIC IMPORTS.
 * ===================================================================
 *
 * It used to be eight hand-written `import cow from '...'` lines. That works, but
 * it makes the code the source of truth for which assets exist, so a renamed or
 * re-exported file is a build error, and dropping in a new sprite means editing
 * TypeScript.
 *
 * `import.meta.glob` inverts that: the DIRECTORY is the source of truth. Every
 * image in `cute/` is picked up at build time, keyed by filename, and adding art
 * is a file drop with no code change. Vite resolves it statically, so this is
 * still fully tree-shaken and typed as a plain record of URLs - not a runtime
 * fetch.
 *
 * THE `?? ''` FALLBACKS BELOW ARE NOT DECORATION. A glob returns whatever happens
 * to be in the folder, so a missing file yields `undefined` rather than a build
 * failure. That is the trade this approach makes. For the eight species the game
 * actually plays with, silently rendering an <image href=""> would look like a
 * rendering bug rather than a missing asset, so each one falls back to the
 * matching sprite in `assets/game/` - the set this station used before the move.
 * A child then sees the previous artwork instead of a blank square, and the
 * difference is visible enough to notice without breaking the game.
 */
import duck from '../../../assets/game/duck.png';
import rabbit from '../../../assets/game/rabbit.png';
import cat from '../../../assets/game/cat.png';
import dog from '../../../assets/game/dog.png';
import sheep from '../../../assets/game/sheep.png';
import donkey from '../../../assets/game/donkey.png';
import cow from '../../../assets/game/cow.png';
import horse from '../../../assets/game/horse.png';
import type { FeedingAnimal, Food } from './feedingTypes';

/**
 * Every image sitting in `src/assets/cute/`, keyed by its absolute-ish module
 * path (e.g. `/src/assets/cute/cow.png`), with `eager` so the URLs are resolved
 * at build time and no async loading is needed in render.
 */
const cuteAssets = import.meta.glob<{ default: string }>(
  '/src/assets/cute/*.{png,jpg,jpeg,svg,webp}',
  { eager: true },
);

/**
 * Look a species up in `cute/`, by filename stem.
 *
 * The stem is compared case-insensitively so `Cow.png` on a case-insensitive
 * filesystem still resolves, and the extension is matched loosely because the
 * folder is globbed for five different formats.
 */
function cuteSprite(species: FeedingAnimal): string | undefined {
  const wanted = species.toLowerCase();
  for (const [path, mod] of Object.entries(cuteAssets)) {
    const stem = path.split('/').pop()?.replace(/\.[^.]+$/, '').toLowerCase();
    if (stem === wanted) return mod.default;
  }
  return undefined;
}

/**
 * The painted backdrop for the stage, resolved out of the same `cute/` glob.
 *
 * LOOKED UP BY STEM, LIKE THE ANIMALS, and for the same reason: the folder is the
 * source of truth, so replacing `background.png` (or dropping in a better
 * painting under the same name) needs no code change at all.
 *
 * THE FILE IS A JPEG WITH A `.png` EXTENSION. That is not a mistake to "fix" here
 * - it is what was supplied, and every browser sniffs the real type from the
 * bytes, so an SVG `<image href>` renders it correctly either way. It is noted
 * only so a future reader inspecting the bytes does not conclude the asset is
 * corrupt and go looking for a replacement.
 *
 * The fallback is an empty string rather than a colour: this only ever renders
 * inside an SVG `<image href>`, so a missing backdrop paints nothing and the
 * animals and bowls stay fully visible on a transparent stage. Substituting an
 * opaque colour there would be worse - it would hide the failure behind something
 * that looked deliberate.
 */
export function backgroundArt(): string {
  return cuteSprite('background' as FeedingAnimal) ?? '';
}

/** The sprites this station fell back to, for the same reason as above. */
const LEGACY_SPRITES: Record<FeedingAnimal, string> = {
  duck,
  rabbit,
  cat,
  dog,
  sheep,
  donkey,
  cow,
  horse,
};

/**
 * The intrinsic aspect ratio (width / height) of each species' slide.
 *
 * ============================================================
 * WHY THIS IS A HAND-WRITTEN TABLE AND NOT MEASURED AT RUNTIME.
 * ============================================================
 *
 * The stage lays out in SVG user units, with no image loading and no reflow. To
 * give a sprite a box that its artwork actually fills, the box needs the slide's
 * proportions up front. Measuring would mean loading the image, waiting, and
 * re-rendering - a visible pop on every round, and a layout that depends on the
 * network.
 *
 * So the numbers live here. They are the real intrinsic sizes of the files in
 * `src/assets/cute/`, verified against the assets:
 *
 *   the seven landscape slides are 1376x768  ->  1.792  (16:9)
 *   the donkey's portrait slide is 1024x1536 ->  0.667  (2:3)
 *
 * GETTING THIS WRONG DOES NOT DISTORT ANYTHING - `preserveAspectRatio` still
 * guarantees the art is never stretched - it only mis-sizes the BOX, which shows
 * up as either a gap above the animal (box too tall) or an animal that spills
 * outside a too-small box. If a sprite is ever re-exported at a new size, update
 * its number here.
 *
 * A missing entry falls back to 1.792, the common case, so an unlisted species
 * still renders sanely rather than collapsing to a square.
 */
const SPRITE_ASPECT: Partial<Record<FeedingAnimal, number>> = {
  cow: 1376 / 768,
  horse: 1376 / 768,
  sheep: 1376 / 768,
  rabbit: 1376 / 768,
  dog: 1376 / 768,
  cat: 1376 / 768,
  duck: 1376 / 768,
  donkey: 1024 / 1536,
};

/** The aspect ratio to lay this species' sprite out with. */
export const FALLBACK_ASPECT = 1376 / 768;

export function spriteAspect(species: FeedingAnimal): number {
  const a = SPRITE_ASPECT[species];
  return Number.isFinite(a) && a! > 0 ? a! : FALLBACK_ASPECT;
}

/** Sprite url + Hebrew name for one species. */
export interface FeedingAnimalMeta {
  src: string;
  /** Hebrew singular, used in the "N <animal>" caption under the stage. */
  label: string;
  /** Hebrew plural, used in the question line. */
  plural: string;
}

const NAMES: Record<FeedingAnimal, { label: string; plural: string }> = {
  duck: { label: 'ברווז', plural: 'ברווזים' },
  rabbit: { label: 'ארנב', plural: 'ארנבים' },
  cat: { label: 'חתול', plural: 'חתולים' },
  dog: { label: 'כלב', plural: 'כלבים' },
  sheep: { label: 'כבשה', plural: 'כבשים' },
  donkey: { label: 'חמור', plural: 'חמורים' },
  cow: { label: 'פרה', plural: 'פרות' },
  horse: { label: 'סוס', plural: 'סוסים' },
};

/**
 * The full cast table.
 *
 * Built by mapping over the species list rather than written out by hand, so the
 * cute-sprite lookup and the legacy fallback are resolved once per species in one
 * place instead of eight times in a literal.
 */
export const ANIMAL_META: Record<FeedingAnimal, FeedingAnimalMeta> = Object.fromEntries(
  (Object.keys(NAMES) as FeedingAnimal[]).map((species) => [
    species,
    {
      src: cuteSprite(species) ?? LEGACY_SPRITES[species],
      ...NAMES[species],
    },
  ]),
) as Record<FeedingAnimal, FeedingAnimalMeta>;

/** Every species, in the order the tiers introduce them. */
export const ALL_ANIMALS: FeedingAnimal[] = [
  'rabbit',
  'dog',
  'cat',
  'duck',
  'sheep',
  'donkey',
  'cow',
  'horse',
];

/**
 * What each species eats.
 *
 * Small pets get a food of their own so the picture matches the animal; the big
 * farm animals share corn or apples, which is what makes levels 3-4 mix "3 cows
 * sharing 9 apples" rather than always counting carrots.
 */
const PET_FOOD: Partial<Record<FeedingAnimal, Food>> = {
  rabbit: { emoji: '🥕', name: 'גזרים', counted: 'גזרים' },
  dog: { emoji: '🦴', name: 'עצמות', counted: 'עצמות' },
  cat: { emoji: '🐟', name: 'דגים', counted: 'דגים' },
  duck: { emoji: '🌾', name: 'גרעינים', counted: 'גרעינים' },
};

/** The two foods the big farm animals share, picked per round. */
export const BULK_FOODS: Food[] = [
  { emoji: '🍎', name: 'תפוחים', counted: 'תפוחים' },
  { emoji: '🌽', name: 'תירסים', counted: 'קלחי תירס' },
];

/**
 * The food this species eats. Big animals take a bulk food (the caller chooses
 * which); everyone else has a fixed favourite. A single species may therefore
 * appear at the trough with corn on one round and apples on the next.
 */
export function foodFor(animal: FeedingAnimal, bulk: Food): Food {
  return PET_FOOD[animal] ?? bulk;
}

/** True when this species eats from the shared bulk menu. */
export function eatsBulk(animal: FeedingAnimal): boolean {
  return PET_FOOD[animal] === undefined;
}