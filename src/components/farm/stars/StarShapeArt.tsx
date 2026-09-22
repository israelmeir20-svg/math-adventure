/**
 * The star sparkles and the gold lines that join them.
 *
 * ONE COMPONENT PER SHAPE, drawing its own outline and its own vertices. That grouping is
 * load-bearing: a shape's lines and stars must travel together when it rotates, so they have
 * to share a single `<g>`. Drawing all the lines and then all the stars would leave the
 * outline spinning while the stars stayed put.
 *
 * THE CORE IS A FOUR-POINTED STAR, not a circle. A circle reads as a dot; the pointed sparkle
 * reads as a star, which matters because the child is counting them. The points are a fixed
 * polygon in local space, placed with a `translate` rather than recomputed per vertex - one
 * attribute instead of eight coordinates changing per render.
 *
 * THE LINE IS A CLOSED POLYGON, so the outline comes back to its first star and the shape
 * reads as a triangle or a square rather than an open zigzag. `fill="none"` keeps the middle
 * clear so the sparkles sit on darkness, not on a wash of gold.
 *
 * THE SPIN IS CSS, AND THAT IS A CORRECTION RATHER THAN A PREFERENCE. The obvious way to spin
 * an SVG group is SMIL (`<animateTransform>`), and this codebase has already been burned by it:
 * SMIL runs on the DOCUMENT timeline rather than on mount time, so an animation element that
 * appears after the page has been open for a while is measured against elapsed document time
 * and treated as already part-way through its cycle. Every round here remounts the stage - it
 * is keyed on the round number so no animation leaks between rounds - which is precisely the
 * late-mount case that made animals teleport in the barn stage.
 *
 * A CSS animation starts at zero when its element mounts, runs on the compositor, and needs no
 * JavaScript at all. The one thing it must be told is WHERE to turn, because a CSS `rotate`
 * defaults to the centre of the element's own box rather than to the shape's anchor - so
 * `transformOrigin` is set to the anchor in stage units, with `transformBox: 'view-box'` to
 * make those units mean what the rest of the SVG means.
 */
import { LINE_COLOR, SPARKLE_COLOR, SPIN_SECONDS } from './starData';
import type { StarShape } from './starTypes';

/**
 * The sparkle's local outline: a four-pointed star, 16 units across.
 *
 * Held as a constant string rather than a function, because it is the same polygon for every
 * star in every round - the only thing that changes is where it is placed.
 */
const SPARKLE_POINTS = '0,-8 2.2,-2.2 8,0 2.2,2.2 0,8 -2.2,2.2 -8,0 -2.2,-2.2';

interface StarShapeProps {
  shape: StarShape;
}

export default function StarShapeArt({ shape }: StarShapeProps) {
  const { anchor, stars, spinning, spinSeconds, spinDirection } = shape;
  const points = stars.map((star) => `${star.x},${star.y}`).join(' ');

  /*
   * THE SPEED AND DIRECTION COME FROM THE SHAPE ITSELF, NOT FROM ITS POSITION.
   *
   * This used to index a fixed three-entry table by the shape's index, which meant every round
   * produced the same speeds in the same order - shape 1 always turned at 22s, shape 2 always at
   * 27s. That is a constant, not an independence: two rounds were animation-identical, and the
   * "each shape turns at its own rate" the design asks for was really "each POSITION turns at a
   * fixed rate". The rate and sign are now rolled per shape by the generator.
   *
   * Counter-rotation is the visible half of this. Two shapes turning the same way at the same
   * speed read as one rigidly rotating object, which hands the child the grouping for free.
   */
  const seconds = spinSeconds > 0 ? spinSeconds : SPIN_SECONDS[0]!;
  const direction = spinDirection === -1 ? 'reverse' : 'normal';

  /*
   * A STILL SHAPE IS BAKED, A SPINNING ONE IS ANIMATED. For a still shape the rotation is
   * folded into the transform, which is exact and costs nothing. For a spinning one the
   * transform is left at zero and the CSS animation owns the angle outright, so the from/to
   * is a clean 0 -> 360 about a single fixed origin.
   *
   * `transformBox: 'fill-box'` WITH `transformOrigin: 'center'` IS WHAT MAKES IT SPIN ABOUT ITS
   * OWN CENTRE. Without it, a CSS rotate on an SVG group turns about the CANVAS origin - the
   * corner of the artwork - and every shape swings across the stage in a wide arc instead of
   * turning in place. `fill-box` redefines the box to the group's own bounding box, so `center`
   * means the centre of THIS shape and not the centre of the viewBox.
   */
  const transform = spinning ? undefined : `rotate(${shape.rotation}, ${anchor.x}, ${anchor.y})`;

  return (
    <g
      transform={transform}
      style={
        spinning
          ? {
              transformOrigin: 'center',
              transformBox: 'fill-box',
              animation: `starSpin ${seconds}s linear infinite ${direction}`,
            }
          : undefined
      }
    >
      {/* The outline, drawn first so the sparkles sit on top of it. */}
      <polygon
        points={points}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth="2"
        strokeOpacity="0.85"
        strokeLinejoin="round"
      />

      {stars.map((star, starIndex) => (
        <polygon
          key={`${starIndex}`}
          points={SPARKLE_POINTS}
          fill={SPARKLE_COLOR}
          transform={`translate(${star.x}, ${star.y})`}
        />
      ))}
    </g>
  );
}
