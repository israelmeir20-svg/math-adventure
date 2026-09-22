/**
 * localStorage read/write with defensive fallbacks.
 * Runs on the server / in tests without a `window` too.
 *
 * ================================================================================================
 * SAVES ARE KEYED BY PROFILE
 * ================================================================================================
 *
 * Every function here takes the active profile id and resolves it to its own storage key, so siblings
 * sharing one machine cannot see or overwrite each other's world. There is no shared fallback key: a
 * profile with no save yet simply starts from defaults, because an unattached save is by definition
 * someone else's and inheriting it is exactly the bug this scoping exists to prevent.
 */
import { createDefaultState, type GameState } from './gameState';

/**
 * Builds the storage key for a profile.
 *
 * THE PROFILE ID IS THE ONLY THING SEPARATING TWO PLAYERS, so this is the one place that decides it, and
 * every read, write and clear goes through it. An empty id would produce a key ending in a bare colon -
 * a shared bucket that silently re-merges everyone's progress - so it is rejected here rather than left
 * to the caller to remember.
 */
export function saveKeyFor(profileId: string): string {
  if (!profileId) throw new Error('saveKeyFor requires a profile id');
  return `math-adventure:save:${profileId}`;
}

/** Merges a partial/stale save over fresh defaults, deep-merging inventory. */
export function loadState(profileId: string): GameState {
  if (typeof window === 'undefined') return createDefaultState();

  let parsed: Partial<GameState> | null = null;
  try {
    const raw = window.localStorage.getItem(saveKeyFor(profileId));
    parsed = raw ? (JSON.parse(raw) as Partial<GameState>) : null;
  } catch {
    return createDefaultState();
  }
  if (!parsed) return createDefaultState();

  const defaults = createDefaultState();
  return {
    ...defaults,
    ...parsed,
    inventory: {
      ...defaults.inventory,
      ...parsed.inventory,
      resources: { ...defaults.inventory.resources, ...parsed.inventory?.resources },
      lifelines: { ...defaults.inventory.lifelines, ...parsed.inventory?.lifelines },
    },
    streak: { ...defaults.streak, ...parsed.streak },
    tiles: mergeTiles(defaults.tiles, parsed.tiles),
    tileOrder: mergeTileOrder(defaults.tileOrder, parsed.tileOrder),
    mistakes: parsed.mistakes ?? defaults.mistakes,
  };
}

/**
 * Merges freshly-created default tiles into a saved tile map.
 *
 * Without this, a save written before a district existed would permanently
 * hide it: the stored `tiles` object simply has no entry for the new key, so
 * the tile never renders on the map (and `tileOrder` never lists it).
 * Saved tiles always win, so player progress is never overwritten.
 */
function mergeTiles(
  defaults: GameState['tiles'],
  saved: GameState['tiles'] | undefined,
): GameState['tiles'] {
  if (!saved) return defaults;

  const merged: GameState['tiles'] = { ...saved };
  for (const id of Object.keys(defaults)) {
    if (!merged[id]) {
      merged[id] = defaults[id] as GameState['tiles'][string];
    }
  }
  return merged;
}

/** Keeps the saved order, then appends any newly-introduced tile keys. */
function mergeTileOrder(
  defaults: string[],
  saved: string[] | undefined,
): string[] {
  if (!saved) return defaults;

  const order = [...saved];
  for (const id of defaults) {
    if (!order.includes(id)) order.push(id);
  }
  return order;
}

export function saveState(profileId: string, state: GameState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(saveKeyFor(profileId), JSON.stringify(state));
  } catch {
    /* storage full or unavailable - keep playing from memory */
  }
}

export function clearSave(profileId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(saveKeyFor(profileId));
  } catch {
    /* ignore */
  }
}
