import { useState } from 'react';
import type { Station1Config } from '../../caseData';
import { asSymmetry } from '../../station1Geometry';
import { assetFor } from '../../mysteryAssets';

interface SymmetryPuzzleProps {
  config: Station1Config;
  onComplete: () => void;
  onError: () => void;
}

/**
 * NOTE ON THE TWO DEVIATIONS FROM THE PASTED VERSION:
 *
 * 1. `Station1Config` is a TYPE-ONLY import and `data` is narrowed through `asSymmetry`. A bare
 *    `config.data.leftActiveCoords` does not compile - `Station1Data` is a discriminated union, so
 *    `leftActiveCoords` only exists on the `symmetry` variant, and reading it unguarded is exactly
 *    the mistake the union was introduced to prevent (a tray case would render an empty grid in
 *    front of a child rather than failing). The narrowing is a single call and the markup and the
 *    click logic below are untouched.
 * 2. The component is a DEFAULT export, because that is what `Station1Scene` imports it as - a
 *    named-only export breaks the dispatcher at build time.
 */
export default function SymmetryPuzzle({ config, onComplete, onError }: SymmetryPuzzleProps) {
  const leftClues: { r: number; c: number }[] = asSymmetry(config)?.leftActiveCoords ?? [];
  const [revealedRight, setRevealedRight] = useState<Set<string>>(new Set());
  const [wrongCell, setWrongCell] = useState<string | null>(null);
  const [isSolved, setIsSolved] = useState(false);

  const handleRightCellClick = (r: number, c: number) => {
    if (isSolved || revealedRight.has(`${r},${c}`)) return;

    // Check symmetry: target column on left is (5 - c)
    const isMatch = leftClues.some(clue => clue.r === r && clue.c === 5 - c);

    if (isMatch) {
      const nextRevealed = new Set(revealedRight);
      nextRevealed.add(`${r},${c}`);
      setRevealedRight(nextRevealed);

      if (nextRevealed.size === leftClues.length) {
        setIsSolved(true);
        setTimeout(() => {
          onComplete();
        }, 1200);
      }
    } else {
      setWrongCell(`${r},${c}`);
      onError();
      setTimeout(() => {
        setWrongCell(null);
      }, 400);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4">
      {/* Medallion Frame */}
      <div className="relative w-full max-w-[480px] aspect-square rounded-2xl overflow-hidden shadow-2xl bg-slate-950 border-4 border-amber-900/50 select-none">
        
        {/* Layer 1: Medallion Image */}
        <img
          src={assetFor(config.bgAsset)}
          alt="Medallion"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Layer 2: Center Mirror Axis */}
        <div
          className={`absolute top-0 bottom-0 left-1/2 w-1 -translate-x-1/2 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] z-20 pointer-events-none transition-opacity duration-500 ${
            isSolved ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {/* Layer 3: 6x6 CSS Grid */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 z-10 p-1 gap-1">
          {Array.from({ length: 6 }).map((_, r) =>
            Array.from({ length: 6 }).map((_, c) => {
              const isLeft = c < 3;
              const cellKey = `${r},${c}`;

              if (isLeft) {
                const isClue = leftClues.some(clue => clue.r === r && clue.c === c);

                if (isClue) {
                  // Transparent clue window
                  return (
                    <div
                      key={cellKey}
                      className="border-2 border-amber-400 bg-amber-400/10 shadow-[inset_0_0_12px_rgba(245,158,11,0.3)] rounded-md"
                    />
                  );
                }

                // Covered tile on left
                return (
                  <div
                    key={cellKey}
                    className={`bg-slate-950/85 border border-slate-800 rounded-md transition-opacity duration-700 ${
                      isSolved ? 'opacity-0' : 'opacity-100'
                    }`}
                  />
                );
              }

              // Right side
              const isRevealed = revealedRight.has(cellKey);
              const isWrong = wrongCell === cellKey;

              if (isRevealed) {
                // Revealed symmetrical cell
                return (
                  <div
                    key={cellKey}
                    className="border-2 border-emerald-400 bg-emerald-400/10 shadow-[inset_0_0_12px_rgba(16,185,129,0.3)] rounded-md flex items-center justify-center text-emerald-400 font-bold"
                  >
                    ✓
                  </div>
                );
              }

              // Covered interactive tile on right
              return (
                <button
                  type="button"
                  key={cellKey}
                  onClick={() => handleRightCellClick(r, c)}
                  className={`rounded-md transition-all duration-200 cursor-pointer ${
                    isWrong
                      ? 'bg-red-600/90 border-2 border-red-400 scale-95'
                      : 'bg-slate-950/85 hover:bg-slate-800/90 border border-slate-700/60'
                  } ${isSolved ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                />
              );
            })
          )}
        </div>

        {/* Solved Banner */}
        {isSolved && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-all">
            <span className="bg-amber-500 text-slate-950 font-bold text-xl px-6 py-2 rounded-full shadow-lg border-2 border-white">
              שיקוף מושלם!
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
