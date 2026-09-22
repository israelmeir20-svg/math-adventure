/**
 * The shared "press play" launch card for a mini-game.
 *
 * ================================================================================================
 * WHY THIS IS ONE COMPONENT AND NOT PART OF EACH GAME
 * ================================================================================================
 *
 * Every standalone game - the two street games and the four barn stations - is reached the same
 * way: a banner, Teacher Tamar's tip, a level to choose, and a green button. Those four things are
 * identical in shape and differ only in their copy, which is exactly the case for one component
 * driven by a lookup rather than six near-identical intro screens. It also means a change to the
 * layout lands in one place instead of drifting between games.
 *
 * IT IS A GATE, NOT A WRAPPER. The caller renders this INSTEAD of the game until the child presses
 * play, then unmounts it and mounts the game at the chosen level. Keeping the game out of the tree
 * until then matters because several of these games start a countdown on mount - a launch card
 * rendered on top of a running timer would burn the child's first seconds behind a panel.
 *
 * THE LEVEL SELECTOR DRIVES REAL PROGRESSION. It previously offered all three levels to everyone
 * and was, by its own admission, decorative - the note here explained that inventing a per-game
 * completion record would be "a second progress system". That reasoning expired: `useStationProgress`
 * is now the single record for every station, so the chips read their medals and their padlocks from
 * it and the chosen level is a genuine difficulty, not a label.
 *
 * THE CARD IS A PURE READER. It SHOWS progression and never writes it - the only way a medal is
 * recorded is a game calling `recordGoldMedal`, from inside a round the child actually played. A
 * card that could award medals would let a child tap levels to fill the meter without answering
 * anything.
 */
import { useState } from 'react';
import { Check, Lock, Medal, Play, X } from 'lucide-react';
import {
  GAME_META,
  screenArt,
  teacherAvatar,
  type GameMetaKey,
} from '../kingdom/districtRouting';
import {
  GOLD_MEDALS_PER_LEVEL,
  LEVELS,
  useStationProgress,
  type StationLevel,
} from '../../features/progression/useStationProgress';

interface GameLaunchModalProps {
  /** Which entry in `GAME_META` to render. Also the key its progression is stored under. */
  meta: GameMetaKey;
  /** Called with the chosen level when the child presses play. */
  onStart: (level: StationLevel) => void;
  onClose: () => void;
}

export default function GameLaunchModal({
  meta,
  onStart,
  onClose,
}: GameLaunchModalProps) {
  const { progress, isUnlocked } = useStationProgress(meta);

  /**
   * THE SELECTED LEVEL IS DERIVED FROM THE UNLOCK, NOT INITIALISED FROM IT.
   *
   * The obvious shape - `useState(progress.unlockedLevel)` - has a bug that only appears on the
   * happy path: a child on the launch card for a level they just cleared would be defaulted to the
   * level they were ON, not the one they opened, because the state was seeded at first mount and
   * never revisits it. Tracking the child's explicit tap separately and falling back to the
   * UNLOCKED level means the card always opens on the newest available level, while still honouring
   * a deliberate step back to an earlier one.
   */
  const [picked, setPicked] = useState<StationLevel | null>(null);
  const level = picked ?? progress.unlockedLevel;

  const info = GAME_META[meta];

  const banner = screenArt(info.artKey);
  const avatar = teacherAvatar();

  return (
    <div
      /*
        ============================================================================================
        THE CARD MUST OUTRANK THE SHELL, AND AN EQUAL Z-INDEX IS NOT ENOUGH
        ============================================================================================
        
        This was `z-[75]`, which is EXACTLY the value `DistrictInteriorShell` uses. Two fixed
        full-screen overlays at the same z-index are resolved by DOM ORDER - and the bakery renders the
        card BEFORE the shell (deliberately, so the card escapes the shell's `overflow-hidden` panel).
        Later wins, so the shell painted over the card, and the child saw the brown interior with the
        tab strip and NO launch card at all - the "blank bakery" report.
        
        That is why `z-50` would be the wrong fix even though it is the obvious reading: 50 is BELOW 75,
        so the card would sit behind the shell outright and never appear. The card has to be ABOVE the
        shell it is layered over.
        
        WHY NOT LOWER THE SHELL INSTEAD. Because the shell's 75 is shared with every other district's
        modal, and several of them are opened from the town map where they must clear the map's own
        chrome. Moving the card up is a one-line change with a local blast radius; moving the shell down
        would need auditing against every caller.
        
        `z-[90]` CLEARS EVERY OTHER OVERLAY IN THE APP. The next-highest values in use are 80 (the island
        hub, the tricks book, the profile modal, the sticker album) and 75 (the district shells, the farm
        hub, the bridge). Nothing is above 90, so the card can be opened from any of them and still land
        on top. The districts that RETURN the card early (pizza, trucks, kiosk) are unaffected either way,
        since they have no shell underneath to compete with.
      */
      className="fixed inset-0 z-[90] flex items-end justify-center bg-stone-900/60 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={info.titleHebrew ?? 'משחק'}
      onClick={onClose}
    >
      {/*
        THE CARD SCROLLS RATHER THAN CLIPPING, AND THE MAX HEIGHT IS ON THIS BOX.

        `max-h-[92vh] overflow-y-auto` is the fix for the play button falling off the bottom on a
        short window: the banner plus a two-line tip plus the selector can exceed the viewport, and a
        container that only CLIPS would hide the one control the child has to reach. Scrolling keeps
        it reachable no matter how the text wraps.
      */}
      <div
        dir="rtl"
        className="max-h-[92vh] w-full max-w-md animate-[rise_.2s_ease-out] overflow-y-auto overscroll-contain rounded-t-3xl border-4 border-amber-800/40 bg-amber-50/95 p-4 shadow-2xl sm:rounded-3xl"
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
              /*
                `h-32 md:h-40` RATHER THAN `h-40 md:h-44`. The banner is the one element on this card
                with no information in it - it is decoration - and it was the single largest consumer of
                the fixed height budget. On a short laptop window the stack (banner + task + Tamar + the
                level grid + the CTA) overflowed, and because the shell's panel clipped rather than
                scrolled, the PLAY BUTTON was the item that fell off the bottom.

                Trimming it here means the whole card fits without scrolling on the common window sizes,
                and the scroll container below is the safety net for the rest - a shorter hero costs
                nothing, whereas a hidden play button is a dead end.
              */
              className="h-32 w-full rounded-2xl object-cover shadow-[inset_0_2px_10px_rgba(0,0,0,0.25)] md:h-40"
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

        <header className="mb-2 flex items-start gap-2">
          {/* Omitted entirely when the game names itself elsewhere - see `GameMeta.titleHebrew`. */}
          {info.titleHebrew ? (
            <h2 className="min-w-0 flex-1 text-lg font-black text-amber-900">{info.titleHebrew}</h2>
          ) : (
            <span className="flex-1" />
          )}
          {!banner && (
            <button
              type="button"
              onClick={onClose}
              aria-label="סגור"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-stone-500 shadow-[0_3px_0_rgba(0,0,0,0.15)] transition hover:bg-stone-100 active:translate-y-[2px] active:shadow-none"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </header>

        {/*
          ---- The task ----

          A BADGE INLINE WITH THE TEXT, NOT A LABEL ABOVE IT. The heading used to be its own line, which
          spent a whole row on two words and left the actual instruction floating under it with no visual
          tie - it read as a stray sentence rather than as the answer to a question.

          THE COOL CREAM/SKY TONES ARE DELIBERATE AGAINST THE WARM AMBER CARD. Tamar's tip below is amber
          and the banner above is photographic, so a third warm block would make the task disappear into
          the card. A sky-tinted panel separates the two voices: this is WHAT to do (neutral, factual),
          the tip is HOW (Tamar's, warm). `items-start` keeps the badge on the first line when the string
          wraps to two lines on a narrow phone.
        */}
        <div className="mb-3 flex items-start gap-2 rounded-2xl border-2 border-sky-200 bg-sky-50 px-3 py-2.5">
          <span className="shrink-0 rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-black text-white shadow-sm">
            מה עושים?
          </span>
          <p className="min-w-0 flex-1 text-sm font-bold leading-snug text-sky-950">
            {info.whatToDo}
          </p>
        </div>

        {/* ---- Teacher Tamar's tip. ---- */}
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

        {/* ---- Level picker. ---- */}
        <p className="mb-2 text-center text-xs font-black text-amber-800">בחרו רמה</p>
        <ul className="mb-3 grid grid-cols-3 gap-2">
          {LEVELS.map((value) => {
            const unlocked = isUnlocked(value);
            const isSelected = unlocked && value === level;
            const earned = progress.medals[value];
            const cleared = earned >= GOLD_MEDALS_PER_LEVEL;

            /*
             * EACH CHIP SHOWS MEDALS EARNED, NOT THE LEVEL NUMBER, AND THE DISTINCTION MATTERS.
             *
             * The earlier version drew `value` medals as a decorative rank stripe - level 3 always
             * showed three, whether or not the child had ever played it. That reads as progress and
             * is not: it makes a level played once look the same as a level mastered. Here the row
             * is `GOLD_MEDALS_PER_LEVEL` slots filled to `earned`, so an untouched level 3 is three
             * empty outlines and the counter matches the "X / 3" the game itself shows.
             *
             * A CLEARED LEVEL GETS A CHECK RATHER THAN A THIRD MEDAL, so "3/3 and open" is
             * distinguishable from "3/3" on a level whose next tier is still locked.
             */
            return (
              <li key={value}>
                <button
                  type="button"
                  disabled={!unlocked}
                  aria-pressed={isSelected}
                  aria-label={
                    unlocked
                      ? `רמה ${value}, ${earned} מתוך ${GOLD_MEDALS_PER_LEVEL} מדליות זהב`
                      : `רמה ${value} נעולה`
                  }
                  onClick={() => setPicked(value)}
                  className={`flex w-full flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2 transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 shadow-[0_3px_0_#047857]'
                      : unlocked
                        ? 'border-amber-300 bg-white shadow-[0_3px_0_rgba(0,0,0,0.08)] hover:bg-amber-50'
                        : 'border-dashed border-stone-300 bg-stone-100'
                  }`}
                >
                  {unlocked ? (
                    <>
                      <span aria-hidden className="flex items-center gap-0.5">
                        {Array.from({ length: GOLD_MEDALS_PER_LEVEL }).map((_, i) =>
                          cleared && i === GOLD_MEDALS_PER_LEVEL - 1 ? (
                            <Check
                              key={i}
                              className={`h-3.5 w-3.5 stroke-[4] ${
                                isSelected ? 'text-emerald-600' : 'text-emerald-500'
                              }`}
                            />
                          ) : (
                            <Medal
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < earned
                                  ? isSelected
                                    ? 'text-emerald-600'
                                    : 'text-amber-500'
                                  : 'text-stone-300'
                              }`}
                              fill="currentColor"
                            />
                          ),
                        )}
                      </span>
                      <span
                        className={`text-[11px] font-black tabular-nums ${
                          isSelected ? 'text-emerald-800' : 'text-amber-900'
                        }`}
                      >
                        רמה {value} · {earned}/{GOLD_MEDALS_PER_LEVEL}
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5 text-stone-400" />
                      <span className="text-[11px] font-black text-stone-400">רמה {value}</span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/*
          ---- The way in ----

          STICKY TO THE BOTTOM OF THE SCROLL BOX, AND THAT IS THE GUARANTEE RATHER THAN A NICETY.

          Trimming the banner makes the card fit on ordinary windows, but "fits on ordinary windows" is
          not a promise - a long Hebrew task string on a small phone will still wrap the stack past
          92vh, and the one element that must never be scrolled away is the button that starts the game.
          Pinning it means the card degrades to "you may need to scroll to read Tamar's tip", instead of
          to "there is no way to play".

          `pt-2` WITH AN OPAQUE BACKGROUND, not `mb-*`: a sticky element scrolls over the content beneath
          it, so without its own background the level chips would show through the button. The negative
          bottom margin cancels the container's `p-4` so the bar reads as flush with the card edge
          rather than floating inside it.
        */}
        <div className="sticky bottom-0 -mx-4 -mb-4 mt-1 border-t-2 border-amber-200 bg-amber-50/95 px-4 pb-4 pt-2 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => onStart(level)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-base font-bold text-white shadow-lg transition-transform hover:bg-emerald-500 active:scale-95"
          >
            <Play className="h-5 w-5" />
            שחקו ברמה {level} ▶
          </button>
        </div>
      </div>
    </div>
  );
}
