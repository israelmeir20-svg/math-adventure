/**
 * The tile drawer, for LOCKED tiles: it holds the unlock challenge and the solver it opens.
 *
 * ================================================================================================
 * WHY AN UNLOCKED TILE NEVER REACHES THE DRAWER BODY HERE
 * ================================================================================================
 *
 * Clicking an unlocked station used to land on this drawer and required a second tap on
 * "פתחו את כרטיס המשחק" before anything happened. That button's only job was to open the district,
 * and the district's own modal opens on `GameLaunchModal` - which is the screen that actually says
 * what the game is and which level to play. So the drawer was a step that conveyed nothing the next
 * screen did not, and it is now skipped: see `directDistrict` below.
 *
 * WHAT REMAINS IS THE LOCKED PATH, WHICH HAS NO EQUIVALENT ELSEWHERE. A locked tile's content is
 * `LockedPanel` - the cost in cookies, the problem to solve and the 50/50 lifeline - and the solver
 * that button opens. Deleting the drawer would leave locked buildings inert, so it stays for exactly
 * that case.
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import type { HexTile, MathProblem } from '../../types/game.types';
import { useGame } from '../../context/GameContext';
import { generateProblem } from '../../logic/mathEngine';
import { unlockCost } from './tileThemes';
import { tileThemeFor } from './resourceThemes';
import { LockedPanel } from './TileModalPanels';
import ProblemSolverModal from '../math/ProblemSolverModal';
import DistrictHost, { type DistrictCounters } from './DistrictHost';
import { districtFor, screenArt, teacherAvatar, type DistrictKind } from './districtRouting';

interface TileActionModalProps {
  tileId: string | null;
  onClose: () => void;
}

export default function TileActionModal({ tileId, onClose }: TileActionModalProps) {
  const { state, loadProblemForTile, unlockHexTile, useLifeline, addCookies } = useGame();
  const spendLifeline = useLifeline;
  const [activeProblem, setActiveProblem] = useState<MathProblem | null>(null);
  const [district, setDistrict] = useState<DistrictKind | null>(null);
  const [counters, setCounters] = useState<DistrictCounters>({});
  /**
   * The level to hand the district, when this drawer has one to force.
   *
   * IT IS ALWAYS NULL NOW. Nothing in this drawer picks a level - the launch card owns that choice and
   * reads the shared progression directly - so what remains is the channel for a caller that does know
   * better (a direct-entry district, a test). It is kept as state rather than deleted because
   * `DistrictHost` is given it, and a district that owns the decision needs somewhere to say so.
   */
  const [districtLevel, setDistrictLevel] = useState<number | null>(null);
  const stored = tileId ? state.tiles[tileId] : undefined;
  // Always read the live tile so a freshly generated problem is visible in the
  // same render pass (a stale copy would keep showing "no problem yet").
  const tile: HexTile | undefined =
    (stored && state.tiles[stored.id]) || stored;

  if (!tile) return null;

  const theme = tileThemeFor(tile);
  const meta = districtFor(tile.type);

  /**
   * The banner and avatar, resolved from the district's `artKey`.
   *
   * BOTH ARE OPTIONAL AND THE MARKUP GUARDS ON THEM. `screenArt` returns undefined when no such
   * file shipped, and a station with no art is a normal state (a `resource` tile has no dedicated
   * screen today) - so the drawer renders without a banner rather than showing a broken image.
   */
  const bannerArt = meta ? screenArt(meta.artKey) : undefined;
  const tamarAvatar = teacherAvatar();

  /**
   * ================================================================================================
   * UNLOCKED TILES OPEN THEIR GAME DIRECTLY; LOCKED ONES STILL GET THE DRAWER
   * ================================================================================================
   *
   * The drawer used to sit in front of EVERY unlocked station as a one-button screen whose only
   * content was "פתחו את כרטיס המשחק" - a tap that told the child nothing and then revealed the
   * launch card, which is itself the thing that shows the banner, the task, Tamar's tip and the
   * level chips. Two screens, one decision, and the intermediate one was pure friction.
   *
   * `directEntry` USED TO GATE THIS, AND THE GATE IS WHAT CHANGED. Only the farm and the street hub
   * set it, so every other district paid the extra tap. The flag now means nothing here - the
   * condition is simply "is it unlocked", because for an unlocked game tile the launch card is
   * strictly better than the drawer: the card has all of the drawer's copy plus the level selector,
   * and it is where the district modal was headed anyway.
   *
   * THE LOCKED BRANCH IS UNTOUCHED AND STILL NEEDS THE DRAWER. A locked tile has no game to open -
   * its content is the unlock challenge (`LockedPanel`: the cost, the problem, the 50/50 lifeline),
   * which lives nowhere else. Bypassing it would leave locked buildings unopenable, so this splits on
   * `isUnlocked` rather than removing the drawer outright.
   */
  const directDistrict = tile.isUnlocked && meta ? meta.kind : null;
  const activeDistrict = district ?? directDistrict;
  // A locally generated problem wins until the store catches up.
  const problem = activeProblem ?? tile.currentMathProblem;

  const bump = (counter: string) => {
    setCounters((current) => ({ ...current, [counter]: (current[counter] ?? 0) + 1 }));
  };

  /**
   * Opens the solver in ONE click, without waiting for a re-render.
   *
   * `dispatch` cannot update the store mid-event, so a component that reads
   * `tile.currentMathProblem` straight after dispatching still sees `null` and
   * the solver never opens. Generating the problem here and holding it in local
   * state makes the modal render immediately on this very pass.
   */
  const handleOpenSolver = () => {
    if (tile.currentMathProblem) {
      setActiveProblem(tile.currentMathProblem);
      return;
    }

    const fresh = generateProblem({
      type: 'multiplication',
      level: tile.level || 1,
      tracker: state.mistakes,
    });
    // Keep the store in sync so the retry path and the map badge see it too.
    loadProblemForTile(tile.id);
    setActiveProblem(fresh);
  };

  if (activeDistrict) {
    return (
      <DistrictHost
        kind={activeDistrict}
        tileLabel={theme.labelHebrew}
        /*
         * NO LEVEL IS FORCED FROM THE DRAWER ANY MORE, so this passes `undefined` and lets the
         * district's own launch card decide. `districtLevel` remains the channel for a district that
         * wants to hand one down itself; nothing in the drawer writes it now.
         */
        level={districtLevel ?? undefined}
        counters={counters}
        addCookies={addCookies}
        onBump={bump}
        onClose={() => {
          setDistrict(null);
          setDistrictLevel(null);
          // A direct-entry district has no drawer to fall back to.
          if (directDistrict) onClose();
        }}
      />
    );
  }

  if (problem) {
    return (
      <ProblemSolverModal
        problem={problem}
        tileId={tile.id}
        tileLabel={theme.labelHebrew}
        onClose={() => {
          setActiveProblem(null);
          onClose();
        }}
        onSolved={() => {
          unlockHexTile(tile.id);
          setActiveProblem(null);
          onClose();
        }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={theme.labelHebrew}
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="max-h-[90vh] w-full max-w-md animate-[rise_.2s_ease-out] overflow-y-auto rounded-t-3xl border-4 border-amber-800/40 bg-amber-50/95 p-4 shadow-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ---- Banner art, with the close button riding on its corner. ---- */}
        {bannerArt && (
          <div className="relative mb-4">
            <img
              src={bannerArt}
              alt=""
              aria-hidden
              draggable={false}
              className="aspect-video w-full rounded-2xl object-cover shadow-[inset_0_2px_10px_rgba(0,0,0,0.25)]"
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

        <header className="mb-3 flex items-start gap-3">
          <span
            aria-hidden
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-[0_4px_0_rgba(0,0,0,0.12)]"
          >
            {tile.isUnlocked ? theme.emoji : '🔒'}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-amber-900">{theme.labelHebrew}</h2>
            <p className="text-xs font-bold text-amber-900/60">
              {tile.isUnlocked
                ? 'בחרו רמה בכרטיס המשחק'
                : 'אריח נעול - צריך לפתור כדי לפתוח'}
            </p>
          </div>
          {/* A close button in the header too, for the no-banner case and for reach. */}
          {!bannerArt && (
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

        {/* ---- Teacher Tamar's tip for this station. ---- */}
        {meta && (
          <div className="mb-4 flex items-start gap-2.5">
            {tamarAvatar && (
              <img
                src={tamarAvatar}
                alt="המורה תמר"
                draggable={false}
                className="h-12 w-12 shrink-0 rounded-full border-2 border-amber-500 object-cover shadow-md"
              />
            )}
            <div className="rounded-2xl border border-amber-300 bg-amber-100/90 p-2.5 text-xs font-medium leading-relaxed text-amber-950">
              <p className="mb-0.5 font-bold text-amber-800">המורה תמר ממליצה:</p>
              <p>{meta.tipHebrew}</p>
            </div>
          </div>
        )}

        {/*
          THIS BRANCH IS NOW ALWAYS THE LOCKED ONE.

          An unlocked tile returns at the `activeDistrict` guard above, so reaching this point means
          the tile is locked and the content is the unlock challenge. The `tile.isUnlocked` ternary
          that used to be here became unreachable in one arm, and dead UI branches are how a screen
          quietly keeps rendering something nothing can produce - so it is gone.

          `LockedPanel` IS NOT OPTIONAL CHROME. It carries the cost, the problem text and the 50/50
          lifeline, and it is the ONLY surface in the app that resolves a locked tile. This is
          exactly why the drawer was kept rather than deleted outright.
        */}
        <LockedPanel
          cost={unlockCost(tile.level)}
          affordable={state.inventory.cookies >= unlockCost(tile.level)}
          problemText={tile.currentMathProblem?.questionTextHebrew ?? null}
          lifelines={state.inventory.lifelines.fiftyFifty}
          onSolve={handleOpenSolver}
          onUseLifeline={() => spendLifeline('fiftyFifty', tile.id)}
        />
      </div>
    </div>
  );
}
