/**
 * The Beat Studio's synthesizer: every sound in the game, generated from the Web
 * Audio API. There is not a single audio file in this game.
 *
 * ===================================================================
 * WHY SYNTHESIS RATHER THAN SAMPLES, AND WHY THE SCALE IS PROCEDURAL.
 * ===================================================================
 *
 * The game's premise is that the maths and the pitch are the SAME THING - key 3
 * lights up and sounds like the third note of a melody. Samples would have to be
 * shipped, decoded and kept in the right order, and the "5-note victory arpeggio"
 * would become five separate files that can arrive late.
 *
 * A synthesizer goes further than samples here: because the pitches are COMPUTED,
 * every round can be written in a different key and a different mode. A fixed
 * C-major scale means the fifth track of a sprint sounds exactly like the first,
 * and after ten rounds a child stops hearing the melody as information. Freshly
 * transposed pitches make each round's sequence audibly its own - which is what
 * lets the ear do some of the work the eyes are doing.
 *
 * ===================================================================
 * AUTOPLAY IS HANDLED BY RESUMING, NOT BY GIVING UP.
 * ===================================================================
 *
 * Browsers create an `AudioContext` in the `suspended` state until a real user
 * gesture unlocks it. The failure mode is nasty and silent: every call to play a
 * note succeeds, schedules its oscillators, and produces no sound at all, while the
 * game carries on looking fine. So:
 *
 *   1. `prime()` is called from the first tap of the game and resumes the context
 *      INSIDE that gesture. It is safe to call as often as you like.
 *   2. Every play path calls `ensureRunning()` first, so a context that got
 *      suspended again - the tab was backgrounded, the OS slept - is resumed
 *      before scheduling rather than after.
 *   3. Everything degrades to a silent game rather than a crash. A child with
 *      audio disabled must still be able to play the maths.
 *
 * ===================================================================
 * VOICES ARE TRACKED AND TORN DOWN, AND THAT IS NOT OPTIONAL.
 * ===================================================================
 *
 * An oscillator that is started but never stopped does not merely leak - it drones
 * forever, and a player who opens and closes the studio repeatedly would build up
 * a chord of stuck tones. Worse, the ROUND PREVIEW can be interrupted by the next
 * round, so notes scheduled for a melody that no longer exists have to be actively
 * silenced.
 *
 * Every voice therefore registers itself in a `Set`, and is removed on its own
 * `ended` event. `stopAll()` silences everything in flight, which is what the modal
 * calls on unmount and whenever a new round interrupts an old preview.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { imposterFrequency } from './beatStudioMusic';

/** One lazily-created context shared by every sound in the game. */
let ctx: AudioContext | null = null;
let contextFailed = false;

/**
 * Every voice currently making sound, so they can all be silenced at once.
 *
 * The nodes are held as a pair: the oscillator to stop, and the gain to duck. Both
 * are needed - stopping an oscillator mid-envelope still clicks, so the gain has to
 * be ramped down first.
 */
interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
}
const voices = new Set<Voice>();

/**
 * The shared context, or null when the browser will not give us one.
 *
 * `contextFailed` latches a failure so a browser with no Web Audio support is not
 * re-probed on every single key press.
 */
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

/**
 * Resumes a suspended context. Must be called from inside a user gesture the first
 * time, which is what `prime` is for.
 */
export function primeFor(): void {
  const audio = getContext();
  if (audio && audio.state === 'suspended') void audio.resume();
}

/** Resumes if needed. Called before every scheduled note. */
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
 * hard stop leaves the speaker cone mid-swing and clicks. The ramp is short enough
 * to read as instant, which is what an interrupted preview needs.
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

/* ==================================================================
 * PLAYBACK
 * ================================================================== */

/**
 * A note's recipe: a frequency, how long it rings, and how loud.
 *
 * `attack` and `release` are what stop the sound being a click. A raw oscillator
 * started and stopped abruptly produces an audible pop at both ends, because the
 * gain jumps from zero to full in a single sample; ramping both edges is the
 * difference between a chime and a buzz.
 */
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
 * Schedules one note, and registers its voice for teardown.
 *
 * Everything is scheduled AHEAD of time onto the audio clock and stopped by the
 * graph itself - no timers run during playback, so a melody cannot be jittered by
 * React re-rendering. `osc.stop()` is called up front, which is what lets the
 * browser release the node without anyone polling it.
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

  // A short attack, then an exponential decay. Exponential ramps cannot touch
  // zero, which is why every target is a small epsilon rather than 0.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(note.gain, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain).connect(audio.destination);

  /*
   * THE VOICE IS TRACKED AND SELF-REMOVING.
   *
   * Registering it lets `stopAllVoices` silence a preview that has been
   * interrupted. Removing it on `ended` is what stops the registry growing for the
   * life of the session - a long sprint plays hundreds of notes, and a Set that only
   * ever grew would be its own slow leak.
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

/** Plays a list of notes, scheduling them all on one clock. */
function play(notes: Note[]) {
  const audio = ensureRunning();
  if (!audio) return;
  for (const note of notes) schedule(audio, note);
}

const CHIME: Pick<Note, 'duration' | 'gain' | 'type'> = {
  duration: 0.4,
  gain: 0.16,
  type: 'triangle',
};

/* ------------------------------------------------------------------
 * Direct key and button interaction
 * ------------------------------------------------------------------ */

/**
 * A single key's pitch as it is tapped.
 *
 * Brief and slightly shorter than a preview note, so a fast run of taps does not
 * smear into one another. Audibly identical in pitch, which is the point: the tap
 * and the preview must sound like the same instrument.
 */
export function playPitch(frequency: number, gain = 0.18) {
  play([{ frequency, at: 0, duration: 0.32, gain, type: 'triangle' }]);
}

/**
 * A candidate button's own pitch, for the missing-note challenge.
 *
 * Each launchpad is assigned one of the five scale pitches, so tapping a wrong
 * option is not just a rejection - the child HEARS that it was the wrong note in the
 * melody, which is a far more useful cue than a buzzer.
 */
export function playCandidatePitch(frequency: number) {
  playPitch(frequency, 0.16);
}

/** A key's pitch played as part of a run, with the given gap. */
function runNotes(
  frequencies: readonly number[],
  indices: readonly number[],
  gapMs: number,
  includeMissing: (index: number) => boolean,
): Note[] {
  const notes: Note[] = [];
  indices.forEach((index, order) => {
    /*
     * A MUTED KEY IS A SILENT SLOT, NOT A MISSING ONE.
     *
     * The missing-note challenge earns its name from the audible hole in the
     * rhythm: the preview still waits for the beat, so the child hears the gap
     * where the note should be. Skipping the slot entirely would collapse the
     * rhythm and make the omission inaudible.
     */
    if (!includeMissing(index)) return;
    const frequency = frequencies[
      Math.min(frequencies.length - 1, Math.max(0, index))
    ]!;
    notes.push({ frequency, at: (order * gapMs) / 1000, ...CHIME });
  });
  return notes;
}

/**
 * The full in-tempo preview of a round, which is the heart of the game's teaching.
 *
 * The child hears the sequence before answering, so the pattern is presented
 * through the ear as well as the eye. What the preview SOUNDS is exactly what the
 * round is asking about:
 *
 *   - a normal key plays its clean pitch
 *   - the missing key plays NOTHING, leaving a hole in the rhythm
 *   - the imposter key plays a detuned tritone buzz, so the wrong note is obvious
 *
 * `mutedIndex` and `detunedIndex` are separate parameters rather than one "odd key
 * out" because the two produce different sounds and only one of them can apply to a
 * given round.
 */
export function playPreview(
  frequencies: readonly number[],
  options: {
    mutedIndex?: number;
    detunedIndex?: number;
    stepMs?: number;
  } = {},
) {
  const { mutedIndex = -1, detunedIndex = -1, stepMs = 280 } = options;
  const indices = [0, 1, 2, 3, 4];

  const notes = runNotes(frequencies, indices, stepMs, (i) => i !== mutedIndex);

  // The detuned key is scheduled at its own slot, as a harsh sustained buzz.
  if (detunedIndex >= 0) {
    const correct = frequencies[
      Math.min(frequencies.length - 1, Math.max(0, detunedIndex))
    ]!;
    notes.push({
      frequency: imposterFrequency(correct),
      at: (detunedIndex * stepMs) / 1000,
      // Longer than a chime, so it hangs over the following notes as a wrong note
      // played on top of a run - which is how a real out-of-tune key behaves.
      duration: 0.5,
      gain: 0.19,
      // Sawtooth rather than triangle: the richer harmonic series is what makes it
      // read as a broken machine key instead of a different musical note.
      type: 'sawtooth',
    });
  }

  play(notes);
}

/**
 * The detuned buzz alone, for when the imposter key is tapped but not yet fixed.
 */
export function playDetunedBuzz(correctFrequency: number) {
  play([
    {
      frequency: imposterFrequency(correctFrequency),
      at: 0,
      duration: 0.42,
      gain: 0.2,
      type: 'sawtooth',
    },
  ]);
}

/** A run of scale pitches, in the order given (the victory sweep). */
export function playPitchRun(frequencies: readonly number[], gapMs = 190) {
  play(runNotes(frequencies, [0, 1, 2, 3, 4], gapMs, () => true));
}

/** The full five-note flourish in the round's own key. */
export function playVictoryArpeggio(frequencies: readonly number[]) {
  playPitchRun(frequencies, 150);
}

/**
 * The mistake: a short, buzzy, DISSONANT chord.
 *
 * Two square waves a semitone apart. A semitone is the smallest interval in
 * Western music and the beating between two such close frequencies is physically
 * unpleasant - which is the point. A merely "sad" sound would not discourage a
 * wrong tap the way a sour chord does.
 *
 * The pair is derived from the round's root so the buzz is in the same register as
 * the track, rather than a fixed 293Hz that would sit oddly under a low E4 track.
 */
export function playMistakeBuzz(root = 293.66) {
  play([
    { frequency: root, at: 0, duration: 0.34, gain: 0.075, type: 'square' },
    { frequency: root * 2 ** (1 / 12), at: 0, duration: 0.34, gain: 0.075, type: 'square' },
  ]);
}

/**
 * A brief muted thud for a wrong candidate button.
 *
 * Deliberately shorter and lower than the mistake buzz: the button buzz says "not
 * that one", while the stage buzz says "that was a mistake". Only the second one
 * costs points, so they should not sound identical.
 */
export function playWrongPick(root = 220) {
  play([
    { frequency: root * 0.75, at: 0, duration: 0.16, gain: 0.09, type: 'sine', sweepTo: root * 0.5 },
  ]);
}

/**
 * The tempo challenge's drum hit.
 *
 * A drum is a noise burst, not a pitched note, so it is built from a fast downward
 * frequency sweep - 180Hz to 55Hz in a tenth of a second reads as a kick drum. Kept
 * short and low so it is unmistakably different from the melodic keys.
 */
export function playDrumHit() {
  play([
    { frequency: 180, at: 0, duration: 0.26, gain: 0.28, type: 'sine', sweepTo: 55 },
  ]);
}

/**
 * The "fix chord" for correcting the imposter: the wrong pitch resolving to the
 * right one. Small, but it is the audible reward for spotting the error.
 */
export function playFixChord(fromFrequency: number, toFrequency: number) {
  play([
    { frequency: fromFrequency, at: 0, duration: 0.16, gain: 0.13, type: 'sawtooth' },
    { frequency: toFrequency, at: 0.1, duration: 0.3, gain: 0.17, type: 'triangle' },
    { frequency: toFrequency * 1.5, at: 0.1, duration: 0.3, gain: 0.09, type: 'sine' },
  ]);
}

/**
 * A single note of a melody, with an explicit duration.
 *
 * ===================================================================
 * WHY THE SANDBOX NEEDS ITS OWN ENTRY POINT.
 * ===================================================================
 *
 * `playPitch` is the sprint's key sound and its duration is FIXED at 0.32s, which is
 * correct there: every key press is a short, identical blip, and a run of fast taps
 * must not smear together.
 *
 * A melody is the opposite problem. The note table in `freePlayCatalog` gives each
 * step its own length - a phrase's closing note is held for 0.85s while a passing
 * note is 0.3s - and squeezing those into a fixed 0.32s would flatten the tune into
 * a metronome. So this takes the duration from the caller and keeps everything else
 * (the triangle voice, the 12ms attack, the exponential decay) identical to
 * `playPitch`, which is what makes the sandbox sound like the same instrument.
 *
 * The duration is CLAMPED rather than trusted. The catalogue is hand-authored data,
 * and a typo of `3.5` instead of `0.35` would otherwise hold a note for three and a
 * half seconds and stall the phrase - a bug that would look like a hang rather than
 * a data error.
 */
export function playNote(frequency: number, duration: number, gain = 0.17) {
  const safeDuration = Math.min(Math.max(duration, 0.05), 2);
  play([{ frequency, at: 0, duration: safeDuration, gain, type: 'triangle' }]);
}

/**
 * The off-key clash for an invalid number in the sandbox.
 *
 * ===================================================================
 * THIS IS DELIBERATELY NOT `playMistakeBuzz`, AND THE DIFFERENCE MATTERS.
 * ===================================================================
 *
 * The sprint's mistake buzz is a SOUR CHORD - two square waves a semitone apart - and
 * in the sprint a mistake costs points and ends a streak. It is a penalty sound.
 *
 * The sandbox cannot punish anything: it is free creation, there is no score, no
 * clock, and a wrong tap costs the child nothing. Playing the penalty sound there
 * would teach them that exploring is a mistake, which is the exact opposite of what a
 * sandbox is for.
 *
 * So this is a CLASH rather than a scold: a tritone (the interval Western music calls
 * the devil's interval precisely because it refuses to resolve) rendered as a short
 * low sawtooth, with a downward sweep so it reads as a slump rather than a stab. It
 * is unmistakably "that is not the note" - the child's ear learns the difference
 * instantly - while carrying none of the sting of a failure sound.
 *
 * Kept quiet (0.06) and brief, so a child sweeping a few wrong keys in a row does not
 * build a wall of noise.
 */
export function playDiscordant() {
  play([
    { frequency: 155.56, at: 0, duration: 0.3, gain: 0.06, type: 'sawtooth', sweepTo: 110 },
    { frequency: 220, at: 0, duration: 0.3, gain: 0.05, type: 'sawtooth', sweepTo: 155.56 },
  ]);
}

/** A bright two-note alert, for the level-4 target change. */
export function playSwitchChime(root = 440) {
  play([
    { frequency: root * 1.5, at: 0, duration: 0.16, gain: 0.14, type: 'sine' },
    { frequency: root * 2, at: 0.1, duration: 0.24, gain: 0.14, type: 'sine' },
  ]);
}

/** The end-of-sprint flourish: a rising major triad in the round's own key. */
export function playMedalFanfare(root = 261.63) {
  play(
    [0, 4, 7, 12].map((interval, i) => ({
      frequency: root * 2 ** (interval / 12),
      at: i * 0.11,
      duration: 0.34,
      gain: 0.16,
      type: 'triangle' as const,
    })),
  );
}

/* ==================================================================
 * THE HOOK
 * ================================================================== */

/**
 * The synth face of the game, as a hook.
 *
 * The functions are memoised so a component can put them in a dependency array
 * without re-running an effect on every render, and the whole thing is safe to call
 * before the first user gesture - it simply makes no sound until then.
 */
export function useBeatStudioAudio() {
  /* Resuming on mount is harmless when it fails (the context stays suspended and
   * the first real gesture resumes it) and it covers the case where the browser
   * already trusts the page.
   *
   * NOTE THAT THIS ONLY RESUMES THE CONTEXT - IT MAKES NO SOUND. It is not what plays
   * the opening melody over the launch card; that was `SpiderWebModal`'s round-preview
   * effect firing while the card was still up, and it is guarded there. Left as-is
   * because a resumed context is what lets the first key press sound instantly rather
   * than after a resume round-trip. */
  useEffect(() => {
    primeFor();
  }, []);

  /*
   * UNMOUNT TEARS EVERY VOICE DOWN.
   *
   * This is the difference between closing the studio and leaving it playing. An
   * oscillator with no stop time, or one scheduled past the end of the round, would
   * keep sounding after the modal is gone - and since the context is module-scoped
   * and shared, it would outlive the component entirely. The hook owns the teardown
   * so no caller has to remember it.
   */
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopAllVoices();
    };
  }, []);

  const prime = useCallback(() => primeFor(), []);
  const silence = useCallback(() => stopAllVoices(), []);

  return useMemo(
    () => ({
      prime,
      silence,
      playPitch,
      playNote,
      playDiscordant,
      playCandidatePitch,
      playPreview,
      playDetunedBuzz,
      playPitchRun,
      playVictoryArpeggio,
      playMistakeBuzz,
      playWrongPick,
      playDrumHit,
      playFixChord,
      playSwitchChime,
      playMedalFanfare,
    }),
    [prime, silence],
  );
}

/** True once the browser has actually let us make sound. For diagnostics/tests. */
export function isAudioRunning(): boolean {
  return ctx?.state === 'running';
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
 * A diagnostic hook, attached once.
 *
 * THE AUTOPLAY UNLOCK AND THE VOICE COUNT CANNOT BE OBSERVED FROM OUTSIDE THE
 * MODULE. The context is module-scoped, so a browser probe has no way to ask "is the
 * game's audio actually running?" or "did the note that finished actually get
 * released?" - and a context stuck in `suspended` is completely silent while every
 * call still succeeds, which is the exact failure worth catching. Publishing the
 * readers on `window` lets a probe assert both instead of hoping.
 *
 * It is deliberately read-only and attached only in a dev build, so it cannot
 * become a back door into the audio graph in production.
 */
if (import.meta.env?.DEV && typeof window !== 'undefined') {
  (window as unknown as { __beatStudioAudio?: () => string }).__beatStudioAudio = audioState;
  (window as unknown as { __beatStudioVoices?: () => number }).__beatStudioVoices =
    liveVoiceCount;
}
