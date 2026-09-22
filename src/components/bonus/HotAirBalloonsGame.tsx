/**
 * "כדורים מתעתעים" / Hot Air Balloons: a 30-second Stroop arcade sprint.
 *
 * TWO STREAMS, AND THE PLAYER MUST PICK ONE. Two balloons float side by side;
 * one carries a bigger envelope, the other a bigger digit, and they are made to
 * disagree most of the time. The banner says which of the two the player must
 * read, and that rule is the entire game - answering on autopilot means losing.
 *
 * THE PROMPT IS A MODE COLOUR, NOT JUST TEXT. Reading a sentence costs more time
 * than a glance at a colour, and an arcade sprinter has well under a second. The
 * banner's cyan and amber are the primary channel; the words are there to explain
 * the colours the first few times. This is why the banner changes HUE rather than
 * swapping one line of Hebrew for another.
 *
 * NOTHING HERE IS ALLOWED TO LAG THE SCREEN. The next pair is dealt in the same
 * handler that grades the answer, and the memorisation-free design means there is
 * no state to settle first. The old version had a `solved` gate plus a "next
 * round" button; both were removed because a sprint cannot afford a confirmation
 * tap, and because a gate that survives one render is enough to swallow a key.
 *
 * KEYBOARD: ArrowLeft and ArrowRight answer, and the listener is attached once per
 * session with an empty-ish dependency list. It reads the live answer handler
 * through a ref so a stale closure can never grade against a balloon that has
 * already been replaced.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import {
  balloonLevelSpec,
  buildBalloonRound,
  rollSessionTask,
  TASK_META,
  taskForItem,
  type BalloonTask,
  type StationLevel,
} from './bonusRounds';
import skyBackdrop from '../../assets/island/sky.png';
import BalloonArt from './BalloonArt';
import {
  altitudeForStreak,
  COOKIE_PER_MEDAL,
  COOKIE_PER_SESSION,
  GOLD_MEDALS_PER_TIER,
  MEDAL_EMOJI,
  MEDAL_LABEL,
  MEDAL_THRESHOLDS,
  medalForScore,
  medalRank,
  pointsForCorrect,
  POINTS_WRONG,
  useBalloonProgress,
  type MedalKind,
} from './useBalloonProgress';

/** Length of a session. */
const SESSION_SECONDS = 30;

interface HotAirBalloonsProps {
  /**
   * The rung chosen on the launch card: 1, 2 or 3.
   *
   * OPTIONAL, defaulting to 1, so the tier-driven caller and any older call site keep working. The
   * level decides the digit gap, the size spread, the conflict rate and the pace - see
   * `balloonLevelSpec`.
   */
  level?: StationLevel;
  onSolved: () => void;
  onClose: () => void;
}

export default function HotAirBalloonsGame({ level = 1, onSolved, onClose }: HotAirBalloonsProps) {
  const { addCookies } = useGame();
  const feedback = useAnswerFeedback();
  const progress = useBalloonProgress();

  /*
   * THE LEVEL, NOT THE TIER, DRIVES THE PAIR.
   *
   * `spec` is read once per level and carries the mark duration, so the pace quickens with the rung
   * without the component having to branch on the level anywhere else.
   */
  const spec = useMemo(() => balloonLevelSpec(level), [level]);
  const markMs = spec.markMs;

  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [session, setSession] = useState<'playing' | 'done'>('playing');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [item, setItem] = useState(0);
  const [mark, setMark] = useState<{ side: 'left' | 'right'; ok: boolean } | null>(null);
  const [flash, setFlash] = useState(0);
  const [promoted, setPromoted] = useState(false);
  /**
   * The fixed task for the session, rolled once on mount.
   *
   * ROLLED FOR LEVELS 1 AND 2, RE-ROLLED PER ITEM AT LEVEL 3. `taskForItem` decides which of those
   * happens from the LEVEL now rather than the tier: level 1 and 2 hold the rule steady (level 2 swaps
   * every five items so it stays predictable, per `taskForItem`), and only level 3 changes it on every
   * single pair. That is the "multi-round fast challenge" the brief asks for, and it is also why
   * `tierOneTask` is a poor name for a level-driven value - it is kept only because `taskForItem` reads
   * the module slot it seeds.
   */
  const [tierOneTask] = useState<BalloonTask>(() => rollSessionTask());

  const task = useMemo(
    () => taskForItem(level, item),
    [level, item, tierOneTask],
  );

  const round = useMemo(() => {
    void item;
    // The DISPLAYED task is passed in, so the balloons are built to be graded
    // against the very prompt on screen. Letting this build its own task is how
    // the game ends up marking correct answers wrong.
    return buildBalloonRound(task, level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, level, task]);

  /* ------------------------------- clocks ------------------------------- */

  useEffect(() => {
    if (session !== 'playing') return;
    const deadline = Date.now() + SESSION_SECONDS * 1000;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setSession('done');
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [session]);

  /** Clears the green/red marking. Tracked so unmount cannot leak a timer. */
  const markTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (markTimer.current !== null) window.clearTimeout(markTimer.current);
    },
    [],
  );

  /* ----------------------------- evaluation ----------------------------- */

  const streakRef = useRef(0);
  const playingRef = useRef(true);
  playingRef.current = session === 'playing';

  const answer = useCallback(
    (side: 'left' | 'right') => {
      if (!playingRef.current) return;
      const balloon = round.balloons.find((b) => b.side === side);
      if (!balloon) return;
      const ok = balloon.correct;

      // The next pair is dealt HERE, synchronously with the grading, so the new
      // balloons are already painted by the time this render commits. Waiting for
      // a timeout to advance is what makes a sprint feel like it stutters.
      setItem((value) => value + 1);
      setMark({ side, ok });

      if (ok) {
        const earned = pointsForCorrect(streakRef.current);
        streakRef.current += 1;
        setScore((value) => value + earned);
        setStreak(streakRef.current);
        // A tiny sparkle on every hit, not the full confetti: this fires several
        // times a second at sprint pace, and `celebrate()` builds a canvas burst.
        feedback(true);
      } else {
        streakRef.current = 0;
        setStreak(0);
        setScore((value) => Math.max(0, value - POINTS_WRONG));
        // The border flash is the only per-miss animation: it is cheap, and at
        // this speed a heavier one would still be running under the next pair.
        setFlash((value) => value + 1);
        feedback(false);
      }

      if (markTimer.current !== null) window.clearTimeout(markTimer.current);
      markTimer.current = window.setTimeout(() => setMark(null), markMs);
    },
    [feedback, round, markMs],
  );

  /**
   * Keyboard: one listener for the session.
   *
   * `answer` is read through a ref because it is rebuilt on every item (it closes
   * over the current round). Re-subscribing on every item would add and remove a
   * window listener several times a second, and any keystroke landing in the gap
   * between remove and add would be dropped - which at this speed is a real miss.
   */
  const answerRef = useRef(answer);
  answerRef.current = answer;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        answerRef.current('left');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        answerRef.current('right');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ------------------------------ session end ------------------------------ */

  const settled = useRef(false);
  useEffect(() => {
    if (session !== 'done' || settled.current) return;
    settled.current = true;
    if (medalForScore(score) === 'gold') {
      setPromoted(progress.awardGoldMedal());
      feedback.celebrate();
    }
    /*
     * A FLAT, TIERED PAYOUT - NOT A FRACTION OF THE SCORE.
     *
     * This used to be `Math.round(score / 60)`, which was wrong at both ends: a gold run
     * paid 30 cookies while a near-miss paid 20, so the skill gradient was worth almost
     * nothing, and a poor run rounded away to literally zero cookies for three minutes of
     * play. Paying the shared base plus a per-tier bonus (the same 10/+4 shape every other
     * timed game uses) makes finishing worth something and a medal worth more, which is
     * what the brief's economy describes.
     */
    const sessionMedal = medalForScore(score);
    addCookies(COOKIE_PER_SESSION + (sessionMedal ? COOKIE_PER_MEDAL * medalRank(sessionMedal) : 0));
    onSolved();
    // Must read `score` and `progress` at the moment the clock expires; it must
    // not re-run when their identities change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const restart = () => {
    if (markTimer.current !== null) window.clearTimeout(markTimer.current);
    settled.current = false;
    streakRef.current = 0;
    setSecondsLeft(SESSION_SECONDS);
    setScore(0);
    setStreak(0);
    setItem(0);
    setMark(null);
    setPromoted(false);
    setSession('playing');
  };

  const medal = medalForScore(score);
  const urgent = secondsLeft <= 10 && session === 'playing';
  const meta = TASK_META[task];
  const isSizeTask = task === 'size';

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl">
      {/* The island's own sky, full-bleed. `object-cover` so it fills any aspect. */}
      <img
        src={skyBackdrop}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* One-shot red edge flash on a miss - cheaper than animating the sky. */}
      {flash > 0 && (
        <div
          key={flash}
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-rose-500/25 motion-safe:animate-[burstFade_.4s_ease-out_forwards]"
        />
      )}

      <div dir="rtl" className="relative flex h-full min-h-0 flex-col gap-1.5 p-2">
        {/*
          ONE slim bar: level and medals, task, streak, score, clock, exit.

          THE MIDDLE CELL IS THE PROMPT, AND IT IS A QUIET PILL NOW rather than the wide saturated
          banner it used to be. The banner was fuchsia or cyan at full opacity and spanned the modal,
          which made it the brightest object on screen - competing with the balloons for exactly the
          attention the game is trying to direct at them. The prompt is a supporting cue, not the
          subject, so it is now a small tinted pill that states the task without shouting it.
        */}
        <header className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black text-sky-950 shadow-sm backdrop-blur-sm">
            רמה {level}
            <span className="text-sky-900/30">|</span>
            <span className="tabular-nums">
              {MEDAL_EMOJI.gold} {progress.goldMedals}/{GOLD_MEDALS_PER_TIER}
            </span>
          </span>

          {/*
            THE PROMPT PILL. `mx-auto` centres it in the remaining space between the level chip and
            the score cluster, so the bar stays a single row and the eye can find the task without
            scanning. The tint still distinguishes the two tasks (cyan = size, amber = number) because
            the colour is the fastest channel at this speed - but at a much lower saturation than
            before, so it reads as a label rather than a warning.
          */}
          <span
            className={`mx-auto flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black shadow-sm ring-1 backdrop-blur-sm transition-colors ${
              isSizeTask
                ? 'bg-cyan-50/90 text-cyan-900 ring-cyan-300/60'
                : 'bg-amber-50/90 text-amber-900 ring-amber-300/60'
            }`}
          >
            {meta.icon} {meta.title}
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-black tabular-nums shadow-sm backdrop-blur-sm transition ${
              streak > 0 ? 'bg-amber-300/90 text-amber-950' : 'bg-white/70 text-sky-900/40'
            }`}
          >
            🔥 x{streak}
          </span>

          <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black tabular-nums text-sky-950 shadow-sm backdrop-blur-sm">
            🏆 {score}
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-black tabular-nums shadow-sm backdrop-blur-sm transition-colors ${
              urgent
                ? 'bg-rose-500/90 text-white motion-safe:animate-[pulseLock_1s_ease-in-out_infinite]'
                : 'bg-white/70 text-sky-950'
            }`}
          >
            ⏱ {secondsLeft}s
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/70 text-sky-950 shadow-sm backdrop-blur-sm transition hover:bg-white active:scale-90"
          >
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        </header>

        {session === 'playing' ? (
          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            {/* The mode hint, in small quiet type under the pill's colour cue. */}
            <p className="shrink-0 text-center text-[11px] font-bold text-sky-900/70 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
              {meta.hint}
            </p>

            {/* Balloons and the altitude meter share the stage. */}
            <div className="relative flex min-h-0 flex-1 flex-col">
              <AltitudeMeter altitude={altitudeForStreak(streak)} />
              <div className="flex min-h-0 flex-1 items-end justify-center gap-4 pb-2 sm:gap-10">
                {round.balloons.map((balloon) => (
                  <BalloonButton
                    key={balloon.side}
                    side={balloon.side}
                    digit={balloon.digit}
                    scale={balloonScaleFor(balloon.size)}
                    marked={mark?.side === balloon.side ? mark.ok : null}
                    emphasizeDigit={!isSizeTask}
                    onPick={answer}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Summary
            score={score}
            medal={medal}
            promoted={promoted}
            tier={progress.tier}
            goldMedals={progress.goldMedals}
            atMaxTier={progress.atMaxTier}
            onRestart={restart}
            onLeave={onClose}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Tailwind width for each size rank.
 *
 * WIDTHS ONLY, NO HEIGHTS, AND THAT IS DELIBERATE. `BalloonArt` sets its own `aspect-ratio` from the
 * artwork, so its height is derived - a `h-*` class here would fight the aspect ratio and either
 * letterbox the balloon or squash it, which would corrupt the very size comparison the game grades on.
 * Letting the width drive everything keeps the four ranks in exact ratio at every breakpoint.
 *
 * The steps are wider apart than the old pixel pairs because the crop removed ~66% of transparent
 * canvas: what used to look like a 40px difference between ranks now reads as the same visible
 * separation in a much smaller footprint, which is what lets two balloons share a phone screen.
 */
function balloonScaleFor(size: 'xs' | 'small' | 'large' | 'xl'): string {
  switch (size) {
    case 'xs':
      return 'w-16 sm:w-24';
    case 'small':
      return 'w-20 sm:w-32';
    case 'large':
      return 'w-28 sm:w-44';
    case 'xl':
      return 'w-36 sm:w-56';
  }
}

/**
 * One tappable balloon.
 *
 * DIRECT CLICK, NO ARROW BUTTONS. The balloons were previously flanked by small arrow controls, which
 * added a second, unlabelled target for a child who had already decided which balloon to hit - and at
 * sprint speed that is a wasted reach on every single item. The whole balloon IS the button: the tap
 * target is the full envelope and basket, so a child aiming at a balloon never has to hit a glyph.
 *
 * `aria-label` carries the digit and the side in words, because the digit is now painted text inside a
 * span rather than real text content of a button.
 *
 * THE SIZE CLASSES LIVE ON THE BUTTON, NOT ON THE ART. `BalloonArt` fills its parent, so the button's
 * box is what decides how big the balloon renders - which is what keeps the rank ratios meaningful.
 * The sizes are chosen so the visible BALLOON (not its padded canvas) differs by the intended ratio,
 * which is only possible now that the art is cropped.
 *
 * NO FLOATING ANIMATION. `hover:animate-float` was removed with the arrows: an envelope that drifts
 * under the cursor is harder to hit precisely, and at this pace the hover state was never visible
 * anyway on the touch devices this is mostly played on.
 */
function BalloonButton({
  side,
  digit,
  scale,
  marked,
  emphasizeDigit,
  onPick,
}: {
  side: 'left' | 'right';
  digit: number;
  scale: string;
  marked: boolean | null;
  emphasizeDigit: boolean;
  onPick: (side: 'left' | 'right') => void;
}) {
  const sideLabel = side === 'left' ? 'שמאל' : 'ימין';
  return (
    <button
      type="button"
      onClick={() => onPick(side)}
      aria-label={`כדור ${sideLabel}, הספרה ${digit}`}
      className={`group relative grid shrink-0 place-items-center rounded-3xl p-1 transition active:scale-95 ${scale} ${
        marked === true ? 'scale-105 bg-emerald-400/40 ring-4 ring-emerald-400' : ''
      } ${marked === false ? 'bg-rose-500/30 ring-4 ring-rose-500' : ''}`}
    >
      <BalloonArt digit={digit} hit={marked === true} miss={marked === false} emphasizeDigit={emphasizeDigit} />
    </button>
  );
}

/**
 * The altitude meter: a vertical track with a miniature balloon climbing it.
 *
 * The streak is drawn as HEIGHT, so a miss is watched rather than read: the
 * balloon drops. The golden clouds at the crown only light up at full climb, which
 * gives the player a target that is not a number.
 */
function AltitudeMeter({ altitude }: { altitude: number }) {
  const atTop = altitude >= 1;
  return (
    <div className="pointer-events-none absolute end-1 top-0 bottom-0 flex w-9 flex-col items-center">
      {/* Golden clouds, crowning the track. */}
      <span
        aria-hidden
        className={`text-lg leading-none ${
          atTop ? 'motion-safe:animate-[goldGlow_2.4s_ease-in-out_infinite]' : 'opacity-70'
        }`}
      >
        ☁️
      </span>
      <span className="mb-0.5 text-[8px] font-black text-amber-700/80">ענני הזהב</span>

      <div className="relative w-2.5 flex-1 rounded-full bg-white/60 shadow-inner ring-1 ring-sky-900/10">
        {/* The climb reached so far. */}
        <div
          className="absolute bottom-0 w-full rounded-full bg-gradient-to-t from-amber-400 to-amber-200 transition-[height] duration-200 ease-out"
          style={{ height: `${altitude * 100}%` }}
        />
        {/* The miniature balloon, riding the top of the climb. */}
        <span
          aria-hidden
          className="absolute -end-1.5 text-base leading-none drop-shadow transition-[bottom] duration-200 ease-out motion-safe:animate-[riseNudge_.4s_ease-out]"
          style={{ bottom: `calc(${altitude * 100}% - 8px)` }}
        >
          🎈
        </span>
      </div>
    </div>
  );
}

/** The end-of-session screen: medal, score, and one tap to go again. */
function Summary({
  score,
  medal,
  promoted,
  tier,
  goldMedals,
  atMaxTier,
  onRestart,
  onLeave,
}: {
  score: number;
  medal: MedalKind | null;
  promoted: boolean;
  tier: number;
  goldMedals: number;
  atMaxTier: boolean;
  onRestart: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 rounded-2xl bg-white/55 text-center backdrop-blur-sm">
      <p className="text-5xl motion-safe:animate-[popBounce_.5s_ease-out]">
        {medal ? MEDAL_EMOJI[medal] : '🎈'}
      </p>
      <p className="text-xl font-black text-sky-950">
        {medal ? `מדליית ${MEDAL_LABEL[medal]}!` : 'הסתיים הזמן!'}
      </p>
      <p className="text-sm font-black tabular-nums text-amber-700">🏆 {score} נקודות</p>

      {promoted ? (
        <p className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black text-white shadow-[0_3px_0_#047857]">
          🎉 שלוש מדליות זהב! עליתם לרמה {tier}
        </p>
      ) : (
        <p className="px-4 text-xs font-bold text-sky-900/70">
          {atMaxTier
            ? `אספתם ${goldMedals}/${GOLD_MEDALS_PER_TIER} מדליות זהב ברמה ${tier} 👑`
            : medal === 'gold'
              ? `מדליית זהב נוספת לרמה ${tier}: ${goldMedals}/${GOLD_MEDALS_PER_TIER}`
              : `עוד ${MEDAL_THRESHOLDS.gold - score} נקודות למדליית זהב 🥇`}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-amber-950 shadow-[0_3px_0_#b45309] transition hover:brightness-105 active:translate-y-[3px] active:shadow-none"
        >
          סבב נוסף ⏱
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="rounded-xl bg-white/80 px-4 py-2 text-sm font-black text-sky-900 transition hover:bg-white active:translate-y-[3px]"
        >
          סיום
        </button>
      </div>
    </div>
  );
}

/**
 * Drifting clouds.
 *
 * Drawn from a fixed table rather than generated, because each cloud needs its own
 * duration and negative delay to avoid a visible shared rhythm - and a negative
 * delay is what starts them mid-flight so the sky is already populated on mount
 * instead of drifting in from emptiness.
 *
 * ================================================================================================
 * THE CLOUD LAYER IS GONE, AND THE SKY ASSET IS WHY
 * ================================================================================================
 *
 * `Clouds` drew six drifting emoji over a CSS gradient. `src/assets/island/sky.png` now supplies a real
 * painted sky as the backdrop, and the two layers actively fought each other: the emoji were rendered
 * at a heavy blur in a flat white, which reads as a rendering fault on top of artwork that already has
 * painted clouds of its own.
 *
 * Removing it also removes a whole animation budget that was competing with the thing being tested.
 * Six independently drifting elements at 38-66 second durations are exactly the kind of low-level
 * motion that pulls the eye off a static pair of balloons - and in a Stroop task, the eye's fixation on
 * the digit is the entire resource being exercised. A still, painted sky is the better backdrop for
 * that than a moving one.
 */
