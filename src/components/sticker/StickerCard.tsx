/**
 * THE sticker card: one component that draws a sticker in every state it can be in.
 *
 * WHY THIS EXISTS AS ITS OWN FILE. The album was drawing stickers in two places - once as
 * `StickerTile` and once inline in the medallions grid - and both needed the rarity
 * treatments. Two copies of a foil sweep is two chances for the rare card and the rare
 * medallion to end up looking like different ranks. There is now one card, used
 * everywhere, so a rarity is defined exactly once.
 *
 * ============================ THE MYSTERY RULE ============================
 *
 * A LOCKED CARD RENDERS NO IMAGE AT ALL. Not a blurred one, not a darkened one, not a
 * silhouette - no `<img>` element and therefore no request for the file.
 *
 * This replaces an earlier design that deliberately kept a near-black silhouette, on the
 * theory that "there is a picture waiting" is a better hook than an empty box. That was
 * wrong for this catalogue. Several of these images are READABLE as shapes - a pony, a
 * windmill, a birthday cake - so a silhouette leaks the surprise it is supposed to be
 * guarding, and the child who wanted the pony has no reason left to open packs. The
 * mystery is the product, so the lockdown is total: the file is not fetched, and the card
 * shows a lock and a question mark instead.
 *
 * ============================ THE RARITY LADDER ============================
 *
 * Common: plain warm cardboard. It is the filler of the set and should look like it.
 * Rare: iridescent cyan border, a glow, and the foil sweep that crosses the card.
 * Legendary: gold, a stronger glow, an inner yellow ring, the sweep, AND drifting
 *   sparkles - the top of the ladder is visibly busier, which is what makes pulling one
 *   feel like an event.
 *
 * The three ranks differ in BORDER COLOUR, GLOW, BADGE and MOTION, so they stay
 * distinguishable from across the room, and they stay distinguishable with reduced motion
 * on because only the last of those four is animated.
 */
import type { StickerItem } from '../../data/stickersData';

/** How a card chooses to present itself, independent of how it is laid out. */
export type StickerCardSize = 'sm' | 'md' | 'lg';

interface StickerCardProps {
  sticker: StickerItem;
  isUnlocked: boolean;
  onClick?: () => void;
  size?: StickerCardSize;
  /** Overrides the card's own action label, e.g. "קני עכשיו: 200 🍪". */
  actionLabel?: string;
}

/** Rarity presentation, in one place so no two cards can disagree. */
const RARITY_STYLE = {
  common: {
    /** The frame of the card itself. */
    frame: 'border-amber-300 bg-gradient-to-b from-amber-50 to-amber-100',
    /** The badge under the artwork. */
    badge: 'bg-amber-200/90 text-amber-900',
    label: 'נפוץ',
    glyph: '',
  },
  rare: {
    frame:
      'border-cyan-300 bg-gradient-to-b from-cyan-50 to-sky-100 shadow-[0_0_15px_rgba(56,189,248,0.35)]',
    badge: 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm',
    label: 'נדיר',
    glyph: '✨',
  },
  legendary: {
    frame:
      'border-amber-400 bg-gradient-to-b from-amber-50 via-yellow-50 to-amber-100 shadow-[0_0_22px_rgba(245,158,11,0.55)] ring-2 ring-yellow-300/40',
    badge: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-amber-950 shadow-md',
    label: 'אגדי',
    glyph: '👑',
  },
} as const;

/** Aspect ratio of the artwork window, per card size. */
const ART_ASPECT: Record<StickerCardSize, string> = {
  sm: 'aspect-square',
  md: 'aspect-[4/3]',
  lg: 'aspect-[4/5]',
};

export default function StickerCard({
  sticker,
  isUnlocked,
  onClick,
  size = 'md',
  actionLabel,
}: StickerCardProps) {
  const rarity = RARITY_STYLE[sticker.rarity];
  const interactive = typeof onClick === 'function';

  /*
   * The accessible name carries the same information the card shows, and in the locked
   * case it deliberately does NOT name the sticker either - a screen reader should be
   * told as little as the picture does.
   */
  const ariaLabel = isUnlocked
    ? `${sticker.title} - ${rarity.label}`
    : sticker.isPuzzlePiece
      ? `חלק פאזל - מדבקה מסתורית, ${sticker.directPrice ?? 0} עוגיות`
      : `מדבקה מסתורית - ${sticker.directPrice ?? 0} עוגיות`;

  const Tag = interactive ? 'button' : 'div';

  return (
    <Tag
      {...(interactive
        ? { type: 'button' as const, onClick, 'aria-label': ariaLabel }
        : { 'aria-hidden': true })}
      className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border-2 p-1 text-right transition-transform duration-200 ${
        interactive ? 'hover:scale-105' : ''
      } ${isUnlocked ? rarity.frame : 'border-dashed border-amber-600/40 bg-gradient-to-b from-amber-950/80 to-slate-900'}`}
    >
      <span className={`relative block w-full overflow-hidden rounded-xl ${ART_ASPECT[size]}`}>
        {isUnlocked ? (
          <UnlockedArt sticker={sticker} />
        ) : (
          <MysteryArt sticker={sticker} />
        )}
      </span>

      {/* The captions. Both are shared between states so the card never changes height
          when a sticker is unlocked - a grid that reflows on purchase would make the
          child lose the card they were looking at. */}
      <span
        className={`mt-1 block truncate px-0.5 text-[11px] font-black ${
          isUnlocked ? 'text-amber-950' : 'text-amber-100/90'
        }`}
      >
        {isUnlocked
          ? sticker.title
          : sticker.isPuzzlePiece
            ? `חלק פאזל #${puzzlePosition(sticker)}`
            : 'מדבקה מסתורית'}
      </span>

      {/* The locked card keeps its price visible: the mystery is about WHAT, not how
          much, and an unpriced card would leave the child with nothing to act on. */}
      {isUnlocked ? (
        <span
          className={`mb-0.5 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${rarity.badge}`}
        >
          {sticker.rarity === 'legendary' ? (
            <>אגדי <span aria-hidden>👑</span></>
          ) : sticker.rarity === 'rare' ? (
            <>נדיר <span aria-hidden>✨</span></>
          ) : (
            'נפוץ'
          )}
        </span>
      ) : (
        <>
          <span className="mb-0.5 inline-flex w-fit items-center gap-1 rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-black text-amber-200">
            הפתעה <span aria-hidden>?</span>
          </span>
          {actionLabel && sticker.directPrice !== undefined && (
            <span className="mb-0.5 w-full rounded-xl border border-amber-400/70 bg-amber-500/20 px-1.5 py-1 text-center text-[10px] font-black text-amber-100 transition group-hover:bg-amber-500/35">
              {actionLabel}
            </span>
          )}
        </>
      )}
    </Tag>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  The states                                */
/* -------------------------------------------------------------------------- */

/** The revealed artwork, with its rarity's shine treatment. */
function UnlockedArt({ sticker }: { sticker: StickerItem }) {
  const shiny = sticker.rarity === 'rare' || sticker.rarity === 'legendary';
  const legendary = sticker.rarity === 'legendary';

  return (
    <>
      <img
        src={sticker.imageSrc}
        alt=""
        aria-hidden
        loading="lazy"
        className="h-full w-full object-cover"
      />

      {/* The foil sweep. Clipped by this wrapper so the slanted band can never spill
          onto the neighbouring card in the grid. */}
      {shiny && (
        <span className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <span className="animate-shimmer-foil absolute -top-1/2 h-[200%] w-1/2 -skew-x-[25deg] bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        </span>
      )}

      {/* Legendary sparkles, scattered by index so the field never marches in step. */}
      {legendary && (
        <span aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          {LEGEND_SPARKS.map((spark, index) => (
            <span
              key={index}
              className="absolute animate-[legendSpark_2.6s_ease-in-out_infinite] text-[10px]"
              style={{
                left: `${spark.left}%`,
                top: `${spark.top}%`,
                animationDelay: `${spark.delay}ms`,
              }}
            >
              ✨
            </span>
          ))}
        </span>
      )}

      {/* The animated-file marker, so a child knows which stickers move. */}
      {sticker.imageSrc.endsWith('.gif') && (
        <span className="absolute bottom-1 left-1 z-10 rounded-full bg-amber-950/70 px-1.5 py-0.5 text-[9px] font-black text-amber-100">
          ✨
        </span>
      )}
    </>
  );
}

/**
 * The locked card's face: a lock, a question mark, and nothing else.
 *
 * No `<img>` is rendered here, which is the whole point - the browser never requests the
 * artwork, so it cannot be revealed by a devtools peek either.
 */
function MysteryArt({ sticker }: { sticker: StickerItem }) {
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-[radial-gradient(circle_at_50%_35%,rgba(251,191,36,0.18),transparent_70%)]">
      <span
        aria-hidden
        className="animate-[mysteryPulse_2s_ease-in-out_infinite] text-2xl leading-none"
      >
        🔒
      </span>
      <span aria-hidden className="text-base font-black leading-none text-amber-300/90">
        ❓
      </span>
      {sticker.isPuzzlePiece && (
        <span className="mt-0.5 text-[10px] font-black text-amber-200/80">
          חלק #{puzzlePosition(sticker)}
        </span>
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

/** 1-based reading position of a puzzle piece, or 0 when the sticker is not one. */
function puzzlePosition(sticker: StickerItem): number {
  const slice = sticker.puzzleSlice;
  if (!slice) return 0;
  return slice.row * slice.totalCols + slice.col + 1;
}

/**
 * A fixed, hand-scattered sparkle field.
 *
 * Written out rather than generated so the layout is stable across renders - random
 * positions would make the sparkles jump every time the page re-rendered, which reads as
 * a glitch rather than as sparkle.
 */
const LEGEND_SPARKS = [
  { left: 12, top: 68, delay: 0 },
  { left: 30, top: 30, delay: 420 },
  { left: 52, top: 76, delay: 880 },
  { left: 72, top: 40, delay: 260 },
  { left: 86, top: 66, delay: 1240 },
  { left: 44, top: 16, delay: 1680 },
];
