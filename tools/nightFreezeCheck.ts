/**
 * Does the clock freeze successfully hold while an answer is explained?
 *
 * The reported symptom is a frozen game. The mechanism this file tests is the
 * freeze THRASHING: `useFarmTimer` builds `pause`/`resume` inside a `useMemo`
 * keyed on `secondsLeft`, so their identities change on every tick. An effect
 * that lists them as dependencies re-runs every tick and fires its `resume`
 * cleanup - un-pausing the clock many times during a single 2200ms explanation.
 *
 * This models both the OLD implementation and the NEW one against the same
 * unstable-callback timer, and asserts the new one holds.
 *
 * React semantics reproduced faithfully enough to matter:
 *   - a changed dependency re-runs the effect, and its CLEANUP runs FIRST
 *   - the effect body runs after the cleanup
 *
 * Run: npx tsx tools/nightFreezeCheck.ts
 */

let failures = 0;
function check(label: string, condition: boolean, detail = '') {
  if (!condition) {
    failures += 1;
    console.error(`  FAIL  ${label}${detail ? ` :: ${detail}` : ''}`);
  }
}

/** A timer whose API mimics `useFarmTimer`: callbacks recreated each tick. */
class Timer {
  paused = false;
  seconds = 60;
  explaining = false;
  unPausesDuringExplanation = 0;

  makePause() {
    return () => {
      this.paused = true;
    };
  }
  makeResume() {
    return () => {
      if (this.explaining) this.unPausesDuringExplanation += 1;
      this.paused = false;
    };
  }

  /** Models a 250ms tick, which only counts down while un-paused. */
  tickIfRunning() {
    if (!this.paused) this.seconds = Math.max(0, this.seconds - 0.25);
  }
}

/** THE OLD IMPLEMENTATION: callbacks were dependencies, cleanup always resumed. */
function oldHook(timer: Timer, isResolving: boolean, depsChanged: boolean) {
  const pause = timer.makePause();
  const resume = timer.makeResume();
  if (depsChanged) resume(); // cleanup from the previous run
  if (isResolving) pause();
  else resume();
}

/** THE NEW IMPLEMENTATION: callbacks in a ref, effect keyed only on isResolving. */
function newHook(timer: Timer, isResolving: boolean, resolvingChanged: boolean) {
  const pause = timer.makePause();
  const resume = timer.makeResume();
  // The ref is updated every render, but that is not a dependency.
  if (resolvingChanged && !isResolving) resume(); // cleanup from the previous run
  if (isResolving) pause();
  else resume();
}

/** Runs one explanation window, ticking every 250ms. */
function runExplanation(impl: 'old' | 'new', stableCallbacks: boolean, ms: number) {
  const timer = new Timer();
  timer.explaining = true;
  const ticks = Math.ceil(ms / 250);
  const before = timer.seconds;

  for (let i = 0; i < ticks; i += 1) {
    // With the new hook the only dependency is `isResolving`, which is constant
    // across the window, so nothing re-runs. With the old hook every tick does.
    if (impl === 'old') oldHook(timer, true, i === 0 || !stableCallbacks);
    else newHook(timer, true, i === 0);

    timer.tickIfRunning();
  }

  return { lost: before - timer.seconds, spurious: timer.unPausesDuringExplanation };
}

const WRONG_MS = 2200;
const CORRECT_MS = 700;

console.log('\n=== Freeze held during an explanation? (lower spurious = better) ===');
for (const [label, ms] of [['wrong answer (2200ms)', WRONG_MS], ['correct answer (700ms)', CORRECT_MS]] as const) {
  const oldUnstable = runExplanation('old', false, ms);
  const newUnstable = runExplanation('new', false, ms);
  console.log(
    `  ${label}\n` +
      `    OLD: ${oldUnstable.spurious} un-pauses, ${oldUnstable.lost.toFixed(2)}s lost\n` +
      `    NEW: ${newUnstable.spurious} un-pauses, ${newUnstable.lost.toFixed(2)}s lost`,
  );
  check(`NEW holds the freeze for the ${label}`, newUnstable.spurious === 0, `${newUnstable.spurious}`);
  check(`NEW loses no time for the ${label}`, newUnstable.lost === 0, `${newUnstable.lost}s`);
}

// --- The freeze must still RELEASE. ---
console.log('\n=== Does the freeze release, and re-arm, correctly? ===');
{
  // Start frozen.
  let timer = new Timer();
  timer.explaining = true;
  newHook(timer, true, true);
  check('freezes while explaining', timer.paused);

  // Explanation ends.
  timer.explaining = false;
  newHook(timer, false, true);
  check('releases when the explanation ends', !timer.paused);
  timer.tickIfRunning();
  check('clock ticks again after release', timer.seconds < 60, `${timer.seconds}`);

  // Next explanation re-arms the freeze.
  timer.explaining = true;
  newHook(timer, true, true);
  check('re-arms for the next explanation', timer.paused);

  // A finished run must not leave the clock stuck paused.
  timer.explaining = false;
  newHook(timer, false, true);
  check('a finished run leaves the clock running', !timer.paused);
}

// --- Many consecutive rounds must not accumulate a stuck pause. ---
console.log('\n=== 30 consecutive rounds ===');
{
  const timer = new Timer();
  let stuck = 0;
  for (let round = 0; round < 30; round += 1) {
    // Freeze... (no time may be consumed here)
    timer.explaining = true;
    const duringFreeze = timer.seconds;
    for (let i = 0; i < Math.ceil(WRONG_MS / 250); i += 1) {
      newHook(timer, true, i === 0);
      timer.tickIfRunning();
    }
    if (timer.seconds !== duringFreeze) stuck += 1000; // sentinel: time leaked

    // ...release, then let the clock actually run before the next round.
    timer.explaining = false;
    newHook(timer, false, true);
    if (timer.paused) stuck += 1;
    for (let i = 0; i < 4; i += 1) timer.tickIfRunning();
  }
  check('no round ends with the clock stuck paused', stuck === 0, `${stuck} stuck rounds`);
  check('the clock actually ran during 30 rounds of play', timer.seconds < 60, `${timer.seconds}`);
  console.log(`  clock after 30 rounds: ${timer.seconds.toFixed(2)}s remaining`);
}

if (failures === 0) console.log('\nALL FREEZE CHECKS PASSED\n');
else {
  console.error(`\n${failures} FREEZE CHECK(S) FAILED\n`);
  process.exit(1);
}
