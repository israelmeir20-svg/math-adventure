/**
 * The neon synthesizer key, and the equalizer meter.
 *
 * Presentational only: they are told what to look like and never decide anything.
 * That split matters here because the key has six distinct visual states and the
 * game has a dozen places that can put it in one of them - deriving the state in
 * the game and passing a single `state` prop keeps that logic in one place instead
 * of spread across a chain of booleans.
 */
import { memo } from 'react';

/**
 * Every visual state a key can be in.
 *
 * `lit` and `solved` are separate because they mean different things: `lit` is a
 * key that is being played right now (the sound-wave playback), while `solved` is
 * a key that has been answered and is now correct. A key can be either, and the
 * playback sweep should win.
 */
export type KeyState = 'idle' | 'lit' | 'missing' | 'imposter' | 'wrong' | 'solved';

/**
 * The neon palettes, cycled across the five keys.
 *
 * Cycled rather than fixed so the row reads as a light show, and the glow is baked
 * into each palette so a lit key never has to compose its own shadow with the
 * base colour - which is what makes the colours stay vivid instead of muddying
 * into each other where two glows overlap.
 */
const NEON = [
  {
    base: 'border-pink-500 bg-pink-950/40 text-pink-200 shadow-[0_0_15px_rgba(236,72,153,0.4)]',
    lit: 'border-pink-300 bg-pink-500/70 text-white shadow-[0_0_34px_rgba(236,72,153,0.95)] scale-105',
  },
  {
    base: 'border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.4)]',
    lit: 'border-cyan-200 bg-cyan-400/70 text-white shadow-[0_0_34px_rgba(34,211,238,0.95)] scale-105',
  },
  {
    base: 'border-amber-400 bg-amber-950/40 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.4)]',
    lit: 'border-amber-200 bg-amber-400/70 text-white shadow-[0_0_34px_rgba(251,191,36,0.95)] scale-105',
  },
  {
    base: 'border-fuchsia-500 bg-fuchsia-950/40 text-fuchsia-200 shadow-[0_0_15px_rgba(217,70,239,0.4)]',
    lit: 'border-fuchsia-200 bg-fuchsia-500/70 text-white shadow-[0_0_34px_rgba(217,70,239,0.95)] scale-105',
  },
  {
    base: 'border-emerald-400 bg-emerald-950/40 text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.4)]',
    lit: 'border-emerald-200 bg-emerald-400/70 text-white shadow-[0_0_34px_rgba(52,211,153,0.95)] scale-105',
  },
] as const;

/** The palette for a key index, wrapping if there are more keys than colours. */
function neonFor(index: number) {
  return NEON[index % NEON.length]!;
}

interface NeonKeyProps {
  index: number;
  /** The number to show, or null when the key should show a `?`. */
  value: number | null;
  state: KeyState;
  /** Called when the key itself is tapped. Omit to make the key inert. */
  onPress?: () => void;
  /** Describes the key to a screen reader, e.g. "קליד 3, מספר 42". */
  label: string;
}

function NeonKeyInner({ index, value, state, onPress, label }: NeonKeyProps) {
  const neon = neonFor(index);
  const interactive = Boolean(onPress);

  /*
   * The glow and border come from the palette; the STATE only decides which
   * palette entry applies. Keeping the two apart is what stops the styles
   * cascading into each other - a `wrong` key is red no matter which colour it
   * would otherwise have been.
   */
  const tone =
    state === 'lit'
      ? neon.lit
      : state === 'wrong'
        ? 'border-rose-400 bg-rose-600/60 text-white shadow-[0_0_26px_rgba(244,63,94,0.85)] animate-[wobble_.45s_ease-in-out]'
        : state === 'solved'
          ? 'border-emerald-300 bg-emerald-500/50 text-white shadow-[0_0_24px_rgba(52,211,153,0.75)]'
          : state === 'imposter'
            ? 'border-amber-300 bg-slate-900/80 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.5)]'
            : state === 'missing'
              ? 'border-dashed border-slate-500 bg-slate-900/60 text-amber-300 animate-[pulseGlow_1.6s_ease-in-out_infinite]'
              : neon.base;

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={!interactive}
      aria-label={label}
      /* The spec's own key geometry: wide, tall, rounded, bold numeral. */
      className={`flex h-24 w-14 flex-col items-center justify-center rounded-2xl border-2 text-2xl font-black transition-all duration-200 md:h-32 md:w-20 md:text-3xl ${
        interactive ? 'cursor-pointer hover:brightness-125 active:translate-y-[3px]' : 'cursor-default'
      } ${tone}`}
    >
      {value === null ? (
        <span className="text-3xl md:text-4xl" aria-hidden>
          ?
        </span>
      ) : (
        <span className="tabular-nums">{value}</span>
      )}
    </button>
  );
}

export const NeonKey = memo(NeonKeyInner);

/**
 * The streak equalizer: a row of bars that climb with consecutive correct answers.
 *
 * A bar is "on" when the streak has reached it, so the meter reads as a level
 * rather than as a single moving needle - which is what makes it legible at a
 * glance while the child is reading a number sequence.
 */
export function Equalizer({ streak, bars = 6 }: { streak: number; bars?: number }) {
  const lit = Math.min(bars, Math.max(0, streak));

  return (
    <span
      className="flex items-end gap-[3px]"
      role="img"
      aria-label={`רצף ${streak}`}
      title={`רצף ${streak}`}
    >
      {Array.from({ length: bars }, (_, i) => {
        const on = i < lit;
        // Bars climb towards the middle so the meter looks like a live level
        // display rather than a staircase.
        const height = 6 + Math.round(10 * Math.sin(((i + 1) / (bars + 1)) * Math.PI));
        return (
          <span
            key={i}
            style={{ height }}
            className={`w-[3px] rounded-full transition-all duration-200 ${
              on
                ? 'bg-gradient-to-t from-cyan-400 to-fuchsia-400 shadow-[0_0_7px_rgba(34,211,238,0.9)]'
                : 'bg-slate-600/70'
            }`}
          />
        );
      })}
    </span>
  );
}
