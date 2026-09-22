/**
 * The explanation banner for a wrong answer in "שעת האכלה".
 *
 * A MISS IS A FAILED DISTRIBUTION, SO THE BANNER SAYS WHAT WENT WRONG IN THE
 * CHILD'S OWN ARITHMETIC rather than "try again":
 *
 *   too_much    "we wanted 6 each, but the food ran out half way"
 *   too_little  "there are still 2 in the basket - you can give them more"
 *
 * Both name the actual numbers, so the sentence can be checked against the bowls
 * on screen. It sits over the meadow at the bottom of the stage, where nothing
 * else competes with it.
 */
import { leftoverAfter, type FeedbackState } from './feedingFeedback';
import { VIEW_H, VIEW_W } from './feedingData';

interface FeedbackBannerProps {
  feedback: FeedbackState;
  totalFood: number;
  count: number;
}

export default function FeedbackBanner({ feedback, totalFood, count }: FeedbackBannerProps) {
  let text: string | null = null;
  if (feedback.status === 'too_much') {
    text = `רצינו לתת ${feedback.chosen}, אבל האוכל נגמר באמצע!`;
  } else if (feedback.status === 'too_little') {
    text = `נשארו עוד ${leftoverAfter(totalFood, count, feedback.chosen)} בסל! אפשר לתת להם יותר!`;
  }
  if (text === null) return null;

  return (
    <g transform={`translate(${VIEW_W / 2} ${VIEW_H - 26})`}>
      <rect
        x={-270}
        y={-21}
        width={540}
        height={38}
        rx={19}
        fill={feedback.status === 'too_much' ? '#7f1d1d' : '#3e2723'}
        stroke="#fbbf24"
        strokeWidth={2.5}
      />
      <text x={0} y={7} textAnchor="middle" fontSize={17} fontWeight={800} fill="#ffffff">
        {text}
      </text>
    </g>
  );
}
