/**
 * Warm, rustic barn chrome shared by the farm hub and its stations.
 *
 * The district used to look like a flat dark-green smartphone app. This module
 * restores the farm feeling with timber-plank textures built purely from CSS
 * gradients (no image binaries): warm plank walls, an amber lantern glow, straw
 * accents and wood-framed containers.
 */
import type { ReactNode } from 'react';

/** Repeating vertical timber planks, in two warm wood tones. */
export const PLANK_WALL =
  'repeating-linear-gradient(90deg,#5b3a1e 0px,#6b4522 26px,#4a2f17 28px,#6b4522 30px)';

/** Amber lantern light pooling down from the rafters. */
export const LANTERN_GLOW =
  'radial-gradient(circle at 50% -10%,rgba(253,224,120,0.45) 0%,rgba(180,83,9,0.15) 45%,transparent 75%)';

/** A wood-framed, straw-lit container for board content. */
export function BarnFrame({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-4 border-amber-900/80 shadow-[inset_0_0_32px_rgba(120,53,15,0.85),0_6px_0_rgba(0,0,0,0.35)] ${className}`}
    >
      {/* Straw / hay texture: soft horizontal straw streaks under the content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(115deg,rgba(253,230,138,0.9) 0px,rgba(253,230,138,0.9) 2px,transparent 2px,transparent 9px),repeating-linear-gradient(75deg,rgba(217,119,6,0.7) 0px,rgba(217,119,6,0.7) 1px,transparent 1px,transparent 13px)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** A little wooden sign, used for prompts and the answer read-out. */
export function BarnSign({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      dir="rtl"
      className={`rounded-xl border-4 border-amber-950/80 bg-gradient-to-b from-amber-500 to-amber-700 px-3 py-2 text-center text-amber-50 shadow-[0_4px_0_#451a03] ${className}`}
      style={{
        backgroundImage:
          'repeating-linear-gradient(90deg,rgba(0,0,0,0.06) 0px,rgba(0,0,0,0.06) 3px,transparent 3px,transparent 14px)',
      }}
    >
      {children}
    </div>
  );
}

/** Tiny straw tufts to scatter as decoration. */
export function StrawAccent({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none select-none text-lg leading-none opacity-80 ${className}`}
    >
      🌾
    </span>
  );
}
