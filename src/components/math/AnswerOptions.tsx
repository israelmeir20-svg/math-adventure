/**
 * The four tactile multiple-choice buttons, with reveal/correct/wrong states.
 */
interface AnswerOptionsProps {
  options: number[];
  /** Options hidden by the 50/50 lifeline. */
  hidden: number[];
  picked: number | null;
  correctAnswer: number;
  isCorrect: boolean | null;
  onPick: (value: number) => void;
}

export default function AnswerOptions({
  options,
  hidden,
  picked,
  correctAnswer,
  isCorrect,
  onPick,
}: AnswerOptionsProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {options.map((option) => {
        const isHidden = hidden.includes(option);
        const isChosenWrong = isCorrect === false && picked === option;
        const isReveal = isCorrect === false && option === correctAnswer;
        const isRight = isCorrect === true && option === correctAnswer;

        const tone = isRight
          ? 'bg-emerald-400 text-emerald-950 shadow-[0_6px_0_#047857]'
          : isReveal
            ? 'bg-emerald-200 text-emerald-900 shadow-[0_6px_0_#047857]'
            : isChosenWrong
              ? 'bg-rose-300 text-rose-950 shadow-[0_6px_0_#9f1239]'
              : 'bg-white text-stone-700 shadow-[0_6px_0_#a8a29e] hover:bg-amber-50';

        return (
          <li key={option}>
            <button
              type="button"
              disabled={isHidden || isCorrect !== null}
              onClick={() => onPick(option)}
              className={`flex w-full items-center justify-center rounded-2xl px-3 py-5 text-3xl font-black tabular-nums transition active:translate-y-[4px] active:shadow-none disabled:active:translate-y-0 ${tone} ${
                isHidden ? 'scale-90 opacity-25' : ''
              }`}
            >
              {option}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
