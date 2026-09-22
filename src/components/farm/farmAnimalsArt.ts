/**
 * SVG path art for the farm animals.
 * Kept separate from the types so each file stays small and focused.
 */
import type { FarmAnimal } from './farmAnimalsData';

/** Shared stage - inlined (not imported) to avoid a circular import. */
const STAGE = '0 0 120 100';

export const FARM_ANIMALS: FarmAnimal[] = [
  {
    id: 'rabbit',
    nameHebrew: 'ארנבון',
    emoji: '🐰',
    cookieCost: 30,
    soundTone: 660,
    fill: '#fbcfe8',
    viewBox: STAGE,
    body: [
      // Rounded body on the baseline, with a small tail on the right.
      'M34 88c-12 0-18-8-18-18s8-18 22-18 26 6 26 16c0 8-4 12-4 12h12a6 6 0 0 1 0 8H34Z',
    ],
    features: [
      // Head offset left, so the animal clearly faces left.
      'M38 52a15 15 0 1 1 0-30 15 15 0 0 1 0 30Z',
      // One long upright ear + one folded ear (asymmetry makes flips visible).
      'M34 26c-4-14-4-22 0-23s8 10 6 23Z',
      'M46 28c2-9 8-10 9-6s-2 9-5 11Z',
    ],
  },
  {
    id: 'lamb',
    nameHebrew: 'טלה',
    emoji: '🐑',
    cookieCost: 40,
    soundTone: 590,
    fill: '#fef3c7',
    viewBox: STAGE,
    body: [
      // Woolly body: overlapping circles read as fleece.
      'M40 88c-14 0-24-8-24-18s10-18 24-18c6 0 10 2 14 4 4-2 8-4 14-4 14 0 24 8 24 18s-10 18-24 18H40Z',
      'M18 74a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z',
      'M60 60a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z',
    ],
    features: [
      'M36 54a13 13 0 1 1 0-26 13 13 0 0 1 0 26Z',
      // Floppy ear hanging on one side only.
      'M24 42c-4 6-2 12 3 12s6-8 1-12Z',
      'M34 86h7v10h-7Z',
      'M72 86h7v10h-7Z',
    ],
  },
  {
    id: 'foal',
    nameHebrew: 'סייח',
    emoji: '🐴',
    cookieCost: 50,
    soundTone: 520,
    fill: '#fed7aa',
    viewBox: STAGE,
    body: [
      // Barrel + long legs.
      'M30 74c0-12 10-20 24-20h14c10 0 16 8 16 20v14H30V74Z',
      'M40 88h8v10h-8Z',
      'M58 88h8v10h-8Z',
      'M74 88h8v10h-8Z',
      // Tail sweeping right.
      'M84 62c8 2 12 10 8 16s-10-2-8-16Z',
    ],
    features: [
      // Neck rising to the left, with a muzzle.
      'M38 58c-4-10-6-18-4-22s10-2 14 4 6 12 4 18Z',
      'M30 30c-6-2-8-8-4-11s10 1 12 5Z',
      // Mane along the neck.
      'M44 34c4-6 10-6 12-2s-4 8-9 8Z',
    ],
  },
  {
    id: 'puppy',
    nameHebrew: 'כלבלב',
    emoji: '🐶',
    cookieCost: 45,
    soundTone: 480,
    fill: '#fde68a',
    viewBox: STAGE,
    body: [
      'M32 88c-10 0-16-8-16-18s8-18 20-18h28c12 0 20 8 20 18s-6 18-16 18H32Z',
      'M34 86h8v12h-8Z',
      'M74 86h8v12h-8Z',
    ],
    features: [
      // Head low and forward, tilted left.
      'M32 54a14 14 0 1 1 0-28 14 14 0 0 1 0 28Z',
      // One upright ear, one flopped ear.
      'M22 32c-6-4-6-12 0-13s8 6 5 12Z',
      'M42 34c8-2 12-10 8-14s-12 2-12 9Z',
      // Curled tail rising on the right.
      'M88 60c6-8 14-6 14 0s-8 8-14 4Z',
    ],
  },
  {
    id: 'kitten',
    nameHebrew: 'חתלתול',
    emoji: '🐱',
    cookieCost: 35,
    soundTone: 700,
    fill: '#e9d5ff',
    viewBox: STAGE,
    body: [
      // Slim, arched body.
      'M34 88c-10 0-14-8-14-16s8-14 18-14h30c10 0 18 6 18 14s-4 16-14 16H34Z',
      'M36 86h7v12h-7Z',
      'M76 86h7v12h-7Z',
    ],
    features: [
      'M32 56a13 13 0 1 1 0-26 13 13 0 0 1 0 26Z',
      // Two pointed ears of clearly different sizes.
      'M22 34l-4-14 13 8Z',
      'M44 32l2-13-11 7Z',
      // Long tail curving up to the right.
      'M86 66c10-6 16 4 12 12s-14 0-12-12Z',
    ],
  },
  {
    id: 'duckling',
    nameHebrew: 'ברווזון',
    emoji: '🦆',
    cookieCost: 55,
    soundTone: 760,
    fill: '#fef08a',
    viewBox: STAGE,
    body: [
      // Low, rounded duck body.
      'M36 88c-14 0-22-8-22-16s10-16 26-16h24c12 0 20 6 20 14s-8 18-22 18H36Z',
      // Tail feathers flipping up at the back.
      'M96 60c6-6 10-2 8 4s-8 6-8-4Z',
    ],
    features: [
      'M38 58a12 12 0 1 1 0-24 12 12 0 0 1 0 24Z',
      // Wide bill jutting left.
      'M18 50c-8-1-8 8 0 8s10-6 0-8Z',
      // One wing detail on the side.
      'M50 66c6-4 12 0 10 6s-12 4-10-6Z',
    ],
  },
];

export function findAnimal(id: string): FarmAnimal | undefined {
  return FARM_ANIMALS.find((animal) => animal.id === id);
}
