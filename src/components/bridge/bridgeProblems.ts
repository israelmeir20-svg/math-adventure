/**
 * Per-tier lock problems for the Bridge Guard.
 *
 * Lock 1 (Bronze) - multiplication / division facts.
 * Lock 2 (Silver) - addition / subtraction up to 1,000.
 * Lock 3 (Gold)   - missing-operand challenges (6 × ? = 42).
 *
 * Lock 3 needs its own multiple-choice builder because the distractors must be
 * plausible *operands*, which the shared `buildOptions` helper cannot express.
 */
import { buildOptions, randomInt } from '../../logic/random';
import type { MathProblem } from '../../types/game.types';
import { createProblemId } from '../../logic/problemGenerators';
import { operandOptions } from './operandOptions';

/**
 * The shared `buildOptions` allows 0 as a distractor, which is never a sensible
 * multiple-choice answer for these facts. Swap any zero out for a nearby value.
 */
function factsOptions(answer: number, maxDistractor: number): number[] {
  const options = buildOptions(answer, maxDistractor);
  return options.map((value) => {
    if (value > 0) return value;
    let replacement = answer + randomInt(1, 4);
    while (options.includes(replacement)) replacement += 1;
    return replacement;
  });
}

/* ------------------------------- Lock 1 ------------------------------- */

export function bronzeProblem(): MathProblem {
  if (Math.random() < 0.5) {
    const a = randomInt(2, 10);
    const b = randomInt(2, 10);
    const answer = a * b;
    return {
      id: createProblemId(),
      type: 'multiplication',
      questionTextHebrew: `${a} × ${b} = ?`,
      operandA: a,
      operandB: b,
      operator: '×',
      correctAnswer: answer,
      options: factsOptions(answer, b),
      hintHebrew: `${a} שורות של ${b} - נסו לספור בקפיצות של ${b}.`,
      visualHelperType: 'array',
      visualHelperData: { rows: a, columns: b },
    };
  }

  const divisor = randomInt(2, 10);
  const quotient = randomInt(2, 10);
  const dividend = divisor * quotient;
  return {
    id: createProblemId(),
    type: 'division',
    questionTextHebrew: `${dividend} ÷ ${divisor} = ?`,
    operandA: dividend,
    operandB: divisor,
    operator: '÷',
    correctAnswer: quotient,
    options: factsOptions(quotient, quotient),
    hintHebrew: `חפשו את המספר שכפול ${divisor} נותן ${dividend}.`,
    visualHelperType: 'equalGroups',
    visualHelperData: { groups: divisor, perGroup: quotient },
  };
}

/* ------------------------------- Lock 2 ------------------------------- */

export function silverProblem(): MathProblem {
  if (Math.random() < 0.5) {
    const a = randomInt(2, 7) * 50 + randomInt(0, 9) * 5;
    const b = randomInt(2, 7) * 50 + randomInt(0, 9) * 5;
    const answer = a + b;
    return {
      id: createProblemId(),
      type: 'addition',
      questionTextHebrew: `${a} + ${b} = ?`,
      operandA: a,
      operandB: b,
      operator: '+',
      correctAnswer: answer,
      options: factsOptions(answer, 100),
      hintHebrew: 'חברו קודם את המאות, אחר כך את העשרות.',
      visualHelperType: 'placeValueBlocks',
      visualHelperData: { hundreds: Math.floor(answer / 100) },
    };
  }

  const a = randomInt(5, 9) * 100 + randomInt(1, 9) * 10;
  const b = randomInt(1, 4) * 100 + randomInt(1, 9) * 10;
  const answer = a - b;
  return {
    id: createProblemId(),
    type: 'subtraction',
    questionTextHebrew: `${a} - ${b} = ?`,
    operandA: a,
    operandB: b,
    operator: '-',
    correctAnswer: answer,
    options: factsOptions(answer, 100),
    hintHebrew: 'אפשר לחסר מאות שלמות ואז עשרות.',
    visualHelperType: 'numberLine',
    visualHelperData: { lineStart: b, lineEnd: a, hops: 1, hopSize: answer },
  };
}

/* ------------------------------- Lock 3 ------------------------------- */

export function goldProblem(): MathProblem {
  return Math.random() < 0.5 ? missingFactor() : missingSubtrahend();
}

/** 6 × ? = 42  (the missing operand is the answer). */
function missingFactor(): MathProblem {
  const a = randomInt(2, 9);
  const b = randomInt(2, 9);
  const product = a * b;
  return {
    id: createProblemId(),
    type: 'multiplication',
    questionTextHebrew: `${a} × ? = ${product}`,
    operandA: a,
    operandB: product,
    operator: '×',
    correctAnswer: b,
    options: operandOptions(b, 12),
    hintHebrew: `המספר החסר הוא ${product} ÷ ${a}.`,
    visualHelperType: 'array',
    visualHelperData: { rows: a, columns: b },
  };
}

/** 500 - ? = 320  (the missing operand is the answer). */
function missingSubtrahend(): MathProblem {
  const start = randomInt(5, 9) * 100 + randomInt(1, 9) * 10;
  const answer = randomInt(1, 4) * 100 + randomInt(1, 9) * 10;
  const result = start - answer;
  return {
    id: createProblemId(),
    type: 'subtraction',
    questionTextHebrew: `${start} - ? = ${result}`,
    operandA: start,
    operandB: result,
    operator: '-',
    correctAnswer: answer,
    options: operandOptions(answer, 9),
    hintHebrew: `כמה צריך לחסר מ-${start} כדי להגיע ל-${result}?`,
    visualHelperType: 'numberLine',
    visualHelperData: { lineStart: result, lineEnd: start, hops: 1, hopSize: answer },
  };
}
