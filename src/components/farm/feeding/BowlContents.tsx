/**
 * What is drawn INSIDE a bowl: the food it actually received, and - when the
 * bowl was shortchanged - the animal's complaint about it.
 *
 * Split out of `Trough` because these two pieces are the entire error-feedback
 * vocabulary of the station, and they are easier to reason about together than
 * interleaved with the animal, the bowl body and the cavity.
 *
 * BOTH ARE DRIVEN BY `actual`, NOT BY WHAT THE CHILD ASKED FOR. If the row was
 * fed 6 each from a pile of 8, the second bowl really does hold 2 and says so.
 * Showing the requested number in every bowl would tell the child their answer
 * was fine, which is the opposite of the lesson.
 */
import { BOWL_Y, FOOD_DROP_MS } from './feedingData';

interface BowlContentsProps {
  /** How many items THIS bowl actually received. */
  actual: number;
  /** The food emoji. */
  foodEmoji: string;
  /** True when this bowl got less than the child intended. */
  shortchanged: boolean;
  /**
   * Where the complaint bubble should sit.
   *
   * Callers pass the top of the animal sprite, minus a small offset. `Trough`
   * clamps it so the bubble can never climb into the signboard - with the
   * enlarged sprites an unclamped bubble would have reached y=68, which is inside
   * the sign's footprint (the signboard ends at y=84).
   */
  bubbleY: number;
  /** Stagger, so a row of bowls does not animate in lockstep. */
  delay: string;
}

export default function BowlContents({
  actual,
  foodEmoji,
  shortchanged,
  bubbleY,
  delay,
}: BowlContentsProps) {
  return (
    <>
      {/* The food, popped into the cavity. */}
      <g
        style={{
          animation: `foodDrop ${FOOD_DROP_MS}ms cubic-bezier(.2,.9,.3,1.3) forwards ${delay}`,
          transformBox: 'fill-box',
          transformOrigin: 'center bottom',
        }}
      >
        {actual > 0 ? (
          <>
            <text x={-13} y={BOWL_Y + 5} textAnchor="middle" fontSize={18}>
              {foodEmoji}
            </text>
            <text x={15} y={BOWL_Y + 5} textAnchor="middle" fontSize={18} fontWeight={900} fill="#ffffff">
              {actual}
            </text>
          </>
        ) : (
          /* An empty bowl says so in words - an empty cavity is ambiguous. */
          <text x={0} y={BOWL_Y + 5} textAnchor="middle" fontSize={14} fontWeight={900} fill="#fecaca">
            ריק
          </text>
        )}
      </g>

      {/* The shortfall complaint, in the animal's own voice. */}
      {shortchanged && (
        <g transform={`translate(0 ${bubbleY})`}>
          <rect x={-64} y={-19} width={128} height={30} rx={15} fill="#fee2e2" stroke="#b91c1c" strokeWidth={2} />
          <text x={0} y={1} textAnchor="middle" fontSize={13} fontWeight={800} fill="#7f1d1d">
            {actual === 0 ? 'למה לי אין בכלל? 😢' : `למה לי יש רק ${actual}? 😢`}
          </text>
        </g>
      )}
    </>
  );
}
