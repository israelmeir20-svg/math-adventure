/**
 * Sticky player HUD.
 *
 * ================================================================================================
 * WHAT IS LEFT HERE, AND WHY EACH EARNED ITS PLACE
 * ================================================================================================
 *
 * FIVE THINGS, ONE ROW: the game's name, the active player, the cookie balance and streak, and the two
 * doors that open reference material - the tricks book and the sticker machine. Everything else this bar
 * has carried at some point has been removed, and the reason
 * is the same for all of it - a HUD pill has to be a number the child can ACT on from this screen.
 *
 * THE COOKIE PILL STAYS BECAUSE IT IS THE STICKER CURRENCY. Sticker packs are priced in cookies, so
 * this pill and the `מדבקות` button beside it are one thought: "how much can I spend, and where do I
 * spend it". The album shows the balance again inside its own header, which is deliberate and not a
 * duplication to collapse - that is the moment the child is actually deciding, and making them
 * remember a number from a bar they have already scrolled past would be the worse trade.
 *
 * THE RESOURCE PILLS ARE GONE. They rendered `RESOURCE_META`'s vegetables and items as four green
 * counters that sat at 0 for the whole game, because nothing in the current loop earns them. A row of
 * zeros reads as "you have failed to collect these" rather than "these are not used yet", which is the
 * worst thing a HUD can say to a seven-year-old. `StatPill` went with them, since it existed only to
 * render them.
 *
 * THE STAR COOKIE PILL IS GONE FOR A DIFFERENT REASON - it is earned (a doubled streak pays one) but
 * there is no rendered surface that spends it. `buyItem` on the game context is the only consumer and
 * no screen calls it, so the number could only ever climb with no way to use it.
 */
import { useState } from 'react';
import { Cookie, Flame } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { STREAK_BADGE_THRESHOLD } from '../kingdom/tileThemes';
import StickerAlbumModal from '../sticker/StickerAlbumModal';
import ProfileModal from './ProfileModal';
import { useProfiles } from '../../context/ProfileContext';
import TricksBookModal from '../classroom/TricksBookModal';

export default function TopBar() {
  const { state } = useGame();
  const { inventory, streak } = state;
  const { activeProfile } = useProfiles();
  const [albumOpen, setAlbumOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [tricksOpen, setTricksOpen] = useState(false);
  const fired = streak.multiplier === 2;
  const progress = Math.min(streak.consecutiveCorrect / STREAK_BADGE_THRESHOLD, 1);

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b-4 border-amber-300/80 bg-amber-50/90 backdrop-blur">
        {/*
          `justify-between` WITH THE TITLE NO LONGER NEEDING `me-auto`.

          The bar used to be a wrapping flex row whose items were pushed apart by a margin on the title,
          which was a way of doing `justify-between` by hand and only worked while the title was first.
          With the row reduced to four items the grouping is now explicit: the title anchors the right
          (this is an RTL document, so `start` is the right edge), the two status pills sit together in
          the middle, and the sticker button anchors the left.
        */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-5">
          <h1 className="flex items-center gap-2 text-lg font-black text-amber-900 sm:text-xl">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-400 text-xl shadow-[0_3px_0_#b45309]">
              🗺️
            </span>
            <span className="hidden sm:inline">הרפתקת החשבון</span>
          </h1>

          {/*
            THE PROFILE PILL, AND WHY IT SITS WITH THE TITLE RATHER THAN THE STATUS GROUP.

            It answers "who is playing", which is the same kind of question the title answers - context for
            the screen - whereas the pills beside it are numbers. Grouping it with the counters would read
            as a statistic; grouped with the title it reads as an identity, which is what makes it look
            tappable.

            THE NAME IS HIDDEN ON NARROW SCREENS, like the title beside it. The header has four elements
            competing for one row on a phone, and the AVATAR alone still identifies the player - the name is
            readable once the pill is tapped open, which is one tap away by design.
          */}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label={`פרופיל: ${activeProfile.name}. לחצו להחלפה`}
            title="החלפת שחקן"
            className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-amber-100 px-2.5 py-1.5 text-amber-950 shadow-[0_3px_0_#b45309] ring-1 ring-amber-300 transition hover:bg-amber-200 active:translate-y-[2px] active:shadow-none"
          >
            <span aria-hidden className="text-lg leading-none">
              {activeProfile.avatar}
            </span>
            <span className="hidden max-w-[7rem] truncate text-sm font-black sm:inline">
              {activeProfile.name}
            </span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-amber-200 px-3 py-1.5 text-amber-900 shadow-[0_3px_0_#b45309]">
              <Cookie className="h-4 w-4" />
              <span className="text-sm font-black tabular-nums">{inventory.cookies}</span>
            </div>

            <StreakBadge fired={fired} count={streak.consecutiveCorrect} progress={progress} />
          </div>

          {/*
            THE TRICKS BUTTON SITS BESIDE THE STICKERS ONE, AND THE PAIRING IS THE POINT.

            Both are "reference material the child can open at any time" rather than a number to act on,
            which is why neither is a status pill. They share the amber treatment so the row reads as one
            group of two doors.

            IT IS ALSO THE SECOND WAY INTO THE SAME MODAL. `TeacherTamar` already opens it from inside a
            problem, but that is only reachable once a question is on screen - a child who wants to revise
            a trick while looking at the map had no route at all. Same component, two entry points, no
            duplicated copy to drift.
          */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setTricksOpen(true)}
              aria-label="פתחו את ספר הטריקים"
              title="ספר הטריקים של תמר"
              className="flex items-center gap-1.5 rounded-2xl bg-amber-400 px-3 py-1.5 text-amber-950 shadow-[0_3px_0_#b45309] transition hover:bg-amber-300 active:translate-y-[2px] active:shadow-none"
            >
              <span aria-hidden className="text-lg">
                📖
              </span>
              <span className="hidden text-sm font-black sm:inline">ספר הטריקים</span>
            </button>

            <button
              type="button"
              onClick={() => setAlbumOpen(true)}
              aria-label="פתחו את מכונת המדבקות"
              title="מכונת המדבקות"
              className="flex items-center gap-1.5 rounded-2xl bg-amber-400 px-3 py-1.5 text-amber-950 shadow-[0_3px_0_#b45309] transition hover:bg-amber-300 active:translate-y-[2px] active:shadow-none"
            >
              <span aria-hidden className="text-lg">
                🎴
              </span>
              <span className="hidden text-sm font-black sm:inline">מדבקות</span>
            </button>
          </div>
        </div>
      </header>

      {albumOpen && <StickerAlbumModal onClose={() => setAlbumOpen(false)} />}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
      {tricksOpen && <TricksBookModal onClose={() => setTricksOpen(false)} />}
    </>
  );
}

function StreakBadge({
  fired,
  count,
  progress,
}: {
  fired: boolean;
  count: number;
  progress: number;
}) {
  return (
    <div
      className={`relative flex items-center gap-2 overflow-hidden rounded-2xl px-3 py-1.5 transition-colors ${
        fired
          ? 'bg-orange-500 text-white shadow-[0_3px_0_#9a3412]'
          : 'bg-stone-200 text-stone-600 shadow-[0_3px_0_#a8a29e]'
      }`}
      title={`${count} תשובות נכונות ברצף`}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 start-0 bg-orange-400/40"
        style={{ width: `${progress * 100}%` }}
      />
      <Flame className={`relative h-4 w-4 ${fired ? 'animate-pulse' : ''}`} />
      {/*
        THE NUMBER IS THE LIVE STREAK, NOT A LITERAL.

        This read `×{2}` - a hardcoded two - so the badge announced "×2" no matter what the child had
        actually strung together, while the tooltip and the progress fill beside it used the real count.
        The doubled multiplier IS two, but it is two only once the streak has fired; before that the
        honest thing to show is how many correct answers are behind the badge, which is what the fill
        above it is already measuring.
      */}
      <span className="relative text-sm font-black tabular-nums">
        {fired ? '×2' : `×${count}`}
      </span>
      {fired && <span className="relative text-xs font-bold">רצף! 🔥</span>}
    </div>
  );
}
