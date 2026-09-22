/**
 * The bake-run engine for "פיצריית השברים".
 *
 * Owns the current order, the wedges placed on it, and the two hand-offs that
 * move the run along. Extracted from the component so the view stays a view: the
 * only things left in `PizzaGame` are the layout and the two event bindings.
 *
 * THE SUBMIT LOCK IS A REF, TAKEN SYNCHRONOUSLY. A held Space fires repeats faster
 * than React re-renders, so a state-based guard would let the oven run twice and
 * bake the NEXT order with the previous pizza's wedges. The ref flips in the same
 * tick as the click.
 *
 * A BAD BAKE DOES NOT RETRY. A wrong pizza shakes, explains itself, and the run
 * moves on - that is what keeps the arcade pace, and it is why a mistaken pizza
 * costs the child nothing but the time they spent on it. It also does not
 * ADVANCE: the next order is dealt at the same progress, so the stage only ever
 * moves on a pizza that was actually baked correctly.
 */
import { useCallback, useRef, useState } from 'react';
import { buildPizzaOrder } from './pizzaGenerator';
import { validatePizza } from './pizzaValidation';
import { OUT_MS, SHAKE_MS, usePendingDeal } from './usePendingDeal';
import type { PizzaOrder, ToppingId } from './pizzaTypes';

interface UseBakeRunOptions {
  /** True while the 60-second run is live. */
  running: boolean;
  /** True once the run has settled and the medal card is up. */
  settled: boolean;
  onScore: () => void;
  onMiss: () => void;
  /**
   * The tier the run opens on, offsetting the in-run ramp.
   *
   * THE RAMP STILL DRIVES ITSELF FROM `baked`; this only shifts its origin, so a child who picked
   * level 3 starts on the conversion recipes and climbs from there while a level 1 run still opens
   * on the picture-scaffolded halves. See `PizzaGame` for why the two ramps are composed rather
   * than one replacing the other.
   */
  tierOffset?: number;
}

export interface BakeRun {
  order: PizzaOrder;
  /** Pizzas baked correctly so far: the input to the progression engine. */
  baked: number;
  placed: (ToppingId | null)[];
  selected: ToppingId;
  hint: string | null;
  shake: boolean;
  sliding: boolean;
  /** True while the pizza may still be changed or baked. */
  live: boolean;
  select: (topping: ToppingId) => void;
  applyTopping: (index: number) => void;
  bake: () => void;
  restart: () => void;
}

export function useBakeRun({
  running,
  settled,
  onScore,
  onMiss,
  tierOffset = 0,
}: UseBakeRunOptions): BakeRun {
  // The only input to the ramp. `baked` is the run's own count of completed
  // pizzas, incremented on a successful bake and never on a miss - that is what
  // makes the progression engine measure success rather than elapsed attempts.
  const [baked, setBaked] = useState(0);
  const [order, setOrder] = useState<PizzaOrder>(() => buildPizzaOrder(tierOffset));
  const [placed, setPlaced] = useState<(ToppingId | null)[]>(() => Array(2).fill(null));
  const [selected, setSelected] = useState<ToppingId>('olives');
  const [hint, setHint] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [sliding, setSliding] = useState(false);

  const lockedRef = useRef(false);
  const { schedule, clear: clearPending } = usePendingDeal({ running, settled });

  /**
   * Deal the next order. `progress` is the number of pizzas baked BEFORE this
   * deal, so the fresh order is generated from the child's current stage.
   */
  const deal = useCallback((progress: number) => {
    const fresh = buildPizzaOrder(progress);
    setOrder(fresh);
    setPlaced(Array(fresh.totalSlices).fill(null));
    setHint(null);
    setShake(false);
    setSliding(false);
    lockedRef.current = false;
  }, []);

  const live = running && !settled && !lockedRef.current && !sliding;

  const applyTopping = useCallback(
    (index: number) => {
      if (!live) return;
      setHint(null);
      setPlaced((current) => {
        const next = Array.from({ length: order.totalSlices }, (_, i) => current[i] ?? null);
        // Re-tapping the active topping clears the wedge, so a mis-tap costs one
        // tap to undo rather than needing a different topping to overwrite it.
        next[index] = next[index] === selected ? null : selected;
        return next;
      });
    },
    [live, order.totalSlices, selected],
  );

  const bake = useCallback(() => {
    if (!live) return;
    const slices = Array.from({ length: order.totalSlices }, (_, i) => placed[i] ?? null);
    const problem = validatePizza(order, slices);

    lockedRef.current = true;

    if (problem) {
      setShake(true);
      setHint(problem);
      onMiss();
      // The shake has to stop even if the run ends mid-animation, so it is cleared
      // here rather than from the hand-off. A miss re-deals at the SAME progress,
      // so a wrong pizza never advances the stage.
      schedule(
        () => {
          setShake(false);
          // Same progress, same offset: a miss must not advance the curriculum any more than it
          // advances `baked`.
          deal(baked + tierOffset);
        },
        SHAKE_MS,
      );
      return;
    }

    setSliding(true);
    onScore();
    const progress = baked + 1;
    setBaked(progress);
    // The offset is added at DEAL time, so `baked` stays a truthful count of pizzas completed in
    // this run (which is what the rest of the hook and the results card read) while the recipe
    // handed to the child starts further up the curriculum.
    schedule(() => deal(progress + tierOffset), OUT_MS);
  }, [baked, deal, live, onMiss, onScore, placed, order.totalSlices, schedule, tierOffset]);

  const restart = useCallback(() => {
    clearPending();
    setBaked(0);
    deal(tierOffset);
  }, [clearPending, deal, tierOffset]);

  return {
    order,
    baked,
    placed,
    selected,
    hint,
    shake,
    sliding,
    live,
    select: setSelected,
    applyTopping,
    bake,
    restart,
  };
}
