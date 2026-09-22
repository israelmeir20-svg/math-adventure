/**
 * The farm arcade stations: id, Hebrew branding and badge colours.
 *
 * Kept as data so the hub renders from a single list and adding a station is a
 * one-entry change rather than a new branch.
 *
 * The list holds only what actually happens INSIDE a barn. "סל הפיקניק" and
 * "משחק הכוכבים" deliberately live elsewhere: they are reached straight from
 * their own town-map anchors (`gameAnchors.ts` -> `GameAnchorHost`), so the
 * child never has to enter the barn to pick a picnic or look at the sky.
 *
 * THERE ARE EXACTLY FOUR, AND THAT IS A LAYOUT CONSTRAINT. The hub lays them out
 * as a 2x2 grid, so a fifth entry leaves a widow on its own row. "תעלומת העקבות"
 * was that fifth card and has been removed from the farm; the round builder and
 * the game component are left in place so it can be re-homed without rewriting
 * them.
 */
import type { ComponentType } from 'react';
import type { FarmMedal, FarmMedalId } from './farmTimerData';
import { findMedal } from './farmTimerData';
import WhoIsInTheBarnGame from './barn/WhoIsInTheBarnGame';
import FeedingGame from './feeding/FeedingGame';
import AnimalScaleGame from './scales/AnimalScaleGame';
import NightBarnGame from './night/NightBarnGame';

export type FarmStationId = 'barn' | 'feeding' | 'scales' | 'spotlight';

export interface FarmStationProps {
  onReward: (medal: FarmMedal) => void;
  bestMedalLabel?: string;
}

export interface FarmStation {
  id: FarmStationId;
  title: string;
  blurb: string;
  emoji: string;
  /** Skill exercised, shown as a small chip on the card. */
  skill: string;
  /** Tailwind gradient for the card. */
  tone: string;
  /**
   * A station body. Every one in this list takes `FarmStationProps`, and the
   * hub additionally hands over a `titleLine` it ignores when it has no heading
   * of its own. Typing the field as `ComponentType<FarmStationProps>` keeps the
   * list assignable without a second, wider prop type that every station would
   * then have to remember to extend.
   */
  Component: ComponentType<FarmStationProps>;
}

export const FARM_STATIONS: FarmStation[] = [
  {
    id: 'barn',
    title: 'מי באסם?',
    blurb: 'חיות נכנסות ויוצאות - כמה נשארו בפנים?',
    emoji: '🐄',
    skill: 'חיבור וחיסור',
    tone: 'from-rose-400 to-rose-600',
    Component: WhoIsInTheBarnGame,
  },
  {
    id: 'feeding',
    title: 'שעת האכלה',
    blurb: 'חלקו את האוכל שווה בשווה - ומה נשאר בסל?',
    emoji: '🥕',
    skill: 'חילוק עם שארית',
    tone: 'from-emerald-400 to-emerald-600',
    Component: FeedingGame,
  },
  {
    id: 'scales',
    title: 'מאזניים בחווה',
    blurb: 'העלו חיות לכף עד ששתי הכפות שוקלות אותו דבר.',
    emoji: '⚖️',
    skill: 'שוויון ואיזון',
    tone: 'from-amber-400 to-orange-600',
    Component: AnimalScaleGame,
  },
  {
    id: 'spotlight',
    title: 'האסם בלילה',
    blurb: 'האירו עם הפנס בחשכה - חשבו פי 2 או חלקו ב-2.',
    emoji: '🔦',
    skill: 'כפל וחילוק ב-2',
    tone: 'from-indigo-400 to-slate-700',
    Component: NightBarnGame,
  },
];

/** Best medal per station, persisted in the hub's local state. */
export type MedalsByStation = Partial<Record<FarmStationId, FarmMedalId>>;

/** Hebrew label of a station's best medal, or undefined when it has none. */
export function medalLabel(
  medals: MedalsByStation,
  station: FarmStationId,
): string | undefined {
  const id = medals[station];
  return id ? findMedal(id).labelHebrew : undefined;
}
