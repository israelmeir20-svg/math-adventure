/**
 * The illustrated town map - the main gameplay canvas.
 *
 * Renders the village artwork edge-to-edge beneath the top bar, with a whole
 * building hitbox plus a floating coin pin for every tile. Hovering either one
 * lights up the other; clicking either inspects the tile.
 */
import { useCallback, useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import townMapUrl from '../../assets/town-map.jpg';
import { placeTiles } from './townLocations';
import TownPin from './TownPin';
import TownBuildingHotspot from './TownBuildingHotspot';
import TownOverlays from './TownOverlays';
import HotAirBalloon from './HotAirBalloon';
import { useBalloonEvent } from './useBalloonEvent';
import GoldenEagle from './GoldenEagle';
import { useEagleEvent } from './useEagleEvent';
import CloudShadows from './CloudShadows';
import BonusIslandModal from '../bonus/BonusIslandModal';
import ConstellationModal from '../farm/StarArcadeModal';
import GameAnchorHost from './GameAnchorHost';
import GameAnchorPin from './GameAnchorPin';
import { GAME_ANCHORS, type AnchorGame } from './gameAnchors';

/** Which balloon activity the player picked, if any. */
type BalloonActivity = 'island' | 'stars' | null;

export default function TownMap({
  onInspectTile,
}: {
  onInspectTile: (tileId: string) => void;
}) {
  const { state, addCookies } = useGame();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activity, setActivity] = useState<BalloonActivity>(null);
  const [activeGame, setActiveGame] = useState<AnchorGame | null>(null);
  const [anchorHover, setAnchorHover] = useState<string | null>(null);
  /*
   * THE CLOSED-STATION TOAST.
   *
   * Held as `{ text, nonce }` rather than a bare string so that re-tapping the same closed pin
   * RESTARTS the animation. With a plain string, tapping twice would set the same value, React would
   * bail out of the re-render, and the second tap would look like it did nothing - which is exactly
   * the "the map is broken" reading this notice exists to prevent. The nonce is used as a React `key`
   * below, which forces the element to remount and the animation to replay.
   */
  const [closedNotice, setClosedNotice] = useState<{ text: string; nonce: number } | null>(null);
  /*
   * THE BALLOON NO LONGER TAKES THE STREAK. It used to arrive every 4 correct answers as well as on
   * its own timer, which between them kept it on screen about a third of the time. The 10-minute
   * schedule is now the only way it arrives - see `useBalloonEvent`.
   */
  const balloon = useBalloonEvent();

  /*
   * THE EAGLE'S REWARD IS PAID THROUGH `addCookies`, THE SAME ACTION EVERY STATION USES.
   *
   * `setState` is not used directly, so the bonus lands in the same reducer path as an earned
   * reward - which means the cookie pill in the top bar updates, the total is saved to the
   * active profile, and nothing has to know that this particular bonus came from a bird.
   *
   * THE EMPTY DEPENDENCY LIST IS CORRECT BUT WORTH STATING: `addCookies` is a `useMemo`'d
   * callback from the context whose identity is stable, so this callback does not change
   * between renders. If it ever did, the hook's `onCatch` would change with it - and since
   * `onCatch` is called from a click rather than an effect, a new identity costs nothing.
   */
  const awardEagleBonus = useCallback(() => {
    addCookies(10);
  }, [addCookies]);

  const eagle = useEagleEvent(state.streak.consecutiveCorrect, awardEagleBonus);

  /** Raises the closed notice, or replays it if the same pin was tapped again. */
  const showClosedNotice = useCallback((text: string) => {
    setClosedNotice({ text, nonce: Date.now() });
  }, []);

  const placed = useMemo(
    () => placeTiles(state.tileOrder, state.tiles),
    [state.tileOrder, state.tiles],
  );

  const handleInspect = (tileId: string) => {
    setSelectedId(tileId);
    onInspectTile(tileId);
  };

  const unlockedCount = placed.filter((entry) => entry.tile.isUnlocked).length;

  // ---------------------------------------------------------------------
  // TEMPORARY CALIBRATION HELPER - delete this block when done calibrating.
  // Logs { x, y } map percentages for every click so route/hotspot
  // coordinates can be calibrated against the illustration.
  // ---------------------------------------------------------------------
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    console.log(`{ x: ${x}, y: ${y} },`);
  };
  // ---------------------------------------------------------------------

  return (
    <section className="w-full pb-6 pt-2">
      <div className="overflow-x-auto overflow-y-visible">
        {/*
          The stage is `relative` + `inline-block` so it shrink-wraps the
          illustration exactly. That gives every `absolute inset-0` overlay the
          real rendered height of the map instead of a collapsed 0px box, which
          is what keeps the roaming animals anchored to the artwork.
        */}
        <div
          onClick={handleMapClick}
          className="relative mx-auto inline-block w-full min-w-[640px] max-w-[1400px] align-top"
        >
          <img
            src={townMapUrl}
            alt="מפת העיירה המאוירת"
            className="block w-full select-none"
            draggable={false}
          />

          {placed.map((entry) => (
            <TownBuildingHotspot
              key={`hit-${entry.tile.id}`}
              placed={entry}
              isHovered={hoveredId === entry.tile.id}
              isSelected={selectedId === entry.tile.id}
              onHover={setHoveredId}
              onInspect={handleInspect}
            />
          ))}

          {placed.map((entry) => (
            <TownPin
              key={`pin-${entry.tile.id}`}
              placed={entry}
              isHovered={hoveredId === entry.tile.id}
              isSelected={selectedId === entry.tile.id}
              onInspect={handleInspect}
            />
          ))}

          <TownOverlays animals={state.inventory.unlockedAnimals} />

          {/* Standalone mini-game anchors, layered above the district pins. */}
          {GAME_ANCHORS.map((anchor) => (
            <GameAnchorPin
              key={anchor.id}
              anchor={anchor}
              isHovered={anchorHover === anchor.id}
              onHover={setAnchorHover}
              onOpen={setActiveGame}
              onClosedNotice={showClosedNotice}
            />
          ))}

          <HotAirBalloon
            phase={balloon.phase}
            position={balloon.position}
            onOpen={() => setActivity('island')}
          />

          {/*
            THE CLOUD SHADOWS GO ABOVE THE BUILDINGS AND BELOW THE EVENTS. They are last but one in
            the stage so they paint over the roofs, while the balloon and the eagle below stay
            bright - weather should never dim a rare reward. The layer is `pointer-events-none`
            internally, so it cannot intercept a map tap.
          */}
          <CloudShadows />

          {/*
            THE EAGLE IS LAST SO IT FLIES OVER EVERYTHING, including the balloon. Both are rare
            events that can be up at once, and the eagle is the rarer of the two - so if they ever
            cross, the eagle passing in front is the correct reading of depth. Like the balloon,
            only the bird itself is clickable.
          */}
          <GoldenEagle phase={eagle.phase} flight={eagle.flight} onCatch={eagle.onCatch} />

          {/*
            THE CLOSED-STATION TOAST, ANCHORED TO THE BOTTOM OF THE STAGE.

            It lives INSIDE the stage so it is positioned against the map the child is looking at,
            rather than floating over the whole page - but it is absolutely positioned at the stage's
            bottom edge, clear of the pins, so it never covers the box that was just tapped.

            `key={closedNotice.nonce}` IS THE MECHANISM, NOT A DETAIL. Two taps on the same closed pin
            produce the same text, and without a changing key React would reuse the element and never
            replay the entrance animation - so the second tap would appear to do nothing. The nonce
            forces a remount, which restarts the animation.
          */}
          {closedNotice && (
            <div
              key={closedNotice.nonce}
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute inset-x-0 bottom-4 z-50 flex justify-center"
            >
              <p className="rounded-2xl bg-stone-900/90 px-4 py-2 text-sm font-black text-amber-50 shadow-xl ring-2 ring-amber-300/60 animate-[closedToast_2.6s_ease-in-out_both] motion-reduce:animate-none">
                🔒 {closedNotice.text}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-center text-xs font-bold text-amber-900/50">
        לחצו על בניין בעיירה כדי לחקור · {unlockedCount} מתוך {placed.length} אתרים פתוחים
      </p>

      {activity === 'island' && (
        <BonusIslandModal
          onClose={() => {
            setActivity(null);
            balloon.onDismiss();
          }}
        />
      )}

      {activity === 'stars' && (
        <ConstellationModal
          onClose={() => {
            setActivity(null);
            balloon.onDismiss();
          }}
        />
      )}

      <GameAnchorHost game={activeGame} onClose={() => setActiveGame(null)} />
    </section>
  );
}
