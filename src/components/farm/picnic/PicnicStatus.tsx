/**
 * The status strip and the wrong-answer explanation.
 *
 * THE STATUS LINE IS NOT DECORATION. This game charges the child for some windows and
 * not others, which is invisible unless it is stated. Telling them plainly which
 * window they are in means a child never has to guess whether looking costs them
 * time - and the answer is always visible rather than inferred.
 *
 * THE EXPLANATION NAMES THE WINNER rather than just reporting the miss, so a wrong
 * round still teaches the comparison it was asking about.
 */
import { Eye } from 'lucide-react';
import { picnicFruitInfo } from './picnicFruits';
import type { PicnicQuestion } from './picnicTypes';

interface PicnicStatusProps {
  /** True while the cloth covers the crate. */
  covered: boolean;
  /** True once the round has been answered. */
  answered: boolean;
  /** True when the player's answer was right - the reveal says so without advice. */
  correct: boolean;
  /** What the round asked, for wording the correction. */
  question: PicnicQuestion;
  /** The fruit that actually answered the question. */
  answer: string;
}

export default function PicnicStatus({
  covered,
  answered,
  correct,
  question,
  answer,
}: PicnicStatusProps) {
  const info = picnicFruitInfo(answer);

  return (
    <>
      <p className="flex items-center justify-center gap-1.5 text-[12px] font-black text-emerald-100/90">
        {!covered ? (
          <>
            <Eye className="h-3.5 w-3.5" /> הסתכלו היטב - הסל עומד להיסגר!
          </>
        ) : answered ? (
          <>🧺 כך נראה הסל מבפנים</>
        ) : (
          <>⏱️ הזמן רץ - בחרו פרי</>
        )}
      </p>

      {answered && !correct && (
        <p
          dir="rtl"
          className="rounded-2xl bg-rose-500/95 px-3 py-2 text-center text-[13px] font-black text-white shadow-[0_3px_0_#881337]"
        >
          {question === 'most'
            ? `היה הכי הרבה ${info.label} ${info.emoji}`
            : `היה הכי מעט ${info.label} ${info.emoji}`}
        </p>
      )}
    </>
  );
}
