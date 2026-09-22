/**
 * Tray puzzle - the honeycomb heist.
 *
 * ================================================================================================
 * WHAT IS BEING TAUGHT
 * ================================================================================================
 *
 * A tray of twelve cells has to be cut into three sectors of equal size. Three candidate cuttings
 * are offered as miniature maps, and the child picks the one that divides the tray equally.
 *
 * THE MATHS IS PARTITIONING, AND THE DIFFICULTY IS THAT "EQUAL" IS NOT "EVENLY SPACED". All three
 * maps cover the whole tray and all three look tidy; they differ only in how the cells fall:
 *
 *   A   5, 4, 3    unequal
 *   B   6, 3, 3    unequal
 *   C   4, 4, 4    equal, and the answer
 *
 * A child who checks only that every sector is a plausible blob will struggle, because all three
 * are. What has to be compared is the COUNT PER SECTOR, which is why the trays fill with distinct
 * colours and a number appears in each sector - the point is to make the comparison visible rather
 * than to make the child hold three tallies in their head.
 *
 * ================================================================================================
 * THE PARTITIONS ARE VERIFIED, NOT DRAWN BY EYE
 * ================================================================================================
 *
 * Every partition below was checked to cover all twelve cells exactly once with each sector
 * contiguous. That matters more than it sounds: an "unequal" map that accidentally left a cell
 * unassigned, or split a sector into two disconnected pieces, would look like a bug in the tray
 * rather than like a deliberately wrong answer - and the first draft of map A did exactly that,
 * covering only eleven cells.
 *
 * The check is cheap and repeatable, so rather than trusting the tables they are re-asserted at
 * module load in development. See `assertPartitions`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Station1Config } from '../../caseData';
import {
  PALETTE,
  SECTOR_COLOURS,
  SUCCESS_HOLD_MS,
  WRONG_FLASH_MS,
  asTray,
} from '../../station1Geometry';
import Station1Stage from './Station1Stage';

interface TrayPuzzleProps {
  config: Station1Config;
  onComplete: () => void;
  onError: () => void;
}

/** `tray.png` is 1200x896. */
const TRAY_ASPECT = 1200 / 896;

/**
 * The tray's usable cavity inside its rails, as a fraction of the image.
 *
 * The photograph shows a wooden tray with internal rails; the grid is drawn over the larger front
 * compartment. Measured from the rendered image rather than guessed - the cavity sits inside the
 * tray's own rails, so the drawn grid is inset within them rather than fighting them.
 */
const CAVITY = { left: 0.17, top: 0.36, width: 0.66, height: 0.46 };

/** A cell address, `"r,c"`, so the partitions can be written as literal tables. */
type CellKey = string;

/** One candidate cutting: three sectors, each a list of cells. */
interface Partition {
  id: 'A' | 'B' | 'C';
  /** The sector sizes, in order - what the child is being asked to compare. */
  sizes: [number, number, number];
  sectors: [CellKey[], CellKey[], CellKey[]];
  correct?: boolean;
}

/**
 * The three candidate cuttings.
 *
 * EVERY ONE COVERS ALL TWELVE CELLS. The wrong answers are wrong because the SIZES differ, not
 * because they leave gaps - a map with a hole in it would be dismissed instantly and would not
 * test the idea at all.
 */
const PARTITIONS: Partition[] = [
  {
    id: 'A',
    sizes: [5, 4, 3],
    sectors: [
      // The top-left corner and the cell beneath it: five cells, an L.
      ['0,0', '0,1', '1,0', '1,1', '2,0'],
      // The top-right block, squared off.
      ['0,2', '0,3', '1,2', '1,3'],
      // The bottom row's remainder.
      ['2,1', '2,2', '2,3'],
    ],
  },
  {
    id: 'B',
    sizes: [6, 3, 3],
    sectors: [
      // Two-thirds of the left, and the whole first row's left half.
      ['0,0', '0,1', '0,2', '1,0', '1,1', '2,0'],
      ['0,3', '1,2', '1,3'],
      ['2,1', '2,2', '2,3'],
    ],
  },
  {
    id: 'C',
    // THE ANSWER: three horizontal bands of four. Contiguous, equal, and the simplest cutting -
    // which is the point, since the temptation is to expect a puzzle's answer to look clever.
    sizes: [4, 4, 4],
    sectors: [
      ['0,0', '0,1', '1,0', '1,1'],
      ['0,2', '0,3', '1,2', '1,3'],
      ['2,0', '2,1', '2,2', '2,3'],
    ],
    correct: true,
  },
];

/**
 * Re-checks every partition covers all twelve cells exactly once, with contiguous sectors.
 *
 * A DEVELOPMENT-ONLY ASSERTION, not a runtime guard: if it fails the console says which map and
 * which sector, and the fix is to correct the table above rather than to handle the case. It runs
 * at module load so a bad table is caught the first time the station is opened.
 */
function assertPartitions(): void {
  const grid = new Set<string>();
  for (let r = 0; r < 3; r += 1) for (let c = 0; c < 4; c += 1) grid.add(`${r},${c}`);

  for (const p of PARTITIONS) {
    const all = p.sectors.flat();
    const unique = new Set(all);
    if (all.length !== 12 || unique.size !== 12) {
      console.error(
        `[tray] map ${p.id} does not cover 12 cells exactly once (got ${all.length} cells, ${unique.size} distinct)`,
      );
    }
    for (const cell of grid) {
      if (!unique.has(cell)) console.error(`[tray] map ${p.id} leaves ${cell} unassigned`);
    }
    p.sectors.forEach((sector, i) => {
      // Flood fill from the sector's first cell; if it does not reach them all, it is disconnected.
      const inSector = new Set(sector);
      const seen = new Set<string>([sector[0]!]);
      const stack = [sector[0]!];
      while (stack.length > 0) {
        const [r, c] = stack.pop()!.split(',').map(Number) as [number, number];
        for (const [dr, dc] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const key = `${r + dr},${c + dc}`;
          if (inSector.has(key) && !seen.has(key)) {
            seen.add(key);
            stack.push(key);
          }
        }
      }
      if (seen.size !== sector.length) {
        console.error(`[tray] map ${p.id} sector ${i + 1} is not contiguous`);
      }
    });
    const declared = p.sizes.join(',');
    const actual = p.sectors.map((s) => s.length).join(',');
    if (declared !== actual) {
      console.error(`[tray] map ${p.id} says sizes ${declared} but the cells give ${actual}`);
    }
  }
}

assertPartitions();

export default function TrayPuzzle({ config, onComplete, onError }: TrayPuzzleProps) {
  const data = useMemo(() => asTray(config), [config]);

  const rows = data?.rows ?? 3;
  const cols = data?.cols ?? 4;

  /** The map being previewed by a hover, if any. */
  const [hovered, setHovered] = useState<Partition['id'] | null>(null);
  /** The map that has been applied, if any. */
  const [applied, setApplied] = useState<Partition | null>(null);
  const [phase, setPhase] = useState<'idle' | 'wrong' | 'right'>('idle');
  const timersRef = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const id of timersRef.current) window.clearTimeout(id);
    },
    [],
  );

  /** Which sector index each cell belongs to, for the applied or hovered map. */
  const activePartition = applied ?? PARTITIONS.find((p) => p.id === hovered) ?? null;

  const sectorOf = useMemo(() => {
    const map = new Map<CellKey, number>();
    if (!activePartition) return map;
    activePartition.sectors.forEach((sector, index) => {
      for (const cell of sector) map.set(cell, index);
    });
    return map;
  }, [activePartition]);

  const choose = useCallback(
    (partition: Partition) => {
      if (phase !== 'idle') return;
      setApplied(partition);
      setHovered(null);

      if (partition.correct) {
        setPhase('right');
        timersRef.current.push(window.setTimeout(() => onComplete(), SUCCESS_HOLD_MS));
        return;
      }

      /*
       * A WRONG MAP STAYS ON SCREEN WHILE IT FLASHES, and the board resets afterwards. Showing
       * the unequal sectors filled in and numbered is the feedback: the child can see that the
       * bands are 5, 4 and 3 rather than being told the answer was wrong.
       */
      setPhase('wrong');
      onError();
      timersRef.current.push(
        window.setTimeout(() => {
          setApplied(null);
          setPhase('idle');
        }, WRONG_FLASH_MS + 320),
      );
    },
    [phase, onComplete, onError],
  );

  if (!data) {
    return (
      <p className="rounded-2xl bg-rose-100 p-4 text-center text-sm font-black text-rose-900">
        נתוני חידת המגש חסרים בתיק הזה.
      </p>
    );
  }

  const cellW = CAVITY.width / cols;
  const cellH = CAVITY.height / rows;

  return (
    <Station1Stage
      bgAsset={config.bgAsset}
      aspect={TRAY_ASPECT}
      bgAlt="מגש הדבש"
      className={
        phase === 'wrong'
          ? 'motion-safe:animate-[puzzleShake_.4s_ease-in-out] ring-4 ring-red-400'
          : phase === 'right'
            ? 'ring-4 ring-green-400'
            : ''
      }
    >
      {() => (
        <g data-testid="tray-board">
          {/* ---- The grid itself. ---- */}
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              const key = `${r},${c}`;
              const sector = sectorOf.get(key);
              const x = CAVITY.left + c * cellW;
              const y = CAVITY.top + r * cellH;

              /*
               * THE FILL DEPENDS ON WHICH PHASE WE ARE IN. During a preview the sector colours
               * appear softly so the child can see the shape of the cutting before committing;
               * once applied they are solid; on a miss they all turn red so the failure reads
               * across the whole tray rather than as a few odd cells.
               */
              let fill = 'rgba(255, 249, 230, 0.14)';
              if (sector !== undefined) {
                fill =
                  phase === 'wrong'
                    ? 'rgba(248, 113, 113, 0.55)'
                    : phase === 'right'
                      ? 'rgba(74, 222, 128, 0.55)'
                      : `${SECTOR_COLOURS[sector]}${hovered && !applied ? '66' : 'aa'}`;
              }

              return (
                <rect
                  key={key}
                  x={x}
                  y={y}
                  width={cellW}
                  height={cellH}
                  fill={fill}
                  stroke="rgba(90, 50, 10, 0.55)"
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  data-testid={`tray-cell-${r}-${c}`}
                  data-sector={sector ?? ''}
                />
              );
            }),
          )}

          {/*
            THE PER-SECTOR COUNTER.
            Placed at each sector's centroid and only shown once a map is applied, because during a
            hover the question is "what shape is this cutting" and a number would tempt the child to
            answer it by reading. Once applied, the numbers ARE the answer: 5, 4, 3 against 4, 4, 4.
          */}
          {applied &&
            applied.sectors.map((sector, index) => {
              const cells = sector.map((k) => k.split(',').map(Number) as [number, number]);
              const cx =
                CAVITY.left +
                (cells.reduce((sum, [, c]) => sum + c, 0) / cells.length + 0.5) * cellW;
              const cy =
                CAVITY.top +
                (cells.reduce((sum, [r]) => sum + r, 0) / cells.length + 0.5) * cellH;
              const good = phase === 'right';
              const bad = phase === 'wrong';
              return (
                <g key={index} data-testid={`tray-count-${index}`}>
                  {/*
                    AN ELLIPSE, NOT A CIRCLE, BECAUSE THE OVERLAY IS STRETCHED.
                    The tray's stage is 1200x896, so a circle in viewBox units renders wider than
                    it is tall. Dividing the vertical radius by the aspect cancels that exactly -
                    the correction is the reciprocal of the one used for the window's shards,
                    because there the shape was being *drawn* into a square space and here it is
                    being *placed* in a stretched one.
                  */}
                  <ellipse
                    cx={cx}
                    cy={cy}
                    rx={0.028}
                    ry={0.028 / TRAY_ASPECT}
                    fill={bad ? 'rgba(127, 29, 29, 0.9)' : good ? 'rgba(6, 78, 59, 0.9)' : 'rgba(15, 23, 42, 0.85)'}
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="0.034"
                    fontWeight="900"
                    fill="#ffffff"
                  >
                    {sector.length}
                  </text>
                </g>
              );
            })}

          {/* ---- The verdict line, under the tray. ---- */}
          {applied && (
            <text
              x={CAVITY.left + CAVITY.width / 2}
              y={CAVITY.top + CAVITY.height + 0.052}
              textAnchor="middle"
              fontSize="0.032"
              fontWeight="900"
              fill={phase === 'right' ? PALETTE.success : phase === 'wrong' ? PALETTE.error : '#fef3c7'}
              data-testid="tray-verdict"
            >
              {applied.sizes.join(' · ')}
              {phase === 'right' ? '  ✓ שווה!' : phase === 'wrong' ? '  ✗ לא שווה' : ''}
            </text>
          )}

          {/* ---- The candidate maps, as miniature previews. ---- */}
          {PARTITIONS.map((partition, index) => {
            const cardW = 0.245;
            const cardH = 0.15;
            const gap = (1 - PARTITIONS.length * cardW) / (PARTITIONS.length + 1);
            const x = gap + index * (cardW + gap);
            const y = 1 - cardH - 0.055;
            const isHovered = hovered === partition.id;
            const isApplied = applied?.id === partition.id;

            return (
              <g
                key={partition.id}
                className="cursor-pointer"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  choose(partition);
                }}
                onPointerEnter={() => phase === 'idle' && setHovered(partition.id)}
                onPointerLeave={() => setHovered((h) => (h === partition.id ? null : h))}
                data-testid={`map-${partition.id}`}
                data-correct={partition.correct ? 'true' : 'false'}
                data-sizes={partition.sizes.join(',')}
              >
                <rect
                  x={x}
                  y={y}
                  width={cardW}
                  height={cardH}
                  rx={0.016}
                  fill={isApplied ? 'rgba(74, 222, 128, 0.22)' : isHovered ? 'rgba(34, 211, 238, 0.2)' : 'rgba(6, 10, 24, 0.78)'}
                  stroke={isApplied ? PALETTE.success : isHovered ? PALETTE.active : 'rgba(255,255,255,0.35)'}
                  strokeWidth={isApplied || isHovered ? 3 : 1.5}
                  vectorEffect="non-scaling-stroke"
                />

                {/* The miniature cutting, drawn from the SAME partition table the tray uses. */}
                {partition.sectors.map((sector, sIndex) =>
                  sector.map((cellKey) => {
                    const [r, c] = cellKey.split(',').map(Number) as [number, number];
                    const mw = (cardW * 0.62) / cols;
                    const mh = (cardH * 0.5) / rows;
                    return (
                      <rect
                        key={cellKey}
                        x={x + cardW * 0.06 + c * mw}
                        y={y + cardH * 0.16 + r * mh}
                        width={mw}
                        height={mh}
                        fill={`${SECTOR_COLOURS[sIndex]}cc`}
                        stroke="rgba(0,0,0,0.35)"
                        strokeWidth={0.6}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  }),
                )}

                {/* The sizes, stated on the card - the comparison the puzzle is really asking for. */}
                <text
                  x={x + cardW * 0.82}
                  y={y + cardH * 0.42}
                  textAnchor="middle"
                  fontSize="0.026"
                  fontWeight="900"
                  fill="#e2e8f0"
                >
                  {partition.sizes[0]}
                </text>
                <text
                  x={x + cardW * 0.82}
                  y={y + cardH * 0.62}
                  textAnchor="middle"
                  fontSize="0.026"
                  fontWeight="900"
                  fill="#e2e8f0"
                >
                  {partition.sizes[1]}
                </text>
                <text
                  x={x + cardW * 0.82}
                  y={y + cardH * 0.82}
                  textAnchor="middle"
                  fontSize="0.026"
                  fontWeight="900"
                  fill="#e2e8f0"
                >
                  {partition.sizes[2]}
                </text>

                <text
                  x={x + cardW / 2}
                  y={y + cardH - 0.012}
                  textAnchor="middle"
                  fontSize="0.024"
                  fontWeight="900"
                  fill="#fef3c7"
                >
                  מפה {partition.id}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </Station1Stage>
  );
}
