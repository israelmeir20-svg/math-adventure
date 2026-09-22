import { useState } from 'react';
import type { Station1Config } from '../../caseData';
import { asWindow } from '../../station1Geometry';
import { assetFor } from '../../mysteryAssets';

interface WindowPuzzleProps {
  config: Station1Config;
  onComplete: () => void;
  onError: () => void;
}

interface ShardOption {
  id: number;
  vertices: number;
  area: number;
  /*
   * A `string`, NOT the `'triangle' | 'trapezoid' | 'rectangle'` union this used to be.
   *
   * `options` can now come from `config.data`, where `caseData.ts` declares the field as `string`
   * - and it has to, because the shard list is authored data, not a closed set the compiler can
   * check. Narrowing the prop alone would make the fallback assignable and the real case data not,
   * which is backwards. The union bought nothing here anyway: the silhouette is chosen by a chain
   * of `===` comparisons below, and an unrecognised `type` simply renders no picture, which is the
   * correct outcome for authored data that does not match any known shard.
   */
  type: string;
  correct?: boolean;
}

export default function WindowPuzzle({
  config,
  onComplete,
  onError,
}: WindowPuzzleProps) {
  const options: ShardOption[] = asWindow(config)?.options || [
    { id: 1, vertices: 3, area: 12, type: 'triangle' },
    { id: 2, vertices: 4, area: 10, type: 'trapezoid' },
    { id: 3, vertices: 4, area: 12, type: 'rectangle', correct: true },
  ];

  const [selectedShard, setSelectedShard] = useState<ShardOption | null>(null);
  const [isSolved, setIsSolved] = useState(false);
  const [wrongId, setWrongId] = useState<number | null>(null);

  const handleShardSelect = (shard: ShardOption) => {
    if (isSolved || wrongId !== null) return;

    setSelectedShard(shard);

    if (shard.correct) {
      setIsSolved(true);
      setTimeout(() => {
        onComplete();
      }, 1200);
    } else {
      setWrongId(shard.id);
      onError();
      setTimeout(() => {
        setWrongId(null);
        setSelectedShard(null);
      }, 600);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between w-full h-full p-2 max-w-4xl mx-auto select-none">
      
      {/* 1. Main Barn Window Stage */}
      <div className="relative w-full aspect-[4/3] max-h-[64vh] rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-950/80 bg-stone-950">
        
        {/* Background Artwork */}
        <img
          src={assetFor(config.bgAsset)}
          alt="Barn Window"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* 2. Centered Glass Hole & Stress Cracks (Centered in opening: left 42%, width 16%) */}
        <div 
          className="absolute pointer-events-none transition-all duration-500"
          style={{
            top: '44%',
            left: '42%',
            width: '16%',
            height: '24%',
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            {!isSolved && (
              <>
                {/* Corner Stress Cracks */}
                <g stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.5" strokeLinecap="round" fill="none">
                  <path d="M 6 6 L -14 -12 M 6 6 L -4 -18 M 6 6 L -18 4" />
                  <path d="M 94 6 L 114 -10 M 94 6 L 104 -18 M 94 6 L 118 6" />
                  <path d="M 6 94 L -12 112 M 6 94 L -4 118 M 6 94 L -18 96" />
                  <path d="M 94 94 L 112 112 M 94 94 L 102 118 M 94 94 L 116 96" />
                </g>

                {/* Jagged Void Opening */}
                <polygon
                  points="6,6 35,4 70,8 94,6 92,45 95,72 94,94 60,92 30,95 6,94 8,55 5,28"
                  fill="rgba(15, 23, 42, 0.45)"
                  stroke="rgba(255, 255, 255, 0.9)"
                  strokeWidth="2"
                  filter="drop-shadow(0 0 4px rgba(255,255,255,0.5))"
                />

                {/* Internal 3x4 Etched Measurement Grid */}
                <g stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.9" strokeDasharray="2,2">
                  <line x1="35" y1="6" x2="35" y2="94" />
                  <line x1="65" y1="6" x2="65" y2="94" />
                  <line x1="6" y1="28" x2="94" y2="28" />
                  <line x1="6" y1="50" x2="94" y2="50" />
                  <line x1="6" y1="72" x2="94" y2="72" />
                </g>
              </>
            )}

            {/* Solved State: Reconstructed Pane */}
            {isSolved && (
              <g className="animate-fade-in">
                <rect
                  x="6"
                  y="6"
                  width="88"
                  height="88"
                  rx="3"
                  fill="rgba(34, 211, 238, 0.3)"
                  stroke="#38BDF8"
                  strokeWidth="3"
                  filter="drop-shadow(0 0 15px rgba(56,189,248,0.9))"
                />
                <polygon points="16,6 40,6 18,94 6,94" fill="rgba(255, 255, 255, 0.35)" />
                <text
                  x="50"
                  y="58"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="28"
                  fontWeight="900"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))"
                >
                  ✓
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* 3. Bottom Wooden Sill with Tangible Glass Shards */}
      <div className="w-full mt-2 bg-stone-900/95 backdrop-blur-md border border-amber-900/50 rounded-2xl p-3 shadow-xl">
        <div className="text-center text-amber-200/90 text-xs md:text-sm font-semibold mb-2">
          איזה שבר זכוכית ימלא בדיוק את החלון השבור? (לחצי על השבר להתקנה)
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto">
          {options.map((shard) => {
            const isSelected = selectedShard?.id === shard.id;
            const isWrong = wrongId === shard.id;

            return (
              <button
                type="button"
                key={shard.id}
                onClick={() => handleShardSelect(shard)}
                disabled={isSolved}
                className={`relative flex flex-col items-center justify-between p-2.5 rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                  isSelected && isSolved
                    ? 'border-emerald-400 bg-emerald-950/70 scale-105 shadow-[0_0_15px_rgba(52,211,153,0.5)]'
                    : isWrong
                    ? 'border-red-500 bg-red-950/70 scale-95 motion-safe:animate-[puzzleShake_.4s_ease-in-out]'
                    : 'border-amber-700/60 bg-stone-800/90 hover:bg-stone-700 hover:border-amber-400 hover:-translate-y-1 shadow-md'
                }`}
              >
                {/* SVG Real Glass Shard Artifact */}
                <div className="w-20 h-16 flex items-center justify-center my-1">
                  {shard.type === 'triangle' && (
                    <svg viewBox="0 0 60 50" className="w-full h-full filter drop-shadow">
                      <polygon
                        points="30,6 54,44 6,44"
                        fill="rgba(56, 189, 248, 0.25)"
                        stroke="rgba(255, 255, 255, 0.9)"
                        strokeWidth="1.8"
                      />
                      <polygon points="30,6 38,6 18,44 6,44" fill="rgba(255, 255, 255, 0.2)" />
                      <circle cx="30" cy="6" r="3" fill="#F59E0B" />
                      <circle cx="54" cy="44" r="3" fill="#F59E0B" />
                      <circle cx="6" cy="44" r="3" fill="#F59E0B" />
                    </svg>
                  )}

                  {shard.type === 'trapezoid' && (
                    <svg viewBox="0 0 60 50" className="w-full h-full filter drop-shadow">
                      <polygon
                        points="16,10 44,10 54,42 6,42"
                        fill="rgba(56, 189, 248, 0.25)"
                        stroke="rgba(255, 255, 255, 0.9)"
                        strokeWidth="1.8"
                      />
                      <polygon points="16,10 24,10 14,42 6,42" fill="rgba(255, 255, 255, 0.2)" />
                      <circle cx="16" cy="10" r="3" fill="#F59E0B" />
                      <circle cx="44" cy="10" r="3" fill="#F59E0B" />
                      <circle cx="54" cy="42" r="3" fill="#F59E0B" />
                      <circle cx="6" cy="42" r="3" fill="#F59E0B" />
                    </svg>
                  )}

                  {shard.type === 'rectangle' && (
                    <svg viewBox="0 0 60 50" className="w-full h-full filter drop-shadow">
                      <rect
                        x="12"
                        y="6"
                        width="36"
                        height="40"
                        rx="2"
                        fill="rgba(56, 189, 248, 0.25)"
                        stroke="rgba(255, 255, 255, 0.9)"
                        strokeWidth="1.8"
                      />
                      <g stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.8">
                        <line x1="24" y1="6" x2="24" y2="46" />
                        <line x1="36" y1="6" x2="36" y2="46" />
                        <line x1="12" y1="16" x2="48" y2="16" />
                        <line x1="12" y1="26" x2="48" y2="26" />
                        <line x1="12" y1="36" x2="48" y2="36" />
                      </g>
                      <polygon points="18,6 26,6 14,46 12,46" fill="rgba(255, 255, 255, 0.25)" />
                      <circle cx="12" cy="6" r="3" fill="#F59E0B" />
                      <circle cx="48" cy="6" r="3" fill="#F59E0B" />
                      <circle cx="48" cy="46" r="3" fill="#F59E0B" />
                      <circle cx="12" cy="46" r="3" fill="#F59E0B" />
                    </svg>
                  )}
                </div>

                {/* Math Specs */}
                <div className="text-center leading-tight mt-1">
                  <span className="block text-amber-100 font-bold text-xs">
                    {shard.vertices} קודקודים
                  </span>
                  <span className="block text-amber-300 font-semibold text-[11px]">
                    שטח: {shard.area}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
