/**
 * The mental-math shortcuts shown in "ספר הטריקים של תמר".
 * Separate from the modal so the modal file only exports a component.
 */

/**
 * The four chapters the book is divided into.
 *
 * ================================================================================================
 * WHY TABS RATHER THAN THE ONE LONG LIST
 * ================================================================================================
 *
 * The book was a flat grid of eight cards. That is not a long list in absolute terms, but it is a long
 * list for its purpose: a child opens it while stuck on a problem to find ONE trick, and a wall of eight
 * equally-weighted cards makes that a scanning task with no shape to it. The chapters give the content a
 * structure that matches how the tricks are actually taught - the easy tables first, then the doubling
 * family, then the nines, then the rules that have no table of their own.
 *
 * THE DIVISION IS EXHAUSTIVE AND DISJOINT, which is what makes tabs safe: every trick belongs to exactly
 * one chapter, so nothing can be orphaned in a tab nobody opens, and no trick appears twice. `TRICKS` is
 * typed against these ids, so adding a trick without choosing a chapter is a compile error.
 */
export const TRICK_TABS = [
  { id: 'easy', label: 'הכפולות הקלות', hint: '1, 2, 5, 10', emoji: '🟢' },
  { id: 'doubling', label: 'טריק ההכפלה', hint: '4, 8', emoji: '🔁' },
  { id: 'nines', label: 'קסם ה-9', hint: '9', emoji: '9️⃣' },
  { id: 'golden', label: 'כללי זהב', hint: 'חוקים שחוסכים עבודה', emoji: '⭐' },
] as const;

export type TrickTabId = (typeof TRICK_TABS)[number]['id'];

export interface Trick {
  title: string;
  body: string;
  example: string;
  emoji: string;
  /** The chapter this trick lives in. Required, so a new trick cannot be filed nowhere. */
  tab: TrickTabId;
}

export const TRICKS: Trick[] = [
  {
    title: 'טריק התשעים',
    body: 'כל מספר כפול 9 הוא בעצם כפול 10 ואז פחות המספר עצמו.',
    example: '9 × 7 = (10 × 7) − 7 = 70 − 7 = 63',
    emoji: '9️⃣',
    tab: 'nines',
  },
  {
    title: 'טריק הכפול-כפול (4)',
    body: 'כפול 4 זה פשוט להכפיל פעמיים ב-2.',
    example: '4 × 6 = 2 × 6 ואז × 2 = 12 → 24',
    emoji: '4️⃣',
    tab: 'doubling',
  },
  {
    title: 'טריק הכפול-כפול (8)',
    body: 'כפול 8 הוא שלוש הכפלות של 2. קל לזכור ומהיר לחשב.',
    example: '8 × 5 = 5 → 10 → 20 → 40',
    emoji: '8️⃣',
    tab: 'doubling',
  },
  {
    title: 'טריק החמישיות',
    body: 'כפול 5 זה תמיד חצי מכפול 10, או פשוט לספור בקפיצות של 5.',
    example: '5 × 8 = חצי מ-80 = 40',
    emoji: '5️⃣',
    tab: 'easy',
  },
  {
    title: 'טריק העשיריות',
    body: 'כפול 10 זה להוסיף 0 בסוף המספר. פשוט מאוד!',
    example: '10 × 6 = 60',
    emoji: '🔟',
    tab: 'easy',
  },
  {
    title: 'טריק האחת',
    body: 'כפול 1 לא משנה כלום - המספר נשאר אותו מספר.',
    example: '1 × 9 = 9',
    emoji: '1️⃣',
    tab: 'easy',
  },
  {
    title: 'טריק הסדר',
    body: 'בכפל אפשר להחליף בין המספרים והתוצאה נשארת זהה.',
    example: '3 × 8 = 8 × 3 = 24',
    emoji: '🔄',
    tab: 'golden',
  },
  {
    title: 'טריק התשעים באצבעות',
    body: 'כפול 9 באצבעות: כופפו את האצבע המתאימה וספרו משני הצדדים.',
    example: '9 × 4 → 3 אצבעות ו-6 אצבעות = 36',
    emoji: '🖐️',
    tab: 'nines',
  },
];
