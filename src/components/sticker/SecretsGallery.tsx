/**
 * Tab 3: the secrets wall.
 *
 * These six are the only stickers that cannot be bought, so this screen is deliberately
 * NOT a shop: there is no price, no button, and nothing to press. What a locked card
 * offers instead is the HINT - the child's route back into a game they already own. That
 * is why the hint is always visible, even on a locked card: a secret nobody can find is
 * just a mystery box.
 *
 * The pieces are the only ones that are ever granted from outside this modal, when some
 * future achievement check calls `grantSecret`.
 */
import { SECRET_STICKERS, RARITY_META } from '../../data/stickersData';
import type { StickerStore } from './useStickerStore';

export default function SecretsGallery({ store }: { store: StickerStore }) {
  const owned = SECRET_STICKERS.filter((sticker) => store.has(sticker.id)).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-100/95 px-3 py-2 text-center">
        <p className="text-sm font-black text-amber-950">
          🏆 {owned} מתוך {SECRET_STICKERS.length} סודות נמצאו
        </p>
        <p className="text-[11px] font-bold text-amber-800/80">
          את המדבקות האלה אי אפשר לקנות - רק להרוויח במשחקים!
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SECRET_STICKERS.map((sticker) => {
          const unlocked = store.has(sticker.id);
          const rarity = RARITY_META[sticker.rarity];

          return (
            <div
              key={sticker.id}
              className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 p-2.5 ${
                unlocked
                  ? 'animate-[legendaryShine_2.4s_ease-in-out_infinite] border-amber-400 bg-gradient-to-b from-amber-50 to-amber-100'
                  : 'border-dashed border-amber-300/70 bg-stone-800/90'
              }`}
            >
              <div
                className={`relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border-2 ${
                  unlocked ? 'border-amber-400' : 'border-stone-600'
                }`}
              >
                {unlocked ? (
                  <img
                    src={sticker.imageSrc}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  /* Locked: a mystery mark, never the greyscale art. A secret has no
                     silhouette to guess from - that is the difference between a secret
                     and something merely unaffordable. */
                  <span aria-hidden className="text-3xl text-stone-500">
                    ❓
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1 text-right">
                <p
                  className={`text-sm font-black leading-tight ${
                    unlocked ? 'text-amber-950' : 'text-stone-300'
                  }`}
                >
                  {unlocked ? sticker.title : '??? סוד כמוס'}
                </p>

                {unlocked ? (
                  <p className={`mt-1 inline-block rounded-full px-2 py-[1px] text-[10px] font-black ${rarity.chip}`}>
                    {rarity.emoji} {rarity.label}
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-[11px] font-bold leading-snug text-amber-200/90">
                      🔎 {sticker.secretHint}
                    </p>
                    <p className="mt-0.5 text-[10px] font-black text-stone-400">
                      לא זמין לרכישה
                    </p>
                  </>
                )}
              </div>

              {unlocked && (
                <span
                  aria-hidden
                  className="absolute -right-2 -top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-amber-950 shadow"
                >
                  נפתח!
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
