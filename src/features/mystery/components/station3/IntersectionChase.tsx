/**
 * Intersection chase - the barn window.
 *
 * ================================================================================================
 * WHAT IS BEING TAUGHT
 * ================================================================================================
 *
 * Two things travel the same line at different strides - the thief by 4, the dog by 6 - and the
 * child has to find where they meet. That is the FIRST COMMON MULTIPLE, here 12 (4 x 3 and 6 x 2).
 *
 * THE ANSWER IS A PLACE, NOT A COUNT, which is what distinguishes this from the ambush. Both
 * animals pass over plenty of numbers; the puzzle is pick the first one they pass over TOGETHER.
 * So both trails are drawn in full and the wrong gates are positions only one of them ever visits:
 *
 *   10  the dog never lands on it (6, 12, 18 ...) and neither does the thief (4, 8, 12 ...)
 *   12  both, and the first such - the answer
 *   16  the thief only
 *   20  the thief only
 *
 * ================================================================================================
 * THE TWO RUNNERS ARE ON PARALLEL PATHS, NOT THE SAME ONE
 * ================================================================================================
 *
 * Drawn on one line they would overlap every time they crossed and the child could not tell which
 * footprint was whose. So the thief runs ON the line and the dog runs ABOVE it, and their trails are
 * drawn as dashes in their own colours. The meeting point is then visible as the single x where both
 * trails reach, which is the whole idea made pictorial.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Station3Config } from '../../caseData';
import {
  CAPTURE_HOLD_MS,
  CHASE_PALETTE,
  LINE_Y,
  WRONG_FLASH_MS,
  intersectionTarget,
  warnIfChaseUnsolvable,
  xForValue,
} from '../../station3Geometry';
import PuzzleStage from '../PuzzleStage';
import { PropImage, PropLabel } from './ChaseProps';
import NumberLineTrack from './NumberLineTrack';

interface IntersectionChaseProps {
  config: Station3Config;
  solutionX: number;
  onComplete: () => void;
  onError: () => void;
}

/** The dog's stride. The case's fiction names it, and it is what makes the puzzle an LCM. */
const DOG_STEP = 6;

/** The dog's path, above the thief's, so both trails stay readable. */
const DOG_Y = LINE_Y - 0.1;

export default function IntersectionChase({
  config,
  solutionX,
  onComplete,
  onError,
}: IntersectionChaseProps) {
  /** The thief's stride is the child's answer from the notebook. */
  const thiefStep = solutionX;
  const target = useMemo(() => intersectionTarget(thiefStep, DOG_STEP), [thiefStep]);

  // A development guard: the runners' first meeting has to be a gate the child can actually close,
  // or the chase has no winning move. See `warnIfChaseUnsolvable`.
  useEffect(() => {
    warnIfChaseUnsolvable('common-multiple', target, config.options, solutionX);
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

  const choose = useCallback(
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

  /**
   * The landings of each runner, up to the far end of the line.
   *
   * DERIVED FROM THE STRIDE, so the trails drawn are exactly where each animal actually steps. The
   * `<= 30` bound is the line's own maximum; a stride that missed every multiple would give an empty
   * trail, which is the honest picture of a chase that never touches the line.
   */
  const thiefLandings = useMemo(() => {
    const out: number[] = [];
    for (let v = thiefStep; v <= 30; v += thiefStep) out.push(v);
    return out;
  }, [thiefStep]);

  const dogLandings = useMemo(() => {
    const out: number[] = [];
    for (let v = DOG_STEP; v <= 30; v += DOG_STEP) out.push(v);
    return out;
  }, []);

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
        <g data-testid="intersection-board">
          <NumberLineTrack
            marks={config.options}
            selected={picked}
            missed={[]}
          >
            {/*
              THE DOG'S LANE.
              A faint rail above the number line, so the child can see the dog is running a parallel
              course rather than a different kind of thing. Without it the dog's trail floats.
            */}
            <line
              x1={xForValue(0) - 0.022}
              y1={DOG_Y}
              x2={xForValue(30) + 0.022}
              y2={DOG_Y}
              stroke="rgba(148, 163, 184, 0.5)"
              strokeWidth={2}
              strokeDasharray="3 5"
              vectorEffect="non-scaling-stroke"
            />

            {/* ---- The thief's landings, on the line. ---- */}
            {thiefLandings.map((value) => (
              <ellipse
                key={`thief-${value}`}
                cx={xForValue(value)}
                cy={LINE_Y}
                rx={0.013}
                ry={0.013 / 1.792}
                fill={CHASE_PALETTE.active}
                data-testid={`thief-step-${value}`}
              />
            ))}

            {/* ---- The dog's landings, in its own lane. ---- */}
            {dogLandings.map((value) => (
              <ellipse
                key={`dog-${value}`}
                cx={xForValue(value)}
                cy={DOG_Y}
                rx={0.013}
                ry={0.013 / 1.792}
                fill="#f9a8d4"
                data-testid={`dog-step-${value}`}
              />
            ))}

            {/*
              THE MEETING POINT IS MARKED ONLY ON SUCCESS, and that restraint is the puzzle. Marking
              every shared landing up front would hand the child the answer, since 12 is the first
              one; the trails alone show it to a child willing to compare the two rows of dots.
            */}
            {phase === 'right' && (
              <g data-testid="meeting-point">
                <line
                  x1={xForValue(target)}
                  y1={DOG_Y - 0.035}
                  x2={xForValue(target)}
                  y2={LINE_Y + 0.02}
                  stroke={CHASE_PALETTE.success}
                  strokeWidth={3}
                  strokeDasharray="5 4"
                  vectorEffect="non-scaling-stroke"
                />
                {/* The two runners, arriving together at the gate. */}
                <g className="motion-safe:animate-[runnerArrive_.4s_ease-out]">
                  <PropImage asset="medalcat.png" cx={xForValue(target)} cy={LINE_Y - 0.048} width={0.05} aspect={1.792} />
                  <PropImage asset="medalsheep.png" cx={xForValue(target)} cy={DOG_Y - 0.042} width={0.045} aspect={1.792} />
                </g>
              </g>
            )}

            {/* ---- The candidate gates. ---- */}
            {config.options.map((value) => {
              const x = xForValue(value);
              const isTarget = value === target;
              const isPicked = picked === value;
              const isCaught = phase === 'right' && isTarget;
              const isMissed = phase === 'wrong' && isPicked;
              const stroke = isCaught
                ? CHASE_PALETTE.success
                : isMissed
                  ? CHASE_PALETTE.error
                  : isPicked
                    ? CHASE_PALETTE.active
                    : '#cbd5e1';

              return (
                <g
                  key={value}
                  className="cursor-pointer"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    choose(value);
                  }}
                  data-testid={`gate-${value}`}
                  data-target={isTarget ? 'true' : 'false'}
                  role="button"
                  tabIndex={0}
                  aria-label={`סגירת שער במספר ${value}`}
                  aria-pressed={picked === value}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      choose(value);
                    }
                  }}
                >
                  {/* A generous target spanning both lanes, since the gate does in the fiction. */}
                  <rect
                    x={x - 0.035}
                    y={DOG_Y - 0.09}
                    width={0.07}
                    height={LINE_Y - DOG_Y + 0.13}
                    fill="transparent"
                    pointerEvents="all"
                  />
                  {/*
                    A GATE, NOT A SIGNPOST - two posts with a beam across both lanes, so it visually
                    spans the thief's path and the dog's. That is what makes "they arrive together
                    here" a thing the child can see rather than infer.
                  */}
                  <line
                    x1={x}
                    y1={DOG_Y - 0.055}
                    x2={x}
                    y2={LINE_Y + 0.012}
                    stroke={stroke}
                    strokeWidth={4}
                    vectorEffect="non-scaling-stroke"
                    className={isCaught ? 'motion-safe:animate-[gateClose_.5s_ease-out]' : ''}
                    style={{ transformOrigin: `${x}px ${LINE_Y}px` }}
                  />
                  <line
                    x1={x - 0.03}
                    y1={DOG_Y - 0.055}
                    x2={x + 0.03}
                    y2={DOG_Y - 0.055}
                    stroke={stroke}
                    strokeWidth={4}
                    vectorEffect="non-scaling-stroke"
                  />
                  <line
                    x1={x - 0.03}
                    y1={LINE_Y + 0.012}
                    x2={x + 0.03}
                    y2={LINE_Y + 0.012}
                    stroke={stroke}
                    strokeWidth={4}
                    vectorEffect="non-scaling-stroke"
                  />
                  <PropLabel
                    cx={x}
                    cy={DOG_Y - 0.085}
                    value={value}
                    tone={isCaught ? 'correct' : isMissed ? 'wrong' : isPicked ? 'active' : 'idle'}
                  />
                </g>
              );
            })}

            {/* The net across the gate, once the child has found the meeting point. */}
            {phase === 'right' && (
              <g data-testid="intersection-net" className="motion-safe:animate-[netDrop_.45s_ease-in]">
                <PropImage
                  asset="net2.png"
                  cx={xForValue(target)}
                  cy={DOG_Y - 0.075}
                  width={0.09}
                  aspect={1.792}
                />
                <text
                  x={xForValue(target)}
                  y={DOG_Y - 0.125}
                  textAnchor="middle"
                  fontSize="0.04"
                  fontWeight="900"
                  fill={CHASE_PALETTE.success}
                >
                  פגשו זה את זה!
                </text>
              </g>
            )}

            {/* ---- Lane labels, so the two trails are attributable. ---- */}
            <text
              x={xForValue(0) - 0.045}
              y={DOG_Y + 0.008}
              textAnchor="middle"
              fontSize="0.03"
              fontWeight="900"
              fill="#f9a8d4"
            >
              כלב
            </text>
            <text
              x={xForValue(0) - 0.045}
              y={LINE_Y + 0.01}
              textAnchor="middle"
              fontSize="0.03"
              fontWeight="900"
              fill={CHASE_PALETTE.active}
            >
              גנב
            </text>
          </NumberLineTrack>
        </g>
      )}
    </PuzzleStage>
  );
}
