/**
 * The mini mental-math gate in front of the 50/50 lifeline.
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import { fiftyFiftyChallenge } from './problemText';
import { useAnswerFeedback } from './useAnswerFeedback';

interface FiftyFiftyChallengeProps {
  onSolved: () => void;
  onCancel: () => void;
}

export default function FiftyFiftyChallenge({
  onSolved,
  onCancel,
}: FiftyFiftyChallengeProps) {
  const [challenge] = useState(fiftyFiftyChallenge);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const feedback = useAnswerFeedback();

  const submit = () => {
    const parsed = Number(value.trim());
    if (Number.isNaN(parsed)) return;
    if (parsed === challenge.answer) {
      feedback(true);
      onSolved();
      return;
    }
    setError(true);
    feedback(false);
  };

  return (
    <div className="rounded-2xl border-2 border-violet-300 bg-violet-100 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-black text-violet-900">
          כדי לקבל 50/50 - פתרו את החישוב המהיר:
        </p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="בטל"
          className="grid h-7 w-7 place-items-center rounded-xl bg-white text-stone-500 shadow-[0_2px_0_rgba(0,0,0,0.15)] active:translate-y-[2px] active:shadow-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-2 text-lg font-black tabular-nums text-violet-950">
        {challenge.textHebrew}
      </p>

      {error && (
        <p className="mb-2 text-xs font-black text-rose-600">
          לא מדויק - נסו שוב, או השתמשו במטען חי.
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          autoFocus
          onChange={(event) => {
            setValue(event.target.value);
            setError(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submit();
          }}
          className="w-28 rounded-2xl border-2 border-violet-300 bg-white px-3 py-2 text-center text-xl font-black tabular-nums text-stone-800 outline-none focus:border-violet-500"
          aria-label="התשובה שלך"
        />
        <button
          type="button"
          onClick={submit}
          className="rounded-2xl bg-violet-400 px-4 py-2.5 text-sm font-black text-white shadow-[0_4px_0_#6d28d9] transition active:translate-y-[3px] active:shadow-none"
        >
          בדיקה
        </button>
      </div>
    </div>
  );
}
