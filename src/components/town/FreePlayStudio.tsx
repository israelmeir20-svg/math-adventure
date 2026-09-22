/**
 * "אולפן ניגונים" - the free-creation sandbox of the Beat Studio.
 *
 * ===================================================================
 * THE IDEA, IN ONE SENTENCE.
 * ===================================================================
 *
 * The child taps numbers, and the numbers ARE the music: each tap is a note, and the
 * arithmetic they are doing decides which melody they get. Pick 2, 4, 6 and the
 * studio hears "counting in twos" and answers with a calm Chassidic climb; pick 2, 4,
 * 8 and it hears "doubling" and answers with a fast Freilach. There is no clock, no
 * score, and nothing to lose - the reward for arithmetic is a song.
 *
 * ===================================================================
 * WHY THIS IS A SEPARATE COMPONENT RATHER THAN A MODE INSIDE THE SPRINT.
 * ===================================================================
 *
 * The sprint (`SpiderWebModal`) and this share nothing but a keypad and a synth, and
 * everything they do NOT share is a rule that only makes sense for one of them:
 *
 *   sprint                        sandbox
 *   --------------------------    --------------------------
 *   15-second deadline            no clock at all
 *   score, streak, mistakes       nothing to lose
 *   medals + cookie payout        one cookie reward per finished song
 *   one correct answer per round  unlimited free exploration
 *   a generated puzzle            the child supplies the numbers
 *
 * Folding those into one component would mean every shared line was guarded by a
 * mode check, and every bug would have to be reasoned about twice. Two components
 * with a shared keypad and a shared synth is the honest shape, and it is also what
 * makes the sprint provably untouched by this feature: none of its code is edited.
 *
 * ===================================================================
 * THE STATE MACHINE, AND WHY IT HAS A "BRANCH" PHASE.
 * ===================================================================
 *
 * `INTRO` -> `PREFIX` -> `BRANCH` -> `REFLECTION`
 *
 * The first two taps are the PREFIX: the studio plays `commonPrefix[0]` and
 * `commonPrefix[1]` and deliberately does NOT choose a melody yet, because two
 * numbers do not establish a rule (see `mathSequenceEngine`). This is the whole
 * reason the branching tree exists - the first two notes are shared, so the child
 * hears a tune begin before they know where it is going.
 *
 * On the THIRD tap a rule becomes knowable, the branch is locked, and from then on
 * each correct number plays the next note of that branch. The branch does not change
 * once chosen: a melody that switched from a Freilach to a Dveikut halfway through
 * would not be a melody.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Cookie, Music, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti';

import { useGame } from '../../context/GameContext';
import {
  BRANCHING_MELODY_TREE,
  type MathPatternType,
} from '../../data/freePlayCatalog';
import {
  buildReflection,
  generateKeysForStep,
  getValidNextNumbers,
} from '../../logic/mathSequenceEngine';
import { useBeatStudioAudio } from './useBeatStudioAudio';
import { NeonKey, type KeyState } from './BeatStudioKeys';

/** The three branches the melody can resolve into, keyed by rule. */
type BranchKey = 'arithmetic_add' | 'geometric' | 'fibonacci';

/**
 * Which branch a detected rule belongs to.
 *
 * THE MAPPING IS NOT ONE-TO-ONE, AND THAT IS ON PURPOSE. The engine detects five
 * rules; the tree has three branches. So the two "arithmetic" flavours both resolve
 * to the same tune (a rising count and a rising count by a bigger step are the same
 * musical idea to a child), and any rule with no branch falls back to the calmest
 * one rather than leaving the child without a melody.
 *
 * `null` means "not enough evidence yet" and is the normal answer for the first two
 * taps.
 */
function branchForRule(rule: MathPatternType): BranchKey | null {
  switch (rule) {
    case 'arithmetic_add':
    case 'arithmetic_sub':
    case 'increasing_step':
      return 'arithmetic_add';
    case 'geometric':
      return 'geometric';
    case 'fibonacci':
      return 'fibonacci';
    default:
      return null;
  }
}

/** How many taps make a complete song. Six is two prefix notes plus four branch notes. */
const SONG_LENGTH = 6;

/** The notes shown as a hint of what a branch sounds like, before committing to it. */
const BRANCH_LABEL: Record<BranchKey, string> = {
  arithmetic_add: 'ניגון המדרגות',
  geometric: 'חגיגת ההכפלות',
  fibonacci: 'סולם הקסם',
};

/**
 * Fires the cookie reward celebration.
 *
 * A dedicated canvas rather than the default `confetti()`, for the same reason
 * `useAnswerFeedback` gives: the default instance builds a viewport-sized canvas and
 * spins up a worker on its first call, which lands as a visible hitch. This is called
 * once per completed song, so the cost is paid at a moment the child is looking at a
 * modal anyway - but the shared-canvas pattern keeps it off the main thread.
 */
let cookieCanvas: HTMLCanvasElement | null = null;
let cookieBurst: confetti.CreateTypes | null = null;

function celebrateCookies() {
  try {
    if (!cookieCanvas) {
      cookieCanvas = document.createElement('canvas');
      cookieCanvas.style.cssText =
        'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:90';
      document.body.appendChild(cookieCanvas);
      cookieBurst = confetti.create(cookieCanvas, { resize: true, useWorker: false });
    }
    void cookieBurst?.({
      particleCount: 120,
      spread: 100,
      startVelocity: 42,
      ticks: 130,
      origin: { x: 0.5, y: 0.45 },
      colors: ['#f59e0b', '#fbbf24', '#fde68a', '#d97706', '#ffffff'],
    });
  } catch {
    /* decorative only - the reward is already banked by the time this runs */
  }
}

/**
 * The cookie bank in the top bar.
 *
 * Reads the live balance from the game context rather than keeping a local count, so
 * the number the child sees is the same one the sticker shop will spend - a local
 * tally that drifted from the real one would be a lie told by the UI.
 */
function CookieTally() {
  const { state } = useGame();
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-400/25 px-2.5 py-1 text-xs font-black tabular-nums text-amber-100">
      <Cookie className="h-3.5 w-3.5" strokeWidth={3} />
      {state.inventory.cookies}
    </span>
  );
}

interface FreePlayStudioProps {
  /** Provided by `GameAnchorHost`, the standard contract for a town modal. */
  onClose: () => void;
  /** Hands the modal back to the timed sprint. Owned by `SpiderWebModal`. */
  onSwitchMode: () => void;
}

export default function FreePlayStudio({ onClose, onSwitchMode }: FreePlayStudioProps) {
  const { addCookies } = useGame();
  const audio = useBeatStudioAudio();

  /**
   * `INTRO`   - nothing played yet; the child reads what this is.
   * `PREFIX`  - one or two taps in; no branch chosen, shared notes play.
   * `BRANCH`  - a branch is locked; each correct tap plays its next note.
   * `REFLECTION` - the song is complete; the maths question is on screen.
   */
  const [phase, setPhase] = useState<'INTRO' | 'PREFIX' | 'BRANCH' | 'REFLECTION'>('INTRO');
  const [history, setHistory] = useState<number[]>([]);
  /** Index into the locked branch's notes - how far through the melody we are. */
  const [noteIndex, setNoteIndex] = useState(0);
  const [branch, setBranch] = useState<BranchKey | null>(null);
  /** The key to flash red, and a counter so the same key can shake twice in a row. */
  const [wrongKey, setWrongKey] = useState<{ value: number; nonce: number } | null>(null);
  const [litKeys, setLitKeys] = useState<number[]>([]);
  /** Set once the reflection is answered correctly, so the reward is paid once. */
  const [rewarded, setRewarded] = useState(false);
  const [answeredIndex, setAnsweredIndex] = useState<number | null>(null);

  const timers = useRef<number[]>([]);
  const rewardedRef = useRef(false);

  /* Every timer this screen sets is registered so unmount clears them all. A note
   * scheduled to clear `litKeys` after the modal closes would otherwise set state on
   * an unmounted component. */
  useEffect(() => {
    const list = timers.current;
    return () => {
      for (const id of list) window.clearTimeout(id);
      list.length = 0;
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }, []);

  /* ------------------------------------------------------------------
   * The locked branch's notes, and the reflection question.
   * ------------------------------------------------------------------ */

  /**
   * ==================================================================
   * THE REFLECTION IS GENERATED FROM THE HISTORY, NOT READ FROM THE BRANCH.
   * ==================================================================
   *
   * The catalogue's `branchData.reflection` is deliberately NOT used here, and using
   * it was a real bug: the branch is a MUSICAL destination that several rules share
   * (`branchForRule` sends +d, -d and increasing-step all to the same melody), while
   * its hardcoded question names one specific step. A child counting `3, 4, 5, 6`
   * landed in the arithmetic branch and was asked "did we add 2?" - so every option
   * on screen was wrong for what they had actually played.
   *
   * `buildReflection` reads the detected rule AND its parameter out of `history`, so
   * the question, the options and the explanation are all about the sequence in front
   * of the child. Deriving it here (rather than storing it when the song ends) keeps
   * it in step with `history` automatically and makes it a pure function of state.
   */
  const reflection = useMemo(
    () => (phase === 'REFLECTION' ? buildReflection(history) : null),
    [history, phase],
  );

  /**
   * The cookie value of a finished song.
   *
   * READ FROM THE BRANCH, NOT FROM THE QUESTION, and the split is deliberate: the
   * QUESTION is arithmetic and must be specific to the sequence, while the REWARD is
   * economy and is deliberately tied to the branch - the Fibonacci melody pays best
   * (35) because spotting that rule is the hardest thing in the studio, regardless of
   * which particular numbers the child reached it with. Keeping the maths out of the
   * payout means a child cannot farm the biggest reward by padding their sequence.
   */
  const reflectionReward = branch
    ? BRANCHING_MELODY_TREE.branches[branch].reflection.cookieReward
    : 0;

  /**
   * The keys to show, derived - never stored.
   *
   * Deriving them from `history` rather than keeping them in state is what guarantees
   * the row can never show numbers that do not match the sequence the child has
   * actually played. It also makes the shuffle stable, because
   * `generateKeysForStep` seeds from the history.
   */
  const keys = useMemo(
    () => (phase === 'REFLECTION' ? [] : generateKeysForStep(history)),
    [history, phase],
  );

  /**
   * The numbers that would advance the sequence mathematically.
   *
   * Used only to decide whether a tap is "correct" - the melody's note count is
   * driven by correct taps, so a child who wanders off the pattern still hears their
   * own note but does not advance the song.
   */
  const validTargets = useMemo(
    () => getValidNextNumbers(history).map((candidate) => candidate.nextValue),
    [history],
  );

  /* ------------------------------------------------------------------
   * Starting and resetting.
   * ------------------------------------------------------------------ */

  const begin = useCallback(() => {
    // The tap that starts the sandbox is also the gesture that unlocks audio.
    audio.prime();
    audio.silence();
    setPhase('PREFIX');
    setHistory([]);
    setNoteIndex(0);
    setBranch(null);
    setWrongKey(null);
    setLitKeys([]);
    setRewarded(false);
    setAnsweredIndex(null);
    rewardedRef.current = false;
  }, [audio]);

  const restart = useCallback(() => {
    audio.silence();
    setPhase('PREFIX');
    setHistory([]);
    setNoteIndex(0);
    setBranch(null);
    setWrongKey(null);
    setLitKeys([]);
    setRewarded(false);
    setAnsweredIndex(null);
    rewardedRef.current = false;
  }, [audio]);

  /* ------------------------------------------------------------------
   * The tap handler: the heart of the studio.
   * ------------------------------------------------------------------ */

  const onPick = useCallback(
    (value: number) => {
      if (phase !== 'PREFIX' && phase !== 'BRANCH') return;

      const nextHistory = [...history, value];
      const isCorrect = validTargets.length === 0 || validTargets.includes(value);

      /*
       * A WRONG TAP IS NOT A PENALTY, IT IS JUST NOT-PROGRESS.
       *
       * There is no score to lose and no clock to burn, so the only consequence is
       * that the melody does not move on. We do NOT push the wrong number into the
       * history: doing so would let a single stray tap break the arithmetic pattern
       * the child was building, and the song would end early for a reason they could
       * not see. Rejecting the tap keeps the sequence they meant to build intact.
       */
      if (!isCorrect && history.length > 0) {
        audio.playDiscordant();
        setWrongKey({ value, nonce: Math.random() });
        return;
      }

      setHistory(nextHistory);
      setWrongKey(null);

      /* --------------------------------------------------------------
       * Which note to play.
       * -------------------------------------------------------------- */

      // Taps one and two: the shared prefix. No branch can be known yet.
      if (nextHistory.length <= BRANCHING_MELODY_TREE.commonPrefix.length) {
        const note = BRANCHING_MELODY_TREE.commonPrefix[nextHistory.length - 1]!;
        audio.playNote(note.freq, note.duration);
        setLitKeys([value]);
        later(() => setLitKeys([]), Math.max(120, note.duration * 1000));
        setPhase('PREFIX');
        return;
      }

      /*
       * ==================================================================
       * THE BRANCH IS LOCKED AS SOON AS A RULE IS DETECTABLE - AND NO SOONER.
       * ==================================================================
       *
       * THIS IS NOT ALWAYS THE THIRD TAP, AND ASSUMING IT WAS BROKE FIBONACCI.
       *
       * The obvious implementation locks on tap three, because that is where the
       * engine first has the three terms it needs for an arithmetic or geometric
       * reading. But FIBONACCI NEEDS FOUR TERMS to be detectable at all - with three
       * there is no pair of predecessors to check against - so at tap three a child
       * heading for 2, 3, 5, 8 has played `2, 3, 5`, which satisfies NO rule. The
       * engine correctly returns nothing, and a `?? 'arithmetic_add'` fallback would
       * then silently commit them to the WRONG MELODY: they would tap a perfect
       * Fibonacci sequence and be told it was a tune about adding two.
       *
       * So the lock waits for the first tap at which the engine actually recognises
       * something. For arithmetic and geometric that is still tap three; for
       * Fibonacci it is tap four. Until then the child is in `PREFIX`, where a tap
       * against no rule is not wrong (there is no rule to break) and is simply added
       * to the sequence - which is exactly the freedom the opening of a sandbox needs.
       */
      const candidates = getValidNextNumbers(nextHistory);
      /*
       * `branchForRule` can only return null for a rule the tree has no branch for,
       * and every rule the engine detects maps to one of the three branches - so this
       * is a total function over the branches in practice. The fallback is stated
       * explicitly rather than left to a `??` further down, so the index type is
       * provably non-null at the point of use.
       */
      const detectedBranch: BranchKey =
        branchForRule(candidates[0]?.rule ?? 'arithmetic_add') ?? 'arithmetic_add';

      if (branch === null) {
        /* No rule recognised yet. Accept the number as a free note and keep
         * listening; the melody has not started, so nothing is mis-attributed. */
        if (candidates.length === 0) {
          const note = BRANCHING_MELODY_TREE.commonPrefix[1]!;
          audio.playNote(note.freq, note.duration);
          setLitKeys([value]);
          later(() => setLitKeys([]), Math.max(120, note.duration * 1000));
          return;
        }

        /* A rule has appeared - lock it in. From here on it never changes, so the
         * melody cannot swap under the child halfway through. */
        setBranch(detectedBranch);
        const openingNotes = BRANCHING_MELODY_TREE.branches[detectedBranch].notes;
        const firstNote = openingNotes[0]!;
        audio.playNote(firstNote.freq, firstNote.duration);
        setLitKeys([value]);
        later(() => setLitKeys([]), Math.max(120, firstNote.duration * 1000));
        setNoteIndex(1);
        setPhase('BRANCH');
        if (openingNotes.length <= 1) later(() => setPhase('REFLECTION'), Math.max(320, firstNote.duration * 1000));
        return;
      }

      /* The branch is locked: play its next note and advance. */
      const notes = BRANCHING_MELODY_TREE.branches[branch].notes;

      // The song ends when the branch's notes are exhausted.
      if (noteIndex >= notes.length) {
        setPhase('REFLECTION');
        audio.playVictoryArpeggio(notes.map((note) => note.freq));
        return;
      }

      const note = notes[noteIndex]!;
      audio.playNote(note.freq, note.duration);
      setNoteIndex(noteIndex + 1);
      setLitKeys([value]);
      later(() => setLitKeys([]), Math.max(120, note.duration * 1000));
      setPhase('BRANCH');

      // Completing the final note of the branch also ends the song.
      if (noteIndex + 1 >= notes.length) {
        later(() => setPhase('REFLECTION'), Math.max(320, note.duration * 1000));
      }
    },
    [audio, branch, history, later, noteIndex, phase, validTargets],
  );

  /* ------------------------------------------------------------------
   * The reflection answer.
   * ------------------------------------------------------------------ */

  const answerReflection = useCallback(
    (optionIndex: number) => {
      if (!reflection || rewardedRef.current) return;
      setAnsweredIndex(optionIndex);

      if (optionIndex !== reflection.correctIndex) {
        /*
         * A WRONG REFLECTION ANSWER IS NOT A DEAD END. The question is the teaching
         * moment, so a wrong guess simply re-asks - the child gets the explanation
         * once they find the right answer, not a failure screen.
         */
        audio.playDiscordant();
        later(() => setAnsweredIndex(null), 900);
        return;
      }

      rewardedRef.current = true;
      setRewarded(true);
      addCookies(reflectionReward);
      audio.playMedalFanfare();
      celebrateCookies();
    },
    [addCookies, audio, later, reflection, reflectionReward],
  );

  /* ------------------------------------------------------------------
   * Rendering.
   * ------------------------------------------------------------------ */

  const songDone = phase === 'REFLECTION';
  const progressLabel = branch
    ? `${BRANCH_LABEL[branch]} · ${Math.min(noteIndex, SONG_LENGTH)}/${SONG_LENGTH}`
    : 'בוחרים מספרים - הם הופכים למנגינה';

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="אולפן ניגונים"
      onClick={onClose}
      className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative flex h-[92vh] w-full max-w-2xl animate-[rise_.2s_ease-out] flex-col overflow-hidden rounded-t-3xl border-4 border-cyan-500/40 bg-slate-950 shadow-[0_0_60px_rgba(34,211,238,0.25)] sm:h-[86vh] sm:rounded-3xl"
      >
        {/* Ambient stage lighting, matching the sprint's studio. Inert. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-600/25 blur-[90px]" />
          <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[100px]" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-cyan-900/30 to-transparent" />
        </div>

        {/* ------------------------------------------------ slim top bar */}
        <header className="relative z-10 flex shrink-0 items-center gap-1.5 border-b border-cyan-500/20 px-3 py-2">
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-cyan-500/25 px-2.5 py-1 text-xs font-black text-cyan-100">
            <Music className="h-3.5 w-3.5" strokeWidth={3} />
            אולפן ניגונים
          </span>

          {/*
            THE MODE SWITCH. A pill rather than a tab bar, because there are only two
            modes and the sprint is the "home" one - so this reads as a single
            invitation to go back rather than as a navigation problem to solve.
          */}
          <button
            type="button"
            onClick={onSwitchMode}
            aria-label="חזרה לספרינט סדרות"
            className="flex shrink-0 items-center rounded-full border border-fuchsia-400/50 bg-fuchsia-500/20 px-2.5 py-1 text-xs font-black text-fuchsia-100 transition hover:bg-fuchsia-500/35 active:translate-y-[2px]"
          >
            ספרינט סדרות ⏱
          </button>

          <div className="flex min-w-0 flex-1 items-center justify-center">
            <span className="truncate rounded-full bg-slate-800 px-2.5 py-1 text-xs font-black text-slate-200">
              {progressLabel}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <CookieTally />
            <button
              type="button"
              onClick={onClose}
              aria-label="סגור"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-800 transition hover:bg-white active:translate-y-[2px]"
            >
              <X className="h-4 w-4" strokeWidth={3} />
            </button>
          </div>
        </header>

        {/* ---------------------------------------------------- the stage */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-4 py-4">
          {phase === 'INTRO' ? (
            /* ---------------------------------------------------- intro */
            <div className="w-full max-w-md text-center">
              <div className="mb-2 text-5xl" aria-hidden>
                🎵
              </div>
              <h2 className="text-2xl font-black text-white">מה שהמספרים יגידו</h2>
              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-300">
                בחרו מספרים, והם יהפכו למנגינה. כל פעם שתמצאו את החוקיות -{' '}
                <span className="text-cyan-300">תשמעו איך המספרים נשמעים</span>.
              </p>
              <p className="mt-1.5 text-xs font-bold text-slate-400">
                אין שעון ואין הפסדים. פשוט לנגן ולגלות.
              </p>
              <button
                type="button"
                onClick={begin}
                className="mt-5 w-full rounded-2xl border-b-4 border-cyan-800 bg-gradient-to-b from-cyan-400 to-cyan-600 px-6 py-3 text-lg font-black text-cyan-950 shadow-[0_5px_0_#164e63] transition active:translate-y-[4px] active:shadow-none"
              >
                מתחילים לנגן
              </button>
            </div>
          ) : songDone ? (
            /* ---------------------------------------------- reflection */
            <div className="w-full max-w-md animate-[rise_.22s_ease-out]">
              <div className="mb-3 text-center">
                <div className="text-4xl" aria-hidden>
                  {rewarded ? '🎉' : '🎼'}
                </div>
                <p className="mt-1 text-xs font-black tracking-wide text-cyan-300">
                  {branch ? BRANCH_LABEL[branch] : 'מנגינה'} ·{' '}
                  {history.join(' · ')}
                </p>
              </div>

              <div className="rounded-3xl border-4 border-cyan-500/40 bg-slate-900/90 p-4 shadow-[0_0_40px_rgba(34,211,238,0.2)]">
                <h3 className="text-center text-lg font-black text-white">
                  {reflection?.question}
                </h3>

                <div className="mt-3 flex flex-col gap-2">
                  {reflection?.options.map((option, index) => {
                    const isCorrect = index === reflection.correctIndex;
                    const picked = answeredIndex === index;
                    /* The correct option only turns green once it has been earned, so
                     * the answer is never given away by the styling. */
                    const showCorrect = rewarded && isCorrect;
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={rewarded}
                        onClick={() => answerReflection(index)}
                        className={`rounded-2xl border-2 px-3 py-2.5 text-start text-sm font-black transition ${
                          showCorrect
                            ? 'border-emerald-300 bg-emerald-500/70 text-white'
                            : picked
                              ? 'border-rose-400 bg-rose-600/60 text-white animate-[wobble_.45s_ease-in-out]'
                              : 'border-slate-600 bg-slate-800 text-slate-100 hover:border-cyan-400 hover:bg-slate-700 active:translate-y-[2px]'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {rewarded && reflection && (
                  <div className="mt-3 rounded-2xl bg-emerald-500/15 p-3 text-center">
                    <p className="flex items-center justify-center gap-1.5 text-sm font-black text-emerald-200">
                      <Sparkles className="h-4 w-4" strokeWidth={3} />
                      {reflection.explanation}
                    </p>
                    <p className="mt-1.5 text-xs font-black tabular-nums text-amber-200">
                      +{reflectionReward} 🍪 נכנסו לקופה!
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={restart}
                className="mt-4 w-full rounded-2xl border-b-4 border-cyan-800 bg-gradient-to-b from-cyan-400 to-cyan-600 px-6 py-3 text-lg font-black text-cyan-950 shadow-[0_5px_0_#164e63] transition active:translate-y-[4px] active:shadow-none"
              >
                מנגינה חדשה 🎹
              </button>
            </div>
          ) : (
            /* ------------------------------------------------- playing */
            <>
              <p className="shrink-0 text-center text-sm font-black text-slate-300">
                {history.length === 0
                  ? 'בחרו מספר ראשון כדי להתחיל את השיר'
                  : 'מה בא בתור? בחרו את המספר הבא'}
              </p>

              {/* The sequence so far, as notes. */}
              <div className="flex shrink-0 flex-wrap items-center justify-center gap-1.5">
                {history.map((value, index) => (
                  <span
                    key={`${value}-${index}`}
                    className="rounded-xl bg-slate-800 px-2.5 py-1 text-base font-black tabular-nums text-cyan-200"
                  >
                    {value}
                  </span>
                ))}
                <span className="rounded-xl border-2 border-dashed border-slate-600 px-2.5 py-1 text-base font-black text-slate-500">
                  ?
                </span>
              </div>

              {/*
                THE KEYPAD.
                `onPress` is what makes a key interactive, so passing it here is the
                whole wiring. A wrong key gets `wrong` state, which the key styles as a
                shake - the `nonce` in the key forces React to remount it so the same
                key shakes again on a second wrong tap.
              */}
              <div dir="ltr" className="flex flex-wrap items-center justify-center gap-2">
                {keys.map((key, index) => (
                  <NeonKey
                    key={`${key}-${wrongKey?.value === key ? wrongKey.nonce : 'k'}`}
                    index={index}
                    value={key}
                    state={
                      (wrongKey?.value === key
                        ? 'wrong'
                        : litKeys.includes(key)
                          ? 'lit'
                          : 'idle') as KeyState
                    }
                    onPress={() => onPick(key)}
                    label={`נגן ${key}`}
                  />
                ))}
              </div>

              {branch && (
                <p className="shrink-0 text-center text-xs font-black text-fuchsia-300">
                  🎶 {BRANCH_LABEL[branch]} - עוד{' '}
                  {Math.max(
                    0,
                    BRANCHING_MELODY_TREE.branches[branch].notes.length - noteIndex,
                  )}{' '}
                  צלילים
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
