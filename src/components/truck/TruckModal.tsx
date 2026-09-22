/**
 * "מרכז המטען: משלוח אקספרס" - the cargo hub district.
 *
 * The shell owns the depot interior and the frame; the sprint itself lives in
 * `TruckGame`. The shell's wooden title sign is suppressed here: the game draws a single
 * slim HUD carrying the level, the manifest, the score, the clock and one exit button,
 * and stacking the sign above it printed the district name and a second ✕ twice.
 */
import { useState } from 'react';
import TruckGame from './TruckGame';
import DistrictInteriorShell, { InteriorPanel } from '../common/DistrictInteriorShell';
import truckInterior from '../../assets/interiors/truck-interior.jpg';
import GameLaunchModal from '../kingdom/GameLaunchModal';
import type { StationLevel } from '../../features/progression/useStationProgress';

interface TruckModalProps {
  /** Title of the district tile that was opened. */
  tileLabel: string;
  /** Current level of the truck hub tile. */
  tileLevel: number;
  /**
   * Lifetime deliveries, tracked by the town map.
   *
   * ACCEPTED BUT NOT RENDERED. The map still counts them and the district tile still
   * reports the total; it is simply not shown a second time inside the game, where the
   * sprint's own truck count is the meaningful figure. Keeping the prop in the contract
   * means the caller does not have to know which of the two numbers this component
   * currently draws.
   */
  deliveriesCompleted: number;
  onDeliveryComplete: () => void;
  onClose: () => void;
}

export default function TruckModal({
  tileLabel,
  onDeliveryComplete,
  onClose,
}: TruckModalProps) {
  /*
   * THE LAUNCH CARD IS SHOWN BEFORE THE SPRINT, AND IT IS THE ONLY SOURCE OF A LEVEL.
   *
   * `TruckGame` reads its level from a prop, so somebody has to own the choice. It used to be
   * `useCargoProgress` inside the game, which decided the level for itself; now the card owns
   * the ladder and this shell carries the answer, exactly as the farm hub does.
   *
   * GATING ALSO MATTERS FOR THE CLOCK: the sprint starts a 30-second countdown the moment it
   * mounts, so mounting it behind a card would burn the child's opening seconds on a panel.
   * Returning the card instead of the shell keeps the game unmounted until play is pressed.
   */
  const [level, setLevel] = useState<StationLevel | null>(null);

  if (level === null) {
    return <GameLaunchModal meta="trucks" onStart={setLevel} onClose={onClose} />;
  }

  return (
    <DistrictInteriorShell
      bgImage={truckInterior}
      title="מרכז המטען: משלוח אקספרס"
      subtitle={`${tileLabel} · חיבור עד 1,000 - העמיסו משקל מדויק`}
      icon="🚚"
      hideTitleBar
      onClose={onClose}
    >
      <InteriorPanel className="h-full min-h-0">
        <TruckGame level={level} onDelivered={onDeliveryComplete} onClose={onClose} />
      </InteriorPanel>
    </DistrictInteriorShell>
  );
}
