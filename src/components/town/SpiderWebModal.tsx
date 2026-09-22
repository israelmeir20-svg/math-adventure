/**
 * "אולפן המקצבים" - The Beat Studio.
 *
 * A 45-second neon synthesizer sprint. Five keys carry a number sequence; the
 * child is asked to find the missing note, to spot the key that is out of tune, or
 * to name the song's tempo. Every correct answer plays melody.
 *
 * ===================================================================
 * THE ROUND IS A CLOCK, NOT A CHECKLIST.
 * ===================================================================
 *
 * There is no "finish the track and move on". The deadline is 45 seconds, so every
 * second spent re-reading a sequence is a second not spent scoring - and a wrong
 * tap costs 75 points AND the streak, which is what keeps guessing from paying.
 *
 * THE DEADLINE IS STORED, NOT COUNTED. `setInterval` is throttled to about 1Hz in
 * a backgrounded tab, so a child who tabs away for ten seconds would come back to a
 * clock that only lost one. Storing an absolute deadline and recomputing the
 * remainder means the clock always tells the truth, however long the tab slept.
 *
 * ===================================================================
 * AUDIO IS PRIMED BY THE FIRST TAP, WHATEVER IT IS.
 * ===================================================================
 *
 * Browsers create an AudioContext suspended until a gesture unlocks it, and the
 * failure is silent - the game looks fine and makes no sound. So the very first
 * interaction with anything on the stage calls `audio.prime()`. See
 * `useBeatStudioAudio` for the full reasoning.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Music, Trophy, Volume2, X, Zap } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { playTone } from '../math/audioTone';
import { Equalizer, NeonKey, type KeyState } from './BeatStudioKeys';
import {
  BEAT_TIERS,
  KEY_COUNT,
  buildBeatRound,
  clampLevel,
  describeStep,
  type BeatChallenge,
  type BeatRound,
} from './beatStudioRounds';
import {
  GOLD_MEDALS_PER_LEVEL,
  MEDAL_EMOJI,
  MEDAL_LABEL,
  MEDAL_THRESHOLD,
  SPRINT_SECONDS,
  applyMistake,
  medalForScore,
  pointsForTrack,
  tracksShortOfGold,
  type MedalKind,
} from './beatStudioSprint';
import {
  imposterFrequency,
  pitchAt,
} from './beatStudioMusic';
import { useBeatStudioAudio } from './useBeatStudioAudio';
import GameLaunchModal from '../kingdom/GameLaunchModal';
import FreePlayStudio from './FreePlayStudio';
import {
  useStationProgress,
  getStationProgress,
  type StationLevel,
} from '../../features/progression/useStationProgress';
import { MedalCounter } from '../../features/progression/ProgressionChrome';

/**
 * Cookies paid for finishing a sprint, plus a bonus per medal tier.
 *
 * REBALANCED to the same shape as the cargo sprint: base 10, +4 per tier. The Beat
 * Studio's round is 45s rather than 30s, so a run is worth slightly more in wall-clock
 * terms, but it is also a longer sit - keeping the payout identical means no game is
 * quietly the best cookie-per-minute farm.
 */
const COOKIE_PER_SPRINT = 10;
const COOKIE_PER_MEDAL = 4;

/**
 * How long each key stays lit during the success sweep, in milliseconds.
 *
 * THIS NUMBER IS A BUDGET DECISION, NOT A STYLE CHOICE. Every solved track plays
 * the sweep before the next round appears, so a five-key sweep at 190ms held the
 * stage for ~950ms per track - and with the extra beat before the next round, a
 * track could not complete in under about 1.2 seconds no matter how fast the child
 * was. Gold needs 15 tracks inside a 45-second sprint, which is 3 seconds each:
 * spending 1.2 of those on animation made gold depend on animation speed rather
 * than on the child's maths.
 *
 * 110ms keeps the run clearly audible and legible as a wave passing left to right
 * (a 550ms sweep) while leaving the clock to the player.
 */
const SWEEP_MS = 110;

/**
 * How long a wrong answer freezes the round before the child can retry, in ms.
 *
 * Long enough to cover the key's shake (a `wobble` of 450ms) and register that the
 * answer was rejected; short enough that a child who immediately sees their mistake
 * is not made to wait. Tuned against the shake rather than chosen - a lockout shorter
 * than the animation would let the next tap land on a key that is still visually
 * moving.
 */
const FAIL_LOCKOUT_MS = 640;

/**
 * How long the RESOLVE of an answer is shown before the next round is built, in ms.
 *
 * THE CELEBRATION MUST FIT INSIDE 350ms, and that is the whole constraint. A
 * resolved key, the chime and the neon glow are what tell the child they were
 * right - but they are not the game. Every millisecond spent holding the stage is a
 * millisecond of the 45-second sprint that the child cannot spend reading numbers,
 * so the resolve is budgeted like the sweep is: long enough to register, short
 * enough that a fast player is never waiting on it.
 *
 * The two values below are tuned TOGETHER so their sum stays under the 350ms the
 * round is allowed: the key lights its pitch, and the stage hands over.
 */
const RESOLVE_MS = 220;
/** Extra breathing room before the next round, on top of the resolve. */
const ROUND_GAP_MS = 100;

/**
 * How long a resolved key stays in its `solved` state, in ms.
 *
 * Deliberately shorter than `RESOLVE_MS` so the glow has already begun to fade as
 * the next round lands - which is what makes the transition read as "snappy" rather
 * than as the game clearing the board before moving on.
 */
const SOLVED_FLASH_MS = 320;

/**
 * The gap between keys in the round PREVIEW, in milliseconds (~280ms as specified).
 *
 * THE PREVIEW IS THE ONE PIECE OF PACING THAT MUST BE SLOWER THAN THE SPRINT.
 * Everything else in this game is sped up to leave the clock to the player, but the
 * preview exists to be LISTENED to - a child needs to hear the step and the hole
 * where the missing key should be, and 280ms per key is roughly a walking tempo,
 * which is where a five-note run becomes a recognisable phrase rather than a blur.
 */
const PREVIEW_STEP_MS = 280;

/**
 * How many of the most recent answers the round keeps, to avoid repeats.
 *
 * THIS MUST BE AT LEAST AS LONG AS THE LONGEST TIER'S CHALLENGE LIST, or the
 * "least recently used" pass cannot see which types have been skipped. At three
 * entries it covers the widest tier (three challenges) exactly: every type is either
 * in the history or it is not, so the stalest one is always identifiable.
 */
const RECENT_MEMORY = 3;

export default function SpiderWebModal({
  onClose,
  level = 1,
}: {
  onClose: () => void;
  /**
   * The level the studio OPENS at, used only until the launch card is dismissed.
   *
   * DEFAULTS TO 1 SO `GameAnchorHost` - WHICH KNOWS NOTHING ABOUT LEVELS - STILL COMPILES. The
   * card is what supplies the child's real choice: `GameLaunchModal` renders the ladder and hands
   * the picked level back through `onStart`, so this prop never overrides a deliberate pick. It
   * seeds the round that `buildBeatRound` deals on the first render, which the card's own gate
   * then keeps off screen anyway.
   *
   * IT REPLACES THE OLD FOUR-LEVEL LADDER. `useBeatProgress` used to own both the level and its
   * medal count; that record is now the shared one, so the level arrives as a prop and only the
   * medals live in the store. It does NOT retune the game - `buildBeatRound(level)` picks the
   * tier exactly as before.
   */
  level?: StationLevel;
}) {
  const { addCookies } = useGame();
  const audio = useBeatStudioAudio();
  const { progress, recordGoldMedal } = useStationProgress('music');

  /**
   * Which half of the studio is open.
   *
   * THE SPRINT IS THE DEFAULT so nothing changes for a child who just taps the map
   * pin, and the sandbox is an explicit choice from the toggle. The sandbox is a
   * separate component rather than a branch inside this one, because the two share no
   * rules - see `FreePlayStudio` for the full reasoning - so switching modes here
   * simply swaps which tree is mounted.
   */
  const [mode, setMode] = useState<'sprint' | 'sandbox'>('sprint');

  /**
   * WHETHER THE CHILD HAS GOT PAST THE LAUNCH CARD, EXPRESSED AS THE CHOSEN LEVEL.
   *
   * THE STUDIO SHOWS A LAUNCH CARD BEFORE IT OPENS, unlike the map pin's old behaviour of dropping
   * straight into a 45-second sprint. The card is the only place the game explains itself, and a
   * countdown that starts before the child knows what they are being timed on measures the wrong
   * thing.
   *
   * A SEPARATE `launched` BOOLEAN WAS FOLDED INTO THIS. The two were always set together - the
   * card's `onStart` did both - so a boolean alongside the level was a second source of truth
   * that could only ever disagree with it. `null` now means "the card is still up", which is the
   * same thing the boolean meant, and the level is then guaranteed non-null for the sprint below.
   */
  const [chosenLevel, setChosenLevel] = useState<StationLevel | null>(null);

  /**
   * THE LEVEL THE SPRINT RUNS AT: THE CARD'S PICK, FALLING BACK TO THE PROP.
   *
   * Hoisted above the hooks rather than narrowed after the card's `if` return, because the round
   * builder and the settle effect both close over it - a `const` declared below them would be in
   * the temporal dead zone at the moment those callbacks were created. `chosenLevel` is null only
   * until the card is dismissed, and the card's gate means nothing renders the sprint before then,
   * so the prop default covers exactly the pre-card renders and nothing else.
   */
  const playLevel: StationLevel = chosenLevel ?? level;

  /**
   * Gold medals banked at `level`, snapshotted when the sprint settles.
   *
   * THE SUMMARY MUST NOT READ THE STORE LIVE. A gold run can be the third, which also opens the
   * next level - so a live read would make the summary's "רמה N" label and its tally change under
   * the child the moment the card appeared. Capturing it beside the outcome freezes the two.
   */
  const [earnedMedals, setEarnedMedals] = useState(progress.medals[playLevel]);

  const [run, setRun] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [tracks, setTracks] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'done'>('playing');
  const [secondsLeft, setSecondsLeft] = useState(SPRINT_SECONDS);
  /** True when the last sprint earned gold and promoted the player a level. */
  const [promoted, setPromoted] = useState(false);
  /**
   * The frozen outcome of the finished sprint.
   *
   * THE SUMMARY MUST NOT READ THE REFS LIVE. The refs are the synchronous truth
   * DURING play, but they are reset the moment a new sprint begins - so a summary
   * that read `scoreRef.current` at render time could show 0 if anything re-rendered
   * it after a restart had started. Capturing the numbers once, in the settle effect
   * that also awards the medal, makes the two consistent with each other and immune
   * to whatever renders next.
   */
  const [outcome, setOutcome] = useState<{
    score: number;
    tracks: number;
    bestStreak: number;
    mistakes: number;
    medal: MedalKind | null;
  } | null>(null);

  /** The current round, and the challenges before it so a repeat can be avoided. */
  const [round, setRound] = useState<BeatRound>(() => buildBeatRound(level));  const recent = useRef<BeatChallenge[]>([round.challenge]);

  /**
   * The key the player got wrong, held briefly for the wobble.
   *
   * Separate from the round's own state because it is pure presentation: the score
   * has already been settled by the time this is set, and it clears itself.
   */
  const [wrongKey, setWrongKey] = useState<number | null>(null);
  /**
   * The candidate BUTTON that was wrong, held briefly for the shake.
   *
   * Separate from `wrongKey` because the two are different things entirely: a wrong
   * key is a synthesizer key on the stage (indexed 0-4), while a wrong button is one
   * of the four launchpads below it. Sharing one index would shake the wrong element.
   */
  const [wrongButton, setWrongButton] = useState<number | null>(null);
  /**
   * The imposter's index once corrected, held WITH the round it belongs to.
   *
   * THE ROUND IS PART OF THE STATE, NOT DECORATION. `solved` used to be a bare index,
   * which is unsafe the moment the glow is allowed to outlive its own round: indices
   * repeat, so a stale `0` would light the first key of the NEXT sequence as if it
   * had been answered. Storing the round alongside the index makes "is this key
   * solved?" a question about THIS round, so the glow can be given time to fade
   * without ever leaking into a sequence that has not been played.
   */
  const [solved, setSolved] = useState<{ index: number; round: BeatRound } | null>(null);
  /** Which keys are mid-playback in the sound-wave sweep. */
  const [litKeys, setLitKeys] = useState<number[]>([]);
  /**
   * True once the round is answered, so a second answer cannot double-score it.
   *
   * ============================================================
   * THIS IS NOT AN INPUT LOCK, AND THE DIFFERENCE MATTERS.
   * ============================================================
   *
   * It used to be both: an answer set this flag and only `advance` cleared it, so
   * the child was frozen out for the whole celebration - the sweep, the arpeggio and
   * the inter-round gap, roughly a second per round. In a 45-second sprint that is
   * a second of the child's time spent on the game's animation, which is the
   * animation dictating the score rather than the maths.
   *
   * So the flag now guards ONLY against re-scoring the round in flight, and it is
   * released as soon as the next round is built. The celebration still plays in
   * full; it simply runs while the child is already free to read the next sequence.
   */
  const [answered, setAnswered] = useState(false);
  /**
   * The key currently sounding in the round PREVIEW.
   *
   * Held separately from `litKeys` because the two mean different things: the
   * preview is the game playing the melody TO the child, while the sweep is the
   * game confirming an answer. Only one can be in progress, and keeping them
   * separate states is what makes the preview's own visuals (a neon pulse, a
   * wobble, or an audible silence) expressible at all.
   */
  const [previewIndex, setPreviewIndex] = useState(-1);

  /*
   * SCORE AND STREAK ARE MIRRORED IN REFS. Scoring must read the CURRENT streak to
   * price the next answer, but React batches state updates - reading `streak`
   * inside a handler would see whatever it was when the handler was created. The
   * refs are the synchronous truth; the state is for rendering.
   */
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  /**
   * How many wrong answers in a row, including the current one.
   *
   * Reset by any correct answer, so the escalating penalty only charges for a
   * genuine run of mistakes rather than tallying every error in the sprint.
   */
  const mistakeRunRef = useRef(0);
  /**
   * Completed tracks, mirrored for the same reason as the score.
   *
   * Gold needs a track COUNT as well as a score, and the settling effect reads it
   * after the clock stops - by which point a state value would be one render stale.
   */
  const tracksRef = useRef(0);
  /** Best streak this sprint, mirrored for the frozen outcome. */
  const bestStreakRef = useRef(0);
  /** Mistake count this sprint, mirrored for the frozen outcome. */
  const mistakesRef = useRef(0);
  const deadlineRef = useRef(Date.now() + SPRINT_SECONDS * 1000);
  const timers = useRef<number[]>([]);
  /** Guards the end-of-sprint payout so it can only run once per sprint. */
  const settled = useRef(false);

  const after = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  /** Starts, or restarts, everything a fresh sprint needs. */
  const begin = useCallback(
    (level: number) => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
      // The settle guard must be released, or a second sprint in the same session
      // would never settle and the child would get no payout or medal.
      settled.current = false;
      scoreRef.current = 0;
      streakRef.current = 0;
      mistakeRunRef.current = 0;
      tracksRef.current = 0;
      bestStreakRef.current = 0;
      mistakesRef.current = 0;
      // Clearing the outcome here is what keeps the summary from briefly showing the
      // PREVIOUS sprint's totals on the first frame of a new one.
      setOutcome(null);
      setScore(0);
      setStreak(0);
      setTracks(0);
      setPromoted(false);
      setSecondsLeft(SPRINT_SECONDS);
      setWrongKey(null);
      setWrongButton(null);
      setSolved(null);
      setLitKeys([]);
      setPreviewIndex(-1);
      setAnswered(false);
      const first = buildBeatRound(level);
      recent.current = [first.challenge];
      setRound(first);
      deadlineRef.current = Date.now() + SPRINT_SECONDS * 1000;
      setPhase('playing');
      setRun((current) => current + 1);
    },
    [],
  );

  /**
   * Plays the round's melody to the child, in tempo.
   *
   * ============================================================
   * WHY THE PREVIEW IS SCHEDULED RATHER THAN PLAYED.
   * ============================================================
   *
   * The audio itself is scheduled on the audio clock inside `playPreview`, so the
   * NOTES never jitter. But the corresponding LIGHTS have to be driven by React
   * timers, because they are DOM state. The two are therefore driven side by side
   * from the same numbers - the same step duration, the same order - so a key lights
   * on the beat its note sounds.
   *
   * A muted key still advances the light sequence, showing the empty slot: the child
   * sees a gap where the note should be AND hears the silence, which is the whole
   * point of the missing-note challenge.
   */
  const playRoundPreview = useCallback(
    (target: BeatRound, stepMs = PREVIEW_STEP_MS) => {
      /*
       * ANY PREVIOUS PREVIEW IS CUT OFF FIRST. A round solved quickly would
       * otherwise leave its preview's later notes still scheduled, and they would
       * sound over the next round's melody.
       */
      audio.silence();
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];

      const mutedIndex =
        target.challenge === 'missing-note' ? target.targetIndex : -1;
      const detunedIndex = target.challenge === 'imposter' ? target.targetIndex : -1;

      audio.playPreview(target.tuning.frequencies, {
        mutedIndex,
        detunedIndex,
        stepMs,
      });

      /*
       * The lights walk the five keys in order. The imposter's slot is shown as a
       * wobbling red key rather than a lit one, matching the sour buzz it is playing.
       */
      for (let i = 0; i < KEY_COUNT; i += 1) {
        after(i * stepMs, () => setPreviewIndex(i));
      }
      after(KEY_COUNT * stepMs, () => setPreviewIndex(-1));
    },
    [audio],
  );

  /*
   * EVERY NEW ROUND ANNOUNCES ITSELF - BUT ONLY ONCE THE CHILD IS ACTUALLY PLAYING.
   *
   * Firing on `round` is what makes the preview automatic: `round` changes when the
   * sprint starts and after every answer, so each fresh sequence is played without
   * the child having to ask. It runs on a short delay so the previous round's victory
   * arpeggio has finished, and it is skipped once the sprint is over so the summary
   * is not scored by a melody nobody asked for.
   *
   * THE LAUNCH CARD IS A THIRD REASON TO STAY SILENT, and leaving it out was the bug.
   * `phase` starts at `'playing'` and the first `round` is dealt during the very first
   * render - which happens BEHIND the launch card, because the gate is a return
   * statement further down this component rather than something that stops the hooks
   * above it from running. So this effect fired on mount, 260ms later the studio
   * played the opening melody, and the child heard the game start over an intro screen
   * they had not yet dismissed.
   *
   * `chosenLevel` is the guard because it is the same value the card's gate reads:
   * null means the card is up, so there is nothing to announce. Keying on it also
   * makes the FIRST round play automatically the moment the child presses play,
   * because the effect re-runs when the guard flips - so nothing has to be re-primed
   * by hand at the gate.
   */
  useEffect(() => {
    if (phase !== 'playing' || chosenLevel === null) return;
    const id = window.setTimeout(() => playRoundPreview(round), 260);
    return () => window.clearTimeout(id);
  }, [round, phase, chosenLevel, playRoundPreview]);

  /** The 🔊 button: replay the same melody on demand. */
  const replayPreview = useCallback(() => {
    // A user gesture, so this is a reliable place to (re)unlock audio.
    audio.prime();
    if (phase !== 'playing') return;
    playRoundPreview(round);
  }, [audio, phase, round, playRoundPreview]);

  /* The sprint clock: a stored deadline, recomputed each tick. */
  useEffect(() => {
    if (phase !== 'playing') return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setPhase('done');
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [phase, run]);

  /* Settles the sprint exactly once, however the clock ran out. */
  useEffect(() => {
    if (phase !== 'done' || settled.current) return;
    settled.current = true;

    /*
     * THE SPRINT IS FROZEN HERE, IN ONE PLACE.
     *
     * The score, the track count, the medal and the promotion are read and stored
     * together, from the refs, at the single moment the clock stops. Reading them
     * separately at render time is what produced a summary showing "10 tracks,
     * streak x10" alongside a score of 0 - the refs had already been reset by the
     * time the summary rendered.
     */
    const finalScore = scoreRef.current;
    const finalTracks = tracksRef.current;
    const medal = medalForScore(finalScore, finalTracks);

    /*
     * PROGRESSION IS RECORDED AGAINST THE SHARED STATION, AND ONLY FOR GOLD.
     *
     * The old line here called `progress.awardGoldMedal()`, which owned both the medal count and
     * the four-level promotion ladder. That record is gone: `useStationProgress('music')` holds
     * the medals per level and opens the next level on the third one, so this call is the whole
     * of the wiring - and "did I promote?" now comes back from the store as `unlockedNext`
     * rather than being tracked here.
     *
     * NOTE THE ORDER: `recordGoldMedal` is called BEFORE `setOutcome`, so the summary's tally is
     * the count that includes this run's medal rather than the one before it.
     */
    const outcomeMedals =
      medal === 'gold' ? recordGoldMedal(playLevel).newMedals : progress.medals[playLevel];
    const didPromote =
      medal === 'gold' && getStationProgress('music').unlockedLevel > playLevel;
    setEarnedMedals(outcomeMedals);

    setOutcome({
      score: finalScore,
      tracks: finalTracks,
      bestStreak: bestStreakRef.current,
      mistakes: mistakesRef.current,
      medal,
    });
    // A promotion replaces the summary line, so it is held beside the outcome.
    setPromoted(didPromote);

    if (medal) audio.playMedalFanfare();
    else playTone('gentle');

    addCookies(COOKIE_PER_SPRINT + (medal ? COOKIE_PER_MEDAL * medalRank(medal) : 0));
    // Deliberately settled once on the frame the sprint ends; re-running on a
    // dependency change would settle the same round twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /**
   * Loads the next round.
   *
   * ============================================================
   * THE ROUND IS BUILT OUTSIDE THE STATE UPDATER, AND THAT IS THE BUG FIX.
   * ============================================================
   *
   * This used to generate the round INSIDE `setRound((current) => ...)`. That is
   * wrong for three compounding reasons, and together they are why only the tempo
   * challenge ever appeared:
   *
   *   1. REACT CALLS AN UPDATER MORE THAN ONCE. An updater function must be PURE -
   *      React may invoke it twice (StrictMode does, deliberately) or discard the
   *      result and retry. Calling `buildBeatRound` there means the round is
   *      generated once per invocation, and only the LAST invocation's result
   *      survives. The rounds that were generated and thrown away still consumed
   *      randomness.
   *
   *   2. THE MUTATION COMPOUNDED IT. `recent.current` was appended to inside the
   *      updater, so a double invocation pushed the challenge onto the history
   *      TWICE. The anti-repetition filter then always saw the same type as `last`
   *      and was forced to fall back to the unfiltered list - quietly disabling the
   *      very check that was meant to vary the challenges.
   *
   *   3. `void current` WAS THE TELL. The updater ignored the previous round
   *      entirely, so it was never really a reducer - it was a side effect wearing a
   *      reducer's clothes.
   *
   * Building the round in the timer callback instead makes every generation count
   * exactly once, and the history is appended in the same breath as the round that
   * produced it.
   */
  const advance = useCallback(
    (delayMs: number) => {
      after(delayMs, () => {
        setLitKeys([]);
        setWrongKey(null);
        setWrongButton(null);
        setAnswered(false);
        setPreviewIndex(-1);
        /*
         * `solved` IS DELIBERATELY NOT CLEARED HERE. The solved glow releases
         * itself on its own `SOLVED_FLASH_MS` timer, which is why it can still be
         * fading as the next round lands. Clearing it here would cut the glow at
         * whatever moment the round happened to change - and since the two timers
         * are nearly the same length, that made the flash visibly inconsistent from
         * round to round.
         */

        const next = buildBeatRound(playLevel, recent.current);
        recent.current = [...recent.current, next.challenge].slice(-RECENT_MEMORY);
        setRound(next);
      });
    },
    [playLevel],
  );

  /**
   * Scores a correct answer and plays the matching sound.
   *
   * ============================================================
   * THE CELEBRATION AND THE INPUT LOCK ARE SEPARATE CLOCKS.
   * ============================================================
   *
   * Three things happen when a child answers, and they used to all be tied to one
   * timer that also froze input:
   *
   *   1. THE RESOLVE - the key flips to `solved`, the corrected number appears, the
   *      neon glow lands. Budgeted at `RESOLVE_MS`.
   *   2. THE NEXT ROUND - built after the resolve plus a short gap, so the child
   *      never has to wait on an animation to see their next sequence.
   *   3. THE MUSIC - the sweep and the arpeggio, scheduled on the audio clock and
   *      allowed to ring on past the visual transition. Sound does not block input,
   *      so it is NOT budgeted against the 350ms: cutting the melody off mid-phrase
   *      to save milliseconds would cost the reward that makes the game worth
   *      playing, and buys nothing.
   *
   * The key insight is (3): an animation that only produces SOUND never needed to
   * gate the child at all. Only the DOM state does.
   */
  const succeed = useCallback(
    (litOrder: number[], resolveMs: number = RESOLVE_MS) => {
      setAnswered(true);
      scoreRef.current += pointsForTrack(streakRef.current);
      streakRef.current += 1;
      // A correct answer ends any run of mistakes, so the next slip is charged the
      // base rate again rather than continuing the escalation.
      mistakeRunRef.current = 0;
      setScore(scoreRef.current);
      setStreak(streakRef.current);
      bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
      tracksRef.current += 1;
      setTracks(tracksRef.current);

      /*
       * A CELEBRATION REPLACES THE PREVIEW, IT DOES NOT LAYER ON TOP OF IT.
       *
       * A child can answer before the preview has finished. Without this the round's
       * own melody would still be playing under the victory arpeggio, and the two
       * would muddy into noise - so the old preview is silenced first.
       */
      audio.silence();
      setPreviewIndex(-1);

      setLitKeys(litOrder);
      audio.playPitchRun(round.tuning.frequencies, SWEEP_MS);
      // The full five-note flourish on top of the sweep, so a solve always resolves
      // completely. It rings past the round change on purpose.
      after(litOrder.length * SWEEP_MS, () =>
        audio.playVictoryArpeggio(round.tuning.frequencies),
      );

      /*
       * THE SOLVED FLASH IS RELEASED ON ITS OWN TIMER, INDEPENDENT OF THE ROUND.
       *
       * `advance` also clears it, but if the next round arrives first the glow would
       * be cut off instantly by that clear. Letting the flash expire on its own
       * schedule means it always gets its full `SOLVED_FLASH_MS` of visibility while
       * never holding the round back.
       */
      after(SOLVED_FLASH_MS, () => setSolved(null));

      advance(resolveMs + ROUND_GAP_MS);
    },
    [audio, advance, round],
  );

  /**
   * Scores a mistake: the penalty, the reset, and the visual/sonic feedback.
   *
   * `surface` decides WHICH thing shakes, because the two are drawn in different
   * places. A wrong launchpad button shakes the button; a wrong synth key shakes the
   * key. Passing a bare index would shake whichever element happens to share it.
   */
  const fail = useCallback(
    (surface: { button?: number; key?: number }) => {
      setAnswered(true);
      /*
       * The penalty grows with each consecutive mistake, so a cluster of wrong
       * answers costs far more than one slip. The run counter resets on the next
       * correct answer, so a child who recovers is not punished twice.
       */
      mistakeRunRef.current += 1;
      scoreRef.current = applyMistake(scoreRef.current, mistakeRunRef.current);
      streakRef.current = 0;
      setScore(scoreRef.current);
      setStreak(0);
      mistakesRef.current += 1;

      if (surface.key !== undefined) setWrongKey(surface.key);
      if (surface.button !== undefined) setWrongButton(surface.button);

      /*
       * A WRONG BUTTON AND A WRONG KEY SOUND DIFFERENT.
       *
       * Only a wrong key costs the child their place in the melody, so the two
       * deserve distinguishable feedback: the button gets a short low thud, the
       * stage key gets the full sour chord.
       */
      if (surface.key !== undefined) audio.playMistakeBuzz(round.tuning.root);
      else audio.playWrongPick(round.tuning.root);

      /*
       * A WRONG ANSWER BRIEFLY FREEZES THE ROUND, AND ONLY FOR AS LONG AS THE SHAKE.
       *
       * The round is NOT discarded - the child sees the correct sequence and gets a
       * second attempt at the same track, so a wrong tap teaches rather than ends the
       * question. That second chance needs protecting for a moment, or a child could
       * tap four buttons in one gesture and score the round by elimination; the
       * escalating penalty prices it, and this window makes it physically deliberate.
       *
       * 640ms is the shake plus a beat. It used to be 900ms, which was long enough
       * that a child who spotted their error immediately had to sit and watch the
       * wobble finish - the game withholding a turn it had already granted.
       */
      after(FAIL_LOCKOUT_MS, () => {
        setWrongKey(null);
        setWrongButton(null);
        setAnswered(false);
      });
    },
    [audio, round],
  );

  /**
   * Challenge 1 & 3: a launchpad or tempo button was chosen.
   *
   * EVERY BUTTON SOUNDS BEFORE IT IS JUDGED, which is the difference between a quiz
   * and an instrument. A candidate button plays the scale pitch it was assigned, so
   * a wrong pick is heard as "that note was not in the melody" rather than as an
   * abstract rejection - and only then does the error sound follow.
   */
  const chooseAnswer = useCallback(
    (value: number, buttonIndex: number) => {
      // Everything below is a user gesture, so this is where audio gets unlocked.
      audio.prime();
      if (answered || phase !== 'playing') return;

      /*
       * THE BUTTON'S PITCH IS ITS OWN, NOT THE ANSWER'S.
       *
       * The tempo challenge has no melody to audition - its buttons are steps, not
       * notes - so only the missing-note launchpads are given a scale pitch. Mapping
       * a tempo button to a pitch would imply a musical meaning the option does not
       * have.
       */
      const candidatesSing = round.challenge === 'missing-note';
      if (candidatesSing) {
        audio.playCandidatePitch(pitchAt(round.tuning, buttonIndex));
      }

      const isCorrect =
        round.challenge === 'tempo' ? value === round.step : value === round.answer;

      if (!isCorrect) {
        fail({ button: buttonIndex });
        return;
      }

      if (round.challenge === 'tempo') {
        // A drum hit, then the keys pulse together - the run plays in sequence.
        audio.playDrumHit();
        succeed([0, 1, 2, 3, 4]);
        return;
      }

      /*
       * THE MISSING NOTE IS FILLED AND SOUNDED AT ONCE.
       *
       * The key appears on the stage showing the number it should have carried, and
       * sounds that note in the round's own key - the child hears the missing note
       * slot into place, and the five-note arpeggio then plays the whole phrase made
       * complete.
       *
       * Both happen on this frame rather than in sequence. The corrected number IS
       * the answer, and delaying it behind a note would make a child who answered
       * instantly wait to find out whether they were right.
       */
      setSolved({ index: round.targetIndex, round });
      audio.playPitch(pitchAt(round.tuning, round.targetIndex));
      succeed([0, 1, 2, 3, 4]);
    },
    [answered, phase, round, audio, fail, succeed],
  );

  /**
   * Challenge 2: the imposter key itself was tapped on the stage.
   *
   * Tapping a key is always audible, whatever the challenge - the stage is an
   * instrument and never punishes curiosity. What differs is what the pitch means:
   * during the imposter round the planted key SOUNDS its detuned buzz while the
   * other four sound clean, so the ear alone can find the offender.
   */
  const tapKey = useCallback(
    (index: number) => {
      audio.prime();
      if (answered || phase !== 'playing') return;

      if (round.challenge !== 'imposter') {
        audio.playPitch(pitchAt(round.tuning, index));
        return;
      }

      if (index !== round.targetIndex) {
        /*
         * A CLEAN KEY. It sounds its own pitch first - the stage is an instrument and
         * a tap should always make its note - and only then is the mistake scored.
         *
         * The penalty STAYS even though this is a "search". Without it, a child could
         * tap all five keys in turn and always find the imposter at no cost, which
         * would remove the challenge entirely. Hearing the clean pitch before the
         * penalty is what makes it a lesson rather than a rebuff: the contrast
         * between this in-tune note and the buzzing one is the answer.
         */
        audio.playPitch(pitchAt(round.tuning, index));
        fail({ key: index });
        return;
      }
      /*
       * THE OFFENDING KEY IS TAPPED. It has been buzzing since the preview; now the
       * detuned note is stated once on its own, resolved into the correct harmonic
       * pitch, and the whole melody is played back in tune. That sequence - hear the
       * wrong note, hear it fixed, hear the phrase made right - is the reward.
       *
       * THE VISUAL RESOLVE IS IMMEDIATE, THE AUDIO TELLS THE STORY. The number flips
       * to the right value on the very first frame, because that is the answer the
       * child just earned. The buzz and the fix chord are scheduled as sound only -
       * they play over each other in a tight 130ms, and the arpeggio rings out while
       * the next round is already on screen. Nothing here holds the round back.
       */
      const correctFrequency = pitchAt(round.tuning, index);
      setSolved({ index, round });
      audio.playDetunedBuzz(correctFrequency);
      /*
       * The fix chord lands ON TOP of the tail of the buzz rather than after it, so
       * the "wrong then right" contrast is heard as one gesture. Waiting for the
       * buzz to finish would have made the correction a separate event - and cost
       * 300ms of the child's sprint to say something the overlap says better.
       */
      after(130, () =>
        audio.playFixChord(imposterFrequency(correctFrequency), correctFrequency),
      );
      succeed([0, 1, 2, 3, 4]);
    },
    [answered, phase, round, audio, succeed, fail],
  );

  const urgent = secondsLeft <= 10 && phase === 'playing';
  const tier = BEAT_TIERS[clampLevel(playLevel) - 1]!;

  /**
   * The visual state of each key, derived in one place.
   *
   * A key can be lit, wrong, missing or solved at the same time in principle;
   * ordering these checks is what makes the outcome deterministic. `wrong` wins
   * over everything (the child must see which key they got wrong), then the
   * PREVIEW, then the answer sweep, then the round's own hiding.
   *
   * The preview is checked before the sweep because the two are never meant to run
   * together - but if a child answers mid-preview, the preview's key should not
   * linger lit once the celebration has taken over.
   */
  const keyStates = useMemo<KeyState[]>(
    () =>
      Array.from({ length: KEY_COUNT }, (_, i) => {
        if (wrongKey === i) return 'wrong';
        if (previewIndex === i) {
          /*
           * DURING THE PREVIEW THE IMPOSTER WOBBLES RED AND THE MUZZLED KEY SHOWS
           * ITS `?`. This is what makes the preview legible without sound: a child
           * who cannot hear, or is playing with audio disabled, still sees which key
           * is out of tune and where the gap is.
           */
          if (round.challenge === 'imposter' && i === round.targetIndex) return 'wrong';
          if (round.challenge === 'missing-note' && i === round.targetIndex) return 'missing';
          return 'lit';
        }
        if (litKeys.includes(i)) return 'lit';
        /*
         * THE SOLVED GLOW IS TIED TO THE ROUND IT RESOLVED.
         *
         * `solved` is an index plus a round, and indices repeat across rounds - so a
         * stale solved index would light a key in the NEXT round that was never
         * answered. Comparing the round as well means the glow survives its own
         * round's transition (which is the point of giving it a timer) and vanishes
         * the instant a different round is on the stage.
         */
        if (solved && solved.index === i && solved.round === round) return 'solved';
        if (round.challenge === 'missing-note' && i === round.targetIndex && !answered) {
          return 'missing';
        }
        return 'idle';
      }),
    [wrongKey, previewIndex, litKeys, solved, round, answered],
  );

  /** The number on each key: `?` for a hidden term, or the term itself. */
  const keyValues = useMemo<(number | null)[]>(
    () =>
      Array.from({ length: KEY_COUNT }, (_, i) => {
        if (round.challenge === 'missing-note' && i === round.targetIndex && !answered) {
          return null;
        }
        // Once an imposter is fixed, its key shows the correct number.
        if (round.challenge === 'imposter' && i === round.targetIndex && solved?.round === round) {
          return round.answer;
        }
        const value = round.terms[i];
        return value === undefined || Number.isNaN(value) ? null : value;
      }),
    [round, answered, solved],
  );

  /*
   * THE STUDIO IS SILENT WHILE THE LAUNCH CARD IS UP, AND THAT IS ENFORCED HERE RATHER THAN PROMISED.
   *
   * The context is module-scoped and shared, so a voice scheduled by anything else - a previous visit to
   * the studio whose preview was still ringing when the card came back up - would otherwise play on over
   * the intro. Silencing while the card is visible makes "no sound before the child begins" a property of
   * this gate rather than something every current and future caller has to keep.
   *
   * THIS EFFECT MUST STAY ABOVE EVERY `return`. It was previously written just above the card's own gate,
   * which reads naturally but is a hook-order violation: the sandbox and summary returns sit between the
   * other hooks and this one, so a render that took either of those paths ran one FEWER hook than the
   * playing render, and React threw "Rendered fewer hooks than expected". The card still cannot show
   * sound - the effect runs on every render regardless of which branch returns, and `chosenLevel` is null
   * for exactly the renders that show it.
   */
  useEffect(() => {
    if (chosenLevel === null) audio.silence();
  }, [chosenLevel, audio]);

  if (mode === 'sandbox') {
    /*
     * THE SANDBOX OWNS ITS ENTIRE SCREEN, INCLUDING THE MODE TOGGLE.
     *
     * Handing over the whole tree rather than nesting it inside the sprint's chrome
     * keeps the two from having to agree on a layout: the sprint's header shows a
     * clock and a score, neither of which exists here, and the sandbox's header shows
     * a cookie bank and a melody progress, neither of which the sprint has. Two
     * headers is simpler than one header with a mode flag in every line.
     */
    return <FreePlayStudio onClose={onClose} onSwitchMode={() => setMode('sprint')} />;
  }

  if (phase === 'done') {
    /*
     * The summary renders from the FROZEN outcome, not from live state. If the
     * outcome has not been captured yet (the settle effect has not run), show the
     * live refs so there is never an empty frame.
     */
    return (
      <RoundSummary
        score={outcome?.score ?? scoreRef.current}
        medal={outcome?.medal ?? medalForScore(scoreRef.current, tracksRef.current)}
        bestStreak={outcome?.bestStreak ?? bestStreakRef.current}
        tracks={outcome?.tracks ?? tracksRef.current}
        mistakes={outcome?.mistakes ?? mistakesRef.current}
        promoted={promoted}
        level={playLevel}
        goldMedals={earnedMedals}
        onRestart={() => begin(playLevel)}
        onLeave={onClose}
      />
    );
  }

  /*
   * THE LAUNCH CARD GATES THE WHOLE STUDIO, INCLUDING THE SANDBOX.
   *
   * Placed after the other returns so it is the LAST thing checked: closing a finished sprint back
   * to `phase === 'playing'` must not resurrect the card, and that ordering is what guarantees it.
   *
   * THIS RETURN MUST STAY BELOW EVERY HOOK. The silencing effect above used to live here, right before
   * this gate, which is the natural place to read but a hook-order violation - the sandbox and summary
   * returns sit between the other hooks and this spot, so taking either of those paths skipped the
   * effect's hook slot. See the note on the effect itself.
   *
   * Sitting this late costs nothing: the audio engine builds its `AudioContext` lazily on the first note,
   * so mounting it behind a card that plays no sound creates nothing to suspend.
   */
  if (chosenLevel === null) {
    return <GameLaunchModal meta="music" onStart={setChosenLevel} onClose={onClose} />;
  }

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="אולפן המקצבים"
      onClick={onClose}
      className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        /* The dark studio, with magenta and cyan spotlights bleeding in. */
        className="relative flex h-[92vh] w-full max-w-2xl animate-[rise_.2s_ease-out] flex-col overflow-hidden rounded-t-3xl border-4 border-fuchsia-500/40 bg-slate-950 shadow-[0_0_60px_rgba(217,70,239,0.25)] sm:h-[86vh] sm:rounded-3xl"
      >
        {/* The ambient stage lighting. Purely decorative, so it is inert. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-600/25 blur-[90px]" />
          <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan-500/20 blur-[100px]" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-fuchsia-900/30 to-transparent" />
        </div>

        {/* ---------------------------------------------------- slim top bar */}
        <header className="relative z-10 flex shrink-0 items-center gap-1.5 border-b border-fuchsia-500/20 px-3 py-2">
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-fuchsia-500/25 px-2.5 py-1 text-xs font-black text-fuchsia-100">
            רמה {playLevel}
            <span className="opacity-60">|</span>
            <span className="tabular-nums">
              {MEDAL_EMOJI.gold} {earnedMedals}/{GOLD_MEDALS_PER_LEVEL}
            </span>
          </span>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-cyan-500/20 px-2.5 py-1 text-xs font-black text-cyan-100">
              <Music className="h-3.5 w-3.5" strokeWidth={3} />
              <span className="tabular-nums">{tracks}</span> שירים
            </span>
            <span
              className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black tabular-nums transition-colors ${
                streak > 0 ? 'bg-amber-400 text-amber-950' : 'bg-slate-700/70 text-slate-300'
              }`}
            >
              <Zap className="h-3.5 w-3.5" strokeWidth={3} />x{streak}
            </span>
            <Equalizer streak={streak} />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/25 px-2.5 py-1 text-xs font-black tabular-nums text-emerald-100">
              <Trophy className="h-3.5 w-3.5" strokeWidth={3} />
              {score}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-black tabular-nums transition-colors ${
                urgent
                  ? 'bg-rose-500 text-white motion-safe:animate-[pulseLock_1s_ease-in-out_infinite]'
                  : 'bg-slate-800 text-slate-100'
              }`}
            >
              ⏱ {secondsLeft}s
            </span>
            {/*
              The way into the sandbox. Sits beside the close button because it is the
              other "leave this game" affordance, and keeping it on the same line stops
              the header from wrapping to a second row on a narrow screen.

              STYLED AS A HUB RATHER THAN A HEADER CONTROL. It used to be a muted cyan pill that
              read as another piece of chrome, which buried the one door out of the timed sprint
              and into free creation. The violet-to-fuchsia gradient, the luminous ring and the
              heavier ring/shadow are what make it read as a destination: it is the only saturated,
              glowing element in a header of flat slate readouts, so the eye lands on it first.
              The icon and label are a step larger than the neighbouring pills for the same reason.
            */}
            <button
              type="button"
              onClick={() => setMode('sandbox')}
              aria-label="אולפן ניגונים - יצירה חופשית"
              className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-sm font-black text-white ring-2 ring-fuchsia-400/50 shadow-lg shadow-purple-900/40 transition hover:from-violet-500 hover:to-fuchsia-500 active:translate-y-[2px]"
            >
              <span aria-hidden className="text-base leading-none">
                🎹
              </span>
              ניגונים
            </button>
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

        {/* ------------------------------------------------------- the stage */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-4">
          {/* The banner for the current challenge. */}
          <p className="rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/15 px-4 py-2 text-center text-base font-black text-fuchsia-100 md:text-lg">
            {round.prompt}
          </p>

          {/* The tempo readout doubles as the answer echo once solved. */}
          <div className="flex items-center justify-center gap-2">
            <p className="text-xs font-black tabular-nums text-cyan-200/80">
              {round.challenge === 'tempo'
                ? round.descending
                  ? '🎼 שיר יורד'
                  : '🎼 שיר עולה'
                : `🎼 ${round.descending ? 'יורד' : 'עולה'} בקצב קבוע`}
            </p>
            {/*
              The key of the track, named. It is shown because the whole point of
              transposing every round is that the child can hear the difference -
              and a visible label turns "this sounds different" into "this is a
              different scale", which is the musical fact worth learning.
            */}
            <span className="rounded-full bg-slate-800/70 px-2 py-0.5 text-[11px] font-black text-slate-300">
              {round.tuning.scale.label} · {Math.round(round.tuning.root)}Hz
            </span>
            {/* The replay control, for a child who wants to hear it once more. */}
            <button
              type="button"
              onClick={replayPreview}
              aria-label="נגן שוב"
              className="flex items-center gap-1 rounded-full border border-cyan-400/50 bg-cyan-500/20 px-2.5 py-1 text-[11px] font-black text-cyan-100 transition hover:bg-cyan-500/35 active:translate-y-[2px]"
            >
              <Volume2 className="h-3.5 w-3.5" strokeWidth={3} />
              נגן שוב
            </button>
          </div>

          {/* --------------------------------- the synthesizer, centre stage */}
          <div className="flex items-center justify-center gap-2 md:gap-3">
            {Array.from({ length: KEY_COUNT }, (_, i) => (
              <NeonKey
                key={i}
                index={i}
                value={keyValues[i] ?? null}
                state={keyStates[i] ?? 'idle'}
                /*
                 * EVERY KEY IS TAPPABLE NOW. The stage is an instrument: a tap should
                 * always make the note it belongs to. During the imposter round the
                 * imposter itself sounds its detuned buzz, which is the clue; during
                 * the others the keys simply play their own pitch.
                 */
                onPress={() => tapKey(i)}
                label={
                  keyValues[i] === null || keyValues[i] === undefined
                    ? `קליד ${i + 1}, חסר`
                    : `קליד ${i + 1}, מספר ${keyValues[i]}`
                }
              />
            ))}
          </div>

          {/* ------------------------------------------- the answer controls */}
          {round.challenge === 'imposter' ? (
            <p className="rounded-full bg-slate-800/70 px-3 py-1.5 text-xs font-bold text-slate-300">
              הקישו ישירות על הקליד המזייף 🎹
            </p>
          ) : (
            <div className="grid w-full max-w-lg grid-cols-4 gap-2">
              {round.choices.map((choice, index) => (
                <button
                  key={`${choice}-${index}`}
                  type="button"
                  onClick={() => chooseAnswer(choice, index)}
                  disabled={answered}
                  /* The spec's glowing drum launchpad. */
                  className={`rounded-2xl border-2 py-3 text-xl font-black tabular-nums transition-all duration-200 md:text-2xl ${
                    wrongButton === index
                      ? 'animate-[shake_.4s_ease-in-out] border-rose-400 bg-rose-700/70 text-white'
                      : round.challenge === 'tempo'
                        ? 'border-cyan-400/60 bg-cyan-950/60 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.35)] hover:bg-cyan-900/60'
                        : 'border-fuchsia-400/60 bg-fuchsia-950/60 text-fuchsia-100 shadow-[0_0_14px_rgba(217,70,239,0.35)] hover:bg-fuchsia-900/60'
                  } active:translate-y-[3px] disabled:opacity-40`}
                >
                  {round.challenge === 'tempo' ? `[ ${describeStep(choice)} ]` : choice}
                </button>
              ))}
            </div>
          )}

          {/* The tier's name, so progress is visible without leaving the game. */}
          <p className="text-[11px] font-bold text-slate-500">
            {tier.title} · {tier.steps.map((s) => `+${s}`).join(' / ')}
            {tier.allowDescending ? ' / יורד' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

/** 1 for bronze, 2 for silver, 3 for gold - used to scale the cookie payout. */
function medalRank(medal: MedalKind): number {
  return medal === 'gold' ? 3 : medal === 'silver' ? 2 : 1;
}

/** The end-of-sprint screen: the medal, the numbers, and one tap to go again. */
function RoundSummary({
  score,
  medal,
  bestStreak,
  tracks,
  mistakes,
  promoted,
  level,
  goldMedals,
  onRestart,
  onLeave,
}: {
  score: number;
  medal: MedalKind | null;
  bestStreak: number;
  tracks: number;
  mistakes: number;
  promoted: boolean;
  level: StationLevel;
  goldMedals: number;
  onRestart: () => void;
  onLeave: () => void;
}) {
  /*
   * THERE IS NO "MAX LEVEL" ANY MORE. The station has exactly three levels and the shared record
   * says which are open, so the summary no longer has to know whether level 4 exists - it reports
   * the rung the child is on and lets the launch card show the ladder.
   */
  const nextTitle =
    level < 3 ? `רמה ${clampLevel(level + 1)}: ${BEAT_TIERS[clampLevel(level + 1) - 1]!.title}` : '';

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="אולפן המקצבים - סיכום"
      className="fixed inset-0 z-[75] grid place-items-center bg-slate-950/95 p-4"
    >
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <p className="text-5xl motion-safe:animate-[popBounce_.5s_ease-out]">
          {medal ? MEDAL_EMOJI[medal] : '🎹'}
        </p>
        <p className="text-3xl font-black text-white">{score} נקודות</p>
        <p className="text-sm font-black text-slate-300">
          {medal
            ? `מדליית ${MEDAL_LABEL[medal]}! השלמתם ${tracks} שירים`
            : `השלמתם ${tracks} שירים - עוד קצת למדליית ארד!`}
        </p>

        {/*
          When the score cleared gold but the track count did not, say so plainly.
          Otherwise a child who scored 2,450 and received silver would reasonably
          think the game was broken - the gate has to be visible to be fair.
        */}
        {!medal || medal !== 'gold'
          ? score >= MEDAL_THRESHOLD.gold && (
              <p className="rounded-xl border border-amber-400/50 bg-amber-500/15 px-3 py-2 text-xs font-black text-amber-100">
                הניקוד מספיק לזהב! צריך עוד {tracksShortOfGold(tracks)} שירים שלמים בלי טעויות 🎯
              </p>
            )
          : null}

        <div className="flex flex-wrap justify-center gap-2">
          {bestStreak > 0 && (
            <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-black text-amber-200">
              הרצף הארוך ביותר: x{bestStreak} 🔥
            </span>
          )}
          <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-black text-rose-200">
            טעויות: {mistakes}
          </span>
        </div>

        {/* The station ladder, beside this sprint's medal: the same 3-medal counter the level
            picker reads, so a gold run visibly moves the child toward the next level. */}
        <MedalCounter earned={goldMedals} level={level} tone="light" />

        {promoted ? (
          <p className="rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-3 py-2 text-sm font-black text-emerald-100">
            🎉 שלוש מדליות זהב! נפתחה רמה {Math.min(3, level + 1)}
            {level + 1 <= BEAT_TIERS.length ? `: ${BEAT_TIERS[clampLevel(level) - 1]!.title}` : ''}
          </p>
        ) : (
          <p className="text-xs font-bold text-slate-400">
            {level >= 3
              ? `אספתם ${goldMedals}/${GOLD_MEDALS_PER_LEVEL} מדליות זהב ברמה ${level} 👑`
              : medal === 'gold'
                ? `מדליית זהב לרמה ${level}: ${goldMedals}/${GOLD_MEDALS_PER_LEVEL}`
                : `מדליית זהב לרמה ${level} פותחת את ${nextTitle || 'הרמה הבאה'}`}
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={onRestart}
            className="rounded-2xl border-b-4 border-fuchsia-700 bg-fuchsia-500 px-4 py-2.5 text-sm font-black text-white transition hover:brightness-110 active:translate-y-[3px] active:border-b-0"
          >
            ספרינט נוסף ⏱
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-2xl border-b-4 border-slate-600 bg-slate-700 px-4 py-2.5 text-sm font-black text-slate-100 transition hover:brightness-110 active:translate-y-[3px] active:border-b-0"
          >
            יציאה מהאולפן
          </button>
        </div>
      </div>
    </div>
  );
}
