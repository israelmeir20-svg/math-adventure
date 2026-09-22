/**
 * Chalk palette for the street hopscotch game.
 *
 * Kept apart from the components so the "hand-drawn sidewalk" look can be
 * tuned in one place. Borders are pastel-on-asphalt for contrast: white,
 * yellow and sky blue chalk all read clearly against the dark slate.
 */

export interface ChalkBorder {
  /** Tile outline - a solid chalk line, softened by the border radius. */
  border: string;
}

export const CHALK_BORDERS: ChalkBorder[] = [
  { border: 'border-white/80 shadow-[0_0_14px_rgba(255,255,255,0.14)]' },
  { border: 'border-yellow-200/80 shadow-[0_0_14px_rgba(253,224,71,0.16)]' },
  { border: 'border-sky-200/80 shadow-[0_0_14px_rgba(125,211,252,0.16)]' },
];

/**
 * Choice chips, written onto the asphalt. Each carries a dark text colour so
 * the numbers stay legible at the sizes third-graders tap.
 */
export const CHOICE_STYLES = [
  'border-white/70 bg-white/10 text-white hover:bg-white/20',
  'border-yellow-200/70 bg-yellow-200/10 text-yellow-50 hover:bg-yellow-200/20',
  'border-sky-200/70 bg-sky-200/10 text-sky-50 hover:bg-sky-200/20',
  'border-pink-200/70 bg-pink-200/10 text-pink-50 hover:bg-pink-200/20',
];
