/**
 * All action types + the pure reducer for the game state.
 */
import type {
  LifelineId,
  MathProblem,
  PlayerInventory,
  ResourceId,
} from '../types/game.types';
import { createMistakeTracker } from '../logic/mistakeTracker';
import {
  createDefaultState,
  withTileProblem,
  type GameState,
} from './gameState';
import { applyPurchase, canAfford } from '../components/shop/shopPricing';
import { findShopItem } from '../components/shop/shopCatalog';
import { applyAnswer } from './answerScoring';

export type GameAction =
  | { type: 'hydrate'; state: GameState }
  | { type: 'unlockHexTile'; tileId: string }
  | { type: 'addCookies'; amount: number; starCookies?: number }
  | { type: 'spendCookies'; amount: number }
  | { type: 'addResource'; resource: ResourceId; amount: number }
  | { type: 'recordAnswer'; isCorrect: boolean; tileId?: string; forgive?: boolean }
  | { type: 'useLifeline'; lifeline: LifelineId; tileId?: string }
  | { type: 'adoptAnimal'; animalId: string }
  | { type: 'buyItem'; itemId: string }
  | { type: 'setTileProblem'; tileId: string; problem: MathProblem | null }
  | { type: 'reset' };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'hydrate':
      return action.state;
    case 'reset':
      return createDefaultState();
    case 'unlockHexTile': {
      const tile = state.tiles[action.tileId];
      if (!tile || tile.isUnlocked) return state;
      return {
        ...state,
        tiles: { ...state.tiles, [action.tileId]: { ...tile, isUnlocked: true } },
        lastActiveTileId: action.tileId,
      };
    }
    case 'addCookies': {
      const inventory: PlayerInventory = {
        ...state.inventory,
        cookies: state.inventory.cookies + action.amount,
        starCookies: state.inventory.starCookies + (action.starCookies ?? 0),
      };
      return { ...state, inventory };
    }
    /*
     * Spending is its own action rather than a negative `addCookies`.
     *
     * The two have opposite failure modes. Earning something and accidentally adding
     * twice is a gift; SPENDING and accidentally spending twice - or spending against a
     * balance the UI read a tick ago - is a child losing cookies they saved up for. So
     * this path refuses to go through at all when the balance is short, and clamps at
     * zero as a second line of defence, instead of trusting its caller to have checked.
     */
    case 'spendCookies': {
      if (action.amount <= 0) return state;
      if (state.inventory.cookies < action.amount) return state;
      return {
        ...state,
        inventory: {
          ...state.inventory,
          cookies: Math.max(0, state.inventory.cookies - action.amount),
        },
      };
    }
    case 'addResource': {
      const inventory: PlayerInventory = {
        ...state.inventory,
        resources: {
          ...state.inventory.resources,
          [action.resource]:
            state.inventory.resources[action.resource] + action.amount,
        },
      };
      return { ...state, inventory };
    }
    case 'recordAnswer':
      return applyAnswer(state, action.isCorrect, action.tileId, action.forgive);
    case 'useLifeline': {
      const available = state.inventory.lifelines[action.lifeline];
      if (available <= 0) return state;
      return {
        ...state,
        inventory: {
          ...state.inventory,
          lifelines: {
            ...state.inventory.lifelines,
            [action.lifeline]: available - 1,
          },
        },
      };
    }
    case 'adoptAnimal': {
      if (state.inventory.unlockedAnimals.includes(action.animalId)) return state;
      return {
        ...state,
        inventory: {
          ...state.inventory,
          unlockedAnimals: [...state.inventory.unlockedAnimals, action.animalId],
        },
      };
    }
    case 'buyItem': {
      const item = findShopItem(action.itemId);
      if (!item) return state;

      // One-time items can never be bought twice.
      if (item.oneTime && state.inventory.ownedDecorations.includes(item.id)) {
        return state;
      }
      // The reducer is the authoritative affordability check.
      if (!canAfford(state.inventory, item.cost)) return state;

      return { ...state, inventory: applyPurchase(state.inventory, item) };
    }
    case 'setTileProblem':
      return withTileProblem(state, action.tileId, action.problem);
  }
}

export { createMistakeTracker };
