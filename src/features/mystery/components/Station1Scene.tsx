/**
 * Station 1 - the crime-scene puzzle.
 *
 * ================================================================================================
 * THIS FILE IS A DISPATCHER, NOT A PUZZLE
 * ================================================================================================
 *
 * The case carries a `type`, and there are four genuinely different puzzles behind it. They share
 * nothing but the stage they draw on and the two callbacks they report through, so all this
 * component does is pick one, size it to the screen, and offer a way back to the start.
 *
 * IT DRAWS NO TITLE AND NO INSTRUCTION. Both used to live here as a banner above the puzzle, and
 * both moved to the one top bar in `DetectiveGame` - which is also where the case title already
 * was, so the station was the second place the child read the same sentence. What is left is the
 * puzzle, the reset, and nothing between them and the artwork.
 *
 * The four puzzles are deliberately NOT unified behind one interface. They do not take the same
 * inputs - the crest needs a grid of coordinates, the window needs a list of shards, the garden
 * needs a list of routes - and forcing them into a common shape would mean a props object full of
 * optional fields that each puzzle ignores. A switch over `config.type` is honest about the fact
 * that there are four separate things here.
 *
 * ================================================================================================
 * THE TWO CALLBACKS ARE NOT THE SAME EVENT
 * ================================================================================================
 *
 * `onComplete` means the puzzle was solved and the case may advance. `onError` means the child
 * tried and missed: it is a RECORD of a mistake, not a failure of the game, and it must not stop
 * the station from being attempted again. The error counter in the top bar is the only
 * consequence.
 *
 * ================================================================================================
 * RESET REMOUNTS RATHER THAN RESETTING
 * ================================================================================================
 *
 * Each puzzle keeps its own progress in its own state, and there is no interface for telling one
 * to start over. Rather than add a `resetSignal` prop that every puzzle has to honour - and get
 * right - the reset button bumps a counter used as the React `key`, which unmounts the puzzle and
 * mounts a fresh one. That is the one reset that cannot leave a puzzle half-cleared.
 *
 * The reset does NOT call `onError`. Starting again is not a mistake, and charging the child a
 * recorded error for wanting a clean slate would punish them for asking.
 */
import { useState } from 'react';
import type { Station1Config } from '../caseData';
import GardenPuzzle from './station1/GardenPuzzle';
import SymmetryPuzzle from './station1/SymmetryPuzzle';
import TrayPuzzle from './station1/TrayPuzzle';
import WindowPuzzle from './station1/WindowPuzzle';

interface Station1SceneProps {
  config: Station1Config;
  onComplete: () => void;
  onError: () => void;
}

export default function Station1Scene({ config, onComplete, onError }: Station1SceneProps) {
  /**
   * Bumped to force a remount. It is a `key` and nothing else - the value is never read, so there
   * is no way for it to fall out of step with the puzzle it is meant to be resetting.
   */
  const [resetNonce, setResetNonce] = useState(0);

  const puzzleProps = { config, onComplete, onError };

  return (
    /*
      NO CARD, NO FRAME, NO BANNER - the station is the puzzle and nothing else.

      This used to be a cream `rounded-3xl border-4` panel with a title, an instruction line and a
      reset button stacked above the artwork. Two thirds of that was duplication: the case title
      and the instruction now live in the one top bar the orchestrator draws, and repeating them
      here cost roughly a fifth of the screen to say the same thing a second time. On a 900px
      window that is 180px not spent looking at the puzzle the child is meant to be searching.

      `flex-1 min-h-0` hands the puzzle the full remainder of the game's column, which is what lets
      `PuzzleStage` size the photograph from the real available height.
    */
    <section
      dir="rtl"
      aria-label={config.title}
      className="flex w-full min-h-0 flex-1 flex-col items-center justify-center"
      data-testid="station1"
      data-puzzle={config.type}
    >
      {/*
        THE KEY CARRIES THE PUZZLE TYPE AS WELL AS THE NONCE. A case can only ever have one station
        1, but including the type means that if the case were ever swapped underneath this
        component the puzzle would remount rather than receive a config its state does not match.

        `relative` IS REQUIRED, NOT DECORATIVE: `PuzzleStage` positions its fixed-shape box with
        `absolute inset-0` against this element, so without a positioned parent here the box would
        resolve against the viewport instead and float over the top bar.
      */}
      <div
        key={`${config.type}-${resetNonce}`}
        className="relative min-h-0 w-full flex-1"
      >
        {config.type === 'symmetry' && <SymmetryPuzzle {...puzzleProps} />}
        {config.type === 'window' && <WindowPuzzle {...puzzleProps} />}
        {config.type === 'tray' && <TrayPuzzle {...puzzleProps} />}
        {config.type === 'garden' && <GardenPuzzle {...puzzleProps} />}
      </div>

      {/*
        THE RESET BUTTON SITS BELOW THE ART, NOT ABOVE IT, and it is visible from the first moment
        rather than revealed after a mistake. A child who wants to start over should not have to
        fail first to earn the button, and a control that appears mid-puzzle is a control they will
        not know to look for later. Keeping it under the stage means it never competes with the
        artwork for vertical space.
      */}
      <button
        type="button"
        onClick={() => setResetNonce((n) => n + 1)}
        className="mt-2 shrink-0 rounded-xl border-2 border-amber-900/25 bg-white/85 px-3 py-1.5 text-[11px] font-black text-amber-900/80 transition hover:bg-white active:translate-y-[2px]"
        data-testid="station1-reset"
      >
        ↺ התחלה מחדש
      </button>
    </section>
  );
}
