/**
 * Layer 2 of the stage: the animal BODIES, and nothing else.
 *
 * THE EYES ARE NOT HERE ANY MORE. They used to be drawn inside this group, which
 * put them *under* the darkness overlay - so a fully opaque blackout hid the
 * animals' eyes along with their bodies, and the barn became a blank screen. The
 * eyes now live in their own layer ABOVE the overlay (see `GlowingEyes`), which
 * is what lets them shine out of a pitch-black stage.
 *
 * So this component draws only what the torch is allowed to reveal: the sprite.
 * Outside the beam it is completely invisible, which is the point.
 */
import { NIGHT_SPRITES } from './nightSprites';
import { bodyBox } from './nightGeometry';
import type { NightSpot } from './nightTypes';

interface NightAnimalBodyProps {
  spot: NightSpot;
  /** True once the answer was revealed - the animals then bob happily. */
  cheering: boolean;
  /** Stagger, so a crowd does not bounce in lockstep. */
  index: number;
}

export default function NightAnimalBody({ spot, cheering, index }: NightAnimalBodyProps) {
  const { size, top } = bodyBox(spot);

  return (
    <g transform={`translate(${spot.x} ${spot.y})`}>
      <g
        style={
          cheering
            ? {
                animation: `happyBounce 500ms ease-in-out ${index * 70}ms`,
                transformBox: 'fill-box',
                transformOrigin: 'center bottom',
              }
            : undefined
        }
      >
        {/* The animal. `xMidYMax` puts its feet on the straw. */}
        <image
          href={NIGHT_SPRITES[spot.animal]}
          x={-size / 2}
          y={top - spot.y}
          width={size}
          height={size}
          preserveAspectRatio="xMidYMax meet"
        />
      </g>
    </g>
  );
}
