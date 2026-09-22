/**
 * "מרכז המטען: משלוח אקספרס" - the cargo hub's 30-second weight-packing sprint.
 *
 * The child reads a manifest for a target weight, loads crates until the truck weighs
 * exactly that, and dispatches it. Load too little and it is refused; load too much and
 * the truck sags and refuses to leave.
 *
 * ===================================================================
 * WHAT WAS REMOVED, AND WHY IT IS THE POINT OF THE REWRITE.
 * ===================================================================
 *
 * The previous version displayed a live "300 / 750 ק״ג" counter and a progress bar.
 * That converts the exercise into colour matching: the child loads crates until the
 * bar turns green and never adds anything. Since the skill being taught IS the
 * addition, the counter had to go.
 *
 * What replaced it is feedback that carries no answer:
 *
 *   - the crates' own sizes, proportional to their weight
 *   - the chassis sinking on its springs as the load grows
 *   - a tilt and an alert when the load is over
 *
 * A child can read "heavy" from all three without ever being told a number, so the sum
 * stays in their head where the practice happens.
 *
 * ===================================================================
 * THE CLOCK IS A DEADLINE, NOT A COUNTER.
 * ===================================================================
 *
 * `setInterval` is throttled to about 1Hz in a backgrounded tab, so a child who tabs
 * away for twenty seconds would come back to a clock that only lost one. Storing an
 * absolute deadline and recomputing the remainder makes the clock always tell the
 * truth, however long the tab slept.
 *
 * ===================================================================
 * THE SCORE IS MIRRORED IN REFS.
 * ===================================================================
 *
 * Scoring must read the CURRENT streak to price the next dispatch, but React batches
 * state updates - reading `streak` inside a handler would see whatever it was when the
 * handler was created. The refs are the synchronous truth; the state is for rendering.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PackageCheck, Trophy, X, Zap } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import CrateShelf from './CrateShelf';
import TruckBed from './TruckBed';
import { useCargoAudio } from './truckAudio';
import {
  CAB_ORDER,
  buildTruckRound,
  cargoTier,
  loadedWeight,
  slotsLeft,
  type CabColor,
  type TruckRound,
} from './truckRounds';
import {
  COOKIE_PER_MEDAL,
  COOKIE_PER_SPRINT,
  GOLD_MEDALS_PER_LEVEL,
  MEDAL_EMOJI,
  MEDAL_LABEL,
  MEDAL_THRESHOLD,
  SPRINT_SECONDS,
  applyMistake,
  medalForScore,
  medalRank,
  pointsForDispatch,
  type MedalKind,
} from './truckSprint';
import { useStationProgress, getStationProgress, type StationLevel } from '../../features/progression/useStationProgress';
import { MedalCounter } from '../../features/progression/ProgressionChrome';

/**
 * How long the drive-off animation holds before the next delivery is dealt.
 *
 * The truck must actually LEAVE before a new one arrives, or the child never sees the
 * consequence of the dispatch. 520ms covers the 500ms slide plus a frame, so the new
 * truck is dealt the instant the old one clears the frame.
 */
const DEPART_MS = 520;

/**
 * How long each truck spends gliding in from the right edge.
 *
 * MATCHED TO THE WRAPPER'S 500ms TRANSFORM, for the same reason `DEPART_MS` is: the release
 * must not fire while the motion is still in flight, or the truck would visibly snap to its
 * parked position mid-slide. The extra frame lets the transition actually start before the
 * destination state changes.
 */
const ARRIVE_MS = 520;

/**
 * How long the mistake feedback holds before input is returned.
 *
 * Covers the tilt animation and the buzzer, so the child cannot tap through the
 * rejection and pretend it did not happen - while still returning control well inside
 * a second, because in a 30-second sprint a long freeze is a punishment in itself.
 */
const MISTAKE_LOCK_MS = 700;

/** How many of the most recent deliveries to remember, to vary destinations. */
const RECENT_MEMORY = 3;

export default function TruckGame({
  onDelivered,
  onClose,
  level = 1,
}: {
  onDelivered: () => void;
  /** Closes the district, used by the summary's "back to the depot" button. */
  onClose: () => void;
  /**
   * The station level chosen on the launch card.
   *
   * DEFAULTS TO 1 SO THE DISTRICT SHELL STILL COMPILES, and the district always supplies the
   * child's real choice. It REPLACES THE OLD FOUR-LEVEL LADDER: `useCargoProgress` used to own
   * both the level and its medal count, and that record is now the shared one - so the level
   * arrives as a prop and only the medals live in the store.
   *
   * IT DOES NOT RETUNE THE GAME. The cargo rounds and their difficulty tiers are still chosen
   * from `buildTruckRound(level)` exactly as before; what changed is that `level` is now 1-3
   * rather than 1-4, and that a gold run is credited to the station's shared medal record.
   */
  level?: StationLevel;
}) {
  const { addCookies } = useGame();
  const audio = useCargoAudio();
  const { progress, recordGoldMedal } = useStationProgress('trucks');

  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'done'>('playing');
  const [secondsLeft, setSecondsLeft] = useState(SPRINT_SECONDS);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [trucks, setTrucks] = useState(0);
  const [loadedIds, setLoadedIds] = useState<string[]>([]);
  /** True when the load exceeds the target, which tilts the truck and blocks dispatch. */
  const [overloaded, setOverloaded] = useState(false);
  /** A short message under the manifest - the only text the game volunteers. */
  const [notice, setNotice] = useState<string | null>(null);
  const [departing, setDeparting] = useState(false);
  /**
   * True while the freshly dealt truck is still off-stage to the right, gliding in.
   *
   * THE ENTRANCE IS THE PARENT'S TO TIME, NOT THE CHILD'S TO SKIP. It starts true and is
   * released one frame after the round is dealt, so the delivery always visibly arrives
   * before the bay is handed over. Left true it would simply park the truck offscreen and
   * the game would look broken, so the release is scheduled rather than conditional on
   * anything the child does.
   */
  const [arriving, setArriving] = useState(true);
  /**
   * Counts crates loaded, purely so each landing can fire one exhaust puff.
   *
   * A COUNTER RATHER THAN A FLAG. The child loads several crates per round, and a boolean
   * would puff once and then have nothing left to change on the next landing - the effect
   * would work for the first crate and silently stop.
   */
  const [loadPulse, setLoadPulse] = useState(0);
  const [promoted, setPromoted] = useState(false);
  /** Which cab colour the current truck wears, cycled on every dispatch. */
  const [cabIndex, setCabIndex] = useState(0);
  /** True while the mistake shake plays, which blocks input briefly. */
  const [locked, setLocked] = useState(false);
  /**
   * The frozen outcome of the finished sprint.
   *
   * THE SUMMARY MUST NOT READ THE REFS LIVE. The refs are the synchronous truth DURING
   * play, but they are reset the moment a new sprint begins - so a summary that read
   * `scoreRef.current` at render time could show 0 if anything re-rendered it after a
   * restart had started. Capturing the numbers once, in the settle effect that also
   * awards the medal, makes the two consistent and immune to whatever renders next.
   */
  const [outcome, setOutcome] = useState<{
    score: number;
    trucks: number;
    bestStreak: number;
    mistakes: number;
    medal: MedalKind | null;
  } | null>(null);

  const [order, setOrder] = useState<TruckRound>(() => buildTruckRound(level));
  const recent = useRef<string[]>([order.destination]);

  /**
   * Gold medals banked at `level`, snapshotted when the sprint settles.
   *
   * THE SUMMARY MUST NOT READ THE STORE LIVE. A gold run can be the third, which also opens the
   * next level - so a live read would make the summary's "רמה N" label and its medal tally change
   * under the child the moment the card appeared. Capturing the outcome beside the score freezes
   * the two together, exactly as `outcome` freezes the rest of the run's numbers.
   */
  const [earnedMedals, setEarnedMedals] = useState(progress.medals[level]);

  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const trucksRef = useRef(0);
  const bestStreakRef = useRef(0);
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

  const loaded = useMemo(
    () => order.crates.filter((crate) => loadedIds.includes(crate.id)),
    [order, loadedIds],
  );
  const totalWeight = useMemo(() => loadedWeight(loaded), [loaded]);
  const remaining = slotsLeft(order.bedSlots, loaded.length);
  const bedFull = remaining !== null && remaining === 0;

  /**
   * True whenever the loaded weight is exactly the target, which lights the headlight beam.
   *
   * DERIVED FROM THE WEIGHT RATHER THAN SET ON AN EVENT, and that is what makes the beam
   * honest: it is on precisely while the answer is correct, and it goes dark the instant a
   * crate is unloaded or an extra one is added. An event with a timeout - which is what this
   * was - lights the lamp for a fixed window regardless of what the child does next, so it
   * would still be glowing over a load that no longer matched.
   *
   * The equality is strict on purpose. A load that has overshot the target is not a correct
   * answer, so it must not be celebrated on its way past - only landing exactly on it is.
   */
  const targetHit = totalWeight === order.targetWeight;

  /** Starts, or restarts, everything a fresh sprint needs. */
  const begin = useCallback((level: number) => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    // The settle guard must be released, or a second sprint in the same session would
    // never settle and the child would get no payout or medal.
    settled.current = false;
    scoreRef.current = 0;
    streakRef.current = 0;
    trucksRef.current = 0;
    bestStreakRef.current = 0;
    mistakesRef.current = 0;
    // Clearing the outcome here is what keeps the summary from briefly showing the
    // PREVIOUS sprint's totals on the first frame of a new one.
    setOutcome(null);
    setScore(0);
    setStreak(0);
    setTrucks(0);
    setPromoted(false);
    setSecondsLeft(SPRINT_SECONDS);
    setLoadedIds([]);
    setOverloaded(false);
    setNotice(null);
    setDeparting(false);
    setLocked(false);
    setCabIndex(0);
    const first = buildTruckRound(level);
    recent.current = [first.destination];
    setOrder(first);
    deadlineRef.current = Date.now() + SPRINT_SECONDS * 1000;
    setPhase('playing');
    setRun((current) => current + 1);
  }, []);

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

  /*
   * THE DRIVE-IN. Each new round parks the truck offscreen right and then releases it, so
   * every delivery arrives the same way rather than appearing already parked.
   *
   * KEYED ON `run` AND `trucks` - the sprint and the dispatch count, which together change
   * exactly when a new delivery is dealt. `TruckRound` carries no id of its own, so the
   * dispatch counter is the round's identity here. `ARRIVE_MS` is matched to the wrapper's
   * 500ms transform so the truck is released only once it has finished gliding in.
   */
  useEffect(() => {
    if (phase !== 'playing') return undefined;
    setArriving(true);
    const id = window.setTimeout(() => setArriving(false), ARRIVE_MS);
    return () => window.clearTimeout(id);
  }, [phase, run, trucks]);

  /* Settles the sprint exactly once, however the clock ran out. */
  useEffect(() => {
    if (phase !== 'done' || settled.current) return;
    settled.current = true;

    /*
     * THE SPRINT IS FROZEN HERE, IN ONE PLACE. The score, the truck count, the medal
     * and the promotion are read and stored together, from the refs, at the single
     * moment the clock stops - so the summary can never show a score from one instant
     * beside a track count from another.
     */
    const finalScore = scoreRef.current;
    const finalTrucks = trucksRef.current;
    const medal = medalForScore(finalScore);

    /*
     * PROGRESSION IS RECORDED AGAINST THE SHARED STATION, AND ONLY FOR GOLD.
     *
     * The old line here called `progress.awardGoldMedal()`, which owned both the medal count and
     * the four-level promotion ladder. That record is gone: `useStationProgress('trucks')` holds
     * the medals per level and opens the next level on the third one, so this call is the whole
     * of the wiring - the "did I promote?" question now comes back from the store as
     * `unlockedNext` rather than being tracked here.
     *
     * Silver, bronze and a medal-less sprint record nothing, matching the farm stations.
     */
    const outcomeMedals =
      medal === 'gold' ? recordGoldMedal(level).newMedals : progress.medals[level];
    const didPromote = medal === 'gold' && getStationProgress('trucks').unlockedLevel > level;
    setEarnedMedals(outcomeMedals);

    setOutcome({
      score: finalScore,
      trucks: finalTrucks,
      bestStreak: bestStreakRef.current,
      mistakes: mistakesRef.current,
      medal,
    });
    setPromoted(didPromote);

    audio.playMedalFanfare(medal);
    addCookies(COOKIE_PER_SPRINT + (medal ? COOKIE_PER_MEDAL * medalRank(medal) : 0));
    // Deliberately settled once on the frame the sprint ends; re-running on a
    // dependency change would settle the same round twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /**
   * Deals the next delivery.
   *
   * The truck is built OUTSIDE the state updater rather than inside `setOrder(...)`.
   * React may invoke an updater function more than once - StrictMode does this
   * deliberately - so generating a round in there produces several rounds and keeps
   * only the last, while any history appended as a side effect is recorded twice. That
   * is precisely the bug that silently disabled the Beat Studio's challenge rotation,
   * and the same shape would collapse this game's destination variety.
   */
  const nextDelivery = useCallback(
    (delayMs: number) => {
      after(delayMs, () => {
        setLoadedIds([]);
        setOverloaded(false);
        setNotice(null);
        setDeparting(false);
        setLocked(false);
        setCabIndex((i) => (i + 1) % CAB_ORDER.length);

        const next = buildTruckRound(level);
        recent.current = [...recent.current, next.destination].slice(-RECENT_MEMORY);
        setOrder(next);
      });
    },
    [level],
  );

  /**
   * A successful dispatch: score it, then drive the truck away.
   *
   * THE ANIMATION AND THE NEXT ROUND ARE ONE SEQUENCE. The truck leaves, and the
   * replacement is dealt the moment it has cleared the frame - so the child always
   * sees the outcome of what they did before being handed the next manifest. Deferring
   * the score until the animation finished would let a fast child start loading the
   * next truck while the score had not yet updated, which reads as the game ignoring
   * them.
   */
  const dispatch = useCallback(() => {
    scoreRef.current += pointsForDispatch(streakRef.current);
    streakRef.current += 1;
    trucksRef.current += 1;
    bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
    setScore(scoreRef.current);
    setStreak(streakRef.current);
    setTrucks(trucksRef.current);

    setDeparting(true);
    audio.playDispatch();
    onDelivered();
    nextDelivery(DEPART_MS);
  }, [audio, nextDelivery, onDelivered]);

  /** A rejected dispatch: score the penalty and shake the truck. */
  const reject = useCallback(
    (message: string) => {
      scoreRef.current = applyMistake(scoreRef.current);
      streakRef.current = 0;
      mistakesRef.current += 1;
      setScore(scoreRef.current);
      setStreak(0);
      setNotice(message);
      setLocked(true);
      audio.playBuzzer();
      after(MISTAKE_LOCK_MS, () => setLocked(false));
    },
    [audio],
  );

  const load = useCallback(
    (crateId: string) => {
      audio.prime();
      if (locked || departing || phase !== 'playing') return;
      if (loadedIds.includes(crateId)) return;

      // The bed cap is enforced here as well as visually, because the shelf's disabled
      // state is a hint rather than a guarantee - a double tap could otherwise slip two
      // crates into one remaining slot.
      if (remaining !== null && remaining <= 0) return;

      const crate = order.crates.find((c) => c.id === crateId);
      if (!crate) return;

      const nextIds = [...loadedIds, crateId];
      const nextWeight = totalWeight + crate.weight;
      setLoadedIds(nextIds);
      setNotice(null);
      audio.playCrateLoad();
      setLoadPulse((n) => n + 1);

      /*
       * THE BEAM IS NOT SWITCHED HERE. It is derived from the weight a few lines above, so
       * it lights the moment this crate lands and goes dark if the child changes their mind -
       * no event, no timeout, and nothing to keep in sync with the cargo.
       */

      /*
       * OVERLOAD IS DETECTED ON LOAD, NOT ON DISPATCH.
       *
       * The brief asks for the truck to sag and tilt the moment it is too heavy, and
       * that timing is the whole teaching moment: the child sees the consequence
       * attached to the specific crate that broke the budget, while they can still
       * remember which one it was. Checking only at dispatch would tell them they were
       * over without telling them WHEN.
       */
      const over = nextWeight > order.targetWeight;
      setOverloaded(over);
      if (over) {
        audio.playOverloadAlert();
        setNotice('משקל יתר! פרקו ארגז');
      }
    },
    [
      loadedIds,
      totalWeight,
      order,
      remaining,
      locked,
      departing,
      phase,
      audio,
    ],
  );

  const unload = useCallback(
    (crateId: string) => {
      audio.prime();
      if (departing || phase !== 'playing') return;
      // Unloading stays available while locked: the lockout exists to make a rejection
      // register, and refusing to let the child FIX the problem during it would be
      // punishing them for the game's own delay.
      const crate = order.crates.find((c) => c.id === crateId);
      setLoadedIds((current) => current.filter((id) => id !== crateId));
      audio.playCrateUnload();
      if (crate) {
        const nextWeight = totalWeight - crate.weight;
        setOverloaded(nextWeight > order.targetWeight);
      }
      setNotice(null);
    },
    [order, totalWeight, departing, phase, audio],
  );

  /** The dispatch button. */
  const submit = useCallback(() => {
    audio.prime();
    if (locked || departing || phase !== 'playing') return;

    if (totalWeight < order.targetWeight) {
      /*
       * THE SHORTFALL IS NOT STATED. Saying "missing 150kg" would hand the child the
       * subtraction they were meant to do - and worse, it would tell them exactly how
       * much to add, turning the remaining work into a single lookup. A bare refusal
       * makes them re-examine their own sum, which is the skill.
       */
      reject('המשאית קלה מדי - חסר מטען');
      return;
    }
    if (totalWeight > order.targetWeight) {
      // The overload case is already visible on the truck; this is the same message so
      // the two entry points agree.
      reject('משקל יתר! פרקו ארגז');
      return;
    }

    dispatch();
  }, [locked, departing, phase, totalWeight, order, reject, dispatch, audio]);

  /**
   * The cab-tap easter egg. Deliberately unguarded by `locked` or `departing`: it changes
   * nothing about the game, so blocking it during a mistake lockout would only teach the
   * child that the truck is sometimes broken.
   */
  const honk = useCallback(() => {
    audio.prime();
    audio.playHorn();
  }, [audio]);

  const urgent = secondsLeft <= 10 && phase === 'playing';  const tier = cargoTier(level);
  const cabColor: CabColor = CAB_ORDER[cabIndex % CAB_ORDER.length]!;

  if (phase === 'done') {
    return (
      <RoundSummary
        score={outcome?.score ?? scoreRef.current}
        medal={outcome?.medal ?? medalForScore(scoreRef.current)}
        bestStreak={outcome?.bestStreak ?? bestStreakRef.current}
        trucks={outcome?.trucks ?? trucksRef.current}
        mistakes={outcome?.mistakes ?? mistakesRef.current}
        promoted={promoted}
        level={level}
        goldMedals={earnedMedals}
        onRestart={() => begin(level)}
        onLeave={onClose}
      />
    );
  }

  return (
    <div dir="rtl" className="flex h-full flex-col gap-2">
      {/*
        ONE SLIM HUD BAR, CARRYING ONLY RUN-STATE.

        The manifest used to live here, squeezed into `text-[12px]` between the badges -
        which made the single most important number in the game the smallest thing on
        screen, and hid it behind a `truncate` besides. It has moved to a full-size ticket
        sitting directly above the truck (see the stage below). What is left here is the
        running state the child glances at: level, medals, deliveries, score and clock.

        The counters lost their `flex-1` spacer with the manifest's departure, so the bar
        is now two tight groups with the free space pushed between them - left group at the
        start edge, right group at the end, and no element stretched to fill.
      */}
      <header className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-amber-300/40 bg-amber-950/60 px-2.5 py-1.5">
        {/*
          THE BADGES CARRY ARIA LABELS, AND THAT IS NOT DECORATION. Every figure in this
          bar is an emoji followed by a number, which means a screen reader announces
          "truck emoji zero" and a test has to guess which glyph sits beside which digit.
          An explicit label states the figure in words, which fixes both.
        */}
        <span
          aria-label={`רמה ${level}, ${earnedMedals} מתוך ${GOLD_MEDALS_PER_LEVEL} מדליות זהב`}
          className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/25 px-2.5 py-1 text-[11px] font-black text-amber-100"
        >
          רמה {level}
          <span aria-hidden className="opacity-60">
            |
          </span>
          <span aria-hidden className="tabular-nums">
            {MEDAL_EMOJI.gold} {earnedMedals}/{GOLD_MEDALS_PER_LEVEL}
          </span>
        </span>

        <span
          aria-label={`${trucks} משאיות נשלחו`}
          className="flex shrink-0 items-center gap-1 rounded-full bg-sky-500/20 px-2.5 py-1 text-[11px] font-black tabular-nums text-sky-100"
        >
          <span aria-hidden>🚚</span>
          <span data-testid="cargo-trucks">{trucks}</span>
        </span>

        <span
          aria-label={`רצף ${streak}`}
          className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black tabular-nums transition-colors ${
            streak > 0 ? 'bg-amber-400 text-amber-950' : 'bg-slate-700/70 text-slate-300'
          }`}
        >
          <Zap className="h-3 w-3" strokeWidth={3} aria-hidden />x
          <span data-testid="cargo-streak">{streak}</span>
        </span>

        {/* The spacer: the whole of the bar's free space, so the two groups sit at
            opposite edges without either being stretched. */}
        <div className="min-w-0 flex-1" />

        <span
          aria-label={`${score} נקודות`}
          className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/25 px-2.5 py-1 text-[11px] font-black tabular-nums text-emerald-100"
        >
          <Trophy className="h-3 w-3" strokeWidth={3} aria-hidden />
          <span data-testid="cargo-score">{score}</span>
        </span>

        <span
          aria-label={`נשארו ${secondsLeft} שניות`}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black tabular-nums transition-colors ${
            urgent
              ? 'bg-rose-500 text-white motion-safe:animate-[pulseLock_1s_ease-in-out_infinite]'
              : 'bg-slate-800 text-slate-100'
          }`}
        >
          <span aria-hidden>⏱ </span>
          <span data-testid="cargo-timer">{secondsLeft}</span>
          <span aria-hidden>s</span>
        </span>

        {/*
          THE SINGLE EXIT BUTTON. The district shell's own corner ✕ is suppressed for this
          district, so this is the only one the child ever sees - placed with the figures
          they are actually watching rather than at the far edge of the panel.
        */}
        <button
          type="button"
          onClick={onClose}
          aria-label="יציאה מהמשמרת"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-700/80 text-slate-200 transition hover:bg-rose-500 hover:text-white active:scale-95"
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </button>
      </header>

      {/* -------------------------------------------------- the truck stage */}
      {/*
        A WARM LOADING DOCK RATHER THAN A DARK VOID.

        The previous stage was a slate-900 panel, which made the illustrated truck look
        like it was parked in a night-time void with no relationship to the warehouse
        below it. A light warm surface reads as the same daylight dock as the crate shelf,
        and it lets the truck's own drop-shadow do the grounding instead of a heavy
        background.
      */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-50/80 to-amber-100/50 p-4">
        {/*
          THE TIER'S OWN RULE, KEPT HERE NOW THAT THE MANIFEST CARD IS GONE.

          Level 3 caps the bed at three or four crates, and with the dashed placeholder
          slots removed from the deck this corner label is the only place that cap is
          stated. Without it the child would hit an invisible wall on the tier designed to
          teach planning. It shows for no other tier, so it never becomes decoration.
        */}
        {order.bedSlots !== null && (
          <p className="absolute right-3 top-2 z-30 rounded-full bg-amber-900/70 px-2.5 py-1 text-[11px] font-black text-amber-100">
            🚧 עד {order.bedSlots} ארגזים במשאית
          </p>
        )}

        {/*
          THE DISPATCH TICKET.

          This is the game's central question - how much does this truck have to weigh -
          and it now gets the size to match, sitting in the open air of the loading dock
          directly above the flatbed it refers to. The weight is rendered in the largest
          type on the screen (`text-2xl`) and the destination in the second largest, so the
          two facts the child is working from are the two things the eye lands on first.

          `select-none` stops a drag across the card from highlighting the numbers, which
          on a tap-driven game is otherwise a constant low-grade annoyance.
        */}
        <div className="mb-2 flex justify-center">
          <div
            data-testid="cargo-manifest"
            aria-label={`הזמנה דחופה אל ${order.destination}, משקל יעד ${order.targetWeight} קילו בדיוק`}
            className="flex select-none items-center gap-4 rounded-2xl border-2 border-amber-400 bg-amber-100/95 px-6 py-2 shadow-md"
          >
            <div aria-hidden className="text-2xl">
              📋
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-amber-800">
                הזמנה דחופה אל:{' '}
                <span className="font-black text-amber-950">{order.destination}</span>
              </div>
              <div className="text-xl font-black tracking-wide text-amber-950 sm:text-2xl">
                משקל יעד:{' '}
                <span className="tabular-nums text-emerald-700 underline decoration-amber-400 decoration-2">
                  {order.targetWeight} ק״ג
                </span>{' '}
                בדיוק!
              </div>
            </div>
          </div>
        </div>

        <TruckBed
          loaded={loaded}
          bedSlots={order.bedSlots}
          overloaded={overloaded}
          onUnload={unload}
          departing={departing}
          arriving={arriving}
          targetHit={targetHit}
          loadPulse={loadPulse}
          onHonk={honk}
          cabColor={cabColor}
          totalWeight={totalWeight}
          targetWeight={order.targetWeight}
        />

        {/*
          THE ALERT CHIP IS THE BRIEF'S OWN WORDING, verbatim: "משקל יתר! פרקו ארגז".
          It appears inside the stage, next to the sagging truck, so the message and
          the thing it describes are in one glance.
        */}
        {notice && (
          <p
            className={`mt-2 rounded-xl px-3 py-1.5 text-center text-xs font-black ${
              overloaded
                ? 'bg-rose-500/25 text-rose-100'
                : 'bg-amber-500/25 text-amber-100'
            }`}
          >
            {overloaded ? '⚠️ ' : ''}
            {notice}
          </p>
        )}
      </div>

      {/* -------------------------------------------------- the warehouse */}
      <CrateShelf
        crates={order.crates}
        loadedIds={loadedIds}
        disabled={locked || departing}
        bedFull={bedFull}
        slotsRemaining={remaining}
        onLoad={load}
      />

      {/* ------------------------------------------------------- dispatch */}
      <button
        type="button"
        onClick={submit}
        disabled={overloaded || locked || departing}
        className="shrink-0 rounded-2xl bg-emerald-500 px-8 py-3 text-lg font-black text-white shadow-lg transition-transform hover:bg-emerald-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:opacity-60"
      >
        שגר משאית! 🚚💨
      </button>

      <p className="shrink-0 text-center text-[10px] font-bold text-amber-200/70">
        {tier.title} · {tier.blurb}
      </p>
    </div>
  );
}

/** The end-of-sprint screen: the medal, the numbers, and one tap to go again. */
function RoundSummary({
  score,
  medal,
  bestStreak,
  trucks,
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
  trucks: number;
  mistakes: number;
  promoted: boolean;
  level: StationLevel;
  goldMedals: number;
  onRestart: () => void;
  onLeave: () => void;
}) {
  /*
   * THERE IS NO "MAX LEVEL" ANY MORE. The station has exactly three levels and the shared
   * record says which are open, so the summary no longer has to know whether level 4 exists -
   * it reports the rung the child is on and lets the launch card show the ladder.
   */
  const nextTitle = level < 3 ? cargoTier(level + 1).title : '';

  return (
    <div dir="rtl" className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
      <span aria-hidden className="text-6xl">
        {medal ? MEDAL_EMOJI[medal] : '📦'}
      </span>

      {medal ? (
        <p className="text-2xl font-black text-white">
          מדליית {MEDAL_LABEL[medal]}!
        </p>
      ) : (
        <p className="text-2xl font-black text-white">המשמרת נגמרה</p>
      )}

      {/* The station ladder, beside this sprint's medal: the same 3-medal counter the level
          picker reads, so a gold run visibly moves the child toward the next level. */}
      <MedalCounter earned={goldMedals} level={level} tone="light" />

      <p className="text-3xl font-black tabular-nums text-emerald-200">{score} נקודות</p>

      <p className="text-sm font-black text-slate-200">
        שגרתם {trucks} משאיות בדיוק בזמן ⏱
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-black text-amber-200">
          הרצף הארוך ביותר: x{bestStreak} 🔥
        </span>
        <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-black text-rose-200">
          טעויות: {mistakes}
        </span>
      </div>

      {promoted && (
        <p className="rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm font-black text-emerald-100">
          שלוש מדליות זהב! נפתחה רמה {Math.min(3, level + 1)} 🎉
        </p>
      )}
      {!promoted && !(level >= 3) && medal === 'gold' && (
        <p className="text-xs font-black text-amber-200/80">
          עוד {GOLD_MEDALS_PER_LEVEL - goldMedals} מדליות זהב לרמה הבאה
        </p>
      )}
      {level >= 3 && !promoted && (
        <p className="text-xs font-black text-amber-200/80">הגעתם לרמה הגבוהה ביותר! 🏆</p>
      )}
      {!medal && (
        <p className="text-xs font-black text-slate-300">
          עוד {MEDAL_THRESHOLD.bronze - score} נקודות למדליית ארד
        </p>
      )}
      {nextTitle && level < 3 && (
        <p className="text-[11px] font-bold text-slate-400">הבא בתור: {nextTitle}</p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-2xl bg-emerald-500 px-6 py-2.5 text-base font-black text-white shadow-lg transition-transform hover:bg-emerald-400 active:scale-95"
        >
          משמרת נוספת 🔁
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="rounded-2xl bg-slate-700 px-4 py-2.5 text-sm font-black text-slate-100 transition hover:bg-slate-600 active:scale-95"
        >
          <PackageCheck className="inline h-4 w-4" /> חזרה למחסן
        </button>
      </div>
    </div>
  );
}
