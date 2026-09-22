/**
 * Spaced-repetition mistake tracking. Pure functions - no storage, no React.
 */
import type {
  MathProblem,
  MistakeRecord,
  MistakeTracker,
  Operator,
} from '../types/game.types';

const COOLDOWN_MS = 5 * 60 * 1000;

export function createMistakeTracker(): MistakeTracker {
  return { records: {} };
}

/** Commutative key so "3 × 4" and "4 × 3" share one record. */
export function problemKey(a: number, b: number, operator: Operator): string {
  return `${operator}:${Math.min(a, b)}:${Math.max(a, b)}`;
}

export function isOnCooldown(
  problem: MathProblem,
  tracker?: MistakeTracker,
): boolean {
  if (!tracker) return false;
  const key = problemKey(problem.operandA, problem.operandB, problem.operator);
  const record = tracker.records[key];
  return record !== undefined && record.mistakes > 0 && record.dueAt > Date.now();
}

/** Longer cooldown the more the child has struggled with this fact. */
export function scheduleReview(
  tracker: MistakeTracker,
  problem: MathProblem,
  wasCorrect: boolean,
): MistakeTracker {
  const key = problemKey(problem.operandA, problem.operandB, problem.operator);
  const existing: MistakeRecord | undefined = tracker.records[key];
  const mistakes = Math.max(0, (existing?.mistakes ?? 0) + (wasCorrect ? -1 : 1));
  const boosted = Math.max(1, mistakes);
  const record: MistakeRecord = {
    problemKey: key,
    operandA: problem.operandA,
    operandB: problem.operandB,
    operator: problem.operator,
    attempts: (existing?.attempts ?? 0) + 1,
    mistakes,
    lastSeenAt: Date.now(),
    dueAt: Date.now() + COOLDOWN_MS * boosted,
  };
  return { records: { ...tracker.records, [key]: record } };
}

/** Facts the scheduler wants served soon (for a "review" session). */
export function dueReviewKeys(tracker: MistakeTracker): string[] {
  const now = Date.now();
  return Object.values(tracker.records)
    .filter((record) => record.mistakes > 0 && record.dueAt <= now)
    .map((record) => record.problemKey);
}
