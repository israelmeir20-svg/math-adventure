/**
 * The single source of truth for the barn game's pacing.
 *
 * Both the SVG animations and the loop's timers import from here, so the
 * picture and the state machine can never drift apart. Every duration is in
 * MILLISECONDS, which is what `setTimeout` and the loop's offsets use.
 */

/** Milliseconds for one animal to cross its half of the meadow. */
export const TROT_DURATION = 1800;

/** Milliseconds between one animal setting off and the next one setting off. */
export const STAGGER_DELAY = 1200;

/** Milliseconds of silence with the herd inside, between the two waves. */
export const PAUSE_BETWEEN_WAVES = 800;

/** Milliseconds the shutters take to drop and settle after the out-wave clears. */
export const SHUTTER_DROP = 500;

/** Seconds for one animal to cross, for use inside SVG animation attributes. */
export const TROT_SECONDS = TROT_DURATION / 1000;

/** Seconds between departures, for use inside SVG animation attributes. */
export const STAGGER_SECONDS = STAGGER_DELAY / 1000;

/** Seconds of inter-wave silence, for the loop's offsets. */
export const INTER_WAVE_PAUSE = PAUSE_BETWEEN_WAVES / 1000;

/**
 * Milliseconds a wave of `count` animals occupies, start to finish.
 *
 * The first animal sets off immediately and needs TROT_DURATION; each of the
 * other `count - 1` animals waits its own STAGGER_DELAY first. An empty wave
 * takes no time at all, so a round never waits on animals that do not exist.
 */
export function waveMs(count: number): number {
  if (count <= 0) return 0;
  return (count - 1) * STAGGER_DELAY + TROT_DURATION;
}

/** Milliseconds animal `index` waits before it sets off within its wave. */
export function delayMs(index: number): number {
  return index * STAGGER_DELAY;
}

/** Milliseconds after a wave starts at which its last animal finishes. */
export function waveEndMs(count: number): number {
  if (count <= 0) return 0;
  return (count - 1) * STAGGER_DELAY + TROT_DURATION;
}
