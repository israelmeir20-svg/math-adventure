/**
 * Flat-topped hexagon geometry for axial coordinates (q, r).
 * Pure math - shared by tiles, the grid, and hover labels.
 */
import type { HexCoordinate } from '../../types/game.types';

/** Circumradius: centre -> vertex. Tiles are sized to fit nicely. */
export const HEX_SIZE = 46;

/** Flat-topped: horizontal spacing is 3/4 of the width (2 * size). */
export const HEX_WIDTH = HEX_SIZE * 2;
export const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;
export const COLUMN_STEP = HEX_SIZE * 1.5;
export const ROW_STEP = HEX_HEIGHT;

/** Axial -> pixel centre, with the vertical offset q applies. */
export function hexToPixel(coord: HexCoordinate): { x: number; y: number } {
  return {
    x: COLUMN_STEP * coord.q,
    y: ROW_STEP * (coord.r + coord.q / 2),
  };
}

/** Pixel centre -> axial, rounded to the nearest hex. */
export function pixelToHex(x: number, y: number): HexCoordinate {
  const q = (2 / 3) * (x / HEX_SIZE);
  const r = (-1 / 3) * (x / HEX_SIZE) + (Math.sqrt(3) / 3) * (y / HEX_SIZE);
  return roundAxial(q, r);
}

function roundAxial(q: number, r: number): HexCoordinate {
  const x = q;
  const z = r;
  const y = -x - z;
  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);
  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

/** The six corners of a flat-topped hexagon, as a ready-made SVG path. */
export function hexPath(size: number = HEX_SIZE): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i);
    points.push(
      `${(size * Math.cos(angle)).toFixed(2)},${(size * Math.sin(angle)).toFixed(2)}`,
    );
  }
  return `M${points.join('L')}Z`;
}

/** Bounding box of every coordinate (used to size the SVG viewBox). */
export function boundsOf(coords: HexCoordinate[]) {
  const xs = coords.map((c) => hexToPixel(c).x);
  const ys = coords.map((c) => hexToPixel(c).y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX - HEX_WIDTH,
    y: minY - HEX_HEIGHT,
    width: maxX - minX + HEX_WIDTH * 2,
    height: maxY - minY + HEX_HEIGHT * 2,
  };
}

/** Stable pseudo-random 0..1 value, so wander animations do not jump on render. */
export function pseudoRandom(seed: string, salt: number): number {
  let hash = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}
