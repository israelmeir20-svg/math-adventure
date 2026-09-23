/* eslint-disable react-refresh/only-export-components */
/**
 * Multi-user profiles: WHO IS PLAYING, kept apart from WHAT THEY HAVE DONE.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setActiveProfileForProgress } from '../features/progression/useStationProgress';

const STORAGE_KEY = 'MATH_ADVENTURE_PROFILES_V1';

export type ProfileMedal = 'bronze' | 'silver' | 'gold';

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  streak: number;
  medals: Record<string, ProfileMedal>;
  stickers: string[];
}

export type ProfilePatch = Partial<Pick<Profile, 'name' | 'avatar'>>;

export interface ProfileContextValue {
  profiles: Profile[];
  activeProfileId: string;
  activeProfile: Profile;
  addProfile: (name: string, avatar: string) => string;
  switchProfile: (id: string) => void;
  updateActiveProfile: (data: ProfilePatch) => void;
}

const STARTING_NAME = 'שחקן 1';
const STARTING_AVATAR = '🦊';

export const AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐙', '🐝', '🦄', '🐧'] as const;

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

interface StoredProfiles {
  profiles: Profile[];
  activeProfileId: string;
}

function defaultState(): StoredProfiles {
  const first = makeProfile(STARTING_NAME, STARTING_AVATAR);
  return { profiles: [first], activeProfileId: first.id };
}

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

  if (profiles.length === 0) return defaultState();

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
  const [directory, setDirectory] = useState<StoredProfiles>(loadProfiles);

  // Persists profile directory whenever it changes or initializes
  useEffect(() => {
    saveProfiles(directory);
  }, [directory]);

  // Points the progression store at the active profile
  useEffect(() => {
    setActiveProfileForProgress(directory.activeProfileId);
  }, [directory.activeProfileId]);

  const addProfile = useCallback((name: string, avatar: string): string => {
    const profile = makeProfile(name, avatar);
    setDirectory((current) => ({
      profiles: [...current.profiles, profile],
      activeProfileId: profile.id,
    }));
    return profile.id;
  }, []);

  const switchProfile = useCallback((id: string) => {
    setDirectory((current) =>
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

export function useProfiles(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfiles must be used inside a ProfileProvider');
  return value;
}