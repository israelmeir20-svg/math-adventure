/* eslint-disable react-refresh/only-export-components */
/**
 * Global game provider. Thin wrapper over the reducer + persistence:
 * exposes actions, auto-saves on every state change.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type { LifelineId, ResourceId } from '../types/game.types';
import { generateProblem } from '../logic/mathEngine';
import type { GenerateOptions } from '../logic/mathEngine';
import { gameReducer, type GameAction } from './gameReducer';
import type { GameState } from './gameState';
import { canAfford } from '../components/shop/shopPricing';
import { findShopItem } from '../components/shop/shopCatalog';
import { clearSave, loadState, saveState } from './persistence';
import { useProfiles } from './ProfileContext';

export type { GameAction } from './gameReducer';
export type { GameState } from './gameState';
export { createDefaultState, TILE_TYPES, tileKey } from './gameState';

export interface GameContextValue {
  state: GameState;
  unlockHexTile: (tileId: string) => void;
  addCookies: (amount: number, starCookies?: number) => void;
  /**
   * Deducts cookies, refusing the whole transaction when the balance is short.
   *
   * Returns whether it went through, so a caller can gate a purchase on the result
   * instead of checking the balance itself and racing the reducer.
   */
  spendCookies: (amount: number) => boolean;
  addResource: (resource: ResourceId, amount: number) => void;
  recordAnswer: (isCorrect: boolean, tileId?: string, forgive?: boolean) => void;
  useLifeline: (lifeline: LifelineId, tileId?: string) => void;
  adoptAnimal: (animalId: string) => void;
  /** Attempts a shop purchase. Returns true only when it actually went through. */
  buyItem: (itemId: string) => boolean;
  /** Generates a fresh problem for a tile, honoring level + review cooldown. */
  loadProblemForTile: (tileId: string, type?: GenerateOptions['type']) => void;
  /** Clears the tile's problem (after it has been solved / skipped). */
  advanceTile: (tileId: string) => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { activeProfileId } = useProfiles();

  const [state, dispatch] = useReducer(
    gameReducer,
    activeProfileId,
    (profileId: string) => loadState(profileId),
  );

  /*
   * ==============================================================================================
   * THE SWITCH IS TWO EFFECTS IN A DELIBERATE ORDER, NOT ONE
   * ==============================================================================================
   *
   * React runs effects in declaration order after the render they belong to, and that order is the whole
   * safety property here.
   *
   * On the render where `activeProfileId` changes, the SECOND effect below would happily write the OLD
   * profile's state to the NEW profile's key - because the reload has not happened yet. Declaring the
   * reload first means it runs first, and when the save effect then sees a mismatched ref it does nothing.
   * The next render - the one carrying the freshly loaded state - is the first that is allowed to write.
   *
   * Flipping these two blocks silently gives every new profile the previous player's progress, which is
   * precisely the leak this scoping exists to close. The ref is not a cache; it is the guard that makes
   * "which profile is this state for" answerable.
   */
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (loadedFor.current === activeProfileId) return;

    /*
     * THE RELOAD COMES FROM STORAGE, NOT FROM A SECOND `useReducer` ARGUMENT. `init` runs once per mount,
     * so a profile change reaching it at all would require remounting the provider - which would discard
     * every other provider's state and any open modal along with the game. Dispatching for the first time
     * is the mechanism the reducer already has for "replace the world".
     */
    loadedFor.current = activeProfileId;
    dispatch({ type: 'hydrate', state: loadState(activeProfileId) });
  }, [activeProfileId]);

  useEffect(() => {
    // Skipped until the reload above has run, so we never write across profiles.
    if (loadedFor.current !== activeProfileId) return;
    saveState(activeProfileId, state);
  }, [activeProfileId, state]);

  const unlockHexTile = useCallback((tileId: string) => {
    dispatch({ type: 'unlockHexTile', tileId });
  }, []);

  const addCookies = useCallback((amount: number, starCookies?: number) => {
    const action: GameAction =
      starCookies === undefined
        ? { type: 'addCookies', amount }
        : { type: 'addCookies', amount, starCookies };
    dispatch(action);
  }, []);

  const addResource = useCallback((resource: ResourceId, amount: number) => {
    dispatch({ type: 'addResource', resource, amount });
  }, []);

  /**
   * Checks affordability before dispatching so the caller gets a truthful boolean.
   *
   * The reducer re-checks independently, which is what makes this safe: this read is
   * only here to produce a return value the UI can react to, never to authorise the
   * spend. A stale balance therefore costs nothing but a confusing return value, and
   * can never overdraw the account.
   */
  const spendCookies = useCallback(
    (amount: number): boolean => {
      if (amount <= 0) return false;
      if (state.inventory.cookies < amount) return false;
      dispatch({ type: 'spendCookies', amount });
      return true;
    },
    [state.inventory.cookies],
  );

  const recordAnswer = useCallback(
    (isCorrect: boolean, tileId?: string, forgive?: boolean) => {
      const action: GameAction = { type: 'recordAnswer', isCorrect };
      if (tileId) action.tileId = tileId;
      if (forgive) action.forgive = true;
      dispatch(action);
    },
    [],
  );

  const useLifeline = useCallback((lifeline: LifelineId, tileId?: string) => {
    dispatch(tileId ? { type: 'useLifeline', lifeline, tileId } : { type: 'useLifeline', lifeline });
  }, []);

  const adoptAnimal = useCallback((animalId: string) => {
    dispatch({ type: 'adoptAnimal', animalId });
  }, []);

  /**
   * Validates against the current inventory before dispatching, so the caller
   * gets a reliable boolean for the success/failure feedback. The reducer
   * re-validates independently, so a stale read can never overspend.
   */
  const buyItem = useCallback(
    (itemId: string): boolean => {
      const item = findShopItem(itemId);
      if (!item) return false;
      if (item.oneTime && state.inventory.ownedDecorations.includes(item.id)) {
        return false;
      }
      if (!canAfford(state.inventory, item.cost)) return false;
      dispatch({ type: 'buyItem', itemId });
      return true;
    },
    [state.inventory],
  );

  const loadProblemForTile = useCallback(
    (tileId: string, type?: GenerateOptions['type']) => {
      const tile = state.tiles[tileId];
      if (!tile || !tile.isUnlocked) return;
      const problem = generateProblem({
        type: type ?? 'multiplication',
        level: tile.level,
        tracker: state.mistakes,
      });
      dispatch({ type: 'setTileProblem', tileId, problem });
    },
    [state.tiles, state.mistakes],
  );

  const advanceTile = useCallback((tileId: string) => {
    dispatch({ type: 'setTileProblem', tileId, problem: null });
  }, []);

  const resetGame = useCallback(() => {
    clearSave(activeProfileId);
    dispatch({ type: 'reset' });
  }, [activeProfileId]);

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      unlockHexTile,
      addCookies,
      spendCookies,
      addResource,
      recordAnswer,
      useLifeline,
      adoptAnimal,
      buyItem,
      loadProblemForTile,
      advanceTile,
      resetGame,
    }),
    [
      state,
      unlockHexTile,
      addCookies,
      spendCookies,
      addResource,
      recordAnswer,
      useLifeline,
      adoptAnimal,
      buyItem,
      loadProblemForTile,
      advanceTile,
      resetGame,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside a <GameProvider>');
  return ctx;
}
