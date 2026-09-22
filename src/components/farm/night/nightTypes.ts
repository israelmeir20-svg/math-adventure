/**
 * Types for "האסם בלילה" (Night Barn).
 *
 * The station teaches ONE idea from two directions: an animal has two eyes, so
 * eyes and animals are always in a 2:1 ratio. Sometimes the child is given the
 * eyes and must halve them; sometimes the child is given the animals and must
 * double them. Same fact, both directions, which is what makes it stick.
 */

/** Every species that can be found in the dark. */
export type NightAnimal =
  | 'duck'
  | 'rabbit'
  | 'cat'
  | 'dog'
  | 'sheep'
  | 'donkey'
  | 'cow'
  | 'horse';

/**
 * What the child is being asked to do.
 *
 *   halve      eyes are known, find the animals   (division by 2)
 *   double     animals are known, find the eyes   (multiplication by 2)
 *   detective  count ONE species among a crowd    (selective attention, still
 *              resolved by halving that species' eyes)
 */
export type NightMode = 'halve' | 'double' | 'detective';

/** Where one animal stands in the dark, in stage coordinates. */
export interface NightSpot {
  id: number;
  animal: NightAnimal;
  x: number;
  y: number;
  /** Small vertical jitter, so a row of animals does not look printed. */
  scale: number;
}

/**
 * One generated round.
 *
 * NOTE WHAT IS *NOT* HERE: the answer is not stored, and neither is a "revealed"
 * flag. The answer is derived from the question by the consumer, so the two can
 * never disagree.
 */
export interface NightPuzzle {
  /** Difficulty tier that produced this round, 1-4. */
  level: number;
  mode: NightMode;
  /** The animals visible in the beam. */
  spots: NightSpot[];
  /** The Hebrew question, ready to render. */
  question: string;
  /** The number the child must produce. */
  answer: number;
  /** Four shuffled choices containing `answer`. */
  options: number[];
  /**
   * For `detective` rounds only: the species being counted. Null otherwise.
   * Used to reveal the count on a wrong answer.
   */
  target: NightAnimal | null;
  /** For `detective` rounds only: how many of `target` are hidden. */
  targetCount: number;
}
