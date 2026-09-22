/**
 * Maps a district tile type to its modal + the Hebrew label used to enter it.
 * Keeps TileActionModal free of per-district branching.
 */
import type { HexTileType } from '../../types/game.types';

export type DistrictKind =
  | 'street'
  | 'bakery'
  | 'kiosk'
  | 'farm'
  | 'pizza'
  | 'truck'
  | 'bridge'
  | 'workshop';

interface DistrictMeta {
  kind: DistrictKind;
  enterLabel: string;
  enterIcon: string;
  /**
   * When true, clicking the building opens the district immediately and the
   * inspection drawer is skipped entirely (no dead-end upgrade screen).
   */
  directEntry?: boolean;
  /**
   * Filename stem under `src/assets/screen/` for the drawer's banner art.
   *
   * A STEM RATHER THAN AN IMPORTED MODULE, because the assets are resolved with
   * `import.meta.glob` (see `screenArt` below). Importing them one by one here
   * would put eight image imports in a file whose whole job is routing, and each
   * new district would need a second edit in a second place.
   */
  artKey: string;
  /** The station-specific tip Teacher Tamar gives on the drawer's speech bubble. */
  tipHebrew: string;
  /**
   * The `GAME_META` key this district's progression is recorded under.
   *
   * DECLARED RATHER THAN DERIVED FROM `kind`, because the two are not the same name and must not be
   * assumed to be. The cookie bakery's kind is `bakery` while its game key is `cookieBakery`, and
   * the bridge's is `bridge` against a game key of `locks`. A lookup that guessed from `kind` would
   * miss both, and the failure would be silent: the child earns medals, the drawer shows padlocks,
   * and nothing anywhere reports a problem.
   */
  stationKey: string;
}

export const DISTRICT_META: Partial<Record<HexTileType, DistrictMeta>> = {
  street: {
    kind: 'street',
    stationKey: 'street_hub',
    enterLabel: 'שחקו במשחקי הרחוב',
    enterIcon: '🎈',
    /*
     * DIRECT ENTRY, SO NO INSPECTION DRAWER STANDS IN FRONT OF THE HUB.
     *
     * The street is a HUB, not a station: the two games under it each own a launch card with the
     * level selector, so an intermediate drawer here meant the child passed through a level picker
     * that chose nothing before reaching the real ones. `directEntry` is the same mechanism the farm
     * already uses to skip the dead-end screen, so the hub opens on the first tap.
     */
    directEntry: true,
    artKey: 'street',
    tipHebrew: 'שימו לב תמיד לסימן הפעולה (+, -, ×) לפני שבוחרים תשובה!',
  },
  cookieBakery: {
    kind: 'bakery',
    stationKey: 'cookieBakery',
    enterLabel: 'פתחו את המאפייה',
    enterIcon: '🍪',
    artKey: 'cookie_bakery',
    tipHebrew:
      'חשבו בכפולות: ספרו כמה עוגיות יש בכל שורה על המגש והכפילו במספר השורות!',
  },
  kiosk: {
    kind: 'kiosk',
    stationKey: 'kiosk',
    enterLabel: 'פתחו את הקיוסק',
    enterIcon: '🏪',
    artKey: 'kiosk',
    tipHebrew: 'התחילו תמיד מחישוב המטבע הגדול ביותר האפשרי (10 ₪) ורק אז השלימו בקטנים!',
  },
  farm: {
    kind: 'farm',
    stationKey: 'barnWho',
    enterLabel: 'פתחו את החווה',
    enterIcon: '🚜',
    directEntry: true,
    /*
     * THE FARM'S OWN ART, NOT THE BRIDGE'S.
     *
     * This was `'locks'`, which resolved through `screenArt` to `locks.png` - the padlocked BRIDGE
     * illustration. So a child who tapped the locked farm saw a picture of a different station
     * entirely, and the farm's actual artwork sat unused on disk.
     *
     * It is worth being explicit about why it stayed wrong: `screenArt` degrades to `undefined` when a
     * stem does not match any file, so a MISSING key fails loudly (no banner). `'locks'` is a VALID
     * stem, so this never failed at all - it just quietly drew the wrong station's painting. That is
     * the class of bug nothing catches: not a type error, not a build error, not even a broken image.
     *
     * `who's_at_the farm` matches the file on disk. The lookup's punctuation-stripped fallback in
     * `screenArt` is what makes the space and the apostrophe safe here - see the `normalise` note
     * there, which exists precisely for this filename.
     */
    artKey: "who's_at_the farm",
    tipHebrew: 'שימו לב תמיד לסימן הפעולה (+, -, ×) לפני שבוחרים תשובה!',
  },
  pizzaBakery: {
    kind: 'pizza',
    stationKey: 'pizza',
    enterLabel: 'פתחו את הפיצרייה',
    enterIcon: '🍕',
    artKey: 'pizza',
    tipHebrew: 'המספר למטה (המכנה) מראה לכמה חלקים שווים חתוכה הפיצה.',
  },
  truckHub: {
    kind: 'truck',
    stationKey: 'trucks',
    enterLabel: 'פתחו את תחנת המשלוחים',
    enterIcon: '🚚',
    artKey: 'trucks',
    tipHebrew: 'כמות הארגזים בכל שורה כפול מספר השורות שווה למשקל הכולל!',
  },
  bridge: {
    kind: 'bridge',
    stationKey: 'locks',
    enterLabel: 'גשר השומר המבולבל',
    enterIcon: '🌉',
    artKey: 'locks',
    tipHebrew: 'שימו לב תמיד לסימן הפעולה (+, -, ×) לפני שבוחרים תשובה!',
  },
  resource: {
    kind: 'workshop',
    stationKey: 'craft',
    enterLabel: 'היכנסו לסטודיו לפסיפס',
    enterIcon: '🧩',
    artKey: 'craft',
    tipHebrew: 'ספרו קודם את כמות הקודקודים והצלעות כדי לוודא התאמה מדויקת למסגרת!',
  },
};

/**
 * The banner art, resolved once at module load.
 *
 * `import.meta.glob` WITH `eager: true` rather than one static import per station: the keys come
 * back as full paths, so the lookup below is a suffix match on the filename. That keeps a station's
 * art a one-word change in the tables in this file instead of two edits in two files - and it means
 * a missing image degrades to no banner rather than to a build error.
 *
 * ================================================================================================
 * THE GLOB IS PER-FOLDER, AND THAT IS WHY THERE IS MORE THAN ONE BELOW
 * ================================================================================================
 *
 * `import.meta.glob` bakes its matches into the bundle at build time, so it cannot take a variable
 * prefix - `glob(`../../assets/${folder}/*.png`)` is not expressible. One glob therefore only ever
 * sees ONE folder, which is fine while every banner lives in `screen/` and a silent failure the
 * moment an art set ships anywhere else.
 *
 * The island is that case: its art lives in `assets/island/`, so a `screenArt('island_of_respite')`
 * lookup against a `screen/`-only glob returns `undefined` and the launch card renders with NO
 * banner. That failure is invisible by design (see the docblock above - missing art degrades
 * quietly), which is exactly what makes it worth wiring up deliberately rather than discovering.
 *
 * ADDING A FOLDER MEANS ONE LINE HERE. The lists are merged into a single lookup table so the
 * resolution logic below stays folder-agnostic - callers ask for a stem and do not know or care
 * which directory it came from.
 */
const ART_SOURCES: Record<string, string> = {
  ...(import.meta.glob('../../assets/screen/*.png', {
    eager: true,
    import: 'default',
  }) as Record<string, string>),
  ...(import.meta.glob('../../assets/island/*.png', {
    eager: true,
    import: 'default',
  }) as Record<string, string>),
};

/**
 * The banner for a stem, or undefined when no such file shipped.
 *
 * THE LEADING SLASH IS THE WHOLE POINT OF THE `startsWith` GUARD. A bare `endsWith('locks.png')`
 * also matches `.../nightlocks.png`, and - more likely here - a station whose stored stem is a
 * SUFFIX of another's. Requiring the separator makes the match exact.
 *
 * THE FALLBACK COMPARISON IS ON THE PUNCTUATION-STRIPPED NAME. One shipped file is
 * `who's_at_the farm.png`, while the stem the game asks for is `who's_at_the_farm`. Rather than
 * depend on that space surviving every future re-export, both sides are reduced to letters and
 * digits before comparing - so the file can be renamed to any of the obvious spellings without a
 * code change, and the apostrophe (which is a glob metacharacter in some shells and a quoting
 * hazard in others) stops being load-bearing.
 */
const normalise = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

export function screenArt(stem: string): string | undefined {
  const exact = Object.entries(ART_SOURCES).find(([path]) => path.endsWith(`/${stem}.png`));
  if (exact) return exact[1];
  const wanted = normalise(stem);
  if (!wanted) return undefined;
  return Object.entries(ART_SOURCES).find(([path]) => {
    const file = path.slice(path.lastIndexOf('/') + 1).replace(/\.png$/i, '');
    return normalise(file) === wanted;
  })?.[1];
}

/** Teacher Tamar's avatar, shared by every station's launch modal. */
export function teacherAvatar(): string | undefined {
  return screenArt('teacher_Tamar');
}

/* ------------------------------------------------------------------------------------------------
 * Game launch metadata
 * ---------------------------------------------------------------------------------------------- */

/**
 * A standalone mini-game hung off its own map anchor or district card.
 *
 * SEPARATE FROM `DistrictMeta` BECAUSE THE TWO ARE DIFFERENT SHAPES. A district is one modal per
 * hex-tile type and carries tile progress and a place to return to; a game is a self-contained
 * activity that takes only `onClose` and has no tile behind it. The street hub is the clearest case
 * for keeping them apart: it is a district (it has a tile) whose whole job is to offer two games
 * (which do not), so the two lists genuinely nest rather than overlap.
 */
export interface GameMeta {
  /** The banner stem under `src/assets/screen/`. */
  artKey: string;
  /** Teacher Tamar's tip for this game. */
  tipHebrew: string;
  /**
   * One line on what the child actually does, shown under the heading as "מה עושים?".
   *
   * IT IS NOT THE TIP AND THE TWO ARE NOT INTERCHANGEABLE. The tip is the STRATEGY ("start from the
   * biggest coin"), and it only means anything once the child knows the GOAL. The goal is this line.
   * A card that showed only the tip asked a seven-year-old to absorb a technique for a task nobody had
   * described yet.
   *
   * REQUIRED, NOT OPTIONAL. An optional field here would drift the way any optional copy does - the
   * card would render the heading with nothing under it for whichever game was added last, and nobody
   * would notice because it degrades quietly. Making it required means a new station cannot compile
   * without answering the question.
   */
  whatToDo: string;
  /**
   * The game's title, for the launch modal's heading.
   *
   * OPTIONAL, BECAUSE NOT EVERY GAME NEEDS ONE. The games reached from a town-map
   * anchor (`StarArcadeModal`, `MemoGameModal`) already run inside a shell that draws
   * the game's own heading, so a second title on the launch card would say the same
   * thing twice. Leaving it out omits the `<h2>` and the card reads as a banner, a tip
   * and a play button - which is all it needs to be.
   */
  titleHebrew?: string;
}

/**
 * The key a game's progression is stored under.
 *
 * IT IS THE `GAME_META` KEY ITSELF, NOT A SECOND IDENTIFIER. Progression is per game and so is the
 * banner and tip, so a separate `progressKey` field would be a second name for the same station -
 * and the failure mode of two names is a game that records medals under a key nothing else reads,
 * which shows up as a picker stuck on level 1 with no error anywhere. Deriving one from the other
 * makes that impossible.
 */
export type GameKey = keyof typeof GAME_META;

export const GAME_META = {
  street_hub: {
    artKey: 'street',
    titleHebrew: 'משחקי הרחוב',
    whatToDo: 'בחרו משחק מהרחוב וצברו נקודות בקצב שלכם.',
    tipHebrew: 'בחרו משחק ותרגלו כפולות בקצב שלכם!',
  },
  balloons: {
    artKey: 'balloons',
    titleHebrew: 'בלוני הכפולות',
    whatToDo: 'פוצצו את הבלונים שמתאימים למספר ולכפולה המבוקשת.',
    tipHebrew: 'פוצצו רק בלונים שהם כפולות מדויקות של המספר שנבחר!',
  },
  hopscotch: {
    artKey: 'class',
    titleHebrew: 'קלאס ברחוב',
    whatToDo: 'דלגו על המשבצות לפי סדרת הכפולות הנכונה.',
    tipHebrew: 'דלגו רק על משבצות שהן כפולות של המספר – אל תדרכו על מספר שלא שייך לסדרה!',
  },
  barnWho: {
    artKey: "who's_at_the_farm",
    titleHebrew: 'מי באסם?',
    whatToDo: 'עקבו אחרי החיות שנכנסות ויוצאות וחשבו כמה נשארו בפנים!',
    tipHebrew: 'חיה שנכנסת פנימה – מוסיפים מיד (﬩)! חיה שיוצאת החוצה – מורידים מיד (-).',
  },
  feeding: {
    artKey: 'feeding_time',
    titleHebrew: 'שעת האכלה',
    whatToDo: 'חלקו את האוכל שווה בשווה בין החיות וגלו מה נשאר בסל!',
    tipHebrew: 'חלקי מנה שווה לכל חיה. מה שלא מספיק לכולן ונשאר בסל – זו בדיוק השארית!',
  },
  nightBarn: {
    artKey: 'flashlight_at_night',
    titleHebrew: 'האסם בלילה',
    whatToDo: 'האירו עם הפנס על העיניים הנוצצות וגלו כמה חיות מתחבאות בחושך!',
    tipHebrew: 'לכל חיה יש זוג עיניים! ספרי את העיניים בזוגות (2, 4, 6...) וכך תדעי מיד כמה חיות יש באסם.',
  },
  scales: {
    artKey: 'libra',
    titleHebrew: 'מאזניים בחווה',
    whatToDo: 'הניחו חיות על המאזניים כדי לאזן אותם בדיוק למשקל המבוקש!',
    tipHebrew: 'המקום על המאזניים צפוף! השתמשי קודם בחיות הכבדות ביותר, וכך תצטרכי פחות חיות על הכף.',
  },
  kiosk: {
    artKey: 'kiosk',
    titleHebrew: 'הקיוסק',
    whatToDo: 'שלמו בקופה בדיוק את הסכום הנכון בעזרת מטבעות!',
    tipHebrew: 'טריק של אלופים: התחילי תמיד מהמטבעות הגדולים של 10, ורק בסוף השלימי עם מטבעות קטנים של 1 ו-2.',
  },
  pizza: {
    artKey: 'pizza',
    titleHebrew: 'פיצריית השברים',
    whatToDo: 'שימי על כל חלק מהפיצה את התוספת שהוזמנה!',
    tipHebrew: 'המספר שלמטה מגלה לכמה חתיכות שוות הפיצה מחולקת, והמספר שלמעלה אומר בדיוק על כמה חתיכות לשים את התוספת!',
  },
  craft: {
    artKey: 'craft',
    titleHebrew: 'סטודיו הפסיפס',
    whatToDo: 'צבעו את המשבצות כדי לבנות את הציור הנסתר.',
    tipHebrew: 'ספרו קודם את כמות הקודקודים והצלעות כדי לוודא התאמה מדויקת למסגרת!',
  },
  trucks: {
    artKey: 'trucks',
    titleHebrew: 'מרכז המשלוחים',
    whatToDo: 'העמיסו ארגזים על המשאית והגיעו למשקל המקסימלי בלי לעבור אותו!',
    tipHebrew: 'כדי למלא את המשאית הכי מהר, התחילי מהארגזים הכבדים ביותר, ובסוף השלימי עם הארגזים הקלים.',
  },
  music: {
    artKey: 'music',
    titleHebrew: 'מנגינות ומספרים',
    whatToDo: 'הקשיבו לקצב ומצאו את המספר שחסר במנגינה.',
    tipHebrew:
      'הקשיבו לקצב וחפשו את גודל הקפיצה הקבוע בין התווים כדי לגלות את המספר שחסר!',
  },
  observatory: {
    artKey: 'observatory',
    titleHebrew: 'משחק הכוכבים',
    whatToDo: 'ספרו את כל הכוכבים שמאירים בשמיים לפני שהזמן אוזל!',
    tipHebrew: 'אל תספרי כוכב-כוכב! בדקי לפי הצורות: כל ריבוע שווה 4 כוכבים וכל משולש שווה 3. חברי את הקבוצות יחד!',
  },
  clocks: {
    artKey: 'watches',
    titleHebrew: 'מגדל השעון',
    whatToDo: 'כווני את המחוגים לשעה המבוקשת לפני שהזמן נגמר!',
    tipHebrew: 'זוכרת את הכלל? המחוג הקצר מראה את השעה, והמחוג הארוך סופר את הדקות בקפיצות של 5!',
  },
  picnic: {
    artKey: 'picnic',
    titleHebrew: 'סל הפיקניק',
    whatToDo: 'זכרו אילו פירות ראיתם בסל לפני שהוא ייסגר!',
    tipHebrew: 'אל תנסי לזכור הכל בבת אחת! תסתכלי מיד איזה פרי תופס כמעט את כל הסל, ואיזה פרי יש ממש מעט בצד.',
  },
  cookieBakery: {
    artKey: 'cookie_bakery',
    titleHebrew: 'מאפיית העוגיות',
    whatToDo: 'חשבו כמה עוגיות נאפו על המגש בעזרת שורות וטורים!',
    tipHebrew: 'אל תספרי עוגייה-עוגייה! ספרי כמה יש בשורה אחת, ותכפילי במספר השורות.',
  },
  locks: {
    artKey: 'locks',
    titleHebrew: 'גשר המנעולים',
    whatToDo: 'פתרי את החידות ותוכלי לעבור בגשר.',
    tipHebrew: 'קחי את הזמן, אין פה שעון שרודף אחרייך! קראי את התרגיל בנחת ובחרי את הסימן הנכון (﬩, -, ×).',
  },
  /*
   * ============================================================================================
   * THE ISLAND'S TWO GAMES
   * ============================================================================================
   *
   * These are the first entries whose art does NOT come from `assets/screen/` - see `ART_SOURCES`
   * above, which now globs `assets/island/` as well. Before that change these two keys would have
   * resolved to no banner and their cards would have silently rendered art-less.
   *
   * THE COPY IS PEDAGOGICAL, NOT DECORATIVE, WHICH MATTERS MORE HERE THAN ANYWHERE ELSE. Both of
   * these games are deliberately NON-math - they train working memory and inhibitory control - so
   * there is no sum to check the answer against and the child's only guide is the strategy. Tamar's
   * tips are therefore the actual teaching: chunking ("look for the shape the windows make") for the
   * tower, and suppressing the salient-but-irrelevant cue ("the size of the balloon is a trick") for
   * the balloons. The games are the assessment; these two strings are the instruction.
   *
   * `whatToDo` FOR THE BALLOONS CARRIES THE WHOLE RULE IN ONE CLAUSE because the game is unwinnable
   * without it: tapping the LARGEST balloon is the natural, wrong response, and the task is to ignore
   * size and compare the DIGITS. A child who skips this line and taps the giant balloon will score
   * zero and learn nothing except that the game is unfair.
   */
  islandTower: {
    artKey: 'building_screen',
    titleHebrew: 'חלונות במגדל',
    whatToDo: 'זכרו אילו חלונות הוארו במגדל והקישו עליהם בדיוק!',
    tipHebrew: 'אל תנסו לזכור חלון בודד! חפשו צורה שהחלונות יוצרים יחד – כמו קו ישר, פינה, או ריבוע קטן.',
  },
  islandBalloons: {
    artKey: 'balloon_screen',
    titleHebrew: 'כדורים מתעתעים',
    whatToDo: 'הקישו על הכדור הפורח עם המספר הגבוה ביותר – והתעלמו מגודל הכדור!',
    tipHebrew: 'העיניים נמשכות לכדור הענקי, אבל המוח מחפש רק את המספר! הסתכלו ישר על הספרה שבמרכז.',
  },
} as const satisfies Record<string, GameMeta>;

export type GameMetaKey = keyof typeof GAME_META;

export function districtFor(type: HexTileType): DistrictMeta | undefined {
  return DISTRICT_META[type];
}

