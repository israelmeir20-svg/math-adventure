/**
 * Public math-engine facade: picks the right generator for a requested type,
 * respecting the spaced-repetition cooldown from the mistake tracker.
 *
 * Re-exports the generator + tracker pieces so screens import from one place.
 */
import type { MathProblem, MathProblemType } from '../types/game.types';
import type { MistakeTracker } from '../types/game.types';
import { isOnCooldown } from './mistakeTracker';
import {
  DEFAULT_TABLES,
  generateAddition,
  generateDivision,
  generateMultiplication,
  generateNumberLine,
  generatePlaceValue,
  generateSubtraction,
} from './problemGenerators';

export { buildOptions } from './random';
export { createProblemId, DEFAULT_TABLES } from './problemGenerators';
export {
  createMistakeTracker,
  dueReviewKeys,
  isOnCooldown,
  problemKey,
  scheduleReview,
} from './mistakeTracker';

export interface GenerateOptions {
  type: MathProblemType;
  /** 1..5 map-difficulty; scales number ranges. */
  level: number;
  /** Skip problems that are still in their spaced-repetition cooldown. */
  tracker?: MistakeTracker;
  /** Inclusive table range for multiplication/division. Defaults to 1..10. */
  tables?: readonly number[];
}

const MAX_REGENERATION_ATTEMPTS = 8;

export function generateProblem(options: GenerateOptions): MathProblem {
  const { type, level, tracker } = options;
  const tables = options.tables ?? DEFAULT_TABLES;
  let problem = generateOnce(type, level, tables);
  let attempts = 0;
  while (isOnCooldown(problem, tracker) && attempts < MAX_REGENERATION_ATTEMPTS) {
    attempts += 1;
    problem = generateOnce(type, level, tables);
  }
  return problem;
}

function generateOnce(
  type: MathProblemType,
  level: number,
  tables: readonly number[],
): MathProblem {
  switch (type) {
    case 'multiplication':
      return generateMultiplication(level, tables);
    case 'division':
      return generateDivision(level, tables);
    case 'addition':
      return generateAddition(level);
    case 'subtraction':
      return generateSubtraction(level);
    case 'numberLine':
      return generateNumberLine(level);
    case 'placeValue':
      return generatePlaceValue(level);
  }
}
