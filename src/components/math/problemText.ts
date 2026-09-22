/**
 * Tiny presentation helpers shared by the solver, Teacher Tamar and the
 * tricks book: operator glyphs, Hebrew encouraging tips and random praise.
 */
import type { MathProblemType, Operator } from '../../types/game.types';

/**
 * THE HEBREW PLUS, U+FB29, AND WHY ONLY THE GLYPH CHANGES.
 *
 * `﬩` is the plus sign Hebrew typography uses in RTL arithmetic, and it exists because a bare `+`
 * next to digits in a right-to-left run is genuinely ambiguous to a young reader - it can read as
 * part of the number rather than as an operation. The Hebrew form is drawn to sit unambiguously
 * beside Hebrew-set numerals.
 *
 * IT IS A DISPLAY SWAP AND NOTHING ELSE. The `Operator` union in `game.types` stays `'+'`, so every
 * generator, every `problemKey` in the mistake tracker and every stored problem is untouched - the
 * character never enters the data model, only the pixels. That matters because `problemKey` is a
 * storage format: a key written as `﬩:3:4` would not match a key read back as `+:3:4`, and the
 * review-cooldown tracker would silently forget every mistake it had recorded.
 *
 * The other three glyphs are already RTL-neutral: `−` is the true minus rather than a hyphen, and
 * `×` / `÷` have no bidi ambiguity at all.
 */
export const OPERATOR_LABEL: Record<Operator, string> = {
  '+': '﬩',
  '-': '−',
  '×': '×',
  '÷': '÷',
};

export const OPERATOR_NAME_HEBREW: Record<Operator, string> = {
  '+': 'חיבור',
  '-': 'חיסור',
  '×': 'כפל',
  '÷': 'חילוק',
};

/** A one-line strategy tip per problem type - the core of Teacher Tamar. */
export const TYPE_TIPS: Record<MathProblemType, string> = {
  multiplication: 'אפשר לחשוב על זה כשורות של נקודות - שורה כפול כמה שיש בכל שורה.',
  division: 'חלק שווה בשווה: חפשו איזה מספר כפול המחלק נותן את המחולק.',
  addition: 'פרקו לעשרות ולאחדות, ואז חברו כל חלק בנפרד.',
  subtraction: 'אפשר לחסר בשלבים: קודם עשרות, אחר כך אחדות.',
  numberLine: 'ספרו את הקפיצות על ציר המספרים - כל קפיצה באותו גודל.',
  placeValue: 'כל ספרה שווה משהו אחר: עשרת אחת שווה 10 אחדות.',
};

export const PRAISE_HEBREW = [
  'כל הכבוד! 🎉',
  'מעולה, תמר גאה בך! 🌟',
  'איזה יופי של חשיבה! ✨',
  'בול! ממשיכים כך! 🚀',
  'נכון מאוד! 🍪',
] as const;

export const ENCOURAGE_HEBREW = [
  'כמעט! בואו ננסה שוב יחד.',
  'טעות היא חלק מהלמידה. נסו שוב!',
  'לא נורא! תמר כאן לעזרה.',
] as const;

/** Number of option buttons removed by the 50/50 lifeline. */
export const FIFTY_FIFTY_REMOVALS = 2;

/** Picks a random entry from a readonly list. */
export function sampleOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

/** Builds a short Hebrew mental-math warm-up for the 50/50 lifeline. */
export function fiftyFiftyChallenge(): {
  textHebrew: string;
  answer: number;
} {
  if (Math.random() < 0.5) {
    const a = 10 + Math.floor(Math.random() * 40);
    const b = 10 + Math.floor(Math.random() * 40);
    return { textHebrew: `בחישוב מהיר: ${a} + ${b} = ?`, answer: a + b };
  }
  const a = 30 + Math.floor(Math.random() * 60);
  const b = 5 + Math.floor(Math.random() * 25);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return { textHebrew: `בחישוב מהיר: ${hi} − ${lo} = ?`, answer: hi - lo };
}
