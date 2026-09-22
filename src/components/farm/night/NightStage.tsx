/**
 * The SVG stage for "האסם בלילה".
 *
 * IN A DARK ROOM, WHAT YOU CAN SEE IS WHAT THE LIGHT TOUCHES. So the barn is
 * drawn lit, a FULLY OPAQUE blackout is laid over it with a hole where the torch
 * is, and the animals' eyes are drawn ON TOP of that blackout. Outside the beam
 * the barn is not dim - it is black, and the only things in it are the paired
 * glowing eyes.
 *
 * THE LAYER ORDER IS THE MECHANISM, so it is worth stating plainly. Each step
 * below depends on the one above it, and reordering any pair breaks the effect:
 *
 *   1. Barn backdrop      always visible (it is what the torch reveals)
 *   2. Animal bodies      hidden everywhere EXCEPT through the beam's hole
 *   3. Darkness overlay   fully opaque, hole cut with evenodd
 *   4. Beam rim glow      the warm ring around the hole
 *   5. Glowing eyes       drawn LAST, so they shine out of the blackness
 *
 * `touch-none` stops the browser treating a drag as a scroll, so the beam can be
 * swept on a tablet without the page moving underneath it.
 *
 * The pointer wiring lives in `Flashlight`; this component only lays out the
 * scene and hands down the SVG ref the beam needs for coordinate mapping.
 */
import { useRef } from 'react';
import NightAnimalBody from './NightAnimalBody';
import GlowingEyes from './GlowingEyes';
import Flashlight from './Flashlight';
import { FLOOR_COLOR, FLOOR_Y, VIEW_H, VIEW_W, WALL_COLOR } from './nightStageData';
import type { NightSpot } from './nightTypes';

interface NightStageProps {
  spots: NightSpot[];
  /** True once the round is answered - the barn floods with light. */
  revealed: boolean;
  /** True when the answer was right, so the animals celebrate. */
  cheering: boolean;
}

export default function NightStage({ spots, revealed, cheering }: NightStageProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="w-full h-auto max-h-[340px] touch-none select-none"
      role="img"
      aria-label={`${spots.length} חיות באסם חשוך`}
    >
      {/* === LAYER 1: the barn backdrop. === */}
      <g>
        <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={WALL_COLOR} />
        {/* Vertical beams, so the walls read as a barn rather than a void. */}
        {[110, 400, 690].map((x) => (
          <rect key={x} x={x} y={0} width={26} height={FLOOR_Y} fill="#120e20" />
        ))}
        {/* A loft beam across the top. */}
        <rect x={0} y={54} width={VIEW_W} height={18} fill="#120e20" />
        <rect x={0} y={FLOOR_Y} width={VIEW_W} height={VIEW_H - FLOOR_Y} fill={FLOOR_COLOR} />
        {/* Hay bales along the back wall, so the torch finds something to reveal. */}
        {[150, 320, 520, 660].map((x) => (
          <g key={x}>
            <rect x={x} y={FLOOR_Y - 26} width={54} height={26} rx={5} fill="#8a6a3a" />
            <rect x={x + 6} y={FLOOR_Y - 20} width={42} height={4} rx={2} fill="#6d5330" />
            <rect x={x + 6} y={FLOOR_Y - 11} width={42} height={4} rx={2} fill="#6d5330" />
          </g>
        ))}
        {/* Straw: a few scattered strokes, deterministic so they never flicker. */}
        {[40, 150, 260, 370, 480, 590, 700, 760].map((x, i) => (
          <path
            key={x}
            d={`M${x} ${VIEW_H - 12 - (i % 3) * 8} l14 -7 M${x + 6} ${VIEW_H - 8 - (i % 2) * 9} l11 -5`}
            stroke="#4a3a2a"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.7}
          />
        ))}
      </g>

      {/* === LAYER 2: the animal bodies. Hidden by Layer 3 except through the hole. === */}
      <g>
        {spots.map((spot, index) => (
          <NightAnimalBody key={spot.id} spot={spot} cheering={cheering} index={index} />
        ))}
      </g>

      {/* === LAYERS 3 + 4: the blackout, its cutout hole, and the beam rim. === */}
      <Flashlight svgRef={svgRef} flood={revealed} />

      {/* === LAYER 5: the glowing eyes, ABOVE the blackout. === */}
      <GlowingEyes spots={spots} />
    </svg>
  );
}
