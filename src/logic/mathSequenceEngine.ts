/**
 * The rule engine behind the free-play sandbox ("אולפן ניגונים").
 *
 * ===================================================================
 * WHAT THIS IS FOR, AND WHY IT IS NOT A GENERATOR.
 * ===================================================================
 *
 * Every other number game in this codebase PICKS a rule and then builds a sequence
 * to fit it: the sandbox inverts that. The child picks the numbers, and this module
 * asks "what rules is this child already following?" - so the melody it plays is a
 * consequence of their arithmetic rather than a puzzle they have to guess.
 *
 * That inversion is the whole design, and it puts one hard requirement on every
 * function here: THEY MUST NEVER INVENT A RULE THE HISTORY DOES NOT SUPPORT. A
 * generator that quietly decided "this is +2 now" would let a child tap 2, 4, 7 and
 * still be congratulated, which teaches nothing and - worse - makes the reflection
 * question at the end unanswerable, because the "rule" it asks about would not be
 * the rule the child actually used.
 *
 * So every detector is deliberately strict, and "no rule fits" is a normal, expected
 * answer that the UI handles by accepting the number as a free note.
 *
 * ===================================================================
 * WHY THE HISTORY, NOT THE LAST TWO TERMS.
 * ===================================================================
 *
 * A rule is only accepted once it holds across the WHOLE sequence. Two terms agree
 * with any rule you like - (2, 4) is "+2", "x2", "the even numbers", "start at 2 and
 * add 2" - so a detector that looked only at the final pair would flip-flop between
 * arithmetic and geometric on every tap and the melody would change key mid-phrase.
 * Requiring a consistent difference or ratio over three or more terms is what makes
 * the branch stable enough to play music against.
 */
import type { MathPatternType } from '../data/freePlayCatalog';

/**
 * The fewest terms a rule needs before it is believed.
 *
 * THREE, NOT TWO, AND THE THIRD TERM IS DOING REAL WORK: two numbers can only ever
 * suggest a pattern, while three can confirm one. It is also the point at which the
 * branching melody tree stops: its two-note common prefix is played for the first
 * two taps precisely BECAUSE no rule can be known yet, and the branch is chosen on
 * the third.
 */
export const MIN_TERMS_FOR_RULE = 3;

/** A rule that the current history satisfies, plus the value it implies next. */
export interface RuleCandidate {
  rule: MathPatternType;
  /** Where the sequence goes next if this rule holds. */
  nextValue: number;
  /**
   * The rule's own parameter - the `d` in `+d`, the `q` in `×q`.
   *
   * THIS IS WHAT MAKES THE REFLECTION QUESTION POSSIBLE. The rule NAME alone ("an
   * arithmetic sequence") is not enough to ask a child about, because two runs of
   * different lengths are the same rule: `3, 4, 5, 6` and `2, 4, 6, 8` are both
   * "arithmetic" but the questions worth asking are "did we add 1?" and "did we add
   * 2?". Storing the parameter alongside the rule means the question is generated
   * from what was PLAYED rather than from the branch the melody happened to land in.
   *
   * `null` for `fibonacci`, which has no parameter - its rule IS its definition.
   */
  step: number | null;
  /**
   * How well this rule explains the history, 0..1 - the fraction of neighbouring
   * gaps it accounts for. Used only to order candidates, never to reject them.
   */
  confidence: number;
}

/** Whole-number difference between consecutive terms. */
function differences(history: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < history.length; i += 1) out.push(history[i]! - history[i - 1]!);
  return out;
}

/** True when every entry of `values` is the same number. */
function allEqual(values: readonly number[]): boolean {
  return values.length > 0 && values.every((value) => value === values[0]);
}

/**
 * Detects a constant difference: `+2`, `-5`, and so on.
 *
 * RETURNED SEQUENCE MUST NEVER GO NON-POSITIVE. The sandbox counts with a child who
 * is still learning what negative numbers are, and a melody built on "0, -4, -8" is
 * not a melody - so a descending arithmetic rule stops being offered once its next
 * step would reach zero or below. The rule itself is still reported (the child HAS
 * been subtracting), only the `nextValue` is withheld by the caller.
 */
function detectArithmetic(history: readonly number[]): RuleCandidate | null {
  if (history.length < MIN_TERMS_FOR_RULE) return null;
  const gaps = differences(history);
  if (!allEqual(gaps)) return null;
  const step = gaps[0]!;
  if (step === 0) return null; // a run of identical numbers is not a progression
  return {
    rule: step > 0 ? 'arithmetic_add' : 'arithmetic_sub',
    nextValue: history[history.length - 1]! + step,
    step,
    confidence: 1,
  };
}

/**
 * Detects a constant whole-number multiplier: `x2`, `x3`, ...
 *
 * WHOLE MULTIPLIERS ONLY, AND AT LEAST TWO OF THEM. A geometric rule of x1.5 would
 * leave the integers almost immediately and the keypad would have to show 4.5 - which
 * is a different lesson, and not the one this studio teaches. `1` is rejected for the
 * same reason `0` is rejected above: it is a constant, not a progression.
 *
 * A ratio is only accepted when the division is EXACT. Floating-point ratios would
 * make `6 / 4 = 1.5` look like a plausible multiplier for a sequence that is really
 * just arithmetic, so the check is done with integers.
 */
function detectGeometric(history: readonly number[]): RuleCandidate | null {
  if (history.length < MIN_TERMS_FOR_RULE) return null;
  const ratios: number[] = [];
  for (let i = 1; i < history.length; i += 1) {
    const prev = history[i - 1]!;
    const next = history[i]!;
    // A zero anywhere makes the ratio meaningless (and 0 -> 0 is not growth).
    if (prev === 0 || next === 0) return null;
    if (next % prev !== 0) return null;
    ratios.push(next / prev);
  }
  if (!allEqual(ratios)) return null;
  const factor = ratios[0]!;
  if (factor < 2) return null;
  return {
    rule: 'geometric',
    nextValue: history[history.length - 1]! * factor,
    step: factor,
    confidence: 1,
  };
}

/**
 * Detects `current = prev1 + prev2` - the Fibonacci rule, generalised.
 *
 * CHECKED TERM BY TERM RATHER THAN AGAINST THE CANONICAL 1, 1, 2, 3, 5. The studio
 * should reward a child who starts 2, 3, 5, 8 just as much as one who starts at 1,
 * because the RULE is the insight, not the particular seed values.
 *
 * Needs four terms, not three: with three there is no pair of predecessors to check
 * against, so the shortest honest Fibonacci sequence is a, b, a+b, a+b+b.
 */
function detectFibonacci(history: readonly number[]): RuleCandidate | null {
  if (history.length < 4) return null;
  const n = history.length;
  // The final term is the one that must equal the sum of the two before it.
  if (history[n - 1]! !== history[n - 2]! + history[n - 3]!) return null;
  // And every earlier term must too, so a single coincidence does not qualify.
  for (let i = 3; i < n; i += 1) {
    if (history[i]! !== history[i - 1]! + history[i - 2]!) return null;
  }
  return {
    rule: 'fibonacci',
    nextValue: history[n - 1]! + history[n - 2]!,
    step: null,
    confidence: 1,
  };
}

/**
 * Detects a step that is itself growing by a constant amount: `+1, +2, +3, +4`.
 *
 * THIS IS THE ONE RULE THAT IS NOT A CONSTANT DIFFERENCE, and it is worth having
 * because it is how a child first discovers that a "rule" can be about the gaps
 * rather than the numbers. `2, 3, 5, 8, 12` is the canonical example.
 *
 * It needs four terms: three gaps are the fewest that can show a pattern in the gaps
 * themselves, and three terms only produce two.
 */
function detectIncreasingStep(history: readonly number[]): RuleCandidate | null {
  if (history.length < 4) return null;
  const gaps = differences(history);
  if (gaps.length < 3) return null;
  const stepChanges: number[] = [];
  for (let i = 1; i < gaps.length; i += 1) stepChanges.push(gaps[i]! - gaps[i - 1]!);
  if (!allEqual(stepChanges)) return null;
  // A zero change would mean a constant difference, which `detectArithmetic` owns.
  if (stepChanges[0] === 0) return null;
  const lastGap = gaps[gaps.length - 1]!;
  return {
    rule: 'increasing_step',
    nextValue: history[history.length - 1]! + lastGap + stepChanges[0]!,
    step: stepChanges[0]!,
    confidence: 1,
  };
}

/**
 * Every rule the history genuinely satisfies, best-explained first.
 *
 * ORDER IS PART OF THE CONTRACT, because the caller plays the FIRST candidate's
 * branch. Arithmetic and geometric are checked before the two compound rules so the
 * simplest explanation wins a tie - a child who taps 2, 4, 6 has made an arithmetic
 * sequence, even though a generous reading could also call it the start of something
 * more exotic.
 *
 * An empty array is a legitimate result and NOT an error: it means the child has
 * invented something, and the UI treats that as a free note.
 */
export function getValidNextNumbers(history: readonly number[]): RuleCandidate[] {
  if (history.length < MIN_TERMS_FOR_RULE) return [];

  const candidates: RuleCandidate[] = [];
  const arithmetic = detectArithmetic(history);
  if (arithmetic) candidates.push(arithmetic);
  const geometric = detectGeometric(history);
  if (geometric) candidates.push(geometric);
  const fibonacci = detectFibonacci(history);
  if (fibonacci) candidates.push(fibonacci);
  const increasing = detectIncreasingStep(history);
  if (increasing) candidates.push(increasing);

  /*
   * A NON-POSITIVE CONTINUATION IS FILTERED OUT HERE RATHER THAN INSIDE THE
   * DETECTORS, so each detector can report the rule it found honestly (the child
   * really was subtracting) while the KEYPAD still refuses to offer a number the
   * studio cannot build a melody on.
   *
   * `0` is excluded along with the negatives: a zero key in a melody reads as a
   * missing note rather than a low one.
   */
  return candidates.filter((candidate) => candidate.nextValue > 0);
}

/**
 * Builds the row of keys to show after a given history.
 *
 * ===================================================================
 * THE DISTRACTORS ARE THE DESIGN, NOT THE PADDING.
 * ===================================================================
 *
 * A keypad showing only the valid continuation is not a game - it is a "press the
 * one button" exercise, and the child learns nothing because there is nothing to
 * choose. The wrong keys are what turn the screen into a question, and their VALUES
 * are what make it a useful one: each distractor is a near-miss that a child
 * genuinely might pick, so a wrong tap is informative rather than random.
 *
 * THE DISTRACTORS COME FROM THE VALID TARGETS. Every filler is that target plus a
 * small offset, which means the wrong answers are wrong for a REASON the child can
 * hear - the wrong keys are the right key at a step that does not fit. Random
 * numbers would make the screen unwinnable by inspection and the melody arbitrary.
 *
 * OFFSETS CYCLE THROUGH {-1, +1, -2, +2, -3, +3} so the distractors fan out around
 * the target instead of clustering to one side, and the list is regenerated per
 * target until enough unique keys exist.
 */
export function generateKeysForStep(
  history: readonly number[],
  keyCount = 5,
): number[] {
  /*
   * THE OPENING HAND. With no history there is no rule to derive keys from, so the
   * studio opens on a friendly spread that invites ANY of the three branches: 2 and
   * 3 lead naturally to the arithmetic and Fibonacci paths (`2, 4, 6` / `2, 3, 5`),
   * and 4 and 5 both multiply. The 10 is a deliberate long shot - a child who taps
   * it has started a sequence no branch claims, which is a legitimate way to explore.
   */
  if (history.length === 0) return [2, 3, 4, 5, 10];

  const candidates = getValidNextNumbers(history);
  const keys = new Set<number>();

  // The valid continuations always come first, so they are never squeezed out by
  // the fillers - the screen must always be winnable.
  for (const candidate of candidates) keys.add(candidate.nextValue);

  /*
   * A SECOND VALID TARGET MAY EXIST AND SHOULD BE OFFERED. A history like 2, 3
   * satisfies more than one rule at once, and showing both continuations lets the
   * child CHOOSE which melody to grow - which is the branching the studio is built
   * around. `getValidNextNumbers` returns them best-first, so the array order is
   * preserved by seeding the target list from it directly.
   */
  const targets = candidates.length > 0 ? candidates.map((c) => c.nextValue) : [];
  const last = history[history.length - 1]!;

  /*
   * WHEN NO RULE FITS, the screen still has to offer something. The fallback walks
   * outward from the last term so the child can keep counting freely in either
   * direction, which keeps the sandbox a sandbox: an invented rule is not a dead
   * end, it is just not yet a melody.
   */
  if (targets.length === 0) {
    for (const offset of [1, 2, 3, 4, 5]) {
      if (last + offset > 0) keys.add(last + offset);
    }
  }

  /*
   * FILL THE REMAINDER WITH NEAR-MISSES. `offsets` is walked in order and combined
   * with each target in turn, so the first fillers sit closest to a valid answer
   * (the hardest discrimination) and later ones drift further out (the easiest).
   */
  const offsets = [-1, 1, -2, 2, -3, 3, -4, 4, -5, 5];
  const sources = targets.length > 0 ? targets : [last];
  outer: for (const offset of offsets) {
    for (const target of sources) {
      if (keys.size >= keyCount) break outer;
      const value = target + offset;
      // Zero and negatives are never offered, and duplicates are never re-added.
      if (value > 0 && !keys.has(value)) keys.add(value);
    }
  }

  // A last-resort widening, so `keyCount` is always met even in a tight corner.
  let spill = 1;
  while (keys.size < keyCount && spill < 100) {
    const value = last + spill;
    if (value > 0 && !keys.has(value)) keys.add(value);
    spill += 1;
  }

  return shuffle([...keys].slice(0, Math.max(keyCount, keys.size)), history);}

/**
 * Shuffles deterministically from the history.
 *
 * ===================================================================
 * WHY NOT `Math.random()`.
 * ===================================================================
 *
 * The key row is rebuilt on every render that recomputes it, and a random shuffle
 * would therefore REORDER THE KEYS UNDER THE CHILD'S FINGER - a tap aimed at "the
 * key on the left" would land on a different number than the one they were reading,
 * and the studio would feel broken rather than playful.
 *
 * Seeding from the history means the arrangement is a pure function of the numbers
 * played: it is stable for as long as the sequence is, and it reshuffles exactly
 * once per new term, which is the moment the child has already looked away.
 *
 * A small xorshift keeps this dependency-free - the studio is a UI module and does
 * not need the shared RNG plumbed through for a cosmetic shuffle.
 */
function shuffle<T>(values: T[], seedSource: readonly number[]): T[] {
  let seed = 0;
  for (const value of seedSource) seed = (seed * 31 + value) | 0;
  seed = (seed ^ (seed << 13)) | 0;
  seed = (seed ^ (seed >>> 17)) | 0;
  seed = (seed ^ (seed << 5)) | 0;
  if (seed === 0) seed = 0x9e3779b9;

  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    // xorshift32, re-seeded each step so the walk never repeats.
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const j = Math.abs(seed) % (i + 1);
    const a = out[i]!;
    const b = out[j]!;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/**
 * The rules that a finished sequence satisfies, for the reflection question.
 *
 * Deliberately a thin wrapper over `getValidNextNumbers` so the two can never
 * disagree about what was played.
 */
export function rulesForSequence(history: readonly number[]): MathPatternType[] {
  return getValidNextNumbers(history).map((candidate) => candidate.rule);
}

/** A reflection question with its options already shuffled. */
export interface GeneratedReflection {
  question: string;
  options: string[];
  /** The index of the correct option AFTER shuffling. */
  correctIndex: number;
  explanation: string;
  /**
   * The rule this question is about.
   *
   * Returned so the caller can pair the maths with its own concerns - the studio
   * reads the branch's `cookieReward` from here, since how many cookies a song is
   * worth is an ECONOMY decision that has nothing to do with arithmetic and does not
   * belong in the rule engine.
   */
  rule: MathPatternType | null;
}
/**
 * Builds the reflection question from what the child ACTUALLY played.
 *
 * ===================================================================
 * WHY THE CATALOGUE'S REFLECTION IS NOT USED, AND WHY THIS IS A FIX RATHER THAN A
 * VARIATION.
 * ===================================================================
 *
 * `freePlayCatalog` gives each branch a hardcoded `reflection`, and those questions
 * name a specific step: the arithmetic branch asks "did we add 2?", the geometric one
 * asks "did we multiply by 2?".
 *
 * THE BRANCH IS NOT THE RULE, THOUGH - it is a MUSICAL home that several rules can
 * lead to. The studio's `branchForRule` sends `arithmetic_add`, `arithmetic_sub` AND
 * `increasing_step` all to the same calm Chassidic melody, because they are the same
 * musical idea. So a child counting `3, 4, 5, 6` lands in the arithmetic branch and
 * was then asked about "+2" - a question whose "correct" answer was false for their
 * sequence and whose distractors were equally wrong. Every option on screen was
 * mathematically incorrect, which is worse than no question at all: it teaches the
 * child that their correct arithmetic was a mistake.
 *
 * So the question is generated from the DETECTED RULE AND ITS PARAMETER instead of
 * from the branch. The melody still comes from the branch (the music is shared); the
 * question comes from the maths (which is specific).
 *
 * ===================================================================
 * WHY THE DISTRACTORS ARE DERIVED FROM `d` RATHER THAN BEING FIXED STRINGS.
 * ===================================================================
 *
 * A distractor has exactly one job: to be WRONG for this sequence while looking
 * plausible enough that answering it means something. A fixed distractor cannot do
 * that, because "wrong" depends on `d` - for the sequence `3, 4, 5, 6`, the option
 * "we added 2" is a good distractor (one off), but for `2, 4, 6, 8` that same string
 * is the CORRECT answer, and offering it as a distractor would put the right answer
 * on screen twice.
 *
 * Deriving them from `d` guarantees the off-by-a-little confusions are always
 * genuinely wrong, whatever `d` happens to be.
 */
export function buildReflection(history: readonly number[]): GeneratedReflection {
  const candidates = getValidNextNumbers(history);
  const primary = candidates[0] ?? null;

  /*
   * THE FALLBACK, FOR A CHILD WHO INVENTED SOMETHING.
   *
   * The sandbox allows a sequence no rule claims - that is the point of free play -
   * and those songs still end in a reflection. The honest question there is not
   * "which rule did you use?" (there is no rule to have used) but "what did you do?",
   * and the answer is genuinely "your own pattern", so the options are framed as
   * choices about their invention rather than about arithmetic they did not do.
   */
  if (!primary) {
    return finishQuestion(
      'מה עשיתם עם המספרים שבחרתם?',
      [
        'בחרתי סדר משלי - לא חוק קבוע',
        'הוספתי תמיד אותו מספר',
        'הכפלתי תמיד באותו מספר',
      ],
      0,
      'כל הכבוד! בחרתם סדר משלכם. כל סדר שאתם בוחרים הוא חוקיות - גם אם היא חדשה.',
      history,
      null,
    );
  }

  const { rule, step } = primary;

  switch (rule) {
    case 'arithmetic_add': {
      const d = step ?? 1;
      return finishQuestion(
        'המנגינה טיפסה במעלות קבועות. מה היה החוק?',
        [`הוספנו ${d} בכל צעד`, `הוספנו ${d + 2} בכל צעד`, 'הכפלנו פי 2 בכל צעד'],
        0,
        `מעולה! הוספתם ${d} בכל צעד ויצרתם סדרה חשבונית עולה.`,
        history,
        rule,
      );
    }

    case 'arithmetic_sub': {
      /* `step` is the signed difference, so a descending sequence has a negative one.
       * The QUESTION talks about a magnitude ("we subtracted 5"), which is how a child
       * describes it, so `Math.abs` is the right reading here. */
      const d = Math.abs(step ?? 1);
      return finishQuestion(
        'המנגינה ירדה במעלות קבועות. מה היה החוק?',
        [`החסרנו ${d} בכל צעד`, `החסרנו ${d + 2} בכל צעד`, 'הכפלנו פי 2 בכל צעד'],
        0,
        `מעולה! החסרתם ${d} בכל צעד ויצרתם סדרה חשבונית יורדת.`,
        history,
        rule,
      );
    }

    case 'geometric': {
      const q = step ?? 2;
      return finishQuestion(
        'המנגינה זינקה לגבהים מהר מאוד! למה?',
        [
          `הכפלנו פי ${q} בכל צעד`,
          `הוספנו ${q} בכל צעד`,
          'חיברנו את שני המספרים הקודמים',
        ],
        0,
        `תשובה מושלמת! הכפלתם פי ${q} בכל צעד, וסדרה הנדסית כזו גדלה בקצב מסחרר.`,
        history,
        rule,
      );
    }

    case 'fibonacci': {
      return finishQuestion(
        'מה החוק המיוחד שבנה את המנגינה הזו?',
        [
          'כל מספר הוא סכום שני המספרים שלפניו',
          'הוספנו 2 בכל צעד',
          'הכפלנו פי 2 בכל צעד',
        ],
        0,
        "גאוני! כל מספר הוא סכום שני קודמיו - זהו חוק פיבונאצ'י, אחד מחוקי הטבע היפים ביותר.",
        history,
        rule,
      );
    }

    case 'increasing_step': {
      /* `step` here is the CHANGE IN THE GAP, not the gap itself - for `2, 3, 5, 8`
       * the gaps are 1, 2, 3 and `step` is 1. So the question is about the shape of
       * the rule ("the jumps grew by 1 each time") rather than the raw numbers, which
       * is the insight worth naming; quoting gap sizes would bury it in arithmetic
       * the child has already done. */
      const grow = step ?? 1;
      return finishQuestion(
        'הקפיצות בין המספרים הלכו וגדלו. מה היה החוק?',
        [
          `הקפיצה גדלה ב-${grow} בכל צעד`,
          'הקפיצה נשארה בדיוק אותו הדבר',
          'הכפלנו את המספר פי 2 בכל צעד',
        ],
        0,
        `מדויק! כל קפיצה הייתה גדולה ב-${grow} מזו שלפניה - סדרה שבה הצעד עצמו מתקדם.`,
        history,
        rule,
      );
    }

    default: {
      /* Unreachable for the five known rules, but a total switch keeps a future rule
       * from producing an empty modal. */
      return finishQuestion(
        'מה עשיתם עם המספרים?',
        ['בחרתי סדר משלי', 'הוספתי בכל צעד', 'הכפלתי בכל צעד'],
        0,
        'כל הכבוד! בחרתם סדר משלכם.',
        history,
        null,
      );
    }
  }
}

/**
 * Shuffles a question's options and recomputes `correctIndex`.
 *
 * ===================================================================
 * THE CORRECT OPTION MUST NOT ALWAYS BE OPTION 1.
 * ===================================================================
 *
 * Every generator above writes the correct answer first, because that is the clearest
 * way to author them. If the modal rendered them in that order, a child would learn
 * within two songs to always tap the top button - and would then be answering a
 * question about button position rather than about arithmetic. Shuffling is what makes
 * the modal a question.
 *
 * `correctIndex` is looked up from the STRING rather than tracked as an index through
 * the shuffle, so it can never drift: the option list is the single source of truth
 * and the index is derived from it after the fact.
 *
 * The shuffle is seeded from the history for the same reason the keypad's is: the
 * modal can re-render (a state change, a resize) and options that reordered under the
 * child's finger would be a bug rather than a game.
 */
function finishQuestion(
  question: string,
  options: string[],
  correctOptionIndex: number,
  explanation: string,
  history: readonly number[],
  rule: MathPatternType | null,
): GeneratedReflection {
  const correct = options[correctOptionIndex]!;
  const shuffled = shuffle(options, [...history, correct.length]);
  return {
    question,
    options: shuffled,
    correctIndex: shuffled.indexOf(correct),
    explanation,
    rule,
  };
}
