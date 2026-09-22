/**
 * Renders whichever district modal is currently open for a tile.
 * Returns null when no district is active.
 */
import type { GameContextValue } from '../../context/GameContext';
import StreetHubModal from '../street/StreetHubModal';
import BakeryModal from '../bakery/BakeryModal';
import KioskModal from '../kiosk/KioskModal';
import FarmModal from '../farm/FarmModal';
import PizzaModal from '../pizza/PizzaModal';
import TruckModal from '../truck/TruckModal';
import BridgeModal from '../bridge/BridgeModal';
import MosaicStudioModal from '../workshop/MosaicStudioModal';
import type { DistrictKind } from './districtRouting';

/** Per-district progress counters, keyed by district kind. */
export type DistrictCounters = Record<string, number>;

interface DistrictHostProps {
  kind: DistrictKind | null;
  tileLabel: string;
  /**
   * The level to run the district at, when the caller has one to force.
   *
   * OPTIONAL, BECAUSE THE DRAWER NO LONGER CHOOSES A LEVEL. The station's own launch card is where
   * a level is picked now, and it reads the shared progression directly - so this prop is a way for
   * a caller that DOES know better (a direct-entry district, a test) to override that, not the
   * normal channel. Leaving it undefined hands the decision to the launch card.
   *
   * IT ONCE OVERRODE `tile.level`, AND THAT IS THE BUG IT STOPPED DOING. `tile.level` was a field
   * nothing wrote, so a district opened at "level 3" from the drawer's stale selector while its
   * launch card correctly showed level 1 behind two padlocks. There is one progression record now,
   * and it is `useStationProgress`.
   */
  level?: number;
  counters: DistrictCounters;
  addCookies: GameContextValue['addCookies'];
  onClose: () => void;
  onBump: (counter: string) => void;
}

export default function DistrictHost({
  kind,
  tileLabel,
  level,
  counters,
  addCookies,
  onClose,
  onBump,
}: DistrictHostProps) {
  if (kind === 'street') {
    return <StreetHubModal onClose={onClose} />;
  }

  /**
   * The level handed to the districts below.
   *
   * THEY STILL TAKE A REQUIRED `level`, so this cannot pass `undefined` through - and defaulting to
   * 1 is the honest value rather than a placeholder. With the drawer no longer choosing, every
   * district's own launch card decides for itself and ignores what it was handed; a caller that
   * passes a real number (a direct-entry district, a test) still overrides that. Defaulting to 1
   * keeps the districts' prop contracts unchanged, which is what stops this roll-out from having to
   * touch seven more files that have nothing to do with the bug.
   */
  const stationLevel = level ?? 1;

  if (kind === 'bakery') {
    return (
      <BakeryModal
        tileLabel={tileLabel}
        tileLevel={stationLevel}
        ordersCompleted={counters.ordersCompleted ?? 0}
        onOrderComplete={() => {
          onBump('ordersCompleted');
          // A small bonus on top of the game's own reward.
          addCookies(1);
        }}
        onClose={onClose}
      />
    );
  }

  if (kind === 'kiosk') {
    return (
      <KioskModal
        tileLabel={tileLabel}
        tileLevel={stationLevel}
        customersServed={counters.customersServed ?? 0}
        onCustomerServed={() => onBump('customersServed')}
        onClose={onClose}
      />
    );
  }

  if (kind === 'farm') {
    return <FarmModal tileLabel={tileLabel} tileLevel={stationLevel} onClose={onClose} />;
  }

  if (kind === 'pizza') {
    return (
      <PizzaModal
        tileLabel={tileLabel}
        tileLevel={stationLevel}
        pizzasBaked={counters.pizzasBaked ?? 0}
        onPizzaBaked={() => onBump('pizzasBaked')}
        onClose={onClose}
      />
    );
  }

  if (kind === 'truck') {
    return (
      <TruckModal
        tileLabel={tileLabel}
        tileLevel={stationLevel}
        deliveriesCompleted={counters.deliveriesCompleted ?? 0}
        onDeliveryComplete={() => onBump('deliveriesCompleted')}
        onClose={onClose}
      />
    );
  }

  if (kind === 'bridge') {
    return (
      <BridgeModal
        tileLabel={tileLabel}
        tileLevel={stationLevel}
        crossings={counters.crossings ?? 0}
        onCrossed={() => onBump('crossings')}
        onClose={onClose}
      />
    );
  }

  if (kind === 'workshop') {
    return (
      <MosaicStudioModal
        tileLabel={tileLabel}
        tileLevel={stationLevel}
        onClose={onClose}
      />
    );
  }

  return null;
}


