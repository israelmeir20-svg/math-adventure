/**
 * The pasture: adopted animals grazing on the farm, tap them to make them hop.
 */
import { useState } from 'react';
import { ANIMAL_EMOJIS } from '../kingdom/tileThemes';
import { findAnimal } from './farmAnimalsData';

interface PastureProps {
  /** Adopted animal ids, in adoption order. */
  animalIds: string[];
}

export default function Pasture({ animalIds }: PastureProps) {
  const [bouncing, setBouncing] = useState<string | null>(null);

  if (animalIds.length === 0) {
    return (
      <div className="grid h-full min-h-[8rem] place-items-center rounded-3xl border-4 border-dashed border-emerald-300 bg-emerald-50 p-4 text-center">
        <p className="text-sm font-black text-emerald-900/60">
          המרעה ריק עדיין... הצילו חיה כדי שתרעה כאן 🌱
        </p>
      </div>
    );
  }

  const bounce = (id: string) => {
    setBouncing(id);
    window.setTimeout(() => setBouncing(null), 600);
  };

  return (
    <div className="relative flex min-h-[8rem] flex-wrap items-end justify-center gap-2 overflow-hidden rounded-3xl border-4 border-emerald-300 bg-gradient-to-b from-sky-100 to-emerald-100 p-3">
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-6 bg-emerald-300/60" />
      {animalIds.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => bounce(id)}
          aria-label={`הקפיצו את ${findAnimal(id)?.nameHebrew ?? 'החיה'}`}
          className={`relative z-10 grid h-14 w-14 place-items-center rounded-2xl bg-white/70 text-3xl shadow-[0_3px_0_rgba(0,0,0,0.12)] transition ${
            bouncing === id ? 'animate-[hopSmall_.6s_ease-out]' : ''
          }`}
        >
          {ANIMAL_EMOJIS[id] ?? '🐾'}
        </button>
      ))}
    </div>
  );
}
