/**
 * Shape + factory helpers for the persisted game state.
 */
import type {
  HexCoordinate,
  HexTile,
  HexTileType,
  MistakeTracker,
  PlayerInventory,
  ResourceId,
  StreakState,
} from '../types/game.types';
import { createMistakeTracker } from '../logic/mistakeTracker';

export interface GameState {
  tiles: Record<string, HexTile>;
  tileOrder: string[];
  inventory: PlayerInventory;
  streak: StreakState;
  mistakes: MistakeTracker;
  totalAnswered: number;
  totalCorrect: number;
  lastActiveTileId: string | null;
}

export const TILE_TYPES: readonly HexTileType[] = [
  'street',
  'cookieBakery',
  'pizzaBakery',
  'kiosk',
  'truckHub',
  'farm',
  'resource',
  'bridge',
];

/** Resource tiles cycle through the four varieties as the map grows. */
export const RESOURCE_CYCLE: readonly ResourceId[] = ['wood', 'stone', 'wheat', 'wool'];

export const tileKey = (q: number, r: number): string => `${q},${r}`;

export function createDefaultInventory(): PlayerInventory {
  return {
    cookies: 0,
    starCookies: 0,
    resources: { wood: 0, stone: 0, wheat: 0, wool: 0 },
    unlockedAnimals: [],
    lifelines: { fiftyFifty: 1, dotGrid: 1, eraser: 1 },
    ownedDecorations: [],
  };
}

/** Starting island - a small ring of axial hex coordinates. */
const DEFAULT_COORDS: readonly HexCoordinate[] = [
  { q: 0, r: 0 },
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  /** River crossing - the Bridge Guard's tile. */
  { q: 1, r: 1 },
];

/** Coordinate that always hosts the bridge, so the guard's gate exists. */
const BRIDGE_COORD: HexCoordinate = { q: 1, r: 1 };

export function createDefaultState(): GameState {
  const tiles: Record<string, HexTile> = {};
  const tileOrder: string[] = [];
  let resourceIndex = 0;

  DEFAULT_COORDS.forEach((coordinate, index) => {
    const id = tileKey(coordinate.q, coordinate.r);
    const isBridge = coordinate.q === BRIDGE_COORD.q && coordinate.r === BRIDGE_COORD.r;
    const type: HexTileType = isBridge
      ? 'bridge'
      : index === 0
        ? 'street'
        : (TILE_TYPES[index % TILE_TYPES.length] as HexTileType | undefined) ??
          'resource';
    const resourceKind: ResourceId | undefined =
      type === 'resource'
        ? RESOURCE_CYCLE[resourceIndex++ % RESOURCE_CYCLE.length]
        : undefined;
    tiles[id] = {
      id,
      coordinate,
      type,
      isUnlocked: index === 0,
      level: 1,
      currentMathProblem: null,
      assignedDecorations: [],
      ...(resourceKind ? { resourceKind } : {}),
    };
    tileOrder.push(id);
  });

  return {
    tiles,
    tileOrder,
    inventory: createDefaultInventory(),
    streak: { multiplier: 1, consecutiveCorrect: 0 },
    mistakes: createMistakeTracker(),
    totalAnswered: 0,
    totalCorrect: 0,
    lastActiveTileId: null,
  };
}

/** Immutably attaches (or clears) the active problem of a tile. */
export function withTileProblem(
  state: GameState,
  tileId: string,
  problem: HexTile['currentMathProblem'],
): GameState {
  const tile = state.tiles[tileId];
  if (!tile) return state;
  return {
    ...state,
    tiles: {
      ...state.tiles,
      [tileId]: { ...tile, currentMathProblem: problem },
    },
  };
}
