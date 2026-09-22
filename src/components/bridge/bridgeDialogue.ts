/**
 * The Bridge Guard's personality: lock names and his (friendly, forgetful)
 * dialogue lines. Kept separate so the round logic stays focused.
 */
import { pick } from '../../logic/random';

export type LockTier = 'bronze' | 'silver' | 'gold';

export interface LockDefinition {
  tier: LockTier;
  nameHebrew: string;
  emoji: string;
}

export const LOCKS: LockDefinition[] = [
  { tier: 'bronze', nameHebrew: 'מנעול ארד', emoji: '🥉' },
  { tier: 'silver', nameHebrew: 'מנעול כסף', emoji: '🥈' },
  { tier: 'gold', nameHebrew: 'מנעול זהב', emoji: '🥇' },
];

export const GUARD_NAME = 'השומר המבולבל';

export const DIALOGUE = {
  intro: [
    'שלום שלום! אני השומר המבולבל... איבדתי את מפתח המאסטר של הגשר! 🔑',
    'שלושה מנעולים סוגרים את הגשר. אם תעזרו לי לפתוח אותם - הדרך פתוחה!',
  ],
  lockOpen: [
    'וואו! המנעול הסתובב כמו חמאה! 🧈',
    'איזה כיף! עוד מנעול אחד פחות לדאוג בגללו!',
    'המנעול נפתח! אני כמעט זוכר איפה שמתי את המפתח...',
  ],
  mistake: [
    'אוי, המספר הזה לא מסתובב במנעול! ננסה תרגיל דומה 🔑',
    'המנעול עושה פרצוף מצחיק... בואו ננסה מספר אחר!',
    'אופס! ניסיתי גם אני וזה לא עבד. הנה תרגיל חדש!',
  ],
  finalOpen: [
    'הגשר יורד! כל הכבוד, עוזרים יקרים! 🌉',
    'מצאתי את המפתח... בעצם אתם פתחתם הכל לבד. מדהים!',
  ],
} as const;

export function pickDialogue(lines: readonly string[]): string {
  return pick(lines);
}

export const BRIDGE_COOKIE_REWARD = 30;
export const BRIDGE_STAR_REWARD = 1;
