/**
 * Full-body PNG sprites for the rescued animals roaming the town map.
 *
 * Kept separate from `farmAnimalsData.ts` so the farm's SVG shadow art and the
 * town's illustrated sprites can evolve independently - the farm needs
 * silhouetteables, the town needs painted characters.
 */
import rabbit from '../../assets/sprites/rabbit.png';
import lamb from '../../assets/sprites/lamb.png';
import foal from '../../assets/sprites/foal.png';
import puppy from '../../assets/sprites/puppy.png';
import kitten from '../../assets/sprites/kitten.png';
import duckling from '../../assets/sprites/duckling.png';

/** Order matters: walkers inherit route slots and animation delays by index. */
export const ANIMAL_SPRITE_IDS = [
  'rabbit',
  'lamb',
  'foal',
  'puppy',
  'kitten',
  'duckling',
] as const;

const SPRITES: Record<string, string> = {
  rabbit,
  lamb,
  foal,
  puppy,
  kitten,
  duckling,
};

/**
 * Resolves an animal id to its sprite URL.
 *
 * Returns null for unknown or malformed ids so callers can skip rendering
 * instead of showing a broken image or crashing on a stale save.
 */
export function getAnimalSprite(id: string | null | undefined): string | null {
  if (!id || typeof id !== 'string') return null;
  return SPRITES[id] ?? null;
}
