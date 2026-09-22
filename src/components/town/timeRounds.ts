/**
 * Round data for the Clock Tower - "כמה זמן עבר?" and its Grade-3 siblings.
 *
 * ================================================================================================
 * WHAT THIS FILE IS
 * ================================================================================================
 *
 * The pure arithmetic and question-shaping for the clock station: no React, no rendering, no
 * timers. It owns the three levels, the five question shapes, and the Hebrew that names a time and
 * a duration; the components own the dial, the buttons and the cards.
 *
 * ================================================================================================
 * THE THREE LEVELS ARE THREE DIFFERENT SKILLS, NOT THREE DIFFICULTIES
 * ================================================================================================
 *
 * This is the organising idea, and it is why the level table below is not a list of bigger numbers.
 *
 *   Level 1 - READING the dial. A whole or half hour. The child maps hand positions to a time.
 *   Level 2 - MOVING along the dial. Quarter and five-minute steps, counted forwards from a time.
 *   Level 3 - MEASURING between two points on the dial. A duration rather than a reading.
 *
 * Each level therefore has its own question shapes rather than a shared shape at three sizes, and
 * each one's distractors are wrong answers a child at THAT skill actually produces:
 *
 *   Level 1 mixes up the hands (1:30 read as 6:05) - the classic reading error.
 *   Level 2 counts the wrong direction, or in fives when the step was fifteen.
 *   Level 3 subtracts the wrong way round, or forgets to carry the hour.
 *
 * A random number would tell the child nothing; these tell them which idea they have not got.
 *
 * ================================================================================================
 * MINUTES ARE THE ONE UNIT, AND HEbrew NAMES THE RESULT
 * ================================================================================================
 *
 * Everything is stored and compared in MINUTES SINCE MIDNIGHT. Hours and minutes are a display
 * concern: a half-hour step is `+30`, an hour is `+60`, and wrap-around past midnight is a single
 * modulo rather than a special case at every call site. Durations are minutes too, and
 * `describeDuration` turns `75` into "שעה ורבע" - the phrasing the brief asks for, kept in one
 * place so the question card and the success line cannot disagree.
 */

/* ------------------------------------------------------------------------------------------------
 * Time, as minutes
 * ---------------------------------------------------------------------------------------------- */

export interface ClockTime {
  /** 0-23. Only sensible daytime hours are generated. */
  hour: number;
  /** 0-59. Levels 1 and 2 restrict this to the steps they teach. */
  minute: number;
}

/** Minutes since midnight - the arithmetic form of a `ClockTime`. */
export const toMinutes = (time: ClockTime): number => time.hour * 60 + time.minute;

/** The display form of minutes since midnight, wrapping at 24 hours. */
export function fromMinutes(total: number): ClockTime {
  const wrapped = ((total % 1440) + 1440) % 1440;
  return { hour: Math.floor(wrapped / 60), minute: wrapped % 60 };
}

/** "07:30" - the digital form used on the plates and in the badges. */
export function formatDigital(time: ClockTime): string {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

/** "07:30" from minutes since midnight. */
export const formatMinutes = (total: number): string => formatDigital(fromMinutes(total));

/* ------------------------------------------------------------------------------------------------
 * Hebrew: naming a time and naming a duration
 * ---------------------------------------------------------------------------------------------- */

/**
 * The Hebrew name of a clock time, the way a child says it aloud.
 *
 * This is what makes the station a LANGUAGE task as well as an arithmetic one - "רבע אחרי שבע" and
 * "שבע ורבע" are the same time, and a Grade-3 child is expected to move between the two. The
 * fractions are handled before the general case because Hebrew names them as words rather than as
 * a count of minutes.
 *
 * `hour12` uses the 12-hour clock because that is how the dial reads: 13:00 on the dial is "אחת",
 * and a child looking at the hands cannot see the difference between 1 and 13.
 */
export function describeTime(time: ClockTime): string {
  const hour12 = ((time.hour + 11) % 12) + 1;
  const base = HOUR_WORD[hour12] ?? String(hour12);
  switch (time.minute) {
    case 0:
      return `${base} בדיוק`;
    case 15:
      return `רבע אחרי ${base}`;
    case 30:
      return `${base} וחצי`;
    case 45:
      return `רבע ל${HOUR_WORD[hour12 === 12 ? 1 : hour12 + 1]}`;
    default:
      return `${base} ו-${time.minute} דקות`;
  }
}

/** The feminine hour names, since "שעה" is feminine. Index 1-12. */
const HOUR_WORD: Record<number, string> = {
  1: 'אחת',
  2: 'שתיים',
  3: 'שלוש',
  4: 'ארבע',
  5: 'חמש',
  6: 'שש',
  7: 'שבע',
  8: 'שמונה',
  9: 'תשע',
  10: 'עשר',
  11: 'אחת עשרה',
  12: 'שתים עשרה',
};

/**
 * The Hebrew name of a duration, for the answer and the success line.
 *
 * THE BRIEF'S EXAMPLE IS "שעה ו-15 דקות" AND THAT IS THE CONTRACT: hours are named in words, and
 * any leftover minutes are a numeral. That is how the phrasing is actually spoken, and it is what
 * keeps "75 minutes" from being read to the child as "שבעים וחמש דקות" - a number they then have to
 * convert themselves, which is the arithmetic the question is testing.
 *
 * THE QUARTERS ARE NAMED, NOT COUNTED. "45 דקות" is technically correct and no child says it: the
 * amount is "שלושת רבעי שעה", and it is the phrasing the child meets in the question itself ("רבע
 * ל..."). Saying it back in the answer is what closes the loop between the dial and the language.
 *
 * THE HOURS USE WORD-NUMERALS, and they have to. Hebrew does not say "3 שעות" - the counted form is
 * "שלוש שעות", with the numeral agreeing in gender with the feminine noun. Only the amounts this
 * station can actually produce are listed; anything longer falls through to the general form, which
 * is the honest result for a duration the game never generates.
 */
export function describeDuration(minutes: number): string {
  if (minutes <= 0) return 'אפס דקות';

  // The named amounts. Hebrew has single words (or a named fraction) for each of these, and they are
  // the ones this station produces - a Level-3 gap is always one of them.
  switch (minutes) {
    case 15:
      return 'רבע שעה';
    case 30:
      return 'חצי שעה';
    case 45:
      return 'שלושת רבעי שעה';
    case 60:
      return 'שעה';
    case 75:
      return 'שעה ורבע';
    case 90:
      return 'שעה וחצי';
    case 105:
      return 'שעה ושלושת רבעי';
    case 120:
      return 'שעתיים';
    case 180:
      return 'שלוש שעות';
    default:
      break;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  // Past two hours, a numeral is unavoidable; the counted forms are used where Hebrew has them.
  const hourPart = hours === 0 ? '' : hours === 1 ? 'שעה' : hours === 2 ? 'שעתיים' : `${hours} שעות`;
  if (rest === 0) return hourPart;

  const minutePart = `${rest} דקות`;
  return hourPart === '' ? minutePart : `${hourPart} ו-${minutePart}`;
}

/* ------------------------------------------------------------------------------------------------
 * Question shapes
 * ---------------------------------------------------------------------------------------------- */

/**
 * The five shapes the station asks.
 *
 * Named rather than inlined as strings because the component switches on them to decide which
 * controls to show, and a typo would silently fall through to the default branch.
 */
export type ClockTask =
  /** Show a target as a digital plate; the child sets the hands to match it. */
  | 'setTarget'
  /** Show the hands; the child picks the matching digital plate. */
  | 'read'
  /** "The bell rings in 15 minutes - where do the hands land?" The child sets the hands. */
  | 'future'
  /** Show the hands; the child picks the plate showing how long until the next full hour. */
  | 'toHour'
  /** Two times; the child picks how long passed between them. */
  | 'elapsed';

export interface ClockRound {
  task: ClockTask;
  /** The time the hands should show when the child is satisfied, in minutes since midnight. */
  target: number;
  /**
   * The time the hands START at, in minutes since midnight.
   *
   * THE HANDS ARE NOT ALWAYS RESET TO 12:00, and that is the point of `future`: the child has to
   * MOVE the hands from a given time by a stated interval, so the starting position is part of the
   * question rather than a neutral origin. For `setTarget` it is 12:00, which is the honest reset.
   */
  start: number;
  /**
   * The reading question's shown time, and the elapsed question's second time.
   *
   * `target` covers the first time in every shape except `elapsed`, where the two ends are separate
   * facts - so the end is carried here rather than being derived from `target + elapsed`, which
   * would make a wrap past midnight ambiguous.
   */
  end: number;
  /** For `elapsed`: the gap in minutes. */
  elapsed: number;
  /** The correct answer as a digital string, for the plate questions. */
  correctDigital: string;
  /** The correct answer as a duration in minutes, for `toHour` and `elapsed`. */
  correctMinutes: number;
  /** Four plates, always containing the correct one. Digital strings for `read`, durations for time. */
  choices: string[];
  /** Index into `choices`. */
  correctIndex: number;
  /** The one-line instruction, in Hebrew. */
  prompt: string;
  /** The success line, e.g. "08:15 → 09:30 = שעה ו-15 דקות". */
  success: string;
}

const CHOICE_COUNT = 4;

/* ------------------------------------------------------------------------------------------------
 * Random helpers - injected so a round can be replayed deterministically in a test
 * ---------------------------------------------------------------------------------------------- */

function randInt(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] as T;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/**
 * Builds four plates from a correct answer and a list of candidate wrongs.
 *
 * DUPLICATES ARE DROPPED AND THE LIST IS FILLED BEFORE SHUFFLING. The same discipline as the other
 * stations: the traps are tried in order, so a wrong answer that happens to equal the right one
 * (which is common when the traps are neighbours) is discarded rather than turning two of the four
 * plates into the same value - a question with two correct answers is not a question.
 */
function plates(
  correct: string,
  traps: string[],
  fill: (n: number) => string,
  random: () => number,
): {
  choices: string[];
  correctIndex: number;
} {
  const values = [correct];
  const push = (value: string) => {
    if (!values.includes(value)) values.push(value);
  };
  traps.forEach(push);

  let bump = 1;
  while (values.length < CHOICE_COUNT && bump < 60) {
    push(fill(bump));
    bump += 1;
  }

  const chosen = shuffle(values.slice(0, CHOICE_COUNT), random);
  return { choices: chosen, correctIndex: chosen.indexOf(correct) };
}

/* ------------------------------------------------------------------------------------------------
 * Level 1 - whole and half hours
 * ---------------------------------------------------------------------------------------------- */

/**
 * Level 1's grids: the 2, 3, 4, 5 and 10 tables do not apply here - the step is the half hour.
 *
 * The hours are restricted to 1-12 on the dial but stored on a 24-hour clock, and the generator
 * stays in daylight hours so the scene's light makes sense and a child is not asked to reason about
 * 3am.
 */
const L1_HOURS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function buildSetTarget(random: () => number, hours: readonly number[], minutes: readonly number[]): ClockRound {
  const hour = pick(hours, random);
  const minute = pick(minutes, random);
  const target = toMinutes({ hour, minute });
  const time = fromMinutes(target);
  return {
    task: 'setTarget',
    target,
    // THE HANDS START AT 12:00 for a setting question, which is the honest neutral origin: the
    // child is being asked to reach a time, not to move from one, so the starting point must not
    // carry information.
    start: toMinutes({ hour: 12, minute: 0 }),
    end: target,
    elapsed: 0,
    correctDigital: formatDigital(time),
    correctMinutes: 0,
    choices: [],
    correctIndex: 0,
    prompt: `כווננו את השעון ל-${formatDigital(time)}`,
    success: `${formatDigital(time)} = ${describeTime(time)}`,
  };
}

function buildRead(
  random: () => number,
  hours: readonly number[],
  minutes: readonly number[],
): ClockRound {
  const hour = pick(hours, random);
  const minute = pick(minutes, random);
  const shown = toMinutes({ hour, minute });
  const time = fromMinutes(shown);

  /*
   * THE TRAPS ARE THE READING ERRORS, not random times.
   *
   * Swapping the hands is the mistake this level exists to catch: a child who reads 3:30 as 6:15 has
   * read the MINUTE hand as the hour hand. The swap is computed from the dial positions - the hour
   * hand's number becomes the minute value at five minutes per hour number, and the minute value
   * divided by five becomes the hour number.
   *
   * THE COLLISION CASE IS HANDLED EXPLICITLY, NOT LEFT TO THE PLATE BUILDER. On the hour and half
   * hour positions a naive swap lands exactly on the correct answer (reading 12:05 off a 1:00 dial
   * gives 1:00 again, because the hour hand sits ON the 12 and the minute hand ON the 1), and two of
   * the 24 possible Level-1 dials do this. `plates` would silently discard the duplicate and ship a
   * question with three options; so when the swap collides, the NEXT-most-likely misreading is used
   * instead - the hour number as the minute value with the hour left where it is, which is the
   * "read the minute hand's number as the hour" error without the accompanying swap.
   */
  const hourNumber = ((hour + 11) % 12) + 1;
  const swappedHour = minute / 5 === 0 ? 12 : minute / 5;
  const swappedMinute = (hourNumber % 12) * 5;
  const swappedTotal = toMinutes({ hour: swappedHour, minute: swappedMinute });
  const correct = ((shown % 720) + 720) % 720;
  const swappedFace = ((swappedTotal % 720) + 720) % 720;
  const swapTrap =
    swappedFace === correct
      ? formatMinutes(shown + (minute === 0 ? 5 : -5))
      : formatMinutes(swappedTotal);

  const { choices, correctIndex } = plates(
    formatDigital(time),
    [
      swapTrap,
      // The other half of the hour - the half the hands are nearest to but not on.
      formatDigital(fromMinutes(shown + (minute === 0 ? 30 : -30))),
      // The next hour, untouched by the minutes.
      formatDigital(fromMinutes(shown + (minute === 0 ? 60 : 30))),
    ],
    (n) => formatMinutes(shown + n * 30),
    random,
  );

  return {
    task: 'read',
    target: shown,
    start: shown,
    end: shown,
    elapsed: 0,
    correctDigital: formatDigital(time),
    correctMinutes: 0,
    choices,
    correctIndex,
    prompt: 'איזו שעה השעון מראה?',
    success: `${formatDigital(time)} = ${describeTime(time)}`,
  };
}

/* ------------------------------------------------------------------------------------------------
 * Level 2 - quarters, fives, and moving forward
 * ---------------------------------------------------------------------------------------------- */

/**
 * "The bell rings in N minutes - where do the hands land?"
 *
 * THE CHILD SETS THE HANDS, SO THE ANSWER IS A POSITION RATHER THAN A PLATE. The starting time is
 * shown on the dial and the interval is in the prompt, which makes this a counting-on task: the
 * child moves the minute hand round by the step and reads where it stops.
 */
function buildFuture(random: () => number, steps: readonly number[]): ClockRound {
  const hour = randInt(8, 16, random);
  const minute = pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50], random);
  const step = pick(steps, random);
  const start = toMinutes({ hour, minute });
  const targetTotal = start + step;
  const targetTime = fromMinutes(targetTotal);

  return {
    task: 'future',
    target: targetTotal,
    start,
    end: targetTotal,
    elapsed: step,
    correctDigital: formatDigital(targetTime),
    correctMinutes: step,
    choices: [],
    correctIndex: 0,
    prompt: `הפעמון יצלצל בעוד ${step} דקות. לאן יגיע המחוג?`,
    success: `${formatDigital(fromMinutes(start))} + ${step} דקות = ${formatDigital(targetTime)}`,
  };
}

/**
 * "How long until the next full hour?"
 *
 * COUNTING UP TO 60, which is the brief's phrasing and a genuinely different skill from subtracting
 * two clock times: the child counts the minutes remaining to the hour rather than doing arithmetic
 * on two positions. It is also the only question here whose answer is bounded by the hour, so the
 * distractors can be tightly wrong - the complement of the minutes, and the minute value itself.
 */
function buildToHour(random: () => number): ClockRound {
  const hour = randInt(8, 16, random);
  // Any five-minute position past the hour, so the answer is always a positive count to :00.
  const minute = pick([5, 10, 15, 20, 25, 35, 40, 45, 50, 55], random);
  const shown = toMinutes({ hour, minute });
  const remaining = 60 - minute;

  /*
   * THE DISTRACTORS ARE ALL ABOVE THE ANSWER, AND THAT IS DELIBERATE.
   *
   * The obvious trap list - `remaining +/- 5` - puts a number BELOW the answer in play, and a child
   * who knows only that the bell is "soon" can eliminate it without counting anything: the remaining
   * minutes to the hour shrink as the minute hand advances, and five minutes FEWER than the correct
   * answer is a time that has already passed. Only overestimates are offered, so choosing between
   * them requires the count.
   *
   * The two neighbours are +5 and +10 - the errors of miscounting by one tick or two - and the
   * complement is kept because subtracting from the wrong end is the mistake this shape exists to
   * find. It is dropped when it happens to sit below the answer, which happens when the minute value
   * is past the half hour.
   */
  const complement = minute;
  const traps = [describeDuration(remaining + 5), describeDuration(remaining + 10)];
  if (complement > remaining) traps.push(describeDuration(complement));

  const { choices, correctIndex } = plates(
    describeDuration(remaining),
    traps,
    (n) => describeDuration(remaining + n * 5),
    random,
  );

  return {
    task: 'toHour',
    target: shown,
    start: shown,
    end: shown,
    elapsed: remaining,
    correctDigital: formatDigital(fromMinutes(shown)),
    correctMinutes: remaining,
    choices,
    correctIndex,
    prompt: 'כמה דקות נשארו עד לשעה עגולה?',
    success: `מ-${formatDigital(fromMinutes(shown))} נשארו ${remaining} דקות לשעה עגולה`,
  };
}

/* ------------------------------------------------------------------------------------------------
 * Level 3 - elapsed time
 * ---------------------------------------------------------------------------------------------- */

/**
 * "How long passed between the two events?"
 *
 * ================================================================================================
 * THE ONLY SHAPE WITH TWO TIMES, AND THE ONLY ONE THAT NEEDS A CARRY
 * ================================================================================================
 *
 * Everything else on this station is about ONE position on the dial. This asks for the DISTANCE
 * between two, which is a subtraction across the hour boundary - and crossing the hour is exactly
 * where the arithmetic stops being a straight minute subtraction. The gaps are therefore chosen so
 * that crossing is common but the answer stays a clean quarter, half or hour: the brief's example is
 * 08:15 to 09:30, which is 75 minutes and crosses the hour.
 *
 * THE SECOND TIME ALWAYS WRAPS FORWARD, never backward, so the duration is positive and the child
 * is never asked to reason about a negative interval.
 */
function buildElapsed(random: () => number): ClockRound {
  const step = pick([15, 30, 45, 60, 75, 90], random);
  const hour = randInt(8, 15, random);
  const minute = pick([0, 15, 30, 45], random);

  const start = toMinutes({ hour, minute });
  const end = start + step;

  /*
   * THE DISTRACTORS ARE THE CARRY ERRORS, AND ALL OF THEM OVERSHOOT.
   *
   * The mistake this shape is built to catch is failing to carry across the hour - reading 08:15 to
   * 09:30 as "about an hour" because the hour numbers look one apart. So the traps are the answer
   * plus a quarter and plus a half hour, which are what a child gets by miscounting the minutes
   * within the second hour.
   *
   * NOTHING IS OFFERED BELOW THE ANSWER. A duration shorter than the true one can be eliminated by
   * the same "the bell is soon" shortcut that a bare guess allows, and on a span that crosses an hour
   * boundary there is no visual cue to rule it out - so the child would be choosing on plausibility
   * rather than on measurement.
   */
  const { choices, correctIndex } = plates(
    describeDuration(step),
    [describeDuration(step + 15), describeDuration(step + 30), describeDuration(step + 45)],
    (n) => describeDuration(step + n * 15),
    random,
  );

  return {
    task: 'elapsed',
    target: start,
    start,
    end,
    elapsed: step,
    correctDigital: formatDigital(fromMinutes(start)),
    correctMinutes: step,
    choices,
    correctIndex,
    prompt: 'כמה זמן עבר בין השעתיים?',
    success: `${formatDigital(fromMinutes(start))} → ${formatDigital(fromMinutes(end))} = ${describeDuration(step)}`,
  };
}

/* ------------------------------------------------------------------------------------------------
 * The level table
 * ---------------------------------------------------------------------------------------------- */

export interface ClockLevelSpec {
  level: number;
  /** Shown in the header chip. */
  title: string;
  /** The shapes this level mixes. */
  tasks: readonly ClockTask[];
  /** The minute values the dial may rest on at this level. */
  minutes: readonly number[];
  /** The hours the generator draws from. */
  hours: readonly number[];
  /** The forward steps this level's `future` questions use. */
  steps: readonly number[];
  /** How many questions make a run. */
  rounds: number;
}

/**
 * THE LEVEL TABLE, AND WHY IT IS THREE ROWS RATHER THAN ONE ROW OF THREE NUMBERS
 *
 * Each level carries the whole vocabulary it is allowed to use - its minutes, its steps, its shapes
 * - because the levels teach DIFFERENT skills rather than the same skill at three sizes. Sharing one
 * minute list across all three would put `:07` on a Level 1 dial and an hour-and-a-quarter gap on a
 * Level 1 elapsed question, neither of which the child has been taught yet.
 *
 * `rounds` is 5 at every level: the station is a fixed set rather than a sprint, so the run length
 * is what makes it completable in one sitting and is deliberately not a difficulty lever.
 */
export const CLOCK_LEVELS: readonly ClockLevelSpec[] = [
  {
    level: 1,
    title: 'שוליית השעון',
    // Whole and half hours, in both directions: set a named time, and read a shown one.
    tasks: ['setTarget', 'read'],
    minutes: [0, 30],
    hours: L1_HOURS,
    steps: [60, 30],
    rounds: 5,
  },
  {
    level: 2,
    title: 'מכוונת המגדל',
    // Quarters and fives, and the two counting shapes: forward from a time, and up to the hour.
    tasks: ['future', 'toHour'],
    minutes: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
    hours: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    steps: [5, 15],
    rounds: 5,
  },
  {
    level: 3,
    title: 'שומרת הזמן',
    // The distance between two dial positions.
    tasks: ['elapsed'],
    minutes: [0, 15, 30, 45],
    hours: [8, 9, 10, 11, 12, 13, 14, 15],
    steps: [15, 30, 45, 60, 75, 90],
    rounds: 5,
  },
];

export function clockLevel(level: number): ClockLevelSpec {
  const index = Math.min(CLOCK_LEVELS.length, Math.max(1, Math.floor(level))) - 1;
  return CLOCK_LEVELS[index] as ClockLevelSpec;
}

/* ================================================================================================
 * THE RUN CLOCK AND ITS MEDAL LADDER
 * ================================================================================================
 *
 * THE STATION BECAME A SPRINT, SO ITS GOLD RULE HAD TO CHANGE WITH IT.
 *
 * It used to be a fixed set of five questions where finishing WAS the achievement: a completed run was a
 * gold run, and `recordGoldMedal` was called once, at the end, with no notion of how well the child had
 * done. That rule cannot survive questions that arrive indefinitely until a clock runs out, because
 * "finished" is then either unreachable or meaningless - there is always one more question.
 *
 * So the medal is now priced against the CORRECT COUNT at the moment the clock stops, exactly as the
 * kiosk and the bakery price theirs. The bars are what the brief asks for: bronze at 2, silver at 4,
 * gold at 6.
 *
 * SIX FOR GOLD AGAINST SEVENTY SECONDS. A question here is a read-and-set task rather than a tap, so it
 * takes a few seconds even when the child knows the answer. Six in seventy is tighter than the six in
 * ninety this was originally priced against - the thresholds were deliberately LEFT ALONE when the run
 * was shortened, so gold now demands a solve roughly every eleven seconds rather than every fifteen.
 *
 * THAT IS A REAL DIFFICULTY INCREASE, NOT A COSMETIC ONE, and it is worth stating plainly for whoever
 * tunes this next: the medal bars and the run length are two halves of one budget, and moving the clock
 * without moving the bars is a nerf to every medal tier. If gold turns out to be unreachable in
 * practice, the fix is either a longer run or a lower bar - not a longer run AND the same bar, which is
 * where this started.
 */

/** The longest a run can last, in seconds. */
export const RUN_SECONDS = 70;

export type TrainMedal = 'bronze' | 'silver' | 'gold';

/**
 * What each medal needs, HIGHEST FIRST.
 *
 * The ordering is load-bearing rather than cosmetic: `medalForCorrect` takes the first entry the count
 * clears, so listing gold first is what makes six correct answers a gold rather than a bronze.
 */
export const MEDAL_FOR_CORRECT: ReadonlyArray<{ min: number; medal: TrainMedal }> = [
  { min: 6, medal: 'gold' },
  { min: 4, medal: 'silver' },
  { min: 2, medal: 'bronze' },
];

/**
 * The medal a correct count earns, or null below the lowest bar.
 *
 * NULL RATHER THAN A DEFAULT BRONZE, because the bars start at 2 and a child who answers nothing must
 * not be handed a medal for it - see `MEDAL_FOR_CORRECT[2]` being unreachable at 0 correct.
 */
export function medalForCorrect(correct: number): TrainMedal | null {
  return MEDAL_FOR_CORRECT.find((entry) => correct >= entry.min)?.medal ?? null;
}

export const MEDAL_EMOJI: Record<TrainMedal, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
};

export const MEDAL_LABEL: Record<TrainMedal, string> = {
  bronze: 'ארד',
  silver: 'כסף',
  gold: 'זהב',
};

/**
 * Builds one question at the given level.
 *
 * `avoid` is the shape of the previous question: alternating the two shapes at Levels 1 and 2 is the
 * level's own design ("alternates between ..."), so repeating a shape back-to-back is avoided when
 * the level has another one to offer.
 */
export function buildClockRound(
  level: number,
  avoid?: ClockTask,
  random: () => number = Math.random,
): ClockRound {
  const spec = clockLevel(level);
  const pool = spec.tasks.filter((task) => task !== avoid);
  const task = pick(pool.length > 0 ? pool : spec.tasks, random);

  switch (task) {
    case 'setTarget':
      return buildSetTarget(random, spec.hours, spec.minutes);
    case 'read':
      return buildRead(random, spec.hours, spec.minutes);
    case 'future':
      return buildFuture(random, spec.steps);
    case 'toHour':
      return buildToHour(random);
    default:
      return buildElapsed(random);
  }
}

/**
 * True when the round is answered by POSITIONING THE HANDS rather than by picking a plate.
 *
 * Exported so the component's control layout is driven by the task rather than by a second list of
 * task names that could fall out of step with the switch above.
 */
export function needsHands(task: ClockTask): boolean {
  return task === 'setTarget' || task === 'future';
}

/** The forward step a `future` round moves by; 0 for shapes that do not move the hands. */
export function stepFor(round: ClockRound): number {
  return round.task === 'future' ? round.elapsed : 0;
}
