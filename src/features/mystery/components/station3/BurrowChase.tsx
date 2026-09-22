/**
 * Burrow chase - the strawberry patch.
 *
 * ================================================================================================
 * WHAT IS BEING TAUGHT
 * ================================================================================================
 *
 * `17 = 5 x 3 + 2`. Seventeen strawberries were stolen into full baskets of three, and two were
 * dropped on the way - so the thief made five full trips, and the burrow is fifteen steps along.
 *
 * THE REMAINDER IS THE WHOLE PUZZLE, and the child has to notice it. `17 / 3` does not divide
 * evenly, and the two spilled berries are the clue that the leftovers are accounted for: five
 * baskets, not six. A child who rounds 17 up to 18 picks the burrow at 18 and finds nothing, which
 * is why 18 is one of the options.
 *
 * ================================================================================================
 * THE BASKETS ARE SHOWN, NOT JUST THE NUMBERS
 * ================================================================================================
 *
 * Five basket icons are drawn along the line at 3, 6, 9, 12 and 15, with the two spilled berries
 * sitting between 15 and 18 - so the division is visible as a picture rather than as a sum the child
 * has to trust. The burrow they are hunting is then simply the LAST basket's position, which is what
 * `floor(15 / 3) * 3` computes and why the arithmetic and the drawing cannot disagree.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Station3Config } from '../../caseData';
import {
  CAPTURE_HOLD_MS,
  CHASE_PALETTE,
  LINE_Y,
  WRONG_FLASH_MS,
  burrowTarget,
  warnIfChaseUnsolvable,
  xForValue,
} from '../../station3Geometry';
import PuzzleStage from '../PuzzleStage';
import { PropImage, PropLabel } from './ChaseProps';
import NumberLineTrack from './NumberLineTrack';

interface BurrowChaseProps {
  config: Station3Config;
  solutionX: number;
  onComplete: () => void;
  onError: () => void;
}

/** The berries stolen, and the two that were dropped - the case's own story. */
const STOLEN = 17;
const SPILLED = 2;

export default function BurrowChase({ config, solutionX, onComplete, onError }: BurrowChaseProps) {
  const target = useMemo(() => burrowTarget(solutionX, STOLEN, SPILLED), [solutionX]);
  /** How many full baskets the thief filled. */
  const baskets = useMemo(() => Math.floor((STOLEN - SPILLED) / solutionX), [solutionX]);

  // A development guard: if the division lands somewhere the case offers no burrow, the child has
  // nothing correct to dig. See `warnIfChaseUnsolvable`.
  useEffect(() => {
    warnIfChaseUnsolvable('burrow', target, config.options, solutionX);
  }, [target, config.options, solutionX]);

  const [picked, setPicked] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'wrong' | 'right'>('idle');
  const timersRef = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const id of timersRef.current) window.clearTimeout(id);
    },
    [],
  );

  const dig = useCallback(
    (value: number) => {
      if (phase !== 'idle') return;
      setPicked(value);

      if (value === target) {
        setPhase('right');
        timersRef.current.push(window.setTimeout(() => onComplete(), CAPTURE_HOLD_MS + 500));
        return;
      }

      setPhase('wrong');
      onError();
      timersRef.current.push(
        window.setTimeout(() => {
          setPhase('idle');
          setPicked(null);
        }, WRONG_FLASH_MS + 320),
      );
    },
    [phase, target, onComplete, onError],
  );

  /** The basket positions: one per full trip, so they land at multiples of the basket size. */
  const basketAt = useMemo(
    () => Array.from({ length: baskets }, (_, i) => (i + 1) * solutionX),
    [baskets, solutionX],
  );

  return (
    <PuzzleStage
      bgAsset="path.jpeg"
      aspect={1.792}
      bgAlt="שביל העפר"
      testId="station3-stage"
      className={
        phase === 'wrong'
          ? 'motion-safe:animate-[puzzleShake_.4s_ease-in-out] ring-4 ring-red-400'
          : phase === 'right'
            ? 'ring-4 ring-green-400'
            : ''
      }
    >
      {() => (
        <g data-testid="burrow-board">
          <NumberLineTrack
            marks={config.options}
            selected={picked}
            missed={[]}
          >
            {/*
              THE BASKET TRAIL.
              One basket per completed trip, so the child can count the division rather than perform
              it: three berries per basket, five baskets, and the last one is where he went to ground.
            */}
            {basketAt.map((value, index) => {
              const x = xForValue(value);
              return (
                <g key={`basket-${value}`} data-testid={`basket-${value}`}>
                  <ellipse
                    cx={x}
                    cy={LINE_Y - 0.042}
                    rx={0.019}
                    ry={0.019 / 1.792}
                    fill="rgba(190, 90, 20, 0.95)"
                    stroke="#fde68a"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={x}
                    y={LINE_Y - 0.042 + 0.007}
                    textAnchor="middle"
                    fontSize="0.022"
                    fontWeight="900"
                    fill="#fff7ed"
                  >
                    {solutionX}
                  </text>
                  {/* A tick down to the line, so the basket's position is unambiguous. */}
                  <line
                    x1={x}
                    y1={LINE_Y - 0.024}
                    x2={x}
                    y2={LINE_Y}
                    stroke="rgba(253, 230, 138, 0.8)"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={x}
                    y={LINE_Y - 0.068}
                    textAnchor="middle"
                    fontSize="0.019"
                    fontWeight="900"
                    fill="#fde68a"
                  >
                    סל {index + 1}
                  </text>
                </g>
              );
            })}

            {/*
              THE TWO SPILLED BERRIES.
              Drawn BETWEEN the last basket and the next one - the visual remainder. Their position is
              the point: they are why the answer is not 18, and a child who counts them sees the
              division stop short.
            */}
            <g data-testid="spilled">
              {[0, 1].map((i) => (
                <g key={i}>
                  <circle
                    cx={xForValue(target) + 0.026 + i * 0.026}
                    cy={LINE_Y + 0.028}
                    r={0.011}
                    fill="#ef4444"
                    stroke="#fecaca"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={xForValue(target) + 0.026 + i * 0.026}
                    y={LINE_Y + 0.032}
                    textAnchor="middle"
                    fontSize="0.016"
                    fontWeight="900"
                    fill="#ffffff"
                  >
                    🍓
                  </text>
                </g>
              ))}
              <text
                x={xForValue(target) + 0.052}
                y={LINE_Y + 0.062}
                textAnchor="middle"
                fontSize="0.02"
                fontWeight="900"
                fill="#fecaca"
              >
                2 נשמטו
              </text>
            </g>

            {/* ---- The candidate burrows. ---- */}
            {config.options.map((value) => {
              const x = xForValue(value);
              const isTarget = value === target;
              const isPicked = picked === value;
              const isCaught = phase === 'right' && isTarget;
              const isMissed = phase === 'wrong' && isPicked;

              return (
                <g
                  key={value}
                  className="cursor-pointer"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    dig(value);
                  }}
                  data-testid={`burrow-${value}`}
                  data-target={isTarget ? 'true' : 'false'}
                  role="button"
                  tabIndex={0}
                  aria-label={`חפירה במחילה במספר ${value}`}
                  aria-pressed={picked === value}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      dig(value);
                    }
                  }}
                >
                  {/* The whole mound is the target - digging is a gesture at a place, not a plate. */}
                  <rect
                    x={x - 0.035}
                    y={LINE_Y - 0.055}
                    width={0.07}
                    height={0.1}
                    fill="transparent"
                    pointerEvents="all"
                  />
                  <g className={isMissed ? 'motion-safe:animate-[burrowDig_.5s_ease-in-out]' : ''}>
                    <PropImage
                      asset="burrow.png"
                      cx={x}
                      cy={LINE_Y + 0.02}
                      width={0.075}
                      aspect={1.792}
                      opacity={isMissed ? 0.5 : 1}
                    />
                  </g>
                  <PropLabel
                    cx={x}
                    cy={LINE_Y - 0.078}
                    value={value}
                    tone={isCaught ? 'correct' : isMissed ? 'wrong' : isPicked ? 'active' : 'idle'}
                  />
                </g>
              );
            })}

            {/*
              THE REVEAL. The thief, dug out of the burrow with his sacks - the strawberries are
              recovered, which is the case's resolution and the reason the child was counting.
            */}
            {phase === 'right' && (
              <g data-testid="burrow-reveal" className="motion-safe:animate-[keyRise_.55s_ease-out]">
                <PropImage
                  asset="medalcow.png"
                  cx={xForValue(target)}
                  cy={LINE_Y - 0.085}
                  width={0.07}
                  aspect={1.792}
                />
                <text
                  x={xForValue(target)}
                  y={LINE_Y - 0.15}
                  textAnchor="middle"
                  fontSize="0.038"
                  fontWeight="900"
                  fill={CHASE_PALETTE.success}
                >
                  {baskets} סלים מלאים · {target} ✓
                </text>
              </g>
            )}
          </NumberLineTrack>
        </g>
      )}
    </PuzzleStage>
  );
}
