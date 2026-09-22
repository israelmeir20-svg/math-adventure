/**
 * Timing constants for "המתכון של השף".
 *
 * Every duration here is a pacing decision, so they live together rather than
 * being scattered through the components:
 *
 * - REVEAL_MS is how long one ingredient stays in the spotlight. It has to be
 *   long enough to register the picture and short enough that a five-item
 *   sequence does not feel like a slideshow.
 * - CORRECT_MS / WRONG_MS are the two outcome flashes. The correct flash is
 *   barely there - a held beat would let the child relax mid-sequence - while a
 *   miss is held a little longer so the "אופס!" is actually seen before the
 *   next recipe replaces it.
 *
 * These keys are all one-shots, so the sounds are deliberately from the shared
 * tone set: 'pop' for a reveal, 'success' for a round cleared, 'gentle' for a
 * mistake. Nothing here introduces a new audio dependency.
 */
export const REVEAL_MS = 600;

export const CORRECT_MS = 250;

export const WRONG_MS = 400;
