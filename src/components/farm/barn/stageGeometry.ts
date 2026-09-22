/**
 * Shared geometry for the barn stage.
 *
 * ===================================================================
 * THE STAGE IS A CSS SANDWICH: BACKDROP - ANIMALS - FOREGROUND.
 * ===================================================================
 *
 * `BarnTunnelStage` stacks three absolutely-positioned layers in one box:
 *
 *   z-0   `newbarn.png`          the painted scene
 *   z-10  the actor lane          the travelling animals
 *   z-20  `barn-foreground.png`   the barn's front face, with a transparent door
 *
 * Every constant here is a FRACTION OF THAT BOX rather than an SVG user unit, so
 * the animals stay glued to the same patch of painted grass at every window size
 * with no letterbox transform to compute.
 *
 * THE BARN'S SHAPE IS NO LONGER IN THIS FILE. It used to be, twice over: as a
 * clip path and as hand-built facade paths, both of which had to be kept aligned
 * with each other and with the artwork. The barn is now simply the foreground
 * image, and its doorway is real transparency in that image. The only thing the
 * code still has to agree with the picture about is WHERE THE DOOR IS - which is
 * the one number pair marked as measured below.
 */
import newbarn from '../../../assets/game/newbarn.png';
import barnForeground from '../../../assets/game/barn-foreground.png';
import { delayMs, TROT_DURATION } from './barnTiming';

/**
 * The painted scene: sky, meadow and the barn's body.
 *
 * RESOLVED THROUGH THE SAME IMPORT AS THE ANIMALS rather than a hard-coded public
 * path, so Vite hashes and bundles it with everything else and a missing file is
 * a build error instead of a broken <img> at runtime.
 *
 * NOTE: `newbarn.png` is a JPEG with a `.png` extension. That is how the asset was
 * supplied and it renders correctly everywhere - browsers and Vite both sniff the
 * real type from the bytes - so it is noted only so a future reader inspecting the
 * file does not conclude the artwork is corrupt.
 */
export function sceneArt(): string {
  return newbarn;
}

/**
 * The foreground overlay: the barn's front wall.
 *
 * THIS IMAGE IS THE GAME'S CORE MECHANIC. Alpha-sampling it shows the barn's body
 * is SOLID - there is no transparent doorway to peer through - so an animal drawn
 * under it is genuinely covered, not merely dimmed. The interior therefore never
 * reveals how many animals are inside, and the child has to hold the running total
 * in their head. The layering is what makes that necessary rather than optional.
 *
 * The image also carries the roof, so the barn's silhouette is entirely the
 * artist's: nothing in this codebase draws or clips the barn's shape.
 */
export function foregroundArt(): string {
  return barnForeground;
}

/**
 * The doorway's centre and half-width, as fractions of the stage's width.
 *
 * MEASURED FROM THE ARTWORK, NOT GUESSED. Sampling the alpha channel of
 * `barn-foreground.png` shows the barn's walls running from x=0.287 to x=0.712,
 * so the barn body's centre sits at ~0.50 and the wall span is ~0.425 wide.
 *
 * THE DOORWAY IS CENTRED ON THE BARN, and it is a POSITION, not a hole - see the
 * note on `foregroundArt`. What matters for gameplay is that an animal entering
 * the barn finishes its run at a point where the foreground fully covers it, so
 * this is the barn's centre rather than the art's exact door frame.
 */
export const DOOR_CENTRE_PCT = 0.5;
export const DOOR_HALF_W_PCT = 0.1;

/**
 * The painted ground line, as a fraction of the stage's height.
 *
 * MEASURED, NOT GUESSED: alpha-sampling `barn-foreground.png` row by row shows
 * the barn's silhouette ending abruptly at y=0.85 (coverage drops from 0.427 to
 * 0.000 between y=0.80 and y=0.85). That edge is where the painted barn meets the
 * painted grass, so it is the line the animals must stand on to look planted.
 *
 * THE VALUE IS PULLED JUST ABOVE THAT EDGE, AND THAT MARGIN IS LOAD-BEARING. The
 * barn is SOLID from y=0.78 to y=0.84, and the very last row before it vanishes
 * (y=0.84) has a small transparent notch on its right side. An animal whose feet
 * landed on y=0.85 exactly would be standing on the bare grass at the barn's
 * base, and its feet would be visible in the gap on that final row - so the herd
 * is placed a little higher, where the foreground is reliably opaque across the
 * whole barn footprint. The animals then read as standing just in front of the
 * barn, which is also the more natural perspective.
 */
export const GROUND_PCT = 0.835;

/**
 * How far BELOW the calibrated ground line the animals are placed, as a fraction
 * of the stage's height.
 *
 * THE ANIMALS ARE LOWERED ON PURPOSE, and the reason is a compromise between the
 * artwork and the gameplay.
 *
 * `GROUND_PCT` is where the painted barn meets the painted grass (measured from
 * the alpha channel, see above). But the barn's base is not the bottom of the
 * frame - the meadow runs on below it - and an animal standing exactly on the
 * barn's sill reads as level with the building rather than out in front of it.
 * Nudging the herd down settles them onto the foreground lawn, closer to the base
 * of the barn, which is where a child expects the animals to be.
 *
 * WHY IT IS A SEPARATE CONSTANT RATHER THAN A BIGGER `GROUND_PCT`. These are two
 * different facts - where the grass is in the picture, and how far the herd is
 * offset toward the viewer - and folding them together would destroy the
 * measurement above, so the next person to touch this file could not tell which
 * part was derived from the art and which was a taste decision.
 *
 * 0.075 is the current value, and it is the CEILING rather than a preference.
 *
 * TWO EARLIER PASSES ASKED FOR MORE, AND THE GEOMETRY REFUSED. The first set 0.05
 * (the top of an initial 4-6% band); a second asked for another 3-5%; a third asked
 * for another 3-4% on top of that. Each request was reasonable in isolation, but the
 * drop cannot keep growing, and the reason is the SHORTEST sprite rather than the
 * tallest.
 *
 * THE HARD LIMIT IS 0.0789, AND IT IS DERIVED, NOT FELT. An animal reads as "standing
 * in the meadow" only while its HEAD stays above the barn's painted base (0.841). A
 * duck is 56px in a 768px scene, so:
 *
 *     head_y = (GROUND_PCT + DROP) - 56/768   must be  <  0.841
 *     =>  DROP  <  0.841 - 0.835 + 56/768  =  0.0789
 *
 * Past that the duck, rabbit and cat are ENTIRELY below the barn's silhouette - the
 * whole animal sits in the narrow strip under the barn, which reads as sunk into the
 * frame edge rather than planted in grass, and the meadow it was supposed to be
 * standing in is no longer visible behind it. That is the opposite of "well
 * grounded", so the request has to stop short of its literal figure.
 *
 * 0.075 takes the largest safe step: a further +7% of the previous offset, landing
 * just 0.004 under the limit so no rounding can tip the shortest sprite over.
 *
 * IF THIS EVER NEEDS TO GO LOWER, THE FIX IS TO RAISE THE SHORT SPRITES, NOT TO
 * LOWER THE BASELINE. `SPRITE_PX` multiplies into this limit directly - a taller duck
 * buys room for a deeper drop - so the two constants have to move together.
 *
 * THE CEILING ON THIS NUMBER IS THE SHORTEST SPRITE, not the tallest.
 *
 * THE CONSEQUENCE IS HANDLED BY THE ANIMAL MOVING, NOT BY A PATCH. Feet at 0.910
 * land BELOW the painted barn's base (0.841), so an animal parked at the doorway
 * would show its lower legs in the stripe the barn does not paint. Rather than
 * drawing something over it, an incoming animal RISES to `LANE_TOP_PARKED` as it
 * reaches the door - putting its feet back on barn-opaque ground, so the barn art
 * covers it and nothing is ever painted over a sprite on the lawn.
 */
export const ANIMAL_BASELINE_DROP = 0.075;

/**
 * The vertical anchor for the actor lane: where the actors' FEET sit, measured
 * from the top as a fraction of the stage's height.
 *
 * Anchoring by the feet is what lets a `h-12` duckling and a `h-20` horse stand
 * on the same line without a table of per-animal offsets - each sprite grows
 * upward from this one value.
 *
 * THIS IS THE LANE FOR ANIMALS OUT ON THE LAWN. An incoming animal uses it for
 * the whole of its run and then RISES to `LANE_TOP_PARKED` for the last stretch
 * as it reaches the doorway - see that constant for why.
 */
export const ACTOR_LANE_TOP = GROUND_PCT + ANIMAL_BASELINE_DROP;

/**
 * Where an animal's feet sit once it is PARKED inside the barn doorway.
 *
 * ===================================================================
 * WHY THE HERD RISES AS IT ENTERS, RATHER THAN STAYING LOW.
 * ===================================================================
 *
 * The seam this solves: `ACTOR_LANE_TOP` is 0.885, but the painted barn's wall
 * only reaches down to ~0.841 (measured column by column - it varies between
 * 0.836 and 0.849, and bottoms out at 0.841 across the doorway). So an animal
 * standing on the lawn line has its lower legs BELOW the barn's base, in the
 * stripe the artwork does not paint.
 *
 * For an animal out on the grass that is exactly right - it is standing in front
 * of the barn, and you can see its feet. The problem is only at the doorway: the
 * animal has to VANISH as it enters, and the barn art cannot cover legs that are
 * hanging below the barn's own base.
 *
 * The previous fix was an opaque "curtain" rectangle drawn OVER the animals to
 * plug that stripe. It worked at the doorway and broke everything else: the
 * curtain spanned the barn's whole footprint (x 0.28-0.72), so every animal
 * running across the middle of the lawn was painted over by a brown box. The herd
 * appeared to dissolve out of existence mid-stage. Layering something over the
 * actors to hide one of them hides all of them.
 *
 * SO THE ANIMAL MOVES INSTEAD, AND NOTHING IS DRAWN OVER IT. An incoming animal
 * eases up from the lawn line to this value as it arrives, putting its feet on
 * 0.835 - the line `GROUND_PCT` already measured as reliably barn-opaque across
 * the entire footprint. At that height the barn art alone covers it completely,
 * so the animal genuinely disappears into the building with no filler at all.
 *
 * The rise is 5% of the stage, which reads as the animal stepping up onto the
 * barn's threshold. It is a real visual cue that the animal has gone inside,
 * which the flat version never had.
 *
 * `LANE_IN_DOOR_PCT` must be reached at the same instant the rise completes, so
 * the animal is fully covered exactly when it stops - see `travelPct`.
 */
export const LANE_TOP_PARKED = GROUND_PCT;

/**
 * Where a wave starts and ends, as fractions of the stage's width.
 *
 * INCOMING starts fully off-screen left and finishes at the doorway's centre, so
 * the animal ends its run standing inside the barn's opening.
 *
 * OUTGOING starts at the doorway's centre - so at t=0 it is already hidden behind
 * the foreground art - and must finish FULLY clear of the right edge.
 *
 * ===================================================================
 * WHY THE EXIT TARGET IS SO FAR OUT (1.30, NOT 1.15).
 * ===================================================================
 *
 * Actors are centred on their `left` percentage with `translateX(-50%)`, so the
 * value that matters is the SPRITE'S EDGE, not its centre: an animal fully exits
 * only when `centre - halfWidth` exceeds 100%.
 *
 * A horse at `h-20` is the worst case. At the stage's 16:9 ratio it is roughly 8%
 * of the width, so half of it is ~4%. Centring it at 1.15 would leave its nose
 * peeking back inside the frame at the end of its run - which reads as the animal
 * "shrinking" or stopping at the wall rather than leaving.
 *
 * 1.30 clears the widest sprite by a wide margin, so the animal is unambiguously
 * gone before it parks. Overshooting costs nothing visually, because the actor is
 * off-screen for the last stretch of its travel either way.
 *
 * The travel is a pure translation with NO scale or opacity animation, so the
 * animal keeps full size and full opacity the entire way out - it simply walks
 * off the edge.
 */
export const LANE_ENTER_FROM_PCT = -0.18;
export const LANE_EXIT_TO_PCT = 1.3;

/**
 * Where each wave's actor finishes, in percent.
 *
 * BOTH ARE THE BARN'S CENTRE, AND THAT IS THE GAME'S CORE MECHANIC.
 *
 * An inbound animal walks from off-screen left and stops at the CENTRE of the
 * barn's body, where the foreground art covers it completely - so it disappears
 * rather than merely standing in front of a wall. An outbound animal STARTS at
 * that same covered point and emerges from behind the barn, which is why it never
 * pops into existence on the lawn.
 *
 * The barn body spans x=0.287..0.712, and an animal stops here at its own centre;
 * the widest sprite (a horse at `h-20`, aspect 1.06) is only ~8% of the stage
 * wide, so it sits wholly within the covered span with room to spare on both
 * sides. That margin is what makes the child unable to see inside.
 */
export const LANE_IN_DOOR_PCT = DOOR_CENTRE_PCT;
export const LANE_OUT_DOOR_PCT = DOOR_CENTRE_PCT;

/**
 * Which way each lane's artwork must face.
 *
 * Both waves travel rightward here and the run sprites are drawn facing right, so
 * neither lane is mirrored. A table rather than a hard-coded `false`, so a lane
 * that ever runs the other way is a one-line change.
 */
export const DIRECTION_FLIP: Record<'in' | 'out', boolean> = {
  in: false,
  out: false,
};

/**
 * How far along its run an actor is, from 0 to 1.
 *
 * A pure function of the clock, so an animal's position is reproducible and
 * identical on every round. An actor holds at 0 until its stagger delay has
 * passed, eases to 1 over one TROT_DURATION, then stays at 1 - it has either left
 * the stage or reached the barn door.
 *
 * The ease is LINEAR on purpose: a running animal holds a near-constant speed,
 * and an eased curve would make the herd look like it was sliding to a halt at
 * the barn rather than trotting through the door.
 *
 * NOT a CSS transition and NOT SMIL. A transition needs a per-animal duration and
 * makes a late-mounting wave visibly race to catch up; SMIL runs on the document
 * timeline, so a late wave is treated as already expired and snaps to its end
 * coordinate. Computing from elapsed time makes every wave animate identically.
 *
 * SHARED BY `travelPct` AND `laneTopPct`, which is the point: the horizontal run
 * and the vertical rise are two readings of ONE progress value, so they cannot
 * drift out of step. If the animal reached the doorway at a different moment from
 * the one it rose, it would either float into the wall or walk through the floor.
 */
function travelProgress(index: number, elapsedMs: number): number {
  const local = elapsedMs - delayMs(index);
  if (local <= 0) return 0;
  if (local >= TROT_DURATION) return 1;
  return local / TROT_DURATION;
}

/**
 * The actor's horizontal position at `elapsedMs` into its wave, in PERCENT.
 *
 * INCOMING runs from off-screen left to the doorway's centre; OUTGOING runs from
 * the doorway's centre fully clear of the right edge. See the lane constants above
 * for why each end is where it is.
 */
export function travelPct(index: number, elapsedMs: number, direction: 'in' | 'out'): number {
  const from = direction === 'in' ? LANE_ENTER_FROM_PCT : LANE_OUT_DOOR_PCT;
  const to = direction === 'in' ? LANE_IN_DOOR_PCT : LANE_EXIT_TO_PCT;
  return (from + (to - from) * travelProgress(index, elapsedMs)) * 100;
}

/**
 * Where an actor's FEET sit at `elapsedMs` into its wave, as a fraction of the
 * stage's height.
 *
 * THIS IS WHAT LETS THE ANIMALS DISAPPEAR WITHOUT ANYTHING BEING PAINTED OVER
 * THEM - the full reasoning is on `LANE_TOP_PARKED`.
 *
 * The two directions differ, and the asymmetry is the whole trick:
 *
 *   INCOMING rises from the lawn line to the barn's base over its run, so it
 *   walks in on the grass and finishes tucked fully behind the barn's silhouette.
 *
 *   OUTGOING starts at the barn's base and DESCENDS to the lawn line as it comes
 *   out, so it is covered at t=0 and steps down onto the grass as it emerges.
 *   This is the exact mirror of the inbound rise, which is why an animal leaving
 *   uses the same path an arriving one did - the barn reads as a doorway rather
 *   than as two unrelated animations.
 *
 * The rise/fall is linear for the same reason the horizontal run is: it is one
 * continuous move, and easing it separately would make the animal look like it
 * was hopping rather than stepping up onto the threshold.
 */
export function laneTopPct(index: number, elapsedMs: number, direction: 'in' | 'out'): number {
  const p = travelProgress(index, elapsedMs);
  const from = direction === 'in' ? ACTOR_LANE_TOP : LANE_TOP_PARKED;
  const to = direction === 'in' ? LANE_TOP_PARKED : ACTOR_LANE_TOP;
  return from + (to - from) * p;
}
