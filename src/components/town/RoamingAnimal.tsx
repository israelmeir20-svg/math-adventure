/**
 * A rescued animal resting at its habitat anchor with a small idle animation.
 *
 * Flicker-proofing notes - please preserve these when editing:
 *
 * 1. `memo` with stable props. The parent re-renders on hover and balloon state
 *    changes; without this, React would re-apply the style object and restart
 *    the keyframes, which reads as blinking.
 * 2. Two nested elements, one animated `transform` each: the wrapper owns the
 *    centring `translate(-50%, -50%)`, the img owns the idle bounce. Keeping
 *    the centring off the animated element means the keyframe can never clobber
 *    it, which is what previously shifted sprites off their coordinates.
 * 3. Only `transform` animates. The ground idle touches `opacity` NOWHERE;
 *    animals are fully opaque at all times.
 * 4. `will-change` reserves the compositor layer up front instead of on first
 *    paint.
 */
import { memo } from 'react';
import type { CSSProperties } from 'react';
import { getAnimalSprite } from './animalSprites';
import type { AnimalHabitat } from './animalRoutes';

interface RoamingAnimalProps {
  animalId: string;
  habitat: AnimalHabitat;
}

function RoamingAnimalInner({ animalId, habitat }: RoamingAnimalProps) {
  const sprite = getAnimalSprite(animalId);
  if (!sprite) return null;

  const { anchor, idle, duration, delay, lift } = habitat;

  const wrapper: CSSProperties = {
    left: `${anchor.x}%`,
    top: `${anchor.y}%`,
    transform: 'translate(-50%, -50%)',
  };

  const idleStyle: CSSProperties =
    idle === 'water'
      ? {
          animationName: 'idleWater',
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        }
      : {
          animationName: 'idleBreathe',
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        };

  return (
    <span
      className="pointer-events-none absolute will-change-transform"
      style={wrapper}
      aria-hidden
    >
      <img
        src={sprite}
        alt=""
        draggable={false}
        className="h-9 w-9 select-none object-contain drop-shadow-md will-change-transform motion-reduce:animate-none md:h-11 md:w-11"
        style={{ ...idleStyle, '--idle-lift': `${lift}px` } as CSSProperties}
      />
    </span>
  );
}

const RoamingAnimal = memo(RoamingAnimalInner);
export default RoamingAnimal;
