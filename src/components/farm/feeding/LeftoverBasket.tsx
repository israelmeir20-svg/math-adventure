/**
 * The leftover basket, and the label saying how much is still in it.
 *
 * It carries the "too little" lesson. When the child under-shares, the food they
 * did not hand out is exactly what they should have given, so the basket is
 * tinted red and shaken to pull the eye to it while the banner explains.
 *
 * On a correct answer it simply reports the remainder - "the basket is empty!"
 * when the division came out even - which is the concrete picture of a remainder
 * this station exists to teach.
 */
import { leftoverAfter } from './feedingFeedback';
import type { FeedbackState } from './feedingFeedback';

interface LeftoverBasketProps {
  feedback: FeedbackState;
  totalFood: number;
  count: number;
}

export default function LeftoverBasket({ feedback, totalFood, count }: LeftoverBasketProps) {
  const leftover = leftoverAfter(totalFood, count, feedback.chosen);
  const underShared = feedback.status === 'too_little';

  return (
    <g
      style={
        underShared
          ? {
              animation: 'happyBounce 600ms ease-in-out 0ms 3',
              transformBox: 'fill-box',
              transformOrigin: 'center center',
            }
          : undefined
      }
    >
      <rect
        x={-56}
        y={-20}
        width={112}
        height={40}
        rx={20}
        fill={underShared ? '#7f1d1d' : '#3e2723'}
        stroke="#fbbf24"
        strokeWidth={3}
      />
      <text x={0} y={7} textAnchor="middle" fontSize={16} fontWeight={800} fill="#fde68a">
        {leftover === 0 ? 'הסל ריק!' : `נשארו ${leftover} בסל!`}
      </text>
    </g>
  );
}
