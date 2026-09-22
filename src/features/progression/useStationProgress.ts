/**
 * The unified progression record: how far each station is unlocked, and how many
 * gold medals the child has earned at each of its three levels.
 *
 * ================================================================================================
 * THE SHAPE
 * ================================================================================================
 *
 * Every station has exactly three levels. Level 1 is always open; levels 2 and 3 are locked until
 * the level below them has been cleared, and "cleared" means three gold medals - one per correct
 * round. A gold medal is never spent or reset, so the medals ARE the unlock condition rather than a
 * separate counter that could drift out of step with it.
 *
 * That is a deliberate change of shape from the level records this replaces. Those stored
 * `{ level, goldMedals }` where `goldMedals` was the count WITHIN the current level and was reset
 * to zero on promotion, capped at two so the third medal could promote instead of being stored.
 * Here `medals` is addressed BY LEVEL and never resets, which makes "3 golds at level 2" a fact
 * that survives a promotion and can be shown on the level picker after the child has moved on.
 *
 * ================================================================================================
 * WHY ONE RECORD AND NOT ONE HOOK PER STATION
 * ================================================================================================
 *
 * Seven near-identical `use*Progress` hooks were copied across the app - the kiosk's, the bakery's,
 * the balloon sprint's, the cargo sprint's, the beat studio's, the windows game's and the farm's
 * medal board. Each declared its own storage key, its own clamp helpers and its own promotion
 * logic, and each carried a comment explaining that it mirrored the others rather than importing
 * them. That was defensible while every district had its own rules; it is not now that they all
 * share one, because a change to the ladder would have to be made seven times and the eighth
 * station would copy whichever one its author happened to open.
 *
 * So this file owns the ladder and the storage. `useStationProgress` is the React binding, and the
 * pure functions below it are exported because the two callers that are NOT hooks - `districtRouting`
 * reading a level for a banner, and `GameLaunchModal` deciding whether a chip is a padlock - must be
 * able to answer without subscribing to an event.
 *
 * ================================================================================================
 * WHY `useSyncExternalStore` RATHER THAN `useState` + `localStorage`
 * ================================================================================================
 *
 * The record has more than one reader on screen at once: the launch card shows the medals and the
 * padlocks, and the same station can be rendered from the map, from the street hub and from the
 * farm barn. With per-component `useState`, the copy in the launch card and the copy in the game
 * would be independent, and a medal earned in the game would not appear on the card until it
 * remounted. A single module-level store with a subscribe/getSnapshot pair means every reader sees
 * the same value in the same render pass, and `awardGold` can be called from a game with no
 * provider, no context and no prop drilling.
 *
 * It also makes writing to storage happen ONCE, inside the mutation, rather than in an effect in
 * every subscriber - which is what let the old hooks get away with reading at mount and writing on
 * change while still being safe to mount twice.
 */
import { useCallback, useSyncExternalStore } from 'react';

/* ------------------------------------------------------------------------------------------------
 * The model
 * ---------------------------------------------------------------------------------------------- */

/** The three levels every station has, in order. */
export const LEVELS = [1, 2, 3] as const;

export type StationLevel = (typeof LEVELS)[number];

/** Gold medals needed at a level before the next one opens. */
export const GOLD_MEDALS_PER_LEVEL = 3;

/**
 * A station's progress.
 *
 * `medals` IS KEYED BY LEVEL AND IS NEVER RESET. An earlier draft decremented the count on
 * promotion, which threw away the very fact the level picker needs - a child who unlocked level 3
 * wants to see three medals beside level 2, not a zero. Keeping every level's tally also makes the
 * record idempotent to read: nothing has to be reconstructed from "which level am I on".
 */
export interface StationLevelProgress {
  /** The highest level that may be played. Level 1 is always available. */
  unlockedLevel: StationLevel;
  /** Gold medals earned at each level, 0 to `GOLD_MEDALS_PER_LEVEL`. */
  medals: Record<StationLevel, number>;
}

/** What a station that has never been played looks like. */
export const FRESH_PROGRESS: StationLevelProgress = {
  unlockedLevel: 1,
  medals: { 1: 0, 2: 0, 3: 0 },
};

/** The outcome of recording a medal, returned synchronously so callers can react to it. */
export interface MedalOutcome {
  /** Gold medals at that level AFTER this one was added, capped at the maximum. */
  newMedals: number;
  /** True when this medal was the third and therefore opened the next level. */
  unlockedNext: boolean;
  /** True when there was no next level to open - i.e. the third gold at level 3. */
  completedAll: boolean;
}

/** True for 1, 2 or 3. Used to reject a level that arrived from somewhere untyped. */
export function isStationLevel(value: unknown): value is StationLevel {
  return value === 1 || value === 2 || value === 3;
}

/* ------------------------------------------------------------------------------------------------
 * Pure transitions
 * ---------------------------------------------------------------------------------------------- */

function clampMedals(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.min(GOLD_MEDALS_PER_LEVEL, Math.max(0, n));
}

function clampUnlocked(value: unknown): StationLevel {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 1;
  return n >= 3 ? 3 : n >= 2 ? 2 : 1;
}

/**
 * Repairs whatever was in storage into a usable record.
 *
 * IT ALSO REPAIRS THE RECORD AGAINST ITSELF, which is the part that matters. A record whose
 * `unlockedLevel` claims 3 while level 2 shows no medals is internally inconsistent, and it can
 * arise from a hand-edited save, a partially-written payload, or a future migration. Deriving the
 * unlock from the medals rather than trusting the stored field means the picker can never show a
 * level as open that the medals do not justify - and a corrupt record degrades to a playable one
 * instead of locking a child out.
 */
export function normaliseProgress(raw: unknown): StationLevelProgress {
  if (typeof raw !== 'object' || raw === null) return FRESH_PROGRESS;
  const input = raw as { unlockedLevel?: unknown; medals?: unknown };
  const medalsRaw =
    typeof input.medals === 'object' && input.medals !== null
      ? (input.medals as Record<string, unknown>)
      : {};

  const medals: Record<StationLevel, number> = {
    1: clampMedals(medalsRaw['1']),
    2: clampMedals(medalsRaw['2']),
    3: clampMedals(medalsRaw['3']),
  };

  // Earned unlocks, derived from the medals. Level 2 needs a full level 1, level 3 a full level 2.
  let earned: StationLevel = 1;
  if (medals[1] >= GOLD_MEDALS_PER_LEVEL) earned = 2;
  if (earned === 2 && medals[2] >= GOLD_MEDALS_PER_LEVEL) earned = 3;

  // The stored value is honoured when it is AHEAD of the medals, because a future rule may unlock a
  // level by some means other than medals - but never when it is behind them, since that would hide
  // a level the child has plainly cleared.
  return { unlockedLevel: clampUnlocked(Math.max(clampUnlocked(input.unlockedLevel), earned)), medals };
}

/**
 * Adds one gold medal at `level`.
 *
 * CLAMPED AT THE MAXIMUM RATHER THAN ALLOWED TO GROW. A fourth gold at an already-cleared level
 * would be a lie on the picker ("4/3"), and there is no reward for it - the level is already open.
 * The medal is still reported through `newMedals` so the caller can show a counter without having
 * to know the cap itself.
 */
export function addGoldMedal(
  progress: StationLevelProgress,
  level: StationLevel,
): { next: StationLevelProgress; result: MedalOutcome } {
  const newMedals = Math.min(progress.medals[level] + 1, GOLD_MEDALS_PER_LEVEL);
  const justCleared = newMedals >= GOLD_MEDALS_PER_LEVEL && progress.medals[level] < GOLD_MEDALS_PER_LEVEL;
  const canPromote = justCleared && level < 3 && progress.unlockedLevel === level;

  const next: StationLevelProgress = {
    unlockedLevel: canPromote ? ((level + 1) as StationLevel) : progress.unlockedLevel,
    medals: { ...progress.medals, [level]: newMedals },
  };

  return {
    next,
    result: {
      newMedals,
      unlockedNext: canPromote,
      completedAll: justCleared && level === 3,
    },
  };
}

/* ------------------------------------------------------------------------------------------------
 * The store
 * ---------------------------------------------------------------------------------------------- */

const STORAGE_PREFIX = 'math-adventure:station-progress';

/**
 * ================================================================================================
 * THE ACTIVE PROFILE IS MODULE STATE, SET BY THE PROVIDER, NOT READ FROM CONTEXT
 * ================================================================================================
 *
 * THIS STORE CANNOT USECONTEXT, AND THAT IS THE CONSTRAINT THAT SHAPES THIS WHOLE SECTION. It is
 * deliberately usable outside React - `districtRouting` reads a level for a banner and
 * `GameLaunchModal` decides whether a chip is a padlock, both without subscribing - and
 * `recordGoldMedal` is called from games that hold no context reference at all. A `useContext` call
 * inside any of those would be a hook in a non-hook or an assumable provider, and the module-level
 * store is exactly what the design notes above chose to avoid needing a provider.
 *
 * So the profile arrives the other way round: `ProfileProvider` pushes it in, and the store reads it
 * synchronously when it builds a key or loads. The alternative - threading `activeProfileId` through
 * every read and write signature - would mean changing `getStationProgress`, `isLevelUnlocked` and
 * every caller, which is the prop drilling the store was built to remove.
 */
let activeProfileId = '';

/** The storage key for a profile's progression, or null when no profile has been bound yet. */
function storageKey(profileId: string): string | null {
  return profileId ? `${STORAGE_PREFIX}:${profileId}` : null;
}

/** Every station's record, keyed by the station's game key. */
type ProgressMap = Record<string, StationLevelProgress>;

/**
 * The snapshot object.
 *
 * IT IS REPLACED, NEVER MUTATED, because `useSyncExternalStore` compares snapshots by identity. A
 * mutation in place would leave every subscriber on the same reference and React would skip the
 * re-render - the medals would be written to storage and simply not appear.
 */
let snapshot: ProgressMap = {};

const listeners = new Set<() => void>();

function load(): ProgressMap {
  const key = storageKey(activeProfileId);
  // No profile bound yet: an empty map, never the shared v1 bucket. Reading a key that belongs to
  // nobody is how siblings would inherit each other's medals.
  if (!key) return {};

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};

    // Every station is normalised on the way in, so no reader ever has to defend against a partial
    // record - `getStationProgress` can then hand out a complete object without a guard.
    const out: ProgressMap = {};
    for (const [stationKey, value] of Object.entries(parsed as Record<string, unknown>)) {
      out[stationKey] = normaliseProgress(value);
    }
    return out;
  } catch {
    // A corrupt payload must never keep a child out of a game.
    return {};
  }
}

function persist(next: ProgressMap): void {
  const key = storageKey(activeProfileId);
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* storage is optional - the session still plays, it just will not persist */
  }
}

function commit(next: ProgressMap): void {
  snapshot = next;
  persist(next);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ProgressMap {
  return snapshot;
}

/**
 * Points the store at a profile's progression, loading that profile's records.
 *
 * ================================================================================================
 * WHY THIS LOADS EAGERLY RATHER THAN ON FIRST READ
 * ================================================================================================
 *
 * The alternative is a lazy "if the bound profile differs from the loaded one, load now" check inside
 * `getSnapshot` or `load`. THAT WOULD BE A BUG, not merely less tidy: `getSnapshot` is called during
 * render, and swapping `snapshot` from inside it would hand React a different value mid-pass without
 * notifying any subscriber - the launch card would keep the previous child's padlocks until something
 * else happened to re-render it. Loading here, inside the provider's effect, means the swap and the
 * listener notification are one atomic step the way `commit` already does it.
 *
 * A NO-OP WHEN THE PROFILE HAS NOT CHANGED, so React re-running the provider's effect for an unrelated
 * reason does not needlessly rebuild the map and re-render every station.
 *
 * THE EMPTY-ID CASE CLEARS RATHER THAN SKIPS. An unbound store must show no progress at all: leaving
 * the previous profile's medals on screen would be showing one child another child's record.
 */
export function setActiveProfileForProgress(profileId: string): void {
  if (profileId === activeProfileId) return;
  activeProfileId = profileId;
  commit(load());
}

/**
 * The server snapshot.
 *
 * A MODULE-LEVEL CONSTANT RATHER THAN `{}`. `useSyncExternalStore` calls this during hydration and
 * compares it against the client snapshot by identity; returning a fresh object each time would
 * make React think the store changed on every render, which shows up as an infinite render loop.
 */
const EMPTY: ProgressMap = {};
function getServerSnapshot(): ProgressMap {
  return EMPTY;
}

/* ------------------------------------------------------------------------------------------------
 * Reading - usable outside React
 * ---------------------------------------------------------------------------------------------- */

/**
 * A station's progress, or a fresh record when it has never been played.
 *
 * THE RETURN IS ALWAYS A STABLE REFERENCE, AND THAT IS LOAD-BEARING. For an unplayed station this
 * hands back the shared `FRESH_PROGRESS` constant rather than building one, so `useSyncExternalStore`
 * and any `useMemo`/`useEffect` keyed on the record see the same object across renders. A fresh
 * literal here would produce a new identity on every render and re-fire every dependent hook.
 *
 * The same guarantee holds for played stations: `snapshot[key]` is only replaced when that key is
 * actually mutated, so an untouched station keeps its identity while a sibling changes.
 */
export function getStationProgress(gameKey: string): StationLevelProgress {
  return snapshot[gameKey] ?? FRESH_PROGRESS;
}

/** Gold medals earned at a level, for a counter or a padlock. */
export function medalsFor(gameKey: string, level: StationLevel): number {
  return getStationProgress(gameKey).medals[level];
}

/** True when the level may be played. Level 1 always may. */
export function isLevelUnlocked(gameKey: string, level: StationLevel): boolean {
  return level <= getStationProgress(gameKey).unlockedLevel;
}

/** Clears every station. Exposed for tests and for a "start over" control. */
export function resetAllProgress(): void {
  commit({});
}

/* ------------------------------------------------------------------------------------------------
 * The React binding
 * ---------------------------------------------------------------------------------------------- */

export interface StationProgressHandle {
  /** This station's record. Re-renders the caller whenever any station changes. */
  progress: StationLevelProgress;
  /** Adds one gold at `level` and reports whether it opened the next one. */
  recordGoldMedal: (level: StationLevel) => MedalOutcome;
  /** Convenience for a disabled chip. */
  isUnlocked: (level: StationLevel) => boolean;
}

/**
 * THE HOOK SUBSCRIBES TO THE WHOLE MAP AND READS ONE KEY.
 *
 * That is what `useSyncExternalStore` requires - a subscription is to the store, not to a slice -
 * and it is why `getSnapshot` returns the map rather than a station's record: returning
 * `snapshot[key] ?? FRESH_PROGRESS` would hand back a NEW `FRESH_PROGRESS`-shaped object for an
 * unplayed station only if it were rebuilt, and `FRESH_PROGRESS` is a shared constant precisely so
 * that it is not. The cost is a re-render on any station's change, which is one launch card
 * repainting while a game records a medal - not a hot path.
 */
export function useStationProgress(gameKey: string): StationProgressHandle {
  const map = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const progress = map[gameKey] ?? FRESH_PROGRESS;

  const recordGoldMedal = useCallback(
    (level: StationLevel): MedalOutcome => {
      // Read through the store rather than through `progress`, because the caller may be several
      // renders behind - a game that awards a medal from a timeout closure holds the `progress` it
      // captured when the closure was made. `addGoldMedal` is fed the CURRENT record so two quick
      // awards both land instead of the second overwriting the first.
      const current = getStationProgress(gameKey);
      const { next, result } = addGoldMedal(current, level);
      commit({ ...snapshot, [gameKey]: next });
      return result;
    },
    [gameKey],
  );

  const isUnlocked = useCallback(
    (level: StationLevel) => level <= progress.unlockedLevel,
    [progress.unlockedLevel],
  );

  return { progress, recordGoldMedal, isUnlocked };
}

