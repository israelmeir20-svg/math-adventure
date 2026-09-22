/**
 * Tab 1: the envelope machine.
 *
 * The whole point of this screen is the moment the envelope opens, so the state machine
 * is built around it rather than around the purchase: the child picks a pack, the
 * envelope shakes, the card turns over, the rarity is announced. The purchase itself is a
 * single call that either succeeds or does not.
 *
 * THE REVEAL IS NOT ANIMATION-DEPENDENT. Every stage advances on a timer rather than on
 * `animationend`, because the reduced-motion rules strip these animations entirely - and
 * a reveal waiting for an event that will never fire would leave the child staring at a
 * frozen envelope forever.
 */
import { useEffect, useRef, useState } from 'react';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import { PURCHASABLE_STICKERS, RARITY_META, type StickerItem } from '../../data/stickersData';
import { SparkleBurst } from './StickerVisuals';
import {
  SINGLE_PACK_PRICE,
  TRIPLE_PACK_PRICE,
  type StickerStore,
} from './useStickerStore';

/** How long the envelope rattles before it opens. */
const SHAKE_MS = 520;
/** How long the flip itself takes. */
const FLIP_MS = 620;

type Stage = 'idle' | 'shaking' | 'revealing' | 'empty';

interface PackOpeningProps {
  store: StickerStore;
  /** Cookies on hand, so the buttons can grey out before the child taps one. */
  cookies: number;
}

export default function PackOpening({ store, cookies }: PackOpeningProps) {
  const feedback = useAnswerFeedback();
  const [stage, setStage] = useState<Stage>('idle');
  const [won, setWon] = useState<StickerItem[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [refunded, setRefunded] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  // Any pending hand-off is cancelled on unmount, so switching tabs mid-reveal cannot
  // fire a state update into a component that is gone.
  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );
  const after = (ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  };
  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const open = (count: number, price: number) => {
    if (stage !== 'idle') return;
    setMessage(null);

    const result = store.openPack(count, price);
    if (result === 'poor') {
      feedback(false);
      setMessage('אין מספיק עוגיות למעטפה הזו. שחקו עוד קצת כדי לאסוף! 🍪');
      return;
    }

    setRefunded(result.refunded);
    setWon(result.won);
    setRevealed(0);
    setStage('shaking');

    /*
     * An empty draw means the album is finished. There is nothing to flip, so the
     * sequence stops on its own `empty` stage - NOT back to idle. Returning to idle would
     * throw away the refund notice in the same instant it was earned, and the child would
     * see 50 cookies appear with no explanation of where they came from.
     */
    if (result.won.length === 0) {
      after(SHAKE_MS, () => {
        setStage('empty');
        feedback(false);
      });
      return;
    }

    after(SHAKE_MS, () => {
      setStage('revealing');
      const legendary = result.won.some((sticker) => sticker.rarity === 'legendary');
      if (legendary) feedback.celebrate();
      else feedback(true);
    });
  };

  /**
   * Reveals the cards one at a time.
   *
   * Staggered rather than all at once: a triple pack that lands three cards in the same
   * frame has no moment of suspense, and the child cannot tell whether they got one good
   * sticker or three. Each card gets its own turn.
   */
  useEffect(() => {
    if (stage !== 'revealing') return undefined;
    if (revealed >= won.length) return undefined;
    const id = window.setTimeout(() => {
      setRevealed((n) => n + 1);
    }, revealed === 0 ? 0 : FLIP_MS);
    return () => window.clearTimeout(id);
  }, [stage, revealed, won.length]);

  const done = (stage === 'revealing' && revealed >= won.length && won.length > 0) || stage === 'empty';
  const canAffordSingle = cookies >= SINGLE_PACK_PRICE;
  const canAffordTriple = cookies >= TRIPLE_PACK_PRICE;
  /*
   * The finished-album notice is driven by the PURCHASABLE pool being empty rather than
   * by a hardcoded count: `openPack` refunds exactly when it cannot fill an order, so
   * this is the same condition the machine itself acts on. A number here would go stale
   * the moment a sticker is added to the catalogue.
   */
  const albumFinished =
    PURCHASABLE_STICKERS.length > 0 &&
    PURCHASABLE_STICKERS.every((sticker) => store.has(sticker.id));

  const dismiss = () => {
    clearTimers();
    setStage('idle');
    setWon([]);
    setRevealed(0);
    setRefunded(0);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* The machine: envelopes to press, and the gift when one opens. */}
      <div className="relative overflow-hidden rounded-3xl border-4 border-amber-300/70 bg-gradient-to-b from-sky-200 to-emerald-100 p-4">
        <div className="pointer-events-none absolute -right-6 -top-8 text-8xl opacity-20" aria-hidden>
          🎁
        </div>

        {stage === 'idle' ? (
          <div className="relative flex flex-col items-center gap-3 py-2">
            <span
              aria-hidden
              className="text-6xl drop-shadow-lg"
              style={{ lineHeight: 1 }}
            >
              ✉️
            </span>
            <p className="text-center text-sm font-black text-amber-950">
              כל מעטפה מסתירה מדבקה אמיתית מהאלבום!
            </p>
            <p className="text-center text-xs font-bold text-amber-800/80">
              מהיצע שאין לכם עדיין - אף פעם לא כפילות
            </p>
          </div>
        ) : (
          <div className="relative flex min-h-[13rem] flex-col items-center justify-center gap-3">
            {stage === 'shaking' && (
              <span
                aria-hidden
                className="animate-[envelopeShake_.5s_ease-in-out] text-6xl"
                style={{ lineHeight: 1 }}
              >
                ✉️
              </span>
            )}

            {stage === 'empty' && (
              <span aria-hidden className="text-6xl" style={{ lineHeight: 1 }}>
                📭
              </span>
            )}

            {stage === 'revealing' && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                {won.slice(0, revealed).map((sticker, index) => (
                  <RevealedCard key={sticker.id} sticker={sticker} index={index} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* The outcome line: what happened, in the child's terms. */}
      {stage === 'shaking' && (
        <p className="rounded-2xl bg-amber-200/90 px-3 py-2 text-center text-sm font-black text-amber-950">
          המעטפה נפתחת... 🥁
        </p>
      )}

      {done && (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-100/95 px-3 py-2 text-center">
          {stage === 'empty' ? (
            /* Nothing left to win. The refund is the whole outcome, so it leads. */
            <p className="text-sm font-black text-amber-950">
              🎉 אספתם את כל המדבקות שאפשר לקנות!
            </p>
          ) : won.some((s) => s.rarity === 'legendary') ? (
            <p className="text-sm font-black text-amber-950">
              🌟 אגדי! קיבלתם מדבקה נדירה במיוחד!
            </p>
          ) : (
            <p className="text-sm font-black text-emerald-950">
              🎉 {won.length === 1 ? 'מדבקה חדשה באלבום!' : `${won.length} מדבקות חדשות באלבום!`}
            </p>
          )}
          {refunded > 0 && (
            <p className="mt-0.5 text-xs font-bold text-amber-800">
              היה רק מה שכבר יש לכם - קיבלתם {refunded} עוגיות בחזרה 🍪
            </p>
          )}
        </div>
      )}

      {message && (
        <p className="rounded-2xl border-2 border-amber-400 bg-amber-100 px-3 py-2 text-center text-sm font-black text-amber-950">
          {message}
        </p>
      )}

      {albumFinished && stage === 'idle' && (
        <p className="rounded-2xl border-2 border-amber-400 bg-amber-100 px-3 py-2 text-center text-sm font-black text-amber-950">
          🏆 אספתם את כל המדבקות שאפשר לקנות! נשארו רק הסודות שבעמוד ההישגים.
        </p>
      )}

      {/* The two packs. */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <PackButton
          emoji="✉️"
          title="מעטפת הפתעה"
          subtitle="מדבקה אחת אקראית"
          price={SINGLE_PACK_PRICE}
          disabled={stage !== 'idle' || !canAffordSingle}
          onClick={() => open(1, SINGLE_PACK_PRICE)}
        />
        <PackButton
          emoji="🎁"
          title="חבילת שלישייה"
          subtitle="3 מדבקות במחיר מוזל"
          price={TRIPLE_PACK_PRICE}
          highlight
          disabled={stage !== 'idle' || !canAffordTriple}
          onClick={() => open(3, TRIPLE_PACK_PRICE)}
        />      </div>

      {done && (
        <button
          type="button"
          onClick={dismiss}
          className="rounded-2xl border-4 border-amber-700 bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-2 text-base font-black text-amber-950 shadow-[0_4px_0_#78350f] transition active:translate-y-[3px] active:shadow-none"
        >
          סגרו והמשיכו 🎈
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  Pieces                                    */
/* -------------------------------------------------------------------------- */

/**
 * One revealed card, mid-flip.
 *
 * The two faces are stacked in the same box and the back is pre-rotated 180deg, with the
 * container turning between them. The back is hidden with `backface-visibility` rather
 * than by swapping elements, so both faces are present for the whole turn and the card
 * never disappears for a frame at the edge-on point.
 */
function RevealedCard({ sticker, index }: { sticker: StickerItem; index: number }) {
  const rarity = RARITY_META[sticker.rarity];
  const legendary = sticker.rarity === 'legendary';

  return (
    <div className="relative" style={{ perspective: '900px' }}>
      {legendary && <SparkleBurst size={150} />}
      <div
        className="relative h-40 w-32 animate-[stickerFlip_.6s_ease-out_forwards]"
        style={{ transformStyle: 'preserve-3d', animationDelay: `${index * 80}ms` }}
      >
        {/* The back of the card: what is seen before the turn completes. */}
        <div
          className="absolute inset-0 grid place-items-center rounded-2xl border-4 border-amber-500 bg-gradient-to-br from-amber-300 to-amber-600 text-4xl shadow-lg"
          style={{ backfaceVisibility: 'hidden' }}
          aria-hidden
        >
          🍪
        </div>

        {/* The front, pre-turned so it faces the right way once the flip lands. */}
        <div
          className={`absolute inset-0 flex flex-col overflow-hidden rounded-2xl border-4 bg-amber-50 shadow-xl ${
            legendary ? 'border-amber-400' : 'border-amber-300'
          }`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <img
            src={sticker.imageSrc}
            alt=""
            className="h-27 w-full flex-1 object-cover"
            style={{ height: '7.5rem' }}
          />
          <div className="bg-amber-100 px-1.5 py-1 text-center">
            <p className="truncate text-[11px] font-black text-amber-950">{sticker.title}</p>
            <p className={`mt-0.5 inline-block rounded-full px-1.5 py-[1px] text-[9px] font-black ${rarity.chip}`}>
              {rarity.emoji} {rarity.label}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PackButton({
  emoji,
  title,
  subtitle,
  price,
  onClick,
  disabled,
  highlight = false,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  price: number;
  onClick: () => void;
  disabled: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between gap-2 rounded-2xl border-4 px-3 py-2.5 text-right transition active:translate-y-[3px] active:shadow-none ${
        disabled
          ? 'cursor-not-allowed border-stone-300 bg-stone-200 text-stone-500 shadow-none'
          : highlight
            ? 'border-amber-700 bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 shadow-[0_4px_0_#78350f]'
            : 'border-amber-600 bg-amber-100 text-amber-950 shadow-[0_4px_0_#b45309]'
      }`}
    >
      <span aria-hidden className="text-2xl">
        {emoji}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-black leading-tight">{title}</span>
        <span className="text-[11px] font-bold opacity-80">{subtitle}</span>
      </span>
      <span className="shrink-0 rounded-full bg-amber-950/90 px-2 py-1 text-[11px] font-black tabular-nums text-amber-100">
        {price} 🍪
      </span>
    </button>
  );
}
