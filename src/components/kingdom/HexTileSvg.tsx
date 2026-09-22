/**
 * A single interactive flat-topped hexagon tile.
 * Renders the 3D base, the coloured face, the state badge and the icon.
 */
import { Lock, Sparkles } from 'lucide-react';
import type { HexTile } from '../../types/game.types';
import { HEX_SIZE, hexPath, hexToPixel } from './hexGeometry';
import { type TileTheme } from './tileThemes';
import { tileThemeFor } from './resourceThemes';

interface HexTileSvgProps {
  tile: HexTile;
  isSelected: boolean;
  onSelect: (tileId: string) => void;
}

export default function HexTileSvg({ tile, isSelected, onSelect }: HexTileSvgProps) {
  const { x, y } = hexToPixel(tile.coordinate);
  const theme = tileThemeFor(tile);
  const pressOffset = isSelected ? 6 : 0;
  const path = hexPath(HEX_SIZE - 2);

  return (
    <g
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={`${theme.labelHebrew}, ${tile.isUnlocked ? `רמה ${tile.level}` : 'נעול'}`}
      className="group cursor-pointer outline-none"
      onClick={() => onSelect(tile.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(tile.id);
        }
      }}
    >
      {/* 3D base */}
      <path
        d={path}
        transform={`translate(0 ${tile.isUnlocked ? 8 : 8})`}
        className={tile.isUnlocked ? theme.base : 'fill-stone-400'}
        opacity={0.9}
      />
      {/* Face */}
      <path
        d={path}
        transform={`translate(0 ${pressOffset})`}
        className={`${tile.isUnlocked ? theme.face : 'fill-stone-300'} ${
          isSelected
            ? theme.stroke
            : 'stroke-white/70 group-hover:stroke-white'
        } transition-transform duration-100 group-hover:translate-y-[2px] group-active:translate-y-[6px]`}
        strokeWidth={3}
      />
      {isSelected && (
        <path
          d={path}
          transform={`translate(0 ${pressOffset})`}
          className="fill-none stroke-amber-500"
          strokeWidth={5}
        />
      )}
      <TileContents tile={tile} theme={theme} />
    </g>
  );
}

function TileContents({
  tile,
  theme,
}: {
  tile: HexTile;
  theme: TileTheme;
}) {
  if (!tile.isUnlocked) {
    return (
      <g className="pointer-events-none" transform="translate(0 2)">
        <circle r={20} className="fill-stone-100/90" />
        <foreignObject x={-14} y={-14} width={28} height={28}>
          <Lock className="h-7 w-7 text-stone-500" />
        </foreignObject>
        <foreignObject x={-13} y={16} width={26} height={26}>
          <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-[11px] font-black text-white shadow">
            ?
          </span>
        </foreignObject>
      </g>
    );
  }

  return (
    <g className="pointer-events-none" transform="translate(0 2)">
      <text
        textAnchor="middle"
        dominantBaseline="central"
        className="select-none text-[30px]"
      >
        {theme.emoji}
      </text>
      <foreignObject x={-18} y={12} width={36} height={24}>
        <span className="flex items-center justify-center gap-0.5 rounded-full bg-white/90 px-1 py-0.5 text-[11px] font-black text-stone-700 shadow">
          <Sparkles className="h-3 w-3 text-amber-500" />
          {tile.level}
        </span>
      </foreignObject>
    </g>
  );
}
