/**
 * The per-shape counts, revealed only after the round is answered.
 *
 * WHY A BADGE AND NOT A TOTAL. On a miss, the child needs to see HOW their answer was wrong -
 * which is only useful if it is shown group by group. Printing "12" alone tells them they were
 * wrong; showing each constellation's own size lets them find the group they miscounted. So the
 * badges deliberately number each shape and never their sum.
 *
 * THEY SIT BELOW THE ANCHOR, not on it. A spinning shape's vertices sweep past the anchor
 * constantly, so a badge placed at the centre would be collided with every few seconds. Below
 * the anchor is the one region a rotating regular polygon never sweeps back into.
 *
 * The badge offsets are per-shape rather than global, because the three-shape layout puts one
 * constellation low on the stage where a fixed downward offset would fall off the canvas.
 */
import type { StarRound } from './starTypes';

/** How far below an anchor its count badge sits, chosen so it clears the sweep. */
const BADGE_DROP = 58;

interface StarCountsProps {
  round: StarRound;
}

export default function StarCounts({ round }: StarCountsProps) {
  return (
    <g>
      {round.shapes.map((shape, index) => {
        // The low shape in the three-constellation layout would push a badge off the bottom of
        // the canvas, so that one is lifted above its anchor instead - and a lifted badge still
        // clears the sweep for the same reason, just mirrored.
        const below = shape.anchor.y + BADGE_DROP <= 340;
        const cy = below ? shape.anchor.y + BADGE_DROP : shape.anchor.y - BADGE_DROP;
        const cx = shape.anchor.x;

        return (
          <g key={`count-${index}`}>
            <circle cx={cx} cy={cy} r="17" fill="#0b1220" stroke="#fde047" strokeWidth="2" />
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#fffdf0"
              fontSize="19"
              fontWeight="800"
              className="select-none tabular-nums"
            >
              {shape.count}
            </text>
          </g>
        );
      })}
    </g>
  );
}
