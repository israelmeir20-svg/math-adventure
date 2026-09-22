/**
 * The supply signboard at the top of the "שעת האכלה" scene.
 *
 * THIS IS THE MOST IMPORTANT THING ON SCREEN. It states the dividend - the
 * number the child has to divide - so it must be unmissable from across a room.
 *
 * ONE TEXT ELEMENT, CENTRED. An earlier version drew the emoji and the words as
 * two separate <text> tags, laid out by hand: the emoji centred on one x, the
 * words starting from another and running right-to-left. Mixing `textAnchor`
 * with `direction="rtl"` made the words grow leftward into the emoji, so the two
 * overlapped and the headline sat hard against the left of the board.
 *
 * There is no way to hand-place two runs of text around an unknown-width emoji
 * and have it stay centred. So it is now ONE <text> element, anchored middle at
 * the board's centre, with the emoji and the words in the same string. The SVG
 * text engine does the layout, and it cannot drift out of centre.
 *
 * THE BOARD IS A RUSTIC HANGING SIGN, NOT A FLAT RECTANGLE. It is built from
 * stacked planks in warm wood with a grain line and a rope tied through two
 * holes, so it reads as an object hanging in the farmyard rather than a UI panel
 * pasted over the art. The planks are what sell it: a single filled rect at this
 * size looked like a sticker regardless of how it was coloured.
 *
 * The board is drawn around its own centre, so SIGN_CX / SIGN_CY place it and
 * every coordinate below is relative to the middle of the board.
 */
import type { Food } from './feedingTypes';

interface SupplySignProps {
  food: Food;
  /** How many items are in the crate: the number the child must divide. */
  totalFood: number;
}

const W = 300;
const H = 74;
/** How far above the board's top edge the cords run, to reach the canvas top. */
const CORD_RISE = 22;

/** The three plank seams, as fractions of the board's height from its top. */
const PLANK_SEAMS = [0.34, 0.67];

export default function SupplySign({ food, totalFood }: SupplySignProps) {
  const top = -H / 2;
  return (
    <g>
      {/* The rope, tied through two holes and running off the top of the board.
          Drawn BEFORE the board so the board's top edge covers where they enter,
          which is what makes them look threaded rather than stuck on. */}
      <line x1={-78} y1={top + 6} x2={-86} y2={top - CORD_RISE} stroke="#8a6b4a" strokeWidth={4} strokeLinecap="round" />
      <line x1={78} y1={top + 6} x2={86} y2={top - CORD_RISE} stroke="#8a6b4a" strokeWidth={4} strokeLinecap="round" />

      {/* --- The board: a dark wooden panel with a warm frame. --- */}
      <rect x={-W / 2} y={top} width={W} height={H} rx={12} fill="#3b2410" />
      {/* An inner face, inset a little, so the board has a border of its own. */}
      <rect
        x={-W / 2 + 5}
        y={top + 5}
        width={W - 10}
        height={H - 10}
        rx={9}
        fill="#5a3a1c"
      />

      {/* The plank seams, cut across the inner face. Drawn as thin dark lines so
          the board reads as joined timber instead of one poured slab. */}
      {PLANK_SEAMS.map((fraction) => (
        <line
          key={fraction}
          x1={-W / 2 + 8}
          y1={top + H * fraction}
          x2={W / 2 - 8}
          y2={top + H * fraction}
          stroke="#2f1c0b"
          strokeWidth={2}
          opacity={0.75}
        />
      ))}

      {/* A highlight along the top edge, so the timber catches light. */}
      <line
        x1={-W / 2 + 14}
        y1={top + 9}
        x2={W / 2 - 14}
        y2={top + 9}
        stroke="#c9a06a"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.55}
      />

      {/* Two bolt heads, one per rope, covering where the rope meets the board. */}
      {[-78, 78].map((x) => (
        <circle key={x} cx={x} cy={top + 6} r={4} fill="#2f1c0b" stroke="#c9a06a" strokeWidth={1.5} />
      ))}

      {/* --- The headline: emoji and words in ONE centred run, so the pair is
              always balanced in the middle of the board however wide the text
              turns out. A subtle dark halo keeps it legible over the grain. --- */}
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={28}
        fontWeight={900}
        fill="#ffffff"
        stroke="#20130a"
        strokeWidth={1.25}
        paintOrder="stroke"
        className="select-none"
      >
        {`${food.emoji} ${totalFood} ${food.counted}`}
      </text>
    </g>
  );
}
