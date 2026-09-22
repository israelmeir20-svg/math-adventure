/**
 * The Cookie Bakery district: illustrated kitchen interior with two tabs - the
 * 30-second multiplication sprint on the counter, and the chef's recipe memory game.
 *
 * THE STAT ROW IS GONE. It held "הזמנות שהושלמו", "בונוס להזמנה" and "רמת
 * המאפייה" in three backdrop-blurred cards. The bonus figure is a constant, so
 * the card never changed; the other two are now in the game's own header, where
 * "רמה 1: שוליית המאפייה | 🥇 1/3" says more than "רמת המאפייה: 1" ever did. That
 * removes a whole row of chrome from in front of the illustration.
 *
 * WHY THE SHELL IS KEPT HERE. Unlike the bridge, the bakery's interior is a
 * backdrop rather than the subject - the tray is the subject - so the wooden
 * title sign and the frosted panel are doing useful work, giving a bright
 * metallic tray something calm to sit on. The panel is left deliberately
 * translucent so the painting still shows through it.
 *
 * WHY THE RECIPE MOVED IN HERE. The chef's recipe used to hang off its own
 * "דוכן השוק" pin on the road outside, which put a kitchen game on a market stall
 * and added a second floating pin to a stretch of map that already had one. A recipe
 * belongs to a bakery, so it is a tab: one pin fewer on the map, and the two
 * food-themed games discovered together rather than in two unrelated places.
 *
 * `onComplete` KEEPS ITS OLD MEANING AND GUESS. It used to fire per solved
   * round, and it still fires once per finished round - a 30-second round instead
 * of a single question. `DistrictHost` counts the call as one completed "order"
 * and adds a cookie bonus, which reads correctly for a finished sprint. What it
 * no longer does is pay the bakery's own reward: the sprint pays per tray and
 * per round itself.
 */
import { useCallback, useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import type { FarmMedal } from '../farm/farmTimerData';
import BakeryGame from './BakeryGame';
import RecipeGame from '../farm/recipe/RecipeGame';
import DistrictInteriorShell, { InteriorPanel } from '../common/DistrictInteriorShell';
import GameLaunchModal from '../kingdom/GameLaunchModal';
import type { StationLevel } from '../../features/progression/useStationProgress';
import bakeryInterior from '../../assets/interiors/bakery-interior.jpg';

interface BakeryModalProps {
  /** Title of the district tile that was opened. */
  tileLabel: string;
  /** Current level of the bakery tile. */
  tileLevel: number;
  ordersCompleted: number;
  onOrderComplete: () => void;
  onClose: () => void;
}

/** Which of the bakery's two games is showing. */
type BakeryTab = 'bake' | 'recipe';

export default function BakeryModal({ tileLabel, onOrderComplete, onClose }: BakeryModalProps) {
  const { addCookies } = useGame();
  const feedback = useAnswerFeedback();
  const [tab, setTab] = useState<BakeryTab>('bake');
  /**
   * The level the bake game was started at, or null while its launch card is showing.
   *
   * THE BAKERY IS THE ONE DISTRICT WITH TWO GAMES UNDER ONE ROOF, so the card gates only the bake
   * tab. The recipe is a guest with its own medal system and no district progress to advance (see
   * `handleRecipeReward` below), so sending it through a level picker built for the bake game's
   * ladder would offer it three difficulties it cannot honour.
   */
  const [bakeLevel, setBakeLevel] = useState<StationLevel | null>(null);

  /*
   * Esc closes, matching every other overlay in the app.
   *
   * THIS MODAL OWNS ESC ITSELF, because the recipe tab used to be hosted by
   * `ArcadeGameModal`, which installed this listener for it. Now that the recipe is
   * rendered inline, nothing else on this path registers the handler - so without this
   * a keyboard user could enter the bakery and have no way out.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  /*
   * The recipe tab's reward path, lifted from the shell it used to live in.
   *
   * The bakery's own game is paid through `onOrderComplete`, which routes to
   * `DistrictHost` and the tile's progress. The recipe has no district progress to
   * advance - it is a guest here - so it pays its medal's cookies directly, exactly as
   * `ArcadeGameModal` did when the recipe had a map pin of its own.
   */
  const handleRecipeReward = useCallback(
    (medal: FarmMedal) => {
      addCookies(medal.cookies);
      if (medal.id === 'gold') feedback.celebrate();
      else feedback(true);
    },
    [addCookies, feedback],
  );

  /*
   * ================================================================================================
   * THE LAUNCH CARD IS HOISTED OUT OF THE PANEL, BUT THE SHELL STAYS - AND THE DIFFERENCE IS THE TABS
   * ================================================================================================
   *
   * The pizza and the trucks return the card INSTEAD of the shell, because their shell holds nothing
   * the card needs. The bakery cannot do that: its shell owns the tab strip, and the recipe tab is a
   * second game the child must still be able to reach while the bake card is up. Returning the card
   * early would trap them in a card with no visible way to the recipe.
   *
   * SO THE CARD IS HOISTED ABOVE THE SHELL INSTEAD, as a sibling that the strip's own z-order cannot
   * interfere with. `GameLaunchModal` is `fixed inset-0`, so it covers the room regardless of where it
   * sits in the tree - the nesting was only ever a problem because it was laid out INSIDE the shell's
   * `overflow-hidden` panel, which clipped it. Rendering it here as a child of the fragment means it
   * is positioned against the viewport, so its content is measured against the real screen and the green
   * button cannot be cut off.
   *
   * THE ROOM IS STILL MOUNTED BEHIND IT, which is what keeps the tab strip alive. It is visible only as
   * the dimmed backdrop under the card, and becomes the stage the moment a level is chosen.
   */
  return (
    <>
      {/*
        THE CARD BELONGS TO THE BAKE TAB, NOT TO THE MODAL.
        
        GATING THIS ON `bakeLevel` ALONE WAS WRONG, and the bug was reachable in two taps: with the card
        up, the tab strip underneath is still live, so a child could switch to "מתכון השף" and land in
        the recipe - with a card still covering the screen whose green button started the COOKIE game,
        not the recipe they had just chosen. Two games, one button, and the label named the wrong one.
        
        `tab === 'bake'` is what scopes the card to the game it actually launches. Switching to the
        recipe now dismisses it (the condition goes false and the card unmounts), and switching back
        re-shows it still asking for a level, which is the correct state because no bake level has been
        chosen yet.
        
        THE CARD STILL COVERS THE TAB STRIP, which is intended - the child picks a level first, and the
        strip is visible as the dimmed backdrop if they want to leave. What matters is that leaving is a
        real option rather than a way to get stranded in the wrong game.
      */}
      {tab === 'bake' && bakeLevel === null && (
        <GameLaunchModal meta="cookieBakery" onStart={setBakeLevel} onClose={onClose} />
      )}

      <DistrictInteriorShell
        bgImage={bakeryInterior}
        title={tileLabel}
        icon="🍪"
        onClose={onClose}
      >
        <div className="flex h-full min-h-0 flex-col gap-2">
        {/*
          THE TAB SWITCH. Two chips rather than a menu: there are exactly two games, both
          fit on one line, and a disclosure menu for a two-item choice is more taps for
          less clarity. The active chip is filled and the inactive one is a quiet outline,
          so which game is open is readable at a glance.
        */}
        <div
          role="tablist"
          aria-label="משחקי המאפייה"
          className="flex shrink-0 items-center justify-center gap-2"
        >
          {(
            [
              { id: 'bake', label: '🍪 אפיית עוגיות' },
              { id: 'recipe', label: '📜 מתכון השף' },
            ] as const
          ).map((entry) => {
            const active = tab === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(entry.id)}
                className={`rounded-2xl px-4 py-1.5 text-sm font-black transition active:scale-95 ${
                  active
                    ? 'border-2 border-amber-600 bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 shadow-[0_3px_0_#78350f]'
                    : 'border-2 border-amber-200/40 bg-amber-950/40 text-amber-100 hover:bg-amber-900/50'
                }`}
              >
                {entry.label}
              </button>
            );
          })}
        </div>

        <InteriorPanel className="min-h-0 flex-1">
          {/*
            ONLY THE ACTIVE GAME IS MOUNTED. Both of these run their own 30-second clock
            from mount, so keeping the hidden tab alive would have it ticking away - and
            its results card would fire and award a medal the child never played for.
            Unmounting on switch means each tab starts fresh, which is also what the
            recipe's own "replay" flow expects.
          */}
          {tab === 'bake' ? (
            /*
              NO LAUNCH CARD HERE ANY MORE - it is a sibling of the shell now, so this panel only ever
              holds the game. While the card is up this branch is behind the card's backdrop, and the
              game is deliberately not mounted, so the bake clock cannot start before play is pressed.
            */
            bakeLevel === null ? null : (
              <BakeryGame level={bakeLevel} onComplete={onOrderComplete} onClose={onClose} />
            )
          ) : (
            <RecipeGame
              onReward={handleRecipeReward}
              titleLine="מאפייה · מתכון השף"
              onClose={onClose}
            />
          )}
        </InteriorPanel>
        </div>
      </DistrictInteriorShell>
    </>
  );
}
