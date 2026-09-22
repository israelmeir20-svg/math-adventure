/**
 * The basket generator for "סל הפיקניק".
 *
 * The invariants that make a round playable are enforced elsewhere, each in the
 * place that can actually guarantee it:
 *
 *   ZERO TIES      - `distinctPicnicCounts` builds distinct counts by construction.
 *   NO COLLISIONS  - `assignCells` draws slot indices without replacement.
 *   THE GAP FITS   - `distinctPicnicCounts` takes the cheapest middles it can.
 *   A VALID TIER   - `picnicTiers` asserts its own arithmetic at import time.
 *
 * This module's job is to compose those pieces in an order that leaves nothing to
 * chance: the counts are fixed before the species are named, and the winner is
 * derived from the piles that were actually built rather than from an intention.
 */
import type { PicnicCell, PicnicFruit, PicnicPile, PicnicQuestion, PicnicRound } from './picnicTypes';
import { ALL_PICNIC_FRUITS } from './picnicFruits';
import { PICNIC_TIERS, picnicTierForRound, type PicnicTier } from './picnicTiers';
import { distinctPicnicCounts, picnicPick, picnicWinner, shufflePicnic } from './picnicRules';
import { assignCells, slotCentre } from './picnicPlacement';
import { MAX_PICNIC_SLOTS, SLOT_COLS, slotRow } from './picnicData';

/**
 * Builds one round's basket. Pure: the same `rng` always yields the same basket,
 * which is what lets the verification scripts reason about specific rounds.
 */
export function buildPicnicRound(roundNumber: number, rng: () => number = Math.random): PicnicRound {
  const level = picnicTierForRound(roundNumber);
  const tier: PicnicTier = PICNIC_TIERS[level] ?? PICNIC_TIERS[1]!;

  // THE CAPACITY IS THE TIER'S, CLAMPED TO THE FLOOR. The floor holds exactly sixteen
  // fruitlets, and a tier may choose to fill only some of them: a sparse basket is what
  // makes the first tier readable at a glance.
  const capacity = Math.min(tier.capacity, MAX_PICNIC_SLOTS);
  const total = capacity;

  // The counts first, so the piles are decided before any species is named. The
  // capacity is passed in so they can never ask for more pieces than the basket holds.
  const counts = distinctPicnicCounts(
    tier.species,
    tier.minCount,
    tier.maxCount,
    tier.spread,
    total,
    rng,
  );

  // Which species plays which count is random, so a big pile is not always the
  // same fruit.
  const species = shufflePicnic(ALL_PICNIC_FRUITS, rng).slice(0, tier.species);
  const pairs = species.map((fruit, i) => ({ fruit, count: counts[i] as number }));

  const question: PicnicQuestion = picnicPick(tier.questions, rng);
  const { byFruit, cellFruit } = assignCells(
    pairs.map((p) => p.fruit),
    pairs.map((p) => p.count),
    total,
    rng,
  );

  // THE JITTER IS APPLIED AFTER PLACEMENT, never before: the slot index is what
  // guarantees non-collision, and nudging a fruit about its own slot centre (bounded by
  // `tier.jitter`) cannot move it into a neighbour's - because the row pitch leaves more
  // clearance than twice the largest permitted nudge.
  //
  // The SLOT keeps its measured position and the FRUIT gets the offset, so the basket's
  // own perspective stays intact however lively the fruit is.
  const cells: PicnicCell[] = Array.from({ length: total }, (_, index) => {
    const centre = slotCentre(index);
    const jx = tier.jitter ? (rng() * 2 - 1) * tier.jitter : 0;
    const jy = tier.jitter ? (rng() * 2 - 1) * tier.jitter : 0;
    return {
      row: slotRow(index),
      col: index % SLOT_COLS,
      x: centre.x,
      y: centre.y,
      fruitX: centre.x + jx,
      fruitY: centre.y + jy,
      fruit: cellFruit.get(index) ?? null,
      tilt: tier.tilt ? (rng() * 2 - 1) * tier.tilt : 0,
    };
  });

  const piles: PicnicPile[] = pairs.map((pair) => ({
    fruit: pair.fruit,
    count: pair.count,
    cells: byFruit.get(pair.fruit) ?? [],
  }));

  return {
    roundNumber,
    level,
    rows: tier.rows,
    cols: tier.cols,
    cells,
    piles,
    question,
    // Derived from the piles that were BUILT, so the answer key and the basket can
    // never disagree - the failure mode being a child marked wrong for a right answer.
    answer: picnicWinner(piles, question) as PicnicFruit,
    // ONLY THE SPECIES IN THE BASKET. A phantom fruit would be unanswerable.
    choices: shufflePicnic(piles.map((p) => p.fruit), rng),
  };
}
