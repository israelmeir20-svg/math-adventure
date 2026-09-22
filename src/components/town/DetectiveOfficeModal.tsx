/**
 * "משרד החקירות" - the Detective Office, as reached from the town map.
 *
 * ================================================================================================
 * THIS COMPONENT IS DELIBERATELY ALMOST EMPTY
 * ================================================================================================
 *
 * It used to wrap `DetectiveGame` in `MiniGameShell`, the shared chrome every other mini-game
 * uses, and that was wrong for this feature. `MiniGameShell` is built for games that are a card of
 * controls: a titled frame, a header bar, a padded scroll area. The detective game is not that - it
 * is three full-bleed photographic puzzles whose whole point is the artwork - and putting it inside
 * the shell meant the photograph was a card INSIDE a card inside a modal, each layer taking its own
 * padding and border out of the picture.
 *
 * So the shell is gone and `DetectiveGame` owns the entire viewport from here. It already draws its
 * own top bar with the case title, the error count and the exit button, which is everything the
 * shell's header was supplying - so nothing is lost but four nested borders and about 200px of
 * cumulative padding.
 *
 * THE ONLY THING THIS FILE STILL OWNS IS THE `onClose` CONTRACT, which is what `GameAnchorHost`
 * passes and what the game's `onExit` is wired to. Keeping the wrapper means the anchor host's
 * lookup table did not have to learn a new prop shape.
 */
import DetectiveGame from '../../features/mystery/DetectiveGame';

export default function DetectiveOfficeModal({ onClose }: { onClose: () => void }) {
  return <DetectiveGame onExit={onClose} />;
}
