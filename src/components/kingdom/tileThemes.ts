/**
 * Presentation metadata for each hex tile type + a handful of visual constants.
 * Kept separate from geometry so theming stays in one place.
 */
import type { HexTileType, ResourceId } from '../../types/game.types';

export interface TileTheme {
  labelHebrew: string;
  /** Tailwind classes applied to the hex body. */
  face: string;
  /** Tailwind classes for the darker 3D base layer under the face. */
  base: string;
  /** Tailwind classes for the crisp outline. */
  stroke: string;
  /** Tailwind text colour for icons on the tile. */
  ink: string;
  /** Emoji used as the "building" mark (kept dependency-free). */
  emoji: string;
}

export const TILE_THEMES: Record<HexTileType, TileTheme> = {
  street: {
    labelHebrew: 'רחוב',
    face: 'fill-orange-300',
    base: 'fill-orange-500',
    stroke: 'stroke-orange-600',
    ink: 'text-orange-900',
    emoji: '🛣️',
  },
  cookieBakery: {
    labelHebrew: 'מאפיית עוגיות',
    face: 'fill-rose-300',
    base: 'fill-rose-500',
    stroke: 'stroke-rose-600',
    ink: 'text-rose-900',
    emoji: '🍪',
  },
  pizzaBakery: {
    labelHebrew: 'מאפיית פיצה',
    face: 'fill-red-300',
    base: 'fill-red-500',
    stroke: 'stroke-red-600',
    ink: 'text-red-900',
    emoji: '🍕',
  },
  kiosk: {
    labelHebrew: 'קיוסק',
    face: 'fill-teal-300',
    base: 'fill-teal-500',
    stroke: 'stroke-teal-600',
    ink: 'text-teal-900',
    emoji: '🏪',
  },
  truckHub: {
    labelHebrew: 'מרכז המשאיות',
    face: 'fill-blue-300',
    base: 'fill-blue-500',
    stroke: 'stroke-blue-600',
    ink: 'text-blue-900',
    emoji: '🚚',
  },
  farm: {
    labelHebrew: 'חווה',
    face: 'fill-emerald-300',
    base: 'fill-emerald-500',
    stroke: 'stroke-emerald-600',
    ink: 'text-emerald-900',
    emoji: '🚜',
  },
  bridge: {
    labelHebrew: 'גשר',
    face: 'fill-purple-300',
    base: 'fill-purple-500',
    stroke: 'stroke-purple-600',
    ink: 'text-purple-900',
    emoji: '🌉',
  },
  resource: {
    labelHebrew: 'בית מלאכה',
    face: 'fill-lime-300',
    base: 'fill-lime-500',
    stroke: 'stroke-lime-600',
    ink: 'text-lime-900',
    emoji: '🧩',
  },
};

/**
 * A resource tile is recoloured by its `resourceKind` - see `resourceThemes.ts`.
 */

/** Resources shown in the top bar, in RTL-friendly order. */
export const RESOURCE_META: { id: ResourceId; labelHebrew: string; emoji: string }[] = [
  { id: 'wood', labelHebrew: 'עץ', emoji: '🌲' },
  { id: 'stone', labelHebrew: 'אבן', emoji: '🪨' },
  { id: 'wheat', labelHebrew: 'חיטה', emoji: '🌾' },
  { id: 'wool', labelHebrew: 'צמר', emoji: '🐑' },
];

/**
 * Animals that wander on unlocked tiles.
 * Keys must match the ids in `farmAnimalsData` so rescued animals render.
 */
export const ANIMAL_EMOJIS: Record<string, string> = {
  fox: '🦊',
  owl: '🦉',
  frog: '🐸',
  hedgehog: '🦔',
  turtle: '🐢',
  firefly: '✨',
  rabbit: '🐰',
  lamb: '🐑',
  foal: '🐴',
  puppy: '🐶',
  kitten: '🐱',
  duckling: '🦆',
};

/** Cost (in cookies) to unlock a tile - unlocks get pricier by level. */
export const unlockCost = (level: number): number => 10 * level;

export const STREAK_BADGE_THRESHOLD = 3;
