/**
 * Puddle chase - the broken crest.
 *
 * ================================================================================================
 * WHAT IS BEING TAUGHT
 * ================================================================================================
 *
 * The thief's footprints skip by a constant amount, and ONE print is missing - it is under the mud.
 * The visible trail is `7, 14, __, 28`, and the child has to work out that the blank is 21.
 *
 * THE PUZZLE IS A MISSING TERM IN A SEQUENCE, which is a different question from the ambush's "how
 * far does he get". Here the two prints either side of the mud are given, so the child can either
 * multiply (`3 x 7`) or count the gap between 14 and 28 - and both routes are legitimate, which is
 * why the two known prints are drawn prominently and the puddle covers the space between them.
 *
 * ================================================================================================
 * THE INSPECTION POINTS ARE ON THE PUDDLE, NOT THE LINE
 * ================================================================================================
 *
 * The four candidates (19, 21, 23, 26) are all inside the mud's span, and they are deliberately NOT
 * all multiples of seven: 21 is the answer, and 19, 23 and 26 are not. A child who assumes every
 * option must be reachable picks the wrong one, and the mud splash tells them so.
 *
 * THE MUD SPANS 16 TO 26 as the case requires, which brackets every option - so the child cannot
 * narrow the field by seeing which candidate is off the mud. The mud is a cover, not a clue.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Station3Config } from '../../caseData';
import {
  CAPTURE_HOLD_MS,
  CHASE_PALETTE,
  LINE_Y,
  WRONG_FLASH_MS,
  puddleTarget,
  warnIfChaseUnsolvable,
  xForValue,
} from '../../station3Geometry';
import PuzzleStage from '../PuzzleStage';
import { PropImage, PropLabel } from './ChaseProps';
import NumberLineTrack from './NumberLineTrack';

interface PuddleChaseProps {
  config: Station3Config;
  solutionX: number;
  onComplete: () => void;
  onError: () => void;
}

/**
 * The mud's extent on the line, as the case requires.
 *
 * FROM THE CASE'S OWN FICTION, not from the options: the mud covers the track between 16 and 26,
 * so it is these two numbers rather than "the span of the candidates". Deriving it from the options
 * would make the mud shrink when a case offered fewer choices, which is not what mud does.
 */
const PUDDLE_FROM = 16;
const PUDDLE_TO = 26;

export default function PuddleChase({ config, solutionX, onComplete, onError }: PuddleChaseProps) {
  const target = useMemo(() => puddleTarget(solutionX), [solutionX]);

  // A development guard: a notebook answer that puts the missing print off the case's option list
  // would leave the child with nothing correct to find. See `warnIfChaseUnsolvable`.
  useEffect(() => {
    warnIfChaseUnsolvable('puddle', target, config.options, solutionX);
  }, [target, config.options, solutionX]);

  /** The footprint landings that are visible above the mud. */
  const prints = useMemo(() => [solutionX, solutionX * 2, solutionX * 4], [solutionX]);

  const [inspected, setInspected] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'wrong' | 'right'>('idle');
  /** Splashes to draw, keyed so a repeat inspection re-triggers the animation. */
  const [splashes, setSplashes] = useState<{ value: number; key: number }[]>([]);
  const timersRef = useRef<number[]>([]);
  const splashKey = useRef(0);

  useEffect(
    () => () => {
      for (const id of timersRef.current) window.clearTimeout(id);
    },
    [],
  );

  const inspect = useCallback(
    (value: number) => {
      if (phase !== 'idle') return;
      setInspected(value);

      if (value === target) {
        setPhase('right');
        timersRef.current.push(window.setTimeout(() => onComplete(), CAPTURE_HOLD_MS + 600));
        return;
      }

      // A wrong spot throws mud, and the splash is keyed so that inspecting the SAME wrong spot
      // twice animates twice - a static list would swallow the second attempt and the board would
      // look unresponsive.
      splashKey.current += 1;
      setSplashes((s) => [...s, { value, key: splashKey.current }]);
      setPhase('wrong');
      onError();
      timersRef.current.push(
        window.setTimeout(() => {
          setPhase('idle');
          setInspected(null);
        }, WRONG_FLASH_MS + 320),
      );
    },
    [phase, target, onComplete, onError],
  );

  const mudX = xForValue(PUDDLE_FROM);
  const mudW = xForValue(PUDDLE_TO) - mudX;

  return (
    <PuzzleStage
      bgAsset="path.jpeg"
      aspect={1.792}
      bgAlt="שביל העפר ובו שלולית בוץ"
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
        <g data-testid="puddle-board">
          <NumberLineTrack
            marks={config.options}
            selected={inspected}
            missed={[]}
          >
            {/* ---- The mud, drawn OVER the line so it really does hide the print. ---- */}
            <g data-testid="puddle">
              <PropImage
                asset="gap.png"
                cx={mudX + mudW / 2}
                cy={LINE_Y + 0.005}
                width={mudW + 0.03}
                aspect={1.792}
                /* The mud is 1376x768, the one non-square sprite in the station. */
                naturalAspect={1.792}
              />
              <text
                x={mudX + mudW / 2}
                y={LINE_Y - 0.075}
                textAnchor="middle"
                fontSize="0.03"
                fontWeight="900"
                fill="#fde68a"
              >
                הטביעה נעלמה בבוץ…
              </text>
            </g>

            {/* ---- The visible footprints, on the line where the thief stepped. ---- */}
            {prints.map((value, index) => {
              const x = xForValue(value);
              /*
               * THE PRINTS READ AS A TRAIL: alternating up and down, and numbered, so the child can
               * count 1, 2, 3(?) ... 4 rather than having to trust four identical blobs. The
               * ordinal is what makes the missing one obvious.
               */
              const up = index % 2 === 0;
              return (
                <g key={value} data-testid={`print-${value}`}>
                  <ellipse
                    cx={x}
                    cy={LINE_Y - (up ? 0.03 : 0.005)}
                    rx={0.016}
                    ry={0.016 / 1.792}
                    fill="rgba(120, 72, 20, 0.9)"
                    stroke="#fde68a"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={x}
                    y={LINE_Y - (up ? 0.03 : 0.005) + 0.008}
                    textAnchor="middle"
                    fontSize="0.022"
                    fontWeight="900"
                    fill="#ffffff"
                    style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}
                  >
                    {value}
                  </text>
                </g>
              );
            })}

            {/* The question print - where the mud swallowed one. */}
            <text
              x={xForValue(solutionX * 3)}
              y={LINE_Y - 0.022}
              textAnchor="middle"
              fontSize="0.055"
              fontWeight="900"
              fill="#fde68a"
              data-testid="missing-print"
            >
              ?
            </text>

            {/* ---- The inspection points. ---- */}
            {config.options.map((value) => {
              const x = xForValue(value);
              const isTarget = value === target;
              const isCaught = phase === 'right' && isTarget;
              return (
                <g
                  key={value}
                  className="cursor-pointer"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    inspect(value);
                  }}
                  data-testid={`inspect-${value}`}
                  data-target={isTarget ? 'true' : 'false'}
                  role="button"
                  tabIndex={0}
                  aria-label={`בדיקת הבוץ סביב מספר ${value}`}
                  aria-pressed={inspected === value}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      inspect(value);
                    }
                  }}
                >
                  {/*
                    THE HIT TARGET IS A SQUARE OVER THE MUD, not the label. A child poking at the
                    mud should hit the spot they are pointing at; making only the flag clickable
                    would mean aiming at a small plate for a gesture that is really "dig here".
                  */}
                  <rect
                    x={x - 0.032}
                    y={LINE_Y - 0.085}
                    width={0.064}
                    height={0.13}
                    fill="transparent"
                    pointerEvents="all"
                  />
                  {/* A small marker stake, so the point reads as "here" rather than as a tick. */}
                  <line
                    x1={x}
                    y1={LINE_Y - 0.055}
                    x2={x}
                    y2={LINE_Y - 0.015}
                    stroke={isCaught ? CHASE_PALETTE.success : inspected === value ? CHASE_PALETTE.active : 'rgba(253, 230, 138, 0.9)'}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                  <PropLabel
                    cx={x}
                    cy={LINE_Y - 0.085}
                    value={value}
                    tone={isCaught ? 'correct' : phase === 'wrong' && inspected === value ? 'wrong' : inspected === value ? 'active' : 'idle'}
                  />
                </g>
              );
            })}

            {/* ---- Mud splashes from wrong inspections. ---- */}
            {splashes.map(({ value, key }) => (
              <g
                key={key}
                className="motion-safe:animate-[mudSplash_.7s_ease-out_forwards]"
                data-testid={`splash-${value}`}
              >
                {[-0.022, 0, 0.022].map((dx) => (
                  <ellipse
                    key={dx}
                    cx={xForValue(value) + dx}
                    cy={LINE_Y - 0.04}
                    rx={0.011}
                    ry={0.011 / 1.792}
                    fill="rgba(87, 56, 18, 0.95)"
                  />
                ))}
              </g>
            ))}

            {/*
              THE REVEAL. The key rises out of the mud at the missing print, and the number is
              printed beside it - because finding the key is the story and 21 is the maths, and the
              child should leave the station with both.
            */}
            {phase === 'right' && (
              <g data-testid="puddle-key" className="motion-safe:animate-[keyRise_.55s_ease-out]">
                {/*
                  A gold key, drawn rather than imported: the asset folder has no key, and drawing it
                  lets it be exactly the size of the print it was hiding under.
                */}
                <g transform={`translate(${xForValue(target)} ${LINE_Y - 0.045})`}>
                  <circle
                    r={0.014}
                    cx={-0.014}
                    cy={0}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={4}
                    vectorEffect="non-scaling-stroke"
                  />
                  <line
                    x1={0}
                    y1={0}
                    x2={0.028}
                    y2={0}
                    stroke="#fbbf24"
                    strokeWidth={4}
                    vectorEffect="non-scaling-stroke"
                  />
                  <line
                    x1={0.02}
                    y1={0}
                    x2={0.02}
                    y2={0.011}
                    stroke="#fbbf24"
                    strokeWidth={4}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
                <text
                  x={xForValue(target)}
                  y={LINE_Y - 0.1}
                  textAnchor="middle"
                  fontSize="0.04"
                  fontWeight="900"
                  fill={CHASE_PALETTE.success}
                >
                  {target} ✓
                </text>
              </g>
            )}

            {/* The thief, waiting past the last print - he is not the target here, the print is. */}
            <PropImage
              asset="medalcat.png"
              cx={xForValue(solutionX * 4 + solutionX)}
              cy={LINE_Y - 0.05}
              width={0.055}
              aspect={1.792}
              opacity={0.9}
            />
          </NumberLineTrack>
        </g>
      )}
    </PuzzleStage>
  );
}
