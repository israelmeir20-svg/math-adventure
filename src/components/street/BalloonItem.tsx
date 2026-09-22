/**
 * One balloon on the stage: an authentic teardrop body, a tied knot and a
 * dangling string, with a pop burst or a wrong-pick shake on click.
 *
 * Positioning is the parent's job (it owns the rise animation). This component
 * only draws the balloon and reports taps, so React never re-renders a hundred
 * of these per frame.
 */
import { memo } from 'react';
import { Sparkles } from 'lucide-react';
import { toneFor } from './balloonTones';
import type { FloatingBalloon } from './balloonTypes';

interface BalloonItemProps {
  balloon: FloatingBalloon;
  /** Seconds to cross the stage; drives the CSS rise animation. */
  rising: boolean;
  popped: boolean;
  /**
   * The balloon was clicked while it was NOT a valid multiple: shake and flash
   * red. Distinct from `popped`, which is the celebratory path.
   */
  wrong: boolean;
  /** True while the target is being re-announced, for a brief attention pulse. */
  spotlighted?: boolean;
  onPop: (balloon: FloatingBalloon) => void;
  /** The rise animation completed, so this balloon is off the top. */
  onExit: (balloon: FloatingBalloon) => void;
}

function BalloonItemInner({
  balloon,
  rising,
  popped,
  wrong,
  spotlighted = false,
  onPop,
  onExit,
}: BalloonItemProps) {
  const isGolden = balloon.kind === 'golden';
  const tone = toneFor(balloon);

  /** Only the rise finishing means "off the top"; wobble/burst also bubble. */
  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.animationName === 'riseBalloon') onExit(balloon);
  };

  return (
    /*
     * The wrapper is deliberately NOT a button and carries no handler: its box
     * spans the body plus the knot plus the dangling string, so making it
     * clickable would pop balloons when the child grabs at the string or at the
     * air beside it. It only owns the rise animation.
     */
    <div
      onAnimationEnd={handleAnimationEnd}
      className={`relative flex w-full flex-col items-center ${
        rising ? 'animate-[riseBalloon_var(--rise,9s)_linear_both]' : ''
      } motion-reduce:animate-none will-change-transform`}
      style={
        {
          '--rise': `${balloon.riseDuration}s`,
          /*
           * The distance to cross, measured by the stage rather than assumed, so
           * the journey is exactly one play-area height on any screen instead of
           * a fixed pixel guess. The keyframe adds the balloon's own height on top
           * for clearance at both ends.
           */
          '--stage-h': 'var(--stage-height, 320px)',
          animationDelay: `-${balloon.elapsed}s`,
        } as React.CSSProperties
      }
    >
      {/*
        The only interactive element, and its hitbox is exactly the teardrop:
        the knot and string below are siblings, not children, so they are not
        clickable.
      */}
      <button
        type="button"
        onClick={() => onPop(balloon)}
        disabled={popped}
        aria-label={labelFor(balloon)}
        className={`relative z-10 block h-14 w-14 cursor-pointer bg-gradient-to-br shadow-[0_6px_0_rgba(0,0,0,0.16)] outline-none transition-transform duration-150 hover:scale-110 active:scale-95 sm:h-16 sm:w-16 ${tone} ${
          popped ? 'pointer-events-none scale-125 opacity-0' : ''
        } ${
          /*
           * A WRONG PICK SHAKES AND FLASHES RED. The wobble alone was too quiet a
           * signal for a game where the miss costs 75 points and the whole streak:
           * the child needs to see instantly WHICH balloon was wrong, because the
           * number they misread is the thing they must learn. The red ring and
           * wash sit on the balloon's own box, so the feedback is anchored to the
           * number rather than to the screen.
           */
          wrong ? 'animate-[wobble_.45s_ease-in-out] ring-4 ring-rose-500 brightness-125' : ''
        } ${
          spotlighted && !popped && !wrong
            ? 'motion-safe:animate-[goldGlow_1s_ease-in-out_2]'
            : ''
        }`}
        style={{ borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%' }}
      >
        {/* The red wash, drawn over the body only while the pick is wrong. */}
        {wrong && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-rose-500/45"
          />
        )}

        <span
          aria-hidden
          className="absolute start-2 top-2 h-3 w-2 rotate-[20deg] rounded-full bg-white/70 blur-[1px]"
        />
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center text-lg font-black text-white drop-shadow-md tabular-nums sm:text-xl"
        >
          {renderFace(balloon)}
        </span>

        {/* The golden balloon's sparkle, so it reads as special at a glance. */}
        {isGolden && (
          <Sparkles
            aria-hidden
            className="pointer-events-none absolute -top-1 -end-1 h-4 w-4 text-amber-100 drop-shadow"
            strokeWidth={3}
          />
        )}
      </button>

      {/* Knot, then the dangling wavy string - decorative and inert. */}
      <span
        aria-hidden
        className={`pointer-events-none -mt-1 block h-0 w-0 border-x-[5px] border-x-transparent border-b-[7px] ${
          isGolden ? 'border-b-amber-600' : 'border-b-stone-500/70'
        } ${popped ? 'opacity-0' : ''}`}
      />
      <svg
        aria-hidden
        viewBox="0 0 12 40"
        className={`pointer-events-none h-8 w-3 stroke-stone-500/60 ${
          popped ? 'opacity-0' : ''
        }`}
        fill="none"
      >
        <path d="M6 0c4 6-4 10 0 16s-4 10 0 16" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      {/*
        Pop burst. The old version scaled a 48px glow layer from 1.6 down to 1 on
        every single pop, which repaints that layer each frame. Pops are frequent,
        so this is a plain opacity fade on a layer promoted up front by
        `will-change` - and the eight sparks give the burst an actual particle
        shape instead of a single emoji appearing.
      */}
      {popped && <PopBurst golden={isGolden} />}
    </div>
  );
}

/**
 * The particle burst on a successful pop.
 *
 * Eight sparks fly outward on one shared keyframe, each rotated by its own
 * `--angle`. One animation drives all of them, so the burst is a single
 * compositor layer rather than eight independent animations - which matters
 * because pops fire as often as every second.
 */
function PopBurst({ golden }: { golden: boolean }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-4 grid will-change-[opacity] place-items-center"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <span
          key={index}
          className={`absolute h-2 w-2 animate-[popSpark_.45s_ease-out_forwards] rounded-full ${
            golden ? 'bg-amber-300' : 'bg-white'
          }`}
          style={{ '--angle': `${index * 45}deg` } as React.CSSProperties}
        />
      ))}
      <span
        className={`animate-[burstFade_.4s_ease-out_forwards] text-3xl ${
          golden ? 'text-amber-300' : ''
        }`}
      >
        {golden ? '⭐' : '✨'}
      </span>
    </span>
  );
}

function renderFace(balloon: FloatingBalloon) {
  /*
   * BOTH KINDS SHOW THEIR NUMBER. It is tempting to put a star or a cookie glyph
   * on the golden balloon, but this game is entirely about reading numbers, and
   * replacing one with a decoration is the most expensive kind of clutter - the
   * old `bonus_jar` did exactly that. The golden balloon is distinguished by its
   * colour, its sparkle and its slower drift instead, and keeps its number.
   */
  return balloon.value;
}

function labelFor(balloon: FloatingBalloon) {
  if (balloon.kind === 'golden') return `בלון זהב ${balloon.value}`;
  return `בלון ${balloon.value}`;
}

const BalloonItem = memo(BalloonItemInner);
export default BalloonItem;
