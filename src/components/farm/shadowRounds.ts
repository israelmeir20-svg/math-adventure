/**
 * Builds a Shadow Match round: one exact silhouette plus near-miss distractors.
 */
import type { FarmAnimal, ShadowCard, ShadowVariant } from './farmAnimalsData';

/** All shapes a silhouette can take, in increasing difficulty order. */
const DISTRACTORS: ShadowVariant[] = [
  { kind: 'flip' },
  { kind: 'headTilt' },
  { kind: 'legUp' },
];

const CARD_COUNT = 4;
const EXACT_VARIANT: ShadowVariant = { kind: 'exact' };

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i] as T;
    const b = copy[j] as T;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

export interface ShadowRound {
  animal: FarmAnimal;
  cards: ShadowCard[];
}

/** Picks a random animal that has not been rescued yet. */
export function pickAnimal(pool: FarmAnimal[]): FarmAnimal {
  return pool[Math.floor(Math.random() * pool.length)] as FarmAnimal;
}

export function buildShadowRound(animal: FarmAnimal): ShadowRound {
  const chosen = shuffle(DISTRACTORS).slice(0, CARD_COUNT - 1);
  const variants = shuffle([EXACT_VARIANT, ...chosen]);

  const cards: ShadowCard[] = variants.map((variant, index) => ({
    id: `${animal.id}-${index}`,
    variant,
  }));

  return { animal, cards };
}

/**
 * Paid once for matching a shadow and rescuing the animal - a full-stage reward, and
 * already at the brief's single-correct-action figure of 10.
 */
export const SHADOW_COOKIE_REWARD = 10;
