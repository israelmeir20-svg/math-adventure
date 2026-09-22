/**
 * The cast of "מי באסם?" - real 2D artwork instead of procedural shapes.
 *
 * ===================================================================
 * THE RUN SPRITES ARE WEBP, AND THEY ARE UPRIGHT.
 * ===================================================================
 *
 * The artwork moved from square-ish landscape PNGs to `*-run.webp` slides drawn
 * as standing animals. That changes two things that matter here:
 *
 *   1. THEY ARE TALLER THAN THEY ARE WIDE (aspect 0.74-1.11, measured from the
 *      files), so sizing them by a single square box would either squash them or
 *      leave a wide empty margin either side. The stage therefore sizes each
 *      animal by HEIGHT and lets the width follow the artwork - which is exactly
 *      what `w-auto object-contain` does, and what the `heightClass` below feeds.
 *
 *   2. THE ART FACES RIGHT. The animals run rightward on both waves, so no
 *      mirroring is needed by default; but the stage flips a sprite with
 *      `scale-x-[-1]` when a lane runs the other way, so the flag is kept on the
 *      asset rather than decided per-render.
 *
 * `heightClass` IS THE SIZE CONTROL NOW. It replaces the old `scale` multiplier
 * against a fixed 90-unit box. A utility class is used rather than a computed
 * pixel height so the sizes stay in one place, are responsive by default, and can
 * be read off the markup instead of traced through arithmetic.
 */
import sheepRun from '../../../assets/game/sheep-run.webp';
import cowRun from '../../../assets/game/cow-run.webp';
import horseRun from '../../../assets/game/horse-run.webp';
import donkeyRun from '../../../assets/game/donkey-run.webp';
import rabbitRun from '../../../assets/game/rabbit-run.webp';
import duckRun from '../../../assets/game/duck-run.webp';
import dogRun from '../../../assets/game/dog-run.webp';
import catRun from '../../../assets/game/cat-run.webp';
import sheepBall from '../../../assets/game/sheep-ball.webp';
import penguin from '../../../assets/game/Penguin.webp';

export type AnimalId =
  | 'sheep'
  | 'cow'
  | 'horse'
  | 'donkey'
  | 'rabbit'
  | 'duck'
  | 'dog'
  | 'cat';

export interface AnimalAsset {
  /** The imported WebP url. */
  src: string;
  /** Singular Hebrew name, used in selective-attention questions. */
  label: string;
  /** Plural Hebrew name, used in selective-attention questions. */
  plural: string;
  /** Real artwork width / height, measured from the file. */
  aspect: number;
  /**
   * The Tailwind height utility that sizes this animal.
   *
   * Chosen so the silhouettes rank the way a child expects: a duckling is the
   * shortest thing on the lawn and a cow or horse the tallest. Keeping the
   * ranking readable matters more than the absolute numbers, because the game
   * asks the child to track WHAT went in, not how big it was.
   *
   * THIS IS NOW A KEY, NOT A STYLE. The stage no longer puts this class on the
   * <img>; it looks the height up in `SPRITE_PX` and applies a pixel width and
   * height instead. See that table for why a utility class was the wrong tool.
   */
  heightClass: string;
  /** Seconds for one trot/squash cycle. */
  trot: number;
}

/**
 * The rendered pixel height for each size bucket, and the reason the actors no
 * longer use a Tailwind height class.
 *
 * ===================================================================
 * WHY PIXELS INSTEAD OF `h-20 w-auto object-contain`.
 * ===================================================================
 *
 * The actors live inside an absolutely-positioned, shrink-to-fit wrapper that also
 * carries `translateX(-50%)` for centring. With `w-auto`, the image's width is
 * DERIVED from that wrapper's layout box - and the wrapper's own width depends on
 * its content. As an animal's `left` advanced, the browser re-resolved that
 * circular sizing, the box came out narrower, and `object-contain` scaled the
 * artwork down to fit. An animal therefore appeared to shrink steadily along its
 * run and finish as a speck in the grass, even though nothing in the code ever
 * wrote a `scale`.
 *
 * A pixel width cannot be re-derived. It is fixed before layout, so the wrapper has
 * nothing to negotiate with and the sprite measures identically at x=0 and x=1.3.
 *
 * THE WIDTH IS NOT STORED, BECAUSE IT IS NOT AN INDEPENDENT FACT - it is the
 * height times the artwork's own aspect ratio, computed in `BarnTunnelStage`. Two
 * tables could disagree; one table and a ratio cannot.
 *
 * ===================================================================
 * THE SMALL BUCKETS HAVE BEEN LIFTED, AND THE LARGE ONE HAS NOT.
 * ===================================================================
 *
 * Matching the original Tailwind classes exactly (h-12 = 48px ... h-20 = 80px) made
 * the size RANKING correct but the size CONTRAST too steep: the cow and horse
 * dominated the lawn while a duck or a rabbit was a speck that vanished into the
 * grass texture, which is a problem when the game asks a child to count them.
 *
 * So the smaller buckets are raised 15-20% and the largest is left alone to serve
 * as the reference. The ranking is unchanged - a duck is still the shortest thing
 * on the lawn and a horse still the tallest - but the spread is compressed:
 *
 *   bucket   before   after   change
 *   h-12       48       56     +17%   (duck, rabbit)
 *   h-14       56       64     +14%   (cat)
 *   h-16       64       72     +13%   (sheep, dog)
 *   h-20       80       80       -    (cow, horse, donkey) - the anchor
 *
 * The compression is the point. An earlier fix would have been to scale everything
 * up together, which changes nothing about the balance - a bigger duck next to a
 * proportionally bigger horse is the same picture. Only raising the small end
 * closes the gap.
 *
 * THE ONLY CEILING IS THE RANKING. If the small buckets ever reach h-20's 80px the
 * visual hierarchy the game depends on collapses, so a duck is kept comfortably
 * under half a horse.
 */
export const SPRITE_PX: Record<string, number> = {
  'h-12': 56,
  'h-14': 64,
  'h-16': 72,
  'h-20': 80,
};

export const ANIMAL_ASSETS: Record<AnimalId, AnimalAsset> = {
  sheep: {
    src: sheepRun,
    label: 'כבשה',
    plural: 'כבשים',
    aspect: 528 / 632,
    heightClass: 'h-16',
    trot: 1.4,
  },
  cow: {
    src: cowRun,
    label: 'פרה',
    plural: 'פרות',
    aspect: 545 / 492,
    heightClass: 'h-20',
    trot: 1.4,
  },
  horse: {
    src: horseRun,
    label: 'סוס',
    plural: 'סוסים',
    aspect: 545 / 512,
    heightClass: 'h-20',
    trot: 1.4,
  },
  donkey: {
    src: donkeyRun,
    label: 'חמור',
    plural: 'חמורים',
    aspect: 306 / 390,
    heightClass: 'h-20',
    trot: 1.4,
  },
  rabbit: {
    src: rabbitRun,
    label: 'ארנב',
    plural: 'ארנבים',
    aspect: 554 / 663,
    heightClass: 'h-12',
    trot: 0.9,
  },
  duck: {
    src: duckRun,
    label: 'ברווז',
    plural: 'ברווזים',
    aspect: 425 / 571,
    heightClass: 'h-12',
    trot: 0.9,
  },
  dog: {
    src: dogRun,
    label: 'כלב',
    plural: 'כלבים',
    aspect: 528 / 606,
    heightClass: 'h-16',
    trot: 1.1,
  },
  cat: {
    src: catRun,
    label: 'חתול',
    plural: 'חתולים',
    aspect: 537 / 495,
    heightClass: 'h-14',
    trot: 1.05,
  },
};

/** Every animal id, in the order the warm-up rounds introduce them. */
export const ALL_ANIMALS: AnimalId[] = [
  'sheep',
  'cow',
  'horse',
  'donkey',
  'rabbit',
  'duck',
  'dog',
  'cat',
];

/**
 * THE EASTER EGG - a rare skin that a spawned animal can turn out to be wearing.
 *
 * ===================================================================
 * A SKIN, NOT A DIFFERENT ANIMAL. THIS IS THE WHOLE CONSTRAINT.
 * ===================================================================
 *
 * The game's question is built from the animals' TYPES: "how many sheep went in?",
 * "how many animals are left?" - and the answer is validated against those types.
 * So when an animal hatches as an Easter egg it keeps its real `AnimalId` and its
 * real place in the count; ONLY the picture drawn for it changes.
 *
 * That is why this is a lookup keyed by `AnimalId` and returning a `src`, rather
 * than a flag that changes which animal was spawned. If the egg ever produced a
 * genuinely different `AnimalId`, the questions would start lying about what the
 * child just watched walk into the barn, and the game would be unsolvable rather
 * than merely surprising.
 *
 * THE TWO ENTRIES ARE THE WHOLE ROSTER:
 *
 *   - A SHEEP gets `sheep-ball.webp`, a sheep curled up as a ball. It reads as the
 *     same animal playing a joke, so it stays on-theme.
 *   - EVERY OTHER animal gets `Penguin.webp`, which is deliberately NOT a barn
 *     animal at all. That mismatch is the joke for the other seven.
 *
 * Both are sized by the SAME `heightClass` as the animal they replace - see
 * `ActorSkin` - so a penguin standing in for a cow is as tall as the cow and the
 * scene's proportions never shift.
 */
export const EASTER_EGG_ASSETS: Record<AnimalId, string> = {
  sheep: sheepBall,
  cow: penguin,
  horse: penguin,
  donkey: penguin,
  rabbit: penguin,
  duck: penguin,
  dog: penguin,
  cat: penguin,
};

/**
 * How often a newly spawned animal turns out to be wearing an Easter egg skin.
 *
 * 0.5% - roughly one animal in two hundred, so a child will see perhaps one or two
 * across a long play session. Rare enough to be a genuine event rather than
 * background noise, frequent enough that it is not effectively unreachable.
 */
export const EASTER_EGG_CHANCE = 0.005;

/**
 * Decides whether ONE animal spawns wearing its Easter egg skin.
 *
 * ROLLED ONCE AT SPAWN, NOT PER FRAME. The result is baked into the actor when the
 * round is generated (see `barnRoundGenerator`), so an animal cannot flicker
 * between its normal art and the egg while it runs - it either is the egg for the
 * whole of its life on screen or it never is.
 *
 * Kept here beside the assets because the rate and the art are one decision: if
 * the roster ever grows, the reader is already looking at the table it feeds.
 */
export function rollEasterEgg(): boolean {
  return Math.random() < EASTER_EGG_CHANCE;
}
