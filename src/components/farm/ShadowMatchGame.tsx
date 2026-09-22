/**
 * Shadow Match: find the silhouette that matches the animal exactly.
 * Visual perception only - no maths involved.
 */
import { useMemo, useState } from 'react';
import { PawPrint, RotateCcw } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAnswerFeedback } from '../math/useAnswerFeedback';
import type { FarmAnimal, ShadowCard as ShadowCardData } from './farmAnimalsData';
import { buildShadowRound, SHADOW_COOKIE_REWARD } from './shadowRounds';
import ShadowCard from './ShadowCard';

interface ShadowMatchGameProps {
  /** Animals still waiting to be rescued. */
  pool: FarmAnimal[];
  onRescued: (animal: FarmAnimal) => void;
}

export default function ShadowMatchGame({ pool, onRescued }: ShadowMatchGameProps) {
  const { adoptAnimal, addCookies } = useGame();
  const feedback = useAnswerFeedback();
  const [attempt, setAttempt] = useState(0);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [solved, setSolved] = useState(false);

  const round = useMemo(() => {
    // `attempt` re-rolls a fresh animal + silhouettes for each rescue.
    void attempt;
    const animal = pool[Math.floor(Math.random() * pool.length)] as FarmAnimal;
    return buildShadowRound(animal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const { animal, cards } = round;

  const handlePick = (card: ShadowCardData) => {
    if (solved) return;

    if (card.variant.kind !== 'exact') {
      // Gentle nudge only - no penalty, streak untouched.
      setWrongId(card.id);
      feedback(false);
      window.setTimeout(() => setWrongId(null), 500);
      return;
    }

    setSolved(true);
    feedback.celebrate();
    adoptAnimal(animal.id);
    addCookies(SHADOW_COOKIE_REWARD);
    onRescued(animal);
  };

  const reset = () => {
    setSolved(false);
    setWrongId(null);
    setAttempt((current) => current + 1);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3 rounded-3xl bg-white px-5 py-3 shadow-[0_4px_0_rgba(0,0,0,0.12)]">
        <svg viewBox={animal.viewBox} className="h-20 w-20" role="img" aria-hidden>
          <g fill={animal.fill} stroke={animal.fill} strokeWidth={2} strokeLinejoin="round">
            {animal.body.map((path, index) => (
              <path key={`body-${index}`} d={path} />
            ))}
            {animal.features.map((feature, index) => (
              <path key={index} d={feature} />
            ))}
          </g>
        </svg>
        <div>
          <p className="text-lg font-black text-emerald-900">{animal.nameHebrew}</p>
          <p className="text-xs font-bold text-emerald-900/60">
            מצאו את הצללית הזהה בדיוק!
          </p>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((card, index) => (
          <ShadowCard
            key={card.id}
            animal={animal}
            card={card}
            index={index}
            disabled={solved}
            wrong={wrongId === card.id}
            onPick={handlePick}
          />
        ))}
      </div>

      {solved ? (
        <div className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3 text-center">
          <p className="flex items-center gap-2 text-lg font-black text-emerald-800">
            <PawPrint className="h-5 w-5" />
            {animal.nameHebrew} הצטרף לחווה! +{SHADOW_COOKIE_REWARD} 🍪
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-black text-emerald-950 shadow-[0_4px_0_#047857] transition active:translate-y-[3px] active:shadow-none"
          >
            הצילו חיה נוספת 🐾
          </button>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-xs font-bold text-stone-400">
          <RotateCcw className="h-3.5 w-3.5" />
          בחרו את הצללית הזהה בדיוק - בלי עונש על טעות
        </p>
      )}
    </div>
  );
}
