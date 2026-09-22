/**
 * The animals of "האסם בלילה" - names only, no artwork.
 *
 * DELIBERATELY SEPARATE FROM THE SPRITE IMPORTS. The puzzle generator needs to
 * name a species ("כמה פרות מסתתרים?") but has no use for a PNG url. Keeping the
 * names here means the generator - and every verification script that imports it
 * - pulls in no image modules at all, so the arithmetic can be tested in plain
 * Node without a bundler.
 *
 * The sprite urls live in `nightSprites.ts`, imported only by the stage layer.
 */
import type { NightAnimal } from './nightTypes';

/** Hebrew naming for one species. */
export interface NightAnimalName {
  /** Singular, used by the detective question. */
  label: string;
  /** Plural, used in the doubling question and the reveal. */
  plural: string;
  /**
   * Grammatical gender of the Hebrew noun.
   *
   * HEBREW VERBS AGREE WITH THEIR SUBJECT, so the question cannot be assembled from
   * the noun alone - "כמה פרות מסתתרים" is simply wrong, the feminine noun needs
   * "מסתתרות". Storing the gender beside the name keeps the two facts together, so
   * adding a species forces a decision about its grammar rather than defaulting to
   * the masculine form and producing a sentence that reads as a mistake to a
   * native speaker (and, for a child learning to read, teaches the wrong form).
   */
  gender: 'm' | 'f';
}

export const NIGHT_ANIMAL_NAMES: Record<NightAnimal, NightAnimalName> = {
  duck: { label: 'ברווז', plural: 'ברווזים', gender: 'm' },
  rabbit: { label: 'ארנב', plural: 'ארנבים', gender: 'm' },
  cat: { label: 'חתול', plural: 'חתולים', gender: 'm' },
  dog: { label: 'כלב', plural: 'כלבים', gender: 'm' },
  // Feminine: כבשה -> כבשים, and the verb must be מסתתרות.
  sheep: { label: 'כבשה', plural: 'כבשים', gender: 'f' },
  donkey: { label: 'חמור', plural: 'חמורים', gender: 'm' },
  // Feminine: פרה -> פרות, verb מסתתרות.
  cow: { label: 'פרה', plural: 'פרות', gender: 'f' },
  horse: { label: 'סוס', plural: 'סוסים', gender: 'm' },
};

/**
 * Names for a species, with a fallback that can never throw.
 *
 * Every species in `ALL_NIGHT_ANIMALS` is named above, so this returns the real
 * entry in normal play. The fallback exists because a lookup miss used to be a
 * hard crash: `NIGHT_ANIMAL_NAMES[x].plural` throws if `x` is somehow not a key,
 * and that throw happens inside puzzle generation - which would freeze the round
 * rather than degrade it. A missing name should cost a slightly odd question,
 * not the game.
 *
 * The fallback echoes the raw key so the mistake is visible ("כמה donkey
 * מסתתרים?") rather than silent, and defaults to the masculine form, which is the
 * commoner case for the species we actually have.
 */
export function nightAnimalName(animal: string): NightAnimalName {
  return (
    NIGHT_ANIMAL_NAMES[animal as NightAnimal] ?? {
      label: animal,
      plural: animal,
      gender: 'm',
    }
  );
}

/** The plural noun for a species, safe against unknown keys. */
export function getPluralName(species: string): string {
  return nightAnimalName(species).plural;
}

/**
 * The detective question, with the verb agreeing with the species' gender.
 *
 * "האירו עם הפנס: כמה פרות מסתתרות?" for a feminine noun, "...כמה סוסים מסתתרים?"
 * for a masculine one. The choice is driven by the species' own `gender` field, so
 * it cannot drift out of sync with the noun the way a hard-coded list would.
 */
export function getDetectiveQuestion(species: string): string {
  const info = nightAnimalName(species);
  const verb = info.gender === 'f' ? 'מסתתרות' : 'מסתתרים';
  return `האירו עם הפנס: כמה ${info.plural} ${verb}?`;
}

/** Every species, in a stable order so generation is reproducible. */
export const ALL_NIGHT_ANIMALS: NightAnimal[] = [
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
 * The species a detective round may ask about.
 *
 * Every species qualifies today, so this is a seam rather than a filter: a detective
 * question needs a plural noun that reads naturally in "כמה ___ מסתתרים?", and if a
 * species were ever added whose plural is ambiguous or whose sprite is too small to
 * count at a glance, this is the one place to exclude it - instead of a condition
 * buried in the generator.
 */
export function nightDetectiveSpecies(): NightAnimal[] {
  return ALL_NIGHT_ANIMALS;
}
