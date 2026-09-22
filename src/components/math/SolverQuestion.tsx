/**
 * The big question display: Hebrew prompt + huge operands with the operator.
 */
import { Cookie } from 'lucide-react';
import type { MathProblem } from '../../types/game.types';
import { OPERATOR_LABEL } from './problemText';

interface SolverQuestionProps {
  problem: MathProblem;
  tileLabel: string;
  cookiesEarned: number;
  shaking: boolean;
}

export default function SolverQuestion({
  problem,
  tileLabel,
  cookiesEarned,
  shaking,
}: SolverQuestionProps) {
  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-900">
          {tileLabel}
        </span>
        <span className="rounded-full bg-emerald-200 px-3 py-1 text-xs font-black text-emerald-900">
          <Cookie className="me-1 inline h-3.5 w-3.5" />+{cookiesEarned}
        </span>
      </div>

      <section className="my-4 text-center">
        {problem.type !== 'multiplication' && (
          <p className="mb-2 text-base font-bold text-stone-500">
            {problem.questionTextHebrew}
          </p>
        )}
        <div
          className={`flex items-center justify-center gap-4 text-5xl font-black tabular-nums text-stone-800 sm:text-6xl ${
            shaking ? 'animate-[shake_.4s_ease-in-out]' : ''
          }`}
        >
          <span>{problem.operandA}</span>
          <span className="text-amber-600">{OPERATOR_LABEL[problem.operator]}</span>
          <span>{problem.operandB}</span>
          <span className="text-stone-400">=</span>
          <span className="text-emerald-600">?</span>
        </div>
      </section>
    </>
  );
}
