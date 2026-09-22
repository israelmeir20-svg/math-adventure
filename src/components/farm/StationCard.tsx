/**
 * A single colourful station badge on the farm hub.
 *
 * Shows the station emoji, its Hebrew title, the skill chip and the best medal
 * earned so far (a dimmed placeholder until it is won).
 */
import { ChevronLeft } from 'lucide-react';
import { findMedal, type FarmMedalId } from './farmTimerData';
import type { FarmStation } from './farmStations';

interface StationCardProps {
  station: FarmStation;
  best?: FarmMedalId;
  onOpen: () => void;
}

export default function StationCard({ station, best, onOpen }: StationCardProps) {
  const medal = best ? findMedal(best) : null;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`flex h-full w-full items-center gap-3 rounded-3xl bg-gradient-to-b ${station.tone} p-3 text-start text-white shadow-[0_6px_0_rgba(0,0,0,0.35)] transition active:translate-y-[4px] active:shadow-none`}
      >
        <span
          aria-hidden
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 text-3xl ring-2 ring-white/40"
        >
          {station.emoji}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-base font-black leading-tight">
            {station.title}
          </span>
          <span className="mt-0.5 block text-[11px] font-bold text-white/85">
            {station.blurb}
          </span>
          <span className="mt-1 inline-block rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-black">
            {station.skill}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-center gap-1">
          <span
            className={`grid h-10 w-10 place-items-center rounded-2xl text-xl ${
              medal ? 'bg-white/90' : 'bg-black/20 opacity-70'
            }`}
            title={medal ? `המדליה הטובה: ${medal.labelHebrew}` : 'עוד אין מדליה'}
          >
            {medal ? medal.emoji : '🏅'}
          </span>
          <ChevronLeft className="h-4 w-4 text-white/80" />
        </span>
      </button>
    </li>
  );
}
