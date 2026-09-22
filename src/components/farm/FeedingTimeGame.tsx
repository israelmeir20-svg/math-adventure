/**
 * Station 2 - "שעת האכלה" (Feeding Time)
 *
 * Grade 3-4 division: share N carrots fairly between M bunnies. The child
 * answers how many each animal gets; the remainder stays visibly in the basket
 * so the "sharing with a remainder" idea is concrete. From level 3 the same
 * board also poses halves and quarters.
 */
import { useMemo, useState } from 'react';
import { ShoppingBasket, HandHeart } from 'lucide-react';
import { useFarmTimer } from './useFarmTimer';
import { FarmTimerHud } from './FarmTimerHud';
import { AnswerPad, QuestionBanner, StationBoard } from './StationParts';
import { buildFeedingRound } from './farmRounds';
import type { FarmMedal } from './farmTimerData';

interface GameProps {
  onReward: (medal: FarmMedal) => void;
  bestMedalLabel?: string;
}

export default function FeedingTimeGame({ onReward, bestMedalLabel }: GameProps) {
  const timer = useFarmTimer(onReward);
  const [seed, setSeed] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  // Level climbs with correct answers, unlocking half/quarter rounds.
  const level = timer.correct >= 3 ? 3 : 1;

  const round = useMemo(() => {
    void seed;
    return buildFeedingRound(level);
  }, [seed, level]);

  const nextRound = () => {
    setPicked(null);
    setWrong(null);
    setSeed((value) => value + 1);
  };

  const pick = (value: number) => {
    if (picked !== null || wrong !== null) return;
    if (value !== round.perAnimal) {
      setWrong(value);
      timer.miss();
      window.setTimeout(() => setWrong(null), 420);
      return;
    }
    setPicked(value);
    timer.score();
    window.setTimeout(nextRound, 700);
  };

  return (
    <div className="flex flex-col gap-3">
      <FarmTimerHud
        timer={timer}
        readyHint={bestMedalLabel ? `השיא שלכם: ${bestMedalLabel}` : 'חלוקה הוגנת - אספו 6 נכונות!'}
        challengeLabel="חלקו שווה בשווה!"
      />

      <StationBoard>
        {/* The animals waiting for their share. */}
        <div className="mb-2 flex flex-wrap items-end justify-center gap-2">
          {Array.from({ length: round.animals }, (_, i) => (
            <span key={i} aria-hidden className="text-3xl drop-shadow">
              {round.animalEmoji}
            </span>
          ))}
        </div>

        {/* The full basket, with the leftovers staged beside it. */}
        <div className="flex items-center justify-center gap-4 rounded-2xl bg-white/10 p-3">
          <span className="flex flex-col items-center text-amber-100">
            <ShoppingBasket className="h-7 w-7" />
            <span className="text-xs font-black">
              {round.total} {round.foodName}
            </span>
          </span>
          <span aria-hidden className="text-3xl">
            {round.foodEmoji}
          </span>
          {round.kind === 'share' && (
            <span className="flex flex-col items-center rounded-xl bg-amber-800/60 px-3 py-1 text-amber-100">
              <span className="text-xl font-black tabular-nums">{round.remainder}</span>
              <span className="text-[10px] font-bold">נשארו בסל</span>
            </span>
          )}
        </div>
      </StationBoard>

      <QuestionBanner emoji="🥕">{round.promptHebrew}</QuestionBanner>

      <AnswerPad
        choices={round.choices}
        wrong={wrong}
        picked={picked}
        disabled={picked !== null}
        onPick={pick}
        unit="פריטים"
      />

      <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-100/80">
        <HandHeart className="h-3.5 w-3.5" />
        {round.kind === 'share'
          ? 'כל אחד מקבל אותו מספר, והשאר נשאר בסל'
          : 'חצי = חילקנו לשניים, רבע = לארבעה'}
      </p>
    </div>
  );
}
