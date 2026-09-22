/**
 * Decides what spawns next on the balloon stage.
 *
 * Pure: given the current state it returns a new balloon or null. The stage calls
 * this on its spawn tick, so all the balancing (multiples vs distractors vs the
 * golden bonus, and which lane is free) lives here and stays testable.
 */
import {
  GOLDEN_SHARE,
  LANE_CENTRES,
  LANE_JITTER,
  RESCUE_MULTIPLES,
  RESCUE_SIZE,
  riseFor,
  type BalloonKind,
  type FloatingBalloon,
} from './balloonTypes';
import { isCorrectPick, type BalloonLevel } from './balloonSprint';
import { pickDistractor } from './balloonDistractors';

let seq = 0;
const nextId = (kind: BalloonKind) => `${kind}-${(seq += 1)}`;

export interface SpawnInput {
  /** The target multiple in play right now. */
  target: number;
  /** The current tier, which sets the field size, pace and multiple share. */
  tier: BalloonLevel;
  /** Balloons already on stage, used for lane spacing and duplicate checks. */
  active: FloatingBalloon[];
  /**
   * Forces the balloon to be a real multiple of the target.
   *
   * USED BY THE EMERGENCY REFILL, NOT BY THE NORMAL CADENCE. Without this the
   * spawner can only offer the tier's `multipleShare` odds, and a field that has
   * gone all-distractor needs a GUARANTEED multiple to recover - rolling the usual
   * coin there would have a better-than-even chance of deepening the drought.
   */
  forceMultiple?: boolean;
  /** Injectable for deterministic tests; defaults to Math.random. */
  random?: () => number;
}

/**
 * True when nothing on the stage is a valid multiple of the target right now.
 *
 * This is the condition the emergency refill watches. It grades with
 * `isCorrectPick` rather than trusting `intent`, because the target can change
 * mid-flight at level 4 - a balloon spawned as a multiple of 6 is just a number
 * once the target becomes 7, and the stage must not count it as cover.
 */
export function hasNoTarget(active: FloatingBalloon[], target: number): boolean {
  return !active.some((balloon) => isCorrectPick(balloon, target));
}

/** Nearest lane that no balloon currently occupies, or -1 if all are busy. */
export function pickSpawnLane(active: FloatingBalloon[], random: () => number): number {
  const used = new Set(
    active.map((b) => {
      let best = 0;
      let bestGap = Infinity;
      LANE_CENTRES.forEach((centre, lane) => {
        const gap = Math.abs(centre - b.xPercent);
        if (gap < bestGap) {
          bestGap = gap;
          best = lane;
        }
      });
      return best;
    }),
  );

  const free = LANE_CENTRES.map((_, lane) => lane).filter((lane) => !used.has(lane));
  if (free.length === 0) return -1;
  return free[Math.floor(random() * free.length)]!;
}

/**
 * A real multiple of the target that is not already floating.
 *
 * Capped at 10 x the target so a hard table does not fill the sky with four-digit
 * numbers, and started at 2 x so the target itself never appears - popping "6"
 * when the target is 6 teaches nothing about the six times table.
 */
function unusedMultiple(
  target: number,
  taken: ReadonlySet<number>,
  random: () => number,
): number | null {
  const options = Array.from({ length: 9 }, (_, i) => (i + 2) * target).filter(
    (value) => !taken.has(value),
  );
  if (options.length === 0) return null;
  return options[Math.floor(random() * options.length)]!;
}

/**
 * Builds the next balloon for the stage, or null when the field is full.
 *
 * THE MULTIPLE SHARE COMES FROM THE LEVEL, not from how close the child is to a
 * goal. The old builder leaned harder on correct answers the fewer the child
 * needed, which was right for a finite quest and is wrong here: this is a timed
 * sprint with no goal, so the share has to stay constant and be a property of the
 * tier alone. Otherwise the mix would drift with the score and two children on
 * the same level would face different difficulties.
 */
export function nextBalloon(input: SpawnInput): FloatingBalloon | null {
  const { target, tier, active, forceMultiple = false } = input;
  const random = input.random ?? Math.random;

  // The field size is the tier's, so this is what holds 3 to 5 balloons aloft.
  if (active.length >= tier.fieldSize) return null;

  const lane = pickSpawnLane(active, random);
  if (lane < 0) return null;

  const taken = new Set(active.map((b) => b.value));

  /*
   * The golden balloon is rolled FIRST and taken out of the normal budget, so it
   * cannot crowd out the numbers the child is meant to be reading.
   *
   * IT IS NEVER SPAWNED ON A FORCED MULTIPLE. The top-up path calls this function
   * with `forceMultiple: true` precisely because the field is short of targets -
   * which means those calls are the worst possible moment to hand back a golden
   * balloon instead. Before this guard, a top-up could be silently swallowed by a
   * golden roll, so the target floor the watchdog was trying to restore never
   * actually arrived. Forced spawns are now always genuine multiples.
   *
   * The field-size gate is kept but relaxed from 2 to 1: the golden balloon is only
   * held back when it would be the child's ONLY balloon, since that would leave
   * them nothing to practise on.
   */
  const canSpawnGolden =
    !forceMultiple && active.length >= 1 && !active.some((b) => b.kind === 'golden');
  const isGolden = canSpawnGolden && random() < GOLDEN_SHARE;

  let kind: BalloonKind = 'number';
  let value = 0;
  let intent: FloatingBalloon['intent'] = 'distractor';

  if (isGolden) {
    kind = 'golden';
    // Carries a multiple so it reads as part of the game; the value is unused.
    value = unusedMultiple(target, taken, random) ?? target * 2;
    intent = 'multiple';
  } else if (forceMultiple || random() < tier.multipleShare) {
    const multiple = unusedMultiple(target, taken, random);
    if (multiple !== null) {
      value = multiple;
      intent = 'multiple';
    } else {
      // Every multiple is already floating, so a distractor is the only fresh
      // number available. Spawning a duplicate would let one correct answer be
      // worth two pops, which makes the score meaningless.
      value = pickDistractor(target, taken, random);
    }
  } else {
    value = pickDistractor(target, taken, random);
  }

  const centre = LANE_CENTRES[lane]!;
  const jitter = (random() * 2 - 1) * LANE_JITTER;

  return {
    id: nextId(kind),
    kind,
    value,
    intent,
    xPercent: +(centre + jitter).toFixed(2),
    riseDuration: riseFor(tier.riseSeconds, kind),
    elapsed: 0,
  };
}

/**
 * Builds a small clutch of balloons to bring a field back up to the target floor.
 *
 * Returns an empty array when there is no room, so the caller can simply spread
 * the result into its field.
 *
 * THE CLUTCH IS SIZED TO THE SHORTFALL, NOT FIXED. A field that is one target
 * short should not receive a full restock - that would overshoot the floor within
 * a single tick and make the balloon count jump. Passing `missing` grows the
 * clutch only as far as the floor requires, and the extra roll beyond the forced
 * multiples keeps a token distractor arriving so the field is never pure answers.
 *
 * `unusedMultiple` is capped at 10x the target, so on a full field it is possible
 * for every multiple to be taken already. In that case the forced spawn falls back
 * to a distractor (see `nextBalloon`), and the clutch is simply smaller than
 * requested - hence the `null` guard rather than an assertion.
 */
export function rescueClutch(
  input: SpawnInput & { size?: number; multiples?: number; missing?: number },
): FloatingBalloon[] {
  const {
    target,
    tier,
    active,
    size = RESCUE_SIZE,
    multiples = RESCUE_MULTIPLES,
    missing,
    random = Math.random,
  } = input;

  /*
   * When the caller knows how many targets are absent, aim for that many forced
   * multiples plus one rolled spawn. The cap keeps a large shortfall from dumping
   * the entire field in one go.
   */
  const wantedCount = missing === undefined ? size : Math.min(size + 1, Math.max(1, missing) + 1);
  const wantedMultiples = missing === undefined ? multiples : Math.max(1, Math.min(multiples + 1, missing));

  const clutch: FloatingBalloon[] = [];
  let field = active;

  for (let i = 0; i < wantedCount; i += 1) {
    const spawned = nextBalloon({
      target,
      tier,
      active: field,
      forceMultiple: i < wantedMultiples,
      random,
    });
    if (!spawned) break;
    clutch.push(spawned);
    // Each new balloon must see the ones already chosen, or two forced multiples
    // could pick the same value and land in the same lane.
    field = [...field, spawned];
  }

  return clutch;
}
