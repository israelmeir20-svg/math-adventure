/**
 * "גשר השומר המבולבל" - the bridge guard's escape-room riddle dialogue.
 *
 * THE SCENERY IS THE SCREEN. This district used to be a stack of opaque panels -
 * a white lock tray, an indigo problem card, a speech bubble - which papered over
 * the interior illustration it was supposed to be set in. Nothing here is a panel
 * any more: the painting fills the frame, the guard stands in its bottom-left
 * corner, and the game is a single parchment the guard is talking from. The
 * layout is one absolutely-positioned composition rather than a flow of cards,
 * because the moment it becomes a flow it starts reserving rectangles of its own.
 *
 * THE GUARD LIES ON TOP OF THE ARTWORK, NOT IN A BOX. The sprite sits directly on
 * the background with a drop shadow and no plate behind it, so he reads as
 * standing IN the scene; the parchment offset beside him is deliberately narrow
 * enough that his face and the lock banner are never covered.
 *
 * THREE RIDDLES, THREE LOCKS, NO RESET. A wrong answer costs nothing but a line of
 * the guard's teasing and a "try again" - the opened locks stay open and the same
 * riddle waits behind the button. The riddle set is drawn fresh on every mount, so
 * a replay is a different three questions rather than the same three again.
 */
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import { shuffle } from '../../logic/random';
import { BRIDGE_RIDDLES, type BridgeRiddle } from '../../data/bridgeRiddles';
import {
  useStationProgress,
  type StationLevel,
} from '../../features/progression/useStationProgress';
import {
  LevelCompleteCard,
  MedalCounter,
} from '../../features/progression/ProgressionChrome';
import confusedGuard from '../../assets/sprites/confused_guard.webp';
import happyGuard from '../../assets/sprites/happy_guard.webp';
import sadGuard from '../../assets/sprites/sad_guard.webp';

/**
 * The key this game's progression is stored under.
 *
 * `locks`, NOT `bridge` - it matches the bridge's `GAME_META` entry, which is what its launch card
 * and its map tile both read. See `DistrictMeta.stationKey` for why the two names differ.
 */
const STATION_KEY = 'locks';

/**
 * How many riddles a level asks.
 *
 * HARDER LEVELS ASK MORE, which is the only lever this game has that does not change what it is.
 * The riddles are a fixed authored pool with no difficulty field, so reordering or filtering them
 * would be inventing a difficulty scale the content does not carry - whereas a longer crossing is a
 * real step up (more chances to miss, a longer run between celebrations) and needs no new content.
 */
const RIDDLES_BY_LEVEL: Record<StationLevel, number> = { 1: 3, 2: 4, 3: 5 };

/** The guard's line once the crossing is done. */
const VICTORY_LINE = 'כל הכבוד! הצלחת לפענח את כל החידות. השער נפתח לרווחה!';

/**
 * How long the correct-answer celebration runs before the next riddle is dealt.
 *
 * RAISED FROM 400 TO THE HAPPY HOLD. The celebration is a full hop animation the child is
 * meant to READ - the point of the tier is that getting one right feels like something - and
 * 400ms cut it off mid-air. 1500ms matches the victory hold below, so a right answer and a
 * completed crossing celebrate for the same beat and the pacing is uniform.
 */
const ADVANCE_AFTER_MS = 1500;
const ADVANCE_SETTLE_MS = 260;

/** How long the guard's confused wobble runs before he settles back to breathing. */
const WOBBLE_MS = 2000;

interface BridgeGameProps {
  /** Called once all the locks are open, just before the modal closes. */
  onCrossed: () => void;
  /** Closes the district. Owned by the modal, which also holds the close button. */
  onClose: () => void;
  /** The level chosen on the launch card. */
  level?: StationLevel;
}

const DEFAULT_LEVEL: StationLevel = 1;

export default function BridgeGame({ onCrossed, onClose, level = DEFAULT_LEVEL }: BridgeGameProps) {
  const feedback = useAnswerFeedback();
  const { progress, recordGoldMedal } = useStationProgress(STATION_KEY);
  /** How many riddles this crossing asks - see `RIDDLES_BY_LEVEL`. */
  const riddleCount = RIDDLES_BY_LEVEL[level];
  // Drawn once per mount: the shuffle must not re-run on every render, or the
  // riddle under the child's finger would change mid-read.
  const [riddles, setRiddles] = useState<BridgeRiddle[]>(() =>
    shuffle(BRIDGE_RIDDLES).slice(0, riddleCount),
  );

  const [stage, setStage] = useState(0);
  const [solved, setSolved] = useState(false);
  /**
   * What the medal did at the end of this crossing.
   *
   * CAPTURED RATHER THAN READ LATER, because the guard's victory line is shown while the closing
   * hand-off runs and the live record would already have moved on.
   */
  const [outcome, setOutcome] = useState<{ unlockedNext: boolean; completedAll: boolean } | null>(
    null,
  );
  /** The medals earned at the level being played. */
  const earnedMedals = progress.medals[level];
  /** Set while the guard is teasing a wrong answer; the options step aside. */
  const [wrong, setWrong] = useState<number | null>(null);
  /**
   * True only for the duration of the confused wobble.
   *
   * SEPARATE FROM `wrong` ON PURPOSE. `wrong` stays set until the child taps "נסה שוב",
   * because the guard's teasing line has to remain on screen while they re-read the
   * riddle - but the wobble is an infinite animation, so leaving it keyed to `wrong`
   * would have him shaking his head for the entire time they are thinking. This flag
   * carries the movement, then drops so he settles back into his idle breath while the
   * line stays up.
   */
  const [wobbling, setWobbling] = useState(false);
  /**
   * Which sprite the guard is wearing.
   *
   * THIS REPLACES DERIVING THE FACE FROM `solved`/`wrong`, AND THE REASON IS TIMING. The
   * old derivation could only ever show `happy` once all three riddles were done, because
   * `solved` is the end-of-crossing flag - so a child who got riddle one right saw no
   * celebration at all. The mood has to be set on EVERY correct answer and then cleared on
   * its own schedule, which needs state rather than a derivation.
   *
   * `thinking` is the resting face, so the default is correct before the first tap and
   * after every reset - there is no fourth "neutral" value to fall back to.
   */
  const [guardMood, setGuardMood] = useState<'thinking' | 'happy' | 'sad'>('thinking');
  /** Just-opened lock, kept for the animation frame that gives it its glow. */
  const [recentlyOpened, setRecentlyOpened] = useState<number | null>(null);

  const riddle = riddles[stage];
  const timers = useRef<number[]>([]);

  // Every timed hand-off is registered so unmounting mid-celebration cannot fire
  // a state update into a component that is already gone.
  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );
  const after = (ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  };

  const answer = (optionIndex: number) => {
    if (!riddle || solved || wrong !== null) return;

    if (optionIndex !== riddle.correctIndex) {
      // Zero-frustration: keep every opened lock, keep the riddle, just tease.
      setWrong(optionIndex);
      setWobbling(true);
      setGuardMood('sad');
      // The shake ends on its own; the teasing line and the sad face do not.
      //
      // NO TIMER RETURNS HIM TO `thinking`. An earlier revision drifted him back after
      // `SAD_HOLD_MS`, which meant a child who took longer than two seconds to re-read the
      // riddle was being smiled at by the time they tapped - the reaction had already
      // evaporated, and the tap that earned it looked like it had been forgotten. The sad
      // face is instead tied to the one thing that actually ends the failure state: the
      // "נסה שוב" button, via `retry()`. While the tease screen is up, he stays sad.
      after(WOBBLE_MS, () => setWobbling(false));
      feedback(false);
      return;
    }

    // Correct - this lock opens for good.
    const opened = stage;
    setRecentlyOpened(opened);
    setGuardMood('happy');
    feedback(true);

    if (opened + 1 >= riddles.length) {
      setStage(riddles.length);
      setSolved(true);
      feedback.celebrate();
      /*
       * ONE GOLD MEDAL PER CROSSING - a crossing being the level's own unit of work, like a board
       * in the hopscotch game. Three crossings clear the level.
       *
       * THE AUTO-CLOSE IS GONE, AND IT HAD TO BE. The old flow fired `onCrossed` and `onClose` after
       * a 1.5s hold, which meant the district shut itself the instant the child finished - leaving
       * nowhere for the promotion to be announced and no way to play again. The card now owns the
       * ending, and `onCrossed` (which pays the district's own counter) is called only when the
       * child leaves.
       */
      setOutcome(recordGoldMedal(level));
      return;
    }

    // The riddle swaps only after the hold, so the hop has the frame to itself; the mood
    // is reset in the same beat as the new riddle arriving, never before it.
    after(ADVANCE_SETTLE_MS, () => setStage(opened + 1));
    after(ADVANCE_SETTLE_MS + ADVANCE_AFTER_MS, () => {
      setRecentlyOpened(null);
      setGuardMood('thinking');
    });
  };

  const retry = () => {
    setWrong(null);
    setWobbling(false);
    // THE ONLY THING THAT CLEARS THE SAD FACE. No timer competes with it, so the guard is
    // sad for exactly as long as the tease screen is up - that is, exactly as long as the
    // child can still see the answer they got wrong.
    setGuardMood('thinking');
    timers.current.forEach((id) => window.clearTimeout(id));
  };

  /**
   * Starts the crossing over, at the same level.
   *
   * A FRESH DRAW, BECAUSE THE RIDDLE SET IS STATE AND NOT DERIVABLE. `riddles` was seeded once per
   * mount specifically so the shuffle could not re-run mid-read; replaying therefore has to replace
   * it explicitly, or "go again" would hand the child the same questions in the same order and read
   * as a broken button.
   */
  const replay = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    setRiddles(shuffle(BRIDGE_RIDDLES).slice(0, riddleCount));
    setStage(0);
    setSolved(false);
    setWrong(null);
    setWobbling(false);
    setGuardMood('thinking');
    setRecentlyOpened(null);
    setOutcome(null);
  };

  /** Leaves the district, paying the crossing in before the modal goes away. */
  const leave = () => {
    onCrossed();
    onClose();
  };

  /** The guard's current line: teasing, victory, or the riddle's own question. */
  const line = solved ? VICTORY_LINE : wrong !== null ? riddle?.explanation ?? '' : riddle?.question ?? '';
  const speakingTease = !solved && wrong !== null;

  /*
   * WHICH SPRITE THE GUARD IS WEARING. One ternary over the mood state, in the caller's
   * order, so the mapping is readable at a glance and there is exactly one place that
   * decides the face.
   *
   * NOT DERIVED FROM `solved`, WHICH WAS THE BUG. `solved` is the end-of-crossing flag, so
   * keying on it meant a child only ever saw the happy sprite after the third riddle - every
   * earlier correct answer looked identical to a wrong one. The mood is set at the moment of
   * the answer instead, which is what gives each tap its own reaction.
   */
  const guardSprite =
    guardMood === 'happy' ? happyGuard : guardMood === 'sad' ? sadGuard : confusedGuard;

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden">
      {/*
        THE GUARD, STANDING ON THE DIRT PATH BY THE GATE.

        He used to sit further left and higher up the frame, which left his feet
        floating somewhere over the paving slab rather than on it. He is now anchored
        to `bottom-2`/`md:bottom-4` and shifted inward from the frame edge, so his boots
        land on the drawn path and he reads as standing AT the gate he is guarding
        rather than beside the bridge in general.

        THREE MOODS, EXACTLY ONE APPLIED AT A TIME - the idle breath, the victory hop,
        and the confused wobble. They are chosen here rather than layered as classes
        because they are mutually exclusive states: two `animation` declarations on one
        element would silently resolve to whichever the cascade happened to keep, so the
        wrong-answer wobble could be swallowed by the idle breathe.

        THE CHEER IS KEYED TO THE MOOD, NOT TO `solved`. It used to fire only on the final
        riddle, because `solved` is the crossing-complete flag - so the hop was reserved for
        the end of the game and every intermediate correct answer got the idle breath. Now
        each right answer gets its own hop. React re-runs the animation because the class is
        swapped `guardBreathe -> guardCheer`, and the mood is reset to `thinking` when the
        next riddle is dealt, which puts the breathe back for the next question.

        `origin-bottom` IS APPLIED TO ALL THREE MOODS, NOT JUST THE WOBBLE. The idle breath
        scales him from his feet and the wobble pivots on them, so both need the transform
        origin at the bottom edge or they would swing and grow from the middle of his chest.
        Hoisting it onto the element - rather than repeating it in each branch - means a
        fourth mood cannot be added later without it.

        HE IS SIZED TO THE SCENE, NOT TO A GUESS. `w-40/48/56` was 160-224px - against a
        frame that is at least 420px tall and typically far wider, that read as a figurine
        beside the sign rather than a character. The width is now a viewport-relative value
        with the same three breakpoints, and `maxHeight` still caps the OPPOSITE axis so he
        cannot grow past the parchment on a short, wide window. Both bounds are needed: a
        width alone overflows vertically on a landscape phone, and a height alone leaves him
        narrow on a tall one.

        HE IS ALLOWED TO CROSS THE PARCHMENT'S LEFT EDGE, AND HE DOES SO DELIBERATELY. The
        dialogue offsets in the block below are set to leave him a consistent 2-5rem of
        overlap at every breakpoint, so the composition reads as a character standing in
        front of the scene rather than a sprite boxed into a column. That is safe because he
        is `z-10` and the parchment is `z-20`: the panel wins the overlap, and only the part
        of him beside it is covered, never his face.

        HIS HEIGHT IS CAPPED BY THE FRAME, NOT BY THE PANEL. These sprites are square, so
        width and height move together - which means a desktop width of 31rem would also be a
        ~496px height against a container that is only `min-h-[420px]`. The `maxHeight` below
        is what stops that: it is the real ceiling on how large he can get at any viewport
        where the frame is short, and on a typical desktop window the effective size is set
        by `60vh` rather than by the width class. Raising the width alone would therefore do
        nothing visible on a short window.
      */}
      <img
        src={guardSprite}
        alt="השומר המבולבל"
        className={`absolute bottom-2 left-6 z-10 h-auto w-[min(75vw,20rem)] origin-bottom drop-shadow-2xl motion-reduce:transition-none sm:w-[min(58vw,26rem)] md:bottom-4 md:left-10 md:w-[min(44vw,31rem)] ${
          guardMood === 'happy'
            ? 'motion-safe:animate-[guardCheer_.7s_cubic-bezier(.34,1.56,.64,1)_forwards]'
            : wobbling
              ? 'motion-safe:animate-[guardWobble_2s_ease-in-out_infinite]'
              : 'motion-safe:animate-[guardBreathe_2.5s_ease-in-out_infinite]'
        }`}
        style={{ maxHeight: 'min(75vw, 78vh)' }}
      />

      {/* The dialogue: a parchment the guard is speaking from, offset to his
          right. The top offset clears the banner, the left offset clears the
          guard, and `max-h` with `overflow-y-auto` is the escape valve for a
          narrow phone frame where a long riddle would otherwise run off the
          bottom of the scene.

          THE LEFT OFFSET IS THE GUARD'S SIZE BUDGET, SO IT PUSHES RIGHT AS HE GROWS.
          These are the only two numbers in the composition that compete for the same
          horizontal band: the guard is anchored at the frame's left edge and the parchment
          must start clear of him. Earlier offsets - 17/20/23rem - were sized for a 160-224px
          guard, and once he was enlarged they left him no room to grow without his shoulder
          sliding under the riddle text.

          The offsets below are chosen so the gap between them and the guard's width is
          roughly consistent: 18rem/22rem/26rem against widths capped at 20rem/26rem/31rem,
          i.e. he crosses the panel edge by 2-5rem at every breakpoint. THAT OVERLAP IS
          INTENTIONAL AND SMALL - he is `z-10` under a `z-20` panel, so the panel keeps the
          last word and only the sliver of him beside it is covered. On a phone the panel
          still spans the full width, because there is no arrangement where a small portrait
          frame holds a large character and a legible riddle side by side. */}
      <div
        dir="rtl"
        className="absolute inset-x-3 bottom-3 top-20 z-20 flex flex-col justify-end overflow-hidden sm:inset-x-auto sm:bottom-6 sm:left-[18rem] sm:right-3 sm:top-24 md:left-[22rem] lg:left-[26rem]"
      >
        <div className="max-h-full overflow-y-auto rounded-2xl border-2 border-amber-800/40 bg-amber-50/95 p-4 shadow-2xl backdrop-blur-sm sm:p-5">
          <p className="mb-1 text-[11px] font-black uppercase tracking-wide text-amber-700/90">
            השומר המבולבל
          </p>
          <p className="text-base font-bold leading-snug text-amber-950 sm:text-lg md:text-xl">
            {line}
          </p>

          {speakingTease ? (
            <button
              type="button"
              onClick={retry}
              className="mt-3 w-full rounded-xl border border-amber-300 bg-white/90 p-3 text-center text-base font-black text-amber-950 transition hover:bg-amber-100 active:scale-95"
            >
              נסה שוב 🔁
            </button>
          ) : solved ? (
            /*
              THE VICTORY CARD REPLACES THE OPTIONS, RATHER THAN THE MODAL CLOSING ITSELF. See the
              settlement comment in `answer` for why the automatic close had to go: a district that
              shuts itself on the winning tap has nowhere to announce the promotion and no way to
              offer a replay.
            */
            <div className="mt-3">
              {earnedMedals >= 3 ? (
                <LevelCompleteCard
                  level={level}
                  unlockedNext={outcome?.unlockedNext ?? false}
                  completedStation={outcome?.completedAll ?? false}
                  onReplay={replay}
                  onLeave={leave}
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <MedalCounter earned={earnedMedals} level={level} />
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={replay}
                      className="rounded-xl border border-amber-300 bg-white/90 px-4 py-2 text-sm font-black text-amber-950 transition hover:bg-amber-100 active:scale-95"
                    >
                      מעבר נוסף 🔁
                    </button>
                    <button
                      type="button"
                      onClick={leave}
                      className="rounded-xl border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-black text-amber-950 transition hover:bg-amber-200 active:scale-95"
                    >
                      סיום
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {riddle &&
                riddle.options.map((option, index) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => answer(index)}
                    className="rounded-xl border border-amber-300 bg-white/90 p-3 text-right text-base font-medium text-amber-950 transition hover:bg-amber-100 active:scale-95"
                  >
                    {option}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Everything below is chrome ON TOP of the scene, never a layout row: the
          banner floats, and nothing here may push the artwork aside. */}
      <div className="absolute right-3 top-3 z-30">
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          className="grid h-10 w-10 place-items-center rounded-full bg-amber-950/70 text-amber-50 shadow-lg backdrop-blur-sm transition hover:bg-amber-950/90 active:scale-90"
        >
          <X className="h-5 w-5" strokeWidth={3} />
        </button>
      </div>

      {/* Banner: the title and the three locks. */}
      <div className="absolute left-1/2 top-2 z-30 -translate-x-1/2">
        <div
          dir="rtl"
          className="flex items-center gap-2 rounded-2xl border-2 border-amber-700/70 bg-gradient-to-b from-amber-700 to-amber-900 px-3 py-1.5 shadow-[0_4px_0_rgba(0,0,0,0.35)] sm:gap-3 sm:px-4"
        >
          <h2 className="whitespace-nowrap text-xs font-black text-amber-50 drop-shadow sm:text-sm md:text-base">
            גשר השומר המבולבל
          </h2>
          <div className="flex items-center gap-1.5">
            {riddles.map((_, index) => {
              const open = solved || index < stage;
              const justOpened = recentlyOpened === index;
              return (
                <span
                  key={index}
                  title={`חידה ${index + 1} מתוך ${riddles.length}`}
                  className={`grid h-7 w-7 place-items-center rounded-full text-sm transition sm:h-8 sm:w-8 sm:text-base ${
                    open
                      ? 'bg-amber-300 text-amber-950 shadow-[0_0_12px_3px_rgba(252,211,77,0.75)]'
                      : 'bg-amber-950/70 text-amber-200/80'
                  } ${
                    open && justOpened
                      ? 'motion-safe:animate-[popBounce_.5s_ease-out]'
                      : ''
                  }`}
                >
                  {/* An unlocked padlock gets a gentle idle bounce so the newly
                      freed stage is the thing the eye lands on. */}
                  <span className={open ? 'motion-safe:animate-[hopSmall_.9s_ease-in-out_infinite]' : ''}>
                    {open ? '🔓' : '🔒'}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress, read as the riddles are solved. Decorative, so it sits behind
          the parchment and never intercepts a tap. */}
      <div className="absolute bottom-2 right-3 z-30 flex items-center gap-1.5">
        <MedalCounter earned={earnedMedals} level={level} />
        <p className="rounded-full bg-amber-950/60 px-3 py-1 text-[11px] font-black text-amber-100 backdrop-blur-sm">
          שלב {Math.min(stage + 1, riddles.length)} / {riddles.length}
        </p>
      </div>
    </div>
  );
}
