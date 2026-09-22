/**
 * "המורה תמר" - the encouraging companion header shown above a problem.
 * Shows a strategy tip plus a mini picture that matches the problem type.
 */
import { BookOpen, GraduationCap } from 'lucide-react';
import type { MathProblem } from '../../types/game.types';
import { TYPE_TIPS } from '../math/problemText';
import { MiniHint } from './MiniHint';

interface TeacherTamarProps {
  problem: MathProblem;
  /** Opens the tricks book. */
  onOpenTricks: () => void;
}

const TAMAR_EMOJI = '👩‍🏫';

export default function TeacherTamar({ problem, onOpenTricks }: TeacherTamarProps) {
  return (
    <section className="flex items-start gap-3 rounded-2xl border-2 border-violet-200 bg-gradient-to-l from-violet-50 to-fuchsia-50 p-3">
      <span
        aria-hidden
        className="grid h-12 w-12 shrink-0 animate-[hop_3s_ease-in-out_infinite] place-items-center rounded-2xl bg-white text-2xl shadow-[0_4px_0_rgba(0,0,0,0.12)] motion-reduce:animate-none"
      >
        {TAMAR_EMOJI}
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="flex items-center gap-1.5 text-sm font-black text-violet-900">
          <GraduationCap className="h-4 w-4" />
          המורה תמר
        </h3>
        <p className="mb-2 text-sm font-bold leading-snug text-stone-600">
          {TYPE_TIPS[problem.type]}
        </p>
        <MiniHint problem={problem} />
      </div>

      <button
        type="button"
        onClick={onOpenTricks}
        className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-violet-400 px-3 py-2 text-xs font-black text-white shadow-[0_4px_0_#6d28d9] transition active:translate-y-[3px] active:shadow-none"
      >
        <BookOpen className="h-4 w-4" />
        <span className="hidden sm:inline">ספר הטריקים</span>
        <span className="sm:hidden">טריקים</span>
      </button>
    </section>
  );
}
