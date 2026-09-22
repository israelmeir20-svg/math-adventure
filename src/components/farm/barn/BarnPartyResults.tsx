/**
 * The end-game barn party for "מי באסם?".
 *
 * Shown only once the 60-second clock reaches zero. Every animal that made it
 * through the barn lines up in the meadow and dances, confetti falls, and the
 * medal card drops on top with the score, the cookies and "שחקי שוב".
 */
import type { FarmMedal } from '../farmTimerData';
import { GOLD_SCORE, BARN_RUN_SECONDS } from '../farmTimerData';
import { MedalCounter } from '../../../features/progression/ProgressionChrome';
import type { StationLevel } from '../../../features/progression/useStationProgress';
import { ALL_ANIMALS, ANIMAL_ASSETS } from './animalAssets';

interface BarnPartyResultsProps {
  correct: number;
  medal: FarmMedal;
  rewarded: boolean;
  /**
   * The station level this run was played at.
   *
   * PASSED IN RATHER THAN READ FROM THE PROGRESSION STORE. The card is a pure view, and the
   * level that was PLAYED is not necessarily the level that is now unlocked - the run may have
   * just opened the next one. Reading the store here would make the card's "רמה N" label flip
   * to the new level the moment it appeared, and would put a second progression reader inside
   * a component that only needs to print a number.
   */
  level: StationLevel;
  /** Gold medals banked at `level` after this run settled. */
  earnedMedals: number;
  /**
   * The child's best medal at this level from previous runs, if any.
   *
   * SHOWN ON THE RESULTS RATHER THAN BEFORE THE RUN, because the intro card that used to display it is
   * gone. A "previous best" read before playing is a number with nothing to act on; read beside the
   * medal just earned, it is the comparison a child actually makes.
   */
  bestMedalLabel?: string;
  onPlayAgain: () => void;
}

/** Confetti shard colours, cycled across the falling pieces. */
const SHARDS = ['#f472b6', '#facc15', '#4ade80', '#60a5fa', '#fb923c', '#a78bfa'];

export default function BarnPartyResults({
  correct,
  medal,
  rewarded,
  level,
  earnedMedals,
  bestMedalLabel,
  onPlayAgain,
}: BarnPartyResultsProps) {
  const toGold = Math.max(0, GOLD_SCORE - correct);

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-amber-950/50 p-3">
      {/*
        THE DANCE FLOOR.
        ------------------------------------------------------------------
        Every animal that made it through the barn lines up across the meadow
        and dances, under falling confetti.

        THIS IS A FLEX ROW OF DOM NODES, NOT AN SVG. The animals are now upright
        WebP sprites sized by height classes, so laying them out is a matter of
        `flex justify-around` and letting each one be as wide as its own artwork.
        Doing this in SVG would mean re-deriving an x offset and a square box per
        animal, which is exactly the arithmetic that made the old stage fragile.
        A flex row centres them on the grass with no numbers at all.

        `items-end` puts every animal's FEET on the same line - the meadow - so
        the herd stands together instead of floating at mixed heights.
      */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[18%] z-0 flex items-end justify-around px-6">
        {ALL_ANIMALS.map((animal, index) => (
          <img
            key={animal}
            src={ANIMAL_ASSETS[animal].src}
            alt=""
            aria-hidden
            /*
             * PINNED TO PIXELS, FOR THE SAME REASON THE STAGE ACTORS ARE.
             *
             * A Tailwind height plus `w-auto` asks the browser to derive the width
             * from the flex row at paint time, which is the mechanism that made the
             * running animals shrink along their lane. The party row does not move
             * horizontally, so it never showed the symptom - but leaving one caller
             * on the derived path and one on the fixed path is how a future change
             * to the row (a wrap, a scroll, a transform) reintroduces the bug on
             * this screen only.
             *
             * The party sizes are one step down from the stage heights, and come
             * from the same table, so an animal can never change its relative size
             * between the two screens.
             */
            width={PARTY_PX[animal]}
            height={PARTY_PX[animal]}
            style={{
              width: PARTY_PX[animal],
              height: PARTY_PX[animal],
              flex: '0 0 auto',
              maxWidth: 'none',
              animation: `animalDance ${0.5 + (index % 3) * 0.08}s ease-in-out ${index * 0.09}s infinite`,
              transformOrigin: 'center bottom',
            }}
            className="object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.28)]"
          />
        ))}
      </div>

      <Confetti />

      <MedalCard
        correct={correct}
        medal={medal}
        rewarded={rewarded}
        toGold={toGold}
        level={level}
        earnedMedals={earnedMedals}
        bestMedalLabel={bestMedalLabel}
        onPlayAgain={onPlayAgain}
      />
    </div>
  );
}

/**
 * The party sizes in PIXELS, one step down from each animal's stage height.
 *
 * Kept as pixels rather than Tailwind classes for the reason given at the call
 * site: a class plus `w-auto` lets the layout derive the sprite's size, and that
 * derivation is what shrank the stage actors along their lane. These are literal
 * numbers so the party row cannot inherit that failure mode.
 *
 * LIFTED BY THE SAME PROPORTION AS THE STAGE TABLE. The party is the same cast in
 * the same order, so a child who just watched a duck cross the lawn meets the same
 * duck here - if the party kept the old, smaller figures while the stage grew, the
 * two screens would disagree about how big a duck is.
 */
const PARTY_PX: Record<(typeof ALL_ANIMALS)[number], number> = {
  sheep: 64,
  cow: 64,
  horse: 64,
  donkey: 64,
  rabbit: 48,
  duck: 48,
  dog: 64,
  cat: 56,
};

/** Confetti shards drifting down across the whole stage. */
function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
      {Array.from({ length: 22 }, (_, i) => (
        <span
          key={i}
          className="absolute top-0 block rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            width: '9px',
            height: '14px',
            background: SHARDS[i % SHARDS.length],
            animation: `confettiFall ${1.5 + (i % 5) * 0.25}s ease-in ${i * 0.11}s infinite`,
            ['--confetti-x' as string]: `${(i % 2 === 0 ? 1 : -1) * (16 + i * 3)}px`,
          }}
        />
      ))}
    </div>
  );
}

/** The medal card: score, cookies, and the restart button. */
function MedalCard({
  correct,
  medal,
  rewarded,
  toGold,
  level,
  earnedMedals,
  bestMedalLabel,
  onPlayAgain,
}: {
  correct: number;
  medal: FarmMedal;
  rewarded: boolean;
  toGold: number;
  level: StationLevel;
  earnedMedals: number;
  bestMedalLabel?: string;
  onPlayAgain: () => void;
}) {
  return (
    <div
      dir="rtl"
      className={`relative w-full max-w-sm rounded-2xl border-4 border-amber-950/80 bg-gradient-to-b ${medal.tone} px-4 py-4 text-center shadow-[0_10px_0_rgba(0,0,0,0.35)]`}
    >
      {/*
        WHERE THE CHILD STANDS ON THE STATION'S LADDER, not just in this run.
        ------------------------------------------------------------------
        The medal above is what THIS run earned; this strip is what the three gold medals are
        FOR - it is the same counter the level picker reads, so a child can see that a gold run
        moved them from 1/3 to 2/3 rather than having to infer it from the launch card later.
        `dark` tone because the medal's own gradient is a pale one.
      */}
      <div className="mb-2 flex justify-center">
        <MedalCounter earned={earnedMedals} level={level} tone="dark" />
      </div>

      <span className="block text-4xl leading-none">{medal.emoji}</span>
      <h3 className="mt-1 text-xl font-black">מדליית {medal.labelHebrew}!</h3>
      <p className="mt-0.5 text-[13px] font-bold opacity-90">{medal.cheerHebrew}</p>

      <div className="mt-2 rounded-xl bg-amber-950/15 px-3 py-1.5 text-[12px] font-bold">
        <span className="block">
          ✅ {correct} תשובות נכונות מתוך {BARN_RUN_SECONDS} שניות
        </span>
        <span className="mt-0.5 block">
          🍪 {rewarded ? `+${medal.cookies} עוגיות נאספו!` : 'העוגיות בדרך...'}
        </span>
        {toGold > 0 && (
          <span className="mt-0.5 block opacity-80">עוד {toGold} נכונות למדליית זהב 🥇</span>
        )}
        {bestMedalLabel && (
          <span className="mt-0.5 block opacity-80">🏅 השיא הקודם: {bestMedalLabel}</span>
        )}
      </div>

      <button
        type="button"
        onClick={onPlayAgain}
        className="mt-3 w-full rounded-xl border-b-4 border-amber-950 bg-gradient-to-b from-lime-300 to-green-600 px-4 py-3 text-lg font-black text-green-950 shadow-[0_5px_0_#14532d] transition active:translate-y-[4px] active:shadow-none"
      >
        שחקי שוב ⏱️
      </button>
    </div>
  );
}
