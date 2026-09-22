/**
 * The adventure board: a pannable SVG of hex tiles plus wandering animals.
 */
import { useMemo, useState } from 'react';
import { Compass } from 'lucide-react';
import type { HexCoordinate, HexTile } from '../../types/game.types';
import { useGame } from '../../context/GameContext';
import { boundsOf } from './hexGeometry';
import HexTileSvg from './HexTileSvg';
import WanderingAnimals from './WanderingAnimals';

export default function HexGrid({ onInspect }: { onInspect: (tileId: string) => void }) {
  const { state } = useGame();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tiles = useMemo(
    () =>
      state.tileOrder
        .map((id) => state.tiles[id])
        .filter((tile): tile is HexTile => Boolean(tile)),
    [state.tileOrder, state.tiles],
  );

  const coords: HexCoordinate[] = useMemo(
    () => tiles.map((tile) => tile.coordinate),
    [tiles],
  );
  const box = useMemo(() => boundsOf(coords), [coords]);

  const handleSelect = (tileId: string) => {
    setSelectedId(tileId);
    onInspect(tileId);
  };

  return (
    <section className="relative mx-auto w-full max-w-5xl px-2 pb-10">
      <div className="mb-2 flex items-center justify-center gap-2 text-sm font-bold text-amber-900/70">
        <Compass className="h-4 w-4" />
        <span>לחצו על אריח כדי לחקור את הממלכה</span>
      </div>

      <div className="overflow-auto rounded-3xl border-4 border-amber-200 bg-gradient-to-b from-sky-100 via-amber-50 to-emerald-100 p-2 shadow-inner">
        <svg
          viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
          className="mx-auto h-[62vh] min-h-[360px] w-full"
          role="img"
          aria-label="מפת הממלכה"
        >
          <defs>
            <pattern id="grass" width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="1.4" className="fill-emerald-300/60" />
              <circle cx="13" cy="11" r="1.1" className="fill-amber-300/60" />
            </pattern>
          </defs>
          <rect
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            fill="url(#grass)"
          />

          {tiles.map((tile) => (
            <HexTileSvg
              key={tile.id}
              tile={tile}
              isSelected={tile.id === selectedId}
              onSelect={handleSelect}
            />
          ))}

          <WanderingAnimals
            tiles={tiles.filter((tile) => tile.isUnlocked)}
            animals={state.inventory.unlockedAnimals}
          />
        </svg>
      </div>
    </section>
  );
}
