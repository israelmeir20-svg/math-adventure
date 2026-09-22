/**
 * Success / try-again overlay shown inside the solver after an answer.
 */
import { PartyPopper, RefreshCw } from 'lucide-react';

interface SolverFeedbackProps {
  isCorrect: boolean;
  praise: string;
  hintHebrew: string;
  cookiesEarned: number;
  streakMultiplier: 1 | 2;
  eraserSaved: boolean;
  onContinue: () => void;
  onRetry: () => void;
}

export default function SolverFeedback({
  isCorrect,
  praise,
  hintHebrew,
  cookiesEarned,
  streakMultiplier,
  eraserSaved,
  onContinue,
  onRetry,
}: SolverFeedbackProps) {
  return (
    <div
      className={`rounded-2xl border-2 p-3 text-center ${
        isCorrect
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-rose-200 bg-rose-50'
      }`}
      role="status"
    >
      <p
        className={`mb-1 flex items-center justify-center gap-2 text-lg font-black ${
          isCorrect ? 'text-emerald-800' : 'text-rose-800'
        }`}
      >
        <PartyPopper className="h-5 w-5" />
        {praise}
      </p>

      {isCorrect ? (
        <p className="mb-3 text-sm font-bold text-emerald-900/80">
          +{cookiesEarned} 🍪
          {streakMultiplier === 2 && ' · בונוס רצף ×2! 🌟'}
        </p>
      ) : (
        <p className="mb-3 text-sm font-bold text-rose-900/80">
          💡 {hintHebrew}
          {eraserSaved && ' · המחק הציל את הרצף! 🧽'}
        </p>
      )}

      {isCorrect ? (
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-base font-black text-emerald-950 shadow-[0_5px_0_#047857] transition active:translate-y-[4px] active:shadow-none"
        >
          המשך הלאה 🚀
        </button>
      ) : (
        <button
          type="button"
          onClick={onRetry}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-base font-black text-amber-950 shadow-[0_5px_0_#b45309] transition active:translate-y-[4px] active:shadow-none"
        >
          <RefreshCw className="h-5 w-5" /> נסה שוב
        </button>
      )}
    </div>
  );
}
