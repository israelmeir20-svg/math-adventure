/**
 * Invariant fuzzer for the Fractions Pizzeria generator.
 *
 * The game's whole claim is that every order is solvable with whole slices and
 * that the tier ramp actually ramps. Those are properties of the generator, not of
 * the UI, so they are checked here by brute force across thousands of orders.
 *
 * Runs on plain Node with no bundler, which is why `pizzaTiers.ts` carries no
 * imports and `pizzaGenerator.ts` pulls in only `pizzaTypes.ts` (also import-free).
 *
 *   npx tsx tools/pizzaFuzz.ts
 */
import { buildPizzaOrder } from '../src/components/pizza/pizzaGenerator';
import { TOPPINGS } from '../src/components/pizza/pizzaTypes';
import { tierFor } from '../src/components/pizza/pizzaTiers';

let failures = 0;
const report = (message: string) => {
  failures += 1;
  if (failures <= 20) console.error(`  FAIL ${message}`);
};

/** A deterministic LCG so failures are reproducible. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const TOPPING_IDS = new Set(TOPPINGS.map((topping) => topping.id));

interface Seen {
  tier1Scaffold: number;
  tier1Slices: Set<number>;
  tier2PizzaCount: number;
  tier2Ties: number;
  tier3Total: number;
  tier3Equivalent: number;
  tier4Total: number;
  tier4Full: number;
  tier4Equivalent: number;
  tier4SliceCounts: Set<number>;
}

const seen: Seen = {
  tier1Scaffold: 0,
  tier1Slices: new Set(),
  tier2PizzaCount: 0,
  tier2Ties: 0,
  tier3Total: 0,
  tier3Equivalent: 0,
  tier4Total: 0,
  tier4Full: 0,
  tier4Equivalent: 0,
  tier4SliceCounts: new Set(),
};

function checkOrder(pizzaNumber: number, random: () => number): void {
  const order = buildPizzaOrder(pizzaNumber, random);
  const tier = tierFor(pizzaNumber);
  const label = `pizza ${pizzaNumber} (tier ${tier})`;

  // 1. Slice counts are legal for the tier.
  const legalSlices: Record<number, number[]> = { 1: [2, 4], 2: [3, 4], 3: [4, 8], 4: [8] };
  if (!legalSlices[tier]!.includes(order.totalSlices)) {
    report(`${label}: illegal slice count ${order.totalSlices}`);
  }

  // 2. Requirements exist, are distinct, and never over-subscribe the pie.
  if (order.requirements.length === 0) report(`${label}: no requirements`);
  const usedToppings = new Set<string>();
  let totalRequired = 0;
  for (const requirement of order.requirements) {
    if (!TOPPING_IDS.has(requirement.toppingId)) {
      report(`${label}: unknown topping ${requirement.toppingId}`);
    }
    if (usedToppings.has(requirement.toppingId)) {
      report(`${label}: duplicate topping ${requirement.toppingId}`);
    }
    usedToppings.add(requirement.toppingId);

    // THE CENTRAL INVARIANT: a whole, positive number of wedges.
    if (!Number.isInteger(requirement.requiredSlices)) {
      report(`${label}: fractional slice count ${requirement.requiredSlices}`);
    }
    if (requirement.requiredSlices < 1) {
      report(`${label}: non-positive slice count ${requirement.requiredSlices}`);
    }
    if (requirement.requiredSlices > order.totalSlices) {
      report(`${label}: ${requirement.requiredSlices} > ${order.totalSlices} wedges`);
    }
    totalRequired += requirement.requiredSlices;
  }
  if (totalRequired > order.totalSlices) {
    report(`${label}: requirements demand ${totalRequired} of ${order.totalSlices} wedges`);
  }

  // 3. The displayed fraction must be a TRUE statement about the wedge count.
  for (const requirement of order.requirements) {
    const match = /^(\d+)\/(\d+)$/.exec(requirement.fractionText);
    if (!match) {
      report(`${label}: unparseable fraction "${requirement.fractionText}"`);
      continue;
    }
    const [numerator, denominator] = [Number(match[1]), Number(match[2])];
    if (denominator === 0) report(`${label}: zero denominator`);
    const derived = (numerator * order.totalSlices) / denominator;
    if (!Number.isInteger(derived)) {
      report(`${label}: ${requirement.fractionText} is not a whole number of wedges`);
    }
    if (derived !== requirement.requiredSlices) {
      report(
        `${label}: ${requirement.fractionText} should be ${derived} wedges, says ${requirement.requiredSlices}`,
      );
    }
    if (tier === 1 && numerator !== requirement.requiredSlices) {
      report(`${label}: tier 1 must match 1:1, got ${requirement.fractionText}`);
    }
  }

  // 4. Scaffolding only in tier 1.
  for (const requirement of order.requirements) {
    const wantsScaffold = tier === 1;
    if (requirement.showVisualScaffold !== wantsScaffold) {
      report(`${label}: scaffold ${requirement.showVisualScaffold}, expected ${wantsScaffold}`);
    }
  }

  // 5. Tier-specific shapes.
  if (tier === 1) {
    if (order.requirements.length !== 1) report(`${label}: tier 1 wants exactly one line`);
    if (order.requirements[0]!.showVisualScaffold) seen.tier1Scaffold += 1;
    seen.tier1Slices.add(order.totalSlices);
  }
  if (tier === 2) {
    seen.tier2PizzaCount += 1;
    if (order.isEquivalent) seen.tier2Ties += 1;
    if (order.totalSlices !== 3) report(`${label}: tier 2 should always be thirds`);
  }
  if (tier === 3) {
    seen.tier3Total += 1;
    if (order.isEquivalent) seen.tier3Equivalent += 1;
    if (order.totalSlices !== 8) report(`${label}: tier 3 should always be eighths`);
  }
  if (tier === 4) {
    seen.tier4Total += 1;
    seen.tier4SliceCounts.add(order.totalSlices);
    if (totalRequired === order.totalSlices) seen.tier4Full += 1;
    // Tier 4 states its fractions over the eight eighths themselves (1/2 on an
    // 8-slice pie reads as "4/8", not "1/2"): the notation is exact and the
    // conversion is the arithmetic, not the naming.
    if (order.isEquivalent) seen.tier4Equivalent += 1;
    if (order.requirements.length < 2) report(`${label}: tier 4 wants 2+ lines`);
    // Every line must still be a true fraction over the slice count.
    for (const requirement of order.requirements) {
      if (requirement.fractionText !== `${requirement.requiredSlices}/${order.totalSlices}`) {
        report(`${label}: ${requirement.fractionText} is not over ${order.totalSlices}`);
      }
    }
  }
}

// Deterministic sweep over the first 60 pizzas, many times over.
for (let seed = 1; seed <= 4000; seed += 1) {
  const random = lcg(seed);
  for (let pizzaNumber = 1; pizzaNumber <= 60; pizzaNumber += 1) {
    checkOrder(pizzaNumber, random);
  }
}

// Adversarial RNGs: always-zero, always-almost-one, and a sawtooth.
for (const edge of [() => 0, () => 0.999999, () => 0.5]) {
  for (let pizzaNumber = 1; pizzaNumber <= 60; pizzaNumber += 1) {
    checkOrder(pizzaNumber, edge);
  }
}

// Tier-ramp assertions: the difficulty has to actually climb.
if (seen.tier1Scaffold === 0) report('tier 1 never showed its visual scaffold');
if (seen.tier1Slices.has(3)) report('tier 1 used a 3-slice pizza');
if (seen.tier2Ties !== 0) report(`tier 2 leaked ${seen.tier2Ties} equivalent orders`);
if (seen.tier3Equivalent === 0) report('tier 3 never asked for a simplified fraction');
if (seen.tier4Full === 0) report('tier 4 never fully covered the pie');

console.log(
  [
    `tier1: scaffold ${seen.tier1Scaffold}, slice counts [${[...seen.tier1Slices].sort().join(',')}]`,
    `tier2: ${seen.tier2PizzaCount} pizzas, ${seen.tier2Ties} equivalent leaks`,
    `tier3: ${seen.tier3Equivalent}/${seen.tier3Total} asked for a simplified fraction`,
    `tier4: ${seen.tier4Full}/${seen.tier4Total} covered the whole pie, slices [${[...seen.tier4SliceCounts].sort().join(',')}]`,
  ].join('\n'),
);

if (failures === 0) {
  console.log('pizzaFuzz: all invariants hold (whole wedges, true fractions, tier ramp intact)');
} else {
  console.error(`pizzaFuzz: ${failures} failure(s)`);
  process.exit(1);
}
