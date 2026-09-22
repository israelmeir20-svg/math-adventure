/**
 * Station 5 - "תעלומת העקבות" (Mud Tracks Mystery)
 *
 * A muddy trail shows the prints left behind. Chickens leave 2 tracks, sheep
 * leave 4. The child is told the total heads and feet plus one species' count,
 * and has to deduce how many of the other animal crossed.
 */
import { useMemo, useState } from 'react';
import { Footprints, Search } from 'lucide-react';
import { useFarmTimer } from './useFarmTimer';
import { FarmTimerHud } from './FarmTimerHud';
import { AnswerPad, QuestionBanner, StationBoard } from './StationParts';
import { buildTracksRound } from './farmRounds';
import type { FarmMedal } from './farmTimerData';

interface GameProps {
  onReward: (medal: FarmMedal) => void;
  bestMedalLabel?: string;
}

export default function MudTracksGame({ onReward, bestMedalLabel }: GameProps) {
  const timer = useFarmTimer(onReward);
  const [seed, setSeed] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);

  const round = useMemo(() => {
    void seed;
    return buildTracksRound();
  }, [seed]);

  const nextRound = () => {
    setPicked(null);
    setWrong(null);
    setSeed((value) => value + 1);
  };

  const pick = (value: number) => {
    if (picked !== null || wrong !== null) return;
    if (value !== round.answer) {
      setWrong(value);
      timer.miss();
      window.setTimeout(() => setWrong(null), 420);
      return;
    }
    setPicked(value);
    timer.score();
    window.setTimeout(nextRound, 700);
  };

  // A trail row of print clusters, two per chicken and four per sheep.
  const trail = [
    ...Array.from({ length: round.chickens }, () => 2),
    ...Array.from({ length: round.sheep }, () => 4),
  ];

  return (
    <div className="flex flex-col gap-3">
      <FarmTimerHud
        timer={timer}
        readyHint={bestMedalLabel ? `השיא שלכם: ${bestMedalLabel}` : 'פתרו את תעלומת הבוץ - 6 נכונות לזהב!'}
        challengeLabel="ספרו ראשים ורגליים"
      />

      <StationBoard>
        {/* The muddy trail: each cluster is one animal's prints. */}
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-amber-800/70 to-amber-950/80 p-4">
          {trail.map((prints, index) => (
            <span
              key={index}
              aria-hidden
              className="flex gap-0.5 rounded-xl bg-amber-700/40 px-1.5 py-1"
              style={{ animation: `stampIn .3s ease-out ${index * 0.06}s both` }}
            >
              {Array.from({ length: prints }, (_, p) => (
                <Footprints key={p} className="h-4 w-4 text-amber-200/80" />
              ))}
            </span>
          ))}
        </div>

        {/* The riddle's given facts. */}
        <div className="mt-2 grid grid-cols-2 gap-2 text-center">
          <span className="rounded-2xl bg-white/10 px-2 py-1 text-white">
            <span className="block text-xl font-black tabular-nums">{round.heads}</span>
            <span className="text-[11px] font-bold text-amber-100/85">ראשים 🐔🐑</span>
          </span>
          <span className="rounded-2xl bg-white/10 px-2 py-1 text-white">
            <span className="block text-xl font-black tabular-nums">{round.feet}</span>
            <span className="text-[11px] font-bold text-amber-100/85">רגליים 👣</span>
          </span>
        </div>
      </StationBoard>

      <QuestionBanner emoji="🔎">{round.promptHebrew}</QuestionBanner>

      <AnswerPad
        choices={round.choices}
        wrong={wrong}
        picked={picked}
        disabled={picked !== null}
        onPick={pick}
        unit="חיות"
      />

      <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-100/80">
        <Search className="h-3.5 w-3.5" />
        תרנגולת = 2 רגליים, כבשה = 4 רגליים
      </p>
    </div>
  );
}
