/**
 * Adopted animals hopping along the open paths of the town illustration.
 * Reuses the `hop` keyframes but drives them with percentage offsets, since the
 * map overlay is sized in percentages rather than SVG user units.
 */
import type { CSSProperties } from 'react';
import { ANIMAL_EMOJIS } from '../kingdom/tileThemes';
import type { PlacedTile } from './townLocations';

const MAX_ANIMALS = 5;
const MIN_STOPS = 3;

interface TownAnimalsProps {
  placed: PlacedTile[];
  animals: string[];
}

export default function TownAnimals({ placed, animals }: TownAnimalsProps) {
  const route = placed.filter((entry) => entry.tile.isUnlocked);
  if (route.length < MIN_STOPS) return null;

  const visible =
    animals.length > 0 ? animals : Object.keys(ANIMAL_EMOJIS).slice(0, 2);

  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden>
      {visible.slice(0, MAX_ANIMALS).map((animalId, index) => (
        <span
          key={animalId}
          className="absolute animate-[hop_11s_ease-in-out_infinite] text-xl drop-shadow motion-reduce:animate-none"
          style={hopStyle(route, animalId, index)}
        >
          {ANIMAL_EMOJIS[animalId] ?? '🐾'}
        </span>
      ))}
    </div>
  );
}

/**
 * Builds the three-stop percentage hop for one animal, offset along the route
 * so the animals never travel in lockstep.
 */
function hopStyle(
  route: PlacedTile[],
  animalId: string,
  index: number,
): CSSProperties {
  const stride = route.length;
  const start = (hash(animalId) + index * 3) % stride;
  const stops = [0, 1, 2].map((step) => route[(start + step * 2) % stride]);

  const at = (step: number): string => {
    const entry = stops[step] ?? stops[0];
    if (!entry) return '0%, 0%';
    return `${entry.spot.x.toFixed(1)}%, ${entry.spot.y.toFixed(1)}%`;
  };

  const [x0, y0] = at(0).split(', ');
  const [x1, y1] = at(1).split(', ');
  const [x2, y2] = at(2).split(', ');

  return {
    left: 0,
    top: 0,
    '--hop-x0': x0,
    '--hop-y0': y0,
    '--hop-x1': x1,
    '--hop-y1': y1,
    '--hop-x2': x2,
    '--hop-y2': y2,
    animationDelay: `${((hash(animalId) % 7) * 0.6).toFixed(2)}s`,
  } as CSSProperties;
}

/** Small stable string hash so each animal keeps its own route. */
function hash(value: string): number {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) {
    result = (result * 31 + value.charCodeAt(i)) % 997;
  }
  return result;
}
