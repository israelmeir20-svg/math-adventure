/**
 * Types for "שעת האכלה" (Feeding Time).
 *
 * The central rule of this game is that a puzzle is a WORD PROBLEM, not a
 * picture: the child is told how much food went into the basket and how many
 * animals are waiting, and must work out the fair share themselves. Everything
 * about the types here serves that - see `FeedingPuzzle`.
 */

/** Every species that can sit at the trough. */
export type FeedingAnimal =
  | 'duck'
  | 'rabbit'
  | 'cat'
  | 'dog'
  | 'sheep'
  | 'donkey'
  | 'cow'
  | 'horse';

/**
 * The foods that can be shared out.
 *
 * Two labels, and the difference matters on the signboard:
 *
 *   name     Hebrew plural used in the question ("כמה גזרים נשים בכל קערה?")
 *   counted  the form that follows a number with a unit ("5 קלחי תירס")
 *
 * Hebrew counts some foods with a noun phrase rather than a bare plural, so "5
 * תירסים" reads as broken Hebrew to a child while "5 קלחי תירס" does not. The
 * signboard shows a number, so it uses `counted`.
 */
export interface Food {
  emoji: string;
  /** Hebrew plural, e.g. "גזרים". */
  name: string;
  /** The counted form, e.g. "קלחי תירס" for "5 קלחי תירס". */
  counted: string;
}

/**
 * One generated division problem.
 *
 * NOTE ON LEAK PREVENTION: this type deliberately has NO `remainder` field.
 * The remainder is derivable (`totalFood - quotient * animalCount`), and the
 * stage must not show it until the child has answered - so it is not carried in
 * the puzzle at all. `FeedingGame` computes it only after a correct tap, which
 * makes "the remainder is hidden during the question" a property of the data
 * flow rather than a display flag someone could forget to reset.
 */
export interface FeedingPuzzle {
  /** Difficulty tier that produced this puzzle, 1-4. */
  level: number;
  /** The animals waiting at the troughs, left to right. */
  animals: FeedingAnimal[];
  /** The food being shared. */
  food: Food;
  /** How many items of `food` are in the basket. */
  totalFood: number;
  /** The fair share each animal receives: floor(totalFood / animals.length). */
  quotient: number;
  /**
   * Four ascending consecutive integers containing `quotient`, so exactly one
   * answer is right and the child must actually divide.
   */
  options: number[];
}
