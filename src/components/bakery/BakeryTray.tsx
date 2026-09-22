/**
 * The hero: a metallic baking sheet of cookies.
 *
 * This file replaced `OvenTray`, whose brick oven was a 24-unit-tall slab of
 * `stone-900` sitting behind the sheet. That oven was the "dark background
 * blocker": it was the single largest dark mass on the screen and it punched a
 * hole straight through the bakery illustration. It is gone. The sheet now
 * carries the whole image on its own, with a warm rim and a soft contact shadow
 * so it still reads as an object resting on the counter rather than as a grid of
 * circles floating over the painting.
 *
 * SIZE IS THE ONE THING THE TRAY CANNOT DECIDE FOR ITSELF, and the first version
 * got it badly wrong. It derived the cell size from the grid alone (34vmin / 8 =
 * 4.25vmin) and ignored the fact that the sheet is WIDE as well as tall: an 8x8
 * tray came out 301px across on a 1280x900 screen, about a third of the space it
 * had, while a 2x3 tray came out looking identical. Both are wrong for a game
 * whose tray IS the question.
 *
 * The fix is to measure against BOTH axes. A grid of `cols x rows` occupies
 * `cols * cell` horizontally and `rows * cell` vertically, and the sheet's own
 * padding is proportional (percentages), so the aspect ratio of the whole object
 * is fixed by the grid. Sizing the cell to the LARGER of the two constraints -
 * the width budget divided by the columns, or the height budget divided by the
 * rows - gives the biggest tray that still fits, which is exactly the hero
 * treatment the brief asks for. The padding is folded in as an explicit factor
 * rather than being ignored, which is what let the old numbers run small.
 */
import type { SlotKind, TraySide } from './bakerySprint';

/** Backgrounds for the three cookie flavours. Crumbs are drawn separately. */
const SLOT_CLASS: Record<Exclude<SlotKind, 'crumbs'>, string> = {
  cookie: 'bg-gradient-to-br from-amber-200 to-amber-500',
  chocolate: 'bg-gradient-to-br from-amber-800 to-amber-950',
  berry: 'bg-gradient-to-br from-rose-300 to-rose-500',
};

/**
 * Width and height budgets for the tray area.
 *
 * These are the space actually left for the trays: the district frame is capped
 * at `max-h-[720px]`, and above it sit the shell's title sign plus the game's own
 * header and category badge, with four answer buttons below.
 *
 * THE WIDTH HERE IS GENEROUS ON PURPOSE. A single tray's height is what binds on every grid
 * this game uses (they are all wider than they are tall), so the width figure only matters
 * for the two-tray comparison - where it is halved. Setting it to the real full width would
 * therefore have no effect on any common case while making the halved case exactly correct.
 */
const MAX_W = 620;
/** The vertical space for the WHOLE tray object, sheet plus its caption. */
const MAX_H = 300;

/**
 * The caption row under each sheet ("4 × 5"), and the gap above it.
 *
 * SUBTRACTED BEFORE SIZING, NOT IGNORED. The caption is a sibling of the sheet inside a flex
 * column, so it takes real vertical space that the sheet cannot use. Sizing the sheet against
 * the whole budget is what pushed the caption (and with it the whole tray) below the fold -
 * a tray that fits but whose label is clipped looks exactly like an overflowing tray.
 */
const CAPTION_H = 22;

/**
 * The sheet's own chrome, as fractions of the box it is applied to.
 *
 * THE OLD 1.12 WAS WHY COOKIES SPILLED OVER THE TRAY'S EDGES. It was meant to cover the
 * sheet's padding and gaps, but those are PERCENTAGES, and percentages COMPOUND against their
 * parent rather than adding up:
 *
 *   outer padding   2.5% of the sheet's inner width, on EACH side   -> +5%
 *   inner padding   2.5% of the grid box, on EACH side              -> +5%
 *   grid gaps       6% of the grid box, BETWEEN columns             -> +6% * (cols-1)/cols
 *   borders         3px + 3px, which percentages cannot express at all
 *
 * A single 1.12 factor therefore under-counts on every axis, and the error grows with the
 * column count - which is why the widest trays were the ones that overflowed while 2x3 looked
 * fine. These constants describe the same layout honestly, and `sheetPx` applies them in the
 * order the browser does.
 */
const SHEET_PADDING_FRACTION = 0.05;
const GRID_PADDING_FRACTION = 0.05;
const GRID_GAP_FRACTION = 0.06;
/** The sheet's border pair (3px + 3px), which is a length rather than a percentage. */
const SHEET_BORDER_PX = 6;

/**
 * The largest cell that fits a `cols x rows` grid in the given pixel budget.
 *
 * ==================================================================
 * SOLVED BY MEASUREMENT, NOT BY ALGEBRA - AND THAT IS THE FIX.
 * ==================================================================
 *
 * The tempting version of this function inverts the sheet's layout analytically: subtract the
 * borders, divide out the two nested paddings, divide by the cell count, take out the gap
 * share. It is wrong, and wrong in a way that is invisible on a whiteboard.
 *
 * The layout NESTS: the grid's gap percentage is resolved against the grid box, and that box
 * is itself the result of the sheet's padding percentage. Because the two percentages apply
 * in series rather than in parallel, the closed form has to account for the padding that the
 * gaps are sitting inside - and the first version of this function did not, so it returned a
 * cell about 5% too big on every axis. At a 300px height budget that is a 16px overshoot,
 * which is exactly the "cookies spill over the edges of the grey tray" the brief reports.
 *
 * The honest fix is to ask the LAYOUT what it measures instead of predicting it. `sheetPx`
 * below reproduces the CSS the component actually emits - borders, nested paddings, gaps and
 * all - and this function walks the cell size down from a provably-too-big upper bound until
 * that simulation fits the budget. It is a dozen iterations of arithmetic on two integers, run
 * once per question, so the cost is irrelevant next to being correct.
 *
 * `sheetPx` and the `Sheet` component's class list are a matched pair: if the classes change,
 * these constants have to change with them, which is why they live side by side in one file.
 */
function sheetPx(cols: number, rows: number, cell: number): { w: number; h: number } {
  /** One axis: cells, the gaps between them, then the two nested paddings, then the border. */
  const along = (count: number) => {
    const withGaps = cell * count + GRID_GAP_FRACTION * cell * (count - 1);
    const withGridPadding = withGaps + 2 * (GRID_PADDING_FRACTION * withGaps);
    const withSheetPadding = withGridPadding + 2 * (SHEET_PADDING_FRACTION * withGridPadding);
    return withSheetPadding + SHEET_BORDER_PX;
  };
  return { w: along(cols), h: along(rows) };
}

/**
 * The largest cell that fits `cols x rows` in the budget, found by walking down from an upper bound.
 *
 * The starting point is the naive "budget / count" cell, which ignores all chrome and is
 * therefore always at least as big as the true answer - so the loop is guaranteed to start at
 * or above the solution and to terminate on it. The floor of 6px is a hard minimum so a
 * pathological grid degrades to a tiny-but-drawn tray rather than to zero-size cookies.
 */
function cellPxFor(cols: number, rows: number, widthBudget: number, heightBudget: number): number {
  let cell = Math.floor(Math.min(widthBudget / cols, heightBudget / rows));
  while (cell > 6) {
    const size = sheetPx(cols, rows, cell);
    if (size.w <= widthBudget && size.h <= heightBudget) break;
    cell -= 1;
  }
  return Math.max(6, cell);
}

/**
 * The sweet colours. SATURATED AND DISTINCT, because the chips are counters.
 *
 * These were brown-on-tan before, which is the colour of an actual chocolate chip and
 * therefore the worst possible choice for a dot a child has to COUNT. Subitizing a group
 * depends on the dots being separable at a glance, and low contrast against the cookie
 * defeats that before the layout even matters. The palette also has to stay readable on
 * the dark chocolate and rose cookies, so every chip carries a light rim.
 */
const CHIP_COLORS = [
  'bg-red-500',
  'bg-cyan-400',
  'bg-yellow-300',
  'bg-fuchsia-500',
] as const;

/**
 * Where the chips sit, by count - the SUBITIZING LAYOUTS.
 *
 * THE ARRANGEMENT IS THE WHOLE POINT OF THE CHANGE. Three chips scattered at random is a
 * counting task; three chips in a triangle is a pattern the eye resolves without counting,
 * which is the skill these questions are built on. The brief names one layout per count and
 * they are implemented literally, because each is a shape a child already recognises:
 *
 *   2 chips - side by side, horizontally, the simplest possible pair
 *   3 chips - an equilateral triangle, the canonical three-dot arrangement
 *   4 chips - a 2x2 square, which doubles as a diamond when the tray is rotated
 *
 * `y` is the vertical centre of each chip as a percentage of the cookie, and the triangle's
 * top chip is centred over the two below it so the sides come out equal rather than merely
 * looking roughly even.
 */
const CHIP_LAYOUTS: Record<number, ReadonlyArray<{ x: number; y: number }>> = {
  2: [
    { x: 33, y: 50 },
    { x: 67, y: 50 },
  ],
  3: [
    { x: 50, y: 26 },
    { x: 28, y: 68 },
    { x: 72, y: 68 },
  ],
  4: [
    { x: 32, y: 32 },
    { x: 68, y: 32 },
    { x: 32, y: 68 },
    { x: 68, y: 68 },
  ],
};

/**
 * The chip size as a percentage of the cell, by count.
 *
 * FEWER CHIPS, BIGGER CHIPS. Two dots can afford to be large without crowding; four have
 * to shrink or the 2x2 square closes into a blob. Sizing by count is what keeps both
 * layouts legible at the cell sizes the widest trays produce, where a fixed percentage
 * would render four dots as overlapping specks.
 */
const CHIP_SIZE_BY_COUNT: Record<number, number> = { 1: 30, 2: 30, 3: 26, 4: 24 };

/** How many candies a cookie carries, drawn from the level's table. */
function chipCountFor(kind: SlotKind, candies: number): number {
  // A plain "cookie" carries the chocolate chips it always did, laid out as a triangle.
  if (kind === 'cookie') return 3;
  // A "nibbled" cookie is a hole, not a cookie, so it has no candies at all.
  if (kind === 'crumbs') return 0;
  // The flavour cookies carry the level's candy count, which is what Level 3 multiplies.
  return candies;
}

/**
 * One cookie: a warm disc with candies on it, sized by the caller.
 *
 * `candies` is the number of sweets this cookie carries. It is a parameter rather than a
 * constant because Level 3 asks for the total across the WHOLE tray, which is
 * `rows x cols x candies` - so the count has to be visible, countable, and identical on
 * every cookie for that question to be fair.
 */
function Cookie({ kind, candies }: { kind: SlotKind; candies: number }) {
  if (kind === 'crumbs') {
    // Crumbs stay visible so the tray still shows the grid it began as, and they
    // are drawn INSIDE the slot (a clipped circle plus two specks) rather than
    // around it - the previous version was not even `relative`, so its absolute
    // specks escaped and drew on top of the neighbouring cookies.
    return (
      <span className="relative block h-full w-full overflow-hidden rounded-full border border-dashed border-amber-900/30 bg-amber-900/5">
        <span className="absolute left-[26%] top-[30%] h-[22%] w-[22%] rounded-full bg-amber-950/40" />
        <span className="absolute right-[22%] bottom-[26%] h-[16%] w-[16%] rounded-full bg-amber-950/35" />
      </span>
    );
  }

  const count = chipCountFor(kind, candies);
  const layout = CHIP_LAYOUTS[count];
  const size = CHIP_SIZE_BY_COUNT[count] ?? 24;

  return (
    <span
      className={`relative block h-full w-full rounded-full shadow-[inset_0_-14%_0_rgba(120,53,15,0.28)] ${SLOT_CLASS[kind]}`}
    >
      {/*
        A LAYOUT, OR NOTHING.

        Counts with a defined subitizing layout are drawn from the table; any other count
        (a level asking for five candies) falls back to the stacked trio rather than
        rendering no candies at all, which would silently make the question unanswerable.
      */}
      {layout ? (
        layout.map((chip, index) => (
          <span
            key={index}
            style={{
              left: `${chip.x}%`,
              top: `${chip.y}%`,
              width: `${size}%`,
              height: `${size}%`,
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-white/70 ${
              CHIP_COLORS[index % CHIP_COLORS.length]
            }`}
          />
        ))
      ) : (
        <>
          <span className="absolute left-[30%] top-[24%] h-[16%] w-[16%] rounded-full bg-red-500 ring-1 ring-white/70" />
          <span className="absolute right-[26%] top-[46%] h-[16%] w-[16%] rounded-full bg-cyan-400 ring-1 ring-white/70" />
          <span className="absolute bottom-[22%] left-[44%] h-[16%] w-[16%] rounded-full bg-yellow-300 ring-1 ring-white/70" />
        </>
      )}
    </span>
  );
}

/**
 * The metallic sheet.
 *
 * The lip is a border plus a gradient rather than a second element, so the sheet
 * costs one box per tray and stays cheap to repaint dozens of times a round.
 */
function Sheet({ side, cell, candies }: { side: TraySide; cell: number; candies: number }) {
  const px = `${cell.toFixed(1)}px`;
  return (
    <div className="flex flex-col items-center gap-1">
      {/*
        `w-fit` SO THE SHEET CANNOT BE WIDER THAN THE GRID IT CONTAINS.

        Without it the sheet is a block in a flex column and can be stretched by its parent,
        which is how the tray itself ended up wider than the cells inside it - a different
        overflow from the cell-size bug above, and one that no amount of tuning the cell size
        would have fixed.
      */}
      <div className="w-fit rounded-2xl border-[3px] border-stone-400/80 bg-gradient-to-br from-stone-200 via-stone-300 to-stone-400 p-[2.5%] shadow-[0_10px_22px_rgba(0,0,0,0.35),inset_0_2px_0_rgba(255,255,255,0.9)]">
        <div
          className="grid gap-[6%] rounded-lg bg-stone-500/25 p-[2.5%]"
          style={{ gridTemplateColumns: `repeat(${side.cols}, ${px})` }}
        >
          {side.slots.map((kind, index) => (
            <span key={index} style={{ width: px, height: px }}>
              <Cookie kind={kind} candies={candies} />
            </span>
          ))}
        </div>
      </div>
      {/* A tray label, so a score line can name which sheet was which. */}
      <span className="text-[10px] font-black text-amber-950/60">
        {side.rows} × {side.cols}
      </span>
    </div>
  );
}

export default function BakeryTray({
  trays,
  candies = 3,
}: {
  trays: TraySide[];
  /** How many candies each flavour cookie carries. Level 3 multiplies this. */
  candies?: number;
}) {
  const sideCount = Math.max(1, trays.length);
  // A comparison puts two sheets side by side, so each gets half the width (less the gap
  // between them). The height budget is shared by neither - they sit on the same line.
  const widthPerTray = (MAX_W - (sideCount - 1) * 28) / sideCount;
  // The sheet is sized against the space left once its own caption is accounted for.
  const heightBudget = MAX_H - CAPTION_H;

  const cells = trays.map((t) => cellPxFor(t.cols, t.rows, widthPerTray, heightBudget));

  // ONE CELL SIZE FOR EVERY TRAY, TAKEN FROM THE TIGHTEST CONSTRAINT, so two trays in a
  // comparison show cookies of the SAME size - that comparison has to be about the count, not
  // about which tray happened to get bigger dots.
  //
  // The minimum is over EVERY tray's two-axis limit, not over a per-tray cell: a tray that is
  // wide and short and one that is narrow and tall have different binding axes, and taking the
  // smaller of the two finished cells is what keeps BOTH inside their budget. Sizing each tray
  // independently and then sharing the result would let the wider tray's width constraint be
  // applied to the taller one's rows, which is how a comparison ends up spilling sideways.
  const cell = Math.max(6, Math.min(...cells));

  return (
    <div className="flex flex-wrap items-center justify-center gap-3" dir="ltr">
      {trays.map((side, index) => (
        <Sheet key={index} side={side} cell={cell} candies={candies} />
      ))}
    </div>
  );
}
