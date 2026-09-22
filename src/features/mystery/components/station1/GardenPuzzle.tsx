/**
 * Garden puzzle - the trampled strawberry patch.
 *
 * ================================================================================================
 * WHAT IS BEING TAUGHT
 * ================================================================================================
 *
 * Three routes cross the strawberry bed and one of them has a perimeter of exactly fourteen steps.
 * The child picks a route, watches a marker walk it counting steps out loud, and chooses.
 *
 * PERIMETER IS THE LESSON, AND THE COUNTING IS THE POINT. The routes are drawn to scale on a grid
 * of squares, so a child who does not yet trust the arithmetic can count the edges themselves -
 * and the counter that ticks along with the walker exists to make that count visible rather than
 * to save them the trouble.
 *
 * The three routes are 12, 14 and 16, which is deliberate: they are all EVEN and all CLOSE, so
 * the answer cannot be reached by estimating. Route A is a 3x3 square, B is a 5x2 rectangle and C
 * is a 4x4 square, so the shapes differ too and the child cannot match by silhouette.
 *
 * ================================================================================================
 * THE PATH STRING IS PARSED, NOT TRUSTED
 * ================================================================================================
 *
 * `config.data.routes[].path` is an SVG path in the cases' own grid units, using only the absolute
 * commands `M`, `H`, `V` and `Z`. That subset is parsed here into a polyline so that the runner can
 * walk it segment by segment and the step counter can increment once per unit edge.
 *
 * THE COUNT IS DERIVED FROM THE PARSED GEOMETRY, NEVER READ FROM `perimeter`. If it were read from
 * the case, the counter would happily announce "14" while the marker walked a path that was
 * visibly sixteen steps long, and the child would be taught to distrust their own counting. Taking
 * the number from the walk means a mislabelled route in the data shows up as a puzzle with no
 * right answer, which is a data bug rather than a lie.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Station1Config } from '../../caseData';
import { PALETTE, SUCCESS_HOLD_MS, WRONG_FLASH_MS, asGarden } from '../../station1Geometry';
import Station1Stage from './Station1Stage';

interface GardenPuzzleProps {
  config: Station1Config;
  onComplete: () => void;
  onError: () => void;
}

/** `garden_bed.jpeg` is 1400x788, close to 16:9. */
const GARDEN_ASPECT = 1400 / 788;

/**
 * The soil inside the bed's timber edging, as a fraction of the image.
 *
 * EACH ROUTE GETS ITS OWN HORIZONTAL BAND WITHIN THIS REGION - see the banding note in the
 * component for why - so this is the whole patch rather than one route's share of it.
 */
const SOIL = { left: 0.12, top: 0.26, width: 0.76, height: 0.56 };

/** The size of the coordinate grid the route paths are written in. */
const GRID_UNITS = 7;

const ROUTE_COLOURS: Record<string, string> = {
  A: '#fbbf24',
  B: '#38bdf8',
  C: '#f472b6',
};

/** One axis-aligned segment of a parsed route, in grid units. */
interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** How many unit steps this segment contributes to the perimeter. */
  steps: number;
}

/** A parsed route: its polyline, its segments, and its TRUE measured length. */
interface ParsedRoute {
  id: string;
  d: string;
  colour: string;
  segments: Segment[];
  /** The perimeter in unit steps, counted from the geometry rather than read from the case. */
  measured: number;
}

/**
 * Parses the absolute `M`/`H`/`V`/`Z` subset into axis-aligned segments.
 *
 * ONLY THOSE FOUR COMMANDS ARE SUPPORTED, and that is a deliberate constraint rather than an
 * omission: a diagonal or curved route would have a perimeter with no whole-number step count, and
 * this puzzle is about counting whole steps around a shape. An unsupported command is skipped with
 * a warning rather than silently dropped, so a case that uses one is a visible data error.
 */
function parseRoute(id: string, d: string): ParsedRoute {
  const tokens = d.match(/[MHVZ]|-?\d+(?:\.\d+)?/gi) ?? [];
  const segments: Segment[] = [];
  let command: string | null = null;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;

  const push = (x2: number, y2: number) => {
    const steps = Math.abs(x2 - x) + Math.abs(y2 - y);
    if (steps > 0) segments.push({ x1: x, y1: y, x2, y2, steps });
    x = x2;
    y = y2;
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]!;
    if (/^[MHVZ]$/i.test(token)) {
      command = token.toUpperCase();
      if (command === 'Z') {
        push(startX, startY);
      }
      continue;
    }

    const value = Number(token);
    if (command === 'M') {
      const nx = value;
      const ny = Number(tokens[++i]);
      x = nx;
      y = ny;
      startX = nx;
      startY = ny;
      if (segments.length === 0) {
        // The very first M only establishes the origin; it is not an edge.
      }
    } else if (command === 'H') {
      push(value, y);
    } else if (command === 'V') {
      push(x, value);
    } else {
      console.warn(`[garden] route ${id} uses unsupported path command "${command}"`);
    }
  }

  return {
    id,
    d,
    colour: ROUTE_COLOURS[id] ?? '#a3e635',
    segments,
    measured: segments.reduce((sum, s) => sum + s.steps, 0),
  };
}

export default function GardenPuzzle({ config, onComplete, onError }: GardenPuzzleProps) {
  const data = useMemo(() => asGarden(config), [config]);

  const routes = useMemo<ParsedRoute[]>(
    () => (data ? data.routes.map((r) => parseRoute(r.id, r.path)) : []),
    [data],
  );

  /** The route currently being walked, and how far along it the marker is. */
  const [walking, setWalking] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  /** Routes whose walk has finished, so their result can be shown. */
  const [finished, setFinished] = useState<Record<string, 'right' | 'wrong'>>({});
  const timersRef = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const id of timersRef.current) window.clearTimeout(id);
    },
    [],
  );

  const targetValue = config.targetValue;

  /**
   * THE CASE'S FLAG AND THE GEOMETRY MUST AGREE, and this is where that is checked.
   *
   * The walk below decides correctness by MEASURING - `route.measured === targetValue` - because
   * that is the method the puzzle teaches. If the case's `correct: true` flag pointed at a
   * different route, the puzzle would have a right answer the child could never reach by counting,
   * which is the one failure mode that would make the station actively misleading.
   *
   * So this runs in an effect rather than during render: it is a diagnostic, and a diagnostic that
   * logs during render fires twice under StrictMode and would be indistinguishable from a real
   * double-render bug. The returned value is deliberately unused - nothing about the puzzle's
   * behaviour changes if the case is wrong, it just becomes unsolvable, and a loud console warning
   * is the right way to surface that in development.
   */
  useEffect(() => {
    const flagged = data?.routes.find((r) => r.correct)?.id ?? null;
    const byMeasure = routes.find((r) => r.measured === targetValue)?.id ?? null;
    if (flagged !== byMeasure) {
      console.warn(
        `[garden] the case flags route ${flagged} but only route ${byMeasure} measures ${targetValue}`,
      );
    }
  }, [data, routes, targetValue]);

  const walk = useCallback(
    (route: ParsedRoute) => {
      if (walking !== null) return;
      setWalking(route.id);
      setStep(0);
      setFinished((f) => {
        const next = { ...f };
        delete next[route.id];
        return next;
      });

      /*
       * THE WALK TICKS ONCE PER UNIT STEP rather than being one CSS animation, because the counter
       * has to keep up with the marker and the number is the whole point. Each tick advances the
       * marker by one unit along the route's segments; the marker's position is derived from the
       * step index rather than animated, so the number and the dot can never drift apart.
       */
      for (let s = 1; s <= route.measured; s += 1) {
        timersRef.current.push(
          window.setTimeout(() => setStep(s), s * 220),
        );
      }

      timersRef.current.push(
        window.setTimeout(() => {
          const right = route.measured === targetValue;
          setFinished((f) => ({ ...f, [route.id]: right ? 'right' : 'wrong' }));
          if (!right) onError();

          timersRef.current.push(
            window.setTimeout(
              () => {
                setWalking(null);
                if (right) onComplete();
                else setStep(0);
              },
              (right ? SUCCESS_HOLD_MS : WRONG_FLASH_MS) + 200,
            ),
          );
        }, route.measured * 220 + 260),
      );
    },
    [walking, targetValue, onComplete, onError],
  );

  if (!data) {
    return (
      <p className="rounded-2xl bg-rose-100 p-4 text-center text-sm font-black text-rose-900">
        נתוני חידת המסלול חסרים בתיק הזה.
      </p>
    );
  }

  // The grid is square, fitted inside the soil region - see the SOIL comment for why.
  /*
   * THE ROUTES ARE STACKED IN THREE BANDS, ONE PER ROUTE.
   *
   * The case gives each route its own shape in a shared coordinate grid, and those shapes genuinely
   * OVERLAP - route A is a 3x3 square, B a 5x2 rectangle and C a 4x4 square, all anchored near the
   * same origin. Drawn on one origin they sit on top of each other: A's top edge is B's top edge
   * exactly, and C covers both, so a child aiming at one route hits whichever happens to be
   * painted last. That is not a styling annoyance, it makes the puzzle unanswerable by pointing.
   *
   * So each route is given its own band of the bed, stacked vertically. The SHAPE AND THE PERIMETER
   * ARE UNTOUCHED - the same grid units, the same edges, the same measured length - only the origin
   * moves. A child can therefore see all three routes at once and pick any of them, which is what
   * the puzzle asks them to do.
   */
  const bandHeight = SOIL.height / routes.length;
  const unit = Math.min(SOIL.width, bandHeight * 0.86) / GRID_UNITS;
  const originFor = (index: number) => ({
    x: SOIL.left + (SOIL.width - unit * GRID_UNITS) / 2,
    // Centre the route's own bounding box in its band, so a route that does not use the full grid
    // (B is only five units wide and two tall) still sits in the middle of its strip.
    y: SOIL.top + bandHeight * index + (bandHeight - unit * GRID_UNITS) / 2,
  });

  /**
   * The origin of a route, by its index in the case's list.
   *
   * Looked up by index rather than by id, because the ids are the case's (`A`, `B`, `C`) and the
   * banding is the presentation's - keeping them separate means a case could rename its routes
   * without the layout breaking.
   */
  const originOfRoute = new Map(routes.map((r, i) => [r.id, originFor(i)]));

  /**
   * Maps a route's grid coordinates to the stage, using THAT ROUTE'S OWN BAND.
   *
   * Every geometry call in this file goes through these two, so a route's shape is expressed once
   * in the case's units and the banding is applied at the point of drawing. There is deliberately
   * no band-agnostic `gx`/`gy` - a helper that ignored the band would be the easy way to draw a
   * route's shape in one strip and its marker in another.
   */
  const gx = (route: ParsedRoute, u: number) => (originOfRoute.get(route.id)?.x ?? 0) + u * unit;
  const gy = (route: ParsedRoute, v: number) => (originOfRoute.get(route.id)?.y ?? 0) + v * unit;

  /** The marker's position after `n` steps along a route, walking its segments in order. */
  const markerAt = (route: ParsedRoute, n: number): { x: number; y: number } => {
    let remaining = n;
    for (const seg of route.segments) {
      if (remaining <= seg.steps) {
        // Step along this segment, preserving its direction.
        const t = seg.steps === 0 ? 0 : remaining / seg.steps;
        return {
          x: gx(route, seg.x1 + (seg.x2 - seg.x1) * t),
          y: gy(route, seg.y1 + (seg.y2 - seg.y1) * t),
        };
      }
      remaining -= seg.steps;
    }
    const last = route.segments[route.segments.length - 1];
    return last
      ? { x: gx(route, last.x2), y: gy(route, last.y2) }
      : { x: gx(route, 0), y: gy(route, 0) };
  };

  const active = routes.find((r) => r.id === walking) ?? null;
  const marker = active ? markerAt(active, step) : null;

  return (
    <Station1Stage
      bgAsset={config.bgAsset}
      aspect={GARDEN_ASPECT}
      bgAlt="ערוגת התותים"
      className={walking ? '' : 'cursor-default'}
    >
      {() => (
        <g data-testid="garden-board">
          {/*
            THE MEASURING GRID, DRAWN ONCE PER ROUTE INSIDE THAT ROUTE'S BAND.
            Faint lines every unit, so the child can count edges without the grid competing with the
            routes. It is what makes "perimeter 14" a claim about something visible - and because
            each route has its own band, each needs its own grid to be countable.
          */}
          {routes.map((route) => {
            const origin = originOfRoute.get(route.id);
            if (!origin) return null;
            return (
              <g key={`grid-${route.id}`} opacity={walking === null || walking === route.id ? 1 : 0.35}>
                {Array.from({ length: GRID_UNITS + 1 }, (_, i) => (
                  <g key={`g${i}`}>
                    <line
                      x1={origin.x + i * unit}
                      y1={origin.y}
                      x2={origin.x + i * unit}
                      y2={origin.y + GRID_UNITS * unit}
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                    <line
                      x1={origin.x}
                      y1={origin.y + i * unit}
                      x2={origin.x + GRID_UNITS * unit}
                      y2={origin.y + i * unit}
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                ))}
              </g>
            );
          })}

          {/* ---- The three routes. ---- */}
          {routes.map((route) => {
            const result = finished[route.id];
            const isWalking = walking === route.id;
            const stroke =
              result === 'right'
                ? PALETTE.success
                : result === 'wrong'
                  ? PALETTE.error
                  : route.colour;

            // The path is re-emitted in absolute coordinates through the route's own band.
            const points = route.segments
              .map((s, i) =>
                i === 0
                  ? `${gx(route, s.x1)},${gy(route, s.y1)} ${gx(route, s.x2)},${gy(route, s.y2)}`
                  : `${gx(route, s.x2)},${gy(route, s.y2)}`,
              )
              .join(' ');

            return (
              <g
                key={route.id}
                data-testid={`route-${route.id}`}
                data-measured={route.measured}
                /*
                 * THE HANDLER IS ON THE GROUP, NOT ON THE FAT HIT LINE.
                 *
                 * The obvious placement is on the wide transparent polyline below, and it does not
                 * work: the visible coloured polyline is painted AFTER it in the same group, so it
                 * sits on top and swallows the pointer events - the wide line underneath is never
                 * the hit target. Putting the handler on the group catches the tap whichever of
                 * the two children the browser picks, which is the only arrangement that works
                 * regardless of paint order.
                 */
                className="cursor-pointer"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  walk(route);
                }}
              >
                {/*
                  A fat transparent line, so a child aiming at a route does not have to hit a
                  5px stroke. It is decorative in every sense: the handler is above, and this
                  exists only to give the browser a larger target than the visible line.
                */}
                <polyline
                  points={points}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={26}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="stroke"
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={isWalking ? 7 : 5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                  style={
                    isWalking
                      ? {
                          // The dash walk is decorative only - the counter is driven by `step`.
                          strokeDasharray: '12 8',
                          animation: 'dashWalk 1s linear infinite',
                        }
                      : undefined
                  }
                  className={result === 'right' ? 'motion-safe:animate-[routeGlow_1s_ease-in-out]' : ''}
                />

                {/* The route's letter, at its first vertex. */}
                {route.segments[0] && (
                  <text
                    x={gx(route, route.segments[0].x1)}
                    y={gy(route, route.segments[0].y1) - 0.016}
                    textAnchor="middle"
                    fontSize="0.032"
                    fontWeight="900"
                    fill={stroke}
                  >
                    {route.id}
                  </text>
                )}

                {/* The measured perimeter, shown once the walk has finished. */}
                {result && (
                  <text
                    x={gx(route, route.segments[0]!.x1)}
                    y={gy(route, route.segments[0]!.y1) + 0.05}
                    textAnchor="middle"
                    fontSize="0.03"
                    fontWeight="900"
                    fill={stroke}
                  >
                    {route.measured} {result === 'right' ? '✓' : '✗'}
                  </text>
                )}
              </g>
            );
          })}

          {/* ---- The walker and its counter. ---- */}
          {marker && active && (
            <g data-testid="garden-marker" data-step={step}>
              {/*
                ELLIPSES RATHER THAN CIRCLES. The garden stage is 1400x788, so a circle drawn in
                the stretched overlay comes out as a wide oval; dividing the vertical radius by the
                aspect makes it round on screen. The marker is the child's eye-line during the walk,
                so a lopsided one would be a distraction through the whole measurement.
              */}
              <ellipse
                cx={marker.x}
                cy={marker.y}
                rx={0.021}
                ry={0.021 / GARDEN_ASPECT}
                fill="#fff"
                opacity={0.35}
              />
              <ellipse
                cx={marker.x}
                cy={marker.y}
                rx={0.013}
                ry={0.013 / GARDEN_ASPECT}
                fill={active.colour}
                stroke="#fff"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              {/*
                THE COUNTER IS THE TEACHING MOMENT, so it is large and attached to the walker
                rather than tucked in a corner - a child watching the dot needs to see the number
                rise with each edge it crosses.
              */}
              <g transform={`translate(${Math.min(marker.x + 0.035, 0.94)} ${Math.max(marker.y - 0.03, 0.04)})`}>
                <ellipse
                  rx={0.026}
                  ry={0.026 / GARDEN_ASPECT}
                  fill="rgba(15, 23, 42, 0.92)"
                  stroke="#fff"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="0.036"
                  fontWeight="900"
                  fill="#fff"
                >
                  {step}
                </text>
              </g>
            </g>
          )}
        </g>
      )}
    </Station1Stage>
  );
}
