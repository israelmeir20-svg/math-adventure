/**
 * Station 2 - the notebook, where the case is written as a balance and solved by hand.
 *
 * ================================================================================================
 * WHAT THIS STATION TEACHES
 * ================================================================================================
 *
 * The child is shown a balance of evidence - polaroids standing for the unknown X, post-it notes
 * standing for plain numbers - and has to reduce it until X stands alone. Every legal move is the
 * SAME algebraic operation applied to both pages at once, and the interaction is built so the
 * child cannot perform an illegal one:
 *
 *   PAIR   a note with a note, or a photo with a photo, ONE ON EACH PAGE. This is subtracting the
 *          same amount from both sides, which is why a pair must straddle the spine - a pair on a
 *          single page would be subtracting from one side only. A legal pair is APPLIED the moment
 *          the second item is clicked: both items shrink away and the move is done.
 *   DIVIDE when only photos remain on the left. Bundling the right-hand pile into as many
 *          envelopes as there are photos, then pairing one photo against one envelope, is
 *          dividing both sides by the coefficient.
 *
 * MISTAKES COST A MEDAL, NEVER A LOCKOUT. An illegal tap shakes the item and calls `onError`,
 * which the orchestrator counts and prices at the end of the case. Nothing is disabled and nothing
 * is undone: a child who guesses is told it did not work and is free to guess again, because a
 * station that ejects them teaches them to stop guessing - and the whole point of this one is that
 * the arithmetic rewards thinking it through.
 *
 * ================================================================================================
 * WHY THE ITEMS LIVE IN CSS GRID CELLS RATHER THAN AT COMPUTED POINTS
 * ================================================================================================
 *
 * THE PREVIOUS VERSION COMPUTED A CENTRE POINT FOR EVERY ITEM and placed it with `left`/`top` plus
 * a translate. It worked, and it was the wrong shape for this station, because the slot finder it
 * called (`slotsFor` in `notebookGeometry`) was written to space items as far apart as possible on
 * an empty page - a reasonable goal that produces arbitrary offsets, and the brief for this rebuild
 * is explicit that arbitrary offsets are the thing to remove.
 *
 * The layout here is therefore DECLARATIVE: each page is a CSS grid, each item is a grid cell, and
 * non-overlap is a property of the container rather than a property the arithmetic has to
 * preserve. An item cannot land on another because the browser will not put two cells in the same
 * place. That also removes the whole class of bug where a shrinking page renumbers its rows and the
 * items jump sideways mid-solve - a grid reflows instead of shuffling.
 *
 * The connective tissue the old approach did need - a stable slot per item - is gone with it. A
 * connector line is now drawn in a full-page SVG using each item's MEASURED DOM CENTRE, captured
 * when the pair is made; see `boxes` and `eliminating`.
 *
 * ================================================================================================
 * CLICK TO PAIR, AND WHY THE PAIR APPLIES AT ONCE
 * ================================================================================================
 *
 * A single click on a left item and then a right item of the same kind APPLIES the move: the line
 * is drawn across the spine, both items shrink away together, and the board is reduced. There is
 * no commit step and no double-click - the second click is the commitment.
 *
 * THE MARKED STATE AND THE ELIMINATION ARE ONE CLICK APART, SO THEY SHARE ONE TIMER. Both items are
 * put into `eliminating` on the click that makes the pair, which both draws the amber pair
 * treatment and starts the shrink in the same render; the timeout is what removes them. Two
 * sequential steps would mean the child's confirming click did nothing visible until a second
 * interaction, which is indistinguishable from the app ignoring them.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Station2Config } from '../caseData';
import { NOTEBOOK_GEOMETRY, envelopeShare } from '../notebookGeometry';
import notebookImg from '../../../assets/mystery/notebook.jpg';
import envelopeImg from '../../../assets/mystery/envelope.png';
import hiddenVariableImg from '../../../assets/mystery/hidden_variable.png';
import pencilImg from '../../../assets/mystery/pencil.png';

/* ------------------------------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------------------------- */

/** The two pages. A legal pair must span them, so this is also the axis such a pair crosses. */
type PageSide = 'left' | 'right';

/** What an item is, for the matching rule. A pair must be note-note or photo-photo. */
type ItemKind = 'note' | 'photo';

/**
 * An item as the child sees it.
 *
 * IDs ARE STABLE FOR THE LIFETIME OF THE ITEM, unlike the previous version's positional ids. A
 * note keeps its identity until it is eliminated, which is what lets the pair being applied hold a
 * reference to it across renders and lets React animate the elimination of a known element rather
 * than whatever happens to occupy its slot.
 */
interface Item {
  id: string;
  side: PageSide;
  kind: ItemKind;
  /** Only meaningful for envelopes: how many notes are inside. */
  share?: number;
}

/**
 * Every item's on-screen box, in image fractions, measured after layout.
 */
type BoxMap = Record<string, { x: number; y: number } | undefined>;

/* ------------------------------------------------------------------------------------------------
 * Timings
 * ---------------------------------------------------------------------------------------------- */

/** How long an illegal pairing shakes. Matches the `noteShake` keyframe. */
const SHAKE_MS = 400;
/** How long both items of an eliminated pair take to shrink away. Per the brief: 250ms. */
const ELIMINATE_MS = 250;
/** How long the solved photo's 3D flip takes before the stamp lands. */
const FLIP_MS = 700;
/** How long the stamp holds after landing, before the station hands over. Per the brief: 1.5s. */
const STAMP_HOLD_MS = 1500;
/** How long the reveal card's own uncover animation runs. */
const REVEAL_MS = 520;

/* ------------------------------------------------------------------------------------------------
 * Layout constants
 * ---------------------------------------------------------------------------------------------- */

/**
 * The share of a page's height given to the clue card on the right, and to nothing on the left.
 *
 * RESERVED, NOT COMPUTED, so the card and the notes never negotiate. The notes grid is given
 * `1 - CLUE_BAND` of the page and the card is pinned to the remaining band; because both are
 * declared as fractions of one grid, they cannot overlap however many notes are on the page.
 */
const CLUE_BAND = 0.28;

/** The gap between grid cells, in rem, so the note grid breathes without per-item offsets. */
const CELL_GAP_REM = 0.4;

/* ------------------------------------------------------------------------------------------------
 * Pure layout helpers
 * ---------------------------------------------------------------------------------------------- */

/**
 * The column count for `count` items on a page, chosen so the cells stay as square as possible.
 *
 * WHY THIS IS STILL A SEARCH EVEN THOUGH THE GRID PREVENTS OVERLAP. A grid cannot overlap, but it
 * can still look wrong: eighteen notes in a single row would be eighteen slivers, and eighteen in
 * a single column would be eighteen smears. The search picks the column count whose resulting CELL
 * is closest to square, which is what makes a note look like a note at any count.
 *
 * IT IS SCORED IN PIXELS, NOT FRACTIONS, for the same reason the old `slotsFor` was: a horizontal
 * fraction of this 2752x1536 image is nearly twice as long as a vertical one, so choosing columns
 * by raw fraction would systematically prefer too many columns.
 */
function columnsFor(count: number, bandWpx: number, bandHpx: number): number {
  if (count <= 1) return 1;
  let best = 1;
  let bestScore = Infinity;
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const cellW = bandWpx / columns;
    const cellH = bandHpx / rows;
    // How far from square the cell is, as a ratio rather than a difference, so a large cell and a
    // small one are judged on the same scale. 1.0 is a perfect square and scores zero.
    const score = Math.max(cellW / cellH, cellH / cellW);
    if (score < bestScore) {
      bestScore = score;
      best = columns;
    }
  }
  return best;
}

/** The background image's aspect ratio, so band widths and heights compare honestly. */
const NOTEBOOK_ASPECT = 2752 / 1536;

/**
 * The page rectangles as percentages, for the two grid columns.
 *
 * READ FROM `NOTEBOOK_GEOMETRY`, which holds the MEASURED page bounds of the photograph - the
 * notebook is off-centre and the right page is foreshortened, so a naive 50/50 split would push
 * the left page's items 3% too far right and the right page's into the binding. Those constants
 * were read out of the shipped file, and a scan of the image's own brightness curve confirms them
 * (bright paper 16%-47%, a dim spine at 46%-52%, bright paper again 54%-84%, dark desk after).
 */
const LEFT_PAGE = {
  left: NOTEBOOK_GEOMETRY.leftPage.left * 100,
  top: NOTEBOOK_GEOMETRY.leftPage.top * 100,
  width: (NOTEBOOK_GEOMETRY.leftPage.right - NOTEBOOK_GEOMETRY.leftPage.left) * 100,
  height: (NOTEBOOK_GEOMETRY.leftPage.bottom - NOTEBOOK_GEOMETRY.leftPage.top) * 100,
};

const RIGHT_PAGE = {
  left: NOTEBOOK_GEOMETRY.rightPage.left * 100,
  top: NOTEBOOK_GEOMETRY.rightPage.top * 100,
  width: (NOTEBOOK_GEOMETRY.rightPage.right - NOTEBOOK_GEOMETRY.rightPage.left) * 100,
  height: (NOTEBOOK_GEOMETRY.rightPage.bottom - NOTEBOOK_GEOMETRY.rightPage.top) * 100,
};

/**
 * The number of columns for the right page's note grid, given the current item count.
 *
 * Sized against the band the notes actually get - the page's height MINUS the clue band - rather
 * than the whole page, because sizing against space the clue card occupies would choose columns for
 * an area the notes never see.
 */
function noteColumns(count: number): number {
  const bandWpx = (RIGHT_PAGE.width / 100) * NOTEBOOK_ASPECT;
  const bandHpx = (RIGHT_PAGE.height / 100) * (1 - CLUE_BAND);
  return columnsFor(count, bandWpx, bandHpx);
}

/** The same, for a row of photos or notes on the left page. */
function photoColumns(count: number): number {
  const bandWpx = (LEFT_PAGE.width / 100) * NOTEBOOK_ASPECT;
  // Photos get a generous share of the left page, since they are the larger artefact.
  const bandHpx = (LEFT_PAGE.height / 100) * 0.55;
  return columnsFor(count, bandWpx, bandHpx);
}

/* ------------------------------------------------------------------------------------------------
 * Dealing
 * ---------------------------------------------------------------------------------------------- */

/**
 * The left page at deal time: the coefficient's photos, then any loose notes.
 *
 * PHOTOS FIRST, AND THAT ORDER IS LOAD-BEARING. A legal pair always consumes a whole note-note or
 * photo-photo set, so the two kinds never interleave - but keeping photos first means the left
 * page's photo row is stable at the top of the page while the notes below it shrink, which is what
 * a child watching for "how many X's are left" is looking at.
 *
 * THE PHOTO COUNT IS THE COEFFICIENT and is therefore taken from the config rather than invented:
 * the coefficient of X in every shipped case is exactly `config.leftPhotos`, and duplicating it in
 * a lookup table would let the two disagree.
 */
function dealLeft(config: Station2Config): Item[] {
  const photos: Item[] = Array.from({ length: config.leftPhotos }, (_, i) => ({
    id: `L-photo-${i}`,
    side: 'left',
    kind: 'photo',
  }));
  const notes: Item[] = Array.from({ length: config.leftNotes }, (_, i) => ({
    id: `L-note-${i}`,
    side: 'left',
    kind: 'note',
  }));
  return [...photos, ...notes];
}

/** The right page at deal time: any X photos, then the pile of loose notes. */
function dealRight(config: Station2Config): Item[] {
  const photos: Item[] = Array.from({ length: config.rightPhotos }, (_, i) => ({
    id: `R-photo-${i}`,
    side: 'right',
    kind: 'photo',
  }));
  const notes: Item[] = Array.from({ length: config.rightNotes }, (_, i) => ({
    id: `R-note-${i}`,
    side: 'right',
    kind: 'note',
  }));
  return [...photos, ...notes];
}

/**
 * What one page is currently worth, for display and for the solved check.
 *
 * AN ENVELOPE IS WORTH ITS SHARE, not one. That is the whole claim the division makes - the pile
 * has been shared out, not thrown away - so a page showing three envelopes of six is worth
 * eighteen and reads as such. A photo is worth one X, which is not a number, so it contributes
 * nothing to the count; the solved check counts photos separately.
 */
function pageValue(items: Item[]): number {
  return items.reduce((total, item) => {
    if (item.kind === 'photo') return total;
    return total + (item.share ?? 1);
  }, 0);
}

/**
 * True once the board is reduced to a lone X on the left and its value on the right.
 *
 * BOTH HALVES ARE REQUIRED. "One photo on the left" alone would accept a board that still has
 * loose notes beside it, and "the right equals solutionX" alone would accept a board whose photos
 * were never cancelled. The reveal is the payoff for having done both, so it waits for both. A
 * solved envelope counts as its share, which is why an envelope may be the answer on the right.
 */
function solvedState(left: Item[], right: Item[], solutionX: number): boolean {
  const leftPhotos = left.filter((i) => i.kind === 'photo').length;
  const leftNotes = left.filter((i) => i.kind === 'note').length;
  return leftPhotos === 1 && leftNotes === 0 && pageValue(right) === solutionX;
}

/* ------------------------------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------------------------- */

interface Station2NotebookProps {
  config: Station2Config;
  onComplete: (x: number) => void;
  onError: () => void;
}

export default function Station2Notebook({ config, onComplete, onError }: Station2NotebookProps) {
  /* ---- The board -------------------------------------------------------------------------------
   *
   * ITEMS ARE THE SOURCE OF TRUTH HERE, NOT COUNTS.
   *
   * An eliminated pair has to be addressable so both of its items can animate out together, and an
   * envelope has to hold a share that is not derivable from the page's contents once other
   * envelopes have been paired away. Neither is expressible in four integers.
   *
   * The safety the counts gave came from there being no representation in which the two pages
   * could go out of balance. That is preserved here by making ALL mutation flow through the two
   * handlers below (`markPair`, `eliminate`), and by `pageValue` being derived for display only -
   * never written back. A pairing removes exactly one item from each page in one state update, so
   * the pages cannot drift.
   */
  const [leftItems, setLeftItems] = useState<Item[]>(() => dealLeft(config));
  const [rightItems, setRightItems] = useState<Item[]>(() => dealRight(config));
  /**
   * Ids currently animating out. They stay in the arrays until the animation ends.
   *
   * THIS IS ALSO THE PAIRED STATE. A pair is put in here the instant it is made, so "shrink
   * animation", "amber pair treatment" and "about to be removed" are the same fact about the same
   * two ids - there is no separate `pairing` object that could disagree with what is on screen.
   */
  const [eliminating, setEliminating] = useState<string[]>([]);

  /* ---- Interaction ------------------------------------------------------------------------- */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<BoxMap>({});

  /* ---- The reveal -------------------------------------------------------------------------- */
  const [clueOpen, setClueOpen] = useState(false);
  const [photoFlipped, setPhotoFlipped] = useState(false);
  const [stamped, setStamped] = useState(false);
  /** Latches the completion so a re-render cannot fire `onComplete` twice. */
  const completedRef = useRef(false);

  const allItems = useMemo(() => [...leftItems, ...rightItems], [leftItems, rightItems]);

  /** The single source of truth for whether the balance is reduced to a lone X. */
  const solved = solvedState(leftItems, rightItems, config.solutionX);

  /* ---- Derived board ------------------------------------------------------------------------ */

  const leftPhotos = useMemo(() => leftItems.filter((i) => i.kind === 'photo'), [leftItems]);
  const leftNotes = useMemo(() => leftItems.filter((i) => i.kind === 'note'), [leftItems]);
  const rightPhotos = useMemo(() => rightItems.filter((i) => i.kind === 'photo'), [rightItems]);
  const rightNotes = useMemo(() => rightItems.filter((i) => i.kind === 'note'), [rightItems]);

  /** True once the right page holds envelopes rather than loose notes. */
  const divided = rightNotes.some((i) => i.share !== undefined);

  /** True for the 250ms a legal pair is shrinking away. Drives the pair hint under the notebook. */
  const pairHolding = eliminating.length === 2;

  /**
   * Whether the divide button may be pressed right now.
   *
   * `rightNotes.length % leftPhotos.length === 0` IS A MATHEMATICAL CONDITION, not a cosmetic one:
   * eighteen into three is six each, but eleven into two would be five-and-a-half, and a station
   * that let a child divide unevenly would teach that the operation sometimes leaves a remainder -
   * true in general, false for every equation in this game.
   *
   * It also requires the left page to be photos only. Dividing a page that still has loose notes
   * would be dividing a sum rather than the X term, which is the single most common way to get this
   * kind of puzzle wrong.
   */
  const canDivide =
    !divided &&
    leftPhotos.length > 1 &&
    leftNotes.length === 0 &&
    rightPhotos.length === 0 &&
    rightNotes.length > 0 &&
    rightNotes.length % leftPhotos.length === 0;

  /**
   * The lock shown while division is blocked, so the child can see where this is going.
   *
   * It appears exactly when the ONLY thing between the board and the divide button is loose notes
   * on the left - which is the `two-step` case's whole intermediate step. Without it that case has
   * a moment where the button is simply absent, and absence teaches nothing.
   */
  const divideLocked =
    !divided &&
    leftPhotos.length > 1 &&
    leftNotes.length > 0 &&
    rightPhotos.length === 0 &&
    rightNotes.length % leftPhotos.length === 0;

  /* ---- Measuring, for the connector line ----------------------------------------------------- */

  /**
   * Where every item is, in image fractions, measured from the DOM after each layout.
   *
   * THE LINE IS THE ONE THING A GRID CANNOT GIVE US. A grid knows where its cells are, but the
   * connector has to be drawn in an SVG over the whole notebook, in the notebook's coordinate
   * space - and the grid's cell positions are in CSS pixels inside a container whose size depends
   * on the window. Measuring is how the two are reconciled, and it is why this runs in an effect
   * rather than during render: the boxes do not exist until the browser has laid them out.
   *
   * A ResizeObserver rather than a one-shot measure, because the notebook is sized from viewport
   * height and so every box moves when the window does. Re-measuring on resize is what keeps the
   * line attached to the items instead of to where they used to be.
   */
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return undefined;

    const measure = () => {
      const sr = surface.getBoundingClientRect();
      if (sr.width === 0 || sr.height === 0) return;
      const next: BoxMap = {};
      surface.querySelectorAll<HTMLElement>('[data-item-id]').forEach((el) => {
        const b = el.getBoundingClientRect();
        next[el.dataset.itemId ?? ''] = {
          x: (b.left + b.width / 2 - sr.left) / sr.width,
          y: (b.top + b.height / 2 - sr.top) / sr.height,
        };
      });
      setBoxes(next);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    return () => observer.disconnect();
  }, [leftItems.length, rightItems.length, divided]);

  /* ---- Interaction -------------------------------------------------------------------------- */

  /** Clears the selection and any marked pair. Bound to the background and to Escape. */
  const clearSelection = useCallback(() => {
    setSelectedId(null);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearSelection]);

  /**
   * Refuses a pairing: shake and count the error.
   *
   * THE SELECTION IS LEFT WHERE IT IS, so the child's first pick is still armed and they can try
   * the other page without re-clicking it. The item they just clicked is NOT adopted as the new
   * selection: their click was an attempt to pair it with the thing already selected, and treating
   * a rejected move as a fresh start would silently swap the thing they were holding.
   */
  const refuse = useCallback((item: Item) => {
    onError();
    setShakeId(item.id);
    window.setTimeout(() => setShakeId((current) => (current === item.id ? null : current)), SHAKE_MS);
  }, [onError]);

  /**
   * The one click handler for every item, on both pages - it both selects and applies.
   *
   * THE RULES, IN ORDER, and each exists because a version without it teaches something false:
   *
   *   1. Clicking the selected item deselects it - the obvious way to undo a misclick.
   *   2. With nothing selected, this item becomes the selection.
   *   3. Clicking a DIFFERENT item on the SAME PAGE switches the selection to it. This is a change
   *      of mind, not a move: pairing two objects on one side is not legal, but the child has not
   *      asked to pair yet - they have only said "not that one, this one". Charging them an error
   *      for a correction would punish the exact behaviour the station wants.
   *   4. Clicking an item of the WRONG KIND is refused. A photo is X and a note is a number;
   *      cancelling one against the other would be combining unlike terms.
   *   5. Clicking an ENVELOPE against anything but a photo is refused, because after division the
   *      right page holds shares rather than units.
   *   6. Otherwise the pair is LEGAL and is APPLIED IMMEDIATELY - see the timeout below.
   */
  const pick = useCallback(
    (item: Item) => {
      if (solved || eliminating.length > 0) return;

      if (selectedId === item.id) {
        setSelectedId(null);
        return;
      }

      if (selectedId === null) {
        setSelectedId(item.id);
        return;
      }

      const other = allItems.find((i) => i.id === selectedId);
      if (!other) {
        setSelectedId(item.id);
        return;
      }

      if (other.side === item.side) {
        setSelectedId(item.id);
        return;
      }

      const isEnvelope = (i: Item) => i.side === 'right' && i.share !== undefined;
      const envelopePair =
        (isEnvelope(item) && other.kind === 'photo') || (isEnvelope(other) && item.kind === 'photo');

      if (other.kind !== item.kind && !envelopePair) {
        refuse(item);
        return;
      }

      setSelectedId(null);
      const pairIds = [other.id, item.id];
      setEliminating(pairIds);
      window.setTimeout(() => {
        setLeftItems((items) => items.filter((i) => !pairIds.includes(i.id)));
        setRightItems((items) => items.filter((i) => !pairIds.includes(i.id)));
        setEliminating([]);
      }, ELIMINATE_MS);
    },
    [solved, eliminating.length, selectedId, allItems, refuse],
  );

  /**
   * Bundles the right-hand pile into as many envelopes as there are photos.
   *
   * THE SHARE IS FIXED HERE AND NEVER RECOMPUTED. That is the one subtle thing about this step:
   * pairing envelopes away afterwards changes how many envelopes remain, so a version that
   * re-derived `share` as `rightNotes / envelopes` would silently re-share the pile on every
   * removal - two pairings into the honeycomb case it would recompute eighteen notes as a single
   * envelope of eighteen and leave the board unsolvable. Freezing the number inside each envelope
   * item removes the failure entirely: a share is a fact about what is inside the envelope, and
   * pairing one away cannot change what is inside the others.
   */
  const divide = useCallback(() => {
    if (!canDivide) return;
    const each = envelopeShare(rightNotes.length, leftPhotos.length);
    setRightItems(
      Array.from({ length: leftPhotos.length }, (_, i) => ({
        id: `R-env-${i}`,
        side: 'right' as const,
        kind: 'note' as const,
        share: each,
      })),
    );
    setSelectedId(null);
  }, [canDivide, rightNotes.length, leftPhotos.length]);

  /* ---- The reveal sequence -------------------------------------------------------------------- */

  /**
   * Uncover the clue, flip the photo, stamp, hand over - in that order, and only once.
   *
   * `completedRef` IS THE GUARD, not the state flags. The timeouts below set state that re-renders
   * this component, and the effect depends on `solved` - so without a latch, a re-render part-way
   * through the ceremony would restart it. A ref is written synchronously, so a second entry sees
   * it immediately; a state flag would not have been committed yet.
   */
  useEffect(() => {
    if (!solved || completedRef.current) return undefined;
    completedRef.current = true;

    const open = window.setTimeout(() => setClueOpen(true), 0);
    const flip = window.setTimeout(() => setPhotoFlipped(true), REVEAL_MS);
    const stamp = window.setTimeout(() => setStamped(true), REVEAL_MS + FLIP_MS);
    const done = window.setTimeout(
      () => onComplete(config.solutionX),
      REVEAL_MS + FLIP_MS + STAMP_HOLD_MS,
    );
    return () => {
      window.clearTimeout(open);
      window.clearTimeout(flip);
      window.clearTimeout(stamp);
      window.clearTimeout(done);
    };
  }, [solved, onComplete, config.solutionX]);

  /* ---- The connector line --------------------------------------------------------------------- */

  /**
   * The marked pair's endpoints, in image fractions, or null if either is not measured yet.
   *
   * READ FROM `boxes`, which the measuring effect keeps current, rather than from anything the
   * click handler captured. The line then follows the items if the window resizes, which a captured
   * coordinate could not do.
   */
  /**
 * The marked pair's endpoints, in image fractions, or null if either is not measured yet.
 *
 * READ FROM `boxes`, which the measuring effect keeps current, rather than from anything the
 * click handler captured. The line then follows the items if the window resizes, which a captured
 * coordinate could not do.
 */
  const markedLine = useMemo(() => {
    if (eliminating.length !== 2) return null;
    const a = boxes[eliminating[0] ?? ''];
    const b = boxes[eliminating[1] ?? ''];
    if (!a || !b) return null;
    return { a, b };
  }, [eliminating, boxes]);

  /* ---- Render -------------------------------------------------------------------------------- */

  /** The classes shared by every item button, given its interaction state. */
  const itemClass = (item: Item) => {
    const base =
      'group relative flex select-none items-center justify-center transition-all duration-200 ' +
      'cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300';
    if (shakeId === item.id) return `${base} motion-safe:animate-[noteShake_.4s_ease-in-out]`;
    if (eliminating.includes(item.id))
      return `${base} motion-safe:animate-[pairEliminate_.25s_ease-in-out_forwards]`;
    if (isMarked(item)) return `${base} z-20 -translate-y-1`;
    if (selectedId === item.id) return `${base} z-20 -translate-y-1`;
    return `${base} hover:-translate-y-0.5`;
  };

  /** Whether this item is one of the two in the pair that is being applied right now. */
  const isMarked = (item: Item) => eliminating.includes(item.id);

  /** The ring around an item: cyan while selected, amber once its pair is being applied. */
  const itemRing = (item: Item) => {
    if (isMarked(item)) return 'ring-4 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.9)]';
    if (selectedId === item.id) return 'ring-4 ring-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.85)]';
    return 'ring-2 ring-transparent';
  };

  return (
    /*
      NO CARD FRAME, AND THE DESK FITS THE SPACE LIKE EVERY OTHER STAGE.

      This station does not use `PuzzleStage`: its surface is not a photograph with an SVG overlay
      but a positioned DOM surface with real buttons on it, which is what makes the items keyboard
      reachable and tappable by a small child. So it repeats the sizing rule by hand, and the rule
      is the same one `PuzzleStage` uses, for the same reason:

        the desk's width is `min(100%, <available height> * ratio)`, so the aspect ratio derives a
        height that cannot overflow, and neither orientation needs a clamp that would fight it

      NEITHER `w-full max-h-full` NOR `h-full max-w-full` WOULD DO, and both were tried. A declared
      axis beats `aspect-ratio`, so the first stretches the desk on a wide, short window and the
      second squashes it on a tall, narrow one. Computing the width from the container's height is
      what makes one rule correct for both.
    */
    <section
      dir="rtl"
      aria-label="מחברת החקירה"
      className="relative flex w-full min-h-0 flex-1 flex-col items-center overflow-hidden"
      data-testid="station2"
    >
      <div
        className="flex w-full min-h-0 flex-1 items-center justify-center"
        /* The size container, so `100cqh` below resolves against the space left under the controls. */
        style={{ containerType: 'size' }}
      >
        <div
          ref={surfaceRef}
          className="relative w-[min(100%,calc(100cqh*1.7917))]"
          style={{ aspectRatio: '2752 / 1536' }}
          onClick={(event) => {
            // Only a click on the surface itself clears; item clicks stop propagation below.
            if (event.target === event.currentTarget) clearSelection();
          }}
          data-testid="notebook-surface"
        >
          <img
            src={notebookImg}
            alt=""
            aria-hidden
            draggable={false}
            /* `object-fill` because the desk already carries the notebook's exact aspect ratio -
               see the comment above. `contain` would letterbox it inside a box meant to be exactly
               its shape. */
            className="pointer-events-none absolute inset-0 h-full w-full object-fill"
          />

          {/*
            ==================================================================================
            THE CONNECTOR LINE
            ==================================================================================
            *
            * One full-page SVG, above the paper and below the items, drawing the marked pair's
            * move across the spine. `viewBox="0 0 1 1"` with `preserveAspectRatio="none"` means
            * the coordinates are image fractions - which is what the measuring effect produces.
            *
            * A CURVE RATHER THAN A STRAIGHT LINE. A straight line between a left item and a right
            * item passes through the binding, where it reads as a scratch on the paper; a shallow
            * arc lifts it over the spine so it reads as a move being made, which is what it is.
          */}
          <svg
            aria-hidden
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
            data-testid="connector-layer"
          >
            {markedLine && (
              <path
                d={`M ${markedLine.a.x} ${markedLine.a.y} Q ${NOTEBOOK_GEOMETRY.spineX} ${
                  Math.min(markedLine.a.y, markedLine.b.y) - 0.06
                } ${markedLine.b.x} ${markedLine.b.y}`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="0.007"
                strokeDasharray="0.02 0.014"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className="motion-safe:animate-[connectorDraw_.45s_ease-out_forwards]"
                data-testid="connector-line"
              />
            )}
          </svg>

          {/* ================================================================================
              THE LEFT PAGE
              ================================================================================
              *
              * TWO STACKED GRIDS, NOT ONE. Photos on top and notes below, because they are two
              * different kinds of evidence and a child scanning for "how many X's" should not
              * have to pick them out of a mixed field. Photos first also keeps the coefficient
              * visible while the notes below it shrink away.
              *
              * The page itself is a flex column, so the two grids cannot overlap: the photo grid
              * takes its natural height and the note grid takes what is left. This is the whole
              * reason for the rebuild - see the file header. */}
          {leftItems.length > 0 && (
            <div
              className="absolute flex flex-col items-center justify-start gap-[2%]"
              style={{
                left: `${LEFT_PAGE.left}%`,
                top: `${LEFT_PAGE.top}%`,
                width: `${LEFT_PAGE.width}%`,
                height: `${LEFT_PAGE.height}%`,
              }}
              data-testid="left-page"
            >
              {leftPhotos.length > 0 && (
                <div
                  className="grid w-full place-items-center"
                  style={{
                    gridTemplateColumns: `repeat(${photoColumns(leftPhotos.length)}, minmax(0, 1fr))`,
                    gap: `${CELL_GAP_REM}rem`,
                  }}
                  data-testid="left-photos"
                >
                  {leftPhotos.map((item) => (
                    <ItemButton
                      key={item.id}
                      item={item}
                      className={itemClass(item)}
                      ring={itemRing(item)}
                      onClick={() => pick(item)}
                      icon={config.noteIcon}
                      flip={photoFlipped && solved && leftItems.length === 1}
                      solutionX={config.solutionX}
                    />
                  ))}
                </div>
              )}

              {leftNotes.length > 0 && (
                <div
                  className="grid w-full place-items-center"
                  style={{
                    gridTemplateColumns: `repeat(${photoColumns(leftNotes.length)}, minmax(0, 1fr))`,
                    gap: `${CELL_GAP_REM}rem`,
                  }}
                  data-testid="left-notes"
                >
                  {leftNotes.map((item) => (
                    <ItemButton
                      key={item.id}
                      item={item}
                      className={itemClass(item)}
                      ring={itemRing(item)}
                      onClick={() => pick(item)}
                      icon={config.noteIcon}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================================================
              THE RIGHT PAGE
              ================================================================================
              *
              * ONE GRID OF NOTES (or envelopes) OVER A RESERVED CLUE BAND. The band is declared
              * as `CLUE_BAND` of the page's height and the notes grid gets the rest, so the two
              * cannot overlap however many notes are dealt - which is the property the previous
              * per-item offsets could not guarantee. */}
          <div
            className="absolute"
            style={{
              left: `${RIGHT_PAGE.left}%`,
              top: `${RIGHT_PAGE.top}%`,
              width: `${RIGHT_PAGE.width}%`,
              height: `${RIGHT_PAGE.height}%`,
            }}
            data-testid="right-page"
          >
            <div
              className="grid place-items-center"
              style={{
                height: `${(1 - CLUE_BAND) * 100}%`,
                gridTemplateColumns: `repeat(${noteColumns(rightItems.length)}, minmax(0, 1fr))`,
                gap: `${CELL_GAP_REM}rem`,
                alignContent: 'start',
              }}
              data-testid="right-items"
            >
              {rightItems.map((item) => (
                <ItemButton
                  key={item.id}
                  item={item}
                  className={itemClass(item)}
                  ring={itemRing(item)}
                  onClick={() => pick(item)}
                  icon={config.noteIcon}
                />
              ))}
            </div>

            {/* ---- The hidden clue card, pinned to the reserved band. ---- */}
            <div
              className="absolute inset-x-0 bottom-0"
              style={{ height: `${CLUE_BAND * 100}%` }}
              data-testid="clue-band"
            >
              <ClueCard
                open={clueOpen}
                solutionX={config.solutionX}
                shadowed={!clueOpen && rightItems.length > 0}
              />
            </div>
          </div>

          {/* ---- The stamp. ---- */}
          {stamped && (
            <div
              className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 motion-safe:animate-[stampSlam_.35s_ease-out]"
              style={{ left: '50%', top: '58%' }}
              data-testid="solved-stamp"
            >
              <span className="-rotate-12 inline-block rounded-lg border-4 border-rose-800/80 px-4 py-2 text-2xl font-black text-rose-800/80">
                פוענח!
              </span>
            </div>
          )}

          {/* ---- The pencil, as the station's motif. ---- */}
          <img
            src={pencilImg}
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none absolute z-10 opacity-80"
            style={{ right: '2%', bottom: '4%', width: '9%', transform: 'rotate(-8deg)' }}
          />
        </div>
      </div>

      {/* ---- Controls, below the notebook so they never cover a page. ---- */}
      <div className="mt-2 flex w-full max-w-4xl shrink-0 flex-wrap items-center justify-center gap-3">
        {divideLocked && (
          <span
            className="rounded-xl bg-slate-900/10 px-3 py-1.5 text-[11px] font-black text-slate-600"
            data-testid="divide-locked"
          >
            🔒 נקו קודם את הפתקים מהעמוד השמאלי
          </span>
        )}

        {canDivide && (
          <button
            type="button"
            onClick={divide}
            data-testid="divide-button"
            className="rounded-full bg-amber-600 px-6 py-2 font-bold text-white shadow-lg transition hover:bg-amber-500 active:translate-y-[2px] active:shadow-none"
          >
            חלוקה שווה
          </button>
        )}

        {pairHolding && (
          <span
            className="rounded-xl bg-amber-100 px-3 py-1.5 text-[11px] font-black text-amber-900 ring-2 ring-amber-400"
            data-testid="pair-hint"
          >
            זוג הושלם - הפעולה מתבצעת
          </span>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Item components
 * ---------------------------------------------------------------------------------------------- */

interface ItemButtonProps {
  item: Item;
  className: string;
  ring: string;
  onClick: () => void;
  icon: string;
  /** Only for the last left-hand photo: plays the unclip-and-flip that reveals X. */
  flip?: boolean;
  solutionX?: number;
}

/**
 * One item - a photo, a note, or an envelope - as a button.
 *
 * A `button` RATHER THAN A `div` WITH A CLICK HANDLER. These are the station's whole interaction,
 * and a div would leave them unreachable by keyboard and invisible to a screen reader. The button
 * also gets focus styling for free, which matters for the same reason.
 *
 * `data-item-id` IS READ BY THE MEASURING EFFECT to place the connector line. It is a data
 * attribute rather than a ref because there is one per item and the effect needs all of them at
 * once; a map of refs would be more code for the same result.
 */
function ItemButton({
  item,
  className,
  ring,
  onClick,
  icon,
  flip = false,
  solutionX,
}: ItemButtonProps) {
  const label =
    item.share !== undefined
      ? `מעטפה עם ${item.share} פתקים`
      : item.kind === 'photo'
        ? 'נעלם X'
        : 'פתק';

  return (
    <button
      type="button"
      aria-label={label}
      data-item-id={item.id}
      data-testid={`item-${item.id}`}
      data-kind={item.kind}
      data-side={item.side}
      data-envelope={item.share !== undefined ? 'true' : 'false'}
      data-share={item.share}
      onClick={(event) => {
        // Stop the surface's own handler from treating this as a background click and clearing
        // the selection the child just made.
        event.stopPropagation();
        onClick();
      }}
      className={className}
    >
      {/*
        THE FLIP WRAPPER EXISTS ONLY FOR THE SOLVED PHOTO.

        `perspective` and `preserve-3d` have to be on the element whose child rotates, and putting
        them on the button would have them fight the button's own transform - which is already
        carrying the selected/marked lift. A wrapper keeps the two transforms on separate nodes.
      */}
      <span
        className={`relative block w-full rounded-xl ${ring} ${
          flip ? 'motion-safe:animate-[photoFlip_.7s_ease-out_forwards]' : ''
        }`}
        style={flip ? { transformStyle: 'preserve-3d', perspective: '700px' } : undefined}
      >
        {item.share !== undefined ? (
          <EnvelopeFace share={item.share} />
        ) : item.kind === 'photo' ? (
          <PhotoFace flipped={flip} solutionX={solutionX} />
        ) : (
          <NoteFace icon={icon} />
        )}

        {/*
          THE PAPERCLIPS, drawn only on the left-hand photo and only before it flips. They are the
          "unclip" the brief asks for: the photo is pinned to the page for the whole solve, and the
          reveal is the moment it comes free.
        */}
        {item.kind === 'photo' && item.side === 'left' && !flip && (
          <span aria-hidden className="pointer-events-none absolute inset-0">
            <Paperclip className="absolute -top-[10%] left-[22%] -rotate-[14deg]" />
            <Paperclip className="absolute -top-[10%] right-[22%] rotate-[14deg]" />
          </span>
        )}
      </span>
    </button>
  );
}

/** A polaroid of the unknown. Back face carries the value once the flip has run. */
function PhotoFace({ flipped, solutionX }: { flipped: boolean; solutionX?: number }) {
  return (
    <span className="relative block w-full">
      <img src={hiddenVariableImg} alt="" aria-hidden draggable={false} className="h-auto w-full" />
      {flipped && solutionX !== undefined && (
        <span
          className="absolute inset-x-[6%] bottom-[24%] grid place-items-center rounded-lg bg-amber-400 px-1 py-0.5 text-[clamp(9px,1.1vw,18px)] font-black text-amber-950 shadow-lg motion-safe:animate-[revealValue_.5s_ease-out]"
          data-testid="photo-solution"
        >
          X = {solutionX}
        </span>
      )}
    </span>
  );
}

/**
 * An envelope holding `share` notes.
 *
 * THE COUNT BADGE IS THE POINT OF THE WHOLE DIVISION STEP. The child's claim is "the pile has been
 * shared into equal parts", and the badge is what makes that checkable: three envelopes reading
 * "6" multiply back to the eighteen notes that were there before, and a child who wants to check
 * the arithmetic can. Without the number the envelopes would be three identical pictures and the
 * division would be an assertion rather than something visible.
 */
function EnvelopeFace({ share }: { share: number }) {
  return (
    <span className="relative block w-full" data-testid="envelope-face">
      <img src={envelopeImg} alt="" aria-hidden draggable={false} className="h-auto w-full" />
      <span className="absolute inset-x-0 bottom-[8%] grid place-items-center">
        <span className="rounded-md bg-amber-950/85 px-1.5 py-[1px] text-[clamp(8px,0.95vw,15px)] font-black text-amber-50 shadow">
          {share}
        </span>
      </span>
    </span>
  );
}

/**
 * A post-it note.
 *
 * Drawn rather than imported: the brief supplies an icon per case (🍯, 🐾, 🍎, 🍓) and no note
 * artwork, and a CSS square keeps the note's colour tied to the notebook's palette instead of to
 * whatever a photograph happened to contain.
 *
 * IT IS DELIBERATELY OPAQUE AND LIGHT. The notebook photograph is a dim, moody shot of paper under
 * a desk lamp, so a translucent or palette-matched note disappears into the page beneath it. A
 * bright amber square with a hard border reads instantly against both the cream paper and the dark
 * desk, which is what matters when the child is scanning the page for something to tap.
 *
 * NO PER-ITEM ROTATION. The previous version derived a small angle from each note's icon, which
 * made a page look hand-placed - and it also meant any change to the icon set re-angled the notes,
 * and that a page of notes looked slightly drunk. The brief for this rebuild asks for an orderly
 * grid, and order is the point: the note's position is what the child is tracking, so it should not
 * wobble.
 */
function NoteFace({ icon }: { icon: string }) {
  return (
    <span className="grid aspect-square w-full place-items-center rounded-md border-2 border-amber-600/80 bg-amber-200 shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
      <span className="text-[clamp(10px,1.6vw,26px)] leading-none">{icon}</span>
    </span>
  );
}

/** A paperclip, drawn as an SVG so it scales with the photo it is pinning. */
function Paperclip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 44" className={`h-[22%] w-auto ${className ?? ''}`} aria-hidden>
      <path
        d="M 6 12 L 6 32 a 4 4 0 0 0 8 0 L 14 10 a 6 6 0 0 0 -12 0 L 2 32"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The hidden discovery note at the foot of the right page.
 *
 * TWO STATES, AND THE FIRST ONE IS THE INTERESTING ONE. While any evidence sits above it the card
 * shows a glowing "?" and says the decisive clue is hidden here - which is true, and is the reason
 * to keep working. It is not a lock: nothing about it blocks a move, and it would be wrong to make
 * it look like a gate the child has failed to open.
 *
 * ONCE SOLVED IT FLASHES GOLD AND SHOWS THE VALUE. That is the reward for the whole station, so it
 * is the loudest thing on the page at that moment and it stays on screen - the stamp lands on top
 * of it a beat later, and the photo beside it flips to the same number, which is the two halves of
 * the case agreeing with each other in front of the child.
 */
function ClueCard({
  open,
  solutionX,
  shadowed,
}: {
  open: boolean;
  solutionX: number;
  shadowed: boolean;
}) {
  if (open) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center rounded-xl border-2 border-solid border-amber-500 bg-amber-100/95 p-2 shadow-inner motion-safe:animate-[clueReveal_.5s_ease-out]"
        data-testid="clue-card"
        data-open="true"
      >
        <span className="text-[clamp(10px,1.3vw,20px)] font-black text-amber-800">
          הראיה המרשיעה
        </span>
        <span className="text-[clamp(22px,3.4vw,54px)] font-black leading-none text-amber-950">
          X = {solutionX}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-500 bg-amber-100/90 p-2 shadow-inner ${
        shadowed ? 'opacity-95' : ''
      }`}
      data-testid="clue-card"
      data-open="false"
    >
      <span
        className="text-[clamp(18px,2.6vw,42px)] font-black leading-none text-amber-700 motion-safe:animate-[goldGlow_2.4s_ease-in-out_infinite]"
        aria-hidden
      >
        ?
      </span>
      <span className="mt-1 text-center text-[clamp(8px,1.05vw,15px)] font-black leading-tight text-amber-800">
        הראיה המרשיעה מוסתרת כאן...
      </span>
    </div>
  );
}







