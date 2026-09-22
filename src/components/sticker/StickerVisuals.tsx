/**
 * The album's visual pieces: a sliced puzzle card, a sticker tile, and the sparkle burst.
 *
 * Kept together because they share one idea - how a sticker is DRAWN - and apart from the
 * modal, which is about what a sticker COSTS. The modal can be re-laid-out without
 * anyone touching the cropping maths in here.
 */
import type { PuzzleSlice } from '../../data/stickersData';

/* -------------------------------------------------------------------------- */
/*                                 Puzzle slices                              */
/* -------------------------------------------------------------------------- */

/**
 * One crop out of a larger poster.
 *
 * HOW THE CROPPING WORKS. The single source image is blown up to
 * `totalCols x totalRows` times the card's size and then dragged by whole card-widths so
 * that the wanted cell lands in the window. Because the offsets are percentages of the
 * image's OWN size, the maths holds at any card size - the tile stays an exact
 * neighbour of the one beside it with no seams and no gap, which is the only thing that
 * makes the finished picture look like one image rather than a collage.
 *
 * `max-w-none` IS LOAD-BEARING. Tailwind's preflight sets `img { max-width: 100% }`, and
 * an image capped at its container's width cannot be enlarged past one cell - every tile
 * would show the same corner of the poster. The class overrides that cap.
 *
 * A LOCKED SLICE RENDERS NO IMAGE EITHER, matching `StickerCard`'s mystery rule: the
 * poster file is not fetched until the child owns at least one piece of it, and an
 * unowned cell shows a numbered blank instead of a glimpse of the picture. That matters
 * more here than anywhere else in the album, because every slice of a puzzle shares ONE
 * file - so a single leaked `<img>` would hand over the entire finished poster.
 */
export function PuzzleSliceCard({
  src,
  slice,
  isUnlocked,
  title,
  onClick,
}: {
  src: string;
  slice: PuzzleSlice;
  isUnlocked: boolean;
  title?: string;
  onClick?: () => void;
}) {
  const position = slice.row * slice.totalCols + slice.col + 1;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isUnlocked ? (title ?? `חלק פאזל ${position}`) : `חלק פאזל ${position} - מדבקה מסתורית`}
      className={`group relative w-full overflow-hidden rounded-lg border-2 transition-transform duration-200 ${
        isUnlocked
          ? 'cursor-pointer border-amber-400 shadow-md hover:scale-[1.03]'
          : 'border-dashed border-amber-600/40 bg-gradient-to-b from-amber-950/80 to-slate-900 hover:scale-105'
      }`}
      style={{ aspectRatio: '4 / 3' }}
    >
      {isUnlocked ? (
        <img
          src={src}
          alt=""
          aria-hidden
          className="pointer-events-none absolute max-w-none select-none"
          style={{
            width: `${slice.totalCols * 100}%`,
            height: `${slice.totalRows * 100}%`,
            top: `-${slice.row * 100}%`,
            left: `-${slice.col * 100}%`,
          }}
        />
      ) : (
        /*
         * The locked cell, matching `StickerCard`'s mystery slot: the palette, the lock
         * and the "חלק פאזל #N" wording are the same on both, so a child sees one
         * vocabulary for "you do not own this yet" rather than two.
         */
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-[radial-gradient(circle_at_50%_35%,rgba(251,191,36,0.16),transparent_70%)]">
          <span
            aria-hidden
            className="animate-[mysteryPulse_2s_ease-in-out_infinite] text-base leading-none"
          >
            🔒
          </span>
          <span className="text-[10px] font-black text-amber-200/90">חלק פאזל #{position}</span>
        </span>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Sparkle burst                                 */
/* -------------------------------------------------------------------------- */

/** Eight directions, so one `sparkOut` keyframe can drive the whole burst. */
const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * The sparkle burst fired when a card is revealed.
 *
 * Purely decorative: `aria-hidden`, `pointer-events-none`, and absolutely positioned so
 * it can never move the card it is celebrating or intercept the tap that dismisses it.
 * Each spark supplies its own travel vector as CSS variables, which is what lets a
 * single keyframe serve every direction.
 */
export function SparkleBurst({ size = 120, count = 8 }: { size?: number; count?: number }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-10"
      style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
    >
      {SPARK_ANGLES.slice(0, count).map((angle, index) => {
        const radians = (angle * Math.PI) / 180;
        const distance = size * 0.5;
        return (
          <span
            key={angle}
            className="absolute left-1/2 top-1/2 animate-[sparkOut_.8s_ease-out_forwards] text-lg"
            style={
              {
                '--dx': `${Math.cos(radians) * distance}px`,
                '--dy': `${Math.sin(radians) * distance}px`,
                animationDelay: `${index * 30}ms`,
              } as React.CSSProperties
            }
          >
            ✨
          </span>
        );
      })}
    </span>
  );
}
