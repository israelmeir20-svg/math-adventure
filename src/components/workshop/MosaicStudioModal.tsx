/**
 * "סטודיו לפסיפס ותמונות מסתורין" - the workshop mystery-picture studio.
 *
 * Tiles hide a scene. Each tile carries its own equation, and the drawer at the
 * bottom offers four stones for the missing term. A correct stone flips that tile
 * to reveal its slice and moves the selection on, so the picture fills in without
 * the child hunting for where to go next.
 *
 * THREE STRIKES, AND THE BOARD GOES BACK. A wrong stone costs a heart; the third
 * one shakes the board, flips every revealed tile back, and restarts the SAME
 * puzzle with three fresh hearts. Two decisions in that sentence are load-bearing:
 *
 *   IT RESTARTS THE SAME PUZZLE, NOT A NEW ONE. Dealing a new scene would punish
 *   the mistake by destroying the progress the child can still SEE - the revealed
 *   slices are the whole motivation. Re-dealing would also mean the equations
 *   change, so a child who had worked out six answers loses six answers. The board
 *   they were solving stays the board they are solving; only the tiles close.
 *
 *   THE EQUATIONS DO NOT RESHUFFLE. `round` is memoised on the restart counter, so
 *   a reset rebuilds the same equations with their choices in the same order. The
 *   tiles' answers are therefore learnable across attempts, which is what turns a
 *   reset from a punishment into a second chance.
 *
 * A WRONG STONE MUST ONLY COST A HEART, NEVER SILENTLY DO NOTHING. The strike is
 * spent on the STONE, not on the tile: tapping a wrong stone three times on one
 * hard tile ends the attempt just as surely as three different mistakes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import {
  buildMysteryRound,
  tierFor,
} from './mysteryPictureData';
import { pickMosaicSource, useCustomImages } from './useCustomImages';
import { GALLERY, stepAfter } from './mysteryGallery';
import MysteryPictureGrid from './MysteryPictureGrid';
import EquationDrawer, { CompletionBanner, SolvedFlash } from './EquationDrawer';
import PictureStudioShell from './PictureStudioShell';
import ParentImagesModal from './ParentImagesModal';
import { MedalCounter } from '../../features/progression/ProgressionChrome';
import {
  isStationLevel,
  useStationProgress,
  type StationLevel,
} from '../../features/progression/useStationProgress';
/**
 * Workshop crafting reward, paid once per finished picture.
 *
 * A finished mosaic is a full stage (the child solves several equations to complete it),
 * so it takes the brief's "+15 for completing a stage" figure rather than a per-tile one.
 */
const PICTURE_REWARD = 15;

/** How long a freshly revealed tile's confirmation stays on screen. */
const FLASH_MS = 1400;

/** Hearts per attempt, per the brief. */
const MAX_STRIKES = 3;

/** The board shake plus the flip-back, before the same puzzle restarts. */
const RESET_MS = 900;

/** How long the "everything flipped back" toast stays up. */
const TOAST_MS = 2200;

/**
 * How long a COMPLETED picture stays on screen before the next one is dealt.
 *
 * ============================================================================
 * THE COMPLETION HOLD, AND WHY THE GAME IS BROKEN WITHOUT IT.
 * ============================================================================
 *
 * When the ninth tile flips, the child has just spent a whole board's worth of
 * equations assembling a picture, and the assembled picture IS the reward. The
 * reveal is the payoff; the picture is not merely the thing that was in the way.
 *
 * The version this replaces advanced the gallery cursor IN THE SAME TICK as the
 * final tile. Because the cursor is a dependency of the deal memo, that swapped
 * `imageUrl` immediately - so the board showed the finished `solved` array (all
 * nine tiles revealed) over the NEXT picture. The child's completed artwork was
 * never visible for a single frame, and the picture that replaced it appeared
 * already fully uncovered, which gave away the next puzzle's answer for free.
 *
 * So completion and advancement are now two separate events:
 *
 *   COMPLETION  freezes the board. The picture stays, fully revealed, the banner
 *               names it, and the confetti fires.
 *   ADVANCEMENT happens only when the child presses "שלב הבא", or when this hold
 *               elapses on its own. Both routes call the same `startNextPicture`,
 *               which advances the cursor and re-covers the board together.
 *
 * The hold is generous - long enough to actually look at the picture, short
 * enough that an idle child is not stuck. `holdLeft` drains from `HOLD_MS` and
 * drives a visible countdown ring on the advance button, so the wait is legible
 * rather than a mysterious pause.
 */
const HOLD_MS = 6000;

/** The visible countdown ring ticks at this interval, in ms. */
const HOLD_TICK_MS = 100;

interface MosaicStudioModalProps {
  tileLabel: string;
  tileLevel: number;
  onClose: () => void;
}

export default function MosaicStudioModal({
  tileLabel,
  tileLevel,
  onClose,
}: MosaicStudioModalProps) {
  const { addCookies } = useGame();
  const feedback = useAnswerFeedback();
  const custom = useCustomImages();
  const [showParent, setShowParent] = useState(false);

  /*
   * THE STATION'S SHARED PROGRESSION, AND THE ONLY SOURCE OF THE LEVEL.
   *
   * `tileLevel` USED TO DRIVE BOTH THE DIFFICULTY TIER AND THE STARTING PICTURE, and it still
   * does - it is the level the launch card was set to, threaded down from `DistrictHost`. What
   * changed is that the level is no longer the tile's own counter: it is one of the station's
   * three levels, and a COMPLETED PICTURE is what earns a gold medal at it.
   *
   * The station key is `craft`, the workshop district's own `stationKey`, so a child who opens
   * the studio from the map and one who opens it from a district card see the same ladder.
   */
  const { progress, recordGoldMedal } = useStationProgress('craft');
  const level = isStationLevel(tileLevel) ? tileLevel : 1;
  /** Gold medals banked at `level`, snapshotted when a picture is completed. */
  const [earnedMedals, setEarnedMedals] = useState(progress.medals[level]);

  /**
   * A completed picture is the station's gold run.
   *
   * WHY COMPLETION IS GOLD, RATHER THAN A SCORE THRESHOLD. This station has no score and no
   * clock: a picture is finished when every tile's equation has been solved, and the only
   * thing that can interrupt that is the three-strikes reset. So "finished the picture" is the
   * whole of the achievement, and pricing gold any lower would mean a medal for a board the
   * child did not solve.
   *
   * CALLED FROM THE COMPLETION BRANCH ONLY, which fires on the tile that finishes the board -
   * not from the advance, which would count the same picture again every time the hold elapsed.
   */
  const handlePictureComplete = useCallback(() => {
    setEarnedMedals(recordGoldMedal(level).newMedals);
  }, [level, recordGoldMedal]);

  // Remounting on this key is what gives a clean board on an explicit restart.
  const [roundKey, setRoundKey] = useState(0);

  /*
   * ===================================================================
   * THE ROTATION CURSOR - AND WHY IT LIVES UP HERE, NOT IN THE BOARD.
   * ===================================================================
   *
   * This is the fix for "the game is stuck on the same picture". The board below is
   * REMOUNTED on every restart (that is what `roundKey` does, so the tiles, the strikes
   * and the equations all reset cleanly). Any rotation state held inside the board would
   * therefore be destroyed by the very action that is supposed to advance the picture -
   * the restart would reset the counter to its initial value and re-deal the same image,
   * which is exactly the symptom that was reported.
   *
   * Holding the cursor here means it survives both the restart remount AND the modal
   * staying open, so every advance moves the picture on.
   *
   * THE STARTING STEP IS RANDOM ON MOUNT, SO A RE-ENTRY DOES NOT REPLAY THE SAME PICTURE.
   *
   * This used to be derived from the level: `Math.max(0, tileLevel - 1)`. The intent was reasonable -
   * "opening at level 3 should differ from opening at level 1" - but it only ever distinguished the
   * LEVELS, not the SESSIONS. A child who solved the level-2 picture, closed the studio and came back
   * was handed the identical level-2 picture again, because the same input produced the same starting
   * index every time. That reads as a stuck game, and it is the same complaint the gallery rewrite
   * this file already documents was meant to end.
   *
   * The pool is ~15 pictures, so a uniform draw makes an immediate repeat on re-entry a 1-in-15
   * coincidence rather than a certainty. `stepAfter` then guarantees every SUBSEQUENT picture differs
   * from the one on screen, so the random seed only decides the opening frame - after that the
   * anti-repeat rule takes over.
   *
   * THE DRAW IS BOUNDED SAFELY. `imageAtStep` normalises any step into range with a modulo, so a pool
   * that somehow changed between the draw and the read cannot index out of bounds.
   */
  /** Where in the gallery the board starts. Owned by the modal, not the board. */
  const [step, setStep] = useState(() => Math.floor(Math.random() * GALLERY.length));

  /**
   * Deals the NEXT picture: draw a new gallery cursor and close every tile.
   *
   * THE TWO HALVES BELONG TOGETHER AND MUST NOT BE SPLIT. Advancing the cursor
   * with the board still showing a full `solved` array is the "solved picture
   * vanishes / next picture starts already finished" defect; closing the tiles
   * without advancing would just replay the picture the child already solved.
   * `roundKey` remounts the board, so the fresh deal is generated against the new
   * cursor with a clean `solved: []` - 0 tiles revealed, every cover up.
   *
   * Order matters: the cursor is set BEFORE the remount so the new board's very
   * first render already sees the new step, rather than painting the old picture
   * for a frame and then swapping it.
   */
  const startNextPicture = useCallback(() => {
    setStep((current) => stepAfter(current));
    setRoundKey((key) => key + 1);
  }, []);

  /**
   * The ↺ button: deal a DIFFERENT picture from scratch.
   *
   * Same action as completing a level, and deliberately so - "give me a new
   * picture" and "I finished this one, on with the next" are the same request as
   * far as the board is concerned. It skips the reveal, which is the point of a
   * manual restart.
   */
  const restart = useCallback(() => {
    startNextPicture();
  }, [startNextPicture]);

  return (
    <>
      <PictureBoard
        key={roundKey}
        tileLabel={tileLabel}
        tileLevel={tileLevel}
        step={step}
        addCookies={addCookies}
        feedback={feedback}
        customCount={custom.images.length}
        level={level}
        earnedMedals={earnedMedals}
        onPictureComplete={handlePictureComplete}
        onRestart={restart}
        onNextPicture={startNextPicture}
        onOpenParent={() => setShowParent(true)}
        onClose={onClose}
      />
      {showParent && (
        <ParentImagesModal images={custom} onClose={() => setShowParent(false)} />
      )}
    </>
  );
}

interface PictureBoardProps {
  /**
   * Kept on the props so the modal's public signature is unchanged, but no longer
   * rendered: the header shows only the level, and the picture's name is withheld
   * until the reveal.
   */
  tileLabel: string;
  tileLevel: number;
  /** Which gallery picture this board is hiding. Owned by the modal, not the board. */
  step: number;
  addCookies: (amount: number) => void;
  feedback: ReturnType<typeof useAnswerFeedback>;
  /** Only used to re-deal when the parent adds or removes photos mid-session. */
  customCount: number;
  /** The station level this board is being played at, for the medal strip. */
  level: StationLevel;
  /** Gold medals banked at `level` when the picture was finished. */
  earnedMedals: number;
  /**
   * Fired ONCE, on the tile that completes the board.
   *
   * Separate from `onNextPicture` on purpose: completion is the achievement and advancement is
   * the housekeeping that follows it, and the two are deliberately decoupled (see the completion
   * hold note). Wiring the medal to the advance instead would award a gold every time the hold
   * elapsed on a finished board.
   */
  onPictureComplete: () => void;
  onRestart: () => void;
  /**
   * Deals the next picture and re-covers the board.
   *
   * Called on an EXPLICIT advance ("שלב הבא") and by the completion hold's timer.
   * It is deliberately NOT called when the last tile flips - that was the bug.
   */
  onNextPicture: () => void;
  onOpenParent: () => void;
  onClose: () => void;
}

function PictureBoard({
  tileLabel: _tileLabel,
  tileLevel,
  step,
  addCookies,
  feedback,
  customCount,
  level,
  earnedMedals,
  onPictureComplete,
  onRestart,
  onNextPicture,
  onOpenParent,
  onClose,
}: PictureBoardProps) {
  const tier = tierFor(tileLevel);
  const total = tier.cols * tier.rows;

  /**
   * `attempt` is bumped by the three-strikes reset.
   *
   * It is a dependency of the round memo, so a reset re-deals THE SAME TIER with
   * the same level - and because the scene is chosen by the same `pick` walk, a
   * reset keeps the child on a solvable board rather than reshuffling them into a
   * different puzzle. The parent-photo pool is read at deal time, so a photo added
   * mid-session appears on the next restart rather than yanking the current scene.
   */
  const [attempt, setAttempt] = useState(0);
  /**
   * The picture and its name are resolved TOGETHER, in one memo.
   *
   * `pickMosaicSource` returns the image and its own title as a pair, so the
   * banner physically cannot announce one picture while showing another - which
   * is what happened when the image and the title were drawn separately.
   *
   * `step` IS A DEPENDENCY, and it has to be: it is what makes the picture change when
   * the child asks for the next one. Without it the memo would keep returning the picture
   * it first computed and every advance would redraw the same image.
   *
   * NOTE THAT `step` CHANGES ONLY ON AN EXPLICIT ADVANCE. It is not touched when the
   * last tile flips, which is what keeps the completed picture on screen - see the
   * completion-hold note at the top of this file.
   */
  const deal = useMemo(() => {
    void attempt;
    void customCount;
    const round = buildMysteryRound(tier.level);
    const source = pickMosaicSource(round.scene, step);
    return { round, source };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, tier.level, step]);

  const [solved, setSolved] = useState<number[]>([]);
  const [active, setActive] = useState<number | null>(0);
  const [rejected, setRejected] = useState<number | null>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const [strikesLeft, setStrikesLeft] = useState(MAX_STRIKES);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState(false);

  const done = solved.length >= total;

  /**
   * Milliseconds left on the completion hold, or null when not holding.
   *
   * Holding the countdown in state (rather than just firing a timeout) is what
   * lets the shell draw a ring, so the child can SEE that the next picture is
   * coming and is not being rushed past the reveal.
   */
  const [holdLeft, setHoldLeft] = useState<number | null>(null);

  /**
   * Guards `onNextPicture` against a double advance.
   *
   * Both the timer and the button can fire, and a child mashing "שלב הבא" on the
   * last tick would otherwise deal two pictures - skipping one entirely. A ref
   * rather than state because the check must be synchronous: two clicks in the
   * same tick would both read a stale state value and both pass.
   */
  const advancing = useRef(false);

  useEffect(() => {
    if (!done) {
      setHoldLeft(null);
      return;
    }

    advancing.current = false;
    setHoldLeft(HOLD_MS);

    // Named `ticker`, NOT `step` - `step` is this component's gallery-cursor prop,
    // and shadowing it here would silently hide the cursor from any future edit to
    // this effect.
    const ticker = window.setInterval(() => {
      setHoldLeft((left) => {
        if (left === null) return null;
        const next = left - HOLD_TICK_MS;
        return next <= 0 ? 0 : next;
      });
    }, HOLD_TICK_MS);

    return () => window.clearInterval(ticker);
  }, [done]);

  /**
   * Fires once the hold runs out.
   *
   * Separate from the interval above so the interval stays a pure ticker - the
   * advance is a side effect that must happen exactly once, not on every tick
   * that happens to observe a zero.
   */
  useEffect(() => {
    if (holdLeft !== 0 || !done) return;
    if (advancing.current) return;
    advancing.current = true;
    onNextPicture();
  }, [holdLeft, done, onNextPicture]);

  const handleNextPicture = useCallback(() => {
    if (advancing.current) return;
    advancing.current = true;
    onNextPicture();
  }, [onNextPicture]);

  const equation = active === null ? null : (deal.round.equations[active] ?? null);
  const flashed = flash === null ? null : (deal.round.equations[flash] ?? null);

  /** Every timer this board owns, cleared together on unmount. */
  const timers = useRef<number[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );
  const after = useCallback((ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  }, []);

  /** Moves the selection on to the next tile still hiding its slice. */
  const advanceFrom = useCallback(
    (justSolved: number, current: number[]) => {
      for (let step = 1; step <= total; step += 1) {
        const candidate = (justSolved + step) % total;
        if (!current.includes(candidate)) {
          setActive(candidate);
          return;
        }
      }
      setActive(null);
    },
    [total],
  );

  /**
   * The three-strikes reset.
   *
   * The tiles close by CLEARING `solved`, which is the same data the flip reads -
   * so the 500ms 3D rotation plays in reverse for every revealed tile at once,
   * rather than the board being torn down and rebuilt with a snap.
   */
  const resetBoard = useCallback(() => {
    setResetting(true);
    setToast(true);
    after(RESET_MS, () => {
      setSolved([]);
      setActive(0);
      setStrikesLeft(MAX_STRIKES);
      setRejected(null);
      setFlash(null);
      setResetting(false);
      // A NEW ATTEMPT: same tier, same level, freshly dealt equations.
      setAttempt((value) => value + 1);
    });
    after(TOAST_MS, () => setToast(false));
  }, [after]);

  const pick = (value: number) => {
    if (resetting || done || active === null || !equation) return;

    if (value !== equation.answer) {
      setRejected(value);
      feedback(false);
      after(450, () => setRejected(null));

      const left = strikesLeft - 1;
      setStrikesLeft(left);
      if (left <= 0) resetBoard();
      return;
    }

    const next = [...solved, active];
    setSolved(next);
    setFlash(active);
    after(FLASH_MS, () => setFlash(null));

    if (next.length >= total) {
      setActive(null);
      addCookies(PICTURE_REWARD);
      feedback.celebrate();
      /*
       * THE GOLD MEDAL IS RECORDED HERE, ON THE COMPLETION ITSELF.
       *
       * This is the one branch that fires when the board is finished, so the award happens once
       * per picture - the advance below it (the hold's timer, or "שלב הבא") runs afterwards and
       * may run on a later tick, and hooking the medal to that would re-award it.
       */
      onPictureComplete();
      /*
       * THE BOARD IS NOW FROZEN, AND NOTHING ELSE HAPPENS HERE.
       *
       * The picture advances from the completion hold's effect above, or from the
       * child pressing "שלב הבא" - never from this branch. Advancing here is what
       * made the finished artwork invisible: the cursor is a dependency of the
       * `deal` memo, so calling it in this tick swapped the picture in the same
       * render that revealed the last tile. The child never saw the assembled
       * picture, and the replacement board arrived with all nine tiles already
       * open, spoiling the next puzzle.
       *
       * So this is deliberately the END of the turn. The reward is paid, the
       * confetti fires, `done` is true, and the board sits still until something
       * explicitly asks for the next picture.
       */
    } else {
      feedback(true);
      advanceFrom(active, next);
    }
  };

  return (
    <PictureStudioShell
      level={tier.level}
      solvedCount={solved.length}
      total={total}
      strikesLeft={strikesLeft}
      maxStrikes={MAX_STRIKES}
      holdFraction={holdLeft === null ? null : holdLeft / HOLD_MS}
      onRestart={onRestart}
      onOpenParent={onOpenParent}
      onClose={onClose}
    >
      <MysteryPictureGrid
        imageUrl={deal.source.imageUrl}
        cols={tier.cols}
        rows={tier.rows}
        solved={solved}
        active={active}
        rejected={rejected}
        resetting={resetting}
        onSelect={setActive}
      />

      {toast && (
        <p
          role="status"
          className="rounded-2xl bg-rose-500/20 px-3 py-2 text-center text-sm font-black text-rose-100 motion-safe:animate-[hopSmall_.4s_ease-out]"
        >
          אופס! כל החלקים התהפכו בחזרה…
        </p>
      )}

      {/*
        THE VICTORY PANEL. It names the picture - and it names THE picture on
        screen, because the title travels with the image - and it offers the two
        ways forward: wait for the hold, or go now.
      */}
      {/* The station ladder, beside the reveal: the same 3-medal counter the level picker
          reads, so a finished picture visibly moves the child toward the next level. */}
      {done && <MedalCounter earned={earnedMedals} level={level} tone="dark" />}

      {done && (
        <FinalReveal
          title={deal.source.title}
          reward={PICTURE_REWARD}
          holdFraction={holdLeft === null ? null : holdLeft / HOLD_MS}
          onNext={handleNextPicture}
        />
      )}

      {!done && !toast && (
        flashed ? (
          <SolvedFlash equation={flashed} />
        ) : (
          <EquationDrawer
            equation={equation}
            rejected={rejected}
            disabled={done || resetting}
            onPick={pick}
          />
        )
      )}
    </PictureStudioShell>
  );
}

/**
 * The panel shown over a completed picture.
 *
 * THREE THINGS, IN THIS ORDER OF IMPORTANCE:
 *
 *   1. The picture itself is already on screen and must stay unobstructed. So this
 *      sits BELOW the board in the shell's column rather than covering it - the
 *      whole point of the hold is that the child can look at what they assembled,
 *      and an overlay would have replaced one obstruction with another.
 *
 *   2. The name of the picture, carried with the image so the two cannot disagree.
 *
 *   3. A way forward that does not require waiting: "שלב הבא". The countdown ring
 *      shows the automatic advance is coming, so the button is an accelerator
 *      rather than the only exit.
 *
 * The button is labelled for what actually happens - the next PICTURE - rather
 * than "next level". The board's tier ladder is driven by the station's level, not
 * by this cursor, so promising a level would be a lie the child could catch.
 */
function FinalReveal({
  title,
  reward,
  holdFraction,
  onNext,
}: {
  title: string;
  reward: number;
  /** 1 at the start of the hold, 0 when it expires. Null when not holding. */
  holdFraction: number | null;
  onNext: () => void;
}) {
  /* The ring drains as the hold elapses, so the wait is legible. */
  const remaining = holdFraction === null ? 0 : Math.max(0, Math.min(1, holdFraction));
  const circumference = 2 * Math.PI * 9;

  return (
    <div className="flex flex-col gap-3">
      <CompletionBanner reward={reward} title={title} />

      <button
        type="button"
        onClick={onNext}
        className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 px-4 py-3 text-base font-black text-white shadow-[0_5px_0_#065f46] transition hover:scale-[1.02] active:translate-y-[4px] active:shadow-none"
      >
        {/*
          The countdown ring. `motion-safe` is deliberately NOT used to gate the
          ring itself - it conveys when the next picture arrives, which is
          information rather than decoration, so it stays. It is a transform-free
          stroke animation, so it is safe for a motion-sensitive child.
        */}
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - remaining)}
            transform="rotate(-90 12 12)"
          />
        </svg>
        שלב הבא 🖼️
      </button>
    </div>
  );
}
