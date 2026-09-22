/**
 * The fruit resting on the basket's cloth.
 *
 * NO CELLS, NO GRID LINES, NO RECTANGLES. The gingham in `basket.png` IS the background,
 * so drawing compartment boxes would paint fake furniture on top of a real photograph.
 * The fruit simply rests on the cloth, and position alone tells the child which pile is
 * which.
 *
 * JITTER AND TILT STILL LIVE HERE, and only here. The slot is the fruit's measured home
 * on the floor; the jitter is a small nudge within that slot, and the rotation is about
 * the SLOT CENTRE rather than the sprite's own centre, which keeps a tilted piece from
 * creeping toward its neighbour as the angle grows.
 *
 * THE SPRITE KEEPS ITS ASPECT RATIO (`xMidYMid meet`). The fruits are photographed
 * objects of different shapes - a long banana against a round apple - so stretching them
 * to a square box would make every one of them look wrong, unlike the basket itself,
 * where a slight stretch is imperceptible on wicker. A 46px box therefore shows a banana
 * narrower than an apple, which is what the fruit actually looks like.
 */
import { FRUIT_HALF, FRUIT_SIZE } from './picnicData';
import { picnicSpriteUrl } from './picnicSprites';
import { picnicFruitInfo } from './picnicFruits';
import type { PicnicRound } from './picnicTypes';

interface FruitLayerProps {
  round: PicnicRound;
}

export default function FruitLayer({ round }: FruitLayerProps) {
  return (
    <g>
      {round.cells
        .filter((cell) => cell.fruit !== null)
        .map((cell, i) => {
          const sprite = picnicSpriteUrl(cell.fruit as string);

          // A missing sprite degrades to the emoji rather than leaving a blank slot -
          // an unreadable pile would make the round unanswerable.
          if (!sprite) {
            return (
              <text
                key={`f-${i}`}
                x={cell.fruitX}
                y={cell.fruitY}
                fontSize={FRUIT_SIZE}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {picnicFruitInfo(cell.fruit as string).emoji}
              </text>
            );
          }

          return (
            <image
              key={`f-${i}`}
              href={sprite}
              x={cell.fruitX - FRUIT_HALF}
              y={cell.fruitY - FRUIT_HALF}
              width={FRUIT_SIZE}
              height={FRUIT_SIZE}
              // Rotate about the slot centre, so the tilt never walks the sprite.
              transform={`rotate(${cell.tilt}, ${cell.x}, ${cell.y})`}
              preserveAspectRatio="xMidYMid meet"
              className="pointer-events-none select-none"
            />
          );
        })}
    </g>
  );
}
