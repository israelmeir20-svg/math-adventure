/**
 * A single lazily-created AudioContext shared by the whole app.
 *
 * Creating one per sound costs real time: every `new AudioContext()` asks the
 * browser to stand up a new audio graph, and closing it right after means the
 * next sound pays that cost again. Browsers also cap how many contexts may
 * exist, so churn eventually starts failing silently.
 *
 * Nothing here is created until the first sound is played after a user gesture,
 * which keeps autoplay policies happy.
 */

export type Tone = 'success' | 'gentle' | 'pop' | 'bonus' | 'hazard' | 'balance';

let ctx: AudioContext | null = null;

/** The shared context, created on first use. */
function getContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

/**
 * Create the context during an unrelated user gesture so the very first pop
 * does not pay for it. Safe to call as often as you like.
 */
export function warmAudio() {
  const audio = getContext();
  if (audio && audio.state === 'suspended') void audio.resume();
}

const RECIPES: Record<Tone, { notes: number[]; type: OscillatorType; gain: number }> = {
  success: { notes: [523.25, 659.25, 783.99], type: 'triangle', gain: 0.18 },
  gentle: { notes: [392, 329.63], type: 'sine', gain: 0.14 },
  pop: { notes: [880, 1174.66], type: 'triangle', gain: 0.12 },
  bonus: { notes: [659.25, 880, 1046.5], type: 'triangle', gain: 0.16 },
  hazard: { notes: [196, 155.56], type: 'sawtooth', gain: 0.1 },
  /*
   * The balance chime: a rising major triad that CROWNS rather than merely reports.
   *
   * The existing `success` arpeggio is a general-purpose "correct!" and is used by every
   * farm station. The scales deserve their own cue because the moment being marked is
   * specific - a physical beam arriving at dead level - and the sound is what tells the
   * child to look up and watch the hold. Starting an octave higher and climbing two
   * intervals puts it clearly above `success` in the mix, so it reads as a bigger event
   * than an ordinary correct answer.
   */
  balance: { notes: [783.99, 1046.5, 1318.51, 1567.98], type: 'triangle', gain: 0.17 },
};

/**
 * Play a short arpeggio on the shared context.
 *
 * Every node is scheduled ahead of time and stopped by the graph itself; no
 * timers run during playback. On an already-running context this is a handful
 * of object allocations and no thread startup at all.
 */
export function playTone(tone: Tone) {
  const audio = getContext();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();

  const { notes, type, gain: peak } = RECIPES[tone];
  const now = audio.currentTime;

  notes.forEach((frequency, index) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    const start = now + index * 0.08;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    osc.connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + 0.22);
  });
}
