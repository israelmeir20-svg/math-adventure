/**
 * "סל הפיקניק" reached straight from its own town-map anchor.
 *
 * The anchor sits on the orchard-and-river pin, so the child is already in the
 * right place - there is no reason to send them through the barn hub. This is
 * the whole adapter: the title that names the district they tapped, and the
 * standalone host that frames the game.
 */
import ArcadeGameModal from './ArcadeGameModal';
import PicnicGame from './picnic/PicnicGame';

export const PICNIC_TITLE = 'חווה · סל הפיקניק';

export default function PicnicArcadeModal({ onClose }: { onClose: () => void }) {
  return (
    <ArcadeGameModal
      Game={PicnicGame}
      title={PICNIC_TITLE}
      icon="🧺"
      launchMeta="picnic"
      onClose={onClose}
    />
  );
}
