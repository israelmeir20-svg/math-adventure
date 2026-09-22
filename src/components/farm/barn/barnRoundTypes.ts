/**
 * Shared shapes and small helpers for the barn round engine.
 *
 * Split out of `barnRoundGenerator` so that module can stay focused on the
 * actual difficulty + question logic and within a readable size.
 */
import { ALL_ANIMALS, ANIMAL_ASSETS, type AnimalId } from './animalAssets';

export type { AnimalId };

export interface AnimalActor {
  id: string;
  animal: AnimalId;
  /**
   * True when this actor spawns wearing its Easter egg skin.
   *
   * ROLLED ONCE, AT GENERATION, AND NEVER RE-ROLLED. `animal` remains the real
   * species and remains the only thing `answer` is derived from, so the egg is a
   * purely visual fact about this actor - see `EASTER_EGG_ASSETS`.
   *
   * Baking the roll in here rather than deciding it while rendering matters: a
   * render-time roll would be re-evaluated on every frame and the animal would
   * flicker between its normal art and the egg. Storage is also what lets the
   * party screen and the stage agree about which animals were eggs.
   */
  easterEgg: boolean;
}

export type QuestionMode = 'total' | 'species';

export interface BarnRound {
  /**
   * Stable identity for this round instance. The stage is keyed on it, which
   * forces React to rebuild every SVG node - and therefore restart every
   * `<animateTransform>` - when the next round begins.
   */
  id: string;
  /** Wave 1: walking in from the left meadow. */
  incoming: AnimalActor[];
  /** Wave 2: emerging from the barn and leaving to the right. */
  outgoing: AnimalActor[];
  mode: QuestionMode;
  /** When `mode` is 'species', which animal is asked about. */
  target?: AnimalId;
  /** The correct answer, always 0..9. */
  answer: number;
  /** Hebrew prompt shown above the keypad. */
  prompt: string;
  tier: 'warmup' | 'paced' | 'selective';
}

/** 1-based round index -> difficulty profile. */
export function tierForRound(round: number): {
  tier: BarnRound['tier'];
  typeCount: number;
  allowSelective: boolean;
} {
  if (round <= 2) return { tier: 'warmup', typeCount: 1, allowSelective: false };
  if (round <= 4) return { tier: 'paced', typeCount: 2, allowSelective: false };
  return { tier: 'selective', typeCount: 3, allowSelective: true };
}

export const randInt = (min: number, max: number, random: () => number) =>
  min + Math.floor(random() * (max - min + 1));

export const pickAnimal = <T,>(items: T[], random: () => number): T =>
  items[Math.floor(random() * items.length)] as T;

export const countOf = (actors: AnimalActor[], animal: AnimalId) =>
  actors.filter((actor) => actor.animal === animal).length;

/** Picks `count` distinct animal types from the full cast. */
export function chooseTypes(count: number, random: () => number): AnimalId[] {
  const remaining = [...ALL_ANIMALS];
  const chosen: AnimalId[] = [];
  while (chosen.length < count && remaining.length > 0) {
    chosen.push(remaining.splice(Math.floor(random() * remaining.length), 1)[0] as AnimalId);
  }
  return chosen;
}

/**
 * The Hebrew question shown above the keypad.
 *
 * A species round asks about the target animal by name ("how many SHEEP are
 * left"); a general round asks about the herd as a whole. Both are phrased as
 * "are left", because that is the count the child just watched arrive and leave.
 */
export const buildPrompt = (target: AnimalId | undefined) =>
  target
    ? `כמה ${ANIMAL_ASSETS[target].plural} נשארו באסם?`
    : 'כמה חיות נשארו באסם?';
