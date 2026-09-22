/**
 * The truck stage: the flatbed, the cargo on it, and the physical feedback.
 *
 * ============================================================
 * THE TRUCK IS A SCALE YOU CAN SEE.
 * ============================================================
 *
 * With the numeric readout removed, the truck itself has to carry the load feedback, and
 * it does so through two channels that agree with each other:
 *
 *   1. THE CARGO STACK - what is on the deck, drawn as distinct illustrations.
 *   2. THE SUSPENSION - the chassis settles onto its tires as the weight climbs.
 *
 * Why the sink is the only feedback left: a running total tells the child the ANSWER. A
 * truck sitting low on its springs tells them nothing they could not already see by
 * looking at the cargo. It confirms "this is heavy" without revealing "this is exactly
 * 750", which is precisely the boundary the exercise needs.
 */
import CrateFace from './CrateFace';
import { FlatbedTruck } from './CargoArt';
import type { CabColor, Crate } from './truckRounds';

interface TruckBedProps {
  loaded: Crate[];
  /** How many crates the bed physically holds, or null when unlimited. */
  bedSlots: number | null;
  /** True when the load exceeds the target. */
  overloaded: boolean;
  /** Fired when a loaded crate is tapped, to send it back to the shelf. */
  onUnload: (crateId: string) => void;
  /** Plays the drive-off, to the left. */
  departing: boolean;
  /** True while the truck is still off-stage to the right, gliding in. */
  arriving: boolean;
  /** True for a beat when the load hits the target exactly, flaring the headlight. */
  targetHit: boolean;
  /** Increments per crate loaded, to fire one exhaust puff each. */
  loadPulse: number;
  /** Fired when the child taps the cab. */
  onHonk: () => void;
  /** The cab colour, which changes between trucks so a new one is visibly new. */
  cabColor: CabColor;
  /** The cargo's total weight, used only for the suspension depth. */
  totalWeight: number;
  /** The delivery's target, which the sink is measured against. */
  targetWeight: number;
}

/**
 * How far the chassis settles onto its tires, in pixels.
 *
 * A CONTINUOUS VALUE, capped well below the wheel height. The truck is not a dial to be
 * read off precisely - it is a coarse "this is getting heavy" signal, so the sink tops out
 * at 9px. Going deeper would start to look like the truck was broken rather than laden.
 *
 * ANY CARGO AT ALL SINKS THE TRUCK BY AT LEAST A PIXEL, and that floor is load-bearing.
 * Rounding alone collapsed every load below ~5% of the target to a flat 0 - so on the
 * 1,000kg tiers a single 25kg sack produced no movement whatsoever. The child taps a crate,
 * watches it land on the deck, and the truck does not so much as twitch: the feedback
 * contradicts the action, which reads as a broken game rather than as "that was light".
 * The floor costs nothing pedagogically, because it still tells the child nothing about
 * HOW heavy the load is.
 */
function sinkFor(totalWeight: number, targetWeight: number): number {
  if (totalWeight <= 0) return 0;
  const ratio = targetWeight > 0 ? totalWeight / targetWeight : 0;
  return Math.min(9, Math.max(1, Math.round(ratio * 9)));
}

/** The cab colours the game cycles, mapped onto the artwork's palette. */
const CAB_PAINT: Record<CabColor, 'blue' | 'red' | 'green' | 'purple'> = {
  sky: 'blue',
  lime: 'green',
  violet: 'purple',
  orange: 'red',
};

export default function TruckBed({
  loaded,
  bedSlots,
  overloaded,
  onUnload,
  departing,
  arriving,
  targetHit,
  loadPulse,
  onHonk,
  cabColor,
  totalWeight,
  targetWeight,
}: TruckBedProps) {
  /*
   * The bed cap is enforced by the game's load logic and announced by the stage's corner
   * badge; the deck itself does not draw placeholder slots. Dashed "empty slot" boxes
   * sitting on the planks read as cargo and clutter a drawing meant to look like a real
   * truck.
   *
   * The cap still reaches this component, and it is worth keeping: when a level caps the
   * bed, the child needs to know how many places are LEFT, and the deck is where they are
   * looking. Seen only on the capped tier, so it is never decoration elsewhere.
   */
  const slotsRemaining = bedSlots === null ? null : Math.max(0, bedSlots - loaded.length);

  return (
    <FlatbedTruck
      isDispatched={departing}
      isArriving={arriving}
      isTargetHit={targetHit}
      loadPulse={loadPulse}
      onHonk={onHonk}
      suspensionOffset={sinkFor(totalWeight, targetWeight)}
      cab={CAB_PAINT[cabColor]}
      overloaded={overloaded}
      showEmptyHint={loaded.length === 0}
      slotsRemaining={slotsRemaining}
    >
      {loaded.map((crate) => (
        /*
         * EVERY LOADED CRATE IS A BUTTON, and that is the interaction the brief asks
         * for: tapping any crate on the deck unloads it back to the warehouse bay. No
         * confirm, no drag - one tap reverses one load, which is what makes revising the
         * mental arithmetic cheap.
         */
        <button
          key={crate.id}
          type="button"
          onClick={() => onUnload(crate.id)}
          aria-label={`פרקו ארגז במשקל ${crate.weight} קילו`}
          className="cursor-pointer transition-transform duration-150 hover:-translate-y-1 active:translate-y-0"
        >
          <CrateFace crate={crate} compact />
        </button>
      ))}
    </FlatbedTruck>
  );
}
