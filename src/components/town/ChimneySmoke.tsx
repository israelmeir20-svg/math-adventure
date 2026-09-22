/**
 * Chimney smoke drifting from the illustrated bakery on the town map.
 *
 * Each puff carries its own inline horizontal drift so the plume fans out
 * instead of rising in a single column.
 */
const CHIMNEY = { x: 61, y: 38 };
const PUFF_COUNT = 3;
const PUFF_STAGGER = 1.4;

export default function ChimneySmoke() {
  return (
    <div className="absolute" style={{ left: `${CHIMNEY.x}%`, top: `${CHIMNEY.y}%` }}>
      {Array.from({ length: PUFF_COUNT }, (_, index) => (
        <span
          key={index}
          className="absolute block h-4 w-4 rounded-full bg-white/80 ring-1 ring-stone-300/60 shadow-md animate-[smoke_4.2s_ease-out_infinite] motion-reduce:animate-none"
          style={
            {
              '--puff-x': `${index * 5 - 5}px`,
              animationDelay: `${(index * PUFF_STAGGER).toFixed(2)}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
