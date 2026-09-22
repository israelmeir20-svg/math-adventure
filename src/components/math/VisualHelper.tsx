/**
 * Visual Helper Area: renders the right support picture for a problem.
 * Interactive where it helps (dots highlight on hover).
 */
import type { MathProblem } from '../../types/game.types';
import {
  arrayRows,
  dotGridCells,
  groupRows,
  hopTicks,
  placeValueCards,
  type DotRow,
} from './visualBuilders';

interface VisualHelperProps {
  problem: MathProblem;
  /** Forced on by the "reveal array" lifeline, even if the type has no helper. */
  revealed?: boolean;
  /** Draws the 10x10 dot-grid lifeline instead of the problem's own helper. */
  showDotGrid?: boolean;
}

export default function VisualHelper({
  problem,
  revealed = false,
  showDotGrid = false,
}: VisualHelperProps) {
  if (showDotGrid) return <DotGrid />;

  const data = problem.visualHelperData;
  if (!data && !revealed) return null;

  switch (problem.visualHelperType) {
    case 'array':
      return <DotArray rows={arrayRows(data ?? {})} label="מערך נקודות" />;
    case 'equalGroups':
      return <DotArray rows={groupRows(data ?? {})} label="חלוקה לקבוצות שוות" />;
    case 'numberLine':
      return <NumberLine ticks={hopTicks(data ?? {})} />;
    case 'placeValueBlocks':
      return <PlaceValueCards data={data ?? {}} />;
    case 'dotGrid':
      return <DotGrid />;
    default:
      return revealed ? <DotArray rows={arrayRows(data ?? {})} label="מערך נקודות" /> : null;
  }
}

function DotArray({ rows, label }: { rows: DotRow[]; label: string }) {
  return (
    <figure className="flex flex-col items-center gap-2">
      <figcaption className="text-xs font-black text-amber-800/70">{label}</figcaption>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={`flex gap-1.5 ${
              row.grouped
                ? 'rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50 p-1.5'
                : ''
            }`}
          >
            {Array.from({ length: row.count }, (_, dotIndex) => (
              <span
                key={dotIndex}
                className="h-3.5 w-3.5 rounded-full bg-amber-400 shadow-[0_2px_0_#b45309] transition hover:bg-rose-400"
              />
            ))}
          </div>
        ))}
      </div>
    </figure>
  );
}

function NumberLine({ ticks }: { ticks: { value: number; hop: number }[] }) {
  return (
    <figure className="w-full">
      <figcaption className="mb-2 text-center text-xs font-black text-amber-800/70">
        ציר המספרים - קפיצות
      </figcaption>
      <svg viewBox={`0 0 ${Math.max(ticks.length * 60, 200)} 70`} className="h-24 w-full">
        <line
          x1={20}
          y1={40}
          x2={ticks.length * 60 - 20}
          y2={40}
          className="stroke-stone-400"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {ticks.map((tick, index) => {
          const x = 20 + index * 60;
          return (
            <g key={tick.hop}>
              {index > 0 && (
                <path
                  d={`M${x - 60} 40 Q${x - 30} 8 ${x} 40`}
                  className="fill-none stroke-emerald-500"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                />
              )}
              <circle cx={x} cy={40} r={5} className="fill-amber-500" />
              <text
                x={x}
                y={62}
                textAnchor="middle"
                className="fill-stone-600 text-[13px] font-bold"
              >
                {tick.value}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function PlaceValueCards({ data }: { data: Parameters<typeof placeValueCards>[0] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {placeValueCards(data).map((card) => (
        <div
          key={card.label}
          className={`w-16 rounded-2xl px-2 py-3 text-center shadow-[0_4px_0_rgba(0,0,0,0.12)] ${card.color}`}
        >
          <div className="text-2xl font-black tabular-nums">{card.value}</div>
          <div className="text-[11px] font-bold opacity-80">{card.label}</div>
        </div>
      ))}
    </div>
  );
}

function DotGrid() {
  return (
    <div className="mx-auto grid w-fit grid-cols-10 gap-1 rounded-2xl bg-white/80 p-2 shadow-inner">
      {dotGridCells().map((cell) => (
        <span key={cell} className="h-2.5 w-2.5 rounded-full bg-stone-300" />
      ))}
    </div>
  );
}
