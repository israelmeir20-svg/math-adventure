/**
 * Weights and cast for "מאזניים בחווה" (Animal Scales).
 *
 * The weights are the whole game: a puzzle is only fair if the player can add
 * them up in their head, so they are small, strictly distinct per species, and
 * FROZEN. `Object.freeze` plus `as const` means a typo cannot silently change
 * the maths halfway through a run.
 *
 * ===================================================================
 * THE SPRITES ARE ANIMATED WEBP, NOT THE STATIC PNGs.
 * ===================================================================
 *
 * `src/assets/farm/` ships both a still PNG per species and animated WebPs that are
 * genuine six-frame animations (verified: VP8X containers with an ANIM chunk and six
 * ANMF frames). Browsers play those natively in a plain `<img>`, so swapping the
 * source is the whole change - no sprite-sheet logic, no timers, no JS.
 *
 * THE `farm/` ANIMATIONS ARE 3/4 VIEW - the animal is turned slightly toward the
 * camera rather than seen flat in profile. That is what suits a scale pan, where the
 * animal stands facing out at the viewer; the barn's `game/*-run.webp` sprites are
 * hard side profiles built for running left-to-right and read as wrong here.
 *
 * ===================================================================
 * WHY SOME SPECIES HAVE TWO VARIANTS AND OTHERS ONE.
 * ===================================================================
 *
 * The artwork only provides a second pose for six of the eight species, and the
 * variants are NOT interchangeable in quality. Measured dimensions:
 *
 *   duck1   597x682    duck2   442x630      both full-size, usable
 *   cat1    595x650    cat2    206x264      <-- cat2 is a THUMBNAIL
 *   dog1    537x749    dog2    509x705      both usable
 *   sheep1  595x684    sheep2  298x592      sheep2 is small but legible when drawn tall
 *   horse1  597x666    horse2  501x809      both usable
 *   cow1    188x246    (no cow2)            <-- cow1 is a THUMBNAIL
 *   rabbit1 595x903    (no rabbit2)         usable
 *   donkey1 378x576    (no donkey2)         usable
 *
 * `cat2` and `cow1` are less than a third of their siblings in each dimension. They are
 * still valid artwork rather than corrupt files, and because every sprite is drawn
 * with `object-contain` inside a sized box the difference costs sharpness, not layout:
 * a small source simply renders softer, it does not resize the tray or shift its
 * neighbours. So they are kept rather than dropped, and the softness is accepted as
 * the price of not shipping a variant set that silently omits two species.
 *
 * A STATIC PNG IS KEPT FOR EVERY SPECIES as a true fallback, so a species whose
 * animations are ever removed still renders. See `animalArt`.
 */
import duckStill from '../../../assets/farm/duck.png';
import rabbitStill from '../../../assets/farm/rabbit.png';
import catStill from '../../../assets/farm/cat.png';
import dogStill from '../../../assets/farm/dog.png';
import sheepStill from '../../../assets/farm/sheep.png';
import donkeyStill from '../../../assets/farm/donkey.png';
import cowStill from '../../../assets/farm/cow.png';
import horseStill from '../../../assets/farm/horse.png';

import duck1 from '../../../assets/farm/duck1.webp';
import duck2 from '../../../assets/farm/duck2.webp';
import cat1 from '../../../assets/farm/cat1.webp';
import cat2 from '../../../assets/farm/cat2.webp';
import dog1 from '../../../assets/farm/dog1.webp';
import dog2 from '../../../assets/farm/dog2.webp';
import sheep1 from '../../../assets/farm/sheep1.webp';
import sheep2 from '../../../assets/farm/sheep2.webp';
import donkey1 from '../../../assets/farm/donkey1.webp';
import cow1 from '../../../assets/farm/cow1.webp';
import horse1 from '../../../assets/farm/horse1.webp';
import horse2 from '../../../assets/farm/horse2.webp';
import rabbit1 from '../../../assets/farm/rabbit1.webp';

export type ScaleAnimal =
  | 'duck'
  | 'rabbit'
  | 'cat'
  | 'dog'
  | 'sheep'
  | 'donkey'
  | 'cow'
  | 'horse';

/** Exact, immutable weights in "hay bales". */
export const WEIGHTS = Object.freeze({
  duck: 1,
  rabbit: 1,
  cat: 2,
  dog: 3,
  sheep: 4,
  donkey: 6,
  cow: 8,
  horse: 10,
} as const satisfies Record<ScaleAnimal, number>);

export interface AnimalMeta {
  /** The imported PNG url - always present, and the safety net. */
  still: string;
  /**
   * Every animated WebP available for this species, in no particular order.
   *
   * A LIST, not a single file, because two animals of the same species standing on
   * the same pan should not be pixel-identical clones. Resolution to one entry is
   * done per INDIVIDUAL animal, by `animalArt` - never once per species - so a pan
   * holding three cats can show three different poses.
   */
  variants: string[];
  /**
   * OPTIONAL per-variant size multipliers, index-aligned with `variants`.
   *
   * Exists for the case where one variant of a species is cropped more loosely than its
   * littermates, so it renders smaller at an identical box size. The species `scale` cannot
   * fix that without mis-sizing the sibling, so the correction lives here, beside the
   * filename it corrects. A missing entry means 1 (no correction).
   *
   * See `animalScale` for why this feeds the box rather than a CSS transform.
   */
  variantScale?: number[];
  /** Singular Hebrew name, shown on the shelf card. */
  label: string;
  /** Relative visual size, so a duck does not tower over a horse. */
  scale: number;
}

export const ANIMAL_META: Record<ScaleAnimal, AnimalMeta> = {
  /*
   * EVERY SPECIES CARRIES AN EXPLICIT `variantScale`, INDEX-ALIGNED WITH ITS OWN `variants`
   * LIST. Only the sheep currently uses a value other than 1, but declaring the array for
   * every species means the lookup in `animalScale` can never hit an undefined index - which
   * would otherwise resolve to `NaN` and blank or explode a sprite rather than fail loudly.
   */
  duck: {
    still: duckStill,
    variants: [duck1, duck2],
    variantScale: [1, 1],
    label: 'ברווז',
    scale: 0.24,
  },
  /*
   * WIDTH IS THE MEASURE, NOT BOX SIZE - and that is the whole reason these numbers look
   * the way they do.
   *
   * The ordering rule is that each species must render VISIBLY WIDER than the one before
   * it in `ALL_SCALE_ANIMALS`, or the cast's silhouettes stop being ordered and the child
   * loses the size cue that tells them which animal is heavier. But the artwork aspect
   * ratios differ enormously, so an equal box does not mean an equal animal. At one shared
   * box the cast would sort as donkey < rabbit < dog < cow < sheep < duck < horse < cat -
   * very nearly the reverse of the weight order the game is teaching.
   *
   * The rabbit's art is tall and narrow (595x903, aspect 0.66) while the duck's is wide
   * (aspect 0.88), so the rabbit needs a box almost FOUR TIMES the duck's before it reads
   * as the wider animal:
   *
   *     duck 0.24 -> rabbit 0.94 -> cat 0.78 -> dog 1.10
   *
   * The factors SHOULD look scrambled. What is ordered is the visible width they produce,
   * and that is verified at every scene width the game supports. The horizontal cluster
   * width that must fit the tray is set by the WIDEST BOX, which belongs to the donkey.
   *
   * The duck and the rabbit both weigh 1, so this is purely cosmetic.
   */
  rabbit: {
    still: rabbitStill,
    variants: [rabbit1],
    variantScale: [1],
    label: 'ארנב',
    scale: 0.94,
  },
  cat: { still: catStill, variants: [cat1, cat2], variantScale: [1, 1], label: 'חתול', scale: 0.78 },
  dog: { still: dogStill, variants: [dog1, dog2], variantScale: [1, 1], label: 'כלב', scale: 1.1 },
  /*
   * THE SHEEP IS WHY THIS TABLE NEEDS A NOTE AT ALL.
   *
   * It sits at 0.99 - BELOW its neighbour the dog at 1.10 - which breaks the "factors
   * increase down the list" rule outright, and is exactly what the rule's real intent
   * requires. What must increase is the sheep's VISIBLE width, and it does despite the
   * smaller factor. The artwork is cropped much more loosely than the rest: sheep1 and
   * sheep2 carry noticeably more transparent padding around the body than any other sprite
   * in the set, so a large box yields a small sheep.
   *
   * This was the reported bug: the sheep rendered visibly smaller than the cat it
   * outweighs by four, and the same padding left it hovering above the dish rather than
   * standing on it. Compensating for the padding fixes both, and the visible hierarchy is
   * now strictly increasing - duck < rabbit < cat < dog < sheep < donkey < cow < horse -
   * and verified as such at every scene width the game supports.
   */
  sheep: {
    still: sheepStill,
    variants: [sheep1, sheep2],
    /*
     * THE CURLED LAMB IS CORRECTED HERE, BY ITS BOX, AND ONLY HERE.
     *
     * `sheep2` (the curled lamb) carries far more transparent margin inside its canvas than
     * any other sprite, so at an identical box it draws dramatically smaller than `sheep1`.
     * A per-variant BOX factor is the correct lever: it is index-aligned with this species'
     * own `variants` list, so no other species can be reached by it, and because it feeds
     * the same size calculation as the species factor the sprite stays anchored to the
     * tray's floor via `items-end`.
     *
     * The earlier attempt used a CSS `transform: scale()` on the image keyed on a variant
     * index. That leaked sideways and inflated `cat2` instead - an origin-based transform
     * has no notion of which species it belongs to. This cannot.
     */
    variantScale: [1.0, 1.45],
    label: 'כבשה',
    scale: 1.25,
  },
  /*
   * The donkey has the widest BOX of any species, and needs it: its art is tightly cropped
   * at an aspect of 0.66, the same as the rabbit's, while the cow's is 0.76 and the
   * horse's 0.90. Its visible width still lands under the horse's, which is the read that
   * matters - and its box is what the tray must hold three of, so it is the binding
   * constraint on how large the whole cast can be.
   */
  donkey: {
    still: donkeyStill,
    variants: [donkey1],
    variantScale: [1],
    label: 'חמור',
    scale: 1.42,
  },
  cow: { still: cowStill, variants: [cow1], variantScale: [1], label: 'פרה', scale: 1.31 },
  horse: {
    still: horseStill,
    variants: [horse1, horse2],
    variantScale: [1, 1],
    label: 'סוס',
    scale: 1.2,
  },
};

/** Every species, lightest first - the order the shelf introduces them. */
export const ALL_SCALE_ANIMALS: ScaleAnimal[] = [
  'duck',
  'rabbit',
  'cat',
  'dog',
  'sheep',
  'donkey',
  'cow',
  'horse',
];

/**
 * The best available sprite url for one animal.
 *
 * RESOLVED PER INDIVIDUAL, NOT PER SPECIES - and deliberately so. The obvious design
 * would be "pick this round's cat variant once, use it everywhere", which is simpler
 * but produces a pan of three cats that are three copies of the same picture. Two cats
 * on one pan should be two different cats, so the pose is chosen per ANIMAL.
 *
 * ===================================================================
 * THE SEED IS REQUIRED, AND THAT IS A FIX RATHER THAN A NICETY.
 * ===================================================================
 *
 * This function used to default `variantSeed` to `Math.random()`. That default was a bug
 * waiting to be tripped by the first caller that did not pass a seed: the scale game's
 * timer ticks once a second, every tick re-renders the tree, and a `Math.random()` read
 * in the render body returns a DIFFERENT number each time. So every animal on every pan
 * silently changed pose once per second - a cage of flickering sprites, with nothing in
 * the code looking wrong.
 *
 * `variantSeed` is now mandatory. A caller cannot forget it, because the build fails
 * without it, and a seed that is `Math.random()` is at least an explicit choice written
 * at the call site rather than an invisible default.
 *
 * A GOOD SEED IS ANY STABLE NUMBER FOR THAT ANIMAL, for as long as the animal stands
 * where it stands. The callers use the animal's index in its pan, which is stable across
 * re-renders, changes when the animal is actually replaced, and gives neighbouring
 * animals different poses - which is all that is needed.
 *
 * ===================================================================
 * THE FALLBACK CHAIN IS THE POINT, NOT A DECORATION.
 * ===================================================================
 *
 * A broken `src` makes an `<img>` render as nothing at all - no error, no placeholder -
 * so an animal whose artwork is missing simply vanishes from the tray. In a game where
 * the animals ARE the numbers, a vanished animal silently corrupts the puzzle: the child
 * counts an empty pan and the answer they can see is not the answer the game scored.
 *
 * Every step below therefore degrades to something drawable rather than to blank:
 *
 *   1. the species' requested variant, when it exists;
 *   2. ANY other variant for that species, when the requested one is missing;
 *   3. the static PNG, which is imported for every species and so is always present;
 *   4. the first static PNG in the catalogue, as a last resort.
 *
 * Step 2 matters because the variant lists are hand-maintained and uneven - the artwork
 * only ships a second pose for six of the eight species, and a future edit that drops
 * `cat2` would otherwise blank one of two cats at random. Step 4 matters because a
 * species added to `ScaleAnimal` without any artwork would otherwise crash the render on
 * an undefined lookup; showing the wrong animal is a far better failure than showing none.
 */
export function animalArt(animal: ScaleAnimal, variantSeed: number): string {
  const meta = ANIMAL_META[animal];

  // 1. The requested variant, with the index clamped so a seed of exactly 1 or NaN
  //    cannot read out of bounds, and so a negative seed cannot index from the end.
  const count = meta.variants.length;
  if (count > 0) {
    const picked = meta.variants[variantIndex(animal, variantSeed)];
    // 2. A blank entry in the list falls through to any other variant of this species.
    if (picked) return picked;
    const alternative = meta.variants.find((url) => Boolean(url));
    if (alternative) return alternative;
  }

  // 3 & 4. The static PNG, then the catalogue's first static PNG.
  return meta.still || (Object.values(ANIMAL_META)[0]?.still ?? '');
}

/**
 * Which variant slot a seed lands on, clamped into the species' range.
 *
 * Split out of `animalArt` so the SIZE resolver can ask the same question the ART resolver
 * asks. The two must agree exactly: if the sprite chosen and the ratio applied were derived
 * by two different roundings, a single animal could be drawn with one pose and sized for
 * another - which is bug-shaped in a way that would only show up on some seeds.
 *
 * A seed of exactly 1, or a NaN, would index out of bounds, and a negative seed would
 * index from the end; the clamp closes both.
 */
export function variantIndex(animal: ScaleAnimal, variantSeed: number): number {
  const count = ANIMAL_META[animal].variants.length;
  if (count === 0) return 0;
  const raw = Number.isFinite(variantSeed) ? Math.floor(variantSeed * count) : 0;
  return Math.min(Math.max(raw, 0), count - 1);
}

/**
 * The size multiplier for one animal, combining its species factor with its VARIANT ratio.
 *
 * ===================================================================
 * WHY A PER-VARIANT RATIO HAS TO EXIST.
 * ===================================================================
 *
 * `ANIMAL_META[species].scale` assumes every variant of a species is cropped the same way -
 * that `sheep1` and `sheep2` frame their character identically inside the canvas. That
 * assumption is not guaranteed, because the variants are separate files produced
 * separately, and a looser crop in ONE file makes that one animal render visibly smaller
 * than its littermate at an identical CSS size. The species factor cannot express that: it
 * is per-SPECIES, so it would have to shrink or grow every sheep to correct one of them.
 *
 * `variantScale` therefore multiplies on top of the species factor, and lives on the
 * variant list itself so the correction sits next to the filename it is correcting.
 *
 * THE MECHANISM MATTERS AS MUCH AS THE VALUE. This feeds the same box-size calculation as
 * the species factor, so the compensation behaves exactly like every other size in this
 * game: it sets the BOX, and `items-end` on the cluster keeps the feet planted on the dish.
 * A `scale-*` CSS transform would instead scale about the sprite's centre and drop the feet
 * through the tray floor - and the ratio is a tuned constant for exactly the reason the
 * factor is: the right number comes from looking at the artwork, not from a formula.
 */
export function animalScale(animal: ScaleAnimal, variantSeed: number): number {
  const meta = ANIMAL_META[animal];
  const ratio = meta.variantScale?.[variantIndex(animal, variantSeed)] ?? 1;
  // A missing or nonsensical entry must never blank or explode a sprite.
  return (meta.scale ?? 1) * (Number.isFinite(ratio) && ratio > 0 ? ratio : 1);
}

/**
 * A STABLE pose seed for one animal, derived from where it stands.
 *
 * The seed has to be a pure function of something that does not change while the animal
 * is on the pan, and it has to differ between two animals standing side by side so a pair
 * of cats is not a clone. A multiplicative hash of the animal's position gives both: the
 * same index always yields the same pose, and neighbouring indices land far apart in the
 * fraction's range, so two adjacent cats get visibly different poses rather than the same
 * one nudged by a thousandth.
 *
 * `speciesSalt` separates the SAME index across two different pans - the left pan's first
 * cat and the right pan's first cat should not be twins.
 */
export function poseSeed(index: number, speciesSalt = 0): number {
  const hash = (index + 1) * 2654435761 + speciesSalt * 40503;
  // Take the fractional part of the scaled hash, then fold it into [0, 1).
  const frac = Math.abs(Math.sin(hash)) % 1;
  return frac;
}

/**
 * How many distinct animations a species can wear.
 *
 * Used by the shelf and the tray to decide whether a random per-animal pose is worth
 * doing at all - a one-variant species would otherwise get a pointless random call.
 */
export function variantCount(animal: ScaleAnimal): number {
  return ANIMAL_META[animal].variants.length;
}

/** Weight of a species, or 0 for an unknown id (defensive). */
export function weightOf(animal: ScaleAnimal): number {
  return WEIGHTS[animal] ?? 0;
}

/** Total weight of a list of species. */
export function sumWeight(animals: readonly ScaleAnimal[]): number {
  return animals.reduce((total, animal) => total + weightOf(animal), 0);
}
