/**
 * Pure affordability checks for the shop. Shared by the reducer (which owns
 * the authoritative validation) and the UI (which greys out unaffordable
 * cards). Keeping one implementation guarantees they can never disagree.
 */
import type { PlayerInventory } from '../../types/game.types';
import type { ShopCost, ShopItem } from './shopCatalog';

/** Which currency is missing, for the Hebrew "not enough" message. */
export type Shortfall = 'cookies' | 'starCookies' | 'resources' | null;

export function canAfford(inventory: PlayerInventory, cost: ShopCost): boolean {
  if (cost.cookies !== undefined && inventory.cookies < cost.cookies) return false;
  if (
    cost.starCookies !== undefined &&
    inventory.starCookies < cost.starCookies
  ) {
    return false;
  }
  if (cost.resources) {
    for (const [resource, amount] of Object.entries(cost.resources)) {
      const key = resource as keyof PlayerInventory['resources'];
      if (inventory.resources[key] < (amount ?? 0)) return false;
    }
  }
  return true;
}

/** The most relevant missing currency, or null when affordable. */
export function shortfallOf(
  inventory: PlayerInventory,
  cost: ShopCost,
): Shortfall {
  if (canAfford(inventory, cost)) return null;

  if (cost.cookies !== undefined && inventory.cookies < cost.cookies) {
    return 'cookies';
  }
  if (
    cost.starCookies !== undefined &&
    inventory.starCookies < cost.starCookies
  ) {
    return 'starCookies';
  }
  return 'resources';
}

export const SHORTFALL_LABELS: Record<'cookies' | 'starCookies' | 'resources', string> = {
  cookies: 'חסרות עוגיות',
  starCookies: 'חסרים כוכבים',
  resources: 'חסרים חומרי גלם',
};

/** True when a one-time item is already owned. */
export function isOwned(inventory: PlayerInventory, item: ShopItem): boolean {
  return inventory.ownedDecorations.includes(item.id);
}

/**
 * Applies a purchase immutably. Assumes the caller has already validated
 * affordability; returns the inventory unchanged if it cannot pay.
 */
export function applyPurchase(
  inventory: PlayerInventory,
  item: ShopItem,
): PlayerInventory {
  if (!canAfford(inventory, item.cost)) return inventory;

  const resources = { ...inventory.resources };
  if (item.cost.resources) {
    for (const [resource, amount] of Object.entries(item.cost.resources)) {
      const key = resource as keyof PlayerInventory['resources'];
      resources[key] -= amount ?? 0;
    }
  }

  const lifelines = { ...inventory.lifelines };
  if (item.lifeline) {
    lifelines[item.lifeline] = lifelines[item.lifeline] + 1;
  }

  return {
    ...inventory,
    cookies: inventory.cookies - (item.cost.cookies ?? 0),
    starCookies: inventory.starCookies - (item.cost.starCookies ?? 0),
    resources,
    lifelines,
    // Only one-time purchases are recorded as owned; lifelines stack instead.
    ownedDecorations:
      item.oneTime && !isOwned(inventory, item)
        ? [...inventory.ownedDecorations, item.id]
        : inventory.ownedDecorations,
  };
}

/** Human-readable cost tags, e.g. ["60 🍪", "2 🪨"]. */
export function costTags(item: ShopItem): string[] {
  const tags: string[] = [];
  if (item.cost.cookies) tags.push(`${item.cost.cookies} 🍪`);
  if (item.cost.starCookies) tags.push(`${item.cost.starCookies} ⭐`);
  if (item.cost.resources) {
    const EMOJI: Record<string, string> = {
      wood: '🪵',
      stone: '🪨',
      wheat: '🌾',
      wool: '🐑',
    };
    for (const [resource, amount] of Object.entries(item.cost.resources)) {
      tags.push(`${amount} ${EMOJI[resource] ?? resource}`);
    }
  }
  return tags;
}
