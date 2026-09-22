/**
 * A tactile "coin" notification pin floating above a building on the town map.
 *
 * Township/Hay Day styling: thick white + gold rim, deep shadow, a downward
 * pointer triangle, a gold padlock with an amber pulse while locked, or the
 * district emoji plus a level badge once unlocked. When its building hotspot is
 * hovered the whole pin scales up so the two clearly belong together.
 */
import { tileThemeFor } from '../kingdom/resourceThemes';
import { unlockCost } from '../kingdom/tileThemes';
import type { PlacedTile } from './townLocations';

interface TownPinProps {
  placed: PlacedTile;
  isHovered: boolean;
  isSelected: boolean;
  onInspect: (tileId: string) => void;
}

export default function TownPin({
  placed,
  isHovered,
  isSelected,
  onInspect,
}: TownPinProps) {
  const { tile, spot } = placed;
  const theme = tileThemeFor(tile);
  const unlocked = tile.isUnlocked;
  const needsMath = Boolean(tile.currentMathProblem) && !unlocked;

  return (
    <button
      type="button"
      onClick={() => onInspect(tile.id)}
      aria-label={`${theme.labelHebrew}${unlocked ? ` רמה ${tile.level}` : ' אריח נעול'}`}
      title={theme.labelHebrew}
      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
      className={`group absolute z-10 -translate-x-1/2 -translate-y-[115%] hover:z-30 focus-visible:z-30 ${
        unlocked
          ? 'animate-[float_4.5s_ease-in-out_infinite] motion-reduce:animate-none'
          : 'animate-[float_6s_ease-in-out_infinite] motion-reduce:animate-none'
      }`}
    >
      <span
        className={`relative block transition duration-150 group-hover:scale-110 group-active:scale-95 ${
          isHovered ? 'scale-110' : ''
        }`}
      >
        <span
          className={`relative grid h-9 w-9 place-items-center rounded-full border-4 bg-white drop-shadow-md transition-colors sm:h-10 sm:w-10 ${
            isSelected
              ? 'border-amber-500 ring-4 ring-amber-300/70'
              : 'border-white ring-2 ring-amber-400/80'
          } ${needsMath ? 'ring-rose-400' : ''}`}
        >
          <span
            aria-hidden
            className={`text-lg leading-none sm:text-xl ${
              unlocked
                ? ''
                : 'animate-[pulseLock_2.2s_ease-in-out_infinite] motion-reduce:animate-none'
            }`}
          >
            {unlocked ? theme.emoji : '🔒'}
          </span>

          <span className="absolute -bottom-1 -start-1 rounded-full bg-amber-400 px-1 text-[10px] font-black tabular-nums text-amber-950 shadow ring-2 ring-white">
            {unlocked ? tile.level : unlockCost(tile.level)}
          </span>

          {needsMath && (
            <span
              aria-hidden
              className="absolute -top-1 -end-1 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white"
            >
              ?
            </span>
          )}
        </span>

        {/* Pointer triangle making the coin look like it hovers over the roof. */}
        <span
          aria-hidden
          className="absolute left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-[9px] rotate-45 border-b-4 border-e-4 border-white bg-white shadow-md"
        />
      </span>

      <span className="sr-only">
        {unlocked ? 'פתוח' : `נעול, נדרשות ${unlockCost(tile.level)} עוגיות`}
        {spot.kind === 'extra' ? ' - אתר נוסף' : ''}
      </span>
    </button>
  );
}
