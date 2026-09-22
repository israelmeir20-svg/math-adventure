/**
 * The farm's rescueable animals - drawn as recognisable, asymmetric vector
 * silhouettes so that flipped / distorted variants are clearly different.
 *
 * Art direction: every animal is authored inside a 120x100 stage, sitting on
 * a shared baseline (y=88) and facing LEFT. Faces and limbs are deliberately
 * asymmetric so a mirror flip is obvious to a child.
 */

export interface FarmAnimal {
  id: string;
  nameHebrew: string;
  emoji: string;
  /** Cookies awarded alongside the adoption. */
  cookieCost: number;
  /** WebAudio tone played when this animal is rescued. */
  soundTone: number;
  /** Fill colour of the illustration body. */
  fill: string;
  /** Shared stage so all animals are comparable in size. */
  viewBox: string;
  /** The body + limbs, as one or more paths. */
  body: string[];
  /** Head and face details, added on top of the body. */
  features: string[];
}

/** Distraction applied to a silhouette to build a near-miss. */
export type ShadowVariant =
  | { kind: 'exact' }
  | { kind: 'flip' }
  | { kind: 'headTilt' }
  | { kind: 'legUp' };

export interface ShadowCard {
  id: string;
  variant: ShadowVariant;
}

export const STAGE = '0 0 120 100';

/** Animals are authored facing left inside a 120x100 stage. */
export const STAGE_WIDTH = 120;

export { FARM_ANIMALS, findAnimal } from './farmAnimalsArt';
