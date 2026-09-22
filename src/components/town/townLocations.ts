/**
 * Hotspot metadata anchoring each district to a spot on the town illustration.
 *
 * The illustration is hand-drawn, so the ordering of the tile types below is
 * the layout order of the village: farm on the left, then the bridge, the
 * central crossroads and its buildings, out to the pizza bakery on the right.
 */
import type { HexTile, HexTileType } from '../../types/game.types';

/** Extra ring tiles attach to the district they sit nearest to. */
export type HotspotKind = HexTileType | 'extra';

export interface Hotspot {
  x: number;
  y: number;
  /** Hitbox size in % of the map, centred on x/y. */
  width: number;
  height: number;
  kind: HotspotKind;
  labelHebrew: string;
}

/** Baked-in hotspots, matched to the illustrated layout. */
export const TOWN_HOTSPOTS: Hotspot[] = [
  { x: 17, y: 26, width: 12, height: 14, kind: 'farm', labelHebrew: 'החווה' },
  { x: 12, y: 68, width: 12, height: 12, kind: 'truckHub', labelHebrew: 'תחנת המשלוחים' },
  /*
   * THE BRIDGE MARKER SITS ON THE BRIDGE DECK, NOT IN THE RIVER.
   *
   * At `{ x: 38, y: 52 }` the pin floated in the water just below and left of the
   * span, which read as a marker for the river rather than for the crossing - and on
   * the water it also competed with the duckling already bobbing there. Raised onto
   * the deck (`y: 44`) and nudged downstream (`x: 41`), it now sits squarely over the
   * wooden span it opens, clear of both the river and the farm's edge.
   */
  { x: 41, y: 44, width: 10, height: 10, kind: 'bridge', labelHebrew: 'גשר השומר המבולבל' },
  { x: 52, y: 60, width: 12, height: 10, kind: 'street', labelHebrew: 'רחוב' },
  { x: 59, y: 46, width: 11, height: 13, kind: 'cookieBakery', labelHebrew: 'מאפיית העוגיות' },
  { x: 74, y: 52, width: 12, height: 12, kind: 'kiosk', labelHebrew: 'הקיוסק' },
  { x: 91, y: 50, width: 11, height: 13, kind: 'pizzaBakery', labelHebrew: 'מאפיית הפיצה' },
  { x: 79, y: 24, width: 10, height: 12, kind: 'resource', labelHebrew: 'בית מלאכה' },
];

/**
 * Column-first ordering of the outer ring. It follows the village nearly
 * left-to-right, which keeps neighbouring extras spread apart instead of
 * bunching every overflow pin onto a single building.
 */
export const EXTRA_ORDER: readonly HotspotKind[] = [
  'street',
  'bridge',
  'cookieBakery',
  'kiosk',
  'truckHub',
  'farm',
  'pizzaBakery',
  'resource',
];

export interface PlacedTile {
  tile: HexTile;
  spot: Hotspot;
}

const MAX_EXTRA_PER_KIND = 2;
const OFFSET_X = 5.5;
const OFFSET_Y = 8;

/**
 * Distributes tiles across the hotspots. Map tiles are assigned in a stable
 * column-first walk so every tile type keeps one district tile at its baked-in
 * coordinates, while tiles of the same type that have nowhere left to go are
 * fanned out around their nearest building.
 */
export function placeTiles(
  tileOrder: readonly string[],
  tiles: Record<string, HexTile>,
): PlacedTile[] {
  const groups = new Map<HexTileType, HexTile[]>();
  tileOrder.forEach((id) => {
    const tile = tiles[id];
    if (!tile) return;
    const bucket = groups.get(tile.type);
    if (bucket) bucket.push(tile);
    else groups.set(tile.type, [tile]);
  });

  const placed: PlacedTile[] = [];
  const queue: { spot: Hotspot; owners: HexTile[] }[] = [];

  TOWN_HOTSPOTS.forEach((spot) => {
    const owners = groups.get(spot.kind as HexTileType) ?? [];
    const tile = owners.shift();
    if (tile) placed.push({ tile, spot });
    queue.push({ spot, owners });
  });

  // Ring order decides which district absorbs the leftover tiles.
  EXTRA_ORDER.forEach((kind) => {
    const owners = groups.get(kind as HexTileType) ?? [];
    while (owners.length > 0) {
      const target = queue
        .filter((candidate) => candidate.owners.length < MAX_EXTRA_PER_KIND)
        .sort((a, b) => a.owners.length - b.owners.length)[0];
      if (!target) return;

      const tile = owners.shift();
      if (!tile) return;

      target.owners.push(tile);
      const index = target.spot.kind === kind ? 1 : 0;
      const dx = index === 0 ? OFFSET_X : -OFFSET_X;
      const dy = target.owners.length * OFFSET_Y - OFFSET_Y;
      placed.push({
        tile,
        spot: {
          ...target.spot,
          x: clamp(target.spot.x + dx),
          y: clamp(target.spot.y + dy),
          kind,
        },
      });
    }
  });

  return placed;
}

const clamp = (value: number): number => Math.min(94, Math.max(6, value));
