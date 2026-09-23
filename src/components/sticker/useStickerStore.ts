/**
 * Sticker-album state: which stickers are unlocked, scoped per player profile.
 *
 * Persisted in localStorage under a profile-specific key.
 * All purchases deduct cookies through `useGame().spendCookies`.
 */
import { useCallback, useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useProfiles } from '../../context/ProfileContext';
import {
  pickWeighted,
  PURCHASABLE_STICKERS,
  type StickerItem,
} from '../../data/stickersData';

/** Cost of one random unowned sticker. */
export const SINGLE_PACK_PRICE = 80;
/** Cost of three, priced at a small discount so the bundle is the sensible buy. */
export const TRIPLE_PACK_PRICE = 220;
/** Paid out when there is nothing left to win, instead of handing back nothing. */
export const DUPLICATE_REFUND = 50;

export function saveKeyForStickers(profileId: string): string {
  return `math-adventure:stickers:${profileId || 'default'}`;
}

function readUnlocked(profileId: string): string[] {
  if (typeof window === 'undefined' || !profileId) return [];
  try {
    const raw = window.localStorage.getItem(saveKeyForStickers(profileId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

function saveUnlocked(profileId: string, stickers: string[]): void {
  if (typeof window === 'undefined' || !profileId) return;
  try {
    window.localStorage.setItem(saveKeyForStickers(profileId), JSON.stringify(stickers));
  } catch {
    /* storage full or unavailable */
  }
}

// Global listener set to keep multiple mounted sticker components in sync
type Listener = () => void;
const listeners = new Set<Listener>();
function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export interface PackResult {
  /** The stickers actually won. Empty when the pool was exhausted. */
  won: StickerItem[];
  /** Cookies returned to the balance because there was nothing left to win. */
  refunded: number;
}

export interface StickerStore {
  unlocked: string[];
  has: (id: string) => boolean;
  /** How many of the catalogue's stickers are unlocked. */
  count: number;
  /**
   * Buys a direct sticker at its own price. Returns 'owned' / 'poor' / 'ok' so the
   * caller can say the right thing rather than a generic failure.
   */
  buySticker: (sticker: StickerItem) => 'ok' | 'owned' | 'poor' | 'unbuyable';
  /**
   * Opens a pack, drawing from the unowned purchasable pool.
   *
   * `count` is how many draws to make; duplicates within one pack are impossible
   * because each draw is removed from the pool as it is won.
   */
  openPack: (count: number, price: number) => PackResult | 'poor';
  /** Unlocks a secret outright. Used by the achievement checks, never by a purchase. */
  grantSecret: (id: string) => void;
}

export function useStickerStore(): StickerStore {
  const { spendCookies, addCookies } = useGame();
  const { activeProfileId } = useProfiles();
  const [unlocked, setUnlocked] = useState<string[]>(() => readUnlocked(activeProfileId));

  // Sync state whenever the active profile changes or another component updates the store
  useEffect(() => {
    setUnlocked(readUnlocked(activeProfileId));

    const handleSync = () => {
      setUnlocked(readUnlocked(activeProfileId));
    };

    listeners.add(handleSync);
    return () => {
      listeners.delete(handleSync);
    };
  }, [activeProfileId]);

  const has = useCallback((id: string) => unlocked.includes(id), [unlocked]);

  const buySticker = useCallback(
    (sticker: StickerItem): 'ok' | 'owned' | 'poor' | 'unbuyable' => {
      if (sticker.directPrice === undefined) return 'unbuyable';

      const current = readUnlocked(activeProfileId);
      if (current.includes(sticker.id)) return 'owned';

      // The spend is the gate: if cookies do not leave, the sticker is not granted
      if (!spendCookies(sticker.directPrice)) return 'poor';

      const next = [...current, sticker.id];
      saveUnlocked(activeProfileId, next);
      setUnlocked(next);
      notifyListeners();
      return 'ok';
    },
    [activeProfileId, spendCookies],
  );

  const openPack = useCallback(
    (count: number, price: number): PackResult | 'poor' => {
      if (!spendCookies(price)) return 'poor';

      const current = readUnlocked(activeProfileId);
      const pool = PURCHASABLE_STICKERS.filter((sticker) => !current.includes(sticker.id));
      const won: StickerItem[] = [];

      while (won.length < count && pool.length > 0) {
        const pick = pickWeighted(pool);
        if (!pick) break;
        won.push(pick);
        pool.splice(pool.indexOf(pick), 1);
      }

      if (won.length > 0) {
        const next = [...current, ...won.map((sticker) => sticker.id)];
        saveUnlocked(activeProfileId, next);
        setUnlocked(next);
        notifyListeners();
      }

      const missing = count - won.length;
      const refunded = missing > 0 ? missing * DUPLICATE_REFUND : 0;
      if (refunded > 0) addCookies(refunded);

      return { won, refunded };
    },
    [activeProfileId, addCookies, spendCookies],
  );

  const grantSecret = useCallback(
    (id: string) => {
      const current = readUnlocked(activeProfileId);
      if (current.includes(id)) return;
      const next = [...current, id];
      saveUnlocked(activeProfileId, next);
      setUnlocked(next);
      notifyListeners();
    },
    [activeProfileId],
  );

  return {
    unlocked,
    has,
    count: unlocked.length,
    buySticker,
    openPack,
    grantSecret,
  };
}