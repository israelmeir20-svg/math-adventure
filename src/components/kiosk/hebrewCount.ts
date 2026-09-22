/**
 * Hebrew count-noun formatting for the kiosk's dialogue.
 *
 * ==================================================================
 * HEBREW NUMBERS AGREE WITH THEIR NOUN IN GENDER, WHICH IS THE WHOLE PROBLEM.
 * ==================================================================
 *
 * Writing "3 × ארטיק" is arithmetic; saying it out loud in Hebrew is grammar. The
 * numeral changes shape with the gender of the noun it counts - שלושה ארטיקים but
 * שלוש מחברות - so a formatter that concatenates a digit and a noun produces text no
 * Hebrew speaker would say. The child is reading these lines as language, so they have
 * to be right.
 *
 * There are three separate grammatical facts encoded here:
 *
 *   1. THE NUMERAL AGREES IN GENDER. 3-5 have distinct masculine (שלושה/ארבעה/חמישה)
 *      and feminine (שלוש/ארבע/חמש) forms, and 2 likewise (שני / שתי). The tables below
 *      are the two forms side by side, keyed by gender.
 *
 *   2. THE NOUN AGREES IN NUMBER *AND* TAKES THE RIGHT PLURAL FORM. Many Hebrew nouns
 *      have an irregular plural - עיפרון becomes עפרונות, not עיפרונים - so the plural
 *      cannot be derived by rule. Each item therefore carries its own plural, and its
 *      own gender, because only the noun knows both.
 *
 *   3. THE NUMERAL IS POSITIONED DIFFERENTLY BY VALUE. "ארטיק אחד" puts the word for
 *      one AFTER the noun; 3-5 put the numeral BEFORE it. So the placement is a
 *      property of the count, not of the noun, and the templates differ accordingly.
 *
 * WHY THIS IS A TABLE AND NOT A `for` LOOP. The text is authored data - the same reason
 * the level names and the item catalogue are literal. A rule-based generator would have
 * to infer gender and pluralise, which Hebrew does not permit reliably, so the honest
 * representation is a table plus an explicit per-noun record.
 */

/** Grammatical gender, which decides the shape of the numeral that counts the noun. */
export type Gender = 'm' | 'f';

/** One of the two numeral forms, by gender. */
type Pair = { m: string; f: string };

/**
 * The numerals 1-5, each with both forms.
 *
 * ONLY UP TO FIVE, DELIBERATELY. The kiosk never asks for more than five of an item: the
 * multiplication level draws its factors from the 2/3/4/5/10 tables, and a basket has at
 * most three lines. A sixth entry would be unused text that could silently rot, so the
 * formatter falls back to a digit-plus-noun form above five and the bound is stated here
 * rather than left as an unstated assumption.
 */
const NUMERALS: Record<number, Pair> = {
  1: { m: 'אחד', f: 'אחת' },
  2: { m: 'שני', f: 'שתי' },
  3: { m: 'שלושה', f: 'שלוש' },
  4: { m: 'ארבעה', f: 'ארבע' },
  5: { m: 'חמישה', f: 'חמש' },
};

/** The highest count this formatter can render grammatically. */
export const MAX_GRAMMATICAL_COUNT = 5;

/**
 * The nouns the kiosk actually says out loud, with their gender and irregular plural.
 *
 * THIS TABLE IS PER-NOUN BECAUSE HEBREW REQUIRES IT. Both fields are facts about the word
 * that cannot be computed from it: `עיפרון` is masculine and pluralises to `עפרונות`,
 * `מחברת` is feminine and pluralises to `מחברות`. Storing them together is the only
 * representation that cannot get one right and the other wrong.
 *
 * A noun missing from this table still renders - the formatter falls back to the singular
 * name with a numeral prefix - so adding an item to the shop cannot crash the bubble. It
 * would, however, read as slightly stilted Hebrew, which is why the fallback also exists
 * as a place to notice the omission.
 */
interface NounForms {
  /** Grammatical gender of the SINGULAR form, which is what the numeral agrees with. */
  gender: Gender;
  /** The singular, as the catalogue spells it. */
  singular: string;
  /** The plural. Irregular for many of these, so it is never derived. */
  plural: string;
}

const NOUN_FORMS: Record<string, NounForms> = {
  ארטיק: { gender: 'm', singular: 'ארטיק', plural: 'ארטיקים' },
  בייגלה: { gender: 'm', singular: 'בייגלה', plural: 'בייגלות' },
  מחברת: { gender: 'f', singular: 'מחברת', plural: 'מחברות' },
  'מחברת ציור': { gender: 'f', singular: 'מחברת ציור', plural: 'מחברות ציור' },
  מיץ: { gender: 'm', singular: 'מיץ', plural: 'מיצים' },
  במבה: { gender: 'f', singular: 'במבה', plural: 'במבות' },
  שוקולד: { gender: 'm', singular: 'שוקולד', plural: 'שוקולדים' },
  עיפרון: { gender: 'm', singular: 'עיפרון', plural: 'עפרונות' },
  סופגנייה: { gender: 'f', singular: 'סופגנייה', plural: 'סופגניות' },
  'ספר צביעה': { gender: 'm', singular: 'ספר צביעה', plural: 'ספרי צביעה' },
  'ספר קריאה': { gender: 'm', singular: 'ספר קריאה', plural: 'ספרי קריאה' },
  'משחק קופסה': { gender: 'm', singular: 'משחק קופסה', plural: 'משחקי קופסה' },
  'משחק הרכבה': { gender: 'm', singular: 'משחק הרכבה', plural: 'משחקי הרכבה' },
  כדור: { gender: 'm', singular: 'כדור', plural: 'כדורים' },
  אוזניות: { gender: 'f', singular: 'אוזניות', plural: 'אוזניות' },
  קלמר: { gender: 'm', singular: 'קלמר', plural: 'קלמרים' },
  'מחזיק מפתחות': { gender: 'm', singular: 'מחזיק מפתחות', plural: 'מחזיקי מפתחות' },
  חטיף: { gender: 'm', singular: 'חטיף', plural: 'חטיפים' },
  יוגורט: { gender: 'm', singular: 'יוגורט', plural: 'יוגורטים' },
  עוגייה: { gender: 'f', singular: 'עוגייה', plural: 'עוגיות' },
  פאזל: { gender: 'm', singular: 'פאזל', plural: 'פאזלים' },
  קלפים: { gender: 'm', singular: 'קלפים', plural: 'קלפים' },
  'תיק גב': { gender: 'm', singular: 'תיק גב', plural: 'תיקי גב' },
  רמקול: { gender: 'm', singular: 'רמקול', plural: 'רמקולים' },
  כרית: { gender: 'f', singular: 'כרית', plural: 'כריות' },
  מטען: { gender: 'm', singular: 'מטען', plural: 'מטענים' },
  מצלמה: { gender: 'f', singular: 'מצלמה', plural: 'מצלמות' },
  'שעון יד': { gender: 'm', singular: 'שעון יד', plural: 'שעוני יד' },
};

/**
 * "ארטיק אחד" / "שני ארטיקים" / "שלושה ארטיקים" - a count with its noun, in Hebrew.
 *
 * THE PLACEMENT RULE IS THE INTERESTING PART. For one, Hebrew puts the numeral AFTER the
 * noun ("ארטיק אחד"). For two and up it goes BEFORE it ("שני ארטיקים"). So the count
 * chooses the template, not just the word - which is why the two branches below are not
 * the same string with a different substitution.
 *
 * Counts above `MAX_GRAMMATICAL_COUNT` fall back to a digit and the plural, which is
 * understandable but not ideal Hebrew. The kiosk cannot currently produce one, so this is
 * a safety net rather than a code path in use.
 */
export function formatCount(count: number, nameHebrew: string): string {
  const forms = NOUN_FORMS[nameHebrew];

  // A noun the table does not know: still say something sensible rather than nothing.
  if (!forms) {
    return count === 1 ? `${nameHebrew} אחד` : `${count} ${nameHebrew}`;
  }

  const numeral = NUMERALS[count];
  if (!numeral) return `${count} ${forms.plural}`;

  const word = forms.gender === 'm' ? numeral.m : numeral.f;

  // ONE IS POSTPOSITIVE, TWO AND UP ARE PREPOSITIVE.
  if (count === 1) return `${forms.singular} ${word}`;
  return `${word} ${forms.plural}`;
}
