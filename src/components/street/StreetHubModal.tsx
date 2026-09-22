/**
 * The street mini-games hub: pick Multiplication Balloons or Hopscotch.
 *
 * ================================================================================================
 * TWO LAYERS, AND WHY THE FIRST ONE IS NOT A LAUNCH CARD
 * ================================================================================================
 *
 * This hub is a DISTRICT: it has `street.png`, a Teacher Tamar tip and a level picker, and its
 * content is the choice between two games. The games themselves are standalone: each has its own
 * banner, its own tip and its own level, and neither knows the other exists.
 *
 * So the hub is the launch card for the street (with the two games as its body instead of a single
 * green button), and picking a game opens that game's OWN level picker and progression.
 */
import { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { GAME_META, screenArt, teacherAvatar } from '../kingdom/districtRouting';
import GameLaunchModal from '../kingdom/GameLaunchModal';
import type { StationLevel } from '../../features/progression/useStationProgress';
import BalloonsGame from './BalloonsGame';
import HopscotchGame from './HopscotchGame';

type StreetGame = 'balloons' | 'hopscotch';

/**
 * The two games, in the order the hub offers them.
 *
 * `meta` POINTS INTO `GAME_META` RATHER THAN REPEATING THE COPY. The banner and the tip live in
 * one table so the hub card and the game's own launch card cannot disagree about what the game is
 * called - which is the failure mode of duplicating the strings here.
 */
const GAME_CARDS: {
  id: StreetGame;
  meta: 'balloons' | 'hopscotch';
  blurb: string;
  emoji: string;
  tone: string;
  shadow: string;
}[] = [
  {
    id: 'balloons',
    meta: 'balloons',
    blurb: 'פוצצו את כל הבלונים שהם כפולות של המספר.',
    emoji: '🎈',
    tone: 'bg-gradient-to-b from-rose-100 to-rose-200 text-rose-950',
    shadow: 'shadow-[0_6px_0_#9f1239]',
  },
  {
    id: 'hopscotch',
    meta: 'hopscotch',
    blurb: 'דלגו על המשבצות בקפיצות של כפולות עד הסיום.',
    emoji: '👣',
    tone: 'bg-gradient-to-b from-amber-100 to-amber-200 text-amber-950',
    shadow: 'shadow-[0_6px_0_#b45309]',
  },
];

export default function StreetHubModal({ onClose }: { onClose: () => void }) {
  /** Which game is running, and which game's launch card is showing. */
  const [game, setGame] = useState<StreetGame | null>(null);
  const [launching, setLaunching] = useState<StreetGame | null>(null);
  /**
   * The level the running game was started at.
   *
   * SET FROM THE LAUNCH CARD'S `onStart`, WHICH IS THE ONLY PLACE IT CAN COME FROM. The card owns
   * the selector and derives the default from the unlocked level, so the hub cannot work this out
   * for itself without duplicating the progression read - and a hub that guessed would disagree
   * with the card the moment the two diverged.
   */
  const [level, setLevel] = useState<StationLevel>(1);

  const info = GAME_META.street_hub;
  const banner = screenArt(info.artKey);
  const avatar = teacherAvatar();

  /* The game's own launch card, shown on top of the hub. */
  if (launching !== null) {
    const card = GAME_CARDS.find((c) => c.id === launching)!;
    return (
      <GameLaunchModal
        meta={card.meta}
        onStart={(chosen) => {
          setLevel(chosen);
          setGame(launching);
          setLaunching(null);
        }}
        onClose={() => setLaunching(null)}
      />
    );
  }

  /*
    A RUNNING GAME GETS THE WHOLE CARD, WITH NO HUB CHROME ABOVE IT.

    The banner, the title row and Tamar's tip are all taller than the game itself needs, and
    stacking them over a full-height game squashed the board into the remaining strip - the game
    then had to scroll inside a box that was mostly decoration. They are the SELECTION screen's
    chrome, so they render only while choosing between the two cards.
  */
  if (game !== null) {
    return (
      <div
        className="fixed inset-0 z-[75] flex items-end justify-center bg-stone-900/60 backdrop-blur-sm sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={info.titleHebrew}
        onClick={onClose}
      >
        <div
          dir="rtl"
          className="flex h-full max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border-4 border-amber-800/40 bg-amber-50/95 shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex h-full min-h-0 w-full flex-1 flex-col p-3">
            {game === 'balloons' && <BalloonsGame level={level} onExit={() => setGame(null)} />}
            {game === 'hopscotch' && <HopscotchGame level={level} onExit={() => setGame(null)} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center bg-stone-900/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={info.titleHebrew}
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="flex max-h-[92vh] w-full max-w-3xl animate-[rise_.2s_ease-out] flex-col overflow-y-auto overscroll-contain rounded-t-3xl border-4 border-amber-800/40 bg-amber-50/95 p-4 shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ---- Banner, with the close button riding its corner. ---- */}
        {banner && (
          <div className="relative mb-3">
            <img
              src={banner}
              alt=""
              aria-hidden
              draggable={false}
              className="h-40 w-full rounded-2xl object-cover shadow-[inset_0_2px_10px_rgba(0,0,0,0.25)] md:h-44"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="סגור"
              className="absolute end-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-stone-600 shadow-md backdrop-blur transition hover:bg-white active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <header className="mb-2 flex items-start gap-3">
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-[0_4px_0_rgba(0,0,0,0.12)]"
          >
            🛣️
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-amber-900">{info.titleHebrew}</h2>
            <p className="text-xs font-bold text-amber-900/60">בחרו משחק ותרגלו כפולות</p>
          </div>
          {!banner && (
            <button
              type="button"
              onClick={onClose}
              aria-label="סגור"
              className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-stone-500 shadow-[0_3px_0_rgba(0,0,0,0.15)] transition hover:bg-stone-100 active:translate-y-[2px] active:shadow-none"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </header>

        {/* ---- Teacher Tamar's tip for the street. ---- */}
        <div className="mb-3 flex items-start gap-2.5">
          {avatar && (
            <img
              src={avatar}
              alt="המורה תמר"
              draggable={false}
              className="h-12 w-12 shrink-0 rounded-full border-2 border-amber-500 object-cover shadow-md"
            />
          )}
          <div className="rounded-2xl border border-amber-300 bg-amber-100/90 p-2.5 text-xs font-medium leading-relaxed text-amber-950">
            <p className="mb-0.5 font-bold text-amber-800">המורה תמר ממליצה:</p>
            <p>{info.tipHebrew}</p>
          </div>
        </div>

        {/*
          THE HUB HAS NO LEVEL PICKER OF ITS OWN, AND THAT IS THE CHANGE.

          It used to offer one here and again inside each game's launch card - two identical
          selectors, one of which could not show medals or padlocks because it had no progression
          to read. Whichever the child used, the other disagreed with it.

          Progression now lives in `useStationProgress` and is rendered by `GameLaunchModal`, so
          the street offers a CHOICE OF GAME and each game offers its own LEVELS. That split is
          also the only one that can be correct: the two street games unlock independently, so a
          single hub-level selector could not represent them.
        */}

        <div className="min-h-0 flex-1">
          <ul className="grid gap-3 sm:grid-cols-2">
            {GAME_CARDS.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  onClick={() => setLaunching(card.id)}
                  className={`flex h-full w-full flex-col items-start gap-1 rounded-3xl p-4 text-start transition active:translate-y-[4px] active:shadow-none ${card.tone} ${card.shadow}`}
                >
                  <span aria-hidden className="mb-1 text-4xl">
                    {card.emoji}
                  </span>
                  <span className="text-lg font-black">{GAME_META[card.meta].titleHebrew}</span>
                  <span className="text-sm font-bold opacity-80">{card.blurb}</span>
                  <span className="mt-2 flex items-center gap-1 text-xs font-black">
                    שחקו עכשיו
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
