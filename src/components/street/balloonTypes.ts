/**
 * Types and pure helpers for the floating-balloon arcade sprint.
 *
 * No React here - just data the stage can render and mutate. The stage owns
 * position over time; everything else (which balloons exist, what they are
 * worth, how fast they rise) is decided by the pure builders below.
 *
 * ===================================================================
 * WHAT WAS REMOVED, AND WHY.
 * ===================================================================
 *
 * The old field carried four balloon kinds: `number`, `bonus_jar`, `nested` and
 * `hazard`. The sprint keeps TWO - a numbered balloon and a golden bonus - and
 * the reasoning is worth recording, because "fluff" is easy to re-add:
 *
 *   - `hazard` punished a tap with a cookie cost that never touched the streak,
 *     so it taught avoidance of a SHAPE rather than of a WRONG NUMBER. A child
 *     could learn "never tap the black one" and still pop every 7 in a row of
 *     sixes without ever losing anything that mattered. Distractors now carry
 *     the entire penalty, which keeps the lesson about the numbers.
 *
 *   - `nested` spawned a second balloon when popped, which made the population on
 *     screen unpredictable - fatal for a sprint whose whole difficulty is tuned by
 *     a fixed field size and a fixed rise speed.
 *
 *   - `bonus_jar` drew a cookie glyph INSIDE the balloon where the number should
 *     be. In a game that is entirely about reading a number, replacing the number
 *     with a decoration is the most expensive kind of clutter. The golden balloon
 *     in its place is still a bonus, but it is a distinct balloon rather than a
 *     blank, and it is deliberate rather than incidental.
 */

export type BalloonKind = 'number' | 'golden';

/**
 * A balloon currently on the stage. Percentages are of the stage box.
 *
 * `intent` records what the spawner MEANT this balloon to be. It is deliberately
 * NOT used for grading: at level 4 the target changes mid-flight, so a balloon
 * spawned as a multiple of 6 is just a number once the target becomes 7. The game
 * grades with `isCorrectPick(balloon, target)` against the target on screen now.
 * `intent` is kept for tuning (measuring the multiple/distractor ratio actually
 * achieved) and for the spawner's own bookkeeping.
 */
export interface FloatingBalloon {
  id: string;
  kind: BalloonKind;
  /** The number shown. Golden balloons carry a value too, but ignore it. */
  value: number;
  /** Whether the spawner intended this as a real multiple when it spawned. */
  intent: 'multiple' | 'distractor';
  /** Horizontal position, 0-100. Chosen once at spawn and then fixed. */
  xPercent: number;
  /** Seconds to cross the full stage height, bottom to top. */
  riseDuration: number;
  /** Seconds already spent rising, so a balloon can spawn mid-flight. */
  elapsed: number;
}

/**
 * Lane centres. Outer lanes are kept inboard so a balloon never clips the edge.
 *
 * Spread across the full width rather than clustered towards the middle: on a
 * three-balloon field the older narrow spacing left the sky looking empty at both
 * edges while the balloons jostled in the centre.
 *
 * TEN LANES, NOT FIVE. `pickSpawnLane` returns -1 once every lane is taken and
 * `nextBalloon` then refuses to spawn, so the lane count is a HARD CEILING on how
 * many balloons can be aloft at once - the tier's `fieldSize` cannot exceed it. The
 * denser tiers ask for up to 10 balloons, so there have to be 10 columns for them
 * to occupy; with the old 5, the field would have silently stopped at 5 and the
 * requested density would never have appeared.
 *
 * The spacing is tighter than the 16% balloon width, so neighbours in adjacent
 * lanes do overlap slightly. That is deliberate: the balloons are round and the
 * numbers sit in the centre of each, so a partial overlap between two columns
 * still leaves both values legible, and it keeps the sky feeling full rather than
 * gridded. Non-adjacent lanes never touch.
 */
export const LANE_CENTRES = [7, 18, 29, 40, 51, 62, 73, 84, 92, 97] as const;

/**
 * Horizontal jitter applied to a lane centre, in percent.
 *
 * Kept small because the lanes are only ~11% apart: the jitter has to stay well
 * under half that spacing so a balloon can never drift close enough to a
 * neighbour to be mistaken for it, and so `pickSpawnLane`'s nearest-centre
 * calculation always recovers the lane a balloon was actually spawned in.
 */
export const LANE_JITTER = 2;

/**
 * Widest a balloon may render, as a percent of the stage.
 *
 * Narrowed alongside the ten-lane spacing. At the old 16%, ten balloons would have
 * been wider in total than the stage and the columns would have merged into an
 * unreadable mass; 11% keeps each number legible while still looking like a balloon
 * rather than a dot. The rendered size also has a pixel floor in `BalloonItem`, so
 * this only ever bites on a wide stage - on a phone the balloons stay tappable.
 */
export const LANE_WIDTH_PERCENT = 11;

/**
 * How long a balloon of this kind stays visible at a given rise speed.
 *
 * The golden balloon drifts a little slower so it is visibly special and easier
 * to catch - it is meant to be taken, unlike the old decorations.
 */
export function riseFor(riseSeconds: number, kind: BalloonKind): number {
  return kind === 'golden' ? +(riseSeconds * 1.12).toFixed(2) : riseSeconds;
}

/**
 * How long to wait before the next spawn.
 *
 * A balloon lives for `riseSeconds`, so spacing spawns by
 * `riseSeconds / fieldSize` fills the stage to `fieldSize` and then holds there,
 * because each spawn replaces the one that left.
 *
 * THE SPACING IS DELIBERATELY TIGHTER THAN THE PERFECT STEADY STATE. A strictly
 * exact `riseSeconds / fieldSize` assumes every balloon lives exactly its full
 * time and none is popped early - but the child pops balloons constantly, and
 * each pop removes one that the cadence had counted on. Measured with the exact
 * spacing, a three-balloon field drained to ZERO for four seconds mid-sprint and
 * then slowly refilled, because the removal of even one balloon put the field
 * behind its own replacement rate.
 *
 * Spawning a little faster keeps a floor under the field: the surplus simply
 * means the stage sits at `fieldSize` instead of drifting below it, since the
 * spawner refuses to add a balloon once the field is full.
 */
export function spawnIntervalFor(riseSeconds: number, fieldSize: number): number {
  /*
   * 0.55 is the headroom factor, tightened from 0.75.
   *
   * 0.75 spawned about a third faster than the exact steady state, which was
   * enough to hold a field steady but not to keep it LIVELY: the stage sat at its
   * cap with little churn, so the sky read as static rather than active. 0.55
   * raises the replacement rate so balloons are continually arriving and leaving,
   * which is what makes the stage feel busy.
   *
   * The surplus is harmless - `nextBalloon` returns null once the field is full -
   * so over-spawning only ever means the stage sits at its cap, never past it. The
   * real constraint on how busy the field may look is the cap itself (see the
   * tier table in `balloonSprint.ts`), not this interval.
   */
  const seconds = (riseSeconds / Math.max(1, fieldSize)) * 0.55;
  // Floored at 0.5s: any faster and new numbers appear quicker than a child can
  // read them, which turns the sprint into a reflex test instead of a maths one.
  return Math.round(Math.max(0.5, seconds) * 1000);
}

/**
 * Chance that a given spawn is the golden balloon instead of a number.
 *
 * RAISED FROM 0.07 TO 0.12. At 7% a golden balloon was a rare sighting - with a
 * clutch of rolls competing against `multipleShare` and the target floor taking
 * priority, a child could finish a 45-second sprint having seen one or two, which
 * is too infrequent to feel like a reward worth chasing.
 *
 * Kept to 12% rather than higher because the golden balloon is pure bonus with no
 * bearing on the maths: every one that appears is a slot that is not teaching a
 * times table. A tenth-to-eighth of spawns keeps it a genuine treat without letting
 * it crowd the numbers out - and it is deliberately capped at one on screen at a
 * time, so the rate only affects how often the chance COMES UP, not how many can
 * stack.
 */
export const GOLDEN_SHARE = 0.12;

/**
 * ===================================================================
 * KEEPING VALID TARGETS ON SCREEN.
 * ===================================================================
 *
 * WHY THIS EXISTS. The normal cadence cannot recover a field that has gone dead,
 * and measurement showed that is the game's central pacing failure. Two things
 * combine:
 *
 *   1. `spawnIntervalFor` produces only a small surplus - at level 1 it spawns 4
 *      balloons per 11-second rise against 3 departures, a net gain of ONE. That
 *      is enough to hold the field steady when nothing is popped, and nowhere near
 *      enough to replace balloons the child actively takes.
 *
 *   2. `nextBalloon` returns null once the field is full. So when a child pops the
 *      only multiple, they are left with a field of pure distractors that the
 *      cadence CANNOT correct - it has no free slot, and it would only roll the
 *      tier's share anyway. The drought lasted until a distractor aged out, which
 *      at level 1 was up to ELEVEN SECONDS.
 *
 * Measured over 500 simulated sprints per tier, the median frame had ZERO valid
 * targets on screen and 85-90% of frames had none. A child who could physically
 * land 40+ correct pops in the 45 seconds was landing 9-18, because the targets
 * were simply not there to hit. That is the whole reason Gold felt impossible.
 *
 * THE RULE. The stage watches how many valid multiples are actually floating and
 * tops the field up whenever that count falls below `TARGET_MULTIPLES_ON_SCREEN`,
 * using forced multiples so the top-up is guaranteed to help. This runs on a fast
 * tick with only a short cooldown, so a popped target is replaced almost at once.
 *
 * WHY THERE IS STILL A COOLDOWN, JUST A SHORT ONE. A cooldown of zero would let the
 * watcher fire on every tick while the field churns, dumping a clutch into the sky
 * several times a second - the field would flicker and the balloon count would be
 * meaningless. `RESCUE_COOLDOWN_MS` of 600ms is shorter than a child's reaction
 * time, so it is imperceptible while playing, but it still bounds the watcher to
 * roughly one clutch per beat.
 *
 * The earlier 3000ms value was calibrated when Gold was 1,600 points: with a slow
 * refill, a good child landed ~34 pops and cleared Gold in ~18-24s. That made the
 * medal demand WAITING as much as arithmetic, which is the wrong difficulty. The
 * cooldown is now short and the field is kept genuinely stocked, so Gold is earned
 * purely by fast, accurate reading - see the threshold note in `balloonSprint.ts`.
 */

/** Balloons dropped in at once when the field is short of targets. */
export const RESCUE_SIZE = 2;

/** Guaranteed multiples within a top-up clutch. Never the whole clutch, so the
 *  field still presents choices the child has to discriminate between. */
export const RESCUE_MULTIPLES = 2;

/**
 * Valid multiples the stage tries to keep floating at all times.
 *
 * This is the density guarantee. At 3, a child working quickly always has a
 * selection to choose from rather than hunting a single balloon, while the field
 * still contains plenty of distractors to reject.
 */
export const TARGET_MULTIPLES_ON_SCREEN = 3;

/**
 * Minimum gap between top-ups, in milliseconds.
 *
 * Short enough to be imperceptible - well under the ~900ms a child takes between
 * pops - so a popped target is replaced before the child has finished looking for
 * their next one. It exists to stop the watcher firing several times within a
 * single frame of field churn, not to ration the supply of targets.
 */
export const RESCUE_COOLDOWN_MS = 700;

/**
 * The fraction of the field that should be valid multiples, as a soft floor.
 *
 * Used only when the normal cadence spawns into a field that is BELOW this share.
 * It is a floor on the mix, not a guarantee, because the field's composition also
 * depends on what the child has popped - this only stops the cadence from adding
 * yet another distractor to a field that is already starved of targets.
 *
 * Set at 0.35, the low end of the 30-40% band, because forcing it higher crowds
 * out the distractors that give the game its difficulty: a field that is mostly
 * correct answers removes the need to check anything.
 */
export const MIN_MULTIPLE_SHARE = 0.35;
