/**
 * Shared district stat card for the illustrated interiors.
 *
 * Games and stat strips sit on top of photographic artwork, so every value
 * needs a frosted dark backdrop to stay legible. Collected here so all
 * districts get byte-identical contrast treatment.
 */
import type { ReactNode } from 'react';

export function DistrictStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <li className="flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-amber-950/50 px-2 py-0.5 text-white shadow-lg backdrop-blur-md">
      <span className="flex items-center gap-1 text-sm font-black tabular-nums drop-shadow">
        {icon}
        {value}
      </span>
      <span className="text-[10px] font-bold text-amber-100/85">{label}</span>
    </li>
  );
}
