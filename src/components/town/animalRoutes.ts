/**
 * Natural habitat anchors for the animals on the illustrated town map.
 *
 * Each animal rests at ONE fixed percentage coordinate - the spot on the
 * artwork that reads as its home - and plays a small local idle animation
 * there. There are deliberately no travel paths: multi-stop percentage
 * translations did not track the illustration reliably and drifted sprites
 * onto roofs and water. Percentage anchors are scale-independent, so an animal
 * stays in its habitat at every viewport width.
 */

export type Waypoint = { x: number; y: number };

/** How an animal idles in place. */
export type IdleKind = 'ground' | 'water';

export interface AnimalHabitat {
  id: string;
  label: string;
  /** Habitat centre, in map percentages. */
  anchor: Waypoint;
  idle: IdleKind;
  /** Seconds for one full idle cycle; varied so the town never pulses. */
  duration: number;
  /** Seconds of stagger so neighbours do not breathe in unison. */
  delay: number;
  /** Idle bounce height in px. */
  lift: number;
}

export const ANIMAL_HABITATS: Record<string, AnimalHabitat> = {
  foal: {
    id: 'foal',
    label: 'אחו הדשא העליון',
    anchor: { x: 34, y: 26 },
    idle: 'ground',
    duration: 2.6,
    delay: 0,
    lift: 3,
  },
  lamb: {
    id: 'lamb',
    label: 'ליד גדר הצאן',
    anchor: { x: 26, y: 31 },
    idle: 'ground',
    duration: 3.1,
    delay: 0.45,
    lift: 2,
  },
  duckling: {
    id: 'duckling',
    label: 'בריכת הנהר',
    anchor: { x: 22, y: 65 },
    idle: 'water',
    duration: 3.6,
    delay: 0.2,
    lift: 2,
  },
  rabbit: {
    id: 'rabbit',
    label: 'חלקת הפרחים',
    anchor: { x: 17, y: 48 },
    idle: 'ground',
    duration: 2.2,
    delay: 0.9,
    lift: 4,
  },
  puppy: {
    id: 'puppy',
    label: 'כיכר השוק',
    anchor: { x: 67, y: 64 },
    idle: 'ground',
    duration: 2.9,
    delay: 1.3,
    lift: 3,
  },
  kitten: {
    id: 'kitten',
    label: 'הדרך שליד הבית הכחול',
    anchor: { x: 57, y: 72 },
    idle: 'ground',
    duration: 2.4,
    delay: 0.7,
    lift: 3,
  },
};

/** The town never looks deserted before the first adoption. */
export const STARTER_ANIMAL = 'puppy';

/** Resolves an animal id to its habitat, or null if it has none. */
export function getAnimalHabitat(
  id: string | null | undefined,
): AnimalHabitat | null {
  if (!id || typeof id !== 'string') return null;
  return ANIMAL_HABITATS[id] ?? null;
}
