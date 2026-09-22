/**
 * The Kingdom Shop catalogue: what can be bought and for how much.
 *
 * THE STORE FRONT IS GONE; THIS CATALOGUE IS NOT. The shop modal that used to render these
 * as cards has been replaced by the sticker album ("מכונת המדבקות"), so nothing shows
 * these items in a grid any more. What survives is the DATA and its affordability rules,
 * because they are still load-bearing in two places: the reducer validates lifeline
 * purchases through `findShopItem`, and `canAfford`/`applyPurchase` credit the lifeline
 * and decoration inventories that the tile modal and the map actually read.
 *
 * Deleting this file would therefore break the lifelines, not just an unused screen. If
 * the lifelines are ever moved into the album too, this is the file to retire - and the
 * reducer's `buyItem` case along with it.
 *
 * Three categories - lifelines (consumable power-ups), city decorations
 * (one-time cosmetic purchases) and pet treats (one-time cosmetic purchases).
 * Prices here are the single source of truth used by the reducer's validator.
 */
import type { LifelineId, ResourceId } from '../../types/game.types';

export type ShopCategory = 'lifelines' | 'decorations' | 'petTreats';

export interface ShopCost {
  cookies?: number;
  starCookies?: number;
  resources?: Partial<Record<ResourceId, number>>;
}

export interface ShopItem {
  id: string;
  category: ShopCategory;
  nameHebrew: string;
  descriptionHebrew: string;
  emoji: string;
  cost: ShopCost;
  /** Lifelines stack; decorations and treats are bought once. */
  lifeline?: LifelineId;
  /** True when the item can only ever be owned once. */
  oneTime: boolean;
}

export const CATEGORY_LABELS: Record<ShopCategory, { title: string; emoji: string }> = {
  lifelines: { title: 'גלגלי הצלה', emoji: '💡' },
  decorations: { title: 'שדרוגי העיר', emoji: '⛲' },
  petTreats: { title: 'פינוקים לחיות', emoji: '🥕' },
};

/* ------------------------------- Lifelines ------------------------------- */

const LIFELINES: ShopItem[] = [
  {
    id: 'pack-fiftyFifty',
    category: 'lifelines',
    nameHebrew: 'חבילת 50/50',
    descriptionHebrew: 'מורידה שתי תשובות שגויות מכל תרגיל.',
    emoji: '✂️',
    cost: { cookies: 25 },
    lifeline: 'fiftyFifty',
    oneTime: false,
  },
  {
    id: 'pack-dotGrid',
    category: 'lifelines',
    nameHebrew: 'עוזר נקודות',
    descriptionHebrew: 'מראה נקודות מסודרות שעוזרות לספור.',
    emoji: '🔵',
    cost: { cookies: 25 },
    lifeline: 'dotGrid',
    oneTime: false,
  },
  {
    id: 'pack-eraser',
    category: 'lifelines',
    nameHebrew: 'מחק קסמים',
    descriptionHebrew: 'שומר על הרצף גם כשטועים בטעות.',
    emoji: '🧽',
    cost: { cookies: 30 },
    lifeline: 'eraser',
    oneTime: false,
  },
];

/* ------------------------------ Decorations ------------------------------ */

const DECORATIONS: ShopItem[] = [
  {
    id: 'deco-fountain',
    category: 'decorations',
    nameHebrew: 'מזרקת מים לכיכר',
    descriptionHebrew: 'מזרקה מצטננת במרכז הכיכר.',
    emoji: '⛲',
    cost: { cookies: 60, resources: { stone: 2 } },
    oneTime: true,
  },
  {
    id: 'deco-flowerbed',
    category: 'decorations',
    nameHebrew: 'ערוגת פרחים ססגונית',
    descriptionHebrew: 'צבעים שמחים לאורך השביל.',
    emoji: '🌸',
    cost: { cookies: 40, resources: { wheat: 2 } },
    oneTime: true,
  },
  {
    id: 'deco-lanterns',
    category: 'decorations',
    nameHebrew: 'פנסי רחוב זוהרים',
    descriptionHebrew: 'אור חמים שמלווה את ההרפתקה בלילה.',
    emoji: '🏮',
    cost: { cookies: 50, resources: { wood: 2 } },
    oneTime: true,
  },
  {
    id: 'deco-paths',
    category: 'decorations',
    nameHebrew: 'שבילי אבן מהודרים',
    descriptionHebrew: 'שבילים יפים שמחברים בין האריחים.',
    emoji: '🧱',
    cost: { cookies: 45, resources: { stone: 3 } },
    oneTime: true,
  },
];

/* ------------------------------- Pet treats ------------------------------- */

const PET_TREATS: ShopItem[] = [
  {
    id: 'treat-carrot',
    category: 'petTreats',
    nameHebrew: 'גזר פרימיום לארנב',
    descriptionHebrew: 'החטיף האהוב על הארנבון.',
    emoji: '🥕',
    cost: { cookies: 20 },
    oneTime: true,
  },
  {
    id: 'treat-bell',
    category: 'petTreats',
    nameHebrew: 'פעמון לקולר',
    descriptionHebrew: 'מצלצל בשמחה בכל קפיצה.',
    emoji: '🔔',
    cost: { starCookies: 1 },
    oneTime: true,
  },
  {
    id: 'treat-bow',
    category: 'petTreats',
    nameHebrew: 'עניבת פפיון חגיגית',
    descriptionHebrew: 'מתנה מיוחדת במיוחד לחיה.',
    emoji: '🎀',
    cost: { starCookies: 2 },
    oneTime: true,
  },
  {
    id: 'treat-bowl',
    category: 'petTreats',
    nameHebrew: 'קערת חטיפי כוכב',
    descriptionHebrew: 'קערה מלאה בפינוקים נוצצים.',
    emoji: '🥣',
    cost: { starCookies: 1 },
    oneTime: true,
  },
];

export const SHOP_ITEMS: ShopItem[] = [...LIFELINES, ...DECORATIONS, ...PET_TREATS];

export function itemsByCategory(category: ShopCategory): ShopItem[] {
  return SHOP_ITEMS.filter((item) => item.category === category);
}

export function findShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id);
}
