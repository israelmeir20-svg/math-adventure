/**
 * The Pizza Bakery district: illustrated pizzeria interior, level, pizzas
 * baked and the arcade fraction game on the counter.
 *
 * The 60-second run is self-contained - it starts, settles and offers a replay of
 * its own accord - so the only thing the district still supplies is the running
 * total of pizzas baked and the medal reward.
 */
import { Flame, Pizza, Star } from 'lucide-react';
import { useState } from 'react';
import PizzaGame from './PizzaGame';
import GameLaunchModal from '../kingdom/GameLaunchModal';
import type { StationLevel } from '../../features/progression/useStationProgress';
import type { FarmMedal } from '../farm/farmTimerData';
import { GOLD_SCORE, RUN_SECONDS } from '../farm/farmTimerData';
import DistrictInteriorShell, { InteriorPanel } from '../common/DistrictInteriorShell';
import { DistrictStat } from '../common/DistrictStat';
import pizzaInterior from '../../assets/interiors/pizza-interior.jpg';

interface PizzaModalProps {
  /** Title of the district tile that was opened. */
  tileLabel: string;
  /** Current level of the pizza bakery tile. */
  tileLevel: number;
  pizzasBaked: number;
  onPizzaBaked: () => void;
  onClose: () => void;
}

export default function PizzaModal({
  tileLabel,
  tileLevel,
  pizzasBaked,
  onPizzaBaked,
  onClose,
}: PizzaModalProps) {
  /** The level the run was started at, or null while the launch card is up. */
  const [level, setLevel] = useState<StationLevel | null>(null);

  /** A finished run: bank the medal's cookies and count the pizzas. */
  const reward = (medal: FarmMedal) => {
    for (let i = 0; i < Math.max(1, medal.cookies); i += 1) onPizzaBaked();
  };

  /*
   * THE LAUNCH CARD RETURNS EARLY, BEFORE THE SHELL EXISTS.
   *
   * It used to be rendered INSIDE the shell's `InteriorPanel`, which is where the double-frame came
   * from: `DistrictInteriorShell` is itself a `fixed inset-0 z-[75]` dialog, and `GameLaunchModal` is
   * another one. Nesting the second inside a `h-[85vh] max-h-[720px] overflow-hidden` panel meant two
   * dimmed backdrops stacked, two ✕ buttons, and the card's own content laid out against the panel's
   * box rather than the viewport - which is what clipped the green play button off the bottom.
   *
   * Returning it INSTEAD of the shell means the card is a sibling of the map, exactly as it already is
   * for the kiosk, the trucks and the bridge. The wooden room now mounts only once a level is chosen,
   * which is also what the brief asks for: the shell is the game's stage, not the card's.
   *
   * THIS DELETES NOTHING - the shell below is untouched, so the room and its stat row are exactly as
   * they were for the run itself.
   */
  if (level === null) {
    return <GameLaunchModal meta="pizza" onStart={setLevel} onClose={onClose} />;
  }

  return (
    <DistrictInteriorShell
      bgImage={pizzaInterior}
      title="פיצריית השברים"
      subtitle={`${tileLabel} · שברים פשוטים ושקולים - כמה שיותר פיצות ב-${RUN_SECONDS} שניות`}
      icon="🍕"
      onClose={onClose}
    >
      {/*
        `h-full` here is load-bearing, not decoration. The game measures its
        layout with `h-full`, and a percentage height only resolves against a
        parent that has a definite one: without this, the column is content-sized
        and the game silently overflows the stage below by ~130px. `min-h-full`
        keeps the stats row and the game sharing the box without letting the
        column shrink past it.
      */}
      <div className="flex h-full min-h-full flex-col gap-1.5">
        {/* One slim row of counters, not three cards. The game's own header strip
            carries the live time / level / pizza tallies during a run; this row is
            the district's outside-the-run totals, so it has to stay out of the
            way rather than eat a chunk of the pie's height. */}
        <ul className="grid shrink-0 grid-cols-3 gap-1.5 text-center">
          <DistrictStat
            icon={<Pizza className="h-3.5 w-3.5" />}
            label="פיצות שנאפו"
            value={pizzasBaked}
          />
          <DistrictStat
            icon={<Flame className="h-3.5 w-3.5" />}
            label="רמת הפיצרייה"
            value={tileLevel}
          />
          <DistrictStat
            icon={<Star className="h-3.5 w-3.5" />}
            label="למדליית זהב"
            value={GOLD_SCORE}
          />
        </ul>

        <InteriorPanel className="min-h-0 flex-1 overflow-hidden">
          {/*
            `level` IS NON-NULL HERE, AND TYPESCRIPT KNOWS IT. The early return above narrows
            `StationLevel | null` to `StationLevel` for everything below it, so the launch card that
            used to live in this ternary no longer has a branch - and its absence is what guarantees the
            card can never be nested inside the shell again.
          */}
          <PizzaGame level={level} onReward={reward} />
        </InteriorPanel>
      </div>
    </DistrictInteriorShell>
  );
}

