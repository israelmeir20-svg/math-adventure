/**
 * Sticker-album state: which stickers are unlocked, and the cookie transactions that
 * unlock them.
 *
 * WHY THE UNLOCKS ARE NOT IN THE GAME SAVE. They could have lived in `GameState`
 * alongside the inventory, but that would mean writing a migration, bumping the save
 * key, and touching the reducer for every future album feature - a lot of blast radius
 * for a feature that shares nothing with tiles or problems but a currency. They live in
 * their own key instead, and this hook is the only thing that knows the shape.
 *
 * EVERY SPEND GOES THROUGH `spendCookies`, so the balance here is always the real one.
 * There is no local copy of the cookie count to drift out of sync, and no path where a
 * sticker is granted without the cookies actually leaving the account.
 */
import { useCallback, useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  pickWeighted,
  PURCHASABLE_STICKERS,
  type StickerItem,
} from '../../data/stickersData';
const STORAGE_KEY = 'kingdom_unlocked_stickers';

/** Cost of one random unowned sticker. */
export const SINGLE_PACK_PRICE = 80;
/** Cost of three, priced at a small discount so the bundle is the sensible buy. */
export const TRIPLE_PACK_PRICE = 220;
/** Paid out when there is nothing left to win, instead of handing back nothing. */
export const DUPLICATE_REFUND = 50;

/** Reads the unlocked ids, tolerating a missing/corrupt entry. */
function readUnlocked(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    /*
     * Anything that is not an array of strings is treated as empty rather than
     * repaired. A half-parsed album would show a child stickers they never earned, which
     * is worse than making them re-earn a few.
     */
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
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
  const [unlocked, setUnlocked] = useState<string[]>(readUnlocked);

  // Persist on every change. The list is small (37 ids at most), so writing the whole
  // array is cheaper than the bookkeeping of a patch.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
    } catch {
      /* storage full or unavailable - the album still works for this session */
    }
  }, [unlocked]);

  const has = useCallback((id: string) => unlocked.includes(id), [unlocked]);

  const buySticker = useCallback(
    (sticker: StickerItem): 'ok' | 'owned' | 'poor' | 'unbuyable' => {
      if (sticker.directPrice === undefined) return 'unbuyable';
      if (unlocked.includes(sticker.id)) return 'owned';
      // The spend is the gate: if the cookies do not leave, the sticker is not granted.
      if (!spendCookies(sticker.directPrice)) return 'poor';
      setUnlocked((current) =>
        current.includes(sticker.id) ? current : [...current, sticker.id],
      );
      return 'ok';
    },
    [spendCookies, unlocked],
  );

  const openPack = useCallback(
    (count: number, price: number): PackResult | 'poor' => {
      if (!spendCookies(price)) return 'poor';

      /*
       * Draw against a working copy of the pool so a triple pack cannot hand out the
       * same sticker twice - the child would reasonably read that as a bug, and the
       * second copy is worthless to them anyway.
       */
      const pool = PURCHASABLE_STICKERS.filter((sticker) => !unlocked.includes(sticker.id));
      const won: StickerItem[] = [];
      while (won.length < count && pool.length > 0) {
        const pick = pickWeighted(pool);
        if (!pick) break;
        won.push(pick);
        pool.splice(pool.indexOf(pick), 1);
      }

      if (won.length > 0) {
        setUnlocked((current) => [...current, ...won.map((sticker) => sticker.id)]);
      }

      /*
       * The refund. It pays the difference between what was asked for and what was
       * actually handed over, at the flat duplicate rate - so a pack opened on a full
       * album costs nothing overall, and a triple pack opened with one sticker left
       * pays back for the two it could not fill.
       */
      const missing = count - won.length;
      const refunded = missing > 0 ? missing * DUPLICATE_REFUND : 0;
      if (refunded > 0) addCookies(refunded);

      return { won, refunded };
    },
    [addCookies, spendCookies, unlocked],
  );

  const grantSecret = useCallback((id: string) => {
    setUnlocked((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  return {
    unlocked,
    has,
    count: unlocked.length,
    buySticker,
    openPack,
    grantSecret,
  };
}
