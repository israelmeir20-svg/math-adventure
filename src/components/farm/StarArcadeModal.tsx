/**
 * "משחק הכוכבים" reached straight from its own town-map anchor.
 *
 * Same adapter as the picnic basket: the observatory pin opens the sky directly,
 * with the district named in the station's own heading rather than the barn's.
 */
import ArcadeGameModal from './ArcadeGameModal';
import ConstellationGame from './stars/ConstellationGame';

export const STAR_TITLE = 'חווה · משחק הכוכבים';

export default function StarArcadeModal({ onClose }: { onClose: () => void }) {
  return (
    <ArcadeGameModal
      Game={ConstellationGame}
      title={STAR_TITLE}
      icon="🌟"
      launchMeta="observatory"
      onClose={onClose}
    />
  );
}
