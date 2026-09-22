/**
 * Routes a standalone mini-game anchor to its modal.
 *
 * Kept separate from `DistrictHost` on purpose: districts are one-modal-per-hex
 * -tile-type and carry tile progress, whereas these are quick games hung off
 * their own map anchors with no district state at all. Mixing the two would
 * mean threading tile data through modals that do not need it.
 *
 * A lookup table rather than a switch, since every entry takes the same single
 * `onClose` prop.
 */
import type { ComponentType } from 'react';
import type { AnchorGame } from './gameAnchors';
import TimeDifferenceModal from './TimeDifferenceModal';
import SpiderWebModal from './SpiderWebModal';
import StarArcadeModal from '../farm/StarArcadeModal';
import PicnicArcadeModal from '../farm/PicnicArcadeModal';
import DetectiveOfficeModal from './DetectiveOfficeModal';

/**
 * The anchors that remain. "מי באסם?" and "המתכון של השף" are gone from this table
 * along with their pins: the barn is entered through its own building, and the chef's
 * recipe is a tab inside the bakery. Leaving dead entries here would keep the two
 * modals reachable only by a type that nothing can produce.
 */
const MODALS: Record<AnchorGame, ComponentType<{ onClose: () => void }>> = {
  constellation: StarArcadeModal,
  picnicBasket: PicnicArcadeModal,
  timeDifference: TimeDifferenceModal,
  spiderWeb: SpiderWebModal,
  detective: DetectiveOfficeModal,
};

export default function GameAnchorHost({
  game,
  onClose,
}: {
  game: AnchorGame | null;
  onClose: () => void;
}) {
  if (game === null) return null;
  const Modal = MODALS[game];
  return <Modal onClose={onClose} />;
}
