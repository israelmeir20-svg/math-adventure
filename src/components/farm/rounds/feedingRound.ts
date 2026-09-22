/**
 * Round generator for station 2 - "שעת האכלה" (Feeding Time).
 *
 * Grades 3-4 division: share food fairly between animals and keep the
 * remainder visible in the basket. From level 3 the same generator also poses
 * halves and quarters.
 */
import { buildChoices, randInt } from '../farmRoundUtils';

export interface FeedingRound {
  foodEmoji: string;
  foodName: string;
  animals: number;
  animalEmoji: string;
  animalName: string;
  total: number;
  /** Whole items each animal receives. */
  perAnimal: number;
  /** Left over in the basket (0 for fraction rounds). */
  remainder: number;
  kind: 'share' | 'half' | 'quarter';
  choices: number[];
  promptHebrew: string;
}

const FOODS = [
  { emoji: '🥕', name: 'גזרים' },
  { emoji: '🌽', name: 'תירס' },
  { emoji: '🍎', name: 'תפוחים' },
  { emoji: '🥔', name: 'תפוחי אדמה' },
] as const;

const EATERS = [
  { emoji: '🐰', name: 'ארנבונים' },
  { emoji: '🐑', name: 'כבשים' },
  { emoji: '🐐', name: 'עיזים' },
  { emoji: '🐴', name: 'סוסים' },
] as const;

export function buildFeedingRound(level = 1, random = Math.random): FeedingRound {
  const food = FOODS[randInt(0, FOODS.length - 1, random)]!;
  const eater = EATERS[randInt(0, EATERS.length - 1, random)]!;
  const animals = randInt(3, 5, random);

  // Level 1-2: whole sharing with a remainder. Level 3+: fractions.
  if (level >= 3 && random() < 0.6) {
    const denominator = random() < 0.6 ? 2 : 4;
    const base = randInt(2, 6, random);
    const total = base * denominator;
    const perAnimal = total / denominator;
    return {
      foodEmoji: food.emoji,
      foodName: food.name,
      animals: denominator,
      animalEmoji: eater.emoji,
      animalName: eater.name,
      total,
      perAnimal,
      remainder: 0,
      kind: denominator === 2 ? 'half' : 'quarter',
      choices: buildChoices(perAnimal, 3, random),
      promptHebrew:
        denominator === 2
          ? `יש ${total} ${food.name} ל-${denominator} ${eater.name}. כמה זה חצי?`
          : `יש ${total} ${food.name} ל-${denominator} ${eater.name}. כמה זה רבע?`,
    };
  }

  const perAnimal = randInt(2, 5, random);
  const remainder = randInt(1, animals - 1, random);
  const total = perAnimal * animals + remainder;
  return {
    foodEmoji: food.emoji,
    foodName: food.name,
    animals,
    animalEmoji: eater.emoji,
    animalName: eater.name,
    total,
    perAnimal,
    remainder,
    kind: 'share',
    choices: buildChoices(perAnimal, 3, random),
    promptHebrew: `חלקו ${total} ${food.name} שווה בשווה בין ${animals} ${eater.name}. כמה מקבל כל אחד?`,
  };
}
