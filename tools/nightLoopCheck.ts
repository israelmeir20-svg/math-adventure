/**
 * Game-loop simulation for "האסם בלילה".
 *
 * The feeding station once had a bug where a wrong answer locked the board and
 * the game never advanced. This walks the same state machine the component
 * implements - answer -> hold (clock frozen) -> deal next round -> unlock - and
 * proves that EVERY path out of an answer ends in a live, unlocked, running
 * board, including consecutive wrong answers and taps that land mid-explanation.
 *
 * Run with: npx tsx tools/nightLoopCheck.ts
 */

let failures = 0;
function check(label: string, condition: boolean, detail = '') {
  if (!condition) {
    failures += 1;
    console.error(`  FAIL  ${label}${detail ? ` :: ${detail}` : ''}`);
  }
}

/** Mirror of the constants the component uses. */
const CORRECT_MS = 700;
const WRONG_MS = 2200;
const TICK_MS = 250;
const RUN_SECONDS = 60;


interface Sim {
  round: number;
  answered: boolean;
  correct: boolean;
  /** The `isSubmittingRef` mirror: latched on tap, released on deal. */
  submitting: boolean;
  /** The derived lock: answered && not-yet-dealt. */
  isResolving: boolean;
  paused: boolean;
  secondsLeft: number;
  correctCount: number;
  /** Pending advance timer, in simulated ms. */
  advanceAt: number | null;
  clock: number;
  /** The round the lock was taken for, mirroring `lockedRound`. */
  lockedRound: number | null;
}

function newSim(): Sim {
  return {
    round: 1,
    answered: false,
    correct: false,
    submitting: false,
    isResolving: false,
    paused: false,
    secondsLeft: RUN_SECONDS,
    correctCount: 0,
    advanceAt: null,
    clock: 0,
    lockedRound: null,
  };
}

/** Mirror of `handlePick`'s guard. Returns true if the tap was accepted. */
function tap(s: Sim, isRight: boolean): boolean {
  // The component's guard, verbatim in spirit.
  if (s.answered || s.isResolving || s.submitting || !running(s)) return false;
  s.submitting = true;
  s.lockedRound = s.round;
  s.answered = true;
  s.correct = isRight;
  if (isRight) s.correctCount += 1;
  // useAnswerAdvance: the lock flips in the same commit as the tap.
  s.isResolving = true;
  s.paused = true;
  s.advanceAt = s.clock + (isRight ? CORRECT_MS : WRONG_MS);
  return true;
}

function running(s: Sim): boolean {
  return s.secondsLeft > 0;
}

/** Advance the simulated clock, dealing the next round when the hold expires. */
function step(s: Sim): void {
  s.clock += TICK_MS;
  // The countdown ticks ONLY while not paused and while running.
  if (!s.paused && running(s)) s.secondsLeft = Math.max(0, s.secondsLeft - TICK_MS / 1000);

  if (s.advanceAt !== null && s.clock >= s.advanceAt) {
    // deal() -> new round, cleared answer, released lock.
    s.round += 1;
    s.answered = false;
    s.correct = false;
    s.isResolving = false;
    s.paused = false;
    s.submitting = false;
    s.lockedRound = null;
    s.advanceAt = null;
  }
}

console.log('\n=== Scenario A: 5 wrong answers in a row, then a right one ===');
{
  const s = newSim();
  for (let i = 0; i < 5; i += 1) {
    const before = s.round;
    const accepted = tap(s, false);
    check(`wrong tap ${i + 1} accepted`, accepted);
    check(`wrong tap ${i + 1} pauses the clock`, s.paused);
    // Run the hold out.
    while (s.advanceAt !== null) step(s);
    check(`round advanced after wrong ${i + 1}`, s.round === before + 1, `${before} -> ${s.round}`);
    check(`board unlocked after wrong ${i + 1}`, !s.answered && !s.isResolving && !s.submitting && !s.paused);
  }
  const accepted = tap(s, true);
  check('right tap accepted after 5 wrongs', accepted);
  const before = s.round;
  while (s.advanceAt !== null) step(s);
  check('round advanced after the right answer', s.round === before + 1);
  check('score counted exactly one', s.correctCount === 1, `${s.correctCount}`);
  check('board live at the end', !s.answered && !s.isResolving && !s.paused);
}

console.log('\n=== Scenario B: taps during the explanation are ignored, then it recovers ===');
{
  const s = newSim();
  tap(s, false);
  const roundDuringHold = s.round;
  // Hammer the keypad, but only ADVANCE THE CLOCK A LITTLE each time so the
  // hold is still pending - otherwise the round would legitimately deal and the
  // later taps would be genuine, not blocked ones.
  const holdTicks = Math.floor(WRONG_MS / TICK_MS) - 1;
  for (let i = 0; i < holdTicks; i += 1) {
    check('hold is still pending', s.advanceAt !== null);
    const accepted = tap(s, true);
    check('tap during hold is ignored', !accepted);
    step(s);
  }
  check('no extra rounds dealt during the hold', s.round === roundDuringHold, `${s.round}`);
  check('no sneaky score from blocked taps', s.correctCount === 0, `${s.correctCount}`);
  // Drain the last of the hold.
  while (s.advanceAt !== null) step(s);
  check('exactly one round advanced', s.round === roundDuringHold + 1, `${s.round}`);
  check('board live after the storm', !s.answered && !s.isResolving && !s.paused && !s.submitting);
  // And a real tap now works.
  check('a genuine tap works after the storm', tap(s, true));
}

console.log('\n=== Scenario C: the clock really is frozen during the explanation ===');
{
  const s = newSim();
  const before = s.secondsLeft;
  tap(s, false);
  // Advance ONLY while the hold is pending. The moment it resolves, the freeze
  // is over by design and the clock is supposed to tick again.
  let ticks = 0;
  while (s.advanceAt !== null && ticks < 1000) {
    step(s);
    ticks += 1;
  }
  check('hold lasted the full wrong-answer window', ticks * TICK_MS >= WRONG_MS, `${ticks * TICK_MS}ms`);
  check(
    'no seconds lost during a wrong answer',
    s.secondsLeft === before,
    `${before} -> ${s.secondsLeft} over ${ticks} ticks`,
  );

  const beforeRight = s.secondsLeft;
  tap(s, true);
  let ticks2 = 0;
  while (s.advanceAt !== null && ticks2 < 1000) {
    step(s);
    ticks2 += 1;
  }
  check(
    'no seconds lost during a right answer',
    s.secondsLeft === beforeRight,
    `${beforeRight} -> ${s.secondsLeft} over ${ticks2} ticks`,
  );

  // And the clock DOES tick on a live, unanswered round.
  const beforeIdle = s.secondsLeft;
  for (let i = 0; i < 4; i += 1) step(s);
  check('clock ticks while awaiting an answer', s.secondsLeft < beforeIdle, `${beforeIdle} -> ${s.secondsLeft}`);
}

console.log('\n=== Scenario D: a long mixed run never deadlocks ===');
{
  const s = newSim();
  let taps = 0;
  let rights = 0;
  let guard = 0;
  while (running(s) && guard < 200000) {
    guard += 1;
    // Answer once the round is idle and a little time has passed.
    if (!s.answered && !s.isResolving && s.clock % 1000 < TICK_MS) {
      const isRight = taps % 3 === 0;
      if (tap(s, isRight)) {
        taps += 1;
        if (isRight) rights += 1;
      }
    }
    step(s);
  }
  check('run ended on the clock, not a deadlock', s.secondsLeft === 0, `${s.secondsLeft}`);
  check('rounds kept advancing', s.round > 10, `round ${s.round}`);
  check('score matches the right answers', s.correctCount === rights, `${s.correctCount} vs ${rights}`);
  console.log(`  played ${s.round - 1} rounds in ${RUN_SECONDS}s (${taps} taps, ${rights} correct)`);
}

if (failures === 0) console.log('\nALL LOOP CHECKS PASSED\n');
else {
  console.error(`\n${failures} LOOP CHECK(S) FAILED\n`);
  process.exit(1);
}
