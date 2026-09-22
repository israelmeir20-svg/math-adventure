/**
 * Sequence length per round - the game's only difficulty knob.
 *
 * Kept in its own module, free of imports, for two reasons: it is the tier table
 * the fuzzer checks against, and it must stay loadable by Node tooling. The
 * generator next door pulls in `.png` sprites, which Node cannot import, so a
 * test that reached the table through the generator would crash before checking
 * anything. Splitting it out is what makes the table testable at all.
 */
export function sequenceLengthFor(roundNumber: number): number {
  if (roundNumber <= 3) return 2;
  if (roundNumber <= 7) return 3;
  if (roundNumber <= 11) return 4;
  return 5;
}
