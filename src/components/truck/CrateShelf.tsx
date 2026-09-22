/**
 * The warehouse bay: the crates available to load.
 *
 * A crate that is already on the truck is drawn FADED AND IN PLACE rather than removed
 * from the shelf. That is deliberate: the shelf is a fixed set of objects the child is
 * choosing between, and a grid that reflows as crates leave it makes the same crate
 * appear in a different position between looks. Keeping every crate anchored means the
 * child can learn the layout within a round and spend their attention on the addition.
 *
 * The disabled state also carries the reason. When the bed is full, every remaining
 * crate is disabled TOGETHER and the shelf says so once, rather than each button going
 * grey with no explanation.
 */
import CrateFace from './CrateFace';
import type { Crate } from './truckRounds';

interface CrateShelfProps {
  crates: Crate[];
  /** Ids currently on the truck. */
  loadedIds: readonly string[];
  /** Blocks all loading - the round is answered, or the sprint is over. */
  disabled?: boolean;
  /** Blocks loading because the bed is full, with its own explanation. */
  bedFull?: boolean;
  /** How many slots remain, or null when the bed is unlimited. */
  slotsRemaining?: number | null;
  onLoad: (crateId: string) => void;
}

export default function CrateShelf({
  crates,
  loadedIds,
  disabled = false,
  bedFull = false,
  slotsRemaining = null,
  onLoad,
}: CrateShelfProps) {
  const blocked = disabled || bedFull;

  return (
    <section className="rounded-2xl border-2 border-amber-300/60 bg-amber-950/20 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <span className="text-[11px] font-black text-amber-100">מחסן הארגזים</span>
        {/*
          ONE STATUS LINE, SHOWN ONLY WHEN IT HAS SOMETHING TO SAY. The brief asks for
          the redundant labels to go, so there is no crate counter and no permanent
          instruction - only the slot warning, which appears exactly when the child
          hits the limit and explains why the shelf stopped responding.
        */}
        {bedFull && (
          <span className="rounded-full bg-rose-500/25 px-2 py-0.5 text-[11px] font-black text-rose-100">
            המשאית מלאה! פרקו ארגז כדי להעמיס אחר
          </span>
        )}
        {!bedFull && slotsRemaining !== null && slotsRemaining <= 1 && !disabled && (
          <span className="rounded-full bg-amber-400/25 px-2 py-0.5 text-[11px] font-black text-amber-100">
            נשאר {slotsRemaining === 0 ? 'מקום 0' : 'מקום 1'} במשאית
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-center gap-2">
        {crates.map((crate) => {
          const onTruck = loadedIds.includes(crate.id);
          return (
            <CrateFace
              key={crate.id}
              crate={crate}
              onPress={() => onLoad(crate.id)}
              disabled={blocked || onTruck}
              faded={onTruck}
              /*
               * CRATES THAT ARE STILL AVAILABLE ARE DRAWN LARGER THAN THE ONES ON THE
               * TRUCK. With the illustrations now carrying real detail, a full loadout
               * plus a full shelf is a lot of artwork at one scale, and the loaded ones
               * become visual noise competing with the decision still to be made. The
               * size difference makes "what is left to choose from" the dominant thing
               * on screen without hiding what is already loaded.
               */
              compact={onTruck}
            />
          );
        })}
      </div>
    </section>
  );
}
