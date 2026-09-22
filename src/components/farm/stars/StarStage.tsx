/**
 * The star stage: the sky, the constellations, and the count badges.
 *
 * LAYER ORDER, back to front:
 *
 *   1. backdrop       - the gradient and the decorative specks
 *   2. constellations - the gold outlines and their sparkle vertices
 *   3. badges         - per-shape counts, ONLY during feedback
 *
 * The badges come last so they sit over the lines rather than being crossed by them, and they
 * only exist once the round is answered - showing a per-shape count while the child is still
 * deciding would hand them the grouping for free, which is the entire skill being tested.
 *
 * THE STAGE IS KEYED ON THE ROUND NUMBER by its parent, so every round rebuilds the SVG from
 * scratch: no CSS animation carries over, and a shape cannot arrive already mid-spin.
 *
 * THERE IS NO EQUATION ANYWHERE IN THIS FILE. The counts appear as bare numbers on badges, and
 * never as a sum - a "3 + 4" readout would turn the question into arithmetic the child can do
 * without reading the sky at all.
 */
import StarBackdrop from './StarBackdrop';
import StarShapeArt from './StarShapeArt';
import StarCounts from './StarCounts';
import { VIEW_H, VIEW_W } from './starData';
import type { StarRound } from './starTypes';

interface StarStageProps {
  round: StarRound;
  /** True during feedback, when the per-shape counts are revealed. */
  showCounts: boolean;
}

export default function StarStage({ round, showCounts }: StarStageProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="touch-none select-none"
      role="img"
      aria-label="מפת כוכבים"
    >
      <StarBackdrop />

      {round.shapes.map((shape, index) => (
        // Index-keyed rather than identity-keyed: a shape has no stable id of its own, and the
        // whole stage is remounted per round, so the position in the list IS its identity.
        <StarShapeArt key={`shape-${index}`} shape={shape} />
      ))}

      {showCounts && <StarCounts round={round} />}
    </svg>
  );
}
