/**
 * Persisted best-medal board for the farm stations.
 *
 * Best medals are stored separately from the main game save so clearing one
 * does not wipe the other, and so the hub never has to grow the global
 * inventory type (which the rest of the app depends on).
 */
import { useCallback, useEffect, useState } from 'react';
import type { MedalsByStation, FarmStationId } from './farmStations';
import { bestMedal, type FarmMedal } from './farmTimerData';

const STORAGE_KEY = 'math-adventure:farm-medals:v1';

function loadMedals(): MedalsByStation {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MedalsByStation) : {};
  } catch {
    return {};
  }
}

export function useFarmMedals() {
  const [medals, setMedals] = useState<MedalsByStation>(loadMedals);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(medals));
    } catch {
      /* storage unavailable - keep going from memory */
    }
  }, [medals]);

  /** Records a won medal, keeping whichever of the two ranks better. */
  const recordMedal = useCallback((station: FarmStationId, medal: FarmMedal) => {
    setMedals((current) => ({
      ...current,
      [station]: bestMedal(current[station], medal.id),
    }));
  }, []);

  return { medals, recordMedal };
}
