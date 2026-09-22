/**
 * Case definitions for "חקירת המתמטיקה" (Detective Math).
 *
 * A CASE IS THREE STATIONS THAT SHARE ONE UNKNOWN, approached three ways: a spatial puzzle,
 * a balance written as a notebook, and a number line. `station2.solutionX` is the value the
 * second station resolves to, and it is handed forward to station 3 as `solutionX`.
 *
 * THE THREE STATIONS DO NOT CARRY THE SAME NUMBER, and the names are a trap worth naming
 * explicitly. `station1.targetValue` is the quantity that station MEASURES - a sector size, an
 * area, a perimeter. `station2.solutionX` is the value of the unknown in its own equation.
 * `station3.targetPosition` is a POINT ON THE CHASE'S NUMBER LINE, which is the step size
 * multiplied by the number of hops. In the shipped cases these are three different numbers
 * that happen to describe the same thief, so nothing here asserts they are equal.
 *
 * WHETHER THEY SHOULD BE EQUAL IS AN OPEN DESIGN QUESTION, not an established invariant, and
 * it is deliberately left alone: changing the numbers would change the puzzles, and the four
 * cases were authored as they stand. The orchestrator only wires the stations together.
 *
 * THIS FILE IS PURE DATA. No React, no CSS, no imports beyond the asset folder's own module
 * map. That is what lets the four cases be read - and the arithmetic between the three
 * stations be checked - without a bundler, and it is why the suspect sprite is looked up at
 * render time by name rather than imported here.
 */

/** Station 1's puzzle shapes: the four hands-on spatial framings. */
export type Station1Type = 'symmetry' | 'window' | 'tray' | 'garden';
/** Station 2's equation shapes: the four ways a balance gets written down. */
export type Station2Type = 'additive' | 'multiplicative' | 'two-step' | 'both-sides';
/** Station 3's chase shapes: the four ways the trail pays off. */
export type Station3Type = 'ambush' | 'puddle' | 'common-multiple' | 'burrow';

/**
 * Station 1's payload, one variant per puzzle type.
 *
 * TYPED AS A DISCRIMINATED UNION RATHER THAN `any`. The original scaffold carried `data: any`,
 * which meant a case could ship with `rows`/`cols` for a symmetry puzzle and nothing would
 * complain - it would simply render an empty grid at runtime, in front of a child. Keying the
 * payload off `type` makes that a compile error instead.
 */
export type Station1Data =
  /** `tray`: a grid of cells to be cut into `targetSectors` equal pieces. */
  | { type: 'tray'; rows: number; cols: number; targetSectors: number }
  /** `symmetry`: a half-drawn grid whose other half must mirror `leftActiveCoords`. */
  | {
      type: 'symmetry';
      gridSize: number;
      leftActiveCoords: { r: number; c: number }[];
    }
  /** `window`: glass fragments to choose between, exactly one flagged `correct`. */
  | {
      type: 'window';
      targetVertices: number;
      options: {
        id: number;
        vertices: number;
        area: number;
        type: string;
        correct?: boolean;
      }[];
    }
  /** `garden`: candidate routes, exactly one of which has the target perimeter. */
  | {
      type: 'garden';
      routes: { id: string; perimeter: number; path: string; correct?: boolean }[];
    };

export interface Station1Config {
  type: Station1Type;
  title: string;
  instruction: string;
  /** The value this station is measuring - the same unknown the other two lead to. */
  targetValue: number;
  /** Background art for the station, by filename inside `src/assets/mystery/`. */
  bgAsset: string;
  /** Optional second sprite (a prop the puzzle needs), by filename. */
  extraAsset?: string;
  data: Station1Data;
}

/**
 * Station 2: the case written as a balance of evidence.
 *
 * Photos and notes on each side are the two "weights", and `solutionX` is what balances them.
 * The four `type`s are the four ways a child can be asked to solve it - add the left, add the
 * right, compare them, or undo a two-step - which is why the numbers alone do not determine
 * the answer and the type is carried explicitly.
 */
export interface Station2Config {
  type: Station2Type;
  leftPhotos: number;
  leftNotes: number;
  rightPhotos: number;
  rightNotes: number;
  /** The unknown the equation resolves to. Handed forward to station 3. */
  solutionX: number;
  /** The emoji stamped on each note, so the two sides read as different evidence. */
  noteIcon: string;
}

export interface Station3Config {
  type: Station3Type;
  title: string;
  instruction: string;
  /** How far the suspect moves per hop - his speed, in the game's fiction. */
  stepSize: number;
  /** How many hops he makes, for the types that count them. */
  totalSteps?: number;
  /**
   * Where the suspect must be caught.
   *
   * THIS IS A POINT ON THE CHASE'S OWN NUMBER LINE - typically `stepSize * totalSteps` - and
   * NOT a copy of `station2.solutionX`. The two are different numbers in every shipped case,
   * so nothing downstream should assume they match.
   */
  targetPosition: number;
  /** The choices offered for where to strike. */
  options: number[];
  extraAsset?: string;
}

export interface DetectiveCase {
  id: string;
  title: string;
  suspectName: string;
  /** Suspect badge art, by filename inside `src/assets/mystery/`. */
  suspectAsset: string;
  station1: Station1Config;
  station2: Station2Config;
  station3: Station3Config;
}

/**
 * The four cases.
 *
 * EACH ONE IS A DIFFERENT ANIMAL AND A DIFFERENT MECHANIC, deliberately: the maths is the
 * same shape every time (one unknown, three views of it) so the SKILL transfers, while the
 * presentation changes so the child does not simply memorise the answer to a puzzle they have
 * already seen. The step sizes differ by case - 6, 7, 4 and 3 - which is what keeps the chase
 * from being the same skip-counting exercise four times over.
 */
export const CASE_TEMPLATES: DetectiveCase[] = [
  {
    id: 'case-honeycomb',
    title: 'שוד כוורת הדבש',
    suspectName: 'השועל הזריז',
    suspectAsset: 'medalfox.png',
    station1: {
      type: 'tray',
      title: 'חלוקת חצר הדבש',
      instruction: 'חלקי את המגש ל-3 גזרות שוות של 4 משבצות',
      targetValue: 4,
      bgAsset: 'tray.png',
      data: { type: 'tray', rows: 3, cols: 4, targetSectors: 3 },
    },
    station2: {
      type: 'multiplicative',
      leftPhotos: 3,
      leftNotes: 0,
      rightPhotos: 0,
      rightNotes: 18,
      solutionX: 6,
      noteIcon: '🍯',
    },
    station3: {
      type: 'ambush',
      title: 'מארב בשביל העפר',
      instruction: 'הגנב מזנק בקפיצות של 6. לאחר 4 קפיצות – היכן להציב את הרשת?',
      stepSize: 6,
      totalSteps: 4,
      targetPosition: 24,
      options: [18, 20, 24, 30],
      extraAsset: 'net1.png',
    },
  },
  {
    id: 'case-crest',
    title: 'תעלומת התג השבור',
    suspectName: 'החתול החמקמק',
    suspectAsset: 'medalcat.png',
    station1: {
      type: 'symmetry',
      title: 'שחזור תג הזיהוי',
      instruction: 'השלימי את המשבצות בצד ימין כדי ליצור שיקוף מושלם',
      targetValue: 3,
      bgAsset: 'medalcat.png',
      data: {
        type: 'symmetry',
        gridSize: 6,
        leftActiveCoords: [
          { r: 1, c: 2 },
          { r: 2, c: 1 },
          { r: 4, c: 2 },
        ],
      },
    },
    station2: {
      type: 'additive',
      leftPhotos: 1,
      leftNotes: 5,
      rightPhotos: 0,
      rightNotes: 12,
      solutionX: 7,
      noteIcon: '🐾',
    },
    station3: {
      type: 'puddle',
      title: 'העקבה האבודה בשלולית',
      instruction: 'הגנב צועד בדילוגי 7 (7, 14, __, 28). איזה מספר טבוע בבוץ?',
      stepSize: 7,
      targetPosition: 21,
      options: [19, 21, 23, 26],
      extraAsset: 'gap.png',
    },
  },
  {
    id: 'case-window',
    title: 'פריצת חלון האסם',
    suspectName: 'הדביבון השובב',
    suspectAsset: 'medalsheep.png',
    station1: {
      type: 'window',
      title: 'שחזור זגוגית הויטראז',
      instruction: 'התאימי את השבר בעל 4 קודקודים ושטח 12 למסגרת החלון',
      targetValue: 12,
      bgAsset: 'window.jpeg',
      data: {
        type: 'window',
        targetVertices: 4,
        options: [
          { id: 1, vertices: 3, area: 12, type: 'triangle' },
          { id: 2, vertices: 4, area: 10, type: 'trapezoid' },
          { id: 3, vertices: 4, area: 12, type: 'rectangle', correct: true },
        ],
      },
    },
    station2: {
      type: 'two-step',
      leftPhotos: 2,
      leftNotes: 3,
      rightPhotos: 0,
      rightNotes: 11,
      solutionX: 4,
      noteIcon: '🍎',
    },
    station3: {
      type: 'common-multiple',
      title: 'נקודת המפגש במרדף',
      instruction: 'הגנב מדלג ב-4 וכלב הגישוש ב-6. באיזו נקודה שניהם ייפגשו לראשונה?',
      stepSize: 4,
      targetPosition: 12,
      options: [10, 12, 16, 20],
      extraAsset: 'net2.png',
    },
  },
  {
    id: 'case-garden',
    title: 'ערוגת התותים שנרמסה',
    suspectName: 'פרת הבר',
    suspectAsset: 'medalcow.png',
    station1: {
      type: 'garden',
      title: 'מדידת היקף המסלול',
      instruction: 'מצאי את המסלול שהיקפו שווה בדיוק ל-14 צעדים',
      targetValue: 14,
      bgAsset: 'garden_bed.jpeg',
      data: {
        type: 'garden',
        routes: [
          { id: 'A', perimeter: 12, path: 'M 2 2 H 5 V 5 H 2 Z' },
          { id: 'B', perimeter: 14, path: 'M 1 2 H 6 V 4 H 1 Z', correct: true },
          { id: 'C', perimeter: 16, path: 'M 2 1 H 6 V 5 H 2 Z' },
        ],
      },
    },
    station2: {
      type: 'both-sides',
      leftPhotos: 2,
      leftNotes: 2,
      rightPhotos: 1,
      rightNotes: 5,
      solutionX: 3,
      noteIcon: '🍓',
    },
    station3: {
      type: 'burrow',
      title: 'איתור מחילת השלל',
      instruction:
        'נגנבו 17 תותים בסלים מלאים של 3. 2 תותים נשמטו בחוץ. באיזו מחילה מתחבא הגנב?',
      stepSize: 3,
      targetPosition: 15,
      options: [12, 15, 18, 21],
      extraAsset: 'burrow.png',
    },
  },
];

/**
 * Picks a case at random.
 *
 * `Math.random` IS FINE HERE, unlike in the star generator. That one takes an injectable
 * source so a seeded run can be replayed and the geometry asserted; a case is chosen once when
 * a child presses play, and there is nothing to reproduce or verify about which one came up.
 *
 * The index is floored against `length - 1` rather than trusted, because `Math.random()`
 * returns a value strictly below 1 in every engine today - but a `random` that ever returned
 * exactly 1 would read past the end and hand back `undefined`, which would surface as a crash
 * inside the briefing card rather than as a bad case.
 */
export function getRandomCase(): DetectiveCase {
  const index = Math.min(
    CASE_TEMPLATES.length - 1,
    Math.floor(Math.random() * CASE_TEMPLATES.length),
  );
  return CASE_TEMPLATES[index]!;
}

/**
 * The suspect badge art for a case, resolved from its filename.
 *
 * `import.meta.glob` RATHER THAN A STATIC IMPORT PER SPRITE. The filename lives in the data, so
 * a case added later should light up by dropping its badge into the folder - not by editing an
 * import block. `eager` is used because there are four small badges and they are needed the
 * instant the briefing card mounts; a lazy map would make the suspect pop in a beat late.
 *
 * The lookup is guarded rather than asserted: a case whose `suspectAsset` names a file that is
 * not there returns the first available badge, so a typo degrades to the wrong animal instead
 * of a broken image on the briefing card.
 */
const SUSPECT_SPRITES = import.meta.glob('../../assets/mystery/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function spriteFor(filename: string): string | undefined {
  const match = Object.entries(SUSPECT_SPRITES).find(([path]) => path.endsWith(`/${filename}`));
  return match?.[1];
}

/** The badge for a case, always a usable URL. See `spriteFor` for the fallback rule. */
export function suspectSpriteFor(suspectAsset: string): string {
  return spriteFor(suspectAsset) ?? Object.values(SUSPECT_SPRITES)[0] ?? '';
}
