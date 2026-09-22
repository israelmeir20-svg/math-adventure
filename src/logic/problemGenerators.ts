/**
 * Per-problem-type generators for 3rd grade. Pure, side-effect free.
 */
import type { MathProblem } from '../types/game.types';
import { buildOptions, pick, randomInt, scale, shuffle } from './random';

let problemCounter = 0;

export function createProblemId(): string {
  problemCounter += 1;
  return `p${Date.now().toString(36)}-${problemCounter}`;
}

export const DEFAULT_TABLES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function generateMultiplication(
  level: number,
  tables: readonly number[] = DEFAULT_TABLES,
): MathProblem {
  const table = pick(tables);
  const other = randomInt(1, Math.min(10, scale(level, 2, 10)));
  const product = table * other;
  return {
    id: createProblemId(),
    type: 'multiplication',
    questionTextHebrew: `כמה זה ${table} × ${other}?`,
    operandA: table,
    operandB: other,
    operator: '×',
    correctAnswer: product,
    options: buildOptions(product, other),
    hintHebrew: `${table} שורות של ${other} - אפשר לספור בקפיצות של ${other}.`,
    visualHelperType: 'array',
    visualHelperData: { rows: table, columns: other },
  };
}

export function generateDivision(
  level: number,
  tables: readonly number[] = DEFAULT_TABLES,
): MathProblem {
  const divisor = pick(tables.filter((t) => t > 1));
  const quotient = randomInt(1, Math.min(10, scale(level, 2, 10)));
  const dividend = divisor * quotient;
  return {
    id: createProblemId(),
    type: 'division',
    questionTextHebrew: `מחלקים ${dividend} בין ${divisor} שווה בשווה. כמה כל אחד מקבל?`,
    operandA: dividend,
    operandB: divisor,
    operator: '÷',
    correctAnswer: quotient,
    options: buildOptions(quotient, quotient),
    hintHebrew: `חפשו את המספר שכפול ${divisor} נותן ${dividend}.`,
    visualHelperType: 'equalGroups',
    visualHelperData: { groups: divisor, perGroup: quotient },
  };
}

export function generateAddition(level: number): MathProblem {
  const max = scale(level, 100, 1000);
  const a = randomInt(10, max);
  const b = randomInt(10, max);
  const sum = a + b;
  return {
    id: createProblemId(),
    type: 'addition',
    questionTextHebrew: `כמה זה ${a} + ${b}?`,
    operandA: a,
    operandB: b,
    operator: '+',
    correctAnswer: sum,
    options: buildOptions(sum, 10),
    hintHebrew: 'אפשר לפרק לעשרות ולאחדות: קודם עשרות, אחר כך אחדות.',
    visualHelperType: 'placeValueBlocks',
    visualHelperData: {
      hundreds: Math.floor(sum / 100),
      tens: Math.floor((sum % 100) / 10),
      ones: sum % 10,
    },
  };
}

export function generateSubtraction(level: number): MathProblem {
  const max = scale(level, 100, 1000);
  const a = randomInt(20, max);
  const b = randomInt(10, a - 1);
  const diff = a - b;
  return {
    id: createProblemId(),
    type: 'subtraction',
    questionTextHebrew: `כמה זה ${a} − ${b}?`,
    operandA: a,
    operandB: b,
    operator: '-',
    correctAnswer: diff,
    options: buildOptions(diff, 10),
    hintHebrew: 'כדאי לפרק את המחסר לעשרות ולאחדות ולחסר בשלבים.',
    visualHelperType: 'placeValueBlocks',
    visualHelperData: {
      hundreds: Math.floor(diff / 100),
      tens: Math.floor((diff % 100) / 10),
      ones: diff % 10,
    },
  };
}

/** Number-line hop problem: "start + hops × hopSize". */
export function generateNumberLine(level: number): MathProblem {
  const hopSize = pick([2, 5, 10, 25, 50, 100]);
  const hops = randomInt(2, Math.min(10, scale(level, 3, 10)));
  const start = randomInt(0, 5) * hopSize;
  const answer = start + hops * hopSize;
  return {
    id: createProblemId(),
    type: 'numberLine',
    questionTextHebrew: `מתחילים ב-${start} וקופצים ${hops} קפיצות של ${hopSize}. לאן מגיעים?`,
    operandA: start,
    operandB: hops,
    operator: '+',
    correctAnswer: answer,
    options: buildOptions(answer, hopSize),
    hintHebrew: `כל קפיצה היא ${hopSize}. ספרו ${hops} קפיצות מ-${start}.`,
    visualHelperType: 'numberLine',
    visualHelperData: {
      lineStart: start,
      lineEnd: answer + hopSize * 2,
      hops,
      hopSize,
    },
  };
}

export function generatePlaceValue(level: number): MathProblem {
  const max = scale(level, 100, 1000);
  const value = randomInt(100, max);
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const ones = value % 10;
  return {
    id: createProblemId(),
    type: 'placeValue',
    questionTextHebrew: `במספר ${value}: כמה שווה ספרת העשרות?`,
    operandA: value,
    operandB: 10,
    operator: '×',
    correctAnswer: tens * 10,
    options: shuffle([tens * 10, tens, hundreds * 100, ones * 10]),
    hintHebrew: 'ספרת העשרות נמצאת שנייה מימין - כל עשרת שווה 10.',
    visualHelperType: 'placeValueBlocks',
    visualHelperData: { hundreds, tens, ones },
  };
}
