/**
 * The question banner and the round's outcome line for "משחק הכוכבים".
 *
 * THE BANNER TEXT IS A CONSTANT, AND THAT IS THE POINT. The rule is that no equation may ever
 * reach the child - no "3 + 4", no per-shape breakdown, nothing that reveals the grouping. The
 * previous game in this repo printed its grouping as a hint (`"4 + 4 + 3"`), which quietly
 * turned the puzzle into arithmetic: a child who added the hint got the answer without reading
 * the sky, and the counting skill the game exists to build went unpractised.
 *
 * So the prompt is not assembled from the round AT ALL. It is a string literal with no
 * interpolation, which means there is no code path that could leak a number - not on a miss,
 * not during feedback, not in a future edit that forgets the rule. A check in `tools/` asserts
 * this file contains no interpolation in the prompt, to keep it that way.
 *
 * THE OUTCOME LINE NAMES THE MISTAKE WITHOUT SHOWING THE SUM. On a miss it says how many
 * constellations there were and invites the child to recount - it never prints the total, and
 * never the group sizes. The counts themselves appear only as badges on the stage, one shape at
 * a time, where the child has to look at the sky to read them.
 */
import { Telescope } from 'lucide-react';
import { shapeCountOf } from './starGenerator';
import type { StarRound } from './starTypes';

/** The one question, written out in full. Never built from round data. */
const PROMPT = 'כמה כוכבים מאירים בשמיים? ⭐';

interface StarStatusProps {
  round: StarRound;
  answered: boolean;
  correct: boolean;
}

export default function StarStatus({ round, answered, correct }: StarStatusProps) {
  const groups = shapeCountOf(round);

  return (
    <div className="flex flex-col gap-2" dir="rtl">
      <p className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-4 border-indigo-900/70 bg-gradient-to-b from-indigo-50 to-indigo-100 px-4 py-2 text-center text-xl font-black text-indigo-950 shadow-[0_4px_0_rgba(30,27,75,0.45)]">
        <Telescope className="h-5 w-5 shrink-0 text-indigo-700" />
        {PROMPT}
      </p>

      {answered && (
        <p
          className={`rounded-2xl px-3 py-2 text-center text-sm font-black ${
            correct ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
          }`}
        >
          {correct
            ? 'כל הכבוד! ספרתם את כל הכוכבים 🌟'
            : // The hint is the NUMBER OF GROUPS, never the total and never a group's size.
              `יש כאן ${groups === 1 ? 'צורה אחת' : `${groups} צורות`} - ספרו כל אחת בנפרד ונסו שוב`}
        </p>
      )}
    </div>
  );
}
