/**
 * Pure builders that turn VisualHelperData into renderable dot/box rows.
 * Kept separate from the SVG so the drawing stays declarative.
 */
import type { VisualHelperData } from '../../types/game.types';

export interface DotRow {
  /** Dots drawn in this row (already clamped for sanity). */
  count: number;
  /** When true the row is drawn as an equal-groups cluster. */
  grouped: boolean;
}

const MAX_DOTS = 100;
const MAX_ROWS = 10;

/** Multiplication: `rows` rows of `columns` dots -> the classic array. */
export function arrayRows(data: VisualHelperData): DotRow[] {
  const rows = clamp(data.rows ?? 0, 1, MAX_ROWS);
  const columns = clamp(data.columns ?? 0, 1, 10);
  return Array.from({ length: rows }, () => ({ count: columns, grouped: false }));
}

/** Division: `groups` circles, each holding `perGroup` dots. */
export function groupRows(data: VisualHelperData): DotRow[] {
  const groups = clamp(data.groups ?? 0, 1, MAX_ROWS);
  const perGroup = clamp(data.perGroup ?? 0, 1, 10);
  return Array.from({ length: groups }, () => ({ count: perGroup, grouped: true }));
}

/** Number line: every hop, labelled with its running total. */
export function hopTicks(data: VisualHelperData): { value: number; hop: number }[] {
  const start = data.lineStart ?? 0;
  const hops = clamp(data.hops ?? 0, 1, 12);
  const hopSize = data.hopSize ?? 1;
  return Array.from({ length: hops + 1 }, (_, index) => ({
    value: start + index * hopSize,
    hop: index,
  }));
}

/** Place value: digit cards for hundreds / tens / ones. */
export function placeValueCards(data: VisualHelperData) {
  return [
    { label: 'מאות', value: data.hundreds ?? 0, color: 'bg-rose-200 text-rose-900' },
    { label: 'עשרות', value: data.tens ?? 0, color: 'bg-amber-200 text-amber-900' },
    { label: 'אחדות', value: data.ones ?? 0, color: 'bg-emerald-200 text-emerald-900' },
  ];
}

/** Dot grid lifeline: a 10x10 board for counting on. */
export function dotGridCells(): number[] {
  return Array.from({ length: MAX_DOTS }, (_, index) => index);
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}
