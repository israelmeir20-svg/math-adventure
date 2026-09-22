/**
 * Renders an animal as a solid dark silhouette, optionally distorted into a
 * near-miss so children must compare shapes carefully.
 *
 * Variants are deliberately *geometric* (mirror / tilt / limb) rather than
 * colour tricks, so the difference survives being flattened to one colour.
 */
import type { FarmAnimal, ShadowVariant } from './farmAnimalsData';

interface AnimalSilhouetteProps {
  animal: FarmAnimal;
  variant: ShadowVariant;
  className?: string;
}

/** Animals are authored facing left inside a 120x100 stage. */
const STAGE_WIDTH = 120;

/**
 * Wraps the figure in a transform that visibly changes its outline.
 * Each distractor should be describable in words a child would use:
 * "facing the other way", "lying down", "bottom heavy".
 */
function figureTransform(variant: ShadowVariant): string {
  switch (variant.kind) {
    case 'flip':
      // "Faces the other way" - mirror of the entire figure.
      return `translate(${STAGE_WIDTH} 0) scale(-1 1)`;
    case 'headTilt':
      // "Lying down / flopped over" - a big, obvious lean.
      return 'rotate(-22 60 88) translate(-14 -4)';
    case 'legUp':
      // "Bottom heavy / squashed" - clearly shorter and wider.
      return 'translate(-11 0) scale(1.18 0.8)';
    default:
      return '';
  }
}

export default function AnimalSilhouette({
  animal,
  variant,
  className = '',
}: AnimalSilhouetteProps) {
  const transform = figureTransform(variant);

  // `legUp` drops the last limb path, so the stance genuinely differs.
  const bodyPaths =
    variant.kind === 'legUp' ? animal.body.slice(0, -1) : animal.body;

  return (
    <svg
      viewBox={animal.viewBox}
      className={className}
      role="img"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform={transform || undefined}>
        <g fill="#3f3f46" stroke="#3f3f46" strokeWidth={2} strokeLinejoin="round">
          {bodyPaths.map((path, index) => (
            <path key={`body-${index}`} d={path} />
          ))}
          {animal.features.map((path, index) => (
            <path key={`feature-${index}`} d={path} />
          ))}
        </g>
      </g>
    </svg>
  );
}
