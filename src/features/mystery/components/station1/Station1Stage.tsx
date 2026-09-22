/**
 * Station 1's stage - a thin wrapper over the feature-wide `PuzzleStage`.
 *
 * IT EXISTS ONLY SO STATION 1'S FOUR PUZZLES DID NOT HAVE TO CHANGE when the stage was promoted to
 * `components/PuzzleStage.tsx` for Station 3 to share. Deleting it and updating four imports would
 * have been a larger diff for no behavioural gain, and keeping the name means a reader looking for
 * "the thing the crest grid is drawn on" still finds it where they expect.
 *
 * The default `testId` is the one Station 1's verification used, and it is passed explicitly here
 * so the shared component can default to a station-neutral one.
 */
import type { ReactNode } from 'react';
import PuzzleStage from '../PuzzleStage';

interface StageProps {
  bgAsset: string;
  bgAlt?: string;
  aspect: number;
  children: (ctx: { aspect: number }) => ReactNode;
  className?: string;
}

export default function Station1Stage({
  bgAsset,
  bgAlt = '',
  aspect,
  children,
  className,
}: StageProps) {
  return (
    <PuzzleStage
      bgAsset={bgAsset}
      bgAlt={bgAlt}
      aspect={aspect}
      className={className}
      testId="station1-stage"
    >
      {children}
    </PuzzleStage>
  );
}
