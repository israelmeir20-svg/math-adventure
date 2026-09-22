/**
 * A single selectable shadow card with tactile press + wobble feedback.
 */
import AnimalSilhouette from './AnimalSilhouette';
import type { FarmAnimal, ShadowCard as ShadowCardData } from './farmAnimalsData';

interface ShadowCardProps {
  animal: FarmAnimal;
  card: ShadowCardData;
  index: number;
  disabled: boolean;
  wrong: boolean;
  onPick: (card: ShadowCardData) => void;
}

export default function ShadowCard({
  animal,
  card,
  index,
  disabled,
  wrong,
  onPick,
}: ShadowCardProps) {
  return (
    <button
      type="button"
      onClick={() => onPick(card)}
      disabled={disabled}
      aria-label={`צללית מספר ${index + 1}`}
      className={`flex flex-col items-center gap-2 rounded-3xl border-4 bg-white p-2 transition ${
        wrong
          ? 'animate-[wobble_.4s_ease-in-out] border-rose-300'
          : 'border-stone-200 hover:border-amber-300'
      } shadow-[0_5px_0_rgba(0,0,0,0.15)] active:translate-y-[4px] active:shadow-none disabled:cursor-default disabled:opacity-70`}
    >
      <AnimalSilhouette animal={animal} variant={card.variant} className="h-20 w-20" />
      <span className="text-[11px] font-black text-stone-400">{index + 1}</span>
    </button>
  );
}
