/* eslint-disable react-refresh/only-export-components */
/**
 * Multi-user profiles: WHO IS PLAYING, kept apart from WHAT THEY HAVE DONE.
 *
 * ================================================================================================
 * WHY THIS IS A SEPARATE STORE FROM `GameContext`
 * ================================================================================================
 *
 * `GameContext` owns one child's whole world - cookies, tiles, streaks, inventory - and persists it under
 * its own key. Profile identity is a different axis: it has to be readable BEFORE any of that is loaded,
 * because it is what decides WHICH save to load. Folding it in would mean the game store had to know how
 * to load itself zero, one or many times, and every consumer of `useGame` would gain a field it does not
 * care about.
 *
 * So this provider is deliberately small: a list of profiles, which one is active, and the three actions
 * that change either. Step 1 is state and header UI only - no station reads a profile yet.
 *
 * ================================================================================================
 * THE SHAPE IS FORWARD-LOOKING, AND THAT IS WHY IT IS NOT JUST A NAME
 * ================================================================================================
 *
 * `streak`, `medals` and `stickers` are per-profile here rather than borrowed from the game save, even
 * though nothing writes them yet. They are the three things a sibling would most obviously resent
 * inheriting - a streak is personal, medals are the progression ladder, and the sticker album is the
 * collection - so they belong to the profile from the start. Adding them later would mean migrating every
 * existing profile record, which is the expensive way round.
 *
 * `medals` is keyed by station rather than stored as a list of the three tiers, because that is how the
 * progression hook already reads it: `Record<stationKey, medal>` is exactly the shape it asks for.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { setActiveProfileForProgress } from '../features/progression/useStationProgress';

/**
 * The storage key, versioned so a future shape change can migrate rather than guess.
 *
 * IT IS NOT THE `math-adventure:` PREFIX USED BY `persistence.ts`. That prefix is for one child's save;
 * this is the profile directory that outlives any individual save, so it sits deliberately in its own
 * namespace and under the exact root key the brief specifies.
 */
const STORAGE_KEY = 'MATH_ADVENTURE_PROFILES_V1';

/** The three tiers a station medal can be, matching the progression store. */
export type ProfileMedal = 'bronze' | 'silver' | 'gold';

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  streak: number;
  medals: Record<string, ProfileMedal>;
  stickers: string[];
}

/** The fields `updateActiveProfile` may change. Identity and progress are not patchable. */
export type ProfilePatch = Partial<Pick<Profile, 'name' | 'avatar'>>;

export interface ProfileContextValue {
  profiles: Profile[];
  activeProfileId: string;
  /** The active profile, resolved. Never null once the provider has mounted. */
  activeProfile: Profile;
  /** Creates a profile, makes it active, and returns its new id. */
  addProfile: (name: string, avatar: string) => string;
  /** Makes an existing profile active. Ignores an unknown id. */
  switchProfile: (id: string) => void;
  updateActiveProfile: (data: ProfilePatch) => void;
}

/** What a brand new player starts with. */
const STARTING_NAME = 'שחקן 1';
const STARTING_AVATAR = '🦊';

/**
 * The avatars offered when creating a profile.
 *
 * A FIXED SET RATHER THAN AN EMOJI PICKER. The child is choosing "which animal am I", not curating a
 * glyph, and a short list is one tap where a picker is a search problem. They are all faces so they read
 * at the 20px the pill renders them.
 */
export const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐙', '🐝', '🦄', '🐧'] as const;

/** A collision-resistant id without pulling in a uuid dependency. */
function makeId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeProfile(name: string, avatar: string): Profile {
  return {
    id: makeId(),
    name: name.trim() || STARTING_NAME,
    avatar: avatar || STARTING_AVATAR,
    streak: 0,
    medals: {},
    stickers: [],
  };
}

/** The state shape as it is written to storage, so a partial read can be repaired field by field. */
interface StoredProfiles {
  profiles: Profile[];
  activeProfileId: string;
}

function defaultState(): StoredProfiles {
  const first = makeProfile(STARTING_NAME, STARTING_AVATAR);
  return { profiles: [first], activeProfileId: first.id };
}

/**
 * Narrows one unknown value to a Profile, or returns null.
 *
 * EVERY FIELD IS REBUILT RATHER THAN TRUSTED. A stored record can be from an older build, hand-edited, or
 * half-written if the process died mid-save, and a missing `medals` object would crash the first station
 * that reads it. Anything unusable is dropped, and the caller falls back to a fresh profile - losing one
 * profile's cosmetics is recoverable; a white screen on launch is not.
 */
function reviveProfile(value: unknown): Profile | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Partial<Profile>;

  if (typeof raw.id !== 'string' || raw.id === '') return null;

  const medals: Record<string, ProfileMedal> = {};
  if (typeof raw.medals === 'object' && raw.medals !== null) {
    for (const [station, tier] of Object.entries(raw.medals)) {
      if (tier === 'bronze' || tier === 'silver' || tier === 'gold') medals[station] = tier;
    }
  }

  const stickers = Array.isArray(raw.stickers)
    ? raw.stickers.filter((s): s is string => typeof s === 'string')
    : [];

  const streak = typeof raw.streak === 'number' && Number.isFinite(raw.streak) ? raw.streak : 0;

  return {
    id: raw.id,
    name: typeof raw.name === 'string' && raw.name.trim() !== '' ? raw.name : STARTING_NAME,
    avatar: typeof raw.avatar === 'string' && raw.avatar !== '' ? raw.avatar : STARTING_AVATAR,
    streak,
    medals,
    stickers,
  };
}

/**
 * Reads the profile directory, repairing or replacing anything unusable.
 *
 * IT NEVER THROWS AND NEVER RETURNS AN EMPTY LIST. `localStorage` can hold malformed JSON, be disabled by
 * a privacy setting, or be full - and in every one of those cases the child still needs a profile to play
 * with, so the failure path is a fresh default rather than an error.
 */
function loadProfiles(): StoredProfiles {
  if (typeof window === 'undefined') return defaultState();

  let parsed: unknown = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    return defaultState();
  }

  if (typeof parsed !== 'object' || parsed === null) return defaultState();

  const stored = parsed as Partial<StoredProfiles>;
  const profiles = Array.isArray(stored.profiles)
    ? stored.profiles.map(reviveProfile).filter((p): p is Profile => p !== null)
    : [];

  // A directory with no usable profile is the same situation as a corrupt one: start fresh.
  if (profiles.length === 0) return defaultState();

  /*
   * AN ID THAT MATCHES NOTHING FALLS BACK TO THE FIRST PROFILE rather than staying dangling. A save can
   * name a profile that a previous repair dropped, and an active id with no profile behind it would leave
   * `activeProfile` undefined at every call site.
   */
  const first = profiles[0] as Profile;
  const activeProfileId = profiles.some((p) => p.id === stored.activeProfileId)
    ? (stored.activeProfileId as string)
    : first.id;

  return { profiles, activeProfileId };
}

function saveProfiles(state: StoredProfiles): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable - keep playing from memory */
  }
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  /*
   * THE WHOLE DIRECTORY IS ONE PIECE OF STATE, not two.
   *
   * `profiles` and `activeProfileId` are always read and written together - the storage format is one
   * record - so holding them separately would mean two setters that must agree, and a render between them
   * where the active id could name a profile the list does not yet contain.
   */
  const [directory, setDirectory] = useState<StoredProfiles>(loadProfiles);

  /**
   * The first render must not write.
   *
   * `loadProfiles` may have had to repair or replace what was stored, and persisting that repair on mount
   * would overwrite the child's directory before they have done anything. Writing only from the second
   * render onwards means storage is touched by an actual change, never by loading.
   */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    saveProfiles(directory);
  }, [directory]);

  /**
   * Points the station-progression store at the active profile.
   *
   * IT IS BOUND HERE BECAUSE THIS IS THE ONLY PLACE THAT KNOWS A PROFILE CAN CHANGE. The progression store
   * cannot subscribe to context itself (see its own notes: it is deliberately usable outside React) and
   * `GameContext` is the wrong owner - it is loaded FROM the profile, not loaded WITH it. Binding at the
   * provider means the store and the game save switch on the same event, so a child can never see one
   * child's medals above another child's world.
   *
   * THIS EFFECT MUST NOT BE REORDERED BELOW THE ONE ABOVE. The store's swap notifies its subscribers, and
   * doing that before the directory has been written would be harmless but pointless; the ordering matters
   * for the reverse case - a later effect reading progress would observe the previous profile's medals.
   */
  useEffect(() => {
    setActiveProfileForProgress(directory.activeProfileId);
  }, [directory.activeProfileId]);

  const addProfile = useCallback((name: string, avatar: string): string => {
    const profile = makeProfile(name, avatar);
    setDirectory((current) => ({
      profiles: [...current.profiles, profile],
      // Creating a profile is an act of choosing it, so it becomes active immediately.
      activeProfileId: profile.id,
    }));
    return profile.id;
  }, []);

  const switchProfile = useCallback((id: string) => {
    setDirectory((current) =>
      // An unknown id is ignored rather than stored, so the active id never dangles.
      current.profiles.some((p) => p.id === id) ? { ...current, activeProfileId: id } : current,
    );
  }, []);

  const updateActiveProfile = useCallback((data: ProfilePatch) => {
    setDirectory((current) => ({
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === current.activeProfileId
          ? {
              ...profile,
              ...(data.name !== undefined ? { name: data.name.trim() || profile.name } : {}),
              ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
            }
          : profile,
      ),
    }));
  }, []);

  const value = useMemo<ProfileContextValue>(() => {
    /*
     * THE FALLBACK IS UNREACHABLE BUT NOT OPTIONAL. `loadProfiles` guarantees at least one profile and an
     * active id that resolves, so the `??` below can never fire - but TypeScript cannot know that, and
     * asserting with `!` would turn a future invariant break into `undefined` at every call site instead
     * of a working default.
     */
    const activeProfile =
      directory.profiles.find((p) => p.id === directory.activeProfileId) ??
      (directory.profiles[0] as Profile);

    return {
      profiles: directory.profiles,
      activeProfileId: directory.activeProfileId,
      activeProfile,
      addProfile,
      switchProfile,
      updateActiveProfile,
    };
  }, [directory, addProfile, switchProfile, updateActiveProfile]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

/**
 * Reads the profile directory.
 *
 * THROWS OUTSIDE THE PROVIDER rather than returning a default, so a component that forgot to be wrapped
 * fails immediately and loudly at development time instead of silently rendering a phantom player with no
 * way to save.
 */
export function useProfiles(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfiles must be used inside a ProfileProvider');
  return value;
}
