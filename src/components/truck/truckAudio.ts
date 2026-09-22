/**
 * The cargo hub's sound: every noise in the game, synthesised with the Web Audio API.
 *
 * ===================================================================
 * WHY SYNTHESIS RATHER THAN FILES.
 * ===================================================================
 *
 * A dispatch is a three-part event - the crates settling, the doors closing, the
 * engine pulling away - and each part has to fire at a moment the game decides. Audio
 * files would have to be shipped, decoded and hoped into sync; oscillators are
 * scheduled on the audio clock and land exactly where they are put.
 *
 * ===================================================================
 * AUTOPLAY IS HANDLED BY RESUMING, NOT BY GIVING UP.
 * ===================================================================
 *
 * Browsers create an `AudioContext` suspended until a real gesture unlocks it, and
 * the failure is silent: every call succeeds and produces nothing. So `prime()` is
 * called from the first tap of the game and resumes inside that gesture, and every
 * play path calls `ensureRunning()` first so a context suspended by a backgrounded
 * tab is revived before scheduling rather than after.
 *
 * Everything degrades to a silent game rather than a crash - a child with audio
 * disabled must still be able to do the arithmetic.
 *
 * ===================================================================
 * THE LOAD CLICK IS DELIBERATELY MUTED.
 * ===================================================================
 *
 * The child taps the shelf a dozen times a round, and a bright click on each tap
 * becomes fatiguing within one sprint. It is a short, soft thud instead: enough to
 * confirm the tap landed, quiet enough to be ignorable, and pitched low so it never
 * masks the two sounds that carry meaning - the dispatch fanfare and the buzzer.
 */
import { useCallback, useEffect, useMemo } from 'react';

/** One lazily-created context shared by every sound in the game. */
let ctx: AudioContext | null = null;
let contextFailed = false;

/** Every voice currently sounding, so they can all be silenced at once. */
interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
}
const voices = new Set<Voice>();

function getContext(): AudioContext | null {
  if (ctx || contextFailed) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) {
    contextFailed = true;
    return null;
  }
  try {
    ctx = new Ctor();
  } catch {
    contextFailed = true;
    return null;
  }
  return ctx;
}

/** Resumes a suspended context. Must be called inside a user gesture the first time. */
export function primeFor(): void {
  const audio = getContext();
  if (audio && audio.state === 'suspended') void audio.resume();
}

function ensureRunning(): AudioContext | null {
  const audio = getContext();
  if (!audio) return null;
  if (audio.state === 'suspended') void audio.resume();
  return audio;
}

/**
 * Silences and releases every voice, immediately.
 *
 * The gain is ramped to silence over a few milliseconds rather than cut, because a
 * hard stop leaves the speaker cone mid-swing and clicks - which on a dispatch, the
 * loudest moment in the game, is exactly where a pop would be audible.
 */
export function stopAllVoices(): void {
  const audio = ctx;
  if (!audio) return;
  for (const voice of voices) {
    try {
      const now = audio.currentTime;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
      voice.osc.stop(now + 0.03);
    } catch {
      /* a voice that already stopped is nothing to fix */
    }
    voices.delete(voice);
  }
}

interface Note {
  frequency: number;
  /** Seconds from the start of the tone. */
  at: number;
  duration: number;
  gain: number;
  type: OscillatorType;
  /** Optional end frequency, for a sweep. */
  sweepTo?: number;
}

/**
 * Schedules one note and registers its voice for teardown.
 *
 * Everything is scheduled ahead of time on the audio clock and stopped by the graph
 * itself, so no timers run during playback and a fanfare cannot be jittered by React
 * re-rendering.
 */
function schedule(audio: AudioContext, note: Note) {
  const start = audio.currentTime + note.at;
  const end = start + note.duration;

  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = note.type;
  osc.frequency.setValueAtTime(note.frequency, start);
  if (note.sweepTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(note.sweepTo, start + note.duration * 0.9);
  }

  // A short attack, then an exponential decay. Exponential ramps cannot reach zero,
  // which is why every target is a small epsilon rather than 0.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(note.gain, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain).connect(audio.destination);

  /*
   * THE VOICE IS TRACKED AND SELF-REMOVING. Registering it lets `stopAllVoices`
   * silence a sound that is still ringing when the modal closes; removing it on
   * `ended` is what stops the registry growing for the life of the session - a long
   * sprint plays hundreds of notes, and a Set that only ever grew would be its own
   * slow leak.
   */
  const voice: Voice = { osc, gain };
  voices.add(voice);
  osc.addEventListener('ended', () => {
    voices.delete(voice);
    try {
      osc.disconnect();
      gain.disconnect();
    } catch {
      /* already detached */
    }
  });

  osc.start(start);
  osc.stop(end + 0.02);
}

function play(notes: Note[]) {
  const audio = ensureRunning();
  if (!audio) return;
  for (const note of notes) schedule(audio, note);
}

/* ------------------------------------------------------------------
 * The sounds
 * ------------------------------------------------------------------ */

/**
 * A crate landing in the truck bed. Short, soft and low.
 *
 * Built from a fast downward sweep rather than a pitched note, so it reads as an
 * impact rather than as music - the child needs to know their tap registered, not to
 * hear a tune on every crate.
 */
export function playCrateLoad() {
  play([
    { frequency: 190, at: 0, duration: 0.12, gain: 0.11, type: 'sine', sweepTo: 90 },
  ]);
}

/** A crate lifted back out. Slightly higher and shorter, so unload is distinguishable. */
export function playCrateUnload() {
  play([
    { frequency: 130, at: 0, duration: 0.1, gain: 0.09, type: 'sine', sweepTo: 210 },
  ]);
}

/**
 * The horn: a two-tone blast, for the cab-tap easter egg.
 *
 * A CLOSE HARMONIC PAIR RATHER THAN ONE PITCH, which is what makes a horn sound like a
 * horn rather than a beep. The two tones are a fifth apart and started a hair apart, so
 * they beat against each other and give the blast a brassy edge.
 *
 * Kept short and quiet: it is a reward for curiosity, not a siren, and a child who finds it
 * will press it many times in a row.
 */
export function playHorn() {
  play([
    { frequency: 392, at: 0, duration: 0.22, gain: 0.12, type: 'sawtooth' },
    { frequency: 494, at: 0.02, duration: 0.24, gain: 0.1, type: 'sawtooth' },
    { frequency: 262, at: 0, duration: 0.22, gain: 0.06, type: 'square' },
  ]);
}

/**
 * The dispatch: doors, engine, and a rising fanfare as the truck pulls away.
 *
 * THE THREE PARTS ARE THE ANIMATION, IN SOUND. The thud is the doors closing, the
 * sweep is the engine revving, and the arpeggio is the truck getting away with it -
 * and they are timed against the 500ms drive-off so the fanfare peaks as the truck
 * leaves the frame. A single "success" blip would have said the answer was right; this
 * says the truck left, which is the thing the child actually did.
 */
export function playDispatch() {
  play([
    // Doors closing: a dull double thud.
    { frequency: 120, at: 0, duration: 0.1, gain: 0.18, type: 'sine', sweepTo: 60 },
    { frequency: 100, at: 0.07, duration: 0.12, gain: 0.15, type: 'sine', sweepTo: 50 },
    // Engine pulling away.
    { frequency: 90, at: 0.16, duration: 0.3, gain: 0.14, type: 'sawtooth', sweepTo: 200 },
    // The fanfare, rising as it goes.
    { frequency: 523.25, at: 0.16, duration: 0.16, gain: 0.14, type: 'triangle' },
    { frequency: 659.25, at: 0.26, duration: 0.18, gain: 0.14, type: 'triangle' },
    { frequency: 880, at: 0.36, duration: 0.3, gain: 0.15, type: 'triangle' },
  ]);
}

/**
 * The mistake: a dull buzzer, not a musical note.
 *
 * A square wave at a LOW pitch with a slow decay. Deliberately ugly and deliberately
 * unpitched - a "sad" musical phrase would suggest the load was close, while a buzzer
 * says the dispatch was rejected, which is the fact.
 */
export function playBuzzer() {
  play([
    { frequency: 155, at: 0, duration: 0.34, gain: 0.12, type: 'square' },
    { frequency: 146, at: 0, duration: 0.34, gain: 0.1, type: 'square' },
  ]);
}

/**
 * The overload alert: a sharper double beep.
 *
 * Distinct from the buzzer on purpose. Overloading is a WARNING - the child can still
 * unload and try again - whereas a wrong dispatch ends the round. Sharing one sound
 * for both would make a fixable mistake feel fatal.
 */
export function playOverloadAlert() {
  play([
    { frequency: 330, at: 0, duration: 0.11, gain: 0.1, type: 'square' },
    { frequency: 330, at: 0.15, duration: 0.13, gain: 0.1, type: 'square' },
  ]);
}

/** The end-of-sprint flourish, scaled to the medal. */
export function playMedalFanfare(medal: 'bronze' | 'silver' | 'gold' | null) {
  if (!medal) {
    play([{ frequency: 392, at: 0, duration: 0.3, gain: 0.1, type: 'sine' }]);
    return;
  }
  // Higher and longer for better medals, so the tier is audible before it is read.
  const steps = medal === 'gold' ? [0, 4, 7, 12, 16] : medal === 'silver' ? [0, 4, 7, 12] : [0, 5, 7];
  play(
    steps.map((interval, i) => ({
      frequency: 392 * 2 ** (interval / 12),
      at: i * 0.11,
      duration: 0.34,
      gain: 0.14,
      type: 'triangle' as const,
    })),
  );
}

/* ==================================================================
 * THE HOOK
 * ================================================================== */

export function useCargoAudio() {
  useEffect(() => {
    primeFor();
  }, []);

  /*
   * UNMOUNT TEARS EVERY VOICE DOWN. This is the difference between closing the depot
   * and leaving the engine running: the context is module-scoped and shared, so an
   * oscillator with no stop time would outlive the component entirely and drone on
   * over the town map.
   */
  useEffect(() => () => stopAllVoices(), []);

  const prime = useCallback(() => primeFor(), []);
  const silence = useCallback(() => stopAllVoices(), []);

  return useMemo(
    () => ({
      prime,
      silence,
      playCrateLoad,
      playCrateUnload,
      playHorn,
      playDispatch,
      playBuzzer,
      playOverloadAlert,
      playMedalFanfare,
    }),
    [prime, silence],
  );
}

/** The context's state, or 'none'. Exposed so a probe can assert the unlock. */
export function audioState(): string {
  return ctx?.state ?? 'none';
}

/** How many voices are currently live. Exposed for the leak check. */
export function liveVoiceCount(): number {
  return voices.size;
}

/*
 * THE PROBE HOOKS ARE DEV-ONLY, AND THE GUARD IS NOT OPTIONAL.
 *
 * Autoplay policy and voice leaks are the two failures that are INVISIBLE in the UI -
 * a suspended context plays nothing and throws nothing - so they have to be observable
 * from a test. `import.meta.env.DEV` keeps the properties off the production window,
 * where a global that hands out live oscillator counts is just surface area.
 */
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__cargoAudioState = audioState;
  (window as unknown as Record<string, unknown>).__cargoVoiceCount = liveVoiceCount;
}
