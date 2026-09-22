/**
 * Renders whichever farm station is open in the hub.
 *
 * The station list types `Component` as a plain `FarmStationProps`, because that
 * is all the barn games have in common. The picnic and star games can also show
 * a heading of their own, so the cast is confined to this one place instead of
 * widening the list type and forcing every station to declare-and-ignore a prop
 * it never reads.
 */
import type { ComponentType } from 'react';
import type { FarmStation, FarmStationProps } from './farmStations';
import type { FarmMedal } from './farmTimerData';
import type { StationLevel } from '../../features/progression/useStationProgress';

export default function ActiveStation({
  station,
  onReward,
  bestMedalLabel,
  level,
}: {
  station: FarmStation;
  onReward: (medal: FarmMedal) => void;
  bestMedalLabel?: string;
  /**
   * The level the hub's launch card was set to.
   *
   * REQUIRED, NOT OPTIONAL, because `FarmModal` always has a value by the time a station is
   * mounted - the card cannot be dismissed without one. Declaring it optional here would only
   * move the "which level is this?" question into the station, where the answer is not available.
   */
  level: StationLevel;
}) {
  const Station = station.Component as ComponentType<
    FarmStationProps & { titleLine?: string; level?: StationLevel }
  >;
  return <Station onReward={onReward} bestMedalLabel={bestMedalLabel} level={level} />;
}
