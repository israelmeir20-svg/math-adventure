/**
 * An invisible hitbox covering a whole building on the town illustration.
 *
 * It owns the hover intent for its district: hovering the building lights up
 * the matching pin above it, and clicking anywhere on the roof/area inspects
 * that tile. The box itself is transparent - the visual affordance is the glow
 * plus the pin scaling up.
 */
import type { PlacedTile } from './townLocations';

interface TownBuildingHotspotProps {
  placed: PlacedTile;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (tileId: string | null) => void;
  onInspect: (tileId: string) => void;
}

export default function TownBuildingHotspot({
  placed,
  isHovered,
  isSelected,
  onHover,
  onInspect,
}: TownBuildingHotspotProps) {
  const { tile, spot } = placed;
  const lit = isHovered || isSelected;

  return (
    <button
      type="button"
      onClick={() => onInspect(tile.id)}
      onMouseEnter={() => onHover(tile.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(tile.id)}
      onBlur={() => onHover(null)}
      aria-label={`פתחו את ${spot.labelHebrew}`}
      style={{
        left: `${spot.x}%`,
        top: `${spot.y}%`,
        width: `${spot.width}%`,
        height: `${spot.height}%`,
      }}
      className="group absolute z-[6] -translate-x-1/2 -translate-y-1/2 rounded-[50%] outline-none transition duration-200"
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute -inset-1 rounded-[50%] border-4 border-dashed transition duration-200 ${
          lit
            ? 'border-amber-300/90 bg-amber-200/25 shadow-[0_0_26px_rgba(251,191,36,0.75)]'
            : 'border-transparent bg-transparent'
        }`}
      />
    </button>
  );
}
