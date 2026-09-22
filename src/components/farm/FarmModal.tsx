/**
 * The Farm District hub ("חווה").
 *
 * Replaces the legacy tile-upgrade / pet-adoption screens with a clean arcade
 * menu: the barn stations, each with its best-medal tracker, plus a header
 * showing the district title, the close button and total cookies.
 *
 * Only barn games live here. The picnic basket and the star game are reached
 * from their own town-map anchors, so choosing one never means walking through
 * the barn first.
 */
import { useCallback, useState } from 'react';
import { Cookie, X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import { FARM_STATIONS, medalLabel, type FarmStationId } from './farmStations';
import ActiveStation from './ActiveStation';
import { useFarmMedals } from './useFarmMedals';
import { HubIntro } from './FarmHubParts';
import GameLaunchModal from '../kingdom/GameLaunchModal';
import type { GameMetaKey } from '../kingdom/districtRouting';
import type { StationLevel } from '../../features/progression/useStationProgress';
import { LANTERN_GLOW, PLANK_WALL } from './BarnShell';
import type { FarmMedal } from './farmTimerData';
import StationCard from './StationCard';

/**
 * The launch card each barn station shows before its game starts.
 *
 * A LOOKUP RATHER THAN A FIELD ON `FARM_STATIONS`. The station list is about the games - their
 * titles, skills and colours - while this table is about what the launch card shows. Keeping them
 * apart means the launch copy can change without touching the hub's layout data, and a station
 * without an entry simply opens immediately instead of showing a blank card.
 */
const FARM_LAUNCH: Partial<Record<FarmStationId, GameMetaKey>> = {
  barn: 'barnWho',
  feeding: 'feeding',
  scales: 'scales',
  spotlight: 'nightBarn',
};

interface FarmModalProps {
  /** Title of the district tile that was opened. */
  tileLabel: string;
  /** Current level of the farm tile - drives the hub subtitle. */
  tileLevel: number;
  onClose: () => void;
}

export default function FarmModal({ tileLabel, tileLevel, onClose }: FarmModalProps) {
  const { state, addCookies } = useGame();
  const feedback = useAnswerFeedback();
  const { medals, recordMedal } = useFarmMedals();
  const [activeId, setActiveId] = useState<FarmStationId | null>(null);
  const [earnedHere, setEarnedHere] = useState(0);
  /** The station whose launch card is showing, before its game has started. */
  const [launchingId, setLaunchingId] = useState<FarmStationId | null>(null);
  /**
   * The level the running station was started at.
   *
   * SET FROM THE LAUNCH CARD'S `onStart`, WHICH IS THE ONLY PLACE IT CAN COME FROM. The card
   * owns the selector and derives the default from the unlocked level, so the hub cannot work
   * this out for itself without duplicating the progression read - and a hub that guessed would
   * disagree with the card the moment the two diverged.
   */
  const [level, setLevel] = useState<StationLevel>(1);

  const active = FARM_STATIONS.find((station) => station.id === activeId) ?? null;

  /** A finished run: pay the medal's cookies, cheer and update the best board. */
  const handleReward = useCallback(
    (medal: FarmMedal) => {
      if (!activeId) return;
      addCookies(medal.cookies);
      setEarnedHere((total) => total + medal.cookies);
      recordMedal(activeId, medal);
      if (medal.id === 'gold') feedback.celebrate();
      else feedback(true);
    },
    [activeId, addCookies, feedback, recordMedal],
  );

  /*
   * THE LAUNCH CARD SITS ABOVE THE HUB, NOT INSIDE ITS CONTENT AREA.
   *
   * `GameLaunchModal` is its own full-screen dialog with a backdrop, so rendering it inside the
   * barn's shell would put a backdrop over the barn and clip the card to the playfield. Returning
   * it as a sibling instead means the barn is still mounted underneath and closing the card reveals
   * the hub again, with `activeId` untouched.
   */
  if (launchingId !== null && FARM_LAUNCH[launchingId]) {
    return (
      <GameLaunchModal
        meta={FARM_LAUNCH[launchingId]}
        onStart={(chosen) => {
          setLevel(chosen);
          setActiveId(launchingId);
          setLaunchingId(null);
        }}
        onClose={() => setLaunchingId(null)}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end justify-center bg-stone-900/75 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="חוות המשחקים"
      onClick={active ? undefined : onClose}
    >
      <div
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
        className="relative flex h-[92vh] w-[94vw] max-w-3xl animate-[rise_.2s_ease-out] flex-col overflow-hidden rounded-t-3xl border-4 border-amber-800/90 shadow-2xl sm:h-[85vh] sm:max-h-[760px] sm:rounded-3xl"
        style={{ backgroundImage: `${LANTERN_GLOW},${PLANK_WALL}` }}
      >
        {/* Header: district title, cookie total and close/back button.
            `py-1.5` rather than `py-3`: this bar is shared by every farm station and its
            height comes straight out of the game's playfield. Trimming it gives the
            balance game the vertical headroom it needs for the tilted pans to stay clear
            of the question banner, without shrinking any text. */}
        <header className="flex shrink-0 items-center gap-2 border-b-4 border-amber-950/70 bg-gradient-to-b from-amber-900/90 to-amber-950/90 px-3 py-1.5 shadow-[0_4px_10px_rgba(0,0,0,0.4)] sm:px-4">
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-400 text-2xl shadow-[0_4px_0_#b45309]"
          >
            🚜
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-black text-amber-50 drop-shadow">
              {active ? `${active.emoji} ${active.title}` : `${tileLabel} · האסם`}
            </h2>
            <p className="text-[11px] font-bold text-amber-200/90">
              {active
                ? active.skill
                : `רמה ${tileLevel} · ${FARM_STATIONS.length} תחנות משחק`}
            </p>
          </div>

          <span className="flex items-center gap-1.5 rounded-2xl bg-amber-400 px-3 py-2 text-sm font-black text-amber-950 shadow-[0_3px_0_#b45309]">
            <Cookie className="h-4 w-4" />
            <span className="tabular-nums">{state.inventory.cookies}</span>
          </span>

          <button
            type="button"
            onClick={active ? () => setActiveId(null) : onClose}
            aria-label={active ? 'חזרה למשחקים' : 'סגור'}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-400 text-amber-950 shadow-[0_4px_0_#b45309] transition hover:brightness-110 active:translate-y-[3px] active:shadow-none"
          >
            <X className="h-5 w-5" strokeWidth={3} />
          </button>
        </header>

        {/*
          THE CONTENT AREA SWITCHES MODE DEPENDING ON WHAT IS INSIDE IT.

          The hub is a scrolling list of station cards - it can legitimately be
          taller than the modal, so it keeps `overflow-y-auto`.

          A live station is different: it must fit on one screen, because a
          scrollbar here cuts the answer keypad off mid-row. So when a station is
          open the container becomes a NON-scrolling flex box and the station is
          given a definite height to lay itself out inside. Without this the
          station's own `h-full` would resolve against the scroll content box
          rather than the viewport, and the overflow would simply move up here.

          `overflow-hidden` on the live-station branch is also load-bearing: the
          station's own column clips itself, but this is the boundary that stops a
          stubborn child from turning the whole dialog into a scrollbar.
        */}
        <div
          className={
            active === null
              ? 'min-h-0 flex-1 overflow-y-auto p-3 sm:p-4'
              : 'flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4'
          }
        >
          {active === null ? (
            <>
              <HubIntro earnedHere={earnedHere} />
              <ul className="grid grid-cols-2 gap-3">
                {FARM_STATIONS.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    best={medals[station.id]}
                    onOpen={() => setLaunchingId(station.id)}
                  />
                ))}
              </ul>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <ActiveStation
                station={active}
                onReward={handleReward}
                bestMedalLabel={medalLabel(medals, active.id)}
                level={level}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
