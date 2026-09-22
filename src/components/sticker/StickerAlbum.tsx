/**
 * Tab 2: the album itself.
 *
 * The pages are the point, so this screen is built as a book rather than as a scrolling
 * list: one page at a time, turned with the arrows, with the page's own shape - a six-panel
 * story, a 3x2 poster, a wall of medallions - as the layout.
 *
 * WHY THE PAGE IS CHOSEN BY TYPE AND NOT BY ID. Each page type gets its own renderer, so
 * adding a second puzzle page is a data change plus nothing, and the "birthday" and
 * "landscape" pages cannot drift apart into two slightly different grids. The `id` is
 * only ever used to find the stickers.
 */
import { useState } from 'react';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import {
  ALBUM_PAGES,
  isPageComplete,
  stickersByPage,
  type AlbumPage,
  type StickerItem,
} from '../../data/stickersData';
import { PuzzleSliceCard } from './StickerVisuals';
import StickerCard from './StickerCard';
import type { StickerStore } from './useStickerStore';

interface StickerAlbumProps {
  store: StickerStore;
  cookies: number;
}

export default function StickerAlbum({ store, cookies }: StickerAlbumProps) {
  /*
   * The secrets page lives in tab 3, so the album's pager walks only the other seven
   * pages. The list is derived once here and indexed directly, rather than mapping back
   * and forth through `ALBUM_PAGES` on every turn - which was the source of an
   * off-by-one the moment the secrets page was in the middle of the array.
   */
  const albumPages = ALBUM_PAGES.filter((entry) => entry.type !== 'secrets');
  const [pageIndex, setPageIndex] = useState(0);
  const safeIndex = Math.min(Math.max(pageIndex, 0), albumPages.length - 1);
  const page = albumPages[safeIndex] as AlbumPage;

  const go = (delta: number) => {
    setPageIndex((index) => Math.min(Math.max(index + delta, 0), albumPages.length - 1));
  };

  const stickers = stickersByPage(page.id);
  const ownedOnPage = stickers.filter((sticker) => store.has(sticker.id)).length;
  const complete = isPageComplete(page.id, store.unlocked);

  return (
    <div className="flex flex-col gap-3">
      {/* The pager. Arrows are disabled at the ends rather than wrapping, so the child
          always knows where they are in the book. */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border-2 border-amber-300 bg-amber-100/95 px-2 py-1.5">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={safeIndex <= 0}
          aria-label="עמוד קודם"
          className="rounded-xl border-2 border-amber-500 bg-amber-200 px-2.5 py-1 text-sm font-black text-amber-950 transition active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹ הקודם
        </button>

        <div className="flex flex-col items-center leading-tight">
          <span className="text-[11px] font-black text-amber-800">
            עמוד {safeIndex + 1} מתוך {albumPages.length}
          </span>
          <span className="text-base font-black text-amber-950">{page.title}</span>
          <span className="text-[10px] font-bold text-amber-700/80">
            {ownedOnPage} מתוך {stickers.length} • {page.description}
          </span>
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          disabled={safeIndex >= albumPages.length - 1}
          aria-label="עמוד הבא"
          className="rounded-xl border-2 border-amber-500 bg-amber-200 px-2.5 py-1 text-sm font-black text-amber-950 transition active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-40"
        >
          הבא ›
        </button>
      </div>

      {/* The page itself: warm paper, with the completed seal stamped over the corner. */}
      <div className="relative min-h-[20rem] rounded-3xl border-4 border-amber-300/70 bg-gradient-to-b from-amber-50 to-amber-100 p-3 shadow-inner">
        {complete && (
          <div
            className="absolute left-1/2 top-2 z-20 -translate-x-1/2 animate-[sealStamp_.5s_cubic-bezier(.34,1.56,.64,1)_forwards]"
            role="status"
          >
            <div className="flex items-center gap-1.5 rounded-full border-4 border-amber-500 bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-1 shadow-lg">
              <span aria-hidden className="text-lg">
                🌟
              </span>
              <span className="text-xs font-black text-amber-950">העמוד הושלם!</span>
            </div>
          </div>
        )}

        <PageBody page={page} stickers={stickers} store={store} cookies={cookies} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Page bodies                                 */
/* -------------------------------------------------------------------------- */

function PageBody({
  page,
  stickers,
  store,
  cookies,
}: {
  page: AlbumPage;
  stickers: StickerItem[];
  store: StickerStore;
  cookies: number;
}) {
  const [prompt, setPrompt] = useState<StickerItem | null>(null);

  /*
   * PUZZLE PAGES RENDER AS A GRID OF CROPS, NOT AS STICKERS.
   *
   * The slices share one source image, so they are laid out on the poster's own aspect -
   * 3x2 for the landscape, 4x3 for the birthday poster - which means the assembled page
   * reads as the finished picture even before every piece is owned. The gaps are what
   * make the goal legible.
   */
  if (page.type === 'puzzle_6' || page.type === 'puzzle_12') {
    const cols = page.type === 'puzzle_6' ? 3 : 4;
    const rows = page.type === 'puzzle_6' ? 2 : 3;
    return (
      <div className="mx-auto w-full max-w-2xl pt-6">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {stickers.map((sticker) =>
            sticker.puzzleSlice ? (
              <PuzzleSliceCard
                key={sticker.id}
                src={sticker.imageSrc}
                slice={sticker.puzzleSlice}
                title={sticker.title}
                isUnlocked={store.has(sticker.id)}
                onClick={() => !store.has(sticker.id) && setPrompt(sticker)}
              />
            ) : null,
          )}
        </div>
        <p className="mt-2 text-center text-[11px] font-bold text-amber-700/80">
          {rows * cols} חלקים • חברו את כולם כדי לגלות את התמונה השלמה
        </p>
        {prompt && <BuyPrompt sticker={prompt} store={store} cookies={cookies} onClose={() => setPrompt(null)} />}
      </div>
    );
  }

  /*
   * Medallions: a wall of honours.
   *
   * This used to draw its own round avatar inline, which meant the foil sweep and the
   * legendary glow had to be written a second time here. It now uses the same
   * `StickerCard` as every other page - a hero's medallion and a hero's sticker are the
   * same collectible, so they are the same card.
   */
  if (page.type === 'medallions') {
    return (
      <div className="pt-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stickers.map((sticker) => (
            <StickerCard
              key={sticker.id}
              sticker={sticker}
              isUnlocked={store.has(sticker.id)}
              onClick={() => !store.has(sticker.id) && setPrompt(sticker)}
              actionLabel={sticker.directPrice !== undefined ? `פתחי עכשיו: ${sticker.directPrice} 🍪` : undefined}
            />
          ))}
        </div>
        {prompt && <BuyPrompt sticker={prompt} store={store} cookies={cookies} onClose={() => setPrompt(null)} />}
      </div>
    );
  }

  /* Sequence and the collections: a scrapbook of tiles. */
  return (
    <div className="pt-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stickers.map((sticker) => (
          <StickerCard
            key={sticker.id}
            sticker={sticker}
            isUnlocked={store.has(sticker.id)}
            onClick={() => !store.has(sticker.id) && setPrompt(sticker)}
            actionLabel={sticker.directPrice !== undefined ? `פתחי עכשיו: ${sticker.directPrice} 🍪` : undefined}
          />
        ))}
      </div>
      {prompt && <BuyPrompt sticker={prompt} store={store} cookies={cookies} onClose={() => setPrompt(null)} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               The buy prompt                               */
/* -------------------------------------------------------------------------- */

/**
 * The "buy this one sticker" confirmation.
 *
 * Shown as an in-page card rather than a nested modal, so the album stays visible behind
 * it - the child can see the gap they are filling. Secrets never reach here, because a
 * sticker with no price is not offered a button at all.
 */
function BuyPrompt({
  sticker,
  store,
  cookies,
  onClose,
}: {
  sticker: StickerItem;
  store: StickerStore;
  cookies: number;
  onClose: () => void;
}) {
  const feedback = useAnswerFeedback();
  const [note, setNote] = useState<string | null>(null);

  if (sticker.directPrice === undefined) return null;
  const price = sticker.directPrice;
  const affordable = cookies >= price;
  /**
   * Whether the album already holds this sticker, which decides whether the preview may
   * show the artwork at all. Read from the store rather than passed as a prop, because the
   * store is already here for `buySticker` and a second copy of the answer could disagree
   * with it after a purchase.
   */
  const owned = store.has(sticker.id);

  const buy = () => {
    const outcome = store.buySticker(sticker);
    if (outcome === 'ok') {
      feedback(true);
      onClose();
      return;
    }
    feedback(false);
    setNote(
      outcome === 'poor'
        ? 'אין מספיק עוגיות. שחקו עוד ותוכלו לקנות! 🍪'
        : 'המדבקה הזו כבר באלבום שלכם.',
    );
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-stone-950/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={owned ? `קניית ${sticker.title}` : 'קניית מדבקה מסתורית'}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-xs rounded-3xl border-4 border-amber-300 bg-amber-50 p-4 text-center shadow-2xl"
      >
        {/*
          THE PREVIEW OBEYS THE SAME MYSTERY RULE AS THE CARD THAT OPENED IT.

          This is the one place the artwork could still leak: the prompt is reached by
          tapping a LOCKED card, so the sticker is by definition not owned yet, and an
          unconditional `<img>` here would hand the child the very picture the card just
          spent its whole design hiding. Worse, it would appear at 112px - larger and
          clearer than the grid thumbnail it was withheld from.

          So the image is rendered ONLY when the store already has the sticker. Reaching the
          owned branch is nearly unreachable in practice, because the prompt closes on a
          successful purchase, but it is the correct condition and it is what keeps the
          reveal below from being dead code.
        */}
        {owned ? (
          <img
            src={sticker.imageSrc}
            alt=""
            aria-hidden
            className="mx-auto mb-2 h-28 w-28 rounded-2xl border-2 border-amber-300 object-cover motion-safe:animate-[stickerReveal_.5s_cubic-bezier(0.34,1.56,0.64,1)]"
          />
        ) : (
          <div
            aria-hidden
            className="mx-auto mb-2 flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-amber-500/60 bg-gradient-to-b from-amber-950/85 to-slate-900"
          >
            <span className="animate-[mysteryPulse_2s_ease-in-out_infinite] text-3xl leading-none">
              🔒
            </span>
            <span className="text-xl font-black leading-none text-amber-300/90">❓</span>
            <span className="text-[10px] font-black text-amber-200/80">הפתעה</span>
          </div>
        )}

        <p className="text-base font-black text-amber-950">
          {owned ? `מדבקת "${sticker.title}"` : 'לקנות מדבקה מסתורית?'}
        </p>
        <p className="mt-1 text-sm font-bold text-amber-800">
          תמורת <span className="font-black tabular-nums">{price}</span> עוגיות?
        </p>
        <p className="mt-0.5 text-[11px] font-bold text-amber-700/80">
          יש לכם {cookies} 🍪
        </p>

        {note && (
          <p className="mt-2 rounded-xl bg-rose-100 px-2 py-1 text-xs font-black text-rose-900">{note}</p>
        )}

        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={buy}
            disabled={!affordable}
            className={`w-full rounded-2xl border-4 px-3 py-2 text-base font-black transition active:translate-y-[3px] active:shadow-none ${
              affordable
                ? 'border-amber-700 bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 shadow-[0_4px_0_#78350f]'
                : 'cursor-not-allowed border-stone-300 bg-stone-200 text-stone-500 shadow-none'
            }`}
          >
            קני עכשיו 🍪
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border-2 border-amber-400 bg-amber-100 px-3 py-1.5 text-sm font-black text-amber-950 transition hover:bg-amber-200"
          >
            אולי אחר כך
          </button>
        </div>
      </div>
    </div>
  );
}
