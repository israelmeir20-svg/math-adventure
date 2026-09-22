/**
 * Layer 5 of the stage: the GLOWING EYES, drawn ABOVE the darkness.
 *
 * This layer is the whole station. The barn is a fully opaque blackout, so the
 * only thing a child can see before using the torch is a scatter of paired
 * glowing dots floating in the dark - and the puzzle is to reason about how many
 * animals those pairs belong to.
 *
 * WHY A SEPARATE LAYER AND NOT PART OF THE BODY. Anything drawn under the
 * darkness is invisible; anything drawn over it is visible everywhere. The eyes
 * are the one thing that must be over. They are also why the bodies can stay
 * fully hidden: the child gets a real clue (two dots = one animal) without ever
 * being able to see the animal itself until the beam lands on it.
 *
 * ANCHORING IS PER-SPECIES, and the arithmetic lives in `nightGeometry` so the
 * body layer and the verification suite all agree on where a face is.
 */
import { EYE_R } from './nightStageData';
import { eyePosition } from './nightGeometry';
import type { NightSpot } from './nightTypes';

interface GlowingEyesProps {
  spots: NightSpot[];
}

export default function GlowingEyes({ spots }: GlowingEyesProps) {
  return (
    <g pointerEvents="none">
      {spots.map((spot, index) => (
        <g
          key={spot.id}
          style={{
            animation: `eyeGlow 2200ms ease-in-out ${index * 180}ms infinite`,
            transformBox: 'fill-box',
            transformOrigin: 'center center',
          }}
        >
          {(['left', 'right'] as const).map((side) => {
            const { x, y } = eyePosition(spot, side);
            return (
              <g key={side}>
                {/* A soft halo, so the dot reads as GLOWING rather than painted. */}
                <circle cx={x} cy={y} r={EYE_R * 2.6} fill="#ffd54f" opacity={0.22} />
                <circle
                  cx={x}
                  cy={y}
                  r={EYE_R}
                  fill="#fff176"
                  style={{ filter: 'drop-shadow(0 0 5px #ffd54f)' }}
                />
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}
