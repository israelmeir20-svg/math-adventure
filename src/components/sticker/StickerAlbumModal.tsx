/**
 * "מכונת המדבקות" - the three-tab sticker album that replaces the old shop store.
 *
 * WHAT REPLACED WHAT. The shop used to sell lifelines, decorations and pet treats off
 * `buyItem`. Those items are NOT gone - the lifeline stock is still spent by the tile
 * modal and the decorations are still drawn on the map - but the STORE FRONT is now the
 * album. This modal owns the cookie-spending surface: envelopes, the album, and the
 * secrets wall.
 *
 * THE COOKIE BALANCE IS READ FROM THE GAME, NEVER MIRRORED. There is no local copy of the
 * count; the header renders `state.inventory.cookies` and every spend goes through
 * `spendCookies`, so the number in the header can never disagree with the number the
 * reducer holds. That was the bug class worth designing out here - a stale local balance
 * showing a pack as affordable after the cookies were already gone.
 */
import { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import DistrictInteriorShell from '../common/DistrictInteriorShell';
import PackOpening from './PackOpening';
import StickerAlbum from './StickerAlbum';
import SecretsGallery from './SecretsGallery';
import { useStickerStore } from './useStickerStore';
import { STICKERS_CATALOG } from '../../data/stickersData';
import shopInterior from '../../assets/interiors/shop-interior.jpg';

type Tab = 'packs' | 'album' | 'secrets';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'packs', label: 'פתיחת מעטפות', emoji: '🎁' },
  { id: 'album', label: 'אלבום המדבקות', emoji: '📖' },
  { id: 'secrets', label: 'הישגים וסודות', emoji: '🏆' },
];

export default function StickerAlbumModal({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const feedback = useAnswerFeedback();
  const store = useStickerStore();
  const [tab, setTab] = useState<Tab>('packs');

  const cookies = state.inventory.cookies;
  const total = STICKERS_CATALOG.length;

  // Esc closes, matching every other overlay in the app.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  /*
   * The tab chime is fired from an effect rather than the click handler so it also
   * covers a tab reached by any future route, and so the sound is tied to the tab
   * actually changing rather than to a button being pressed.
   */
  const [lastTab, setLastTab] = useState<Tab>(tab);
  useEffect(() => {
    if (tab !== lastTab) {
      feedback(true);
      setLastTab(tab);
    }
  }, [tab, lastTab, feedback]);

  return (
    <DistrictInteriorShell
      bgImage={shopInterior}
      title="מכונת המדבקות"
      subtitle="אספו מדבקות, פתחו מעטפות וגלו את הסודות"
      icon="🎴"
      onClose={onClose}
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        {/* The balance and the collection progress, in one strip. */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-amber-300 bg-amber-100/95 px-3 py-1.5">
          <div
            className="flex items-center gap-1.5 rounded-full bg-amber-950/90 px-3 py-1 text-amber-100"
            aria-label={`${cookies} עוגיות`}
          >
            <span aria-hidden>🍪</span>
            <span data-testid="album-cookies" className="text-sm font-black tabular-nums">
              {cookies}
            </span>
          </div>
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[10px] font-black uppercase tracking-wide text-amber-700/90">
              האוסף שלכם
            </span>
            <span className="text-sm font-black text-amber-950">
              <span data-testid="album-count" className="tabular-nums">
                {store.count}
              </span>
              {' / '}
              <span className="tabular-nums">{total}</span> מדבקות
            </span>
          </div>
        </div>

        {/* The tab switcher. */}
        <div
          role="tablist"
          aria-label="מכונת המדבקות"
          className="grid shrink-0 grid-cols-3 gap-1.5"
        >
          {TABS.map((entry) => {
            const active = entry.id === tab;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(entry.id)}
                className={`flex flex-col items-center gap-0.5 rounded-2xl border-2 px-1 py-1.5 transition active:translate-y-[2px] ${
                  active
                    ? 'border-amber-600 bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 shadow-[0_3px_0_#78350f]'
                    : 'border-amber-200/50 bg-amber-950/45 text-amber-100 hover:bg-amber-900/55'
                }`}
              >
                <span aria-hidden className="text-lg leading-none">
                  {entry.emoji}
                </span>
                <span className="text-[10px] font-black leading-tight sm:text-[11px]">
                  {entry.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* The panel. Scrolls independently so the header and tabs stay put. */}
        <div className="min-h-0 flex-1 overflow-y-auto pe-0.5">
          {tab === 'packs' && <PackOpening store={store} cookies={cookies} />}
          {tab === 'album' && <StickerAlbum store={store} cookies={cookies} />}
          {tab === 'secrets' && <SecretsGallery store={store} />}
        </div>
      </div>
    </DistrictInteriorShell>
  );
}
