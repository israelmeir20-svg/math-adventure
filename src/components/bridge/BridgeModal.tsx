/**
 * The Bridge Guard district: a full-bleed bridge interior with the riddle
 * encounter standing on it.
 *
 * THIS MODAL DOES NOT USE `DistrictInteriorShell`, AND THAT IS DELIBERATE. The
 * shell owns a header band, a stat row and an inset panel, which together cost
 * roughly a third of the frame AND give the painting a backdrop of its own - the
 * opposite of "the scenery stays visible". The riddle game carries its own title
 * banner, its own lock indicators and its own close button, so the two would have
 * duplicated each other while the art paid for both. The shell is still the right
 * shape for the districts that want a stat row; this one wants the picture.
 *
 * WHAT THE SHELL STILL PROVIDES, REBUILT HERE: the fixed backdrop, the
 * click-outside-to-close, the `role="dialog"` semantics, and the rounded frame.
 * The props are unchanged, so nothing upstream has to know.
 */
import { useEffect, useState } from 'react';
import BridgeGame from './BridgeGame';
import GameLaunchModal from '../kingdom/GameLaunchModal';
import type { StationLevel } from '../../features/progression/useStationProgress';
import bridgeInterior from '../../assets/interiors/bridge-interior.jpg';

interface BridgeModalProps {
  /** Title of the district tile that was opened. */
  tileLabel: string;
  /** Current level of the bridge tile. */
  tileLevel: number;
  /** How many times the bridge has been crossed. */
  crossings: number;
  onCrossed: () => void;
  onClose: () => void;
}

export default function BridgeModal({ onClose, onCrossed }: BridgeModalProps) {
  /** The level the crossing was started at, or null while the launch card is up. */
  const [level, setLevel] = useState<StationLevel | null>(null);

  // Escape is the other half of "clicking outside exits" - a modal that only
  // closes on a tap leaves a keyboard user stuck inside it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  /*
   * THE LAUNCH CARD IS RENDERED INSTEAD OF THE SCENE, NOT OVER IT.
   *
   * `GameLaunchModal` is its own full-screen dialog, so layering it on the bridge interior would
   * stack two backdrops and two scrims. Returning it early also keeps the crossing out of the tree
   * until the child presses play, which matters because the riddle set is drawn on mount - mounting
   * early would deal the questions behind the card and the child would arrive to a set they never
   * saw start.
   */
  if (level === null) {
    return <GameLaunchModal meta="locks" onStart={setLevel} onClose={onClose} />;
  }

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center bg-stone-900/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="גשר השומר המבולבל"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative h-[92vh] w-[94vw] max-w-4xl animate-[rise_.2s_ease-out] overflow-hidden rounded-t-3xl border-4 border-amber-300/80 shadow-2xl sm:h-[85vh] sm:max-h-[720px] sm:rounded-3xl"
      >
        {/* The interior, cover-fitted so the painting fills the frame at any size. */}
        <img
          src={bridgeInterior}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* A single soft vignette for legibility. Deliberately much lighter than
            the shell's three-stop wash, which was tuned for panels sitting on top
            of the art - here the art IS the surface. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-stone-950/35"
        />

        <div className="absolute inset-0">
          <BridgeGame level={level} onCrossed={onCrossed} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
