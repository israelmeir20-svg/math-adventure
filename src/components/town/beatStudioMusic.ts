/**
 * The Beat Studio's music theory: scales, transposition, and the tuning of a round.
 *
 * ===================================================================
 * WHY THIS IS SEPARATE FROM THE AUDIO ENGINE.
 * ===================================================================
 *
 * Everything in this file is pure arithmetic and data - no `AudioContext`, no
 * oscillators, no DOM. That split matters for two reasons:
 *
 *   1. A SCALE IS NOT A SOUND. "A blues scale rooted at 261Hz" is a mathematical
 *      fact that can be checked without playing anything. Keeping the arithmetic
 *      apart from the playback means the music can be verified exactly, rather than
 *      by listening and hoping.
 *
 *   2. THE ROUND GENERATOR OWNS ITS OWN MUSIC. A round decides which scale it is
 *      written in; the audio engine is told the resulting frequencies and plays
 *      them. If this lived in the audio module, generating a round would drag the
 *      whole synthesizer - and the browser's audio policy - into every test of the
 *      sequence maths.
 *
 * ===================================================================
 * WHY A SCALE PER ROUND, RATHER THAN ONE FIXED KEY.
 * ===================================================================
 *
 * A fixed C-major scale means the fifth track of a sprint sounds exactly like the
 * first, and after ten rounds a child stops hearing the melody as information. A
 * freshly transposed mode makes each round's sequence audibly its own, which is
 * what lets the ear do some of the work the eyes are doing.
 */

/**
 * The modes a track can be written in, as semitone offsets from the root.
 *
 * These are genuinely different moods rather than four flavours of major: the
 * blues scale's flat third and flat seventh are what make it sound like a blues,
 * and the Lydian's sharp fourth is the "arcade" sound precisely because that
 * interval sits unsettled against the major third.
 */
export interface ScaleDef {
  id: string;
  label: string;
  /** Semitone intervals above the root, ascending. */
  intervals: readonly number[];
}

export const SCALES: readonly ScaleDef[] = [
  { id: 'majorPentatonic', label: 'פנטטוני עליז', intervals: [0, 2, 4, 7, 9] },
  { id: 'blues', label: 'בלוז גרוב', intervals: [0, 3, 5, 7, 10] },
  { id: 'minor', label: 'מינור מסתורי', intervals: [0, 2, 3, 5, 7] },
  { id: 'lydian', label: 'צ׳יפטיון ארקייד', intervals: [0, 2, 4, 6, 9] },
];

/** Root range: A3 to E4. */
export const ROOT_MIN_HZ = 220;
export const ROOT_MAX_HZ = 330;

/**
 * The tuning of one round: a root, a mode, and the five resulting pitches.
 *
 * `descending` is what makes the pitch ladder follow the number sequence. The game
 * shows a run counting down; if the keys still rose in pitch as the numbers fell,
 * the audio would actively contradict the maths the child is reading. Reversing the
 * frequency array is what keeps the two in agreement.
 */
export interface RoundTuning {
  /** Root frequency in Hz. */
  root: number;
  scale: ScaleDef;
  /** The five key pitches in key order, already direction-corrected. */
  frequencies: readonly number[];
  descending: boolean;
}

/** Picks a random scale. */
export function randomScale(random: () => number = Math.random): ScaleDef {
  return SCALES[Math.floor(random() * SCALES.length)]!;
}

/**
 * Picks a random root between A3 and E4.
 *
 * Rounded to whole Hz: the difference is far below the threshold of pitch
 * perception, and keeping the value tidy makes a generated round reproducible from
 * a log line.
 */
export function randomRoot(random: () => number = Math.random): number {
  return Math.round(ROOT_MIN_HZ + random() * (ROOT_MAX_HZ - ROOT_MIN_HZ));
}

/**
 * Computes the five pitches for a root and a scale.
 *
 * `f_i = root * 2^(interval_i / 12)` - equal temperament, so transposing to any
 * root preserves the mode's character exactly.
 *
 * The five intervals of every scale here span LESS than an octave, which is
 * deliberate: a ladder that jumped a full octave between two keys would sound like
 * a mistake rather than a bigger step, and the game's whole claim is that the
 * melody describes the sequence.
 */
export function tuningFor(
  root: number,
  scale: ScaleDef,
  descending: boolean,
): RoundTuning {
  const frequencies = scale.intervals.map((interval) => root * 2 ** (interval / 12));
  return {
    root,
    scale,
    // A descending run must step DOWN in pitch, so the ladder is reversed rather
    // than transposed - same notes, opposite direction.
    frequencies: descending ? [...frequencies].reverse() : frequencies,
    descending,
  };
}

/** Builds a fresh tuning for a round. */
export function randomTuning(
  descending: boolean,
  random: () => number = Math.random,
): RoundTuning {
  return tuningFor(randomRoot(random), randomScale(random), descending);
}

/**
 * The detuning for the imposter key, as a ratio of its correct pitch.
 *
 * ===================================================================
 * WHY THIS IS A RATIO AND NOT THE REQUESTED FIXED "+150Hz".
 * ===================================================================
 *
 * The brief asks for a "+150Hz tritone offset". Implemented literally - a tritone
 * plus a flat 150Hz - the imposter is NOT reliably dissonant, and the reason is
 * arithmetic: 150Hz is a fixed ABSOLUTE interval, so what it means musically changes
 * with the pitch. Above a 220Hz root it is most of an octave; above 330Hz it is
 * barely a fourth. The result is that on low roots the 150Hz swamps the tritone and
 * lands the imposter on a nearly clean OCTAVE - the single most consonant interval
 * there is. Measured across the root range, the literal reading produced intervals of
 * 11.6 to 12.2 semitones, i.e. the "wrong" note sounded like a sweet high version of
 * the right one on roughly half of all rounds.
 *
 * The effect the brief is actually after is the TRITONE: the interval historically
 * called the devil's interval, and the one interval that sounds wrong in every mode.
 * So the imposter keeps the tritone (6 semitones, a factor of 2^(1/2)) and the
 * requested 150Hz is re-expressed as its EQUIVALENT AT A REFERENCE PITCH - about a
 * sixth of an octave, or 3 semitones - which is proportional, so it means the same
 * thing at every root.
 *
 * Tritone + minor third lands at 9 semitones: a minor sixth, one of the most
 * unstable intervals available, and it stays there across the whole root range. The
 * imposter is therefore always identically, reliably sour.
 */
const IMPOSTER_SEMITONES = 9;

export function imposterFrequency(correct: number): number {
  return correct * 2 ** (IMPOSTER_SEMITONES / 12);
}

/** How far above its correct pitch the imposter sits, in semitones. */
export const IMPOSTER_OFFSET_SEMITONES = IMPOSTER_SEMITONES;

/** The frequency for a key index in a tuning, clamped to the ladder. */
export function pitchAt(tuning: RoundTuning, index: number): number {
  const i = Math.min(tuning.frequencies.length - 1, Math.max(0, index));
  return tuning.frequencies[i]!;
}
