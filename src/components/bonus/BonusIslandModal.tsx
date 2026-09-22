/**
 * אי ההפוגה: the relaxation island, a HUB for two non-math games.
 *
 * ================================================================================================
 * WHY THIS IS NOW A HUB AND NOT A TAB SWITCHER
 * ================================================================================================
 *
 * The balloon used to land straight INTO a running game, with a thin pill switcher at the top to move
 * between the two. That was wrong for a reason the switcher's design could not fix: the island's whole
 * premise is that the child CHOSE to come here to wind down, and a tap on the balloon dropped them into
 * a 30-second timer with a running score before they had picked anything. The first thing that happened
 * on arrival was the clock. There was no moment of "what would I like to do".
 *
 * The hub restores that moment. Landing here now shows the island, the two activities and what each one
 * trains, and nothing starts until a card is tapped - so a child who wanted the balloons is not made to
 * spend their first three seconds backing out of the tower.
 *
 * THE TAB SWITCHER IS GONE FROM THE GAME SCREENS ENTIRELY, which is the other half of the change. It
 * was a control that let a player abandon a run mid-session, and mid-session abandonment is the one
 * thing a memory sprint cannot absorb: the tower game is scored on a streak of flawless rounds, so
 * hopping to the balloons and back reset a session the child was halfway through. Choosing from a hub
 * BEFORE the timer starts makes the decision cost nothing.
 *
 * ================================================================================================
 * THE LEVEL PROP - WHAT IT NOW DOES, AND THE ONE THING IT STILL DOES NOT
 * ================================================================================================
 *
 * THE CARDS PASS A LEVEL AND BOTH GAMES NOW HONOUR IT. This block previously warned that the picker was
 * decorative; that is no longer true and the note is kept, rewritten, because the seam it described is
 * only half closed.
 *
 * WHAT THE LEVEL CONTROLS NOW:
 *
 *   `LightedWindowsGame` - the board. Level 1 is 3x3 with three windows lit, Level 2 is 4x4 with four,
 *   and Level 3 is 4x4 with five AND a look-time cut to 75% of the baseline. The grid, the lit count
 *   and the memorise window all come from `windowsBoardForLevel(level)`.
 *
 *   `HotAirBalloonsGame` - the temptation. The level sets the digit gap (wide at Level 1, 1 apart from
 *   Level 2 so 7-vs-8 is possible), whether the envelopes are pushed to size extremes or brought close
 *   together, how often the two cues are made to conflict, how fast the rule itself changes, and the
 *   pace of the marking. All of that is `balloonLevelSpec(level)`.
 *
 * WHAT IT STILL DOES NOT CONTROL, AND THE REASON IS DELIBERATE:
 *
 *   The MEDAL LADDER is still the persistent, per-game tier in `useWindowsProgress` /
 *   `useBalloonProgress`, keyed under `math-adventure:windows-progress:v1` and
 *   `math-adventure:balloons-progress:v1`. That ladder rises when three golds are banked and never
 *   falls, and it is intentionally separate from `useStationProgress` - so a child can play Level 1
 *   for an easy round without that resetting the medals they earned at Level 3.
 *
 * THE TWO NUMBERS BOTH EXIST AND BOTH MATTER. The LEVEL is per-session and explicit ("this is what I
 * want to play now"); the TIER is persistent and earned. The games read the level for difficulty and
 * the tier only for medals, which is what keeps a level-1 session from silently awarding tier-3
 * progress or vice versa.
 *
 * Nothing is mis-recorded: the card is a pure reader of `useStationProgress`, exactly like every other
 * launch card, so it cannot award a medal that was not earned.
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import HotAirBalloonsGame from './HotAirBalloonsGame';
import LightedWindowsGame from './LightedWindowsGame';
import GameLaunchModal from '../kingdom/GameLaunchModal';
import type { GameMetaKey } from '../kingdom/districtRouting';
import type { StationLevel } from '../../features/progression/useStationProgress';
import islandHero from '../../assets/island/island_of_respite.png';
import towerCard from '../../assets/island/building_screen.png';
import balloonCard from '../../assets/island/balloon_screen.png';

/**
 * Which of the island's two games is on screen.
 *
 * `null` IS THE HUB, and it is the initial state - the island opens on the choice, never on a game.
 */
type BonusGame = 'windows' | 'balls' | null;

interface BonusIslandModalProps {
  onClose: () => void;
}

/** The two activities, described for the hub cards. */
const ACTIVITIES: ReadonlyArray<{
  id: Exclude<BonusGame, null>;
  meta: GameMetaKey;
  art: string;
  title: string;
  blurb: string;
}> = [
  {
    id: 'windows',
    meta: 'islandTower',
    art: towerCard,
    title: 'חלונות במגדל',
    blurb: 'אימון זיכרון וריכוז חזותי',
  },
  {
    id: 'balls',
    meta: 'islandBalloons',
    art: balloonCard,
    title: 'כדורים מתעתעים',
    blurb: 'אימון חשיבה וגמישות',
  },
];

export default function BonusIslandModal({ onClose }: BonusIslandModalProps) {
  /** `null` -> the hub. Otherwise the chosen game, awaiting its launch card. */
  const [game, setGame] = useState<BonusGame>(null);
  /** The level the run was started at, or null while the launch card is up. */
  const [level, setLevel] = useState<StationLevel | null>(null);

  /*
   * THE LAUNCH CARD RETURNS EARLY, BEFORE ANY ISLAND CHROME EXISTS.
   *
   * Same reasoning as the pizza and the trucks: `GameLaunchModal` is itself a `fixed inset-0` dialog, so
   * rendering it INSIDE this modal's box would stack two backdrops, put two ✕ controls on screen, and
   * lay the card's content out against this panel's height instead of the viewport - which is what
   * clipped its play button elsewhere in the app.
   *
   * Returning it as a SIBLING of the island chrome (rather than instead of it) keeps the island mounted
   * behind the card as the dimmed backdrop, so the transition from card to game stays on the island
   * rather than flashing a different screen.
   */
  if (game !== null && level === null) {
    const activity = ACTIVITIES.find((entry) => entry.id === game);
    return (
      <GameLaunchModal
        meta={activity ? activity.meta : 'islandTower'}
        onStart={setLevel}
        onClose={() => setGame(null)}
      />
    );
  }

  if (game !== null && level !== null) {
    /*
     * THE GAME SCREEN: NO TAB STRIP, NO HUB HEADER, JUST THE GAME.
     *
     * The game fills the frame edge to edge, which is what the old thin switcher was there to allow -
     * but the switcher is gone, so the only control is the game's own ✕. Backing out entirely is a
     * deliberate single step: the hub reopens from the map, so there is no "back to the two cards"
     * button competing with the ✕ for the child's attention mid-run.
     */
    return (
      <div
        className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/75 backdrop-blur-sm sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-label={game === 'windows' ? 'חלונות במגדל' : 'כדורים מתעתעים'}
        onClick={onClose}
      >
        <div
          dir="rtl"
          className="relative flex h-[93vh] w-full max-w-2xl animate-[rise_.2s_ease-out] flex-col overflow-hidden rounded-t-3xl border-2 border-indigo-400/40 bg-slate-950 shadow-2xl sm:h-[90vh] sm:max-h-[820px] sm:rounded-3xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative min-h-0 flex-1">
            {game === 'windows' ? (
              <LightedWindowsGame level={level} onSolved={() => undefined} onClose={onClose} />
            ) : (
              <div className="h-full overflow-hidden">
                <HotAirBalloonsGame level={level} onSolved={() => undefined} onClose={onClose} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- The hub ---------------- */
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/75 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="אי ההפוגה"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="flex max-h-[93vh] w-full max-w-2xl animate-[rise_.2s_ease-out] flex-col overflow-y-auto overscroll-contain rounded-t-3xl border-2 border-indigo-400/40 bg-gradient-to-b from-sky-100 to-indigo-100 shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ---- Hero. The island itself, with the title laid over the sky so the
            art is not a picture above a heading but the header itself. ---- */}
        <div className="relative shrink-0">
          <img
            src={islandHero}
            alt=""
            aria-hidden
            draggable={false}
            className="h-40 w-full object-cover sm:h-52"
          />
          {/*
            A SCRIM, NOT A SOLID BAR. The hero is a bright sky-and-sea illustration, and white text on
            it without help fails contrast on the pale water. A gradient to transparent keeps the text
            legible while still letting the art read as the top of the screen - a solid caption strip
            would have been safer and would have hidden the thing the art is there for.
          */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/25 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="absolute start-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-700 shadow-md backdrop-blur transition hover:bg-white active:scale-95"
          >
            <X className="h-5 w-5" strokeWidth={3} />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h2 className="text-xl font-black text-white drop-shadow-md sm:text-2xl">
              אי ההפוגה 🏝️
            </h2>
            <p className="text-xs font-bold text-sky-100/95 sm:text-sm">
              זמן לאמן את המוח ולהירגע מהחשבון
            </p>
          </div>
        </div>

        {/* ---- The two activities. Side by side from `sm` up, stacked on a phone
            where two columns would squeeze the Hebrew titles to two words a line. ---- */}
        <ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          {ACTIVITIES.map((activity) => (
            <li key={activity.id}>
              <button
                type="button"
                onClick={() => setGame(activity.id)}
                className="group flex w-full flex-col overflow-hidden rounded-2xl border-2 border-indigo-200 bg-white text-right shadow-md transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-xl active:translate-y-0"
              >
                <img
                  src={activity.art}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="h-28 w-full object-cover transition group-hover:brightness-105 sm:h-32"
                />
                <span className="flex flex-col gap-0.5 p-3">
                  <span className="text-base font-black text-indigo-950">
                    {activity.id === 'windows' ? '🏢' : '🎈'} {activity.title}
                  </span>
                  <span className="text-xs font-bold text-indigo-500">{activity.blurb}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
