/**
 * הקיוסק השכונתי: a 75-second change-making sprint behind the counter.
 *
 * THE CRITICAL RULE, AND HOW IT IS ENFORCED. The brief bans "צריך עוד X₪" because
 * printing the shortfall does the subtraction for the child. That is easy to
 * forget in a stray branch, so it is not left to discipline: the wrong-answer
 * handler receives ONLY the direction of the miss, never the magnitude, and the
 * magnitude is never computed in this file at all - the comparison is against a
 * single derived `target`, and only its sign is read.
 *
 * AND THE REBUKE STAYS A REBUKE. The customer's two complaints say which way the
 * payment was wrong and nothing else - "שימי לב, חסר לי כסף!" and "שימי לב, שילמת
 * לי יותר מדי!". An earlier version appended an instruction to each which turned
 * the customer into a system message and, worse, started coaching the child
 * toward the answer. She is a person waiting at a till, so she speaks like one.
 *
 * THE CLOCK IS A DEADLINE, AND A CORRECT ANSWER PUSHES IT BACK. The deadline is
 * stored rather than ticked, because `setInterval` is throttled to about 1Hz in a
 * background tab: a child who tabs away for ten seconds must come back to a clock
 * that lost ten seconds, not one. The +5s accuracy bonus extends the DEADLINE
 * itself - adding to a countdown that is recomputed from a fixed deadline would be
 * overwritten by the next tick, so the bonus would silently vanish in 250ms.
 *
 * A WRONG HAND-OVER COSTS NOTHING BUT A MOMENT. Nothing resets: the tray is left
 * exactly as the child built it, so they can add to it or take pieces back and
 * try again. The customer just says which way they were off.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Medal, X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import KioskCounter from './KioskCounter';
import KioskDrawer from './KioskDrawer';
import { MONEY_IMAGE, CUSTOMER_ART, shekels, type Money } from './kioskMoney';
import {
  buildTransaction,
  medalFor,
  MEDAL_EMOJI,
  MEDAL_FOR_SERVED,
  MEDAL_LABEL,
  SPRINT_SECONDS,
  BONUS_SECONDS,
  sumPieces,
  type KioskTransaction,
  type MedalKind,
} from './kioskSprint';
import { kioskLevel, submitLabel } from './kioskMoney';
import { formatCount } from './hebrewCount';
import {
  GOLD_MEDALS_PER_LEVEL,
  isStationLevel,
  LEVELS,
  useStationProgress,
  type StationLevel,
} from '../../features/progression/useStationProgress';
import kioskInterior from '../../assets/interiors/kiosk-interior.jpg';
import medalArt from '../../assets/mystery/medal.png';
import type { MedalOutcome } from '../../features/progression/useStationProgress';

/**
 * REBALANCED AGAINST THE STICKER ECONOMY. A kiosk round is a 75-second sprint that can now be
 * extended by good play, so the brief's "single correct action = +10" would pay ~100 cookies for
 * one round - over half the price of the cheapest sticker, from a game the child can replay
 * every 75 seconds. The per-action value is therefore kept small (3) and the finish bonus carries
 * the weight.
 */
const COOKIE_PER_CUSTOMER = 3;
/** Paid for completing the round, on top of the per-customer pay. */
const COOKIE_PER_ROUND = 10;
/** How long the cha-ching and thanks stay up before the next customer steps in. */
const NEXT_CUSTOMER_MS = 900;
/** How long the wrong-change line stays up. */
const MISS_MS = 1300;
/**
 * How long the customer is shown walking before she settles into waiting.
 *
 * Matched to the `customerIn` keyframe's 450ms so the artwork changes exactly as the slide
 * lands. Named rather than inlined because it is a shared contract with the CSS.
 */
const CUSTOMER_WALK_MS = 450;

interface KioskGameProps {
  /** Called after each completed round. */
  onComplete: () => void;
  /** Closes the district, for the header's X. */
  onClose: () => void;
  /**
   * The level chosen on the launch card.
   *
   * THE GAME DOES NOT REMEMBER WHICH LEVEL IT IS ON; IT IS TOLD. The persisted record still holds
   * the unlock, but the level actually being PLAYED comes from the card, because a child who has
   * cleared level 3 may still want a level 1 sprint - and a game that read `progress.unlockedLevel`
   * for itself would silently override that choice and deal the hardest transactions instead.
   */
  level?: StationLevel;
}

/**
 * The key the kiosk's progression is stored under.
 *
 * It matches the kiosk's entry in `GAME_META` and the `meta` the launch card is given, which is
 * what makes the medals earned here the medals the card shows. A mismatch would not error - it
 * would just mean the picker never lit up.
 */
const KIOSK_KEY = 'kiosk';

/** Where a game that was mounted without a level starts. */
const DEFAULT_LEVEL: StationLevel = 1;

export default function KioskGame({ onComplete, onClose, level = DEFAULT_LEVEL }: KioskGameProps) {
  const { addCookies } = useGame();
  const feedback = useAnswerFeedback();
  const { progress, recordGoldMedal } = useStationProgress(KIOSK_KEY);
  const spec = kioskLevel(level);
  const [secondsLeft, setSecondsLeft] = useState(SPRINT_SECONDS);
  const [served, setServed] = useState(0);
  const [round, setRound] = useState<'playing' | 'done'>('playing');
  /** Bumped to call the next customer; the transaction is derived, never stored. */
  const [deal, setDeal] = useState(0);
  const [placed, setPlaced] = useState<Money[]>([]);
  /** Set while the child is being told they were OVER or UNDER - never by how much. */
  const [missed, setMissed] = useState<'over' | 'under' | null>(null);
  /** The charged transaction, held so the celebration can render it after a re-deal. */
  const [charged, setCharged] = useState<KioskTransaction | null>(null);
  /**
   * What the medal just did, captured at settlement.
   *
   * IT HOLDS THE OUTCOME OF THE ROUND THAT ENDED, NOT THE LIVE RECORD. The summary renders after a
   * re-deal, so reading `progress` at that point would show the NEXT level's medal count against
   * the round that just finished - and the "three golds, you have been promoted" line would lose
   * the very fact it exists to announce.
   */
  const [outcome, setOutcome] = useState<MedalOutcome | null>(null);

  /** The medals earned at the level being played, which is what the header counter shows. */
  const earnedMedals = progress.medals[level];

  const transaction = useMemoOnDeal(level, deal);

  const timers = useRef<number[]>([]);
  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );
  const after = (ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  };

  /**
   * THE CLOCK RUNS ON A DEADLINE, AND THE DEADLINE IS PUSHED BACK BY CORRECT ANSWERS.
   *
   * A stored deadline rather than a counted tick, for the usual reason: `setInterval` is
   * throttled to about 1Hz in a background tab, so a child who tabs away for ten seconds must
   * come back to a clock that lost ten seconds rather than one.
   *
   * THE BONUS EXTENDS THE DEADLINE ITSELF rather than decrementing the displayed seconds. That
   * distinction matters: adding to a countdown that is recomputed from a fixed deadline would
   * be overwritten by the very next tick, so the +5s would silently vanish within 250ms. The
   * deadline lives in a ref, and a correct answer adds to it - which the tick then reads as a
   * larger remainder, exactly as if the round had started later.
   */
  const deadlineRef = useRef<number>(Date.now() + SPRINT_SECONDS * 1000);

  useEffect(() => {
    if (round !== 'playing') return;
    deadlineRef.current = Date.now() + SPRINT_SECONDS * 1000;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setRound('done');
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [round]);

  /** Adds the accuracy bonus to the live deadline. No-op once the round is over. */
  const addBonus = useCallback(() => {
    deadlineRef.current += BONUS_SECONDS * 1000;
    setSecondsLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
  }, []);

  /** Settles the round exactly once, however the clock ran out. */
  const settled = useRef(false);
  useEffect(() => {
    if (round !== 'done' || settled.current) return;
    settled.current = true;
    if (medalFor(served) === 'gold') {
      setOutcome(recordGoldMedal(level));
      feedback.celebrate();
    }
    addCookies(served * COOKIE_PER_CUSTOMER + COOKIE_PER_ROUND);
    onComplete();
    // `recordGoldMedal` and `served` are read, not tracked: this must run on the frame
    // the round ends, not again when a dependent identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const take = (value: Money) => {
    if (round !== 'playing' || charged) return;
    setPlaced((current) => [...current, value]);
    setMissed(null);
  };

  const takeBack = (index: number) => {
    if (round !== 'playing' || charged) return;
    setPlaced((current) => current.filter((_, i) => i !== index));
    setMissed(null);
  };

  const clear = () => {
    if (round !== 'playing' || charged) return;
    setPlaced([]);
    setMissed(null);
  };

  /**
   * What the child is trying to build, which depends on the level's task.
   *
   * THE TARGET IS DERIVED, NOT STORED, and it is the ONLY place the level's two modes are
   * reconciled. On an exact-payment level the child must match the bill; on a change level they
   * must match the change. Every comparison below reads this one value, so the submission logic
   * itself does not branch on the level at all.
   */
  const target = transaction
    ? spec.task === 'exact'
      ? transaction.bill
      : transaction.change
    : 0;

  const submit = useCallback(() => {
    if (round !== 'playing' || charged || !transaction) return;
    const total = sumPieces(placed);

    if (total !== target) {
      // The DIRECTION of the miss is all this branch is allowed to know.
      setMissed(total < target ? 'under' : 'over');
      feedback(false);
      after(MISS_MS, () => setMissed(null));
      return;
    }

    setCharged(transaction);
    setServed((current) => current + 1);
    addCookies(COOKIE_PER_CUSTOMER);
    // ACCURACY BUYS TIME. Applied before the celebration, so the extra seconds are already on
    // the clock while the child watches the customer celebrate.
    addBonus();
    feedback(true);
    after(NEXT_CUSTOMER_MS, () => {
      setCharged(null);
      setPlaced([]);
      setMissed(null);
      setDeal((current) => current + 1);
    });
  }, [round, charged, transaction, placed, target, feedback, addCookies, addBonus]);

  /** Enter hands the change over; no digits, so nothing clashes with a text field. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [submit]);

  const restart = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    settled.current = false;
    setSecondsLeft(SPRINT_SECONDS);
    setServed(0);
    setPlaced([]);
    setMissed(null);
    setCharged(null);
    setOutcome(null);
    setDeal((current) => current + 1);
    setRound('playing');
  };

  const medal = medalFor(served);
  const urgent = secondsLeft <= 10 && round === 'playing';
  const frozen = charged !== null || round !== 'playing';

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-2xl">
      {/* The kiosk interior, cover-fitted so the shop stays VISIBLE. Everything
          below floats on it; nothing here is a full-width opaque card. */}
      <img src={kioskInterior} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-center" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/25 to-stone-950/55" />

      <div dir="rtl" className="relative flex h-full min-h-0 flex-col gap-2 p-2">
        {/* ONE slim line: level and medals, clock, served, close. */}
        <header className="flex shrink-0 items-center gap-2">
          <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-amber-950/60 px-2.5 py-1 backdrop-blur-sm">
            <span className="truncate text-[11px] font-black text-amber-50">
              רמה {level}: {levelTitle(level)}
            </span>
            <span className="shrink-0 rounded-full bg-amber-950/60 px-1.5 text-[11px] font-black tabular-nums text-amber-100">
              {MEDAL_EMOJI.gold} {earnedMedals}/{GOLD_MEDALS_PER_LEVEL}
            </span>
          </span>

          <span
            className={`mx-auto shrink-0 rounded-full px-3 py-1 text-sm font-black tabular-nums transition-colors ${
              urgent
                ? 'bg-rose-500/90 text-white motion-safe:animate-[pulseLock_1s_ease-in-out_infinite]'
                : 'bg-amber-950/60 text-amber-50'
            }`}
          >
            ⏱ {secondsLeft}s
          </span>

          <span className="shrink-0 rounded-full bg-amber-950/60 px-2.5 py-1 text-sm font-black tabular-nums text-amber-50 backdrop-blur-sm">
            👥 {served}
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-950/70 text-amber-50 transition hover:bg-amber-950/90 active:scale-90"
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </button>
        </header>

        {round === 'playing' && transaction ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            {/* THE CUSTOMER STANDS AT THE START OF THE READING ORDER, SO SHE IS ON
                THE RIGHT - the child's line is Hebrew and the layout is `dir="rtl"`,
                so the first item in this row is the rightmost. Putting her on the
                left (which this row did before) made her speak from across the
                room, with her bubble opening away from her towards the middle.
                She is sized by HEIGHT with no width step, and the row is
                `items-center` rather than `items-end`: an end-aligned row grows
                upward from the counter, which pushed the top of her head behind the
                header on a short viewport. */}
            <div className="flex shrink-0 items-center gap-2">
              {/*
                KEYED BY THE DEAL COUNTER, SO EACH NEW CUSTOMER WALKS IN.

                React reuses a DOM node across renders when nothing distinguishes it, and a CSS
                animation only plays when an element MOUNTS. Without a key that changes per
                customer, `customerIn` would run once for the first customer of the round and never
                again - every later customer would simply blink into place. Keying on `deal` gives
                React a reason to mount a fresh element for each transaction, which is what makes
                the walk-in a per-customer entrance rather than a one-off.

                It also resets the celebration for free: a new key means a new element, so a
                `happy` pose can never survive into the next customer's arrival.
              */}
              <Customer key={deal} charged={charged !== null} />
              <SpeechBubble
                transaction={transaction}
                missed={missed}
                charged={charged}
                task={spec.task}
              />
            </div>

            {/* The counter: what the child has put down.
                Sized by its own content rather than `flex-1`: its inner surface is capped at
                `max-h-44`, so stretching the outer box would only add empty panel below the
                wood. The slack is absorbed by the spacer inside the bottom group instead. */}
            <KioskCounter placed={placed} onTakeBack={takeBack} onClear={clear} frozen={frozen} />

            {/*
              THE SPACER IS WHAT PINS THE MONEY TO THE LOWER EDGE.

              `flex-1` on an empty div absorbs every pixel the counter does not take, which
              pushes the drawer and the button down against the bottom of the frame. Doing it
              with a spacer rather than `mt-auto` on the group keeps the counter's own height
              honest: the counter is capped by its inner surface, and a spacer cannot inflate it
              because there is nothing inside to stretch.
            */}
            <div aria-hidden className="min-h-0 flex-1" />

            {/*
              THE DRAWER AND THE HAND-OVER SIT AT THE BOTTOM, AS ONE GROUP.
            */}
            <div className="flex shrink-0 flex-col gap-2 pb-1">
              <KioskDrawer register={transaction.register} onTake={take} frozen={frozen} />

              {/* The instruction, naming the work rather than the button. */}
              <p
                dir="rtl"
                className="text-center text-sm font-black text-amber-50 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] sm:text-base"
              >
                {taskInstruction(spec.task)}
              </p>

              {/* THE BUTTON POPS WHEN THERE IS SOMETHING TO HAND OVER.
                  A green button that looks identical at zero coins and at a full
                  tray gives a child no signal that they are ready, so the live
                  state is the vivid one - solid emerald with a glow and a lift -
                  and the dormant state steps back to a flat, dimmer green. */}
              <button
                type="button"
                onClick={submit}
                disabled={frozen || placed.length === 0}
                className={`mb-1 shrink-0 rounded-2xl px-5 py-3 text-base font-black transition duration-150 ${
                  charged
                    ? 'bg-emerald-500 text-white shadow-lg motion-safe:animate-[popBounce_.35s_ease-out]'
                    : placed.length > 0
                      ? 'bg-emerald-500 text-white shadow-lg hover:bg-emerald-400 hover:shadow-xl motion-safe:hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-md'
                      : 'cursor-not-allowed bg-emerald-900/50 text-emerald-100/50'
                }`}
              >
                {charged ? 'קיבלתי! 🎉' : submitLabel(spec)}
              </button>
            </div>
          </div>
        ) : round === 'done' ? (
          <RoundSummary
            served={served}
            medal={medal}
            outcome={outcome}
            level={level}
            earnedMedals={progress.medals[level]}
            onRestart={restart}
            onLeave={onClose}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * The customer, in one of three poses, with the animation each pose carries.
 *
 * ===================================================================
 * THE POSE CHANGES AS THE TRANSACTION PROGRESSES, AND `walking` IS REAL.
 * ===================================================================
 *
 * The character used to be a single static illustration. Three poses now carry the
 * transaction's beats:
 *
 *   WALKING - she slides in from the right when a customer arrives, USING THE WALKING
 *     ARTWORK, and settles into the waiting pose once she has arrived. Showing the
 *     waiting pose during the slide was the first version and it read as a statue being
 *     dragged: the brief specifically supplies a walking asset for the entrance, so the
 *     pose has to change with the phase rather than only the position.
 *   WAITING - the neutral pose while the child works out the money.
 *   HAPPY - on a correct hand-over she BOUNCES in the celebration pose, then the round
 *     advances and the next customer walks in.
 *
 * THE ARRIVAL IS A SHORT TIMER, NOT A TRANSITION. `customerIn` is 450ms, so a timer of
 * the same length flips the artwork from walking to waiting exactly as the slide lands.
 * Two independent mechanisms (a CSS keyframe for the movement, a timeout for the pose)
 * are used deliberately: the animation cannot tell us when it finished without listening
 * for `animationend`, which is fragile under reduced-motion where the animation may not
 * run at all - the timer fires either way.
 */
function Customer({ charged }: { charged: boolean }) {
  /*
   * THE WALK PHASE IS LOCAL TO THIS COMPONENT. It is presentation, not game state: the
   * transaction does not care which frame of the entrance is showing, and lifting this into
   * `KioskGame` would add a state field that every unrelated re-render has to keep correct.
   * The component is keyed per customer, so this resets on each arrival by construction.
   */
  const [arrived, setArrived] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setArrived(true), CUSTOMER_WALK_MS);
    return () => window.clearTimeout(id);
  }, []);

  const src = charged ? CUSTOMER_ART.happy : arrived ? CUSTOMER_ART.waiting : CUSTOMER_ART.walking;

  return (
    /*
      THE ENTRANCE RIDES ON THE WRAPPER, NOT THE IMAGE.

      Putting the slide-in on the same element as the pose's own animation is the bug this
      avoids: one CSS `animation` property cannot hold two animations without them
      overwriting each other, so the celebration bounce would silently replace the entrance
      mid-flight. The wrapper owns the horizontal entrance - which happens once, on mount -
      and the image owns the vertical bounce, which is what changes when the answer is right.
      Two elements, two animations, no conflict.
    */
    <span className="relative block shrink-0 motion-safe:animate-[customerIn_.45s_ease-out]">
      <img
        src={src}
        alt="לקוחה"
        /*
          SIZED BY HEIGHT, LARGER THAN BEFORE, AND STILL BOUNDED.

          The character read as tiny because the cap was `min(26vh, 190px)` - on a short
          viewport that is barely a third of the stage, and she is the speaker the child has to
          look at. The cap is raised so she scales with the kiosk window the way a person
          standing at a counter would, and `maxWidth` is raised to match so the wider poses are
          not clipped by the column.

          BOTH BOUNDS STAY, AND THAT IS DELIBERATE. Height alone would let a tall narrow pose
          grow until it collided with the speech bubble; width alone would let a wide pose grow
          until it pushed the bubble off the frame. The pair keeps her in the upper band of the
          layout without letting either edge win.
        */
        style={{ maxHeight: 'min(38vh, 300px)', maxWidth: '42%' }}
        className={`h-auto w-auto object-contain drop-shadow-lg ${
          charged ? 'motion-safe:animate-[popBounce_.5s_ease-out]' : ''
        }`}
      />
    </span>
  );
}

/**
 * The customer's speech bubble.
 *
 * ===================================================================
 * THE BILL IS THE ONE NUMBER THE CHILD MUST GRASP, SO IT GETS ITS OWN BADGE.
 * ===================================================================
 *
 * The bubble prints the purchase in a single prominent amber badge - the multiplication
 * on Level 1, or the item list and its total on the change levels - and the sentence
 * below restates the key figure in matching large bold type. One treatment, one number,
 * impossible to miss.
 *
 * ===================================================================
 * THE SENTENCE IS KEPT WHOLE, AND THAT NEEDS `dir="rtl"` EXPLICITLY.
 * ===================================================================
 *
 * HEBREW WITH AN EMBEDDED NUMBER OR IMAGE IS WHERE RTL BREAKS. The bidirectional
 * algorithm decides a run's direction from its first strong character, and a sentence
 * that mixes Hebrew with digits, a currency sign and an inline image has several
 * candidate boundaries - so the trailing punctuation of "שילמתי ב-[20₪]. כמה עודף מגיע
 * לי?" can be reordered to the wrong end and the question mark lands on the left.
 *
 * Setting `dir="rtl"` on the text containers pins the base direction to Hebrew
 * regardless of what the first character happens to be, and the whitespace-nowrap tokens
 * keep each number-plus-symbol unit from being split. The inline bill image is wrapped in
 * its own inline-flex span so it sits on the text baseline as a single atomic token
 * rather than becoming a block that breaks the line.
 */
function SpeechBubble({
  transaction,
  missed,
  charged,
  task,
}: {
  transaction: KioskTransaction;
  missed: 'over' | 'under' | null;
  charged: KioskTransaction | null;
  task: 'exact' | 'change';
}) {
  // True once there is more than one item, i.e. once a printed total is worth
  // showing. A single item's price IS the bill, so an "= 12₪" beside it is noise.
  const basket = transaction.items.length > 1;

  return (
    <div className="relative min-w-0 flex-1 self-center rounded-2xl rounded-ss-none border-2 border-amber-800/40 bg-amber-50/95 p-4 shadow-2xl backdrop-blur-sm md:p-5">
      {/* THE BADGE. `flex-wrap` on the container plus a per-item nowrap span, so a
          three-item basket WRAPS onto a second line rather than spilling out of the
          bubble. Each item is an unbreakable token, but the LINE can break. */}
      {transaction.table ? (
        /*
          LEVEL 1 STATES THE MULTIPLICATION, NOT A RECEIPT.

          This is the pedagogical heart of the level: the child should read "3 × 4 ₪" -
          quantity times unit price - and recall the table fact. Printing the receipt as
          "🍦 ארטיק: 4₪ + 🍦 ארטיק: 4₪ + 🍦 ארטיק: 4₪" would show the same arithmetic as
          repeated addition, which is the step BEFORE multiplication and would invite the
          child to count instead of recall. So the badge shows one item and the
          multiplication that prices it.
        */
        <p
          dir="rtl"
          className="mb-2 inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-2xl border-2 border-amber-400 bg-amber-100 px-4 py-1.5 text-xl font-black text-amber-950 shadow-sm md:text-2xl"
        >
          <span className="whitespace-nowrap">
            {transaction.table.count} × {shekels(transaction.table.price)}
          </span>
          <span className="text-sm font-bold text-amber-800/80">
            ({transaction.items.length} × {transaction.items[0]?.emoji} {transaction.items[0]?.nameHebrew})
          </span>
        </p>
      ) : (
        <p
          dir="rtl"
          className="mb-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border-2 border-amber-400 bg-amber-100 px-4 py-1.5 text-xl font-black text-amber-950 shadow-sm md:text-2xl"
        >
          {transaction.items.map((item, index) => (
            <span key={`${item.nameHebrew}-${index}`} className="whitespace-nowrap">
              {index > 0 && <span className="px-1 text-amber-700/70">+</span>}
              {item.emoji} {item.nameHebrew}: {shekels(item.price)}
            </span>
          ))}
          {/* The total is only worth printing when there is something to add up; on a
              single item it would just repeat the price next to it. */}
          {basket && (
            <span className="whitespace-nowrap">
              <span className="px-1 text-amber-700/70">=</span>
              {shekels(transaction.bill)}
            </span>
          )}
        </p>
      )}

      {charged ? (
        <p
          dir="rtl"
          className="flex items-center gap-2 text-sm font-bold leading-snug text-emerald-800 sm:text-base"
        >
          <span className="min-w-0 flex-1">
            {/* PHRASED TO THE CHILD, IN FEMININE SINGULAR, as the brief asks. */}
            {task === 'exact' ? 'תשלום מדויק, כל הכבוד! 🎉' : 'תודה רבה! יצא בול. 🎉'}
          </span>
          {charged.paidWith !== null && (
            <NoteThumb value={charged.paidWith} className="h-8 shrink-0 md:h-10" />
          )}
        </p>
      ) : missed === 'under' ? (
        <p dir="rtl" className="text-sm font-black leading-snug text-rose-700 sm:text-base">
          {task === 'exact' ? 'שימי לב, חסר לי כסף!' : 'אופס, חסר לי עודף!'}
        </p>
      ) : missed === 'over' ? (
        <p dir="rtl" className="text-sm font-black leading-snug text-rose-700 sm:text-base">
          {task === 'exact' ? 'שימי לב, שילמת לי יותר מדי!' : 'שימי לב, נתת לי יותר מדי כסף!'}
        </p>
      ) : task === 'exact' ? (
        /*
          LEVEL 1'S REQUEST, IN THE BRIEF'S OWN WORDS.

          "שלום! אפשר בבקשה [כמות ושם]? כל אחד עולה [מחיר] ₪." - and the count comes from
          `formatCount`, which is what makes it "שלושה ארטיקים" rather than "3 ארטיקים". The
          multiplication badge above already states the sum; this line states the REQUEST, so
          the child reads a spoken sentence and reads the arithmetic off the badge.
        */
        <p dir="rtl" className="text-base font-bold leading-relaxed text-amber-950 md:text-lg">
          שלום! אפשר בבקשה{' '}
          <span className="whitespace-nowrap font-black text-amber-800">
            {formatCount(transaction.table?.count ?? 1, transaction.items[0]?.nameHebrew ?? '')}
          </span>
          ? כל אחד עולה{' '}
          <span className="whitespace-nowrap text-xl font-black tabular-nums text-amber-800 md:text-2xl">
            {shekels(transaction.table?.price ?? 0)}
          </span>
          .
        </p>
      ) : (
        <p dir="rtl" className="text-base font-bold leading-relaxed text-amber-950 md:text-lg">
          החשבון הוא{' '}
          {/* The bill, restated in the sentence at the same scale as the badge, so
              the eye lands on it whichever line it reads first. */}
          <span className="whitespace-nowrap text-xl font-black tabular-nums text-amber-800 md:text-2xl">
            {shekels(transaction.bill)}
          </span>
          {', ושילמתי בשטר של'}
          {/* An atomic token: it can wrap to the next line as a unit but can never
              be split in half, which is what kept stranding the question. The
              inline-flex is what keeps the image on the text baseline. */}
          {transaction.paidWith !== null && (
            <span className="mx-1.5 inline-flex shrink-0 items-center align-middle">
              <NoteThumb value={transaction.paidWith} className="h-8 md:h-10" />
            </span>
          )}
          {'. כמה עודף מגיע לי?'}
        </p>
      )}
    </div>
  );
}

/**
 * The instruction that sits with the hand-over button.
 *
 * THE TASK IS NAMED IN THE SECOND PERSON, TO THE CHILD. The button says what the SUBMISSION is
 * ("הגישי תשלום" / "מסרי עודף"); this line says what the WORK is ("הניחי את הסכום המדויק על
 * הדלפק" / "החזירי עודף מדויק"). Two different sentences because they are two different
 * statements: one labels an action, the other describes the goal, and a child who reads only
 * the button would know what to press but not what to build.
 *
 * THE PHRASING IS FEMININE SINGULAR THROUGHOUT, per the brief, and both sentences use the
 * imperative form (-י) rather than an infinitive, which is how the rest of the app addresses
 * the player.
 */
function taskInstruction(task: 'exact' | 'change'): string {
  return task === 'exact' ? 'הניחי את הסכום המדויק על הדלפק' : 'החזירי עודף מדויק';
}

/** The paid note, as a plain image. */
function NoteThumb({ value, className }: { value: Money; className: string }) {
  return (
    <img
      src={MONEY_IMAGE[value]}
      alt={`${value} שקלים`}
      className={`w-auto object-contain drop-shadow-md motion-safe:animate-[hopSmall_.4s_ease-out] ${className}`}
    />
  );
}

/**
 * The level's own title, read from the level table.
 *
 * THE NAME LIVES IN ONE PLACE. This used to be a local array of four role names ("שוליית
 * הקיוסק", "קופאית מוסמכת"...) while the level table held a different set, so the header and the
 * launch card could name the same level two different ways - and when the ladder was cut from
 * four levels to three, a local list would have silently kept the stale fourth entry. Reading
 * `kioskLevel(level).title` makes that class of drift impossible.
 */
function levelTitle(level: number): string {
  return kioskLevel(level).title;
}

/** The end-of-round screen: the medal, the payout, and the level-complete state. */
function RoundSummary({
  served,
  medal,
  outcome,
  level,
  earnedMedals,
  onRestart,
  onLeave,
}: {
  served: number;
  medal: MedalKind;
  outcome: MedalOutcome | null;
  level: StationLevel;
  earnedMedals: number;
  onRestart: () => void;
  onLeave: () => void;
}) {
  const cleared = earnedMedals >= GOLD_MEDALS_PER_LEVEL;
  /** The third gold at level 3 - the station is finished, not promoted. */
  const finishedStation = cleared && level === LEVELS[LEVELS.length - 1];
  const nextLabel = isStationLevel(level + 1) ? levelTitle(level + 1) : '';
  /** The customers needed for gold at this level, read from the one table that defines it. */
  const goldBar = MEDAL_FOR_SERVED.find((entry) => entry.medal === 'gold')?.min ?? 7;

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
      <img
        src={medalArt}
        alt=""
        aria-hidden
        className={
          cleared
            ? 'h-24 w-24 object-contain motion-safe:animate-[popBounce_.5s_ease-out]'
            : 'h-20 w-20 object-contain opacity-90 motion-safe:animate-[popBounce_.5s_ease-out]'
        }
      />
      <p className="text-xl font-black text-amber-950">
        מדליית {MEDAL_LABEL[medal]}! שירתם {served} לקוחות
      </p>

      {/*
        THE LEVEL-COMPLETE STATE REPLACES THE MEDAL TALLY RATHER THAN SITTING ABOVE IT. A promoted
        child used to read "3/3" and "you have been promoted" as two separate claims; folding them
        into one card means the meter, the unlock and the next level's name are one statement.
      */}
      {cleared ? (
        <div className="rounded-2xl bg-emerald-400 px-3 py-2 text-sm font-black text-emerald-950 shadow-[0_3px_0_#047857]">
          <p className="flex items-center justify-center gap-1.5">
            <Medal className="h-4 w-4" fill="currentColor" />
            {GOLD_MEDALS_PER_LEVEL}/{GOLD_MEDALS_PER_LEVEL} מדליות זהב ברמה {level}!
          </p>
          <p className="mt-1 text-xs font-bold">
            {finishedStation
              ? 'סיימתם את כל הרמות! אתם אלופות ואלופי הקיוסק 👑'
              : outcome?.unlockedNext
                ? `נפתחה רמה ${level + 1}: ${nextLabel} 🎉`
                : `רמה ${level + 1} כבר פתוחה – אפשר לשחק שוב ברמה הזו או לעלות`}
          </p>
        </div>
      ) : (
        <p className="text-xs font-bold text-amber-950/70">
          {/*
            THE GOLD BAR IS READ FROM THE TABLE, NOT REPEATED HERE. This was a literal 7 that
            happened to match the threshold; the two would drift the moment the ladder was
            retuned, and the hint would then promise a number the medal does not use.
          */}
          {served >= goldBar
            ? `עוד מדליית זהב לרמה ${level}: ${earnedMedals}/${GOLD_MEDALS_PER_LEVEL}`
            : `עוד ${goldBar - served} לקוחות למדליית זהב 🥇`}
        </p>
      )}

      {/*
        NO "ADVANCE" BUTTON, AND THAT IS THE POINT OF THE GATE.

        The brief is explicit that a child must not skip to the next level without earning three
        medals, and the inverse matters too: they must not be carried forward automatically the
        moment they clear one. Leaving the station closes the kiosk, and reopening it lands on the
        launch card - which now defaults to the newly unlocked level, because the card derives its
        selection from `unlockedLevel`. The advance therefore happens on the card, where the child
        can see the level they are choosing, and not by a stray tap here.
      */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-xl border-b-4 border-amber-700 bg-amber-300 px-4 py-2 text-sm font-black text-amber-950 transition hover:brightness-105 active:translate-y-[3px] active:border-b-0"
        >
          ספרינט נוסף ברמה {level} ⏱
        </button>
        <button
          type="button"
          onClick={onLeave}
          className="rounded-xl border-b-4 border-stone-500 bg-amber-50/90 px-4 py-2 text-sm font-black text-amber-950 transition hover:brightness-105 active:translate-y-[3px] active:border-b-0"
        >
          {cleared && !finishedStation ? 'לרמה הבאה ←' : 'סיום'}
        </button>
      </div>
    </div>
  );
}

/**
 * Deals a transaction for the current level, re-rolling only when `deal` changes.
 *
 * This is a `useMemo` on purpose: a transaction costs a coin-change table walk
 * per candidate bill, and recomputing it on every render would both waste that
 * work and - much worse - shuffle the customer out from under a child's finger
 * mid-answer.
 */
function useMemoOnDeal(level: number, deal: number): KioskTransaction {
  const [held, setHeld] = useState<KioskTransaction | null>(null);
  const keyRef = useRef<string>('');
  const key = `${level}:${deal}`;

  if (keyRef.current !== key || held === null) {
    keyRef.current = key;
    const fresh = buildTransaction(level);
    setHeld(fresh);
    return fresh;
  }
  return held;
}
