/**
 * Difficulty + question engine for "מי באסם?".
 *
 * A round is two waves: an in-wave walking from the left meadow to the barn,
 * and an out-wave emerging from the barn and leaving to the right. The child is
 * asked either the total still inside, or - from the fast tier - a
 * selective-attention question about one specific animal.
 *
 * PACING IS PART OF THE DESIGN. Counting animals one-by-one is the whole skill,
 * so the timeline is deliberately slow and strictly serialised: one animal
 * crosses in TROT_DURATION, the next sets off STAGGER_DELAY later, and the loop
 * waits for the whole wave before moving on. The numbers live in `barnTiming`
 * so the animation and the timers cannot disagree.
 *
 * Because the stagger is shorter than the trot, several animals are on screen at
 * once - intentional and readable - but they enter one after another rather than
 * as a simultaneous clump.
 *
 * The answer is ALWAYS derived from the same arrays that are rendered:
 *   total mode     in.length - out.length
 *   species mode   in.filter(target) - out.filter(target)
 * so what the child counted is exactly what is checked.
 */
import { ANIMAL_ASSETS, rollEasterEgg } from './animalAssets';
import {
  buildPrompt,
  chooseTypes,
  countOf,
  pickAnimal,
  randInt,
  tierForRound,
  type AnimalActor,
  type BarnRound,
} from './barnRoundTypes';

export type { AnimalActor, BarnRound, QuestionMode, AnimalId } from './barnRoundTypes';
export { tierForRound } from './barnRoundTypes';
export {
  TROT_DURATION,
  STAGGER_DELAY,
  PAUSE_BETWEEN_WAVES,
  SHUTTER_DROP,
  waveMs,
} from './barnTiming';

/** How many animals walk in, per tier. Round 1 is fixed and gentle. */
function planIncoming(roundNumber: number, random: () => number): number {
  return roundNumber === 1 ? 2 : randInt(3, 6, random);
}

/**
 * Builds one round for the given 1-based round number.
 *
 * Round 1 is special-cased to teach the mechanic: it ALWAYS has both an entry
 * and an exit wave, with a tiny, unhurried herd (2 in, 1 out, so the answer is
 * a single animal). Without this, a randomly generated round 1 can have no
 * outgoing animals at all, and the child never sees the "leave" half.
 */
export function buildBarnRound(
  roundNumber: number,
  random: () => number = Math.random,
): BarnRound {
  const profile = tierForRound(roundNumber);
  const types = chooseTypes(profile.typeCount, random);
  const id = `round-${roundNumber}-${Math.floor(random() * 1e9)}`;
  const isTeaching = roundNumber === 1;

  const inCount = planIncoming(roundNumber, random);
  const incoming: AnimalActor[] = Array.from({ length: inCount }, (_, i) => ({
    id: `${id}-in-${i}`,
    animal: pickAnimal(types, random),
    easterEgg: rollEasterEgg(),
  }));

  const useSpecies = !isTeaching && profile.allowSelective && types.length > 1 && random() < 0.5;
  const target = useSpecies ? pickAnimal(types, random) : undefined;
  const targetIn = target ? countOf(incoming, target) : 0;

  // Always leave at least one animal inside, so the answer is never negative.
  const maxOut = Math.min(inCount - 1, isTeaching ? 1 : 3);
  const outCount = randInt(1, Math.max(1, maxOut), random);
  const outgoing: AnimalActor[] = [];
  for (let i = 0; i < outCount; i += 1) {
    // Stop sending the target out once its arrivals are exhausted.
    const exhausted = target !== undefined && countOf(outgoing, target) >= targetIn;
    const pool = exhausted && types.length > 1 ? types.filter((t) => t !== target) : types;
    outgoing.push({ id: `${id}-out-${i}`, animal: pickAnimal(pool, random), easterEgg: rollEasterEgg() });
  }

  // Exactly what is on screen: everything that walked in, minus everything that
  // walked back out - narrowed to the target species when a filter is active.
  const answer =
    target === undefined ? inCount - outCount : targetIn - countOf(outgoing, target);

  if (answer < 0 || answer > 9) {
    throw new Error(`[Barn Game] answer out of range: ${answer}`);
  }

  const round: BarnRound = {
    id,
    incoming,
    outgoing,
    mode: target ? 'species' : 'total',
    target,
    answer,
    prompt: buildPrompt(target),
    tier: profile.tier,
  };

  if (import.meta.env?.DEV) {
    console.log(
      `[Barn Game] Round generated: In=${incoming.length}, Out=${outgoing.length}, ` +
        `Expected=${answer}` +
        (target ? `, Target=${ANIMAL_ASSETS[target].label}` : '') +
        `, Mode=${round.mode}`,
    );
  }

  return round;
}
