/**
 * The pie for "פיצריית השברים".
 *
 * WEDGES ARE DRAWN WITH EXACT TRIGONOMETRY. Every slice is one path from the
 * centre out to the crust and back, swept by `2π / totalSlices`, so the cut is
 * mathematically even no matter whether the pie is halved, quartered or cut into
 * eighths. The child is being asked to reason about equal parts, so the drawing
 * has to actually BE equal parts.
 *
 * THE CANVAS IS A SQUARE, CENTRED ON THE PIE. It used to be an 800x380 oblong with
 * a brown workbench filling the space around a pie that only ever occupied the
 * middle of it - dead scenery on both sides, and a size ceiling on the pie forced
 * by the canvas height. The viewBox now hugs the pie, and the caller's width/height
 * classes decide how big it draws, so the pie grows with the space available and
 * no strip of brown is spent on nothing.
 *
 * THE ORDER IS NOT DRAWN HERE. It is an HTML banner above this canvas, because a
 * `<div>` under an `<svg>` root is an unknown SVG element and is silently dropped;
 * keeping the ticket outside is what lets it be a real box with real text flow.
 */
import { TOPPINGS, type PizzaOrder, type ToppingId } from './pizzaTypes';

interface PizzaStageProps {
  order: PizzaOrder;
  /** One entry per wedge: the topping on it, or null for plain dough. */
  placed: (ToppingId | null)[];
  /** True while a failed bake is being shaken. */
  shake?: boolean;
  disabled?: boolean;
  onSliceClick: (index: number) => void;
  /** Sizing from the caller, so the hero size lives with the layout. */
  className?: string;
}

/** The canvas is square and the pie's rim nearly fills it, minus a little air. */
const CANVAS = 300;
const CX = CANVAS / 2;
const CY = CANVAS / 2;
/** Dough radius: leaves a 12px gutter so the crust never clips at the edge. */
const R = 138;
/** Cheese floor: a different circle, not a stroke, so the rim stays round. */
const CHEESE_R = 126;

/** Plain wedges read as bare dough, clearly distinct from any topping. */
const PLAIN = '#fef3c7';

function colorFor(topping: ToppingId | null): string {
  if (!topping) return PLAIN;
  return TOPPINGS.find((item) => item.id === topping)?.color ?? PLAIN;
}

function emojiFor(topping: ToppingId | null): string {
  if (!topping) return '';
  return TOPPINGS.find((item) => item.id === topping)?.emoji ?? '';
}

/** A wedge path from the centre, swept clockwise from the top. */
function wedgePath(index: number, total: number): string {
  const step = (Math.PI * 2) / total;
  const start = -Math.PI / 2 + index * step;
  const end = start + step;
  const x1 = CX + R * Math.cos(start);
  const y1 = CY + R * Math.sin(start);
  const x2 = CX + R * Math.cos(end);
  const y2 = CY + R * Math.sin(end);
  const largeArc = step > Math.PI ? 1 : 0;
  return `M${CX} ${CY} L${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

/** Where to centre a wedge's emoji: mid-angle, two-thirds out along the radius. */
function wedgeLabelSpot(index: number, total: number): { x: number; y: number } {
  const step = (Math.PI * 2) / total;
  const mid = -Math.PI / 2 + index * step + step / 2;
  return { x: CX + R * 0.62 * Math.cos(mid), y: CY + R * 0.62 * Math.sin(mid) };
}

export default function PizzaStage({
  order,
  placed,
  shake = false,
  disabled = false,
  onSliceClick,
  className = '',
}: PizzaStageProps) {
  const total = order.totalSlices;

  return (
    <svg
      viewBox={`0 0 ${CANVAS} ${CANVAS}`}
      className={`select-none ${className}`}
      style={{ maxWidth: '100%', maxHeight: '100%' }}
    >
      <defs>
        <linearGradient id="pizza-crust" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8a75a" />
          <stop offset="100%" stopColor="#c2762f" />
        </linearGradient>
      </defs>

      <circle cx={CX} cy={CY} r={R + 10} fill="url(#pizza-crust)" />
      <circle cx={CX} cy={CY} r={CHEESE_R} fill="#f0b96b" />

      <g className={shake ? 'animate-[wobble_.5s_ease-in-out]' : ''}>
        {Array.from({ length: total }, (_, index) => {
          const topping = placed[index] ?? null;
          const spot = wedgeLabelSpot(index, total);
          return (
            <g key={index}>
              <path
                d={wedgePath(index, total)}
                fill={shake ? '#fecaca' : colorFor(topping)}
                stroke="#b45309"
                strokeWidth="4"
                className={disabled ? '' : 'cursor-pointer transition-[fill] duration-150 hover:brightness-110'}
                onClick={disabled ? undefined : () => onSliceClick(index)}
                role="button"
                aria-label={`משולש ${index + 1}`}
              />
              {topping && (
                <text
                  x={spot.x}
                  y={spot.y}
                  fontSize="28"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="pointer-events-none select-none"
                >
                  {emojiFor(topping)}
                </text>
              )}
            </g>
          );
        })}
      </g>

      <circle cx={CX} cy={CY} r="8" fill="#b45309" />
    </svg>
  );
}
