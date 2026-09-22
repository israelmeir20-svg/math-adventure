/**
 * The arcade cross D-Pad for "המתכון של השף".
 *
 * ONE UNIFIED CROSS, BUILT FROM PER-ARM BOXES RATHER THAN HAND-PLACED POINTS.
 * Every arm is a square in `ARMS`, and the arrow and sprite positions are
 * derived from that square, so nudging one arm can never desynchronise it from
 * the others - hand-placed coordinates are what made the old layout lopsided.
 *
 * THE ARROW AND THE SPRITE NEVER SHARE A LINE. Up and Down stack them, Left and
    10| * Right place them side by side; in every case the pair is centred on the arm as
 * a whole, so the arm's own middle is the axis the two are strung on, and the
 * only clearance left to check is the arm's two remaining borders.
 *
 * UP AND DOWN ARE MIRRORED, LEFT AND RIGHT ARE NOT. On Up the picture sits
 * outboard of the arrow and so the squarest box sets the margin; on Down the
 * arrow is the outer item and the margin follows the tighter glyph box instead.
 * Both are centred on their arm, so the eye reads one rhythm rather than two.
 * On Left and Right the arrow always points outward with the picture inboard,
 * which is what keeps the direction reading correct rather than quirky.
    20| *
 * THE SPRITE IS ADDRESSED TWICE. `xlink:href` is the SVG 1.1 spelling and `href`
 * the SVG 2 one; older WebKit only honours the former, so both are emitted and
 * at least one always resolves to the bundled PNG url.
 *
 * ===================================================================
 * THE VIEWBOX IS TIGHT TO THE CROSS, AND THAT IS WHAT MAKES IT LARGE.
 * ===================================================================
 *
 * The artwork is unchanged - arms are still 66-unit squares at the same coordinates - but
 * `viewBox` used to span the full 800x360 stage. The cross only occupies about 184x184 of
 * that (x 308..492, y 163..347), so it filled barely a quarter of the width, and because
 * the fit is `xMidYMid meet` the WIDTH was the binding constraint: the drawing was scaled
 * to whatever made 800 units fit, and the cross came out at roughly a quarter of the box
 * it was given. That is the "tiny pad in a huge empty counter" - the emptiness was the
 * viewBox, not the wrapper.
 *
 * `CROSS_PAD` ADDS BREATHING ROOM AROUND THE CROSS, and it is not decoration. A viewBox
 * that clips exactly to the arms would put their outer strokes on the very edge, where
 * anti-aliasing is cut off and the corners look shaved. Padding it keeps the full stroke
 * inside the frame.
 *
 * CHANGING THE VIEWBOX SCALES THE HIT AREAS WITH THE PICTURE, because they are the same
 * `<rect>` elements - so the touch targets grow by exactly the same factor the artwork
 * does. Nothing about the tap handling changes.
 */
import type { Direction, Ingredient, RecipeRound } from './recipeTypes';

interface RecipeDPadProps {
  round: RecipeRound;
  /** True while the arms should not respond (reveal and feedback phases). */
  disabled: boolean;
  /** The arm to flash after a mistake, if any. */
  rejected?: Direction | null;
  onTap: (direction: Direction) => void;
}

/** One arm: its outer square, plus where its arrow and picture sit inside it. */
interface ArmConfig {
  direction: Direction;
  arrow: string;
  rect: { x: number; y: number; w: number; h: number };
  text: [number, number];
  img: [number, number];
}

const ARM = 66; // arm square
const CX = 400; // cross centre
const CY = 255;
const HUB = 26; // half the 52px hub: the arm can never bite into the centre
const GAP = HUB + ARM / 2; // centre of the cross out to the middle of an arm
const ARROW = 14; // arrow font size
const A_HALF = (ARROW * 1.28) / 2; // half of an arrow's glyph box
const IMG = 36; // sprite box
const I_HALF = IMG / 2;
const GUTTER = 4; // half the gap between the two, so the pair centres together

/**
 * The cross's real extent, DERIVED FROM THE ARM CONSTANTS RATHER THAN TYPED IN.
 *
 * This is the bounding box of the four arm squares - the outermost point any arm reaches,
 * in both axes - and it is computed so that changing `ARM`, `GAP` or `HUB` cannot silently
 * leave the viewBox framed around a cross that no longer exists. Hand-copying these four
 * numbers is exactly the kind of drift that produced the lopsided old layout.
 */
const CROSS_HALF = GAP + ARM / 2; // 59 + 33 = 92
const CROSS_PAD = 10; // breathing room so the outer strokes are not clipped
const CROSS_MIN_X = CX - CROSS_HALF - CROSS_PAD;
const CROSS_MIN_Y = CY - CROSS_HALF - CROSS_PAD;
const CROSS_SIZE = (CROSS_HALF + CROSS_PAD) * 2; // square, because the cross is square
/** The round-1 pairing, which is also the one drawn under the start overlay. */
const PREVIEW: { direction: Direction; ingredient?: Ingredient }[] = [
  { direction: 'up' },
  { direction: 'right' },
  { direction: 'down' },
  { direction: 'left' },
];

/**
 * One arm, described once - Up and Down strung vertically, Left and Right
 * horizontally, so the two readings can never be confused for one another.
 *
 * The arrow is nudged a pixel toward the wide end of its own triangle. A glyph
 * carries its visual mass at the base, not the tip, so a mathematically centred
 * triangle reads as sitting slightly behind its box; the nudge is what makes it
 * look centred.
 */
function armBox(direction: Direction, away: boolean): ArmConfig {
  const vertical = direction === 'up' || direction === 'down';
  const sign = away ? -1 : 1;
  const cx = CX + (vertical ? 0 : sign * GAP);
  const cy = CY + (vertical ? sign * GAP : 0);
  const shift = away ? -1 : 1;
  // Offsets from the arm centre; negative is back toward the cross.
  const textOff = -sign * (A_HALF + GUTTER);
  const imgOff = -textOff;
  const imgCentre = (vertical ? cy : cx) + imgOff;
  return {
    direction,
    arrow: { up: '▲', down: '▼', left: '◄', right: '►' }[direction],
    rect: { x: cx - ARM / 2, y: cy - ARM / 2, w: ARM, h: ARM },
    text: vertical
      ? [cx, cy + textOff + A_HALF + shift]
      : [cx + textOff + shift, cy + ARROW / 2],
    img: vertical
      ? [cx - I_HALF, imgCentre - I_HALF]
      : [imgCentre - I_HALF, cy - I_HALF],
  };
}

const ARMS: ArmConfig[] = [
  armBox('up', true),
  armBox('down', false),
  armBox('left', true),
  armBox('right', false),
];

export default function RecipeDPad({ round, disabled, rejected, onTap }: RecipeDPadProps) {
  const shown = round.pad.length > 0 ? round.pad : PREVIEW;
  return (
    <svg
      viewBox={`${CROSS_MIN_X} ${CROSS_MIN_Y} ${CROSS_SIZE} ${CROSS_SIZE}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full select-none"
    >
      {/* Background chassis plate */}
      <path
        d="M 364 156 h 72 a 12 12 0 0 1 12 12 v 51 h 51 a 12 12 0 0 1 12 12 v 72 a 12 12 0 0 1 -12 12 h -51 v 51 a 12 12 0 0 1 -12 12 h -72 a 12 12 0 0 1 -12 -12 v -51 h -51 a 12 12 0 0 1 -12 -12 v -72 a 12 12 0 0 1 12 -12 h 51 v -51 a 12 12 0 0 1 12 -12 z"
        fill="#e6d5be"
        stroke="#bca282"
        strokeWidth="4"
      />

      {/* Center hub */}
      <rect x="372" y="227" width="56" height="56" rx="8" fill="#dfccb3" />
      <text x="400" y="260" textAnchor="middle" fontSize="20" fill="#a48464" fontWeight="bold">
        ✥
      </text>

      {ARMS.map(({ direction, arrow, rect, text, img }) => {
        const arm = shown.find((entry) => entry.direction === direction);
        const wrong = rejected === direction;
        const sprite = arm?.ingredient?.spriteUrl;
        return (
          <g
            key={direction}
            role="button"
            aria-label={`${arrow} ${arm?.ingredient?.nameHebrew ?? ''}`}
            onClick={disabled ? undefined : () => onTap(direction)}
            className={disabled ? 'cursor-default' : 'cursor-pointer'}
            style={{ opacity: disabled ? 0.6 : 1 }}
          >
            {/* Rounded hit rect; the pair inside never reaches the border. */}
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.w}
              height={rect.h}
              rx="14"
              fill={wrong ? '#fecdd3' : '#fffdfa'}
              stroke={wrong ? '#e11d48' : '#a8845c'}
              strokeWidth="3.5"
            />

            {sprite && (
              <image
                href={sprite}
                xlinkHref={sprite}
                x={img[0]}
                y={img[1]}
                width={IMG}
                height={IMG}
                preserveAspectRatio="xMidYMid meet"
              />
            )}

            <text
              x={text[0]}
              y={text[1]}
              textAnchor="middle"
              fontSize={ARROW}
              fontWeight="bold"
              fill={wrong ? '#e11d48' : '#8a6647'}
            >
              {arrow}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
