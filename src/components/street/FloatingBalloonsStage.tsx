/**
 * The floating-balloon arcade stage.
 *
 * All movement is CSS. Each balloon mounts with one `riseBalloon` keyframe and a
 * per-balloon negative delay, then rises on the compositor with no JS involved -
 * nothing here ever writes a position.
 *
 * The one timer left is a spawn ticker. It does not track position or time: the
 * tick exists solely to ask the spawner for the next balloon, so it costs one
 * small re-render per spawn and nothing per frame.
 *
 * ===================================================================
 * THE STAGE REPORTS, THE GAME DECIDES.
 * ===================================================================
 *
 * Two things are deliberately NOT this component's business:
 *
 *   FLOAT-OFFS. When a balloon leaves the top, whether that is a penalty depends
 *   on what it WAS, which only the game knows. So the stage reports the exit and
 *   lets the caller decide: a distractor sailing away costs nothing, while an
 *   unpopped multiple breaks the streak. Silently deleting it - which is what this
 *   component used to do - would make those rules unwritable.
 *
 *   GRADING. Tapping calls `onPop` and the game answers with true or false. The
 *   stage then plays the matching reaction, so the score and the shake can never
 *   disagree about whether a balloon was right.
 */
import { useEffect, useRef, useState } from 'react';
import BalloonItem from './BalloonItem';
import { nextBalloon, rescueClutch } from './balloonSpawner';
import { isCorrectPick, type BalloonLevel } from './balloonSprint';
import {
  LANE_WIDTH_PERCENT,
  MIN_MULTIPLE_SHARE,
  RESCUE_COOLDOWN_MS,
  TARGET_MULTIPLES_ON_SCREEN,
  spawnIntervalFor,
  type FloatingBalloon,
} from './balloonTypes';

interface FloatingBalloonsStageProps {
  /** The target multiple in play right now. */
  target: number;
  /** The current tier: field size, pace and mix. */
  tier: BalloonLevel;
  /** True once the sprint is over; stops spawning and freezes the rise. */
  paused: boolean;
  /** Grades a tap. Return true for a correct pick, false for a distractor. */
  onPop: (balloon: FloatingBalloon) => boolean;
  /** Called when a balloon drifts off the top of the stage unpopped. */
  onFloatOff: (balloon: FloatingBalloon) => void;
}

const WRONG_SHAKE_MS = 460;

export default function FloatingBalloonsStage({
  target,
  tier,
  paused,
  onPop,
  onFloatOff,
}: FloatingBalloonsStageProps) {
  /*
   * THE OPENING FIELD IS BUILT IN `useState`, NOT IN AN EFFECT.
   *
   * A balloon is removed when its rise animation ENDS, so every balloon mounted in
   * the same frame later exits in that same frame. Filling the stage with a
   * co-starting batch therefore synchronises the whole field: the batch leaves
   * together as one clump, and the stage then spends several seconds refilling
   * from empty. Measured on a naive fill, the opening balloons all arrived at
   * 0.1s, vanished together a rise later, and the field sat at ZERO for seconds.
   *
   * Spreading the batch's `elapsed` across the spawn interval makes them leave one
   * at a time, so a new balloon always arrives just as the previous departs. The
   * negative animation delay drops each balloon into the middle of its rise, which
   * is why the stage looks already-populated on the first frame.
   *
   * Building it here rather than in an effect also means the very first painted
   * frame already has balloons on it - an effect would commit one empty frame
   * first, and would trip the `set-state-in-effect` lint rule.
   *
   * THE OPENING MUST ALREADY SATISFY THE TARGET FLOOR. A purely random fill of a
   * ten-balloon field can open with only one or two multiples - the same starved
   * hand the watchdog exists to prevent - so the count is checked and forced up
   * before the first frame is ever painted. Opening short would otherwise be felt
   * as a slow start on every single sprint.
   */
  const [balloons, setBalloons] = useState<FloatingBalloon[]>(() => {
    const opening: FloatingBalloon[] = [];
    const spawnMs = spawnIntervalFor(tier.riseSeconds, tier.fieldSize);
    for (let i = 0; i < tier.fieldSize; i += 1) {
      // The first few are forced multiples so the very first frame has targets to
      // read; the rest roll the tier's share so the field still holds distractors.
      const spawned = nextBalloon({
        target,
        tier,
        active: opening,
        forceMultiple: i < TARGET_MULTIPLES_ON_SCREEN,
      });
      if (!spawned) break;
      // Newest balloon is highest up, so the batch is spread down the stage.
      spawned.elapsed = +((tier.fieldSize - 1 - i) * (spawnMs / 1000)).toFixed(2);
      opening.push(spawned);
    }
    return opening;
  });
  const [popped, setPopped] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  /*
   * The dedup guard for taps lives in a REF, not in `popped`. Two taps can land
   * inside one React batch - a fast double-tap, or a tap on a balloon whose exit
   * is being processed in the same frame - and both would read the same stale
   * `popped` array and score twice. The ref is the synchronous truth; the state is
   * only there to drive the pop animation.
   */
  const poppedRef = useRef<Set<string>>(new Set());
  const wrongTimer = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  /*
   * The distance a balloon travels, in pixels: the measured height of the play
   * area. Measured rather than hard-coded because the stage is a flexible box -
   * a few hundred pixels on a short phone and roughly double that on a desktop -
   * and a fixed guess would either stop short of the top or race past it.
   */
  const [stageHeight, setStageHeight] = useState(320);
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setStageHeight(Math.round(node.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const spawnMs = spawnIntervalFor(tier.riseSeconds, tier.fieldSize);
  /*
   * When the last top-up happened, for the cooldown. Held in a ref because it is
   * pacing bookkeeping rather than something the render depends on - putting it in
   * state would not remount anything but would re-run the spawn effect on every
   * top-up, resetting the interval each time and defeating the cadence.
   */
  const lastTopUpRef = useRef(0);
  useEffect(() => {
    if (paused) return;
    lastTopUpRef.current = 0;

    /*
     * The field is topped up on a fixed cadence. `fill` refuses once the field is
     * full, so the surplus from spawning faster than strictly needed is simply
     * discarded - it exists to put a floor under the balloon count.
     */
    const fill = (current: FloatingBalloon[]) => {
      if (current.length >= tier.fieldSize) return current;
      const spawned = nextBalloon({ target, tier, active: current });
      if (!spawned) return current;

      /*
       * A FLOOR ON BOTH THE MIX AND THE TARGET COUNT. Two separate shortfalls are
       * corrected here, because the cadence is the cheapest place to fix them - it
       * fires anyway, and topping up on the spot avoids waiting a whole tick for
       * the watchdog below.
       *
       *   - SHARE: not enough of the field is multiples at all.
       *   - COUNT: enough of the field is multiples by ratio, but there are still
       *     too few in absolute terms to choose from (a 60%-multiple field of five
       *     balloons has only three targets, and a child popping fast empties that
       *     faster than any ratio can express).
       *
       * Bounded at 5 extra spawns so it can never loop on a field whose multiples
       * are all taken, and it stops the moment the field is full.
       */
      const next = [...current, spawned];
      let extra = 0;
      while (extra < 5 && next.length < tier.fieldSize) {
        const targets = next.filter((b) => isCorrectPick(b, target)).length;
        const share = targets / next.length;
        if (share >= MIN_MULTIPLE_SHARE && targets >= TARGET_MULTIPLES_ON_SCREEN) break;
        const forced = nextBalloon({ target, tier, active: next, forceMultiple: true });
        if (!forced) break;
        next.push(forced);
        extra += 1;
      }
      return next;
    };

    const id = window.setInterval(() => setBalloons((current) => fill(current)), spawnMs);
    return () => window.clearInterval(id);
  }, [target, tier, paused, spawnMs]);

  /*
   * ============================================================
   * THE TARGET WATCHDOG.
   * ============================================================
   *
   * Runs on its own fast tick, separate from the spawn cadence, and fires whenever
   * the number of valid multiples on screen drops below
   * `TARGET_MULTIPLES_ON_SCREEN` - not only when the field hits zero. That
   * distinction is the whole density guarantee: waiting for zero lets the field
   * reach a state where the child has a single balloon to aim at, which is the
   * "invalid target is rare" feel this change removes.
   *
   * IT IS NOT DRIVEN BY THE POP HANDLER. Reacting only inside `handlePop` would
   * miss a balloon that drifted off the top unpopped, and would do nothing at all
   * when the field is short of targets because of what the cadence has spawned
   * rather than what the child took. Watching the field on a timer means the count
   * is maintained regardless of how it got low.
   *
   * The tick is 120ms and the cooldown is short (see `RESCUE_COOLDOWN_MS`), so a
   * popped target is replaced faster than a child can look for the next one. The
   * tick only ever reads a short array, so it costs nothing per frame.
   */
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      if (now - lastTopUpRef.current < RESCUE_COOLDOWN_MS) return;
      setBalloons((current) => {
        const targets = current.filter((b) => isCorrectPick(b, target)).length;
        if (targets >= TARGET_MULTIPLES_ON_SCREEN) return current;
        if (current.length >= tier.fieldSize) return current;

        /*
         * Only enough to reach the floor: the clutch grows with the shortfall, so a
         * field that is one target short is topped up by roughly one balloon rather
         * than being buried under a full restock.
         */
        const clutch = rescueClutch({
          target,
          tier,
          active: current,
          missing: TARGET_MULTIPLES_ON_SCREEN - targets,
        });
        if (clutch.length === 0) return current;
        lastTopUpRef.current = now;
        return [...current, ...clutch];
      });
    }, 120);
    return () => window.clearInterval(id);
  }, [target, tier, paused]);

  // Every timer this component owns is cleared on unmount, so closing the modal
  // mid-sprint cannot leave a stray timeout writing into an unmounted tree.
  useEffect(
    () => () => {
      if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
    },
    [],
  );

  const handlePop = (balloon: FloatingBalloon) => {
    if (poppedRef.current.has(balloon.id)) return;
    poppedRef.current.add(balloon.id);
    const correct = onPop(balloon);
    setPopped((current) => [...current, balloon.id]);

    if (correct) return;

    // The balloon the child got wrong stays on screen for the rest of its rise,
    // flashing, so they can see WHICH number they misread. Clearing it here would
    // hide the very thing the mistake is supposed to teach.
    setWrong(balloon.id);
    if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
    wrongTimer.current = window.setTimeout(() => setWrong(null), WRONG_SHAKE_MS);
  };

  /**
   * The rise animation finished, so this balloon is off the top of the stage.
   * Remove exactly that id, leave every other balloon untouched, and tell the
   * caller so it can apply the float-off streak rules.
   *
   * THE SLOT IS BACKFILLED ON THE SPOT. Waiting for the next tick leaves the gap
   * of up to a whole spawn interval, which on a three-balloon field is a third of
   * the visible stage - measured, the field oscillated between 2 and 3 balloons
   * instead of holding 3. Refilling here closes that gap, so the field only ever
   * dips while a balloon is genuinely in flight off the top.
   */
  const handleExit = (balloon: FloatingBalloon) => {
    poppedRef.current.delete(balloon.id);
    setBalloons((current) => {
      const remaining = current.filter((b) => b.id !== balloon.id);
      if (remaining.length >= tier.fieldSize) return remaining;

      /*
       * A DEPARTING BALLOON MAY HAVE TAKEN A TARGET WITH IT. If the field is now
       * below the target floor, refill with a forced clutch rather than a single
       * rolled spawn - a rolled spawn has a better-than-even chance of being ANOTHER
       * distractor on the very frames the field can least afford one, which is how
       * a one-balloon dip became a drought.
       */
      const targets = remaining.filter((b) => isCorrectPick(b, target)).length;
      if (targets < TARGET_MULTIPLES_ON_SCREEN) {
        return [
          ...remaining,
          ...rescueClutch({
            target,
            tier,
            active: remaining,
            missing: TARGET_MULTIPLES_ON_SCREEN - targets,
          }),
        ];
      }

      const spawned = nextBalloon({ target, tier, active: remaining });
      return spawned ? [...remaining, spawned] : remaining;
    });
    setPopped((current) => current.filter((id) => id !== balloon.id));
    onFloatOff(balloon);
  };

  return (
    <div
      ref={stageRef}
      style={{ '--stage-height': `${stageHeight}px` } as React.CSSProperties}
      className="relative h-full min-h-[320px] w-full overflow-hidden rounded-3xl bg-gradient-to-b from-sky-400 via-sky-200 to-amber-100"
    >
      {balloons.map((balloon) => (
        /*
         * The lane is full-height and only positions the balloon horizontally.
         * The rising element inside it is a single balloon - critically NOT
         * `h-full` - so the `100%` in the rise keyframe resolves against the
         * balloon rather than the stage. See `riseBalloon` in index.css.
         */
        <div
          key={balloon.id}
          className="absolute inset-y-0 -translate-x-1/2"
          style={{ left: `${balloon.xPercent}%`, width: `${LANE_WIDTH_PERCENT}%` }}
        >
          <BalloonItem
            balloon={balloon}
            rising={!paused}
            popped={popped.includes(balloon.id)}
            wrong={wrong === balloon.id}
            onPop={handlePop}
            onExit={handleExit}
          />
        </div>
      ))}
    </div>
  );
}
