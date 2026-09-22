/**
 * "מרכז המטען: משלוח אקספרס" - the cargo hub's load arithmetic.
 *
 * ===================================================================
 * A SOLUTION ALWAYS EXISTS, BY CONSTRUCTION.
 * ===================================================================
 *
 * The generator does not pick a target and hope. For each tier it builds a
 * MULTISET of crates first - a genuine, minimal combination of the tier's own crate
 * weights - and defines the target as that multiset's sum. The decoys the child sees
 * are added afterwards.
 *
 * This direction matters. Generating a random target and then searching for a subset
 * that hits it fails in two ways: some targets are simply unreachable from a given
 * crate pool (you cannot make 675 from 25/75/150/250 without a lot of 25s), and even
 * when a subset exists it may need far more crates than the truck bed holds. Building
 * the loadout first and naming its total as the target makes both impossible - every
 * round is solvable within the slot budget, and every crate the child MUST use is on
 * the shelf because it was in the loadout.
 *
 * ===================================================================
 * WHY THE SPOILER HAD TO GO.
 * ===================================================================
 *
 * The previous version displayed a live "300 / 750 ק״ג" readout and a progress bar.
 * That turns the exercise into colour-matching: the child loads crates until the
 * number turns green, and never mentally sums anything. The whole point of the
 * district is the ADDITION, so the running total is gone entirely and the manifest
 * states only the destination and the target. The child has to hold the sum in their
 * head, which is the skill being practised.
 *
 * The crate weights stay visible ON the crates - that is the information the child
 * is being asked to add, not the answer to it.
 */

/** A crate in the warehouse or on the truck. */
export interface Crate {
  id: string;
  /** The weight in kg, printed on the crate. */
  weight: number;
  /** Decorative only - the emoji on the crate's face. */
  emoji: string;
}

/** One tier of the four-step progression. */
export interface CargoTier {
  level: number;
  title: string;
  /** Target weights this tier draws from, in kg. */
  targets: readonly number[];
  /** The crate weights available in the warehouse, in kg. */
  crateWeights: readonly number[];
  /** How many crates of EACH weight the shelf stocks. */
  stockPerWeight: number;
  /**
   * How many crates the truck bed physically holds.
   *
   * `null` means uncapped. The cap is what makes level 3 a genuine puzzle: with 4
   * slots and a 1,000kg target, spamming 100s is impossible and the child has to
   * reach for the big crates - "300+300+200" rather than "ten hundreds". Capping
   * slots changes the SHAPE of the arithmetic without changing its size, which is
   * exactly the reasoning a grade-3 child needs to practise.
   */
  bedSlots: number | null;
  /** Short line describing what this tier demands. */
  blurb: string;
}

/**
 * The four tiers, from round hundreds up to off-grid 25s.
 *
 * The progression is deliberate: level 1 is pure "which hundreds add to 500", which
 * needs no carrying. Level 2 introduces the 50s, so the child must now handle a
 * half-hundred. Level 3 keeps the numbers no harder than level 2 but constrains the
 * SLOTS, forcing combination planning. Level 4 uses 25s, where the arithmetic is
 * genuinely four-digit mental work and the crate sizes no longer map cleanly onto
 * the target.
 */
export const CARGO_TIERS: readonly CargoTier[] = [
  {
    level: 1,
    title: 'משאיות קלות',
    targets: [300, 400, 500, 600],
    crateWeights: [100, 200, 300],
    stockPerWeight: 4,
    bedSlots: null,
    blurb: 'חיבור מאות שלמות',
  },
  {
    level: 2,
    title: 'מנהלת משמרת',
    targets: [550, 650, 750, 850, 950],
    crateWeights: [50, 100, 200, 250, 300],
    stockPerWeight: 4,
    bedSlots: null,
    blurb: 'מאות וחמישים',
  },
  {
    level: 3,
    title: 'אילוץ מקום',
    targets: [700, 800, 900, 1000],
    crateWeights: [50, 100, 200, 250, 300],
    stockPerWeight: 4,
    /*
     * FOUR SLOTS. The truck bed is drawn to hold exactly this many, so the limit is
     * visible rather than an invisible rule the child discovers by failing.
     */
    bedSlots: 4,
    blurb: 'עד 4 ארגזים בלבד',
  },
  {
    level: 4,
    title: 'אקספרס מורכב',
    /*
     * THE TARGET LIST IS CONSTRAINED BY THE CRATE DENOMINATIONS, and that is a real
     * constraint rather than a preference. From 25/75/150/250 in at most four crates,
     * only these sums are reachable - notably 875, 925 and 975 are NOT, because they
     * leave a remainder that no combination of 25s, 75s, 150s and 250s can fill in the
     * slots left over. Listing an unreachable target would send the generator to its
     * fallback and hand the child a one-crate delivery, which is why the probe asserts
     * every listed target is buildable rather than trusting the list.
     */
    targets: [675, 725, 775, 825, 1000],
    crateWeights: [25, 75, 150, 250],
    stockPerWeight: 5,
    bedSlots: null,
    blurb: 'צעדים של 25 ק״ג',
  },
];

/**
 * The station now has THREE levels, not four.
 *
 * `CARGO_TIERS` deliberately still holds four entries: the fourth is a complete, coherent
 * difficulty tier with a target list whose reachability was verified, and deleting it would
 * throw that away to save an array element. It is simply not reachable from the launch card,
 * whose `LEVELS` are 1-3 - so a child chooses one of the first three and the fourth is left
 * in place for a future re-homing, exactly as the farm's removed fifth station was.
 *
 * The cap therefore lives HERE rather than on the array's length. `MAX_CARGO_LEVEL` used to be
 * `CARGO_TIERS.length`, which would have let a level-4 tier be selected by the old ladder; the
 * clamp below is what keeps the tier lookup inside the three the station actually offers.
 */
export const MAX_CARGO_LEVEL = 3;

export function clampCargoLevel(level: number): number {
  return Math.min(MAX_CARGO_LEVEL, Math.max(1, level));
}

export function cargoTier(level: number): CargoTier {
  return CARGO_TIERS[clampCargoLevel(level) - 1]!;
}

/** The emoji a crate of a given weight wears, purely for character. */
function emojiFor(weight: number): string {
  // Grouped by the visual size band, so the picture agrees with the crate's bulk.
  if (weight <= 50) return '📦';
  if (weight <= 200) return '🧰';
  return '🗃️';
}

/**
 * The cab colours, in the order they cycle between dispatched trucks.
 *
 * Lives here rather than in the truck component so the file stays a pure component
 * module - a non-component export in a component file breaks React Fast Refresh, which
 * is a real cost during development. It is also genuinely shared: the game picks the
 * colour and the truck draws it, so the order belongs with the other round data.
 */
export const CAB_ORDER = ['sky', 'lime', 'violet', 'orange'] as const;
export type CabColor = (typeof CAB_ORDER)[number];

/** Where a delivery is headed. */
const DESTINATIONS = [  'מאפיית העוגיות',
  'פיצריית השברים',
  'החווה',
  'הקיוסק',
  'בית המלאכה',
  'מחסן הנמל',
];

/**
 * The sizes a crate is DRAWN at, derived from its weight.
 *
 * THE SIZE IS THE INFORMATION, and this is the pedagogical core of the redesign. A
 * child who cannot yet sum 250 + 300 can still see that two large crates and a small
 * one will not weigh the same as three large ones, and can plan a load by eye before
 * committing to the arithmetic. Removing the numeric weight readout was necessary to
 * stop the game being colour-matching; the size cue is what replaces it as the
 * "sense-check" channel, and it is honest - the crates really are proportional.
 */
export type CrateSize = 'small' | 'medium' | 'large';

export function sizeFor(weight: number): CrateSize {
  if (weight <= 50) return 'small';
  if (weight <= 200) return 'medium';
  return 'large';
}

/** A generated delivery: the order and the shelf it is loaded from. */
export interface TruckRound {
  destination: string;
  targetWeight: number;
  /** The loadout crates plus decoys, shuffled - what the warehouse displays. */
  crates: Crate[];
  /** The tier's slot cap, or null when the bed is unlimited. */
  bedSlots: number | null;
  /** The exact multiset of weights that solves this round, for hinting/testing. */
  solution: readonly number[];
  level: number;
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

/** A shuffled copy. */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = copy[i]!;
    const b = copy[j]!;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

/**
 * Builds a genuine combination of the tier's crates summing to `target`.
 *
 * A DEPTH-FIRST SEARCH RATHER THAN RANDOM PARTS. The earlier version assembled random
 * addends and retried on failure, which for the tighter tiers (25/75/150/250, or four
 * slots) failed often enough to need a fallback that ignored the target entirely - so
 * the "guarantee" had a hole in it. Searching the actual subset space is both exact
 * and cheap here: at most five weights and at most four slots, so the tree is tiny.
 *
 * `slots` caps how many crates may be used, which is what makes level 3 solvable only
 * by reaching for the big crates. `stock` caps how many of EACH weight exist, so a
 * solution cannot use five 300s that the shelf does not hold.
 *
 * Returns null when this target cannot be built within the tier's own budget, in
 * which case the caller picks a different target - see `buildTruckRound`.
 */
function findCombination(
  target: number,
  weights: readonly number[],
  slots: number,
  stock: number,
  random: () => number,
  /**
   * The fewest crates the loadout may use.
   *
   * TWO, NOT ONE, AND THAT IS A PEDAGOGICAL FLOOR RATHER THAN A TUNING KNOB. Level 1
   * lists a 300kg target and stocks a 300kg crate, so the search's first hit is a
   * single crate - a round with no addition in it at all, dispatched by tapping one
   * box. Since the entire point of the district is the sum, a one-crate answer is not
   * an easy round, it is a NON-round: it teaches nothing and pays the same 200 points.
   *
   * Requiring two crates forces every target to be a real sum. For 300 that means
   * 100+200, which is exactly the arithmetic the tier is for.
   */
  minParts = 2,
): number[] | null {
  // Largest first: fewer, bigger crates solve the tight-slot tiers more often, and
  // the first solution found is then a natural-looking loadout.
  const descending = [...weights].sort((a, b) => b - a);
  const used = new Map<number, number>();
  const parts: number[] = [];

  function search(remaining: number): boolean {
    /*
     * THE TARGET IS REACHED BUT THE LOADOUT IS TOO THIN. Returning false here makes the
     * search backtrack and try a different combination rather than settle for a
     * one-crate answer - which is how the minParts rule is enforced inside the search
     * instead of by rejecting a finished result and restarting.
     */
    if (remaining === 0) return parts.length >= minParts;
    if (parts.length >= slots) return false;

    for (const weight of descending) {
      if (weight > remaining) continue;
      const count = used.get(weight) ?? 0;
      if (count >= stock) continue;
      /*
       * PRUNE BY REACH. Even filling every remaining slot with the largest crate
       * cannot reach the target from here, so this branch is dead. Without it the
       * search still terminates (the tree is tiny) but wanders through branches that
       * are obviously hopeless, which matters because the caller may run it per
       * target.
       */
      const slotsLeft = slots - parts.length - 1;
      if (remaining - weight > slotsLeft * descending[0]!) continue;

      used.set(weight, count + 1);
      parts.push(weight);
      if (search(remaining - weight)) return true;
      parts.pop();
      used.set(weight, count);
    }
    return false;
  }

  if (!search(target)) return null;

  /*
   * THE ORDER OF ADDENDS IS SHUFFLED, BUT ONLY THOSE PRESENT.
   *
   * The search always finds descending order (300+300+200). Presenting the shelf in
   * that order would make the solution pattern-recognisable - the child could learn
   * "pick biggest first" rather than doing the addition. Shuffling the loadout only
   * affects which crates are GUARANTEED to be present; the shelf is shuffled too, so
   * the child cannot read the answer off the arrangement.
   */
  void random;
  return shuffle(parts, random);
}

/**
 * Builds a delivery for a level.
 *
 * The target is chosen, then a loadout that sums to it. If a target cannot be built
 * within the tier's slot and stock limits, another is tried - and because the tiers
 * were chosen so that every listed target IS buildable, this loop is a formality
 * rather than a workaround. `solution` is returned so the guarantee is checkable
 * without re-deriving it.
 */
export function buildTruckRound(
  level: number,
  random: () => number = Math.random,
): TruckRound {
  const tier = cargoTier(level);

  /*
   * THE SLOT BUDGET FOR THE SEARCH. An unlimited bed still needs a bound, or the
   * search could spend the whole stock on small crates. Four is also the largest bed
   * the truck is drawn with, so a solution never needs more room than the artwork
   * shows.
   */
  const slotBudget = tier.bedSlots ?? 4;

  const targets = shuffle(tier.targets, random);
  let target = targets[0]!;
  let solution = findCombination(
    target,
    tier.crateWeights,
    slotBudget,
    tier.stockPerWeight,
    random,
  );

  for (const candidate of targets) {
    if (solution) break;
    target = candidate;
    solution = findCombination(
      candidate,
      tier.crateWeights,
      slotBudget,
      tier.stockPerWeight,
      random,
    );
  }

  /*
   * THE FALLBACK IS STILL EXACT AND STILL AN ADDITION. If no listed target were
   * buildable the loop above would leave `solution` null, so rather than shipping an
   * unsolvable round the loadout is built from the two SMALLEST weights the tier
   * stocks - the one combination guaranteed to exist whatever the denomination list -
   * and the target is set to their sum. That keeps the fallback a genuine two-crate
   * sum rather than the single-crate round an earlier version produced, which was
   * solvable but taught nothing. This cannot fire for the tiers as configured; it is a
   * floor of last resort, not a path the game normally takes.
   */
  if (!solution) {
    const ascending = [...tier.crateWeights].sort((a, b) => a - b);
    const small = ascending[0]!;
    const large = ascending[ascending.length - 1]!;
    target = small + large;
    solution = [small, large];
  }

  const crates: Crate[] = solution.map((weight, index) => ({
    id: `crate-${index}-${weight}-${Math.floor(random() * 100000)}`,
    weight,
    emoji: emojiFor(weight),
  }));

  /*
   * DECOYS ARE ADDED, AND THEY ARE ALLOWED TO BE USEFUL.
   *
   * A decoy that happens to form an alternative solution is not a bug - there can be
   * several right answers, and letting the child find a different one is a feature.
   * What must never happen is a decoy that makes the target reachable with FEWER
   * crates than the bed allows in a way that trivialises the tier; the slot cap on
   * level 3 handles that structurally rather than by filtering.
   *
   * The shelf is filled to a fixed size so the layout does not jump between rounds,
   * and is shuffled so the loadout crates are not clustered at one end.
   */
  const shelfSize = Math.max(6, tier.crateWeights.length * 2);
  let index = crates.length;
  /*
   * THE GUARD SCALES WITH THE SHELF. A fixed small cap could stop filling early once
   * the `weight === target` skip starts consuming iterations, leaving a shelf so sparse
   * that the solution's crates are the only ones on it - which would give the answer
   * away by elimination. Sizing the cap generously relative to the shelf makes an
   * under-filled shelf impossible for any tier.
   */
  let guard = 0;
  const guardLimit = shelfSize * 10;
  while (crates.length < shelfSize && guard < guardLimit) {
    guard += 1;
    const weight = pick(tier.crateWeights, random);
    /*
     * NO CRATE MAY WEIGH EXACTLY THE TARGET.
     *
     * Otherwise the round has a ONE-TAP solution: load that single crate, dispatch, and
     * collect the full 200 points without adding anything. Level 1 is where this bites,
     * because it lists a 300kg target and stocks 300kg crates - every 300kg delivery
     * would be winnable by tapping one box.
     *
     * This is the same floor `minParts` enforces on the loadout, applied to the shelf:
     * the loadout's own crates never summed to a single crate either, so the guarantee
     * now holds for the whole visible round rather than just for its declared solution.
     * A decoy that equals the target is not a decoy at all - it is the answer.
     */
    if (weight === target) continue;
    crates.push({
      id: `crate-${index}-${weight}-${Math.floor(random() * 100000)}`,
      weight,
      emoji: emojiFor(weight),
    });
    index += 1;
  }

  return {
    destination: pick(DESTINATIONS, random),
    targetWeight: target,
    crates: shuffle(crates, random),
    bedSlots: tier.bedSlots,
    solution,
    level: clampCargoLevel(level),
  };
}

/** The crates' weights, in the order they were loaded. */
export function loadedWeight(crates: readonly Crate[]): number {
  return crates.reduce((total, crate) => total + crate.weight, 0);
}

/**
 * How many more crates may be loaded, or null when the bed is unlimited.
 *
 * Exported so the game can disable the shelf without re-deriving the rule, which is
 * what keeps "why can I not pick that up" answerable from one place.
 */
export function slotsLeft(
  bedSlots: number | null,
  loadedCount: number,
): number | null {
  if (bedSlots === null) return null;
  return Math.max(0, bedSlots - loadedCount);
}
