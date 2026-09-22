/**
 * The Bonus Island hot-air balloon, rendered over the town illustration.
 *
 * It is the only interactive layer above the map: the wrapper stays
 * `pointer-events-none` so buildings underneath remain clickable, and only the
 * balloon itself re-enables pointer events.
 *
 * The descent is a plain vertical translate from above the meadow. Earlier
 * versions scaled while descending, which changed the balloon's own box and
 * made its landing point ambiguous; translating only in Y keeps it locked to
 * the landing zone and cannot fight the hover float that follows it.
 */
import type { CSSProperties } from 'react';
import type { BalloonPhase } from './useBalloonEvent';
import balloonImg from '../../assets/sprites/balloon.png';

interface HotAirBalloonProps {
  phase: BalloonPhase;
  /** Landing spot in map percentages; null while in flight/hidden. */
  position: { x: number; y: number } | null;
  onOpen: () => void;
}

/**
 * Descent length in ms. Consumed by `useBalloonEvent` so the state machine
 * cannot fire `landed` halfway through the float down.
 */
export const BALLOON_DESCENT_MS = 3500;

/** Landing / departing animation lengths must match `useBalloonEvent`. */
const ANIMATION: Record<BalloonPhase, string> = {
  hidden: '',
  landing: 'animate-[balloonDescend_4.5s_ease-out_both]',
  landed: '',
  departing: 'animate-[balloonDepart_2s_ease-in_both]',
};

/** Meadow by the river, where the balloon always touches down. */
const LANDING_ZONE = { x: 30, y: 36 } as const;

export default function HotAirBalloon({
  phase,
  position,
  onOpen,
}: HotAirBalloonProps) {
  if (phase === 'hidden') return null;

  const spot = position ?? LANDING_ZONE;
  const style: CSSProperties = { left: `${spot.x}%`, top: `${spot.y}%` };

  /*
   * ============================================================================================
   * THE DOUBLE-DESCENT GLITCH, AND WHY IT NEEDED TWO ELEMENTS TO FIX
   * ============================================================================================
   *
   * The balloon visibly descended, jogged UP, and settled again - a secondary hop at the end of
   * the landing. The cause was two keyframes fighting over the SAME `transform` on the SAME element:
   *
   *   1. `landing` ran `balloonDescend`, which ends at `translateY(0)` - resting on the meadow.
   *   2. The phase then flipped to `landed`, swapping the class for `balloonBob`, which animates
   *      `translateY(-6px)` to `translateY(2px)` with NO fill mode. Its first frame is therefore
   *      applied immediately and starts SIX PIXELS UP from where the descent had just parked the
   *      balloon - so it snapped upward, then bobbed back down. That upward tick is the "second
   *      descent" being reported.
   *
   * THE FIX IS TO STOP PUTTING BOTH ANIMATIONS ON ONE ELEMENT. A CSS animation owns its element's
   * `transform` outright, so a descent and an idle float can never share a node - the second one
   * always restarts from its own first keyframe rather than continuing from where the first ended.
   * Nesting them gives each its own transform, and the two COMPOSE:
   *
   *   - OUTER (`float`): the arrival descent, then nothing once landed. Ends at rest.
   *   - INNER (`bob`): the idle float, which starts at rest too - so it adds a gentle rise and fall
   *     ON TOP of a balloon that is already sitting still, instead of yanking it upward first.
   *
   * Because the bob's keyframe now begins at `translateY(0)` and is only +/-3px from there, there
   * is no discontinuity to see at the handover. The jog is gone by construction rather than by
   * tuning two durations to match.
   */

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={style}>
        {/*
          THE OUTER ARRIVAL LAYER. It carries ONLY the descent, and does nothing at all once the
          balloon is `landed` - which is what lets the inner float own the idle motion exclusively.
        */}
        <div className={ANIMATION[phase]}>
          <button
            type="button"
            onClick={onOpen}
            aria-label="פתחו את אי ההפוגה - משחקי חשיבה"
            title="אי ההפוגה"
            /*
             * THE GROUNDED WINDOW IS FULLY INTERACTIVE, and the departure is not.
             *
             * While `landed` the balloon is the tap target for the whole sixty seconds, so it stays
             * `pointer-events-auto cursor-pointer`. It is neither `disabled` nor inert while
             * departing either - but a tap during the ascent would open a modal over a balloon that
             * is on its way out, so the departure guard lives in `onOpen` (see `useBalloonEvent`),
             * not in the attribute. Using `disabled` here would drop the button out of the tab order
             * and blur it mid-flight, which reads as a glitch on a moving element.
             */
            className="group pointer-events-auto relative flex cursor-pointer flex-col items-center outline-none"
          >
            {/* Sparkle aura so the balloon reads as a reward, not scenery. */}
            <span
              aria-hidden
              className="absolute -inset-5 -z-10 rounded-full bg-amber-200/45 blur-xl animate-[sparkle_2.6s_ease-in-out_infinite] motion-reduce:animate-none"
            />

            {/*
              THE INNER IDLE FLOAT. Applied ONLY while landed, so the arrival is a clean descent with
              no competing motion, and the bob begins from rest exactly where the descent finished.
            */}
            <span
              className={
                phase === 'landed'
                  ? 'block animate-[balloonBob_5s_ease-in-out_infinite] motion-reduce:animate-none'
                  : 'block'
              }
            >
              <img
                src={balloonImg}
                alt="אי ההפוגה"
                draggable={false}
                className="h-auto w-20 cursor-pointer select-none object-contain drop-shadow-xl transition duration-150 group-hover:scale-110 group-active:scale-95 motion-reduce:transition-none md:w-24"
              />
            </span>

            <span className="mt-1 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-amber-900 shadow-lg ring-2 ring-amber-300 sm:text-sm">
              אי ההפוגה
            </span>

            <span
              aria-hidden
              className="absolute -top-3 -end-3 text-2xl animate-[sparkle_1.9s_ease-in-out_infinite] motion-reduce:animate-none"
            >
              ✨
            </span>
          </button>
        </div>

        {/*
          Wicker-basket shadow, outside the animated button so the descent and
          the float cannot affect it. It scales in as the balloon lands and then
          stays put; centring lives on the keyframe, not here.
        */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-1 left-1/2 h-2.5 w-16 rounded-full bg-stone-900/55 blur-md md:w-20"
          style={
            phase === 'landing'
              ? {
                  animationName: 'balloonShadow',
                  animationDuration: `${BALLOON_DESCENT_MS}ms`,
                  animationTimingFunction: 'ease-out',
                  animationFillMode: 'both',
                }
              : { transform: 'translateX(-50%)' }
          }
        />
      </div>
    </div>
  );
}
