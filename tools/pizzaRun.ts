/**
 * End-to-end sanity check for one run of the pizzeria: generate orders, have a
 * perfect baker place exactly the wedges the order asks for, and confirm every one
 * of them validates as correct - and that a plausible mistake does not.
 *
 *   npx tsx tools/pizzaRun.ts
 */
import { buildPizzaOrder } from '../src/components/pizza/pizzaGenerator';
import { validatePizza } from '../src/components/pizza/pizzaValidation';
import type { ToppingId } from '../src/components/pizza/pizzaTypes';

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

let failures = 0;

for (let seed = 1; seed <= 300; seed += 1) {
  const random = lcg(seed);
  for (let pizzaNumber = 1; pizzaNumber <= 25; pizzaNumber += 1) {
    const order = buildPizzaOrder(pizzaNumber, random);

    // A perfect baker: fill wedges in requirement order, leaving spare ones plain.
    const placed: (ToppingId | null)[] = Array(order.totalSlices).fill(null);
    let cursor = 0;
    for (const requirement of order.requirements) {
      for (let i = 0; i < requirement.requiredSlices; i += 1) {
        placed[cursor] = requirement.toppingId;
        cursor += 1;
      }
    }
    if (cursor > order.totalSlices) {
      failures += 1;
      console.error(`seed ${seed} pizza ${pizzaNumber}: ran out of wedges`);
      continue;
    }

    const verdict = validatePizza(order, placed);
    if (verdict !== null) {
      failures += 1;
      if (failures <= 10) {
        console.error(
          `seed ${seed} pizza ${pizzaNumber}: perfect pizza rejected - "${verdict}" ` +
            `(${order.requirements.map((r) => `${r.fractionText}->${r.requiredSlices}`).join(', ')} of ${order.totalSlices})`,
        );
      }
    }

    // A baker who misreads ONE simplified fraction as its numerator must be caught
    // whenever that reading differs - this is the mistake tier 3 exists to expose.
    const wrong = [...placed];
    for (const requirement of order.requirements) {
      const match = /^(\d+)\/(\d+)$/.exec(requirement.fractionText);
      const numerator = match ? Number(match[1]) : requirement.requiredSlices;
      if (numerator === requirement.requiredSlices) continue;
      // Re-place this topping's wedges at the numerator count instead.
      let seen = 0;
      for (let i = 0; i < wrong.length && seen < numerator; i += 1) {
        if (wrong[i] === requirement.toppingId) {
          wrong[i] = null;
          seen += 1;
        }
      }
      break;
    }
    if (order.isEquivalent && validatePizza(order, wrong) === null) {
      failures += 1;
      if (failures <= 10) {
        console.error(`seed ${seed} pizza ${pizzaNumber}: the classic misread was accepted`);
      }
    }
  }
}

if (failures === 0) {
  console.log('pizzaRun: 7500 pizzas - every exact answer accepted, every misread caught');
} else {
  console.error(`pizzaRun: ${failures} failure(s)`);
  process.exit(1);
}
