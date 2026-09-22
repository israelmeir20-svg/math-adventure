/**
 * The Clock Tower's dial: the station artwork with a live SVG clock on top of it.
 *
 * ================================================================================================
 * WHY THE ARTWORK IS A BACKGROUND AND THE CLOCK IS AN OVERLAY
 * ================================================================================================
 *
 * The brief's "Pixar-style visuals" is the `clock.png` scene, and the dial has to be a separate
 * layer on top of it for one reason: the clock must show ANY time the game asks for. A painted dial
 * has one fixed time baked into it, so a station that teaches reading and setting needs a dial whose
 * hands can move - which is only possible as vector geometry over the painting.
 *
 * ================================================================================================
 * THE HANDS ROTATE ON CSS TRANSFORMS, NOT ON SVG COORDINATES
 * ================================================================================================
 *
 * The obvious way to draw a hand at an angle is to compute its endpoint with `Math.cos`/`Math.sin`
 * and set `x2`/`y2`. That is what the previous version did, and it cannot animate: the coordinates
 * jump from one position to the next with nothing in between, so a child tapping `+15 דק'` sees the
 * hand teleport.
 *
 * So each hand is a `<line>` drawn straight up from its own local origin, and the ANGLE is applied as
 * a CSS `transform: rotate(...)` with a transition. The browser then interpolates between the two
 * rotations and the hand sweeps smoothly - the brief's `transition: transform 0.3s ease-out`.
 *
 * THE HANDS ARE DRAWN INSIDE A `<g transform="translate(100, 100)">` SO THEIR ORIGIN IS THE PIVOT.
 * That translation is what makes `transformOrigin: '0 0'` exact: zero is the origin of the inner
 * coordinate system, so the rotation needs no conversion from CSS pixels to viewBox units and cannot
 * drift when the dial is rendered at any size. Stating the centre as a CSS `transform-origin` in
 * viewBox units does NOT work - see the note on `handStyle` below.
 *
 * ================================================================================================
 * 360 DEGREES OR 390?
 * ================================================================================================
 *
 * The hands are keyed by their rotation in degrees, which normally rises without bound as the child
 * taps `+5 דק'` twelve times. Two things follow, and both matter:
 *
 *   - A transition from 355deg to 5deg would sweep the hand BACKWARDS through 350 degrees, because
 *     CSS interpolates numerically and does not know the dial wraps.
 *   - The minute hand should sweep clockwise past 12 on a full turn, not snap.
 *
 * So the angle is unwrapped: `angleFor` adds multiples of 360 to keep each hand's angle monotonically
 * moving in the direction the time is travelling. The hand then always takes the short, correct way
 * round, and a full revolution is a full revolution.
 */
import clockArt from '../../assets/clock/clock.png';
import type { ClockTime } from './timeRounds';

/**
 * The station artwork. Imported rather than referenced by path so Vite fingerprints it and the
 * build fails loudly if the asset is ever moved, instead of silently rendering a broken image.
 */
const CLOCK_ART = clockArt;

interface ClockFaceProps {
  /** The time to show. */
  time: ClockTime;
  /** Written above the face, e.g. "יציאה". */
  caption?: string;
  /** The accent colour for the minute hand and the rim. */
  tone?: string;
  /**
   * Draw the hands with the smooth CSS transition, or snap them instantly.
   *
   * OFF FOR THE DIGITAL-PLATE QUESTIONS, where the dial is showing a FIXED time the child is reading.
   * A read question's hands should already be where they belong when the question appears; a sweep
   * from 12:00 to the shown time on every deal would put a 300ms animation in front of the very thing
   * the child is supposed to be reading, and the motion would be mistaken for time passing.
   */
  animate?: boolean;
  /**
   * The HOUR hand's rotation in degrees, unwrapped and monotonic.
   *
   * THE TWO HANDS TAKE INDEPENDENT ANGLES, AND THAT IS THE POINT OF THE PAIR. A single shared minute
   * count cannot express "the hour button moved the hour hand without touching the minute hand",
   * because any number that advances the hour also advances the minute by six times as much - adding
   * 60 minutes swings the minute hand a full revolution, which looks like it did not move at all.
   *
   * When these are absent the angles are derived from `time`, which is right for the static dials
   * (`read`, `toHour`, `elapsed`) that never move and have nothing to unwrap.
   */
  hourAngleDeg?: number;
  /** The MINUTE hand's rotation in degrees, unwrapped and monotonic. */
  minuteAngleDeg?: number;
  /** Extra classes for the sizing box, so a caller can bound the dial. */
  className?: string;
  /**
   * An optional translucent wedge highlighting a span of the dial, in degrees clockwise from 12.
   *
   * THE ELAPSED-TIME WEDGE. Level 3 asks for the gap between two positions, which is a quantity the
   * child has to see rather than infer - a shaded arc between the two hands is that quantity, and it
   * is why this prop lives on the dial rather than being drawn by the caller as a separate
   * decoration: only the dial knows where its own hands are pointing.
   */
  wedge?: { fromDeg: number; toDeg: number } | null;
  /**
   * Draw the station artwork behind this dial, or leave it to the caller.
   *
   * TRUE FOR THE SMALL SECONDARY DIALS, FALSE FOR THE MAIN PLAYING DIAL. The main dial no longer carries
   * its own bounded copy of `clock.png`: the artwork is now a full-bleed backdrop for the WHOLE modal
   * (see `TimeDifferenceModal`), so painting it again inside a 19rem square would show the same tower
   * twice at two different scales - the "confined to a small square" complaint.
   *
   * The small dials in the elapsed-time question still want it, because they are two self-contained
   * cards shown side by side and each needs its own scenic ground to read against.
   */
  artwork?: boolean;
}

/** Which of the 12 hour positions a time sits on, for the `wedge` geometry. */
function hourAngle(time: ClockTime): number {
  return (time.hour % 12) * 30 + time.minute * 0.5;
}

/**
 * THE HAND ANGLES.
 *
 * ================================================================================================
 * WHY THERE ARE TWO INPUTS AND NOT ONE SHARED MINUTE COUNT
 * ================================================================================================
 *
 * A real clock's hands are geared: the minute hand turns twelve times as fast as the hour hand, so one
 * shared count of elapsed minutes derives both angles (x6 and x0.5) and that is mechanically faithful.
 *
 * But this station asks the child to SET a time with separate controls, and the brief's `+1 שעה` must
 * move the hour hand ALONE. Under the geared model it cannot: feeding a shared count means the hour
 * button advances the minute hand 360 degrees, which is visually identical to not moving it, and the
 * two hands then appear coupled at a fixed ratio.
 *
 * So each hand is driven by its own monotonic angle. `+15 דק'` advances the minute angle by 90; `+1
 * שעה` advances the hour angle by 30 and leaves the minute angle exactly where it was.
 *
 * NEITHER ANGLE IS EVER NORMALISED. They may read 800 or 1400 and the rotation simply follows, so the
 * numbers are monotonic and every CSS transition between two of them is a forward step. Normalising
 * would reintroduce the backwards sweep that an earlier revision of this file was written to remove.
 */
export const minuteAngleFor = (totalMinutes: number): number => totalMinutes * 6;
export const hourAngleFor = (totalMinutes: number): number => totalMinutes * 0.5;

/**
 * The angle to render a hand at: the explicit one when the caller supplied it, else the static reading
 * of `time`. The fallback is a function rather than a number because only the dials that do not move
 * need it.
 */
function angleFor(explicit: number | undefined, fromTime: () => number): number {
  return explicit ?? fromTime();
}

export default function ClockFace({
  time,
  caption,
  tone = '#f97316',
  animate = true,
  hourAngleDeg,
  minuteAngleDeg,
  className,
  wedge = null,
  artwork = true,
}: ClockFaceProps) {
  /*
   * THE HANDS ROTATE ABOUT THEIR OWN LOCAL ORIGIN, NOT ABOUT A COORDINATE IN THE VIEWBOX.
   *
   * ================================================================================================
   * WHY `transformOrigin: '100px 100px'` WAS WRONG
   * ================================================================================================
   *
   * The previous version tried to state the pivot in viewBox units with a CSS `transform-origin`.
   * That is a category error: `transform-origin` is resolved by the CSS layout engine against the
   * element's own BOX, and its units are CSS lengths - `px` means a physical CSS pixel, not one unit
   * of the SVG's `viewBox`. The dial's viewBox is 200 units wide but the element is rendered at
   * whatever pixel size its container gives it, so on any scaled dial the two do not agree, and the
   * hands swing around a point that is only correct when the rendered size happens to be exactly
   * 200x200.
   *
   * ================================================================================================
   * THE FIX: MOVE THE COORDINATE SYSTEM TO THE PIVOT
   * ================================================================================================
   *
   * Rather than describing where the centre is, each hand is placed INSIDE a `<g>` translated to the
   * centre, and drawn from its own local origin `(0, 0)`. Rotating about `transformOrigin: '0 0'` is
   * then exact by construction: zero is the origin of that inner coordinate system, so there is no
   * conversion between pixel space and user space and nothing that can drift when the dial scales.
   *
   * It also removes the magic pair entirely - the centre is now written ONCE, in the `<g translate>`
   * that both hands share, instead of being repeated in a custom property for each.
   */
  const handStyle = (deg: number) =>
    ({
      transform: `rotate(${deg}deg)`,
      transformOrigin: '0 0',
      transition: animate ? 'transform 0.3s ease-out' : 'none',
    }) as const;

  /*
   * THE ANGLES COME FROM THE EXPLICIT PROPS WHEN SUPPLIED - see `hourAngleDeg` for why the two hands
   * take independent inputs. The fallbacks reproduce the static angles from `time` for the dials that
   * never move: 30 degrees per hour plus half a degree per minute for the hour hand, and 6 degrees per
   * minute for the minute hand.
   *
   * NOTE THE FALLBACKS ARE READ FROM THE SAME CLOCK AND SO AGREE WITH EACH OTHER, which is what makes
   * a static dial show a coherent time. Only the movable dials separate them.
   */
  const hourDeg = angleFor(hourAngleDeg, () => hourAngle(time));
  const minuteDeg = angleFor(minuteAngleDeg, () => (time.minute + (time.hour % 12) * 60) * 6);

  /*
   * THE WEDGE, DRAWN AS AN SVG ARC BETWEEN THE TWO ANGLES.
   *
   * An arc needs a sweep flag that flips when the span passes 180 degrees, because a single arc
   * command cannot describe more than a half circle - above that the renderer takes the short way
   * round and the wedge appears on the wrong side of the dial. The span is therefore measured as a
   * clockwise distance and the flag derived from it.
   */
  const wedgePath = (() => {
    if (!wedge) return null;
    const span = ((wedge.toDeg - wedge.fromDeg) % 360 + 360) % 360;
    if (span === 0) return null;
    // In the 200-unit viewBox, so the arc radius and the centre match the hands it measures between.
    const r = 76;
    const point = (deg: number) => {
      const rad = ((deg - 90) * Math.PI) / 180;
      return { x: 100 + Math.cos(rad) * r, y: 100 + Math.sin(rad) * r };
    };
    const a = point(wedge.fromDeg);
    const b = point(wedge.toDeg);
    const largeArc = span > 180 ? 1 : 0;
    return `M 100 100 L ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)} Z`;
  })();

  return (
    <div className={`relative ${className ?? ''}`}>
      {/*
        THE ARTWORK IS `absolute inset-0` BEHIND THE DIAL, NOT A SIBLING OF IT.

        The dial is a square in a `aspect-square` box and the artwork is a wide scene, so the two
        cannot both be laid out in flow: the scene would set the box's height and the square dial
        would then sit in a letterbox. Making the scene absolutely positioned against a square
        container lets the dial's geometry define the box and the artwork fill it.

        THE MAIN DIAL NOW OPTS OUT (`artwork={false}`), because the modal paints this same image as a
        full-bleed backdrop. Drawing it here as well would put the tower behind the dial a second time,
        at a different scale and offset, so the illustration would read as two overlapping copies
        rather than one scene. See the `artwork` prop for the full reasoning.
      */}
      {artwork && (
        <img
          src={CLOCK_ART}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl object-cover object-center opacity-95"
        />
      )}

      {caption !== undefined && (
        <span className="absolute inset-x-0 top-1 z-10 text-center text-[11px] font-black text-amber-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          {caption}
        </span>
      )}

      {/*
        A UNIFIED 200x200 VIEWBOX WITH ITS CENTRE AT (100, 100).

        The dial previously used `0 0 100 100`, where the centre sat at (50, 50) and every hand had
        to be drawn from a fractional coordinate. Doubling the box puts the centre on a round 100 and
        gives the hands room to carry real stroke widths without the ticks and numerals crowding them
        - and, more importantly, it means every rotation below states the SAME pivot pair, so there is
        exactly one centre in the file rather than one per hand.
      */}
      <svg
        viewBox="0 0 200 200"
        className="relative mx-auto block h-full w-full"
        role="img"
        aria-label={`${time.hour}:${String(time.minute).padStart(2, '0')}`}
      >
        {/* The dial plate, so the numbers and hands have a readable ground over the painting. */}
        <circle cx="100" cy="100" r="92" fill="#fffbeb" fillOpacity="0.96" />
        <circle cx="100" cy="100" r="92" fill="none" stroke="#a16207" strokeWidth="5" />

        {/*
          THE ELAPSED-TIME WEDGE, UNDER THE HANDS SO IT NEVER HIDES THEM.
          Drawn before the hands and the numbers so the arc reads as a highlight ON the dial rather
          than as a shape covering the thing it is meant to be measuring.
        */}
        {wedgePath !== null && <path d={wedgePath} fill={tone} fillOpacity="0.22" />}

        {/* 60 minute ticks, with the hour positions emphasised - the brief's "subtle 5-minute ticks". */}
        {Array.from({ length: 60 }, (_, i) => {
          const isHour = i % 5 === 0;
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const outer = 86;
          const inner = isHour ? 76 : 81;
          return (
            <line
              key={i}
              x1={100 + Math.cos(angle) * inner}
              y1={100 + Math.sin(angle) * inner}
              x2={100 + Math.cos(angle) * outer}
              y2={100 + Math.sin(angle) * outer}
              stroke={isHour ? '#78350f' : '#a8a29e'}
              strokeWidth={isHour ? 4 : 1.6}
              strokeLinecap="round"
            />
          );
        })}

        {/* The 12 hour numbers, placed on a circle inside the ticks. */}
        {Array.from({ length: 12 }, (_, i) => {
          const hour12 = i === 0 ? 12 : i;
          const angle = (i * 30 - 90) * (Math.PI / 180);
          return (
            <text
              key={hour12}
              x={100 + Math.cos(angle) * 62}
              y={100 + Math.sin(angle) * 62}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="18"
              fontWeight="900"
              fill="#451a03"
            >
              {hour12}
            </text>
          );
        })}

        {/*
          THE HOUR HAND - shorter, thicker, deep navy.

          Both hands live inside a `<g>` translated to the dial's centre and are drawn from `(0, 0)`
          of that inner system, so their rotation origin is exactly the pivot. `y2="-48"` points up -
          negative y is up in SVG - which makes 0 degrees 12 o'clock and the angle the same number as
          the clock face.
        */}
        <g transform="translate(100, 100)">
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="-48"
            stroke="#1e293b"
            strokeWidth="9"
            strokeLinecap="round"
            style={handStyle(hourDeg)}
          />
        </g>

        {/* THE MINUTE HAND - longer, slender, vibrant coral. `-72` reaches past the numerals. */}
        <g transform="translate(100, 100)">
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="-72"
            stroke={tone}
            strokeWidth="5"
            strokeLinecap="round"
            style={handStyle(minuteDeg)}
          />
        </g>

        {/* The brass centre cap, drawn LAST so it pins both hands at the pivot. */}
        <circle cx="100" cy="100" r="9" fill="#b45309" stroke="#78350f" strokeWidth="2" />
      </svg>
    </div>
  );
}
