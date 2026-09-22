/**
 * The night tower: a warm stone facade with a grid of tappable, arched windows.
 *
 * THE TOWER IS NOW STONE, NOT A BLACK BOX. The previous version was a flat `bg-slate-900/90` slab -
 * technically a building, but visually indistinguishable from a hole in the sky, and the gold windows
 * had nothing to sit against. The stone treatment (warm gradient, a lit cornice, a masonry texture from
 * layered translucent gradients rather than an image) gives the windows a SURFACE, which matters
 * because the whole game is "which of these lit up" and a lit window reads far more clearly against
 * masonry than against black.
 *
 * THE WINDOWS ARE ARCHED. A rounded-top frame is doing real work here, not just decoration: at a
 * glance, an arch is more distinguishable from the neighbouring arch than two plain rectangles are,
 * and this is a game about locating a specific cell in a grid under time pressure. The arch is drawn
 * with a border-radius pair (`rounded-t-full`) on a taller-than-wide cell, which gives a convincing
 * arched head without an SVG or a clip path - so the tap target stays a plain button.
 *
 * THREE STATES, THREE VISUAL LANGUAGES. A window is either glowing (memorise or revealed), dark glass,
 * or picked. Gold is reserved for "this window is lit", so a picked window can never be confused with
 * a lit one during recall - which is the whole game. The reveal state adds a soft green ring rather
 * than a different fill, so a correct window still reads as gold, just confirmed.
 */
interface BuildingFacadeProps {
  /** Indices lit by the game. */
  pattern: number[];
  /** Indices the player has tapped. */
  selected: number[];
  /** True while the pattern is being shown. */
  lit: boolean;
  /** True after a correct recall - the pattern shines again, in green. */
  reveal: boolean;
  /** True after a mistake - the tower shakes red. */
  wrong: boolean;
  /** Indices the player missed, ringed on the post-mistake reveal. */
  missed: number[];
  cols: number;
  rows: number;
  disabled: boolean;
  onToggle: (index: number) => void;
}

export default function BuildingFacade({
  pattern,
  selected,
  lit,
  reveal,
  wrong,
  missed,
  cols,
  rows,
  disabled,
  onToggle,
}: BuildingFacadeProps) {
  const total = cols * rows;

  return (
    <div
      className={`relative rounded-t-3xl border-2 border-amber-900/50 p-3 shadow-2xl sm:p-4 ${
        wrong ? 'motion-safe:animate-[shake_.45s_ease-in-out]' : ''
      }`}
      style={{
        /*
          LAYERED GRADIENTS RATHER THAN A TEXTURE IMAGE. Four stacked backgrounds give the slab a warm
          stone read - a vertical light-to-dark ramp for the wall, plus two faint diagonal sheens that
          break up the flatness the way masonry courses would. Doing it in `background-image` keeps the
          tower zero-asset and infinitely scalable, and it cannot fail to load.
        */
        backgroundImage: [
          'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, transparent 42%)',
          'linear-gradient(200deg, rgba(0,0,0,0.16) 0%, transparent 55%)',
          'linear-gradient(180deg, #7c5a3a 0%, #5b4130 45%, #3f2d21 100%)',
        ].join(','),
      }}
    >
      {/* Lit cornice, so the slab has a top edge and reads as architecture. */}
      <span
        aria-hidden
        className="absolute inset-x-2 -top-1 h-1.5 rounded-full bg-gradient-to-b from-amber-300/70 to-amber-700/60"
      />

      {/* Rooftop aerial and a warning beacon. */}
      <span aria-hidden className="absolute -top-3 start-1/2 h-3 w-0.5 -translate-x-1/2 bg-amber-950/70" />
      <span
        aria-hidden
        className={`absolute -top-4 start-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-rose-500 ${
          wrong ? 'motion-safe:animate-[pulseLock_.4s_ease-in-out_infinite]' : ''
        }`}
      />

      {/*
        THE COLUMN COUNT IS DRIVEN BY A TAILWIND CLASS THE COMPILER CAN SEE, WITH THE
        INLINE STYLE AS THE FALLBACK.

        A dynamic `grid-cols-${cols}` string never appears in the source as a literal, so
        Tailwind's scanner cannot find it and the class is never generated - the board
        silently falls back to a single column. Listing the two real cases as literals is
        what keeps 4x4 boards actually four wide. The inline `gridTemplateColumns` is kept
        as well, so a level with some other column count still lays out correctly rather
        than collapsing.
      */}
      <div
        className={`grid gap-1.5 sm:gap-2 ${
          cols === 4 ? 'grid-cols-4' : cols === 3 ? 'grid-cols-3' : ''
        }`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: total }, (_, index) => {
          const isLit = (lit || reveal) && pattern.includes(index);
          const isPicked = !lit && !reveal && selected.includes(index);
          const isMissed = missed.includes(index);
          // On the post-mistake reveal, the player's own wrong picks must stay
          // legible: the point of the reveal is the COMPARISON between what they
          // chose and what was actually lit, and that comparison is impossible if
          // their picks have faded back into the dark glass.
          const isWrongPick = wrong && !isMissed && selected.includes(index);

          /*
            GOLD MEANS LIT. The lit state is the brightest thing on the board by a wide margin - a
            saturated amber fill plus an 18px glow - so it wins against both the pale stone and the
            night-blue glass no matter where the eye lands.
          */
          const tone = isLit
            ? 'border-2 border-amber-100 bg-gradient-to-b from-amber-200 to-amber-400 shadow-[0_0_18px_#facc15]'
            : isWrongPick
              ? 'border-2 border-rose-300/80 bg-amber-400/50'
              : isPicked
                ? 'border-2 border-amber-300 bg-amber-400/70 shadow-[0_0_12px_rgba(252,211,77,0.45)]'
                : 'border border-indigo-300/25 bg-indigo-950/70 hover:border-indigo-200/50 hover:bg-indigo-900/70';

          return (
            <button
              key={index}
              type="button"
              onClick={() => onToggle(index)}
              disabled={disabled}
              aria-label={`חלון ${index + 1}`}
              aria-pressed={isPicked || isLit}
              /*
                THE CELL SHRINKS ON THE WIDER BOARD. A 4x4 of the 3x3's 56px windows is
                290px of grid plus gaps, which overflows a phone in portrait. The columns
                get progressively smaller as the board widens so the TOWER stays roughly the
                same size on screen and the round does not become a scrolling exercise - the
                spacing changes, not the whole layout.

                ONLY REAL TAILWIND SCALE STEPS ARE USED. `h-13` and `h-15` look plausible and
                do not exist in Tailwind 3's default scale, so they compile to NOTHING - the
                cell silently loses its height and collapses. Every value here is a step the
                default scale actually defines (9/10/11/12/14).

                `rounded-t-full` IS THE ARCH. Paired with a cell that is taller than it is
                wide, it draws a rounded head over a straight-sided frame - the shape of a
                real window - with no SVG and no change to the tap target, which stays a
                plain rectangular button.
              */
              className={`relative rounded-t-full rounded-b-md transition-all duration-200 motion-reduce:transition-none disabled:cursor-default ${
                cols >= 4
                  ? 'h-10 w-9 sm:h-12 sm:w-11 md:h-14 md:w-12'
                  : 'h-11 w-10 sm:h-14 sm:w-12 md:h-16 md:w-14'
              } ${tone}`}
            >
              {/* A missed window gets a rose ring on the post-mistake reveal. */}
              {isMissed && (
                <span
                  aria-hidden
                  className="absolute -inset-1 rounded-t-full rounded-b-md border-2 border-rose-400 motion-safe:animate-[pulseLock_.7s_ease-in-out_infinite]"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Ground floor: a lit doorway, tying the grid to the base of the building. */}
      <span
        aria-hidden
        className="absolute -bottom-1.5 start-1/2 h-3 w-10 -translate-x-1/2 rounded-t-full bg-amber-200/40"
      />
    </div>
  );
}
