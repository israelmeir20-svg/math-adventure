/**
 * Pure round builders for "אולפן המקצבים" - the Beat Studio.
 *
 * No React, no audio, no randomness beyond an injectable source. Every generator
 * here answers one question: what are the five numbers on the synth keys, which
 * of them is the answer, and what are the candidate answers?
 *
 * ===================================================================
 * THE THREE CHALLENGES ARE THE SAME SEQUENCE, ASKED THREE WAYS.
 * ===================================================================
 *
 * All three build the SAME object - five terms, a step, and a target index - and
 * differ only in what they hide and what they ask:
 *
 *   MISSING_NOTE  hides one term.       "which note is missing?"
 *   IMPOSTER      keeps all five, but swaps ONE for a wrong number.
 *                                       "tap the key that's out of tune!"
 *   TEMPO         hides nothing.        "what's the song's step?"
 *
 * Building them from one sequence generator is deliberate. The alternative - three
 * independent generators - is how a game ends up where the imposter challenge uses
 * a step of 3 while the tempo challenge uses a step that the level is not supposed
 * to have taught yet. Here the TIER decides the step, and the challenge only
 * decides how to obfuscate it.
 *
 * ===================================================================
 * WHY ASCENDING, DESCENDING, AND OFF-GRID ARE SEPARATE THINGS.
 * ===================================================================
 *
 * A child who can recite "5, 10, 15, 20" forwards is doing something different
 * from one who can run the same chain backwards, and different again from one who
 * can start at 13 with a step of 4. They are not the same skill at three
 * difficulties, so the tier table turns each one on explicitly rather than
 * blending them into one "harder" knob. Level 1 is ascending only precisely
 * because descending is introduced as a *new* idea at level 2.
 */
import { randomTuning, type RoundTuning } from './beatStudioMusic';

/** Which of the three musical challenges a round poses. */
export type BeatChallenge = 'missing-note' | 'imposter' | 'tempo';

/**
 * Every term on the stage.
 *
 * The instrument is always five notes, whatever the scale, because the sequence it
 * has to describe is always five numbers.
 */
export const KEY_COUNT = 5;

/** A generated round, shared by all three challenges. */
export interface BeatRound {
  challenge: BeatChallenge;
  /** The five terms shown on the keys, in order. */
  terms: number[];
  /** Index of the answer, for the challenges that have one. */
  targetIndex: number;
  /** The step (`+7`, `-5`) between neighbouring terms. */
  step: number;
  /** True when the sequence counts down. */
  descending: boolean;
  /** The correct answer's VALUE (the missing term, or the imposter's replacement). */
  answer: number;
  /** For `imposter`: the wrong number planted on the stage. Else null. */
  imposterValue: number | null;
  /** Four candidate answers, always containing `answer`. Empty for `imposter`. */
  choices: number[];
  /** The banner line for this challenge. */
  prompt: string;
  /**
   * The round's musical key: a root, a mode, and the five resulting pitches.
   *
   * The music travels WITH the round rather than living in the component, so a
   * round can never be shown with another round's pitches - the same class of bug
   * that pairing an image with the wrong title would be. It is also what lets the
   * key order be derived from `descending`, keeping the melody and the sequence
   * pointing the same way without the component having to remember to reverse it.
   */
  tuning: RoundTuning;
}

/**
 * One tier of the four-step progression.
 *
 * `tables` are the skip-counts the tier draws its STEP from, reusing the balloon
 * sprint's tier vocabulary so the two games agree on what "multiples of 7" means.
 */
export interface BeatTier {
  level: number;
  title: string;
  /** Steps this tier may use, as positive magnitudes. */
  steps: readonly number[];
  /** True when the tier may count down as well as up. */
  allowDescending: boolean;
  /**
   * True when the first term need not be a multiple of the step.
   *
   * Off-grid starts are the level 4 idea: a run of 13, 17, 21 is only tractable if
   * the child reads the *differences* rather than trying to recognise times-table
   * facts, which is exactly the skill this game exists to build.
   */
  allowOffGrid: boolean;
  /** Challenges this tier may pose, in the order they become available. */
  challenges: readonly BeatChallenge[];
}

export const BEAT_TIERS: readonly BeatTier[] = [
  {
    level: 1,
    title: 'קלידנית מתחילה',
    steps: [2, 5, 10],
    allowDescending: false,
    allowOffGrid: false,
    challenges: ['missing-note', 'tempo'],
  },
  {
    level: 2,
    title: "דיג'יי בהופעה",
    steps: [3, 4],
    allowDescending: true,
    allowOffGrid: false,
    challenges: ['missing-note', 'tempo', 'imposter'],
  },
  {
    level: 3,
    title: 'מפיקת להיטים',
    steps: [6, 7, 8, 9],
    allowDescending: true,
    allowOffGrid: false,
    challenges: ['missing-note', 'tempo', 'imposter'],
  },
  {
    level: 4,
    title: 'מאסטר הסינתיסייזר',
    steps: [4, 6, 7, 8, 9],
    allowDescending: true,
    allowOffGrid: true,
    challenges: ['missing-note', 'tempo', 'imposter'],
  },
];

export function clampLevel(level: number): number {
  return Math.min(BEAT_TIERS.length, Math.max(1, level));
}

export function beatTier(level: number): BeatTier {
  return BEAT_TIERS[clampLevel(level) - 1]!;
}

const PROMPTS: Record<BeatChallenge, string> = {
  'missing-note': 'איזה תו חסר למנגינה?',
  imposter: 'הקישו על הקליד שמזייף!',
  tempo: 'מה הקצב של השיר?',
};

/** The banner text for a challenge. */
export function promptFor(challenge: BeatChallenge): string {
  return PROMPTS[challenge];
}

/** A short Hebrew label for a step, e.g. `+7` or `-5`. */
export function describeStep(step: number): string {
  return step > 0 ? `+${step}` : `${step}`;
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

function randInt(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Builds the five-term sequence a round is based on.
 *
 * Returns the terms and the signed step. The signature is `{ terms, step }` with
 * the step already carrying its sign, so no caller has to remember which way the
 * sequence runs - the sign IS the direction.
 */
function buildSequence(
  tier: BeatTier,
  random: () => number,
): { terms: number[]; step: number } {
  const magnitude = pick(tier.steps, random);
  const descending = tier.allowDescending && random() < 0.4;
  const step = descending ? -magnitude : magnitude;

  /*
   * THE FIRST TERM IS CHOSEN FROM ONE OF TWO SHAPES.
   *
   * On-grid (the default) starts at a multiple of the step, so the run reads as a
   * times table the child may already know. Off-grid - level 4 only - starts
   * anywhere, which means no term is a "times table answer" and the child has to
   * work from the differences alone.
   *
   * The window is then clamped so no term goes negative. A descending run of 7s
   * starting at 21 would run off the bottom of the number line at the fourth term,
   * and a negative key is not a number a third-grader should be asked to read.
   */
  const span = Math.abs(step) * (KEY_COUNT - 1);
  const maxStart = 100 - span;

  let start: number;
  if (tier.allowOffGrid && random() < 0.5) {
    // Off the times table: any start that leaves headroom.
    const floor = Math.max(2, 2 - step * (KEY_COUNT - 1));
    start = randInt(floor, Math.max(floor, maxStart), random);
  } else {
    // On the table: the k-th multiple, with k chosen so the run fits.
    const maxMultiple = Math.max(1, Math.floor(maxStart / Math.abs(step)));
    start = Math.abs(step) * randInt(1, Math.max(1, maxMultiple), random);
  }

  // A descending run that would cross zero is flipped rather than truncated: it is
  // better to serve the level's step ascending than to serve an invalid one.
  if (start + step * (KEY_COUNT - 1) < 1) {
    return {
      terms: Array.from({ length: KEY_COUNT }, (_, i) => start + Math.abs(step) * i),
      step: Math.abs(step),
    };
  }

  return {
    terms: Array.from({ length: KEY_COUNT }, (_, i) => start + step * i),
    step,
  };
}

/**
 * Four candidate answers for the missing term and the tempo question.
 *
 * The wrong options are chosen to be the mistakes a child actually makes, not
 * random noise: the neighbouring terms (confusing the blank's position), and
 * off-by-one-step (miscounting the jump). A random distractor is trivially
 * eliminable, so it would measure nothing.
 */
function buildChoices(answer: number, step: number, taken: ReadonlySet<number>, random: () => number): number[] {
  const choices = new Set<number>([answer]);
  const candidates = [answer - step, answer + step, answer - 1, answer + 1, answer - step * 2];

  for (const candidate of shuffle(candidates, random)) {
    if (choices.size >= 4) break;
    if (candidate > 0 && candidate !== answer) choices.add(candidate);
  }

  // Fill any remainder with near-misses that are not already on the stage, so two
  // identical-looking options can never appear.
  let filler = 1;
  while (choices.size < 4) {
    const candidate = answer + filler;
    if (candidate > 0 && !taken.has(candidate)) choices.add(candidate);
    filler += 1;
  }

  return shuffle([...choices], random);
}

/**
 * Chooses which challenge this round poses.
 *
 * ===================================================================
 * WHY THIS IS NOT JUST "FILTER OUT THE LAST ONE".
 * ===================================================================
 *
 * The obvious implementation - reroll if the new challenge equals the previous one -
 * is not enough to make the three modes feel like a rotation, and it has a failure
 * mode that is worse than repetition:
 *
 *   1. EQUAL WEIGHT IS NOT EQUAL EXPERIENCE. Filtering only the last type still lets
 *      a type appear twice in three rounds while another is skipped entirely for
 *      five. Over a 45-second sprint that reads as "it only ever asks me the step".
 *
 *   2. THE FILTER CAN SILENTLY NO-OP. If the history is ever mis-recorded - which is
 *      exactly what a double-invoked state updater causes - the filter sees the same
 *      type as `last` and falls back to the unfiltered list, disabling itself.
 *
 * So the choice is made in two passes:
 *
 *   - FIRST, prefer the challenges that are LEAST RECENTLY USED. `recent` is a short
 *     history, so whichever types are absent from it are the ones the child has not
 *     seen for longest, and those are the candidates. This makes the rotation
 *     self-correcting: a type that got skipped is automatically promoted next time,
 *     so the three challenges converge on an even share without any counter to keep
 *     in sync.
 *
 *   - SECOND, never serve the same type twice in a row. If the staleness pass
 *     somehow picks the previous type (only possible when the tier offers one
 *     challenge), the immediate-repeat guard removes it.
 */
export function pickChallenge(
  tier: BeatTier,
  recent: readonly BeatChallenge[],
  random: () => number = Math.random,
): BeatChallenge {
  const options = tier.challenges;
  if (options.length === 1) return options[0]!;

  const last = recent[recent.length - 1];

  /*
   * The types the child has not seen for longest. A type absent from the whole
   * history is the stalest of all, so it comes first - which is what makes a
   * freshly-unlocked challenge (the imposter, at level 2) appear promptly rather
   * than waiting on a coin flip.
   */
  const unseen = options.filter((c) => !recent.includes(c));
  const pool = unseen.length > 0 ? unseen : options;

  // Never twice in a row, unless the tier leaves no alternative.
  const fresh = pool.filter((c) => c !== last);
  return pick(fresh.length > 0 ? fresh : pool, random);
}

/**
 * Builds the next round for a tier.
 *
 * The sequence is built first and the challenge applied to it, which is what keeps
 * the three challenges pedagogically consistent at any given level.
 */
export function buildBeatRound(
  level: number,
  recent: readonly BeatChallenge[] = [],
  random: () => number = Math.random,
): BeatRound {
  const tier = beatTier(level);
  const challenge = pickChallenge(tier, recent, random);
  const { terms, step } = buildSequence(tier, random);

  /*
   * THE TUNING IS CHOSEN ONCE, HERE, FOR EVERY CHALLENGE.
   *
   * It is derived from the sequence's own direction, so a run counting down is
   * heard counting down. Picking it in one place is what guarantees the three
   * challenges of a level all sound like the same instrument - and, more
   * importantly, that the round the child HEARS is the round they are looking at.
   */
  const tuning = randomTuning(step < 0, random);

  if (challenge === 'tempo') {
    /*
     * The tempo question shows the whole run and asks for the step. The answer is
     * the step's MAGNITUDE, because the buttons are labelled `[ +7 ]` and `[ -7 ]`
     * as separate options - see `tempoChoices` below, which decides the sign.
     */
    return {
      challenge,
      terms,
      targetIndex: -1,
      step,
      descending: step < 0,
      answer: Math.abs(step),
      imposterValue: null,
      choices: tempoChoices(step, tier, random),
      prompt: promptFor(challenge),
      tuning,
    };
  }

  if (challenge === 'imposter') {
    /*
     * One term is replaced by a number that is NOT in the sequence. The planted
     * value is deliberately a NEAR MISS of the term it replaces, so the child has
     * to check the step rather than spot an obviously absurd number.
     */
    const targetIndex = randInt(1, KEY_COUNT - 2, random);
    const correct = terms[targetIndex]!;
    const inSequence = new Set(terms);
    const imposters = [correct - 1, correct + 1, correct - 2, correct + 2, correct + step];
    const usable = imposters.filter((v) => v > 0 && !inSequence.has(v));
    const imposter = usable.length > 0 ? pick(usable, random) : correct + 1;

    return {
      challenge,
      terms: terms.map((t, i) => (i === targetIndex ? imposter : t)),
      targetIndex,
      step,
      descending: step < 0,
      answer: correct,
      imposterValue: imposter,
      choices: [],
      prompt: promptFor(challenge),
      tuning,
    };
  }

  // The missing note is never the first or last term, so it can be inferred from
  // either side rather than only guessed forwards.
  const targetIndex = randInt(1, KEY_COUNT - 2, random);
  const answer = terms[targetIndex]!;
  const shown = terms.map((t, i) => (i === targetIndex ? Number.NaN : t));

  return {
    challenge,
    terms: shown,
    targetIndex,
    step,
    descending: step < 0,
    answer,
    imposterValue: null,
    choices: buildChoices(answer, step, new Set(terms.filter((t) => t !== answer)), random),
    prompt: promptFor(challenge),
    tuning,
  };
}

/**
 * The tempo buttons: the true step plus three decoys.
 *
 * The decoys are the neighbouring steps in the SAME direction, because "+7 or +8"
 * is the real decision a child faces - if the wrong options were `+7` and `-7` the
 * question would collapse into "is it going up or down", which they can already
 * see. Negative leaps are included when the tier counts down, so a descending run
 * offers negative answers and the child must commit to the direction too.
 */
function tempoChoices(step: number, tier: BeatTier, random: () => number): number[] {
  const sign = step < 0 ? -1 : 1;
  const magnitude = Math.abs(step);
  const choices = new Set<number>([step]);

  /*
   * If the tier allows descending, the opposite sign is seeded FIRST rather than
   * last. It is the decoy that matters most - without it a descending round's four
   * buttons would all be negative, so the direction would be given away by the
   * shape of the options instead of chosen by the child. Seeding it first also
   * keeps the set at exactly four: adding it after the neighbours could push the
   * count to five, which is one button more than the grid has columns.
   */
  if (tier.allowDescending && !choices.has(-step)) choices.add(-step);

  // Neighbouring magnitudes: the real decision is "+7 or +8", so the decoys stay
  // adjacent rather than being trivially dismissible.
  const neighbours = [magnitude + 1, magnitude - 1, magnitude + 2, magnitude - 2];
  for (const candidate of neighbours) {
    if (choices.size >= 4) break;
    if (candidate > 0 && candidate !== magnitude) choices.add(sign * candidate);
  }

  // Anything still needed comes from the tier's own steps, so every option is a
  // step this level has actually taught.
  const pool = tier.steps.map((s) => sign * s).filter((s) => s !== step && !choices.has(s));
  let guard = 0;
  while (choices.size < 4 && guard < 40) {
    guard += 1;
    const candidate = pool.length > 0 ? pick(pool, random) : sign * (magnitude + guard);
    if (candidate !== 0) choices.add(candidate);
  }

  // A final guard so the grid is never handed more or fewer than four options.
  return shuffle([...choices].slice(0, 4), random);
}
