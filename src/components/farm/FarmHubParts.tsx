/**
 * Hub pieces for the farm menu: the intro strip above the station list.
 *
 * ================================================================================================
 * THE MEDAL-TALLY FOOTER IS GONE, AND THE REASON IS DUPLICATION
 * ================================================================================================
 *
 * `BestSummary` sat under the station grid as a row of per-tier totals ("2 gold, 1 silver, 3 bronze"
 * across the four stations). Every one of those numbers is ALREADY on the card above it: each
 * `StationCard` draws its own best medal, so the footer was the same four facts, summed, printed a
 * second time within one screen of the originals.
 *
 * It was also the weakest thing on the hub to look at - four translucent chips on a dark bar - and the
 * bar cost height that the station cards can now use, which on a phone is the difference between
 * seeing all four stations and scrolling to find the fourth.
 *
 * WHAT IT DID NOT DO IS ANYTHING THE HUB NEEDS. It was read-only, had no controls, and the per-station
 * `bestMedalLabel` string each card already computes carries strictly more information (which medal,
 * at which station) than a count of how many stations reached it.
 */
import { Sprout } from 'lucide-react';
import { RUN_SECONDS } from './farmTimerData';

/** The "pick a station" strip, with a running tally of cookies earned now. */
export function HubIntro({ earnedHere }: { earnedHere: number }) {
  return (
    <p className="mb-3 flex flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-amber-900/50 bg-amber-950/50 px-3 py-2 text-center text-sm font-black text-amber-100">
      <Sprout className="h-4 w-4" />
      בחרו תחנה · כל סיבוב אורך {RUN_SECONDS} שניות ואפשר לזכות במדליה
      {earnedHere > 0 && (
        <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] text-amber-950">
          +{earnedHere} 🍪 עכשיו
        </span>
      )}
    </p>
  );
}
