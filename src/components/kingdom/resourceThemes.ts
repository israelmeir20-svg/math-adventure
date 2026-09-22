/**
 * Resource tile palettes + theme resolution.
 * Split from tileThemes so each file stays small and focused.
 */
import type { HexTileType, ResourceId } from '../../types/game.types';
import { TILE_THEMES, type TileTheme } from './tileThemes';

/**
 * A resource tile is recoloured by its `resourceKind`.
 * wood: green, stone: gray, wheat: amber, wool: lime.
 */
export const RESOURCE_TILE_THEMES: Record<ResourceId, TileTheme> = {
  wood: {
    labelHebrew: 'יער',
    face: 'fill-green-300',
    base: 'fill-green-600',
    stroke: 'stroke-green-700',
    ink: 'text-green-900',
    emoji: '🌲',
  },
  stone: {
    labelHebrew: 'מחצבה',
    face: 'fill-slate-300',
    base: 'fill-slate-500',
    stroke: 'stroke-slate-600',
    ink: 'text-slate-900',
    emoji: '🪨',
  },
  wheat: {
    labelHebrew: 'שדה',
    face: 'fill-amber-300',
    base: 'fill-amber-500',
    stroke: 'stroke-amber-600',
    ink: 'text-amber-900',
    emoji: '🌾',
  },
  wool: {
    labelHebrew: 'מרעה',
    face: 'fill-lime-300',
    base: 'fill-lime-500',
    stroke: 'stroke-lime-600',
    ink: 'text-lime-900',
    emoji: '🐑',
  },
};

/** Resolves the theme for a tile, honouring the resource variety. */
export function tileThemeFor(tile: {
  type: HexTileType;
  resourceKind?: ResourceId;
}): TileTheme {
  const base = TILE_THEMES[tile.type];
  if (tile.type !== 'resource' || !tile.resourceKind) return base;
  return RESOURCE_TILE_THEMES[tile.resourceKind] ?? base;
}
