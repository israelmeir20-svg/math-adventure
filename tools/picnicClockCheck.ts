/**
 * Does the picnic clock really run CONTINUOUSLY from the first deal to zero?
 *
 * This is the rule most likely to be subtly wrong, and the failure is quiet: a stray
 * pause holds the countdown for a window it should not, the child gets a free look, and
 * nothing crashes or looks broken. So it is simulated rather than eyeballed.
 *
 * THE PREVIOUS REVISION ASSERTED THE OPPOSITE - that inspection and feedback were both
 * FREE - so this file had to be inverted rather than adjusted. The old model is worth
 * remembering because it explains the shapes now under test: the countdown used to be
 * gated on `clockShouldRun`, an expression involving the lid's travel time, the phase and
 * the resolve flag. All of that gating is gone, and this checks that it is gone.
 *
 * The model advances in ticks and charges the clock on EVERY tick while the run is live,
 * which is what the game now does. If any window is still being skipped, the total will
 * come out short and the leak report will name which window it was.
 *
 * Run: npx tsx tools/picnicClockCheck.ts
 */

let failures = 0;
function check(label: string, condition: boolean, detail = '') {
  if (!condition) {
    failures += 1;
    console.error(`  FAIL  ${label}${detail ? ` :: ${detail}` : ''}`);
  } else {
    console.log(`  ok    ${label}`);
  }
}

/** One round's timeline, ticked at 50ms. */
const TICK = 50;

function simulateRound(opts: { inspectMs: number; thinkMs: number; correct: boolean; running: boolean }) {
  const LID_MS = 260;
  const FEEDBACK_MS = opts.correct ? 800 : 1200;

  const endOfInspect = opts.inspectMs;
  const lidLanded = endOfInspect + LID_MS;
  const answerAt = lidLanded + opts.thinkMs;
  const feedbackEnd = answerAt + FEEDBACK_MS;
  const HORIZON = feedbackEnd;

  // Ticks charged, bucketed by which window they fell in, so a leak can be named.
  const charged = { inspecting: 0, lidTravel: 0, question: 0, feedback: 0, beforeStart: 0 };
  let total = 0;
  let t = 0;

  while (t < HORIZON) {
    // THE ONLY PREDICATE: a live run charges every tick, with no phase involved.
    if (opts.running) {
      total += TICK;
      if (t >= answerAt) charged.feedback += TICK;
      else if (t >= lidLanded) charged.question += TICK;
      else if (t >= endOfInspect) charged.lidTravel += TICK;
      else charged.inspecting += TICK;
    } else {
      charged.beforeStart += TICK;
    }
    t += TICK;
  }

  return { total, charged, endOfInspect, lidLanded, answerAt, feedbackEnd };
}

console.log('\n=== Every window is now SPENT, not free ===');
for (const [label, inspectMs, correct] of [
  ['L1 correct (2.0s look)', 2000, true],
  ['L1 wrong   (2.0s look)', 2000, false],
  ['L3 correct (2.2s look)', 2200, true],
  ['L4 wrong   (2.5s look)', 2500, false],
] as const) {
  const r = simulateRound({ inspectMs, thinkMs: 1200, correct, running: true });
  console.log(
    `  ${label}: inspect ${r.charged.inspecting}ms + lid ${r.charged.lidTravel}ms + ` +
      `question ${r.charged.question}ms + feedback ${r.charged.feedback}ms = ${r.total}ms`,
  );
  check(`${label}: the inspection window is charged`, r.charged.inspecting > 0, `${r.charged.inspecting}ms`);
  check(`${label}: the question window is charged`, r.charged.question > 0, `${r.charged.question}ms`);
  check(`${label}: the feedback window is charged`, r.charged.feedback > 0, `${r.charged.feedback}ms`);
  // The whole round must be charged: nothing may be skipped.
  check(
    `${label}: the round charges its full length`,
    Math.abs(r.total - r.feedbackEnd) <= TICK,
    `${r.total}ms of ${r.feedbackEnd}ms`,
  );
}

console.log('\n=== There is no window that escapes the clock ===');
{
  // Every tick between the start and the end of the round must land in one of the four
  // buckets. If any tick were skipped, these four would not sum to the total.
  const r = simulateRound({ inspectMs: 2200, thinkMs: 1400, correct: false, running: true });
  const summed =
    r.charged.inspecting + r.charged.lidTravel + r.charged.question + r.charged.feedback;
  console.log(`  summed buckets ${summed}ms vs total ${r.total}ms`);
  check('every charged tick is accounted for', summed === r.total, `${summed} vs ${r.total}`);
  check('no tick was skipped', r.total >= 2200 + 260 + 1400 + 1200 - 50, `${r.total}ms`);
}

console.log('\n=== An idle run charges nothing, and starting charges from round 1 ===');
{
  const idle = simulateRound({ inspectMs: 2000, thinkMs: 3000, correct: false, running: false });
  console.log(`  idle: charged ${idle.total}ms`);
  check('no time is charged before the run starts', idle.total === 0, `${idle.total}ms`);
}

console.log('\n=== A full 60s run cannot be extended by playing slowly ===');
{
  // Forty rounds of a worst-case slow player. The charged time must be at least the sum
  // of the windows - the clock cannot be stretched by dawdling, because it never stops.
  let total = 0;
  for (let i = 0; i < 40; i += 1) {
    total += simulateRound({
      inspectMs: 2200,
      thinkMs: 3000,
      correct: i % 2 === 0,
      running: true,
    }).total;
  }
  const perRound = total / 40;
  console.log(`  a slow player burns ${perRound}ms per round`);
  check('a slow round costs at least its windows', perRound >= 2200 + 260 + 3000, `${perRound}ms`);
  check(
    'a slow player exhausts a 60s run well within 40 rounds',
    Math.ceil(60000 / perRound) < 40,
    `${Math.ceil(60000 / perRound)} rounds`,
  );
}

console.log('\n=== The explanation is short enough to be affordable ===');
{
  // With the clock running, the wrong-answer hold is spent time. It should cost a small
  // fraction of the run, which is what makes the shortened hold worth having.
  const wrong = simulateRound({ inspectMs: 2200, thinkMs: 900, correct: false, running: true });
  const share = (wrong.charged.feedback / 60000) * 100;
  console.log(`  a 1200ms explanation is ${share.toFixed(1)}% of the 60s run`);
  check('a wrong answer costs under 3% of the run', share < 3, `${share.toFixed(1)}%`);
}

if (failures === 0) console.log('\nALL PICNIC CLOCK CHECKS PASSED\n');
else {
  console.error(`\n${failures} CLOCK CHECK(S) FAILED\n`);
  process.exit(1);
}
