/**
 * The Kiosk district: the corner-shop interior and the 30-second change-making
 * sprint behind the counter.
 *
 * THE THREE STAT CARDS ARE GONE. "לקוחות שקיבלו עודף", "רמת הקיוסק" and "בונוס
 * ללקוח" sat in a row of backdrop-blurred slabs between the title sign and the
 * game. Two of them are now in the game's own header, where "רמה 1: שוליית
 * הקיוסק | 🥇 1/3" says more than "רמת הקיוסק: 1" ever did, and the third was a
 * constant that never changed. Removing the row also removes the last opaque band
 * across the middle of the illustration.
 *
 * THE INTERIOR IS RENDERED BY THE GAME, NOT THE SHELL, and that is the point of
 * the change. `DistrictInteriorShell` paints the background and then puts a
 * frosted `InteriorPanel` on top of it, which costs a large translucent rectangle
 * over the middle of the art - the "huge grey card block" the brief objects to.
 * The kiosk needs the shop visible behind the customer and the counter, so the
 * game paints its own cover-fitted interior and floats its chrome on it with a
 * single gradient for legibility.
 *
 * WHAT THE SHELL STILL PROVIDES, REBUILT HERE: the fixed backdrop, the
 * click-outside-to-close, the `role="dialog"` semantics and the rounded frame.
 * The props are unchanged, so nothing upstream has to know.
 */
import { useEffect, useState } from 'react';
import KioskGame from './KioskGame';
import GameLaunchModal from '../kingdom/GameLaunchModal';
import type { StationLevel } from '../../features/progression/useStationProgress';

interface KioskModalProps {
  /** Title of the district tile that was opened. */
  tileLabel: string;
  /** Current level of the kiosk tile. */
  tileLevel: number;
  customersServed: number;
  onCustomerServed: () => void;
  onClose: () => void;
}

export default function KioskModal({ onClose, onCustomerServed }: KioskModalProps) {
  /**
   * THE LAUNCH CARD COMES FIRST, AND THE GAME REPLACES IT RATHER THAN SITTING BEHIND IT.
   *
   * The kiosk used to open straight into the sprint, which meant the child's level was decided
   * entirely by a persisted record they could not see or change - a child who had unlocked level 3
   * could never play level 1 again. Gating on the card both shows them the ladder and lets them pick
   * a rung. The game is not mounted until `level` is set, so the 30-second clock cannot start
   * running behind the card.
   */
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

  if (level === null) {
    return <GameLaunchModal meta="kiosk" onStart={setLevel} onClose={onClose} />;
  }

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center bg-stone-900/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="הקיוסק השכונתי"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative flex h-[92vh] w-[94vw] max-w-4xl animate-[rise_.2s_ease-out] flex-col overflow-hidden rounded-t-3xl border-4 border-amber-300/80 shadow-2xl sm:h-[88vh] sm:max-h-[760px] sm:rounded-3xl"
      >
        <KioskGame level={level} onComplete={onCustomerServed} onClose={onClose} />
      </div>
    </div>
  );
}
