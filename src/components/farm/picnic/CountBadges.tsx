/**
 * The count badges shown during feedback.
 *
 * WHY THESE EXIST AT ALL. A wrong answer in a timing game is usually just "no, try
 * again", which teaches nothing. Here the lid lifts, every pile is labelled with its real
 * count, and the child can see for themselves which one was bigger - so a miss becomes the
 * moment the comparison is learned, which is the entire point of the exercise.
 *
 * The badge for the pile the player named is tinted green or red; the rest stay neutral,
 * so their own choice is obvious without the others competing for attention.
 *
 * THESE ARE THE ONLY THING DRAWN OVER THE PHOTOGRAPH. They appear only in the feedback
 * window, when the lid is up and the child is being asked to read numbers, so they cannot
 * interfere with the look-at-it-and-remember moment.
 */
import { FLOOR_T, PICNIC_SLOTS_16 } from './picnicData';
import { picnicSpriteUrl } from './picnicSprites';
import { picnicFruitInfo } from './picnicFruits';
import type { PicnicRound } from './picnicTypes';

interface CountBadgesProps {
  round: PicnicRound;
  picked: string | null;
  correct: boolean;
}

export default function CountBadges({ round, picked, correct }: CountBadgesProps) {
  return (
    <g>
      {round.piles.map((pile) => {
        const slots = pile.cells.map((i) => PICNIC_SLOTS_16[i]).filter(Boolean);
        if (slots.length === 0) return null;

        // Centre the badge over its pile, and lift it just above the pile's top row so it
        // never covers the fruit it is counting.
        const cx = slots.reduce((a, s) => a + s.x, 0) / slots.length;
        const topY = Math.min(...slots.map((s) => s.y));
        const cy = Math.max(topY - 32, FLOOR_T - 12);

        const isPicked = picked === pile.fruit;
        const fill = isPicked ? (correct ? '#16a34a' : '#dc2626') : '#1c1917';
        const sprite = picnicSpriteUrl(pile.fruit);

        return (
          <g key={`badge-${pile.fruit}`} transform={`translate(${cx} ${cy})`}>
            <rect x={-42} y={-15} width={84} height={30} rx={15} fill={fill} stroke="#ffffff" strokeWidth={2.5} />
            {sprite ? (
              <image href={sprite} x={-36} y={-11} width={22} height={22} preserveAspectRatio="xMidYMid meet" />
            ) : (
              <text x={-25} y={0} fontSize={16} textAnchor="middle" dominantBaseline="central" fill="#ffffff">
                {picnicFruitInfo(pile.fruit).emoji}
              </text>
            )}
            <text x={16} y={0} fontSize={18} textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontWeight={800}>
              {pile.count}
            </text>
          </g>
        );
      })}
    </g>
  );
}
