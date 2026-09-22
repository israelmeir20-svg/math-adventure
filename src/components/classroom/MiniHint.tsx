/**
 * A tiny picture that matches the problem type - the visual half of
 * Teacher Tamar's tip. Uses mini dot arrays / hop arrows, not the full helper.
 */
import type { MathProblem } from '../../types/game.types';
import { clamp } from '../math/visualBuilders';

const MAX_MINI_DOTS = 40;

export function MiniHint({ problem }: { problem: MathProblem }) {
  const data = problem.visualHelperData;
  if (!data) return null;

  if (problem.visualHelperType === 'array' || problem.visualHelperType === 'equalGroups') {
    return <MiniDots rows={clamp(data.rows ?? data.groups ?? 0, 1, 8)} columns={clamp(data.columns ?? data.perGroup ?? 0, 1, 8)} />;
  }

  if (problem.visualHelperType === 'numberLine') {
    return <MiniHops hops={clamp(data.hops ?? 0, 1, 8)} />;
  }

  return null;
}

function MiniDots({ rows, columns }: { rows: number; columns: number }) {
  const total = Math.min(rows * columns, MAX_MINI_DOTS);
  return (
    <div
      className="grid w-fit gap-[3px] rounded-lg bg-white/70 p-1.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className="h-2 w-2 rounded-full bg-violet-400" />
      ))}
    </div>
  );
}

function MiniHops({ hops }: { hops: number }) {
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {Array.from({ length: hops }, (_, index) => (
        <span key={index} className="text-sm font-black text-emerald-600">
          {index === 0 ? '•' : '↗'}
        </span>
      ))}
    </div>
  );
}
