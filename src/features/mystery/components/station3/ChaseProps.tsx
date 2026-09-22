/**
 * Small shared pieces the four chase puzzles all need.
 *
 * ================================================================================================
 * WHY THESE ARE NOT IN EACH CHASE
 * ================================================================================================
 *
 * Placing a PNG on the stage, and drawing a rounded label over it, are things all four chases do.
 * Each is a handful of lines, which is exactly the kind of thing that gets copy-pasted four times
 * and then diverges - one chase remembering `preserveAspectRatio="none"` and another not, so the
 * signposts come out square in one case and stretched in the next.
 */
import { assetFor } from '../../mysteryAssets';
import { CHASE_PALETTE } from '../../station3Geometry';

interface PropImageProps {
  /** Asset filename, as named in the case data. */
  asset: string;
  /** Centre of the prop, in the stage's normalised units. */
  cx: number;
  cy: number;
  /**
   * Rendered WIDTH in normalised units. The height follows from the sprite's own aspect ratio and
   * the stage's - see the note on the height calculation below. Height is never a prop.
   */
  width: number;
  /** The stage's aspect ratio, so the sprite's own shape is preserved under the stretched viewBox. */
  aspect: number;
  /**
   * The SPRITE's own aspect ratio, as width / height. Defaults to 1 (square).
   *
   * MUST BE SET FOR ANY NON-SQUARE ASSET, or the sprite is letterboxed into a box of the wrong
   * shape and rendered at the wrong size. The mud (`gap.png`, 1376x768) is the only non-square art
   * in the chase, and leaving this at the default is what made it overflow the stage.
   */
  naturalAspect?: number;
  /** Overall opacity, for dimming a spent prop. */
  opacity?: number;
  className?: string;
}

/**
 * Draws a sprite centred on a point of the stage, undistorted.
 *
 * ================================================================================================
 * THE BOX MUST MATCH THE SPRITE'S OWN SHAPE, OR `meet` LETTERBOXES IT INTO NOTHING
 * ================================================================================================
 *
 * This is the subtle part, and getting it wrong is not a cosmetic bug - it made the mud puddle
 * render at three times its intended height and fall off the bottom of the stage.
 *
 * The stage's own svg uses `preserveAspectRatio="none"` so that its 1x1 viewBox maps exactly onto
 * the box - which is what lets a marker at x=0.5 land at the image's centre. But that also means a
 * SQUARE drawn in viewBox units renders as a wide rectangle, so a sprite would come out stretched.
 *
 * The fix is to give each <image> its own `preserveAspectRatio="xMidYMid meet"`, which letterboxes
 * the sprite inside the element at its true proportions. THAT ONLY WORKS IF THE ELEMENT'S SHAPE IS
 * THE SPRITE'S SHAPE: `meet` fits the sprite into the element and leaves the rest empty, so a
 * mismatched element either wastes space (harmless) or lets the sprite grow far past the size the
 * caller asked for (not harmless).
 *
 * So the element is built to the sprite's own aspect, in PHYSICAL terms, from `naturalAspect`:
 *
 *   physical width  = `width`
 *   physical height = `width / naturalAspect`
 *
 * converting the physical height into viewBox units divides by the stage's aspect, because the
 * vertical axis is compressed by that much:
 *
 *   boxH (viewBox units) = (width / naturalAspect) / aspect
 *
 * HEIGHT IS DELIBERATELY NOT A PROP. A caller cannot set both and accidentally force a sprite into
 * a shape it does not have, which is exactly how the puddle broke.
 *
 * A MISSING `naturalAspect` FALLS BACK TO SQUARE. Every asset that existed when this was written is
 * square except the mud - which is why the bug hid for so long - so a new sprite that forgets to
 * declare its ratio is more likely right than wrong, and a square box never blows a sprite up past
 * its requested size.
 */
export function PropImage({
  asset,
  cx,
  cy,
  width,
  aspect,
  naturalAspect = 1,
  opacity = 1,
  className = '',
}: PropImageProps) {
  const href = assetFor(asset);
  // A missing sprite is a data error, not a crash: skip the element and let the label carry the
  // meaning. Silence is the right failure here because the chases are still solvable without art.
  if (!href) return null;

  const boxW = width;
  // The sprite's own height at this width, converted into the stage's squashed vertical units.
  const boxH = width / naturalAspect / aspect;

  return (
    <image
      href={href}
      x={cx - boxW / 2}
      y={cy - boxH / 2}
      width={boxW}
      height={boxH}
      preserveAspectRatio="xMidYMid meet"
      opacity={opacity}
      className={className}
    />
  );
}

interface PropLabelProps {
  /** Centre of the label. */
  cx: number;
  cy: number;
  /** The number the prop stands for. */
  value: number;
  tone?: 'idle' | 'active' | 'correct' | 'wrong';
  /** Small text under the number, for a chase that wants to explain itself. */
  caption?: string;
}

/**
 * The number plate on a signpost, burrow or gate.
 *
 * DRAWN AS SVG RATHER THAN BAKED INTO THE ART, because the numbers come from the case data and there
 * is one signpost image for all of them. A plate drawn here also means the number is crisp at any
 * size, whereas a raster scale-up of a painted number would not be.
 */
export function PropLabel({ cx, cy, value, tone = 'idle', caption }: PropLabelProps) {
  const ring =
    tone === 'correct'
      ? CHASE_PALETTE.success
      : tone === 'wrong'
        ? CHASE_PALETTE.error
        : tone === 'active'
          ? CHASE_PALETTE.active
          : 'rgba(255,255,255,0.85)';

  return (
    <g data-testid={`prop-label-${value}`}>
      <rect
        x={cx - 0.033}
        y={cy - 0.028}
        width={0.066}
        height={0.056}
        rx={0.012}
        fill="rgba(15, 23, 42, 0.88)"
        stroke={ring}
        strokeWidth={tone === 'idle' ? 2 : 3}
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={cx}
        y={cy + (caption ? -0.002 : 0.008)}
        textAnchor="middle"
        fontSize="0.034"
        fontWeight="900"
        fill="#ffffff"
        // See the RTL note in `NumberLineTrack` - two-digit numbers must not reverse.
        style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}
      >
        {value}
      </text>
      {caption && (
        <text
          x={cx}
          y={cy + 0.02}
          textAnchor="middle"
          fontSize="0.019"
          fontWeight="900"
          fill="rgba(255,255,255,0.75)"
        >
          {caption}
        </text>
      )}
    </g>
  );
}
