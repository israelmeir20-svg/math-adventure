/**
 * Standalone mini-game anchors.
 *
 * These are NOT districts. They are separate, smaller hotspots layered over the
 * illustration that open one specific mini-game directly, without going through
 * `DistrictKind` or `DistrictHost`. That keeps the district router (one modal
 * per hex tile type) untouched while still giving the visual games a home on
 * the map.
 *
 * TWO ANCHORS WERE DELETED RATHER THAN MOVED:
 *
 *   - "מי באסם?" (the barn door pin) duplicated the barn, which is itself a district
 *     on the map. Two ways into the same building, one of them a floating cow badge,
 *     meant the child had to learn which of the two was "the real" barn. The building
 *     is now the only entrance.
 *
 *   - "המתכון של השף" (the market-stall pin) sat on the road outside the bakery for a
 *     game that is a kitchen. It is now a tab inside the Cookie Bakery, which is both
 *     where a recipe belongs and one fewer pin competing for the same stretch of road.
 *
 * THE DETECTIVE OFFICE IS THE ONE ANCHOR WITH NO DISTRICT BEHIND IT AT ALL. The others shadow a
 * building that also exists as a hex tile; the office is a self-contained three-station case that
 * carries no tile progress and pays cookies into the same balance as everything else. It still
 * belongs in this list rather than in `TOWN_HOTSPOTS`, because a hotspot there would have to answer
 * to `DistrictKind` and would inherit tile state the case does not have.
 *
 * Coordinates are map percentages, matching `TOWN_HOTSPOTS`.
 */

/** Which mini-game an anchor opens. */
export type AnchorGame =
  | 'constellation'
  | 'picnicBasket'
  | 'timeDifference'
  | 'spiderWeb'
  | 'detective';

export interface GameAnchor {
  id: AnchorGame;
  x: number;
  y: number;
  /** Hitbox size in % of the map, centred on x/y. */
  width: number;
  height: number;
  labelHebrew: string;
  /** Short line shown on the pin tooltip and as the modal subtitle. */
  blurbHebrew: string;
  emoji: string;
  /**
   * Optional drawn badge from the mystery asset folder, replacing the emoji in the pin.
   *
   * Used where a real drawing carries the feature's identity better than a generic emoji - the
   * detective office's magnifying glass is the same art the game itself shows. Falls back to
   * `emoji` when the file is missing, so an anchor never renders an empty disc.
   */
  badgeAsset?: string;
  /** Tailwind classes for the pin bubble. */
  tone: string;
  /**
   * When set, the pin is visible but NOT enterable, and shows this notice instead of opening.
   *
   * A flag on the anchor rather than a filter inside `GameAnchorHost`, because the pin and the host
   * have to agree: the host could refuse to open the modal, but the pin would still look live and the
   * child would tap a working-looking thing that does nothing. Driving both from one flag means the
   * pin's appearance and the click behaviour cannot drift apart.
   *
   * WHY DISABLE RATHER THAN REMOVE. The office is a finished-looking building with a badge on the map,
   * so deleting the pin would leave a gap the child has no way to interpret - and re-adding it later
   * would be a second change to the same position. A dark pin that says why it will not open answers
   * the question at the point it is asked, and restoring it is deleting one line.
   */
  closedNoticeHebrew?: string;
}

/**
 * Anchors sit on real features of the illustration so they read as belonging
 * to the map rather than floating arbitrarily: the orchard is the tree line
 * left of the barn, the market stall is the striped awning, and so on.
 */
export const GAME_ANCHORS: GameAnchor[] = [
  {
    id: 'picnicBasket',
    x: 27,
    y: 46,
    width: 10,
    height: 11,
    labelHebrew: 'המטע והנחל',
    blurbHebrew: 'סל הפיקניק',
    emoji: '🧺',
    tone: 'from-lime-400 to-emerald-500',
  },
  {
    id: 'timeDifference',
    x: 45,
    y: 68,
    width: 10,
    height: 10,
    labelHebrew: 'עמוד השעון',
    blurbHebrew: 'כמה זמן עבר?',
    emoji: '🕐',
    tone: 'from-sky-400 to-indigo-500',
  },
  {
    id: 'spiderWeb',
    x: 84,
    y: 36,
    width: 9,
    height: 10,
    labelHebrew: 'אולפן המקצבים',
    blurbHebrew: 'מנגינות ומספרים',
    emoji: '🎹',
    tone: 'from-fuchsia-400 to-purple-600',
  },
  {
    id: 'constellation',
    x: 57,
    y: 20,
    width: 9,
    height: 10,
    labelHebrew: 'מצפה הכוכבים',
    blurbHebrew: 'משחק הכוכבים',
    emoji: '🌟',
    tone: 'from-indigo-400 to-slate-700',
  },
  /*
   * THE DETECTIVE OFFICE.
   *
   * PLACED ON THE OPEN FIELD IN THE LOWER RIGHT, and that placement is doing work rather than
   * filling a gap. Every other anchor sits on a feature of the illustration - the orchard, the
   * clock post, the barn - but the detective office is a room the village did not already have,
   * so there is nothing to sit on. The lower-right field is the calmest large area on the map
   * with no district pin, no roaming animal lane and no road through it, which keeps the pin
   * from competing with the buildings a child is also learning to tap.
   *
   * The magnifying glass is the mystery folder's own badge, so the pin and the feature it opens
   * share an identity - the child sees the same symbol on the map and in the game's header.
   */
  {
    id: 'detective',
    x: 80,
    y: 78,
    width: 11,
    height: 12,
    labelHebrew: 'משרד החקירות',
    blurbHebrew: 'חקירה במספרים',
    emoji: '🔍',
    badgeAsset: 'magnifying_glass.png',
    tone: 'from-amber-400 to-rose-600',
    /*
     * TEMPORARILY CLOSED. The pin stays on the map so the office is still a landmark, but tapping it
     * shows the notice below instead of opening the case. `GameAnchorHost` needs no change: the pin is
     * the only way to select a `detective`, so refusing the click here leaves the router unreachable
     * without having to teach it about closure.
     *
     * DELETE THIS ONE LINE TO REOPEN THE STATION.
     */
    closedNoticeHebrew: 'חכו לפתיחה',
  },
];
