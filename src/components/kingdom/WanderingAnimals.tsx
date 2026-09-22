/**
 * Decorative adopted animals that hop between unlocked tiles.
 * Each animal gets a deterministic route so renders stay stable.
 */
import type { CSSProperties } from 'react';
import type { HexTile } from '../../types/game.types';
import { hexToPixel, pseudoRandom } from './hexGeometry';
import { ANIMAL_EMOJIS } from './tileThemes';

interface WanderingAnimalsProps {
  tiles: HexTile[];
  animals: string[];
}

const MAX_ANIMALS = 6;
const ROUTE_LENGTH = 3;
const HOP_HEIGHT = 26;

export default function WanderingAnimals({ tiles, animals }: WanderingAnimalsProps) {
  if (tiles.length === 0) return null;

  const visible = animals.length > 0 ? animals : Object.keys(ANIMAL_EMOJIS).slice(0, 3);
  const origin = hexToPixel((tiles[0] as HexTile).coordinate);

  return (
    <g className="pointer-events-none">
      {visible.slice(0, MAX_ANIMALS).map((animalId, index) => {
        const route = routeFor(animalId, tiles);
        const style = buildHopStyle(route, origin, animalId, index);
        return (
          <text
            key={animalId}
            textAnchor="middle"
            dominantBaseline="central"
            className="animate-[hop_9s_ease-in-out_infinite] text-[22px] drop-shadow motion-reduce:animate-none"
            style={style}
            transform={`translate(${origin.x} ${origin.y - HOP_HEIGHT})`}
          >
            {ANIMAL_EMOJIS[animalId] ?? '🐾'}
          </text>
        );
      })}
    </g>
  );
}

/** Per-stop translation offsets relative to the shared origin. */
function buildHopStyle(
  route: HexTile[],
  origin: { x: number; y: number },
  animalId: string,
  index: number,
): CSSProperties {
  const offsets: string[] = [];
  for (let step = 0; step < ROUTE_LENGTH; step += 1) {
    const tile = route[step % route.length] as HexTile | undefined;
    const point = tile ? hexToPixel(tile.coordinate) : origin;
    offsets.push(
      `${(point.x - origin.x).toFixed(1)}px, ${(point.y - HOP_HEIGHT - origin.y).toFixed(1)}px`,
    );
  }
  const [first, second, third] = [
    offsets[0] ?? '0px, 0px',
    offsets[1] ?? offsets[0] ?? '0px, 0px',
    offsets[2] ?? offsets[0] ?? '0px, 0px',
  ];

  return {
    '--hop-x0': first.split(',')[0],
    '--hop-y0': first.split(',')[1],
    '--hop-x1': second.split(',')[0],
    '--hop-y1': second.split(',')[1],
    '--hop-x2': third.split(',')[0],
    '--hop-y2': third.split(',')[1],
    animationDelay: `${(pseudoRandom(animalId, index) * 4).toFixed(2)}s`,
  } as CSSProperties;
}

/** Rotating slice of tiles, offset per animal so routes differ. */
function routeFor(animalId: string, tiles: HexTile[]): HexTile[] {
  const offset = Math.floor(pseudoRandom(animalId, 7) * tiles.length);
  return Array.from({ length: Math.min(ROUTE_LENGTH, tiles.length) }, (_, step) => {
    return tiles[(offset + step) % tiles.length] as HexTile;
  });
}
