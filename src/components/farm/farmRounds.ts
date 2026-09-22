/**
 * Barrel for the five farm round generators.
 *
 * The generators live in `./rounds/*` (one file each) so no single module grows
 * unwieldy; stations import their own generator from here.
 */
export { buildFeedingRound } from './rounds/feedingRound';
export type { FeedingRound } from './rounds/feedingRound';
export { buildScalesRound } from './rounds/scalesRound';
export type { ScalesRound } from './rounds/scalesRound';
export { buildSpotlightRound, SPOT_ANIMALS } from './rounds/spotlightRound';
export type { SpotlightRound } from './rounds/spotlightRound';
export { buildTracksRound } from './rounds/tracksRound';
export type { TracksRound } from './rounds/tracksRound';
