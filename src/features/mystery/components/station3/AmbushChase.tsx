/**
 * Ambush chase - the honeycomb heist.
 *
 * ================================================================================================
 * WHAT IS BEING TAUGHT
 * ================================================================================================
 *
 * The thief moves in equal leaps, and the child has to work out WHERE he will be after a known
 * number of them. `solutionX` is the leap and `totalSteps` is how many he takes, so the ambush
 * belongs at `solutionX * totalSteps` - here 6 x 4 = 24.
 *
 * THE SIGNPOSTS ARE DELIBERATELY NOT ALL MULTIPLES OF SIX. The options are 18, 20, 24 and 30, so two
 * of them are on the thief's path (18 and 24) and two are not (20 and 30). A child who reasons
 * "somewhere in that region" picks 20 or 30 and misses; one who counts the leaps lands on 24. That
 * is why the wrong options are close rather than absurd - the puzzle tests whether the multiplication
 * was done, not whether the child can spot an obvious outlier.
 *
 * ================================================================================================
 * THE LEAPS ARE PARABOLAS, AND THE ANIMATION SHOWS THE COUNTING
 * ================================================================================================
 *
 * Each leap is an arc (`Q`) rather than a straight slide, and the arcs are drawn in sequence as the
 * thief makes them. Watching four arcs land on 6, 12, 18 and 24 is the multiplication made visible -
 * the child is not told the answer, they watch it arrive. The arcs remain on screen afterwards as a
 * record of the path, which is what makes a missed guess debuggable.
 *
 * ================================================================================================
 * THE NET IS DEPLOYED WHERE THE CHILD SAYS, NOT WHERE THE ANSWER IS
 * ================================================================================================
 *
 * On a wrong choice the thief leaps PAST the net, because that is what would actually happen and
 * because it shows the child their net was in the wrong place rather than simply refusing the
 * answer. The post stays planted with the net dangling, so the mistake is visible on the board.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Station3Config } from '../../caseData';
import {
  CAPTURE_HOLD_MS,
  CHASE_PALETTE,
  LEAP_MS,
  LINE_Y,
  WRONG_FLASH_MS,
  ambushTarget,
  warnIfChaseUnsolvable,
  xForValue,
} from '../../station3Geometry';
import PuzzleStage from '../PuzzleStage';
import { PropImage, PropLabel } from './ChaseProps';
import NumberLineTrack from './NumberLineTrack';

interface AmbushChaseProps {
  config: Station3Config;
  solutionX: number;
  onComplete: () => void;
  onError: () => void;
}

export default function AmbushChase({ config, solutionX, onComplete, onError }: AmbushChaseProps) {
  const target = useMemo(
    () => ambushTarget(solutionX, config.totalSteps),
    [solutionX, config.totalSteps],
  );
  /** How many leaps the thief takes before the ambush is sprung. */
  const steps = config.totalSteps ?? 4;

  // A development guard: if the case's options do not include the leap count's landing, the ambush
  // is unwinnable and the board would simply never grant a win. See `warnIfChaseUnsolvable`.
  useEffect(() => {
    warnIfChaseUnsolvable('ambush', target, config.options, solutionX);
  }, [target, config.options, solutionX]);

  /** How many leaps have been drawn so far. Drives both the arcs and the thief's position. */
  const [leaps, setLeaps] = useState(0);
  const [nestValue, setNestValue] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'wrong' | 'right'>('idle');
  /** A wrong post stays on the line with its net down, so the mistake is legible. */
  const [spent, setSpent] = useState<number | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const id of timersRef.current) window.clearTimeout(id);
    },
    [],
  );

  /**
   * Runs the thief through every leap, then settles.
   *
   * THE TIMERS RATHER THAN A CSS ANIMATION, because the arcs are drawn progressively and the thief's
   * position is derived from `leaps`. A single keyframe would animate the thief without leaving the
   * arc behind, and the visible trail is most of what this puzzle teaches.
   */
  useEffect(() => {
    const ids: number[] = [];
    for (let i = 1; i <= steps; i += 1) {
      ids.push(window.setTimeout(() => setLeaps(i), i * (LEAP_MS + 90)));
    }
    timersRef.current.push(...ids);
    return () => {
      for (const id of ids) window.clearTimeout(id);
    };
  }, [steps]);

  const deploy = useCallback(
    (value: number) => {
      if (phase !== 'idle') return;
      setNestValue(value);

      if (value === target) {
        setPhase('right');
        timersRef.current.push(window.setTimeout(() => onComplete(), CAPTURE_HOLD_MS + LEAP_MS));
        return;
      }

      setSpent(value);
      setPhase('wrong');
      onError();
      timersRef.current.push(
        window.setTimeout(() => {
          setPhase('idle');
          setNestValue(null);
        }, WRONG_FLASH_MS + 300),
      );
    },
    [phase, target, onComplete, onError],
  );

  // The thief's x: where he is after the leaps drawn so far.
  const thiefValue = Math.min(leaps * solutionX, steps * solutionX);
  const thiefX = xForValue(thiefValue);
  const startX = xForValue(0);

  /** The arcs, one per leap taken. Each is a parabola from the previous landing to the next. */
  const arcs = Array.from({ length: leaps }, (_, i) => {
    const from = xForValue(i * solutionX);
    const to = xForValue((i + 1) * solutionX);
    const mid = (from + to) / 2;
    // The apex is fixed in stage units rather than scaled by the leap's width, so a long leap is a
    // flatter arc and a short one steeper - which is how a real jump reads.
    const apex = LINE_Y - 0.075;
    return { d: `M ${from} ${LINE_Y} Q ${mid} ${apex} ${to} ${LINE_Y}`, key: i };
  });

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
        <g data-testid="ambush-board">
          <NumberLineTrack
            marks={config.options}
            selected={nestValue}
            missed={spent !== null ? [spent] : []}
          >
            {/* ---- The leap arcs, behind the thief so he reads as travelling along them. ---- */}
            {arcs.map((arc) => (
              <path
                key={arc.key}
                d={arc.d}
                fill="none"
                stroke={phase === 'right' ? CHASE_PALETTE.success : CHASE_PALETTE.active}
                strokeWidth={2.5}
                strokeDasharray="7 6"
                opacity={0.85}
                vectorEffect="non-scaling-stroke"
                className="motion-safe:animate-[trailIn_.3s_ease-out]"
                data-testid={`leap-arc-${arc.key}`}
              />
            ))}

            {/* ---- The signposts. ---- */}
            {config.options.map((value) => {
              const x = xForValue(value);
              const isSpent = spent === value;
              const isCaught = phase === 'right' && value === target;
              return (
                <g
                  key={value}
                  className="cursor-pointer"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    deploy(value);
                  }}
                  data-testid={`signpost-${value}`}
                  data-target={value === target ? 'true' : 'false'}
                  /*
                   * EXPOSED AS A BUTTON, NOT LEFT AS A BARE GROUP.
                   * Without a role these click targets are invisible to the accessibility tree - a
                   * screen reader would announce the whole stage as one picture and the child could
                   * not reach any of the four posts. `aria-label` spells out what the number means
                   * rather than reading "18" bare, since on its own it is just a digit.
                   */
                  role="button"
                  tabIndex={0}
                  aria-label={`הצבת רשת על מספר ${value}`}
                  aria-pressed={nestValue === value}
                  onKeyDown={(e) => {
                    // Keyboard parity with the pointer: Enter or Space springs the trap.
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      deploy(value);
                    }
                  }}
                >
                  {/*
                    A generous transparent target. The post is thin and the plate is small, and a
                    child aiming at a signpost on a phone should not have to hit either exactly.
                  */}
                  <rect
                    x={x - 0.05}
                    y={LINE_Y - 0.19}
                    width={0.1}
                    height={0.22}
                    fill="transparent"
                    pointerEvents="all"
                  />
                  <PropImage
                    asset="signpost.png"
                    cx={x}
                    cy={LINE_Y - 0.1}
                    width={0.075}
                    aspect={1.792}
                    opacity={isSpent ? 0.45 : 1}
                  />
                  <PropLabel
                    cx={x}
                    cy={LINE_Y - 0.105}
                    value={value}
                    tone={isCaught ? 'correct' : isSpent ? 'wrong' : nestValue === value ? 'active' : 'idle'}
                  />

                  {/* ---- The deployed net. ---- */}
                  {isSpent && (
                    <g
                      className="motion-safe:animate-[netDrop_.45s_ease-in]"
                      data-testid={`net-missed-${value}`}
                    >
                      <PropImage
                        asset="net1.png"
                        cx={x}
                        cy={LINE_Y - 0.025}
                        width={0.08}
                        aspect={1.792}
                      />
                    </g>
                  )}
                </g>
              );
            })}

            {/*
              THE CAPTURE. Drawn last so it sits above the signpost it happened on, with the net
              over the thief rather than beside him - the whole point is that he is inside it.
            */}
            {phase === 'right' && (
              <g data-testid="ambush-capture" className="motion-safe:animate-[netDrop_.45s_ease-in]">
                <PropImage
                  asset="net1.png"
                  cx={xForValue(target)}
                  cy={LINE_Y - 0.055}
                  width={0.13}
                  aspect={1.792}
                />
                <PropImage
                  asset="medalfox.png"
                  cx={xForValue(target)}
                  cy={LINE_Y - 0.045}
                  width={0.055}
                  aspect={1.792}
                />
                <text
                  x={xForValue(target)}
                  y={LINE_Y - 0.145}
                  textAnchor="middle"
                  fontSize="0.042"
                  fontWeight="900"
                  fill={CHASE_PALETTE.success}
                >
                  נתפס!
                </text>
              </g>
            )}

            {/* ---- The thief, mid-run. Hidden entirely once he is under the net. ---- */}
            {phase !== 'right' && (
              <g
                data-testid="thief"
                data-leaps={leaps}
                data-value={thiefValue}
                className={leaps > 0 ? 'motion-safe:animate-[leapPop_.3s_ease-out]' : ''}
              >
                {/* An arc taken from the leap's own geometry, so the runner sits ON the arc. */}
                <PropImage
                  asset="medalfox.png"
                  cx={thiefX}
                  cy={LINE_Y - 0.05 - (leaps > 0 && leaps < steps ? 0.02 : 0)}
                  width={0.06}
                  aspect={1.792}
                />
              </g>
            )}

            {/* A marker at 0, so the child can see where the leaps began. */}
            <PropImage asset="signpost.png" cx={startX} cy={LINE_Y - 0.075} width={0.05} aspect={1.792} opacity={0.75} />
          </NumberLineTrack>
        </g>
      )}
    </PuzzleStage>
  );
}
