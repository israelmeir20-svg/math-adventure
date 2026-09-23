/**
 * The Sticker Album catalogue: every sticker in the kingdom, grouped into pages.
 *
 * WHY THE ASSETS ARE REFERENCED BY URL AND NOT IMPORTED. Thirty-seven of them live in
 * `public./stickers/`, and they are opened one page at a time. Importing each one would
 * fold every image into the JS bundle and make the child download all of them - plus
 * their size - before the album could paint. A plain `./stickers/...` path lets the
 * browser fetch only the page being looked at, and lets the album grow without the
 * bundle growing with it.
 *
 * THE FILE EXTENSIONS ARE NOT UNIFORM AND MUST NOT BE "TIDIED". The set came from a
 * real folder: some are `.jpg`, the family photos are `.jpeg`, and the animated ones are
 * `.gif`. A single extension would 404 on two thirds of the catalogue, so the paths are
 * written exactly as the files are named.
 *
 * THE PUZZLE PAGES STORE ONE IMAGE, NOT MANY. `landscape` and `birthday` each have a
 * single source file; their "stickers" are a row/col address into that one image, which
 * `PuzzleSliceCard` crops with CSS. Adding a thirteenth birthday piece is a change to
 * the count here, never a new file on disk.
 */

export type StickerRarity = 'common' | 'rare' | 'legendary';

export type PageId =
  | 'tag'
  | 'family'
  | 'animals'
  | 'school'
  | 'workshop'
  | 'landscape'
  | 'heroes'
  | 'birthday'
  | 'achievements';

/** How a page presents itself: a strip, a grid, a sliced picture, a wall of medals. */
export type AlbumPageType =
  | 'sequence'
  | 'collection'
  | 'scrapbook'
  | 'puzzle_6'
  | 'medallions'
  | 'puzzle_12'
  | 'secrets';

export interface PuzzleSlice {
  row: number;
  col: number;
  totalRows: number;
  totalCols: number;
}

export interface StickerItem {
  id: string;
  title: string;
  pageId: PageId;
  imageSrc: string;
  rarity: StickerRarity;
  /**
   * What the album charges for it, in cookies. `undefined` marks a SECRET: secrets are
   * earned by playing well and can never be bought, which is the whole point of them.
   */
  directPrice?: number;
  isPuzzlePiece?: boolean;
  puzzleSlice?: PuzzleSlice;
  /** Shown on the locked secret card, so the child knows what to go and do. */
  secretHint?: string;
}

export interface AlbumPage {
  id: PageId;
  title: string;
  type: AlbumPageType;
  description: string;
}

export const ALBUM_PAGES: readonly AlbumPage[] = [
  { id: 'tag', title: 'תופסת בחצר המשק', type: 'sequence', description: 'רצף עלילתי של 6 חלקים' },
  { id: 'family', title: 'משפחת החווה', type: 'collection', description: 'תמונות משפחתיות חמות' },
  { id: 'animals', title: 'החברים הפרוותיים', type: 'collection', description: 'חיות החווה האהובות' },
  { id: 'school', title: 'יום בבית הספר', type: 'scrapbook', description: 'רגעים מכיתת הכפר' },
  /*
   * The workshop page sits AFTER school and BEFORE the windmill, which is the order the
   * village is actually walked: the schoolyard, then the trade quarter, then out into the
   * fields. It is a plain `collection` so it reuses the scrapbook grid and the standard
   * `StickerCard` - the workshops are ordinary collectibles, and giving them their own
   * page TYPE would have meant a fourth grid renderer for no visual gain.
   */
  { id: 'workshop', title: 'בתי המלאכה והיצירה', type: 'collection', description: 'הסדנאות, הריחות והיצירה ברחבי הכפר' },
  { id: 'landscape', title: 'טחנת הרוח והשדות', type: 'puzzle_6', description: 'פאזל נוף של 6 חלקים' },
  { id: 'heroes', title: 'גיבורי הממלכה', type: 'medallions', description: 'מדליוני הכבוד של הכפר' },
  { id: 'birthday', title: 'חגיגת יום ההולדת בכפר', type: 'puzzle_12', description: 'פוסטר המאסטר הענק - 12 חלקים' },
  { id: 'achievements', title: 'מדבקות הישג סודיות', type: 'secrets', description: 'נפתחות רק בביצועי שיא במשחקים' },
] as const;

/**
 * The six-piece windmill landscape.
 *
 * Built from the index rather than written out six times, because the only thing that
 * varies is the slice address - and hand-writing those is exactly how a grid ends up
 * with two identical corners that nobody notices until a child assembles it.
 */
const LANDSCAPE_PIECES: StickerItem[] = Array.from({ length: 6 }).map((_, i) => ({
  id: `land_part_${i + 1}`,
  title: `חלק נוף ${i + 1}`,
  pageId: 'landscape' as const,
  imageSrc: './stickers/landscape/landscape.jpg',
  // The two middle pieces carry the windmill and the horizon, so they are the rarer ones.
  rarity: (i === 1 || i === 4 ? 'rare' : 'common') as StickerRarity,
  directPrice: 250,
  isPuzzlePiece: true,
  puzzleSlice: { row: Math.floor(i / 3), col: i % 3, totalRows: 2, totalCols: 3 },
}));

/** The twelve-piece birthday poster - 4 columns across, 3 rows down. */
const BIRTHDAY_PIECES: StickerItem[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `bday_part_${i + 1}`,
  title: `חלק מסיבה ${i + 1}`,
  pageId: 'birthday' as const,
  imageSrc: './stickers/birthday/birthday.jpg',
  rarity: (i === 6 || i === 9 ? 'legendary' : i % 2 === 0 ? 'rare' : 'common') as StickerRarity,
  directPrice: 300,
  isPuzzlePiece: true,
  puzzleSlice: { row: Math.floor(i / 4), col: i % 4, totalRows: 3, totalCols: 4 },
}));

export const STICKERS_CATALOG: StickerItem[] = [
  // --- Page 1: the game of tag, told as a six-panel story -------------------
  { id: 'tag_1', title: 'השודד הקטן', pageId: 'tag', imageSrc: './stickers/tag/1.jpg', rarity: 'common', directPrice: 200 },
  { id: 'tag_2', title: 'הזינוק בחצר', pageId: 'tag', imageSrc: './stickers/tag/2.jpg', rarity: 'common', directPrice: 220 },
  { id: 'tag_3', title: 'האווז חוסם', pageId: 'tag', imageSrc: './stickers/tag/3.jpg', rarity: 'rare', directPrice: 260 },
  { id: 'tag_4', title: 'נפילת התפוחים', pageId: 'tag', imageSrc: './stickers/tag/4.jpg', rarity: 'rare', directPrice: 280 },
  { id: 'tag_5', title: 'המרדף באסם', pageId: 'tag', imageSrc: './stickers/tag/5.gif', rarity: 'legendary', directPrice: 400 },
  { id: 'tag_6', title: 'כולם בחציר', pageId: 'tag', imageSrc: './stickers/tag/6.jpg', rarity: 'rare', directPrice: 300 },

  // --- Page 2: the family (.jpeg!) ------------------------------------------
  { id: 'fam_father', title: 'אבא במשק', pageId: 'family', imageSrc: './stickers/family/father.jpeg', rarity: 'common', directPrice: 220 },
  { id: 'fam_mother', title: 'אמא במטבח', pageId: 'family', imageSrc: './stickers/family/mother.jpeg', rarity: 'common', directPrice: 220 },
  { id: 'fam_brother', title: 'האח והטרקטור', pageId: 'family', imageSrc: './stickers/family/brother.jpeg', rarity: 'common', directPrice: 220 },
  { id: 'fam_girl', title: 'הילדה והתרנגולות', pageId: 'family', imageSrc: './stickers/family/girl.jpeg', rarity: 'common', directPrice: 220 },
  { id: 'fam_grandpa', title: 'סבא ליד האח', pageId: 'family', imageSrc: './stickers/family/grandfather.jpeg', rarity: 'rare', directPrice: 320 },
  { id: 'fam_heart', title: 'חיבוק משפחתי', pageId: 'family', imageSrc: './stickers/family/heart.gif', rarity: 'legendary', directPrice: 450 },

  // --- Page 3: the animals --------------------------------------------------
  { id: 'anim_dog', title: 'כלבלב השמירה', pageId: 'animals', imageSrc: './stickers/animals/dog.jpg', rarity: 'common', directPrice: 180 },
  { id: 'anim_cat', title: 'החתולה הישנונית', pageId: 'animals', imageSrc: './stickers/animals/cat.jpg', rarity: 'common', directPrice: 180 },
  { id: 'anim_sheep', title: 'הטלה המתולתל', pageId: 'animals', imageSrc: './stickers/animals/sheep.jpg', rarity: 'common', directPrice: 180 },
  { id: 'anim_rabbit', title: 'ארנבון הגזר', pageId: 'animals', imageSrc: './stickers/animals/rabbit.jpg', rarity: 'rare', directPrice: 280 },
  { id: 'anim_swan', title: 'משפחת הברווזים', pageId: 'animals', imageSrc: './stickers/animals/swan.jpg', rarity: 'rare', directPrice: 300 },
  { id: 'anim_pony', title: 'הפוני המוזהב', pageId: 'animals', imageSrc: './stickers/animals/pony.gif', rarity: 'legendary', directPrice: 450 },

  // --- Page 4: a day at school ----------------------------------------------
  { id: 'sch_class', title: 'המורה הינשוף', pageId: 'school', imageSrc: './stickers/school/class.jpg', rarity: 'common', directPrice: 200 },
  { id: 'sch_lunch', title: 'קופסת האוכל', pageId: 'school', imageSrc: './stickers/school/lunchbox.jpg', rarity: 'common', directPrice: 200 },
  { id: 'sch_garden', title: 'חצר המשחקים', pageId: 'school', imageSrc: './stickers/school/garden.jpg', rarity: 'common', directPrice: 220 },
  { id: 'sch_easel', title: 'כן הציור', pageId: 'school', imageSrc: './stickers/school/easel.jpg', rarity: 'rare', directPrice: 280 },
  { id: 'sch_cup', title: 'גביע ההצטיינות', pageId: 'school', imageSrc: './stickers/school/victory_cup.jpg', rarity: 'rare', directPrice: 320 },
  { id: 'sch_lab', title: 'מעבדת הקסם', pageId: 'school', imageSrc: './stickers/school/laboratory.gif', rarity: 'legendary', directPrice: 450 },

  // --- Page 5: the village's workshops --------------------------------------
  /*
   * EXTENSIONS ARE MIXED ON PURPOSE - three `.jpeg` and two `.jpg`. That is how the
   * files are actually named on disk, and the album fetches them by path, so "tidying"
   * any of these to a single extension would 404 that sticker. See the header note.
   */
  { id: 'ws_oil', title: 'בית הבד המשפחתי', pageId: 'workshop', imageSrc: './stickers/workshop/oil_press.jpeg', rarity: 'common', directPrice: 220 },
  { id: 'ws_bakery', title: 'המאפייה של הכפר', pageId: 'workshop', imageSrc: './stickers/workshop/bakery.jpeg', rarity: 'common', directPrice: 220 },
  { id: 'ws_carpentry', title: 'נגריית העץ', pageId: 'workshop', imageSrc: './stickers/workshop/carpentry_workshop.jpg', rarity: 'common', directPrice: 240 },
  { id: 'ws_observatory', title: 'מצפה הכוכבים והטלסקופ', pageId: 'workshop', imageSrc: './stickers/workshop/observatory.jpg', rarity: 'rare', directPrice: 320 },
  { id: 'ws_race', title: 'מרוץ הדלעת השנתי', pageId: 'workshop', imageSrc: './stickers/workshop/race.jpeg', rarity: 'rare', directPrice: 340 },

  // --- Page 5 & 7: the two sliced posters -----------------------------------
  ...LANDSCAPE_PIECES,
  ...BIRTHDAY_PIECES,

  // --- Page 6: the kingdom's heroes -----------------------------------------
  { id: 'hero_guard', title: 'אביר הגשר', pageId: 'heroes', imageSrc: './stickers/heroes/guard.jpg', rarity: 'rare', directPrice: 300 },
  { id: 'hero_driver', title: 'נהגת המשאית', pageId: 'heroes', imageSrc: './stickers/heroes/driver.jpg', rarity: 'common', directPrice: 220 },
  { id: 'hero_doctor', title: 'רופא הכפר', pageId: 'heroes', imageSrc: './stickers/heroes/doctor.jpg', rarity: 'rare', directPrice: 320 },
  { id: 'hero_chef', title: 'שף הדובים', pageId: 'heroes', imageSrc: './stickers/heroes/chef.jpg', rarity: 'rare', directPrice: 320 },
  { id: 'hero_bee', title: 'מלכת הדבורים', pageId: 'heroes', imageSrc: './stickers/heroes/queen_bee.jpg', rarity: 'common', directPrice: 240 },
  { id: 'hero_trumpeter', title: 'החצוצרן החגיגי', pageId: 'heroes', imageSrc: './stickers/heroes/trumpeter.gif', rarity: 'legendary', directPrice: 450 },

  // --- Page 8: SECRETS. No price - these are earned, never bought. ----------
  { id: 'sec_turbo', title: 'נסיכת הטורבו', pageId: 'achievements', imageSrc: './stickers/achievements/4_seconds.jpg', rarity: 'legendary', secretHint: 'שגרי משאית במשקל מדויק תוך פחות מ-4 שניות' },
  { id: 'sec_golden_ear', title: 'אוזן זהב', pageId: 'achievements', imageSrc: './stickers/achievements/golden_ear.jpg', rarity: 'legendary', secretHint: 'זהי את התו המזייף באולפן המקצבים בהאזנה ראשונה' },
  { id: 'sec_control', title: 'שליטה מוחלטת', pageId: 'achievements', imageSrc: './stickers/achievements/absolute_control.jpg', rarity: 'legendary', secretHint: 'השיגי רצף של 12 תשובות נכונות ללא טעות' },
  { id: 'sec_night', title: 'משמרת לילה', pageId: 'achievements', imageSrc: './stickers/achievements/night_shift.jpg', rarity: 'rare', secretHint: 'פתרי חידת גשר אחרי השעה 19:00 בערב' },
  { id: 'sec_weight', title: 'איזון מושלם', pageId: 'achievements', imageSrc: './stickers/achievements/weight.jpeg', rarity: 'rare', secretHint: 'העמיסי משאית באמצעות 4 ארגזים זהים' },
  { id: 'sec_tag_master', title: 'אלופת התופסת', pageId: 'achievements', imageSrc: './stickers/achievements/the_tag_sequence.jpg', rarity: 'legendary', secretHint: 'השלימי את כל 6 המדבקות של עמוד התופסת' },
];

/* -------------------------------------------------------------------------- */
/*                               Derived lookups                              */
/* -------------------------------------------------------------------------- */

export const RARITY_META: Record<
  StickerRarity,
  { label: string; emoji: string; ring: string; chip: string }
> = {
  common: {
    label: 'נפוץ',
    emoji: '⚪',
    ring: 'border-stone-300',
    chip: 'bg-stone-200 text-stone-700',
  },
  rare: {
    label: 'נדיר',
    emoji: '🔵',
    ring: 'border-sky-400',
    chip: 'bg-sky-200 text-sky-900',
  },
  legendary: {
    label: 'אגדי',
    emoji: '🌟',
    ring: 'border-amber-400',
    chip: 'bg-amber-200 text-amber-900',
  },
};

/**
 * PACK RARITY WEIGHTS.
 *
 * Weighted rather than uniform on purpose: a pack that dealt any sticker with equal
 * odds would hand out the legendary chase pieces as often as the filler, and the
 * album's whole progression would collapse into "buy six packs, finish the page".
 * Roughly 60/30/10 keeps a legendary feeling like an event.
 */
const RARITY_WEIGHT: Record<StickerRarity, number> = {
  common: 60,
  rare: 30,
  legendary: 10,
};

export function stickersByPage(pageId: PageId): StickerItem[] {
  return STICKERS_CATALOG.filter((sticker) => sticker.pageId === pageId);
}

export function findSticker(id: string): StickerItem | undefined {
  return STICKERS_CATALOG.find((sticker) => sticker.id === id);
}

/**
 * Everything a pack may hand out: anything with a price.
 *
 * The secrets are excluded by construction, not by a filter on their page, because
 * `directPrice === undefined` is exactly what "earned, not bought" means in this
 * catalogue - so a future secret is excluded automatically the moment it is written
 * without a price.
 */
export const PURCHASABLE_STICKERS: StickerItem[] = STICKERS_CATALOG.filter(
  (sticker) => sticker.directPrice !== undefined,
);

/** The cheapest way to finish the album, used only for the header's progress line. */
export const TOTAL_STICKERS = STICKERS_CATALOG.length;
export const SECRET_STICKERS: StickerItem[] = STICKERS_CATALOG.filter(
  (sticker) => sticker.pageId === 'achievements',
);

/** True once every non-secret sticker has been unlocked. */
export function isPageComplete(pageId: PageId, unlocked: readonly string[]): boolean {
  const page = stickersByPage(pageId);
  return page.length > 0 && page.every((sticker) => unlocked.includes(sticker.id));
}

/**
 * Picks a random sticker from `pool`, weighted by rarity.
 *
 * Returns null for an empty pool so the caller can decide what to do (the pack station
 * turns it into the duplicate refund) rather than receiving a surprise throw.
 */
export function pickWeighted(pool: StickerItem[]): StickerItem | null {
  if (pool.length === 0) return null;
  const total = pool.reduce((sum, sticker) => sum + RARITY_WEIGHT[sticker.rarity], 0);
  let roll = Math.random() * total;
  for (const sticker of pool) {
    roll -= RARITY_WEIGHT[sticker.rarity];
    if (roll <= 0) return sticker;
  }
  // Floating-point dust: the last entry is the correct answer if nothing tripped.
  return pool[pool.length - 1] ?? null;
}
